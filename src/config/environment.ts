type BrowserSupabaseConfiguration = {
  url?: string
  anonKey?: string
}

function readBrowserVariable(value: string | undefined) {
  const normalized = value?.trim()
  return normalized || undefined
}

function normalizeSupabaseUrl(value: string | undefined) {
  if (!value) return undefined

  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
    return url.toString().replace(/\/$/, '')
  } catch {
    return undefined
  }
}

const supabaseConfiguration: BrowserSupabaseConfiguration = {
  url: normalizeSupabaseUrl(readBrowserVariable(import.meta.env.VITE_SUPABASE_URL as string | undefined)),
  anonKey: readBrowserVariable(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined),
}

export function getSupabaseBrowserConfiguration() {
  return supabaseConfiguration
}

export function getSupabaseBrowserConfigurationError() {
  if (!supabaseConfiguration.url || !supabaseConfiguration.anonKey) {
    return 'Supabase browser configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for this environment.'
  }

  return null
}

export function requireSupabaseBrowserConfiguration() {
  const error = getSupabaseBrowserConfigurationError()
  if (error) throw new Error(error)
  return supabaseConfiguration as Required<BrowserSupabaseConfiguration>
}
