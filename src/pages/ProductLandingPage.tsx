import { Navigate, useParams } from 'react-router-dom'

import { getRegisteredProduct } from '@/features/products/productRegistry'
import LandingPage from '@/pages/LandingPage'

export default function ProductLandingPage() {
  const product = getRegisteredProduct(useParams().slug)
  return product ? <LandingPage /> : <Navigate to="/" replace />
}
