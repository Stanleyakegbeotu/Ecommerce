import { ArrowUpRight, Headphones, PackageCheck, ShieldCheck, Truck } from 'lucide-react'

import { SITE_CONFIG } from '@/constants/site'

const quickLinks = [
  ['Benefits', '#benefits'],
  ['Reviews', '#reviews'],
  ['Gallery', '#gallery'],
  ['About', '#about'],
  ['Order Form', '#order'],
  ['FAQ', '#faq'],
] as const

const trustBadges = [
  { label: 'Free Delivery in Lagos & Abuja', icon: Truck, tone: 'blue' },
  { label: 'Pay on Delivery', icon: PackageCheck, tone: 'green' },
  { label: '1-Year Warranty', icon: ShieldCheck, tone: 'blue' },
  { label: 'Helpful Customer Support', icon: Headphones, tone: 'green' },
] as const

export function Footer() {
  return (
    <footer className="solar-site-footer relative overflow-hidden border-t border-[#c8def2] bg-[#f4f9ff] px-5 pb-8 pt-14 text-[#102a56] sm:px-8 lg:pb-10 lg:pt-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_10%,rgba(97,165,255,0.24),transparent_27%),radial-gradient(circle_at_7%_88%,rgba(22,163,74,0.09),transparent_24%)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 border-b border-[#cbdfee] pb-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-[#1268e6]">Ready when power goes off</p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl font-normal leading-[0.95] text-[#102a56] sm:text-5xl">Secure your quiet backup power today.</h2>
          </div>
          <a href="#order" className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#0b2f64] via-[#1268e6] to-[#0747ad] px-6 text-sm font-black uppercase tracking-[0.1em] text-white shadow-[0_16px_32px_rgba(18,104,230,0.28),inset_0_1px_0_rgba(255,255,255,0.4)] transition hover:-translate-y-0.5 lg:w-auto">
            Order Solar Generator <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>

        <div className="grid gap-10 py-10 lg:grid-cols-[1.15fr_0.75fr_1.1fr_0.9fr] lg:gap-12">
          <div>
            <p className="font-serif text-3xl font-normal text-[#102a56]">{SITE_CONFIG.productName}</p>
            <p className="mt-4 max-w-sm text-sm font-semibold leading-7 text-[#496a89]">Portable solar backup power for the Nigerian moments when reliable essentials matter most.</p>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-[#1268e6]">150W · Portable · Solar-ready</p>
          </div>

          <div>
            <h3 className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#1268e6]">Explore</h3>
            <nav className="mt-4 grid gap-2.5" aria-label="Footer quick links">
              {quickLinks.map(([label, href]) => (
                <a className="w-fit text-sm font-black text-[#284e76] transition hover:text-[#1268e6] hover:underline hover:underline-offset-4" href={href} key={href}>{label}</a>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#1268e6]">Order with confidence</h3>
            <div className="mt-4 grid gap-3">
              {trustBadges.map(({ label, icon: Icon, tone }) => (
                <div className="flex items-center gap-3" key={label}>
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl border shadow-[0_7px_14px_rgba(18,104,230,0.08)] ${tone === 'green' ? 'border-[#16a34a]/25 bg-[#16a34a]/10 text-[#168b46]' : 'border-[#1268e6]/20 bg-[#1268e6]/10 text-[#1268e6]'}`}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-black text-[#284e76]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#1268e6]">Need help?</h3>
            <p className="mt-4 text-sm font-semibold leading-7 text-[#496a89]">Questions about delivery or your order? Our support team is ready to help you order with confidence.</p>
            <a className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[#b9d4ee] bg-white px-5 text-xs font-black uppercase tracking-[0.12em] text-[#1268e6] shadow-[0_10px_20px_rgba(18,104,230,0.1)] transition hover:border-[#1268e6] hover:bg-[#eff7ff]" href={SITE_CONFIG.contactHref}>Contact Support</a>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#cbdfee] pt-6 text-xs font-bold text-[#537390] sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 {SITE_CONFIG.productName}. All rights reserved.</p>
          <p>Secure ordering · Pay on Delivery · Confirmation before dispatch</p>
        </div>
      </div>
    </footer>
  )
}
