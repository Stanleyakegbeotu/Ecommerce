import type { Product, ProductDisplayCard } from '@/features/landing/types/product'

import heroImageOne from '../../../../hero/WhatsApp Image 2026-08-07 at 4.10.46 PM.jpeg'
import heroImageTwo from '../../../../hero/WhatsApp Image 2026-08-07 at 4.10.49 PM (1).jpeg'
import heroImageThree from '../../../../hero/WhatsApp Image 2026-08-07 at 4.10.50 PM (1).jpeg'
import heroImageFour from '../../../../hero/WhatsApp Image 2026-08-07 at 4.10.50 PM.jpeg'
import heroImageFive from '../../../../hero/WhatsApp Image 2026-08-08 at 3.02.41 PM (3).jpeg'
import heroImageSix from '../../../../hero/WhatsApp Image 2026-08-08 at 3.02.43 PM (1).jpeg'

const heroImages = [heroImageOne, heroImageTwo, heroImageThree, heroImageFour, heroImageFive, heroImageSix]

export const heroProduct: Omit<Product, 'imageSrc'> = {
  id: 'solar-gen-dspp-150',
  brand: 'Solar Generator',
  name: 'Solar Generator',
  size: 'Portable Solar Generator',
  imageAlt: 'Solar Generator portable solar generator',
}

export const productCards: ProductDisplayCard[] = heroImages.map((imageSrc, index) => ({
  ...heroProduct,
  id: `${heroProduct.id}-${index + 1}`,
  imageSrc,
  variant: index % 2 === 0 ? 'tall' : 'wide',
  accentDivider: index % 3 === 0,
}))
