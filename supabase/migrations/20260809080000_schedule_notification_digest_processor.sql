-- Process daily digest jobs and bounded retries without relying on a browser,
-- Netlify, or any public unauthenticated endpoint. The two referenced values
-- are installed in Supabase Vault during secure production configuration, not
-- committed to this migration.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

do $$
begin
  if not exists (
    select 1
    from cron.job
    where jobname = 'process-notification-digests-every-15-minutes'
  ) then
    perform cron.schedule(
      'process-notification-digests-every-15-minutes',
      '*/15 * * * *',
      $cron$
        select net.http_post(
          url := (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'notification_digest_processor_url'
          ),
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-digest-scheduler-secret', (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'notification_digest_scheduler_secret'
            )
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 30000
        );
      $cron$
    );
  end if;
end;
$$;
