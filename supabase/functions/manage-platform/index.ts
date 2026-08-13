import { allowedRequestOrigin, json, preflight, rejectedRequestOrigin } from '../_shared/http.ts'
import { authorizeActiveAdministrator } from '../_shared/adminAuth.ts'

const acceptedTypes = new Map([['image/png', 'png'], ['image/webp', 'webp'], ['image/jpeg', 'jpg']])
const maxLogoBytes = 524_288

Deno.serve(async (request) => {
  const origin = allowedRequestOrigin(request)
  if (!origin) return json({ error: 'Platform service is unavailable.' }, 403, rejectedRequestOrigin())
  if (request.method === 'OPTIONS') return preflight(origin)
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin)
  const authorization = await authorizeActiveAdministrator(request)
  if (!authorization.administrator) return json({ error: authorization.error }, authorization.status, origin)
  const { supabase } = authorization.administrator
  const contentType = request.headers.get('content-type') ?? ''
  const form = contentType.includes('multipart/form-data') ? await request.formData().catch(() => null) : null
  const body = form ? null : await request.json().catch(() => null) as { action?: unknown; platformName?: unknown } | null
  const action = form?.get('action') ?? body?.action
  try {
    if (action === 'list_products') {
      const { data, error } = await supabase.from('products').select('id,name,slug,status,created_at,updated_at').order('created_at')
      if (error) throw error
      return json({ products: data ?? [] }, 200, origin)
    }
    if (action === 'load_settings') {
      const { data, error } = await supabase.from('app_settings').select('platform_name,platform_logo_path').eq('id', true).single()
      if (error || !data) throw error ?? new Error('settings_unavailable')
      const logoUrl = data.platform_logo_path ? supabase.storage.from('platform-branding').getPublicUrl(data.platform_logo_path).data.publicUrl : null
      return json({ platformName: data.platform_name, platformLogoUrl: logoUrl }, 200, origin)
    }
    if (action === 'save_settings') {
      const platformName = typeof body?.platformName === 'string' ? body.platformName.trim() : ''
      if (platformName.length < 1 || platformName.length > 100) return json({ error: 'Platform name must be between 1 and 100 characters.' }, 400, origin)
      const { data, error } = await supabase.from('app_settings').update({ platform_name: platformName }).eq('id', true).select('platform_name,platform_logo_path').single()
      if (error || !data) throw error ?? new Error('settings_unavailable')
      const logoUrl = data.platform_logo_path ? supabase.storage.from('platform-branding').getPublicUrl(data.platform_logo_path).data.publicUrl : null
      return json({ platformName: data.platform_name, platformLogoUrl: logoUrl }, 200, origin)
    }
    if (action === 'upload_logo') {
      const file = form?.get('file')
      if (!(file instanceof File) || !acceptedTypes.has(file.type) || file.size < 1 || file.size > maxLogoBytes) return json({ error: 'Use a PNG, WebP, or JPEG logo smaller than 512 KB.' }, 400, origin)
      const extension = acceptedTypes.get(file.type)!
      const newPath = `logo/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('platform-branding').upload(newPath, file, { contentType: file.type, upsert: false, cacheControl: '3600' })
      if (uploadError) throw uploadError
      const { data: current, error: readError } = await supabase.from('app_settings').select('platform_logo_path').eq('id', true).single()
      if (readError || !current) { await supabase.storage.from('platform-branding').remove([newPath]); throw readError ?? new Error('settings_unavailable') }
      const { error: updateError } = await supabase.from('app_settings').update({ platform_logo_path: newPath }).eq('id', true)
      if (updateError) { await supabase.storage.from('platform-branding').remove([newPath]); throw updateError }
      if (current.platform_logo_path) await supabase.storage.from('platform-branding').remove([current.platform_logo_path])
      return json({ platformLogoUrl: supabase.storage.from('platform-branding').getPublicUrl(newPath).data.publicUrl }, 200, origin)
    }
    return json({ error: 'Unsupported action.' }, 400, origin)
  } catch {
    return json({ error: 'Platform service is unavailable. Please try again.' }, 503, origin)
  }
})
