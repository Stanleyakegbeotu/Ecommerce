import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Mic, Square, Trash2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { exitFeedbackTextMaxLength, type ExitReason, type ExitReasonId } from '@/features/exitFeedback/exitFeedbackContent'
import type { VoiceRecorderState, VoiceRecording } from '@/features/exitFeedback/useVoiceRecorder'

type ExitFeedbackModalProps = {
  isOpen: boolean
  reason: ExitReason | null
  reasons: ExitReason[]
  textEntryMode: 'closed' | 'editing' | 'submitted'
  textValue: string
  textError: string | null
  textSubmitting: boolean
  reasonSubmitting: boolean
  feedbackError: string | null
  followupMode: 'hidden' | 'offer' | 'phone' | 'submitted'
  followupSubmitting: boolean
  followupError: string | null
  phoneValue: string
  phoneError: string | null
  phoneSubmitting: boolean
  voiceAvailable: boolean
  voiceOpen: boolean
  voiceState: VoiceRecorderState
  voiceElapsedMs: number
  voiceRecording: VoiceRecording | null
  voiceError: string | null
  voiceUploading: boolean
  voiceAttachmentId: string | null
  onClose: () => void
  onReasonSelect: (reasonId: ExitReasonId) => void
  onTextOpen: () => void
  onTextCancel: () => void
  onTextChange: (value: string) => void
  onTextSubmit: () => void
  onFeedbackRetry: () => void
  onFollowupAccept: () => void
  onFollowupDecline: () => void
  onFollowupRetry: () => void
  onPhoneChange: (value: string) => void
  onPhoneSubmit: () => void
  onPhoneCancel: () => void
  onVoiceOpen: () => void
  onVoiceStart: () => void
  onVoiceStop: () => void
  onVoiceCancel: () => void
  onVoiceDiscard: () => void
  onVoiceSubmit: () => void
  onRecoveryAction: () => void
}

function formatVoiceDuration(durationMs: number) {
  const seconds = Math.floor(Math.max(0, durationMs) / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function ExitFeedbackModal({ isOpen, reason, reasons, textEntryMode, textValue, textError, textSubmitting, reasonSubmitting, feedbackError, followupMode, followupSubmitting, followupError, phoneValue, phoneError, phoneSubmitting, voiceAvailable, voiceOpen, voiceState, voiceElapsedMs, voiceRecording, voiceError, voiceUploading, voiceAttachmentId, onClose, onReasonSelect, onTextOpen, onTextCancel, onTextChange, onTextSubmit, onFeedbackRetry, onFollowupAccept, onFollowupDecline, onFollowupRetry, onPhoneChange, onPhoneSubmit, onPhoneCancel, onVoiceOpen, onVoiceStart, onVoiceStop, onVoiceCancel, onVoiceDiscard, onVoiceSubmit, onRecoveryAction }: ExitFeedbackModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const phoneInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.setTimeout(() => closeButtonRef.current?.focus(), 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    if (textEntryMode === 'editing') window.setTimeout(() => textareaRef.current?.focus(), 0)
    if (followupMode === 'phone') window.setTimeout(() => phoneInputRef.current?.focus(), 0)
  }, [followupMode, isOpen, textEntryMode])

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          aria-labelledby="exit-feedback-heading"
          aria-modal="true"
          className="fixed inset-0 z-[70] grid place-items-end bg-[#071a37]/55 p-3 text-[#102a56] backdrop-blur-sm sm:place-items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) onClose()
          }}
        >
          <motion.section
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="relative max-h-[calc(100svh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-[30px] border border-[#d8e3f2] bg-white p-5 shadow-[0_28px_90px_rgba(5,31,68,0.32)] sm:max-h-[90svh] sm:rounded-[38px] sm:p-7"
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            initial={{ opacity: 0, y: 36, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return
              const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled]), input:not([disabled]), audio[controls]'))
              const first = focusable[0]
              const last = focusable.at(-1)
              if (!first || !last) return
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
              }
            }}
          >
            <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#8fc0ff]/30 blur-3xl" aria-hidden="true" />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="relative ml-auto grid size-11 place-items-center rounded-full border border-[#d8e3f2] bg-[#f8fbff] text-[#49617f] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#1268e6] focus:ring-offset-2"
              aria-label="Close feedback prompt and continue browsing"
            >
              <X className="size-5" aria-hidden="true" />
            </button>

            {!reason ? (
              <div className="relative">
                <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-[#1268e6]">Before you go…</p>
                <h2 id="exit-feedback-heading" className="mt-3 font-serif text-4xl font-normal leading-[0.95] text-[#102a56] sm:text-5xl">What stopped you from ordering today?</h2>
                <p className="mt-4 max-w-lg text-sm font-medium leading-6 text-[#52728f] sm:text-base">One quick answer helps us make this page more useful. You can close this at any time.</p>
                <div className="mt-6 grid gap-2.5" role="list" aria-label="Reasons for not ordering">
                  {reasons.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => onReasonSelect(item.id)}
                      className="min-h-14 rounded-2xl border border-[#d4e2f1] bg-[#fbfdff] px-4 text-left text-sm font-black text-[#163b68] transition hover:border-[#8bbcff] hover:bg-[#f1f7ff] focus:outline-none focus:ring-2 focus:ring-[#1268e6] focus:ring-offset-2 sm:text-base"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : textEntryMode === 'editing' ? (
              <form
                className="relative pr-1"
                onSubmit={(event) => {
                  event.preventDefault()
                  onTextSubmit()
                }}
              >
                <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-[#1268e6]">A little more detail</p>
                <h2 id="exit-feedback-heading" className="mt-3 font-serif text-4xl font-normal leading-[0.95] text-[#102a56]">Tell us what stopped you.</h2>
                <p id="exit-feedback-text-helper" className="mt-3 text-sm font-medium leading-6 text-[#52728f]">A short answer is enough.</p>
                <label className="sr-only" htmlFor="exit-feedback-text">What made you decide not to order?</label>
                <textarea
                  ref={textareaRef}
                  id="exit-feedback-text"
                  value={textValue}
                  maxLength={exitFeedbackTextMaxLength}
                  rows={3}
                  onChange={(event) => onTextChange(event.target.value)}
                  aria-describedby={textError ? 'exit-feedback-text-helper exit-feedback-text-error' : 'exit-feedback-text-helper'}
                  aria-invalid={Boolean(textError)}
                  className="mt-5 min-h-28 w-full resize-y rounded-2xl border border-[#c8dcf0] bg-[#fbfdff] px-4 py-3 text-base font-medium leading-6 text-[#163b68] outline-none transition placeholder:text-[#7790aa] focus:border-[#1268e6] focus:ring-2 focus:ring-[#1268e6]/25"
                  placeholder="What made you decide not to order?"
                />
                <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-[#62809f]">
                  <span>{textValue.length}/{exitFeedbackTextMaxLength}</span>
                  {textError ? <span id="exit-feedback-text-error" role="alert" className="text-[#b42318]">{textError}</span> : null}
                </div>
                <button
                  type="submit"
                  disabled={textSubmitting}
                  className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-linear-to-r from-[#0b2f64] via-[#1268e6] to-[#0747ad] px-5 text-sm font-black uppercase tracking-[0.11em] text-white shadow-[0_14px_32px_rgba(18,104,230,0.3)] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-[#1268e6] focus:ring-offset-2"
                >
                  {textSubmitting ? 'Sending…' : 'Send feedback'}
                </button>
                <button type="button" onClick={onTextCancel} disabled={textSubmitting} className="mt-4 w-full py-2 text-sm font-bold text-[#52728f] underline decoration-[#52728f]/30 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#1268e6] focus:ring-offset-2">
                  Back to my answer
                </button>
              </form>
            ) : (
              <div className="relative pr-1">
                <span className="grid size-12 place-items-center rounded-2xl bg-[#168b46]/10 text-[#168b46]"><CheckCircle2 className="size-6" aria-hidden="true" /></span>
                <h2 id="exit-feedback-heading" className="mt-5 font-serif text-4xl font-normal leading-[0.95] text-[#102a56]">{textEntryMode === 'submitted' ? 'Thanks — this helps us improve.' : 'Thanks for sharing.'}</h2>
                <p className="mt-4 text-base font-medium leading-7 text-[#52728f]">{reason.response}</p>
                {reasonSubmitting ? <p className="mt-4 text-sm font-bold text-[#52728f]" role="status">Saving your feedback…</p> : null}
                {feedbackError ? (
                  <div className="mt-4 rounded-2xl border border-[#f0b8b1] bg-[#fff8f7] p-3 text-sm font-semibold text-[#a23428]" role="alert">
                    <p>{feedbackError}</p>
                    <button type="button" onClick={onFeedbackRetry} className="mt-2 font-black underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#1268e6] focus:ring-offset-2">Try again</button>
                  </div>
                ) : null}
                {textEntryMode === 'closed' ? (
                  <button type="button" disabled={reasonSubmitting} onClick={onTextOpen} className="mt-5 text-sm font-black text-[#1268e6] underline decoration-[#1268e6]/30 underline-offset-4 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#1268e6] focus:ring-offset-2">
                    Tell us more
                  </button>
                ) : null}
                {voiceAvailable && !voiceOpen && !voiceAttachmentId ? (
                  <button type="button" onClick={onVoiceOpen} className="mt-4 flex min-h-11 items-center gap-2 text-sm font-black text-[#1268e6] underline decoration-[#1268e6]/30 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#1268e6] focus:ring-offset-2">
                    <Mic className="size-4" aria-hidden="true" /> Prefer to explain by voice?
                  </button>
                ) : null}
                {voiceOpen ? (
                  <section className="mt-6 rounded-2xl border border-[#c8dcf0] bg-[#f7fbff] p-4" aria-labelledby="voice-feedback-heading">
                    <h3 id="voice-feedback-heading" className="text-base font-black text-[#163b68]">Voice note <span className="text-sm font-bold text-[#52728f]">(optional)</span></h3>
                    {voiceAttachmentId ? (
                      <p className="mt-3 rounded-xl border border-[#b9dfc7] bg-[#f4fcf6] p-3 text-sm font-bold text-[#1d6b3f]" role="status">Your voice note has been sent.</p>
                    ) : voiceState === 'recording' ? (
                      <div className="mt-4">
                        <p className="flex items-center gap-2 text-sm font-bold text-[#b42318]" role="status"><span className="size-2 animate-pulse rounded-full bg-[#d92d20]" aria-hidden="true" /> Recording {formatVoiceDuration(voiceElapsedMs)} / 0:30</p>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <button type="button" onClick={onVoiceStop} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#b42318] px-4 text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-[#b42318] focus:ring-offset-2"><Square className="size-4" aria-hidden="true" /> Stop recording</button>
                          <button type="button" onClick={onVoiceCancel} className="min-h-12 rounded-xl border border-[#c8dcf0] bg-white px-4 text-sm font-black text-[#163b68] focus:outline-none focus:ring-2 focus:ring-[#1268e6] focus:ring-offset-2">Cancel</button>
                        </div>
                      </div>
                    ) : voiceRecording ? (
                      <div className="mt-4">
                        <p className="text-sm font-medium leading-6 text-[#52728f]">Review your {formatVoiceDuration(voiceRecording.durationMs)} voice note before sending.</p>
                        <audio className="mt-3 w-full" controls preload="metadata" src={voiceRecording.previewUrl}>Your browser cannot play this recording.</audio>
                        {voiceError ? <p className="mt-3 text-sm font-bold text-[#b42318]" role="alert">{voiceError}</p> : null}
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <button type="button" disabled={voiceUploading} onClick={onVoiceSubmit} className="min-h-12 rounded-xl bg-[#1268e6] px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#1268e6] focus:ring-offset-2">{voiceUploading ? 'Sending…' : 'Send voice note'}</button>
                          <button type="button" disabled={voiceUploading} onClick={onVoiceDiscard} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#c8dcf0] bg-white px-4 text-sm font-black text-[#163b68] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#1268e6] focus:ring-offset-2"><Trash2 className="size-4" aria-hidden="true" /> Delete / re-record</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <p className="text-sm font-medium leading-6 text-[#52728f]">Record up to 30 seconds. We only ask for microphone access after you press record.</p>
                        {voiceError ? <p className="mt-3 text-sm font-bold text-[#b42318]" role="alert">{voiceError}</p> : null}
                        <button type="button" disabled={voiceState === 'requesting_permission' || voiceState === 'unsupported'} onClick={onVoiceStart} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1268e6] px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#1268e6] focus:ring-offset-2"><Mic className="size-4" aria-hidden="true" /> {voiceState === 'requesting_permission' ? 'Requesting microphone…' : 'Record voice note'}</button>
                        <button type="button" disabled={voiceState === 'requesting_permission'} onClick={onVoiceCancel} className="mt-3 w-full py-2 text-sm font-bold text-[#52728f] underline underline-offset-4 disabled:opacity-60">Back</button>
                      </div>
                    )}
                  </section>
                ) : null}
                {followupMode === 'offer' ? (
                  <section className="mt-6 rounded-2xl border border-[#c8dcf0] bg-[#f7fbff] p-4" aria-labelledby="followup-offer-heading">
                    <h3 id="followup-offer-heading" className="text-base font-black text-[#163b68]">Would you like us to personally help with your concern?</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#52728f]">Optional — you can continue browsing either way.</p>
                    {followupError ? <p className="mt-3 text-sm font-bold text-[#b42318]" role="alert">{followupError}</p> : null}
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button type="button" disabled={followupSubmitting} onClick={onFollowupAccept} className="min-h-12 rounded-xl bg-[#1268e6] px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#1268e6] focus:ring-offset-2">Yes, contact me</button>
                      <button type="button" disabled={followupSubmitting} onClick={onFollowupDecline} className="min-h-12 rounded-xl border border-[#c8dcf0] bg-white px-4 text-sm font-black text-[#163b68] disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#1268e6] focus:ring-offset-2">No thanks</button>
                    </div>
                    {followupError ? <button type="button" disabled={followupSubmitting} onClick={onFollowupRetry} className="mt-3 text-sm font-black text-[#1268e6] underline underline-offset-4 disabled:opacity-60">Try again</button> : null}
                  </section>
                ) : null}
                {followupMode === 'phone' ? (
                  <form className="mt-6 rounded-2xl border border-[#c8dcf0] bg-[#f7fbff] p-4" onSubmit={(event) => { event.preventDefault(); onPhoneSubmit() }}>
                    <label htmlFor="exit-feedback-phone" className="block text-base font-black text-[#163b68]">Phone number <span className="text-sm font-bold text-[#52728f]">(optional)</span></label>
                    <p id="exit-feedback-phone-helper" className="mt-2 text-sm font-medium leading-6 text-[#52728f]">We’ll only use this to follow up about your enquiry.</p>
                    <input ref={phoneInputRef} id="exit-feedback-phone" type="tel" inputMode="tel" autoComplete="tel-national" maxLength={32} value={phoneValue} onChange={(event) => onPhoneChange(event.target.value)} aria-describedby={phoneError ? 'exit-feedback-phone-helper exit-feedback-phone-error' : 'exit-feedback-phone-helper'} aria-invalid={Boolean(phoneError)} placeholder="0801 234 5678" className="mt-4 min-h-12 w-full rounded-xl border border-[#c8dcf0] bg-white px-4 text-base font-medium text-[#163b68] outline-none focus:border-[#1268e6] focus:ring-2 focus:ring-[#1268e6]/25" />
                    {phoneError ? <p id="exit-feedback-phone-error" role="alert" className="mt-2 text-sm font-bold text-[#b42318]">{phoneError}</p> : null}
                    <button type="submit" disabled={phoneSubmitting} className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#1268e6] px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#1268e6] focus:ring-offset-2">{phoneSubmitting ? 'Saving…' : 'Save contact details'}</button>
                    <button type="button" disabled={phoneSubmitting} onClick={onPhoneCancel} className="mt-3 w-full py-2 text-sm font-bold text-[#52728f] underline underline-offset-4 disabled:opacity-60">Not now</button>
                  </form>
                ) : null}
                {followupMode === 'submitted' ? <p className="mt-6 rounded-2xl border border-[#b9dfc7] bg-[#f4fcf6] p-4 text-sm font-bold leading-6 text-[#1d6b3f]" role="status">Thanks — we’ll use your number only to follow up about this enquiry.</p> : null}
                <button
                  type="button"
                  onClick={onRecoveryAction}
                  disabled={reasonSubmitting}
                  className="mt-7 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-linear-to-r from-[#0b2f64] via-[#1268e6] to-[#0747ad] px-5 text-sm font-black uppercase tracking-[0.11em] text-white shadow-[0_14px_32px_rgba(18,104,230,0.3)] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#1268e6] focus:ring-offset-2"
                >
                  {reason.actionLabel} <ArrowRight className="size-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={onClose} className="mt-4 w-full py-2 text-sm font-bold text-[#52728f] underline decoration-[#52728f]/30 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#1268e6] focus:ring-offset-2">
                  Close and continue browsing
                </button>
              </div>
            )}
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
