import { createClient } from 'npm:@supabase/supabase-js@2'

import { authorizeActiveAdministrator } from '../_shared/adminAuth.ts'
import { allowedRequestOrigin, rejectedRequestOrigin } from '../_shared/http.ts'
import { customerFeedbackMediaBucket } from '../_shared/voiceFeedback.ts'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const statuses = new Set(['new', 'reviewed', 'resolved'])
const reasonIds = new Set(['price', 'trust', 'product_information', 'delivery', 'not_ready', 'comparing', 'something_else'])
const sources = new Set(['quick_reason', 'something_else', 'tell_more'])
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const pageSizeDefault = 20
const pageSizeMaximum = 25

type RequestBody = {
  action?: unknown
  feedbackId?: unknown
  attachmentId?: unknown
  status?: unknown
  adminNote?: unknown
  filters?: unknown
}

type Filters = {
  status?: unknown
  reasonId?: unknown
  source?: unknown
  packageId?: unknown
  date?: unknown
  search?: unknown
  sort?: unknown
  page?: unknown
  pageSize?: unknown
}

type FeedbackCountFilter = {
  status?: 'new' | 'reviewed' | 'resolved'
  createdSince?: string
}

function json(body: Record<string, unknown>, status: number, origin: string) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin } })
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && uuidPattern.test(value)
}

function normalizeFilters(value: unknown) {
  const filters = (value && typeof value === 'object' ? value : {}) as Filters
  const status = filters.status === 'all' || statuses.has(filters.status as string) ? filters.status as string : 'all'
  const reasonId = filters.reasonId === 'all' || reasonIds.has(filters.reasonId as string) ? filters.reasonId as string : 'all'
  const source = filters.source === 'all' || sources.has(filters.source as string) ? filters.source as string : 'all'
  const date = ['all', 'today', 'last_7_days', 'last_30_days'].includes(filters.date as string) ? filters.date as string : 'all'
  const sort = ['newest', 'oldest', 'updated'].includes(filters.sort as string) ? filters.sort as string : 'newest'
  const packageId = typeof filters.packageId === 'string' && /^[a-z0-9-]{1,80}$/.test(filters.packageId) ? filters.packageId : 'all'
  const search = typeof filters.search === 'string' ? filters.search.trim().slice(0, 100) : ''
  const page = typeof filters.page === 'number' && Number.isInteger(filters.page) && filters.page > 0 ? filters.page : 1
  const pageSize = typeof filters.pageSize === 'number' && Number.isInteger(filters.pageSize) && filters.pageSize > 0 && filters.pageSize <= pageSizeMaximum ? filters.pageSize : pageSizeDefault
  return { status, reasonId, source, packageId, date, sort, search, page, pageSize }
}

function dateStart(date: string) {
  const now = new Date()
  if (date === 'today') return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
  if (date === 'last_7_days') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  if (date === 'last_30_days') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  return undefined
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, '\\$&')
}

function feedbackColumns() {
  return 'id,session_id,reason_id,feedback_text,source,funnel_stage,last_section,selected_package_id,checkout_opened,form_started,status,reviewed_at,reviewed_by,resolved_at,resolved_by,admin_note,admin_note_author_id,admin_note_updated_at,created_at,updated_at'
}

function followupColumns() {
  return 'id,consent_state,followup_status,phone_e164,consented_at,phone_submitted_at'
}

function attachmentColumns() {
  return 'id,attachment_type,mime_type,duration_ms,file_size_bytes,created_at'
}

function mapFollowup(row: Record<string, unknown> | null) {
  if (!row) return null
  return {
    id: row.id,
    consentState: row.consent_state,
    followupStatus: row.followup_status,
    phoneE164: row.phone_e164,
    consentedAt: row.consented_at,
    phoneSubmittedAt: row.phone_submitted_at,
  }
}

function mapVoiceAttachment(row: Record<string, unknown> | null) {
  if (!row || row.attachment_type !== 'voice_note') return null
  return {
    id: row.id,
    mimeType: row.mime_type,
    durationMs: row.duration_ms,
    fileSizeBytes: row.file_size_bytes,
    createdAt: row.created_at,
  }
}

function mapFeedback(row: Record<string, unknown>, includeText = true, followup: Record<string, unknown> | null = null, voiceAttachment: Record<string, unknown> | null = null) {
  const feedbackText = typeof row.feedback_text === 'string' ? row.feedback_text : null
  return {
    id: row.id,
    sessionId: row.session_id,
    reasonId: row.reason_id,
    ...(includeText ? { feedbackText } : { feedbackPreview: feedbackText ? feedbackText.slice(0, 120) : null }),
    source: row.source,
    funnelStage: row.funnel_stage,
    lastSection: row.last_section,
    selectedPackageId: row.selected_package_id,
    checkoutOpened: row.checkout_opened,
    formStarted: row.form_started,
    status: row.status,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    adminNote: row.admin_note,
    adminNoteAuthorId: row.admin_note_author_id,
    followup: mapFollowup(followup),
    voiceAttachment: mapVoiceAttachment(voiceAttachment),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function countRows(supabase: ReturnType<typeof createClient>, filter: FeedbackCountFilter = {}) {
  let query = supabase.from('customer_feedback').select('id', { count: 'exact', head: true })
  if (filter.status) query = query.eq('status', filter.status)
  if (filter.createdSince) query = query.gte('created_at', filter.createdSince)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

Deno.serve(async (request) => {
  const allowedOrigin = allowedRequestOrigin(request)
  if (!allowedOrigin) return json({ error: 'Access denied.' }, 403, rejectedRequestOrigin())
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Allow-Origin': allowedOrigin } })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, allowedOrigin)

  const authorization = await authorizeActiveAdministrator(request)
  if (!authorization.administrator) return json({ error: authorization.error }, authorization.status, allowedOrigin)
  const { userId, supabase } = authorization.administrator

  const body = await request.json().catch(() => null) as RequestBody | null
  if (!body || typeof body.action !== 'string') return json({ error: 'Invalid request.' }, 400, allowedOrigin)
  if (body.action === 'verify') return json({ ok: true }, 200, allowedOrigin)

  try {
    if (body.action === 'voice_playback') {
      if (!isUuid(body.attachmentId)) return json({ error: 'Invalid voice attachment.' }, 400, allowedOrigin)
      const { data: attachment, error } = await supabase
        .from('customer_feedback_attachments')
        .select('id,storage_bucket,storage_path')
        .eq('id', body.attachmentId)
        .eq('attachment_type', 'voice_note')
        .maybeSingle()
      if (error || !attachment || attachment.storage_bucket !== customerFeedbackMediaBucket) return json({ error: 'Voice note not found.' }, 404, allowedOrigin)
      const { data: signed, error: signedError } = await supabase.storage.from(customerFeedbackMediaBucket).createSignedUrl(attachment.storage_path, 60)
      if (signedError || !signed?.signedUrl) throw signedError ?? new Error('Voice playback signing failed')
      return json({ playbackUrl: signed.signedUrl, expiresAt: new Date(Date.now() + 60_000).toISOString() }, 200, allowedOrigin)
    }

    if (body.action === 'summary') {
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const [total, fresh, reviewed, resolved, last7Days] = await Promise.all([
        countRows(supabase),
        countRows(supabase, { status: 'new' }),
        countRows(supabase, { status: 'reviewed' }),
        countRows(supabase, { status: 'resolved' }),
        countRows(supabase, { createdSince: lastWeek }),
      ])
      return json({ total, new: fresh, reviewed, resolved, last7Days }, 200, allowedOrigin)
    }

    if (body.action === 'list') {
      const filters = normalizeFilters(body.filters)
      let query = supabase.from('customer_feedback').select(feedbackColumns(), { count: 'exact' })
      if (filters.status !== 'all') query = query.eq('status', filters.status)
      if (filters.reasonId !== 'all') query = query.eq('reason_id', filters.reasonId)
      if (filters.source !== 'all') query = query.eq('source', filters.source)
      if (filters.packageId !== 'all') query = query.eq('selected_package_id', filters.packageId)
      const start = dateStart(filters.date)
      if (start) query = query.gte('created_at', start)
      if (filters.search) {
        if (isUuid(filters.search)) query = query.eq('id', filters.search)
        else if (reasonIds.has(filters.search)) query = query.eq('reason_id', filters.search)
        else query = query.ilike('feedback_text', `%${escapeLike(filters.search)}%`)
      }
      if (filters.sort === 'updated') query = query.order('updated_at', { ascending: false })
      else query = query.order('created_at', { ascending: filters.sort === 'oldest' })
      const from = (filters.page - 1) * filters.pageSize
      const { data, count, error } = await query.range(from, from + filters.pageSize - 1)
      if (error) throw error
      return json({ items: (data ?? []).map((item) => mapFeedback(item, false)), total: count ?? 0, page: filters.page, pageSize: filters.pageSize }, 200, allowedOrigin)
    }

    if (body.action === 'get') {
      if (!isUuid(body.feedbackId)) return json({ error: 'Invalid feedback record.' }, 400, allowedOrigin)
      const { data, error } = await supabase.from('customer_feedback').select(feedbackColumns()).eq('id', body.feedbackId).maybeSingle()
      if (error || !data) return json({ error: 'Feedback not found.' }, 404, allowedOrigin)
      const { data: followup, error: followupError } = await supabase.from('customer_feedback_followups').select(followupColumns()).eq('feedback_id', body.feedbackId).maybeSingle()
      if (followupError) throw followupError
      const { data: voiceAttachment, error: voiceAttachmentError } = await supabase.from('customer_feedback_attachments').select(attachmentColumns()).eq('feedback_id', body.feedbackId).eq('attachment_type', 'voice_note').maybeSingle()
      if (voiceAttachmentError) throw voiceAttachmentError
      return json({ feedback: mapFeedback(data, true, followup, voiceAttachment) }, 200, allowedOrigin)
    }

    if (body.action === 'update') {
      if (!isUuid(body.feedbackId)) return json({ error: 'Invalid feedback record.' }, 400, allowedOrigin)
      const noteProvided = Object.prototype.hasOwnProperty.call(body, 'adminNote')
      const adminNote = typeof body.adminNote === 'string' ? body.adminNote.trim() : body.adminNote === null ? null : undefined
      if (noteProvided && (adminNote === undefined || (adminNote !== null && adminNote.length > 2000))) return json({ error: 'Invalid admin note.' }, 400, allowedOrigin)
      const requestedStatus = typeof body.status === 'string' && statuses.has(body.status) ? body.status : undefined
      if (body.status !== undefined && !requestedStatus) return json({ error: 'Invalid status.' }, 400, allowedOrigin)
      if (!requestedStatus && !noteProvided) return json({ error: 'No update supplied.' }, 400, allowedOrigin)

      const { data: current, error: currentError } = await supabase.from('customer_feedback').select('status').eq('id', body.feedbackId).maybeSingle()
      if (currentError || !current) return json({ error: 'Feedback not found.' }, 404, allowedOrigin)

      const update: Record<string, unknown> = {}
      if (noteProvided) {
        update.admin_note = adminNote
        update.admin_note_author_id = userId
        update.admin_note_updated_at = new Date().toISOString()
      }
      if (requestedStatus) {
        const transition = `${current.status}:${requestedStatus}`
        if (!['new:reviewed', 'new:resolved', 'reviewed:resolved', 'resolved:reviewed'].includes(transition)) return json({ error: 'That status change is not allowed.' }, 409, allowedOrigin)
        const timestamp = new Date().toISOString()
        update.status = requestedStatus
        if (requestedStatus === 'reviewed') {
          update.reviewed_at = timestamp
          update.reviewed_by = userId
          update.resolved_at = null
          update.resolved_by = null
        } else {
          update.resolved_at = timestamp
          update.resolved_by = userId
          if (current.status === 'new') {
            update.reviewed_at = timestamp
            update.reviewed_by = userId
          }
        }
      }

      const { data, error } = await supabase.from('customer_feedback').update(update).eq('id', body.feedbackId).select(feedbackColumns()).maybeSingle()
      if (error || !data) throw error ?? new Error('Feedback update failed')
      const { data: followup, error: followupError } = await supabase.from('customer_feedback_followups').select(followupColumns()).eq('feedback_id', body.feedbackId).maybeSingle()
      if (followupError) throw followupError
      const { data: voiceAttachment, error: voiceAttachmentError } = await supabase.from('customer_feedback_attachments').select(attachmentColumns()).eq('feedback_id', body.feedbackId).eq('attachment_type', 'voice_note').maybeSingle()
      if (voiceAttachmentError) throw voiceAttachmentError
      return json({ feedback: mapFeedback(data, true, followup, voiceAttachment) }, 200, allowedOrigin)
    }

    return json({ error: 'Invalid request.' }, 400, allowedOrigin)
  } catch {
    return json({ error: 'We could not complete that request. Please try again.' }, 500, allowedOrigin)
  }
})
