import { motion, useInView } from 'framer-motion'
import { useEffect, useRef } from 'react'

import essentialPowerCard from '@/assets/solar-gen-essential-power-card.jpeg'
import actionVideo from '@/assets/solar-gen-see-in-action.mp4'

const actionCards = [
  {
    videoSrc: actionVideo,
    title: 'Reliable power in action',
    description: 'See how the Solar Generator keeps essential devices ready when power is unavailable.',
  },
] as const

export function SeeInActionSection() {
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([])
  const headerCardRef = useRef<HTMLButtonElement | null>(null)
  const headerCardIsInView = useInView(headerCardRef, { once: true, amount: 0.35 })

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement

          if (entry.isIntersecting) {
            video.play().catch(() => undefined)
            return
          }

          video.pause()
        })
      },
      { threshold: 0.45 },
    )

    videoRefs.current.forEach((video) => {
      if (video) {
        observer.observe(video)
      }
    })

    return () => observer.disconnect()
  }, [])

  return (
    <section
      className="solar-panel-surface solar-panel-surface--left relative overflow-hidden bg-linear-to-b from-ink-950 via-[#11100e] to-earth-950 px-3 py-16 text-stone-100 md:px-8 md:py-20 lg:px-10 lg:py-24"
      aria-labelledby="see-in-action-heading"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.14),transparent_68%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_right,rgba(52,211,153,0.08),transparent_62%)]" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl">
        <h2 id="see-in-action-heading" className="sr-only">
          Solar Generator essential power guide
        </h2>
        <motion.button
          ref={headerCardRef}
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('checkout:open', { detail: { section: 'demo' } }))}
          aria-label="Order Solar Generator for ₦150,000"
          initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
          animate={headerCardIsInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -5, scale: 1.012 }}
          whileTap={{ scale: 0.985 }}
          className="group mx-auto mb-9 block w-full max-w-[720px] overflow-hidden rounded-[30px] border-2 border-white/80 bg-white shadow-[0_24px_60px_rgba(10,53,112,0.36),inset_0_1px_0_rgba(255,255,255,0.95)] outline-none transition focus-visible:ring-4 focus-visible:ring-[#58a4ff] focus-visible:ring-offset-4 focus-visible:ring-offset-[#11100e] md:mb-12"
        >
          <img
            src={essentialPowerCard}
            alt="Solar Generator 150W essential power guide showing supported appliances and ₦150,000 price"
            className="block h-auto w-full transition duration-300 group-hover:brightness-[1.04]"
          />
        </motion.button>

        <div className="grid grid-cols-1 justify-items-center gap-9">
          {actionCards.map((card, index) => (
            <article
              className="w-[calc(100vw-24px)] max-w-[430px] overflow-hidden rounded-[26px] border border-gold-500/15 bg-[#171513] p-2.5 text-white shadow-[0_34px_90px_rgba(0,0,0,0.62),0_18px_54px_rgba(245,158,11,0.16),inset_0_1px_0_rgba(255,255,255,0.05)] md:w-full md:max-w-[640px] md:p-3"
              key={card.videoSrc}
            >
              <div className="overflow-hidden rounded-[18px] border border-white/5 bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                <video
                  ref={(element) => {
                    videoRefs.current[index] = element
                  }}
                  className="block aspect-[9/16] w-full bg-black object-contain md:aspect-[4/5]"
                  playsInline
                  loop
                  preload="metadata"
                  controls
                >
                  <source src={card.videoSrc} type="video/mp4" />
                </video>
              </div>

              <div className="px-6 pb-5 pt-6 text-center md:px-8 md:pb-7">
                <h3 className="font-sans text-lg font-bold tracking-[0.01em] text-stone-100 md:text-xl">{card.title}</h3>
                <p className="mx-auto mt-4 max-w-[440px] text-base font-semibold leading-7 text-black md:text-lg md:leading-8">
                  {card.description}
                </p>
                <button
                  className="mx-auto mt-7 inline-flex items-center justify-center rounded-full border-2 border-ink-950/35 bg-linear-to-br from-[#4d96ff] to-gold-600 px-7 py-3 text-sm font-black uppercase tracking-[0.1em] text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.42),inset_0_-4px_0_rgba(0,0,0,0.22),0_0_0_3px_rgba(18,104,230,0.28),0_12px_34px_rgba(18,104,230,0.32)] outline outline-1 outline-offset-4 outline-gold-500/35 transition hover:-translate-y-0.5 hover:bg-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-4 focus:ring-offset-[#171513]"
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('checkout:open', { detail: { section: 'demo' } }))}
                  aria-label={`Buy now: ${card.title}`}
                >
                  Buy now
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

