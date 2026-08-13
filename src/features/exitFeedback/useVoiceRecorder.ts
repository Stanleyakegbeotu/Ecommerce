import { useCallback, useEffect, useRef, useState } from 'react'

import {
  normalizeVoiceMimeType,
  voiceFeedbackMaximumDurationMs,
  voiceFeedbackMaximumFileSizeBytes,
  voiceFeedbackMinimumDurationMs,
} from '../../../supabase/functions/_shared/voiceFeedback'

export type VoiceRecorderState = 'idle' | 'requesting_permission' | 'recording' | 'recorded' | 'unsupported' | 'error'

export type VoiceRecording = {
  blob: Blob
  previewUrl: string
  mimeType: string
  durationMs: number
}

type StartResult = 'started' | 'denied' | 'unavailable' | 'unsupported'

const mimeCandidates = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/mpeg']

function supportsRecording() {
  return typeof window !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined'
}

function chooseMimeType() {
  if (!supportsRecording()) return null
  return mimeCandidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? null
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>(() => supportsRecording() ? 'idle' : 'unsupported')
  const [recording, setRecording] = useState<VoiceRecording | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const intervalRef = useRef<number | null>(null)
  const maximumTimerRef = useRef<number | null>(null)
  const interruptedRef = useRef(false)
  const previewUrlRef = useRef<string | null>(null)

  const clearTimers = useCallback(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current)
    if (maximumTimerRef.current) window.clearTimeout(maximumTimerRef.current)
    intervalRef.current = null
    maximumTimerRef.current = null
  }, [])

  const discardRecording = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
    setRecording(null)
    setElapsedMs(0)
  }, [])

  const discard = useCallback(() => {
    discardRecording()
    setError(null)
    setState(supportsRecording() ? 'idle' : 'unsupported')
  }, [discardRecording])

  const release = useCallback(() => {
    clearTimers()
    const recorder = recorderRef.current
    recorderRef.current = null
    if (recorder?.state === 'recording') {
      recorder.ondataavailable = null
      recorder.onstop = null
      try { recorder.stop() } catch { /* recorder is already stopping */ }
    }
    stopStream(streamRef.current)
    streamRef.current = null
  }, [clearTimers])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') return
    clearTimers()
    try { recorder.stop() } catch { setError('Recording could not be stopped. Please try again.'); setState('error'); release() }
  }, [clearTimers, release])

  const cancel = useCallback(() => {
    interruptedRef.current = true
    discardRecording()
    release()
    setError(null)
    setState(supportsRecording() ? 'idle' : 'unsupported')
  }, [discardRecording, release])

  const start = useCallback(async (): Promise<StartResult> => {
    if (!supportsRecording()) {
      setState('unsupported')
      setError('Voice recording is unavailable in this browser. You can type your feedback instead.')
      return 'unsupported'
    }
    const selectedMimeType = chooseMimeType()
    if (!selectedMimeType || !normalizeVoiceMimeType(selectedMimeType)) {
      setState('unsupported')
      setError('Voice recording is unavailable in this browser. You can type your feedback instead.')
      return 'unsupported'
    }

    cancel()
    setState('requesting_permission')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, { mimeType: selectedMimeType })
      recorderRef.current = recorder
      chunksRef.current = []
      interruptedRef.current = false
      startedAtRef.current = Date.now()
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const durationMs = Math.min(voiceFeedbackMaximumDurationMs, Math.max(0, Date.now() - startedAtRef.current))
        const mimeType = normalizeVoiceMimeType(recorder.mimeType || selectedMimeType)
        const blob = new Blob(chunksRef.current, { type: mimeType ?? selectedMimeType })
        clearTimers()
        stopStream(streamRef.current)
        streamRef.current = null
        recorderRef.current = null
        if (interruptedRef.current) {
          setState('error')
          setError('Recording was interrupted. Please record again or type your feedback instead.')
          return
        }
        if (!mimeType || durationMs < voiceFeedbackMinimumDurationMs || blob.size < 1) {
          setState('error')
          setError('Please record at least one second of audio.')
          return
        }
        if (blob.size > voiceFeedbackMaximumFileSizeBytes) {
          setState('error')
          setError('This recording is too large. Please record a shorter voice note.')
          return
        }
        const previewUrl = URL.createObjectURL(blob)
        previewUrlRef.current = previewUrl
        setRecording({ blob, previewUrl, mimeType, durationMs })
        setElapsedMs(durationMs)
        setError(null)
        setState('recorded')
      }
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          if (recorder.state === 'recording') {
            interruptedRef.current = true
            stop()
          }
        }
      })
      recorder.start(250)
      setElapsedMs(0)
      setError(null)
      setState('recording')
      intervalRef.current = window.setInterval(() => setElapsedMs(Math.min(voiceFeedbackMaximumDurationMs, Date.now() - startedAtRef.current)), 200)
      maximumTimerRef.current = window.setTimeout(stop, voiceFeedbackMaximumDurationMs)
      return 'started'
    } catch (cause) {
      release()
      const name = cause instanceof DOMException ? cause.name : ''
      const denied = name === 'NotAllowedError' || name === 'SecurityError'
      setState(denied ? 'unsupported' : 'error')
      setError(denied ? 'Microphone access is unavailable. You can type your feedback instead.' : 'We could not access a microphone. You can type your feedback instead.')
      return denied ? 'denied' : 'unavailable'
    }
  }, [cancel, clearTimers, release, stop])

  useEffect(() => () => {
    release()
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
  }, [release])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden || recorderRef.current?.state !== 'recording') return
      interruptedRef.current = true
      stop()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [stop])

  return { state, recording, elapsedMs, error, isSupported: supportsRecording(), start, stop, cancel, discard, release, clearError: () => setError(null) }
}
