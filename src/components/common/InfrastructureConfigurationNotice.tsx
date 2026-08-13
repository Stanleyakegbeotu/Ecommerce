import { getSupabaseConfigurationError } from '@/lib/supabase/browserClient'

/** Visible only for an incomplete build; configured production UI is unchanged. */
export function InfrastructureConfigurationNotice() {
  const configurationError = getSupabaseConfigurationError()
  if (!configurationError) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[100] border-b border-amber-300/45 bg-amber-50 px-4 py-3 text-center text-xs font-semibold text-amber-950 shadow-lg" role="alert">
      {configurationError}
    </div>
  )
}
