-- Immediate administrator notifications are durable per canonical record.
-- They replace end-of-day email delivery while retaining retry and idempotency.
create table public.notification_event_jobs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('order', 'feedback')),
  order_id text references public.orders(id) on delete cascade,
  feedback_id uuid references public.customer_feedback(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'retrying', 'sent', 'failed', 'skipped')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 5),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_event_jobs_target_check check (
    (event_type = 'order' and order_id is not null and feedback_id is null)
    or (event_type = 'feedback' and feedback_id is not null and order_id is null)
  ),
  constraint notification_event_jobs_sent_check check ((status = 'sent') = (sent_at is not null))
);

create unique index notification_event_jobs_order_unique on public.notification_event_jobs (order_id) where order_id is not null;
create unique index notification_event_jobs_feedback_unique on public.notification_event_jobs (feedback_id) where feedback_id is not null;
create index notification_event_jobs_due_idx on public.notification_event_jobs (status, next_attempt_at) where status in ('queued', 'retrying');

create table public.notification_event_attempts (
  id uuid primary key default gen_random_uuid(),
  event_job_id uuid not null references public.notification_event_jobs(id) on delete cascade,
  attempt_number integer not null,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  provider_message_id text,
  error_code text,
  created_at timestamptz not null default now(),
  unique (event_job_id, attempt_number)
);

create or replace function public.enqueue_immediate_notification_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_TABLE_NAME = 'orders' then
    insert into public.notification_event_jobs (event_type, order_id)
    values ('order', NEW.id)
    on conflict (order_id) where order_id is not null do nothing;
  elsif TG_TABLE_NAME = 'customer_feedback' then
    insert into public.notification_event_jobs (event_type, feedback_id)
    values ('feedback', NEW.id)
    on conflict (feedback_id) where feedback_id is not null do nothing;
  end if;
  return NEW;
end;
$$;

drop trigger if exists orders_enqueue_immediate_notification on public.orders;
create trigger orders_enqueue_immediate_notification
after insert on public.orders for each row execute procedure public.enqueue_immediate_notification_event();

drop trigger if exists customer_feedback_enqueue_immediate_notification on public.customer_feedback;
create trigger customer_feedback_enqueue_immediate_notification
after insert on public.customer_feedback for each row execute procedure public.enqueue_immediate_notification_event();

create or replace function public.recover_stale_notification_events()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.notification_event_jobs
  set status = case when attempt_count < 5 then 'retrying' else 'failed' end,
      locked_at = null,
      last_error = coalesce(last_error, 'stale_processing_recovered'),
      next_attempt_at = now()
  where status = 'processing' and locked_at < now() - interval '20 minutes';
end;
$$;

create or replace function public.claim_notification_event(p_job_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.notification_event_jobs
  set status = 'processing', locked_at = now(), attempt_count = attempt_count + 1, last_error = null
  where id = p_job_id and status in ('queued', 'retrying') and attempt_count < 5 and next_attempt_at <= now();
  return found;
end;
$$;

create or replace function public.complete_notification_event(p_job_id uuid, p_provider_message_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.notification_event_jobs
  set status = 'sent', sent_at = now(), locked_at = null, last_error = null
  where id = p_job_id and status = 'processing';
  insert into public.notification_event_attempts (event_job_id, attempt_number, status, provider_message_id)
  select id, attempt_count, 'sent', nullif(left(p_provider_message_id, 500), '')
  from public.notification_event_jobs where id = p_job_id and status = 'sent'
  on conflict (event_job_id, attempt_number) do nothing;
end;
$$;

create or replace function public.fail_notification_event(p_job_id uuid, p_error_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.notification_event_jobs
  set status = case when attempt_count < 5 then 'retrying' else 'failed' end,
      locked_at = null,
      last_error = left(coalesce(p_error_code, 'delivery_failed'), 500),
      next_attempt_at = now() + (
        least(360::numeric, 5::numeric * power(2::numeric, greatest(attempt_count - 1, 0)))::integer * interval '1 minute'
      )
  where id = p_job_id and status = 'processing';
  insert into public.notification_event_attempts (event_job_id, attempt_number, status, error_code)
  select id, attempt_count, 'failed', left(coalesce(p_error_code, 'delivery_failed'), 120)
  from public.notification_event_jobs where id = p_job_id
  on conflict (event_job_id, attempt_number) do nothing;
end;
$$;

alter table public.notification_event_jobs enable row level security;
alter table public.notification_event_attempts enable row level security;
revoke all on table public.notification_event_jobs, public.notification_event_attempts from anon, authenticated;
revoke all on function public.enqueue_immediate_notification_event(), public.recover_stale_notification_events(), public.claim_notification_event(uuid), public.complete_notification_event(uuid, text), public.fail_notification_event(uuid, text) from public, anon, authenticated;
grant execute on function public.recover_stale_notification_events(), public.claim_notification_event(uuid), public.complete_notification_event(uuid, text), public.fail_notification_event(uuid, text) to service_role;

-- Immediate record notifications supersede the former end-of-day digest. Keep its
-- history tables/functions intact, but prevent a second email for the same record.
update public.notification_settings set enabled = false where id = true;

do $$
declare
  old_job_id bigint;
begin
  select jobid into old_job_id from cron.job where jobname = 'process-notification-digests-every-15-minutes';
  if old_job_id is not null then
    perform cron.unschedule(old_job_id);
  end if;
end;
$$;

-- The authenticated scheduler reuses the already-private digest processor
-- endpoint/credential. That function now also drains immediate event jobs.
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'process-immediate-notifications-every-5-minutes') then
    perform cron.schedule(
      'process-immediate-notifications-every-5-minutes',
      '*/5 * * * *',
      $cron$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'notification_digest_processor_url'),
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-digest-scheduler-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'notification_digest_scheduler_secret')
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 30000
        );
      $cron$
    );
  end if;
end;
$$;
