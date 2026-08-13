import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

import { usePlatformBranding } from '@/features/platform/platformBrandingContext'

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

/** A brief in-app launch moment for the installed admin PWA. Native OS splash
 * screens cannot safely render arbitrary video, so this appears immediately
 * after the application shell starts and never runs on normal public browsing. */
export function AdminPwaLaunchSplash() {
  const { platformName, platformLogoUrl } = usePlatformBranding()
  const [visible, setVisible] = useState(() => typeof window !== 'undefined' && isStandalone())

  useEffect(() => {
    if (!visible) return
    const timeout = window.setTimeout(() => setVisible(false), 1800)
    return () => window.clearTimeout(timeout)
  }, [visible])

  return <AnimatePresence>
    {visible ? <motion.div className="fixed inset-0 z-[200] overflow-hidden bg-[#06172c]" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.38 }} aria-label={`${platformName} is loading`}>
      <video className="absolute inset-0 size-full object-cover" autoPlay muted loop playsInline preload="auto" aria-hidden="true">
        <source src="/admin/cloudecom-admin-background.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,12,28,0.5),rgba(2,12,28,0.74))]" aria-hidden="true" />
      <div className="relative grid h-full place-items-center p-7 text-center">
        <motion.div className="grid justify-items-center" animate={{ y: [0, -11, 0], scale: [1, 1.025, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
          <span className="grid size-28 place-items-center overflow-hidden rounded-[30px] border border-white/45 bg-white/85 p-2 shadow-[0_22px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <img src={platformLogoUrl ?? '/branding/cloudecom-logo.jpeg'} alt={`${platformName} logo`} className="size-full object-contain" />
          </span>
          <p className="mt-6 text-[0.7rem] font-black uppercase tracking-[0.28em] text-white/80">{platformName}</p>
          <p className="mt-2 text-sm font-bold text-white/95">Secure operations workspace</p>
        </motion.div>
      </div>
    </motion.div> : null}
  </AnimatePresence>
}
