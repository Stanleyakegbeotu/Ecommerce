import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, CircleHelp, PhoneCall, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import { SITE_CONFIG } from '@/constants/site'

const faqs = [
  {
    question: 'How long does delivery take?',
    answer: 'After our team confirms your order by phone, delivery is typically completed within 1–3 business days. Free delivery applies to Lagos and Abuja.',
  },
  {
    question: 'Do I need to pay online before delivery?',
    answer: 'No. You can choose Pay on Delivery. Place your order, receive a confirmation call, and pay when your order is delivered.',
  },
  {
    question: 'What can the 150W Solar Generator power?',
    answer: 'It is built for compatible low-power essentials such as phones, LED bulbs, Wi-Fi routers, small fans, laptops, and similar everyday devices. Check your device wattage before use.',
  },
  {
    question: 'Does every package include a solar panel?',
    answer: 'Yes. Every generator ordered comes with a FREE solar panel—the number of free panels matches the number of generators in your selected package.',
  },
  {
    question: 'Is there a warranty or guarantee?',
    answer: 'Yes. Your order comes with a 1-Year Warranty and a 100% Money-Back Guarantee for extra confidence.',
  },
  {
    question: 'What happens after I place my order?',
    answer: 'Our customer-care team will call to confirm your package, delivery address, and preferred delivery time before dispatch.',
  },
] as const

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section id="faq" className="relative overflow-hidden bg-[#f5faff] px-4 py-16 text-[#102a56] sm:px-6 lg:px-8 lg:py-24" aria-labelledby="faq-heading">
      <div className="pointer-events-none absolute -right-28 top-0 size-96 rounded-full bg-[#9dcbff]/25 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)] lg:gap-16">
        <div className="lg:pt-4">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-[#b8d5f3] bg-white text-[#1268e6] shadow-[0_12px_26px_rgba(18,104,230,0.12)]">
            <CircleHelp className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-6 text-[0.7rem] font-black uppercase tracking-[0.2em] text-[#1268e6]">Helpful answers</p>
          <h2 id="faq-heading" className="mt-4 font-serif text-5xl font-normal leading-[0.93] tracking-normal text-[#102a56] sm:text-6xl">Everything you need to know before you order.</h2>
          <p className="mt-6 max-w-md text-base font-medium leading-8 text-[#4c6c8a]">Clear answers about delivery, payment, supported essentials, and your order protection.</p>
          <div className="mt-8 border-l-2 border-[#1268e6] pl-4">
            <p className="text-sm font-black text-[#102a56]">Still need help?</p>
            <a href={SITE_CONFIG.contactHref} className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-[#1268e6] underline decoration-[#1268e6]/30 underline-offset-4">
              <PhoneCall className="size-4" aria-hidden="true" /> Speak with customer support
            </a>
          </div>
        </div>

        <div className="border-y border-[#cfe1f3]">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index

            return (
              <article className="border-b border-[#cfe1f3] last:border-b-0" key={faq.question}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="flex w-full items-center gap-4 py-5 text-left sm:py-6"
                  aria-expanded={isOpen}
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-black transition ${isOpen ? 'bg-[#1268e6] text-white shadow-[0_7px_16px_rgba(18,104,230,0.25)]' : 'bg-white text-[#5d7d9b] border border-[#c8dcf0]'}`}>{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex-1 text-base font-black leading-6 text-[#102a56] sm:text-lg">{faq.question}</span>
                  <ChevronDown className={`size-5 shrink-0 text-[#1268e6] transition duration-300 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.24, ease: 'easeOut' }} className="overflow-hidden">
                      <p className="pb-6 pl-12 pr-2 text-sm font-medium leading-7 text-[#52728f] sm:pl-14 sm:text-base">{faq.answer}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </article>
            )
          })}
        </div>
      </div>
      <div className="relative mx-auto mt-10 flex max-w-6xl items-center gap-2 border-t border-[#cfe1f3] pt-5 text-xs font-bold text-[#52728f]">
        <ShieldCheck className="size-4 shrink-0 text-[#168b46]" aria-hidden="true" /> Secure ordering, Pay on Delivery, and a confirmation call before dispatch.
      </div>
    </section>
  )
}
