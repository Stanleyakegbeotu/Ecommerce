import { createClient } from 'npm:@supabase/supabase-js@2'

export type AuthorizedAdministrator = {
  userId: string
  role: 'admin' | 'owner'
  supabase: ReturnType<typeof createClient>
}

export type AdministratorAuthorizationResult =
  | { administrator: AuthorizedAdministrator }
  | { administrator: null; status: 401 | 403 | 503; error: string }

/**
 * Verifies the caller with Supabase Auth, then checks the server-owned active
 * administrator allow-list. No browser-controlled claim grants administration.
 */
export async function authorizeActiveAdministrator(request: Request): Promise<AdministratorAuthorizationResult> {
  const authorization = request.headers.get('Authorization') ?? ''
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!accessToken) return { administrator: null, status: 401, error: 'Authentication is required.' }
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return { administrator: null, status: 503, error: 'Service unavailable.' }

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken)
  if (userError || !userData.user) return { administrator: null, status: 401, error: 'Authentication is required.' }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: administrator, error: administratorError } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', userData.user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (administratorError) return { administrator: null, status: 503, error: 'Service unavailable.' }
  if (!administrator || (administrator.role !== 'admin' && administrator.role !== 'owner')) {
    return { administrator: null, status: 403, error: 'You are not authorized to access this service.' }
  }

  return { administrator: { userId: userData.user.id, role: administrator.role, supabase } }
}
