import { getAnalyticsSessionId } from '@/features/admin/trackingContext'
import { isSupabaseConfigured } from '@/lib/supabase/browserClient'
import { invokeSupabaseFunctionFormData } from '@/lib/supabase/functions'
import {
  normalizeVoiceMimeType,
  voiceFeedbackMaximumDurationMs,
  voiceFeedbackMaximumFileSizeBytes,
  voiceFeedbackMinimumDurationMs,
  voiceFileExtension,
} from '../../../supabase/functions/_shared/voiceFeedback'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type VoiceUploadResponse = {
  attachmentId: string
  mimeType: string
  durationMs: number
  fileSizeBytes: number
}

export type CustomerFeedbackVoiceSubmission = {
  feedbackId: string
  idempotencyKey: string
  blob: Blob
  mimeType: string
  durationMs: number
}

export function createCustomerFeedbackVoiceIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  throw new Error('Secure feedback identifiers are unavailable')
}

export async function submitCustomerFeedbackVoice(submission: CustomerFeedbackVoiceSubmission) {
  if (!isSupabaseConfigured() || !uuidPattern.test(submission.feedbackId) || !uuidPattern.test(submission.idempotencyKey)) {
    throw new Error('Voice feedback storage is unavailable')
  }

  const mimeType = normalizeVoiceMimeType(submission.mimeType)
  if (!mimeType || submission.blob.size < 1 || submission.blob.size > voiceFeedbackMaximumFileSizeBytes || !Number.isInteger(submission.durationMs) || submission.durationMs < voiceFeedbackMinimumDurationMs || submission.durationMs > voiceFeedbackMaximumDurationMs) {
    throw new Error('Voice recording is invalid')
  }

  const formData = new FormData()
  formData.append('feedbackId', submission.feedbackId)
  formData.append('sessionId', getAnalyticsSessionId())
  formData.append('idempotencyKey', submission.idempotencyKey)
  formData.append('durationMs', String(submission.durationMs))
  formData.append('mimeType', mimeType)
  formData.append('audio', submission.blob, `voice-note.${voiceFileExtension(mimeType)}`)

  const response = await invokeSupabaseFunctionFormData<VoiceUploadResponse>('submit-customer-feedback-voice', formData)
  if (!response || !uuidPattern.test(response.attachmentId) || normalizeVoiceMimeType(response.mimeType) !== mimeType || !Number.isInteger(response.durationMs) || !Number.isInteger(response.fileSizeBytes)) {
    throw new Error('Voice feedback storage returned an invalid response')
  }
  return response
}
