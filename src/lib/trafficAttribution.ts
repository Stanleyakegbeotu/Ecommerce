export type TrafficAttribution = {
  fbp: string | null
  fbc: string | null
  fbclid: string | null
  trafficSource: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
  metaAdAccountId: string | null
  metaCampaignId: string | null
  metaAdsetId: string | null
  metaAdId: string | null
}

const storageKey = 'propages:traffic-attribution:v1'
const maximumValueLength = 300

function readCookie(name: string) {
  return document.cookie.split('; ').find((entry) => entry.startsWith(`${name}=`))?.slice(name.length + 1) ?? null
}

function valueFromParams(params: URLSearchParams, keys: string[]) {
  for (const key of keys) {
    const value = params.get(key)?.trim()
    if (value && value.length <= maximumValueLength) return value
  }
  return null
}

function safeStorageRead(): Partial<TrafficAttribution> {
  try {
    const raw = window.sessionStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => value === null || (typeof value === 'string' && value.length <= maximumValueLength))) as Partial<TrafficAttribution>
  } catch {
    return {}
  }
}

function safeStorageWrite(value: TrafficAttribution) {
  try { window.sessionStorage.setItem(storageKey, JSON.stringify(value)) } catch { /* Attribution remains available for this request. */ }
}

function referrerHost() {
  if (!document.referrer) return null
  try { return new URL(document.referrer).hostname || null } catch { return null }
}

/**
 * Captures a visitor's first known paid-traffic context for the browser tab.
 * This is private business attribution, never a credential and never a Pixel
 * configuration mechanism. One visitor can still create only one canonical
 * event per conversion type for the configured dataset.
 */
export function getTrafficAttribution(): TrafficAttribution {
  const params = new URLSearchParams(window.location.search)
  const stored = safeStorageRead()
  const fbclid = valueFromParams(params, ['fbclid'])
  const fresh: Partial<TrafficAttribution> = {
    fbclid,
    utmSource: valueFromParams(params, ['utm_source']),
    utmMedium: valueFromParams(params, ['utm_medium']),
    utmCampaign: valueFromParams(params, ['utm_campaign']),
    utmContent: valueFromParams(params, ['utm_content']),
    utmTerm: valueFromParams(params, ['utm_term']),
    metaAdAccountId: valueFromParams(params, ['meta_ad_account_id', 'ad_account_id', 'adaccount_id', 'account_id']),
    metaCampaignId: valueFromParams(params, ['meta_campaign_id', 'campaign_id', 'campaign']),
    metaAdsetId: valueFromParams(params, ['meta_adset_id', 'adset_id', 'ad_set_id']),
    metaAdId: valueFromParams(params, ['meta_ad_id', 'ad_id', 'adid']),
  }
  const fbp = readCookie('_fbp')
  const fbc = readCookie('_fbc') ?? (fbclid ? `fb.1.${Date.now()}.${fbclid}` : null)
  const knownSource = fresh.utmSource ?? stored.utmSource ?? referrerHost() ?? 'direct'
  const attribution: TrafficAttribution = {
    fbp,
    fbc,
    fbclid: fresh.fbclid ?? stored.fbclid ?? null,
    trafficSource: knownSource,
    utmSource: fresh.utmSource ?? stored.utmSource ?? null,
    utmMedium: fresh.utmMedium ?? stored.utmMedium ?? null,
    utmCampaign: fresh.utmCampaign ?? stored.utmCampaign ?? null,
    utmContent: fresh.utmContent ?? stored.utmContent ?? null,
    utmTerm: fresh.utmTerm ?? stored.utmTerm ?? null,
    metaAdAccountId: fresh.metaAdAccountId ?? stored.metaAdAccountId ?? null,
    metaCampaignId: fresh.metaCampaignId ?? stored.metaCampaignId ?? null,
    metaAdsetId: fresh.metaAdsetId ?? stored.metaAdsetId ?? null,
    metaAdId: fresh.metaAdId ?? stored.metaAdId ?? null,
  }
  safeStorageWrite(attribution)
  return attribution
}
