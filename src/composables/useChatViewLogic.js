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
import { intricacyLevels, questionsByLevel } from '@/data/assistantQuestions.js' // Keep if calculatePlaceholder uses props

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

// props parameter IS used in calculatePlaceholder
export function useChatViewLogic(userInputRef, props = {}, refs = {}) {
  if (!userInputRef || typeof userInputRef.value === 'undefined') {
    console.error('FATAL: useChatViewLogic requires a valid ref for userInputRef.')
    return {}
  }

  // Store instances
  const chatInputAreaRef = refs.chatInputAreaRef || ref(null) // Used
  const assistantsStore = useAssistantsStore()
  const conversationStore = useConversationStore()
  const settingsStore = useSettingsStore()

  // Store state refs
  const { assistants: availableAssistants, selectedAssistant } = storeToRefs(assistantsStore)
  const { activeHistory, activeSessionId, loadedMemoryId } = storeToRefs(conversationStore)
  const { showAssistantSelectorBar, userDisplayName, userAvatarUrl, sendOnEnter } =
    storeToRefs(settingsStore) // sendOnEnter is used

  // Local state
  const messageAreaRef = ref(null) // Used
  const isAssistantSelectorExpanded = ref(true) // Used
  const currentPlaceholder = ref('Enter message...') // Used

  // Composables instantiation
  // errorMessage parameter IS used
  const handleComposableError = (errorMessage) => {
    const message = String(errorMessage || 'An unexpected error occurred.')
    console.error('[Composable Error Handler]', message)
  }
  // All these are returned/used
  const { copiedState, formatTimestamp, copyText, processMessageText, autoGrowTextarea } =
    useUIUtils({ addErrorMessage: handleComposableError })
  const dummyUpdatePlaceholder = () => {}
  const {
    selectedImagePreview,
    selectedFile,
    triggerFileInput,
    handleFileSelected,
    removeSelectedImage,
  } = useFileInput({
    addErrorMessage: handleComposableError,
    updatePlaceholder: dummyUpdatePlaceholder,
  })
  // All these are returned/used
  const {
    ttsSupported,
    isTtsEnabled,
    toggleTts: ttsToggle,
    handleMessageClick: ttsHandleMessageClick,
    speakText: ttsSpeakText,
  } = useTextToSpeech({ addErrorMessage: handleComposableError })
  // All these are returned/used
  const { isListening, speechSupported, toggleListening } = useSpeechRecognition({
    onResult: (transcript) => {
      userInputRef.value = transcript
    },
    onError: handleComposableError,
  })
  useChatScroll(messageAreaRef, activeHistory)
  // isSending, sendError, sendChatMessage are used/returned
  const {
    sendMessage: sendChatMessage,
    isLoading: isSending,
    error: sendError,
  } = useMessageSender()

  // Calculate Placeholder Logic - is used
  // currentInput, currentFile parameters are used
  const calculatePlaceholder = (currentInput, currentFile) => {
    if (currentFile) return 'Image selected. Add description or send.'
    if (currentInput) return 'Continue typing...'
    const currentSessId = activeSessionId.value // Used
    const currentLoadedMemId = loadedMemoryId.value
    const assistantNameFromProp = props?.assistantConfig?.name // Uses props

    if (assistantNameFromProp && props?.assistantConfig?.id?.startsWith('temp_')) {
      return `Testing ${assistantNameFromProp}...`
    } // Uses props
    if (!currentLoadedMemId) {
      if (selectedAssistant?.value?.name) {
        return `Ask ${selectedAssistant.value.name}...`
      } // Uses selectedAssistant
      else {
        return 'Ask Nb4U-Ai...'
      }
    }
    if (currentLoadedMemId) {
      const memory = conversationStore.memories.find((m) => m.memoryId === currentLoadedMemId) // Uses conversationStore
      if (memory) {
        if (conversationStore.isMainChatSession(memory.sessionId))
          return 'Viewing chat with Nb4U-Ai...' // Uses conversationStore
        try {
          const assistant = assistantsStore.getAssistantById(memory.sessionId) // Uses assistantsStore
          return assistant ? `Viewing chat with ${assistant.name}...` : 'Viewing saved chat...'
        } catch {
          return 'Viewing saved chat...'
        }
      }
    }
    if (!currentSessId || conversationStore.isMainChatSession(currentSessId))
      return 'Ask Nb4U-Ai...' // Uses conversationStore, currentSessId
    try {
      const assistant = assistantsStore.getAssistantById(currentSessId) // Uses assistantsStore, currentSessId
      return assistant ? `Ask ${assistant.name}...` : 'Ask selected assistant...'
    } catch (_e) {
      console.warn('Error getting assistant for placeholder', _e)
      return 'Ask selected assistant...'
    }
  }

  // displayMessages is returned
  const displayMessages = computed(() => activeHistory.value)

  // getAvatarDetailsForMessage is returned
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
    const currentSelectedAssistantVal = selectedAssistant?.value
    const userDisplayNameVal = userDisplayName?.value
    const userAvatarUrlVal = userAvatarUrl?.value
    const isChatFromLoadedMemory = !!loadedMemoryId?.value
    try {
      if (role === 'user') {
        details.type = 'user'
        details.bgColor = 'var(--avatar-bg-user, #4a5568)'
        details.imageUrl = userAvatarUrlVal || null
        details.initials = getInitials(userDisplayNameVal, '?') // Uses getInitials
      } else if (role === 'assistant') {
        details.type = 'assistant'
        if (isChatFromLoadedMemory) {
          details.imageUrl = null
          details.initials = 'AI'
          details.bgColor = 'var(--avatar-bg-historical-ai, #718096)' // Gray fallback
        } else if (currentSelectedAssistantVal) {
          // Live chat with selected assistant
          const assistantName = currentSelectedAssistantVal.name
          const assistantImgUrl = currentSelectedAssistantVal.imageUrl || null
          const calculatedInitials = getInitials(assistantName, 'AI') // Uses getInitials
          const assistantColor = currentSelectedAssistantVal.color
          // Use assistant's color OR fallback to GRAY
          details.bgColor = assistantColor || 'var(--avatar-bg-historical-ai, #718096)' // Corrected fallback
          details.imageUrl = assistantImgUrl
          details.initials = calculatedInitials
          details.isDefaultLogo = false
        } else {
          // Live chat but main_chat
          details.imageUrl = null
          details.initials = null
          details.bgColor = null
          details.type = 'default-logo'
          details.isDefaultLogo = true
        }
      } else if (role === 'system') {
        details.type = 'system'
        details.initials = 'S'
        details.imageUrl = null
        details.bgColor = 'var(--avatar-bg-system, #a0aec0)'
      }
    } catch (_error) {
      // _error parameter is used here
      console.error(`Error inside getAvatarDetailsForMessage logic:`, _error, { message })
      details.imageUrl = null
      details.initials = '!'
      details.bgColor = 'var(--avatar-bg-default, #555)'
      details.type = 'error'
    }
    return details
  }

  // toggleAssistantSelector is returned
  const toggleAssistantSelector = () => {
    isAssistantSelectorExpanded.value = !isAssistantSelectorExpanded.value
  }

  // selectAssistant is returned, id parameter is used
  const selectAssistant = async (id) => {
    // console.log("[useChatViewLogic] Selecting assistant. Received ID:", id); // Logging removed
    const isSelectingMainChat = conversationStore.isMainChatSession(id) // Uses id
    const assistantIdToSelect = isSelectingMainChat ? null : id // Uses id
    const conversationSessionId = id // Uses id
    // console.log(`[useChatViewLogic] Processing Selection. Target Assistant ID: ${assistantIdToSelect}, Target Session ID: ${conversationSessionId}`); // Logging removed
    assistantsStore.selectAssistant(assistantIdToSelect)
    if (conversationSessionId) {
      await conversationStore.setActiveSession(conversationSessionId)
    } else {
      console.error(
        '[useChatViewLogic] Attempted setActiveSession with invalid ID:',
        conversationSessionId,
      )
      return
    }
    await nextTick() // Uses nextTick
    chatInputAreaRef.value?.focusNestedInput?.() // Uses chatInputAreaRef
  }

  // handleEnterKey is returned, event parameter is used
  const handleEnterKey = (event) => {
    // Uses sendOnEnter, event, isSending, userInputRef, selectedFile
    if (sendOnEnter.value && !event.shiftKey && !isSending.value) {
      if (userInputRef.value?.trim() || selectedFile.value) {
        event.preventDefault() // Uses event
        handleSendMessage() // Calls handleSendMessage
      }
    }
  }

  // handleSendMessage is returned
  const handleSendMessage = async () => {
    // Uses isSending, userInputRef, selectedFile, selectedImagePreview, chatInputAreaRef, removeSelectedImage, sendChatMessage, ttsSpeakText, nextTick
    const currentInputText = userInputRef.value
    const currentSelectedFile = selectedFile.value
    const imagePreviewUrlForStore = selectedImagePreview.value
    if (isSending.value || (!currentInputText?.trim() && !currentSelectedFile)) {
      return
    }
    const chatInputInstance = chatInputAreaRef.value
    chatInputInstance?.triggerNestedSendAnimation?.()
    const textToSend = currentInputText?.trim() ?? ''
    const fileToSend = currentSelectedFile
    userInputRef.value = ''
    removeSelectedImage() // Uses removeSelectedImage
    chatInputInstance?.resetTextareaHeight?.()
    const { success, aiResponse } = await sendChatMessage(
      textToSend,
      fileToSend,
      imagePreviewUrlForStore,
    ) // Uses sendChatMessage
    if (success && aiResponse) {
      ttsSpeakText(aiResponse)
    } // Uses ttsSpeakText
    else if (!success) {
      console.error(`[useChatViewLogic -> handleSendMessage] Message sending failed.`)
    }
    await nextTick() // Uses nextTick
    chatInputInstance?.focusNestedInput?.()
  }

  // --- Watchers ---
  // newError parameter is used
  watch(sendError, (newError) => {
    if (newError) {
      handleComposableError(newError.message || newError)
    } // Uses handleComposableError
  })
  // currentInput, currentFile parameters are used
  watch(
    () => [
      userInputRef.value,
      selectedFile.value,
      activeSessionId.value,
      loadedMemoryId.value,
      selectedAssistant?.value?.name,
    ],
    ([currentInput, currentFile]) => {
      // Uses userInputRef, selectedFile, activeSessionId, loadedMemoryId, selectedAssistant
      currentPlaceholder.value = calculatePlaceholder(currentInput, currentFile) // Uses calculatePlaceholder
    },
    { immediate: true },
  )
  // availableAssistants is watched
  watch(
    availableAssistants,
    () => {
      currentPlaceholder.value = calculatePlaceholder(userInputRef.value, selectedFile.value) // Uses calculatePlaceholder
    },
    { deep: true },
  )

  // --- Lifecycle Hooks ---
  onMounted(() => {
    console.log('useChatViewLogic mounted')
  })
  onUnmounted(() => {
    console.log('useChatViewLogic unmounted')
  })

  // --- Return statement --- (Ensure ALL needed exports are present)
  return {
    isSending,
    isListening,
    isAssistantSelectorExpanded,
    messageAreaRef,
    selectedImagePreview,
    selectedFile,
    activeSessionId,
    showAssistantSelectorBar,
    currentPlaceholder,
    displayMessages,
    availableAssistants,
    selectedAssistant,
    speechSupported,
    ttsSupported,
    isTtsEnabled,
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
    copiedState,
  } // This seems complete based on ChatView usage
} // End of useChatViewLogic function
