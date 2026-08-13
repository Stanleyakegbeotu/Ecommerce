-- The first immediate-notification migration was applied before its scheduler
-- credential could be reused. Recreate that job with the existing private
-- scheduler endpoint/secret; no credential is stored in source control.
do $$
declare
  current_job_id bigint;
begin
  select jobid into current_job_id from cron.job where jobname = 'process-immediate-notifications-every-5-minutes';
  if current_job_id is not null then
    perform cron.unschedule(current_job_id);
  end if;

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
end;
$$;
