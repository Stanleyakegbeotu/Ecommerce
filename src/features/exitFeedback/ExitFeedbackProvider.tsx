import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { trackAdminEvent } from '@/features/admin/adminData'
import { ExitFeedbackModal } from '@/features/exitFeedback/ExitFeedbackModal'
import { exitFeedbackTextMaxLength, getExitReasons, type ExitFeedbackStage, type ExitReason, type ExitReasonId } from '@/features/exitFeedback/exitFeedbackContent'
import { createCustomerFeedbackIdempotencyKey, submitCustomerFeedback, type CustomerFeedbackSource } from '@/features/exitFeedback/customerFeedbackService'
import {
  createCustomerFeedbackFollowupIdempotencyKey,
  normalizeFeedbackPhoneNumber,
  saveCustomerFeedbackFollowupConsent,
  submitCustomerFeedbackFollowupPhone,
  type CustomerFeedbackFollowupConsent,
} from '@/features/exitFeedback/customerFeedbackFollowupService'
import { createCustomerFeedbackVoiceIdempotencyKey, submitCustomerFeedbackVoice } from '@/features/exitFeedback/customerFeedbackVoiceService'
import { hasExitFeedbackCooldown, hasPromptedThisSession, markExitFeedbackPrompted, saveExitFeedbackOutcome } from '@/features/exitFeedback/exitFeedbackService'
import { useVoiceRecorder } from '@/features/exitFeedback/useVoiceRecorder'
import { useCheckoutEngine } from '@/features/checkout/hooks/useCheckoutEngine'

type ExitSignal = 'desktop_top_exit' | 'mobile_return_scroll' | 'checkout_closed'
type TextEntryMode = 'closed' | 'editing' | 'submitted'
type TextEntrySource = 'something_else' | 'tell_more'
type FollowupMode = 'hidden' | 'offer' | 'phone' | 'submitted'

type ExitContext = {
  signal: ExitSignal
  stage: ExitFeedbackStage
  lastSection: string
  checkoutOpened: boolean
  formStarted: boolean
  packageId?: string
}

const minimumEngagementMs = 7000

function isDesktopPointer() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function sectionToStage(section: string): ExitFeedbackStage {
  if (section === 'packages') return 'packages'
  if (section === 'order') return 'checkout'
  return 'other'
}

export function ExitFeedbackProvider({ children }: { children: ReactNode }) {
  const { availabilityTarget, form, lastOrder, popupOpen, popupStep, resumePackageId, selectedPackageId } = useCheckoutEngine()
  const [open, setOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState<ExitReason | null>(null)
  const [context, setContext] = useState<ExitContext | null>(null)
  const [textEntryMode, setTextEntryMode] = useState<TextEntryMode>('closed')
  const [textEntrySource, setTextEntrySource] = useState<TextEntrySource | null>(null)
  const [textValue, setTextValue] = useState('')
  const [textError, setTextError] = useState<string | null>(null)
  const [textSubmitting, setTextSubmitting] = useState(false)
  const [reasonSubmitting, setReasonSubmitting] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [followupMode, setFollowupMode] = useState<FollowupMode>('hidden')
  const [followupSubmitting, setFollowupSubmitting] = useState(false)
  const [followupError, setFollowupError] = useState<string | null>(null)
  const [pendingFollowupConsent, setPendingFollowupConsent] = useState<CustomerFeedbackFollowupConsent | null>(null)
  const [phoneValue, setPhoneValue] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [phoneSubmitting, setPhoneSubmitting] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [voiceUploading, setVoiceUploading] = useState(false)
  const [voiceUploadError, setVoiceUploadError] = useState<string | null>(null)
  const [voiceAttachmentId, setVoiceAttachmentId] = useState<string | null>(null)
  const voiceRecorder = useVoiceRecorder()
  const [enteredAt] = useState(() => Date.now())
  const lastSectionRef = useRef('hero')
  const offerSeenRef = useRef(false)
  const checkoutSeenRef = useRef(false)
  const furthestScrollRef = useRef(0)
  const promptInProgressRef = useRef(false)
  const queuedAttemptRef = useRef<number | null>(null)
  const textSubmittingRef = useRef(false)
  const textSubmittedRef = useRef(false)
  const feedbackIdRef = useRef<string | undefined>(undefined)
  const feedbackIdempotencyKeyRef = useRef<string | undefined>(undefined)
  const followupIdRef = useRef<string | undefined>(undefined)
  const followupOfferTrackedRef = useRef(false)
  const followupConsentSubmittingRef = useRef(false)
  const followupConsentIdempotencyKeysRef = useRef<Partial<Record<CustomerFeedbackFollowupConsent, string>>>({})
  const followupSuccessEventsRef = useRef(new Set<string>())
  const phoneSubmittingRef = useRef(false)
  const phoneSubmissionIdempotencyKeyRef = useRef<string | undefined>(undefined)
  const voiceUploadIdempotencyKeyRef = useRef<string | undefined>(undefined)
  const voiceUploadingRef = useRef(false)
  const stateRef = useRef({
    availabilityTarget,
    formStarted: form.formState.isDirty,
    hasOrder: Boolean(lastOrder),
    popupOpen,
    popupStep,
    resumePackageId,
    selectedPackageId,
  })

  useEffect(() => {
    stateRef.current = {
      availabilityTarget,
      formStarted: form.formState.isDirty,
      hasOrder: Boolean(lastOrder),
      popupOpen,
      popupStep,
      resumePackageId,
      selectedPackageId,
    }
    if (popupOpen || availabilityTarget) checkoutSeenRef.current = true
  }, [availabilityTarget, form.formState.isDirty, lastOrder, popupOpen, popupStep, resumePackageId, selectedPackageId])

  const getContext = useCallback((signal: ExitSignal): ExitContext => {
    const checkoutActive = checkoutSeenRef.current || stateRef.current.popupOpen || Boolean(stateRef.current.availabilityTarget)
    const stage = checkoutActive || stateRef.current.popupStep === 'form'
      ? 'checkout'
      : sectionToStage(lastSectionRef.current)
    return {
      signal,
      stage,
      lastSection: lastSectionRef.current,
      checkoutOpened: checkoutActive,
      formStarted: stateRef.current.formStarted || stateRef.current.popupStep === 'form',
      packageId: stateRef.current.resumePackageId ?? (checkoutActive ? stateRef.current.selectedPackageId : undefined),
    }
  }, [])

  const qualifies = useCallback(() => {
    if (stateRef.current.hasOrder || hasPromptedThisSession() || hasExitFeedbackCooldown() || promptInProgressRef.current) return false
    const enoughTime = Date.now() - enteredAt >= minimumEngagementMs
    return checkoutSeenRef.current || (offerSeenRef.current && enoughTime)
  }, [])

  const requestPrompt = useCallback((signal: ExitSignal) => {
    if (!qualifies()) return
    const nextContext = getContext(signal)
    promptInProgressRef.current = true
    markExitFeedbackPrompted()
    setContext(nextContext)
    setSelectedReason(null)
    setTextEntryMode('closed')
    setTextEntrySource(null)
    setTextValue('')
    setTextError(null)
    setTextSubmitting(false)
    setReasonSubmitting(false)
    setFeedbackError(null)
    setFeedbackSubmitted(false)
    setFollowupMode('hidden')
    setFollowupSubmitting(false)
    setFollowupError(null)
    setPendingFollowupConsent(null)
    setPhoneValue('')
    setPhoneError(null)
    setPhoneSubmitting(false)
    voiceRecorder.cancel()
    setVoiceOpen(false)
    setVoiceUploading(false)
    setVoiceUploadError(null)
    setVoiceAttachmentId(null)
    textSubmittingRef.current = false
    textSubmittedRef.current = false
    feedbackIdRef.current = undefined
    feedbackIdempotencyKeyRef.current = undefined
    followupIdRef.current = undefined
    followupOfferTrackedRef.current = false
    followupConsentSubmittingRef.current = false
    followupConsentIdempotencyKeysRef.current = {}
    followupSuccessEventsRef.current.clear()
    phoneSubmittingRef.current = false
    phoneSubmissionIdempotencyKeyRef.current = undefined
    voiceUploadIdempotencyKeyRef.current = undefined
    voiceUploadingRef.current = false
    setOpen(true)
    const metadata = {
      exitSignal: nextContext.signal,
      section: nextContext.lastSection,
      exitStage: nextContext.stage,
      packageId: nextContext.packageId,
      checkoutOpened: String(nextContext.checkoutOpened),
      formStarted: String(nextContext.formStarted),
    }
    trackAdminEvent('exit_intent_detected', metadata).catch(() => undefined)
    trackAdminEvent('exit_feedback_shown', metadata).catch(() => undefined)
  }, [getContext, qualifies, voiceRecorder.cancel])

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-resume-section]'))
    if (!sections.length || !('IntersectionObserver' in window)) return undefined
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0]
      const section = visible?.target instanceof HTMLElement ? visible.target.dataset.resumeSection : undefined
      if (!section) return
      lastSectionRef.current = section
      if (section === 'packages' || section === 'order') offerSeenRef.current = true
    }, { rootMargin: '-18% 0px -45% 0px', threshold: [0.18, 0.42] })
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isDesktopPointer()) return undefined
    const onMouseExit = (event: MouseEvent) => {
      if (event.relatedTarget === null && event.clientY <= 16) requestPrompt('desktop_top_exit')
    }
    document.addEventListener('mouseout', onMouseExit)
    return () => document.removeEventListener('mouseout', onMouseExit)
  }, [requestPrompt])

  useEffect(() => {
    if (isDesktopPointer()) return undefined
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const current = window.scrollY
        furthestScrollRef.current = Math.max(furthestScrollRef.current, current)
        const returnedUpward = furthestScrollRef.current - current >= Math.max(420, window.innerHeight * 0.65)
        if (offerSeenRef.current && returnedUpward) requestPrompt('mobile_return_scroll')
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [requestPrompt])

  useEffect(() => {
    const onCheckoutClosed = () => {
      checkoutSeenRef.current = true
      if (isDesktopPointer()) return
      if (queuedAttemptRef.current) window.clearTimeout(queuedAttemptRef.current)
      queuedAttemptRef.current = window.setTimeout(() => requestPrompt('checkout_closed'), 250)
    }
    window.addEventListener('checkout:closed', onCheckoutClosed)
    return () => {
      window.removeEventListener('checkout:closed', onCheckoutClosed)
      if (queuedAttemptRef.current) window.clearTimeout(queuedAttemptRef.current)
    }
  }, [requestPrompt])

  const startTextEntry = useCallback((reason: ExitReason, source: TextEntrySource) => {
    if (!context || textSubmittedRef.current) return
    setTextEntrySource(source)
    setTextEntryMode('editing')
    setTextError(null)
    trackAdminEvent('exit_feedback_text_opened', {
      exitSignal: context.signal,
      section: context.lastSection,
      exitStage: context.stage,
      packageId: context.packageId,
      reasonId: reason.id,
      feedbackSource: source,
    }).catch(() => undefined)
  }, [context])

  const persistFeedback = useCallback(async (reason: ExitReason, source: CustomerFeedbackSource, feedbackText?: string | null) => {
    if (!context) throw new Error('Feedback context is unavailable')
    const idempotencyKey = feedbackIdempotencyKeyRef.current ?? createCustomerFeedbackIdempotencyKey()
    feedbackIdempotencyKeyRef.current = idempotencyKey
    const metadata = {
      exitSignal: context.signal,
      section: context.lastSection,
      exitStage: context.stage,
      packageId: context.packageId,
      reasonId: reason.id,
      feedbackSource: source,
      characterCount: feedbackText ? String(feedbackText.length) : '0',
      checkoutOpened: String(context.checkoutOpened),
      formStarted: String(context.formStarted),
    }
    trackAdminEvent('exit_feedback_submission_attempted', metadata).catch(() => undefined)
    try {
      const result = await submitCustomerFeedback({
        feedbackId: feedbackIdRef.current,
        idempotencyKey,
        reasonId: reason.id,
        feedbackText,
        source,
        funnelStage: context.stage,
        lastSection: context.lastSection,
        selectedPackageId: context.packageId,
        checkoutOpened: context.checkoutOpened,
        formStarted: context.formStarted,
      })
      feedbackIdRef.current = result.feedbackId
      trackAdminEvent('exit_feedback_submission_succeeded', { ...metadata, feedbackId: result.feedbackId }).catch(() => undefined)
      return result
    } catch (error) {
      trackAdminEvent('exit_feedback_submission_failed', metadata).catch(() => undefined)
      throw error
    }
  }, [context])

  const followupMetadata = useCallback((reason: ExitReason, followupId?: string) => ({
    exitSignal: context?.signal,
    section: context?.lastSection,
    exitStage: context?.stage,
    packageId: context?.packageId,
    reasonId: reason.id,
    feedbackId: feedbackIdRef.current,
    followupId,
  }), [context])

  const trackFollowupSuccessEvent = useCallback((eventName: 'exit_feedback_followup_offered' | 'exit_feedback_followup_accepted' | 'exit_feedback_followup_declined' | 'exit_feedback_phone_submitted', reason: ExitReason, followupId?: string) => {
    const eventKey = `${eventName}:${feedbackIdRef.current ?? ''}:${followupId ?? ''}`
    if (followupSuccessEventsRef.current.has(eventKey)) return
    followupSuccessEventsRef.current.add(eventKey)
    trackAdminEvent(eventName, followupMetadata(reason, followupId)).catch(() => undefined)
  }, [followupMetadata])

  const showFollowupOffer = useCallback((reason: ExitReason, hasTypedFeedback = false) => {
    if (!context || !feedbackIdRef.current || followupOfferTrackedRef.current) return
    // "Not ready" stays low-pressure unless the visitor voluntarily wrote more.
    if (reason.id === 'not_ready' && !hasTypedFeedback) return
    followupOfferTrackedRef.current = true
    setFollowupMode('offer')
    trackFollowupSuccessEvent('exit_feedback_followup_offered', reason)
  }, [context, trackFollowupSuccessEvent])

  const selectFollowupConsent = useCallback(async (consent: CustomerFeedbackFollowupConsent) => {
    if (!selectedReason || !feedbackIdRef.current || followupConsentSubmittingRef.current) return
    followupConsentSubmittingRef.current = true
    setPendingFollowupConsent(consent)
    setFollowupSubmitting(true)
    setFollowupError(null)
    try {
      const idempotencyKey = followupConsentIdempotencyKeysRef.current[consent] ?? createCustomerFeedbackFollowupIdempotencyKey()
      followupConsentIdempotencyKeysRef.current[consent] = idempotencyKey
      const result = await saveCustomerFeedbackFollowupConsent({ feedbackId: feedbackIdRef.current, consent, idempotencyKey })
      followupIdRef.current = result.followupId
      if (result.consentState === 'accepted') {
        setFollowupMode('phone')
        trackFollowupSuccessEvent('exit_feedback_followup_accepted', selectedReason, result.followupId)
      } else {
        setFollowupMode('hidden')
        trackFollowupSuccessEvent('exit_feedback_followup_declined', selectedReason, result.followupId)
      }
    } catch {
      setFollowupError('We couldn’t save that choice. Please try again.')
    } finally {
      followupConsentSubmittingRef.current = false
      setFollowupSubmitting(false)
    }
  }, [selectedReason, trackFollowupSuccessEvent])

  const submitFollowupPhone = useCallback(async () => {
    if (!selectedReason || !feedbackIdRef.current || !followupIdRef.current || phoneSubmittingRef.current) return
    if (!normalizeFeedbackPhoneNumber(phoneValue)) {
      setPhoneError('Enter a valid Nigerian mobile number, such as 08012345678.')
      return
    }
    phoneSubmittingRef.current = true
    setPhoneSubmitting(true)
    setPhoneError(null)
    const idempotencyKey = phoneSubmissionIdempotencyKeyRef.current ?? createCustomerFeedbackFollowupIdempotencyKey()
    phoneSubmissionIdempotencyKeyRef.current = idempotencyKey
    const metadata = followupMetadata(selectedReason, followupIdRef.current)
    trackAdminEvent('exit_feedback_phone_submission_attempted', metadata).catch(() => undefined)
    try {
      const result = await submitCustomerFeedbackFollowupPhone({
        feedbackId: feedbackIdRef.current,
        followupId: followupIdRef.current,
        phone: phoneValue,
        idempotencyKey,
      })
      followupIdRef.current = result.followupId
      setFollowupMode('submitted')
      trackFollowupSuccessEvent('exit_feedback_phone_submitted', selectedReason, result.followupId)
    } catch {
      setPhoneError('We couldn’t save your contact details. Please try again.')
      trackAdminEvent('exit_feedback_phone_submission_failed', metadata).catch(() => undefined)
    } finally {
      phoneSubmittingRef.current = false
      setPhoneSubmitting(false)
    }
  }, [followupMetadata, phoneValue, selectedReason, trackFollowupSuccessEvent])

  const voiceMetadata = useCallback(() => ({
    exitSignal: context?.signal,
    section: context?.lastSection,
    exitStage: context?.stage,
    packageId: context?.packageId,
    reasonId: selectedReason?.id,
    feedbackId: feedbackIdRef.current,
  }), [context, selectedReason])

  const openVoice = useCallback(() => {
    if (!feedbackIdRef.current || !selectedReason) return
    setVoiceOpen(true)
    setVoiceUploadError(null)
    trackAdminEvent('exit_feedback_voice_opened', voiceMetadata()).catch(() => undefined)
  }, [selectedReason, voiceMetadata])

  const startVoiceRecording = useCallback(async () => {
    if (!selectedReason || voiceUploadingRef.current) return
    const result = await voiceRecorder.start()
    const metadata = voiceMetadata()
    if (result === 'started') {
      trackAdminEvent('exit_feedback_voice_permission_granted', metadata).catch(() => undefined)
      trackAdminEvent('exit_feedback_voice_recording_started', metadata).catch(() => undefined)
    } else if (result === 'denied') {
      trackAdminEvent('exit_feedback_voice_permission_denied', metadata).catch(() => undefined)
    }
  }, [selectedReason, voiceMetadata, voiceRecorder])

  const cancelVoiceRecording = useCallback(() => {
    if (voiceRecorder.state === 'recording' || voiceRecorder.recording) {
      trackAdminEvent('exit_feedback_voice_recording_cancelled', {
        ...voiceMetadata(),
        durationMs: String(voiceRecorder.elapsedMs),
      }).catch(() => undefined)
    }
    voiceRecorder.cancel()
    setVoiceOpen(false)
    setVoiceUploadError(null)
  }, [voiceMetadata, voiceRecorder])

  const discardVoiceRecording = useCallback(() => {
    if (voiceRecorder.recording) {
      trackAdminEvent('exit_feedback_voice_recording_cancelled', {
        ...voiceMetadata(),
        durationMs: String(voiceRecorder.recording.durationMs),
      }).catch(() => undefined)
    }
    voiceRecorder.discard()
    setVoiceUploadError(null)
  }, [voiceMetadata, voiceRecorder])

  const submitVoiceRecording = useCallback(async () => {
    const recording = voiceRecorder.recording
    if (!selectedReason || !feedbackIdRef.current || !recording || voiceUploadingRef.current || voiceAttachmentId) return
    voiceUploadingRef.current = true
    setVoiceUploading(true)
    setVoiceUploadError(null)
    const idempotencyKey = voiceUploadIdempotencyKeyRef.current ?? createCustomerFeedbackVoiceIdempotencyKey()
    voiceUploadIdempotencyKeyRef.current = idempotencyKey
    const metadata = {
      ...voiceMetadata(),
      durationMs: String(recording.durationMs),
      fileSizeBytes: String(recording.blob.size),
    }
    trackAdminEvent('exit_feedback_voice_upload_started', metadata).catch(() => undefined)
    try {
      const result = await submitCustomerFeedbackVoice({
        feedbackId: feedbackIdRef.current,
        idempotencyKey,
        blob: recording.blob,
        mimeType: recording.mimeType,
        durationMs: recording.durationMs,
      })
      setVoiceAttachmentId(result.attachmentId)
      trackAdminEvent('exit_feedback_voice_submitted', { ...metadata, attachmentId: result.attachmentId }).catch(() => undefined)
    } catch {
      setVoiceUploadError('We couldn’t upload your voice note. Please try again.')
      trackAdminEvent('exit_feedback_voice_upload_failed', metadata).catch(() => undefined)
    } finally {
      voiceUploadingRef.current = false
      setVoiceUploading(false)
    }
  }, [selectedReason, voiceAttachmentId, voiceMetadata, voiceRecorder.recording])

  useEffect(() => {
    const recording = voiceRecorder.recording
    if (!recording || !selectedReason || !feedbackIdRef.current) return
    trackAdminEvent('exit_feedback_voice_recorded', {
      ...voiceMetadata(),
      durationMs: String(recording.durationMs),
      fileSizeBytes: String(recording.blob.size),
    }).catch(() => undefined)
  }, [selectedReason, voiceMetadata, voiceRecorder.recording])

  const cancelTextEntry = useCallback(() => {
    if (!context || !selectedReason || textEntryMode !== 'editing') return
    trackAdminEvent('exit_feedback_text_cancelled', {
      exitSignal: context.signal,
      section: context.lastSection,
      exitStage: context.stage,
      packageId: context.packageId,
      reasonId: selectedReason.id,
      feedbackSource: textEntrySource ?? 'tell_more',
      characterCount: String(textValue.trim().length),
    }).catch(() => undefined)
    setTextEntryMode('closed')
    setTextError(null)
  }, [context, selectedReason, textEntryMode, textEntrySource, textValue])

  const close = useCallback(() => {
    if (textEntryMode === 'editing') cancelTextEntry()
    if (!feedbackSubmitted && context) {
      trackAdminEvent('exit_feedback_dismissed', {
        exitSignal: context.signal,
        section: context.lastSection,
        exitStage: context.stage,
        packageId: context.packageId,
      }).catch(() => undefined)
      saveExitFeedbackOutcome('dismissed')
    }
    voiceRecorder.cancel()
    setOpen(false)
  }, [cancelTextEntry, context, feedbackSubmitted, textEntryMode, voiceRecorder.cancel])

  const selectReason = useCallback((reasonId: ExitReasonId) => {
    if (!context) return
    const reason = getExitReasons(context.stage).find((item) => item.id === reasonId)
    if (!reason) return
    setSelectedReason(reason)
    setFeedbackError(null)
    const requiresText = reason.id === 'something_else'
    trackAdminEvent('exit_feedback_reason_selected', {
      exitSignal: context.signal,
      section: context.lastSection,
      exitStage: context.stage,
      packageId: context.packageId,
      reasonId: reason.id,
      checkoutOpened: String(context.checkoutOpened),
      formStarted: String(context.formStarted),
    }).catch(() => undefined)
    if (requiresText) {
      startTextEntry(reason, 'something_else')
      return
    }
    setReasonSubmitting(true)
    persistFeedback(reason, 'quick_reason')
      .then(() => {
        setFeedbackSubmitted(true)
        saveExitFeedbackOutcome('submitted')
        showFollowupOffer(reason)
      })
      .catch(() => setFeedbackError('We couldn’t save your feedback. Please try again.'))
      .finally(() => setReasonSubmitting(false))
  }, [context, persistFeedback, showFollowupOffer, startTextEntry])

  const submitTextFeedback = useCallback(async () => {
    const feedbackText = textValue.trim()
    if (!feedbackText) {
      setTextError('Enter a short message before sending.')
      return
    }
    if (!context || !selectedReason || !textEntrySource || textSubmittingRef.current || textSubmittedRef.current) return

    textSubmittingRef.current = true
    setTextSubmitting(true)
    setTextError(null)
    try {
      await persistFeedback(selectedReason, textEntrySource, feedbackText)
      textSubmittedRef.current = true
      setFeedbackSubmitted(true)
      setTextEntryMode('submitted')
      if (!feedbackSubmitted) saveExitFeedbackOutcome('submitted')
      showFollowupOffer(selectedReason, true)
    } catch {
      setTextError('We could not send that just now. Please try again.')
    } finally {
      textSubmittingRef.current = false
      setTextSubmitting(false)
    }
  }, [context, feedbackSubmitted, persistFeedback, selectedReason, showFollowupOffer, textEntrySource, textValue])

  const changeText = useCallback((value: string) => {
    setTextValue(value.slice(0, exitFeedbackTextMaxLength))
    if (textError) setTextError(null)
  }, [textError])

  const retryReasonFeedback = useCallback(() => {
    if (!selectedReason || selectedReason.id === 'something_else' || reasonSubmitting) return
    setFeedbackError(null)
    setReasonSubmitting(true)
    persistFeedback(selectedReason, 'quick_reason')
      .then(() => {
        setFeedbackSubmitted(true)
        saveExitFeedbackOutcome('submitted')
        showFollowupOffer(selectedReason)
      })
      .catch(() => setFeedbackError('We couldn’t save your feedback. Please try again.'))
      .finally(() => setReasonSubmitting(false))
  }, [persistFeedback, reasonSubmitting, selectedReason, showFollowupOffer])

  const recover = useCallback(() => {
    if (!selectedReason || !context) return
    const targetId = selectedReason.actionId === 'proof'
      ? 'reviews'
      : selectedReason.actionId === 'details'
        ? 'about'
        : selectedReason.actionId === 'delivery'
          ? 'faq'
          : selectedReason.actionId === 'packages'
            ? 'packages'
            : undefined
    const metadata = {
      exitSignal: context.signal,
      section: context.lastSection,
      exitStage: context.stage,
      packageId: context.packageId,
      reasonId: selectedReason.id,
      actionId: selectedReason.actionId,
      feedbackId: feedbackIdRef.current,
    }
    trackAdminEvent('exit_feedback_recovery_selected', metadata).catch(() => undefined)
    trackAdminEvent('exit_feedback_returned', metadata).catch(() => undefined)
    voiceRecorder.cancel()
    setOpen(false)
    if (targetId) window.requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [context, selectedReason, voiceRecorder.cancel])

  return (
    <>
      {children}
      <ExitFeedbackModal
        isOpen={open}
        reason={selectedReason}
        reasons={getExitReasons(context?.stage ?? 'other')}
        textEntryMode={textEntryMode}
        textValue={textValue}
        textError={textError}
        textSubmitting={textSubmitting}
        reasonSubmitting={reasonSubmitting}
        feedbackError={feedbackError}
        followupMode={followupMode}
        followupSubmitting={followupSubmitting}
        followupError={followupError}
        phoneValue={phoneValue}
        phoneError={phoneError}
        phoneSubmitting={phoneSubmitting}
        voiceAvailable={feedbackSubmitted}
        voiceOpen={voiceOpen}
        voiceState={voiceRecorder.state}
        voiceElapsedMs={voiceRecorder.elapsedMs}
        voiceRecording={voiceRecorder.recording}
        voiceError={voiceUploadError ?? voiceRecorder.error}
        voiceUploading={voiceUploading}
        voiceAttachmentId={voiceAttachmentId}
        onClose={close}
        onReasonSelect={selectReason}
        onTextOpen={() => selectedReason && startTextEntry(selectedReason, 'tell_more')}
        onTextCancel={cancelTextEntry}
        onTextChange={changeText}
        onTextSubmit={submitTextFeedback}
        onFeedbackRetry={retryReasonFeedback}
        onFollowupAccept={() => void selectFollowupConsent('accepted')}
        onFollowupDecline={() => void selectFollowupConsent('declined')}
        onFollowupRetry={() => { if (pendingFollowupConsent) void selectFollowupConsent(pendingFollowupConsent) }}
        onPhoneChange={(value) => { setPhoneValue(value); if (phoneError) setPhoneError(null) }}
        onPhoneSubmit={submitFollowupPhone}
        onPhoneCancel={() => { setFollowupMode('hidden'); setPhoneError(null) }}
        onVoiceOpen={openVoice}
        onVoiceStart={() => void startVoiceRecording()}
        onVoiceStop={voiceRecorder.stop}
        onVoiceCancel={cancelVoiceRecording}
        onVoiceDiscard={discardVoiceRecording}
        onVoiceSubmit={() => void submitVoiceRecording()}
        onRecoveryAction={recover}
      />
    </>
  )
}
