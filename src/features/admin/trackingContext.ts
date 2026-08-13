import { getRegisteredProduct, SOLAR_GENERATOR_PRODUCT } from '@/features/products/productRegistry'

export type CanonicalAdminEventName =
  | 'visitor'
  | 'buy_click'
  | 'package_selected'
  | 'availability_confirmed'
  | 'form_submitted'
  | 'exit_intent_detected'
  | 'exit_feedback_shown'
  | 'exit_feedback_dismissed'
  | 'exit_feedback_reason_selected'
  | 'exit_feedback_text_opened'
  // Retained to read historical events; text submissions now use feedback persistence events below.
  | 'exit_feedback_text_submitted'
  | 'exit_feedback_text_cancelled'
  | 'exit_feedback_submission_attempted'
  | 'exit_feedback_submission_succeeded'
  | 'exit_feedback_submission_failed'
  | 'exit_feedback_followup_offered'
  | 'exit_feedback_followup_accepted'
  | 'exit_feedback_followup_declined'
  | 'exit_feedback_phone_submission_attempted'
  | 'exit_feedback_phone_submitted'
  | 'exit_feedback_phone_submission_failed'
  | 'exit_feedback_voice_opened'
  | 'exit_feedback_voice_permission_granted'
  | 'exit_feedback_voice_permission_denied'
  | 'exit_feedback_voice_recording_started'
  | 'exit_feedback_voice_recording_cancelled'
  | 'exit_feedback_voice_recorded'
  | 'exit_feedback_voice_upload_started'
  | 'exit_feedback_voice_submitted'
  | 'exit_feedback_voice_upload_failed'
  | 'exit_feedback_recovery_selected'
  | 'exit_feedback_returned'
  | 'delivered'
  | 'fulfilled'
  // Retained only to read historical analytics records created before the audit.
  | 'purchase'

export type TrackingMetadata = Record<string, string | undefined>

export function getCurrentProductContext() {
  const segments = typeof window === 'undefined' ? [] : window.location.pathname.split('/')
  const routeProduct = segments[1] === 'products' ? getRegisteredProduct(segments[2]) : undefined
  const product = routeProduct ?? SOLAR_GENERATOR_PRODUCT
  return {
    productId: product.id,
    productSlug: product.slug,
  }
}

const sessionIdKey = 'solar-generator:analytics-session:v1'
const visitorRecordedKey = 'solar-generator:analytics-visitor-recorded:v1'
const funnelStageKey = 'solar-generator:analytics-funnel-stage:v1'
const rapidEventWindowMs = 900
const recentEventTimes = new Map<string, number>()

const funnelStages: Partial<Record<CanonicalAdminEventName, string>> = {
  visitor: 'awareness',
  buy_click: 'consideration',
  package_selected: 'intent',
  availability_confirmed: 'qualification',
  form_submitted: 'conversion',
  exit_intent_detected: 'abandonment_risk',
  exit_feedback_shown: 'abandonment_risk',
  exit_feedback_dismissed: 'abandonment_risk',
  exit_feedback_reason_selected: 'objection_captured',
  exit_feedback_text_opened: 'objection_captured',
  exit_feedback_text_submitted: 'objection_captured',
  exit_feedback_text_cancelled: 'abandonment_risk',
  exit_feedback_submission_attempted: 'objection_captured',
  exit_feedback_submission_succeeded: 'objection_captured',
  exit_feedback_submission_failed: 'abandonment_risk',
  exit_feedback_followup_offered: 'recovery',
  exit_feedback_followup_accepted: 'recovery',
  exit_feedback_followup_declined: 'abandonment_risk',
  exit_feedback_phone_submission_attempted: 'recovery',
  exit_feedback_phone_submitted: 'recovery',
  exit_feedback_phone_submission_failed: 'abandonment_risk',
  exit_feedback_voice_opened: 'recovery',
  exit_feedback_voice_permission_granted: 'recovery',
  exit_feedback_voice_permission_denied: 'abandonment_risk',
  exit_feedback_voice_recording_started: 'recovery',
  exit_feedback_voice_recording_cancelled: 'abandonment_risk',
  exit_feedback_voice_recorded: 'recovery',
  exit_feedback_voice_upload_started: 'recovery',
  exit_feedback_voice_submitted: 'recovery',
  exit_feedback_voice_upload_failed: 'abandonment_risk',
  exit_feedback_recovery_selected: 'recovery',
  exit_feedback_returned: 'recovery',
  purchase: 'conversion',
  delivered: 'fulfillment',
  fulfilled: 'fulfillment',
}

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function getAnalyticsSessionId() {
  if (!canUseBrowserStorage()) {
    return 'unavailable'
  }

  try {
    const current = window.sessionStorage.getItem(sessionIdKey)
    if (current) {
      return current
    }

    const next = createId()
    window.sessionStorage.setItem(sessionIdKey, next)
    return next
  } catch {
    return 'unavailable'
  }
}

function readPreviousFunnelStage() {
  if (!canUseBrowserStorage()) {
    return undefined
  }

  try {
    return window.sessionStorage.getItem(funnelStageKey) ?? undefined
  } catch {
    return undefined
  }
}

function saveFunnelStage(stage: string | undefined) {
  if (!stage || !canUseBrowserStorage()) {
    return
  }

  try {
    window.sessionStorage.setItem(funnelStageKey, stage)
  } catch {
    // Analytics can still proceed without browser storage.
  }
}

function getCampaignContext() {
  if (typeof window === 'undefined') {
    return {}
  }

  const query = new URLSearchParams(window.location.search)
  const utmSource = query.get('utm_source') ?? undefined
  const utmMedium = query.get('utm_medium') ?? undefined
  const utmCampaign = query.get('utm_campaign') ?? undefined
  const utmContent = query.get('utm_content') ?? undefined
  const utmTerm = query.get('utm_term') ?? undefined
  const campaignId = query.get('campaign_id') ?? query.get('campaign') ?? undefined
  const gclid = query.get('gclid') ?? undefined
  const fbclid = query.get('fbclid') ?? undefined
  const metaAdAccountId = query.get('meta_ad_account_id') ?? query.get('ad_account_id') ?? query.get('adaccount_id') ?? undefined
  const metaCampaignId = query.get('meta_campaign_id') ?? campaignId
  const metaAdsetId = query.get('meta_adset_id') ?? query.get('adset_id') ?? query.get('ad_set_id') ?? undefined
  const metaAdId = query.get('meta_ad_id') ?? query.get('ad_id') ?? query.get('adid') ?? undefined
  let referrerSource: string | undefined
  if (document.referrer) {
    try {
      referrerSource = new URL(document.referrer).hostname
    } catch {
      referrerSource = undefined
    }
  }
  const trafficSource = utmSource ?? referrerSource ?? 'direct'

  return {
    trafficSource,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    campaignId,
    gclid,
    fbclid,
    metaAdAccountId,
    metaCampaignId,
    metaAdsetId,
    metaAdId,
  }
}

function getDeviceCategory() {
  if (typeof window === 'undefined') {
    return 'unknown'
  }

  if (window.matchMedia('(max-width: 767px)').matches) {
    return 'mobile'
  }

  if (window.matchMedia('(max-width: 1023px)').matches) {
    return 'tablet'
  }

  return 'desktop'
}

function compactMetadata(metadata: TrackingMetadata) {
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => typeof value === 'string' && value.length > 0)) as Record<string, string>
}

export function shouldTrackAdminEvent(eventName: CanonicalAdminEventName, metadata: TrackingMetadata = {}) {
  if (!canUseBrowserStorage()) {
    return true
  }

  try {
    if (eventName === 'visitor') {
      if (window.sessionStorage.getItem(visitorRecordedKey)) {
        return false
      }
      window.sessionStorage.setItem(visitorRecordedKey, 'true')
      return true
    }
  } catch {
    // Fall through to in-memory duplicate protection.
  }

  const eventKey = [eventName, metadata.packageId ?? '', metadata.surface ?? '', metadata.orderId ?? '', metadata.section ?? '', metadata.exitSignal ?? '', metadata.reasonId ?? '', metadata.actionId ?? '', metadata.feedbackSource ?? '', metadata.feedbackId ?? ''].join(':')
  const now = Date.now()
  const lastEventAt = recentEventTimes.get(eventKey)
  if (lastEventAt && now - lastEventAt < rapidEventWindowMs) {
    return false
  }

  recentEventTimes.set(eventKey, now)
  return true
}

export function createTrackingMetadata(eventName: CanonicalAdminEventName, metadata: TrackingMetadata = {}) {
  const currentFunnelStage = funnelStages[eventName]
  const base: TrackingMetadata = {
    eventName,
    sessionId: getAnalyticsSessionId(),
    timestamp: new Date().toISOString(),
    deviceCategory: getDeviceCategory(),
    ...getCurrentProductContext(),
    ...metadata,
  }

  if (currentFunnelStage) {
    const previousFunnelStage = readPreviousFunnelStage()
    base.funnelStage = currentFunnelStage
    base.currentFunnelStage = currentFunnelStage
    base.previousFunnelStage = previousFunnelStage
    saveFunnelStage(currentFunnelStage)
  }

  if (eventName !== 'delivered' && eventName !== 'fulfilled') {
    Object.assign(base, getCampaignContext())
  }

  return compactMetadata(base)
}
