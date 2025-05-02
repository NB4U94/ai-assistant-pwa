// src/stores/settingsStore.js
import { defineStore } from 'pinia'
import { ref, watch, computed /* Add computed if using getters */ } from 'vue' // Added computed import just in case, check if needed

export const useSettingsStore = defineStore('settings', () => {
  // --- Constants ---
  const SETTINGS_STORAGE_KEY = 'nb4u_ai_settings'
  const DEFAULT_USER_DISPLAY_NAME = ''
  const DEFAULT_USER_AVATAR_URL = null
  const DEFAULT_THEME = 'dark'
  const MIN_FONT_SIZE = 80
  const MAX_FONT_SIZE = 120
  const DEFAULT_FONT_SIZE = 100
  const DEFAULT_UI_SOUND_EFFECTS_ENABLED = false
  const DEFAULT_STARTUP_ASSISTANT_ID = null
  const DEFAULT_SHOW_ASSISTANT_SELECTOR_BAR = true
  const DEFAULT_TTS_ENABLED = false
  const DEFAULT_VOICE_URI = null

  // --- *** FIXED: Added example models to prevent initialization error *** ---
  const VALID_CHAT_MODELS = [
    { id: 'gpt-4o', name: 'OpenAI GPT-4o', provider: 'openai', acceptsImage: true }, // Example OpenAI model
    {
      id: 'gemini-1.5-flash-latest',
      name: 'Google Gemini 1.5 Flash',
      provider: 'google',
      acceptsImage: true,
    }, // Example Google model
    // Add other models you plan to support here
  ]
  // --- *** END FIX *** ---

  // Ensure VALID_CHAT_MODELS is not empty before accessing index 0
  const DEFAULT_CHAT_MODEL = VALID_CHAT_MODELS.length > 0 ? VALID_CHAT_MODELS[0].id : null // Safer default

  const DEFAULT_TEMPERATURE = 0.7
  const DEFAULT_MAX_TOKENS = 1024 // Consider if 4096 is better for some models
  const MIN_CONTEXT_LENGTH = 1
  const MAX_CONTEXT_LENGTH = 10 // Default max history items
  const DEFAULT_CONTEXT_LENGTH = 5
  const DEFAULT_SEND_ON_ENTER = true
  const MIN_TOP_P = 0.0
  const MAX_TOP_P = 1.0
  const DEFAULT_TOP_P = 1.0
  const VALID_ASPECT_RATIOS = ['1:1', '16:9', '9:16'] // Used for DALL-E 3 image gen
  const DEFAULT_IMAGE_GEN_ASPECT_RATIO = '1:1'
  const VALID_IMAGE_STYLES = ['Standard', 'Vivid', 'Natural', 'Cinematic'] // Used for DALL-E 3
  const DEFAULT_IMAGE_GEN_STYLE = 'Vivid' // Changed default to Vivid based on DALL-E 3 docs
  const DEFAULT_IMAGE_GEN_NEGATIVE_PROMPT = ''
  const MIN_NUM_IMAGES = 1
  const MAX_NUM_IMAGES = 1 // DALL-E 3 currently supports n=1
  const DEFAULT_IMAGE_GEN_NUM_IMAGES = 1
  const DEFAULT_ASSISTANTS_INSTRUCTIONS = 'You are a helpful AI assistant.'
  const DEFAULT_MYAI_CONTEXT_SEGMENTS = []
  const DEFAULT_MYAI_APPLY_TO_ALL = true

  // --- Helper Function to Load/Save ---
  // Ensure this handles potential parsing errors gracefully
  const loadSettings = () => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('Error loading settings from localStorage:', e)
      localStorage.removeItem(SETTINGS_STORAGE_KEY) // Clear corrupted data
    }
    return {} // Return empty object if nothing stored or error
  }

  const loadedSettings = loadSettings()

  // --- State ---
  // Initialize with loaded value or default. Ensure types match.
  const userDisplayName = ref(loadedSettings.userDisplayName ?? DEFAULT_USER_DISPLAY_NAME)
  const userAvatarUrl = ref(loadedSettings.userAvatarUrl ?? DEFAULT_USER_AVATAR_URL)
  const theme = ref(loadedSettings.theme ?? DEFAULT_THEME)
  const appFontSize = ref(loadedSettings.appFontSize ?? DEFAULT_FONT_SIZE)
  const uiSoundEffectsEnabled = ref(
    loadedSettings.uiSoundEffectsEnabled ?? DEFAULT_UI_SOUND_EFFECTS_ENABLED,
  )
  const defaultAssistantId = ref(loadedSettings.defaultAssistantId ?? DEFAULT_STARTUP_ASSISTANT_ID)
  const showAssistantSelectorBar = ref(
    loadedSettings.showAssistantSelectorBar ?? DEFAULT_SHOW_ASSISTANT_SELECTOR_BAR,
  )
  const isTtsEnabled = ref(loadedSettings.isTtsEnabled ?? DEFAULT_TTS_ENABLED)
  const selectedVoiceUri = ref(loadedSettings.selectedVoiceUri ?? DEFAULT_VOICE_URI)

  // Validate loaded chat model against current VALID list
  const loadedChatModel = loadedSettings.chatModel
  const isValidLoadedModel = VALID_CHAT_MODELS.some((m) => m.id === loadedChatModel)
  const chatModel = ref(isValidLoadedModel ? loadedChatModel : DEFAULT_CHAT_MODEL)

  const chatTemperature = ref(loadedSettings.chatTemperature ?? DEFAULT_TEMPERATURE)
  const chatMaxTokens = ref(loadedSettings.chatMaxTokens ?? DEFAULT_MAX_TOKENS)
  const chatContextLength = ref(loadedSettings.chatContextLength ?? DEFAULT_CONTEXT_LENGTH)
  const sendOnEnter = ref(loadedSettings.sendOnEnter ?? DEFAULT_SEND_ON_ENTER)
  const chatTopP = ref(loadedSettings.chatTopP ?? DEFAULT_TOP_P)
  const imageGenDefaultAspectRatio = ref(
    loadedSettings.imageGenDefaultAspectRatio ?? DEFAULT_IMAGE_GEN_ASPECT_RATIO,
  )
  const imageGenDefaultStyle = ref(loadedSettings.imageGenDefaultStyle ?? DEFAULT_IMAGE_GEN_STYLE)
  const imageGenDefaultNegativePrompt = ref(
    loadedSettings.imageGenDefaultNegativePrompt ?? DEFAULT_IMAGE_GEN_NEGATIVE_PROMPT,
  )
  const imageGenDefaultNumImages = ref(
    loadedSettings.imageGenDefaultNumImages ?? DEFAULT_IMAGE_GEN_NUM_IMAGES,
  )
  const assistantsDefaultInstructions = ref(
    loadedSettings.assistantsDefaultInstructions ?? DEFAULT_ASSISTANTS_INSTRUCTIONS,
  )
  const myAiContextSegments = ref(
    loadedSettings.myAiContextSegments ?? DEFAULT_MYAI_CONTEXT_SEGMENTS,
  )
  const myAiContextApplyToAll = ref(
    loadedSettings.myAiContextApplyToAll ?? DEFAULT_MYAI_APPLY_TO_ALL,
  )
  // Handle Set persistence correctly
  const myAiContextAllowedAssistantIds = ref(
    new Set(loadedSettings.myAiContextAllowedAssistantIds || []),
  )

  // --- Persistence ---
  // Consolidate state into one object for saving
  const settingsToPersist = computed(() => ({
    userDisplayName: userDisplayName.value,
    userAvatarUrl: userAvatarUrl.value,
    theme: theme.value,
    appFontSize: appFontSize.value,
    uiSoundEffectsEnabled: uiSoundEffectsEnabled.value,
    defaultAssistantId: defaultAssistantId.value,
    showAssistantSelectorBar: showAssistantSelectorBar.value,
    isTtsEnabled: isTtsEnabled.value,
    selectedVoiceUri: selectedVoiceUri.value,
    chatModel: chatModel.value,
    chatTemperature: chatTemperature.value,
    chatMaxTokens: chatMaxTokens.value,
    chatContextLength: chatContextLength.value,
    sendOnEnter: sendOnEnter.value,
    chatTopP: chatTopP.value,
    imageGenDefaultAspectRatio: imageGenDefaultAspectRatio.value,
    imageGenDefaultStyle: imageGenDefaultStyle.value,
    imageGenDefaultNegativePrompt: imageGenDefaultNegativePrompt.value,
    imageGenDefaultNumImages: imageGenDefaultNumImages.value,
    assistantsDefaultInstructions: assistantsDefaultInstructions.value,
    myAiContextSegments: myAiContextSegments.value,
    myAiContextApplyToAll: myAiContextApplyToAll.value,
    // Convert Set to Array for JSON serialization
    myAiContextAllowedAssistantIds: Array.from(myAiContextAllowedAssistantIds.value),
  }))

  function saveSettingsToLocalStorage() {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToPersist.value))
    } catch (error) {
      console.error('Error saving settings to localStorage:', error)
      // Potentially notify user or implement more robust error handling
    }
  }

  // --- Watcher ---
  // Watch the computed object that aggregates all settings
  watch(
    settingsToPersist,
    (newValue) => {
      console.log('Settings changed, saving to localStorage:', newValue) // Log the change
      saveSettingsToLocalStorage()
    },
    { deep: true }, // Deep watch is necessary for nested objects/arrays
  )

  // --- Reset Actions ---
  function resetUserProfileDefaults() {
    userDisplayName.value = DEFAULT_USER_DISPLAY_NAME
    userAvatarUrl.value = DEFAULT_USER_AVATAR_URL
  }
  function resetGeneralDefaults() {
    theme.value = DEFAULT_THEME
    appFontSize.value = DEFAULT_FONT_SIZE
    uiSoundEffectsEnabled.value = DEFAULT_UI_SOUND_EFFECTS_ENABLED
    defaultAssistantId.value = DEFAULT_STARTUP_ASSISTANT_ID
    showAssistantSelectorBar.value = DEFAULT_SHOW_ASSISTANT_SELECTOR_BAR
    isTtsEnabled.value = DEFAULT_TTS_ENABLED
    selectedVoiceUri.value = DEFAULT_VOICE_URI
  }
  function resetChatDefaults() {
    chatModel.value = DEFAULT_CHAT_MODEL
    chatTemperature.value = DEFAULT_TEMPERATURE
    chatMaxTokens.value = DEFAULT_MAX_TOKENS
    chatContextLength.value = DEFAULT_CONTEXT_LENGTH
    sendOnEnter.value = DEFAULT_SEND_ON_ENTER
    chatTopP.value = DEFAULT_TOP_P
  }
  function resetImageGenDefaults() {
    imageGenDefaultAspectRatio.value = DEFAULT_IMAGE_GEN_ASPECT_RATIO
    imageGenDefaultStyle.value = DEFAULT_IMAGE_GEN_STYLE
    imageGenDefaultNegativePrompt.value = DEFAULT_IMAGE_GEN_NEGATIVE_PROMPT
    imageGenDefaultNumImages.value = DEFAULT_IMAGE_GEN_NUM_IMAGES
  }
  function resetMyAIDefaults() {
    assistantsDefaultInstructions.value = DEFAULT_ASSISTANTS_INSTRUCTIONS
    myAiContextSegments.value = DEFAULT_MYAI_CONTEXT_SEGMENTS
    myAiContextApplyToAll.value = DEFAULT_MYAI_APPLY_TO_ALL
    myAiContextAllowedAssistantIds.value = new Set()
  }

  function resetAllSettingsToDefaults(confirm = true) {
    const confirmed = confirm
      ? window.confirm('Are you sure you want to reset ALL settings to their defaults?')
      : true
    if (confirmed) {
      resetUserProfileDefaults()
      resetGeneralDefaults()
      resetChatDefaults()
      resetImageGenDefaults()
      resetMyAIDefaults() // Add reset for My AI section
      console.log('All settings reset to defaults.')
      // Save immediately after reset
      saveSettingsToLocalStorage()
    }
  }

  // loadSettingsFromLocalStorage() // Initial load is handled above refs initialization now

  // --- Specific Actions (Setters) ---
  // Ensure validation logic is robust
  function setUserDisplayName(newName) {
    userDisplayName.value = String(newName || '').trim()
  }
  function setUserAvatarUrl(newUrl) {
    // Basic validation: check if it's a string and potentially a data URL or http(s) URL
    if (
      typeof newUrl === 'string' &&
      (newUrl.startsWith('data:image/') || newUrl.startsWith('http'))
    ) {
      userAvatarUrl.value = newUrl
    } else if (newUrl === null) {
      userAvatarUrl.value = null // Allow clearing
    } else {
      console.warn('Invalid avatar URL format:', newUrl)
    }
  }
  function setChatModel(newModelId) {
    if (VALID_CHAT_MODELS.some((m) => m.id === newModelId)) {
      chatModel.value = newModelId
    } else {
      console.warn(`Attempted to set invalid chat model ID: ${newModelId}`)
    }
  }
  function setTheme(newTheme) {
    if (newTheme === 'light' || newTheme === 'dark') {
      theme.value = newTheme
      // Update body class or data attribute for global CSS targeting
      document.documentElement.setAttribute('data-theme', newTheme)
    }
  }
  function setAppFontSize(newSize) {
    const size = Number(newSize)
    if (!isNaN(size) && size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE) {
      appFontSize.value = size
      // Update body style for global CSS targeting
      document.documentElement.style.fontSize = `${size}%`
    }
  }
  function setUiSoundEffectsEnabled(value) {
    uiSoundEffectsEnabled.value = !!value
  }
  function setShowAssistantSelectorBar(value) {
    showAssistantSelectorBar.value = !!value
  }
  function setTtsEnabled(value) {
    isTtsEnabled.value = !!value
  }
  function setSelectedVoice(voiceUri) {
    // Add validation if necessary (e.g., check against available voices)
    selectedVoiceUri.value = voiceUri
  }
  function setChatTemperature(value) {
    const temp = Number(value)
    if (!isNaN(temp) && temp >= 0 && temp <= 2) {
      // OpenAI range
      chatTemperature.value = temp
    }
  }
  function setChatMaxTokens(value) {
    const tokens = Number(value)
    // Add reasonable upper limit check if needed
    if (!isNaN(tokens) && tokens > 0) {
      chatMaxTokens.value = Math.floor(tokens)
    }
  }
  function setChatContextLength(value) {
    const length = Number(value)
    if (!isNaN(length) && length >= MIN_CONTEXT_LENGTH && length <= MAX_CONTEXT_LENGTH) {
      chatContextLength.value = Math.floor(length)
    }
  }
  function setSendOnEnter(value) {
    sendOnEnter.value = !!value
  }
  function setChatTopP(value) {
    const topP = Number(value)
    if (!isNaN(topP) && topP >= MIN_TOP_P && topP <= MAX_TOP_P) {
      chatTopP.value = topP
    }
  }
  function setMyAiContextSegments(segments) {
    if (Array.isArray(segments)) {
      // Ensure segments are strings and trimmed
      myAiContextSegments.value = segments.map((s) => String(s || '').trim()).filter(Boolean)
    }
  }
  function addMyAiContextSegment(segment) {
    const trimmed = String(segment || '').trim()
    if (trimmed && !myAiContextSegments.value.includes(trimmed)) {
      // Prevent duplicates
      myAiContextSegments.value.push(trimmed)
    }
  }
  function deleteMyAiContextSegment(index) {
    if (index >= 0 && index < myAiContextSegments.value.length) {
      myAiContextSegments.value.splice(index, 1)
    }
  }
  function updateMyAiContextSegment(index, newValue) {
    const trimmed = String(newValue || '').trim()
    if (index >= 0 && index < myAiContextSegments.value.length) {
      if (trimmed) {
        // Prevent duplicate on update
        if (
          !myAiContextSegments.value.includes(trimmed) ||
          myAiContextSegments.value[index] === trimmed
        ) {
          myAiContextSegments.value[index] = trimmed
        } else {
          console.warn('Attempted to update context segment to an existing value.')
          // Optionally remove the original if updating to duplicate? Or just ignore.
          // myAiContextSegments.value.splice(index, 1);
        }
      } else {
        myAiContextSegments.value.splice(index, 1) // Remove if cleared
      }
    }
  }
  function setMyAiContextApplyToAll(apply) {
    myAiContextApplyToAll.value = !!apply
  }
  function toggleMyAiContextAllowedAssistant(assistantId) {
    if (!assistantId) return
    const currentSet = myAiContextAllowedAssistantIds.value // Get current Set
    const newSet = new Set(currentSet) // Clone to trigger reactivity
    if (newSet.has(assistantId)) {
      newSet.delete(assistantId)
    } else {
      newSet.add(assistantId)
    }
    myAiContextAllowedAssistantIds.value = newSet // Assign the new Set
  }

  // Apply theme and font size on initial load
  setTheme(theme.value)
  setAppFontSize(appFontSize.value)

  // --- Return ---
  return {
    // State (Refs)
    userDisplayName,
    userAvatarUrl,
    theme,
    appFontSize,
    uiSoundEffectsEnabled,
    defaultAssistantId,
    showAssistantSelectorBar,
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
    myAiContextAllowedAssistantIds, // Expose the Set ref

    // Actions
    setUserDisplayName,
    setUserAvatarUrl,
    setTheme,
    setAppFontSize,
    setUiSoundEffectsEnabled,
    setShowAssistantSelectorBar,
    setTtsEnabled,
    setSelectedVoice,
    setChatModel,
    setChatTemperature,
    setChatMaxTokens,
    setChatContextLength,
    setSendOnEnter,
    setChatTopP,
    setMyAiContextSegments,
    addMyAiContextSegment,
    deleteMyAiContextSegment,
    updateMyAiContextSegment,
    setMyAiContextApplyToAll,
    toggleMyAiContextAllowedAssistant,
    resetAllSettingsToDefaults,
    resetUserProfileDefaults,
    resetGeneralDefaults,
    resetChatDefaults,
    resetImageGenDefaults,
    resetMyAIDefaults, // Expose My AI reset

    // Constants / Readonly Data (Consider exposing as computed if they might change)
    VALID_CHAT_MODELS: computed(() => VALID_CHAT_MODELS), // Expose as computed for safety
    VALID_ASPECT_RATIOS: computed(() => VALID_ASPECT_RATIOS),
    VALID_IMAGE_STYLES: computed(() => VALID_IMAGE_STYLES),
    MIN_FONT_SIZE, // Expose raw constants if needed by UI validation
    MAX_FONT_SIZE,
    MIN_CONTEXT_LENGTH,
    MAX_CONTEXT_LENGTH,
    MIN_NUM_IMAGES,
    MAX_NUM_IMAGES,
    MIN_TOP_P,
    MAX_TOP_P,
    DEFAULT_FONT_SIZE: computed(() => DEFAULT_FONT_SIZE), // Expose default if needed
  }
})
