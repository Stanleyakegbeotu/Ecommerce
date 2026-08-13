-- Server-managed daily administrative notification digests. All times use Africa/Lagos.

create table if not exists public.notification_settings (
  id boolean primary key default true check (id),
  timezone text not null default 'Africa/Lagos' check (timezone = 'Africa/Lagos'),
  digest_hour smallint not null default 8 check (digest_hour between 0 and 23),
  digest_minute smallint not null default 15 check (digest_minute between 0 and 59),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.notification_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.notification_digest_jobs (
  id uuid primary key default gen_random_uuid(),
  digest_type text not null check (digest_type in ('orders', 'feedback')),
  digest_date date not null,
  timezone text not null default 'Africa/Lagos' check (timezone = 'Africa/Lagos'),
  status text not null default 'queued' check (status in ('queued', 'processing', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (digest_type, digest_date, timezone),
  check ((status = 'sent') = (sent_at is not null))
);

create index if not exists notification_digest_jobs_due_idx on public.notification_digest_jobs (status, next_attempt_at) where status in ('queued', 'failed');

create table if not exists public.notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  digest_job_id uuid not null references public.notification_digest_jobs(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  status text not null check (status in ('sent', 'failed')),
  provider_message_id text,
  error_code text,
  created_at timestamptz not null default now(),
  unique (digest_job_id, attempt_number)
);

create or replace function public.set_notification_settings_updated_at()
returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists notification_settings_set_updated_at on public.notification_settings;
create trigger notification_settings_set_updated_at before update on public.notification_settings for each row execute procedure public.set_notification_settings_updated_at();
drop trigger if exists notification_digest_jobs_set_updated_at on public.notification_digest_jobs;
create trigger notification_digest_jobs_set_updated_at before update on public.notification_digest_jobs for each row execute procedure public.set_notification_settings_updated_at();

create or replace function public.queue_due_notification_digests()
returns void language plpgsql security definer set search_path = public as $$
declare settings public.notification_settings%rowtype;
declare lagos_now timestamp;
declare digest_day date;
begin
  select * into settings from public.notification_settings where id = true;
  if not found or not settings.enabled then return; end if;
  lagos_now := now() at time zone settings.timezone;
  if extract(hour from lagos_now) <> settings.digest_hour or extract(minute from lagos_now) <> settings.digest_minute then return; end if;
  digest_day := lagos_now::date - 1;
  if exists (select 1 from public.orders where (created_at at time zone settings.timezone)::date = digest_day) then
    insert into public.notification_digest_jobs (digest_type, digest_date, timezone) values ('orders', digest_day, settings.timezone) on conflict do nothing;
  end if;
  if exists (select 1 from public.customer_feedback where (created_at at time zone settings.timezone)::date = digest_day) then
    insert into public.notification_digest_jobs (digest_type, digest_date, timezone) values ('feedback', digest_day, settings.timezone) on conflict do nothing;
  end if;
end; $$;

create or replace function public.claim_notification_digest(p_job_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.notification_digest_jobs
  set status = 'processing', locked_at = now(), attempt_count = attempt_count + 1, last_error = null
  where id = p_job_id and status in ('queued', 'failed') and next_attempt_at <= now();
  return found;
end; $$;

create or replace function public.complete_notification_digest(p_job_id uuid, p_provider_message_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.notification_digest_jobs set status = 'sent', sent_at = now(), locked_at = null, last_error = null where id = p_job_id and status = 'processing';
  insert into public.notification_delivery_attempts (digest_job_id, attempt_number, status, provider_message_id)
  select id, attempt_count, 'sent', nullif(left(p_provider_message_id, 500), '') from public.notification_digest_jobs where id = p_job_id;
end; $$;

create or replace function public.fail_notification_digest(p_job_id uuid, p_error_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.notification_digest_jobs
  set status = 'failed', locked_at = null, last_error = left(coalesce(p_error_code, 'delivery_failed'), 500), next_attempt_at = now() + make_interval(mins => least(360, 5 * power(2, least(attempt_count, 6))::integer))
  where id = p_job_id and status = 'processing';
  insert into public.notification_delivery_attempts (digest_job_id, attempt_number, status, error_code)
  select id, attempt_count, 'failed', left(coalesce(p_error_code, 'delivery_failed'), 120) from public.notification_digest_jobs where id = p_job_id;
end; $$;

alter table public.notification_settings enable row level security;
alter table public.notification_digest_jobs enable row level security;
alter table public.notification_delivery_attempts enable row level security;
revoke all on table public.notification_settings, public.notification_digest_jobs, public.notification_delivery_attempts from anon, authenticated;
revoke all on function public.queue_due_notification_digests(), public.claim_notification_digest(uuid), public.complete_notification_digest(uuid, text), public.fail_notification_digest(uuid, text) from public, anon, authenticated;
grant execute on function public.queue_due_notification_digests(), public.claim_notification_digest(uuid), public.complete_notification_digest(uuid, text), public.fail_notification_digest(uuid, text) to service_role;
