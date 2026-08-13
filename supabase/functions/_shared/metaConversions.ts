import { createClient } from 'npm:@supabase/supabase-js@2'

type Delivery = {
  id: string
  order_id: string
  product_id: string
  event_name: 'Lead' | 'Purchase'
  event_id: string
  value: number | string
  currency: string
  package_id: string
}

function safeError(value: unknown) {
  return value instanceof Error ? value.message.slice(0, 500) : 'Meta delivery failed.'
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value.trim().toLowerCase()))
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function capiConfigured() {
  return Boolean(Deno.env.get('META_CAPI_ACCESS_TOKEN') && Deno.env.get('META_GRAPH_API_VERSION'))
}

export async function deliverMetaEvent(supabase: ReturnType<typeof createClient>, delivery: Delivery, testEventCode?: string) {
  const accessToken = Deno.env.get('META_CAPI_ACCESS_TOKEN')
  const graphVersion = Deno.env.get('META_GRAPH_API_VERSION')
  const { data: settings, error: settingsError } = await supabase.from('meta_tracking_settings').select('enabled,pixel_id').eq('id', true).single()
  if (settingsError || !settings?.enabled || !settings.pixel_id || !accessToken || !graphVersion) {
    await supabase.from('meta_event_deliveries').update({ status: 'not_configured', next_attempt_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), last_error: 'CAPI is not configured.' }).eq('id', delivery.id)
    return { delivered: false, configured: false }
  }
  const [{ data: order, error: orderError }, { data: attribution }] = await Promise.all([
    supabase.from('orders').select('customer,package_snapshot,product_id').eq('id', delivery.order_id).single(),
    supabase.from('meta_order_attribution').select('fbp,fbc,client_ip,client_user_agent').eq('order_id', delivery.order_id).maybeSingle(),
  ])
  if (orderError || !order) throw new Error('Order context is unavailable.')
  const customer = order.customer as Record<string, unknown>
  const phone = typeof customer.phoneNumber === 'string' ? customer.phoneNumber.replace(/[^0-9+]/g, '') : ''
  const userData: Record<string, unknown> = {}
  if (phone) userData.ph = [await sha256(phone)]
  if (attribution?.fbp) userData.fbp = attribution.fbp
  if (attribution?.fbc) userData.fbc = attribution.fbc
  if (attribution?.client_ip) userData.client_ip_address = attribution.client_ip
  if (attribution?.client_user_agent) userData.client_user_agent = attribution.client_user_agent
  const payload = {
    data: [{
      event_name: delivery.event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: delivery.event_id,
      action_source: 'website',
      user_data: userData,
      custom_data: { value: Number(delivery.value), currency: delivery.currency, content_type: 'product', content_ids: [delivery.product_id], contents: [{ id: delivery.package_id, quantity: 1 }] },
    }],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  }
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${settings.pixel_id}/events?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  })
  const body = await response.json().catch(() => ({})) as { events_received?: unknown; fbtrace_id?: unknown; error?: { message?: unknown } }
  if (!response.ok || typeof body.events_received !== 'number') throw new Error(typeof body.error?.message === 'string' ? body.error.message : 'Meta rejected the event.')
  return { delivered: true, configured: true, responseId: typeof body.fbtrace_id === 'string' ? body.fbtrace_id : '' }
}

export async function processPendingMetaDeliveries(supabase: ReturnType<typeof createClient>, limit = 20) {
  const { data, error } = await supabase.from('meta_event_deliveries').select('id,order_id,product_id,event_name,event_id,value,currency,package_id').in('status', ['queued', 'retryable', 'not_configured']).lte('next_attempt_at', new Date().toISOString()).order('created_at').limit(limit)
  if (error) throw error
  let processed = 0
  for (const delivery of data ?? []) {
    const { data: claimed } = await supabase.rpc('claim_meta_event_delivery', { p_delivery_id: delivery.id })
    if (!claimed) continue
    processed += 1
    try {
      const result = await deliverMetaEvent(supabase, delivery as Delivery)
      if (result.delivered) await supabase.rpc('complete_meta_event_delivery', { p_delivery_id: delivery.id, p_meta_response_id: result.responseId })
    } catch (error) {
      await supabase.rpc('fail_meta_event_delivery', { p_delivery_id: delivery.id, p_error: safeError(error), p_retryable: true })
    }
  }
  return processed
}
