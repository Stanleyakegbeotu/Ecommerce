export type ResumeProgress = {
  version: 1
  lastSection: string
  selectedPackageId?: string
  checkoutStarted?: boolean
  updatedAt: number
}

const storageKey = 'solar-generator:resume-progress:v1'
export const resumeProgressTtlMs = 7 * 24 * 60 * 60 * 1000

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isResumeProgress(value: unknown): value is ResumeProgress {
  if (!value || typeof value !== 'object') {
    return false
  }

  const progress = value as Partial<ResumeProgress>
  return progress.version === 1 && typeof progress.lastSection === 'string' && typeof progress.updatedAt === 'number'
}

export function readResumeProgress(): ResumeProgress | null {
  if (!canUseStorage()) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return null
    }

    const progress: unknown = JSON.parse(raw)
    if (!isResumeProgress(progress) || Date.now() - progress.updatedAt > resumeProgressTtlMs) {
      window.localStorage.removeItem(storageKey)
      return null
    }

    return progress
  } catch {
    return null
  }
}

export function saveResumeProgress(update: Omit<Partial<ResumeProgress>, 'version' | 'updatedAt'>) {
  if (!canUseStorage()) {
    return
  }

  try {
    const current = readResumeProgress()
    const next: ResumeProgress = {
      version: 1,
      lastSection: update.lastSection ?? current?.lastSection ?? 'hero',
      selectedPackageId: update.selectedPackageId ?? current?.selectedPackageId,
      checkoutStarted: update.checkoutStarted ?? current?.checkoutStarted,
      updatedAt: Date.now(),
    }

    window.localStorage.setItem(storageKey, JSON.stringify(next))
  } catch {
    // Storage can be unavailable in private browsing or when quota is blocked.
  }
}

export function clearResumeProgress() {
  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.removeItem(storageKey)
  } catch {
    // Nothing else is required if browser storage cannot be changed.
  }
}

export function hasMeaningfulResumeProgress(progress: ResumeProgress | null) {
  return Boolean(progress && (progress.checkoutStarted || progress.selectedPackageId || progress.lastSection !== 'hero'))
}
