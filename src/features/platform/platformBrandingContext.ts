import { createContext, useContext } from 'react'

import { APPLICATION_IDENTITY } from '@/config/applicationIdentity'

export type PlatformBranding = {
  platformName: string
  platformLogoUrl: string | null
}

export const fallbackPlatformBranding: PlatformBranding = {
  platformName: APPLICATION_IDENTITY.name,
  platformLogoUrl: null,
}

export const PlatformBrandingContext = createContext<PlatformBranding>(fallbackPlatformBranding)

export function usePlatformBranding() {
  return useContext(PlatformBrandingContext)
}
