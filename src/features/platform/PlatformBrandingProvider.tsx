import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { fallbackPlatformBranding, PlatformBrandingContext, type PlatformBranding } from '@/features/platform/platformBrandingContext'
import { invokeSupabaseFunction } from '@/lib/supabase/functions'

type PublicSettingsResponse = {
  platformName?: unknown
  platformLogoUrl?: unknown
}

function normalizeBranding(value: PublicSettingsResponse): PlatformBranding {
  return {
    platformName: typeof value.platformName === 'string' && value.platformName.trim() ? value.platformName.trim() : fallbackPlatformBranding.platformName,
    platformLogoUrl: typeof value.platformLogoUrl === 'string' && value.platformLogoUrl.startsWith('https://') ? value.platformLogoUrl : null,
  }
}

export function PlatformBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<PlatformBranding>(fallbackPlatformBranding)
  const refresh = useCallback(async () => {
    try {
      const response = await invokeSupabaseFunction<PublicSettingsResponse>('get-public-site-settings', {})
      setBranding(normalizeBranding(response))
    } catch {
      // Public branding is non-critical; retain the local application identity if unavailable.
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void refresh() }, 0)
    window.addEventListener('platform:branding-changed', refresh)
    return () => {
      window.clearTimeout(initialLoad)
      window.removeEventListener('platform:branding-changed', refresh)
    }
  }, [refresh])

  useEffect(() => {
    document.title = branding.platformName
  }, [branding.platformName])

  const value = useMemo(() => branding, [branding])
  return <PlatformBrandingContext.Provider value={value}>{children}</PlatformBrandingContext.Provider>
}
