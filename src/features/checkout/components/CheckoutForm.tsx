import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowUpRight, CheckCircle2, ChevronRight, ClipboardCheck, MapPin, PackageCheck, Phone, UserRound } from 'lucide-react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form'

import checkoutPackageImage from '@/assets/duravolt-checkout-kit.jpeg'
import { PackageSelector } from '@/features/checkout/components/PackageSelector'
import { StateSelector } from '@/features/checkout/components/StateSelector'
import { useCheckoutEngine } from '@/features/checkout/hooks/useCheckoutEngine'
import type { CheckoutFormValues } from '@/features/checkout/hooks/checkoutSchema'
import type { ProductPackage } from '@/features/landing/data/packages'

type CheckoutFormProps = {
  variant: 'popup' | 'inline'
  onSubmit: () => Promise<void>
}

type FieldProps = {
  label: string
  registration: UseFormRegisterReturn
  error?: FieldError
  placeholder: string
  icon?: 'user' | 'phone' | 'map'
  multiline?: boolean
  optional?: boolean
  elevated?: boolean
}

type InlineStep = 1 | 2 | 3

const icons = {
  user: UserRound,
  phone: Phone,
  map: MapPin,
}

const transition = { duration: 0.28, ease: [0.22, 1, 0.36, 1] } as const

function CheckoutField({ label, registration, error, placeholder, icon, multiline = false, optional = false, elevated = false }: FieldProps) {
  const Icon = icon ? icons[icon] : null
  const inputClass =
    `w-full rounded-2xl border border-[#d8e3f2] bg-white px-4 py-4 text-lg font-semibold text-black ${elevated ? 'shadow-[0_20px_34px_rgba(18,104,230,0.16),0_7px_14px_rgba(8,40,82,0.1),inset_0_1px_0_rgba(255,255,255,0.98)]' : 'shadow-[0_10px_22px_rgba(18,104,230,0.09),inset_0_1px_0_rgba(255,255,255,0.98)]'} outline-none transition placeholder:text-[#7b8da8] focus:border-[#1268e6]/60 focus:bg-[#f8fbff] focus:shadow-[0_0_0_4px_rgba(18,104,230,0.1),0_20px_36px_rgba(18,104,230,0.2),inset_0_1px_0_rgba(255,255,255,1)] lg:text-base`

  return (
    <div className="grid gap-2">
      <label className="flex items-center justify-between gap-3 text-base font-black text-black lg:text-sm">
        <span>{label}</span>
        {optional ? <span className="text-xs font-bold text-[#5a7696]">Optional</span> : null}
      </label>
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-4 top-4 size-4 text-[#527091]" aria-hidden="true" /> : null}
        {multiline ? (
          <textarea {...registration} rows={4} placeholder={placeholder} className={`${inputClass} min-h-32 resize-none ${Icon ? 'pl-11' : ''}`} />
        ) : (
          <input {...registration} placeholder={placeholder} className={`${inputClass} h-16 ${Icon ? 'pl-11' : ''}`} />
        )}
      </div>
      {error?.message ? <p className="text-sm font-semibold text-red-500">{error.message}</p> : null}
    </div>
  )
}

function TrustStrip() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {[
        'FREE Solar Panel per Generator',
        'Pay on Delivery',
        '1-Year Warranty',
        '100% Money-Back Guarantee',
      ].map((label) => (
        <span className="flex items-center gap-2 text-xs font-black text-[#315778]" key={label}>
          <CheckCircle2 className="size-4 shrink-0 text-[#16a34a]" aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  )
}

function SelectedPackagePanel({ selectedPackage, onChange }: { selectedPackage: ProductPackage; onChange: () => void }) {
  return (
    <aside className="order-package-preview rounded-[32px] border border-[#e1e8f0] bg-white p-3 shadow-[0_28px_60px_rgba(22,58,104,0.2),0_8px_18px_rgba(8,33,69,0.08)] lg:sticky lg:top-24 sm:p-4">
      <div className="relative h-[238px] overflow-hidden rounded-[24px] bg-[#0a326d] sm:h-[260px]">
        <img src={checkoutPackageImage} alt={selectedPackage.imageAlt} className="absolute inset-0 size-full object-cover object-center" loading="lazy" />
        <div className="absolute inset-0 bg-linear-to-t from-[#061b3b]/38 via-transparent to-[#061b3b]/10" aria-hidden="true" />
        <span className="absolute left-3 top-3 rounded-lg bg-white/88 px-2.5 py-1.5 text-[0.62rem] font-black text-[#102a56] shadow-[0_5px_13px_rgba(0,0,0,0.16)]">Best Value</span>
        <span className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white text-[0.6rem] font-black uppercase tracking-[-0.05em] text-[#1268e6] shadow-[0_6px_16px_rgba(0,0,0,0.2)]">DV</span>
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden="true">
          <span className="size-2 rounded-full bg-white" />
          <span className="size-2 rounded-full bg-white/55" />
          <span className="size-2 rounded-full bg-white/55" />
        </div>
      </div>

      <div className="px-2 pb-2 pt-5 sm:px-3">
        <p className="text-[0.67rem] font-black uppercase tracking-[0.14em] text-[#527392]">Your selected package</p>
        <h3 className="mt-2 text-[1.55rem] font-black leading-tight tracking-[-0.04em] text-black">DuraVolt DSPP-150</h3>
        <p className="mt-1 text-lg font-bold text-[#57718d]">{selectedPackage.title}</p>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#5d7187]">{selectedPackage.offer.join(' · ')}</p>
        <p className="mt-3 text-sm font-medium leading-6 text-[#74899f]">Portable 150W backup power for the everyday devices you need ready.</p>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <span className="inline-flex rounded-full bg-[#edf5ff] px-4 py-2 text-xl font-black tracking-[-0.04em] text-[#102a56]">{selectedPackage.promoPrice}</span>
            <p className="mt-1 pl-1 text-xs font-bold text-[#d33d3d] line-through decoration-2">Normal {selectedPackage.oldPrice}</p>
          </div>
          <button type="button" onClick={onChange} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#102a56] px-4 text-sm font-black text-white shadow-[0_10px_20px_rgba(7,31,63,0.25),inset_0_1px_0_rgba(255,255,255,0.18)] transition active:translate-y-px">
            Change offer
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs font-black text-[#168b46]"><CheckCircle2 className="size-3.5" aria-hidden="true" /> {selectedPackage.savedAmount}</p>
      </div>
    </aside>
  )
}

function StepNavigation({ activeStep, onStepChange }: { activeStep: InlineStep; onStepChange: (step: InlineStep) => void }) {
  const steps: Array<{ step: InlineStep; label: string; icon: typeof PackageCheck }> = [
    { step: 1, label: 'Choose your offer', icon: PackageCheck },
    { step: 2, label: 'Add delivery details', icon: MapPin },
    { step: 3, label: 'Review & place order', icon: ClipboardCheck },
  ]

  return (
    <nav className="grid gap-2" aria-label="Order progress">
      {steps.map(({ step, label, icon: Icon }) => {
        const active = activeStep === step
        const complete = activeStep > step

        return (
          <button
            type="button"
            onClick={() => onStepChange(step)}
            className={`flex min-h-16 items-center gap-3 rounded-2xl border px-4 text-left transition ${
              active
                ? 'border-[#1268e6] bg-[#edf6ff] shadow-[0_0_0_3px_rgba(18,104,230,0.1),0_12px_26px_rgba(18,104,230,0.12)]'
                : 'border-[#d8e3f2] bg-white/80 hover:border-[#a9cbea]'
            }`}
            key={step}
            aria-current={active ? 'step' : undefined}
          >
            <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-black ${active ? 'bg-[#1268e6] text-white' : complete ? 'bg-[#16a34a] text-white' : 'bg-[#eff7ff] text-[#527091]'}`}>
              {complete ? <CheckCircle2 className="size-4" aria-hidden="true" /> : step}
            </span>
            <span className={`text-sm font-black ${active ? 'text-black' : 'text-[#365879]'}`}>{label}</span>
            <Icon className={`ml-auto size-4 ${active ? 'text-[#1268e6]' : 'text-[#8ca6c1]'}`} aria-hidden="true" />
            <ChevronRight className={`size-4 ${active ? 'text-[#1268e6]' : 'text-[#8ca6c1]'}`} aria-hidden="true" />
          </button>
        )
      })}
    </nav>
  )
}

function InlinePackagePanel({ packageOptions, selectedPackageId, selectPackage, onContinue }: { packageOptions: ProductPackage[]; selectedPackageId: string; selectPackage: (packageId: string) => void; onContinue: () => void }) {
  return (
    <section className="grid gap-5">
      <div>
        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#1268e6]">Choose your offer</p>
        <h3 className="mt-2 font-serif text-3xl font-normal leading-none text-black">Select your Solar Generator package</h3>
        <p className="mt-3 text-sm font-medium leading-6 text-black/70">Every generator comes with a FREE solar panel.</p>
      </div>
      <PackageSelector compact elevated className="md:grid-cols-3" packages={packageOptions} selectedPackageId={selectedPackageId} onSelect={selectPackage} />
      <div className="rounded-2xl border border-[#d7e7f5] bg-[#f8fbff] p-4">
        <TrustStrip />
      </div>
      <button type="button" onClick={onContinue} className="min-h-14 w-full rounded-2xl bg-linear-to-r from-[#0b2f64] via-[#1268e6] to-[#0747ad] px-5 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_28px_rgba(18,104,230,0.28),inset_0_1px_0_rgba(255,255,255,0.46)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(18,104,230,0.34)]">
        Continue to Delivery Details <ChevronRight className="ml-1 inline size-4" aria-hidden="true" />
      </button>
    </section>
  )
}

export function MobilePackageOption({ productPackage, selected, onSelect }: { productPackage: ProductPackage; selected: boolean; onSelect: () => void }) {
  const freeSolarPanel = productPackage.offer.find((line) => line.includes('FREE Solar Panel'))?.replace(/^(\d+)\s*×\s*/, '+ $1 ') ?? 'FREE Solar Panel'

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      aria-pressed={selected}
      className={`relative grid min-h-[132px] w-full grid-cols-[94px_minmax(0,1fr)_28px] items-stretch gap-3 overflow-hidden rounded-[22px] border p-2.5 text-left transition ${
        selected
          ? 'border-[#1268e6] bg-[#eff7ff] shadow-[0_0_0_3px_rgba(18,104,230,0.15),0_24px_40px_rgba(18,104,230,0.24),0_9px_18px_rgba(5,32,74,0.14),inset_0_1px_0_rgba(255,255,255,0.98)]'
          : 'border-[#d6e5f4] bg-white shadow-[0_20px_34px_rgba(31,82,137,0.16),0_7px_14px_rgba(5,32,74,0.1),inset_0_1px_0_rgba(255,255,255,0.98)]'
      }`}
    >
      <div className="relative grid min-h-[108px] place-items-center overflow-hidden rounded-[16px] border border-[#d6e6f7] bg-linear-to-br from-[#eef7ff] to-[#d8edff] p-1.5">
        <div className="absolute inset-x-0 bottom-0 h-10 bg-[#1268e6]/10" aria-hidden="true" />
        <img src={checkoutPackageImage} alt="" className="relative z-10 h-[94px] w-full rounded-[12px] object-cover object-center shadow-[0_9px_7px_rgba(0,0,0,0.3)]" loading="lazy" />
      </div>
      <div className="min-w-0 py-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#1268e6]">{productPackage.product}</span>
          {productPackage.badge ? <span className="truncate rounded-full bg-[#1268e6]/10 px-1.5 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.08em] text-[#0755b9]">{productPackage.badge.label.replace(/^[^A-Za-z]+\s*/, '')}</span> : null}
        </div>
        <h3 className="mt-1 text-[1rem] font-black leading-tight text-[#102a56]">{productPackage.title}</h3>
        <p className="mt-1 truncate text-[0.7rem] font-bold text-[#168b46]">{freeSolarPanel}</p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-[0.68rem] font-bold text-[#d33d3d] line-through decoration-2">{productPackage.oldPrice}</span>
          <span className="text-base font-black tracking-[-0.03em] text-[#102a56]">{productPackage.promoPrice}</span>
        </div>
        <p className="mt-0.5 text-[0.62rem] font-black uppercase tracking-[0.06em] text-[#168b46]">{productPackage.savedAmount.replace('You ', '')}</p>
      </div>
      <span className={`mt-2 grid size-7 place-items-center rounded-full border transition ${selected ? 'border-[#1268e6] bg-[#1268e6] text-white' : 'border-[#b8cee6] bg-white text-transparent'}`} aria-hidden="true">
        <CheckCircle2 className="size-4" />
      </span>
    </motion.button>
  )
}

function MobileInlineOrderForm({ packageOptions, resumePackageId, selectPackage, onSubmit }: { packageOptions: ProductPackage[]; resumePackageId?: string; selectPackage: (packageId: string) => void; onSubmit: () => Promise<void> }) {
  const [mobilePackageId, setMobilePackageId] = useState(resumePackageId ?? '')
  const [packageError, setPackageError] = useState(false)
  const packageSectionRef = useRef<HTMLDivElement>(null)
  const selectedMobilePackage = packageOptions.find((productPackage) => productPackage.id === mobilePackageId)

  const choosePackage = (packageId: string) => {
    setMobilePackageId(packageId)
    setPackageError(false)
    selectPackage(packageId)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!mobilePackageId) {
      setPackageError(true)
      packageSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    void onSubmit()
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit} noValidate>
      <div className="px-1">
        <p className="text-[0.64rem] font-black uppercase tracking-[0.16em] text-[#1268e6]">Choose your offer</p>
        <h3 id="mobile-package-heading" className="mt-1 text-xl font-black tracking-[-0.035em] text-[#102a56]">Select your Solar Generator package</h3>
        <p className="mt-1 text-xs font-semibold leading-5 text-[#5b7795]">Every generator comes with a FREE solar panel.</p>
      </div>
      <section ref={packageSectionRef} className={`scroll-mt-24 transition ${packageError ? 'rounded-[24px] border border-red-400 bg-red-50 p-3 shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`} aria-labelledby="mobile-package-heading">
        <div className="grid gap-2.5" role="radiogroup" aria-label="Solar Generator package">
          {packageOptions.map((productPackage) => (
            <MobilePackageOption key={productPackage.id} productPackage={productPackage} selected={mobilePackageId === productPackage.id} onSelect={() => choosePackage(productPackage.id)} />
          ))}
        </div>
        {packageError ? <p className="mt-3 flex items-center gap-2 px-1 text-sm font-black text-red-600" role="alert"><span className="grid size-5 place-items-center rounded-full bg-red-100 text-xs">!</span>Please select a package before placing your order.</p> : null}
      </section>

      <section className="grid gap-5">
        <div>
          <p className="text-[0.64rem] font-black uppercase tracking-[0.16em] text-[#1268e6]">Delivery details</p>
          <h3 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#102a56]">Where should we deliver?</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-[#5b7795]">Enter the details our confirmation team should use.</p>
        </div>
        <DeliveryFields elevated />
        <div className="rounded-2xl border border-[#d7e7f5] bg-[#f8fbff] p-3.5">
          <TrustStrip />
          <p className="mt-3 border-t border-[#dceaf7] pt-3 text-xs font-bold leading-5 text-[#315778]">Free Delivery in Lagos & Abuja</p>
        </div>
        <button type="submit" className="min-h-15 w-full rounded-2xl bg-linear-to-r from-[#0b2f64] via-[#1268e6] to-[#0747ad] px-4 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_16px_30px_rgba(18,104,230,0.3),inset_0_1px_0_rgba(255,255,255,0.46)] transition active:translate-y-px">
          {selectedMobilePackage ? `Place My Order — ${selectedMobilePackage.promoPrice}` : 'Place My Order'}
        </button>
        <p className="-mt-2 text-center text-[0.7rem] font-semibold leading-5 text-[#5b7795]">No online payment required. We will call to confirm before dispatch.</p>
      </section>
    </form>
  )
}

function DeliveryDetails({ children, onBack, onReview }: { children: ReactNode; onBack: () => void; onReview: () => void }) {
  return (
    <section className="grid gap-5">
      <div>
        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#1268e6]">Step 2 · Delivery details</p>
        <h3 className="mt-2 font-serif text-3xl font-normal leading-none text-black">Where should we deliver your order?</h3>
        <p className="mt-3 text-sm font-medium leading-6 text-black/70">Use the phone number our confirmation team should call before dispatch.</p>
      </div>
      {children}
      <div className="rounded-2xl border border-[#cde2f6] bg-[#eff7ff] p-4 text-sm font-semibold text-[#244b72]">
        <strong className="text-black">Payment method: Pay on Delivery.</strong> Free delivery applies to Lagos & Abuja.
      </div>
      <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
        <button type="button" onClick={onBack} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#bfd8ef] bg-white px-5 text-sm font-black text-[#1268e6]">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </button>
        <button type="button" onClick={onReview} className="min-h-14 rounded-2xl bg-linear-to-r from-[#0b2f64] via-[#1268e6] to-[#0747ad] px-5 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_28px_rgba(18,104,230,0.28),inset_0_1px_0_rgba(255,255,255,0.46)]">
          Review My Order <ChevronRight className="ml-1 inline size-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

function InlineOrderReview({ selectedPackage, customer, onBack }: { selectedPackage: ProductPackage; customer: CheckoutFormValues; onBack: () => void }) {
  return (
    <section className="grid gap-5">
      <div>
        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#1268e6]">Step 3 · Review & place order</p>
        <h3 className="mt-2 font-serif text-3xl font-normal leading-none text-black">Everything looks right.</h3>
      </div>
      <div className="grid gap-5 rounded-[24px] border border-[#c7def2] bg-[#f8fbff] p-5 shadow-[0_12px_26px_rgba(18,104,230,0.08)] sm:grid-cols-2">
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.15em] text-[#5a7696]">Your package</p>
          <p className="mt-2 text-xl font-black text-black">{selectedPackage.title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-black/70">{selectedPackage.offer.join(' · ')}</p>
          <div className="mt-4 grid gap-2 text-sm font-bold text-[#315778]">
            <span>Pay on Delivery</span>
            <span>Free Delivery in Lagos & Abuja</span>
            <span>1-Year Warranty</span>
            <span>100% Money-Back Guarantee</span>
          </div>
        </div>
        <div className="rounded-2xl border border-[#d4e6f7] bg-white p-4">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.15em] text-[#5a7696]">Delivery details</p>
          <p className="mt-2 font-black text-black">{customer.fullName}</p>
          <p className="mt-1 text-sm font-semibold text-black/70">{customer.phoneNumber}</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-black/70">{customer.address}, {customer.state}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-[24px] border border-[#bfdcf6] bg-linear-to-r from-[#eff8ff] via-white to-[#eff8ff] p-5">
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.15em] text-[#5a7696]">Total to pay on delivery</p>
          <p className="mt-1 text-4xl font-black tracking-[-0.05em] text-black">{selectedPackage.promoPrice}</p>
          <p className="mt-1 text-sm font-bold text-[#dc4c4c] line-through decoration-2">Normal price {selectedPackage.oldPrice}</p>
        </div>
        <p className="rounded-full bg-[#16a34a]/10 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-black">{selectedPackage.savedAmount}</p>
      </div>
      <button type="button" onClick={onBack} className="justify-self-start text-sm font-black text-[#1268e6] underline underline-offset-4">Edit delivery details</button>
    </section>
  )
}

function DeliveryFields({ elevated = false }: { elevated?: boolean }) {
  const { form } = useCheckoutEngine()
  const errors = form.formState.errors

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <CheckoutField label="Full Name" registration={form.register('fullName')} error={errors.fullName} placeholder="Enter your full name" icon="user" elevated={elevated} />
      <CheckoutField label="Phone Number" registration={form.register('phoneNumber')} error={errors.phoneNumber} placeholder="0800 000 0000" icon="phone" elevated={elevated} />
      <CheckoutField label="WhatsApp Number" registration={form.register('whatsappNumber')} error={errors.whatsappNumber} placeholder="Optional WhatsApp number" icon="phone" optional elevated={elevated} />
      <StateSelector form={form} elevated={elevated} />
      <div className="md:col-span-2">
        <CheckoutField label="Detailed Address" registration={form.register('address')} error={errors.address} placeholder="House number, street, area, nearest landmark" icon="map" multiline elevated={elevated} />
      </div>
      <div className="md:col-span-2">
        <CheckoutField label="Delivery Note" registration={form.register('deliveryNote')} error={errors.deliveryNote} placeholder="Best time to call, delivery preference, or extra directions" multiline optional elevated={elevated} />
      </div>
    </div>
  )
}

export function CheckoutForm({ variant, onSubmit }: CheckoutFormProps) {
  const { form, packageOptions, resumePackageId, selectedPackage, selectedPackageId, selectPackage, setPopupStep } = useCheckoutEngine()
  const [inlineStep, setInlineStep] = useState<InlineStep>(1)
  const isInline = variant === 'inline'
  const formFields: Array<keyof CheckoutFormValues> = ['fullName', 'phoneNumber', 'whatsappNumber', 'state', 'address', 'deliveryNote']

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void onSubmit()
  }

  const openStep = async (step: InlineStep) => {
    if (step === 3) {
      const valid = await form.trigger(formFields)
      if (!valid) {
        setInlineStep(2)
        return
      }
    }
    setInlineStep(step)
  }

  if (isInline) {
    return (
      <>
        <div className="md:hidden">
          <MobileInlineOrderForm key={resumePackageId ?? 'no-resume-package'} packageOptions={packageOptions} resumePackageId={resumePackageId} selectPackage={selectPackage} onSubmit={onSubmit} />
        </div>
        <form className="hidden gap-4 md:grid" onSubmit={handleSubmit}>
          <StepNavigation activeStep={inlineStep} onStepChange={(step) => void openStep(step)} />
          <div className="overflow-hidden">
            <AnimatePresence mode="wait">
              {inlineStep === 1 ? (
                <motion.div key="packages" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={transition}>
                  <InlinePackagePanel packageOptions={packageOptions} selectedPackageId={selectedPackageId} selectPackage={selectPackage} onContinue={() => setInlineStep(2)} />
                </motion.div>
              ) : null}
              {inlineStep === 2 ? (
                <motion.div key="delivery" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={transition}>
                  <DeliveryDetails onBack={() => setInlineStep(1)} onReview={() => void openStep(3)}>
                    <DeliveryFields elevated />
                  </DeliveryDetails>
                </motion.div>
              ) : null}
              {inlineStep === 3 ? (
                <motion.div key="review" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={transition}>
                  <InlineOrderReview selectedPackage={selectedPackage} customer={form.getValues()} onBack={() => setInlineStep(2)} />
                  <button type="submit" className="mt-5 min-h-16 w-full rounded-2xl bg-linear-to-r from-[#0b2f64] via-[#1268e6] to-[#0747ad] px-5 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_18px_36px_rgba(18,104,230,0.32),inset_0_2px_0_rgba(255,255,255,0.46),inset_0_-4px_0_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5">
                    Place Order
                  </button>
                  <p className="mt-3 text-center text-xs font-semibold text-black/70">No online payment required. We will call to confirm your order before dispatch.</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </form>
      </>
    )
  }

  return (
    <form id="popup-checkout-form" className="grid gap-6 lg:grid-cols-[370px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)] lg:items-start" onSubmit={handleSubmit}>
      <div className="grid gap-5 rounded-[30px] border border-[#d8e3f2] bg-white p-5 shadow-[0_18px_44px_rgba(39,89,154,0.11),inset_0_1px_0_rgba(255,255,255,0.95)] sm:p-6 lg:col-start-2 lg:row-start-1">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#1268e6]">Delivery Details</p>
          <h3 className="mt-2 font-serif text-3xl font-normal leading-none text-black lg:text-4xl">Where should we deliver?</h3>
        </div>
        <DeliveryFields elevated />
      </div>
      <SelectedPackagePanel selectedPackage={selectedPackage} onChange={() => setPopupStep('packages')} />
      <button type="submit" className="hidden min-h-16 rounded-2xl bg-linear-to-r from-[#0b2f64] via-[#1268e6] to-[#0747ad] px-5 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_18px_36px_rgba(18,104,230,0.32)] lg:col-start-2 lg:block">
        Place Order Now
      </button>
    </form>
  )
}
