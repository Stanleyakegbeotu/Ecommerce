import { Activity, CheckCircle2, Copy, LoaderCircle, Save, Send, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'

import { extractMetaPixelId, loadMetaTracking, processMetaTrackingQueue, saveMetaTracking, testMetaCapi, type MetaAttributionSummary, type MetaDelivery, type MetaTrackingSettings } from '@/features/admin/metaTrackingAdminService'

const defaultSettings: MetaTrackingSettings = { enabled: false, pixelId: '', browserEnabled: true, pageViewEnabled: true, viewContentEnabled: true, initiateCheckoutEnabled: true, leadEnabled: true, purchaseEnabled: true, currency: 'NGN' }

function Toggle({ label, checked, onChange, detail }: { label: string; checked: boolean; onChange: (value: boolean) => void; detail?: string }) {
  return <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4"><span><b className="block text-sm text-slate-900">{label}</b>{detail ? <small className="mt-1 block text-xs leading-5 text-slate-500">{detail}</small> : null}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 size-4 accent-blue-600" /></label>
}

function deliveryStatus(delivery: MetaDelivery) {
  return delivery.sent_at ? 'Sent to Meta CAPI' : delivery.status === 'not_configured' ? 'Waiting for CAPI configuration' : delivery.status
}

export function MetaTrackingPanel() {
  const [settings, setSettings] = useState<MetaTrackingSettings>(defaultSettings)
  const [deliveries, setDeliveries] = useState<MetaDelivery[]>([])
  const [attributionSummary, setAttributionSummary] = useState<MetaAttributionSummary[]>([])
  const [capiConfigured, setCapiConfigured] = useState(false)
  const [baseCode, setBaseCode] = useState('')
  const [testEventCode, setTestEventCode] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const result = await loadMetaTracking()
      setSettings(result.settings)
      setDeliveries(result.latest)
      setAttributionSummary(result.attributionSummary)
      setCapiConfigured(result.capiConfigured)
      setMessage('')
    } catch {
      setMessage('Meta tracking is owner-only or currently unavailable.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    void loadMetaTracking().then((result) => {
      if (!active) return
      setSettings(result.settings)
      setDeliveries(result.latest)
      setAttributionSummary(result.attributionSummary)
      setCapiConfigured(result.capiConfigured)
      setMessage('')
    }).catch(() => {
      if (active) setMessage('Meta tracking is owner-only or currently unavailable.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])
  const update = <K extends keyof MetaTrackingSettings>(key: K, value: MetaTrackingSettings[K]) => setSettings((current) => ({ ...current, [key]: value }))

  const save = async () => {
    setSaving(true)
    try {
      const result = await saveMetaTracking(settings)
      setCapiConfigured(result.capiConfigured)
      setMessage('Meta tracking settings saved.')
      window.dispatchEvent(new Event('meta:tracking-changed'))
    } catch {
      setMessage('Could not save Meta tracking. Check the Pixel ID and owner access.')
    } finally {
      setSaving(false)
    }
  }

  const importBaseCode = async () => {
    try {
      const result = await extractMetaPixelId(baseCode)
      if (!result.pixelId) {
        setMessage('No single valid Meta Pixel ID was detected.')
        return
      }
      update('pixelId', result.pixelId)
      setBaseCode('')
      setMessage(`Detected Pixel ID ${result.pixelId}. Review then save it.`)
    } catch {
      setMessage('Unable to inspect that code.')
    }
  }

  const runDiagnostic = async () => {
    try {
      const result = await testMetaCapi(testEventCode)
      setTestEventCode('')
      setMessage(`Diagnostic sent with event ID ${result.eventId}. Confirm it in Meta Test Events.`)
    } catch {
      setMessage('CAPI diagnostic failed. Confirm your server secrets and temporary Test Event Code.')
    }
  }

  const processQueue = async () => {
    try {
      const result = await processMetaTrackingQueue()
      setMessage(`Processed ${result.processed} pending Meta event${result.processed === 1 ? '' : 's'}.`)
      await refresh()
    } catch {
      setMessage('Unable to process the Meta queue.')
    }
  }

  return <section className="admin-settings-panel rounded-[30px] border p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Tracking · Meta</p><h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">COD conversion measurement</h3><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">New customer requests are Leads. Purchases are created server-side only when an order is marked Paid.</p></div>
      <button type="button" onClick={() => void save()} disabled={saving || loading} className="admin-primary-action disabled:opacity-50"><Save className="size-4" /> Save Meta settings</button>
    </div>
    {message ? <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm font-bold text-slate-700" role="status">{message}</p> : null}
    {loading ? <p className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-500"><LoaderCircle className="size-4 animate-spin" /> Loading secure tracking settings…</p> : <div className="mt-6 grid gap-5 xl:grid-cols-2">
      <div className="grid gap-3">
        <Toggle label="Enable Meta tracking" checked={settings.enabled} onChange={(value) => update('enabled', value)} detail="Loads the one managed Pixel loader only on public product pages." />
        <label className="admin-field-label">Meta Pixel ID<input value={settings.pixelId} onChange={(event) => update('pixelId', event.target.value.replace(/\D/g, '').slice(0, 20))} inputMode="numeric" className="admin-input mt-2" placeholder="Numbers only" /></label>
        <label className="admin-field-label">Default currency<select value={settings.currency} onChange={(event) => update('currency', event.target.value)} className="admin-input mt-2"><option value="NGN">NGN</option></select></label>
        <Toggle label="Browser Pixel" checked={settings.browserEnabled} onChange={(value) => update('browserEnabled', value)} />
        <Toggle label="PageView" checked={settings.pageViewEnabled} onChange={(value) => update('pageViewEnabled', value)} />
        <Toggle label="ViewContent" checked={settings.viewContentEnabled} onChange={(value) => update('viewContentEnabled', value)} />
        <Toggle label="InitiateCheckout" checked={settings.initiateCheckoutEnabled} onChange={(value) => update('initiateCheckoutEnabled', value)} />
        <Toggle label="Lead after persisted order request" checked={settings.leadEnabled} onChange={(value) => update('leadEnabled', value)} />
        <Toggle label="Purchase after order is marked Paid" checked={settings.purchaseEnabled} onChange={(value) => update('purchaseEnabled', value)} detail="Server-side CAPI only; never a thank-you-page event." />
      </div>
      <div className="grid content-start gap-4">
        <article className={`rounded-2xl border p-4 ${capiConfigured ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-center gap-2 text-sm font-black text-slate-900">{capiConfigured ? <CheckCircle2 className="size-5 text-emerald-600" /> : <ShieldAlert className="size-5 text-amber-600" />}{capiConfigured ? 'Browser + server CAPI available' : 'Browser tracking only — CAPI not configured'}</div><p className="mt-2 text-xs font-semibold leading-5 text-slate-600">CAPI secrets are never shown here. Configure them only in Supabase Edge Function secrets.</p></article>
        <div className="rounded-2xl border border-slate-200 p-4"><label className="admin-field-label">Import from Meta Pixel Base Code<textarea value={baseCode} onChange={(event) => setBaseCode(event.target.value.slice(0, 20_000))} rows={5} className="admin-input mt-2" placeholder="Paste Meta’s base snippet to extract its Pixel ID. The script is never saved or executed." /></label><button type="button" onClick={() => void importBaseCode()} className="admin-small-button mt-3"><Copy className="size-4" /> Detect Pixel ID</button></div>
        <div className="rounded-2xl border border-slate-200 p-4"><label className="admin-field-label">Temporary Meta Test Event Code<input value={testEventCode} onChange={(event) => setTestEventCode(event.target.value)} className="admin-input mt-2" placeholder="Used once; not stored" /></label><button type="button" disabled={!capiConfigured || !testEventCode.trim()} onClick={() => void runDiagnostic()} className="admin-small-button mt-3 disabled:opacity-50"><Send className="size-4" /> Send diagnostic</button></div>
        <div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div><b className="text-sm text-slate-900">Server delivery queue</b><p className="mt-1 text-xs text-slate-500">CAPI retries use the same event ID, preserving deduplication.</p></div><button type="button" onClick={() => void processQueue()} className="admin-small-button"><Activity className="size-4" /> Process due</button></div><div className="mt-3 grid gap-2">{deliveries.length ? deliveries.map((delivery) => <div className="rounded-xl bg-slate-50 p-3 text-xs" key={`${delivery.event_name}:${delivery.event_id}`}><b className="text-slate-900">{delivery.event_name} · {delivery.order_id}</b><span className="ml-2 text-slate-500">{deliveryStatus(delivery)}</span><p className="mt-1 break-all text-slate-500">{delivery.event_id}{delivery.last_error ? ` · ${delivery.last_error}` : ''}</p></div>) : <p className="text-sm font-semibold text-slate-500">No Meta conversion deliveries yet.</p>}</div></div>
        <div className="rounded-2xl border border-slate-200 p-4"><b className="text-sm text-slate-900">Acquisition attribution</b><p className="mt-1 text-xs leading-5 text-slate-500">One dataset and one canonical conversion per order. This private summary compares captured traffic context without customer details.</p><div className="mt-3 grid gap-2">{attributionSummary.length ? attributionSummary.map((row, index) => <div className="rounded-xl bg-slate-50 p-3 text-xs" key={`${row.meta_ad_account_id ?? 'none'}:${row.meta_campaign_id ?? 'none'}:${row.utm_campaign ?? 'none'}:${index}`}><b className="block text-slate-900">{row.meta_ad_account_id ? `Ad account ${row.meta_ad_account_id}` : row.traffic_source}</b><p className="mt-1 text-slate-500">{row.meta_campaign_id ? `Campaign ${row.meta_campaign_id}` : row.utm_campaign ?? 'No campaign captured'}{row.meta_adset_id ? ` · Ad set ${row.meta_adset_id}` : ''}{row.meta_ad_id ? ` · Ad ${row.meta_ad_id}` : ''}</p><p className="mt-1 font-semibold text-slate-700">{row.order_requests} requests · {row.lead_events} Leads · {row.paid_sales} paid · {row.purchase_events} Purchases</p></div>) : <p className="text-sm font-semibold text-slate-500">Attribution will appear once traffic converts.</p>}</div></div>
      </div>
    </div>}
  </section>
}
