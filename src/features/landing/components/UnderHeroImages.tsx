import underHeroImageOne from '@/assets/duravolt-dspp-150-power-guide.jpeg'
import underHeroImageTwo from '@/assets/duravolt-dspp-150-kit.jpeg'
import underHeroImageThree from '@/assets/duravolt-comparison-guide.jpeg'

const underHeroImages = [
  {
    src: underHeroImageOne,
    alt: 'Duravolt DSPP-150 portable solar generator power guide',
  },
  {
    src: underHeroImageTwo,
    alt: 'Duravolt DSPP-150 portable solar generator complete backup power kit',
  },
  {
    src: underHeroImageThree,
    alt: 'Duravolt DSPP-150 solar generator comparison guide',
  },
] as const

export function UnderHeroImages() {
  return (
    <section className="solar-panel-surface solar-panel-surface--bottom-right bg-ink-950 md:px-6 md:py-10 lg:px-10 lg:py-14" aria-label="Duravolt product details">
      <div className="mx-auto grid w-full grid-cols-1 gap-0 md:max-w-5xl md:grid-cols-2 md:gap-6 xl:max-w-7xl xl:grid-cols-3 xl:gap-8">
        {underHeroImages.map((image) => (
          <figure className="m-0 w-full overflow-visible" key={image.src}>
            <img src={image.src} alt={image.alt} className="block h-auto w-full rounded-none object-contain" loading="lazy" />
          </figure>
        ))}
      </div>
    </section>
  )
}
