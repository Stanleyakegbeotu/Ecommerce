import { motion, type Variants } from 'framer-motion'
import { CheckCircle2, PackageCheck, ShieldCheck, ShoppingCart, Sparkles, Truck } from 'lucide-react'

import { productPackages, type BenefitIcon, type PackageBenefit, type ProductPackage } from '@/features/landing/data/packages'

const sectionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.14, delayChildren: 0.1 },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 38, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
}

const panelVariants: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1], delay: 0.12 },
  },
}

const benefitIcons = {
  delivery: Truck,
  payment: PackageCheck,
  guarantee: ShieldCheck,
} satisfies Record<BenefitIcon, typeof Truck>

function openCheckout(packageId: string) {
  window.dispatchEvent(new CustomEvent('checkout:open', { detail: { packageId, section: 'packages' } }))
}

function PackageBadge({ badge }: { badge: ProductPackage['badge'] }) {
  if (!badge) {
    return null
  }

  const Icon = badge.tone === 'popular' ? Sparkles : CheckCircle2

  return (
    <div className="package-badge absolute left-1/2 top-3 z-20 inline-flex min-h-10 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-[#c9daf1] bg-white/95 px-4 text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#102a56] shadow-[0_10px_28px_rgba(39,89,154,0.16)] backdrop-blur-xl">
      <Icon className="size-4 text-gold-500" aria-hidden="true" />
      {badge.label}
    </div>
  )
}

function PriceCard({ productPackage }: { productPackage: ProductPackage }) {
  return (
    <div className="package-price-card rounded-[24px] border border-[#d8e3f2] bg-[#f8fbff] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-stone-400">Normal price</p>
          <span className="package-normal-price mt-1 block text-lg font-black leading-none text-stone-500 line-through sm:text-xl">
            {productPackage.oldPrice}
          </span>
          <p className="mt-3 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#a7f3c1]">Promo price</p>
          <strong className="mt-1 block text-3xl font-black tracking-normal text-[#102a56] sm:text-[2.15rem]">
            {productPackage.promoPrice}
          </strong>
        </div>
        <div className="w-[112px] justify-self-end rounded-2xl border border-gold-500/30 bg-gold-500/12 px-3 py-2 text-right text-[0.66rem] font-black uppercase leading-4 tracking-[0.08em] text-gold-500 sm:w-[132px]">
          <span className="block break-words">{productPackage.savedAmount}</span>
          {productPackage.discount ? <span className="block break-words text-[#49617f]">{productPackage.discount}</span> : null}
        </div>
      </div>
    </div>
  )
}

function BenefitItem({ benefit }: { benefit: PackageBenefit }) {
  const Icon = benefitIcons[benefit.icon]

  return (
    <li className="package-benefit flex min-h-9 items-center gap-3 text-sm font-semibold text-[#355273]">
      <span className="package-benefit-icon grid size-8 shrink-0 place-items-center rounded-full border border-mint-400/20 bg-mint-400/10 text-mint-400">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span>{benefit.label}</span>
    </li>
  )
}

function BuyButton({ productPackage }: { productPackage: ProductPackage }) {
  return (
    <motion.button
      aria-label={`${productPackage.buttonText} - ${productPackage.title}`}
      className="package-buy-button group relative inline-flex min-h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-full border border-[#075d2c] bg-linear-to-br from-[#0d7a3a] via-[#16a34a] to-[#087838] px-8 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_16px_44px_rgba(22,163,74,0.34),inset_0_2px_0_rgba(255,255,255,0.48),inset_0_-4px_0_rgba(0,0,0,0.18)] transition focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:ring-offset-4 focus:ring-offset-ink-950"
      onClick={() => openCheckout(productPackage.id)}
      type="button"
      whileHover={{ y: -3, scale: 1.025 }}
      whileTap={{ scale: 0.97 }}
    >
      <span className="package-button-sheen absolute inset-0 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
      <ShoppingCart className="relative size-5" aria-hidden="true" />
      <span className="relative">{productPackage.buttonText}</span>
    </motion.button>
  )
}

function PackageCard({ productPackage }: { productPackage: ProductPackage }) {
  return (
    <motion.article
      className="product-package-card group relative min-h-[680px] overflow-hidden rounded-[32px] border border-[#d8e3f2] bg-white shadow-[0_20px_52px_rgba(39,89,154,0.14),inset_0_1px_0_rgba(255,255,255,0.9)]"
      variants={cardVariants}
      whileHover={{ y: -8, scale: 1.012 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(18,104,230,0.12),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,255,255,0))]" aria-hidden="true" />
      <div className="package-card-hover-glow absolute -inset-px rounded-[32px] opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true" />

      <PackageBadge badge={productPackage.badge} />

      <div className="package-image-stage relative h-[360px] overflow-hidden rounded-t-[32px] bg-[#eaf3ff] sm:h-[370px]">
        <img
          alt={productPackage.imageAlt}
          className="package-main-sticker brand-sticker-shake size-full object-contain p-7 object-center transition duration-700 group-hover:scale-105 sm:p-9"
          loading="lazy"
          src={productPackage.image}
        />
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-white/10 to-[#dcecff]/65" aria-hidden="true" />
      </div>

      <motion.div
        className="package-details-panel relative z-10 mx-4 mb-4 -mt-14 rounded-[28px] border border-[#d8e3f2] bg-white/95 p-5 shadow-[0_18px_48px_rgba(39,89,154,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl sm:mx-5 sm:mb-5 sm:-mt-20 sm:p-6"
        variants={panelVariants}
      >
        <div className="mb-5">
          <p className="text-base font-black uppercase tracking-[0.2em] text-mint-400 sm:text-lg">{productPackage.product}</p>
          <h3 className="mt-2 font-serif text-[2.35rem] font-normal leading-none tracking-normal text-[#102a56]">{productPackage.title}</h3>
          <p className="mt-3 text-base font-semibold leading-6 text-[#49617f]">
            {productPackage.offer.map((line) => (
              <span className="block" key={line}>
                {line}
              </span>
            ))}
            {productPackage.totalBottles ? <span className="mt-1 block text-gold-500">{productPackage.totalBottles}</span> : null}
          </p>
        </div>

        <div className="grid gap-4">
          <PriceCard productPackage={productPackage} />
          <ul className="grid gap-2" aria-label="Package benefits">
            {productPackage.benefits.map((benefit) => (
              <BenefitItem benefit={benefit} key={benefit.label} />
            ))}
          </ul>
          <BuyButton productPackage={productPackage} />
        </div>
      </motion.div>
    </motion.article>
  )
}

export function ProductPackages() {
  return (
    <section
      className="solar-panel-surface solar-panel-surface--bottom-left relative isolate overflow-hidden bg-[#f4f8ff] px-4 py-20 text-[#102a56] sm:px-6 sm:py-24 lg:px-8 lg:py-28"
      aria-labelledby="product-packages-heading"
      id="packages"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_12%,rgba(18,104,230,0.14),transparent_30%),radial-gradient(circle_at_78%_8%,rgba(97,165,255,0.14),transparent_28%),linear-gradient(180deg,#ffffff_0%,#eef6ff_46%,#f8fbff_100%)]" aria-hidden="true" />

      <div className="mx-auto max-w-7xl">
        <motion.div
          className="package-section-header mx-auto mb-12 max-w-3xl text-center sm:mb-16"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gold-500">Premium bundles</p>
          <h2
            className="mt-4 font-serif text-5xl font-normal leading-[0.95] tracking-normal text-[#102a56] sm:text-6xl lg:text-7xl"
            id="product-packages-heading"
          >
            Choose Your Solar Generator
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#49617f] sm:text-lg">
            Get reliable portable backup power with fast delivery, payment on delivery, and a clear guarantee.
          </p>
        </motion.div>

        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8"
          initial="hidden"
          variants={sectionVariants}
          viewport={{ once: true, amount: 0.18 }}
          whileInView="visible"
        >
          {productPackages.map((productPackage) => (
            <PackageCard key={productPackage.id} productPackage={productPackage} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
