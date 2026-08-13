import { createClient } from 'npm:@supabase/supabase-js@2'

import { allowedRequestOrigin, json, preflight, rejectedRequestOrigin } from '../_shared/http.ts'
import { processPendingImmediateNotifications } from '../_shared/immediateNotifications.ts'
import { processPendingMetaDeliveries } from '../_shared/metaConversions.ts'
import { solarGeneratorProduct } from '../_shared/products.ts'

const maximumRequestBytes = 24 * 1024
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Submission = {
  productId?: unknown
  orderId?: unknown
  customer?: unknown
  package?: unknown
  source?: unknown
  estimatedDelivery?: unknown
  metaAttribution?: unknown
}

function readString(value: unknown, minimum: number, maximum: number) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length >= minimum && normalized.length <= maximum ? normalized : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readAttribution(value: unknown, maximum = 300) {
  if (value == null) return null
  return typeof value === 'string' && value.length <= maximum ? value : undefined
}

function readMetaAttribution(value: unknown) {
  if (!isRecord(value)) return {}
  return {
    fbp: readAttribution(value.fbp, 200),
    fbc: readAttribution(value.fbc, 200),
    fbclid: readAttribution(value.fbclid, 512),
    traffic_source: readAttribution(value.trafficSource),
    utm_source: readAttribution(value.utmSource),
    utm_medium: readAttribution(value.utmMedium),
    utm_campaign: readAttribution(value.utmCampaign),
    utm_content: readAttribution(value.utmContent),
    utm_term: readAttribution(value.utmTerm),
    meta_ad_account_id: readAttribution(value.metaAdAccountId, 160),
    meta_campaign_id: readAttribution(value.metaCampaignId, 160),
    meta_adset_id: readAttribution(value.metaAdsetId, 160),
    meta_ad_id: readAttribution(value.metaAdId, 160),
  }
}

async function resolveActiveProductId(supabase: ReturnType<typeof createClient>, candidate: unknown) {
  if (candidate != null && (typeof candidate !== 'string' || !uuidPattern.test(candidate))) return null
  const productId = typeof candidate === 'string' ? candidate : solarGeneratorProduct.id
  const { data, error } = await supabase.from('products').select('id').eq('id', productId).eq('status', 'active').maybeSingle()
  return error || !data ? null : data.id
}

function normalizeCustomer(value: unknown) {
  if (!isRecord(value)) return null
  const fullName = readString(value.fullName, 2, 120)
  const phoneNumber = readString(value.phoneNumber, 7, 18)
  const whatsappNumber = value.whatsappNumber == null || value.whatsappNumber === '' ? '' : readString(value.whatsappNumber, 7, 18)
  const state = readString(value.state, 1, 80)
  const address = readString(value.address, 8, 500)
  const deliveryNote = value.deliveryNote == null || value.deliveryNote === '' ? '' : readString(value.deliveryNote, 1, 180)
  if (!fullName || !phoneNumber || whatsappNumber === null || !state || !address || deliveryNote === null) return null
  return { fullName, phoneNumber, whatsappNumber, state, address, deliveryNote }
}

function normalizePackage(value: unknown) {
  if (!isRecord(value)) return null
  const id = readString(value.id, 1, 80)
  const image = readString(value.image, 1, 1000)
  const imageAlt = readString(value.imageAlt, 1, 240)
  const title = readString(value.title, 1, 160)
  const product = readString(value.product, 1, 80)
  const promoPrice = readString(value.promoPrice, 1, 40)
  const oldPrice = readString(value.oldPrice, 1, 40)
  const savedAmount = readString(value.savedAmount, 1, 80)
  const description = readString(value.description, 1, 500)
  if (!id || !/^[a-z0-9-]{1,80}$/.test(id) || !image || !imageAlt || !title || !product || !promoPrice || !oldPrice || !savedAmount || !description) return null

  const offer = Array.isArray(value.offer) ? value.offer.map((item) => readString(item, 1, 240)) : []
  if (!offer.length || offer.length > 12 || offer.some((item) => !item)) return null
  const benefits = Array.isArray(value.benefits)
    ? value.benefits.map((benefit) => {
      if (!isRecord(benefit) || !['delivery', 'payment', 'guarantee'].includes(benefit.icon as string)) return null
      const label = readString(benefit.label, 1, 160)
      return label ? { icon: benefit.icon, label } : null
    })
    : []
  if (!benefits.length || benefits.some((benefit) => !benefit)) return null

  const badge = isRecord(value.badge) && ['popular', 'value'].includes(value.badge.tone as string)
    ? (() => {
      const label = readString(value.badge.label, 1, 80)
      return label ? { label, tone: value.badge.tone } : null
    })()
    : undefined

  return {
    id,
    image,
    imageAlt,
    title,
    product,
    offer,
    ...(typeof value.totalBottles === 'string' && readString(value.totalBottles, 1, 80) ? { totalBottles: value.totalBottles.trim() } : {}),
    promoPrice,
    oldPrice,
    savedAmount,
    ...(typeof value.discount === 'string' && readString(value.discount, 1, 100) ? { discount: value.discount.trim() } : {}),
    ...(badge ? { badge } : {}),
    description,
    benefits,
    buttonText: readString(value.buttonText, 1, 80) ?? 'Buy Now',
  }
}

async function createRateLimitBucket(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const clientAddress = forwardedFor || request.headers.get('x-real-ip') || 'unavailable'
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientAddress))
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  const origin = allowedRequestOrigin(request)
  if (!origin) return json({ error: 'Order service is unavailable.' }, 403, rejectedRequestOrigin())
  if (request.method === 'OPTIONS') return preflight(origin)
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin)

  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > maximumRequestBytes) return json({ error: 'Invalid order data.' }, 413, origin)
  const rawBody = await request.text()
  if (new TextEncoder().encode(rawBody).byteLength > maximumRequestBytes) return json({ error: 'Invalid order data.' }, 413, origin)

  const candidate = (() => {
    try { return JSON.parse(rawBody) as Submission } catch { return null }
  })()
  const orderId = readString(candidate?.orderId, 3, 64)
  const customer = normalizeCustomer(candidate?.customer)
  const packageSnapshot = normalizePackage(candidate?.package)
  const estimatedDelivery = readString(candidate?.estimatedDelivery, 1, 120)
  const source = candidate?.source === 'popup' || candidate?.source === 'inline' ? candidate.source : null
  const metaAttribution = readMetaAttribution(candidate?.metaAttribution)
  if (!orderId || !/^[A-Za-z0-9][A-Za-z0-9-]{2,63}$/.test(orderId) || !customer || !packageSnapshot || !estimatedDelivery || !source) {
    return json({ error: 'Invalid order data.' }, 400, origin)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Order service is unavailable.' }, 503, origin)
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const productId = await resolveActiveProductId(supabase, candidate?.productId)
  if (!productId) return json({ error: 'This product is unavailable.' }, 400, origin)
  const rateLimitBucket = await createRateLimitBucket(request)
  const { data: allowed, error: rateLimitError } = await supabase.rpc('consume_public_submission_rate_limit', {
    p_scope: 'order_submission',
    p_bucket: rateLimitBucket,
    p_limit: 6,
    p_window_seconds: 600,
  })
  if (rateLimitError) return json({ error: 'Order service is unavailable.' }, 503, origin)
  if (!allowed) return json({ error: 'Please wait a few minutes before submitting another order.' }, 429, origin)

  const { error } = await supabase.from('orders').insert({
    id: orderId,
    product_id: productId,
    customer,
    package_snapshot: packageSnapshot,
    estimated_delivery: estimatedDelivery,
    source,
  })
  if (error && error.code !== '23505') return json({ error: 'We could not save your order. Please try again.' }, 503, origin)
  if (!error) {
    // This context is captured at the customer request, not later when an admin marks
    // an order Paid. It is private and used only for server-side Meta matching.
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip')
    const clientUserAgent = request.headers.get('user-agent')
    await supabase.from('meta_order_attribution').insert({
      order_id: orderId,
      ...metaAttribution,
      fbp: metaAttribution.fbp ?? null,
      fbc: metaAttribution.fbc ?? null,
      fbclid: metaAttribution.fbclid ?? null,
      traffic_source: metaAttribution.traffic_source ?? null,
      utm_source: metaAttribution.utm_source ?? null,
      utm_medium: metaAttribution.utm_medium ?? null,
      utm_campaign: metaAttribution.utm_campaign ?? null,
      utm_content: metaAttribution.utm_content ?? null,
      utm_term: metaAttribution.utm_term ?? null,
      meta_ad_account_id: metaAttribution.meta_ad_account_id ?? null,
      meta_campaign_id: metaAttribution.meta_campaign_id ?? null,
      meta_adset_id: metaAttribution.meta_adset_id ?? null,
      meta_ad_id: metaAttribution.meta_ad_id ?? null,
      client_ip: clientIp?.slice(0, 64) ?? null,
      client_user_agent: clientUserAgent?.slice(0, 1000) ?? null,
    })
  }
  const { data: queuedLead } = await supabase.rpc('queue_meta_order_event', { p_order_id: orderId, p_event_name: 'Lead' })
  const leadEventId = Array.isArray(queuedLead) && typeof queuedLead[0]?.event_id === 'string' ? queuedLead[0].event_id : null
  const deliveryTask = processPendingMetaDeliveries(supabase, 4).catch(() => undefined)
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(deliveryTask)
  // The database insert and its trigger are canonical. Mail is a best-effort
  // immediate notification and can never turn a saved order into a failed one.
  const notificationTask = processPendingImmediateNotifications(supabase, 2).catch(() => undefined)
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(notificationTask)
  return json({ orderId, leadEventId }, error ? 200 : 201, origin)
})
