/**
 * Voice Input Hook
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Uses Web Speech API for voice-to-text input.
 * Features:
 * - Browser compatibility detection
 * - Microphone permission handling
 * - Multi-language support (7 languages)
 * - Continuous vs single-shot modes
 * - Visual feedback states
 *
 * Best Practices (2026):
 * - Treat speech like media playback with explicit status transitions
 * - Handle permission states gracefully
 * - Provide privacy controls (on-device processing when available)
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

// ============================================
// TYPES
// ============================================

export type VoiceInputStatus =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'processing'
  | 'error'
  | 'not_supported'

export interface VoiceInputResult {
  transcript: string
  confidence: number
  isFinal: boolean
}

export interface UseVoiceInputOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (result: VoiceInputResult) => void
  onError?: (error: string) => void
  onStatusChange?: (status: VoiceInputStatus) => void
}

export interface UseVoiceInputReturn {
  status: VoiceInputStatus
  isListening: boolean
  isSupported: boolean
  isMicrophoneAvailable: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

// ============================================
// LANGUAGE MAP
// ============================================

const LANGUAGE_CODES: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ja: 'ja-JP',
  zh: 'zh-CN',
  hi: 'hi-IN',
}

// ============================================
// HOOK
// ============================================

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    language = 'en',
    continuous = false,
    interimResults = true,
    onResult,
    onError,
    onStatusChange,
  } = options

  // State
  const [status, setStatus] = useState<VoiceInputStatus>('idle')
  const [isSupported, setIsSupported] = useState(false)
  const [isMicrophoneAvailable, setIsMicrophoneAvailable] = useState(true)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isListeningRef = useRef(false)

  // Update status and notify
  const updateStatus = useCallback(
    (newStatus: VoiceInputStatus) => {
      setStatus(newStatus)
      onStatusChange?.(newStatus)
    },
    [onStatusChange]
  )

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window.SpeechRecognition || window.webkitSpeechRecognition)
        : null

    if (SpeechRecognition) {
      setIsSupported(true)
    } else {
      setIsSupported(false)
      updateStatus('not_supported')
    }
  }, [updateStatus])

  // Initialize recognition
  const initRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) return null

    const recognition = new SpeechRecognition()

    // Configuration
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.lang = LANGUAGE_CODES[language] || language
    recognition.maxAlternatives = 1

    // Event handlers
    recognition.onstart = () => {
      isListeningRef.current = true
      updateStatus('listening')
      setError(null)
    }

    recognition.onend = () => {
      isListeningRef.current = false
      if (status !== 'error') {
        updateStatus('idle')
      }
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript

        if (result.isFinal) {
          finalTranscript += text
        } else {
          interimText += text
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript)
        setInterimTranscript('')

        onResult?.({
          transcript: finalTranscript,
          confidence: event.results[event.results.length - 1][0].confidence,
          isFinal: true,
        })
      } else {
        setInterimTranscript(interimText)

        onResult?.({
          transcript: interimText,
          confidence: 0,
          isFinal: false,
        })
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = 'Speech recognition error'

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.'
          break
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your settings.'
          setIsMicrophoneAvailable(false)
          break
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access.'
          setIsMicrophoneAvailable(false)
          break
        case 'network':
          errorMessage = 'Network error. Please check your connection.'
          break
        case 'aborted':
          errorMessage = 'Speech recognition was aborted.'
          break
        default:
          errorMessage = `Error: ${event.error}`
      }

      setError(errorMessage)
      updateStatus('error')
      onError?.(errorMessage)
    }

    return recognition
  }, [continuous, interimResults, language, onResult, onError, status, updateStatus])

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser.')
      updateStatus('not_supported')
      return
    }

    if (isListeningRef.current) {
      return
    }

    // Clean up previous instance
    if (recognitionRef.current) {
      recognitionRef.current.abort()
    }

    // Request microphone permission first
    updateStatus('requesting_permission')

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        setIsMicrophoneAvailable(true)

        const recognition = initRecognition()
        if (recognition) {
          recognitionRef.current = recognition
          recognition.start()
        }
      })
      .catch((err) => {
        setIsMicrophoneAvailable(false)
        setError('Microphone access denied. Please allow microphone access.')
        updateStatus('error')
        onError?.('Microphone access denied')
      })
  }, [isSupported, initRecognition, updateStatus, onError])

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop()
      isListeningRef.current = false
    }
  }, [])

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  return {
    status,
    isListening: status === 'listening',
    isSupported,
    isMicrophoneAvailable,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  }
}

// ============================================
// TYPE DECLARATIONS (for Web Speech API)
// ============================================

// Web Speech API types for browsers that support it
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor
    webkitSpeechRecognition: SpeechRecognitionConstructor
  }
}
