import { createClient } from 'npm:@supabase/supabase-js@2'

import { customerFeedbackTextMaxLength } from '../_shared/customerFeedback.ts'
import { allowedRequestOrigin, rejectedRequestOrigin } from '../_shared/http.ts'
import { processPendingImmediateNotifications } from '../_shared/immediateNotifications.ts'
import { solarGeneratorProduct } from '../_shared/products.ts'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const reasonIds = new Set(['price', 'trust', 'product_information', 'delivery', 'not_ready', 'comparing', 'something_else'])
const sources = new Set(['quick_reason', 'something_else', 'tell_more'])
const funnelStages = new Set(['packages', 'checkout', 'other'])
const sections = new Set(['hero', 'proof', 'demo', 'reviews', 'packages', 'benefits', 'gallery', 'about', 'order', 'faq'])
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const maximumRequestBytes = 12 * 1024

type Submission = {
  feedbackId?: unknown
  idempotencyKey?: unknown
  sessionId?: unknown
  reasonId?: unknown
  feedbackText?: unknown
  source?: unknown
  funnelStage?: unknown
  lastSection?: unknown
  selectedPackageId?: unknown
  checkoutOpened?: unknown
  formStarted?: unknown
  productId?: unknown
}

function response(body: Record<string, string>, status: number, origin: string) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin } })
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && uuidPattern.test(value)
}

function validOptionalPackageId(value: unknown) {
  return value == null || (typeof value === 'string' && /^[a-z0-9-]{1,80}$/.test(value))
}

async function resolveActiveProductId(supabase: ReturnType<typeof createClient>, candidate: unknown) {
  if (candidate != null && !isUuid(candidate)) return null
  const productId = typeof candidate === 'string' ? candidate : solarGeneratorProduct.id
  const { data, error } = await supabase.from('products').select('id').eq('id', productId).eq('status', 'active').maybeSingle()
  return error || !data ? null : data.id
}

function normalizeSubmission(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  const candidate = payload as Submission
  const feedbackText = typeof candidate.feedbackText === 'string' ? candidate.feedbackText.trim() : null
  if (
    !isUuid(candidate.idempotencyKey)
    || !isUuid(candidate.sessionId)
    || (candidate.feedbackId != null && !isUuid(candidate.feedbackId))
    || typeof candidate.reasonId !== 'string' || !reasonIds.has(candidate.reasonId)
    || typeof candidate.source !== 'string' || !sources.has(candidate.source)
    || typeof candidate.funnelStage !== 'string' || !funnelStages.has(candidate.funnelStage)
    || typeof candidate.lastSection !== 'string' || !sections.has(candidate.lastSection)
    || !validOptionalPackageId(candidate.selectedPackageId)
    || typeof candidate.checkoutOpened !== 'boolean'
    || typeof candidate.formStarted !== 'boolean'
    || (candidate.feedbackText != null && (typeof candidate.feedbackText !== 'string' || !feedbackText || feedbackText.length > customerFeedbackTextMaxLength))
    || (candidate.feedbackId != null && !feedbackText)
    || (candidate.reasonId === 'something_else' && !feedbackText)
  ) {
    return null
  }

  return {
    feedbackId: candidate.feedbackId as string | undefined,
    idempotencyKey: candidate.idempotencyKey as string,
    sessionId: candidate.sessionId as string,
    reasonId: candidate.reasonId,
    feedbackText,
    source: candidate.source,
    funnelStage: candidate.funnelStage,
    lastSection: candidate.lastSection,
    selectedPackageId: candidate.selectedPackageId as string | null | undefined,
    checkoutOpened: candidate.checkoutOpened,
    formStarted: candidate.formStarted,
    productId: candidate.productId as string | undefined,
  }
}

async function createRateLimitBucket(request: Request, sessionId: string) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const clientAddress = forwardedFor || request.headers.get('x-real-ip') || 'unavailable'
  const source = `${clientAddress}|${sessionId}`
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  const allowedOrigin = allowedRequestOrigin(request)
  if (!allowedOrigin) return response({ error: 'Feedback service is unavailable.' }, 403, rejectedRequestOrigin())
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Allow-Origin': allowedOrigin } })
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405, allowedOrigin)

  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > maximumRequestBytes) return response({ error: 'Invalid feedback data.' }, 413, allowedOrigin)
  const rawBody = await request.text()
  if (new TextEncoder().encode(rawBody).byteLength > maximumRequestBytes) return response({ error: 'Invalid feedback data.' }, 413, allowedOrigin)
  const payload = normalizeSubmission((() => {
    try { return JSON.parse(rawBody) } catch { return null }
  })())
  if (!payload) return response({ error: 'Invalid feedback data.' }, 400, allowedOrigin)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return response({ error: 'Feedback service is unavailable.' }, 503, allowedOrigin)
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const productId = await resolveActiveProductId(supabase, payload.productId)
  if (!productId) return response({ error: 'This product is unavailable.' }, 400, allowedOrigin)
  const rateLimitBucket = await createRateLimitBucket(request, payload.sessionId)
  const { data: allowed, error: rateLimitError } = await supabase.rpc('consume_customer_feedback_submission_rate_limit', { p_bucket: rateLimitBucket })
  if (rateLimitError) return response({ error: 'Feedback service is unavailable.' }, 503, allowedOrigin)
  if (!allowed) return response({ error: 'Please wait a few minutes before sending more feedback.' }, 429, allowedOrigin)

  if (payload.feedbackId) {
    const { data, error } = await supabase
      .from('customer_feedback')
      .update({
        feedback_text: payload.feedbackText,
        source: payload.source,
        funnel_stage: payload.funnelStage,
        last_section: payload.lastSection,
        selected_package_id: payload.selectedPackageId ?? null,
        checkout_opened: payload.checkoutOpened,
        form_started: payload.formStarted,
      })
      .eq('id', payload.feedbackId)
      .eq('session_id', payload.sessionId)
      .eq('reason_id', payload.reasonId)
      .select('id')
      .maybeSingle()
    if (error || !data) return response({ error: 'We could not save your feedback. Please try again.' }, 409, allowedOrigin)
    return response({ feedbackId: data.id }, 200, allowedOrigin)
  }

  const { data: existing } = await supabase
    .from('customer_feedback')
    .select('id, session_id, reason_id')
    .eq('idempotency_key', payload.idempotencyKey)
    .maybeSingle()
  if (existing) {
    if (existing.session_id !== payload.sessionId || existing.reason_id !== payload.reasonId) {
      return response({ error: 'Invalid feedback request.' }, 409, allowedOrigin)
    }
    if (payload.feedbackText) {
      const { data: updated, error: updateError } = await supabase
        .from('customer_feedback')
        .update({
          feedback_text: payload.feedbackText,
          source: payload.source,
          funnel_stage: payload.funnelStage,
          last_section: payload.lastSection,
          selected_package_id: payload.selectedPackageId ?? null,
          checkout_opened: payload.checkoutOpened,
          form_started: payload.formStarted,
        })
        .eq('id', existing.id)
        .eq('session_id', payload.sessionId)
        .select('id')
        .maybeSingle()
      if (updateError || !updated) return response({ error: 'We could not save your feedback. Please try again.' }, 409, allowedOrigin)
    }
    return response({ feedbackId: existing.id }, 200, allowedOrigin)
  }

  const { data, error } = await supabase
    .from('customer_feedback')
    .insert({
      idempotency_key: payload.idempotencyKey,
      session_id: payload.sessionId,
      reason_id: payload.reasonId,
      feedback_text: payload.feedbackText,
      source: payload.source,
      funnel_stage: payload.funnelStage,
      last_section: payload.lastSection,
      selected_package_id: payload.selectedPackageId ?? null,
      product_id: productId,
      checkout_opened: payload.checkoutOpened,
      form_started: payload.formStarted,
    })
    .select('id')
    .single()
  if (error || !data) {
    if (error?.code === '23505') {
      const { data: concurrent } = await supabase
        .from('customer_feedback')
        .select('id, session_id, reason_id')
        .eq('idempotency_key', payload.idempotencyKey)
        .maybeSingle()
      if (concurrent && concurrent.session_id === payload.sessionId && concurrent.reason_id === payload.reasonId) {
        return response({ feedbackId: concurrent.id }, 200, allowedOrigin)
      }
    }
    return response({ error: 'We could not save your feedback. Please try again.' }, 500, allowedOrigin)
  }

  // New feedback is persisted first. A durable job is created by the database
  // trigger, then attempted immediately without coupling delivery to the visitor.
  const notificationTask = processPendingImmediateNotifications(supabase, 2).catch(() => undefined)
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(notificationTask)

  return response({ feedbackId: data.id }, 201, allowedOrigin)
})
