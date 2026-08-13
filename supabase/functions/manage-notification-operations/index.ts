import { authorizeActiveAdministrator } from '../_shared/adminAuth.ts'
import { allowedRequestOrigin, json, preflight, rejectedRequestOrigin } from '../_shared/http.ts'
import { smtpConfigurationStatus } from '../_shared/smtp.ts'

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }
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
      const [{ data: settings, error: settingsError }, { data: jobs, error: jobsError }, { data: diagnostics, error: diagnosticsError }] = await Promise.all([
        supabase.from('notification_settings').select('enabled,digest_hour,digest_minute,timezone,updated_at').eq('id', true).single(),
        supabase.from('notification_digest_jobs').select('id,digest_type,digest_date,status,attempt_count,next_attempt_at,sent_at,last_error,created_at').order('created_at', { ascending: false }).limit(16),
        supabase.from('notification_diagnostics').select('status,error_code,created_at').order('created_at', { ascending: false }).limit(4),
      ])
      if (settingsError || jobsError || diagnosticsError || !settings) throw new Error('notification_load_failed')
      return json({ settings, jobs: jobs ?? [], diagnostics: diagnostics ?? [], smtpConfigured: smtpConfigurationStatus().configured, schedulerConfigured: Boolean(Deno.env.get('DIGEST_SCHEDULER_SECRET')), isOwner: administrator.role === 'owner' }, 200, origin)
    }
    if (body.action === 'retry_digest') {
      if (!isJobId(body.jobId)) return json({ error: 'Invalid digest job.' }, 400, origin)
      const { data, error } = await supabase.rpc('retry_notification_digest', { p_job_id: body.jobId })
      if (error) throw error
      if (!data) return json({ error: 'Only a terminal failed digest can be retried.' }, 409, origin)
      return json({ ok: true }, 200, origin)
    }
    if (body.action === 'save_settings') {
      if (administrator.role !== 'owner') return json({ error: 'Owner access is required.' }, 403, origin)
      if (!isRecord(body.settings)) return json({ error: 'Invalid settings.' }, 400, origin)
      const enabled = body.settings.enabled
      const hour = body.settings.digestHour
      const minute = body.settings.digestMinute
      if (typeof enabled !== 'boolean' || typeof hour !== 'number' || !Number.isInteger(hour) || hour < 0 || hour > 23 || typeof minute !== 'number' || !Number.isInteger(minute) || minute < 0 || minute > 59 || minute % 15 !== 0) return json({ error: 'Choose a valid 15-minute Lagos send time.' }, 400, origin)
      const { error } = await supabase.from('notification_settings').update({ enabled, digest_hour: hour, digest_minute: minute }).eq('id', true)
      if (error) throw error
      return json({ ok: true }, 200, origin)
    }
    return json({ error: 'Unsupported action.' }, 400, origin)
  } catch {
    return json({ error: 'Notification service is unavailable. Please try again.' }, 503, origin)
  }
})
