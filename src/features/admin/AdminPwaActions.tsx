import { Download, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

type DeferredInstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

export function AdminPwaActions() {
  const [installPrompt, setInstallPrompt] = useState<DeferredInstallPrompt | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [showIosGuidance, setShowIosGuidance] = useState(false)

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as DeferredInstallPrompt)
    }
    const onUpdate = () => setUpdateAvailable(true)
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('pwa:update-available', onUpdate)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('pwa:update-available', onUpdate)
    }
  }, [])

  if (isStandalone()) return null

  const install = async () => {
    if (!installPrompt) {
      setShowIosGuidance(true)
      return
    }
    await installPrompt.prompt()
    setInstallPrompt(null)
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => void install()} className="hidden items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-black text-stone-300 lg:inline-flex">
        <Download className="size-4" /> Install App
      </button>
      {showIosGuidance ? <p className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-white/10 bg-[#101827] p-3 text-xs font-semibold leading-5 text-slate-200 shadow-xl">On iPhone or iPad, use Safari’s Share menu, then choose “Add to Home Screen.”</p> : null}
      {updateAvailable ? <button type="button" onClick={() => window.location.reload()} className="absolute right-0 top-12 z-50 flex w-56 items-center gap-2 rounded-xl border border-blue-300/30 bg-[#101827] p-3 text-left text-xs font-bold text-slate-100 shadow-xl"><RefreshCw className="size-4 shrink-0" /> Update available. Reload when you are ready.</button> : null}
    </div>
  )
}
