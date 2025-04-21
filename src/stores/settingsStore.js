import { defineStore } from 'pinia'
import { ref, watch } from 'vue' // Import watch for persistence

// Using setup store syntax
export const useSettingsStore = defineStore('settings', () => {
  // --- Constants ---
  const SETTINGS_STORAGE_KEY = 'nb4u_ai_settings' // Single key for all settings

  // --- State ---
  // Existing settings
  const theme = ref('dark') // Default theme
  const isTtsEnabled = ref(false) // Default off
  const selectedVoiceUri = ref(null) // Default null

  // *** NEW: Chat API Settings ***
  const chatModel = ref('gpt-4o') // Default model
  const chatTemperature = ref(0.7) // Default temperature (0.0 - 2.0)
  const chatMaxTokens = ref(1024) // Default max tokens

  // --- Persistence ---

  /**
   * Saves the current state of all settings to localStorage.
   */
  function saveSettingsToLocalStorage() {
    try {
      const settingsToSave = {
        theme: theme.value,
        isTtsEnabled: isTtsEnabled.value,
        selectedVoiceUri: selectedVoiceUri.value,
        chatModel: chatModel.value,
        chatTemperature: chatTemperature.value,
        chatMaxTokens: chatMaxTokens.value,
      }
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave))
      // console.log('[SettingsStore] Settings saved to localStorage.');
    } catch (error) {
      console.error('[SettingsStore] Error saving settings to localStorage:', error)
    }
  }

  /**
   * Loads settings from localStorage and updates the store state.
   */
  function loadSettingsFromLocalStorage() {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (storedSettings) {
        const loadedSettings = JSON.parse(storedSettings)
        console.log('[SettingsStore] Loaded settings from localStorage:', loadedSettings)

        // Apply loaded settings only if they exist and are valid types
        if (
          typeof loadedSettings.theme === 'string' &&
          ['light', 'dark'].includes(loadedSettings.theme)
        ) {
          theme.value = loadedSettings.theme
        }
        if (typeof loadedSettings.isTtsEnabled === 'boolean') {
          isTtsEnabled.value = loadedSettings.isTtsEnabled
        }
        // Allow null or string for voice URI
        if (
          loadedSettings.selectedVoiceUri === null ||
          typeof loadedSettings.selectedVoiceUri === 'string'
        ) {
          selectedVoiceUri.value = loadedSettings.selectedVoiceUri
        }
        // Apply chat settings
        if (
          typeof loadedSettings.chatModel === 'string' &&
          loadedSettings.chatModel.trim() !== ''
        ) {
          chatModel.value = loadedSettings.chatModel
        }
        if (
          typeof loadedSettings.chatTemperature === 'number' &&
          loadedSettings.chatTemperature >= 0 &&
          loadedSettings.chatTemperature <= 2
        ) {
          chatTemperature.value = loadedSettings.chatTemperature
        }
        if (
          typeof loadedSettings.chatMaxTokens === 'number' &&
          Number.isInteger(loadedSettings.chatMaxTokens) &&
          loadedSettings.chatMaxTokens > 0
        ) {
          chatMaxTokens.value = loadedSettings.chatMaxTokens
        }
      } else {
        console.log('[SettingsStore] No settings found in localStorage, using defaults.')
        // If nothing is stored, save the initial default values
        saveSettingsToLocalStorage()
      }
    } catch (error) {
      console.error('[SettingsStore] Error loading settings from localStorage:', error)
      // In case of error, maybe save defaults?
      saveSettingsToLocalStorage()
    }
  }

  // --- Load initial state ---
  loadSettingsFromLocalStorage()

  // --- Watchers for automatic saving ---
  watch(theme, saveSettingsToLocalStorage)
  watch(isTtsEnabled, saveSettingsToLocalStorage)
  watch(selectedVoiceUri, saveSettingsToLocalStorage)
  watch(chatModel, saveSettingsToLocalStorage)
  watch(chatTemperature, saveSettingsToLocalStorage)
  watch(chatMaxTokens, saveSettingsToLocalStorage)

  // --- Actions ---

  // Existing actions (removed TODOs)
  function setTheme(newTheme) {
    if (newTheme === 'light' || newTheme === 'dark') {
      if (theme.value !== newTheme) {
        theme.value = newTheme
        console.log(`[SettingsStore] Theme set to: ${theme.value}`)
        // saveSettingsToLocalStorage(); // Watcher handles saving
      }
    } else {
      console.error('[SettingsStore] Invalid theme value:', newTheme)
    }
  }

  function setTtsEnabled(enabled) {
    const boolEnabled = !!enabled // Ensure boolean
    if (isTtsEnabled.value !== boolEnabled) {
      isTtsEnabled.value = boolEnabled
      console.log(`[SettingsStore] TTS Enabled set to: ${isTtsEnabled.value}`)
      // saveSettingsToLocalStorage(); // Watcher handles saving
    }
  }

  function setSelectedVoice(voiceUri) {
    // Allow null or string
    if (selectedVoiceUri.value !== voiceUri) {
      selectedVoiceUri.value = voiceUri
      console.log(`[SettingsStore] Selected Voice URI set to: ${selectedVoiceUri.value}`)
      // saveSettingsToLocalStorage(); // Watcher handles saving
    }
  }

  // *** NEW: Actions for Chat Settings ***
  /**
   * Sets the chat model identifier.
   * @param {string} newModel - The model ID (e.g., 'gpt-4o', 'gpt-3.5-turbo').
   */
  function setChatModel(newModel) {
    if (typeof newModel === 'string' && newModel.trim() !== '') {
      const trimmedModel = newModel.trim()
      if (chatModel.value !== trimmedModel) {
        chatModel.value = trimmedModel
        console.log(`[SettingsStore] Chat Model set to: ${chatModel.value}`)
        // saveSettingsToLocalStorage(); // Watcher handles saving
      }
    } else {
      console.error('[SettingsStore] Invalid chat model value:', newModel)
    }
  }

  /**
   * Sets the chat temperature.
   * @param {number} newTemp - The temperature value (typically 0.0 to 2.0).
   */
  function setChatTemperature(newTemp) {
    const tempNumber = Number(newTemp) // Attempt to convert to number
    if (!isNaN(tempNumber) && tempNumber >= 0 && tempNumber <= 2) {
      if (chatTemperature.value !== tempNumber) {
        chatTemperature.value = tempNumber
        console.log(`[SettingsStore] Chat Temperature set to: ${chatTemperature.value}`)
        // saveSettingsToLocalStorage(); // Watcher handles saving
      }
    } else {
      console.error('[SettingsStore] Invalid chat temperature value (must be 0-2):', newTemp)
    }
  }

  /**
   * Sets the maximum number of tokens for chat responses.
   * @param {number} newMaxTokens - The maximum tokens (positive integer).
   */
  function setChatMaxTokens(newMaxTokens) {
    const maxTokensInt = Number(newMaxTokens) // Attempt conversion
    // Check if it's an integer and positive
    if (Number.isInteger(maxTokensInt) && maxTokensInt > 0) {
      if (chatMaxTokens.value !== maxTokensInt) {
        chatMaxTokens.value = maxTokensInt
        console.log(`[SettingsStore] Chat Max Tokens set to: ${chatMaxTokens.value}`)
        // saveSettingsToLocalStorage(); // Watcher handles saving
      }
    } else {
      console.error(
        '[SettingsStore] Invalid chat max tokens value (must be positive integer):',
        newMaxTokens,
      )
    }
  }

  // Return state, getters, and actions
  return {
    // State
    theme,
    isTtsEnabled,
    selectedVoiceUri,
    chatModel, // NEW
    chatTemperature, // NEW
    chatMaxTokens, // NEW

    // Actions
    setTheme,
    setTtsEnabled,
    setSelectedVoice,
    setChatModel, // NEW
    setChatTemperature, // NEW
    setChatMaxTokens, // NEW
  }
})
