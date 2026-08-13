import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'

import { applyPackagePriceOverrides, getAdminSettings, loadAdminSettings, saveAdminOrder, trackAdminEvent, type AdminSettings } from '@/features/admin/adminData'
import { getCurrentProductContext } from '@/features/admin/trackingContext'
import { getMetaAttribution, trackMetaInitiateCheckout, trackMetaLead } from '@/features/meta/metaTrackingService'
import { productPackages, type ProductPackage } from '@/features/landing/data/packages'
import { clearResumeProgress, readResumeProgress, saveResumeProgress } from '@/features/resume/sessionMemory'
import { checkoutFormSchema, type CheckoutFormValues } from '@/features/checkout/hooks/checkoutSchema'
import {
  CheckoutEngineContext,
  type AvailabilityTarget,
  type CheckoutEngineValue,
  type CheckoutOpenContext,
  type InlineView,
  type PackageSelectionOptions,
  type PopupStep,
  type SubmissionSurface,
} from '@/features/checkout/hooks/checkoutEngineContext'

export type OrderConfirmation = {
  id: string
  package: ProductPackage
  customer: CheckoutFormValues
  orderDate: string
  estimatedDelivery: string
  status: 'Awaiting Confirmation'
}

const defaultPackageId = productPackages[1]?.id ?? productPackages[0]?.id ?? ''

function getResumePackageId() {
  const savedPackageId = readResumeProgress()?.selectedPackageId
  return savedPackageId && productPackages.some((productPackage) => productPackage.id === savedPackageId) ? savedPackageId : undefined
}

const defaultValues: CheckoutFormValues = {
  fullName: '',
  phoneNumber: '',
  whatsappNumber: '',
  state: '',
  address: '',
  deliveryNote: '',
}


function createOrderId() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase()

  return `KOG-${datePart}-${randomPart}`
}

function getOrderDate() {
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
}

export function CheckoutEngineProvider({ children }: { children: ReactNode }) {
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(getAdminSettings())
  const [selectedPackageId, setSelectedPackageId] = useState(() => getResumePackageId() ?? defaultPackageId)
  const [resumePackageId, setResumePackageId] = useState<string | undefined>(getResumePackageId)
  const [popupOpen, setPopupOpen] = useState(false)
  const [popupStep, setPopupStep] = useState<PopupStep>('packages')
  const [availabilityTarget, setAvailabilityTarget] = useState<AvailabilityTarget>(null)
  const [inlineView, setInlineView] = useState<InlineView>('form')
  const [lastOrder, setLastOrder] = useState<OrderConfirmation | null>(null)
  const submittingOrderRef = useRef(false)
  const confirmingAvailabilityRef = useRef(false)

  const form = useForm<CheckoutFormValues>({
    defaultValues,
    mode: 'onTouched',
    resolver: zodResolver(checkoutFormSchema),
  })

  const packageOptions = useMemo(() => applyPackagePriceOverrides(productPackages, adminSettings), [adminSettings])

  const selectedPackage = useMemo(
    () => packageOptions.find((productPackage) => productPackage.id === selectedPackageId) ?? packageOptions[0],
    [packageOptions, selectedPackageId],
  )

  useEffect(() => {
    loadAdminSettings()
      .then((settings) => {
        setAdminSettings(settings)
      })
      .catch(() => undefined)
    trackAdminEvent('visitor', { section: 'landing' }).catch(() => undefined)
  }, [])

  useEffect(() => {
    const handleOpenCheckout = (event: Event) => {
      const detail = event instanceof CustomEvent ? (event.detail as CheckoutOpenContext & { packageId?: string } | undefined) : undefined
      const packageId = detail?.packageId
      const validPackageId = packageId && productPackages.some((productPackage) => productPackage.id === packageId) ? packageId : undefined
      if (validPackageId) {
        setSelectedPackageId(validPackageId)
        setResumePackageId(validPackageId)
      }
      const packageToResume = validPackageId ?? selectedPackageId
      setResumePackageId(packageToResume)
      saveResumeProgress({ selectedPackageId: packageToResume, checkoutStarted: true, lastSection: 'order' })
      trackMetaInitiateCheckout(packageToResume, Number(packageOptions.find((item) => item.id === packageToResume)?.promoPrice.replace(/[^\d]/g, '') ?? 0))
      trackAdminEvent('buy_click', { packageId: validPackageId, section: detail?.section ?? 'landing', surface: 'popup' }).catch(() => undefined)
      setPopupStep('packages')
      setPopupOpen(true)
    }

    window.addEventListener('checkout:open', handleOpenCheckout)

    return () => window.removeEventListener('checkout:open', handleOpenCheckout)
  }, [packageOptions, selectedPackageId])

  useEffect(() => {
    if (!availabilityTarget) {
      confirmingAvailabilityRef.current = false
    }
  }, [availabilityTarget])

  useEffect(() => {
    if (!popupOpen && !availabilityTarget) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [availabilityTarget, popupOpen])

  const openPopup = useCallback((packageId?: string, context?: CheckoutOpenContext) => {
    if (packageId && productPackages.some((productPackage) => productPackage.id === packageId)) {
      setSelectedPackageId(packageId)
    }
    const packageToResume = packageId && productPackages.some((productPackage) => productPackage.id === packageId) ? packageId : selectedPackageId
    setResumePackageId(packageToResume)
    saveResumeProgress({ selectedPackageId: packageToResume, checkoutStarted: true, lastSection: 'order' })
    trackMetaInitiateCheckout(packageToResume, Number(packageOptions.find((item) => item.id === packageToResume)?.promoPrice.replace(/[^\d]/g, '') ?? 0))
    trackAdminEvent('buy_click', { packageId: packageToResume, section: context?.section ?? 'landing', surface: 'popup' }).catch(() => undefined)
    setPopupStep('packages')
    setPopupOpen(true)
  }, [packageOptions, selectedPackageId])

  const closePopup = useCallback(() => {
    if (popupOpen && popupStep !== 'success') {
      window.dispatchEvent(new CustomEvent('checkout:closed', { detail: { popupStep } }))
    }
    setPopupOpen(false)
    setAvailabilityTarget((currentTarget) => (currentTarget === 'popup' ? null : currentTarget))
  }, [popupOpen, popupStep])

  const selectPackage = useCallback((packageId: string, options?: PackageSelectionOptions) => {
    setSelectedPackageId(packageId)
    setResumePackageId(packageId)
    saveResumeProgress({ selectedPackageId: packageId, checkoutStarted: true, lastSection: 'order' })
    const surface = options?.surface ?? (options?.advancePopup ? 'popup' : 'inline')
    trackAdminEvent('package_selected', { packageId, section: options?.section ?? 'order', surface }).catch(() => undefined)
    if (options?.advancePopup) {
      setPopupStep('availability')
      setAvailabilityTarget('popup')
    }
  }, [])

  const submitOrder = useCallback(
    async (values: CheckoutFormValues, surface: SubmissionSurface) => {
      if (submittingOrderRef.current) {
        return
      }

      submittingOrderRef.current = true
      const order: OrderConfirmation = {
        id: createOrderId(),
        package: selectedPackage,
        customer: values,
        orderDate: getOrderDate(),
        estimatedDelivery: '1-3 Business Days',
        status: 'Awaiting Confirmation',
      }

      try {
        const persisted = await saveAdminOrder({
        id: order.id,
        productId: getCurrentProductContext().productId,
        package: order.package,
        customer: order.customer,
        createdAt: new Date().toISOString(),
        estimatedDelivery: order.estimatedDelivery,
        status: 'New',
        source: surface,
        }, getMetaAttribution())
        trackAdminEvent('form_submitted', { packageId: selectedPackage.id, section: 'order', surface }).catch(() => undefined)

      trackMetaLead(persisted.leadEventId ?? null, selectedPackage.id, Number(selectedPackage.promoPrice.replace(/[^\d]/g, '')))
      clearResumeProgress()
      setResumePackageId(undefined)
      setLastOrder(order)
      if (surface === 'inline') {
        setInlineView('success')
      }
      if (surface === 'popup') {
        setPopupStep('success')
        setPopupOpen(true)
      }
      } finally {
        submittingOrderRef.current = false
      }
    },
    [selectedPackage],
  )

  const requestInlineAvailability = useCallback(async () => {
    const isValid = await form.trigger()
    if (isValid) setAvailabilityTarget('inline')
  }, [form])

  const submitPopupOrder = useCallback(async () => {
    const isValid = await form.trigger()
    if (isValid) await submitOrder(form.getValues(), 'popup')
  }, [form, submitOrder])

  const confirmAvailability = useCallback(async () => {
    if (!availabilityTarget) {
      return
    }
    if (confirmingAvailabilityRef.current) {
      return
    }
    confirmingAvailabilityRef.current = true

    if (availabilityTarget === 'popup') {
      trackAdminEvent('availability_confirmed', { section: 'order', surface: 'popup' }).catch(() => undefined)
      setAvailabilityTarget(null)
      setPopupStep('form')
      return
    }

    if (availabilityTarget === 'inline') {
      const isValid = await form.trigger()
      if (!isValid) {
        setAvailabilityTarget(null)
        return
      }
      trackAdminEvent('availability_confirmed', { section: 'order', surface: 'inline' }).catch(() => undefined)
      setAvailabilityTarget(null)
      await submitOrder(form.getValues(), 'inline')
    }
  }, [availabilityTarget, form, submitOrder])

  const declineAvailability = useCallback(() => {
    if (availabilityTarget === 'popup') {
      setAvailabilityTarget(null)
      setPopupStep('unavailable')
      window.setTimeout(() => {
        setPopupOpen(false)
        setPopupStep('packages')
      }, 1500)
      return
    }

    setAvailabilityTarget(null)
  }, [availabilityTarget])

  const resetOrder = useCallback(() => {
    form.reset(defaultValues)
    setSelectedPackageId(defaultPackageId)
    setResumePackageId(undefined)
    setLastOrder(null)
    setInlineView('form')
    setPopupStep('packages')
    clearResumeProgress()
  }, [form])

  const value = useMemo<CheckoutEngineValue>(
    () => ({
      availabilityTarget,
      closePopup,
      confirmAvailability,
      declineAvailability,
      form,
      inlineView,
      lastOrder,
      openPopup,
      packageOptions,
      popupOpen,
      popupStep,
      resumePackageId,
      requestInlineAvailability,
      resetOrder,
      selectedPackage,
      selectedPackageId,
      selectPackage,
      setPopupStep,
      submitPopupOrder,
    }),
    [
      availabilityTarget,
      closePopup,
      confirmAvailability,
      declineAvailability,
      form,
      inlineView,
      lastOrder,
      openPopup,
      packageOptions,
      popupOpen,
      popupStep,
      resumePackageId,
      requestInlineAvailability,
      resetOrder,
      selectedPackage,
      selectedPackageId,
      selectPackage,
      submitPopupOrder,
    ],
  )

  return <CheckoutEngineContext.Provider value={value}>{children}</CheckoutEngineContext.Provider>
}
