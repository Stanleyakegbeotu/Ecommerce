import { getAdminAccessToken } from '@/features/admin/adminAuthService'
import { createTrackingMetadata, getCurrentProductContext, shouldTrackAdminEvent, type CanonicalAdminEventName, type TrackingMetadata } from '@/features/admin/trackingContext'
import type { CheckoutFormValues } from '@/features/checkout/hooks/checkoutSchema'
import type { ProductPackage } from '@/features/landing/data/packages'
import { invokeSupabaseFunction } from '@/lib/supabase/functions'
import type { TrafficAttribution } from '@/lib/trafficAttribution'

export type AdminOrderStatus =
  | 'New'
  | 'Confirmed'
  | 'Processing'
  | 'Delivered/Paid'
  | 'Cancelled'

export type OrderCancellationReason = 'customer_changed_mind' | 'unreachable' | 'duplicate_order' | 'delivery_issue' | 'invalid_order' | 'other'

export type AdminOrder = {
  id: string
  productId: string
  customer: CheckoutFormValues
  package: ProductPackage
  status: AdminOrderStatus
  createdAt: string
  updatedAt?: string
  paidAt?: string
  cancellationReason?: OrderCancellationReason
  estimatedDelivery: string
  source: 'popup' | 'inline'
}

export type AdminExpense = {
  id: string
  amount: number
  purpose: string
  createdAt: string
  orderId?: string
}

export type AdminOrderHistory = {
  id: string
  orderId: string
  fromStatus: AdminOrderStatus
  toStatus: AdminOrderStatus
  actorId: string
  operationalNote?: string
  cancellationReason?: OrderCancellationReason
  createdAt: string
}

export type CapitalTopUp = {
  id: string
  amount: number
  note: string
  createdAt: string
}

export type PackagePriceOverride = {
  promoPrice: string
  oldPrice: string
  savedAmount: string
}

export type AdminEventType = CanonicalAdminEventName

export type AdminEvent = {
  id: string
  type: AdminEventType
  eventName: AdminEventType
  createdAt: string
  metadata?: Record<string, string>
}

export type AdminSettings = {
  thankYouPath: string
  startupCapital: number
  capitalTopUps: CapitalTopUp[]
  packagePrices: Record<string, PackagePriceOverride>
}

export const defaultSettings: AdminSettings = {
  thankYouPath: '/thank-you',
  startupCapital: 300000,
  capitalTopUps: [],
  packagePrices: {},
}

type AdminOrderRow = {
  id: string
  product_id: string
  customer: CheckoutFormValues
  package_snapshot: ProductPackage
  status: AdminOrderStatus
  created_at: string
  updated_at: string
  paid_at: string | null
  cancellation_reason: OrderCancellationReason | null
  estimated_delivery: string | null
  source: 'popup' | 'inline' | null
}

type AdminExpenseRow = {
  id: string
  amount: number | string
  purpose: string
  order_id: string | null
  created_at: string
}

type AdminEventRow = {
  id: string
  type: AdminEventType
  metadata: Record<string, string> | null
  created_at: string
}

type AdminOrderHistoryRow = {
  id: string
  order_id: string
  from_status: AdminOrderStatus
  to_status: AdminOrderStatus
  actor_id: string
  operational_note: string | null
  cancellation_reason: OrderCancellationReason | null
  created_at: string
}

type SettingsPayload = {
  thankYouPath?: unknown
  startupCapital?: unknown
  capitalTopUps?: unknown
  packagePrices?: unknown
}

type AdminDashboardDataResponse = {
  orders: AdminOrderRow[]
  expenses: AdminExpenseRow[]
  events: AdminEventRow[]
  orderHistory: AdminOrderHistoryRow[]
  settings: SettingsPayload
}

let cachedSettings = defaultSettings

function emitDataChanged() {
  window.dispatchEvent(new CustomEvent('admin:data-changed'))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizePackagePriceOverrides(value: unknown): Record<string, PackagePriceOverride> {
  if (!isRecord(value)) return {}

  return Object.fromEntries(Object.entries(value).flatMap(([packageId, override]) => {
    if (!/^[a-z0-9-]{1,80}$/.test(packageId) || !isRecord(override)) return []
    return [[
      packageId,
      {
        promoPrice: typeof override.promoPrice === 'string' ? override.promoPrice : '',
        oldPrice: typeof override.oldPrice === 'string' ? override.oldPrice : '',
        savedAmount: typeof override.savedAmount === 'string' ? override.savedAmount : '',
      },
    ]]
  }))
}

function normalizeCapitalTopUps(value: unknown): CapitalTopUp[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.note !== 'string' || typeof entry.createdAt !== 'string') return []
    const amount = Number(entry.amount)
    if (!Number.isFinite(amount) || amount <= 0) return []
    return [{ id: entry.id, amount, note: entry.note, createdAt: entry.createdAt }]
  })
}

function normalizeSettings(settings?: SettingsPayload): AdminSettings {
  return {
    thankYouPath: typeof settings?.thankYouPath === 'string' && settings.thankYouPath.startsWith('/') ? settings.thankYouPath : defaultSettings.thankYouPath,
    startupCapital: Number.isFinite(Number(settings?.startupCapital)) ? Number(settings?.startupCapital) : defaultSettings.startupCapital,
    capitalTopUps: normalizeCapitalTopUps(settings?.capitalTopUps),
    packagePrices: normalizePackagePriceOverrides(settings?.packagePrices),
  }
}

function mapOrder(row: AdminOrderRow): AdminOrder {
  return {
    id: row.id,
    productId: row.product_id,
    customer: row.customer,
    package: row.package_snapshot,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: row.paid_at ?? undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
    estimatedDelivery: row.estimated_delivery ?? '1-3 Business Days',
    source: row.source ?? 'inline',
  }
}

function mapExpense(row: AdminExpenseRow): AdminExpense {
  return {
    id: row.id,
    amount: Number(row.amount) || 0,
    purpose: row.purpose,
    orderId: row.order_id ?? undefined,
    createdAt: row.created_at,
  }
}

function mapEvent(row: AdminEventRow): AdminEvent {
  return {
    id: row.id,
    type: row.type,
    eventName: (row.metadata?.eventName as AdminEventType | undefined) ?? row.type,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
  }
}

function mapOrderHistory(row: AdminOrderHistoryRow): AdminOrderHistory {
  return { id: row.id, orderId: row.order_id, fromStatus: row.from_status, toStatus: row.to_status, actorId: row.actor_id, operationalNote: row.operational_note ?? undefined, cancellationReason: row.cancellation_reason ?? undefined, createdAt: row.created_at }
}

async function invokeAdminData<TResponse>(payload: unknown) {
  const accessToken = await getAdminAccessToken()
  return invokeSupabaseFunction<TResponse>('manage-admin-data', payload, { Authorization: `Bearer ${accessToken}` })
}

export async function loadAdminDashboardData() {
  const response = await invokeAdminData<AdminDashboardDataResponse>({ action: 'load' })
  cachedSettings = normalizeSettings(response.settings)
  return {
    orders: response.orders.map(mapOrder),
    expenses: response.expenses.map(mapExpense),
    events: response.events.map(mapEvent),
    orderHistory: response.orderHistory.map(mapOrderHistory),
    settings: cachedSettings,
  }
}

/** Persists a customer order through a public, validated Edge Function. */
export async function saveAdminOrder(order: AdminOrder, attribution?: TrafficAttribution) {
  const response = await invokeSupabaseFunction<{ orderId: string; leadEventId?: string | null }>('submit-order', {
    orderId: order.id,
    productId: order.productId,
    customer: order.customer,
    package: order.package,
    source: order.source,
    estimatedDelivery: order.estimatedDelivery,
    metaAttribution: attribution,
  })
  emitDataChanged()
  return response
}

export async function updateAdminOrderStatus(orderId: string, status: AdminOrderStatus, options: { operationalNote?: string; cancellationReason?: OrderCancellationReason } = {}) {
  const response = await invokeAdminData<{ previousStatus: AdminOrderStatus | null; currentStatus: AdminOrderStatus | null; purchaseEventId?: string | null }>({ action: 'update_order_status', orderId, status, ...options })
  if (response.previousStatus && response.previousStatus !== status && status === 'Delivered/Paid') {
    trackAdminEvent('fulfilled', { orderId, previousStatus: response.previousStatus, currentStatus: status }).catch(() => undefined)
  }
  emitDataChanged()
}

export async function addAdminExpense(amount: number, purpose: string, orderId?: string) {
  await invokeAdminData({ action: 'add_expense', amount, purpose, orderId })
  emitDataChanged()
}

export async function trackAdminEvent(type: AdminEventType, metadata?: TrackingMetadata) {
  if (!shouldTrackAdminEvent(type, metadata)) return

  await invokeSupabaseFunction('record-analytics-event', {
    type,
    metadata: createTrackingMetadata(type, metadata),
    productId: getCurrentProductContext().productId,
  })
}

export function getAdminSettings(): AdminSettings {
  return cachedSettings
}

/** Loads only customer-safe settings; private operational settings remain admin-only. */
export async function loadAdminSettings() {
  const response = await invokeSupabaseFunction<SettingsPayload>('get-public-site-settings', {})
  cachedSettings = normalizeSettings(response)
  return cachedSettings
}

export async function saveAdminSettings(settings: AdminSettings) {
  const response = await invokeAdminData<SettingsPayload>({ action: 'save_settings', settings })
  cachedSettings = normalizeSettings(response)
  emitDataChanged()
}

export async function addCapitalTopUp(amount: number, note: string) {
  const response = await invokeAdminData<SettingsPayload>({ action: 'add_capital_top_up', amount, note })
  cachedSettings = normalizeSettings(response)
  emitDataChanged()
}

export function getTotalStartupCapital(settings = getAdminSettings()) {
  return settings.startupCapital + settings.capitalTopUps.reduce((sum, topUp) => sum + topUp.amount, 0)
}

export function applyPackagePriceOverrides(packages: ProductPackage[], settings = getAdminSettings()) {
  const overrides = settings.packagePrices
  return packages.map((productPackage) => {
    const override = overrides[productPackage.id]
    if (!override) return productPackage
    return {
      ...productPackage,
      promoPrice: override.promoPrice || productPackage.promoPrice,
      oldPrice: override.oldPrice || productPackage.oldPrice,
      savedAmount: override.savedAmount || productPackage.savedAmount,
    }
  })
}

export function getThankYouUrl() {
  const path = getAdminSettings().thankYouPath || '/thank-you'
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function filterByPeriod<T extends { createdAt: string }>(items: T[], period: 'day' | 'month' | 'year', date = new Date()) {
  return items.filter((item) => {
    const itemDate = new Date(item.createdAt)
    if (period === 'day') return itemDate.toDateString() === date.toDateString()
    if (period === 'month') return itemDate.getFullYear() === date.getFullYear() && itemDate.getMonth() === date.getMonth()
    return itemDate.getFullYear() === date.getFullYear()
  })
}

export function parseMoney(value: string) {
  return Number(value.replace(/[^\d]/g, '')) || 0
}

export function formatNairaInput(value: string) {
  const amount = parseMoney(value)
  return amount ? `₦${amount.toLocaleString('en-NG')}` : ''
}

export function isSameDay(dateValue: string, compareDate = new Date()) {
  return new Date(dateValue).toDateString() === compareDate.toDateString()
}

export function isSameMonth(dateValue: string, compareDate = new Date()) {
  const date = new Date(dateValue)
  return date.getFullYear() === compareDate.getFullYear() && date.getMonth() === compareDate.getMonth()
}
