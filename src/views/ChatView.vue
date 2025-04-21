<template>
  <div class="chat-view">
    <div class="assistant-selector-area">
      <div class="assistant-selector-row">
        <div
          :class="['assistant-selector-item', !selectedAssistantId ? 'selected' : '']"
          @click="selectAssistant(null)"
          title="Select Default Assistant"
          tabindex="0"
          @keydown.enter.prevent="selectAssistant(null)"
          @keydown.space.prevent="selectAssistant(null)"
        >
          <div class="assistant-selector-avatar">
            <div class="assistant-placeholder default-placeholder">?</div>
          </div>
          <span class="assistant-selector-name">Default AI</span>
        </div>
        <div
          v-for="assistant in availableAssistants"
          :key="assistant.id"
          :class="[
            'assistant-selector-item',
            selectedAssistantId === assistant.id ? 'selected' : '',
          ]"
          @click="selectAssistant(assistant.id)"
          :title="`Select Assistant: ${assistant.name}`"
          tabindex="0"
          @keydown.enter.prevent="selectAssistant(assistant.id)"
          @keydown.space.prevent="selectAssistant(assistant.id)"
        >
          <div class="assistant-selector-avatar">
            <img
              v-if="assistant.imageUrl"
              :src="assistant.imageUrl"
              :alt="assistant.name"
              class="assistant-image"
            />
            <div v-else class="assistant-placeholder">
              {{ assistant.name ? assistant.name.charAt(0).toUpperCase() : 'A' }}
            </div>
          </div>
          <span class="assistant-selector-name">{{ assistant.name }}</span>
        </div>
      </div>
    </div>

    <div class="message-display-area" ref="messageAreaRef">
      <div
        v-for="message in displayMessages"
        :key="message.id"
        :class="[
          'message-container',
          message.sender === 'User'
            ? 'user-container'
            : message.sender === 'AI'
              ? 'ai-container'
              : 'system-container',
        ]"
        @click="message.sender === 'AI' ? ttsHandleMessageClick(message.text) : null"
        :title="
          message.sender === 'AI' && ttsSupported && isTtsEnabled ? 'Click to read aloud' : ''
        "
      >
        <div class="avatar-placeholder" :title="message.sender">
          {{ message.sender === 'User' ? 'U' : message.sender === 'AI' ? 'AI' : 'S' }}
        </div>
        <div
          :class="[
            'message',
            message.sender === 'User'
              ? 'user-message'
              : message.sender === 'AI'
                ? 'ai-message'
                : 'system-message',
            { 'error-message-style': message.isError },
          ]"
        >
          <img
            v-if="message.imagePreviewUrl"
            :src="message.imagePreviewUrl"
            alt="Sent image thumbnail"
            class="message-image-thumbnail"
          />
          <span class="message-text" v-if="message.text && message.text.trim() !== ''">
            <template v-for="(segment, index) in processMessageText(message.text)" :key="index">
              <a
                v-if="segment.type === 'link'"
                :href="segment.url"
                target="_blank"
                rel="noopener noreferrer"
                @click.stop
              >
                {{ segment.text }}
              </a>
              <span v-else>{{ segment.text }}</span>
            </template>
          </span>
          <span v-if="message.timestamp" class="timestamp">{{
            formatTimestamp(message.timestamp)
          }}</span>
          <button
            v-if="message.sender === 'AI' && !message.isError"
            @click.stop="copyText(message.text, message.id, $event)"
            class="copy-button"
            title="Copy response"
            :data-copied="copiedState[message.id] || false"
          >
            <span v-if="copiedState[message.id]">✅</span><span v-else>📋</span>
          </button>
        </div>
      </div>
      <p v-if="displayMessages.length === 0 && !isLoading" class="placeholder-message">
        No messages yet. Start the conversation{{
          activeAssistant?.name ? ` with ${activeAssistant.name}` : ''
        }}!
      </p>
    </div>

    <div v-if="selectedImagePreview" class="image-preview-area">
      <img :src="selectedImagePreview" alt="Selected image preview" class="image-preview" />
      <button @click="removeSelectedImage" class="remove-image-button" title="Remove image">
        ✖
      </button>
    </div>

    <div class="input-area">
      <div class="loading-indicator-visual-container" v-if="isLoading">
        <div class="loading-indicator-visual"></div>
      </div>
      <input
        type="file"
        ref="fileInputRef"
        @change="handleFileSelected"
        accept="image/*"
        style="display: none"
      />
      <button
        @click="triggerFileInput"
        class="icon-button"
        aria-label="Attach file"
        title="Attach file"
        :disabled="isLoading"
      >
        📁
      </button>
      <button
        @click="toggleListening"
        :class="['icon-button', isListening ? 'listening' : '']"
        aria-label="Use voice input"
        title="Use voice input"
        :disabled="isLoading || !speechSupported"
      >
        <span v-if="!isListening">🎙️</span><span v-else>🔘</span>
      </button>
      <textarea
        ref="inputAreaRef"
        v-model="userInput"
        :placeholder="currentPlaceholder"
        rows="1"
        @input="autoGrowTextarea"
        @keydown.enter.prevent="sendMessage"
        :disabled="isLoading"
        aria-label="Chat message input"
      ></textarea>
      <button
        ref="sendButtonRef"
        @click="sendMessage"
        :disabled="isLoading || (!userInput.trim() && !selectedFile)"
        aria-label="Send message"
        class="send-button icon-button send-button-plasma"
        title="Send message"
      >
        ➤
      </button>
      <button
        @click="ttsToggle"
        :class="['tts-button', 'icon-button', isTtsEnabled ? 'tts-on' : 'tts-off']"
        :aria-pressed="isTtsEnabled"
        aria-label="Toggle text to speech"
        :disabled="isLoading || !ttsSupported"
      >
        <span v-if="isTtsEnabled" title="Speech ON">🔊</span
        ><span v-else title="Speech OFF">🔇</span>
      </button>
    </div>
  </div>
</template>

<script setup>
// Core Vue imports
import { ref, nextTick, computed, onMounted, onUnmounted, watch } from 'vue'
// Pinia Stores
import { useAssistantsStore } from '@/stores/assistantsStore'
import { useConversationStore } from '@/stores/conversationStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { storeToRefs } from 'pinia'
// Composables
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'
import { useFileInput } from '@/composables/useFileInput'
import { useTextToSpeech } from '@/composables/useTextToSpeech'
import { useApi } from '@/composables/useApi'
import { useUIUtils } from '@/composables/useUIUtils'

// --- Props ---
const props = defineProps({
  assistantConfig: { type: Object, required: false, default: null },
})

// --- Store Setup ---
const assistantsStore = useAssistantsStore()
const conversationStore = useConversationStore()
const settingsStore = useSettingsStore()

// --- Store State (Reactive Refs) ---
const { assistants: availableAssistants, getAssistantById } = storeToRefs(assistantsStore)
const { activeHistory, activeSessionId } = storeToRefs(conversationStore)
const { chatModel, chatTemperature, chatMaxTokens } = storeToRefs(settingsStore)

// --- Component Refs ---
const messageAreaRef = ref(null)
const inputAreaRef = ref(null)
const sendButtonRef = ref(null)

// --- Local Component State ---
const userInput = ref('')
const selectedAssistantId = ref(null)
const uiMessages = ref([])

// --- UI Message Adder ---
const addUiMessage = (text, isError = false) => {
  const trimmedText = text?.toString().trim() || (isError ? 'An unknown error occurred.' : '')
  if (!trimmedText) return
  const newUiMessage = {
    id: `ui-${Date.now()}-${Math.random()}`,
    text: trimmedText,
    sender: 'System',
    timestamp: Date.now(),
    imagePreviewUrl: null,
    isError: isError,
  }
  uiMessages.value.push(newUiMessage)
  scrollToBottom('smooth')
}
const handleComposableError = (errorMessage) => {
  console.error('[Composable Error Handler]', errorMessage)
  addUiMessage(errorMessage, true)
}

// --- Composables Setup ---

// UI Utilities
const { copiedState, formatTimestamp, copyText, processMessageText, autoGrowTextarea } = useUIUtils(
  { addErrorMessage: handleComposableError },
)

// File Input
const {
  selectedImagePreview,
  selectedFile,
  fileInputRef,
  triggerFileInput,
  handleFileSelected,
  removeSelectedImage,
  readFileAsBase64,
} = useFileInput({
  addErrorMessage: handleComposableError,
  updatePlaceholder: (isImageSelected) => {
    if (isImageSelected) {
      currentPlaceholder.value = 'Image selected...'
    } else if (!userInput.value) {
      currentPlaceholder.value = activeAssistant.value
        ? `Ask ${activeAssistant.value.name}...`
        : placeholders[0]
    }
  },
  onImageSelected: () => {
    nextTick(() => {
      inputAreaRef.value?.focus()
    })
  },
})

// API Composable
const { isLoading, error: apiError, callApi } = useApi({ readFileAsBase64 })

// Text-to-Speech Composable
const {
  ttsSupported,
  isTtsEnabled,
  isSpeaking: isTtsSpeaking,
  speakText: ttsSpeakText,
  toggleTts: ttsToggle,
  handleMessageClick: ttsHandleMessageClick,
} = useTextToSpeech({ addErrorMessage: handleComposableError })

// Speech Recognition Composable
const { isListening, speechSupported, toggleListening } = useSpeechRecognition({
  userInputRef: userInput,
  inputAreaRef: inputAreaRef,
  autoGrowTextarea: autoGrowTextarea,
  addErrorMessage: handleComposableError,
})

// --- Computed Properties ---
const activeAssistant = computed(() => {
  // Prioritize prop if provided (e.g., for a dedicated assistant view)
  if (props.assistantConfig) return props.assistantConfig
  // Otherwise, use the selected ID from the local state
  if (selectedAssistantId.value) return getAssistantById.value(selectedAssistantId.value)
  // If no ID selected, return null (means default AI)
  return null
})
const activeAssistantName = computed(() => activeAssistant.value?.name || 'Default AI')

const displayMessages = computed(() => {
  const persistedMessages = activeHistory.value.map((msg, index) => ({
    id: `${conversationStore.activeSessionId || 'default'}-store-${index}`,
    text: typeof msg.content === 'string' ? msg.content : msg.content?.[0]?.text || '[Image Only]', // Show text if available, else indicator
    sender: msg.role === 'user' ? 'User' : 'AI',
    timestamp: msg.timestamp || null,
    imagePreviewUrl: msg.imagePreviewUrl || null, // Use stored preview
    isError: false,
  }))
  const combined = [...persistedMessages, ...uiMessages.value]
  return combined
})

// --- Animated Placeholder ---
const placeholders = [
  'Type message or use mic...',
  'Ask anything...',
  'Attach image & ask...',
  'Write story...',
  'Explain quantum physics...',
]
const currentPlaceholder = ref(placeholders[0])
let placeholderInterval = null

// --- Lifecycle Hooks ---
onMounted(() => {
  console.log(`[ChatView] Mounted. Session ID: ${activeSessionId.value}`)
  selectedAssistantId.value = activeSessionId.value === 'main_chat' ? null : activeSessionId.value
  scrollToBottom('auto')
  let placeholderIndex = 0
  placeholderInterval = setInterval(() => {
    placeholderIndex = (placeholderIndex + 1) % placeholders.length
    if (!userInput.value && !selectedImagePreview.value) {
      const basePlaceholder = activeAssistant.value
        ? `Ask ${activeAssistant.value.name}...`
        : placeholders[placeholderIndex]
      currentPlaceholder.value = basePlaceholder
    }
  }, 5000)
  if (props.assistantConfig) {
    selectedAssistantId.value = props.assistantConfig.id
    addUiMessage(`Switched to: ${props.assistantConfig.name}.`)
    conversationStore.setActiveSession(props.assistantConfig.id)
  } else {
    conversationStore.setActiveSession('main_chat')
    currentPlaceholder.value = activeAssistant.value
      ? `Ask ${activeAssistant.value.name}...`
      : placeholders[0]
    console.log('[ChatView] Mounted (main view).')
  }
  apiError.value = null
})
onUnmounted(() => {
  clearInterval(placeholderInterval)
})

// --- Watcher ---
watch(
  () => props.assistantConfig,
  (newConfig, oldConfig) => {
    // Handle switching based on prop changes
    if (newConfig !== oldConfig) {
      const targetSessionId = newConfig ? newConfig.id : 'main_chat'
      selectedAssistantId.value = newConfig ? newConfig.id : null
      const newAssistantName = newConfig ? newConfig.name : 'Default AI'
      addUiMessage(`Switched to ${newAssistantName}.`)
      userInput.value = ''
      removeSelectedImage()
      uiMessages.value = [] // Clear UI messages on switch
      conversationStore.setActiveSession(targetSessionId)
      scrollToBottom('auto')
      apiError.value = null // Clear errors
      currentPlaceholder.value = newConfig ? `Ask ${newConfig.name}...` : placeholders[0]
    }
  },
  { immediate: false }, // Don't run immediately on mount
)

// Watch for API errors from the composable and display them via UI message
watch(apiError, (newError) => {
  if (newError) {
    addUiMessage(newError, true)
    // Optionally clear the error ref after showing it,
    // or let clearError button handle it
    // apiError.value = null;
  }
})

// --- Assistant Selection --- (Handling click in the selector bar)
const selectAssistant = (assistantId) => {
  // If a prop is forcing the assistant, don't allow manual selection via bar
  if (props.assistantConfig) return
  // If already selected, do nothing
  if (selectedAssistantId.value === assistantId) return

  selectedAssistantId.value = assistantId
  const targetSessionId = assistantId || 'main_chat'
  conversationStore.setActiveSession(targetSessionId)
  const selAsst = activeAssistant.value // Re-compute based on new selectedAssistantId
  addUiMessage(`Switched to ${selAsst?.name || 'Default AI'}.`)
  userInput.value = ''
  removeSelectedImage()
  uiMessages.value = uiMessages.value.filter((m) => !m.isError && m.sender !== 'System')
  apiError.value = null
  scrollToBottom('auto')
  inputAreaRef.value?.focus()
  currentPlaceholder.value = selAsst ? `Ask ${selAsst.name}...` : placeholders[0]
  console.log(`Switched session to: ${targetSessionId}`)
}

// --- Utility Functions (Now mostly in useUIUtils) ---

// --- Message Scrolling ---
const scrollToBottom = (behavior = 'smooth') => {
  nextTick(() => {
    const el = messageAreaRef.value
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: behavior })
  })
}

// --- Send Button Flash ---
const triggerSendFlash = () => {
  const btn = sendButtonRef.value
  if (!btn) return
  btn.classList.remove('flash-active')
  void btn.offsetWidth
  btn.classList.add('flash-active')
  setTimeout(() => {
    if (btn) btn.classList.remove('flash-active')
  }, 300)
}

// --- Send Message Action --- UPDATED FOR SYSTEM MESSAGE ---
const sendMessage = async () => {
  const textInputRaw = userInput.value
  const imageFile = selectedFile.value
  const imagePreviewUrlForStore = selectedImagePreview.value

  const trimmedInput = textInputRaw.trim()

  if (isLoading.value || (trimmedInput === '' && !imageFile)) return

  // Add User message TO THE STORE
  if (trimmedInput !== '' || imageFile) {
    conversationStore.addMessageToActiveSession(
      'user',
      trimmedInput,
      Date.now(),
      imagePreviewUrlForStore,
    )
  } else {
    return
  }

  triggerSendFlash()

  // Prepare data for API & Clear Inputs
  const textToSendToApi = trimmedInput
  const imageFileToSendToApi = imageFile
  userInput.value = ''
  removeSelectedImage()

  nextTick(() => {
    if (inputAreaRef.value) {
      inputAreaRef.value.style.height = 'auto'
      autoGrowTextarea({ target: inputAreaRef.value })
    }
    currentPlaceholder.value = activeAssistant.value
      ? `Ask ${activeAssistant.value.name}...`
      : placeholders[0]
  })

  // --- Payload Construction ---
  let imgData = null
  if (imageFileToSendToApi && typeof readFileAsBase64 === 'function') {
    try {
      imgData = await readFileAsBase64(imageFileToSendToApi)
    } catch (e) {
      console.error('[ChatView] Error processing image file for API:', e)
      addUiMessage(`Image processing error: ${e.message}`, true)
      scrollToBottom('smooth')
      return
    }
  } else if (imageFileToSendToApi) {
    console.error('[ChatView] readFileAsBase64 function not available.')
    addUiMessage('Internal error: Cannot process image.', true)
    scrollToBottom('smooth')
    return
  }

  // --- CORRECTED: Build the messages array including system prompt ---
  const messagesToSend = []

  // 1. Add System Message (if assistant with instructions is active)
  const currentAssistant = activeAssistant.value // Get current assistant config
  if (currentAssistant?.instructions) {
    messagesToSend.push({
      role: 'system',
      content: currentAssistant.instructions,
    })
    console.log('[ChatView] Added system prompt for assistant:', currentAssistant.name)
  }

  // 2. Add Formatted History (excluding potential old system messages if store provides them)
  const historyForApi = conversationStore.getFormattedHistoryForAPI()
  // Ensure history doesn't duplicate the system prompt we might add
  const filteredHistory = historyForApi.filter((msg) => msg.role !== 'system')
  messagesToSend.push(...filteredHistory)

  // 3. Create and Add Current User Message
  const currentUserMessageContent = []
  if (textToSendToApi) {
    currentUserMessageContent.push({ type: 'text', text: textToSendToApi })
  }
  if (imgData) {
    currentUserMessageContent.push({
      type: 'image_url',
      image_url: { url: `data:${imgData.mimeType};base64,${imgData.base64Data}` },
    })
  }
  // Only add user message if it has content
  if (currentUserMessageContent.length > 0) {
    messagesToSend.push({ role: 'user', content: currentUserMessageContent })
  } else if (
    messagesToSend.length === 0 ||
    (messagesToSend.length === 1 && messagesToSend[0].role === 'system')
  ) {
    // Prevent sending if only a system prompt exists and user input is empty
    console.warn('[ChatView] Attempted to send message with only system prompt and no user input.')
    return
  }
  // --- End CORRECTED messages array building ---

  // Prepare final payload object
  const payload = {
    model: chatModel.value || 'gpt-4o',
    temperature: chatTemperature.value ?? 0.7,
    max_tokens: chatMaxTokens.value || 1024,
    messages: messagesToSend, // Use the newly constructed array
    // Remove the incorrect system_prompt key
    // ...(activeAssistant.value?.instructions && { system_prompt: activeAssistant.value.instructions })
  }

  const url = '/.netlify/functions/call-openai-gpt-4'

  // Call API using the composable
  scrollToBottom('smooth')
  try {
    console.log('[ChatView] Calling API with payload:', JSON.stringify(payload, null, 2)) // Log full payload for debugging
    const responseData = await callApi(url, payload, 'POST')

    // Handle Successful Response
    const aiContent = responseData?.aiText // Adjust if backend key is different

    if (typeof aiContent === 'string' && aiContent.trim() !== '') {
      conversationStore.addMessageToActiveSession('assistant', aiContent.trim(), Date.now())
      ttsSpeakText(aiContent.trim())
    } else {
      console.warn('[ChatView] API response missing expected AI content (aiText):', responseData)
      addUiMessage('Received an empty or invalid response from the AI.', true)
    }
  } catch (err) {
    // Error is handled by the apiError watcher
    console.error('[ChatView] Error during sendMessage API call:', err)
  } finally {
    // Reset Focus
    scrollToBottom('smooth')
    nextTick(() => {
      inputAreaRef.value?.focus()
    })
  }
}
</script>

<style scoped>
/* STYLES are UNCHANGED - Include the full style block from the previous version */
/* --- Scrollbar Theming --- */
.message-display-area::-webkit-scrollbar {
  width: 8px;
}
.message-display-area::-webkit-scrollbar-track {
  background: var(--bg-sidebar);
  border-radius: 4px;
}
.message-display-area::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--accent-color-primary) 60%, var(--bg-sidebar));
  border-radius: 4px;
  border: 2px solid var(--bg-sidebar);
}
.message-display-area::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(in srgb, var(--accent-color-primary) 80%, var(--bg-sidebar));
}
.assistant-selector-row::-webkit-scrollbar {
  height: 6px;
}
.assistant-selector-row::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}
.assistant-selector-row::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
  border-radius: 3px;
}
.assistant-selector-row::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(in srgb, var(--accent-color-primary) 70%, transparent);
}
.message-display-area {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent-color-primary) 60%, var(--bg-sidebar))
    var(--bg-sidebar);
}
.assistant-selector-row {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent-color-primary) 50%, transparent) transparent;
  overflow-x: auto;
}

/* --- Copy Button Animation Styling --- */
.copy-button {
  position: absolute;
  bottom: 2px;
  right: -30px;
  background-color: transparent;
  border: none;
  color: var(--text-secondary);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 1em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition:
    opacity 0.2s ease,
    color 0.2s ease,
    background-color 0.2s ease;
  z-index: 1;
  padding: 0;
}
.ai-container:hover .copy-button {
  opacity: 0.6;
}
.copy-button:hover:not([data-copied='true']) {
  opacity: 1;
  color: var(--text-primary);
}
.copy-button[data-copied='true'] {
  opacity: 1;
  background-color: var(--accent-color-primary);
  color: var(--bg-input-area);
  cursor: default;
  animation: subtle-pulse 0.5s ease-out;
}
@keyframes subtle-pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

/* --- Loading Indicator Styles --- */
.loading-indicator-visual-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.2);
  pointer-events: none;
  z-index: 5;
  padding: 0.75rem;
  box-sizing: border-box;
  opacity: 1;
  transition: opacity 0.2s ease-in-out;
}
.loading-indicator-visual {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--accent-color-primary) 80%, white) 0%,
    var(--accent-color-primary) 50%,
    color-mix(in srgb, var(--accent-color-primary) 50%, transparent) 70%
  );
  animation: plasma-pulse 1.2s infinite ease-in-out;
  box-shadow: 0 0 8px 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
  position: relative;
  overflow: visible;
}
@keyframes plasma-pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.7;
    box-shadow: 0 0 6px 1px color-mix(in srgb, var(--accent-color-primary) 40%, transparent);
  }
  50% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 0 12px 3px color-mix(in srgb, var(--accent-color-primary) 60%, transparent);
  }
  100% {
    transform: scale(0.8);
    opacity: 0.7;
    box-shadow: 0 0 6px 1px color-mix(in srgb, var(--accent-color-primary) 40%, transparent);
  }
}

/* --- ALL OTHER STYLES --- */
.chat-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-main-content);
  color: var(--text-primary);
  overflow: hidden;
}
.message-display-area {
  flex-grow: 1;
  overflow-y: auto;
  padding: 0 1rem 1rem 1rem;
  background-color: var(--bg-main-content);
  display: flex;
  flex-direction: column;
}
.assistant-selector-area {
  padding: 0.5rem 0.5rem 0.75rem;
  background-color: var(--bg-input-area);
  border-bottom: 1px solid var(--border-color-medium);
  flex-shrink: 0;
  overflow: hidden;
  position: sticky;
  top: 0;
  z-index: 10;
}
.assistant-selector-row {
  display: flex;
  gap: 0.75rem;
  padding-bottom: 5px; /* For scrollbar visibility */
  -ms-overflow-style: none; /* IE and Edge */
  /* Firefox */
}

.assistant-selector-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.3rem 0.5rem;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
  min-width: 70px;
  text-align: center;
  outline: none;
}
.assistant-selector-item:hover {
  background-color: var(--bg-button-secondary-hover);
}
.assistant-selector-item:focus-visible {
  border-color: var(--accent-color-secondary);
  box-shadow: 0 0 0 1px var(--accent-color-secondary);
}
.assistant-selector-item.selected {
  border-color: var(--accent-color-primary);
  background-color: color-mix(in srgb, var(--accent-color-primary) 15%, transparent);
}
.assistant-selector-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background-color: var(--bg-sidebar);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color-light);
  margin-bottom: 0.3rem;
  flex-shrink: 0;
}
.assistant-selector-avatar .assistant-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.assistant-selector-avatar .assistant-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3em;
  font-weight: 600;
  color: var(--text-secondary);
  background-color: var(--bg-sidebar);
  border-radius: 50%;
  user-select: none;
}
.assistant-placeholder.default-placeholder {
  font-size: 1.5em;
  font-weight: bold;
}
.assistant-selector-name {
  font-size: 0.75em;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 65px;
}
.assistant-selector-item.selected .assistant-selector-name {
  color: var(--text-primary);
  font-weight: 500;
}

.message-container {
  display: flex;
  margin-bottom: 0.75rem;
  max-width: 85%;
  opacity: 0; /* Start hidden for animation */
  transform: translateY(10px);
  animation: fadeIn 0.3s ease forwards;
  position: relative; /* For copy button positioning */
}
.user-container {
  align-self: flex-end;
  margin-left: auto;
  flex-direction: row-reverse; /* User avatar on right */
}
.ai-container,
.system-container {
  align-self: flex-start;
  margin-right: auto;
  flex-direction: row; /* AI/System avatar on left */
}
@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bg-avatar-ai);
  color: var(--text-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9em;
  flex-shrink: 0;
  margin-top: 4px; /* Align with top of message bubble */
  margin-right: 0.5rem;
  user-select: none;
}
.user-container .avatar-placeholder {
  margin-right: 0;
  margin-left: 0.5rem;
  background-color: var(--bg-avatar-user);
}
.system-container .avatar-placeholder {
  display: none; /* No avatar for system messages */
}

.message {
  padding: 0.6rem 1rem;
  border-radius: 18px;
  word-wrap: break-word;
  font-family: sans-serif;
  line-height: 1.45;
  position: relative; /* Ensure copy button stays relative */
  min-width: 50px; /* Prevent tiny bubbles */
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
.user-message {
  background-color: var(--bg-message-user);
  color: var(--text-message-user);
  border-bottom-right-radius: 6px; /* Tail */
}
.ai-message {
  background-color: var(--bg-message-ai);
  color: var(--text-message-ai);
  border-bottom-left-radius: 6px; /* Tail */
}
.message-text {
  /* Base styles */
}
.message-text :deep(a) {
  color: var(--text-link);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
.message-text :deep(a:hover) {
  color: var(--text-link-hover);
  text-decoration: none;
}

.system-message {
  background-color: var(--bg-message-info);
  color: var(--text-secondary);
  width: 100%;
  text-align: center;
  font-style: italic;
  font-size: 0.9em;
  border: 1px dashed var(--border-color-medium);
  border-radius: 8px;
  padding-top: 0.8rem;
  padding-bottom: 0.8rem;
  margin-left: auto; /* Center it */
  margin-right: auto;
  max-width: 90%;
  box-shadow: none;
}

.message.error-message-style {
  background-color: var(--bg-message-error);
  color: var(--text-message-error);
  border: 1px solid var(--border-color-error);
  border-radius: 8px;
}
.system-message.error-message-style {
  border-style: solid; /* Make border solid for error system messages */
}
.system-container {
  width: 100%;
  justify-content: center;
  align-self: center;
}

.message-image-thumbnail {
  max-width: 150px;
  max-height: 100px;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  object-fit: contain;
  border: 1px solid var(--border-color-light);
  align-self: flex-start; /* Ensure it aligns with the start of the message block */
}

.timestamp {
  font-size: 0.7em;
  color: var(--text-timestamp);
  margin-top: 0.3rem;
  text-align: right;
  user-select: none;
  -webkit-user-select: none;
  width: 100%; /* Ensure it takes full width for alignment */
}

.placeholder-message {
  color: var(--text-placeholder);
  font-style: italic;
  font-family: sans-serif;
  text-align: center;
  margin: 2rem auto;
}

.image-preview-area {
  padding: 0.5rem 0.75rem 0.5rem;
  margin: 0 0.75rem; /* Only horizontal margin */
  background-color: var(--bg-sidebar);
  border: 1px solid var(--border-color-medium);
  border-bottom: none; /* Remove bottom border */
  border-radius: 8px 8px 0 0; /* Round top corners */
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0; /* Prevent shrinking */
}
.image-preview {
  max-height: 50px;
  max-width: 80px;
  border-radius: 4px;
  border: 1px solid var(--border-color-light);
  object-fit: cover;
}
.remove-image-button {
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 0.8em;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}
.remove-image-button:hover {
  background: rgba(0, 0, 0, 0.7);
}

.input-area {
  display: flex;
  align-items: flex-end; /* Align items to bottom */
  padding: 0.75rem;
  background-color: var(--bg-input-area);
  flex-shrink: 0; /* Prevent shrinking */
  gap: 0.5rem;
  border-radius: 0; /* Remove border radius if image preview is above */
  border-top: none; /* No top border if image preview is not showing */
  position: relative; /* For loading indicator */
}
/* Add top border only if image preview is NOT showing */
.chat-view:not(:has(.image-preview-area)) .input-area {
  border-top: 1px solid var(--border-color-medium);
}

.input-area textarea {
  flex-grow: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color-medium);
  border-radius: 15px; /* Rounded corners */
  resize: none;
  font-family: sans-serif;
  font-size: 1em;
  min-height: 40px; /* Start height */
  max-height: 150px; /* Limit growth */
  overflow-y: auto; /* Allow scrolling if needed */
  line-height: 1.4;
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.input-area textarea::placeholder {
  color: var(--text-placeholder);
  opacity: 1; /* Ensure placeholder is visible */
}
.input-area textarea:hover:not(:focus):not(:disabled) {
  border-color: var(--accent-color-primary);
}
.input-area textarea:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: var(--input-focus-shadow);
}
.input-area textarea:disabled {
  background-color: color-mix(in srgb, var(--bg-input-field) 50%, var(--bg-input-area));
  cursor: not-allowed;
  opacity: 0.7;
}

.input-area button {
  padding: 0.5rem;
  border: none;
  border-radius: 50%; /* Circular buttons */
  cursor: pointer;
  min-height: 40px; /* Match textarea height */
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em;
  flex-shrink: 0; /* Prevent buttons from shrinking */
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease,
    transform 0.1s ease,
    box-shadow 0.2s ease;
}
.input-area button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  animation: none !important; /* Disable animations when disabled */
  box-shadow: none !important;
}
.input-area button:active:not(:disabled) {
  transform: scale(0.95); /* Click feedback */
}

.icon-button {
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
}
.icon-button:hover:not(:disabled) {
  background-color: var(--bg-button-secondary-hover);
}

.icon-button.listening {
  background-color: var(--bg-button-listening); /* Use variable */
  color: var(--text-button-listening); /* Use variable */
  animation: pulse-red 1.5s infinite ease-in-out;
}
@keyframes pulse-red {
  0%,
  100% {
    box-shadow: 0 0 0 0px color-mix(in srgb, var(--bg-button-listening) 70%, transparent);
  } /* Use variable */
  50% {
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--bg-button-listening) 0%, transparent);
  } /* Use variable */
}

.send-button {
  background-color: var(--bg-button-primary);
  color: var(--text-button-primary);
  font-size: 1.5em;
  padding: 0.5rem 0.5rem; /* Adjust padding if needed */
  line-height: 1; /* Ensure icon is centered */
}
.send-button:hover:not(:disabled) {
  background-color: var(--bg-button-primary-hover);
}
.send-button:disabled {
  background-color: color-mix(in srgb, var(--bg-button-primary) 50%, var(--bg-input-area));
}

/* Send button plasma effect */
.send-button-plasma:not(:disabled) {
  animation: plasma-arrow-pulse 2s infinite ease-in-out;
  box-shadow: 0 0 5px 1px color-mix(in srgb, var(--accent-color-primary) 30%, transparent);
}
.send-button-plasma.flash-active {
  animation: plasma-shoot 0.3s ease-out forwards;
}
@keyframes plasma-arrow-pulse {
  0% {
    box-shadow: 0 0 5px 1px color-mix(in srgb, var(--accent-color-primary) 30%, transparent);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 10px 3px color-mix(in srgb, var(--accent-color-primary) 60%, transparent);
    transform: scale(1.05);
  }
  100% {
    box-shadow: 0 0 5px 1px color-mix(in srgb, var(--accent-color-primary) 30%, transparent);
    transform: scale(1);
  }
}
@keyframes plasma-shoot {
  0% {
    transform: scale(1.1);
    box-shadow: 0 0 15px 5px color-mix(in srgb, var(--accent-color-primary) 80%, transparent);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 5px 1px color-mix(in srgb, var(--accent-color-primary) 30%, transparent);
  }
}

.tts-button {
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  font-size: 1.1em;
  border: 1px solid transparent; /* Add base border */
}
.tts-button.tts-on {
  background-color: var(--accent-color-primary);
  color: var(--bg-input-area);
  border-color: var(--accent-color-primary); /* Match background */
}
/* Hover states need refinement */
.tts-button:hover:not(:disabled) {
  background-color: var(--bg-button-secondary-hover);
  border-color: transparent; /* Keep border transparent on hover if off */
}
.tts-button.tts-on:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--accent-color-primary) 90%, #000000);
  border-color: color-mix(
    in srgb,
    var(--accent-color-primary) 90%,
    #000000
  ); /* Match hover background */
  color: var(--bg-input-area); /* Keep text color */
}
</style>
