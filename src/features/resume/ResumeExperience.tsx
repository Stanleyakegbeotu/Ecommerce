import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Clock3, RotateCcw, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useCheckoutEngine } from '@/features/checkout/hooks/useCheckoutEngine'
import { clearResumeProgress } from '@/features/resume/sessionMemory'
import { useLandingProgressMemory } from '@/features/resume/useLandingProgressMemory'

const sectionLabels: Record<string, string> = {
  hero: 'the beginning',
  proof: 'the product details',
  demo: 'the live product view',
  reviews: 'customer reviews',
  packages: 'package options',
  benefits: 'why Solar Generator fits your needs',
  gallery: 'the product gallery',
  about: 'product information',
  order: 'your order',
  faq: 'frequently asked questions',
}

export function ResumeExperience() {
  const { resetOrder } = useCheckoutEngine()
  const { hasSavedProgress, savedProgress, scrollToSavedSection } = useLandingProgressMemory()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!hasSavedProgress) {
      return undefined
    }

    const timer = window.setTimeout(() => setVisible(true), 900)
    return () => window.clearTimeout(timer)
  }, [hasSavedProgress])

  if (!savedProgress) {
    return null
  }

  const sectionLabel = sectionLabels[savedProgress.lastSection] ?? 'where you stopped'

  return (
    <AnimatePresence>
      {visible ? (
        <motion.aside
          className="resume-experience fixed bottom-5 left-4 z-[45] w-[min(420px,calc(100vw-2rem))] rounded-[24px] border p-4 shadow-[0_22px_60px_rgba(8,48,96,0.22)] sm:left-6 sm:bottom-6 sm:p-5"
          initial={{ opacity: 0, y: 22, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 290, damping: 26 }}
          aria-label="Resume your visit"
        >
          <button type="button" onClick={() => setVisible(false)} className="resume-dismiss" aria-label="Keep browsing">
            <X className="size-4" aria-hidden="true" />
          </button>
          <div className="flex items-start gap-3 pr-8">
            <span className="resume-icon"><Clock3 className="size-4" aria-hidden="true" /></span>
            <div>
              <p className="text-[0.64rem] font-black uppercase tracking-[0.15em] text-[#1268e6]">Welcome back</p>
              <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-[#102a56]">Continue where you stopped?</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#55708e]">We saved your place near {sectionLabel}. Your order has not been submitted.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <button type="button" onClick={() => { setVisible(false); scrollToSavedSection() }} className="resume-continue">
              Continue <ArrowRight className="size-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => { clearResumeProgress(); resetOrder(); setVisible(false) }} className="resume-fresh">
              <RotateCcw className="size-3.5" aria-hidden="true" /> Start fresh
            </button>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}
