import { Navigate, useParams, useSearchParams } from 'react-router-dom'

import { getRegisteredProduct } from '@/features/products/productRegistry'
import ThankYouPage from '@/pages/ThankYouPage'

export default function ProductThankYouPage() {
  const [params] = useSearchParams()
  const { slug } = useParams()
  const product = getRegisteredProduct(slug)
  if (!product) return <Navigate to="/" replace />
  return <ThankYouPage preview={params.get('preview') === '1'} productName={product.name} />
}
