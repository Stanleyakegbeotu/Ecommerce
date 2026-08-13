import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

import { SITE_CONFIG } from '@/constants/site'
import { useCheckoutEngine } from '@/features/checkout/hooks/useCheckoutEngine'

const captionRotationMs = 4200
const minimumBottlesLeft = 10
const maximumBottlesLeft = 50

const buyNowCaptions = ['Buy Now', '₦150,000', 'units-left', 'Promo ends in 2 days'] as const
const cloudecomLogoSymbol = `${import.meta.env.BASE_URL}icons/cloudecom-192.png`

export function Navbar() {
  const [captionIndex, setCaptionIndex] = useState(0)
  const [bottlesLeft, setBottlesLeft] = useState(maximumBottlesLeft)
  const logoTapTimes = useRef<number[]>([])
  const { openPopup } = useCheckoutEngine()

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCaptionIndex((currentIndex) => {
        const nextIndex = (currentIndex + 1) % buyNowCaptions.length

        if (buyNowCaptions[nextIndex] === 'units-left') {
          setBottlesLeft((currentBottlesLeft) =>
            currentBottlesLeft <= minimumBottlesLeft ? maximumBottlesLeft : currentBottlesLeft - 1,
          )
        }

        return nextIndex
      })
    }, captionRotationMs)

    return () => window.clearInterval(interval)
  }, [])

  const activeCaption =
    buyNowCaptions[captionIndex] === 'units-left' ? `Only ${bottlesLeft} units left` : buyNowCaptions[captionIndex]

  const handleLogoTap = () => {
    const now = Date.now()
    logoTapTimes.current = [...logoTapTimes.current.filter((time) => now - time <= 5000), now]

    if (logoTapTimes.current.length >= 10) {
      logoTapTimes.current = []
      window.dispatchEvent(new CustomEvent('admin:request'))
    }
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[#d8e3f2] bg-white/95 shadow-[0_4px_18px_rgba(16,42,86,0.08)] backdrop-blur-xl">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-mint-400 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-ink-950"
      >
        Skip to content
      </a>
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <button
          type="button"
          onClick={handleLogoTap}
          className="flex items-center gap-2.5 font-serif text-lg text-[#102a56]"
          aria-label={`${SITE_CONFIG.name} logo`}
        >
          <img
            src={cloudecomLogoSymbol}
            alt=""
            className="size-12 shrink-0 rounded-xl object-contain sm:size-13"
            aria-hidden="true"
          />
          <span className="hidden min-[430px]:inline">{SITE_CONFIG.name}</span>
        </button>
        <div className="flex items-center">
          <motion.button
            aria-label="Buy now for Duravolt DSPP-150"
            className="relative inline-flex h-11 min-w-[184px] items-center justify-center overflow-hidden rounded-full border border-ink-950/35 bg-linear-to-br from-[#4d96ff] via-gold-500 to-gold-600 px-4 text-center text-[0.82rem] font-black uppercase tracking-normal text-white shadow-[0_10px_28px_rgba(18,104,230,0.32),inset_0_1px_0_rgba(255,255,255,0.48),inset_0_-3px_0_rgba(0,0,0,0.18)] transition focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-ink-950 sm:min-w-[196px] sm:px-6 sm:text-[0.84rem] sm:tracking-[0.06em]"
            onClick={() => openPopup(undefined, { section: 'header' })}
            type="button"
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={activeCaption}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                className="block whitespace-nowrap"
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                {activeCaption}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </nav>
    </header>
  )
}
