import { getAnalyticsSessionId } from '@/features/admin/trackingContext'
import { isSupabaseConfigured } from '@/lib/supabase/browserClient'
import { invokeSupabaseFunction } from '@/lib/supabase/functions'
import { normalizeNigerianMobileNumber } from '../../../supabase/functions/_shared/nigerianPhone.ts'

export type CustomerFeedbackFollowupStatus = 'not_requested' | 'awaiting_contact' | 'requested' | 'contacted' | 'resolved' | 'unreachable'
export type CustomerFeedbackFollowupConsent = 'accepted' | 'declined'

type FollowupResponse = {
  followupId: string
  consentState: CustomerFeedbackFollowupConsent
  followupStatus: CustomerFeedbackFollowupStatus
  phoneSubmitted: boolean
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function createUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  throw new Error('Secure follow-up identifiers are unavailable')
}

function validateResponse(response: FollowupResponse) {
  if (!response || !uuidPattern.test(response.followupId)) throw new Error('Follow-up storage returned an invalid response')
  return response
}

function requireFeedbackContext(feedbackId: string) {
  const sessionId = getAnalyticsSessionId()
  if (!uuidPattern.test(feedbackId) || !uuidPattern.test(sessionId)) throw new Error('Follow-up context is unavailable')
  return sessionId
}

export function createCustomerFeedbackFollowupIdempotencyKey() {
  return createUuid()
}

export function normalizeFeedbackPhoneNumber(value: string) {
  return normalizeNigerianMobileNumber(value)
}

export async function saveCustomerFeedbackFollowupConsent(input: { feedbackId: string; consent: CustomerFeedbackFollowupConsent; idempotencyKey: string }) {
  if (!isSupabaseConfigured()) throw new Error('Follow-up storage is unavailable')
  const sessionId = requireFeedbackContext(input.feedbackId)
  if (!uuidPattern.test(input.idempotencyKey)) throw new Error('Follow-up request is invalid')
  const response = await invokeSupabaseFunction<FollowupResponse>('submit-customer-feedback-followup', {
    action: 'consent',
    feedbackId: input.feedbackId,
    sessionId,
    consent: input.consent,
    idempotencyKey: input.idempotencyKey,
  })
  return validateResponse(response)
}

export async function submitCustomerFeedbackFollowupPhone(input: { feedbackId: string; followupId: string; phone: string; idempotencyKey: string }) {
  if (!isSupabaseConfigured()) throw new Error('Follow-up storage is unavailable')
  const phone = normalizeFeedbackPhoneNumber(input.phone)
  if (!phone) throw new Error('Enter a valid Nigerian mobile number.')
  const sessionId = requireFeedbackContext(input.feedbackId)
  if (!uuidPattern.test(input.followupId) || !uuidPattern.test(input.idempotencyKey)) throw new Error('Follow-up request is invalid')
  const response = await invokeSupabaseFunction<FollowupResponse>('submit-customer-feedback-followup', {
    action: 'phone',
    feedbackId: input.feedbackId,
    followupId: input.followupId,
    sessionId,
    phone,
    idempotencyKey: input.idempotencyKey,
  })
  return validateResponse(response)
}
