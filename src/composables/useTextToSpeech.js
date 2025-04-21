import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { storeToRefs } from 'pinia'

// Error callback type definition
/**
 * @callback AddErrorCallback
 * @param {string} errorMessage - The error message text.
 */

/**
 * Composable for handling Text-to-Speech (TTS).
 *
 * @param {object} options
 * @param {AddErrorCallback} options.addErrorMessage - Callback function to display errors.
 * @returns {object} - Reactive state and methods for TTS.
 */
export function useTextToSpeech({ addErrorMessage }) {
  const settingsStore = useSettingsStore()
  const { isTtsEnabled, selectedVoiceUri } = storeToRefs(settingsStore)

  const synth = ref(null) // Use ref for synth instance
  const ttsSupported = ref(false)
  const availableVoices = ref([])
  const isSpeaking = ref(false) // Track speaking state locally

  const loadVoices = () => {
    if (!synth.value) return
    try {
      availableVoices.value = synth.value.getVoices().sort((a, b) => a.name.localeCompare(b.name))
      if (availableVoices.value.length > 0) {
        console.log('[useTextToSpeech] Voices loaded:', availableVoices.value.length)
        // Attempt to remove the event listener after successful load
        if (synth.value && typeof synth.value.removeEventListener === 'function') {
          try {
            synth.value.removeEventListener('voiceschanged', loadVoices)
          } catch (e) {
            /* ignore */
          }
        } else if (synth.value) {
          // Fallback for older browsers maybe?
          synth.value.onvoiceschanged = null
        }
      } else {
        console.warn('[useTextToSpeech] No voices available after check/event.')
        // Keep listener active if voices are still not loaded? Or retry later?
        // For simplicity, we let it be for now. Might need retry logic in complex cases.
      }
    } catch (e) {
      console.error('[useTextToSpeech] Error getting voices:', e)
      addErrorMessage('Could not load speech synthesis voices.')
      ttsSupported.value = false // Mark as unsupported if voices can't be loaded
    }
  }

  const trySpeak = (text) => {
    if (!synth.value || !text) return

    try {
      const utterance = new SpeechSynthesisUtterance(text)

      // Set voice if selected and available
      if (selectedVoiceUri.value && availableVoices.value.length > 0) {
        const selectedVoice = availableVoices.value.find(
          (v) => v.voiceURI === selectedVoiceUri.value,
        )
        if (selectedVoice) {
          utterance.voice = selectedVoice
        } else {
          console.warn(
            `[useTextToSpeech] Voice URI ${selectedVoiceUri.value} not found. Using default.`,
          )
        }
      }

      utterance.onstart = () => {
        isSpeaking.value = true
      }
      utterance.onend = () => {
        isSpeaking.value = false
      }
      utterance.onerror = (event) => {
        console.error(`[useTextToSpeech] Speech Synthesis Error: ${event.error}`, event)
        // Avoid bothering user for interruptions/cancellations
        if (!['interrupted', 'canceled'].includes(event.error)) {
          addErrorMessage(`Speech Error: ${event.error}`)
        }
        isSpeaking.value = false // Ensure state is reset on error
      }

      synth.value.speak(utterance)
    } catch (e) {
      console.error('[useTextToSpeech] Error creating/speaking utterance:', e)
      addErrorMessage('Could not speak message due to an error.')
      isSpeaking.value = false // Ensure state is reset
    }
  }

  const speakText = (text) => {
    // Check support, synth instance, text content, and if TTS is globally enabled
    if (!ttsSupported.value || !synth.value || !text || !isTtsEnabled.value) {
      if (!isTtsEnabled.value)
        console.log('[useTextToSpeech] Speak request ignored: TTS is disabled in settings.')
      return
    }

    // If currently speaking, cancel the previous speech first
    if (synth.value.speaking) {
      synth.value.cancel()
      // Use a short timeout to allow cancel to process before starting new speech
      setTimeout(() => {
        trySpeak(text)
      }, 50) // 50ms delay might need adjustment
    } else {
      trySpeak(text)
    }
  }

  const toggleTts = () => {
    if (!ttsSupported.value) {
      addErrorMessage('Text-to-Speech is not supported on this browser or device.')
      return
    }
    // Toggle the setting in the store
    settingsStore.setTtsEnabled(!isTtsEnabled.value)

    // If TTS was just turned OFF and speech is happening, stop it.
    if (!settingsStore.isTtsEnabled && synth.value?.speaking) {
      synth.value.cancel()
      isSpeaking.value = false // Update local state too
    }
  }

  // Handle clicking on an AI message to read it aloud
  const handleMessageClick = (text) => {
    if (isTtsEnabled.value) {
      speakText(text)
    }
  }

  onMounted(() => {
    // Initialize SpeechSynthesis API
    if ('speechSynthesis' in window) {
      synth.value = window.speechSynthesis
      ttsSupported.value = true

      // Attempt to load voices immediately
      loadVoices()

      // Fallback: Use onvoiceschanged event if voices aren't loaded initially
      if (availableVoices.value.length === 0 && synth.value) {
        if (typeof synth.value.addEventListener === 'function') {
          // Modern approach
          synth.value.addEventListener('voiceschanged', loadVoices)
        } else {
          // Older approach
          synth.value.onvoiceschanged = loadVoices
        }
        console.log(
          "[useTextToSpeech] Voices not immediately available, waiting for 'voiceschanged' event.",
        )
      }
    } else {
      console.warn('[useTextToSpeech] Speech Synthesis API not supported.')
      ttsSupported.value = false
    }
  })

  onUnmounted(() => {
    // Clean up: cancel any ongoing speech and remove listener
    if (synth.value) {
      synth.value.cancel()
      if (typeof synth.value.removeEventListener === 'function') {
        try {
          synth.value.removeEventListener('voiceschanged', loadVoices)
        } catch (e) {
          /* ignore */
        }
      } else {
        synth.value.onvoiceschanged = null
      }
    }
  })

  return {
    ttsSupported,
    isTtsEnabled, // Expose the reactive setting from the store
    isSpeaking, // Expose the current speaking state
    speakText,
    toggleTts,
    handleMessageClick, // Expose the click handler
  }
}
