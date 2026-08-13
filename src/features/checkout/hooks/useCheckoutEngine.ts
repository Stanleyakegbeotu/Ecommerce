import { useContext } from 'react'

import { CheckoutEngineContext } from '@/features/checkout/hooks/checkoutEngineContext'

export function useCheckoutEngine() {
  const context = useContext(CheckoutEngineContext)

  if (!context) {
    throw new Error('useCheckoutEngine must be used within CheckoutEngineProvider')
  }

  return context
}
