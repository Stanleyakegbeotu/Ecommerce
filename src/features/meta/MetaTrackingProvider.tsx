import { useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { loadMetaTrackingConfiguration, trackMetaProductPage } from '@/features/meta/metaTrackingService'
import { getTrafficAttribution } from '@/lib/trafficAttribution'

export function MetaTrackingProvider() {
  const location = useLocation()
  const refreshTracking = useCallback(() => {
    void loadMetaTrackingConfiguration().then(() => trackMetaProductPage()).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (location.pathname === '/' || /^\/products\/[^/]+$/.test(location.pathname)) getTrafficAttribution()
    refreshTracking()
  }, [location.pathname, location.search, refreshTracking])
  useEffect(() => {
    window.addEventListener('meta:tracking-changed', refreshTracking)
    return () => window.removeEventListener('meta:tracking-changed', refreshTracking)
  }, [refreshTracking])
  return null
}
