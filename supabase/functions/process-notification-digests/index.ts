import { createClient } from 'npm:@supabase/supabase-js@2'

import { feedbackDigest, orderDigest } from '../_shared/notificationDigest.ts'
import { processPendingImmediateNotifications } from '../_shared/immediateNotifications.ts'
import { sendAdministrativeEmail } from '../_shared/smtp.ts'

type DigestJob = { id: string; digest_type: 'orders' | 'feedback'; digest_date: string; attempt_count: number }

function equalSecrets(actual: string | null, expected: string) {
  if (!actual || actual.length !== expected.length) return false
  let result = 0
  for (let index = 0; index < expected.length; index += 1) result |= actual.charCodeAt(index) ^ expected.charCodeAt(index)
  return result === 0
}

function bounds(date: string) {
  const start = new Date(`${date}T00:00:00+01:00`)
  return { start: start.toISOString(), end: new Date(start.getTime() + 86_400_000).toISOString() }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed.' }), { status: 405 })
  const schedulerSecret = Deno.env.get('DIGEST_SCHEDULER_SECRET')
  if (!schedulerSecret || !equalSecrets(request.headers.get('x-digest-scheduler-secret'), schedulerSecret)) return new Response(JSON.stringify({ error: 'Unauthorized.' }), { status: 401 })
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRole) return new Response(JSON.stringify({ error: 'Service unavailable.' }), { status: 503 })
  const supabase = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } })
  // The scheduler remains an authenticated server-only retry path. New records
  // are attempted in their submission function before this fallback runs.
  const immediateProcessed = await processPendingImmediateNotifications(supabase, 8)
  await supabase.rpc('recover_stale_notification_digests')
  await supabase.rpc('queue_due_notification_digests')
  const { data: jobs } = await supabase.from('notification_digest_jobs').select('id,digest_type,digest_date,attempt_count').in('status', ['queued', 'retrying']).lte('next_attempt_at', new Date().toISOString()).order('created_at').limit(8)
  const { data: appSettings } = await supabase.from('app_settings').select('platform_name').eq('id', true).maybeSingle()
  const platformName = appSettings?.platform_name ?? 'Platform'
  let processed = 0
  for (const job of (jobs ?? []) as DigestJob[]) {
    const { data: claimed } = await supabase.rpc('claim_notification_digest', { p_job_id: job.id })
    if (!claimed) continue
    try {
      const range = bounds(job.digest_date)
      if (job.digest_type === 'orders') {
        const { data, error } = await supabase.from('orders').select('id,customer,package_snapshot,estimated_delivery,status,products(name)').gte('created_at', range.start).lt('created_at', range.end).order('created_at')
        if (error) throw new Error('order_digest_data_unavailable')
        if (!data?.length) { await supabase.rpc('skip_notification_digest', { p_job_id: job.id, p_reason: 'empty_digest' }); continue }
        const digest = orderDigest(job.digest_date, data.map((order) => ({ ...order, product_name: (order.products as { name?: string } | null)?.name ?? null })), platformName)
        const messageId = await sendAdministrativeEmail({ ...digest, messageId: `<orders-${job.digest_date}-${job.id}@notification.local>` }, { platformName })
        await supabase.rpc('complete_notification_digest', { p_job_id: job.id, p_provider_message_id: messageId })
      } else {
        const { data, error } = await supabase.from('customer_feedback').select('id,reason_id,feedback_text,selected_package_id,status,products(name),customer_feedback_followups(followup_status,phone_e164),customer_feedback_attachments(id)').gte('created_at', range.start).lt('created_at', range.end).order('created_at')
        if (error) throw new Error('feedback_digest_data_unavailable')
        if (!data?.length) { await supabase.rpc('skip_notification_digest', { p_job_id: job.id, p_reason: 'empty_digest' }); continue }
        const digest = feedbackDigest(job.digest_date, data.map((feedback) => ({ ...feedback, product_name: (feedback.products as { name?: string } | null)?.name ?? null })), platformName)
        const messageId = await sendAdministrativeEmail({ ...digest, messageId: `<feedback-${job.digest_date}-${job.id}@notification.local>` }, { platformName })
        await supabase.rpc('complete_notification_digest', { p_job_id: job.id, p_provider_message_id: messageId })
      }
      processed += 1
    } catch (error) {
      const code = error instanceof Error ? error.message.replace(/[^a-z0-9_:-]/gi, '_').slice(0, 120) : 'delivery_failed'
      await supabase.rpc('fail_notification_digest', { p_job_id: job.id, p_error_code: code })
    }
  }
  return Response.json({ processed: processed + immediateProcessed })
})
