-- The COD lifecycle is intentionally small. Historical labels are normalized
-- once so all future changes use the same operational language.
alter table public.orders drop constraint if exists orders_status_check;
update public.orders
set status = case status
  when 'Contacted' then 'Confirmed'
  when 'Outstanding' then 'Processing'
  when 'Failed Delivery' then 'Cancelled'
  when 'Paid' then 'Delivered/Paid'
  when 'Delivered' then 'Delivered/Paid'
  when 'Fulfilled' then 'Delivered/Paid'
  else status
end
where status in ('Contacted', 'Outstanding', 'Failed Delivery', 'Paid', 'Delivered', 'Fulfilled');
alter table public.orders add constraint orders_status_check check (status in ('New', 'Confirmed', 'Processing', 'Delivered/Paid', 'Cancelled'));
alter table public.orders add column if not exists cancellation_reason text check (cancellation_reason is null or cancellation_reason in ('customer_changed_mind', 'unreachable', 'duplicate_order', 'delivery_issue', 'invalid_order', 'other'));
alter table public.orders add constraint orders_cancellation_reason_status_check check (status = 'Cancelled' or cancellation_reason is null);
update public.orders set paid_at = coalesce(paid_at, updated_at) where status = 'Delivered/Paid' and paid_at is null;

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete restrict,
  from_status text not null check (from_status in ('New', 'Confirmed', 'Processing', 'Delivered/Paid', 'Cancelled')),
  to_status text not null check (to_status in ('New', 'Confirmed', 'Processing', 'Delivered/Paid', 'Cancelled')),
  actor_id uuid not null references auth.users(id) on delete restrict,
  operational_note text check (operational_note is null or char_length(btrim(operational_note)) between 1 and 500),
  cancellation_reason text check (cancellation_reason is null or cancellation_reason in ('customer_changed_mind', 'unreachable', 'duplicate_order', 'delivery_issue', 'invalid_order', 'other')),
  created_at timestamptz not null default now(),
  check (from_status <> to_status),
  check (cancellation_reason is null or to_status = 'Cancelled')
);

create index order_status_history_order_created_at_idx on public.order_status_history (order_id, created_at desc);
create index order_status_history_actor_created_at_idx on public.order_status_history (actor_id, created_at desc);

create or replace function public.transition_order_status(
  p_order_id text,
  p_new_status text,
  p_actor_id uuid,
  p_operational_note text default null,
  p_cancellation_reason text default null
)
returns table(previous_status text, current_status text, purchase_event_id text)
language plpgsql security definer set search_path = public
as $$
declare
  order_row public.orders%rowtype;
  normalized_note text;
  queued_event text;
begin
  if p_actor_id is null then raise exception 'Administrator identity is required'; end if;
  if p_new_status not in ('New', 'Confirmed', 'Processing', 'Delivered/Paid', 'Cancelled') then raise exception 'Invalid order status'; end if;
  normalized_note := nullif(btrim(coalesce(p_operational_note, '')), '');
  if normalized_note is not null and char_length(normalized_note) > 500 then raise exception 'Operational note is too long'; end if;
  if p_new_status = 'Cancelled' and p_cancellation_reason is not null and p_cancellation_reason not in ('customer_changed_mind', 'unreachable', 'duplicate_order', 'delivery_issue', 'invalid_order', 'other') then raise exception 'Invalid cancellation reason'; end if;
  if p_new_status <> 'Cancelled' and p_cancellation_reason is not null then raise exception 'Cancellation reason is only valid for cancelled orders'; end if;

  select * into order_row from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if order_row.status = p_new_status then
    return query select order_row.status, order_row.status, null::text;
    return;
  end if;
  if not (
    (order_row.status = 'New' and p_new_status in ('Confirmed', 'Cancelled')) or
    (order_row.status = 'Confirmed' and p_new_status in ('Processing', 'Cancelled')) or
    (order_row.status = 'Processing' and p_new_status in ('Delivered/Paid', 'Cancelled'))
  ) then
    raise exception 'That order status transition is not allowed';
  end if;

  update public.orders
  set status = p_new_status,
      paid_at = case when p_new_status = 'Delivered/Paid' then coalesce(order_row.paid_at, now()) else paid_at end,
      cancellation_reason = case when p_new_status = 'Cancelled' then p_cancellation_reason else null end
  where id = p_order_id;

  insert into public.order_status_history (order_id, from_status, to_status, actor_id, operational_note, cancellation_reason)
  values (p_order_id, order_row.status, p_new_status, p_actor_id, normalized_note, case when p_new_status = 'Cancelled' then p_cancellation_reason else null end);

  if p_new_status = 'Delivered/Paid' then
    select event_id into queued_event from public.queue_meta_order_event(p_order_id, 'Purchase');
  end if;
  return query select order_row.status, p_new_status, queued_event;
end;
$$;

-- Purchase means the customer received the product and payment completed.
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
  if p_event_name = 'Purchase' and order_row.status <> 'Delivered/Paid' then return; end if;
  package_id_value := coalesce(order_row.package_snapshot ->> 'id', 'unknown');
  amount := coalesce(nullif(regexp_replace(coalesce(order_row.package_snapshot ->> 'promoPrice', ''), '[^0-9.]', '', 'g'), '')::numeric, 0);
  return query
  insert into public.meta_event_deliveries (order_id, product_id, event_name, event_id, value, currency, package_id)
  values (order_row.id, order_row.product_id, p_event_name, 'meta-' || lower(p_event_name) || '-' || order_row.id, amount, tracking.currency, package_id_value)
  on conflict (order_id, event_name) do update set updated_at = now()
  returning meta_event_deliveries.event_id;
end;
$$;

create or replace function public.get_meta_attribution_summary(p_limit integer default 30)
returns table (
  traffic_source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  meta_ad_account_id text,
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  order_requests bigint,
  paid_sales bigint,
  lead_events bigint,
  purchase_events bigint,
  purchase_value numeric
)
language sql security definer set search_path = public
as $$
  select coalesce(attribution.traffic_source, 'unattributed'), attribution.utm_source, attribution.utm_medium, attribution.utm_campaign, attribution.meta_ad_account_id, attribution.meta_campaign_id, attribution.meta_adset_id, attribution.meta_ad_id,
    count(*)::bigint,
    count(*) filter (where orders.status = 'Delivered/Paid')::bigint,
    count(*) filter (where lead.id is not null)::bigint,
    count(*) filter (where purchase.id is not null)::bigint,
    coalesce(sum(purchase.value), 0)
  from public.meta_order_attribution attribution
  join public.orders orders on orders.id = attribution.order_id
  left join public.meta_event_deliveries lead on lead.order_id = orders.id and lead.event_name = 'Lead'
  left join public.meta_event_deliveries purchase on purchase.order_id = orders.id and purchase.event_name = 'Purchase'
  group by 1, 2, 3, 4, 5, 6, 7, 8
  order by max(attribution.created_at) desc
  limit least(greatest(coalesce(p_limit, 30), 1), 50);
$$;

alter table public.order_status_history enable row level security;
revoke all on table public.order_status_history from anon, authenticated;
revoke all on function public.transition_order_status(text, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.transition_order_status(text, text, uuid, text, text) to service_role;

-- Digest jobs have bounded, observable retry and a terminal skipped state for
-- any race where there is nothing left to mail.
alter table public.notification_digest_jobs drop constraint if exists notification_digest_jobs_status_check;
alter table public.notification_digest_jobs drop constraint if exists notification_digest_jobs_attempt_count_check;
alter table public.notification_digest_jobs drop constraint if exists notification_digest_jobs_check;
update public.notification_digest_jobs set attempt_count = least(attempt_count, 5) where attempt_count > 5;
alter table public.notification_digest_jobs add constraint notification_digest_jobs_status_check check (status in ('queued', 'processing', 'retrying', 'sent', 'failed', 'skipped'));
alter table public.notification_digest_jobs add constraint notification_digest_jobs_attempt_count_check check (attempt_count between 0 and 5);
alter table public.notification_digest_jobs add constraint notification_digest_jobs_sent_check check ((status = 'sent') = (sent_at is not null));
drop index if exists public.notification_digest_jobs_due_idx;
create index notification_digest_jobs_due_idx on public.notification_digest_jobs (status, next_attempt_at) where status in ('queued', 'retrying');

create or replace function public.recover_stale_notification_digests()
returns void language sql security definer set search_path = public as $$
  update public.notification_digest_jobs
  set status = case when attempt_count < 5 then 'retrying' else 'failed' end,
      locked_at = null,
      last_error = coalesce(last_error, 'processor_interrupted'),
      next_attempt_at = now()
  where status = 'processing' and locked_at < now() - interval '20 minutes';
$$;

create or replace function public.claim_notification_digest(p_job_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.notification_digest_jobs
  set status = 'processing', locked_at = now(), attempt_count = attempt_count + 1, last_error = null
  where id = p_job_id and status in ('queued', 'retrying') and next_attempt_at <= now() and attempt_count < 5;
  return found;
end; $$;

create or replace function public.skip_notification_digest(p_job_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.notification_digest_jobs
  set status = 'skipped', locked_at = null, last_error = left(coalesce(p_reason, 'empty_digest'), 500)
  where id = p_job_id and status = 'processing';
end; $$;

create or replace function public.complete_notification_digest(p_job_id uuid, p_provider_message_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.notification_digest_jobs set status = 'sent', sent_at = now(), locked_at = null, last_error = null where id = p_job_id and status = 'processing';
  insert into public.notification_delivery_attempts (digest_job_id, attempt_number, status, provider_message_id)
  select id, attempt_count, 'sent', nullif(left(p_provider_message_id, 500), '') from public.notification_digest_jobs where id = p_job_id and status = 'sent'
  on conflict (digest_job_id, attempt_number) do nothing;
end; $$;

create or replace function public.fail_notification_digest(p_job_id uuid, p_error_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.notification_digest_jobs
  set status = case when attempt_count < 5 then 'retrying' else 'failed' end,
      locked_at = null,
      last_error = left(coalesce(p_error_code, 'delivery_failed'), 500),
      next_attempt_at = now() + make_interval(mins => least(360, 5 * power(2, greatest(attempt_count - 1, 0)::integer)))
  where id = p_job_id and status = 'processing';
  insert into public.notification_delivery_attempts (digest_job_id, attempt_number, status, error_code)
  select id, attempt_count, 'failed', left(coalesce(p_error_code, 'delivery_failed'), 120) from public.notification_digest_jobs where id = p_job_id
  on conflict (digest_job_id, attempt_number) do nothing;
end; $$;

create or replace function public.retry_notification_digest(p_job_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.notification_digest_jobs
  set status = 'queued', attempt_count = 0, locked_at = null, next_attempt_at = now(), last_error = null
  where id = p_job_id and status = 'failed';
  return found;
end; $$;

revoke all on function public.recover_stale_notification_digests(), public.skip_notification_digest(uuid, text), public.retry_notification_digest(uuid) from public, anon, authenticated;
grant execute on function public.recover_stale_notification_digests(), public.skip_notification_digest(uuid, text), public.retry_notification_digest(uuid) to service_role;

create table public.notification_diagnostics (
  id uuid primary key default gen_random_uuid(),
  diagnostic_type text not null check (diagnostic_type in ('smtp_test')),
  status text not null check (status in ('sent', 'failed')),
  actor_id uuid not null references auth.users(id) on delete restrict,
  error_code text check (error_code is null or char_length(error_code) <= 120),
  created_at timestamptz not null default now()
);

create index notification_diagnostics_created_at_idx on public.notification_diagnostics (created_at desc);
alter table public.notification_diagnostics enable row level security;
revoke all on table public.notification_diagnostics from anon, authenticated;
