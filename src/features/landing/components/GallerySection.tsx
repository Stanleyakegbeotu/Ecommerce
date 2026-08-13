import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useMemo, useRef } from 'react'

const galleryImageModules = import.meta.glob<string>('../../../../GALLERY/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  import: 'default',
  query: '?url',
})

type GalleryAsset = {
  src: string
  alt: string
}

type GalleryImageProps = {
  image: GalleryAsset
  className: string
}

type GalleryGridProps = {
  images: GalleryAsset[]
}

const galleryImages: GalleryAsset[] = Object.entries(galleryImageModules)
  .sort(([firstPath], [secondPath]) => firstPath.localeCompare(secondPath, undefined, { numeric: true }))
  .map(([path, src], index) => {
    const filename = path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? `Gallery image ${index + 1}`

    return {
      src,
      alt: `Solar Generator gallery image ${index + 1}: ${filename.replace(/_/g, ' ')}`,
    }
  })

const desktopImageRhythm = [
  'translate-y-6 -rotate-[1.5deg]',
  '-translate-y-7 rotate-[1deg]',
  'translate-y-12 -rotate-[0.6deg]',
  '-translate-y-10 rotate-[1.4deg]',
  'translate-y-3 -rotate-[1deg]',
  '-translate-y-2 rotate-[0.7deg]',
] as const

function GalleryImage({ image, className }: GalleryImageProps) {
  return <img src={image.src} alt={image.alt} className={className} loading="lazy" decoding="async" />
}

function useSectionAnimation() {
  const ref = useRef<HTMLDivElement | null>(null)
  const isInView = useInView(ref, { margin: '420px 0px 420px 0px' })
  const reducedMotion = useReducedMotion()

  return { ref, shouldAnimate: isInView && !reducedMotion }
}

function GalleryGrid({ images }: GalleryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[0, 1].map((columnIndex) => (
        <div className="grid content-start gap-2" key={columnIndex}>
          {images
            .filter((_, imageIndex) => imageIndex % 2 === columnIndex)
            .map((image) => (
              <GalleryImage
                className="gallery-depth-card block h-auto w-full rounded-[18px] object-contain shadow-[0_12px_30px_rgba(0,0,0,0.32)]"
                image={image}
                key={image.src}
              />
            ))}
        </div>
      ))}
    </div>
  )
}

function GalleryMarquee({ images }: GalleryGridProps) {
  const { ref, shouldAnimate } = useSectionAnimation()
  const marqueeImages = useMemo(() => [...images, ...images], [images])

  return (
    <div className="hidden overflow-hidden py-24 md:block lg:py-32" ref={ref}>
      <div className="-mx-[10vw] [perspective:1400px]">
        <div className="origin-center [transform:rotateX(7deg)_rotateZ(-2.25deg)]">
          <motion.div
            animate={shouldAnimate ? { x: '-50%' } : { x: '0%' }}
            className="flex w-max gap-5 will-change-transform lg:gap-7"
            transition={shouldAnimate ? { duration: 56, ease: 'linear', repeat: Infinity } : { duration: 0 }}
          >
            {marqueeImages.map((image, index) => (
              <div
                className={`flex h-[clamp(220px,24vw,390px)] shrink-0 items-center ${desktopImageRhythm[index % desktopImageRhythm.length]}`}
                key={`${image.src}-${index}`}
              >
                <GalleryImage
                  className="gallery-depth-card block h-full w-auto max-w-none rounded-[clamp(24px,2vw,34px)] object-contain shadow-[0_34px_84px_rgba(0,0,0,0.52),0_16px_36px_rgba(245,158,11,0.1)]"
                  image={image}
                />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function MasonryGallery({ images }: GalleryGridProps) {
  const { ref, shouldAnimate } = useSectionAnimation()

  return (
    <div className="overflow-hidden px-2 py-4 md:hidden" ref={ref}>
      <div className="mobile-gallery-edge-fade h-[min(1480px,186vh)] overflow-hidden">
        <motion.div
          animate={shouldAnimate ? { y: '-50%' } : { y: '0%' }}
          className="grid gap-2 will-change-transform"
          transition={shouldAnimate ? { duration: 92, ease: 'linear', repeat: Infinity } : { duration: 0 }}
        >
          <GalleryGrid images={images} />
          <GalleryGrid images={images} />
        </motion.div>
      </div>
    </div>
  )
}

export function GallerySection() {
  if (galleryImages.length === 0) {
    return null
  }

  return (
    <section className="solar-panel-surface solar-panel-surface--bottom-right overflow-hidden bg-[#050505]" aria-label="Product gallery" id="gallery">
      <GalleryMarquee images={galleryImages} />
      <MasonryGallery images={galleryImages} />
    </section>
  )
}

