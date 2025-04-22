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
            <template
              v-for="segment in processMessageText(message.text)"
              :key="segment.text + Math.random()"
            >
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
        @keydown.enter="handleEnterKey"
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
// --- UPDATED: Get new settings state ---
const {
  chatModel,
  chatTemperature,
  chatMaxTokens,
  chatContextLength, // Ensure this is retrieved for history slicing
  sendOnEnter, // NEW: Get sendOnEnter state
  chatTopP, // NEW: Get chatTopP state
} = storeToRefs(settingsStore)

// --- Component Refs ---
const messageAreaRef = ref(null)
const inputAreaRef = ref(null)
const sendButtonRef = ref(null)

// --- Local Component State ---
const userInput = ref('')
const selectedAssistantId = ref(null)
const uiMessages = ref([])

// --- UI Message Adder (Unchanged) ---
const addUiMessage = (text, isError = false) => {
  const trimmedText = text?.toString().trim() || (isError ? 'An unknown error occurred.' : '')
  if (!trimmedText) return
  const newUiMessage = {
    id: `ui-<span class="math-inline">\{Date\.now\(\)\}\-</span>{Math.random()}`,
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

// --- Composables Setup (Unchanged) ---

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
      // Update placeholder based on assistant or default list
      currentPlaceholder.value = activeAssistant.value
        ? `Ask ${activeAssistant.value.name}...`
        : placeholders[0] // Or cycle through placeholders
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
  speakText: ttsSpeakText,
  toggleTts: ttsToggle,
  handleMessageClick: ttsHandleMessageClick,
} = useTextToSpeech({ addErrorMessage: handleComposableError }) // Assuming useTextToSpeech gets isTtsEnabled from settings store internally

// Speech Recognition Composable
const { isListening, speechSupported, toggleListening } = useSpeechRecognition({
  userInputRef: userInput,
  inputAreaRef: inputAreaRef,
  autoGrowTextarea: autoGrowTextarea,
  addErrorMessage: handleComposableError,
})

// --- Computed Properties (Unchanged) ---
const activeAssistant = computed(() => {
  // Use assistantConfig prop if provided (e.g., for a dedicated assistant view)
  if (props.assistantConfig) return props.assistantConfig
  // Otherwise, use the locally selected assistant based on activeSessionId
  if (selectedAssistantId.value && getAssistantById.value) {
    return getAssistantById.value(selectedAssistantId.value)
  }
  return null // Default AI (no specific assistant)
})

const displayMessages = computed(() => {
  const persistedMessages = activeHistory.value.map((msg, index) => ({
    id: `<span class="math-inline">\{conversationStore\.activeSessionId \|\| 'default'\}\-store\-</span>{msg.timestamp || index}`,
    text: typeof msg.content === 'string' ? msg.content : msg.content?.[0]?.text || '[Image Only]',
    sender: msg.role === 'user' ? 'User' : 'AI',
    timestamp: msg.timestamp || null,
    imagePreviewUrl: msg.imagePreviewUrl || null, // Ensure this is included
    isError: false, // Assuming persisted messages aren't errors
  }))
  const combined = [...persistedMessages, ...uiMessages.value]
  // console.log("Display Messages:", combined); // Debugging log
  return combined
})

// --- Animated Placeholder (Unchanged) ---
const placeholders = [
  'Type message or use mic...',
  'Ask anything...',
  'Attach image & ask...',
  'Write story...',
  'Explain quantum physics...',
]
const currentPlaceholder = ref(placeholders[0])
let placeholderInterval = null

// --- Lifecycle Hooks (Unchanged) ---
onMounted(() => {
  console.log(`[ChatView] Mounted. Initial Session ID from store: ${activeSessionId.value}`)
  // Sync local assistant selection with the store's active session ID on mount
  selectedAssistantId.value = activeSessionId.value === 'main_chat' ? null : activeSessionId.value

  scrollToBottom('auto') // Scroll down on load

  // Placeholder cycling logic
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

  // Handle initial state if assistantConfig prop is passed
  if (props.assistantConfig) {
    selectedAssistantId.value = props.assistantConfig.id
    addUiMessage(`Switched to: ${props.assistantConfig.name}.`)
    if (conversationStore.activeSessionId !== props.assistantConfig.id) {
      conversationStore.setActiveSession(props.assistantConfig.id)
    }
  } else if (!conversationStore.activeSessionId) {
    // Ensure main_chat is active if nothing else is set
    conversationStore.setActiveSession('main_chat')
    selectedAssistantId.value = null
  }

  // Update placeholder based on current active assistant
  currentPlaceholder.value = activeAssistant.value
    ? `Ask ${activeAssistant.value.name}...`
    : placeholders[0]

  apiError.value = null // Clear any previous API errors
  console.log(
    `[ChatView] Mounted. Final Session ID: ${activeSessionId.value}, Selected Assistant ID: ${selectedAssistantId.value}`,
  )
})

onUnmounted(() => {
  clearInterval(placeholderInterval)
})

// --- Watchers (Unchanged) ---
watch(
  () => props.assistantConfig,
  (newConfig, oldConfig) => {
    // This watcher handles switching assistants when viewing a specific assistant's chat
    if (newConfig !== oldConfig) {
      const targetSessionId = newConfig ? newConfig.id : 'main_chat'
      selectedAssistantId.value = newConfig ? newConfig.id : null
      const newAssistantName = newConfig ? newConfig.name : 'Default AI'
      addUiMessage(`Switched to ${newAssistantName}.`)
      userInput.value = ''
      removeSelectedImage()
      uiMessages.value = [] // Clear temporary UI messages
      // Only switch session if it's different from the current one
      if (conversationStore.activeSessionId !== targetSessionId) {
        conversationStore.setActiveSession(targetSessionId)
      }
      scrollToBottom('auto')
      apiError.value = null // Clear API error on switch
      currentPlaceholder.value = newConfig ? `Ask ${newConfig.name}...` : placeholders[0]
    }
  },
  { immediate: false }, // Don't run immediately on mount
)

watch(apiError, (newError) => {
  if (newError) {
    addUiMessage(newError, true) // Display API errors as UI messages
  }
})

// --- Assistant Selection (Unchanged) ---
const selectAssistant = (assistantId) => {
  if (props.assistantConfig) return // Don't allow switching if viewing a specific assistant config

  const currentActiveId = activeSessionId.value
  const targetSessionId = assistantId || 'main_chat'

  if (currentActiveId === targetSessionId) return // Already selected

  selectedAssistantId.value = assistantId
  conversationStore.setActiveSession(targetSessionId) // Update the store

  // Update UI based on the newly active session
  const selAsst = activeAssistant.value // Recompute based on new activeSessionId
  addUiMessage(`Switched to ${selAsst?.name || 'Default AI'}.`)
  userInput.value = ''
  removeSelectedImage()
  // Clear only non-error System messages, keep errors
  uiMessages.value = uiMessages.value.filter((m) => m.isError || m.sender !== 'System')
  apiError.value = null // Clear errors
  scrollToBottom('auto') // Scroll down
  inputAreaRef.value?.focus() // Focus input
  currentPlaceholder.value = selAsst ? `Ask ${selAsst.name}...` : placeholders[0] // Update placeholder
  console.log(`[ChatView] Switched session via selector to: ${targetSessionId}`)
}

// --- Utility Functions ---

// Message Scrolling (Unchanged)
const scrollToBottom = (behavior = 'smooth') => {
  nextTick(() => {
    const el = messageAreaRef.value
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: behavior })
  })
}

// Send Button Flash (Unchanged)
const triggerSendFlash = () => {
  const btn = sendButtonRef.value
  if (!btn) return
  btn.classList.remove('flash-active')
  void btn.offsetWidth // Trigger reflow to restart animation
  btn.classList.add('flash-active')
  // Remove class after animation duration (match CSS)
  setTimeout(() => {
    if (btn) btn.classList.remove('flash-active')
  }, 300)
}

// --- *** NEW: Enter Key Handler *** ---
const handleEnterKey = (event) => {
  if (sendOnEnter.value && !event.shiftKey) {
    event.preventDefault() // Prevent newline
    sendMessage() // Send message
  }
  // If sendOnEnter is false, or if Shift is pressed, do nothing
  // and allow the default Enter behavior (newline).
}
// --- *** END NEW *** ---

// --- Send Message Action (UPDATED Payload & History Slicing) ---
const sendMessage = async () => {
  const textInputRaw = userInput.value
  const imageFile = selectedFile.value
  const imagePreviewUrlForStore = selectedImagePreview.value // Keep preview URL for immediate display

  const trimmedInput = textInputRaw.trim()

  // Basic validation: Check if loading or if both text and image are missing
  if (isLoading.value || (trimmedInput === '' && !imageFile)) {
    console.warn('[ChatView] Send blocked: Already loading or no input/image provided.')
    return
  }

  // Add user message to store immediately IF there's content (text or image)
  // The store's addMessage action should handle the actual content structure
  if (trimmedInput !== '' || imageFile) {
    conversationStore.addMessageToActiveSession(
      'user',
      trimmedInput, // Pass the raw text content
      Date.now(),
      imagePreviewUrlForStore, // Pass the preview URL
    )
  } else {
    console.warn(
      '[ChatView] Send blocked: Should not happen due to initial check, but safeguarding.',
    )
    return // Should not happen if initial check is correct
  }

  triggerSendFlash() // Visual feedback

  // Prepare data for API call
  const textToSendToApi = trimmedInput
  const imageFileToSendToApi = imageFile // Keep the file object

  // Clear input immediately after capturing data for API
  userInput.value = ''
  removeSelectedImage() // Also clears selectedFile and selectedImagePreview via composable

  // Reset textarea height and placeholder after clearing input
  nextTick(() => {
    if (inputAreaRef.value) {
      inputAreaRef.value.style.height = 'auto' // Reset height before recalculating
      autoGrowTextarea({ target: inputAreaRef.value }) // Recalculate based on empty content
    }
    // Reset placeholder
    currentPlaceholder.value = activeAssistant.value
      ? `Ask ${activeAssistant.value.name}...`
      : placeholders[0] // Or cycle
  })

  // --- Process Image (if present) ---
  let imgData = null
  if (imageFileToSendToApi && typeof readFileAsBase64 === 'function') {
    try {
      // Read file content as base64 string
      imgData = await readFileAsBase64(imageFileToSendToApi) // Ensure composable returns { base64Data, mimeType }
    } catch (e) {
      console.error('[ChatView] Error processing image file for API:', e)
      addUiMessage(`Image processing error: ${e.message}`, true)
      scrollToBottom('smooth')
      return // Stop if image processing fails
    }
  } else if (imageFileToSendToApi) {
    // Handle case where readFileAsBase64 might be missing (shouldn't happen)
    console.error('[ChatView] readFileAsBase64 function not available in useFileInput composable.')
    addUiMessage('Internal error: Cannot process image file.', true)
    scrollToBottom('smooth')
    return
  }
  // --- End Image Processing ---

  // --- Construct API Message History ---
  const messagesToSend = []
  const currentAssistant = activeAssistant.value // Get current assistant config

  // 1. Add System Instructions (if any)
  if (currentAssistant?.instructions) {
    messagesToSend.push({ role: 'system', content: currentAssistant.instructions })
  }

  // 2. Get Formatted History from Store
  //    (Assuming getFormattedHistoryForAPI already returns [{role, content}, ...])
  const fullHistory = conversationStore.getFormattedHistoryForAPI()

  // 3. Apply Context Length Limit from Settings
  const contextLimit = chatContextLength.value // Get limit from settings store ref
  // console.log(`[ChatView] Using context length: ${contextLimit}`); // Debug log

  // Slice history (excluding system prompt from slice)
  const historyToConsider = fullHistory.filter((msg) => msg.role !== 'system')
  const limitedHistory = historyToConsider.slice(-contextLimit) // Get last 'N' user/assistant messages

  // Add the limited history back
  messagesToSend.push(...limitedHistory)
  // --- END History Construction ---

  // --- Construct Current User Message Content (Text + Image) ---
  const currentUserMessageContent = []
  if (textToSendToApi) {
    currentUserMessageContent.push({ type: 'text', text: textToSendToApi })
  }
  if (imgData) {
    // Construct image part in the format expected by the vision model
    currentUserMessageContent.push({
      type: 'image_url',
      image_url: {
        url: `data:<span class="math-inline">\{imgData\.mimeType\};base64,</span>{imgData.base64Data}`, // Ensure imgData includes mimeType
      },
    })
  }

  // Only add the user message if it has content
  if (currentUserMessageContent.length > 0) {
    messagesToSend.push({ role: 'user', content: currentUserMessageContent })
  } else if (
    messagesToSend.length === 0 ||
    (messagesToSend.length === 1 && messagesToSend[0].role === 'system')
  ) {
    // This case should ideally not be reached due to the initial check, but acts as a safeguard
    console.warn('[ChatView] Attempted to send API request with no user message content.')
    return
  }
  // --- End Current User Message ---

  // --- Construct API Payload ---
  const payload = {
    model: chatModel.value || 'gpt-4o', // Use selected model or default
    temperature: chatTemperature.value ?? 0.7, // Use selected temp or default
    max_tokens: chatMaxTokens.value || 1024, // Use selected max tokens or default
    // *** ADDED: top_p parameter ***
    top_p: chatTopP.value ?? 1.0, // Use selected top_p or default (OpenAI uses snake_case)
    messages: messagesToSend, // Use the constructed message array
  }

  // Define API endpoint
  const url = '/.netlify/functions/call-openai-gpt-4'

  // Scroll down before sending request
  scrollToBottom('smooth')

  // --- Make API Call ---
  try {
    console.log('[ChatView] Calling API with payload:', JSON.stringify(payload, null, 2)) // Log payload for debugging
    const responseData = await callApi(url, payload, 'POST') // Use the useApi composable

    // Handle response
    const aiContent = responseData?.aiText // Assuming backend returns { aiText: '...' }
    if (typeof aiContent === 'string' && aiContent.trim() !== '') {
      // Add AI response to store
      conversationStore.addMessageToActiveSession('assistant', aiContent.trim(), Date.now())
      // Speak response if TTS is enabled
      ttsSpeakText(aiContent.trim()) // Ensure useTextToSpeech handles the isTtsEnabled check
    } else {
      // Handle empty or invalid response
      console.warn('[ChatView] API response missing expected AI content (aiText):', responseData)
      addUiMessage('Received an empty or invalid response from the AI.', true)
    }
  } catch (err) {
    // Error is already logged and potentially displayed by useApi composable if it sets apiError
    console.error('[ChatView] Error caught during sendMessage API call:', err)
    // Optionally add another UI message here if apiError watcher doesn't cover it sufficiently
    // addUiMessage(`API Call Failed: ${err.message || 'Unknown error'}`, true);
  } finally {
    // Ensure UI is ready for next input after API call finishes or fails
    scrollToBottom('smooth') // Scroll again in case of long response
    nextTick(() => {
      inputAreaRef.value?.focus() // Focus input area for convenience
    })
  }
  // --- End API Call ---
} // End sendMessage function
</script>

<style scoped>
/* Styles unchanged */
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
/* Firefox Scrollbar */
.message-display-area {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent-color-primary) 60%, var(--bg-sidebar))
    var(--bg-sidebar);
}
.assistant-selector-row {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent-color-primary) 50%, transparent) transparent;
  overflow-x: auto; /* Ensure horizontal scroll for overflow */
  overflow-y: hidden; /* Prevent vertical scroll */
}

/* --- Copy Button Animation Styling --- */
.copy-button {
  position: absolute;
  bottom: 2px;
  right: -30px; /* Position slightly outside message bubble */
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
  opacity: 0; /* Hidden by default */
  transition:
    opacity 0.2s ease,
    color 0.2s ease,
    background-color 0.2s ease;
  z-index: 1;
  padding: 0;
}
/* Show on hover of AI message container */
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
  color: var(--bg-input-area); /* White/light text on accent bg */
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
  background-color: rgba(0, 0, 0, 0.2); /* Semi-transparent overlay */
  pointer-events: none; /* Allow clicks through */
  z-index: 5;
  padding: 0.75rem; /* Match input area padding */
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
    /* Brighter center */ var(--accent-color-primary) 50%,
    color-mix(in srgb, var(--accent-color-primary) 50%, transparent) 70% /* Fade out */
  );
  animation: plasma-pulse 1.2s infinite ease-in-out;
  box-shadow: 0 0 8px 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent); /* Outer glow */
  position: relative;
  overflow: visible; /* Ensure shadow isn't clipped */
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

/* --- Layout & Basic Styles --- */
.chat-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-main-content);
  color: var(--text-primary);
  overflow: hidden; /* Prevent whole view scroll */
}

.message-display-area {
  flex-grow: 1; /* Takes available space */
  overflow-y: auto; /* Enables vertical scrolling */
  padding: 0 1rem 1rem 1rem; /* Padding around messages */
  background-color: var(--bg-main-content);
  display: flex;
  flex-direction: column; /* Stack messages vertically */
}

.assistant-selector-area {
  padding: 0.5rem 0.5rem 0.75rem;
  background-color: var(--bg-input-area); /* Match input area bg */
  border-bottom: 1px solid var(--border-color-medium);
  flex-shrink: 0; /* Prevent shrinking */
  overflow: hidden; /* Hide vertical overflow, horizontal handled by row */
  position: sticky; /* Keep at top while scrolling messages */
  top: 0;
  z-index: 10; /* Ensure it's above messages */
}

.assistant-selector-row {
  display: flex; /* Layout items horizontally */
  gap: 0.75rem; /* Space between items */
  padding-bottom: 5px; /* Space for scrollbar */
  -ms-overflow-style: none; /* IE and Edge */
}

.assistant-selector-item {
  display: flex;
  flex-direction: column; /* Stack avatar and name vertically */
  align-items: center; /* Center items horizontally */
  padding: 0.3rem 0.5rem;
  border-radius: 8px;
  border: 2px solid transparent; /* Placeholder for selected border */
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
  min-width: 70px; /* Ensure items have some width */
  text-align: center;
  outline: none; /* Remove default browser outline */
}
.assistant-selector-item:hover {
  background-color: var(--bg-button-secondary-hover);
}
.assistant-selector-item:focus-visible {
  /* Style for keyboard navigation */
  border-color: var(
    --accent-color-secondary,
    var(--accent-color-primary)
  ); /* Use a secondary accent or primary */
  box-shadow: 0 0 0 1px var(--accent-color-secondary, var(--accent-color-primary));
}
.assistant-selector-item.selected {
  border-color: var(--accent-color-primary);
  background-color: color-mix(
    in srgb,
    var(--accent-color-primary) 15%,
    transparent
  ); /* Subtle highlight */
}

.assistant-selector-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden; /* Clip image */
  background-color: var(--bg-sidebar); /* Fallback bg */
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color-light);
  margin-bottom: 0.3rem; /* Space below avatar */
  flex-shrink: 0; /* Prevent avatar shrinking */
}
.assistant-selector-avatar .assistant-image {
  width: 100%;
  height: 100%;
  object-fit: cover; /* Cover the area, might crop */
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
  user-select: none; /* Prevent text selection */
}
.assistant-placeholder.default-placeholder {
  font-size: 1.5em;
  font-weight: bold;
}

.assistant-selector-name {
  font-size: 0.75em;
  color: var(--text-secondary);
  white-space: nowrap; /* Prevent wrapping */
  overflow: hidden; /* Hide overflow */
  text-overflow: ellipsis; /* Show ... for overflow */
  max-width: 65px; /* Limit width */
}
.assistant-selector-item.selected .assistant-selector-name {
  color: var(--text-primary);
  font-weight: 500;
}

.message-container {
  display: flex; /* Use flex for avatar + message alignment */
  margin-bottom: 0.75rem; /* Space below each message */
  max-width: 85%; /* Limit message width */
  opacity: 0; /* Start hidden for fade-in */
  transform: translateY(10px); /* Start slightly lower for fade-in */
  animation: fadeIn 0.3s ease forwards; /* Apply fade-in animation */
  position: relative; /* Needed for absolute positioned copy button */
}
.user-container {
  align-self: flex-end; /* Align user messages to the right */
  margin-left: auto; /* Push to the right */
  flex-direction: row-reverse; /* Reverse order (message then avatar) */
}
.ai-container,
.system-container {
  align-self: flex-start; /* Align AI/System messages to the left */
  margin-right: auto; /* Push to the left */
  flex-direction: row; /* Standard order (avatar then message) */
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
  background-color: var(--bg-avatar-ai); /* Default AI avatar color */
  color: var(--text-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9em;
  flex-shrink: 0; /* Prevent shrinking */
  margin-top: 4px; /* Align slightly lower than top of message */
  margin-right: 0.5rem; /* Space between avatar and message */
  user-select: none;
}
.user-container .avatar-placeholder {
  margin-right: 0;
  margin-left: 0.5rem; /* Space on the left for user */
  background-color: var(--bg-avatar-user); /* User avatar color */
}
.system-container .avatar-placeholder {
  display: none; /* Hide avatar for system messages */
}

.message {
  padding: 0.6rem 1rem;
  border-radius: 18px; /* Rounded corners */
  word-wrap: break-word; /* Allow long words to break */
  font-family: sans-serif; /* Standard font */
  line-height: 1.45; /* Readable line spacing */
  position: relative; /* Needed for timestamp/copy button positioning if inside */
  min-width: 50px; /* Prevent tiny message bubbles */
  display: flex; /* Use flex for internal content (text, image, timestamp) */
  flex-direction: column; /* Stack content vertically */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); /* Subtle shadow */
}
.user-message {
  background-color: var(--bg-message-user);
  color: var(--text-message-user);
  border-bottom-right-radius: 6px; /* Slightly point towards avatar */
}
.ai-message {
  background-color: var(--bg-message-ai);
  color: var(--text-message-ai);
  border-bottom-left-radius: 6px; /* Slightly point towards avatar */
}

/* Link styling within messages */
.message-text :deep(a) {
  color: var(--text-link);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
.message-text :deep(a:hover) {
  color: var(--text-link-hover);
  text-decoration: none; /* Optional: remove underline on hover */
}

.system-message {
  background-color: var(--bg-message-info, #e3f2fd); /* Use variable or fallback */
  color: var(--text-secondary);
  width: 100%; /* Take full width of container */
  text-align: center;
  font-style: italic;
  font-size: 0.9em;
  border: 1px dashed var(--border-color-medium);
  border-radius: 8px;
  padding-top: 0.8rem;
  padding-bottom: 0.8rem;
  margin-left: auto;
  margin-right: auto;
  max-width: 90%; /* Limit width within container */
  box-shadow: none; /* No shadow for system messages */
}

/* Error message styling */
.message.error-message-style {
  /* Style for user/AI error bubbles */
  background-color: var(--bg-message-error);
  color: var(--text-message-error);
  border: 1px solid var(--border-color-error);
  border-radius: 8px; /* Use standard radius for errors */
}
.system-message.error-message-style {
  /* Style for system error messages */
  border-style: solid; /* Solid border for errors */
  font-style: normal; /* Non-italic for errors */
  background-color: var(--bg-message-error);
  color: var(--text-error); /* Use primary error text color */
}

.system-container {
  /* Center system messages */
  width: 100%;
  justify-content: center;
  align-self: center;
  max-width: 100%; /* Override container width limit */
}

.message-image-thumbnail {
  max-width: 150px; /* Limit image preview size */
  max-height: 100px;
  border-radius: 8px;
  margin-bottom: 0.5rem; /* Space below image if text follows */
  object-fit: contain; /* Fit image within bounds without stretching */
  border: 1px solid var(--border-color-light);
  align-self: flex-start; /* Align image to the start (top) */
}

.timestamp {
  font-size: 0.7em;
  color: var(--text-timestamp);
  margin-top: 0.3rem; /* Space above timestamp */
  text-align: right; /* Align timestamp to the right */
  user-select: none;
  -webkit-user-select: none;
  width: 100%; /* Ensure it takes full width for text-align */
}

.placeholder-message {
  /* Style for "No messages yet..." */
  color: var(--text-placeholder);
  font-style: italic;
  font-family: sans-serif;
  text-align: center;
  margin: 2rem auto; /* Center vertically and horizontally */
}

.image-preview-area {
  /* Area shown above input when image is selected */
  padding: 0.5rem 0.75rem 0.5rem;
  margin: 0 0.75rem; /* Match input area horizontal margin */
  background-color: var(--bg-sidebar); /* Use sidebar bg */
  border: 1px solid var(--border-color-medium);
  border-bottom: none; /* Remove bottom border to connect with input area */
  border-radius: 8px 8px 0 0; /* Round top corners */
  display: flex;
  align-items: center;
  gap: 0.5rem; /* Space between image and remove button */
  flex-shrink: 0; /* Prevent shrinking */
}
.image-preview {
  max-height: 50px;
  max-width: 80px;
  border-radius: 4px;
  border: 1px solid var(--border-color-light);
  object-fit: cover; /* Cover the area */
}
.remove-image-button {
  background: rgba(0, 0, 0, 0.5); /* Dark semi-transparent */
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 0.8em;
  line-height: 1; /* Ensure '✖' is centered */
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}
.remove-image-button:hover {
  background: rgba(0, 0, 0, 0.7); /* Darker on hover */
}

.input-area {
  /* Container for buttons and textarea */
  display: flex;
  align-items: flex-end; /* Align items to bottom (useful for growing textarea) */
  padding: 0.75rem;
  background-color: var(--bg-input-area);
  flex-shrink: 0; /* Prevent shrinking */
  gap: 0.5rem; /* Space between buttons/textarea */
  border-radius: 0; /* No rounding unless image preview is showing */
  border-top: none; /* Top border added conditionally below */
  position: relative; /* For loading indicator */
}
/* Add top border only if image preview is NOT shown */
.chat-view:not(:has(.image-preview-area)) .input-area {
  border-top: 1px solid var(--border-color-medium);
}

.input-area textarea {
  flex-grow: 1; /* Take available space */
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color-medium);
  border-radius: 15px; /* Rounded corners */
  resize: none; /* Disable manual resize */
  font-family: sans-serif;
  font-size: 1em;
  min-height: 40px; /* Match button height */
  max-height: 150px; /* Limit auto-growth */
  overflow-y: auto; /* Allow scrolling if max-height exceeded */
  line-height: 1.4; /* Readable line spacing */
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.input-area textarea::placeholder {
  color: var(--text-placeholder);
  opacity: 1; /* Ensure placeholder is fully visible */
}
.input-area textarea:hover:not(:focus):not(:disabled) {
  border-color: var(--accent-color-primary); /* Highlight on hover */
}
.input-area textarea:focus {
  outline: none; /* Remove default outline */
  border-color: var(--accent-color-primary);
  box-shadow: var(--input-focus-shadow); /* Use variable for focus shadow */
}
.input-area textarea:disabled {
  background-color: color-mix(in srgb, var(--bg-input-field) 50%, var(--bg-input-area));
  cursor: not-allowed;
  opacity: 0.7;
}

.input-area button {
  /* Base style for all buttons in input area */
  padding: 0.5rem;
  border: none;
  border-radius: 50%; /* Circular buttons */
  cursor: pointer;
  min-height: 40px; /* Consistent height */
  min-width: 40px; /* Consistent width */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em; /* Icon size */
  flex-shrink: 0; /* Prevent shrinking */
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
  transform: scale(0.95); /* Slight shrink on click */
}

/* Specific button types */
.icon-button {
  /* Style for attach, mic */
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
}
.icon-button:hover:not(:disabled) {
  background-color: var(--bg-button-secondary-hover);
}
.icon-button.listening {
  /* Style for mic when listening */
  background-color: var(--bg-button-listening);
  color: var(--text-button-listening);
  animation: pulse-red 1.5s infinite ease-in-out;
}
@keyframes pulse-red {
  0%,
  100% {
    box-shadow: 0 0 0 0px color-mix(in srgb, var(--bg-button-listening) 70%, transparent);
  }
  50% {
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--bg-button-listening) 0%, transparent);
  }
}

.send-button {
  /* Style for send button */
  background-color: var(--bg-button-primary);
  color: var(--text-button-primary);
  font-size: 1.5em; /* Larger icon */
  padding: 0.5rem 0.5rem; /* Adjust padding if needed */
  line-height: 1; /* Ensure icon centers vertically */
}
.send-button:hover:not(:disabled) {
  background-color: var(--bg-button-primary-hover);
}
.send-button:disabled {
  background-color: color-mix(
    in srgb,
    var(--bg-button-primary) 50%,
    var(--bg-input-area)
  ); /* Muted bg when disabled */
}
/* Send button animation */
.send-button-plasma:not(:disabled) {
  animation: plasma-arrow-pulse 2s infinite ease-in-out;
  box-shadow: 0 0 5px 1px color-mix(in srgb, var(--accent-color-primary) 30%, transparent);
}
.send-button-plasma.flash-active {
  /* Class added temporarily on send */
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
  /* Style for TTS toggle */
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  font-size: 1.1em; /* Slightly smaller icon */
  border: 1px solid transparent; /* Border used for 'on' state */
}
.tts-button.tts-on {
  background-color: var(--accent-color-primary);
  color: var(--bg-input-area); /* Ensure contrast */
  border-color: var(--accent-color-primary);
}
.tts-button:hover:not(:disabled) {
  background-color: var(--bg-button-secondary-hover);
  border-color: transparent;
}
.tts-button.tts-on:hover:not(:disabled) {
  background-color: color-mix(
    in srgb,
    var(--accent-color-primary) 90%,
    #000000
  ); /* Darker accent */
  border-color: color-mix(in srgb, var(--accent-color-primary) 90%, #000000);
  color: var(--bg-input-area);
}
</style>
