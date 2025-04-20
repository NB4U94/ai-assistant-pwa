import { defineStore } from 'pinia'
import { ref } from 'vue' // Import ref for setup store syntax

// Using setup store syntax is often preferred for better type inference
export const useSettingsStore = defineStore('settings', () => {
  // --- State ---
  const theme = ref('dark') // Default theme
  const isTtsEnabled = ref(false) // NEW: TTS master toggle state, default off
  const selectedVoiceUri = ref(null) // NEW: Store URI of selected voice, null for default

  // --- Getters ---
  // Getters are effectively computed properties based on state
  // const isDarkTheme = computed(() => theme.value === 'dark') // Example

  // --- Actions ---

  /**
   * Sets the application theme.
   * @param {string} newTheme - The new theme value ('light' or 'dark').
   */
  function setTheme(newTheme) {
    if (newTheme === 'light' || newTheme === 'dark') {
      theme.value = newTheme
      console.log(`[SettingsStore] Theme set to: ${theme.value}`)
      // TODO: Persist theme choice to localStorage
    } else {
      console.error('[SettingsStore] Invalid theme value provided to setTheme:', newTheme)
    }
  }

  /**
   * Sets the master TTS enabled state.
   * @param {boolean} enabled - True to enable TTS, false to disable.
   */
  function setTtsEnabled(enabled) {
    isTtsEnabled.value = !!enabled // Ensure boolean value
    console.log(`[SettingsStore] TTS Enabled set to: ${isTtsEnabled.value}`)
    // TODO: Persist TTS choice to localStorage
  }

  /**
   * Sets the preferred TTS voice URI.
   * @param {string | null} voiceUri - The URI of the selected voice, or null for default.
   */
  function setSelectedVoice(voiceUri) {
    // Basic check - could add validation against available voices later if needed
    selectedVoiceUri.value = voiceUri
    console.log(`[SettingsStore] Selected Voice URI set to: ${selectedVoiceUri.value}`)
    // TODO: Persist voice choice to localStorage
  }

  // Return state, getters, and actions
  return {
    // State
    theme,
    isTtsEnabled,
    selectedVoiceUri,

    // Getters (if any are defined like isDarkTheme)
    // isDarkTheme,

    // Actions
    setTheme,
    setTtsEnabled,
    setSelectedVoice,
  }
})
