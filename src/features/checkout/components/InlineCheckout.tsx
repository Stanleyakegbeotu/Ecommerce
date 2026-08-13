import { AnimatePresence, motion } from 'framer-motion'
import { CreditCard, ShieldCheck, Truck } from 'lucide-react'

import solarPanelBackground from '@/assets/solar-panel-site-background.jpeg'
import { CheckoutForm } from '@/features/checkout/components/CheckoutForm'
import { SuccessScreen } from '@/features/checkout/components/SuccessScreen'
import { useCheckoutEngine } from '@/features/checkout/hooks/useCheckoutEngine'

export function InlineCheckout() {
  const { inlineView, requestInlineAvailability } = useCheckoutEngine()

  return (
    <section
      id="order"
      data-inline-checkout-section="true"
      className="solar-panel-surface solar-panel-surface--bottom-left relative isolate overflow-hidden bg-[#f4f8ff] px-4 py-16 text-[#102a56] sm:px-6 md:py-24 lg:px-8 lg:py-28"
      aria-labelledby="inline-checkout-heading"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(18,104,230,0.16),transparent_30%),radial-gradient(circle_at_84%_18%,rgba(97,165,255,0.12),transparent_26%),linear-gradient(180deg,#ffffff_0%,#eef6ff_52%,#f8fbff_100%)]" />
      <div className="relative mx-auto mb-8 max-w-3xl text-center md:mb-10">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#1268e6]">Secure your Solar Generator</p>
        <h2 className="mt-3 font-serif text-4xl font-normal leading-none tracking-normal text-[#102a56] sm:text-5xl">
          Ready to place your order?
        </h2>
      </div>
      <motion.div
        className="relative mx-auto max-w-xl lg:max-w-7xl"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.18 }}
        transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="order-solar-texture pointer-events-none absolute inset-0 opacity-[0.13]" style={{ backgroundImage: `url(${solarPanelBackground})`, backgroundPosition: 'right bottom', backgroundRepeat: 'no-repeat', backgroundSize: 'min(760px, 76%) auto' }} aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.92)_40%,rgba(244,250,255,0.62)_72%,rgba(255,255,255,0.36)_100%)]" aria-hidden="true" />

        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-start lg:gap-10 xl:gap-12">
          <aside className="hidden md:block lg:sticky lg:top-24">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl border border-[#1268e6]/20 bg-white/80 text-[#1268e6] shadow-[0_8px_18px_rgba(18,104,230,0.1)]">
                <Truck className="size-5" aria-hidden="true" />
              </span>
              <span className="grid size-11 place-items-center rounded-2xl border border-[#16a34a]/20 bg-white/80 text-[#168b46] shadow-[0_8px_18px_rgba(22,163,74,0.09)]">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-6 text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#1268e6]">Simple, secure ordering</p>
            <h2 id="inline-checkout-heading" className="mt-3 max-w-md font-serif text-5xl font-normal leading-[0.92] tracking-normal text-[#102a56] sm:text-6xl">
              Order with<br />
              confidence<span className="text-[#1268e6]">.</span>
            </h2>
            <p className="mt-5 max-w-md text-base font-medium leading-7 text-[#355b83] lg:text-lg lg:leading-8">
              Choose your offer, add your delivery details, then review everything before confirming. No payment is taken online.
            </p>

            <div className="mt-7 grid max-w-md gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="flex items-center gap-3 rounded-2xl border border-[#cfe2f4] bg-white/80 p-4 shadow-[0_10px_22px_rgba(18,104,230,0.08)]">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#1268e6]/10 text-[#1268e6]"><CreditCard className="size-4" aria-hidden="true" /></span>
                <div><p className="text-sm font-black text-[#102a56]">Pay on Delivery</p><p className="mt-0.5 text-xs font-semibold text-[#587493]">No upfront payment</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-[#cfe2f4] bg-white/80 p-4 shadow-[0_10px_22px_rgba(18,104,230,0.08)]">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#16a34a]/10 text-[#168b46]"><ShieldCheck className="size-4" aria-hidden="true" /></span>
                <div><p className="text-sm font-black text-[#102a56]">1-Year Warranty</p><p className="mt-0.5 text-xs font-semibold text-[#587493]">Quality you can trust</p></div>
              </div>
            </div>
          </aside>

          <div>
            {inlineView === 'success' ? null : <CheckoutForm variant="inline" onSubmit={requestInlineAvailability} />}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {inlineView === 'success' ? (
          <motion.div animate={{ opacity: 1 }} className="fixed inset-0 z-50 grid place-items-center bg-black/66 p-3 backdrop-blur-xl" exit={{ opacity: 0 }} initial={{ opacity: 0 }}>
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="max-h-[calc(100svh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-[34px] border border-white/14 bg-white/[0.08] p-4 shadow-[0_34px_120px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl sm:p-5"
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            >
              <SuccessScreen context="inline" />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
