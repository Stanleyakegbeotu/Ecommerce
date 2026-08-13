import { createClient } from 'npm:@supabase/supabase-js@2'

import { allowedRequestOrigin, json, preflight, rejectedRequestOrigin } from '../_shared/http.ts'
import { authorizeActiveAdministrator } from '../_shared/adminAuth.ts'
import { processPendingMetaDeliveries } from '../_shared/metaConversions.ts'

const orderStatuses = new Set(['New', 'Confirmed', 'Processing', 'Delivered/Paid', 'Cancelled'])
const cancellationReasons = new Set(['customer_changed_mind', 'unreachable', 'duplicate_order', 'delivery_issue', 'invalid_order', 'other'])

type RequestBody = {
  action?: unknown
  orderId?: unknown
  status?: unknown
  operationalNote?: unknown
  cancellationReason?: unknown
  amount?: unknown
  purpose?: unknown
  note?: unknown
  settings?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readString(value: unknown, minimum: number, maximum: number) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length >= minimum && normalized.length <= maximum ? normalized : null
}

function readAmount(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) && amount > 0 && amount <= 1_000_000_000_000 ? amount : null
}

function isOrderId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9-]{2,63}$/.test(value)
}

function normalizePackagePrices(value: unknown) {
  if (!isRecord(value) || Object.keys(value).length > 20) return null
  const normalized: Record<string, { promoPrice: string; oldPrice: string; savedAmount: string }> = {}
  for (const [packageId, override] of Object.entries(value)) {
    if (!/^[a-z0-9-]{1,80}$/.test(packageId) || !isRecord(override)) return null
    const promoPrice = typeof override.promoPrice === 'string' ? override.promoPrice.trim().slice(0, 40) : ''
    const oldPrice = typeof override.oldPrice === 'string' ? override.oldPrice.trim().slice(0, 40) : ''
    const savedAmount = typeof override.savedAmount === 'string' ? override.savedAmount.trim().slice(0, 80) : ''
    normalized[packageId] = { promoPrice, oldPrice, savedAmount }
  }
  return normalized
}

function normalizeSettings(value: unknown) {
  if (!isRecord(value)) return null
  const thankYouPath = typeof value.thankYouPath === 'string' ? value.thankYouPath.trim() : ''
  const startupCapital = typeof value.startupCapital === 'number' ? value.startupCapital : Number(value.startupCapital)
  const packagePrices = normalizePackagePrices(value.packagePrices)
  if (
    !/^\/[a-zA-Z0-9/_-]{0,199}$/.test(thankYouPath)
    || !Number.isFinite(startupCapital) || startupCapital < 0 || startupCapital > 1_000_000_000_000
    || !packagePrices
  ) return null
  return { thankYouPath, startupCapital, packagePrices }
}

async function settingsPayload(supabase: ReturnType<typeof createClient>) {
  const [{ data: settings, error: settingsError }, { data: topUps, error: topUpsError }] = await Promise.all([
    supabase.from('app_settings').select('thank_you_path,startup_capital,package_prices').eq('id', true).maybeSingle(),
    supabase.from('capital_top_ups').select('id,amount,note,created_at').order('created_at', { ascending: false }),
  ])
  if (settingsError || topUpsError || !settings) throw new Error('Could not load settings.')
  return {
    thankYouPath: settings.thank_you_path,
    startupCapital: Number(settings.startup_capital),
    packagePrices: settings.package_prices,
    capitalTopUps: (topUps ?? []).map((topUp) => ({
      id: topUp.id,
      amount: Number(topUp.amount),
      note: topUp.note,
      createdAt: topUp.created_at,
    })),
  }
}

Deno.serve(async (request) => {
  const origin = allowedRequestOrigin(request)
  if (!origin) return json({ error: 'Admin service is unavailable.' }, 403, rejectedRequestOrigin())
  if (request.method === 'OPTIONS') return preflight(origin)
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin)

  const authorization = await authorizeActiveAdministrator(request)
  if (!authorization.administrator) return json({ error: authorization.error }, authorization.status, origin)
  const { userId, supabase } = authorization.administrator
  const body = await request.json().catch(() => null) as RequestBody | null
  if (!body || typeof body.action !== 'string') return json({ error: 'Invalid request.' }, 400, origin)

  try {
    if (body.action === 'load') {
      const [{ data: orders, error: ordersError }, { data: expenses, error: expensesError }, { data: events, error: eventsError }, { data: orderHistory, error: orderHistoryError }, settings] = await Promise.all([
        supabase.from('orders').select('id,product_id,customer,package_snapshot,status,created_at,updated_at,paid_at,cancellation_reason,estimated_delivery,source').order('created_at', { ascending: false }),
        supabase.from('expenses').select('id,amount,purpose,order_id,created_at').order('created_at', { ascending: false }),
        supabase.from('analytics_events').select('id,type,metadata,created_at').order('created_at', { ascending: false }).limit(2000),
        supabase.from('order_status_history').select('id,order_id,from_status,to_status,actor_id,operational_note,cancellation_reason,created_at').order('created_at', { ascending: false }).limit(2000),
        settingsPayload(supabase),
      ])
      if (ordersError || expensesError || eventsError || orderHistoryError) throw new Error('Could not load admin data.')
      return json({ orders: orders ?? [], expenses: expenses ?? [], events: events ?? [], orderHistory: orderHistory ?? [], settings }, 200, origin)
    }

    if (body.action === 'update_order_status') {
      if (!isOrderId(body.orderId) || typeof body.status !== 'string' || !orderStatuses.has(body.status)) return json({ error: 'Invalid order update.' }, 400, origin)
      const operationalNote = body.operationalNote === undefined ? null : readString(body.operationalNote, 1, 500)
      if (body.operationalNote !== undefined && !operationalNote) return json({ error: 'Invalid operational note.' }, 400, origin)
      const cancellationReason = body.cancellationReason === undefined || body.cancellationReason === null ? null : typeof body.cancellationReason === 'string' && cancellationReasons.has(body.cancellationReason) ? body.cancellationReason : undefined
      if (cancellationReason === undefined) return json({ error: 'Invalid cancellation reason.' }, 400, origin)
      const { data, error } = await supabase.rpc('transition_order_status', {
        p_order_id: body.orderId,
        p_new_status: body.status,
        p_actor_id: userId,
        p_operational_note: operationalNote,
        p_cancellation_reason: cancellationReason,
      })
      if (error) {
        if (error.message.includes('not allowed')) return json({ error: 'That order status transition is not allowed.' }, 409, origin)
        if (error.message.includes('not found')) return json({ error: 'Order not found.' }, 404, origin)
        throw error
      }
      const transition = Array.isArray(data) ? data[0] : null
      const purchaseEventId = typeof transition?.purchase_event_id === 'string' ? transition.purchase_event_id : null
      if (body.status === 'Delivered/Paid' && transition?.previous_status !== 'Delivered/Paid') {
        const task = processPendingMetaDeliveries(supabase, 4).catch(() => undefined)
        if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(task)
      }
      return json({ previousStatus: transition?.previous_status ?? null, currentStatus: transition?.current_status ?? null, purchaseEventId }, 200, origin)
    }

    if (body.action === 'delete_order') {
      return json({ error: 'Orders are immutable operational records and cannot be deleted.' }, 409, origin)
    }

    if (body.action === 'add_expense') {
      const amount = readAmount(body.amount)
      const purpose = readString(body.purpose, 1, 240)
      if (!amount || !purpose || (body.orderId != null && !isOrderId(body.orderId))) return json({ error: 'Invalid expense.' }, 400, origin)
      const { data, error } = await supabase
        .from('expenses')
        .insert({ amount, purpose, order_id: body.orderId ?? null, created_by: userId })
        .select('id')
        .single()
      if (error) throw error
      return json({ expenseId: data.id }, 201, origin)
    }

    if (body.action === 'save_settings') {
      const settings = normalizeSettings(body.settings)
      if (!settings) return json({ error: 'Invalid settings.' }, 400, origin)
      const { error } = await supabase.from('app_settings').update({
        thank_you_path: settings.thankYouPath,
        startup_capital: settings.startupCapital,
        package_prices: settings.packagePrices,
        updated_by: userId,
      }).eq('id', true)
      if (error) throw error
      return json(await settingsPayload(supabase), 200, origin)
    }

    if (body.action === 'add_capital_top_up') {
      const amount = readAmount(body.amount)
      const note = readString(body.note, 1, 240)
      if (!amount || !note) return json({ error: 'Invalid capital top-up.' }, 400, origin)
      const { error } = await supabase.from('capital_top_ups').insert({ amount, note, created_by: userId })
      if (error) throw error
      return json(await settingsPayload(supabase), 201, origin)
    }

    return json({ error: 'Unsupported action.' }, 400, origin)
  } catch {
    return json({ error: 'Admin service is unavailable. Please try again.' }, 503, origin)
  }
})
