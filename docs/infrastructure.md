# Production infrastructure foundation

This repository is portable: all persistent Supabase objects are created from
`supabase/migrations`, and no production project reference is committed.

## Browser environment (Netlify and local development)

Set only these public values in the browser build environment:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Copy `.env.example` to an ignored `.env` for local development. Do not add
`SUPABASE_SERVICE_ROLE_KEY`, SMTP credentials, database passwords, or function
secrets to Netlify `VITE_*` variables or any committed file.

## Supabase deployment

1. Create a new empty Supabase project and link the CLI to it.
2. Apply the version-controlled migrations with `supabase db push`.
3. Deploy every function in `supabase/functions`.
4. Configure Function secrets in the Supabase project:
   - `ALLOWED_ORIGINS` — a comma-separated exact allow-list, for example `https://example.com,http://localhost:8443,http://127.0.0.1:8443` (no trailing slashes). `ALLOWED_ORIGIN` remains supported only as a backward-compatible single-origin fallback.
   - `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` are managed by the Supabase Edge runtime. Verify their presence, but never override, expose, or copy them to Netlify/browser variables.
5. Create the first administrator through Supabase Auth, then authorize that existing user with a controlled SQL operation:

```sql
insert into public.admin_users (user_id, role, is_active)
values ('AUTH_USER_UUID', 'owner', true);
```

No administrator account or historical application data is seeded by these migrations.

## Security model

- Public visitors use `submit-order`, `record-analytics-event`, and the dedicated customer-feedback functions. Each validates input, has an exact-origin CORS boundary, and uses server-side rate limiting where it creates records.
- Browser roles have no direct grants or RLS policy access to orders, settings, expenses, analytics, feedback, or rate-limit tables.
- Authenticated administrators use `manage-admin-data` and `manage-customer-feedback`. Each verifies a Supabase Auth access token and then checks an active `admin_users` role row server-side.
- `customer-feedback-media` is private and is accessed only through short-lived signed playback URLs generated for authorized administrators. No product media belongs in Supabase Storage.

## Netlify and GitHub handoff

`netlify.toml` is project-neutral and preserves the SPA fallback (`/*` to
`/index.html`) for the current React routes. Create a new Netlify site, set the
two browser variables above, and use the existing `npm run build` / `dist`
configuration.

The old `origin` remote is intentionally removed during this reset. When the
new GitHub repository exists, connect it explicitly:

```bash
git remote add origin NEW_GITHUB_REPOSITORY_URL
git push -u origin main
```

## Administrative email digests

Orders and customer feedback are persisted first. The browser never sends mail
and no SMTP setting is stored in `app_settings`. `notification_digest_jobs`
creates one durable job per completed Lagos business date and digest type.
`process-notification-digests` retries failed jobs with persisted backoff and
only marks a job sent after the SMTP transport returns successfully.

Set these secrets in Supabase Edge Function secrets only: `SMTP_HOST`,
`SMTP_PORT`, `SMTP_SECURE`, `SMTP_USERNAME`, `SMTP_PASSWORD`,
`SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, `ADMIN_NOTIFICATION_EMAIL`, and
`DIGEST_SCHEDULER_SECRET`. The legacy `SMTP_FROM` and
`NOTIFICATION_RECIPIENT` aliases remain accepted only to allow secret
rotation without a code change.

The default digest time is 08:15 `Africa/Lagos`, for the previous completed
day. Supabase Cron invokes `process-notification-digests` every 15 minutes for
the due daily delivery and bounded retries. The endpoint URL and scheduler
header secret are held only in Supabase Vault as
`notification_digest_processor_url` and
`notification_digest_scheduler_secret`; neither is browser-accessible.
`test-notification-email` is an owner-authorized configuration test and
creates no business record.

## Application identity assets

The active platform logo is managed through the owner-authorized Platform
Settings upload flow. Browser favicon and PWA installation icons are static
build assets under `public/`; changing those icon files requires a frontend
release, while in-app branding changes remain live through Platform Settings.

For Gmail use `SMTP_HOST=smtp.gmail.com` with either port `465` and
`SMTP_SECURE=true`, or port `587` and `SMTP_SECURE=false`. Use a Google App
Password for `SMTP_PASSWORD`, never the normal account password. The trusted
scheduler should invoke the digest processor at the selected 15-minute Lagos
time and may invoke it every 15 minutes afterward for persisted retries.

## Meta conversion tracking (COD)

Meta tracking is disabled by default and is configured by the owner in the
admin Settings area. The browser receives only the selected Pixel ID and
event toggles; it never receives any Conversions API credentials.

- A successfully persisted `New` order request queues a canonical `Lead`.
  The browser and CAPI share its durable event ID for Meta deduplication.
- `Purchase` is never emitted by a thank-you route, preview, or a new order.
  It is queued once, server-side, when an administrator transitions an order
  to `Paid`.
- `meta_event_deliveries` persists event IDs, delivery state, failures, and
  retry timing. Retried CAPI calls use the same ID.
- Multiple advertising accounts may point to this one dataset. Acquisition
  context (UTMs, `fbclid`, `fbp`, `fbc`, and optional account/campaign/ad-set/
  ad IDs) is stored privately per converted order and shown only as an
  owner-only aggregate. It never creates another Pixel or another event.

Set these secrets in Supabase Edge Function secrets only:
`META_CAPI_ACCESS_TOKEN`, `META_GRAPH_API_VERSION`, and
`META_PROCESSOR_SECRET`. Schedule a trusted server-to-server POST to
`process-meta-conversions` (for example every 15 minutes), supplying
`x-meta-processor-secret`. This processor has no browser CORS path and the
secret must never be placed in browser or Netlify variables.
