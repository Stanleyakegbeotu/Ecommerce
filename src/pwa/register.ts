import { registerSW } from 'virtual:pwa-register'

export function registerProductionServiceWorker() {
  if (!import.meta.env.PROD) return

  registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new Event('pwa:update-available'))
    },
  })
}
