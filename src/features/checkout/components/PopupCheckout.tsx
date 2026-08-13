import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, X } from 'lucide-react'
import { createPortal } from 'react-dom'

import productStation from '@/assets/duravolt-power-station-sticker.png'
import { AvailabilityConfirmation } from '@/features/checkout/components/AvailabilityConfirmation'
import { CheckoutForm, MobilePackageOption } from '@/features/checkout/components/CheckoutForm'
import { PackageSelector } from '@/features/checkout/components/PackageSelector'
import { SuccessScreen } from '@/features/checkout/components/SuccessScreen'
import { useCheckoutEngine } from '@/features/checkout/hooks/useCheckoutEngine'

export function PopupCheckout() {
  const {
    availabilityTarget,
    closePopup,
    confirmAvailability,
    declineAvailability,
    packageOptions,
    popupOpen,
    popupStep,
    selectedPackageId,
    selectPackage,
    submitPopupOrder,
  } = useCheckoutEngine()

  return (
    <>
      <AnimatePresence>
        {popupOpen ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-3 text-[#102a56] backdrop-blur-xl sm:place-items-center sm:p-6 lg:p-8"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            <motion.div
              animate={{ y: 0, scale: 1, opacity: 1 }}
              className="relative flex max-h-[calc(100svh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[34px] border border-[#d8e3f2] bg-white shadow-[0_28px_90px_rgba(39,89,154,0.2),inset_0_1px_0_rgba(255,255,255,0.92)] sm:max-h-[92svh] lg:max-w-6xl lg:rounded-[42px]"
              exit={{ y: 28, scale: 0.98, opacity: 0 }}
              initial={{ y: 44, scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            >
              <img
                src={productStation}
                alt="Duravolt DSPP-150 portable solar generator"
                className="brand-sticker-shake pointer-events-none absolute right-14 top-2 z-10 hidden w-28 drop-shadow-[0_16px_30px_rgba(0,0,0,0.48)] lg:block"
                loading="lazy"
              />
              <div className="flex items-start justify-between gap-4 border-b border-[#d8e3f2] p-5 lg:p-7">
                <div className="max-w-2xl">
                  <h2 className="font-serif text-3xl font-normal leading-none tracking-normal text-[#102a56] lg:text-5xl">
                    {popupStep === 'packages' ? 'Choose Your Package' : 'Confirm Your Order'}
                  </h2>
                  <p className="mt-3 hidden max-w-xl text-base font-medium leading-7 text-[#49617f] lg:block">
                    Complete your order with free delivery, payment on delivery, and a confirmation call before dispatch.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePopup}
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-[#d8e3f2] bg-[#f8fbff] text-[#49617f]"
                  aria-label="Close checkout"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>

              <div key={popupStep} className={`min-h-0 flex-1 overflow-y-auto p-5 lg:p-7 ${popupStep === 'form' ? 'pb-28 lg:pb-7' : ''}`}>
                <AnimatePresence mode="wait">
                  {popupStep === 'packages' ? (
                    <motion.div
                      key="packages"
                      animate={{ opacity: 1, y: 0 }}
                      className="grid gap-5"
                      exit={{ opacity: 0, y: -16 }}
                      initial={{ opacity: 0, y: 18 }}
                      transition={{ duration: 0.28 }}
                    >
                      <p className="text-base font-medium leading-7 text-[#49617f]">
                        Select one bundle to continue with free delivery and payment on delivery.
                      </p>
                      <div className="grid gap-2.5 lg:hidden" role="radiogroup" aria-label="Solar Generator package">
                        {packageOptions.map((productPackage) => (
                          <MobilePackageOption
                            key={productPackage.id}
                            productPackage={productPackage}
                            selected={productPackage.id === selectedPackageId}
                            onSelect={() => selectPackage(productPackage.id, { advancePopup: true })}
                          />
                        ))}
                      </div>
                      <PackageSelector
                        compact
                        className="popup-package-selector hidden lg:grid lg:grid-cols-3"
                        packages={packageOptions}
                        selectedPackageId={selectedPackageId}
                        onSelect={(packageId) => selectPackage(packageId, { advancePopup: true })}
                      />
                    </motion.div>
                  ) : null}

                  {popupStep === 'availability' ? (
                    <div key="availability" className="w-full">
                      <AvailabilityConfirmation onConfirm={confirmAvailability} onDecline={declineAvailability} />
                    </div>
                  ) : null}

                  {popupStep === 'form' ? (
                    <motion.div key="form" animate={{ opacity: 1 }} exit={{ opacity: 0 }} initial={{ opacity: 0 }}>
                      <CheckoutForm variant="popup" onSubmit={submitPopupOrder} />
                    </motion.div>
                  ) : null}

                  {popupStep === 'success' ? (
                    <motion.div key="success" animate={{ opacity: 1 }} exit={{ opacity: 0 }} initial={{ opacity: 0 }}>
                      <SuccessScreen context="popup" />
                    </motion.div>
                  ) : null}

                  {popupStep === 'unavailable' ? (
                    <motion.div
                      key="unavailable"
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-[32px] border border-[#cfe2f5] bg-[#f8fbff] p-6 text-center"
                      exit={{ opacity: 0, y: -12 }}
                      initial={{ opacity: 0, y: 16 }}
                    >
                      <div className="mx-auto grid size-14 place-items-center rounded-full border border-mint-400/25 bg-mint-400/10 text-mint-400">
                        <CheckCircle2 className="size-7" aria-hidden="true" />
                      </div>
                      <h3 className="mt-5 font-serif text-3xl font-normal text-black">Thank you</h3>
                      <p className="mt-3 text-base font-medium leading-7 text-black/70">
                        No problem. You can return when you are ready to receive your order.
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {popupOpen && popupStep === 'form' && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-x-4 bottom-3 z-[60] pb-[env(safe-area-inset-bottom)] lg:hidden">
              <button
                form="popup-checkout-form"
                type="submit"
                className="min-h-16 w-full rounded-2xl bg-linear-to-r from-[#0b2f64] via-[#1268e6] to-[#0747ad] px-5 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_20px_48px_rgba(6,48,103,0.42),inset_0_2px_0_rgba(255,255,255,0.48),inset_0_-4px_0_rgba(0,0,0,0.24)]"
              >
                Place Your Order Now
              </button>
            </div>,
            document.body,
          )
        : null}

      <AnimatePresence>
        {availabilityTarget === 'inline' ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 grid place-items-end bg-black/68 p-3 backdrop-blur-xl sm:place-items-center sm:p-6"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
          >
            <div className="w-full max-w-xl">
              <AvailabilityConfirmation onConfirm={confirmAvailability} onDecline={declineAvailability} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
