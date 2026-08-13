import { CheckCircle2, PlayCircle, ShieldCheck } from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { useEffect, useRef } from 'react'

import productImage from '@/assets/solar-gen-no-fuel-wahala.jpeg'
import aboutProductVideo from '@/assets/solar-gen-about-product.mp4'

const keyReasons = [
  {
    title: 'A practical answer to everyday power cuts',
    copy: 'The 150W DuraVolt DSPP-150 gives you dependable backup for compatible essentials when public power goes off.',
  },
  {
    title: 'Keep your important devices ready',
    copy: 'Use it for compatible phones, bulbs, routers, fans, laptops, and other low-power essentials at home, school, or work.',
  },
  {
    title: 'Spend less time worrying about petrol',
    copy: 'Recharge with solar power and enjoy quiet backup without petrol costs, fumes, or generator noise.',
  },
  {
    title: 'Easy to carry where you need it',
    copy: 'Its compact portable design makes it useful for your home, hostel, office, shop, or a small business setup.',
  },
] as const

const orderConfidence = [
  '1 FREE solar panel included with every generator',
  'Pay on Delivery—no online payment required',
  'Free Delivery in Lagos & Abuja',
  '1-Year Warranty and 100% Money-Back Guarantee',
] as const

export function AboutProductVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const sectionRef = useRef<HTMLElement | null>(null)
  const isInView = useInView(sectionRef, { amount: 0.35 })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isInView) {
      video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }, [isInView])

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#f6faff] px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="about-video-heading">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_22%,rgba(97,165,255,0.22),transparent_27%),radial-gradient(circle_at_88%_78%,rgba(18,104,230,0.12),transparent_30%)]" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-[390px]"
        >
          <div className="overflow-hidden rounded-[30px] border-[6px] border-[#102a56] bg-[#102a56] shadow-[0_30px_70px_rgba(12,58,114,0.3),inset_0_1px_0_rgba(255,255,255,0.22)]">
            <video ref={videoRef} className="block aspect-[9/16] w-full bg-black object-contain" playsInline loop preload="metadata" controls>
              <source src={aboutProductVideo} type="video/mp4" />
            </video>
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs font-bold leading-5 text-[#466889]">
            <PlayCircle className="size-4 shrink-0 text-[#1268e6]" aria-hidden="true" /> Watch with sound to see the product clearly.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={isInView ? { opacity: 1, x: 0 } : undefined}
          transition={{ duration: 0.56, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-[#1268e6]">A closer look</p>
          <h2 id="about-video-heading" className="mt-4 max-w-xl font-serif text-5xl font-normal leading-[0.93] tracking-normal text-[#102a56] sm:text-6xl">
            See exactly what keeps your essentials powered.
          </h2>
          <p className="mt-6 max-w-xl text-base font-medium leading-8 text-[#486989] lg:text-lg">
            This compact Solar Generator is designed for the real-life moments when you need a clean, quiet, and portable backup—not another fuel bill.
          </p>
          <div className="mt-7 border-y border-[#cfe1f4] py-5 text-sm font-bold leading-7 text-[#23486f]">
            <p>150W essential backup power</p>
            <p className="mt-2">Portable, rechargeable, and solar-ready</p>
            <p className="mt-2">Built for home, student, office, and small-business needs</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export function AboutProductSection() {
  return (
    <section id="about" className="relative overflow-hidden bg-white px-4 py-16 text-[#102a56] sm:px-6 lg:px-8 lg:py-24" aria-labelledby="about-product-heading">
      <div className="pointer-events-none absolute bottom-0 right-0 size-[32rem] rounded-full bg-[#dceeff]/70 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-[#1268e6]">About the Solar Generator</p>
          <h2 id="about-product-heading" className="mt-4 font-serif text-5xl font-normal leading-[0.93] tracking-normal text-[#102a56] sm:text-6xl">
            A smarter backup for the moments that matter.
          </h2>
          <p className="mt-6 text-base font-medium leading-8 text-[#476787] lg:text-lg">
            The DuraVolt DSPP-150 is a portable 150W Solar Generator that helps you stay prepared during outages—without petrol, loud noise, or unnecessary stress.
          </p>
        </motion.div>

        <ol className="mt-10 border-y border-[#d7e6f4]">
          {keyReasons.map(({ title, copy }, index) => (
            <motion.li
              key={title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.42, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 border-b border-[#d7e6f4] py-6 last:border-b-0 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-6 sm:py-7"
            >
              <span className="font-serif text-3xl leading-none text-[#1268e6] sm:text-4xl">0{index + 1}</span>
              <div>
                <h3 className="text-xl font-black tracking-[-0.025em] text-[#102a56] sm:text-2xl">{title}</h3>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-[#52728f] sm:text-base">{copy}</p>
              </div>
            </motion.li>
          ))}
        </ol>

        <div className="mt-10 grid gap-x-10 gap-y-3 border-t border-[#bcd8f2] pt-6 sm:grid-cols-2">
          <p className="sm:col-span-2 text-[0.7rem] font-black uppercase tracking-[0.18em] text-[#1268e6]">Why ordering feels safe</p>
          {orderConfidence.map((item) => (
            <p className="flex gap-2 text-sm font-bold leading-6 text-[#284c72]" key={item}>
              <CheckCircle2 className="mt-1 size-4 shrink-0 text-[#168b46]" aria-hidden="true" />
              {item}
            </p>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-2 text-sm font-black text-[#102a56]">
          <ShieldCheck className="size-5 text-[#1268e6]" aria-hidden="true" /> Quiet backup power, made simple.
        </div>
      </div>
    </section>
  )
}

export function AboutProductImage() {
  return (
    <section className="relative overflow-hidden bg-linear-to-b from-white via-[#f4f9ff] to-[#f4f8ff] px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pb-12 lg:pt-4" aria-label="Solar Generator in use">
      <div className="relative mx-auto max-w-2xl overflow-hidden rounded-[38px] border border-[#c8dff4] bg-white p-3 shadow-[0_28px_64px_rgba(13,65,123,0.18),inset_0_1px_0_rgba(255,255,255,0.98)]">
        <img
          src={productImage}
          alt="Solar Generator portable solar generator—no more fuel wahala"
          className="aspect-[4/5] w-full rounded-[30px] object-cover object-center"
          loading="lazy"
        />
      </div>
    </section>
  )
}
