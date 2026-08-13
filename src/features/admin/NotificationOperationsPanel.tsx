import { Clock3, LoaderCircle, MailCheck, RefreshCw, Save, Send, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'

import { loadNotificationOperations, retryNotificationDigest, saveNotificationSchedule, sendSmtpConfigurationTest, type NotificationOperations } from '@/features/admin/notificationOperationsService'

export function NotificationOperationsPanel() {
  const [operations, setOperations] = useState<NotificationOperations | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try { setOperations(await loadNotificationOperations()); setMessage('') } catch { setMessage('Notification operations are currently unavailable.') } finally { setLoading(false) }
  }
  useEffect(() => {
    let active = true
    void loadNotificationOperations().then((result) => {
      if (!active) return
      setOperations(result)
      setMessage('')
    }).catch(() => {
      if (active) setMessage('Notification operations are currently unavailable.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const save = async () => {
    if (!operations) return
    setSaving(true)
    try { await saveNotificationSchedule({ enabled: operations.settings.enabled, digestHour: operations.settings.digest_hour, digestMinute: operations.settings.digest_minute }); setMessage('Lagos digest schedule saved.'); await refresh() } catch { setMessage('Could not save the notification schedule.') } finally { setSaving(false) }
  }
  const test = async () => {
    setSaving(true)
    try { await sendSmtpConfigurationTest(); setMessage('SMTP diagnostic accepted. Confirm delivery in the configured administrator inbox.'); await refresh() } catch { setMessage('SMTP diagnostic failed. Check server-only Gmail settings.') } finally { setSaving(false) }
  }

  return <section className="admin-settings-panel rounded-[30px] border p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Operations · Email</p><h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">Daily digest delivery</h3><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">Orders and feedback remain separate Lagos-date digests. Customer orders are always saved independently of email.</p></div>{operations?.isOwner ? <button type="button" className="admin-primary-action disabled:opacity-50" disabled={saving || loading} onClick={() => void save()}><Save className="size-4" /> Save schedule</button> : null}</div>
    {message ? <p role="status" className="mt-4 rounded-xl bg-slate-100 p-3 text-sm font-bold text-slate-700">{message}</p> : null}
    {loading ? <p className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-500"><LoaderCircle className="size-4 animate-spin" /> Loading email operations…</p> : operations ? <div className="mt-6 grid gap-4 xl:grid-cols-2"><div className="grid content-start gap-3"><article className={`rounded-2xl border p-4 ${operations.smtpConfigured ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-center gap-2 font-black text-slate-900">{operations.smtpConfigured ? <MailCheck className="size-5 text-emerald-600" /> : <ShieldAlert className="size-5 text-amber-600" />}{operations.smtpConfigured ? 'SMTP secrets configured' : 'SMTP credentials not configured'}</div><p className="mt-2 text-xs font-semibold leading-5 text-slate-600">Credentials and recipient values are never displayed in the browser.</p></article><article className={`rounded-2xl border p-4 ${operations.schedulerConfigured ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-center gap-2 font-black text-slate-900"><Clock3 className="size-5 text-blue-600" />{operations.schedulerConfigured ? 'Scheduler secret configured' : 'Scheduler secret not configured'}</div><p className="mt-2 text-xs font-semibold leading-5 text-slate-600">A trusted server scheduler must invoke the digest processor; browser sessions never send digests.</p></article>{operations.isOwner ? <><label className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 text-sm font-bold text-slate-900">Enable daily digests<input type="checkbox" checked={operations.settings.enabled} onChange={(event) => setOperations((current) => current ? { ...current, settings: { ...current.settings, enabled: event.target.checked } } : current)} className="size-4 accent-blue-600" /></label><div className="grid grid-cols-2 gap-3"><label className="admin-field-label">Hour<select value={operations.settings.digest_hour} onChange={(event) => setOperations((current) => current ? { ...current, settings: { ...current.settings, digest_hour: Number(event.target.value) } } : current)} className="admin-input mt-2">{Array.from({ length: 24 }, (_, hour) => <option value={hour} key={hour}>{String(hour).padStart(2, '0')}</option>)}</select></label><label className="admin-field-label">Minute<select value={operations.settings.digest_minute} onChange={(event) => setOperations((current) => current ? { ...current, settings: { ...current.settings, digest_minute: Number(event.target.value) } } : current)} className="admin-input mt-2">{[0, 15, 30, 45].map((minute) => <option value={minute} key={minute}>{String(minute).padStart(2, '0')}</option>)}</select></label></div><button type="button" disabled={!operations.smtpConfigured || saving} onClick={() => void test()} className="admin-small-button disabled:opacity-50"><Send className="size-4" /> Send owner SMTP test</button></> : null}</div><div className="grid content-start gap-3"><div className="rounded-2xl border border-slate-200 p-4"><b className="text-sm text-slate-900">Latest digest jobs</b><div className="mt-3 grid gap-2">{operations.jobs.length ? operations.jobs.map((job) => <div key={job.id} className="rounded-xl bg-slate-50 p-3 text-xs"><div className="flex items-center justify-between gap-3"><b className="text-slate-900">{job.digest_type} · {job.digest_date}</b><span className="text-slate-500">{job.status}</span></div><p className="mt-1 text-slate-500">Attempts: {job.attempt_count}{job.last_error ? ` · ${job.last_error}` : ''}</p>{job.status === 'failed' ? <button type="button" onClick={() => { void retryNotificationDigest(job.id).then(() => { setMessage('Digest retry queued.'); return refresh() }).catch(() => setMessage('Digest retry could not be queued.')) }} className="admin-small-button mt-2"><RefreshCw className="size-4" /> Retry safely</button> : null}</div>) : <p className="text-sm font-semibold text-slate-500">No digest jobs yet.</p>}</div></div><div className="rounded-2xl border border-slate-200 p-4"><b className="text-sm text-slate-900">SMTP diagnostics</b><div className="mt-2 grid gap-2">{operations.diagnostics.length ? operations.diagnostics.map((item, index) => <p className="rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600" key={`${item.created_at}:${index}`}>{item.status === 'sent' ? 'SMTP test accepted' : 'SMTP test failed'} · {new Date(item.created_at).toLocaleString()}{item.error_code ? ` · ${item.error_code}` : ''}</p>) : <p className="text-sm font-semibold text-slate-500">No SMTP diagnostics have run.</p>}</div></div></div></div> : null}
  </section>
}
