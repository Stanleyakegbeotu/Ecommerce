export type ExitFeedbackOutcome = 'dismissed' | 'submitted'

type ExitFeedbackMemory = {
  version: 1
  outcome: ExitFeedbackOutcome
  updatedAt: number
}

const memoryKey = 'solar-generator:exit-feedback:v1'
const sessionPromptKey = 'solar-generator:exit-feedback:prompted:v1'
export const exitFeedbackDismissalCooldownMs = 24 * 60 * 60 * 1000
export const exitFeedbackSubmissionCooldownMs = 7 * 24 * 60 * 60 * 1000

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function hasExitFeedbackCooldown() {
  if (!canUseStorage()) return false

  try {
    const raw = window.localStorage.getItem(memoryKey)
    if (!raw) return false
    const value = JSON.parse(raw) as Partial<ExitFeedbackMemory>
    if (value.version !== 1 || typeof value.updatedAt !== 'number' || !value.outcome) {
      window.localStorage.removeItem(memoryKey)
      return false
    }
    const cooldownMs = value.outcome === 'dismissed'
      ? exitFeedbackDismissalCooldownMs
      : exitFeedbackSubmissionCooldownMs
    if (Date.now() - value.updatedAt > cooldownMs) {
      window.localStorage.removeItem(memoryKey)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function hasPromptedThisSession() {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(sessionPromptKey) === 'true'
  } catch {
    return false
  }
}

export function markExitFeedbackPrompted() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(sessionPromptKey, 'true')
  } catch {
    // The prompt remains safe when storage is unavailable.
  }
}

export function saveExitFeedbackOutcome(outcome: ExitFeedbackOutcome) {
  if (!canUseStorage()) return
  try {
    const value: ExitFeedbackMemory = { version: 1, outcome, updatedAt: Date.now() }
    window.localStorage.setItem(memoryKey, JSON.stringify(value))
  } catch {
    // Do not make browser storage availability affect the visitor experience.
  }
}
