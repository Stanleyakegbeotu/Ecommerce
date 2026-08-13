import { Copy, ExternalLink, ImageUp, PackageCheck, Save } from 'lucide-react'
import { useEffect, useState } from 'react'

import { listManagedProducts, loadPlatformBranding, savePlatformName, uploadPlatformLogo, type ManagedProduct } from '@/features/admin/platformManagementService'

function productPath(product: ManagedProduct) {
  return `/products/${product.slug}`
}

export function PlatformSettingsPanel() {
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void loadPlatformBranding().then((branding) => { setName(branding.platformName); setLogoUrl(branding.platformLogoUrl) }).catch(() => setMessage('Unable to load platform branding.'))
  }, [])

  const saveName = async () => {
    setSaving(true); setMessage('')
    try { const branding = await savePlatformName(name); setName(branding.platformName); setLogoUrl(branding.platformLogoUrl); window.dispatchEvent(new Event('platform:branding-changed')); setMessage('Platform name saved.') } catch { setMessage('Unable to save platform name.') } finally { setSaving(false) }
  }
  const replaceLogo = async (file: File | undefined) => {
    if (!file) return
    setSaving(true); setMessage('')
    try { const result = await uploadPlatformLogo(file); setLogoUrl(result.platformLogoUrl); window.dispatchEvent(new Event('platform:branding-changed')); setMessage('Platform logo replaced.') } catch { setMessage('Use a PNG, WebP, or JPEG logo smaller than 512 KB.') } finally { setSaving(false) }
  }

  return <section className="admin-settings-panel rounded-[30px] border p-5 sm:p-6"><p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-blue-700">Platform settings</p><h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">Identity and branding</h3><div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto]"><label className="admin-field-label">Platform / App Name<input value={name} onChange={(event) => setName(event.target.value.slice(0, 100))} className="admin-input mt-2" maxLength={100} /></label><div className="flex items-end gap-3"><button type="button" disabled={saving || !name.trim()} onClick={() => void saveName()} className="admin-primary-action disabled:opacity-50"><Save className="size-4" /> Save platform name</button></div></div><div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 p-4"><div className="grid size-16 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-slate-400">{logoUrl ? <img src={logoUrl} alt="Current platform logo" className="size-full object-contain" /> : <ImageUp className="size-6" />}</div><label className="admin-link-button cursor-pointer"><ImageUp className="size-4" /> Replace logo<input type="file" accept="image/png,image/webp,image/jpeg" className="sr-only" onChange={(event) => void replaceLogo(event.target.files?.[0])} /></label><p className="text-xs font-semibold leading-5 text-slate-500">PNG, WebP, or JPEG. Maximum 512 KB. The prior logo is removed only after the replacement is saved.</p></div>{message ? <p className="mt-4 text-sm font-bold text-slate-600" role="status">{message}</p> : null}</section>
}

export function ProductsPage() {
  const [products, setProducts] = useState<ManagedProduct[]>([])
  const [message, setMessage] = useState('')
  useEffect(() => { void listManagedProducts().then(({ products: entries }) => setProducts(entries)).catch(() => setMessage('Unable to load products.')) }, [])
  const copyLink = async (product: ManagedProduct) => {
    try { await navigator.clipboard.writeText(`${window.location.origin}${productPath(product)}`); setMessage(`${product.name} link copied.`) } catch { setMessage('Copy is unavailable in this browser.') }
  }
  return <div className="grid gap-6"><section className="admin-settings-hero relative overflow-hidden rounded-[32px] border p-5 sm:p-7"><div className="relative"><p className="text-[0.66rem] font-black uppercase tracking-[0.19em] text-blue-700">Products</p><h2 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.045em] text-slate-950">Customer-facing product pages</h2><p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-slate-600">Each active product has its own stable public route and safe preview routes.</p></div></section>{message ? <p className="text-sm font-bold text-slate-600" role="status">{message}</p> : null}<section className="admin-settings-panel overflow-hidden rounded-[30px] border"><div className="divide-y divide-slate-200">{products.map((product) => <article key={product.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><div className="flex items-center gap-2"><PackageCheck className="size-5 text-blue-700" /><h3 className="font-black text-slate-950">{product.name}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[0.65rem] font-black uppercase text-slate-600">{product.status}</span></div><p className="mt-2 text-sm font-semibold text-slate-500">/{productPath(product).replace(/^\//, '')}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => window.open(productPath(product), '_blank', 'noopener,noreferrer')} className="admin-small-button"><ExternalLink className="size-4" /> Preview Landing Page</button><button type="button" onClick={() => window.open(`${productPath(product)}/thank-you?preview=1`, '_blank', 'noopener,noreferrer')} className="admin-small-button">Preview Thank You Page</button>{product.status === 'active' ? <button type="button" onClick={() => void copyLink(product)} className="admin-small-button"><Copy className="size-4" /> Copy Product Link</button> : null}</div></article>)}</div></section></div>
}
