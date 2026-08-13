export const customerFeedbackMediaBucket = 'customer-feedback-media'
export const voiceFeedbackMaximumDurationMs = 30_000
export const voiceFeedbackMinimumDurationMs = 1_000
export const voiceFeedbackMaximumFileSizeBytes = 3 * 1024 * 1024

const supportedAudioMimeTypes = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'])

export function normalizeVoiceMimeType(value: unknown) {
  if (typeof value !== 'string') return null
  const mimeType = value.split(';', 1)[0]?.trim().toLowerCase()
  return mimeType && supportedAudioMimeTypes.has(mimeType) ? mimeType : null
}

export function voiceFileExtension(mimeType: string) {
  if (mimeType === 'audio/webm') return 'webm'
  if (mimeType === 'audio/ogg') return 'ogg'
  if (mimeType === 'audio/mp4') return 'm4a'
  return 'mp3'
}
