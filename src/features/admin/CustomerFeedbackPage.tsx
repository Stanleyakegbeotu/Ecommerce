import { Check, ChevronLeft, ChevronRight, ClipboardCheck, Filter, LoaderCircle, MessageSquareText, RotateCcw, Search, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import {
  getCustomerFeedback,
  getCustomerFeedbackVoicePlayback,
  getCustomerFeedbackSummary,
  listCustomerFeedback,
  updateCustomerFeedback,
  type AdminCustomerFeedback,
  type AdminCustomerFeedbackListItem,
  type CustomerFeedbackDateFilter,
  type CustomerFeedbackFilters,
  type CustomerFeedbackSource,
  type CustomerFeedbackStatus,
  type CustomerFeedbackSummary,
} from '@/features/admin/customerFeedbackAdminService'
import { getExitReasonLabel, type ExitReasonId } from '@/features/exitFeedback/exitFeedbackContent'
import { productPackages } from '@/features/landing/data/packages'

type CustomerFeedbackPageProps = {
  onNewCountChange: (count: number) => void
}

const statusLabels: Record<CustomerFeedbackStatus, string> = { new: 'New', reviewed: 'Reviewed', resolved: 'Resolved' }
const sourceLabels: Record<CustomerFeedbackSource, string> = { quick_reason: 'Quick reason', something_else: 'Something else', tell_more: 'Tell us more' }
const filterControlClass = 'min-h-11 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-400'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function StatusBadge({ status }: { status: CustomerFeedbackStatus }) {
  const tone = status === 'new' ? 'border-blue-300 bg-blue-50 text-blue-800' : status === 'resolved' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-slate-50 text-slate-700'
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.1em] ${tone}`}>{statusLabels[status]}</span>
}

function SummaryCard({ label, value, tone = 'text-slate-950' }: { label: string; value: number; tone?: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
      <p className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-black tracking-[-0.04em] ${tone}`}>{value.toLocaleString()}</p>
    </article>
  )
}

function FeedbackFilters({ filters, onChange, mobileOpen, setMobileOpen }: { filters: CustomerFeedbackFilters; onChange: (next: Partial<CustomerFeedbackFilters>) => void; mobileOpen: boolean; setMobileOpen: (value: boolean) => void }) {
  const controls = (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <select value={filters.status ?? 'all'} onChange={(event) => onChange({ status: event.target.value as CustomerFeedbackStatus | 'all' })} className={filterControlClass} aria-label="Filter feedback by status">
        <option value="all">All statuses</option><option value="new">New</option><option value="reviewed">Reviewed</option><option value="resolved">Resolved</option>
      </select>
      <select value={filters.reasonId ?? 'all'} onChange={(event) => onChange({ reasonId: event.target.value as ExitReasonId | 'all' })} className={filterControlClass} aria-label="Filter feedback by reason">
        <option value="all">All reasons</option>
        {(['price', 'trust', 'product_information', 'delivery', 'not_ready', 'comparing', 'something_else'] as ExitReasonId[]).map((reasonId) => <option value={reasonId} key={reasonId}>{getExitReasonLabel(reasonId)}</option>)}
      </select>
      <select value={filters.source ?? 'all'} onChange={(event) => onChange({ source: event.target.value as CustomerFeedbackSource | 'all' })} className={filterControlClass} aria-label="Filter feedback by source">
        <option value="all">All sources</option><option value="quick_reason">Quick reason</option><option value="something_else">Something else</option><option value="tell_more">Tell us more</option>
      </select>
      <select value={filters.packageId ?? 'all'} onChange={(event) => onChange({ packageId: event.target.value })} className={filterControlClass} aria-label="Filter feedback by package">
        <option value="all">All packages</option>{productPackages.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}
      </select>
      <select value={filters.date ?? 'all'} onChange={(event) => onChange({ date: event.target.value as CustomerFeedbackDateFilter })} className={filterControlClass} aria-label="Filter feedback by date">
        <option value="all">All dates</option><option value="today">Today</option><option value="last_7_days">Last 7 days</option><option value="last_30_days">Last 30 days</option>
      </select>
    </div>
  )
  return (
    <>
      <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm font-black text-slate-900 lg:hidden"><Filter className="size-4" /> Filters</button>
      <div className={`${mobileOpen ? 'grid' : 'hidden'} rounded-2xl border border-white/10 bg-white/[0.04] p-3 lg:grid`}>{controls}</div>
    </>
  )
}

function FeedbackDetail({ feedback, saving, error, onClose, onUpdate }: { feedback: AdminCustomerFeedback; saving: boolean; error: string; onClose: () => void; onUpdate: (update: { status?: CustomerFeedbackStatus; adminNote?: string | null }) => Promise<void> }) {
  const [note, setNote] = useState(feedback.adminNote ?? '')
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null)
  const [voiceLoading, setVoiceLoading] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const actions = feedback.status === 'new'
    ? [{ label: 'Mark as reviewed', status: 'reviewed' as const }, { label: 'Mark as resolved', status: 'resolved' as const }]
    : feedback.status === 'reviewed'
      ? [{ label: 'Mark as resolved', status: 'resolved' as const }]
      : [{ label: 'Reopen as reviewed', status: 'reviewed' as const }]
  const loadVoicePlayback = async () => {
    if (!feedback.voiceAttachment || voiceLoading) return
    setVoiceLoading(true)
    setVoiceError('')
    try {
      const playback = await getCustomerFeedbackVoicePlayback(feedback.voiceAttachment.id)
      setVoiceUrl(playback.playbackUrl)
    } catch {
      setVoiceError('We couldn’t load this voice note. Please try again.')
    } finally {
      setVoiceLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/65 p-3 backdrop-blur-xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="feedback-detail-title" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <section className="ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0b1322] shadow-[0_28px_100px_rgba(0,0,0,0.55)]" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
          <div><p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-blue-300">Customer feedback</p><h2 id="feedback-detail-title" className="mt-2 text-2xl font-black text-white">Feedback detail</h2></div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full border border-white/10 text-slate-200" aria-label="Close feedback detail"><X className="size-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3"><StatusBadge status={feedback.status} /><span className="text-sm font-bold text-slate-300">{getExitReasonLabel(feedback.reasonId)}</span></div>
          {error ? <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-100" role="alert">{error}</p> : null}
          <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-400">Customer message</p><p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-100">{feedback.feedbackText || 'No additional written feedback was provided.'}</p></section>
          {feedback.voiceAttachment ? <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-400">Voice note</p><p className="mt-3 text-sm font-medium text-slate-300">{Math.ceil(feedback.voiceAttachment.durationMs / 1000)} seconds</p>{voiceError ? <p className="mt-3 text-sm font-bold text-red-200" role="alert">{voiceError}</p> : null}{voiceUrl ? <audio className="mt-3 w-full" controls preload="none" src={voiceUrl}>Your browser cannot play this voice note.</audio> : <button type="button" disabled={voiceLoading} onClick={() => void loadVoicePlayback()} className="mt-3 admin-link-button disabled:opacity-60">{voiceLoading ? 'Loading voice note…' : 'Play voice note'}</button>}</section> : null}
          <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-400">Follow-up</p>{feedback.followup ? <div className="mt-3 grid gap-3 text-sm text-slate-200 sm:grid-cols-2"><p><b className="block text-slate-500">Consent</b>{feedback.followup.consentState === 'accepted' ? 'Requested' : 'Declined'}</p><p><b className="block text-slate-500">Status</b>{feedback.followup.followupStatus.replace(/_/g, ' ')}</p><p><b className="block text-slate-500">Consent time</b>{formatDate(feedback.followup.consentedAt)}</p>{feedback.followup.phoneE164 ? <p><b className="block text-slate-500">Phone number</b>{feedback.followup.phoneE164}</p> : <p><b className="block text-slate-500">Phone number</b>Not provided</p>}</div> : <p className="mt-3 text-sm font-medium text-slate-400">No follow-up preference was recorded.</p>}</section>
          <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><label htmlFor="feedback-admin-note" className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-400">Internal admin note</label><textarea id="feedback-admin-note" value={note} onChange={(event) => setNote(event.target.value.slice(0, 2000))} rows={4} className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-blue-400" placeholder="Add an internal operations note…" /><div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-400">{note.length}/2000</span><button type="button" disabled={saving} onClick={() => void onUpdate({ adminNote: note.trim() || null })} className="admin-link-button disabled:opacity-60">Save note</button></div></section>
          <section className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300 sm:grid-cols-2"><p><b className="block text-slate-500">Feedback ID</b>{feedback.id}</p><p><b className="block text-slate-500">Source</b>{sourceLabels[feedback.source]}</p><p><b className="block text-slate-500">Created</b>{formatDate(feedback.createdAt)}</p><p><b className="block text-slate-500">Updated</b>{formatDate(feedback.updatedAt)}</p><p><b className="block text-slate-500">Package</b>{feedback.selectedPackageId ?? 'Not selected'}</p><p><b className="block text-slate-500">Funnel</b>{feedback.funnelStage} · {feedback.lastSection}</p><p><b className="block text-slate-500">Checkout</b>{feedback.checkoutOpened ? 'Opened' : 'Not opened'}</p><p><b className="block text-slate-500">Form</b>{feedback.formStarted ? 'Started' : 'Not started'}</p><p className="sm:col-span-2"><b className="block text-slate-500">Session ID</b>{feedback.sessionId}</p></section>
        </div>
        <footer className="flex flex-wrap gap-2 border-t border-white/10 p-5 sm:p-6">{actions.map((action) => <button type="button" disabled={saving} key={action.status} onClick={() => void onUpdate({ status: action.status })} className="admin-link-button disabled:opacity-60">{action.status === 'resolved' ? <Check className="size-4" /> : action.status === 'reviewed' && feedback.status === 'resolved' ? <RotateCcw className="size-4" /> : <ClipboardCheck className="size-4" />}{action.label}</button>)}</footer>
      </section>
    </div>
  )
}

export function CustomerFeedbackPage({ onNewCountChange }: CustomerFeedbackPageProps) {
  const [filters, setFilters] = useState<CustomerFeedbackFilters>({ status: 'all', reasonId: 'all', source: 'all', packageId: 'all', date: 'all', sort: 'newest', page: 1, pageSize: 20 })
  const [searchInput, setSearchInput] = useState('')
  const [items, setItems] = useState<AdminCustomerFeedbackListItem[]>([])
  const [summary, setSummary] = useState<CustomerFeedbackSummary | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AdminCustomerFeedback | null>(null)
  const [detailError, setDetailError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setFilters((current) => ({ ...current, search: searchInput, page: 1 })), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const load = useCallback(async () => {
    await Promise.resolve()
    setLoading(true)
    setError('')
    try {
      const [nextList, nextSummary] = await Promise.all([listCustomerFeedback(filters), getCustomerFeedbackSummary()])
      setItems(nextList.items)
      setTotal(nextList.total)
      setSummary(nextSummary)
      onNewCountChange(nextSummary.new)
    } catch {
      setError('We couldn’t load customer feedback. Try again.')
    } finally {
      setLoading(false)
    }
  }, [filters, onNewCountChange])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  useEffect(() => {
    if (!selectedId) return
    let active = true
    getCustomerFeedback(selectedId).then(({ feedback }) => { if (active) setDetail(feedback) }).catch(() => { if (active) setDetailError('We couldn’t load this feedback item. Try again.') })
    return () => { active = false }
  }, [selectedId])

  const updateDetail = useCallback(async (update: { status?: CustomerFeedbackStatus; adminNote?: string | null }) => {
    if (!detail) return
    setSaving(true)
    setDetailError('')
    try {
      const { feedback } = await updateCustomerFeedback(detail.id, update)
      setDetail(feedback)
      await load()
    } catch {
      setDetailError('We couldn’t save that change. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [detail, load])

  const totalPages = Math.max(1, Math.ceil(total / (filters.pageSize ?? 20)))
  const setFilter = (next: Partial<CustomerFeedbackFilters>) => setFilters((current) => ({ ...current, ...next, page: next.page ?? 1 }))
  const emptyMessage = Object.values(filters).some((value) => value && value !== 'all' && value !== 'newest' && value !== 1 && value !== 20) ? 'No feedback matches these filters.' : 'Customer feedback will appear here when visitors start sharing their experience.'

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Customer voice</p><h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">Customer Feedback</h2><p className="mt-2 text-sm font-semibold text-slate-500">Review objections and resolve the issues behind them.</p></div><button type="button" onClick={() => void load()} className="admin-link-button">Refresh</button></div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5"><SummaryCard label="Total feedback" value={summary?.total ?? 0} /><SummaryCard label="New / unreviewed" value={summary?.new ?? 0} tone="text-blue-700" /><SummaryCard label="Reviewed" value={summary?.reviewed ?? 0} /><SummaryCard label="Resolved" value={summary?.resolved ?? 0} tone="text-emerald-700" /><SummaryCard label="Last 7 days" value={summary?.last7Days ?? 0} /></div>
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className={`${filterControlClass} w-full pl-10`} placeholder="Search feedback text, reason, or ID" aria-label="Search customer feedback" /></div><select value={filters.sort ?? 'newest'} onChange={(event) => setFilter({ sort: event.target.value as CustomerFeedbackFilters['sort'] })} className={filterControlClass} aria-label="Sort feedback"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="updated">Recently updated</option></select></div><div className="mt-3"><FeedbackFilters filters={filters} onChange={setFilter} mobileOpen={mobileFiltersOpen} setMobileOpen={setMobileFiltersOpen} /></div></section>
      {error ? <div className="rounded-2xl border border-red-300 bg-red-50 p-5 text-sm font-bold text-red-800"><p>{error}</p><button type="button" onClick={() => void load()} className="mt-3 underline underline-offset-4">Retry</button></div> : null}
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]">
        {loading ? <div className="grid gap-3 p-5">{Array.from({ length: 5 }).map((_, index) => <div className="h-16 animate-pulse rounded-2xl bg-white/[0.07]" key={index} />)}</div> : null}
        {!loading && !error && !items.length ? <div className="p-8 text-center"><MessageSquareText className="mx-auto size-9 text-slate-400" /><p className="mt-4 text-sm font-bold text-slate-500">{emptyMessage}</p></div> : null}
        {!loading && !error && items.length ? <><div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[960px] text-left"><thead className="border-b border-white/10 text-[0.62rem] uppercase tracking-[0.12em] text-slate-400"><tr><th className="p-4">Status</th><th className="p-4">Reason</th><th className="p-4">Feedback preview</th><th className="p-4">Source</th><th className="p-4">Package</th><th className="p-4">Funnel</th><th className="p-4">Date</th><th className="p-4">Action</th></tr></thead><tbody>{items.map((item) => <tr className="border-b border-white/8 last:border-0" key={item.id}><td className="p-4"><StatusBadge status={item.status} /></td><td className="p-4 text-sm font-bold text-slate-900">{getExitReasonLabel(item.reasonId)}</td><td className="max-w-xs p-4 text-sm font-medium text-slate-500">{item.feedbackPreview || 'No written feedback'}</td><td className="p-4 text-xs font-bold text-slate-500">{sourceLabels[item.source]}</td><td className="p-4 text-xs font-bold text-slate-500">{item.selectedPackageId ?? '—'}</td><td className="p-4 text-xs font-bold text-slate-500">{item.funnelStage} · {item.lastSection}</td><td className="p-4 text-xs font-bold text-slate-500">{formatDate(item.createdAt)}</td><td className="p-4"><button type="button" onClick={() => setSelectedId(item.id)} className="admin-link-button">View</button></td></tr>)}</tbody></table></div><div className="grid gap-3 p-4 lg:hidden">{items.map((item) => <article className="rounded-2xl border border-white/10 bg-black/[0.12] p-4" key={item.id}><div className="flex items-center justify-between gap-3"><StatusBadge status={item.status} /><time className="text-xs font-bold text-slate-400">{formatDate(item.createdAt)}</time></div><h3 className="mt-3 text-sm font-black text-slate-950">{getExitReasonLabel(item.reasonId)}</h3><p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-slate-500">{item.feedbackPreview || 'No additional written feedback was provided.'}</p><div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs font-bold text-slate-400">{sourceLabels[item.source]}</span><button type="button" onClick={() => setSelectedId(item.id)} className="admin-link-button">View feedback</button></div></article>)}</div></> : null}
        {!loading && !error && items.length ? <footer className="flex items-center justify-between gap-3 border-t border-white/10 p-4"><p className="text-xs font-bold text-slate-500">Page {filters.page} of {totalPages} · {total} results</p><div className="flex gap-2"><button type="button" disabled={(filters.page ?? 1) <= 1} onClick={() => setFilter({ page: (filters.page ?? 1) - 1 })} className="admin-link-button disabled:opacity-40"><ChevronLeft className="size-4" /> Previous</button><button type="button" disabled={(filters.page ?? 1) >= totalPages} onClick={() => setFilter({ page: (filters.page ?? 1) + 1 })} className="admin-link-button disabled:opacity-40">Next <ChevronRight className="size-4" /></button></div></footer> : null}
      </section>
      {selectedId && !detail && !detailError ? <div className="fixed inset-0 z-[110] grid place-items-center bg-black/65 p-6"><LoaderCircle className="size-8 animate-spin text-white" /></div> : null}
      {selectedId && detailError ? <div className="fixed inset-0 z-[110] grid place-items-center bg-black/65 p-6"><div className="rounded-2xl bg-white p-6 text-center"><p className="text-sm font-bold text-slate-800">{detailError}</p><button type="button" onClick={() => setSelectedId(null)} className="mt-4 admin-link-button">Close</button></div></div> : null}
      {detail ? <FeedbackDetail key={detail.id} feedback={detail} saving={saving} error={detailError} onClose={() => { setSelectedId(null); setDetail(null) }} onUpdate={updateDetail} /> : null}
    </div>
  )
}
