// src/stores/settingsStore.js
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // --- Constants ---
  const SETTINGS_STORAGE_KEY = 'nb4u_ai_settings'

  // General
  const DEFAULT_THEME = 'dark'
  const MIN_FONT_SIZE = 80
  const MAX_FONT_SIZE = 120
  const DEFAULT_FONT_SIZE = 100
  const DEFAULT_UI_SOUND_EFFECTS_ENABLED = false

  // Chat
  const DEFAULT_TTS_ENABLED = false
  const DEFAULT_VOICE_URI = null
  const DEFAULT_CHAT_MODEL = 'gpt-4o'
  const DEFAULT_TEMPERATURE = 0.7
  const DEFAULT_MAX_TOKENS = 1024
  const MIN_CONTEXT_LENGTH = 1
  const MAX_CONTEXT_LENGTH = 10
  const DEFAULT_CONTEXT_LENGTH = 5
  const DEFAULT_SEND_ON_ENTER = true
  const MIN_TOP_P = 0.0
  const MAX_TOP_P = 1.0
  const DEFAULT_TOP_P = 1.0

  // Image Gen
  const VALID_ASPECT_RATIOS = ['1:1', '16:9', '9:16']
  const DEFAULT_IMAGE_GEN_ASPECT_RATIO = '1:1'
  const VALID_IMAGE_STYLES = ['Standard', 'Vivid', 'Natural', 'Cinematic']
  const DEFAULT_IMAGE_GEN_STYLE = 'Standard'
  const DEFAULT_IMAGE_GEN_NEGATIVE_PROMPT = ''
  const MIN_NUM_IMAGES = 1
  const MAX_NUM_IMAGES = 4
  const DEFAULT_IMAGE_GEN_NUM_IMAGES = 1

  // Assistants
  const DEFAULT_ASSISTANTS_INSTRUCTIONS = 'You are a helpful AI assistant.'

  // *** NEW: My AI Constants ***
  const DEFAULT_MYAI_CONTEXT_SEGMENTS = [] // Start with empty array
  const DEFAULT_MYAI_APPLY_TO_ALL = true

  // --- State ---
  // General
  const theme = ref(DEFAULT_THEME)
  const appFontSize = ref(DEFAULT_FONT_SIZE)
  const uiSoundEffectsEnabled = ref(DEFAULT_UI_SOUND_EFFECTS_ENABLED)

  // Chat
  const isTtsEnabled = ref(DEFAULT_TTS_ENABLED)
  const selectedVoiceUri = ref(DEFAULT_VOICE_URI)
  const chatModel = ref(DEFAULT_CHAT_MODEL)
  const chatTemperature = ref(DEFAULT_TEMPERATURE)
  const chatMaxTokens = ref(DEFAULT_MAX_TOKENS)
  const chatContextLength = ref(DEFAULT_CONTEXT_LENGTH)
  const sendOnEnter = ref(DEFAULT_SEND_ON_ENTER)
  const chatTopP = ref(DEFAULT_TOP_P)

  // Image Gen
  const imageGenDefaultAspectRatio = ref(DEFAULT_IMAGE_GEN_ASPECT_RATIO)
  const imageGenDefaultStyle = ref(DEFAULT_IMAGE_GEN_STYLE)
  const imageGenDefaultNegativePrompt = ref(DEFAULT_IMAGE_GEN_NEGATIVE_PROMPT)
  const imageGenDefaultNumImages = ref(DEFAULT_IMAGE_GEN_NUM_IMAGES)

  // Assistants
  const assistantsDefaultInstructions = ref(DEFAULT_ASSISTANTS_INSTRUCTIONS)

  // *** NEW: My AI State ***
  const myAiContextSegments = ref(DEFAULT_MYAI_CONTEXT_SEGMENTS) // Array of strings
  const myAiContextApplyToAll = ref(DEFAULT_MYAI_APPLY_TO_ALL) // Boolean
  // Use a Set for efficient add/delete/has checks, but store as Array in localStorage
  const myAiContextAllowedAssistantIds = ref(new Set())

  // --- Persistence ---

  function saveSettingsToLocalStorage() {
    try {
      const settingsToSave = {
        // General
        theme: theme.value,
        appFontSize: appFontSize.value,
        uiSoundEffectsEnabled: uiSoundEffectsEnabled.value,
        // Chat
        isTtsEnabled: isTtsEnabled.value,
        selectedVoiceUri: selectedVoiceUri.value,
        chatModel: chatModel.value,
        chatTemperature: chatTemperature.value,
        chatMaxTokens: chatMaxTokens.value,
        chatContextLength: chatContextLength.value,
        sendOnEnter: sendOnEnter.value,
        chatTopP: chatTopP.value,
        // Image Gen
        imageGenDefaultAspectRatio: imageGenDefaultAspectRatio.value,
        imageGenDefaultStyle: imageGenDefaultStyle.value,
        imageGenDefaultNegativePrompt: imageGenDefaultNegativePrompt.value,
        imageGenDefaultNumImages: imageGenDefaultNumImages.value,
        // Assistants
        assistantsDefaultInstructions: assistantsDefaultInstructions.value,
        // *** My AI ***
        myAiContextSegments: myAiContextSegments.value, // Save array directly
        myAiContextApplyToAll: myAiContextApplyToAll.value,
        // Convert Set to Array for JSON compatibility
        myAiContextAllowedAssistantIds: Array.from(myAiContextAllowedAssistantIds.value),
      }
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave))
    } catch (error) {
      console.error('[SettingsStore] Error saving settings:', error)
    }
  }

  function loadSettingsFromLocalStorage() {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (storedSettings) {
        const loadedSettings = JSON.parse(storedSettings)
        console.log('[SettingsStore] Loaded settings from localStorage:', loadedSettings)

        // Apply settings with validation and defaults...
        // General
        theme.value =
          typeof loadedSettings.theme === 'string' &&
          ['light', 'dark'].includes(loadedSettings.theme)
            ? loadedSettings.theme
            : DEFAULT_THEME
        appFontSize.value =
          typeof loadedSettings.appFontSize === 'number' &&
          loadedSettings.appFontSize >= MIN_FONT_SIZE &&
          loadedSettings.appFontSize <= MAX_FONT_SIZE
            ? loadedSettings.appFontSize
            : DEFAULT_FONT_SIZE
        uiSoundEffectsEnabled.value =
          typeof loadedSettings.uiSoundEffectsEnabled === 'boolean'
            ? loadedSettings.uiSoundEffectsEnabled
            : DEFAULT_UI_SOUND_EFFECTS_ENABLED
        // Chat (simplified for brevity - validation assumed correct from previous version)
        isTtsEnabled.value = loadedSettings.isTtsEnabled ?? DEFAULT_TTS_ENABLED
        selectedVoiceUri.value = loadedSettings.selectedVoiceUri ?? DEFAULT_VOICE_URI
        chatModel.value = loadedSettings.chatModel ?? DEFAULT_CHAT_MODEL
        chatTemperature.value = loadedSettings.chatTemperature ?? DEFAULT_TEMPERATURE
        chatMaxTokens.value = loadedSettings.chatMaxTokens ?? DEFAULT_MAX_TOKENS
        chatContextLength.value = loadedSettings.chatContextLength ?? DEFAULT_CONTEXT_LENGTH
        sendOnEnter.value = loadedSettings.sendOnEnter ?? DEFAULT_SEND_ON_ENTER
        chatTopP.value = loadedSettings.chatTopP ?? DEFAULT_TOP_P
        // Image Gen (simplified)
        imageGenDefaultAspectRatio.value =
          loadedSettings.imageGenDefaultAspectRatio ?? DEFAULT_IMAGE_GEN_ASPECT_RATIO
        imageGenDefaultStyle.value = loadedSettings.imageGenDefaultStyle ?? DEFAULT_IMAGE_GEN_STYLE
        imageGenDefaultNegativePrompt.value =
          loadedSettings.imageGenDefaultNegativePrompt ?? DEFAULT_IMAGE_GEN_NEGATIVE_PROMPT
        imageGenDefaultNumImages.value =
          loadedSettings.imageGenDefaultNumImages ?? DEFAULT_IMAGE_GEN_NUM_IMAGES
        // Assistants (simplified)
        assistantsDefaultInstructions.value =
          loadedSettings.assistantsDefaultInstructions ?? DEFAULT_ASSISTANTS_INSTRUCTIONS

        // *** My AI ***
        myAiContextSegments.value = Array.isArray(loadedSettings.myAiContextSegments)
          ? loadedSettings.myAiContextSegments
          : DEFAULT_MYAI_CONTEXT_SEGMENTS
        myAiContextApplyToAll.value =
          typeof loadedSettings.myAiContextApplyToAll === 'boolean'
            ? loadedSettings.myAiContextApplyToAll
            : DEFAULT_MYAI_APPLY_TO_ALL
        // Convert stored Array back to Set
        myAiContextAllowedAssistantIds.value = new Set(
          Array.isArray(loadedSettings.myAiContextAllowedAssistantIds)
            ? loadedSettings.myAiContextAllowedAssistantIds
            : [],
        )
      } else {
        console.log('[SettingsStore] No settings found, applying all defaults.')
        resetAllSettingsToDefaults() // Call reset action to apply all defaults
        saveSettingsToLocalStorage() // Save the initial defaults
      }
    } catch (error) {
      console.error('[SettingsStore] Error loading settings:', error)
      resetAllSettingsToDefaults() // Reset to defaults on error
      saveSettingsToLocalStorage()
    }
  }

  // --- Actions ---

  // Setters (Keep existing, add new ones)
  function setTheme(newTheme) {
    if (['light', 'dark'].includes(newTheme)) theme.value = newTheme
  }
  function setAppFontSize(newSize) {
    const num = Math.round(Number(newSize))
    if (num >= MIN_FONT_SIZE && num <= MAX_FONT_SIZE) appFontSize.value = num
  }
  function setUiSoundEffectsEnabled(enabled) {
    uiSoundEffectsEnabled.value = !!enabled
  }
  function setTtsEnabled(enabled) {
    isTtsEnabled.value = !!enabled
  }
  function setSelectedVoice(voiceUri) {
    selectedVoiceUri.value = voiceUri
  }
  function setChatModel(newModel) {
    if (typeof newModel === 'string') chatModel.value = newModel.trim()
  }
  function setChatTemperature(newTemp) {
    const num = Number(newTemp)
    if (!isNaN(num) && num >= 0 && num <= 2) chatTemperature.value = num
  }
  function setChatMaxTokens(newMax) {
    const num = newMax === '' || newMax === null ? null : Number(newMax)
    if (num === null || (Number.isInteger(num) && num > 0))
      chatMaxTokens.value = newMax === '' ? null : num
  } // Allow null/empty
  function setChatContextLength(newLength) {
    const num = Number(newLength)
    if (Number.isInteger(num) && num >= MIN_CONTEXT_LENGTH && num <= MAX_CONTEXT_LENGTH)
      chatContextLength.value = num
  }
  function setSendOnEnter(enabled) {
    sendOnEnter.value = !!enabled
  }
  function setChatTopP(newTopP) {
    const num = Number(newTopP)
    if (!isNaN(num) && num >= MIN_TOP_P && num <= MAX_TOP_P)
      chatTopP.value = parseFloat(num.toFixed(2))
  }
  function setImageGenDefaultAspectRatio(ratio) {
    if (typeof ratio === 'string' && VALID_ASPECT_RATIOS.includes(ratio))
      imageGenDefaultAspectRatio.value = ratio
  }
  function setImageGenDefaultStyle(style) {
    if (typeof style === 'string' && VALID_IMAGE_STYLES.includes(style))
      imageGenDefaultStyle.value = style
  }
  function setImageGenDefaultNegativePrompt(prompt) {
    if (typeof prompt === 'string') imageGenDefaultNegativePrompt.value = prompt
  }
  function setImageGenDefaultNumImages(num) {
    const numInt = Number(num)
    if (Number.isInteger(numInt) && numInt >= MIN_NUM_IMAGES && numInt <= MAX_NUM_IMAGES)
      imageGenDefaultNumImages.value = numInt
  }
  function setAssistantsDefaultInstructions(instructions) {
    if (typeof instructions === 'string') assistantsDefaultInstructions.value = instructions
  }

  // My AI Actions
  function setMyAiContextSegments(segments) {
    // Expects an array
    if (Array.isArray(segments)) {
      myAiContextSegments.value = segments.map((s) => String(s).trim()).filter(Boolean) // Ensure strings, trim, remove empty
    }
  }
  function addMyAiContextSegment(segment) {
    const trimmed = String(segment).trim()
    if (trimmed) {
      myAiContextSegments.value.push(trimmed)
    }
  }
  function deleteMyAiContextSegment(index) {
    if (index >= 0 && index < myAiContextSegments.value.length) {
      myAiContextSegments.value.splice(index, 1)
    }
  }
  function updateMyAiContextSegment(index, newValue) {
    const trimmed = String(newValue).trim()
    if (index >= 0 && index < myAiContextSegments.value.length && trimmed) {
      myAiContextSegments.value[index] = trimmed
    } else if (index >= 0 && index < myAiContextSegments.value.length && !trimmed) {
      // Optionally delete if updated to empty, or just keep empty string? Let's delete.
      myAiContextSegments.value.splice(index, 1)
    }
  }
  function setMyAiContextApplyToAll(apply) {
    myAiContextApplyToAll.value = !!apply
    if (myAiContextApplyToAll.value) {
      // Optional: Clear specific list if switching back to 'apply all'?
      // myAiContextAllowedAssistantIds.value.clear();
    }
  }
  function toggleMyAiContextAllowedAssistant(assistantId) {
    if (!assistantId) return
    if (myAiContextAllowedAssistantIds.value.has(assistantId)) {
      myAiContextAllowedAssistantIds.value.delete(assistantId)
    } else {
      myAiContextAllowedAssistantIds.value.add(assistantId)
    }
    // Force watcher/persistence by creating a new Set (or trigger watcher manually if needed)
    myAiContextAllowedAssistantIds.value = new Set(myAiContextAllowedAssistantIds.value)
  }

  // --- Reset Action ---
  function resetAllSettingsToDefaults() {
    if (
      !window.confirm(
        'Are you sure you want to reset ALL settings to their default values? This cannot be undone.',
      )
    ) {
      return
    }
    console.log('[SettingsStore] Resetting ALL settings to defaults.')
    // General
    theme.value = DEFAULT_THEME
    appFontSize.value = DEFAULT_FONT_SIZE
    uiSoundEffectsEnabled.value = DEFAULT_UI_SOUND_EFFECTS_ENABLED
    // Chat
    isTtsEnabled.value = DEFAULT_TTS_ENABLED
    selectedVoiceUri.value = DEFAULT_VOICE_URI
    chatModel.value = DEFAULT_CHAT_MODEL
    chatTemperature.value = DEFAULT_TEMPERATURE
    chatMaxTokens.value = DEFAULT_MAX_TOKENS
    chatContextLength.value = DEFAULT_CONTEXT_LENGTH
    sendOnEnter.value = DEFAULT_SEND_ON_ENTER
    chatTopP.value = DEFAULT_TOP_P
    // Image Gen
    imageGenDefaultAspectRatio.value = DEFAULT_IMAGE_GEN_ASPECT_RATIO
    imageGenDefaultStyle.value = DEFAULT_IMAGE_GEN_STYLE
    imageGenDefaultNegativePrompt.value = DEFAULT_IMAGE_GEN_NEGATIVE_PROMPT
    imageGenDefaultNumImages.value = DEFAULT_IMAGE_GEN_NUM_IMAGES
    // Assistants
    assistantsDefaultInstructions.value = DEFAULT_ASSISTANTS_INSTRUCTIONS
    // My AI
    myAiContextSegments.value = DEFAULT_MYAI_CONTEXT_SEGMENTS
    myAiContextApplyToAll.value = DEFAULT_MYAI_APPLY_TO_ALL
    myAiContextAllowedAssistantIds.value = new Set() // Reset to empty Set

    // Save resets
    saveSettingsToLocalStorage()
  }

  // --- Load initial state ---
  loadSettingsFromLocalStorage()

  // --- Watchers for automatic saving ---
  // Use single watcher for simplicity if preferred, or keep individual
  watch(
    [
      theme,
      appFontSize,
      uiSoundEffectsEnabled,
      isTtsEnabled,
      selectedVoiceUri,
      chatModel,
      chatTemperature,
      chatMaxTokens,
      chatContextLength,
      sendOnEnter,
      chatTopP,
      imageGenDefaultAspectRatio,
      imageGenDefaultStyle,
      imageGenDefaultNegativePrompt,
      imageGenDefaultNumImages,
      assistantsDefaultInstructions,
      myAiContextSegments,
      myAiContextApplyToAll,
      myAiContextAllowedAssistantIds,
    ],
    saveSettingsToLocalStorage,
    { deep: true }, // Deep watch needed for array/set changes
  )

  // Return state, getters, actions, and constants
  return {
    // State (Refs)
    theme,
    appFontSize,
    uiSoundEffectsEnabled,
    isTtsEnabled,
    selectedVoiceUri,
    chatModel,
    chatTemperature,
    chatMaxTokens,
    chatContextLength,
    sendOnEnter,
    chatTopP,
    imageGenDefaultAspectRatio,
    imageGenDefaultStyle,
    imageGenDefaultNegativePrompt,
    imageGenDefaultNumImages,
    assistantsDefaultInstructions,
    myAiContextSegments,
    myAiContextApplyToAll,
    myAiContextAllowedAssistantIds,

    // Actions (Setters)
    setTheme,
    setAppFontSize,
    setUiSoundEffectsEnabled,
    setTtsEnabled,
    setSelectedVoice,
    setChatModel,
    setChatTemperature,
    setChatMaxTokens,
    setChatContextLength,
    setSendOnEnter,
    setChatTopP,
    setImageGenDefaultAspectRatio,
    setImageGenDefaultStyle,
    setImageGenDefaultNegativePrompt,
    setImageGenDefaultNumImages,
    setAssistantsDefaultInstructions,
    setMyAiContextSegments,
    addMyAiContextSegment,
    deleteMyAiContextSegment,
    updateMyAiContextSegment, // My AI segment CRUD
    setMyAiContextApplyToAll,
    toggleMyAiContextAllowedAssistant, // My AI targeting

    // Actions (Other)
    resetAllSettingsToDefaults,

    // Constants needed by UI
    VALID_ASPECT_RATIOS,
    VALID_IMAGE_STYLES,
    MIN_FONT_SIZE,
    MAX_FONT_SIZE,
    MIN_CONTEXT_LENGTH,
    MAX_CONTEXT_LENGTH,
    MIN_NUM_IMAGES,
    MAX_NUM_IMAGES,
    MIN_TOP_P,
    MAX_TOP_P,
  }
})
