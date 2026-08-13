create extension if not exists pgcrypto;

create table if not exists public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  session_id uuid not null,
  reason_id text not null check (reason_id in ('price', 'trust', 'product_information', 'delivery', 'not_ready', 'comparing', 'something_else')),
  feedback_text text,
  source text not null check (source in ('quick_reason', 'something_else', 'tell_more')),
  funnel_stage text not null check (funnel_stage in ('packages', 'checkout', 'other')),
  last_section text not null check (last_section in ('hero', 'proof', 'demo', 'reviews', 'packages', 'benefits', 'gallery', 'about', 'order', 'faq')),
  selected_package_id text,
  checkout_opened boolean not null default false,
  form_started boolean not null default false,
  status text not null default 'new' check (status in ('new', 'reviewed', 'resolved')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  admin_note text,
  admin_note_author_id uuid references auth.users(id) on delete set null,
  admin_note_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_feedback_text_is_valid check (feedback_text is null or (char_length(btrim(feedback_text)) between 1 and 750)),
  constraint customer_feedback_other_requires_text check (reason_id <> 'something_else' or feedback_text is not null),
  constraint customer_feedback_lifecycle_is_valid check (
    (status = 'new' and reviewed_at is null and reviewed_by is null and resolved_at is null and resolved_by is null)
    or (status = 'reviewed' and reviewed_at is not null and reviewed_by is not null and resolved_at is null and resolved_by is null)
    or (status = 'resolved' and reviewed_at is not null and reviewed_by is not null and resolved_at is not null and resolved_by is not null)
  ),
  constraint customer_feedback_admin_note_is_valid check (admin_note is null or char_length(btrim(admin_note)) <= 2000)
);

create index if not exists customer_feedback_session_id_idx on public.customer_feedback (session_id);
create index if not exists customer_feedback_status_created_at_idx on public.customer_feedback (status, created_at desc);
create index if not exists customer_feedback_reason_created_at_idx on public.customer_feedback (reason_id, created_at desc);
create index if not exists customer_feedback_source_created_at_idx on public.customer_feedback (source, created_at desc);
create index if not exists customer_feedback_package_created_at_idx on public.customer_feedback (selected_package_id, created_at desc) where selected_package_id is not null;
create index if not exists customer_feedback_created_at_idx on public.customer_feedback (created_at desc);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'owner')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_users_active_idx on public.admin_users (user_id) where is_active;

create table if not exists public.customer_feedback_activity (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.customer_feedback(id) on delete cascade,
  action text not null check (action in ('status_changed', 'note_updated')),
  from_status text check (from_status is null or from_status in ('new', 'reviewed', 'resolved')),
  to_status text check (to_status is null or to_status in ('new', 'reviewed', 'resolved')),
  actor_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint customer_feedback_activity_status_change_is_valid check (
    (action = 'status_changed' and from_status is not null and to_status is not null)
    or (action = 'note_updated' and from_status is null and to_status is null)
  )
);

create index if not exists customer_feedback_activity_feedback_created_idx on public.customer_feedback_activity (feedback_id, created_at desc);

create table if not exists public.customer_feedback_followups (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null unique references public.customer_feedback(id) on delete cascade,
  consent_state text not null check (consent_state in ('accepted', 'declined')),
  followup_status text not null check (followup_status in ('not_requested', 'awaiting_contact', 'requested', 'contacted', 'resolved', 'unreachable')),
  phone_e164 text,
  consent_idempotency_key uuid not null unique,
  phone_submission_idempotency_key uuid unique,
  consented_at timestamptz not null default now(),
  phone_submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_feedback_followups_phone_is_valid check (phone_e164 is null or phone_e164 ~ '^[+]234[789][0-9]{9}$'),
  constraint customer_feedback_followups_state_is_valid check (
    (consent_state = 'declined' and followup_status = 'not_requested' and phone_e164 is null and phone_submitted_at is null)
    or (consent_state = 'accepted' and followup_status = 'awaiting_contact' and phone_e164 is null and phone_submitted_at is null)
    or (consent_state = 'accepted' and followup_status in ('requested', 'contacted', 'resolved', 'unreachable') and phone_e164 is not null and phone_submitted_at is not null)
  )
);

create index if not exists customer_feedback_followups_status_created_idx on public.customer_feedback_followups (followup_status, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-feedback-media',
  'customer-feedback-media',
  false,
  3145728,
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.customer_feedback_attachments (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.customer_feedback(id) on delete cascade,
  attachment_type text not null check (attachment_type in ('voice_note')),
  storage_bucket text not null check (storage_bucket = 'customer-feedback-media'),
  storage_path text not null unique check (storage_path ~ '^[0-9a-f-]+/[0-9a-f-]+\.(webm|ogg|m4a|mp3)$'),
  mime_type text not null check (mime_type in ('audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg')),
  duration_ms integer not null check (duration_ms between 1000 and 30000),
  file_size_bytes integer not null check (file_size_bytes between 1 and 3145728),
  upload_idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_feedback_one_voice_note check (attachment_type = 'voice_note'),
  unique (feedback_id, attachment_type)
);

create index if not exists customer_feedback_attachments_feedback_created_idx on public.customer_feedback_attachments (feedback_id, created_at desc);

create table if not exists public.customer_feedback_submission_rate_limits (
  bucket text primary key check (char_length(bucket) = 64),
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 1 check (attempt_count >= 1),
  updated_at timestamptz not null default now()
);

create index if not exists customer_feedback_submission_rate_limits_updated_idx on public.customer_feedback_submission_rate_limits (updated_at);

create or replace function public.consume_customer_feedback_submission_rate_limit(p_bucket text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rate_limit public.customer_feedback_submission_rate_limits%rowtype;
begin
  if p_bucket is null or char_length(p_bucket) <> 64 then
    raise exception 'Invalid rate limit bucket';
  end if;

  select * into rate_limit
  from public.customer_feedback_submission_rate_limits
  where bucket = p_bucket
  for update;

  if not found then
    insert into public.customer_feedback_submission_rate_limits (bucket) values (p_bucket);
    return true;
  end if;

  if rate_limit.window_started_at <= now() - interval '10 minutes' then
    update public.customer_feedback_submission_rate_limits
    set window_started_at = now(), attempt_count = 1, updated_at = now()
    where bucket = p_bucket;
    return true;
  end if;

  if rate_limit.attempt_count >= 8 then
    return false;
  end if;

  update public.customer_feedback_submission_rate_limits
  set attempt_count = attempt_count + 1, updated_at = now()
  where bucket = p_bucket;
  return true;
end;
$$;

create or replace function public.set_customer_feedback_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.record_customer_feedback_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  activity_actor_id uuid;
begin
  if old.status is distinct from new.status then
    activity_actor_id := case when new.status = 'resolved' then new.resolved_by else new.reviewed_by end;
    if activity_actor_id is null then
      raise exception 'A feedback status change requires an authenticated administrator';
    end if;
    insert into public.customer_feedback_activity (feedback_id, action, from_status, to_status, actor_id)
    values (new.id, 'status_changed', old.status, new.status, activity_actor_id);
  elsif old.admin_note is distinct from new.admin_note then
    if new.admin_note_author_id is null then
      raise exception 'An admin note requires an authenticated administrator';
    end if;
    insert into public.customer_feedback_activity (feedback_id, action, actor_id)
    values (new.id, 'note_updated', new.admin_note_author_id);
  end if;
  return new;
end;
$$;

drop trigger if exists customer_feedback_set_updated_at on public.customer_feedback;
create trigger customer_feedback_set_updated_at
before update on public.customer_feedback
for each row execute procedure public.set_customer_feedback_updated_at();

drop trigger if exists customer_feedback_record_activity on public.customer_feedback;
create trigger customer_feedback_record_activity
after update on public.customer_feedback
for each row execute procedure public.record_customer_feedback_activity();

drop trigger if exists customer_feedback_followups_set_updated_at on public.customer_feedback_followups;
create trigger customer_feedback_followups_set_updated_at
before update on public.customer_feedback_followups
for each row execute procedure public.set_customer_feedback_updated_at();

drop trigger if exists customer_feedback_attachments_set_updated_at on public.customer_feedback_attachments;
create trigger customer_feedback_attachments_set_updated_at
before update on public.customer_feedback_attachments
for each row execute procedure public.set_customer_feedback_updated_at();

drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at
before update on public.admin_users
for each row execute procedure public.set_customer_feedback_updated_at();

alter table public.customer_feedback enable row level security;
alter table public.admin_users enable row level security;
alter table public.customer_feedback_activity enable row level security;
alter table public.customer_feedback_followups enable row level security;
alter table public.customer_feedback_attachments enable row level security;
alter table public.customer_feedback_submission_rate_limits enable row level security;
revoke all on table public.customer_feedback from anon, authenticated;
revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.customer_feedback_activity from anon, authenticated;
revoke all on table public.customer_feedback_followups from anon, authenticated;
revoke all on table public.customer_feedback_attachments from anon, authenticated;
revoke all on table public.customer_feedback_submission_rate_limits from anon, authenticated;
revoke all on function public.consume_customer_feedback_submission_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_customer_feedback_submission_rate_limit(text) to service_role;
