import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import productStation from '@/assets/duravolt-power-station-sticker.png'
import { Button } from '@/components/ui/Button'
import { RatingStars } from '@/components/ui/RatingStars'
import { SITE_CONFIG } from '@/constants/site'
import { useCheckoutEngine } from '@/features/checkout/hooks/useCheckoutEngine'

import styles from './LandingHero.module.css'

type HeroCopyProps = {
  mobile?: boolean
}

const floatingCtaCaptions = ['buy product now', '₦150,000 only!!!'] as const

export function HeroCopy({ mobile = false }: HeroCopyProps) {
  const [hideFloatingBuy, setHideFloatingBuy] = useState(false)
  const [floatingCtaCaptionIndex, setFloatingCtaCaptionIndex] = useState(0)
  const [heroSoldCount, setHeroSoldCount] = useState(0)
  const { openPopup, popupOpen } = useCheckoutEngine()
  const sectionClass = mobile
    ? 'relative flex w-full items-start justify-center px-7 pb-32 pt-9 md:pb-14'
    : 'relative flex w-1/2 items-center justify-center px-16 py-20 pl-[72px]'
  const eyebrowMargin = mobile ? 'mb-6' : 'mb-9'
  const headingFirstLine = mobile ? 'text-[clamp(2.55rem,10.5vw,3.7rem)]' : 'text-[clamp(2.9rem,4.7vw,4.8rem)]'
  const headingSecondLine = mobile ? 'text-[clamp(2.2rem,9vw,3.3rem)]' : 'text-[clamp(2.55rem,4.1vw,4rem)]'
  const dividerMargin = mobile ? 'my-6' : 'my-8'
  const paragraphMargin = mobile ? 'mb-9' : 'mb-12'

  useEffect(() => {
    if (!mobile) {
      return undefined
    }

    const inlineCheckoutSection = document.querySelector('[data-inline-checkout-section="true"]')
    const footer = document.querySelector('footer')
    const observedSections = [inlineCheckoutSection, footer].filter((section): section is Element => section !== null)

    if (observedSections.length === 0) {
      return undefined
    }

    const visibility = new Map<Element, boolean>()
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => visibility.set(entry.target, entry.isIntersecting))
        setHideFloatingBuy([...visibility.values()].some(Boolean))
      },
      { threshold: 0.08 },
    )

    observedSections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [mobile])

  useEffect(() => {
    const target = 2100
    const duration = 2600
    let animationFrame = 0
    let startTime: number | undefined

    const animateCount = (timestamp: number) => {
      startTime ??= timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setHeroSoldCount(Math.floor(target * progress))

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animateCount)
      }
    }

    animationFrame = window.requestAnimationFrame(animateCount)

    return () => window.cancelAnimationFrame(animationFrame)
  }, [])

  useEffect(() => {
    if (!mobile) {
      return undefined
    }

    const interval = window.setInterval(() => {
      setFloatingCtaCaptionIndex((currentIndex) => (currentIndex + 1) % floatingCtaCaptions.length)
    }, 4200)

    return () => window.clearInterval(interval)
  }, [mobile])

  return (
    <>
      <section className={sectionClass} id="formula" aria-labelledby="hero-heading">
      {!mobile ? <div className={styles.verticalRule} aria-hidden="true" /> : null}
      <div className={mobile ? 'w-full' : 'w-full max-w-[520px]'}>
        <div className={`${eyebrowMargin} flex items-center gap-2.5`}>
          <div className="h-px w-7 bg-mint-400" aria-hidden="true" />
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-mint-400">
            Solar backup power
          </p>
        </div>

        <h1 id="hero-heading" className="m-0 p-0 font-serif font-normal leading-[1.08]">
          <span className={`${headingFirstLine} block text-stone-100`}>Everybody Is Switching to Solar,</span>
          <span className={`${headingSecondLine} block italic text-gold-500`}>Even Aso Rock. What Are You Waiting For?</span>
        </h1>

        <div className={`${styles.heroDivider} ${dividerMargin}`} aria-hidden="true" />

        <p className={`${paragraphMargin} max-w-[440px] text-[1.08rem] font-medium leading-8 text-black sm:text-[1.16rem]`}>
          Reliable backup power without fuel, noise, or NEPA wahala. Stay powered with the DuraVolt DSPP-150 Portable
          Solar Generator.
        </p>

        <div className={styles.heroSalesProof} aria-label={`${heroSoldCount.toLocaleString()} Solar Generator units sold`}>
          <strong>{heroSoldCount.toLocaleString()}+</strong>
          <span>Join over 2,100 customers already enjoying dependable 150W solar backup—secure yours before the next batch sells out.</span>
        </div>

        <div className={`${styles.heroPriceActions} mt-5 ${mobile ? 'hidden md:flex' : ''}`}>
          <Button className="w-auto" onClick={() => openPopup(undefined, { section: 'hero' })} aria-label={`Buy ${SITE_CONFIG.productName}`}>
            150,000 naira
          </Button>
          <div className={styles.heroNormalPrice} aria-label="Normal price ₦190,000">
            <span>Normal price</span>
            <strong>₦190,000</strong>
          </div>
        </div>

        <div className="mt-7">
          <RatingStars rating={4.9} reviewCount="2,400+" />
        </div>
      </div>

      </section>

      {mobile && typeof document !== 'undefined'
        ? createPortal(
        <div
          className={`mobile-buy-cta fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pb-[env(safe-area-inset-bottom)] transition duration-300 md:hidden ${
            hideFloatingBuy || popupOpen ? 'pointer-events-none translate-y-6 opacity-0' : 'translate-y-0 opacity-100'
          }`}
        >
          <Button
            className="min-h-[68px] w-full max-w-[380px] px-7 pl-[70px] text-[1.05rem] font-black uppercase tracking-[0.08em] shadow-[inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-5px_0_rgba(0,0,0,0.24),0_0_0_4px_rgba(18,104,230,0.34),0_20px_54px_rgba(18,104,230,0.46),0_8px_20px_rgba(0,0,0,0.45)]"
            onClick={() => openPopup(undefined, { section: 'hero' })}
            aria-label={`Buy ${SITE_CONFIG.productName}`}
          >
            <img
              src={productStation}
              alt=""
              className="brand-sticker-shake absolute left-1 size-18 object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.32)]"
              aria-hidden="true"
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={floatingCtaCaptions[floatingCtaCaptionIndex]}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                {floatingCtaCaptions[floatingCtaCaptionIndex]}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>
          ,
          document.body,
        )
        : null}
    </>
  )
}
