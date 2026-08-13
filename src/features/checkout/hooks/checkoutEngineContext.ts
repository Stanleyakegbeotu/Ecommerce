import { createContext } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import type { CheckoutFormValues } from '@/features/checkout/hooks/checkoutSchema'
import type { OrderConfirmation } from '@/features/checkout/hooks/CheckoutEngine'
import type { ProductPackage } from '@/features/landing/data/packages'

export type PopupStep = 'packages' | 'availability' | 'form' | 'success' | 'unavailable'
export type AvailabilityTarget = 'popup' | 'inline' | null
export type InlineView = 'form' | 'success'
export type SubmissionSurface = 'popup' | 'inline'
export type CheckoutOpenContext = { section?: string }
export type PackageSelectionOptions = { advancePopup?: boolean; section?: string; surface?: SubmissionSurface }

export type CheckoutEngineValue = {
  availabilityTarget: AvailabilityTarget
  closePopup: () => void
  confirmAvailability: () => Promise<void>
  declineAvailability: () => void
  form: UseFormReturn<CheckoutFormValues>
  inlineView: InlineView
  lastOrder: OrderConfirmation | null
  openPopup: (packageId?: string, context?: CheckoutOpenContext) => void
  packageOptions: ProductPackage[]
  popupOpen: boolean
  popupStep: PopupStep
  resumePackageId?: string
  requestInlineAvailability: () => Promise<void>
  resetOrder: () => void
  selectedPackage: ProductPackage
  selectedPackageId: string
  selectPackage: (packageId: string, options?: PackageSelectionOptions) => void
  setPopupStep: (step: PopupStep) => void
  submitPopupOrder: () => Promise<void>
}

export const CheckoutEngineContext = createContext<CheckoutEngineValue | null>(null)
