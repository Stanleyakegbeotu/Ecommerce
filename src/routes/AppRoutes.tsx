import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { LoadingState } from '@/components/common/LoadingState'
import { ROUTES } from '@/constants/routes'
import { MarketingLayout } from '@/layouts/MarketingLayout'

const LandingPage = lazy(() => import('@/pages/LandingPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const ThankYouPage = lazy(() => import('@/pages/ThankYouPage'))
const AdminPage = lazy(() => import('@/pages/AdminPage'))
const ProductLandingPage = lazy(() => import('@/pages/ProductLandingPage'))
const ProductThankYouPage = lazy(() => import('@/pages/ProductThankYouPage'))

function RootEntry() {
  // This Netlify hostname is the private platform entry point. Product pages
  // retain their public, product-specific URLs beneath /products.
  if (window.location.hostname === 'cloudecom.netlify.app') {
    return <Navigate to={ROUTES.admin} replace />
  }

  return <LandingPage />
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingState label="Loading experience" />}>
      <Routes>
        <Route path={ROUTES.admin} element={<AdminPage />} />
        <Route element={<MarketingLayout />}>
          <Route path={ROUTES.home} element={<RootEntry />} />
          <Route path={ROUTES.thankYou} element={<ThankYouPage />} />
          <Route path="/products/:slug" element={<ProductLandingPage />} />
          <Route path="/products/:slug/thank-you" element={<ProductThankYouPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
