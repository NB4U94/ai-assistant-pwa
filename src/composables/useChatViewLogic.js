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

// props parameter IS used
export function useChatViewLogic(userInputRef, props = {}, refs = {}) {
  if (!userInputRef || typeof userInputRef.value === 'undefined') {
    console.error('FATAL: useChatViewLogic requires a valid ref for userInputRef.')
    return {}
  }

  // Store instances
  const chatInputAreaRef = refs.chatInputAreaRef || ref(null)
  const assistantsStore = useAssistantsStore()
  const conversationStore = useConversationStore()
  const settingsStore = useSettingsStore()

  // Store state refs
  const { assistants: availableAssistants, selectedAssistant } = storeToRefs(assistantsStore)
  const {
    activeHistory,
    activeSessionId,
    loadedMemoryId,
    isCurrentSessionTestMode, // Get reactive ref for test mode status
  } = storeToRefs(conversationStore)
  const { showAssistantSelectorBar, userDisplayName, userAvatarUrl, sendOnEnter } =
    storeToRefs(settingsStore)

  // Local state
  const messageAreaRef = ref(null) // Ref for the MessageDisplayArea component/element
  const isAssistantSelectorExpanded = ref(true)
  const currentPlaceholder = ref('Enter message...')
  const testSessionMessages = ref([]) // <<< NEW: Local array for test messages

  // Composables instantiation
  const handleComposableError = (errorMessage) => {
    const message = String(errorMessage || 'An unexpected error occurred.')
    console.error('[Composable Error Handler]', message)
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
    onResult: (transcript) => {
      userInputRef.value = transcript
    },
    onError: handleComposableError,
  })

  // <<< MODIFIED: Pass testSessionMessages OR activeHistory to useChatScroll >>>
  // We need the scroll logic to watch the currently *displayed* messages
  const messagesForScroll = computed(() =>
    isCurrentSessionTestMode.value ? testSessionMessages.value : activeHistory.value,
  )
  useChatScroll(messageAreaRef, messagesForScroll) // Pass the computed ref

  const {
    sendMessage: sendChatMessage,
    isLoading: isSending,
    error: sendError,
  } = useMessageSender()

  // Calculate Placeholder Logic
  const calculatePlaceholder = (currentInput, currentFile) => {
    if (isCurrentSessionTestMode.value) {
      const assistantName = selectedAssistant?.value?.name || props.assistantConfig?.name
      return assistantName ? `Testing ${assistantName}...` : 'Testing assistant...'
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
        try {
          const assistant = assistantsStore.getAssistantById(currentSessId)
          return assistant ? `Ask ${assistant.name}...` : 'Ask selected assistant...'
        } catch (_e) {
          console.warn('Error getting assistant for placeholder', _e)
          return 'Ask selected assistant...'
        }
      }
    }
  }

  // <<< MODIFIED: Return local test messages OR store history based on mode >>>
  const displayMessages = computed(() => {
    return isCurrentSessionTestMode.value // Use the reactive store ref
      ? testSessionMessages.value
      : activeHistory.value
  })

  // getAvatarDetailsForMessage - (Logic seems okay, handles props.assistantConfig for test name)
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
    const userDisplayNameVal = userDisplayName?.value
    const userAvatarUrlVal = userAvatarUrl?.value
    const isChatFromLoadedMemory = !!loadedMemoryId?.value
    const currentActiveSessionIdVal = activeSessionId?.value
    let assistantForAvatar = null
    let assistantNameForAvatar = 'AI'
    let assistantColorForAvatar = 'var(--avatar-bg-historical-ai, #718096)'
    let assistantImageUrlForAvatar = null

    if (isChatFromLoadedMemory) {
      const memory = conversationStore.memories.find((m) => m.memoryId === loadedMemoryId.value)
      if (memory && !conversationStore.isMainChatSession(memory.sessionId)) {
        assistantForAvatar = assistantsStore.getAssistantById(memory.sessionId)
      }
    } else if (props.isTestMode && props.assistantConfig) {
      assistantNameForAvatar = props.assistantConfig.name || 'Test'
      assistantColorForAvatar = props.assistantConfig.color || assistantColorForAvatar
      assistantImageUrlForAvatar = props.assistantConfig.imageUrl || null
    } else if (isCurrentSessionTestMode.value && !props.assistantConfig) {
      // Test mode from AssistantsView (uses selectedAssistant from store)
      assistantForAvatar = selectedAssistant?.value
    } else if (!conversationStore.isMainChatSession(currentActiveSessionIdVal)) {
      assistantForAvatar = selectedAssistant?.value
    }

    if (assistantForAvatar) {
      assistantNameForAvatar = assistantForAvatar.name
      assistantColorForAvatar = assistantForAvatar.color || assistantColorForAvatar
      assistantImageUrlForAvatar = assistantForAvatar.imageUrl || null
    }

    try {
      if (role === 'user') {
        details.type = 'user'
        details.bgColor = 'var(--avatar-bg-user, #4a5568)'
        details.imageUrl = userAvatarUrlVal || null
        details.initials = getInitials(userDisplayNameVal, '?')
      } else if (role === 'assistant') {
        details.type = 'assistant'
        details.imageUrl = assistantImageUrlForAvatar
        details.initials = getInitials(assistantNameForAvatar, 'AI')
        details.bgColor = assistantColorForAvatar
        const isLiveMain =
          conversationStore.isMainChatSession(currentActiveSessionIdVal) &&
          !isChatFromLoadedMemory &&
          !isCurrentSessionTestMode.value // Live main chat
        const isLoadedMain =
          isChatFromLoadedMemory &&
          conversationStore.isMainChatSession(
            conversationStore.memories.find((m) => m.memoryId === loadedMemoryId.value)?.sessionId,
          ) // Loaded main chat
        details.isDefaultLogo = isLiveMain || isLoadedMain
        if (details.isDefaultLogo) {
          details.type = 'default-logo'
          details.initials = null
          details.bgColor = null
        }
      } else if (role === 'system') {
        details.type = 'system'
        details.initials = 'S'
        details.imageUrl = null
        details.bgColor = 'var(--avatar-bg-system, #a0aec0)'
      }
    } catch (_error) {
      console.error(`Error inside getAvatarDetailsForMessage logic:`, _error, { message })
      details.imageUrl = null
      details.initials = '!'
      details.bgColor = 'var(--avatar-bg-default, #555)'
      details.type = 'error'
    }
    return details
  }

  const toggleAssistantSelector = () => {
    isAssistantSelectorExpanded.value = !isAssistantSelectorExpanded.value
  }

  const selectAssistant = async (id) => {
    const conversationSessionId = id
    if (!conversationSessionId) {
      console.error('[useChatViewLogic] Attempted selectAssistant with invalid ID:', id)
      return
    }
    // Selecting an assistant always exits test mode
    console.log(
      `[useChatViewLogic] Setting active session to: ${conversationSessionId} (Test Mode: false)`,
    )
    await conversationStore.setActiveSession(conversationSessionId, false) // Explicitly set test mode to false
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

    if (isSending.value || (!currentInputText?.trim() && !currentSelectedFile)) return

    const chatInputInstance = chatInputAreaRef.value
    chatInputInstance?.triggerNestedSendAnimation?.()

    const textToSend = currentInputText?.trim() ?? ''
    const fileToSend = currentSelectedFile

    userInputRef.value = ''
    removeSelectedImage()
    chatInputInstance?.resetTextareaHeight?.()

    // <<< MODIFIED: Capture result object from sendChatMessage >>>
    const result = await sendChatMessage(
      textToSend,
      fileToSend,
      imagePreviewUrlForStore,
      isCurrentSessionTestMode.value, // <<< Pass STORE value here
    )

    // <<< MODIFIED: Handle temporary messages in test mode >>>
    if (props.isTestMode || isCurrentSessionTestMode.value) {
      // Check prop OR store flag
      if (result.success) {
        // Add user message returned from sender to local array
        if (result.userMessage) {
          testSessionMessages.value.push(result.userMessage)
        }
        // Add assistant message returned from sender to local array
        if (result.assistantMessage) {
          testSessionMessages.value.push(result.assistantMessage)
        }
      } else {
        // If sending failed in test mode, maybe still show user message temporarily?
        if (result.userMessage) {
          // Find a way to indicate error? Or just display user message.
          // testSessionMessages.value.push({...result.userMessage, error: true }); // Example
          // Let's just push it for now, errors are handled elsewhere
          testSessionMessages.value.push(result.userMessage)
        }
      }
    }

    // Speak response only if successful (TTS logic is independent of saving)
    if (result.success && result.aiResponse) {
      ttsSpeakText(result.aiResponse)
    } else if (!result.success) {
      console.error(`[useChatViewLogic -> handleSendMessage] Message sending reported failure.`)
    }

    await nextTick()
    chatInputInstance?.focusNestedInput?.()
  }

  // --- Watchers ---
  watch(sendError, (newError) => {
    if (newError) handleComposableError(newError.message || newError)
  })

  watch(
    () => [
      userInputRef.value,
      selectedFile.value,
      activeSessionId.value,
      loadedMemoryId.value,
      selectedAssistant?.value?.name,
      isCurrentSessionTestMode.value, // Use store value
      props.isTestMode,
      props.assistantConfig?.name,
    ],
    ([currentInput, currentFile]) => {
      currentPlaceholder.value = calculatePlaceholder(currentInput, currentFile)
    },
    { immediate: true, deep: true },
  )

  // <<< NEW: Watcher to clear temporary messages when leaving test mode >>>
  watch(isCurrentSessionTestMode, (isTest) => {
    if (!isTest) {
      console.log('[useChatViewLogic] Exiting test mode, clearing temporary messages.')
      testSessionMessages.value = [] // Clear local messages
    }
  })

  // --- Lifecycle Hooks ---
  onMounted(() => {
    console.log('[useChatViewLogic] Mounted.')
    const initialAssistantId = props.initialAssistantId
    const isTestFromProps = props.isTestMode || false

    testSessionMessages.value = [] // Clear temporary messages on mount/remount

    if (initialAssistantId) {
      // Case 1: Test modal from AssistantsView
      console.log(
        `[useChatViewLogic] Initializing from props. Assistant ID: ${initialAssistantId}, Test Mode: ${isTestFromProps}`,
      )
      conversationStore
        .setActiveSession(initialAssistantId, isTestFromProps)
        .then(() => {
          console.log(
            `[useChatViewLogic] Session set for ${initialAssistantId}, Test Mode: ${isTestFromProps}. Focusing input.`,
          )
          nextTick(() => {
            chatInputAreaRef.value?.focusNestedInput?.()
          })
        })
        .catch((error) => {
          console.error(
            `[useChatViewLogic] Error setting initial active session for ${initialAssistantId}:`,
            error,
          )
          handleComposableError(`Failed to initialize chat session for the assistant.`)
        })
    } else if (isTestFromProps && props.assistantConfig) {
      // Case 2: Test modal from AssistantCreator
      console.log(
        `[useChatViewLogic] Initializing for temporary test from AssistantCreator. Test Mode: ${isTestFromProps}`,
      )
      // Directly set the store flag (setActiveSession might not be appropriate without a real ID)
      isCurrentSessionTestMode.value = true
      updatePlaceholderBasedOnState()
      nextTick(() => {
        chatInputAreaRef.value?.focusNestedInput?.()
      })
    } else {
      // Case 3: Standard mount
      console.log('[useChatViewLogic] Standard mount. Updating placeholder.')
      isCurrentSessionTestMode.value = false
      updatePlaceholderBasedOnState()
      nextTick(() => {
        chatInputAreaRef.value?.focusNestedInput?.()
      })
    }
  })

  onUnmounted(() => {
    console.log('[useChatViewLogic] Unmounted.')
    if (isListening.value) toggleListening()
    // Clear temporary messages when component is destroyed
    testSessionMessages.value = []
  })

  // --- Return statement ---
  return {
    // Reactive State
    isSending,
    isListening,
    isAssistantSelectorExpanded,
    selectedImagePreview,
    selectedFile,
    activeSessionId,
    showAssistantSelectorBar,
    currentPlaceholder,
    displayMessages, // Now returns temporary messages in test mode
    availableAssistants,
    selectedAssistant,
    speechSupported,
    ttsSupported,
    isTtsEnabled,
    copiedState,

    // Methods
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
