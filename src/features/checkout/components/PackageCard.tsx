import { AnimatePresence, motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'

import type { ProductPackage } from '@/features/landing/data/packages'

type PackageCardProps = {
  productPackage: ProductPackage
  selected: boolean
  onSelect: (packageId: string) => void
  compact?: boolean
  elevated?: boolean
}

export function PackageCard({ productPackage, selected, onSelect, compact = false, elevated = false }: PackageCardProps) {
  return (
    <motion.button
      type="button"
      layoutId={`checkout-package-${productPackage.id}`}
      onClick={() => onSelect(productPackage.id)}
      className={`checkout-package-option group relative w-full overflow-hidden rounded-[26px] border p-4 text-left transition sm:p-5 ${
        selected
          ? elevated
            ? 'border-[#1268e6] bg-[#f3f8ff] shadow-[0_0_0_3px_rgba(18,104,230,0.16),0_30px_52px_rgba(18,104,230,0.25),0_12px_22px_rgba(5,32,74,0.14),inset_0_1px_0_rgba(255,255,255,0.96)]'
            : 'border-[#1268e6] bg-[#f3f8ff] shadow-[0_0_0_2px_rgba(18,104,230,0.13),0_26px_52px_rgba(18,104,230,0.2)]'
          : elevated
            ? 'border-[#d3e3f4] bg-white shadow-[0_22px_38px_rgba(22,71,125,0.16),0_7px_14px_rgba(7,37,78,0.1),inset_0_1px_0_rgba(255,255,255,0.98)] hover:border-[#8ab8ec]'
            : 'border-[#d3e3f4] bg-white shadow-[0_10px_26px_rgba(32,82,137,0.08)] hover:border-[#8ab8ec]'
      }`}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
      aria-pressed={selected}
    >
      {selected ? (
        <motion.div
          className="absolute inset-0 rounded-[26px] border-2 border-[#1268e6]/25"
          animate={{ opacity: [0.4, 1, 0.65] }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          aria-hidden="true"
        />
      ) : null}
      <div className={`absolute inset-x-0 top-0 h-1 ${selected ? 'bg-linear-to-r from-[#1268e6] via-[#61a5ff] to-[#16a34a]' : 'bg-[#eaf3ff]'}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-[#1268e6]">{productPackage.product}</p>
            {productPackage.badge ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#16a34a]/10 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.11em] text-[#168b46]">
                <Sparkles className="size-3" aria-hidden="true" />
                {productPackage.badge.label}
              </span>
            ) : null}
          </div>
          <h3 className={`${compact ? 'text-xl' : 'text-2xl'} mt-2 font-black leading-tight tracking-[-0.03em] text-black`}>{productPackage.title}</h3>
        </div>
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-full border transition ${
            selected ? 'border-[#1268e6] bg-[#1268e6] text-white' : 'border-[#b9cfe7] bg-white text-transparent'
          }`}
          aria-hidden="true"
        >
          <motion.span animate={{ scale: selected ? 1 : 0.45, opacity: selected ? 1 : 0 }} transition={{ type: 'spring', stiffness: 420, damping: 22 }}>
            <Check className="size-4" />
          </motion.span>
        </span>
      </div>

      <p className="mt-3 min-h-11 text-sm font-semibold leading-5 text-black/70">
        {productPackage.offer.map((line) => (
          <span className="block" key={line}>
            {line}
          </span>
        ))}
      </p>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#dbe9f7] pt-4">
        <div>
          <p className="text-[0.6rem] font-black uppercase tracking-[0.15em] text-[#6784a4]">Promo price</p>
          <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-black">{productPackage.promoPrice}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-[#dc4c4c] line-through decoration-2">{productPackage.oldPrice}</p>
          <p className="mt-1 text-[0.65rem] font-black uppercase tracking-[0.08em] text-[#168b46]">{productPackage.savedAmount}</p>
        </div>
      </div>
      <AnimatePresence>
        {selected ? (
          <motion.span
            className="absolute right-14 top-3 rounded-full bg-[#1268e6] px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-white shadow-[0_7px_14px_rgba(18,104,230,0.28)]"
            initial={{ opacity: 0, scale: 0.8, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 4 }}
            transition={{ type: 'spring', stiffness: 400, damping: 24 }}
          >
            Selected
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.button>
  )
}
