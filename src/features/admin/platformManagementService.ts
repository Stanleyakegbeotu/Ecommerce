import { getAdminAccessToken } from '@/features/admin/adminAuthService'
import { invokeSupabaseFunction, invokeSupabaseFunctionFormData } from '@/lib/supabase/functions'

export type ManagedProduct = {
  id: string
  name: string
  slug: string
  status: 'draft' | 'active' | 'archived'
  created_at: string
  updated_at: string
}

export type PlatformBranding = { platformName: string; platformLogoUrl: string | null }

async function invokePlatform<T>(payload: unknown) {
  return invokeSupabaseFunction<T>('manage-platform', payload, { Authorization: `Bearer ${await getAdminAccessToken()}` })
}

export async function loadPlatformBranding() {
  return invokePlatform<PlatformBranding>({ action: 'load_settings' })
}

export async function savePlatformName(platformName: string) {
  return invokePlatform<PlatformBranding>({ action: 'save_settings', platformName })
}

export async function uploadPlatformLogo(file: File) {
  const payload = new FormData()
  payload.set('action', 'upload_logo')
  payload.set('file', file)
  return invokeSupabaseFunctionFormData<{ platformLogoUrl: string }>('manage-platform', payload, { Authorization: `Bearer ${await getAdminAccessToken()}` })
}

export async function listManagedProducts() {
  return invokePlatform<{ products: ManagedProduct[] }>({ action: 'list_products' })
}
