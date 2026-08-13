import { motion, type Variants } from 'framer-motion'
import { BatteryCharging, CircleDollarSign, GraduationCap, House, ShieldCheck, Store, VolumeX, Wifi } from 'lucide-react'

import productStation from '@/assets/duravolt-power-station-sticker.png'

const reasons = [
  {
    icon: CircleDollarSign,
    number: '01',
    title: 'No more fuel budget.',
    description: 'Recharge with solar power and cut the recurring cost of petrol for your everyday essentials.',
    proof: 'Spend less. Stay ready.',
    tone: 'green',
  },
  {
    icon: Wifi,
    number: '02',
    title: 'Ready when NEPA goes off.',
    description: 'Keep your phone, router, lights and other low-power essentials within reach during outages.',
    proof: 'Backup without the wahala.',
    tone: 'blue',
  },
  {
    icon: VolumeX,
    number: '03',
    title: 'Quiet power for focus.',
    description: 'No engine noise or fumes—better for late-night studying, customer calls and peaceful rest.',
    proof: 'Study. Work. Rest.',
    tone: 'green',
  },
  {
    icon: BatteryCharging,
    number: '04',
    title: 'Built for daily essentials.',
    description: 'A practical 150W backup for homes, hostels, shops and offices when reliable power matters.',
    proof: 'Portable power, wherever life happens.',
    tone: 'blue',
  },
] as const

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.11, duration: 0.58, ease: [0.22, 1, 0.36, 1] },
  }),
}

export function BenefitsSection() {
  return (
    <section
      id="benefits"
      className="solar-panel-surface solar-panel-surface--right relative isolate overflow-hidden bg-[#eff7ff] px-4 py-18 text-[#102a56] sm:px-6 sm:py-24 lg:px-8 lg:py-28"
      aria-labelledby="benefits-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_24%,rgba(18,104,230,0.16),transparent_25%),radial-gradient(circle_at_92%_8%,rgba(22,163,74,0.13),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(235,246,255,0.84))]" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.32fr)] lg:items-center lg:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.64, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-mint-400/30 bg-white/80 px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.15em] text-[#168b46] shadow-[0_10px_24px_rgba(18,104,230,0.1)]">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Built for Nigerian life
            </div>
            <h2 id="benefits-heading" className="mt-5 max-w-xl font-serif text-5xl font-normal leading-[0.95] tracking-normal text-[#102a56] sm:text-6xl">
              Power that keeps your <span className="text-[#1268e6]">day moving.</span>
            </h2>
            <p className="mt-5 max-w-xl text-base font-medium leading-7 text-[#466384] sm:text-lg sm:leading-8">
              From fuel costs to unexpected outages, the Solar Generator gives your home and hustle a cleaner, quieter way to stay prepared.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                ['Homes', House],
                ['Students', GraduationCap],
                ['Shops & offices', Store],
              ].map(([label, Icon]) => {
                const AudienceIcon = Icon as typeof House

                return (
                  <div className="flex items-center gap-3" key={label as string}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#1268e6]/15 bg-white/90 text-[#1268e6] shadow-[0_8px_18px_rgba(18,104,230,0.1)]">
                      <AudienceIcon className="size-[18px]" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-black text-[#264869]">{label as string}</span>
                  </div>
                )
              })}
            </div>

            <div className="benefits-product-showcase relative mt-8 overflow-hidden rounded-[28px] border border-[#9dc7f4] bg-linear-to-br from-[#061b3b] via-[#0c3a7d] to-[#1268e6] px-5 pb-3 pt-5 shadow-[0_26px_54px_rgba(7,51,105,0.3),inset_0_1px_0_rgba(255,255,255,0.24)] sm:px-7">
              <div className="relative z-10 max-w-[15rem]">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#a7f3c1]">150W essential backup</p>
                <p className="mt-2 text-lg font-black leading-6 text-white">Small enough to carry. Ready for the moments you need it.</p>
              </div>
              <img
                alt="DuraVolt DSPP-150 portable solar generator"
                className="brand-sticker-shake absolute bottom-[-8%] right-[-4%] h-[130px] w-[190px] object-contain drop-shadow-[0_18px_20px_rgba(0,0,0,0.42)] sm:h-[158px] sm:w-[225px]"
                loading="lazy"
                src={productStation}
              />
            </div>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            {reasons.map(({ icon: Icon, number, title, description, proof, tone }, index) => (
              <motion.article
                className="benefit-premium-card group relative overflow-hidden rounded-[28px] border border-[#c5ddf5] bg-white/90 p-5 shadow-[0_18px_42px_rgba(15,71,133,0.13),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl sm:p-6"
                custom={index}
                initial="hidden"
                key={title}
                variants={cardVariants}
                viewport={{ once: true, amount: 0.24 }}
                whileHover={{ y: -7, scale: 1.015 }}
                whileInView="visible"
              >
                <div className={`benefit-premium-orb benefit-premium-orb--${tone}`} aria-hidden="true" />
                <div className="relative flex items-start justify-between gap-4">
                  <span className={`benefit-premium-icon benefit-premium-icon--${tone} grid size-12 place-items-center rounded-2xl`}>
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <span className={`text-xl font-black tracking-[-0.06em] ${tone === 'green' ? 'text-[#16a34a]' : 'text-[#1268e6]'}`}>{number}</span>
                </div>
                <h3 className="relative mt-5 text-[1.35rem] font-black leading-6 tracking-[-0.025em] text-[#102a56]">{title}</h3>
                <p className="relative mt-3 text-sm font-semibold leading-6 text-[#506d8e]">{description}</p>
                <p className={`relative mt-5 border-t pt-4 text-xs font-black ${tone === 'green' ? 'border-mint-400/20 text-[#168b46]' : 'border-[#1268e6]/15 text-[#1268e6]'}`}>
                  {proof}
                </p>
              </motion.article>
            ))}
          </div>
        </div>

        <motion.div
          className="mt-7 flex flex-col gap-3 rounded-[22px] border border-[#bad7f2] bg-white/75 px-5 py-4 text-sm font-semibold text-[#345879] shadow-[0_14px_32px_rgba(18,104,230,0.1)] sm:flex-row sm:items-center sm:justify-between"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.56, delay: 0.2 }}
        >
          <span>Designed for low-power essentials—not heavy-duty appliances.</span>
          <span className="font-black text-[#1268e6]">Clear power. Clear expectations.</span>
        </motion.div>
      </div>
    </section>
  )
}
