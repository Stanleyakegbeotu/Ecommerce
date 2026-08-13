import { createClient } from 'npm:@supabase/supabase-js@2'

import {
  customerFeedbackMediaBucket,
  normalizeVoiceMimeType,
  voiceFeedbackMaximumDurationMs,
  voiceFeedbackMaximumFileSizeBytes,
  voiceFeedbackMinimumDurationMs,
  voiceFileExtension,
} from '../_shared/voiceFeedback.ts'
import { allowedRequestOrigin, rejectedRequestOrigin } from '../_shared/http.ts'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const maximumRequestBytes = voiceFeedbackMaximumFileSizeBytes + 24 * 1024

type AttachmentRow = {
  id: string
  mime_type: string
  duration_ms: number
  file_size_bytes: number
  upload_idempotency_key: string
  storage_path: string
}

function response(body: Record<string, unknown>, status: number, origin: string) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin } })
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && uuidPattern.test(value)
}

function mapAttachment(row: AttachmentRow) {
  return { attachmentId: row.id, mimeType: row.mime_type, durationMs: row.duration_ms, fileSizeBytes: row.file_size_bytes }
}

async function createRateLimitBucket(request: Request, sessionId: string) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const clientAddress = forwardedFor || request.headers.get('x-real-ip') || 'unavailable'
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`voice|${clientAddress}|${sessionId}`))
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hasExpectedAudioSignature(file: File, mimeType: string) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (mimeType === 'audio/webm') return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
  if (mimeType === 'audio/ogg') return bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53
  if (mimeType === 'audio/mp4') return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
  if (mimeType === 'audio/mpeg') return (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
  return false
}

Deno.serve(async (request) => {
  const allowedOrigin = allowedRequestOrigin(request)
  if (!allowedOrigin) return response({ error: 'Voice feedback service is unavailable.' }, 403, rejectedRequestOrigin())
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Allow-Origin': allowedOrigin } })
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405, allowedOrigin)

  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > maximumRequestBytes) return response({ error: 'Voice recording is too large.' }, 413, allowedOrigin)
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) return response({ error: 'Invalid voice feedback request.' }, 400, allowedOrigin)

  let formData: FormData
  try { formData = await request.formData() } catch { return response({ error: 'Invalid voice feedback request.' }, 400, allowedOrigin) }
  const feedbackId = formData.get('feedbackId')
  const sessionId = formData.get('sessionId')
  const idempotencyKey = formData.get('idempotencyKey')
  const durationMs = Number(formData.get('durationMs'))
  const claimedMimeType = normalizeVoiceMimeType(formData.get('mimeType'))
  const audio = formData.get('audio')
  if (!isUuid(feedbackId) || !isUuid(sessionId) || !isUuid(idempotencyKey) || !Number.isInteger(durationMs) || durationMs < voiceFeedbackMinimumDurationMs || durationMs > voiceFeedbackMaximumDurationMs || !claimedMimeType || !(audio instanceof File) || audio.size < 1 || audio.size > voiceFeedbackMaximumFileSizeBytes) {
    return response({ error: 'Invalid voice feedback request.' }, 400, allowedOrigin)
  }
  const fileMimeType = normalizeVoiceMimeType(audio.type)
  if (!fileMimeType || fileMimeType !== claimedMimeType || !(await hasExpectedAudioSignature(audio, fileMimeType))) {
    return response({ error: 'Unsupported voice recording format.' }, 400, allowedOrigin)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return response({ error: 'Voice feedback service is unavailable.' }, 503, allowedOrigin)
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const rateLimitBucket = await createRateLimitBucket(request, sessionId)
  const { data: allowed, error: rateLimitError } = await supabase.rpc('consume_customer_feedback_submission_rate_limit', { p_bucket: rateLimitBucket })
  if (rateLimitError) return response({ error: 'Voice feedback service is unavailable.' }, 503, allowedOrigin)
  if (!allowed) return response({ error: 'Please wait a few minutes before trying again.' }, 429, allowedOrigin)

  const { data: feedback, error: feedbackError } = await supabase.from('customer_feedback').select('id').eq('id', feedbackId).eq('session_id', sessionId).maybeSingle()
  if (feedbackError || !feedback) return response({ error: 'Voice feedback context is unavailable.' }, 409, allowedOrigin)

  const attachmentColumns = 'id,mime_type,duration_ms,file_size_bytes,upload_idempotency_key,storage_path'
  const { data: existingByKey, error: existingByKeyError } = await supabase.from('customer_feedback_attachments').select(attachmentColumns).eq('upload_idempotency_key', idempotencyKey).maybeSingle()
  if (existingByKeyError) return response({ error: 'Voice feedback service is unavailable.' }, 503, allowedOrigin)
  if (existingByKey) return response(mapAttachment(existingByKey as AttachmentRow), 200, allowedOrigin)

  const { data: existingVoice, error: existingVoiceError } = await supabase.from('customer_feedback_attachments').select(attachmentColumns).eq('feedback_id', feedbackId).eq('attachment_type', 'voice_note').maybeSingle()
  if (existingVoiceError) return response({ error: 'Voice feedback service is unavailable.' }, 503, allowedOrigin)
  if (existingVoice) return response(mapAttachment(existingVoice as AttachmentRow), 200, allowedOrigin)

  const attachmentId = crypto.randomUUID()
  const storagePath = `${feedbackId}/${attachmentId}.${voiceFileExtension(fileMimeType)}`
  const { error: uploadError } = await supabase.storage.from(customerFeedbackMediaBucket).upload(storagePath, audio, { contentType: fileMimeType, upsert: false })
  if (uploadError) return response({ error: 'We couldn’t upload your voice note. Please try again.' }, 503, allowedOrigin)

  const { data: attachment, error: attachmentError } = await supabase
    .from('customer_feedback_attachments')
    .insert({
      id: attachmentId,
      feedback_id: feedbackId,
      attachment_type: 'voice_note',
      storage_bucket: customerFeedbackMediaBucket,
      storage_path: storagePath,
      mime_type: fileMimeType,
      duration_ms: durationMs,
      file_size_bytes: audio.size,
      upload_idempotency_key: idempotencyKey,
    })
    .select(attachmentColumns)
    .single()
  if (attachmentError || !attachment) {
    await supabase.storage.from(customerFeedbackMediaBucket).remove([storagePath])
    if (attachmentError?.code === '23505') {
      const { data: concurrent } = await supabase.from('customer_feedback_attachments').select(attachmentColumns).eq('feedback_id', feedbackId).eq('attachment_type', 'voice_note').maybeSingle()
      if (concurrent) return response(mapAttachment(concurrent as AttachmentRow), 200, allowedOrigin)
    }
    return response({ error: 'We couldn’t save your voice note. Please try again.' }, 503, allowedOrigin)
  }
  return response(mapAttachment(attachment as AttachmentRow), 201, allowedOrigin)
})
