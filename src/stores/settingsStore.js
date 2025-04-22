// src/stores/settingsStore.js
import { defineStore } from 'pinia'
import { ref, watch } from 'vue' // Import watch for persistence

// Using setup store syntax
export const useSettingsStore = defineStore('settings', () => {
  // --- Constants ---
  const SETTINGS_STORAGE_KEY = 'nb4u_ai_settings'
  // Font Size
  const MIN_FONT_SIZE = 80
  const MAX_FONT_SIZE = 120
  const DEFAULT_FONT_SIZE = 100
  // Context Length
  const MIN_CONTEXT_LENGTH = 1
  const MAX_CONTEXT_LENGTH = 10
  const DEFAULT_CONTEXT_LENGTH = 5
  // Top P
  const MIN_TOP_P = 0.0
  const MAX_TOP_P = 1.0
  const DEFAULT_TOP_P = 1.0
  // Send on Enter
  const DEFAULT_SEND_ON_ENTER = true
  // --- REMOVED Safety Filter Constants ---
  // const VALID_SAFETY_FILTERS = ['default', 'strict', 'none']
  // const DEFAULT_SAFETY_FILTER = 'default'
  // --- Other Defaults ---
  const DEFAULT_THEME = 'dark'
  const DEFAULT_TTS_ENABLED = false
  const DEFAULT_VOICE_URI = null
  const DEFAULT_CHAT_MODEL = 'gpt-4o'
  const DEFAULT_TEMPERATURE = 0.7
  const DEFAULT_MAX_TOKENS = 1024

  // --- State ---
  const theme = ref(DEFAULT_THEME)
  const isTtsEnabled = ref(DEFAULT_TTS_ENABLED)
  const selectedVoiceUri = ref(DEFAULT_VOICE_URI)
  const chatModel = ref(DEFAULT_CHAT_MODEL)
  const chatTemperature = ref(DEFAULT_TEMPERATURE)
  const chatMaxTokens = ref(DEFAULT_MAX_TOKENS)
  const appFontSize = ref(DEFAULT_FONT_SIZE)
  const chatContextLength = ref(DEFAULT_CONTEXT_LENGTH)
  const sendOnEnter = ref(DEFAULT_SEND_ON_ENTER)
  const chatTopP = ref(DEFAULT_TOP_P)
  // --- REMOVED chatSafetyFilter state ---
  // const chatSafetyFilter = ref(DEFAULT_SAFETY_FILTER)

  // --- Persistence ---

  function saveSettingsToLocalStorage() {
    try {
      const settingsToSave = {
        theme: theme.value,
        isTtsEnabled: isTtsEnabled.value,
        selectedVoiceUri: selectedVoiceUri.value,
        chatModel: chatModel.value,
        chatTemperature: chatTemperature.value,
        chatMaxTokens: chatMaxTokens.value,
        appFontSize: appFontSize.value,
        chatContextLength: chatContextLength.value,
        sendOnEnter: sendOnEnter.value,
        chatTopP: chatTopP.value,
        // --- REMOVED chatSafetyFilter ---
      }
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave))
      // console.log('[SettingsStore] Settings saved to localStorage.');
    } catch (error) {
      console.error('[SettingsStore] Error saving settings to localStorage:', error)
    }
  }

  function loadSettingsFromLocalStorage() {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (storedSettings) {
        const loadedSettings = JSON.parse(storedSettings)
        console.log('[SettingsStore] Loaded settings from localStorage:', loadedSettings)

        // Apply loaded settings with validation
        theme.value =
          typeof loadedSettings.theme === 'string' &&
          ['light', 'dark'].includes(loadedSettings.theme)
            ? loadedSettings.theme
            : DEFAULT_THEME
        isTtsEnabled.value =
          typeof loadedSettings.isTtsEnabled === 'boolean'
            ? loadedSettings.isTtsEnabled
            : DEFAULT_TTS_ENABLED
        selectedVoiceUri.value =
          loadedSettings.selectedVoiceUri === null ||
          typeof loadedSettings.selectedVoiceUri === 'string'
            ? loadedSettings.selectedVoiceUri
            : DEFAULT_VOICE_URI
        chatModel.value =
          typeof loadedSettings.chatModel === 'string' && loadedSettings.chatModel.trim() !== ''
            ? loadedSettings.chatModel
            : DEFAULT_CHAT_MODEL
        chatTemperature.value =
          typeof loadedSettings.chatTemperature === 'number' &&
          loadedSettings.chatTemperature >= 0 &&
          loadedSettings.chatTemperature <= 2
            ? loadedSettings.chatTemperature
            : DEFAULT_TEMPERATURE
        chatMaxTokens.value =
          typeof loadedSettings.chatMaxTokens === 'number' &&
          Number.isInteger(loadedSettings.chatMaxTokens) &&
          loadedSettings.chatMaxTokens > 0
            ? loadedSettings.chatMaxTokens
            : DEFAULT_MAX_TOKENS
        appFontSize.value =
          typeof loadedSettings.appFontSize === 'number' &&
          loadedSettings.appFontSize >= MIN_FONT_SIZE &&
          loadedSettings.appFontSize <= MAX_FONT_SIZE
            ? loadedSettings.appFontSize
            : DEFAULT_FONT_SIZE
        chatContextLength.value =
          typeof loadedSettings.chatContextLength === 'number' &&
          Number.isInteger(loadedSettings.chatContextLength) &&
          loadedSettings.chatContextLength >= MIN_CONTEXT_LENGTH &&
          loadedSettings.chatContextLength <= MAX_CONTEXT_LENGTH
            ? loadedSettings.chatContextLength
            : DEFAULT_CONTEXT_LENGTH
        sendOnEnter.value =
          typeof loadedSettings.sendOnEnter === 'boolean'
            ? loadedSettings.sendOnEnter
            : DEFAULT_SEND_ON_ENTER
        chatTopP.value =
          typeof loadedSettings.chatTopP === 'number' &&
          loadedSettings.chatTopP >= MIN_TOP_P &&
          loadedSettings.chatTopP <= MAX_TOP_P
            ? loadedSettings.chatTopP
            : DEFAULT_TOP_P
        // --- REMOVED Safety Filter Loading ---
      } else {
        console.log('[SettingsStore] No settings found in localStorage, applying defaults.')
        // Apply all defaults if no settings found
        theme.value = DEFAULT_THEME
        isTtsEnabled.value = DEFAULT_TTS_ENABLED
        selectedVoiceUri.value = DEFAULT_VOICE_URI
        chatModel.value = DEFAULT_CHAT_MODEL
        chatTemperature.value = DEFAULT_TEMPERATURE
        chatMaxTokens.value = DEFAULT_MAX_TOKENS
        appFontSize.value = DEFAULT_FONT_SIZE
        chatContextLength.value = DEFAULT_CONTEXT_LENGTH
        sendOnEnter.value = DEFAULT_SEND_ON_ENTER
        chatTopP.value = DEFAULT_TOP_P
        saveSettingsToLocalStorage() // Save the initial defaults
      }
    } catch (error) {
      console.error('[SettingsStore] Error loading/parsing settings from localStorage:', error)
      // Reset all to defaults on error
      theme.value = DEFAULT_THEME
      isTtsEnabled.value = DEFAULT_TTS_ENABLED
      selectedVoiceUri.value = DEFAULT_VOICE_URI
      chatModel.value = DEFAULT_CHAT_MODEL
      chatTemperature.value = DEFAULT_TEMPERATURE
      chatMaxTokens.value = DEFAULT_MAX_TOKENS
      appFontSize.value = DEFAULT_FONT_SIZE
      chatContextLength.value = DEFAULT_CONTEXT_LENGTH
      sendOnEnter.value = DEFAULT_SEND_ON_ENTER
      chatTopP.value = DEFAULT_TOP_P
      saveSettingsToLocalStorage() // Attempt to save defaults on error
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
  watch(appFontSize, saveSettingsToLocalStorage)
  watch(chatContextLength, saveSettingsToLocalStorage)
  watch(sendOnEnter, saveSettingsToLocalStorage)
  watch(chatTopP, saveSettingsToLocalStorage)
  // --- REMOVED Safety Filter Watcher ---

  // --- Actions (with implementation) ---

  function setTheme(newTheme) {
    if (newTheme === 'light' || newTheme === 'dark') {
      if (theme.value !== newTheme) theme.value = newTheme
    } else console.error('[SettingsStore] Invalid theme value:', newTheme)
  }

  function setTtsEnabled(enabled) {
    const boolEnabled = !!enabled // Convert to boolean
    if (isTtsEnabled.value !== boolEnabled) isTtsEnabled.value = boolEnabled
  }

  function setSelectedVoice(voiceUri) {
    if (selectedVoiceUri.value !== voiceUri) selectedVoiceUri.value = voiceUri
  }

  function setChatModel(newModel) {
    if (typeof newModel === 'string' && newModel.trim() !== '') {
      const trimmedModel = newModel.trim()
      if (chatModel.value !== trimmedModel) chatModel.value = trimmedModel
    } else console.error('[SettingsStore] Invalid chat model value:', newModel)
  }

  function setChatTemperature(newTemp) {
    const tempNumber = Number(newTemp)
    if (!isNaN(tempNumber) && tempNumber >= 0 && tempNumber <= 2) {
      if (chatTemperature.value !== tempNumber) chatTemperature.value = tempNumber
    } else console.error('[SettingsStore] Invalid chat temperature value (must be 0-2):', newTemp)
  }

  function setChatMaxTokens(newMaxTokens) {
    const maxTokensInt = Number(newMaxTokens)
    if (newMaxTokens === '' || (Number.isInteger(maxTokensInt) && maxTokensInt > 0)) {
      if (chatMaxTokens.value !== newMaxTokens) chatMaxTokens.value = newMaxTokens
    } else {
      console.error(
        '[SettingsStore] Invalid chat max tokens value (must be positive integer or empty):',
        newMaxTokens,
      )
    }
  }

  function setAppFontSize(newSize) {
    const sizeNumber = Number(newSize)
    if (!isNaN(sizeNumber) && sizeNumber >= MIN_FONT_SIZE && sizeNumber <= MAX_FONT_SIZE) {
      const validatedSize = Math.round(sizeNumber)
      if (appFontSize.value !== validatedSize) appFontSize.value = validatedSize
    } else
      console.error(
        `[SettingsStore] Invalid font size value (must be ${MIN_FONT_SIZE}-${MAX_FONT_SIZE}):`,
        newSize,
      )
  }

  function setChatContextLength(newLength) {
    const lengthNumber = Number(newLength)
    if (
      Number.isInteger(lengthNumber) &&
      lengthNumber >= MIN_CONTEXT_LENGTH &&
      lengthNumber <= MAX_CONTEXT_LENGTH
    ) {
      if (chatContextLength.value !== lengthNumber) {
        chatContextLength.value = lengthNumber
      }
    } else {
      console.error(
        `[SettingsStore] Invalid context length value (must be integer ${MIN_CONTEXT_LENGTH}-${MAX_CONTEXT_LENGTH}):`,
        newLength,
      )
    }
  }

  function setSendOnEnter(enabled) {
    const boolEnabled = !!enabled
    if (sendOnEnter.value !== boolEnabled) {
      sendOnEnter.value = boolEnabled
    }
  }

  function setChatTopP(newTopP) {
    const topPNumber = Number(newTopP)
    if (!isNaN(topPNumber) && topPNumber >= MIN_TOP_P && topPNumber <= MAX_TOP_P) {
      const validatedTopP = parseFloat(topPNumber.toFixed(2))
      if (chatTopP.value !== validatedTopP) {
        chatTopP.value = validatedTopP
      }
    } else {
      console.error(
        `[SettingsStore] Invalid Top P value (must be number ${MIN_TOP_P}-${MAX_TOP_P}):`,
        newTopP,
      )
    }
  }

  // --- REMOVED setChatSafetyFilter ---

  // --- *** NEW: Reset Chat Settings Action *** ---
  function resetChatSettingsToDefaults() {
    console.log('[SettingsStore] Resetting chat settings to defaults.')
    isTtsEnabled.value = DEFAULT_TTS_ENABLED
    selectedVoiceUri.value = DEFAULT_VOICE_URI
    chatModel.value = DEFAULT_CHAT_MODEL
    chatTemperature.value = DEFAULT_TEMPERATURE
    chatMaxTokens.value = DEFAULT_MAX_TOKENS
    chatContextLength.value = DEFAULT_CONTEXT_LENGTH
    sendOnEnter.value = DEFAULT_SEND_ON_ENTER
    chatTopP.value = DEFAULT_TOP_P
    // No need to reset safety filter as it's removed
    // Note: This triggers individual watchers which call saveSettingsToLocalStorage() implicitly
  }

  // Return state, getters, actions, and constants
  return {
    // State
    theme,
    isTtsEnabled,
    selectedVoiceUri,
    chatModel,
    chatTemperature,
    chatMaxTokens,
    appFontSize,
    chatContextLength,
    sendOnEnter,
    chatTopP,
    // REMOVED chatSafetyFilter

    // Actions
    setTheme,
    setTtsEnabled,
    setSelectedVoice,
    setChatModel,
    setChatTemperature,
    setChatMaxTokens,
    setAppFontSize,
    setChatContextLength,
    setSendOnEnter,
    setChatTopP,
    // REMOVED setChatSafetyFilter
    resetChatSettingsToDefaults, // *** ADDED Reset Action ***

    // Constants needed by UI (REMOVED VALID_SAFETY_FILTERS)
  }
})
