import { createClient } from 'npm:@supabase/supabase-js@2'

import { processPendingMetaDeliveries } from '../_shared/metaConversions.ts'

function equalSecrets(actual: string | null, expected: string) {
  if (!actual || actual.length !== expected.length) return false
  let result = 0
  for (let index = 0; index < expected.length; index += 1) result |= actual.charCodeAt(index) ^ expected.charCodeAt(index)
  return result === 0
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 })
  const processorSecret = Deno.env.get('META_PROCESSOR_SECRET')
  if (!processorSecret || !equalSecrets(request.headers.get('x-meta-processor-secret'), processorSecret)) return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return Response.json({ error: 'Meta service is unavailable.' }, { status: 503 })
  const processed = await processPendingMetaDeliveries(createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }))
  return Response.json({ processed })
})
