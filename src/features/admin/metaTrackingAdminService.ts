import { getAdminAccessToken } from '@/features/admin/adminAuthService'
import { invokeSupabaseFunction } from '@/lib/supabase/functions'

export type MetaTrackingSettings = {
  enabled: boolean
  pixelId: string
  browserEnabled: boolean
  pageViewEnabled: boolean
  viewContentEnabled: boolean
  initiateCheckoutEnabled: boolean
  leadEnabled: boolean
  purchaseEnabled: boolean
  currency: string
}

export type MetaDelivery = { event_name: 'Lead' | 'Purchase'; event_id: string; order_id: string; status: string; attempt_count: number; last_attempt_at: string | null; sent_at: string | null; last_error: string | null; created_at: string }
export type MetaAttributionSummary = { traffic_source: string; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; meta_ad_account_id: string | null; meta_campaign_id: string | null; meta_adset_id: string | null; meta_ad_id: string | null; order_requests: number; paid_sales: number; lead_events: number; purchase_events: number; purchase_value: number | string }
export type MetaTrackingOverview = { settings: MetaTrackingSettings; capiConfigured: boolean; latest: MetaDelivery[]; attributionSummary: MetaAttributionSummary[]; duplicateLoaderWarning: boolean }

async function invokeMeta<T>(body: unknown) {
  return invokeSupabaseFunction<T>('manage-meta-tracking', body, { Authorization: `Bearer ${await getAdminAccessToken()}` })
}

export function loadMetaTracking() { return invokeMeta<MetaTrackingOverview>({ action: 'load' }) }
export function saveMetaTracking(settings: MetaTrackingSettings) { return invokeMeta<{ ok: true; capiConfigured: boolean }>({ action: 'save', settings }) }
export function extractMetaPixelId(baseCode: string) { return invokeMeta<{ pixelId: string | null }>({ action: 'extract_pixel_id', baseCode }) }
export function processMetaTrackingQueue() { return invokeMeta<{ processed: number }>({ action: 'process_queue' }) }
export function testMetaCapi(testEventCode: string) { return invokeMeta<{ ok: true; eventId: string }>({ action: 'test_capi', testEventCode }) }
