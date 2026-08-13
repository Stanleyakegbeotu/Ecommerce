import { useCallback, useEffect, useRef, useState } from 'react'

import { hasMeaningfulResumeProgress, readResumeProgress, saveResumeProgress, type ResumeProgress } from '@/features/resume/sessionMemory'

const meaningfulVisitDelayMs = 8000

export function useLandingProgressMemory() {
  const [savedProgress] = useState<ResumeProgress | null>(() => readResumeProgress())
  const currentSectionRef = useRef('hero')
  const visitedSectionsRef = useRef(new Set<string>())
  const [enteredAt] = useState(() => Date.now())

  const canSaveSection = useCallback(() => {
    const elapsed = Date.now() - enteredAt
    return elapsed >= meaningfulVisitDelayMs && visitedSectionsRef.current.size >= 2
  }, [enteredAt])

  const persistCurrentSection = useCallback(() => {
    if (!canSaveSection()) {
      return
    }

    saveResumeProgress({ lastSection: currentSectionRef.current })
  }, [canSaveSection])

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-resume-section]'))
    if (!sections.length || !('IntersectionObserver' in window)) {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0]

        if (!visibleEntry) {
          return
        }

        const sectionId = (visibleEntry.target as HTMLElement).dataset.resumeSection
        if (!sectionId || sectionId === currentSectionRef.current) {
          return
        }

        currentSectionRef.current = sectionId
        visitedSectionsRef.current.add(sectionId)
        persistCurrentSection()
      },
      { rootMargin: '-24% 0px -48% 0px', threshold: [0.14, 0.32, 0.5] },
    )

    sections.forEach((section) => observer.observe(section))

    const saveOnExit = () => persistCurrentSection()
    const saveWhenHidden = () => {
      if (document.visibilityState === 'hidden') {
        saveOnExit()
      }
    }
    window.addEventListener('pagehide', saveOnExit)
    document.addEventListener('visibilitychange', saveWhenHidden)

    return () => {
      observer.disconnect()
      window.removeEventListener('pagehide', saveOnExit)
      document.removeEventListener('visibilitychange', saveWhenHidden)
    }
  }, [persistCurrentSection])

  const scrollToSavedSection = useCallback((progress = savedProgress) => {
    if (!progress) {
      return
    }

    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`[data-resume-section="${progress.lastSection}"]`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [savedProgress])

  return {
    hasSavedProgress: hasMeaningfulResumeProgress(savedProgress),
    savedProgress,
    scrollToSavedSection,
  }
}
