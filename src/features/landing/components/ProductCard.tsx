import type { ProductDisplayCard } from '@/features/landing/types/product'

type ProductCardProps = {
  product: ProductDisplayCard
  compact?: boolean
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const heightClass = compact ? 'h-[140px]' : product.variant === 'tall' ? 'h-[320px]' : 'h-[260px]'
  const radiusClass = compact ? 'rounded-[20px]' : 'rounded-[28px]'

  return (
    <article
      className={`hero-product-card relative flex w-full shrink-0 overflow-hidden border border-mint-400/20 bg-linear-to-br from-earth-950/95 to-[#0f0d0b] ${radiusClass} ${heightClass}`}
    >
      <img
        src={product.imageSrc}
        alt={product.imageAlt}
        className="block size-full object-cover object-[center_20%]"
        loading="lazy"
      />
    </article>
  )
}
