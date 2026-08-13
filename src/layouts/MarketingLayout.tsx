import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'

import solarPanelBackground from '@/assets/solar-panel-site-background.jpeg'
import { Footer } from '@/components/layout/Footer'
import { Navbar } from '@/components/layout/Navbar'
import { AdminDashboard } from '@/features/admin/AdminDashboard'
import { PopupCheckout } from '@/features/checkout/components/PopupCheckout'
import { CheckoutEngineProvider } from '@/features/checkout/hooks/CheckoutEngine'
import { ExitFeedbackProvider } from '@/features/exitFeedback/ExitFeedbackProvider'
import { MetaTrackingProvider } from '@/features/meta/MetaTrackingProvider'
import { ResumeExperience } from '@/features/resume/ResumeExperience'

export function MarketingLayout() {
  const [adminOpen, setAdminOpen] = useState(false)

  useEffect(() => {
    const openAdmin = () => setAdminOpen(true)
    window.addEventListener('admin:request', openAdmin)

    return () => window.removeEventListener('admin:request', openAdmin)
  }, [])

  useEffect(() => {
    document.body.dataset.adminOpen = String(adminOpen)

    return () => {
      delete document.body.dataset.adminOpen
    }
  }, [adminOpen])

  return (
    <CheckoutEngineProvider>
      <ExitFeedbackProvider>
        <MetaTrackingProvider />
        <div className="solar-site min-h-screen bg-ink-950 text-stone-100">
          <div className="solar-site-background" style={{ backgroundImage: `url(${solarPanelBackground})` }} aria-hidden="true" />
          <div className="solar-site-background-wash" aria-hidden="true" />
          <Navbar />
          <main id="main-content">
            <Outlet />
          </main>
          <Footer />
          <PopupCheckout />
          <ResumeExperience />
          {adminOpen ? <AdminDashboard onClose={() => setAdminOpen(false)} /> : null}
        </div>
      </ExitFeedbackProvider>
    </CheckoutEngineProvider>
  )
}
