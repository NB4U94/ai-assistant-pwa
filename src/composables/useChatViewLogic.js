// src/composables/useChatViewLogic.js
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAssistantsStore } from '@/stores/assistantsStore'
import { useConversationStore } from '@/stores/conversationStore'
import { storeToRefs } from 'pinia'
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'
import { useFileInput } from '@/composables/useFileInput'
import { useTextToSpeech } from '@/composables/useTextToSpeech'
import { useUIUtils } from '@/composables/useUIUtils'
import { useChatScroll } from '@/composables/useChatScroll'
import { useMessageSender } from '@/composables/useMessageSender'

// Helper Function for Initials
function getInitials(name, fallback = '?') {
  if (name === null || name === undefined || typeof name !== 'string') {
    return fallback
  }
  const trimmedName = name.trim()
  if (!trimmedName) {
    return fallback
  }
  const parts = trimmedName.split(' ').filter(Boolean)
  let initials = fallback
  if (parts.length === 1 && parts[0].length > 0) {
    initials = parts[0].charAt(0).toUpperCase()
  } else if (parts.length > 1 && parts[0].length > 0 && parts[parts.length - 1].length > 0) {
    initials = (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  } else if (parts.length > 0 && parts[0].length > 0) {
    initials = parts[0].charAt(0).toUpperCase()
  }
  return initials
}

export function useChatViewLogic(userInputRef, props = {}, refs = {}) {
  const chatInputAreaRef = refs.chatInputAreaRef || ref(null)
  const messageDisplayAreaComponentRef = refs.messageDisplayAreaComponentRef || ref(null)

  if (!userInputRef || typeof userInputRef.value === 'undefined') {
    console.error('FATAL: useChatViewLogic requires a valid ref for userInputRef.')
    return {
      isSending: ref(false),
      isListening: ref(false),
      isAssistantSelectorExpanded: ref(false),
      selectedImagePreview: ref(null),
      selectedFile: ref(null),
      activeSessionId: ref(null),
      currentPlaceholder: ref('Error'),
      displayMessages: ref([]),
      availableAssistants: ref([]),
      selectedAssistant: ref(null),
      speechSupported: ref(false),
      ttsSupported: ref(false),
      isTtsEnabled: ref(false),
      copiedState: ref({}),
      isAnimatingText: ref(false),
      isTurboActive: ref(false),
      toggleTurboMode: () => {},
      handleSendMessage: () => {},
      handleEnterKey: () => {},
      selectAssistant: () => {},
      toggleAssistantSelector: () => {},
      toggleListening: () => {},
      ttsToggle: () => {},
      ttsHandleMessageClick: () => {},
      triggerFileInput: () => {},
      handleFileSelected: () => {},
      removeSelectedImage: () => {},
      copyText: () => {},
      processMessageText: () => (input) => [{ type: 'text', text: input }],
      formatTimestamp: () => '',
      getAvatarDetailsForMessage: () => ({}),
      autoGrowTextarea: () => {},
      shouldShowAssistantSelectorBarEffective: ref(false),
    }
  }

  const assistantsStore = useAssistantsStore()
  const conversationStore = useConversationStore()
  const settingsStore = useSettingsStore()

  const { assistants: availableAssistants, selectedAssistant } = storeToRefs(assistantsStore)
  const {
    activeHistory,
    activeSessionId,
    loadedMemoryId,
    isCurrentSessionTestMode,
    testModeAssistantConfig,
  } = storeToRefs(conversationStore)
  const {
    showAssistantSelectorBar: showAssistantSelectorBarFromSettings,
    userDisplayName,
    userAvatarUrl,
    sendOnEnter,
  } = storeToRefs(settingsStore)

  const actualScrollElementRef = ref(null)
  const isAssistantSelectorExpanded = ref(true)
  const currentPlaceholder = ref('Enter message...')
  const testSessionMessages = ref([])

  const handleComposableError = (errorMessage) => {
    const message = String(errorMessage || 'An unexpected error occurred.')
    console.error('[useChatViewLogic Composable Error]', message)
  }

  const { copiedState, formatTimestamp, copyText, processMessageText, autoGrowTextarea } =
    useUIUtils({ addErrorMessage: handleComposableError })

  const updatePlaceholderBasedOnState = () => {
    currentPlaceholder.value = calculatePlaceholder(userInputRef.value, selectedFile.value)
  }

  const {
    selectedImagePreview,
    selectedFile,
    triggerFileInput,
    handleFileSelected,
    removeSelectedImage,
  } = useFileInput({
    addErrorMessage: handleComposableError,
    updatePlaceholder: updatePlaceholderBasedOnState,
  })

  const {
    ttsSupported,
    isTtsEnabled,
    toggleTts: ttsToggle,
    handleMessageClick: ttsHandleMessageClick,
    speakText: ttsSpeakText,
  } = useTextToSpeech({ addErrorMessage: handleComposableError })

  const { isListening, speechSupported, toggleListening } = useSpeechRecognition({
    userInputRef: userInputRef,
    addErrorMessage: handleComposableError,
  })

  const messagesForScroll = computed(() =>
    isCurrentSessionTestMode.value ? testSessionMessages.value : activeHistory.value,
  )

  const { scrollToBottom: capturedScrollToBottom, instantScrollToBottom } = useChatScroll(
    actualScrollElementRef,
    messagesForScroll,
  )

  watch(
    messageDisplayAreaComponentRef,
    (newCompInstance) => {
      if (newCompInstance && newCompInstance.scrollElement) {
        actualScrollElementRef.value = newCompInstance.scrollElement
        if (isCurrentSessionTestMode.value || activeHistory.value.length > 0) {
          instantScrollToBottom()
        }
      } else {
        actualScrollElementRef.value = null
      }
    },
    { immediate: true },
  )

  const {
    sendMessage: sendChatMessage,
    isLoading: isSending,
    error: sendError,
    isAnimatingText,
    isTurboActive,
    toggleTurboMode,
  } = useMessageSender()

  const calculatePlaceholder = (currentInput, currentFile) => {
    const currentTestConf = testModeAssistantConfig.value
    if (isCurrentSessionTestMode.value && currentTestConf) {
      return `Testing ${currentTestConf.name || 'Assistant'}...`
    }
    if (currentFile) return 'Image selected. Add description or send.'
    if (currentInput) return 'Continue typing...'
    const currentSessId = activeSessionId.value
    const currentLoadedMemId = loadedMemoryId.value
    if (currentLoadedMemId) {
      const memory = conversationStore.memories.find((m) => m.memoryId === currentLoadedMemId)
      if (memory) {
        if (conversationStore.isMainChatSession(memory.sessionId))
          return 'Viewing chat with Nb4U-Ai...'
        try {
          const assistant = assistantsStore.getAssistantById(memory.sessionId)
          return assistant ? `Viewing chat with ${assistant.name}...` : 'Viewing saved chat...'
        } catch {
          return 'Viewing saved chat...'
        }
      } else {
        return 'Viewing saved chat...'
      }
    } else {
      if (!currentSessId || conversationStore.isMainChatSession(currentSessId)) {
        return 'Ask Nb4U-Ai...'
      } else {
        const currentActiveAssistant = selectedAssistant.value
        return currentActiveAssistant
          ? `Ask ${currentActiveAssistant.name}...`
          : 'Ask selected assistant...'
      }
    }
  }

  const displayMessages = computed(() => {
    return isCurrentSessionTestMode.value ? testSessionMessages.value : activeHistory.value
  })

  const getAvatarDetailsForMessage = (message) => {
    const details = {
      imageUrl: null,
      initials: '?',
      bgColor: 'var(--avatar-bg-default, #555)',
      type: 'unknown',
      isDefaultLogo: false,
    }
    if (!message || !message.role) return details

    const role = message.role
    const currentTestConf = testModeAssistantConfig.value
    let assistantForDisplay = null
    let isMainChatContext = false

    if (isCurrentSessionTestMode.value && currentTestConf) {
      isMainChatContext =
        currentTestConf.id === conversationStore.MAIN_CHAT_ID || currentTestConf.name === 'Nb4U-Ai'
      assistantForDisplay = {
        name: currentTestConf.name,
        color: currentTestConf.color,
        imageUrl: currentTestConf.imageUrl,
        isDefaultLogo: isMainChatContext,
      }
    } else if (loadedMemoryId.value) {
      const memory = conversationStore.memories.find((m) => m.memoryId === loadedMemoryId.value)
      if (memory) {
        isMainChatContext = conversationStore.isMainChatSession(memory.sessionId)
        if (isMainChatContext) {
          assistantForDisplay = { name: 'Nb4U-Ai', isDefaultLogo: true }
        } else {
          assistantForDisplay = assistantsStore.getAssistantById(memory.sessionId)
          if (assistantForDisplay) assistantForDisplay.isDefaultLogo = false
        }
      }
    } else {
      isMainChatContext = conversationStore.isMainChatSession(activeSessionId.value)
      if (isMainChatContext) {
        assistantForDisplay = { name: 'Nb4U-Ai', isDefaultLogo: true }
      } else {
        assistantForDisplay = selectedAssistant.value
        if (assistantForDisplay) assistantForDisplay.isDefaultLogo = false
      }
    }

    details.type = role
    if (role === 'user') {
      details.bgColor = 'var(--avatar-bg-user, #4a5568)'
      details.imageUrl = userAvatarUrl?.value || null
      details.initials = getInitials(userDisplayName?.value, 'U')
      details.isDefaultLogo = false
    } else if (role === 'assistant') {
      if (assistantForDisplay?.isDefaultLogo) {
        details.type = 'default-logo'
        details.initials = null
        details.bgColor = null
        details.isDefaultLogo = true
      } else if (assistantForDisplay) {
        details.imageUrl = assistantForDisplay.imageUrl || null
        details.initials = getInitials(assistantForDisplay.name, 'AI')
        details.bgColor = assistantForDisplay.color || 'var(--avatar-bg-default, #555)'
        details.isDefaultLogo = false
      } else {
        details.initials = 'AI'
        details.bgColor = 'var(--avatar-bg-default, #555)'
        details.isDefaultLogo = false
      }
    } else if (role === 'system') {
      details.type = 'system'
      details.initials = 'S'
      details.bgColor = 'var(--avatar-bg-system, #a0aec0)'
      details.isDefaultLogo = false
    }
    return details
  }

  const toggleAssistantSelector = () => {
    isAssistantSelectorExpanded.value = !isAssistantSelectorExpanded.value
  }

  const selectAssistant = async (id) => {
    if (!id) return
    await conversationStore.setActiveSession(id)
    await nextTick()
    chatInputAreaRef.value?.focusNestedInput?.()
  }

  const handleEnterKey = (event) => {
    if (sendOnEnter.value && !event.shiftKey && !isSending.value) {
      if (userInputRef.value?.trim() || selectedFile.value) {
        event.preventDefault()
        handleSendMessage()
      }
    }
  }

  const handleSendMessage = async () => {
    const currentInputText = userInputRef.value
    const currentSelectedFile = selectedFile.value
    const imagePreviewUrlForStore = selectedImagePreview.value

    if (isSending.value || (!currentInputText?.trim() && !currentSelectedFile)) {
      return
    }

    chatInputAreaRef.value?.triggerNestedSendAnimation?.()
    const textToSend = currentInputText?.trim() ?? ''
    const fileToSend = currentSelectedFile

    userInputRef.value = ''
    removeSelectedImage()
    chatInputAreaRef.value?.resetTextareaHeight?.()

    const messagesForTestContext = isCurrentSessionTestMode.value
      ? [...testSessionMessages.value]
      : null

    // Handle user message display and scroll for test mode FIRST
    if (isCurrentSessionTestMode.value) {
      const tempUserMessageForTest = {
        messageId: `user-temp-${Date.now()}`, // Temporary ID
        role: 'user',
        content: textToSend,
        timestamp: Date.now(),
        imagePreviewUrl: imagePreviewUrlForStore,
      }
      testSessionMessages.value.push(tempUserMessageForTest)
      // messagesForTestContext is already prepared with this message if it's to be passed to sendChatMessage
      await nextTick()
      if (actualScrollElementRef.value && typeof capturedScrollToBottom === 'function') {
        capturedScrollToBottom('auto')
      }
    }

    const result = await sendChatMessage(
      textToSend,
      fileToSend,
      imagePreviewUrlForStore,
      messagesForTestContext,
    )

    if (isCurrentSessionTestMode.value) {
      // Replace temp user message with the one having the final ID from result
      if (result.userMessage) {
        const tempMsgIndex = testSessionMessages.value.findIndex((m) =>
          m.messageId.startsWith('user-temp-'),
        )
        if (tempMsgIndex !== -1) {
          testSessionMessages.value.splice(tempMsgIndex, 1, result.userMessage)
        } else {
          // Fallback if temp not found (should be rare if logic is correct)
          testSessionMessages.value.push(result.userMessage)
        }
      }
      // CRITICAL FIX: Add AI's response to the test session messages array
      if (result.assistantMessage) {
        // Check if a message with this ID (potentially a shell) already exists from streaming
        const existingAiMsgIndex = testSessionMessages.value.findIndex(
          (m) => m.messageId === result.assistantMessage.messageId,
        )
        if (existingAiMsgIndex !== -1) {
          // Update existing message shell with final content
          testSessionMessages.value.splice(existingAiMsgIndex, 1, result.assistantMessage)
        } else {
          // Add as new if no shell existed (e.g., non-streaming response or error)
          testSessionMessages.value.push(result.assistantMessage)
        }
      }
    }

    // Unified scroll call after all message operations (user and AI) are reflected
    // in the reactive arrays and DOM has had a chance to update.
    await nextTick()
    if (actualScrollElementRef.value && typeof capturedScrollToBottom === 'function') {
      capturedScrollToBottom('auto')
    }

    if (result.success && result.aiResponse) {
      ttsSpeakText(result.aiResponse)
    } else if (!result.success && sendError.value) {
      handleComposableError(sendError.value)
    } else if (!result.success) {
      handleComposableError('Failed to send message for an unknown reason.')
    }

    await nextTick()
    chatInputAreaRef.value?.focusNestedInput?.()
  }

  const shouldShowAssistantSelectorBarEffective = computed(() => {
    return showAssistantSelectorBarFromSettings.value && !isCurrentSessionTestMode.value
  })

  watch(sendError, (newError) => {
    if (newError) {
      handleComposableError(newError)
    }
  })

  watch(
    () => [
      userInputRef.value,
      selectedFile.value,
      activeSessionId.value,
      loadedMemoryId.value,
      testModeAssistantConfig.value,
      isCurrentSessionTestMode.value,
    ],
    () => {
      currentPlaceholder.value = calculatePlaceholder(userInputRef.value, selectedFile.value)
    },
    { immediate: true, deep: true },
  )

  watch(
    () => [props.assistantConfig, props.initialAssistantId, props.isTestMode],
    (newValues /*, oldValues - removed as unused */) => {
      testSessionMessages.value = []
      const newIsTestMode = newValues[2]
      const newAssistantConfig = newValues[0]
      const newInitialAssistantId = newValues[1]
      if (newIsTestMode) {
        if (newAssistantConfig) {
          conversationStore.setTestModeAssistantConfig(newAssistantConfig)
        } else if (newInitialAssistantId) {
          const assistantFromStore = assistantsStore.getAssistantById(newInitialAssistantId)
          if (assistantFromStore) {
            conversationStore.setTestModeAssistantConfig(assistantFromStore)
          } else {
            handleComposableError(
              `Test Assistant ID ${newInitialAssistantId} not found on prop change.`,
            )
            conversationStore.setTestModeAssistantConfig({
              name: 'Error: Not Found',
              id: 'error-prop-watch',
              instructions: '',
              color: '#FF0000',
            })
          }
        } else {
          conversationStore.clearTestModeAssistantConfig()
        }
      } else {
        conversationStore.clearTestModeAssistantConfig()
      }
      nextTick(() => {
        chatInputAreaRef.value?.focusNestedInput?.()
        if (actualScrollElementRef.value && typeof instantScrollToBottom === 'function') {
          instantScrollToBottom()
        }
      })
    },
    { deep: true, immediate: false },
  )

  onMounted(async () => {
    testSessionMessages.value = []
    if (props.isTestMode) {
      if (props.assistantConfig) {
        await conversationStore.setTestModeAssistantConfig(props.assistantConfig)
      } else if (props.initialAssistantId) {
        const assistantFromStore = assistantsStore.getAssistantById(props.initialAssistantId)
        if (assistantFromStore) {
          await conversationStore.setTestModeAssistantConfig(assistantFromStore)
        } else {
          handleComposableError(
            `Could not find assistant with ID ${props.initialAssistantId} to test during mount.`,
          )
          await conversationStore.setTestModeAssistantConfig({
            name: 'Error: Not Found',
            id: 'error-mount',
            instructions: '',
            color: '#FF0000',
          })
        }
      } else {
        await conversationStore.clearTestModeAssistantConfig()
      }
    } else {
      await conversationStore.clearTestModeAssistantConfig()
      if (!activeSessionId.value && !loadedMemoryId.value) {
        if (conversationStore.MAIN_CHAT_ID) {
          await conversationStore.setActiveSession(conversationStore.MAIN_CHAT_ID)
        } else {
          console.warn('[useChatViewLogic] conversationStore.MAIN_CHAT_ID is not defined on mount.')
        }
      }
    }
    await nextTick()
    chatInputAreaRef.value?.focusNestedInput?.()
    if (actualScrollElementRef.value && typeof instantScrollToBottom === 'function') {
      instantScrollToBottom()
    }
  })

  onUnmounted(() => {
    if (props.isTestMode && (props.assistantConfig || props.initialAssistantId)) {
      conversationStore.clearTestModeAssistantConfig()
    }
    if (isListening.value) {
      toggleListening()
    }
    testSessionMessages.value = []
  })

  return {
    isSending,
    isListening,
    isAssistantSelectorExpanded,
    selectedImagePreview,
    selectedFile,
    activeSessionId,
    shouldShowAssistantSelectorBarEffective,
    currentPlaceholder,
    displayMessages,
    availableAssistants,
    selectedAssistant,
    speechSupported,
    ttsSupported,
    isTtsEnabled,
    copiedState,
    isAnimatingText,
    isTurboActive,
    toggleTurboMode,
    handleSendMessage,
    handleEnterKey,
    selectAssistant,
    toggleAssistantSelector,
    toggleListening,
    ttsToggle,
    ttsHandleMessageClick,
    triggerFileInput,
    handleFileSelected,
    removeSelectedImage,
    copyText,
    processMessageText,
    formatTimestamp,
    getAvatarDetailsForMessage,
    autoGrowTextarea,
  }
}
