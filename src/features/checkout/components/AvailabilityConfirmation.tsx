import { motion } from 'framer-motion'
import { CalendarCheck, Clock3, PackageCheck } from 'lucide-react'

type AvailabilityConfirmationProps = {
  onConfirm: () => void | Promise<void>
  onDecline: () => void
}

export function AvailabilityConfirmation({ onConfirm, onDecline }: AvailabilityConfirmationProps) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      className="flex min-h-[360px] w-full flex-col rounded-[32px] border border-[#c5dff5] bg-linear-to-br from-white via-[#f8fbff] to-[#eaf5ff] text-[#102a56] shadow-[0_36px_88px_rgba(12,63,124,0.3),0_12px_28px_rgba(5,31,72,0.16),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-18px_32px_rgba(18,104,230,0.05)]"
      exit={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
      initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="grid flex-1 gap-5 p-5 pb-3">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[#16a34a]/20 bg-[#16a34a]/10 text-[#168b46] shadow-[0_12px_22px_rgba(22,163,74,0.16),inset_0_1px_0_rgba(255,255,255,0.94)]">
            <PackageCheck className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#1268e6]">Payment on delivery</p>
            <h2 className="mt-2 font-serif text-3xl font-normal leading-none tracking-normal text-black drop-shadow-[0_2px_0_rgba(255,255,255,0.96)]">
              Before We Confirm Your Order
            </h2>
          </div>
        </div>

        <p className="rounded-2xl border border-[#d6e6f6] bg-white/92 p-4 text-base font-semibold leading-7 text-black/75 shadow-[0_16px_30px_rgba(18,104,230,0.12),0_5px_10px_rgba(8,40,82,0.07),inset_0_1px_0_rgba(255,255,255,0.98)]">
          We offer Free Delivery in Lagos & Abuja and Payment on Delivery. To help us avoid failed deliveries, please confirm that you
          will be available to receive your order within the next 1-3 business days.
        </p>

        <div className="grid grid-cols-2 gap-3 rounded-3xl border border-[#cfe2f5] bg-[#eff7ff] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-10px_20px_rgba(18,104,230,0.05)]">
          <div className="flex items-center gap-3 rounded-2xl border border-[#d8e8f7] bg-white p-3 shadow-[0_16px_26px_rgba(18,104,230,0.14),0_5px_10px_rgba(8,40,82,0.08),inset_0_1px_0_rgba(255,255,255,0.98)]">
            <CalendarCheck className="size-5 text-[#1268e6]" aria-hidden="true" />
            <span className="text-sm font-bold text-black">1-3 business days</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#d8e8f7] bg-white p-3 shadow-[0_16px_26px_rgba(18,104,230,0.14),0_5px_10px_rgba(8,40,82,0.08),inset_0_1px_0_rgba(255,255,255,0.98)]">
            <Clock3 className="size-5 text-[#168b46]" aria-hidden="true" />
            <span className="text-sm font-bold text-black">Quick confirmation</span>
          </div>
        </div>

      </div>

      <div className="sticky bottom-0 grid gap-3 border-t border-[#d8e8f7] bg-white/90 p-5 pt-3">
          <button
            type="button"
            onClick={() => void onConfirm()}
            className="min-h-14 rounded-full bg-linear-to-r from-[#0b2f64] via-[#1268e6] to-[#0747ad] px-5 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_22px_42px_rgba(18,104,230,0.38),0_8px_16px_rgba(4,31,74,0.2),inset_0_2px_0_rgba(255,255,255,0.46),inset_0_-4px_0_rgba(0,0,0,0.18)] transition active:translate-y-px active:shadow-[0_10px_20px_rgba(18,104,230,0.28)]"
          >
            YES, I WILL BE AVAILABLE
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="min-h-12 rounded-full border border-[#bfd8ef] bg-white px-5 text-sm font-black uppercase tracking-[0.12em] text-[#315778] shadow-[0_12px_22px_rgba(18,104,230,0.12),inset_0_1px_0_rgba(255,255,255,0.98)] transition active:translate-y-px active:shadow-[0_6px_12px_rgba(18,104,230,0.1)]"
          >
            NO, NOT YET
          </button>
      </div>
    </motion.div>
  )
}
