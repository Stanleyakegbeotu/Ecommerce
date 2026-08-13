import { createClient } from 'npm:@supabase/supabase-js@2'

import { allowedRequestOrigin, json, preflight, rejectedRequestOrigin } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const origin = allowedRequestOrigin(request)
  if (!origin) return json({ error: 'Site configuration is unavailable.' }, 403, rejectedRequestOrigin())
  if (request.method === 'OPTIONS') return preflight(origin)
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Site configuration is unavailable.' }, 503, origin)

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const [{ data, error }, { data: meta, error: metaError }] = await Promise.all([
    supabase.from('app_settings').select('thank_you_path,package_prices,platform_name,platform_logo_path').eq('id', true).maybeSingle(),
    supabase.from('meta_tracking_settings').select('enabled,pixel_id,browser_enabled,page_view_enabled,view_content_enabled,initiate_checkout_enabled,lead_enabled,currency').eq('id', true).maybeSingle(),
  ])
  if (error || !data) return json({ error: 'Site configuration is unavailable.' }, 503, origin)

  // Branding and core public configuration must remain available if the
  // optional tracking configuration is unavailable. In that case browser-side
  // Meta delivery remains explicitly disabled rather than failing closed with
  // the entire public settings response.
  const metaTracking = metaError || !meta
    ? { enabled: false, pixelId: '', browserEnabled: false, pageViewEnabled: false, viewContentEnabled: false, initiateCheckoutEnabled: false, leadEnabled: false, currency: 'NGN' }
    : { enabled: meta.enabled, pixelId: meta.pixel_id, browserEnabled: meta.browser_enabled, pageViewEnabled: meta.page_view_enabled, viewContentEnabled: meta.view_content_enabled, initiateCheckoutEnabled: meta.initiate_checkout_enabled, leadEnabled: meta.lead_enabled, currency: meta.currency }

  return json({
    thankYouPath: data.thank_you_path,
    packagePrices: data.package_prices,
    platformName: data.platform_name,
    platformLogoUrl: data.platform_logo_path ? supabase.storage.from('platform-branding').getPublicUrl(data.platform_logo_path).data.publicUrl : null,
    metaTracking,
  }, 200, origin)
})
