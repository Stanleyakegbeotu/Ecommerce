import { getAdminAccessToken } from '@/features/admin/adminAuthService'
import { invokeSupabaseFunction } from '@/lib/supabase/functions'

export type NotificationSettings = { enabled: boolean; digest_hour: number; digest_minute: number; timezone: 'Africa/Lagos'; updated_at: string }
export type NotificationJob = { id: string; digest_type: 'orders' | 'feedback'; digest_date: string; status: 'queued' | 'processing' | 'retrying' | 'sent' | 'failed' | 'skipped'; attempt_count: number; next_attempt_at: string; sent_at: string | null; last_error: string | null; created_at: string }
export type NotificationDiagnostic = { status: 'sent' | 'failed'; error_code: string | null; created_at: string }
export type NotificationOperations = { settings: NotificationSettings; jobs: NotificationJob[]; diagnostics: NotificationDiagnostic[]; smtpConfigured: boolean; schedulerConfigured: boolean; isOwner: boolean }

async function invokeOperations<T>(body: unknown) {
  return invokeSupabaseFunction<T>('manage-notification-operations', body, { Authorization: `Bearer ${await getAdminAccessToken()}` })
}

export function loadNotificationOperations() { return invokeOperations<NotificationOperations>({ action: 'load' }) }
export function retryNotificationDigest(jobId: string) { return invokeOperations<{ ok: true }>({ action: 'retry_digest', jobId }) }
export function saveNotificationSchedule(settings: { enabled: boolean; digestHour: number; digestMinute: number }) { return invokeOperations<{ ok: true }>({ action: 'save_settings', settings }) }
export async function sendSmtpConfigurationTest() {
  return invokeSupabaseFunction<{ ok: true }>('test-notification-email', {}, { Authorization: `Bearer ${await getAdminAccessToken()}` })
}
