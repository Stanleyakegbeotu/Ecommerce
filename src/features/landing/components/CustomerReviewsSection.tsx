import { AnimatePresence, motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import reviewSectionBg from '@/assets/review-leaves-bg.jpeg'

import reviewImage01 from '../../../../CUSTOMERS/WhatsApp Image 2026-08-07 at 4.10.48 PM.jpeg'
import reviewImage02 from '../../../../CUSTOMERS/WhatsApp Image 2026-08-07 at 4.10.49 PM.jpeg'
import reviewImage03 from '../../../../CUSTOMERS/WhatsApp Image 2026-08-07 at 4.10.51 PM.jpeg'
import reviewImage04 from '../../../../CUSTOMERS/WhatsApp Image 2026-08-08 at 3.02.40 PM.jpeg'
import reviewImage05 from '../../../../CUSTOMERS/WhatsApp Image 2026-08-08 at 3.02.41 PM.jpeg'
import reviewImage06 from '../../../../CUSTOMERS/WhatsApp Image 2026-08-08 at 3.02.42 PM (1).jpeg'
import reviewImage07 from '../../../../CUSTOMERS/WhatsApp Image 2026-08-08 at 3.02.43 PM (3).jpeg'
import reviewImage08 from '../../../../CUSTOMERS/WhatsApp Image 2026-08-08 at 3.02.44 PM (1).jpeg'

type CustomerReview = {
  src: string
  type: 'image' | 'video'
  rating: number
  label: string
  aspectRatio: string
  widthRatio: number
}

type FloatingTestimonial = {
  name: string
  location: string
  text: string
  badge?: string
}

type StackStyle = CSSProperties & {
  '--card-count'?: number
  '--stack-index'?: number
  '--media-aspect'?: string
  '--media-width-ratio'?: number
  '--review-bg-image'?: string
}

const customerReviews: CustomerReview[] = [
  { src: reviewImage01, type: 'image', rating: 5, label: 'Solar Generator customer review 01', aspectRatio: '3 / 4', widthRatio: 0.75 },
  { src: reviewImage02, type: 'image', rating: 4.9, label: 'Solar Generator customer review 02', aspectRatio: '3 / 4', widthRatio: 0.75 },
  { src: reviewImage03, type: 'image', rating: 4.8, label: 'Solar Generator customer review 03', aspectRatio: '139 / 152', widthRatio: 0.91 },
  { src: reviewImage04, type: 'image', rating: 5, label: 'Solar Generator customer review 04', aspectRatio: '3 / 4', widthRatio: 0.75 },
  { src: reviewImage05, type: 'image', rating: 4.9, label: 'Solar Generator customer review 05', aspectRatio: '3 / 4', widthRatio: 0.75 },
  { src: reviewImage06, type: 'image', rating: 4.8, label: 'Solar Generator customer review 06', aspectRatio: '3 / 4', widthRatio: 0.75 },
  { src: reviewImage07, type: 'image', rating: 5, label: 'Solar Generator customer review 07', aspectRatio: '3 / 4', widthRatio: 0.75 },
  { src: reviewImage08, type: 'image', rating: 4.9, label: 'Solar Generator customer review 08', aspectRatio: '1 / 1', widthRatio: 1 },
]

const floatingTestimonials: FloatingTestimonial[] = [
  { name: 'Grace', location: 'Lagos', text: 'The Solar Generator keeps my lights and router on during outages. It is compact and easy to use ❤️', badge: 'Verified Customer' },
  { name: 'Amaka', location: 'Enugu', text: 'Delivery was fast and the package was neat. The backup power has been very helpful 😊' },
  { name: 'Ngozi', location: 'Abuja', text: 'I like that I can pay when it arrives. It is a simple backup solution for my essentials.', badge: 'Delivered Successfully' },
  { name: 'Victor', location: 'Benin', text: 'I use it for my phone, lights, and small fan. Very practical for everyday power cuts 🔥' },
  { name: 'Samuel', location: 'Kaduna', text: 'The unit feels solid and portable. My shop has a dependable backup now 💯', badge: 'Repeat Customer' },
  { name: 'Tega', location: 'Warri', text: 'As e land, I charged it and set up my lights immediately. Nice one 👏🏽' },
  { name: 'Jennifer', location: 'Bayelsa', text: 'The generator is compact and easy to carry. I have ordered another for my sister 😍', badge: 'Top Review' },
  { name: 'Peace', location: 'Jos', text: 'Customer support called before delivery. That alone gave me confidence 🥹' },
  { name: 'Favour', location: 'Delta', text: 'It has made my daily charging and evening lighting much easier.' },
  { name: 'Abdul', location: 'Kano', text: 'The payment on delivery made it simple. Product reached me in good condition.' },
  { name: 'Mariam', location: 'Calabar', text: 'My home essentials stay powered when there is no light. No drama, just steady backup ❤️' },
  { name: 'Esther', location: 'Makurdi', text: 'I bought one for my mum and she likes how simple it is to use. Packaging was clean too.' },
]

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="review-stack-stars" aria-label={rating.toFixed(1) + ' out of 5 stars'}>
      {Array.from({ length: 5 }).map((_, index) => (
        <svg key={index} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span>{rating.toFixed(1)}</span>
    </div>
  )
}

function FloatingReviewCard({ testimonial, side }: { testimonial: FloatingTestimonial; side: 'left' | 'right' }) {
  return (
    <motion.article
      key={`${side}-${testimonial.name}-${testimonial.location}`}
      animate={{ opacity: 0.92, x: 0, y: 0, scale: 1 }}
      className={`review-floating-card review-floating-card--${side}`}
      exit={{ opacity: 0, x: side === 'left' ? -18 : 18, y: 8, scale: 0.98 }}
      initial={{ opacity: 0, x: side === 'left' ? -18 : 18, y: 10, scale: 0.98 }}
      transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="review-floating-avatar" aria-hidden="true">
        {testimonial.name.slice(0, 1)}
      </div>
      <div className="min-w-0">
        <div className="review-floating-meta">
          <strong>{testimonial.name}</strong>
          <span>{testimonial.location}</span>
        </div>
        <p>{testimonial.text}</p>
        {testimonial.badge ? <span className="review-floating-badge">{testimonial.badge}</span> : null}
      </div>
    </motion.article>
  )
}

function FloatingTestimonials() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % floatingTestimonials.length)
    }, 3600)

    return () => window.clearInterval(interval)
  }, [])

  const leftTestimonial = floatingTestimonials[activeIndex]
  const rightTestimonial = floatingTestimonials[(activeIndex + 5) % floatingTestimonials.length]

  return (
    <div className="review-floating-shell" aria-hidden="true">
      <AnimatePresence mode="wait">
        <FloatingReviewCard testimonial={leftTestimonial} side="left" />
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <FloatingReviewCard testimonial={rightTestimonial} side="right" />
      </AnimatePresence>
    </div>
  )
}

function ReviewMedia({ review }: { review: CustomerReview }) {
  if (review.type === 'video') {
    return <ReviewVideo review={review} />
  }

  return <img className="review-stack-media" src={review.src} alt={review.label} loading="lazy" />
}

function ReviewVideo({ review }: { review: CustomerReview }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current

    if (!video) {
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => undefined)
          return
        }

        video.pause()
      },
      { threshold: 0.6 },
    )

    observer.observe(video)

    return () => observer.disconnect()
  }, [])

  return (
    <video ref={videoRef} className="review-stack-media" loop muted playsInline preload="metadata" aria-label={review.label}>
      <source src={review.src} type="video/mp4" />
    </video>
  )
}

export function CustomerReviewsSection() {
  const reviewHeaderRef = useRef<HTMLElement | null>(null)
  const reviewHeaderIsInView = useInView(reviewHeaderRef, { once: true, amount: 0.35 })
  const [soldCount, setSoldCount] = useState(0)

  useEffect(() => {
    if (!reviewHeaderIsInView) {
      return undefined
    }

    const target = 2100
    const duration = 3200
    let animationFrame = 0
    let startTime: number | undefined

    const animateCount = (timestamp: number) => {
      startTime ??= timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setSoldCount(Math.floor(target * progress))

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animateCount)
      }
    }

    animationFrame = window.requestAnimationFrame(animateCount)

    return () => window.cancelAnimationFrame(animationFrame)
  }, [reviewHeaderIsInView])

  return (
    <section
      className="review-stack-section"
      style={{ '--review-bg-image': `url(${reviewSectionBg})` } as StackStyle}
      aria-labelledby="customer-reviews-heading"
      id="reviews"
    >
      <FloatingTestimonials />

      <motion.header
        ref={reviewHeaderRef}
        className="review-stack-header"
        initial={{ opacity: 0, y: 34, scale: 0.96 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.74, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="review-header-emblem"
          animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.07, 1.07, 1] }}
          transition={{ duration: 4.8, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.6 }}
          aria-hidden="true"
        >
          ✦
        </motion.div>
        <motion.p
          className="review-header-kicker"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.18, duration: 0.5 }}
        >
          Real owners. Real backup.
        </motion.p>
        <motion.h2
          id="customer-reviews-heading"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.28, duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
        >
          Loved when power disappears.
        </motion.h2>
        <motion.p
          className="review-header-caption"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.38, duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
        >
          See why Solar Generator customers are choosing quiet, fuel-free backup for the essentials that matter most.
        </motion.p>
        <motion.div
          className="review-header-sales"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.44, duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
        >
          <strong>{soldCount.toLocaleString()}+</strong>
          <span>Solar Generator units already sold</span>
        </motion.div>
        <motion.div
          className="review-header-proof"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.56, duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="review-header-rating"><span aria-hidden="true">★★★★★</span> 4.9/5 rating</span>
          <span className="review-header-chip"><b aria-hidden="true">✓</b> Verified customer stories</span>
          <span className="review-header-chip"><b aria-hidden="true">✓</b> Pay on delivery</span>
        </motion.div>
      </motion.header>

      <div className="review-stack" style={{ '--card-count': customerReviews.length } as StackStyle}>
        {customerReviews.map((review, index) => (
          <article
            className={`review-stack-card review-stack-card--media review-stack-card--${review.type}`}
            key={review.src}
            style={
              {
                '--stack-index': index,
                '--media-aspect': review.aspectRatio,
                '--media-width-ratio': review.widthRatio,
              } as StackStyle
            }
          >
            <ReviewMedia review={review} />
            <div className="review-stack-rating-panel">
              <RatingStars rating={review.rating} />
              <button
                className="review-stack-buy-button"
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('checkout:open', { detail: { section: 'reviews' } }))}
                aria-label="Buy now from customer review"
              >
                Buy now
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
