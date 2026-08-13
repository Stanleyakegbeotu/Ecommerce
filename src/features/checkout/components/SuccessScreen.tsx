import { CheckCircle2, Home, PackagePlus } from 'lucide-react'

import { DownloadConfirmationButton } from '@/features/checkout/components/DownloadConfirmationButton'
import { OrderSummary } from '@/features/checkout/components/OrderSummary'
import { useCheckoutEngine } from '@/features/checkout/hooks/useCheckoutEngine'

type SuccessScreenProps = {
  context: 'popup' | 'inline'
}

export function SuccessScreen({ context }: SuccessScreenProps) {
  const { closePopup, lastOrder, resetOrder } = useCheckoutEngine()

  if (!lastOrder) {
    return null
  }

  const backToHome = () => {
    if (context === 'popup') {
      closePopup()
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="grid gap-5 text-white">
      <div className="rounded-[32px] border border-mint-400/20 bg-mint-400/[0.08] p-5 text-center shadow-[0_24px_80px_rgba(52,211,153,0.12)]">
        <div className="mx-auto grid size-16 place-items-center rounded-full border border-mint-400/30 bg-mint-400/12 text-mint-400">
          <CheckCircle2 className="size-8" aria-hidden="true" />
        </div>
        <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-mint-400">Order Received</p>
        <h2 className="mt-2 font-serif text-4xl font-normal leading-none tracking-normal text-white">
          Thank you, {lastOrder.customer.fullName}
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-base font-medium leading-7 text-stone-300">
          Your order has been received successfully. One of our representatives will contact you shortly to confirm your
          order.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ['Estimated Delivery', lastOrder.estimatedDelivery],
          ['Delivery', 'FREE Delivery'],
          ['Payment', 'Payment on Delivery'],
        ].map(([label, value]) => (
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-center" key={label}>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-stone-500">{label}</p>
            <p className="mt-1 text-sm font-black leading-5 text-white">{value}</p>
          </div>
        ))}
      </div>

      <OrderSummary order={lastOrder} />

      <div className="grid gap-3">
        <DownloadConfirmationButton order={lastOrder} />
        <button
          type="button"
          onClick={backToHome}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.055] px-5 text-sm font-black uppercase tracking-[0.12em] text-stone-200"
        >
          <Home className="size-4" aria-hidden="true" />
          Back To Home
        </button>
        <button
          type="button"
          onClick={resetOrder}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-linear-to-br from-[#4d96ff] via-gold-500 to-gold-600 px-5 text-sm font-black uppercase tracking-[0.12em] text-white"
        >
          <PackagePlus className="size-4" aria-hidden="true" />
          Place Another Order
        </button>
      </div>
    </div>
  )
}
