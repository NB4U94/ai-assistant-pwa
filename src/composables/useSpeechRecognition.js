import { ref, nextTick, onMounted, onUnmounted } from 'vue'

// Error callback type definition for clarity (optional but good practice)
/**
 * @callback AddErrorCallback
 * @param {string} errorMessage - The error message text.
 */

/**
 * Composable for handling Speech Recognition (Voice Input).
 *
 * @param {object} options
 * @param {import('vue').Ref<string>} options.userInputRef - Ref to the user input model.
 * @param {import('vue').Ref<HTMLTextAreaElement|null>} options.inputAreaRef - Ref to the textarea element.
 * @param {Function} options.autoGrowTextarea - Function to resize the textarea.
 * @param {AddErrorCallback} options.addErrorMessage - Callback function to display errors to the user.
 * @returns {object} - Reactive state and methods for speech recognition.
 */
export function useSpeechRecognition({
  userInputRef,
  inputAreaRef,
  autoGrowTextarea,
  addErrorMessage,
}) {
  const isListening = ref(false)
  const recognition = ref(null)
  const speechSupported = ref(false)

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
            // Append transcript to existing user input
            userInputRef.value += (userInputRef.value ? ' ' : '') + transcript
            nextTick(() => {
              // Auto-grow textarea after updating input
              if (inputAreaRef.value) autoGrowTextarea({ target: inputAreaRef.value })
            })
          }
          // isListening.value = false; // Handled by onend
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
          addErrorMessage(errorMessage) // Use the callback
          isListening.value = false
        }

        recognition.value.onstart = () => {
          isListening.value = true
        }

        recognition.value.onend = () => {
          // Ensure listening state is always false when recognition ends
          isListening.value = false
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
      addErrorMessage('Speech recognition not supported on this device.')
      return
    }
    if (isListening.value) return
    try {
      recognition.value.start()
    } catch (e) {
      console.error(`[useSpeechRecognition] Error starting speech recognition: ${e.name}`, e)
      // Avoid showing error for trying to start again immediately after stop
      if (e.name !== 'InvalidStateError') {
        addErrorMessage(`Voice input start error: ${e.message}`)
      }
      isListening.value = false
    }
  }

  const stopListening = () => {
    if (!speechSupported.value || !recognition.value || !isListening.value) return
    try {
      recognition.value.stop()
    } catch (e) {
      // Errors on stopping are usually less critical, just log them.
      console.warn('[useSpeechRecognition] Error stopping speech recognition:', e)
      isListening.value = false // Ensure state is reset
    }
  }

  const toggleListening = () => {
    if (!speechSupported.value) {
      addErrorMessage('Voice input not supported on this browser or device.')
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
        recognition.value.abort() // Abort any ongoing recognition
      } catch (e) {
        /* ignore potential errors on abort */
      }
    }
  })

  return {
    isListening,
    speechSupported,
    toggleListening,
  }
}
