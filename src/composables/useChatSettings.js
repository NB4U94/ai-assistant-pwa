import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { storeToRefs } from 'pinia'

export function useChatSettings() {
  const settingsStore = useSettingsStore()
  const { isTtsEnabled, selectedVoiceUri } = storeToRefs(settingsStore)

  // --- TTS Toggle Action ---
  const toggleTtsEnabled = () => {
    settingsStore.setTtsEnabled(!isTtsEnabled.value)
  }

  // --- Voice Selection State & Logic ---
  const synth = window.speechSynthesis
  const availableVoices = ref([])
  const ttsSupported = ref(!!synth)

  // Computed property with getter/setter for v-model binding to store state
  const selectedVoiceUriModel = computed({
    get: () => selectedVoiceUri.value, // Read from store state
    set: (value) => {
      settingsStore.setSelectedVoice(value) // Write using store action
    },
  })

  const populateVoiceList = () => {
    if (!ttsSupported.value) return
    try {
      const voices = synth.getVoices()
      if (voices.length > 0) {
        availableVoices.value = voices.sort((a, b) => a.name.localeCompare(b.name))
        // console.log('Voices populated:', availableVoices.value.length);
      } else {
        // console.log('getVoices() returned empty list initially.');
        // Attempt a retry shortly after, as voices may load asynchronously
        setTimeout(() => {
          // console.log('Retrying getVoices()');
          const voicesRetry = synth.getVoices()
          if (voicesRetry.length > 0) {
            availableVoices.value = voicesRetry.sort((a, b) => a.name.localeCompare(b.name))
            // console.log('Voices populated on retry:', availableVoices.value.length);
          } else {
            // console.warn('Could not populate voices after retry.');
          }
        }, 250) // Retry after 250ms (adjust if needed)
      }
    } catch (error) {
      console.error('Error getting speech synthesis voices:', error)
      ttsSupported.value = false // Mark TTS as unsupported on error
    }
  }

  onMounted(() => {
    if (ttsSupported.value) {
      populateVoiceList()
      // Listen for changes in voices (required for some browsers/OS)
      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList
      }
    }
  })

  // Expose state and methods needed by the component
  return {
    isTtsEnabled, // Reactive state from store
    toggleTtsEnabled, // Action function
    availableVoices, // Reactive list of voices
    ttsSupported, // Reactive boolean
    selectedVoiceUriModel, // Computed property for v-model
    // Add other chat settings logic here later
  }
}
