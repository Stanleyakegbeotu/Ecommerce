import { createClient } from 'npm:@supabase/supabase-js@2'

import { feedbackDigest, formatDigestDate, orderDigest } from './notificationDigest.ts'
import { sendAdministrativeEmail } from './smtp.ts'

type EventJob = { id: string; event_type: 'order' | 'feedback'; order_id: string | null; feedback_id: string | null }

function lagosDate(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function orderReference(value: number | null | undefined) {
  return value && value > 0 ? `#${String(value).padStart(3, '0')}` : 'New order'
}

export async function processPendingImmediateNotifications(supabase: ReturnType<typeof createClient>, limit = 4) {
  await supabase.rpc('recover_stale_notification_events')
  const { data: jobs } = await supabase
    .from('notification_event_jobs')
    .select('id,event_type,order_id,feedback_id')
    .in('status', ['queued', 'retrying'])
    .lte('next_attempt_at', new Date().toISOString())
    .order('created_at')
    .limit(limit)
  const { data: appSettings } = await supabase.from('app_settings').select('platform_name,platform_logo_path').eq('id', true).maybeSingle()
  const platformName = appSettings?.platform_name ?? 'Platform'
  const platformLogoUrl = appSettings?.platform_logo_path
    ? supabase.storage.from('platform-branding').getPublicUrl(appSettings.platform_logo_path).data.publicUrl
    : null
  let processed = 0

  for (const job of (jobs ?? []) as EventJob[]) {
    const { data: claimed } = await supabase.rpc('claim_notification_event', { p_job_id: job.id })
    if (!claimed) continue
    try {
      if (job.event_type === 'order' && job.order_id) {
        const { data: order, error } = await supabase
          .from('orders')
          .select('id,display_number,customer,package_snapshot,estimated_delivery,status,created_at,products(name)')
          .eq('id', job.order_id)
          .maybeSingle()
        if (error || !order) throw new Error('order_notification_data_unavailable')
        const date = lagosDate(order.created_at)
        const digest = orderDigest(date, [{ ...order, product_name: (order.products as { name?: string } | null)?.name ?? null }], platformName, platformLogoUrl)
        const messageId = await sendAdministrativeEmail({ ...digest, subject: `New order ${orderReference(order.display_number)} | ${formatDigestDate(date)}`, messageId: `<order-${order.id}-${job.id}@notification.local>` }, { platformName })
        await supabase.rpc('complete_notification_event', { p_job_id: job.id, p_provider_message_id: messageId })
      } else if (job.event_type === 'feedback' && job.feedback_id) {
        const { data: feedback, error } = await supabase
          .from('customer_feedback')
          .select('id,reason_id,feedback_text,selected_package_id,status,created_at,products(name),customer_feedback_followups(followup_status,phone_e164),customer_feedback_attachments(id)')
          .eq('id', job.feedback_id)
          .maybeSingle()
        if (error || !feedback) throw new Error('feedback_notification_data_unavailable')
        const date = lagosDate(feedback.created_at)
        const digest = feedbackDigest(date, [{ ...feedback, product_name: (feedback.products as { name?: string } | null)?.name ?? null }], platformName, platformLogoUrl)
        const messageId = await sendAdministrativeEmail({ ...digest, subject: `New customer feedback | ${formatDigestDate(date)}`, messageId: `<feedback-${feedback.id}-${job.id}@notification.local>` }, { platformName })
        await supabase.rpc('complete_notification_event', { p_job_id: job.id, p_provider_message_id: messageId })
      } else {
        throw new Error('notification_event_target_invalid')
      }
      processed += 1
    } catch (error) {
      const code = error instanceof Error ? error.message.replace(/[^a-z0-9_:-]/gi, '_').slice(0, 120) : 'delivery_failed'
      await supabase.rpc('fail_notification_event', { p_job_id: job.id, p_error_code: code })
    }
  }
  return processed
}
