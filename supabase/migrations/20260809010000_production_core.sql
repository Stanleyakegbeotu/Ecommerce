-- Production source of truth for orders, operational administration, and internal analytics.
-- Browser roles receive no direct table access; Edge Functions mediate public and admin actions.

create extension if not exists pgcrypto;

create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  facebook_pixel_id text not null default '' check (char_length(facebook_pixel_id) <= 100),
  thank_you_path text not null default '/thank-you' check (thank_you_path ~ '^/[a-zA-Z0-9/_-]{0,199}$'),
  startup_capital numeric(14, 2) not null default 300000 check (startup_capital >= 0),
  package_prices jsonb not null default '{}'::jsonb check (jsonb_typeof(package_prices) = 'object'),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.capital_top_ups (
  id uuid primary key default gen_random_uuid(),
  amount numeric(14, 2) not null check (amount > 0),
  note text not null check (char_length(btrim(note)) between 1 and 240),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists capital_top_ups_created_at_idx on public.capital_top_ups (created_at desc);

create table if not exists public.orders (
  id text primary key check (id ~ '^[A-Za-z0-9][A-Za-z0-9-]{2,63}$'),
  customer jsonb not null check (jsonb_typeof(customer) = 'object'),
  package_snapshot jsonb not null check (jsonb_typeof(package_snapshot) = 'object'),
  status text not null default 'New' check (status in ('New', 'Contacted', 'Confirmed', 'Delivered', 'Fulfilled', 'Cancelled', 'Failed Delivery', 'Outstanding')),
  estimated_delivery text not null default '1-3 Business Days' check (char_length(btrim(estimated_delivery)) between 1 and 120),
  source text not null check (source in ('popup', 'inline')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_created_at_idx on public.orders (status, created_at desc);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  amount numeric(14, 2) not null check (amount > 0),
  purpose text not null check (char_length(btrim(purpose)) between 1 and 240),
  order_id text references public.orders(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_created_at_idx on public.expenses (created_at desc);
create index if not exists expenses_order_id_idx on public.expenses (order_id) where order_id is not null;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (char_length(type) between 1 and 80),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_type_created_at_idx on public.analytics_events (type, created_at desc);

create table if not exists public.public_submission_rate_limits (
  scope text not null check (scope ~ '^[a-z_]{1,50}$'),
  bucket text not null check (bucket ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 1 check (attempt_count >= 1),
  updated_at timestamptz not null default now(),
  primary key (scope, bucket)
);

create index if not exists public_submission_rate_limits_updated_at_idx on public.public_submission_rate_limits (updated_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.consume_public_submission_rate_limit(
  p_scope text,
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rate_limit public.public_submission_rate_limits%rowtype;
begin
  if p_scope is null or p_scope !~ '^[a-z_]{1,50}$'
    or p_bucket is null or p_bucket !~ '^[0-9a-f]{64}$'
    or p_limit < 1 or p_limit > 500
    or p_window_seconds < 60 or p_window_seconds > 86400 then
    raise exception 'Invalid rate-limit arguments';
  end if;

  select * into rate_limit
  from public.public_submission_rate_limits
  where scope = p_scope and bucket = p_bucket
  for update;

  if not found then
    insert into public.public_submission_rate_limits (scope, bucket) values (p_scope, p_bucket);
    return true;
  end if;

  if rate_limit.window_started_at <= now() - make_interval(secs => p_window_seconds) then
    update public.public_submission_rate_limits
    set window_started_at = now(), attempt_count = 1, updated_at = now()
    where scope = p_scope and bucket = p_bucket;
    return true;
  end if;

  if rate_limit.attempt_count >= p_limit then
    return false;
  end if;

  update public.public_submission_rate_limits
  set attempt_count = attempt_count + 1, updated_at = now()
  where scope = p_scope and bucket = p_bucket;
  return true;
end;
$$;

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute procedure public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute procedure public.set_updated_at();

alter table public.app_settings enable row level security;
alter table public.capital_top_ups enable row level security;
alter table public.orders enable row level security;
alter table public.expenses enable row level security;
alter table public.analytics_events enable row level security;
alter table public.public_submission_rate_limits enable row level security;

revoke all on table public.app_settings from anon, authenticated;
revoke all on table public.capital_top_ups from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.expenses from anon, authenticated;
revoke all on table public.analytics_events from anon, authenticated;
revoke all on table public.public_submission_rate_limits from anon, authenticated;
revoke all on function public.consume_public_submission_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_public_submission_rate_limit(text, text, integer, integer) to service_role;
