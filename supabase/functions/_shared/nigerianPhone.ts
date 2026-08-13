const nigerianMobilePattern = /^(?:\+234|234|0)([789]\d{9})$/

/**
 * Converts supported Nigerian mobile formats to E.164. This intentionally
 * accepts only Nigerian mobile numbers today; callers can add country-specific
 * normalizers later without changing the feedback follow-up schema.
 */
export function normalizeNigerianMobileNumber(value: unknown) {
  if (typeof value !== 'string') return null
  const compact = value.trim().replace(/[\s().-]/g, '')
  if (!compact || compact.length > 16) return null
  const match = compact.match(nigerianMobilePattern)
  return match ? `+234${match[1]}` : null
}
