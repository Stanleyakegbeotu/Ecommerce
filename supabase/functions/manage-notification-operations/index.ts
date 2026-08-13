import { authorizeActiveAdministrator } from '../_shared/adminAuth.ts'
import { allowedRequestOrigin, json, preflight, rejectedRequestOrigin } from '../_shared/http.ts'
import { smtpConfigurationStatus } from '../_shared/smtp.ts'

function isJobId(value: unknown): value is string { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) }

Deno.serve(async (request) => {
  const origin = allowedRequestOrigin(request)
  if (!origin) return json({ error: 'Notification service is unavailable.' }, 403, rejectedRequestOrigin())
  if (request.method === 'OPTIONS') return preflight(origin)
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin)
  const authorization = await authorizeActiveAdministrator(request)
  if (!authorization.administrator) return json({ error: authorization.error }, authorization.status, origin)
  const body = await request.json().catch(() => null) as { action?: unknown; jobId?: unknown; settings?: unknown } | null
  if (!body || typeof body.action !== 'string') return json({ error: 'Invalid request.' }, 400, origin)
  const { supabase, administrator } = { supabase: authorization.administrator.supabase, administrator: authorization.administrator }
  try {
    if (body.action === 'load') {
      const [{ data: jobs, error: jobsError }, { data: diagnostics, error: diagnosticsError }] = await Promise.all([
        supabase.from('notification_event_jobs').select('id,event_type,status,attempt_count,next_attempt_at,sent_at,last_error,created_at').order('created_at', { ascending: false }).limit(16),
        supabase.from('notification_diagnostics').select('status,error_code,created_at').order('created_at', { ascending: false }).limit(4),
      ])
      if (jobsError || diagnosticsError) throw new Error('notification_load_failed')
      return json({ jobs: jobs ?? [], diagnostics: diagnostics ?? [], smtpConfigured: smtpConfigurationStatus().configured, schedulerConfigured: Boolean(Deno.env.get('DIGEST_SCHEDULER_SECRET')), isOwner: administrator.role === 'owner' }, 200, origin)
    }
    if (body.action === 'retry_event') {
      if (!isJobId(body.jobId)) return json({ error: 'Invalid notification job.' }, 400, origin)
      const { data, error } = await supabase.rpc('retry_failed_notification_event', { p_job_id: body.jobId })
      if (error) throw error
      if (!data) return json({ error: 'Only a terminal failed notification can be retried.' }, 409, origin)
      return json({ ok: true }, 200, origin)
    }
    return json({ error: 'Unsupported action.' }, 400, origin)
  } catch {
    return json({ error: 'Notification service is unavailable. Please try again.' }, 503, origin)
  }
})
