-- `power` returns a floating-point value, while `make_interval(mins => ...)`
-- requires an integer. Keep the bounded 5/10/20/40/80 minute retry schedule
-- explicit and type-safe.
create or replace function public.fail_notification_digest(p_job_id uuid, p_error_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.notification_digest_jobs
  set status = case when attempt_count < 5 then 'retrying' else 'failed' end,
      locked_at = null,
      last_error = left(coalesce(p_error_code, 'delivery_failed'), 500),
      next_attempt_at = now() + (
        least(
          360::numeric,
          5::numeric * power(2::numeric, greatest(attempt_count - 1, 0))
        )::integer * interval '1 minute'
      )
  where id = p_job_id and status = 'processing';

  insert into public.notification_delivery_attempts (digest_job_id, attempt_number, status, error_code)
  select id, attempt_count, 'failed', left(coalesce(p_error_code, 'delivery_failed'), 120)
  from public.notification_digest_jobs
  where id = p_job_id
  on conflict (digest_job_id, attempt_number) do nothing;
end;
$$;
