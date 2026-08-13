import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'

import { LoadingState } from '@/components/common/LoadingState'
import { ROUTES } from '@/constants/routes'
import { MarketingLayout } from '@/layouts/MarketingLayout'

const LandingPage = lazy(() => import('@/pages/LandingPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const ThankYouPage = lazy(() => import('@/pages/ThankYouPage'))
const AdminPage = lazy(() => import('@/pages/AdminPage'))
const ProductLandingPage = lazy(() => import('@/pages/ProductLandingPage'))
const ProductThankYouPage = lazy(() => import('@/pages/ProductThankYouPage'))

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingState label="Loading experience" />}>
      <Routes>
        <Route path={ROUTES.admin} element={<AdminPage />} />
        <Route element={<MarketingLayout />}>
          <Route path={ROUTES.home} element={<LandingPage />} />
          <Route path={ROUTES.thankYou} element={<ThankYouPage />} />
          <Route path="/products/:slug" element={<ProductLandingPage />} />
          <Route path="/products/:slug/thank-you" element={<ProductThankYouPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
