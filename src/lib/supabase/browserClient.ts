import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { getSupabaseBrowserConfigurationError, requireSupabaseBrowserConfiguration } from '@/config/environment'

let browserSupabaseClient: SupabaseClient | undefined

export function isSupabaseConfigured() {
  return getSupabaseBrowserConfigurationError() === null
}

export function getSupabaseConfigurationError() {
  return getSupabaseBrowserConfigurationError()
}

/**
 * The only Supabase client included in the browser bundle. It is intentionally
 * created with public configuration only; privileged credentials belong solely
 * in Supabase Function secrets or deployment environments.
 */
export function getSupabaseBrowserClient() {
  if (browserSupabaseClient) return browserSupabaseClient

  const { url, anonKey } = requireSupabaseBrowserConfiguration()
  browserSupabaseClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'propage-admin-auth',
    },
  })
  return browserSupabaseClient
}
