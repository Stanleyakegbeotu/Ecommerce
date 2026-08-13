import { CheckCircle2, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ThankYouPage({ preview = false, productName }: { preview?: boolean; productName?: string }) {
  return (
    <section className="grid min-h-screen place-items-center bg-[#050505] px-5 py-20 text-white">
      <div className="max-w-xl rounded-[36px] border border-white/10 bg-white/[0.055] p-6 text-center shadow-[0_30px_110px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.12)]">
        <div className="mx-auto grid size-16 place-items-center rounded-full border border-mint-400/25 bg-mint-400/10 text-mint-400">
          <CheckCircle2 className="size-8" aria-hidden="true" />
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-gold-500">{preview ? 'Admin preview' : 'Order received'}</p>
        <h1 className="mt-3 font-serif text-5xl font-normal leading-none">Thank you</h1>
        <p className="mt-5 text-base font-medium leading-7 text-stone-300">
          {preview ? `This is the customer thank-you page preview for ${productName ?? 'this product'}. No order, tracking event, email, or customer record has been created.` : 'Your order has been received. Our representative will contact you shortly to confirm delivery.'}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gold-500 px-6 text-sm font-black uppercase tracking-[0.12em] text-white"
        >
          <Home className="size-4" aria-hidden="true" />
          Back Home
        </Link>
      </div>
    </section>
  )
}
