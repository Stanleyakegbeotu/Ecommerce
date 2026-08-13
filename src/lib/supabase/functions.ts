import { getSupabaseBrowserClient } from '@/lib/supabase/browserClient'

function requestFailure(functionName: string) {
  return new Error(`The ${functionName} service is unavailable. Please try again.`)
}

function normalizeHeaders(headers: HeadersInit) {
  return Object.fromEntries(new Headers(headers).entries())
}

export async function invokeSupabaseFunction<TResponse>(functionName: string, payload: unknown, extraHeaders: HeadersInit = {}) {
  const { data, error } = await getSupabaseBrowserClient().functions.invoke<TResponse>(functionName, {
    body: payload as never,
    headers: normalizeHeaders(extraHeaders),
  })

  if (error || data == null) throw requestFailure(functionName)
  return data
}

export async function invokeSupabaseFunctionFormData<TResponse>(functionName: string, payload: FormData, extraHeaders: HeadersInit = {}) {
  const { data, error } = await getSupabaseBrowserClient().functions.invoke<TResponse>(functionName, {
    body: payload,
    headers: normalizeHeaders(extraHeaders),
  })

  if (error || data == null) throw requestFailure(functionName)
  return data
}
