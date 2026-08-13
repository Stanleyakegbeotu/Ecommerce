import { useEffect, useState } from 'react'
import { Clock3, LoaderCircle, MailCheck, RefreshCw, Send, ShieldAlert } from 'lucide-react'

import { loadNotificationOperations, retryNotificationEvent, sendSmtpConfigurationTest, type NotificationOperations } from '@/features/admin/notificationOperationsService'

export function NotificationOperationsPanel() {
  const [operations, setOperations] = useState<NotificationOperations | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState('')

  const refresh = async () => {
    setLoading(true)
    try {
      setOperations(await loadNotificationOperations())
      setMessage('')
    } catch {
      setMessage('Notification operations are currently unavailable.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const test = async () => {
    setTesting(true)
    try {
      await sendSmtpConfigurationTest()
      setMessage('SMTP configuration test sent.')
      await refresh()
    } catch {
      setMessage('SMTP configuration test could not be sent.')
    } finally {
      setTesting(false)
    }
  }

  return <section className="admin-settings-panel rounded-[30px] border p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Operations · Email</p>
        <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">Immediate administrator alerts</h3>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">Each saved order or customer feedback record is emailed immediately. Customer data is saved first; failed delivery retries privately and never affects checkout.</p>
      </div>
      {operations?.isOwner ? <button type="button" disabled={!operations.smtpConfigured || testing} onClick={() => void test()} className="admin-primary-action disabled:opacity-50"><Send className="size-4" /> {testing ? 'Sending…' : 'Send owner SMTP test'}</button> : null}
    </div>
    {message ? <p className="mt-4 text-sm font-bold text-slate-600">{message}</p> : null}
    {loading ? <p className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-500"><LoaderCircle className="size-4 animate-spin" /> Loading email operations…</p> : operations ? <div className="mt-6 grid gap-4 xl:grid-cols-2">
      <div className="grid content-start gap-3">
        <article className={`rounded-2xl border p-4 ${operations.smtpConfigured ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-center gap-2 font-black text-slate-900">{operations.smtpConfigured ? <MailCheck className="size-5 text-emerald-600" /> : <ShieldAlert className="size-5 text-amber-600" />}{operations.smtpConfigured ? 'SMTP secrets configured' : 'SMTP credentials not configured'}</div><p className="mt-2 text-xs font-semibold leading-5 text-slate-600">Credentials and recipient values are never displayed in the browser.</p></article>
        <article className={`rounded-2xl border p-4 ${operations.schedulerConfigured ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-center gap-2 font-black text-slate-900"><Clock3 className="size-5 text-blue-600" />{operations.schedulerConfigured ? 'Retry scheduler configured' : 'Retry scheduler not configured'}</div><p className="mt-2 text-xs font-semibold leading-5 text-slate-600">The private server checks failed notifications every five minutes. Browsers never send retry emails.</p></article>
      </div>
      <div className="rounded-2xl border border-slate-200 p-4"><b className="text-sm text-slate-900">Latest notification jobs</b><div className="mt-3 grid gap-2">{operations.jobs.length ? operations.jobs.map((job) => <div key={job.id} className="rounded-xl bg-slate-50 p-3 text-xs"><div className="flex items-center justify-between gap-3"><b className="text-slate-900">{job.event_type === 'order' ? 'Order' : 'Customer feedback'}</b><span className="text-slate-500">{job.status}</span></div><p className="mt-1 text-slate-500">Attempts: {job.attempt_count}{job.last_error ? ` · ${job.last_error}` : ''}</p>{job.status === 'failed' && operations.isOwner ? <button type="button" onClick={() => { void retryNotificationEvent(job.id).then(() => { setMessage('Notification retry queued.'); return refresh() }).catch(() => setMessage('Notification retry could not be queued.')) }} className="admin-small-button mt-2"><RefreshCw className="size-4" /> Retry safely</button> : null}</div>) : <p className="text-sm font-semibold text-slate-500">No notification jobs yet.</p>}</div></div>
    </div> : null}
  </section>
}
