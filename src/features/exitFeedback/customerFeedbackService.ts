import { getAnalyticsSessionId, getCurrentProductContext } from '@/features/admin/trackingContext'
import { isSupabaseConfigured } from '@/lib/supabase/browserClient'
import { invokeSupabaseFunction } from '@/lib/supabase/functions'
import { exitFeedbackTextMaxLength, type ExitFeedbackStage, type ExitReasonId } from '@/features/exitFeedback/exitFeedbackContent'

export type CustomerFeedbackSource = 'quick_reason' | 'something_else' | 'tell_more'

export type CustomerFeedbackSubmission = {
  productId?: string
  feedbackId?: string
  idempotencyKey: string
  reasonId: ExitReasonId
  feedbackText?: string | null
  source: CustomerFeedbackSource
  funnelStage: ExitFeedbackStage
  lastSection: string
  selectedPackageId?: string
  checkoutOpened: boolean
  formStarted: boolean
}

type CustomerFeedbackResponse = { feedbackId: string }

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function createUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  throw new Error('Secure feedback identifiers are unavailable')
}

export function createCustomerFeedbackIdempotencyKey() {
  return createUuid()
}

function normalizeText(value: string | null | undefined) {
  if (value == null) return null
  const normalized = value.trim()
  if (!normalized || normalized.length > exitFeedbackTextMaxLength) {
    throw new Error('Feedback is invalid')
  }
  return normalized
}

export async function submitCustomerFeedback(submission: CustomerFeedbackSubmission) {
  if (!isSupabaseConfigured()) {
    throw new Error('Feedback storage is unavailable')
  }

  const sessionId = getAnalyticsSessionId()
  const feedbackText = normalizeText(submission.feedbackText)
  if (submission.reasonId === 'something_else' && !feedbackText) {
    throw new Error('Feedback is invalid')
  }

  const response = await invokeSupabaseFunction<CustomerFeedbackResponse>('submit-customer-feedback', {
    ...submission,
    productId: submission.productId ?? getCurrentProductContext().productId,
    feedbackText,
    sessionId,
  })
  if (!response || !uuidPattern.test(response.feedbackId)) {
    throw new Error('Feedback storage returned an invalid response')
  }

  return response
}
