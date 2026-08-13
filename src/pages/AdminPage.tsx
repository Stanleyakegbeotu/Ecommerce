import { useNavigate } from 'react-router-dom'

import { AdminDashboard } from '@/features/admin/AdminDashboard'

export default function AdminPage() {
  const navigate = useNavigate()
  return <AdminDashboard onClose={() => navigate('/', { replace: true })} />
}
