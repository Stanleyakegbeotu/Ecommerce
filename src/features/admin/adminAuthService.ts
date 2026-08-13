import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

import { getSupabaseBrowserClient } from '@/lib/supabase/browserClient'

export type AdminIdentity = {
  id: string
  email: string | null
}

function client() {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) throw new Error('Admin sign-in is not configured.')
  return supabase
}

function identityFromSession(session: Session | null): AdminIdentity | null {
  if (!session?.user) return null
  return { id: session.user.id, email: session.user.email ?? null }
}

export async function signInAdministrator(email: string, password: string) {
  const { data, error } = await client().auth.signInWithPassword({ email: email.trim(), password })
  if (error || !data.session) throw new Error('We could not sign you in. Check your credentials and try again.')
  return identityFromSession(data.session)!
}

export async function getCurrentAdminIdentity() {
  const { data, error } = await client().auth.getSession()
  if (error) throw new Error('Your admin session is no longer available.')
  return identityFromSession(data.session)
}

export async function getAdminAccessToken() {
  const { data, error } = await client().auth.getSession()
  if (error || !data.session?.access_token) throw new Error('Please sign in to continue.')
  return data.session.access_token
}

export function onAdminAuthStateChange(callback: (identity: AdminIdentity | null, event: AuthChangeEvent) => void) {
  const { data } = client().auth.onAuthStateChange((event, session) => callback(identityFromSession(session), event))
  return () => data.subscription.unsubscribe()
}

export async function signOutAdministrator() {
  await client().auth.signOut()
}
