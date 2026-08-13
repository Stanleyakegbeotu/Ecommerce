import { BrowserRouter } from 'react-router-dom'

import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { InfrastructureConfigurationNotice } from '@/components/common/InfrastructureConfigurationNotice'
import { AdminPwaLaunchSplash } from '@/features/admin/AdminPwaLaunchSplash'
import { PlatformBrandingProvider } from '@/features/platform/PlatformBrandingProvider'
import { AppRoutes } from '@/routes/AppRoutes'

export function App() {
  return (
    <ErrorBoundary>
      <InfrastructureConfigurationNotice />
      <PlatformBrandingProvider>
        <AdminPwaLaunchSplash />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </PlatformBrandingProvider>
    </ErrorBoundary>
  )
}
