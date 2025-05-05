// src/stores/settingsStore.js
import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // --- Constants ---
  const SETTINGS_STORAGE_KEY = 'nb4u_ai_settings'
  // Defaults...
  const DEFAULT_USER_DISPLAY_NAME = ''
  const DEFAULT_USER_AVATAR_URL = null
  const DEFAULT_THEME = 'dark'
  const MIN_FONT_SIZE = 80
  const MAX_FONT_SIZE = 120
  const DEFAULT_FONT_SIZE = 100
  const DEFAULT_UI_SOUND_EFFECTS_ENABLED = false
  const DEFAULT_STARTUP_ASSISTANT_ID = null // null represents main chat
  const DEFAULT_SHOW_ASSISTANT_SELECTOR_BAR = true
  const DEFAULT_TTS_ENABLED = false
  const DEFAULT_VOICE_URI = null
  const VALID_CHAT_MODELS = [
    { id: 'gpt-4o', name: 'OpenAI GPT-4o', provider: 'openai', acceptsImage: true },
    {
      id: 'gemini-1.5-flash-latest',
      name: 'Google Gemini 1.5 Flash',
      provider: 'google',
      acceptsImage: true,
    },
    // Add other models here
  ]
  const DEFAULT_CHAT_MODEL = VALID_CHAT_MODELS.length > 0 ? VALID_CHAT_MODELS[0].id : null
  const DEFAULT_TEMPERATURE = 0.7
  const DEFAULT_MAX_TOKENS = 1024
  const MIN_CONTEXT_LENGTH = 1
  const MAX_CONTEXT_LENGTH = 10 // Default max history items
  const DEFAULT_CONTEXT_LENGTH = 5
  const DEFAULT_SEND_ON_ENTER = true
  const MIN_TOP_P = 0.0
  const MAX_TOP_P = 1.0
  const DEFAULT_TOP_P = 1.0
  const VALID_ASPECT_RATIOS = ['1:1', '16:9', '9:16']
  const DEFAULT_IMAGE_GEN_ASPECT_RATIO = '1:1'
  const VALID_IMAGE_STYLES = ['Standard', 'Vivid', 'Natural', 'Cinematic']
  const DEFAULT_IMAGE_GEN_STYLE = 'Vivid'
  const DEFAULT_IMAGE_GEN_NEGATIVE_PROMPT = ''
  const MIN_NUM_IMAGES = 1
  const MAX_NUM_IMAGES = 1
  const DEFAULT_IMAGE_GEN_NUM_IMAGES = 1
  const DEFAULT_ASSISTANTS_INSTRUCTIONS = 'You are a helpful AI assistant.'
  const DEFAULT_MYAI_CONTEXT_SEGMENTS = []
  const DEFAULT_MYAI_APPLY_TO_ALL = true
  const DEFAULT_MYAI_ALLOWED_IDS = [] // Stored as array, used as Set
  const DEFAULT_SAVE_CONVERSATIONS = true
  const DEFAULT_EXCLUDED_ASSISTANT_IDS = [] // Store as array, use as Set
  const DEFAULT_LAST_ACTIVE_SETTINGS_TAB_ID = 'general' // Default active tab

  // --- Helper Function to Load/Save ---
  const loadSettings = () => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('Error loading settings:', e)
      localStorage.removeItem(SETTINGS_STORAGE_KEY)
    }
    return {}
  }

  const loadedSettings = loadSettings()

  // --- Persistent State ---
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
  const myAiContextAllowedAssistantIds = ref(
    new Set(loadedSettings.myAiContextAllowedAssistantIds || DEFAULT_MYAI_ALLOWED_IDS),
  )
  const saveConversationsGlobally = ref(
    loadedSettings.saveConversationsGlobally ?? DEFAULT_SAVE_CONVERSATIONS,
  )
  const excludedAssistantIds = ref(
    new Set(loadedSettings.excludedAssistantIds || DEFAULT_EXCLUDED_ASSISTANT_IDS),
  )

  // --- Non-Persistent UI State ---
  const lastActiveSettingsTabId = ref(DEFAULT_LAST_ACTIVE_SETTINGS_TAB_ID)
  const settingsTabsAdvancedVisible = ref({})

  // --- Persistence ---
  const settingsToPersist = computed(() => ({
    // --- Only include settings that SHOULD be saved permanently ---
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
    myAiContextAllowedAssistantIds: Array.from(myAiContextAllowedAssistantIds.value),
    saveConversationsGlobally: saveConversationsGlobally.value,
    excludedAssistantIds: Array.from(excludedAssistantIds.value),
  }))

  function saveSettingsToLocalStorage() {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToPersist.value))
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  // Watcher for persistent settings
  watch(
    settingsToPersist,
    (newValue) => {
      console.log('Persistent settings changed, saving to localStorage:', Object.keys(newValue))
      saveSettingsToLocalStorage()
    },
    { deep: true },
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
    myAiContextAllowedAssistantIds.value = new Set(DEFAULT_MYAI_ALLOWED_IDS)
  }
  function resetMemoryDefaults() {
    saveConversationsGlobally.value = DEFAULT_SAVE_CONVERSATIONS
    excludedAssistantIds.value = new Set(DEFAULT_EXCLUDED_ASSISTANT_IDS)
    console.log('Memory data settings reset to defaults.')
  }

  function resetAllSettingsToDefaults(confirm = true) {
    const confirmed = confirm
      ? window.confirm('Are you sure you want to reset ALL settings to defaults?')
      : true
    if (confirmed) {
      resetUserProfileDefaults()
      resetGeneralDefaults()
      resetChatDefaults()
      resetImageGenDefaults()
      resetMyAIDefaults()
      resetMemoryDefaults()
      lastActiveSettingsTabId.value = DEFAULT_LAST_ACTIVE_SETTINGS_TAB_ID
      settingsTabsAdvancedVisible.value = {}
      console.log('All settings (persistent and UI) reset to defaults.')
    }
  }

  // --- Specific Actions (Setters for Persistent Settings) ---
  // Implemented bodies to fix unused var warnings
  function setUserDisplayName(newName) {
    userDisplayName.value = String(newName || '').trim()
  }
  function setUserAvatarUrl(newUrl) {
    // Added check similar to original
    if (
      typeof newUrl === 'string' &&
      (newUrl.startsWith('data:image/') || newUrl.startsWith('http'))
    ) {
      userAvatarUrl.value = newUrl
    } else if (newUrl === null) {
      userAvatarUrl.value = null
    }
    // else: ignore invalid URL input
  }
  function setChatModel(newModelId) {
    if (VALID_CHAT_MODELS.some((m) => m.id === newModelId)) {
      chatModel.value = newModelId
    }
  }
  function setTheme(newTheme) {
    if (newTheme === 'light' || newTheme === 'dark') {
      theme.value = newTheme
      document.documentElement.setAttribute('data-theme', newTheme)
    }
  }
  function setAppFontSize(newSize) {
    const size = Number(newSize)
    if (!isNaN(size) && size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE) {
      appFontSize.value = size
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
    selectedVoiceUri.value = voiceUri
  } // No validation needed here
  function setChatTemperature(value) {
    const temp = Number(value)
    if (!isNaN(temp) && temp >= 0 && temp <= 2) {
      chatTemperature.value = temp
    }
  }
  function setChatMaxTokens(value) {
    const tokens = value === null ? null : Number(value)
    if (tokens === null || (!isNaN(tokens) && tokens > 0)) {
      chatMaxTokens.value = tokens === null ? null : Math.floor(tokens)
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
      myAiContextSegments.value = segments.map((s) => String(s || '').trim()).filter(Boolean)
    }
  }
  function addMyAiContextSegment(segment) {
    const trimmed = String(segment || '').trim()
    if (trimmed && !myAiContextSegments.value.includes(trimmed)) {
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
        if (
          !myAiContextSegments.value.includes(trimmed) ||
          myAiContextSegments.value[index] === trimmed
        ) {
          myAiContextSegments.value[index] = trimmed
        } // else: Avoid adding duplicates on update
      } else {
        myAiContextSegments.value.splice(index, 1) // Remove if value becomes empty
      }
    }
  }
  function setMyAiContextApplyToAll(apply) {
    myAiContextApplyToAll.value = !!apply
  }

  function toggleMyAiContextAllowedAssistant(assistantId) {
    // Param IS used, ignore possible lint error
    if (!assistantId) return
    const newSet = new Set(myAiContextAllowedAssistantIds.value)
    if (newSet.has(assistantId)) {
      newSet.delete(assistantId)
    } else {
      newSet.add(assistantId)
    }
    myAiContextAllowedAssistantIds.value = newSet
  }
  function toggleSaveConversationsGlobally() {
    saveConversationsGlobally.value = !saveConversationsGlobally.value
    console.log(`Global conversation saving toggled: ${saveConversationsGlobally.value}`)
  }

  function toggleAssistantExclusion(assistantId) {
    // Param IS used, ignore possible lint error
    if (!assistantId || assistantId === 'main_chat') {
      console.warn('Cannot exclude main chat from saving.')
      return
    }
    const newSet = new Set(excludedAssistantIds.value)
    if (newSet.has(assistantId)) {
      newSet.delete(assistantId)
      console.log(`Assistant ${assistantId} REMOVED from exclusion list.`)
    } else {
      newSet.add(assistantId)
      console.log(`Assistant ${assistantId} ADDED to exclusion list.`)
    }
    excludedAssistantIds.value = newSet
  }

  // --- Actions for Non-Persistent UI State ---
  function setLastActiveSettingsTabId(tabId) {
    if (typeof tabId === 'string' && tabId) {
      lastActiveSettingsTabId.value = tabId
      // console.log(`[SettingsStore] Last active settings tab set to: ${tabId}`);
    }
  }

  function toggleSettingsTabAdvancedVisible(tabId) {
    if (!tabId || typeof tabId !== 'string') return
    const currentVisibility = !!settingsTabsAdvancedVisible.value[tabId]
    settingsTabsAdvancedVisible.value = {
      ...settingsTabsAdvancedVisible.value,
      [tabId]: !currentVisibility,
    }
    console.log(
      `[SettingsStore] Advanced visibility toggled for tab '${tabId}': ${!currentVisibility}`,
    )
  }

  // Apply theme and font size on initial load
  setTheme(theme.value)
  setAppFontSize(appFontSize.value)

  // --- Return ---
  return {
    // State (Refs) - Persistent
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
    myAiContextAllowedAssistantIds,
    saveConversationsGlobally,
    excludedAssistantIds,

    // State (Refs) - Non-Persistent UI State
    lastActiveSettingsTabId,
    settingsTabsAdvancedVisible,

    // Actions - Persistent Settings Modifiers
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
    toggleSaveConversationsGlobally,
    toggleAssistantExclusion,

    // Actions - Non-Persistent UI State Modifiers
    setLastActiveSettingsTabId,
    toggleSettingsTabAdvancedVisible,

    // Actions - Resets
    resetAllSettingsToDefaults,
    resetUserProfileDefaults,
    resetGeneralDefaults,
    resetChatDefaults,
    resetImageGenDefaults,
    resetMyAIDefaults,
    resetMemoryDefaults,

    // Constants / Readonly Data
    VALID_CHAT_MODELS: computed(() => VALID_CHAT_MODELS),
    VALID_ASPECT_RATIOS: computed(() => VALID_ASPECT_RATIOS),
    VALID_IMAGE_STYLES: computed(() => VALID_IMAGE_STYLES),
    MIN_FONT_SIZE,
    MAX_FONT_SIZE,
    MIN_CONTEXT_LENGTH,
    MAX_CONTEXT_LENGTH,
    MIN_NUM_IMAGES,
    MAX_NUM_IMAGES,
    MIN_TOP_P,
    MAX_TOP_P,
    DEFAULT_FONT_SIZE: computed(() => DEFAULT_FONT_SIZE),
  }
})
