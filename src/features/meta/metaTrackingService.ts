import { getCurrentProductContext } from '@/features/admin/trackingContext'
import { invokeSupabaseFunction } from '@/lib/supabase/functions'
import { getTrafficAttribution } from '@/lib/trafficAttribution'

export type MetaTrackingConfig = { enabled: boolean; pixelId: string; browserEnabled: boolean; pageViewEnabled: boolean; viewContentEnabled: boolean; initiateCheckoutEnabled: boolean; leadEnabled: boolean; currency: string }
type PublicResponse = { metaTracking?: Partial<MetaTrackingConfig> }

type MetaPixelFunction = ((...args: unknown[]) => void) & { queue: unknown[][] }

declare global { interface Window { fbq?: MetaPixelFunction; _fbq?: MetaPixelFunction } }

let configuration: MetaTrackingConfig | null = null
let initializedPixelId = ''
const sentEvents = new Set<string>()

export function isEligibleMetaRoute() {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname
  return !new URLSearchParams(window.location.search).has('preview') && (path === '/' || /^\/products\/[^/]+$/.test(path))
}

export function getMetaAttribution() {
  return getTrafficAttribution()
}

export async function loadMetaTrackingConfiguration() {
  const response = await invokeSupabaseFunction<PublicResponse>('get-public-site-settings', {})
  const source = response.metaTracking
  configuration = source && typeof source.pixelId === 'string' ? { enabled: source.enabled === true, pixelId: source.pixelId, browserEnabled: source.browserEnabled === true, pageViewEnabled: source.pageViewEnabled === true, viewContentEnabled: source.viewContentEnabled === true, initiateCheckoutEnabled: source.initiateCheckoutEnabled === true, leadEnabled: source.leadEnabled === true, currency: typeof source.currency === 'string' ? source.currency : 'NGN' } : null
  return configuration
}

function ready() { return Boolean(configuration?.enabled && configuration.pixelId && configuration.browserEnabled && isEligibleMetaRoute()) }

function ensurePixel() {
  if (!ready() || !configuration || initializedPixelId === configuration.pixelId) return false
  initializedPixelId = configuration.pixelId
  if (!window.fbq) {
    const fbq = ((...args: unknown[]) => { fbq.queue.push(args) }) as MetaPixelFunction
    fbq.queue = []
    window.fbq = fbq
    window._fbq = fbq
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'
    script.dataset.managedMetaPixel = 'true'
    document.head.appendChild(script)
  }
  window.fbq?.('init', configuration.pixelId)
  return true
}

function track(name: string, params: Record<string, unknown>, eventId?: string) {
  if (!ready() || !window.fbq || !configuration) return false
  const key = `${name}:${eventId ?? window.location.pathname}`
  if (sentEvents.has(key)) return false
  sentEvents.add(key)
  window.fbq('track', name, params, eventId ? { eventID: eventId } : undefined)
  return true
}

export function trackMetaProductPage() {
  ensurePixel()
  if (!configuration) return
  const product = getCurrentProductContext()
  if (configuration.pageViewEnabled) track('PageView', {})
  if (configuration.viewContentEnabled) track('ViewContent', { content_type: 'product', content_ids: [product.productId], content_name: product.productSlug, currency: configuration.currency })
}

export function trackMetaInitiateCheckout(packageId: string, value: number) {
  ensurePixel()
  const product = getCurrentProductContext()
  if (configuration?.initiateCheckoutEnabled) track('InitiateCheckout', { content_type: 'product', content_ids: [product.productId], contents: [{ id: packageId, quantity: 1 }], value, currency: configuration.currency }, `checkout-${packageId}`)
}

export function trackMetaLead(eventId: string | null, packageId: string, value: number) {
  ensurePixel()
  const product = getCurrentProductContext()
  if (eventId && configuration?.leadEnabled) track('Lead', { content_type: 'product', content_ids: [product.productId], contents: [{ id: packageId, quantity: 1 }], value, currency: configuration.currency }, eventId)
}
