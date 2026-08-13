import { getAdminAccessToken } from '@/features/admin/adminAuthService'
import { invokeSupabaseFunction } from '@/lib/supabase/functions'

export type NotificationEventJob = {
  id: string
  event_type: 'order' | 'feedback'
  status: 'queued' | 'processing' | 'retrying' | 'sent' | 'failed' | 'skipped'
  attempt_count: number
  next_attempt_at: string
  sent_at: string | null
  last_error: string | null
  created_at: string
}

export type NotificationDiagnostic = { status: 'sent' | 'failed'; error_code: string | null; created_at: string }
export type NotificationOperations = { jobs: NotificationEventJob[]; diagnostics: NotificationDiagnostic[]; smtpConfigured: boolean; schedulerConfigured: boolean; isOwner: boolean }

async function invokeOperations<T>(body: Record<string, unknown>) {
  return invokeSupabaseFunction<T>('manage-notification-operations', body, { Authorization: `Bearer ${await getAdminAccessToken()}` })
}

export function loadNotificationOperations() { return invokeOperations<NotificationOperations>({ action: 'load' }) }
export function retryNotificationEvent(jobId: string) { return invokeOperations<{ ok: true }>({ action: 'retry_event', jobId }) }
export async function sendSmtpConfigurationTest() {
  return invokeSupabaseFunction<{ ok: true }>('test-notification-email', {}, { Authorization: `Bearer ${await getAdminAccessToken()}` })
}
