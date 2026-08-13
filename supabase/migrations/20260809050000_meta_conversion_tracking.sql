-- Meta configuration is public-safe; CAPI credentials remain Edge Function secrets.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('New', 'Contacted', 'Confirmed', 'Paid', 'Delivered', 'Fulfilled', 'Cancelled', 'Failed Delivery', 'Outstanding'));
alter table public.orders add column if not exists paid_at timestamptz;

create table public.meta_tracking_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  pixel_id text not null default '' check (pixel_id = '' or pixel_id ~ '^[0-9]{5,20}$'),
  browser_enabled boolean not null default true,
  page_view_enabled boolean not null default true,
  view_content_enabled boolean not null default true,
  initiate_checkout_enabled boolean not null default true,
  lead_enabled boolean not null default true,
  purchase_enabled boolean not null default true,
  currency char(3) not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.meta_tracking_settings (id) values (true) on conflict (id) do nothing;

-- Preserve a valid legacy browser Pixel ID while retiring the old generic setting.
-- Tracking remains disabled until the owner deliberately enables it in the admin UI.
update public.meta_tracking_settings meta
set pixel_id = case when settings.facebook_pixel_id ~ '^[0-9]{5,20}$' then settings.facebook_pixel_id else '' end
from public.app_settings settings
where meta.id = true and settings.id = true;

create table public.meta_order_attribution (
  order_id text primary key references public.orders(id) on delete restrict,
  fbp text check (fbp is null or char_length(fbp) <= 200),
  fbc text check (fbc is null or char_length(fbc) <= 200),
  client_ip text check (client_ip is null or char_length(client_ip) <= 64),
  client_user_agent text check (client_user_agent is null or char_length(client_user_agent) <= 1000),
  created_at timestamptz not null default now()
);

create table public.meta_event_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  event_name text not null check (event_name in ('Lead', 'Purchase')),
  event_id text not null unique check (event_id ~ '^meta-(lead|purchase)-[A-Za-z0-9-]{3,64}$'),
  value numeric(14, 2) not null check (value >= 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  package_id text not null check (char_length(package_id) between 1 and 80),
  status text not null default 'queued' check (status in ('queued', 'processing', 'sent', 'retryable', 'failed', 'not_configured')),
  attempt_count integer not null default 0 check (attempt_count >= 0 and attempt_count <= 8),
  last_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  meta_response_id text,
  last_error text check (last_error is null or char_length(last_error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, event_name)
);

create index meta_event_deliveries_due_idx on public.meta_event_deliveries (status, next_attempt_at) where status in ('queued', 'retryable', 'not_configured');
create index meta_event_deliveries_order_idx on public.meta_event_deliveries (order_id, created_at desc);

create or replace function public.queue_meta_order_event(p_order_id text, p_event_name text)
returns table(event_id text)
language plpgsql security definer set search_path = public
as $$
declare
  order_row public.orders%rowtype;
  tracking public.meta_tracking_settings%rowtype;
  amount numeric(14,2);
  package_id_value text;
begin
  if p_event_name not in ('Lead', 'Purchase') then raise exception 'Invalid Meta event.'; end if;
  select * into order_row from public.orders where id = p_order_id;
  if not found then raise exception 'Order not found.'; end if;
  select * into tracking from public.meta_tracking_settings where id = true;
  if not found or not tracking.enabled or (p_event_name = 'Lead' and not tracking.lead_enabled) or (p_event_name = 'Purchase' and not tracking.purchase_enabled) then return; end if;
  if p_event_name = 'Lead' and order_row.status <> 'New' then return; end if;
  if p_event_name = 'Purchase' and order_row.status <> 'Paid' then return; end if;
  package_id_value := coalesce(order_row.package_snapshot ->> 'id', 'unknown');
  amount := coalesce(nullif(regexp_replace(coalesce(order_row.package_snapshot ->> 'promoPrice', ''), '[^0-9.]', '', 'g'), '')::numeric, 0);
  return query
  insert into public.meta_event_deliveries (order_id, product_id, event_name, event_id, value, currency, package_id)
  values (order_row.id, order_row.product_id, p_event_name, 'meta-' || lower(p_event_name) || '-' || order_row.id, amount, tracking.currency, package_id_value)
  on conflict (order_id, event_name) do update set updated_at = now()
  returning meta_event_deliveries.event_id;
end;
$$;

create or replace function public.claim_meta_event_delivery(p_delivery_id uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  update public.meta_event_deliveries set status = 'processing', attempt_count = attempt_count + 1, last_attempt_at = now(), updated_at = now()
  where id = p_delivery_id and status in ('queued', 'retryable', 'not_configured') and next_attempt_at <= now();
  return found;
end;
$$;

create or replace function public.complete_meta_event_delivery(p_delivery_id uuid, p_meta_response_id text)
returns void language sql security definer set search_path = public
as $$ update public.meta_event_deliveries set status = 'sent', sent_at = now(), meta_response_id = left(p_meta_response_id, 240), last_error = null, updated_at = now() where id = p_delivery_id; $$;

create or replace function public.fail_meta_event_delivery(p_delivery_id uuid, p_error text, p_retryable boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare attempts integer;
begin
  select attempt_count into attempts from public.meta_event_deliveries where id = p_delivery_id;
  update public.meta_event_deliveries set status = case when p_retryable and coalesce(attempts, 8) < 5 then 'retryable' else 'failed' end,
    next_attempt_at = now() + make_interval(mins => least(720, 5 * power(2, greatest(coalesce(attempts, 1) - 1, 0))::integer)),
    last_error = left(p_error, 500), updated_at = now() where id = p_delivery_id;
end;
$$;

drop trigger if exists meta_tracking_settings_set_updated_at on public.meta_tracking_settings;
create trigger meta_tracking_settings_set_updated_at before update on public.meta_tracking_settings for each row execute procedure public.set_updated_at();
drop trigger if exists meta_event_deliveries_set_updated_at on public.meta_event_deliveries;
create trigger meta_event_deliveries_set_updated_at before update on public.meta_event_deliveries for each row execute procedure public.set_updated_at();

alter table public.meta_tracking_settings enable row level security;
alter table public.meta_order_attribution enable row level security;
alter table public.meta_event_deliveries enable row level security;
revoke all on public.meta_tracking_settings, public.meta_order_attribution, public.meta_event_deliveries from anon, authenticated;
revoke all on function public.queue_meta_order_event(text, text), public.claim_meta_event_delivery(uuid), public.complete_meta_event_delivery(uuid, text), public.fail_meta_event_delivery(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.queue_meta_order_event(text, text), public.claim_meta_event_delivery(uuid), public.complete_meta_event_delivery(uuid, text), public.fail_meta_event_delivery(uuid, text, boolean) to service_role;

alter table public.app_settings drop column if exists facebook_pixel_id;
