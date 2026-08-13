export const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function configuredAllowedOrigins() {
  const configured = Deno.env.get('ALLOWED_ORIGINS') ?? Deno.env.get('ALLOWED_ORIGIN') ?? ''
  return configured.split(',').map((origin) => origin.trim()).filter(Boolean)
}

export function allowedRequestOrigin(request: Request) {
  const requestOrigin = request.headers.get('Origin') ?? ''
  return configuredAllowedOrigins().includes(requestOrigin) ? requestOrigin : null
}

export function rejectedRequestOrigin() {
  return configuredAllowedOrigins()[0] ?? 'null'
}

export function json(body: Record<string, unknown>, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin },
  })
}

export function preflight(origin: string) {
  return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin } })
}
