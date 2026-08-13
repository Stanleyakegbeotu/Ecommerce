const packageImageModules = import.meta.glob<string>('../../../../PACKAGE/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  import: 'default',
  query: '?url',
})

const packageImages = Object.entries(packageImageModules)
  .sort(([firstPath], [secondPath]) => firstPath.localeCompare(secondPath, undefined, { numeric: true }))
  .map(([, imageSrc]) => imageSrc)

const productStation = new URL('../../../assets/duravolt-power-station-sticker.png', import.meta.url).href || packageImages[0]

export type BenefitIcon = 'delivery' | 'payment' | 'guarantee'

export type PackageBenefit = {
  icon: BenefitIcon
  label: string
}

export type ProductPackage = {
  id: string
  image: string
  imageAlt: string
  title: string
  product: string
  offer: string[]
  totalBottles?: string
  promoPrice: string
  oldPrice: string
  savedAmount: string
  discount?: string
  badge?: {
    label: string
    tone: 'popular' | 'value'
  }
  description: string
  benefits: PackageBenefit[]
  buttonText: string
}

export const defaultBenefits: PackageBenefit[] = [
  { icon: 'delivery', label: 'Free Delivery in Lagos & Abuja' },
  { icon: 'payment', label: 'Payment on Delivery' },
  { icon: 'guarantee', label: '1-Year Warranty' },
  { icon: 'guarantee', label: '100% Money-Back Guarantee' },
]

export const productPackages: ProductPackage[] = [
  {
    id: 'solar-gen-standard',
    image: productStation,
    imageAlt: 'Duravolt DSPP-150 portable solar generator',
    title: '1 Solar Generator',
    product: 'Buy 1',
    offer: ['1 × DuraVolt DSPP-150 150W Portable Solar Generator', '1 × FREE Solar Panel'],
    promoPrice: '₦150,000',
    oldPrice: '₦190,000',
    savedAmount: 'You Save ₦40,000',
    discount: 'Promo offer',
    description: 'Reliable rechargeable backup power for your everyday essentials.',
    benefits: defaultBenefits,
    buttonText: 'Buy Now',
  },
  {
    id: 'solar-gen-home-kit',
    image: productStation,
    imageAlt: 'Duravolt DSPP-150 portable solar generator',
    title: '2 Solar Generators',
    product: 'Buy 2',
    offer: ['2 × DuraVolt DSPP-150 150W Portable Solar Generators', '2 × FREE Solar Panels'],
    promoPrice: '₦295,000',
    oldPrice: '₦380,000',
    savedAmount: 'You Save ₦85,000',
    discount: 'Promo offer',
    badge: { label: '🔥 Most Popular', tone: 'popular' },
    description: 'An easy, fuel-free backup kit for your home or shop.',
    benefits: defaultBenefits,
    buttonText: 'Buy Now',
  },
  {
    id: 'solar-gen-complete-kit',
    image: productStation,
    imageAlt: 'Duravolt DSPP-150 portable solar generator',
    title: '3 Solar Generators',
    product: 'Buy 3',
    offer: ['3 × DuraVolt DSPP-150 150W Portable Solar Generators', '3 × FREE Solar Panels'],
    promoPrice: '₦440,000',
    oldPrice: '₦570,000',
    savedAmount: 'You Save ₦130,000',
    discount: '+ 3 Solar Panels FREE',
    badge: { label: '⭐ Best Value', tone: 'value' },
    description: 'Portable power support for your home, shop, or office.',
    benefits: defaultBenefits,
    buttonText: 'Buy Now',
  },
]
