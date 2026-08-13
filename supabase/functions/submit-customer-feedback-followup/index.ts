import { createClient } from 'npm:@supabase/supabase-js@2'

import { allowedRequestOrigin, rejectedRequestOrigin } from '../_shared/http.ts'
import { normalizeNigerianMobileNumber } from '../_shared/nigerianPhone.ts'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const maximumRequestBytes = 8 * 1024

type RequestBody = {
  action?: unknown
  feedbackId?: unknown
  followupId?: unknown
  sessionId?: unknown
  consent?: unknown
  phone?: unknown
  idempotencyKey?: unknown
}

type FollowupRow = {
  id: string
  consent_state: 'accepted' | 'declined'
  followup_status: 'not_requested' | 'awaiting_contact' | 'requested' | 'contacted' | 'resolved' | 'unreachable'
  phone_e164: string | null
  consent_idempotency_key: string
  phone_submission_idempotency_key: string | null
}

function response(body: Record<string, unknown>, status: number, origin: string) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin } })
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && uuidPattern.test(value)
}

function mapFollowup(row: FollowupRow) {
  return {
    followupId: row.id,
    consentState: row.consent_state,
    followupStatus: row.followup_status,
    phoneSubmitted: Boolean(row.phone_e164),
  }
}

async function createRateLimitBucket(request: Request, sessionId: string) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const clientAddress = forwardedFor || request.headers.get('x-real-ip') || 'unavailable'
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`followup|${clientAddress}|${sessionId}`))
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  const allowedOrigin = allowedRequestOrigin(request)
  if (!allowedOrigin) return response({ error: 'Follow-up service is unavailable.' }, 403, rejectedRequestOrigin())
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Allow-Origin': allowedOrigin } })
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405, allowedOrigin)

  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > maximumRequestBytes) return response({ error: 'Invalid follow-up request.' }, 413, allowedOrigin)
  const rawBody = await request.text()
  if (new TextEncoder().encode(rawBody).byteLength > maximumRequestBytes) return response({ error: 'Invalid follow-up request.' }, 413, allowedOrigin)
  const body = (() => {
    try { return JSON.parse(rawBody) as RequestBody } catch { return null }
  })()

  if (!body || !isUuid(body.feedbackId) || !isUuid(body.sessionId) || !isUuid(body.idempotencyKey) || (body.action !== 'consent' && body.action !== 'phone')) {
    return response({ error: 'Invalid follow-up request.' }, 400, allowedOrigin)
  }
  if (body.action === 'consent' && body.consent !== 'accepted' && body.consent !== 'declined') return response({ error: 'Invalid follow-up request.' }, 400, allowedOrigin)
  const normalizedPhone = body.action === 'phone' ? normalizeNigerianMobileNumber(body.phone) : null
  if (body.action === 'phone' && (!isUuid(body.followupId) || !normalizedPhone)) return response({ error: 'Enter a valid Nigerian mobile number.' }, 400, allowedOrigin)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return response({ error: 'Follow-up service is unavailable.' }, 503, allowedOrigin)
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const rateLimitBucket = await createRateLimitBucket(request, body.sessionId)
  const { data: allowed, error: rateLimitError } = await supabase.rpc('consume_customer_feedback_submission_rate_limit', { p_bucket: rateLimitBucket })
  if (rateLimitError) return response({ error: 'Follow-up service is unavailable.' }, 503, allowedOrigin)
  if (!allowed) return response({ error: 'Please wait a few minutes before trying again.' }, 429, allowedOrigin)

  const { data: feedback, error: feedbackError } = await supabase
    .from('customer_feedback')
    .select('id')
    .eq('id', body.feedbackId)
    .eq('session_id', body.sessionId)
    .maybeSingle()
  if (feedbackError || !feedback) return response({ error: 'Follow-up context is unavailable.' }, 409, allowedOrigin)

  try {
    const { data: existing, error: existingError } = await supabase
      .from('customer_feedback_followups')
      .select('id,consent_state,followup_status,phone_e164,consent_idempotency_key,phone_submission_idempotency_key')
      .eq('feedback_id', body.feedbackId)
      .maybeSingle()
    if (existingError) throw existingError

    if (body.action === 'consent') {
      if (existing) {
        if (existing.consent_idempotency_key === body.idempotencyKey || existing.consent_state === body.consent) return response(mapFollowup(existing as FollowupRow), 200, allowedOrigin)
        if (existing.consent_state === 'declined' && body.consent === 'accepted') {
          const { data, error } = await supabase
            .from('customer_feedback_followups')
            .update({ consent_state: 'accepted', followup_status: 'awaiting_contact', consent_idempotency_key: body.idempotencyKey, consented_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select('id,consent_state,followup_status,phone_e164,consent_idempotency_key,phone_submission_idempotency_key')
            .single()
          if (error || !data) throw error ?? new Error('Follow-up consent update failed')
          return response(mapFollowup(data as FollowupRow), 200, allowedOrigin)
        }
        return response(mapFollowup(existing as FollowupRow), 200, allowedOrigin)
      }

      const consentState = body.consent as 'accepted' | 'declined'
      const { data, error } = await supabase
        .from('customer_feedback_followups')
        .insert({
          feedback_id: body.feedbackId,
          consent_state: consentState,
          followup_status: consentState === 'accepted' ? 'awaiting_contact' : 'not_requested',
          consent_idempotency_key: body.idempotencyKey,
        })
        .select('id,consent_state,followup_status,phone_e164,consent_idempotency_key,phone_submission_idempotency_key')
        .single()
      if (error || !data) {
        if (error?.code === '23505') {
          const { data: concurrent } = await supabase
            .from('customer_feedback_followups')
            .select('id,consent_state,followup_status,phone_e164,consent_idempotency_key,phone_submission_idempotency_key')
            .eq('feedback_id', body.feedbackId)
            .maybeSingle()
          if (concurrent) return response(mapFollowup(concurrent as FollowupRow), 200, allowedOrigin)
        }
        throw error ?? new Error('Follow-up consent insert failed')
      }
      return response(mapFollowup(data as FollowupRow), 201, allowedOrigin)
    }

    if (!existing || existing.id !== body.followupId || existing.consent_state !== 'accepted') return response({ error: 'Follow-up consent is unavailable.' }, 409, allowedOrigin)
    if (existing.phone_submission_idempotency_key === body.idempotencyKey) return response(mapFollowup(existing as FollowupRow), 200, allowedOrigin)
    const { data, error } = await supabase
      .from('customer_feedback_followups')
      .update({ phone_e164: normalizedPhone, followup_status: 'requested', phone_submission_idempotency_key: body.idempotencyKey, phone_submitted_at: new Date().toISOString() })
      .eq('id', existing.id)
      .eq('feedback_id', body.feedbackId)
      .select('id,consent_state,followup_status,phone_e164,consent_idempotency_key,phone_submission_idempotency_key')
      .single()
    if (error || !data) throw error ?? new Error('Follow-up phone update failed')
    return response(mapFollowup(data as FollowupRow), 200, allowedOrigin)
  } catch {
    return response({ error: 'We couldn’t save your contact details. Please try again.' }, 500, allowedOrigin)
  }
})
