<template>
  <div class="chat-view">
    <div class="assistant-selector-area">
      <div class="assistant-selector-row">
        <div
          :class="[
            'assistant-selector-item',
            !activeSessionId || activeSessionId === 'main_chat' ? 'selected' : '',
            'nb4u-ai-selector', // Class for targeting
          ]"
          @click="selectAssistant(null)"
          title="Select Nb4U-Ai (Default)"
          tabindex="0"
          @keydown.enter.prevent="selectAssistant(null)"
          @keydown.space.prevent="selectAssistant(null)"
        >
          <div class="assistant-selector-avatar">
            <div class="assistant-placeholder default-placeholder">N</div>
          </div>
          <span class="assistant-selector-name">Nb4U-Ai</span>
        </div>
        <div
          v-for="assistant in availableAssistants"
          :key="assistant.id"
          :class="['assistant-selector-item', activeSessionId === assistant.id ? 'selected' : '']"
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
                >{{ segment.text }}</a
              >
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
        No messages in '{{ activeSession?.name || 'Current Chat' }}'. Start the conversation!
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
import { ref, nextTick, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAssistantsStore } from '@/stores/assistantsStore'
import { useConversationStore } from '@/stores/conversationStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { storeToRefs } from 'pinia'
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'
import { useFileInput } from '@/composables/useFileInput'
import { useTextToSpeech } from '@/composables/useTextToSpeech'
import { useApi } from '@/composables/useApi'
import { useUIUtils } from '@/composables/useUIUtils'

const props = defineProps({ assistantConfig: { type: Object, required: false, default: null } })
const assistantsStore = useAssistantsStore()
const conversationStore = useConversationStore()
const settingsStore = useSettingsStore()

const { assistants: availableAssistants } = storeToRefs(assistantsStore)
const { activeHistory, activeSessionId, activeSession } = storeToRefs(conversationStore)
const { chatModel, chatTemperature, chatMaxTokens, chatContextLength, sendOnEnter, chatTopP } =
  storeToRefs(settingsStore)

const messageAreaRef = ref(null)
const inputAreaRef = ref(null)
const sendButtonRef = ref(null)

const userInput = ref('')
const uiMessages = ref([])

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
  scrollToBottom()
}
const handleComposableError = (errorMessage) => {
  console.error('[Composable Error Handler]', errorMessage)
  addUiMessage(errorMessage, true)
}

// --- Scroll function defined earlier ---
const scrollToBottom = (behavior = 'smooth') => {
  nextTick(() => {
    const el = messageAreaRef.value
    if (el) {
      // Check if ref is available
      el.scrollTo({ top: el.scrollHeight, behavior: behavior })
    } else {
      console.warn('[ChatView] scrollToBottom called but messageAreaRef is not available yet.')
    }
  })
}

const { copiedState, formatTimestamp, copyText, processMessageText, autoGrowTextarea } = useUIUtils(
  { addErrorMessage: handleComposableError },
)
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
  updatePlaceholder: (isSelected) => {
    if (isSelected) {
      currentPlaceholder.value = 'Image selected...'
    } else if (!userInput.value) {
      currentPlaceholder.value = activeSession.value?.name
        ? `Ask ${activeSession.value.name}...`
        : placeholders[0]
    }
  },
  onImageSelected: () => {
    nextTick(() => {
      inputAreaRef.value?.focus()
    })
  },
})
const { isLoading, error: apiError, callApi } = useApi({ readFileAsBase64 })
const {
  ttsSupported,
  isTtsEnabled,
  speakText: ttsSpeakText,
  toggleTts: ttsToggle,
  handleMessageClick: ttsHandleMessageClick,
} = useTextToSpeech({ addErrorMessage: handleComposableError })
const { isListening, speechSupported, toggleListening } = useSpeechRecognition({
  userInputRef: userInput,
  inputAreaRef: inputAreaRef,
  autoGrowTextarea: autoGrowTextarea,
  addErrorMessage: handleComposableError,
})

// --- COMPUTED PROPERTY displayMessages ---
const displayMessages = computed(() => {
  const persistedMessages = activeHistory.value.map((msg) => ({
    id: `${conversationStore.activeSessionId || 'default'}-store-${msg.timestamp || Math.random()}`,
    text: typeof msg.content === 'string' ? msg.content : msg.content?.[0]?.text || '[Image Only]',
    sender: msg.role === 'user' ? 'User' : 'AI',
    timestamp: msg.timestamp || null,
    imagePreviewUrl: msg.imagePreviewUrl || null,
    isError: false,
  }))
  const combined = [...persistedMessages, ...uiMessages.value]
  return combined
})

const placeholders = [
  'Type message or use mic...',
  'Ask anything...',
  'Attach image & ask...',
  'Write story...',
  'Explain quantum physics...',
]
const currentPlaceholder = ref(placeholders[0])
let placeholderInterval = null

onMounted(() => {
  // scrollToBottom is now called conditionally within the watcher's nextTick
  // We can still call it here once on mount if desired, it should be safe now.
  scrollToBottom('auto')

  let placeholderIndex = 0
  placeholderInterval = setInterval(() => {
    placeholderIndex = (placeholderIndex + 1) % placeholders.length
    if (!userInput.value && !selectedImagePreview.value) {
      const basePlaceholder = activeSession.value?.name
        ? `Ask ${activeSession.value.name}...`
        : placeholders[placeholderIndex]
      currentPlaceholder.value = basePlaceholder
    }
  }, 5000)
  apiError.value = null
  console.log(
    `[ChatView] Mounted. Session ID: ${activeSessionId.value}, Session Name: ${activeSession.value?.name}`,
  )
})
onUnmounted(() => {
  clearInterval(placeholderInterval)
})

// --- WATCHER for Active Session ID (Refined) ---
watch(
  activeSessionId,
  (newId, oldId) => {
    console.log(`[ChatView] Watcher triggered. New session ID: ${newId}, Old: ${oldId}`)

    // --- Reset state unconditionally on initial run and subsequent changes ---
    userInput.value = ''
    removeSelectedImage()
    uiMessages.value = []
    apiError.value = null
    // Update placeholder based on the *current* active session name
    currentPlaceholder.value = activeSession.value?.name
      ? `Ask ${activeSession.value.name}...`
      : placeholders[0]

    // --- Actions depending on refs - only run if not the initial immediate call OR within nextTick ---
    // Check if oldId is defined (meaning it's not the first immediate run)
    if (oldId !== undefined) {
      console.log(
        `[ChatView Watcher] Not initial run (oldId: ${oldId}). Calling scrollToBottom directly.`,
      )
      scrollToBottom('auto') // Safe to call directly on subsequent changes
      nextTick(() => {
        // Still use nextTick for focus after DOM updates
        if (inputAreaRef.value) {
          console.log('[ChatView Watcher] Focusing input in nextTick (subsequent run).')
          inputAreaRef.value.focus()
        } else {
          console.warn('[ChatView Watcher] inputAreaRef not ready in nextTick (subsequent run).')
        }
      })
    } else {
      // This is the initial immediate run. Defer actions relying on refs.
      console.log(
        '[ChatView Watcher] Initial run. Deferring scrollToBottom and focus until nextTick.',
      )
      nextTick(() => {
        if (messageAreaRef.value) {
          console.log('[ChatView Watcher] Calling scrollToBottom in nextTick (initial run).')
          scrollToBottom('auto') // Call scroll after initial DOM render
        } else {
          console.warn('[ChatView Watcher] messageAreaRef not ready in nextTick (initial run).')
        }
        if (inputAreaRef.value) {
          console.log('[ChatView Watcher] Focusing input in nextTick (initial run).')
          inputAreaRef.value.focus() // Focus after initial DOM render
        } else {
          console.warn('[ChatView Watcher] inputAreaRef not ready in nextTick (initial run).')
        }
      })
    }
  },
  { immediate: true }, // Run immediately on load/mount AND on changes
)

watch(apiError, (newError) => {
  if (newError) {
    addUiMessage(newError, true)
  }
})

const selectAssistant = (assistantId) => {
  if (props.assistantConfig && props.assistantConfig.id !== assistantId) {
    console.warn('[ChatView] Assistant selection ignored due to assistantConfig prop.')
    return
  }
  const targetSessionId = assistantId || 'main_chat'
  console.log(`[ChatView] UI selecting session: ${targetSessionId}`)
  if (activeSessionId.value !== targetSessionId) {
    conversationStore.setActiveSession(targetSessionId)
    // Watcher with immediate:true will handle UI updates now
  } else {
    console.log(`[ChatView] Session ${targetSessionId} already active.`)
  }
}

// Scroll function definition moved higher, before watcher

const triggerSendFlash = () => {
  const btn = sendButtonRef.value
  if (!btn) return
  btn.classList.remove('flash-active')
  void btn.offsetWidth // Force reflow
  btn.classList.add('flash-active')
  setTimeout(() => {
    if (btn) btn.classList.remove('flash-active')
  }, 300)
}

const handleEnterKey = (event) => {
  if (sendOnEnter.value && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

const sendMessage = async () => {
  const textInputRaw = userInput.value
  const imageFile = selectedFile.value
  const imagePreviewUrlForStore = selectedImagePreview.value // Capture preview URL for store
  const trimmedInput = textInputRaw.trim()

  // Prevent sending if loading or if both text and image are empty
  if (isLoading.value || (trimmedInput === '' && !imageFile)) {
    console.log('[ChatView] Send blocked: Loading or no content.')
    return
  }

  // Add user message to the store immediately if there's content
  if (trimmedInput !== '' || imageFile) {
    console.log('[ChatView] Adding user message to store:', {
      role: 'user',
      content: trimmedInput,
      imagePreviewUrl: imagePreviewUrlForStore,
    })
    conversationStore.addMessageToActiveSession(
      'user',
      trimmedInput, // Send trimmed text
      Date.now(),
      imagePreviewUrlForStore, // Send the captured preview URL
    )
  } else {
    console.warn('[ChatView] Attempted to send empty message after initial check passed.')
    return // Should not happen based on initial check, but as a safeguard
  }

  // Trigger visual feedback
  triggerSendFlash()

  // Prepare data for API call (use captured values)
  const textToSendToApi = trimmedInput
  const imageFileToSendToApi = imageFile // Use the captured file object

  // Clear input fields AFTER adding message to store and capturing values
  userInput.value = ''
  removeSelectedImage() // This clears selectedFile and selectedImagePreview

  // Reset textarea height and placeholder after clearing
  nextTick(() => {
    if (inputAreaRef.value) {
      inputAreaRef.value.style.height = 'auto' // Reset height before growing
      autoGrowTextarea({ target: inputAreaRef.value }) // Adjust height if needed (likely shrinks)
    }
    // Reset placeholder
    currentPlaceholder.value = activeSession.value?.name
      ? `Ask ${activeSession.value.name}...`
      : placeholders[0]
  })

  // Process image file if it exists
  let imgData = null
  if (imageFileToSendToApi && typeof readFileAsBase64 === 'function') {
    try {
      console.log('[ChatView] Reading image file as Base64...')
      imgData = await readFileAsBase64(imageFileToSendToApi)
      console.log('[ChatView] Image file read successfully.')
    } catch (e) {
      console.error('[ChatView] Error processing image file for API:', e)
      addUiMessage(`Image processing error: ${e.message}`, true)
      scrollToBottom()
      return // Stop if image processing fails
    }
  } else if (imageFileToSendToApi) {
    // This case means file exists but readFileAsBase64 is not available (should not happen if composable is imported)
    console.error('[ChatView] readFileAsBase64 function not available.')
    addUiMessage('Internal error: Cannot process image file.', true)
    scrollToBottom()
    return
  }

  // Prepare message history for API
  const messagesToSend = []
  if (typeof conversationStore.getFormattedHistoryForAPI !== 'function') {
    console.error('CRITICAL: getFormattedHistoryForAPI is missing!')
    addUiMessage('Internal Error: Cannot prepare message history.', true)
    return
  }
  const fullHistory = conversationStore.getFormattedHistoryForAPI()

  // Apply context length limit (excluding the system prompt if present)
  const contextLimit = chatContextLength.value
  const historyToConsider = fullHistory.filter((msg) => msg.role !== 'system')
  const limitedHistory = historyToConsider.slice(-contextLimit) // Get the last 'N' non-system messages

  // Add system prompt first if it exists
  const systemPrompt = fullHistory.find((msg) => msg.role === 'system')
  if (systemPrompt) messagesToSend.push(systemPrompt)

  // Add the limited history
  messagesToSend.push(...limitedHistory)

  // Construct the current user message for the API (potentially multimodal)
  const currentUserMessageContent = []
  if (textToSendToApi) {
    currentUserMessageContent.push({ type: 'text', text: textToSendToApi })
  }
  if (imgData) {
    // Ensure imgData has the expected structure
    if (imgData.mimeType && imgData.base64Data) {
      currentUserMessageContent.push({
        type: 'image_url',
        image_url: { url: `data:${imgData.mimeType};base64,${imgData.base64Data}` },
      })
    } else {
      console.error('[ChatView] Invalid image data structure from readFileAsBase64:', imgData)
      addUiMessage('Internal error: Failed to format image data for API.', true)
      return
    }
  }

  // Add the constructed user message to the API payload, ensuring it's not effectively empty
  if (currentUserMessageContent.length > 0) {
    // Check if the last message in the prepared history *is* the user message we just added to the store.
    // This prevents adding it twice to the API call if getFormattedHistoryForAPI includes the latest message.
    // We compare the content part.
    const lastApiMessage = messagesToSend[messagesToSend.length - 1]
    let historyAlreadyIncludesUserMessage = false
    if (lastApiMessage?.role === 'user') {
      // Simple comparison assuming structure is consistent
      // Might need adjustment if content format varies significantly
      if (JSON.stringify(lastApiMessage.content) === JSON.stringify(currentUserMessageContent)) {
        historyAlreadyIncludesUserMessage = true
        console.log(
          '[ChatView] History already includes the current user message. Not adding duplicate to API payload.',
        )
      }
    }

    if (!historyAlreadyIncludesUserMessage) {
      console.log('[ChatView] Adding current user message content to API payload.')
      messagesToSend.push({ role: 'user', content: currentUserMessageContent })
    }
  } else {
    // This case means we added a message to the store, but couldn't format it for the API? Should be rare.
    console.warn(
      '[ChatView] No content (text or image) could be formatted for the current user message for API call.',
    )
    // Decide if we should proceed with only history or stop. Let's stop for now.
    return
  }

  // Final check: ensure there's something meaningful to send
  if (
    messagesToSend.length === 0 ||
    (messagesToSend.length === 1 && messagesToSend[0].role === 'system')
  ) {
    console.warn(
      '[ChatView] Attempted to send API request with no user message content after formatting.',
    )
    return
  }

  console.log('[ChatView] Preparing API payload:', {
    model: chatModel.value,
    temp: chatTemperature.value,
    max_tokens: chatMaxTokens.value,
    top_p: chatTopP.value,
    messageCount: messagesToSend.length,
  })

  // Construct the final payload
  const payload = {
    model: chatModel.value || 'gpt-4o', // Fallback model
    temperature: chatTemperature.value ?? 0.7, // Use nullish coalescing for 0 temp
    max_tokens: chatMaxTokens.value || 1024, // Fallback max tokens
    top_p: chatTopP.value ?? 1.0, // Use nullish coalescing
    messages: messagesToSend,
  }

  // Define API endpoint
  const url = '/.netlify/functions/call-openai-gpt-4'

  // Scroll before sending request
  scrollToBottom()

  // Call the API
  try {
    console.log('[ChatView] Calling API...')
    const responseData = await callApi(url, payload, 'POST')
    console.log('[ChatView] API call finished. Response:', responseData)

    // Process the response
    const aiContent = responseData?.aiText // Use optional chaining
    if (typeof aiContent === 'string' && aiContent.trim() !== '') {
      console.log('[ChatView] Adding AI response to store.')
      conversationStore.addMessageToActiveSession('assistant', aiContent.trim(), Date.now())
      console.log('[ChatView] Attempting TTS for AI response.')
      ttsSpeakText(aiContent.trim()) // Speak the response if TTS is enabled
    } else {
      // Handle cases where response exists but aiText is missing/empty
      console.warn('[ChatView] API response missing expected AI content (aiText):', responseData)
      addUiMessage('Received an empty or invalid response from the AI.', true)
    }
  } catch (err) {
    // Errors are now handled by the apiError watcher via useApi composable
    console.error(
      '[ChatView] Error caught during sendMessage (should have been handled by watcher):',
      err,
    )
    // Optionally add a generic UI message here if needed, but watcher should cover it.
    // addUiMessage('An unexpected error occurred communicating with the AI.', true);
  } finally {
    console.log('[ChatView] sendMessage finally block.')
    // Ensure UI is responsive after call completes or fails
    scrollToBottom()
    nextTick(() => {
      inputAreaRef.value?.focus() // Refocus input area
    })
  }
}
</script>

<style scoped>
/* Styles are identical to the previous version */
/* --- Keyframes --- */
@keyframes faint-icon-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 1px color-mix(in srgb, var(--accent-color-primary) 50%, transparent));
  }
  50% {
    filter: drop-shadow(0 0 3px color-mix(in srgb, var(--accent-color-primary) 70%, transparent));
  }
}
/* ... other keyframes ... */
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
@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  overflow-y: hidden;
}

/* --- Main Layout --- */
.chat-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-main-content);
  color: var(--text-primary);
  overflow: hidden; /* Prevent chat view itself from scrolling */
}
.message-display-area {
  flex-grow: 1;
  overflow-y: auto; /* Scroll messages */
  padding: 1rem 1rem 1rem 1rem;
  background-color: var(--bg-main-content);
  display: flex;
  flex-direction: column;
}

/* --- Assistant Selector --- */
.assistant-selector-area {
  padding: 0.5rem 0.5rem 0.75rem;
  background-color: var(--bg-input-area); /* Match input area background */
  border-bottom: 1px solid var(--border-color-medium);
  flex-shrink: 0;
  overflow: hidden; /* Hide potential overflow if needed */
  position: sticky; /* Keep selector visible */
  top: 0;
  z-index: 10; /* Above message area */
}
.assistant-selector-row {
  display: flex;
  gap: 0.75rem;
  padding-bottom: 5px; /* Space for scrollbar */
  -ms-overflow-style: none; /* Hide scrollbar IE/Edge */
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
  min-width: 70px; /* Ensure items have some base width */
  text-align: center;
  outline: none; /* Remove default focus outline */
}
.assistant-selector-item:hover {
  background-color: var(--bg-button-secondary-hover);
}
.assistant-selector-item:focus-visible {
  /* Style for keyboard focus */
  border-color: var(--accent-color-secondary, var(--accent-color-primary));
  box-shadow: 0 0 0 1px var(--accent-color-secondary, var(--accent-color-primary));
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
  max-width: 65px; /* Limit name width */
}
.assistant-selector-item.selected .assistant-selector-name {
  color: var(--text-primary);
  font-weight: 500;
}

/* --- UPDATED: Apply animation to whole item --- */
.assistant-selector-item.nb4u-ai-selector {
  animation: faint-icon-glow 2.5s infinite ease-in-out alternate;
  /* Apply to the whole item div */
}
.assistant-selector-item.nb4u-ai-selector.selected {
  border-color: var(--accent-color-primary); /* Ensure border shows when selected */
  /* Animation will continue */
}

/* --- Messages --- */
.message-container {
  display: flex;
  margin-bottom: 0.75rem;
  max-width: 85%; /* Max width for messages */
  opacity: 0; /* Start hidden for animation */
  transform: translateY(10px); /* Start slightly lower */
  animation: fadeIn 0.3s ease forwards; /* Fade in animation */
  position: relative; /* For copy button positioning */
}
.user-container {
  align-self: flex-end;
  margin-left: auto;
  flex-direction: row-reverse; /* Avatar on the right */
}
.ai-container,
.system-container {
  align-self: flex-start;
  margin-right: auto;
  flex-direction: row; /* Avatar on the left */
}
.avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bg-avatar-ai); /* Default AI avatar bg */
  color: var(--text-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9em;
  flex-shrink: 0;
  margin-top: 4px; /* Align slightly lower */
  margin-right: 0.5rem; /* Space between avatar and message */
  user-select: none;
}
.user-container .avatar-placeholder {
  margin-right: 0;
  margin-left: 0.5rem;
  background-color: var(--bg-avatar-user); /* User avatar bg */
}
.system-container .avatar-placeholder {
  display: none; /* No avatar for system messages */
}
.message {
  padding: 0.6rem 1rem;
  border-radius: 18px;
  word-wrap: break-word; /* Break long words */
  font-family: sans-serif;
  line-height: 1.45;
  position: relative; /* For timestamp/copy button */
  min-width: 50px; /* Minimum width for tiny messages */
  display: flex; /* Use flex for image/text layout */
  flex-direction: column; /* Stack image above text/timestamp */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); /* Subtle shadow */
}
.user-message {
  background-color: var(--bg-message-user);
  color: var(--text-message-user);
  border-bottom-right-radius: 6px; /* Tail effect */
}
.ai-message {
  background-color: var(--bg-message-ai);
  color: var(--text-message-ai);
  border-bottom-left-radius: 6px; /* Tail effect */
}
/* Style links within message text */
.message-text :deep(a) {
  /* Use :deep for slotted/generated content */
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
  background-color: var(--bg-message-info, #e3f2fd); /* Fallback color */
  color: var(--text-secondary);
  width: 100%; /* Span full width */
  text-align: center;
  font-style: italic;
  font-size: 0.9em;
  border: 1px dashed var(--border-color-medium);
  border-radius: 8px;
  padding-top: 0.8rem;
  padding-bottom: 0.8rem;
  margin-left: auto; /* Center if container allows */
  margin-right: auto;
  max-width: 90%;
  box-shadow: none; /* Remove bubble shadow */
}
.message.error-message-style {
  background-color: var(--bg-message-error);
  color: var(--text-message-error);
  border: 1px solid var(--border-color-error);
  border-radius: 8px; /* Consistent error style */
}
.system-message.error-message-style {
  border-style: solid;
  font-style: normal;
  background-color: var(--bg-message-error); /* Ensure background matches */
  color: var(--text-error);
}
.system-container {
  width: 100%; /* Allow system message to potentially span more width */
  justify-content: center;
  align-self: center;
  max-width: 100%; /* Override container width limit slightly */
}
.message-image-thumbnail {
  max-width: 150px;
  max-height: 100px;
  border-radius: 8px;
  margin-bottom: 0.5rem; /* Space below image */
  object-fit: contain; /* Show whole image, scaled down */
  border: 1px solid var(--border-color-light);
  align-self: flex-start; /* Align image to start */
}
.timestamp {
  font-size: 0.7em;
  color: var(--text-timestamp);
  margin-top: 0.3rem; /* Space above timestamp */
  text-align: right;
  user-select: none;
  -webkit-user-select: none;
  width: 100%; /* Ensure it takes width for right alignment */
}
.placeholder-message {
  color: var(--text-placeholder);
  font-style: italic;
  font-family: sans-serif;
  text-align: center;
  margin: 2rem auto; /* Center vertically somewhat */
  padding: 1rem;
  background-color: var(--bg-input-area);
  border-radius: 8px;
  max-width: 80%;
}
.copy-button {
  position: absolute;
  bottom: 2px;
  right: -30px; /* Position outside the message bubble */
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
  z-index: 1; /* Ensure it's clickable */
  padding: 0;
}
.ai-container:hover .copy-button {
  /* Show on AI message hover */
  opacity: 0.6;
}
.copy-button:hover:not([data-copied='true']) {
  /* Brighten on hover */
  opacity: 1;
  color: var(--text-primary);
}
.copy-button[data-copied='true'] {
  /* Copied state */
  opacity: 1;
  background-color: var(--accent-color-primary);
  color: var(--bg-input-area);
  cursor: default;
  animation: subtle-pulse 0.5s ease-out;
}

/* --- Input Area --- */
.image-preview-area {
  padding: 0.5rem 0.75rem 0.5rem;
  margin: 0 0.75rem; /* Align with input area padding */
  background-color: var(--bg-sidebar); /* Darker background */
  border: 1px solid var(--border-color-medium);
  border-bottom: none; /* Remove bottom border */
  border-radius: 8px 8px 0 0; /* Rounded top corners */
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
  line-height: 1; /* Better vertical alignment */
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
  align-items: flex-end; /* Align buttons and textarea baseline */
  padding: 0.75rem;
  background-color: var(--bg-input-area);
  flex-shrink: 0; /* Prevent shrinking */
  gap: 0.5rem; /* Space between buttons/textarea */
  border-radius: 0; /* Flat top edge */
  border-top: none; /* Remove top border if image preview is shown */
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
  min-height: 40px; /* Minimum height = button height */
  max-height: 150px; /* Limit excessive growth */
  overflow-y: auto; /* Scroll if content exceeds max-height */
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
  border-color: var(--accent-color-primary); /* Highlight on hover */
}
.input-area textarea:focus {
  outline: none;
  border-color: var(--accent-color-primary); /* Highlight on focus */
  box-shadow: var(--input-focus-shadow); /* Add focus ring/shadow */
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
  min-height: 40px; /* Match textarea min-height */
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em; /* Icon size */
  flex-shrink: 0; /* Prevent button shrinking */
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
  background-color: var(--bg-button-listening);
  color: var(--text-button-listening);
  animation: pulse-red 1.5s infinite ease-in-out; /* Pulse animation */
}
.send-button {
  background-color: var(--bg-button-primary);
  color: var(--text-button-primary);
  font-size: 1.5em; /* Larger send icon */
  padding: 0.5rem 0.5rem; /* Adjust padding for icon size */
  line-height: 1; /* Adjust line height */
}
.send-button:hover:not(:disabled) {
  background-color: var(--bg-button-primary-hover);
}
.send-button:disabled {
  background-color: color-mix(in srgb, var(--bg-button-primary) 50%, var(--bg-input-area));
}
/* Send Button Animation Styles */
.send-button-plasma:not(:disabled) {
  animation: plasma-arrow-pulse 2s infinite ease-in-out;
  box-shadow: 0 0 5px 1px color-mix(in srgb, var(--accent-color-primary) 30%, transparent);
}
.send-button-plasma.flash-active {
  /* Triggered on send */
  animation: plasma-shoot 0.3s ease-out forwards;
}
.tts-button {
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  font-size: 1.1em;
  border: 1px solid transparent; /* Add border for spacing/alignment */
}
.tts-button.tts-on {
  background-color: var(--accent-color-primary);
  color: var(--bg-input-area); /* Contrast color */
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
  ); /* Darken accent */
  border-color: color-mix(in srgb, var(--accent-color-primary) 90%, #000000);
  color: var(--bg-input-area);
}

/* Loading Indicator (if you add one) */
.loading-indicator-visual-container {
  position: absolute;
  top: -4px; /* Position above the input area border */
  left: 0;
  width: 100%;
  height: 4px;
  overflow: hidden;
  background-color: transparent; /* Or a subtle background */
}
.loading-indicator-visual {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, var(--accent-color-primary), transparent);
  background-size: 200% 100%;
  animation: loading-gradient 1.5s linear infinite;
  border-radius: 2px;
}

@keyframes loading-gradient {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
