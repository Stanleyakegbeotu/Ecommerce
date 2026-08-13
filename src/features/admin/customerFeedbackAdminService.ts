import { invokeSupabaseFunction } from '@/lib/supabase/functions'
import { getAdminAccessToken } from '@/features/admin/adminAuthService'
import type { CustomerFeedbackSource } from '@/features/exitFeedback/customerFeedbackService'
export type { CustomerFeedbackSource } from '@/features/exitFeedback/customerFeedbackService'
import type { ExitFeedbackStage, ExitReasonId } from '@/features/exitFeedback/exitFeedbackContent'

export type CustomerFeedbackStatus = 'new' | 'reviewed' | 'resolved'
export type CustomerFeedbackSort = 'newest' | 'oldest' | 'updated'
export type CustomerFeedbackDateFilter = 'all' | 'today' | 'last_7_days' | 'last_30_days'
export type CustomerFeedbackFollowupStatus = 'not_requested' | 'awaiting_contact' | 'requested' | 'contacted' | 'resolved' | 'unreachable'

export type AdminCustomerFeedbackFollowup = {
  id: string
  consentState: 'accepted' | 'declined'
  followupStatus: CustomerFeedbackFollowupStatus
  phoneE164: string | null
  consentedAt: string
  phoneSubmittedAt: string | null
}

export type AdminCustomerFeedbackVoiceAttachment = {
  id: string
  mimeType: string
  durationMs: number
  fileSizeBytes: number
  createdAt: string
}

export type AdminCustomerFeedback = {
  id: string
  sessionId: string
  reasonId: ExitReasonId
  feedbackText: string | null
  source: CustomerFeedbackSource
  funnelStage: ExitFeedbackStage
  lastSection: string
  selectedPackageId: string | null
  checkoutOpened: boolean
  formStarted: boolean
  status: CustomerFeedbackStatus
  reviewedAt: string | null
  resolvedAt: string | null
  reviewedBy: string | null
  resolvedBy: string | null
  adminNote: string | null
  adminNoteAuthorId: string | null
  followup: AdminCustomerFeedbackFollowup | null
  voiceAttachment: AdminCustomerFeedbackVoiceAttachment | null
  createdAt: string
  updatedAt: string
}

export type AdminCustomerFeedbackListItem = Omit<AdminCustomerFeedback, 'feedbackText'> & { feedbackPreview: string | null }

export type CustomerFeedbackSummary = {
  total: number
  new: number
  reviewed: number
  resolved: number
  last7Days: number
}

export type CustomerFeedbackFilters = {
  status?: CustomerFeedbackStatus | 'all'
  reasonId?: ExitReasonId | 'all'
  source?: CustomerFeedbackSource | 'all'
  packageId?: string | 'all'
  date?: CustomerFeedbackDateFilter
  search?: string
  sort?: CustomerFeedbackSort
  page?: number
  pageSize?: number
}

type FeedbackListResponse = { items: AdminCustomerFeedbackListItem[]; total: number; page: number; pageSize: number }
type FeedbackRecordResponse = { feedback: AdminCustomerFeedback }

async function invokeAdminFeedback<TResponse>(payload: unknown) {
  const accessToken = await getAdminAccessToken()
  return invokeSupabaseFunction<TResponse>('manage-customer-feedback', payload, { Authorization: `Bearer ${accessToken}` })
}

export async function verifyFeedbackAdminAccess() {
  await invokeAdminFeedback<{ ok: true }>({ action: 'verify' })
}

export async function getCustomerFeedbackSummary() {
  return invokeAdminFeedback<CustomerFeedbackSummary>({ action: 'summary' })
}

export async function listCustomerFeedback(filters: CustomerFeedbackFilters) {
  return invokeAdminFeedback<FeedbackListResponse>({ action: 'list', filters })
}

export async function getCustomerFeedback(feedbackId: string) {
  return invokeAdminFeedback<FeedbackRecordResponse>({ action: 'get', feedbackId })
}

export async function getCustomerFeedbackVoicePlayback(attachmentId: string) {
  return invokeAdminFeedback<{ playbackUrl: string; expiresAt: string }>({ action: 'voice_playback', attachmentId })
}

export async function updateCustomerFeedback(feedbackId: string, update: { status?: CustomerFeedbackStatus; adminNote?: string | null }) {
  return invokeAdminFeedback<FeedbackRecordResponse>({ action: 'update', feedbackId, ...update })
}
