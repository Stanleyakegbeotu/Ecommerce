import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Activity,
  BarChart3,
  Bell,
  CircleDollarSign,
  Copy,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  PackageCheck,
  Search,
  Settings,
  TrendingUp,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getSupabaseConfigurationError, isSupabaseConfigured } from '@/lib/supabase/browserClient'
import { CustomerFeedbackPage } from '@/features/admin/CustomerFeedbackPage'
import { AdminPwaActions } from '@/features/admin/AdminPwaActions'
import { PlatformSettingsPanel, ProductsPage } from '@/features/admin/PlatformManagementPanels'
import { MetaTrackingPanel } from '@/features/admin/MetaTrackingPanel'
import { NotificationOperationsPanel } from '@/features/admin/NotificationOperationsPanel'
import { usePlatformBranding } from '@/features/platform/platformBrandingContext'
import { getCustomerFeedbackSummary, verifyFeedbackAdminAccess } from '@/features/admin/customerFeedbackAdminService'
import {
  getCurrentAdminIdentity,
  onAdminAuthStateChange,
  signInAdministrator,
  signOutAdministrator,
  type AdminIdentity,
} from '@/features/admin/adminAuthService'

import {
  addAdminExpense,
  addCapitalTopUp,
  downloadTextFile,
  getAdminSettings,
  getTotalStartupCapital,
  formatOrderReference,
  isSameDay,
  isSameMonth,
  loadAdminDashboardData,
  parseMoney,
  saveAdminSettings,
  updateAdminOrderStatus,
  type AdminSettings,
  type AdminExpense,
  type AdminEvent,
  type AdminOrder,
  type AdminOrderHistory,
  type AdminOrderStatus,
} from '@/features/admin/adminData'
import { nigerianStates } from '@/features/checkout/data/nigerianStates'
import { productPackages } from '@/features/landing/data/packages'

type AdminPage = 'dashboard' | 'orders' | 'products' | 'feedback' | 'analytics' | 'finance' | 'expenses' | 'settings' | 'notifications' | 'profile'
type Period = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly'
type ReportPeriod = 'day' | 'week' | 'month' | 'year'
type AdminToastTone = 'default' | 'success' | 'danger'
type AdminToast = {
  id: number
  message: string
  tone: AdminToastTone
}

type AdminDashboardProps = {
  onClose: () => void
}

const adminToastEvent = 'admin:toast'
const pageLabels: Array<[AdminPage, string, typeof LayoutDashboard]> = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['orders', 'Orders', PackageCheck],
  ['products', 'Products', PackageCheck],
  ['feedback', 'Customer Feedback', MessageSquareText],
  ['analytics', 'Analytics', BarChart3],
  ['finance', 'Finance', WalletCards],
  ['expenses', 'Expenses', DollarSign],
  ['settings', 'Form Settings', Settings],
  ['notifications', 'Notifications', Bell],
  ['profile', 'Profile', UserRound],
]

const statuses: AdminOrderStatus[] = ['New', 'Confirmed', 'Processing', 'Delivered/Paid', 'Cancelled']

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value)
}

function notifyAdmin(message: string, tone: AdminToastTone = 'default') {
  window.dispatchEvent(new CustomEvent(adminToastEvent, { detail: { message, tone } }))
}

function copyToClipboard(value: string, label = 'Content') {
  if (!navigator.clipboard) {
    notifyAdmin('Copy is not available in this browser.', 'danger')
    return
  }

  navigator.clipboard
    .writeText(value)
    .then(() => notifyAdmin(`${label} copied.`, 'success'))
    .catch(() => notifyAdmin('Copy failed. Please try again.', 'danger'))
}

function notifyAdminError(error: unknown) {
  notifyAdmin(error instanceof Error ? error.message : 'Supabase action failed. Please try again.', 'danger')
}

function useAdminToasts() {
  const [toasts, setToasts] = useState<AdminToast[]>([])

  useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = event instanceof CustomEvent ? (event.detail as Partial<AdminToast>) : {}
      const toast: AdminToast = {
        id: Date.now() + Math.random(),
        message: detail.message ?? 'Done.',
        tone: detail.tone ?? 'default',
      }

      setToasts((current) => [...current, toast].slice(-3))
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id))
      }, 2400)
    }

    window.addEventListener(adminToastEvent, handleToast)
    return () => window.removeEventListener(adminToastEvent, handleToast)
  }, [])

  return toasts
}

function useAdminData(enabled: boolean) {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [expenses, setExpenses] = useState<AdminExpense[]>([])
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [orderHistory, setOrderHistory] = useState<AdminOrderHistory[]>([])
  const [settings, setSettings] = useState<AdminSettings>(getAdminSettings())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) {
      return
    }
    let active = true

    const refresh = async () => {
      try {
        setLoading(true)
        setError('')
        const nextData = await loadAdminDashboardData()
        if (!active) {
          return
        }
        setOrders(nextData.orders)
        setExpenses(nextData.expenses)
        setEvents(nextData.events)
        setOrderHistory(nextData.orderHistory)
        setSettings(nextData.settings)
      } catch (fetchError) {
        if (active) {
          setError(fetchError instanceof Error ? fetchError.message : 'Unable to load Supabase admin data.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void refresh()
    window.addEventListener('admin:data-changed', refresh)

    return () => {
      active = false
      window.removeEventListener('admin:data-changed', refresh)
    }
  }, [enabled])

  return { orders, expenses, events, orderHistory, settings, loading, error }
}

function orderRevenue(order: AdminOrder) {
  return parseMoney(order.package.promoPrice)
}

function isDeliveredOrder(order: AdminOrder) {
  return order.status === 'Delivered/Paid'
}

function isExpectedOrder(order: AdminOrder) {
  return order.status !== 'Cancelled'
}

function sumOrderRevenue(orders: AdminOrder[], predicate: (order: AdminOrder) => boolean) {
  return orders.filter(predicate).reduce((sum, order) => sum + orderRevenue(order), 0)
}

function filterByReportPeriod<T extends { createdAt: string }>(items: T[], period: ReportPeriod, date = new Date()) {
  return items.filter((item) => {
    const itemDate = new Date(item.createdAt)
    if (period === 'day') {
      return itemDate.toDateString() === date.toDateString()
    }
    if (period === 'week') {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      start.setDate(start.getDate() - start.getDay())
      const end = new Date(start)
      end.setDate(start.getDate() + 7)
      return itemDate >= start && itemDate < end
    }
    if (period === 'month') {
      return itemDate.getFullYear() === date.getFullYear() && itemDate.getMonth() === date.getMonth()
    }
    return itemDate.getFullYear() === date.getFullYear()
  })
}

function periodToReportPeriod(period: Period): ReportPeriod {
  const periodMap: Record<Period, ReportPeriod> = {
    Daily: 'day',
    Weekly: 'week',
    Monthly: 'month',
    Yearly: 'year',
  }

  return periodMap[period]
}

function makeReport(period: ReportPeriod, orders: AdminOrder[], expenses: AdminExpense[], events: AdminEvent[]) {
  const scopedOrders = filterByReportPeriod(orders, period)
  const scopedExpenses = filterByReportPeriod(expenses, period)
  const scopedEvents = filterByReportPeriod(events, period)
  const expectedRevenue = sumOrderRevenue(scopedOrders, isExpectedOrder)
  const deliveredRevenue = sumOrderRevenue(scopedOrders, isDeliveredOrder)
  const expenseTotal = scopedExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const delivered = scopedOrders.filter(isDeliveredOrder).length
  const cancelled = scopedOrders.filter((order) => order.status === 'Cancelled').length
  const rows = [
    ['Metric', 'Value'],
    ['Period', period],
    ['Visitors', String(scopedEvents.filter((event) => event.type === 'visitor').length)],
    ['Buy Now Clicks', String(scopedEvents.filter((event) => event.type === 'buy_click').length)],
    ['Orders', String(scopedOrders.length)],
    ['Expected Order Revenue', String(expectedRevenue)],
    ['Delivered Revenue', String(deliveredRevenue)],
    ['Expenses', String(expenseTotal)],
    ['Profit', String(deliveredRevenue - expenseTotal)],
    ['Delivered/Paid Orders', String(delivered)],
    ['Cancelled Orders', String(cancelled)],
    ['Processing Order Value', String(sumOrderRevenue(scopedOrders, (order) => order.status === 'Processing'))],
    [],
    ['Order Number', 'Order ID', 'Customer', 'Phone', 'State', 'Package', 'Status', 'Amount', 'Date'],
    ...scopedOrders.map((order) => [
      formatOrderReference(order),
      order.id,
      order.customer.fullName,
      order.customer.phoneNumber,
      order.customer.state,
      order.package.title,
      order.status,
      String(orderRevenue(order)),
      order.createdAt,
    ]),
    [],
    ['Expense ID', 'Purpose', 'Amount', 'Order ID', 'Date'],
    ...scopedExpenses.map((expense) => [expense.id, expense.purpose, String(expense.amount), expense.orderId ?? '', expense.createdAt]),
  ]

  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}

function downloadReport(period: ReportPeriod, orders: AdminOrder[], expenses: AdminExpense[], events: AdminEvent[], type: 'financial' | 'orders' | 'expenses' | 'analysis') {
  notifyAdmin('Downloading...', 'default')
  downloadTextFile(`kog-${type}-${period}-report.csv`, makeReport(period, orders, expenses, events))
}

function AdminToasts({ toasts }: { toasts: AdminToast[] }) {
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[140] grid w-[min(360px,calc(100vw-32px))] gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`rounded-2xl border px-4 py-3 text-sm font-black shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl ${
              toast.tone === 'success'
                ? 'border-mint-400/25 bg-mint-400/15 text-mint-200'
                : toast.tone === 'danger'
                  ? 'border-red-400/25 bg-red-500/15 text-red-200'
                  : 'border-white/12 bg-ink-950/88 text-white'
            }`}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function StatCard({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'gold' | 'mint' | 'danger' }) {
  const toneClass =
    tone === 'gold'
      ? 'text-[#1268e6]'
      : tone === 'mint'
        ? 'text-[#168b46]'
        : tone === 'danger'
          ? 'text-[#dc4c4c]'
          : 'text-[#102a56]'

  const glowClass =
    tone === 'mint'
      ? 'bg-[#16a34a]/12'
      : tone === 'danger'
        ? 'bg-red-400/12'
        : 'bg-[#1268e6]/12'

  return (
    <motion.article
      className="admin-stat-card relative overflow-hidden rounded-[26px] border border-[#cfe1f3] bg-white p-4 shadow-[0_16px_34px_rgba(18,73,134,0.12),inset_0_1px_0_rgba(255,255,255,0.98)]"
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      whileHover={{ y: -5, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
    >
      <span className={`absolute -right-5 -top-5 size-20 rounded-full blur-xl ${glowClass}`} aria-hidden="true" />
      <p className="relative text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#63809d]">{label}</p>
      <p className={`relative mt-3 text-2xl font-black tracking-[-0.035em] ${toneClass}`}>{value}</p>
      <span className="relative mt-3 block h-1 w-12 rounded-full bg-[#dcecff]" aria-hidden="true"><span className={`block h-full w-7 rounded-full ${tone === 'mint' ? 'bg-[#16a34a]' : tone === 'danger' ? 'bg-red-400' : 'bg-[#1268e6]'}`} /></span>
    </motion.article>
  )
}

type PerformancePoint = {
  label: string
  date: string
  orders: number
  revenue: number
}

function buildPerformancePoints(orders: AdminOrder[]): PerformancePoint[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    const dateKey = date.toDateString()
    const dayOrders = orders.filter((order) => new Date(order.createdAt).toDateString() === dateKey)

    return {
      label: new Intl.DateTimeFormat('en-NG', { weekday: 'short' }).format(date),
      date: new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short' }).format(date),
      orders: dayOrders.length,
      revenue: sumOrderRevenue(dayOrders, isExpectedOrder),
    }
  })
}

function PerformanceChart({ orders }: { orders: AdminOrder[] }) {
  const points = buildPerformancePoints(orders)
  const [activeIndex, setActiveIndex] = useState(points.length - 1)
  const maxRevenue = Math.max(...points.map((point) => point.revenue), 1)
  const activePoint = points[activeIndex]

  return (
    <motion.section
      className="admin-living-panel relative overflow-hidden rounded-[30px] border border-[#c9def2] bg-white p-5 shadow-[0_22px_48px_rgba(18,73,134,0.14),inset_0_1px_0_rgba(255,255,255,0.98)] sm:p-6"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pointer-events-none absolute right-0 top-0 size-52 rounded-full bg-[#7fbbff]/20 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#1268e6]">Live performance</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[#102a56]">Your last 7 days</h3>
        </div>
        <div className="rounded-2xl border border-[#d6e5f4] bg-[#f6faff] px-3 py-2 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.96)]">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.13em] text-[#6884a0]">{activePoint.date}</p>
          <p className="mt-1 text-lg font-black text-[#102a56]">{formatMoney(activePoint.revenue)}</p>
          <p className="text-xs font-bold text-[#168b46]">{activePoint.orders} orders</p>
        </div>
      </div>

      <div className="relative mt-8 grid h-48 grid-cols-7 items-end gap-2 sm:gap-4" role="group" aria-label="Seven day order revenue chart">
        {points.map((point, index) => {
          const active = activeIndex === index
          const height = Math.max(12, Math.round((point.revenue / maxRevenue) * 100))

          return (
            <button key={point.date} type="button" onClick={() => setActiveIndex(index)} className="group flex h-full flex-col items-center justify-end gap-2 rounded-xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-[#1268e6]" aria-pressed={active} aria-label={`${point.date}: ${formatMoney(point.revenue)} from ${point.orders} orders`}>
              <motion.span
                className={`admin-performance-bar w-full max-w-10 rounded-t-xl ${active ? 'admin-performance-bar--active' : ''}`}
                animate={{ height: `${height}%`, opacity: active ? 1 : 0.74 }}
                transition={{ type: 'spring', stiffness: 180, damping: 18 }}
              />
              <span className={`text-[0.62rem] font-black ${active ? 'text-[#1268e6]' : 'text-[#6a859f]'}`}>{point.label}</span>
            </button>
          )
        })}
      </div>
    </motion.section>
  )
}

function CommandCenterHero({
  visitors,
  totalOrders,
  expectedRevenue,
  deliveredRevenue,
  setActivePage,
}: {
  visitors: number
  totalOrders: number
  expectedRevenue: number
  deliveredRevenue: number
  setActivePage: (page: AdminPage) => void
}) {
  const { platformName } = usePlatformBranding()
  const signals = [
    { label: 'Today\'s visitors', value: String(visitors), icon: Users },
    { label: 'All order requests', value: String(totalOrders), icon: Activity },
    { label: 'Expected revenue', value: formatMoney(expectedRevenue), icon: TrendingUp },
    { label: 'Delivered revenue', value: formatMoney(deliveredRevenue), icon: CircleDollarSign },
  ]

  return (
    <motion.section
      className="admin-command-hero relative overflow-hidden rounded-[32px] border p-5 sm:p-7"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="admin-command-orb admin-command-orb--one" aria-hidden="true" />
      <span className="admin-command-orb admin-command-orb--two" aria-hidden="true" />
      <div className="relative grid gap-7 xl:grid-cols-[minmax(0,1.18fr)_minmax(440px,0.82fr)] xl:items-end">
        <div>
          <div className="admin-live-status">
            <span className="admin-live-dot" aria-hidden="true" />
            Live business pulse
          </div>
          <p className="mt-5 text-[0.68rem] font-black uppercase tracking-[0.2em] text-blue-700">{platformName} command centre</p>
          <h2 className="mt-3 max-w-2xl font-serif text-4xl font-semibold leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-5xl">
            Turn every signal into your next smart move.
          </h2>
          <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-slate-600 sm:text-base">
            Track customer intent, protect revenue, and move new orders forward from one clear, living dashboard.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => setActivePage('orders')} className="admin-primary-action">
              <PackageCheck className="size-4" aria-hidden="true" /> Review orders
            </button>
            <button type="button" onClick={() => setActivePage('analytics')} className="admin-ghost-action">
              <BarChart3 className="size-4" aria-hidden="true" /> Explore analytics
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {signals.map(({ label, value, icon: Icon }, index) => (
            <motion.article
              key={label}
              className="admin-signal-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + index * 0.07, duration: 0.4 }}
              whileHover={{ y: -4, scale: 1.015 }}
            >
              <span className="admin-signal-icon"><Icon className="size-4" aria-hidden="true" /></span>
              <p className="mt-5 text-[0.58rem] font-black uppercase tracking-[0.13em] text-slate-500">{label}</p>
              <p className="mt-2 truncate text-lg font-black tracking-[-0.035em] text-slate-950 sm:text-xl">{value}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

function RecentOrderActivity({ orders, setActivePage }: { orders: AdminOrder[]; setActivePage: (page: AdminPage) => void }) {
  const recentOrders = [...orders]
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, 4)

  return (
    <motion.section
      className="admin-living-panel rounded-[30px] border border-[#c9def2] bg-white p-5 shadow-[0_22px_48px_rgba(18,73,134,0.14),inset_0_1px_0_rgba(255,255,255,0.98)] sm:p-6"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Order activity</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">Latest orders</h3>
        </div>
        <button type="button" onClick={() => setActivePage('orders')} className="admin-link-button">View all</button>
      </div>
      <div className="mt-5 grid gap-2">
        {recentOrders.length ? recentOrders.map((order) => (
          <button type="button" onClick={() => setActivePage('orders')} className="admin-recent-order" key={order.id}>
            <span className="admin-order-avatar">{order.customer.fullName.trim().slice(0, 1).toUpperCase() || 'C'}</span>
            <span className="min-w-0 text-left">
              <span className="block truncate text-sm font-black text-slate-950">{order.customer.fullName}</span>
              <span className="mt-0.5 block truncate text-xs font-bold text-slate-500">{order.package.title}</span>
              <span className="mt-0.5 block text-[0.68rem] font-black text-blue-700">{formatOrderReference(order)}</span>
            </span>
            <span className="text-right">
              <span className="block text-xs font-black text-slate-900">{formatMoney(orderRevenue(order))}</span>
              <span className={`admin-order-status admin-order-status--${order.status.toLowerCase().replace(/ /g, '-')}`}>{order.status}</span>
            </span>
          </button>
        )) : (
          <div className="admin-empty-state">New customer activity will appear here as soon as orders arrive.</div>
        )}
      </div>
    </motion.section>
  )
}

function AdminLoginGate({ onSuccess, onClose }: { onSuccess: (identity: AdminIdentity) => void; onClose: () => void }) {
  const { platformName } = usePlatformBranding()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!email.trim() || !password || submitting) return
    setSubmitting(true)
    try {
      const identity = await signInAdministrator(email, password)
      await verifyFeedbackAdminAccess()
      setError('')
      onSuccess(identity)
    } catch {
      await signOutAdministrator().catch(() => undefined)
      setError('This account is not authorized to access the admin dashboard.')
      setPassword('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/72 p-4 text-white backdrop-blur-2xl">
      <motion.div
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md rounded-[34px] border border-white/12 bg-ink-950/92 p-6 shadow-[0_30px_110px_rgba(0,0,0,0.72)]"
        initial={{ opacity: 0, y: 22, scale: 0.96 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-gold-500">{platformName} · Private access</p>
            <h2 className="mt-3 font-serif text-4xl font-normal leading-none">Admin sign in</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.055]">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <label className="mt-6 block text-xs font-black uppercase tracking-[0.12em] text-stone-300" htmlFor="admin-email">Email</label>
        <input id="admin-email" value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void submit() }} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/[0.055] px-4 text-base font-bold text-white outline-none focus:border-gold-500/70" autoComplete="email" inputMode="email" placeholder="admin@example.com" type="email" />
        <label className="mt-4 block text-xs font-black uppercase tracking-[0.12em] text-stone-300" htmlFor="admin-password">Password</label>
        <input id="admin-password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void submit() }} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/[0.055] px-4 text-base font-bold text-white outline-none focus:border-gold-500/70" autoComplete="current-password" placeholder="Your password" type="password" />
        {error ? <p className="mt-3 text-sm font-bold text-red-300">{error}</p> : null}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
          className="mt-5 min-h-13 w-full rounded-full bg-linear-to-br from-[#4d96ff] via-gold-500 to-gold-600 text-sm font-black uppercase tracking-[0.14em] text-white disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </motion.div>
    </div>
  )
}

function Sidebar({
  activePage,
  setActivePage,
  onClose,
  drawerOpen,
  setDrawerOpen,
  feedbackNewCount,
}: {
  activePage: AdminPage
  setActivePage: (page: AdminPage) => void
  onClose: () => void
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  feedbackNewCount: number
}) {
  const { platformName, platformLogoUrl } = usePlatformBranding()
  const nav = (
    <div className="flex h-full flex-col">
      <div className="admin-sidebar-brand border-b border-white/8 p-5">
        <div className="flex items-center gap-3"><span className="grid size-9 place-items-center overflow-hidden rounded-xl bg-slate-100 text-xs font-black text-blue-700">{platformLogoUrl ? <img src={platformLogoUrl} alt="" className="size-full object-contain" /> : platformName.slice(0, 1)}</span><p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-blue-700">{platformName}</p></div>
        <h2 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.04em] text-slate-950">Command centre</h2>
      </div>
      <nav className="grid gap-2 p-3">
        {pageLabels.map(([page, label, Icon]) => (
          <button
            type="button"
            key={page}
            onClick={() => {
              setActivePage(page)
              setDrawerOpen(false)
            }}
            className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-left text-sm font-black transition ${
              activePage === page ? 'admin-nav-active' : 'admin-nav-item'
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="min-w-0 flex-1">{label}</span>
            {page === 'feedback' && feedbackNewCount > 0 ? <span className="grid min-w-5 place-items-center rounded-full bg-blue-600 px-1 text-[0.62rem] leading-5 text-white">{feedbackNewCount > 99 ? '99+' : feedbackNewCount}</span> : null}
          </button>
        ))}
      </nav>
      <div className="mt-auto grid gap-2 border-t border-white/8 p-3">
        <button
          type="button"
          onClick={onClose}
          className="admin-nav-item flex min-h-12 items-center gap-3 rounded-2xl px-4 text-left text-sm font-black"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Landing Page
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="admin-sidebar hidden h-screen w-[280px] shrink-0 border-r border-white/8 backdrop-blur-2xl lg:block">{nav}</aside>
      <AnimatePresence>
        {drawerOpen ? (
          <motion.div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-xl lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.aside
              className="admin-sidebar h-full w-[82vw] max-w-[330px] border-r border-white/10"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
            >
              {nav}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

function DashboardPage({ orders, expenses, events, setActivePage }: { orders: AdminOrder[]; expenses: AdminExpense[]; events: AdminEvent[]; setActivePage: (page: AdminPage) => void }) {
  const todayOrders = orders.filter((order) => isSameDay(order.createdAt))
  const todayExpenses = expenses.filter((expense) => isSameDay(expense.createdAt)).reduce((sum, expense) => sum + expense.amount, 0)
  const todayExpectedRevenue = sumOrderRevenue(todayOrders, isExpectedOrder)
  const todayDeliveredRevenue = sumOrderRevenue(todayOrders, isDeliveredOrder)
  const totalDeliveredRevenue = sumOrderRevenue(orders, isDeliveredOrder)
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const processingValue = sumOrderRevenue(orders, (order) => order.status === 'Processing')
  const cancelledRevenue = sumOrderRevenue(orders, (order) => order.status === 'Cancelled')
  const eventCount = (type: string) => events.filter((event) => event.type === type && isSameDay(event.createdAt)).length
  const funnel = [
    ['Visitors', eventCount('visitor')],
    ['Buy Now Click', eventCount('buy_click')],
    ['Package Selected', eventCount('package_selected')],
    ['Availability Confirmed', eventCount('availability_confirmed')],
    ['Form Submitted', eventCount('form_submitted')],
    ['Delivered/Fulfilled', eventCount('delivered') + eventCount('fulfilled')],
  ] as const
  const maxFunnel = Math.max(...funnel.map(([, value]) => value), 1)

  return (
    <div className="grid gap-6">
      <CommandCenterHero
        visitors={eventCount('visitor')}
        totalOrders={orders.length}
        expectedRevenue={todayExpectedRevenue}
        deliveredRevenue={todayDeliveredRevenue}
        setActivePage={setActivePage}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Operations at a glance</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">The numbers that need your attention</h3>
        </div>
        <button type="button" onClick={() => setActivePage('finance')} className="admin-link-button">Open finance</button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Today's Visitors" value={eventCount('visitor')} />
        <StatCard label="Buy Now Clicks" value={eventCount('buy_click')} tone="gold" />
        <StatCard label="Submitted Orders" value={todayOrders.length} tone="mint" />
        <StatCard label="All Order Requests" value={orders.length} tone="gold" />
        <StatCard label="Not Yet Ready" value={events.filter((event) => event.type === 'availability_confirmed' && isSameDay(event.createdAt)).length - todayOrders.length} />
        <StatCard label="New Orders" value={orders.filter((order) => order.status === 'New').length} />
        <StatCard label="Processing Orders" value={orders.filter((order) => order.status === 'Processing').length} />
        <StatCard label="Confirmed Orders" value={orders.filter((order) => order.status === 'Confirmed').length} />
        <StatCard label="Delivered/Paid Orders" value={orders.filter(isDeliveredOrder).length} tone="mint" />
        <StatCard label="Cancelled Orders" value={orders.filter((order) => order.status === 'Cancelled').length} tone="danger" />
        <StatCard label="Today's Profit" value={formatMoney(todayDeliveredRevenue - todayExpenses)} tone={todayDeliveredRevenue - todayExpenses < 0 ? 'danger' : 'gold'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <StatCard label="Today's Expected Order Revenue" value={formatMoney(todayExpectedRevenue)} />
        <StatCard label="Today's Delivered Revenue" value={formatMoney(todayDeliveredRevenue)} tone="mint" />
        <StatCard label="Today's Expenses" value={formatMoney(todayExpenses)} tone="danger" />
        <StatCard label="Overall Profit" value={formatMoney(totalDeliveredRevenue - totalExpenses)} tone={totalDeliveredRevenue - totalExpenses < 0 ? 'danger' : 'gold'} />
        <StatCard label="Processing Order Value" value={formatMoney(processingValue)} />
        <StatCard label="Cancelled Revenue" value={formatMoney(cancelledRevenue)} tone="danger" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
        <PerformanceChart orders={orders} />
        <RecentOrderActivity orders={orders} setActivePage={setActivePage} />
      </div>

      <motion.section
        className="admin-living-panel rounded-[30px] border border-[#c9def2] bg-white p-5 shadow-[0_22px_48px_rgba(18,73,134,0.14),inset_0_1px_0_rgba(255,255,255,0.98)] sm:p-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.18 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-blue-700">Conversion funnel</p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">Today’s customer journey</h3>
          </div>
          <button type="button" onClick={() => setActivePage('analytics')} className="admin-link-button hidden md:inline-flex">
            View Analytics
          </button>
        </div>
        <div className="mt-5 grid gap-3">
          {funnel.map(([label, value], index) => (
            <div key={label}>
              <div className="mb-2 flex justify-between text-sm font-bold text-slate-600">
                <span>{label}</span>
                <span className="font-black text-slate-950">{value}</span>
              </div>
              <div className="admin-funnel-track h-3 overflow-hidden rounded-full">
                <motion.div
                  className="admin-funnel-fill h-full rounded-full"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${Math.max(8, (value / maxFunnel) * 100 - index * 3)}%` }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: index * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  )
}

function OrderDetail({ order, history, onClose }: { order: AdminOrder; history: AdminOrderHistory[]; onClose: () => void }) {
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expensePurpose, setExpensePurpose] = useState('')
  const [operationalNote, setOperationalNote] = useState('')
  const [cancellationReason, setCancellationReason] = useState<'customer_changed_mind' | 'unreachable' | 'duplicate_order' | 'delivery_issue' | 'invalid_order' | 'other'>('other')
  const addOrderExpense = async () => {
    const parsed = Number(expenseAmount)
    if (!parsed || !expensePurpose.trim()) return false
    await addAdminExpense(parsed, expensePurpose.trim(), order.id)
    setExpenseAmount('')
    setExpensePurpose('')
    return true
  }

  const copyText = `Customer:\n${order.customer.fullName}\n\nPhone:\n${order.customer.phoneNumber}\n\nWhatsApp:\n${order.customer.whatsappNumber || 'N/A'}\n\nState:\n${order.customer.state}\n\nAddress:\n${order.customer.address}\n\nPackage:\n${order.package.title}\n\nPromo Price:\n${order.package.promoPrice}\n\nOriginal Price:\n${order.package.oldPrice}\n\nSavings:\n${order.package.savedAmount}\n\nDelivery Note:\n${order.customer.deliveryNote || 'N/A'}\n\nOrder Date:\n${new Date(order.createdAt).toLocaleString()}`

  return (
    <motion.aside
      className="admin-order-drawer fixed inset-0 z-[100] overflow-y-auto p-4 md:inset-y-4 md:left-auto md:right-4 md:w-[430px] md:rounded-[32px] md:border"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-blue-700">Order detail</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">{order.customer.fullName}</h3>
          <p className="mt-1 text-sm font-bold text-slate-500">{formatOrderReference(order)} · {order.id}</p>
        </div>
        <button type="button" onClick={onClose} className="admin-detail-close grid size-10 place-items-center rounded-full border">
          <X className="size-5" />
        </button>
      </div>
      <dl className="mt-6 grid gap-3">
        {[
          ['Phone Number', order.customer.phoneNumber],
          ['WhatsApp Number', order.customer.whatsappNumber || 'N/A'],
          ['State', order.customer.state],
          ['Detailed Address', order.customer.address],
          ['Delivery Note', order.customer.deliveryNote || 'N/A'],
          ['Package Selected', order.package.title],
          ['Promo Price', order.package.promoPrice],
          ['Original Price', order.package.oldPrice],
          ['Savings', order.package.savedAmount],
          ['Date / Time', new Date(order.createdAt).toLocaleString()],
          ['Status', order.status],
          ['Latest operational update', order.updatedAt ? new Date(order.updatedAt).toLocaleString() : 'Not available'],
          ...(order.paidAt ? [['Delivered/Paid at', new Date(order.paidAt).toLocaleString()]] : []),
          ...(order.cancellationReason ? [['Cancellation reason', order.cancellationReason.replace(/_/g, ' ')]] : []),
        ].map(([label, value]) => (
          <div className="admin-detail-row rounded-2xl border p-3" key={label}>
            <dt className="text-[0.66rem] font-black uppercase tracking-[0.15em] text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm font-bold leading-6 text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      <section className="admin-detail-expense mt-5 rounded-2xl border p-3">
        <p className="text-[0.66rem] font-black uppercase tracking-[0.15em] text-blue-700">Attach expense to order</p>
        <input value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value.replace(/[^\d]/g, ''))} className="admin-input mt-3" placeholder="Amount (NGN)" />
        <input value={expensePurpose} onChange={(event) => setExpensePurpose(event.target.value)} className="admin-input mt-2" placeholder="Purpose e.g. dispatch, calls, packaging" />
        <button
          type="button"
          onClick={() => {
            void addOrderExpense()
              .then((saved) => {
                if (!saved) {
                  return
                }
                notifyAdmin('Expense saved.', 'success')
              })
              .catch(notifyAdminError)
          }}
          className="mt-3 min-h-11 w-full rounded-full bg-gold-500 text-xs font-black uppercase tracking-[0.12em] text-white"
        >
          Add Expense
        </button>
      </section>
      <section className="mt-5 rounded-2xl border p-3"><p className="text-[0.66rem] font-black uppercase tracking-[0.15em] text-blue-700">Status history</p><div className="mt-3 grid gap-2">{history.length ? history.map((entry) => <div className="rounded-xl bg-slate-50 p-3 text-xs" key={entry.id}><b className="text-slate-900">{entry.fromStatus} → {entry.toStatus}</b><p className="mt-1 text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>{entry.operationalNote ? <p className="mt-1 text-slate-700">{entry.operationalNote}</p> : null}{entry.cancellationReason ? <p className="mt-1 text-red-700">Reason: {entry.cancellationReason.replace(/_/g, ' ')}</p> : null}</div>) : <p className="text-sm font-semibold text-slate-500">No status changes yet.</p>}</div></section>
      <div className="mt-5 grid gap-2">
        <button type="button" onClick={() => copyToClipboard(copyText, 'Order')} className="admin-action-button">
          <Copy className="size-4" /> Copy Order
        </button>
        {order.status !== 'Delivered/Paid' && order.status !== 'Cancelled' ? <label className="grid gap-1 text-xs font-bold text-slate-600">Operational note (optional)<textarea value={operationalNote} onChange={(event) => setOperationalNote(event.target.value.slice(0, 500))} className="admin-input min-h-20" placeholder="Optional delivery or customer-service context" /></label> : null}
        {order.status === 'New' ? <button type="button" className="admin-action-button" onClick={() => { void updateAdminOrderStatus(order.id, 'Confirmed', { operationalNote }).then(() => notifyAdmin('Order confirmed.', 'success')).catch(notifyAdminError) }}>Confirm Order</button> : null}
        {order.status === 'Confirmed' ? <button type="button" className="admin-action-button" onClick={() => { void updateAdminOrderStatus(order.id, 'Processing', { operationalNote }).then(() => notifyAdmin('Order moved to processing.', 'success')).catch(notifyAdminError) }}>Start Processing / Delivery</button> : null}
        {order.status === 'Processing' ? <button type="button" className="admin-action-button border-emerald-300 bg-emerald-50 text-emerald-950" onClick={() => {
          if (!window.confirm('Confirm this order was successfully delivered and payment was received? This may create the canonical Meta Purchase conversion.')) return
          void updateAdminOrderStatus(order.id, 'Delivered/Paid', { operationalNote }).then(() => notifyAdmin('Order marked Delivered/Paid. Meta Purchase was queued if enabled.', 'success')).catch(notifyAdminError)
        }}>Confirm Delivered/Paid</button> : null}
        {order.status !== 'Delivered/Paid' && order.status !== 'Cancelled' ? <div className="grid gap-2 rounded-2xl border border-red-200 p-3"><label className="text-xs font-bold text-red-900">Cancellation reason<select value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value as typeof cancellationReason)} className="admin-input mt-1"><option value="customer_changed_mind">Customer changed mind</option><option value="unreachable">Customer unreachable</option><option value="duplicate_order">Duplicate order</option><option value="delivery_issue">Delivery issue</option><option value="invalid_order">Invalid order</option><option value="other">Other</option></select></label><button type="button" className="admin-action-button text-red-700" onClick={() => { void updateAdminOrderStatus(order.id, 'Cancelled', { operationalNote, cancellationReason }).then(() => notifyAdmin('Order cancelled. No Purchase will be created.', 'success')).catch(notifyAdminError) }}>Cancel Order</button></div> : null}
      </div>
    </motion.aside>
  )
}

function OrdersPage({ orders, history, initialStatus }: { orders: AdminOrder[]; history: AdminOrderHistory[]; initialStatus?: AdminOrderStatus | 'all' }) {
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
  const [search, setSearch] = useState('')
  const [state, setState] = useState('')
  const [status, setStatus] = useState<AdminOrderStatus | 'all'>(initialStatus ?? 'all')
  const [packageId, setPackageId] = useState('all')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [page, setPage] = useState(1)

  const filtered = orders.filter((order) => {
    const matchesDate = !date || order.createdAt.slice(0, 10) === date
    const matchesSearch = `${formatOrderReference(order)} ${order.customer.fullName} ${order.customer.phoneNumber}`.toLowerCase().includes(search.toLowerCase())
    const matchesState = !state || order.customer.state === state
    const matchesStatus = status === 'all' || order.status === status
    const matchesPackage = packageId === 'all' || order.package.id === packageId
    return matchesDate && matchesSearch && matchesState && matchesStatus && matchesPackage
  })
  const pageSize = 8
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visibleOrders = filtered.slice((page - 1) * pageSize, page * pageSize)
  const orderSignals = [
    ['New', orders.filter((order) => order.status === 'New').length],
    ['Confirmed', orders.filter((order) => order.status === 'Confirmed').length],
    ['Processing', orders.filter((order) => order.status === 'Processing').length],
    ['Delivered/Paid', orders.filter(isDeliveredOrder).length],
  ] as const

  const resetFilters = () => {
    setSearch('')
    setState('')
    setStatus('all')
    setPackageId('all')
    setDate('')
    setPage(1)
  }

  return (
    <div className="grid gap-6">
      <motion.section
        className="admin-orders-hero relative overflow-hidden rounded-[32px] border p-5 sm:p-7"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="admin-command-orb admin-orders-orb" aria-hidden="true" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-[0.66rem] font-black uppercase tracking-[0.19em] text-blue-700">Order mission control</p>
            <h2 className="mt-3 font-serif text-4xl font-semibold leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-5xl">Every customer, clearly in motion.</h2>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-600">Find the next order to contact, protect delivery success, and keep every sale moving forward.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[420px]">
            {orderSignals.map(([label, value], index) => (
              <motion.div
                key={label}
                className="admin-order-signal"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.06, duration: 0.36 }}
              >
                <p>{label}</p>
                <strong>{value}</strong>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section
        className="admin-filter-panel grid gap-4 rounded-[28px] border p-4 lg:grid-cols-6 lg:p-5"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 lg:col-span-6">
          <div>
            <p className="text-[0.64rem] font-black uppercase tracking-[0.17em] text-blue-700">Find an order</p>
            <p className="mt-1 text-sm font-bold text-slate-600">Use one or more filters to focus the queue.</p>
          </div>
          <button type="button" onClick={resetFilters} className="admin-link-button">Clear filters</button>
        </div>
        <label className="relative lg:col-span-2">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} className="admin-input pl-11" placeholder="Search name or phone" />
        </label>
        <input type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1) }} className="admin-input" />
        <select value={state} onChange={(event) => { setState(event.target.value); setPage(1) }} className="admin-input">
          <option value="">All States</option>
          {nigerianStates.map((item) => (
            <option value={item} key={item}>
              {item}
            </option>
          ))}
        </select>
        <select value={status} onChange={(event) => { setStatus(event.target.value as AdminOrderStatus | 'all'); setPage(1) }} className="admin-input">
          <option value="all">All Statuses</option>
          {statuses.map((item) => (
            <option value={item} key={item}>
              {item}
            </option>
          ))}
        </select>
        <select value={packageId} onChange={(event) => { setPackageId(event.target.value); setPage(1) }} className="admin-input">
          <option value="all">All Packages</option>
          {productPackages.map((item) => (
            <option value={item.id} key={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </motion.section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <p className="text-[0.64rem] font-black uppercase tracking-[0.17em] text-blue-700">Customer queue</p>
            <p className="mt-1 text-sm font-bold text-slate-600">{filtered.length} order{filtered.length === 1 ? '' : 's'} found</p>
          </div>
          <span className="admin-queue-hint">Tap an order to open its full delivery brief</span>
        </div>
        {visibleOrders.length ? visibleOrders.map((order, index) => (
          <motion.button
            type="button"
            onClick={() => setSelectedOrder(order)}
            className="admin-order-list-card text-left"
            key={order.id}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ delay: Math.min(index * 0.045, 0.24), duration: 0.34 }}
            whileHover={{ y: -3 }}
          >
            <span className="admin-order-avatar">{order.customer.fullName.trim().slice(0, 1).toUpperCase() || 'C'}</span>
            <span className="min-w-0">
              <span className="block truncate text-base font-black text-slate-950">{order.customer.fullName}</span>
              <span className="mt-1 block text-sm font-bold text-slate-500">{formatOrderReference(order)} · {order.customer.phoneNumber}</span>
            </span>
            <span className="admin-order-location">{order.customer.state}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-slate-800">{order.package.title}</span>
              <span className="mt-1 block text-xs font-bold text-slate-500">{formatMoney(orderRevenue(order))}</span>
            </span>
            <span className="justify-self-start md:justify-self-center">
              <span className={`admin-order-pill admin-order-pill--${order.status.toLowerCase().replace(/ /g, '-')}`}>{order.status}</span>
            </span>
            <span className="text-xs font-bold leading-5 text-slate-500 md:text-right">{new Date(order.createdAt).toLocaleString()}</span>
          </motion.button>
        )) : (
          <div className="admin-empty-state">No orders match those filters. Clear the filters to return to the full order queue.</div>
        )}
      </section>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-500">Page {page} of {pages}</p>
        <div className="flex gap-2">
          <button type="button" disabled={page === 1} onClick={() => setPage(Math.max(1, page - 1))} className="admin-small-button disabled:cursor-not-allowed disabled:opacity-45">
            Previous
          </button>
          <button type="button" disabled={page === pages} onClick={() => setPage(Math.min(pages, page + 1))} className="admin-small-button disabled:cursor-not-allowed disabled:opacity-45">
            Next
          </button>
        </div>
      </div>
      <AnimatePresence>{selectedOrder ? <OrderDetail order={selectedOrder} history={history.filter((entry) => entry.orderId === selectedOrder.id)} onClose={() => setSelectedOrder(null)} /> : null}</AnimatePresence>
    </div>
  )
}

function AnalyticsPage({ orders, events, expenses }: { orders: AdminOrder[]; events: AdminEvent[]; expenses: AdminExpense[] }) {
  const [period, setPeriod] = useState<Period>('Daily')
  const reportPeriod = periodToReportPeriod(period)
  const scopedOrders = filterByReportPeriod(orders, reportPeriod)
  const scopedEvents = filterByReportPeriod(events, reportPeriod)
  const scopedExpenses = filterByReportPeriod(expenses, reportPeriod)
  const expectedRevenue = sumOrderRevenue(scopedOrders, isExpectedOrder)
  const deliveredRevenue = sumOrderRevenue(scopedOrders, isDeliveredOrder)
  const expenseTotal = scopedExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const profit = deliveredRevenue - expenseTotal
  const buyClicks = scopedEvents.filter((event) => event.type === 'buy_click').length
  const conversionRate = buyClicks
    ? Math.round((scopedOrders.length / buyClicks) * 100)
    : 0
  const topPackage =
    productPackages
      .map((item) => [item.title, scopedOrders.filter((order) => order.package.id === item.id).length] as const)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'No package yet'
  const topState =
    nigerianStates
      .map((item) => [item, scopedOrders.filter((order) => order.customer.state === item).length] as const)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'No state yet'
  const delivered = scopedOrders.filter(isDeliveredOrder).length
  const cancelled = scopedOrders.filter((order) => order.status === 'Cancelled').length
  const peakHour =
    Array.from({ length: 24 })
      .map((_, hour) => [hour, scopedOrders.filter((order) => new Date(order.createdAt).getHours() === hour).length] as const)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0

  const analytics: Array<[string, string | number]> = [
    ['Visitors', scopedEvents.filter((event) => event.type === 'visitor').length],
    ['Orders', scopedOrders.length],
    ['Expected Order Revenue', formatMoney(expectedRevenue)],
    ['Delivered Revenue', formatMoney(deliveredRevenue)],
    ['Expenses', formatMoney(expenseTotal)],
    ['Profit', formatMoney(profit)],
    ['Cash Flow Status', profit < 0 ? 'Expenses are higher than delivered revenue' : 'Cash flow is healthy'],
    ['Conversion Rate', `${conversionRate}%`],
    ['Top Selling Package', topPackage],
    ['Top Performing State', topState],
    ['Lead-to-Purchase Rate', `${scopedOrders.length ? Math.round((delivered / scopedOrders.length) * 100) : 0}%`],
    ['Cancellation Rate', `${scopedOrders.length ? Math.round((cancelled / scopedOrders.length) * 100) : 0}%`],
    ['Peak Ordering Hour', `${peakHour}:00`],
    ['Processing Order Value', formatMoney(sumOrderRevenue(scopedOrders, (order) => order.status === 'Processing'))],
  ]

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as Period[]).map((item) => (
          <button type="button" onClick={() => setPeriod(item)} className={`admin-small-button ${period === item ? 'bg-gold-500 text-white' : ''}`} key={item}>
            {item}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {analytics.map(([label, value]) => (
          <StatCard label={label} value={value} key={label} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
        <PerformanceChart orders={scopedOrders} />
        <motion.section
          className="admin-living-panel rounded-[30px] border border-[#c9def2] bg-white p-5 shadow-[0_22px_48px_rgba(18,73,134,0.14),inset_0_1px_0_rgba(255,255,255,0.98)] sm:p-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Sales mix</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">Package distribution</h3>
          <div className="mt-5 grid gap-4">
            {productPackages.map((item, index) => {
              const count = scopedOrders.filter((order) => order.package.id === item.id).length
              const max = Math.max(1, scopedOrders.length)
              return (
                <div key={item.id}>
                  <div className="mb-2 flex justify-between gap-3 text-sm font-bold text-slate-600">
                    <span className="truncate">{item.title}</span>
                    <span className="font-black text-slate-950">{count}</span>
                  </div>
                  <div className="admin-funnel-track h-3 overflow-hidden rounded-full">
                    <motion.div
                      className="admin-funnel-fill h-full rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(count / max) * 100}%` }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ delay: index * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.section>
      </div>
    </div>
  )
}

function FinancePage({ orders, expenses, settings }: { orders: AdminOrder[]; expenses: AdminExpense[]; settings: AdminSettings }) {
  const [period, setPeriod] = useState<Period>('Daily')
  const reportPeriod = periodToReportPeriod(period)
  const scopedOrders = filterByReportPeriod(orders, reportPeriod)
  const scopedExpenses = filterByReportPeriod(expenses, reportPeriod)
  const startupCapital = getTotalStartupCapital(settings)
  const expectedRevenue = sumOrderRevenue(scopedOrders, isExpectedOrder)
  const deliveredRevenue = sumOrderRevenue(scopedOrders, isDeliveredOrder)
  const processingValue = sumOrderRevenue(scopedOrders, (order) => order.status === 'Processing')
  const cancelledRevenue = sumOrderRevenue(scopedOrders, (order) => order.status === 'Cancelled')
  const totalExpenses = scopedExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const netProfit = deliveredRevenue - totalExpenses
  const cashFlow = deliveredRevenue - totalExpenses
  const roi = startupCapital ? Math.round((netProfit / startupCapital) * 100) : 0
  const collectionRate = expectedRevenue ? Math.min(100, Math.round((deliveredRevenue / expectedRevenue) * 100)) : 0
  const expenseRate = deliveredRevenue ? Math.round((totalExpenses / deliveredRevenue) * 100) : 0
  const cashFlowPositive = cashFlow >= 0
  const financeRows = [
    ['Expected order value', expectedRevenue, 'Open value from orders that have not been cancelled.'],
    ['Delivered/Paid revenue', deliveredRevenue, 'Revenue from orders received and paid for by the customer.'],
    ['Operating expenses', totalExpenses, 'Business costs currently recorded in the dashboard.'],
    ['Processing order value', processingValue, 'Order-request value currently being prepared or delivered.'],
  ] as const

  return (
    <div className="grid gap-6">
      <motion.section
        className="admin-finance-hero relative overflow-hidden rounded-[32px] border p-5 sm:p-7"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="admin-command-orb admin-finance-orb" aria-hidden="true" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.62fr)] lg:items-end">
          <div>
            <p className="text-[0.66rem] font-black uppercase tracking-[0.19em] text-blue-700">Financial command</p>
            <h2 className="mt-3 font-serif text-4xl font-semibold leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-5xl">Know the health of every naira.</h2>
            <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-slate-600">A clean view of revenue, recorded expenses, and real COD profit for the selected period.</p>
          </div>
          <div className="admin-cash-position">
            <p>Current cash flow</p>
            <strong className={cashFlowPositive ? 'text-emerald-700' : 'text-red-600'}>{formatMoney(cashFlow)}</strong>
            <span className={cashFlowPositive ? 'admin-finance-good' : 'admin-finance-alert'}>{cashFlowPositive ? 'Cash flow is healthy' : 'Cash flow needs attention'}</span>
          </div>
        </div>
      </motion.section>

      <div className="flex flex-wrap gap-2" aria-label="Finance reporting period">
        {(['Daily', 'Monthly', 'Yearly'] as Period[]).map((item) => (
          <button type="button" onClick={() => setPeriod(item)} className={`admin-small-button ${period === item ? 'bg-gold-500 text-white' : ''}`} key={item}>
            {item}
          </button>
        ))}
      </div>

      {cashFlow < 0 ? (
        <section className="admin-finance-warning rounded-[26px] border p-4 text-sm font-bold leading-6">
          Cash flow alert: expenses are higher than delivered revenue by {formatMoney(Math.abs(cashFlow))}.
        </section>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Startup Capital" value={formatMoney(startupCapital)} />
        <StatCard label={`${period} Order Requests`} value={scopedOrders.length} />
        <StatCard label={`${period} Expected Revenue`} value={formatMoney(expectedRevenue)} />
        <StatCard label={`${period} Delivered Revenue`} value={formatMoney(deliveredRevenue)} tone="mint" />
        <StatCard label="Processing Order Value" value={formatMoney(processingValue)} />
        <StatCard label="Cancelled Revenue" value={formatMoney(cancelledRevenue)} tone="danger" />
        <StatCard label={`${period} Expenses`} value={formatMoney(totalExpenses)} tone="danger" />
        <StatCard label={`${period} Net Profit`} value={formatMoney(netProfit)} tone={netProfit < 0 ? 'danger' : 'gold'} />
        <StatCard label="ROI" value={`${roi}%`} tone={roi < 0 ? 'danger' : 'gold'} />
        <StatCard label="Cash Flow" value={formatMoney(cashFlow)} tone={cashFlow < 0 ? 'danger' : 'mint'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
        <PerformanceChart orders={scopedOrders} />
        <motion.section
          className="admin-living-panel rounded-[30px] border border-[#c9def2] bg-white p-5 shadow-[0_22px_48px_rgba(18,73,134,0.14),inset_0_1px_0_rgba(255,255,255,0.98)] sm:p-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.48, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Financial clarity</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">The story behind the totals</h3>
          <div className="mt-5 grid gap-3">
            <div className="admin-finance-progress-card">
              <div className="flex items-center justify-between gap-3"><span>Collection rate</span><strong>{collectionRate}%</strong></div>
              <div className="admin-funnel-track mt-2 h-2 overflow-hidden rounded-full"><motion.div className="admin-funnel-fill h-full rounded-full" initial={{ width: 0 }} whileInView={{ width: `${collectionRate}%` }} viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} /></div>
            </div>
            <div className="admin-finance-progress-card">
              <div className="flex items-center justify-between gap-3"><span>Expense ratio</span><strong>{expenseRate}%</strong></div>
              <div className="admin-funnel-track mt-2 h-2 overflow-hidden rounded-full"><motion.div className="admin-expense-fill h-full rounded-full" initial={{ width: 0 }} whileInView={{ width: `${Math.min(expenseRate, 100)}%` }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} /></div>
            </div>
            {financeRows.map(([label, value, copy]) => (
              <div className="admin-finance-row" key={label}>
                <span><strong>{label}</strong><small>{copy}</small></span>
                <b>{formatMoney(value)}</b>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  )
}

function ExpensesPage({ expenses }: { expenses: AdminExpense[] }) {
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [weeklyCutoff] = useState(() => Date.now() - 7 * 86400000)
  const today = expenses.filter((expense) => isSameDay(expense.createdAt))
  const todayTotal = today.reduce((sum, expense) => sum + expense.amount, 0)
  const weeklyTotal = expenses.filter((expense) => new Date(expense.createdAt).getTime() >= weeklyCutoff).reduce((sum, expense) => sum + expense.amount, 0)
  const monthlyTotal = expenses.filter((expense) => isSameMonth(expense.createdAt)).reduce((sum, expense) => sum + expense.amount, 0)
  const recentExpenses = [...expenses].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()).slice(0, 8)

  const save = async () => {
    const parsed = Number(amount)
    if (!parsed || !purpose.trim()) return
    await addAdminExpense(parsed, purpose.trim())
    setAmount('')
    setPurpose('')
    notifyAdmin('Expense saved.', 'success')
  }

  return (
    <div className="grid gap-6">
      <motion.section
        className="admin-expenses-hero relative overflow-hidden rounded-[32px] border p-5 sm:p-7"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="admin-command-orb admin-expenses-orb" aria-hidden="true" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-[0.66rem] font-black uppercase tracking-[0.19em] text-blue-700">Spending ledger</p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl font-semibold leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-5xl">Keep every business cost in focus.</h2>
            <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-slate-600">Log operating costs as they happen and keep a clear picture of the cash leaving the business.</p>
          </div>
          <div className="admin-expense-total"><span>This month</span><strong>{formatMoney(monthlyTotal)}</strong></div>
        </div>
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.25fr)]">
        <motion.section
          className="admin-expense-form rounded-[30px] border p-5 sm:p-6"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">New entry</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">Record an expense</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Keep the description clear so reports remain useful later.</p>
          <div className="mt-6 grid gap-4">
            <label className="admin-field-label">Amount in naira
              <input value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))} className="admin-input mt-2" inputMode="numeric" placeholder="e.g. 25000" />
            </label>
            <label className="admin-field-label">What was this for?
              <input value={purpose} onChange={(event) => setPurpose(event.target.value)} className="admin-input mt-2" placeholder="e.g. delivery, packaging, advert spend" />
            </label>
          </div>
          <button type="button" onClick={() => void save().catch(notifyAdminError)} className="admin-primary-action mt-5 w-full">
            <DollarSign className="size-4" aria-hidden="true" /> Save expense
          </button>
        </motion.section>

        <section className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Today's Expenses" value={formatMoney(todayTotal)} />
          <StatCard label="Weekly Expenses" value={formatMoney(weeklyTotal)} />
          <StatCard label="Monthly Expenses" value={formatMoney(monthlyTotal)} />
        </div>
        <motion.section
          className="admin-expense-ledger rounded-[30px] border p-5 sm:p-6"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.46, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Recent activity</p><h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">Expense ledger</h3></div>
            <span className="admin-ledger-count">{expenses.length} logged</span>
          </div>
          <div className="mt-5 grid gap-2">
            {recentExpenses.length ? recentExpenses.map((expense, index) => (
              <motion.article
                className="admin-expense-row"
                key={expense.id}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.3 }}
              >
                <span className="admin-expense-marker">₦</span>
                <span className="min-w-0"><strong>{expense.purpose}</strong><small>{new Date(expense.createdAt).toLocaleString()}</small></span>
                <b>{formatMoney(expense.amount)}</b>
              </motion.article>
            )) : <div className="admin-empty-state">Your expense entries will appear here after you record the first business cost.</div>}
          </div>
        </motion.section>
      </section>
      </div>
    </div>
  )
}

function SettingsPage({ orders, expenses, events, settings }: { orders: AdminOrder[]; expenses: AdminExpense[]; events: AdminEvent[]; settings: AdminSettings }) {
  const [thankYouPath, setThankYouPath] = useState(settings.thankYouPath)
  const [startupCapital, setStartupCapital] = useState(String(settings.startupCapital))
  const [packagePrices, setPackagePrices] = useState(settings.packagePrices)
  const normalizedThankYouPath = thankYouPath.trim() || '/thank-you'
  const thankYouUrl = `${window.location.origin}${normalizedThankYouPath.startsWith('/') ? normalizedThankYouPath : `/${normalizedThankYouPath}`}`

  const save = async () => {
    await saveAdminSettings({
      ...settings,
      thankYouPath: thankYouPath.trim() || '/thank-you',
      startupCapital: Number(startupCapital) || 0,
      packagePrices,
    })
    notifyAdmin('Settings saved.', 'success')
  }

  const updatePackagePrice = (packageId: string, key: 'promoPrice' | 'oldPrice' | 'savedAmount', value: string) => {
    setPackagePrices((current) => ({
      ...current,
      [packageId]: {
        promoPrice: current[packageId]?.promoPrice ?? productPackages.find((item) => item.id === packageId)?.promoPrice ?? '',
        oldPrice: current[packageId]?.oldPrice ?? productPackages.find((item) => item.id === packageId)?.oldPrice ?? '',
        savedAmount: current[packageId]?.savedAmount ?? productPackages.find((item) => item.id === packageId)?.savedAmount ?? '',
        [key]: value,
      },
    }))
  }

  return (
    <div className="grid gap-6">
      <motion.section
        className="admin-settings-hero relative overflow-hidden rounded-[32px] border p-5 sm:p-7"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="admin-command-orb admin-settings-orb" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[0.66rem] font-black uppercase tracking-[0.19em] text-blue-700">Form settings</p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl font-semibold leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-5xl">Control the engine behind every order.</h2>
            <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-slate-600">Order persistence, tracking, pricing, and reports are managed from one calm workspace.</p>
          </div>
          <button type="button" onClick={() => void save().catch(notifyAdminError)} className="admin-primary-action">
            <Settings className="size-4" aria-hidden="true" /> Save all settings
          </button>
        </div>
      </motion.section>

      <PlatformSettingsPanel />
      <MetaTrackingPanel />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)]">
        <motion.section
          className="admin-settings-panel rounded-[30px] border p-5 sm:p-6"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Tracking and routes</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">Order form configuration</h3>
          <div className="mt-6 grid gap-4">
            <label className="admin-field-label">Thank-you page path
              <input value={thankYouPath} onChange={(event) => setThankYouPath(event.target.value)} className="admin-input mt-2" placeholder="e.g. /thank-you" />
            </label>
          </div>
          <div className="admin-settings-link mt-5">
            <p>Thank-you link for Facebook tracking</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input value={thankYouUrl} readOnly className="admin-input" />
              <button type="button" onClick={() => copyToClipboard(thankYouUrl, 'Thank-you link')} className="admin-small-button shrink-0">Copy link</button>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="admin-settings-panel rounded-[30px] border p-5 sm:p-6"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Business foundation</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">Startup capital</h3>
          <label className="admin-field-label mt-6">Capital in naira
            <input value={startupCapital} onChange={(event) => setStartupCapital(event.target.value.replace(/[^\d]/g, ''))} className="admin-input mt-2" inputMode="numeric" placeholder="Startup capital" />
          </label>
          <div className="admin-settings-total mt-5"><span>Current total with top-ups</span><strong>{formatMoney(getTotalStartupCapital(settings))}</strong></div>
          <div className={`admin-connection-status mt-5 ${isSupabaseConfigured() ? 'admin-connection-status--connected' : ''}`}>
            <span>{isSupabaseConfigured() ? 'Connected' : 'Configuration required'}</span>
            <p>{isSupabaseConfigured() ? 'Supabase is securely syncing orders, expenses, analytics, and settings.' : getSupabaseConfigurationError()}</p>
          </div>
        </motion.section>
      </div>

      <motion.section
        className="admin-settings-panel rounded-[30px] border p-5 sm:p-6"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Package pricing</p><h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">Keep the offer consistent</h3></div>
          <p className="max-w-sm text-sm font-semibold leading-6 text-slate-600">Adjust promo, original, and savings copy without changing package IDs or checkout logic.</p>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {productPackages.map((item, index) => {
            const values = packagePrices[item.id] ?? { promoPrice: item.promoPrice, oldPrice: item.oldPrice, savedAmount: item.savedAmount }
            return (
              <motion.article className="admin-package-settings-card" key={item.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ delay: index * 0.06, duration: 0.35 }}>
                <p className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-blue-700">Offer {index + 1}</p>
                <h4 className="mt-2 text-lg font-black text-slate-950">{item.title}</h4>
                <label className="admin-field-label mt-4">Promo price<input value={values.promoPrice} onChange={(event) => updatePackagePrice(item.id, 'promoPrice', event.target.value)} className="admin-input mt-2" placeholder="Promo price" /></label>
                <label className="admin-field-label mt-3">Original price<input value={values.oldPrice} onChange={(event) => updatePackagePrice(item.id, 'oldPrice', event.target.value)} className="admin-input mt-2" placeholder="Original price" /></label>
                <label className="admin-field-label mt-3">Savings label<input value={values.savedAmount} onChange={(event) => updatePackagePrice(item.id, 'savedAmount', event.target.value)} className="admin-input mt-2" placeholder="Savings text" /></label>
              </motion.article>
            )
          })}
        </div>
      </motion.section>

      <motion.section
        className="admin-settings-panel rounded-[30px] border p-5 sm:p-6"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Reports</p>
        <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">Download a clear business snapshot</h3>
        <div className="mt-5 flex flex-wrap gap-2">
          {(['day', 'week', 'month', 'year'] as const).flatMap((period) =>
            (['financial', 'orders', 'expenses', 'analysis'] as const).map((type) => (
              <button type="button" className="admin-report-button" key={`${period}-${type}`} onClick={() => downloadReport(period, orders, expenses, events, type)}>
                {type} · {period}
              </button>
            )),
          )}
        </div>
      </motion.section>
    </div>
  )
}

function NotificationsPage({ orders, setActivePage, setInitialStatus }: { orders: AdminOrder[]; setActivePage: (page: AdminPage) => void; setInitialStatus: (status: AdminOrderStatus | 'all') => void }) {
  const notifications: Array<{ label: string; status: AdminOrderStatus; count: number; copy: string; tone: 'primary' | 'attention' | 'danger' }> = [
    { label: 'New orders', status: 'New', count: orders.filter((order) => order.status === 'New').length, copy: 'Fresh customers waiting for a quick first response.', tone: 'primary' },
    { label: 'Confirmed orders', status: 'Confirmed', count: orders.filter((order) => order.status === 'Confirmed').length, copy: 'Confirmed customers ready to be prepared for delivery.', tone: 'primary' },
    { label: 'Processing orders', status: 'Processing', count: orders.filter((order) => order.status === 'Processing').length, copy: 'Orders currently being prepared or delivered. Confirm payment only after successful delivery.', tone: 'attention' },
    { label: 'Cancelled orders', status: 'Cancelled', count: orders.filter((order) => order.status === 'Cancelled').length, copy: 'Review these outcomes to spot opportunities to improve.', tone: 'danger' },
  ]
  const totalAttention = notifications.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="grid gap-6">
      <NotificationOperationsPanel />
      <motion.section
        className="admin-notifications-hero relative overflow-hidden rounded-[32px] border p-5 sm:p-7"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="admin-command-orb admin-notifications-orb" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[0.66rem] font-black uppercase tracking-[0.19em] text-blue-700">Priority inbox</p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl font-semibold leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-5xl">Keep your next best action in view.</h2>
            <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-slate-600">Every alert leads straight to the relevant customer queue, so the team can act without losing context.</p>
          </div>
          <div className="admin-attention-count">
            <span>Needs attention</span>
            <strong>{totalAttention}</strong>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {notifications.map((notification, index) => (
          <motion.button
            type="button"
            className={`admin-notification-card admin-notification-card--${notification.tone} text-left`}
            key={notification.label}
            onClick={() => {
              setInitialStatus(notification.status)
              setActivePage('orders')
            }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ delay: Math.min(index * 0.07, 0.28), duration: 0.38 }}
            whileHover={{ y: -5, scale: 1.012 }}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="admin-notification-label">{notification.label}</span>
              <span className="admin-notification-count">{notification.count}</span>
            </div>
            <p className="mt-5 max-w-xs text-sm font-semibold leading-6 text-slate-600">{notification.copy}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-blue-700">Review queue <span aria-hidden="true">→</span></span>
          </motion.button>
        ))}
      </section>
    </div>
  )
}

function NewOrdersNotice({
  count,
  onClose,
  onViewOrders,
}: {
  count: number
  onClose: () => void
  onViewOrders: () => void
}) {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[120] grid place-items-center bg-black/62 p-4 backdrop-blur-xl"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
    >
      <motion.section
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md rounded-[30px] border border-gold-500/25 bg-ink-950/92 p-5 text-white shadow-[0_30px_110px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.12)]"
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-gold-500">New order alert</p>
            <h2 className="mt-2 font-serif text-4xl font-normal leading-none">
              {count === 1 ? '1 new order' : `${count} new orders`}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.055]" aria-label="Close new order alert">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-4 text-sm font-semibold leading-6 text-stone-300">
          Review and contact the customer as soon as possible. Only Delivered/Paid orders count as real COD revenue.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onViewOrders} className="min-h-12 rounded-full bg-gold-500 px-5 text-sm font-black uppercase tracking-[0.12em] text-white">
            View Orders
          </button>
          <button type="button" onClick={onClose} className="min-h-12 rounded-full border border-white/10 bg-white/[0.055] px-5 text-sm font-black uppercase tracking-[0.12em] text-stone-200">
            Close
          </button>
        </div>
      </motion.section>
    </motion.div>
  )
}

function ProfilePage({ orders, expenses, events, settings }: { orders: AdminOrder[]; expenses: AdminExpense[]; events: AdminEvent[]; settings: AdminSettings }) {
  const [topUpAmount, setTopUpAmount] = useState('')
  const [topUpNote, setTopUpNote] = useState('')
  const saveTopUp = async () => {
    const parsed = Number(topUpAmount)
    if (!parsed) return
    await addCapitalTopUp(parsed, topUpNote.trim() || 'Capital top-up')
    setTopUpAmount('')
    setTopUpNote('')
    notifyAdmin('Capital top-up saved.', 'success')
  }

  return (
    <div className="grid gap-6">
      <motion.section
        className="admin-profile-hero relative overflow-hidden rounded-[32px] border p-5 sm:p-7"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="admin-command-orb admin-profile-orb" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[0.66rem] font-black uppercase tracking-[0.19em] text-blue-700">Profile settings</p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl font-semibold leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-5xl">Your business control room, always ready.</h2>
            <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-slate-600">Manage startup funding, log capital top-ups, and pull the reports you need to make confident decisions.</p>
          </div>
          <div className="admin-profile-badge"><UserRound className="size-5" aria-hidden="true" /><span>Solar Generator<br />Admin profile</span></div>
        </div>
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
        <motion.section
          className="admin-profile-panel rounded-[30px] border p-5 sm:p-6"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Capital position</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">Funding at a glance</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <StatCard label="Base Startup Capital" value={formatMoney(settings.startupCapital)} />
            <StatCard label="Capital With Top-ups" value={formatMoney(getTotalStartupCapital(settings))} tone="gold" />
          </div>
        </motion.section>

        <motion.section
          className="admin-profile-panel rounded-[30px] border p-5 sm:p-6"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Capital top-up</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">Add funding clearly</h3>
          <div className="mt-5 grid gap-4">
            <label className="admin-field-label">Amount in naira<input value={topUpAmount} onChange={(event) => setTopUpAmount(event.target.value.replace(/[^\d]/g, ''))} className="admin-input mt-2" inputMode="numeric" placeholder="Top-up amount" /></label>
            <label className="admin-field-label">Note for this top-up<input value={topUpNote} onChange={(event) => setTopUpNote(event.target.value)} className="admin-input mt-2" placeholder="e.g. capital injection for stock" /></label>
          </div>
          <button type="button" onClick={() => void saveTopUp().catch(notifyAdminError)} className="admin-primary-action mt-5 w-full"><WalletCards className="size-4" aria-hidden="true" /> Save capital top-up</button>
        </motion.section>
      </div>

      <motion.section
        className="admin-profile-panel rounded-[30px] border p-5 sm:p-6"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Capital history</p><h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">Funding timeline</h3></div>
          <span className="admin-ledger-count">{settings.capitalTopUps.length} top-up{settings.capitalTopUps.length === 1 ? '' : 's'}</span>
        </div>
        <div className="mt-5 grid gap-2">
          {settings.capitalTopUps.length ? settings.capitalTopUps.map((topUp, index) => (
            <motion.article className="admin-capital-row" key={topUp.id} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ delay: Math.min(index * 0.05, 0.22), duration: 0.3 }}>
              <span className="admin-capital-marker">+</span>
              <span className="min-w-0"><strong>{topUp.note}</strong><small>{new Date(topUp.createdAt).toLocaleString()}</small></span>
              <b>{formatMoney(topUp.amount)}</b>
            </motion.article>
          )) : <div className="admin-empty-state">Capital top-ups will appear here after you save the first funding entry.</div>}
        </div>
      </motion.section>

      <motion.section
        className="admin-profile-panel rounded-[30px] border p-5 sm:p-6"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Business reports</p>
        <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">Export the numbers that matter</h3>
        <div className="mt-5 flex flex-wrap gap-2">
          {(['day', 'week', 'month', 'year'] as const).flatMap((period) =>
            (['financial', 'orders', 'expenses', 'analysis'] as const).map((type) => (
              <button type="button" className="admin-report-button" key={`${period}-${type}`} onClick={() => downloadReport(period, orders, expenses, events, type)}>
                {type} · {period}
              </button>
            )),
          )}
        </div>
      </motion.section>
    </div>
  )
}

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [adminIdentity, setAdminIdentity] = useState<AdminIdentity | null>(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [showAdminSignIn, setShowAdminSignIn] = useState(false)
  const [activePage, setActivePage] = useState<AdminPage>('dashboard')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [initialStatus, setInitialStatus] = useState<AdminOrderStatus | 'all'>('all')
  const [acknowledgedNewOrdersCount, setAcknowledgedNewOrdersCount] = useState(0)
  const [feedbackNewCount, setFeedbackNewCount] = useState(0)
  const dashboardUnlocked = Boolean(adminIdentity)
  const { orders, expenses, events, orderHistory, settings, loading, error } = useAdminData(dashboardUnlocked)
  const toasts = useAdminToasts()
  const newOrdersCount = orders.filter((order) => order.status === 'New').length

  useEffect(() => {
    let active = true
    const validateCurrentSession = async () => {
      try {
        const identity = await getCurrentAdminIdentity()
        if (!identity) {
          if (active) setAdminIdentity(null)
          return
        }
        await verifyFeedbackAdminAccess()
        if (active) setAdminIdentity(identity)
      } catch {
        await signOutAdministrator().catch(() => undefined)
        if (active) setAdminIdentity(null)
      } finally {
        if (active) setAuthChecking(false)
      }
    }

    void validateCurrentSession()
    const unsubscribe = onAdminAuthStateChange(() => { void validateCurrentSession() })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const showNewOrdersNotice = Boolean(adminIdentity && newOrdersCount > acknowledgedNewOrdersCount)

  useEffect(() => {
    if (!adminIdentity) return
    let active = true
    getCustomerFeedbackSummary()
      .then((summary) => { if (active) setFeedbackNewCount(summary.new) })
      .catch(() => undefined)
    return () => { active = false }
  }, [adminIdentity])

  if (authChecking) {
    return <div className="fixed inset-0 z-[90] grid place-items-center bg-black/72 p-4 text-sm font-bold text-white">Checking admin session…</div>
  }

  if (!dashboardUnlocked || showAdminSignIn) {
    return <AdminLoginGate onSuccess={(identity) => { setAdminIdentity(identity); setShowAdminSignIn(false) }} onClose={onClose} />
  }

  const signOutAndClose = async () => {
    await signOutAdministrator().catch(() => undefined)
    setAdminIdentity(null)
    onClose()
  }

  const pageTitle = pageLabels.find(([page]) => page === activePage)?.[1] ?? 'Dashboard'

  return (
    <div className="admin-dashboard fixed inset-0 z-[80] flex bg-[#050505] text-white">
      <Sidebar activePage={activePage} setActivePage={setActivePage} onClose={onClose} drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} feedbackNewCount={feedbackNewCount} />
      <div className="min-w-0 flex-1 overflow-y-auto pb-24 lg:pb-0">
        <header className="admin-topbar sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/8 px-4 backdrop-blur-2xl lg:px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setDrawerOpen(true)} className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.055] lg:hidden">
              <Menu className="size-5" />
            </button>
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-blue-700">Live workspace</p>
              <h1 className="text-xl font-black text-slate-950">{pageTitle}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {adminIdentity ? <AdminPwaActions /> : null}
            <button
              type="button"
              onClick={() => setActivePage('notifications')}
              className="relative grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-stone-200"
              aria-label={`${newOrdersCount} new order notifications`}
            >
              <Bell className="size-5" aria-hidden="true" />
              {newOrdersCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-gold-500 px-1 text-[0.62rem] font-black leading-5 text-ink-950">
                  {newOrdersCount > 9 ? '9+' : newOrdersCount}
                </span>
              ) : null}
            </button>
            <button type="button" onClick={() => { if (adminIdentity) void signOutAndClose(); else setShowAdminSignIn(true) }} className="hidden items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-black text-stone-300 lg:inline-flex">
              <LogOut className="size-4" /> {adminIdentity ? 'Sign out' : 'Admin sign in'}
            </button>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          {loading ? (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 text-sm font-bold text-stone-300">Loading Supabase admin data...</div>
          ) : null}
          {error ? (
            <div className="rounded-[28px] border border-red-400/25 bg-red-500/10 p-6 text-sm font-bold leading-6 text-red-100">
              {error}
            </div>
          ) : null}
          {!loading && !error ? (
            <AnimatePresence mode="wait">
              <motion.div key={activePage} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24 }}>
                {activePage === 'dashboard' ? <DashboardPage orders={orders} expenses={expenses} events={events} setActivePage={setActivePage} /> : null}
                {activePage === 'orders' ? <OrdersPage key={initialStatus} orders={orders} history={orderHistory} initialStatus={initialStatus} /> : null}
                {activePage === 'products' ? <ProductsPage /> : null}
                {activePage === 'feedback' ? adminIdentity ? <CustomerFeedbackPage onNewCountChange={setFeedbackNewCount} /> : <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-sm font-bold text-slate-300"><MessageSquareText className="size-8 text-blue-300" /><h2 className="mt-4 text-xl font-black text-white">Customer feedback is protected</h2><p className="mt-2 max-w-xl leading-6 text-slate-400">Use an authorized Supabase administrator account to view or manage customer feedback, even during local dashboard development.</p><button type="button" onClick={() => setShowAdminSignIn(true)} className="admin-link-button mt-5">Admin sign in</button></section> : null}
                {activePage === 'analytics' ? <AnalyticsPage orders={orders} events={events} expenses={expenses} /> : null}
                {activePage === 'finance' ? <FinancePage orders={orders} expenses={expenses} settings={settings} /> : null}
                {activePage === 'expenses' ? <ExpensesPage expenses={expenses} /> : null}
                {activePage === 'settings' ? <SettingsPage key={JSON.stringify(settings)} orders={orders} expenses={expenses} events={events} settings={settings} /> : null}
                {activePage === 'notifications' ? <NotificationsPage orders={orders} setActivePage={setActivePage} setInitialStatus={setInitialStatus} /> : null}
                {activePage === 'profile' ? <ProfilePage orders={orders} expenses={expenses} events={events} settings={settings} /> : null}
              </motion.div>
            </AnimatePresence>
          ) : null}
        </main>
      </div>

      <nav className="admin-mobile-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/10 p-2 backdrop-blur-2xl lg:hidden">
        {(['dashboard', 'orders', 'analytics', 'finance', 'settings'] as AdminPage[]).map((page) => {
          const item = pageLabels.find(([candidate]) => candidate === page)
          if (!item) return null
          const [, label, Icon] = item
          return (
            <button
              type="button"
              key={page}
              onClick={() => setActivePage(page)}
              className={`grid min-h-12 place-items-center rounded-2xl text-[0.62rem] font-black ${activePage === page ? 'admin-nav-active' : 'admin-nav-item'}`}
            >
              <Icon className="size-4" />
              {label.split(' ')[0]}
            </button>
          )
        })}
      </nav>
      <AdminToasts toasts={toasts} />
      <AnimatePresence>
        {showNewOrdersNotice && newOrdersCount > 0 ? (
          <NewOrdersNotice
            count={newOrdersCount}
            onClose={() => setAcknowledgedNewOrdersCount(newOrdersCount)}
            onViewOrders={() => {
              setInitialStatus('New')
              setActivePage('orders')
              setAcknowledgedNewOrdersCount(newOrdersCount)
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}








