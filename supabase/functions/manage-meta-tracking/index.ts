import { authorizeActiveAdministrator } from '../_shared/adminAuth.ts'
import { capiConfigured, processPendingMetaDeliveries } from '../_shared/metaConversions.ts'
import { allowedRequestOrigin, json, preflight, rejectedRequestOrigin } from '../_shared/http.ts'

type MetaSettingsInput = { enabled?: unknown; pixelId?: unknown; browserEnabled?: unknown; pageViewEnabled?: unknown; viewContentEnabled?: unknown; initiateCheckoutEnabled?: unknown; leadEnabled?: unknown; purchaseEnabled?: unknown; currency?: unknown }

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }
function asBoolean(value: unknown) { return typeof value === 'boolean' ? value : null }
function extractPixelId(value: string) {
  const matches = [...value.matchAll(/fbq\s*\(\s*['"]init['"]\s*,\s*['"]([0-9]{5,20})['"]/g)].map((match) => match[1])
  return matches.length === 1 ? matches[0] : null
}
function normalizeSettings(value: unknown) {
  if (!isRecord(value)) return null
  const input = value as MetaSettingsInput
  const pixelId = typeof input.pixelId === 'string' ? input.pixelId.trim() : ''
  const currency = typeof input.currency === 'string' ? input.currency.trim().toUpperCase() : ''
  const booleans = [input.enabled, input.browserEnabled, input.pageViewEnabled, input.viewContentEnabled, input.initiateCheckoutEnabled, input.leadEnabled, input.purchaseEnabled].map(asBoolean)
  if (!/^(|[0-9]{5,20})$/.test(pixelId) || !/^[A-Z]{3}$/.test(currency) || booleans.some((entry) => entry == null)) return null
  if (input.enabled && !pixelId) return null
  return { enabled: input.enabled as boolean, pixel_id: pixelId, browser_enabled: input.browserEnabled as boolean, page_view_enabled: input.pageViewEnabled as boolean, view_content_enabled: input.viewContentEnabled as boolean, initiate_checkout_enabled: input.initiateCheckoutEnabled as boolean, lead_enabled: input.leadEnabled as boolean, purchase_enabled: input.purchaseEnabled as boolean, currency }
}

Deno.serve(async (request) => {
  const origin = allowedRequestOrigin(request)
  if (!origin) return json({ error: 'Meta service is unavailable.' }, 403, rejectedRequestOrigin())
  if (request.method === 'OPTIONS') return preflight(origin)
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin)
  const authorization = await authorizeActiveAdministrator(request)
  if (!authorization.administrator) return json({ error: authorization.error }, authorization.status, origin)
  if (authorization.administrator.role !== 'owner') return json({ error: 'Owner access is required.' }, 403, origin)
  const body = await request.json().catch(() => null) as { action?: unknown; settings?: unknown; baseCode?: unknown; testEventCode?: unknown } | null
  if (!body || typeof body.action !== 'string') return json({ error: 'Invalid request.' }, 400, origin)
  const { supabase, userId } = authorization.administrator
  try {
    if (body.action === 'load') {
      const [{ data: settings, error: settingsError }, { data: latest, error: latestError }, { data: attributionSummary, error: attributionError }] = await Promise.all([
        supabase.from('meta_tracking_settings').select('enabled,pixel_id,browser_enabled,page_view_enabled,view_content_enabled,initiate_checkout_enabled,lead_enabled,purchase_enabled,currency,updated_at').eq('id', true).single(),
        supabase.from('meta_event_deliveries').select('event_name,event_id,order_id,status,attempt_count,last_attempt_at,sent_at,last_error,created_at').order('created_at', { ascending: false }).limit(12),
        supabase.rpc('get_meta_attribution_summary', { p_limit: 20 }),
      ])
      if (settingsError || latestError || attributionError || !settings) throw new Error('settings_unavailable')
      return json({ settings: { enabled: settings.enabled, pixelId: settings.pixel_id, browserEnabled: settings.browser_enabled, pageViewEnabled: settings.page_view_enabled, viewContentEnabled: settings.view_content_enabled, initiateCheckoutEnabled: settings.initiate_checkout_enabled, leadEnabled: settings.lead_enabled, purchaseEnabled: settings.purchase_enabled, currency: settings.currency }, capiConfigured: capiConfigured(), latest: latest ?? [], attributionSummary: attributionSummary ?? [], duplicateLoaderWarning: false }, 200, origin)
    }
    if (body.action === 'extract_pixel_id') {
      const pixelId = typeof body.baseCode === 'string' && body.baseCode.length <= 20_000 ? extractPixelId(body.baseCode) : null
      return json({ pixelId }, 200, origin)
    }
    if (body.action === 'save') {
      const settings = normalizeSettings(body.settings)
      if (!settings) return json({ error: 'Invalid Meta tracking settings.' }, 400, origin)
      const { error } = await supabase.from('meta_tracking_settings').update({ ...settings, updated_by: userId }).eq('id', true)
      if (error) throw error
      if (settings.enabled && settings.purchase_enabled) {
        await supabase.from('meta_event_deliveries').update({ status: 'queued', next_attempt_at: new Date().toISOString(), last_error: null }).eq('status', 'not_configured')
      }
      return json({ ok: true, capiConfigured: capiConfigured() }, 200, origin)
    }
    if (body.action === 'process_queue') return json({ processed: await processPendingMetaDeliveries(supabase) }, 200, origin)
    if (body.action === 'test_capi') {
      const testEventCode = typeof body.testEventCode === 'string' ? body.testEventCode.trim() : ''
      if (!/^[A-Za-z0-9_-]{4,200}$/.test(testEventCode)) return json({ error: 'Enter a valid temporary Test Event Code.' }, 400, origin)
      const eventId = `meta-test-${crypto.randomUUID()}`
      if (!capiConfigured()) return json({ error: 'CAPI is not configured.' }, 503, origin)
      const { data: pixel } = await supabase.from('meta_tracking_settings').select('enabled,pixel_id').eq('id', true).single()
      if (!pixel?.enabled || !pixel.pixel_id) return json({ error: 'Enable Meta tracking and save a valid Pixel ID first.' }, 400, origin)
      // Test events never write an order or delivery record.
      const result = await fetch(`https://graph.facebook.com/${Deno.env.get('META_GRAPH_API_VERSION')}/${pixel.pixel_id}/events?access_token=${encodeURIComponent(Deno.env.get('META_CAPI_ACCESS_TOKEN')!)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: [{ event_name: 'PageView', event_time: Math.floor(Date.now() / 1000), event_id: eventId, action_source: 'website', user_data: {} }], test_event_code: testEventCode }) })
      if (!result.ok) return json({ error: 'Meta rejected the diagnostic event.' }, 502, origin)
      return json({ ok: true, eventId }, 200, origin)
    }
    return json({ error: 'Unsupported action.' }, 400, origin)
  } catch {
    return json({ error: 'Meta service is unavailable. Please try again.' }, 503, origin)
  }
})
