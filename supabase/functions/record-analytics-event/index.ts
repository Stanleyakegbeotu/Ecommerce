import { createClient } from 'npm:@supabase/supabase-js@2'

import { allowedRequestOrigin, json, preflight, rejectedRequestOrigin } from '../_shared/http.ts'
import { solarGeneratorProduct } from '../_shared/products.ts'

const eventTypes = new Set([
  'visitor', 'buy_click', 'package_selected', 'availability_confirmed', 'form_submitted',
  'exit_intent_detected', 'exit_feedback_shown', 'exit_feedback_dismissed', 'exit_feedback_reason_selected',
  'exit_feedback_text_opened', 'exit_feedback_text_submitted', 'exit_feedback_text_cancelled',
  'exit_feedback_submission_attempted', 'exit_feedback_submission_succeeded', 'exit_feedback_submission_failed',
  'exit_feedback_followup_offered', 'exit_feedback_followup_accepted', 'exit_feedback_followup_declined',
  'exit_feedback_phone_submission_attempted', 'exit_feedback_phone_submitted', 'exit_feedback_phone_submission_failed',
  'exit_feedback_voice_opened', 'exit_feedback_voice_permission_granted', 'exit_feedback_voice_permission_denied',
  'exit_feedback_voice_recording_started', 'exit_feedback_voice_recording_cancelled', 'exit_feedback_voice_recorded',
  'exit_feedback_voice_upload_started', 'exit_feedback_voice_submitted', 'exit_feedback_voice_upload_failed',
  'exit_feedback_recovery_selected', 'exit_feedback_returned', 'delivered', 'fulfilled', 'purchase',
])
const permittedMetadataKeys = new Set([
  'eventName', 'sessionId', 'timestamp', 'deviceCategory', 'funnelStage', 'currentFunnelStage', 'previousFunnelStage',
  'trafficSource', 'utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'utmTerm', 'campaignId', 'gclid', 'fbclid',
  'packageId', 'section', 'surface', 'orderId', 'previousStatus', 'currentStatus', 'exitSignal', 'exitStage',
  'reasonId', 'actionId', 'feedbackSource', 'feedbackId', 'durationMs', 'fileSizeBytes', 'attachmentId',
  'productId', 'productSlug',
])
const maximumRequestBytes = 12 * 1024
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeMetadata(value: unknown) {
  if (!isRecord(value)) return null
  const entries = Object.entries(value).flatMap(([key, item]) => {
    if (!permittedMetadataKeys.has(key) || typeof item !== 'string') return []
    const normalized = item.trim()
    return normalized && normalized.length <= 240 ? [[key, normalized] as const] : []
  })
  return Object.fromEntries(entries)
}

async function resolveActiveProductId(supabase: ReturnType<typeof createClient>, candidate: unknown) {
  if (candidate != null && (typeof candidate !== 'string' || !uuidPattern.test(candidate))) return null
  const productId = typeof candidate === 'string' ? candidate : solarGeneratorProduct.id
  const { data, error } = await supabase.from('products').select('id').eq('id', productId).eq('status', 'active').maybeSingle()
  return error || !data ? null : data.id
}

async function createRateLimitBucket(request: Request, sessionId?: string) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const clientAddress = forwardedFor || request.headers.get('x-real-ip') || 'unavailable'
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${clientAddress}|${sessionId ?? ''}`))
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  const origin = allowedRequestOrigin(request)
  if (!origin) return json({ error: 'Analytics service is unavailable.' }, 403, rejectedRequestOrigin())
  if (request.method === 'OPTIONS') return preflight(origin)
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin)

  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > maximumRequestBytes) return json({ error: 'Invalid analytics data.' }, 413, origin)
  const rawBody = await request.text()
  if (new TextEncoder().encode(rawBody).byteLength > maximumRequestBytes) return json({ error: 'Invalid analytics data.' }, 413, origin)
  const payload = (() => {
    try { return JSON.parse(rawBody) as { type?: unknown; metadata?: unknown; productId?: unknown } } catch { return null }
  })()
  const type = typeof payload?.type === 'string' && eventTypes.has(payload.type) ? payload.type : null
  const metadata = normalizeMetadata(payload?.metadata)
  if (!type || !metadata) return json({ error: 'Invalid analytics data.' }, 400, origin)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Analytics service is unavailable.' }, 503, origin)
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const productId = await resolveActiveProductId(supabase, payload?.productId)
  if (!productId) return json({ error: 'Invalid analytics data.' }, 400, origin)
  const rateLimitBucket = await createRateLimitBucket(request, metadata.sessionId)
  const { data: allowed, error: rateLimitError } = await supabase.rpc('consume_public_submission_rate_limit', {
    p_scope: 'analytics_event',
    p_bucket: rateLimitBucket,
    p_limit: 120,
    p_window_seconds: 600,
  })
  if (rateLimitError) return json({ error: 'Analytics service is unavailable.' }, 503, origin)
  if (!allowed) return json({ error: 'Please wait before sending more events.' }, 429, origin)

  const { error } = await supabase.from('analytics_events').insert({ type, metadata, product_id: productId })
  if (error) return json({ error: 'Analytics service is unavailable.' }, 503, origin)
  return json({ ok: true }, 201, origin)
})
