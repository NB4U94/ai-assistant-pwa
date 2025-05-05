// src/composables/useSpeechRecognition.js (Simplified)
import { ref, onMounted, onUnmounted } from 'vue' // Removed nextTick

// Error callback type definition
/**
 * @callback AddErrorCallback
 * @param {string} errorMessage - The error message text.
 */

/**
 * Composable for handling Speech Recognition (Voice Input).
 * Focuses on updating userInputRef and reporting errors.
 *
 * @param {object} options
 * @param {import('vue').Ref<string>} options.userInputRef - Ref to the user input model.
 * @param {AddErrorCallback} options.addErrorMessage - Callback function to display errors to the user.
 * @returns {object} - Reactive state and methods for speech recognition.
 */
export function useSpeechRecognition({
  userInputRef, // <<< Required
  addErrorMessage, // <<< Required
}) {
  const isListening = ref(false)
  const recognition = ref(null)
  const speechSupported = ref(false)

  // --- Input Validation ---
  if (!userInputRef || typeof userInputRef.value === 'undefined') {
    console.error('[useSpeechRecognition] FATAL: Requires a valid ref for userInputRef.')
    // Return inert state if required refs/callbacks are missing
    return { isListening: ref(false), speechSupported: ref(false), toggleListening: () => {} }
  }
  if (typeof addErrorMessage !== 'function') {
    console.error('[useSpeechRecognition] FATAL: Requires a function for addErrorMessage.')
    // Return inert state
    return { isListening: ref(false), speechSupported: ref(false), toggleListening: () => {} }
  }
  // --- End Input Validation ---

  const setupSpeechRecognition = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SR) {
      speechSupported.value = true
      try {
        recognition.value = new SR()
        recognition.value.continuous = false
        recognition.value.lang = 'en-US'
        recognition.value.interimResults = false
        recognition.value.maxAlternatives = 1

        recognition.value.onresult = (event) => {
          const transcript = event.results?.[0]?.[0]?.transcript
          if (transcript) {
            // Check userInputRef is still valid before updating
            if (userInputRef && typeof userInputRef.value !== 'undefined') {
              // Append transcript to existing user input
              userInputRef.value += (userInputRef.value ? ' ' : '') + transcript
              // --- REMOVED nextTick and autoGrowTextarea call ---
              // The watcher in useChatViewLogic will handle resizing.
            } else {
              console.error(
                '[useSpeechRecognition] ERROR: userInputRef became invalid in onresult handler.',
              )
              addErrorMessage('Internal error processing speech result.')
            }
          }
        }

        recognition.value.onerror = (event) => {
          console.error(
            '[useSpeechRecognition] Speech Recognition Error:',
            event.error,
            event.message,
          )
          let errorMessage = `Speech Recognition Error: ${event.error}`
          if (['not-allowed', 'service-not-allowed'].includes(event.error)) {
            errorMessage = 'Microphone access denied. Please check browser permissions.'
          } else if (event.error === 'no-speech') {
            errorMessage = 'No speech detected. Please try again.'
          } else if (event.error === 'audio-capture') {
            errorMessage = 'Microphone problem detected. Ensure it is connected and working.'
          } else if (event.error === 'network') {
            errorMessage = 'Network error during speech recognition.'
          }
          addErrorMessage(errorMessage) // Use the provided callback
          isListening.value = false
        }

        recognition.value.onstart = () => {
          isListening.value = true
        }

        recognition.value.onend = () => {
          if (recognition.value) {
            isListening.value = false
          }
        }
      } catch (e) {
        console.error('[useSpeechRecognition] Speech Recognition initialization failed:', e)
        speechSupported.value = false
        addErrorMessage('Speech recognition setup failed on this device.')
      }
    } else {
      console.warn('[useSpeechRecognition] Speech Recognition API not supported.')
      speechSupported.value = false
    }
  }

  const startListening = () => {
    if (!speechSupported.value || !recognition.value) {
      addErrorMessage('Speech recognition not supported or not initialized.')
      return
    }
    if (isListening.value) return
    try {
      recognition.value.start()
    } catch (e) {
      console.error(`[useSpeechRecognition] Error starting speech recognition: ${e.name}`, e)
      if (e.name !== 'InvalidStateError') {
        addErrorMessage(`Voice input start error: ${e.message || e.name}`)
      }
      isListening.value = false
    }
  }

  const stopListening = () => {
    if (!speechSupported.value || !recognition.value || !isListening.value) return
    try {
      recognition.value.stop()
    } catch (e) {
      console.warn('[useSpeechRecognition] Error stopping speech recognition:', e)
      isListening.value = false
    }
  }

  const toggleListening = () => {
    if (!speechSupported.value) {
      // Check if addErrorMessage is available before calling
      if (typeof addErrorMessage === 'function') {
        addErrorMessage('Voice input not supported on this browser or device.')
      } else {
        console.error('[useSpeechRecognition] addErrorMessage function is missing!')
      }
      return
    }
    if (isListening.value) {
      stopListening()
    } else {
      startListening()
    }
  }

  onMounted(() => {
    setupSpeechRecognition()
  })

  onUnmounted(() => {
    if (recognition.value) {
      try {
        recognition.value.onresult = null
        recognition.value.onerror = null
        recognition.value.onstart = null
        recognition.value.onend = null
        recognition.value.abort()
        console.log('[useSpeechRecognition] Recognition aborted and listeners cleaned up.')
      } catch (e) {
        console.warn('[useSpeechRecognition] Error during unmount cleanup:', e)
      }
      recognition.value = null
    }
  })

  return {
    isListening,
    speechSupported,
    toggleListening,
  }
}
