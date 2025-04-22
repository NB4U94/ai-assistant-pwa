// src/composables/useChatSettings.js
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useConversationStore } from '@/stores/conversationStore'
import { storeToRefs } from 'pinia'

export function useChatSettings() {
  const settingsStore = useSettingsStore()
  const conversationStore = useConversationStore()

  // Get reactive state from the settings store using storeToRefs
  const {
    isTtsEnabled,
    selectedVoiceUri,
    chatTemperature,
    chatModel,
    chatMaxTokens,
    chatContextLength,
    sendOnEnter,
    chatTopP,
  } = storeToRefs(settingsStore)

  // Get actions directly from the settings store instance
  const {
    setTtsEnabled,
    setSelectedVoice,
    setChatTemperature,
    setChatModel,
    setChatMaxTokens,
    setChatContextLength,
    setSendOnEnter,
    setChatTopP,
    resetChatSettingsToDefaults,
  } = settingsStore

  // Access constant directly
  const validSafetyFiltersArray = settingsStore.VALID_SAFETY_FILTERS // Keep this line if store still returns it, otherwise remove if fully removed from store return
  // console.log('[useChatSettings] VALID_SAFETY_FILTERS directly from store:', validSafetyFiltersArray); // Keep or remove based on store

  // Get clear history action from conversation store
  const { clearActiveConversation } = conversationStore

  // --- TTS Toggle Action ---
  const toggleTtsEnabledSetting = () => {
    setTtsEnabled(!isTtsEnabled.value) // Update the store state
    // *** CONSOLE LOG ADDED HERE ***
    console.log('[useChatSettings] TTS Enabled state AFTER toggle:', isTtsEnabled.value)
  }

  // --- Voice Selection State & Logic ---
  const synth = window.speechSynthesis
  const availableVoices = ref([])
  const ttsSupported = ref(!!synth)
  // console.log('[useChatSettings] Browser TTS Supported:', ttsSupported.value); // Keep previous log if needed

  const populateVoiceList = () => {
    if (!ttsSupported.value) return
    try {
      const voices = synth.getVoices()
      if (voices.length > 0) {
        availableVoices.value = voices.sort((a, b) => a.name.localeCompare(b.name))
      } else {
        setTimeout(() => {
          const voicesRetry = synth.getVoices()
          if (voicesRetry.length > 0) {
            availableVoices.value = voicesRetry.sort((a, b) => a.name.localeCompare(b.name))
          } else {
            console.warn('[useChatSettings] Could not populate voices after retry.')
          }
        }, 250)
      }
    } catch (error) {
      console.error('[useChatSettings] Error getting speech synthesis voices:', error)
      ttsSupported.value = false
    }
  }

  onMounted(() => {
    if (ttsSupported.value) {
      populateVoiceList()
      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList
      }
    }
  })

  // --- Send on Enter Toggle Helper ---
  const toggleSendOnEnter = () => {
    setSendOnEnter(!sendOnEnter.value)
  }

  // --- Clear History Handler ---
  const handleClearHistory = () => {
    if (
      window.confirm(
        'Are you sure you want to clear the chat history for the current session? This cannot be undone.',
      )
    ) {
      clearActiveConversation()
      alert('Chat history for the current session has been cleared.')
    }
  }

  // --- Reset Chat Defaults Handler ---
  const handleResetChatDefaults = () => {
    if (
      window.confirm('Are you sure you want to reset all chat settings to their default values?')
    ) {
      resetChatSettingsToDefaults()
      alert('Chat settings have been reset to defaults.')
    }
  }

  // Expose state and methods needed
  return {
    isTtsEnabled,
    toggleTtsEnabled: toggleTtsEnabledSetting, // Expose the toggle function
    availableVoices,
    ttsSupported,
    selectedVoiceUri,
    setSelectedVoice,
    chatTemperature,
    setChatTemperature,
    chatModel,
    setChatModel,
    chatMaxTokens,
    setChatMaxTokens,
    chatContextLength,
    setChatContextLength,
    sendOnEnter,
    toggleSendOnEnter, // Expose this toggle function
    chatTopP,
    setChatTopP,
    handleClearHistory,
    handleResetChatDefaults,
    // VALID_SAFETY_FILTERS: validSafetyFiltersArray, // Keep or remove based on store
  }
}
