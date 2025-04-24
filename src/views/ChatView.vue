<template>
  <div class="chat-view">
    <div class="assistant-selector-area">
      <div class="assistant-selector-row">
        <div
          :class="[
            'assistant-selector-item',
            !activeSessionId || activeSessionId === 'main_chat' ? 'selected' : '',
            'nb4u-ai-selector',
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
      <p v-if="displayMessages.length === 0 && !isSending" class="placeholder-message">
        No messages in this chat yet. Start the conversation!
      </p>
    </div>

    <div v-if="selectedImagePreview" class="image-preview-area">
      <img :src="selectedImagePreview" alt="Selected image preview" class="image-preview" />
      <button @click="removeSelectedImage" class="remove-image-button" title="Remove image">
        ✖
      </button>
    </div>

    <div class="input-area">
      <div class="loading-indicator-visual-container" v-if="isSending">
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
        :disabled="isSending"
      >
        📁
      </button>
      <button
        @click="toggleListening"
        :class="['icon-button', isListening ? 'listening' : '']"
        aria-label="Use voice input"
        title="Use voice input"
        :disabled="isSending || !speechSupported"
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
        :disabled="isSending"
        aria-label="Chat message input"
      ></textarea>
      <button
        ref="sendButtonRef"
        @click="handleSendMessage"
        :disabled="isSending || (!userInput.trim() && !selectedFile)"
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
        :disabled="isSending || !ttsSupported"
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

// Import ALL composables used
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'
import { useFileInput } from '@/composables/useFileInput'
import { useTextToSpeech } from '@/composables/useTextToSpeech'
import { useUIUtils } from '@/composables/useUIUtils'
import { useChatScroll } from '@/composables/useChatScroll'
import { useMessageSender } from '@/composables/useMessageSender'

// Define props (unchanged)
const props = defineProps({ assistantConfig: { type: Object, required: false, default: null } })

// Stores (unchanged)
const assistantsStore = useAssistantsStore()
const conversationStore = useConversationStore()
const settingsStore = useSettingsStore()

// Reactive refs from stores (Removed activeSession)
const { assistants: availableAssistants } = storeToRefs(assistantsStore)
// *** REMOVED activeSession from here ***
const { activeHistory, activeSessionId } = storeToRefs(conversationStore)
const { sendOnEnter } = storeToRefs(settingsStore)

// Template Refs (unchanged)
const messageAreaRef = ref(null)
const inputAreaRef = ref(null)
const sendButtonRef = ref(null)

// Local State
const userInput = ref('')
const uiMessages = ref([])

// --- Instantiate Composables ---

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
}
const handleComposableError = (errorMessage) => {
  console.error('[Composable Error Handler]', errorMessage)
  addUiMessage(errorMessage, true)
}

const { copiedState, formatTimestamp, copyText, processMessageText, autoGrowTextarea } = useUIUtils(
  { addErrorMessage: handleComposableError },
)

// File Input (Placeholder logic updated)
const {
  selectedImagePreview,
  selectedFile,
  fileInputRef,
  triggerFileInput,
  handleFileSelected,
  removeSelectedImage,
} = useFileInput({
  addErrorMessage: handleComposableError,
  updatePlaceholder: () => {
    currentPlaceholder.value = calculatePlaceholder()
  },
  onImageSelected: () => {
    nextTick(() => {
      inputAreaRef.value?.focus()
    })
  },
})

// Text-to-Speech (unchanged)
const {
  ttsSupported,
  isTtsEnabled,
  speakText: ttsSpeakText,
  toggleTts: ttsToggle,
  handleMessageClick: ttsHandleMessageClick,
} = useTextToSpeech({ addErrorMessage: handleComposableError })

// Speech Recognition (unchanged)
const { isListening, speechSupported, toggleListening } = useSpeechRecognition({
  userInputRef: userInput,
  inputAreaRef: inputAreaRef,
  autoGrowTextarea: autoGrowTextarea,
  addErrorMessage: handleComposableError,
  onSpeechStart: () => {},
  onResult: () => {},
})

// Chat Scroll Composable (unchanged)
const { scrollToBottom, instantScrollToBottom } = useChatScroll(messageAreaRef, activeHistory)

// Message Sender Composable (unchanged)
const { sendMessage: sendChatMessage, isLoading: isSending, error: sendError } = useMessageSender()

// --- Computed Properties ---

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

// Placeholder logic
const placeholders = [
  'Type message or use mic...',
  'Ask anything...',
  'Attach image & ask...',
  'Write story...',
  'Explain quantum physics...',
]

// *** UPDATED calculatePlaceholder function ***
const calculatePlaceholder = () => {
  if (selectedFile.value) return 'Image selected...'
  if (userInput.value) return 'Continue typing...'

  const currentId = activeSessionId.value
  if (!currentId || currentId === 'main_chat') {
    return 'Ask Nb4U-Ai...' // Default for main chat
  } else {
    try {
      const assistant = assistantsStore.getAssistantById(currentId)
      // Use a generic fallback if assistant name is not available immediately
      return assistant ? `Ask ${assistant.name}...` : 'Ask selected assistant...'
    } catch (_e) {
      console.warn(`Error getting assistant details for placeholder: ${_e}`)
      return 'Ask selected assistant...' // Fallback on error
    }
  }
}
const currentPlaceholder = ref(calculatePlaceholder())
let placeholderInterval = null

// --- Lifecycle Hooks ---

onMounted(() => {
  instantScrollToBottom()

  let placeholderIndex = 0
  placeholderInterval = setInterval(() => {
    placeholderIndex = (placeholderIndex + 1) % placeholders.length
    if (!userInput.value && !selectedImagePreview.value) {
      currentPlaceholder.value = calculatePlaceholder() // Use updated function
    }
  }, 5000)

  console.log(`[ChatView] Mounted. Session ID: ${activeSessionId.value}`)
})

onUnmounted(() => {
  clearInterval(placeholderInterval)
})

// --- Watchers ---

watch(sendError, (newError) => {
  if (newError) {
    addUiMessage(newError, true)
    scrollToBottom()
  }
})

watch(activeSessionId, (newId, oldId) => {
  console.log(`[ChatView] Session ID changed to: ${newId}`)
  if (newId !== oldId) {
    userInput.value = ''
    removeSelectedImage()
    uiMessages.value = []
    currentPlaceholder.value = calculatePlaceholder()
    instantScrollToBottom()
    nextTick(() => {
      inputAreaRef.value?.focus()
    })
  }
})

watch(userInput, () => {
  if (!userInput.value) {
    currentPlaceholder.value = calculatePlaceholder()
  } else {
    // Optionally set a different placeholder while typing
    // currentPlaceholder.value = 'Continue typing...';
  }
})

// --- Methods ---

const selectAssistant = (assistantId) => {
  if (props.assistantConfig && props.assistantConfig.id !== assistantId) {
    console.warn('[ChatView] Assistant selection ignored due to assistantConfig prop.')
    return
  }
  const targetSessionId = assistantId || 'main_chat'
  console.log(`[ChatView] UI selecting session: ${targetSessionId}`)
  if (activeSessionId.value !== targetSessionId) {
    conversationStore.setActiveSession(targetSessionId)
  } else {
    console.log(`[ChatView] Session ${targetSessionId} already active.`)
  }
}

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

const handleEnterKey = (event) => {
  if (sendOnEnter.value && !event.shiftKey && !isSending.value) {
    event.preventDefault()
    handleSendMessage()
  }
}

const handleSendMessage = async () => {
  const textToSend = userInput.value
  const imageFileToSend = selectedFile.value
  const imagePreviewUrl = selectedImagePreview.value

  const currentInputText = userInput.value
  const currentSelectedFile = selectedFile.value

  userInput.value = ''
  removeSelectedImage()
  triggerSendFlash()

  nextTick(() => {
    if (inputAreaRef.value) {
      inputAreaRef.value.style.height = 'auto'
    }
    currentPlaceholder.value = calculatePlaceholder()
  })

  const { success, aiResponse } = await sendChatMessage(
    currentInputText,
    currentSelectedFile,
    imagePreviewUrl,
  )

  if (success && aiResponse) {
    ttsSpeakText(aiResponse)
  } else {
    console.error('[ChatView] Message sending failed.')
  }

  nextTick(() => {
    inputAreaRef.value?.focus()
  })
}
</script>

<style scoped>
/* Styles are identical to the previous version - No changes needed */
@keyframes faint-icon-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 1px color-mix(in srgb, var(--accent-color-primary) 50%, transparent));
  }
  50% {
    filter: drop-shadow(0 0 3px color-mix(in srgb, var(--accent-color-primary) 70%, transparent));
  }
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
@keyframes loading-gradient {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
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
  padding: 1rem 1rem 1rem 1rem;
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
  padding-bottom: 5px;
  -ms-overflow-style: none;
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
  max-width: 65px;
}
.assistant-selector-item.selected .assistant-selector-name {
  color: var(--text-primary);
  font-weight: 500;
}
.assistant-selector-item.nb4u-ai-selector {
  animation: faint-icon-glow 2.5s infinite ease-in-out alternate;
}
.assistant-selector-item.nb4u-ai-selector.selected {
  border-color: var(--accent-color-primary);
}
.message-container {
  display: flex;
  margin-bottom: 0.75rem;
  max-width: 85%;
  opacity: 0;
  transform: translateY(10px);
  animation: fadeIn 0.3s ease forwards;
  position: relative;
}
.user-container {
  align-self: flex-end;
  margin-left: auto;
  flex-direction: row-reverse;
}
.ai-container,
.system-container {
  align-self: flex-start;
  margin-right: auto;
  flex-direction: row;
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
  margin-top: 4px;
  margin-right: 0.5rem;
  user-select: none;
}
.user-container .avatar-placeholder {
  margin-right: 0;
  margin-left: 0.5rem;
  background-color: var(--bg-avatar-user);
}
.system-container .avatar-placeholder {
  display: none;
}
.message {
  padding: 0.6rem 1rem;
  border-radius: 18px;
  word-wrap: break-word;
  font-family: sans-serif;
  line-height: 1.45;
  position: relative;
  min-width: 50px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
.user-message {
  background-color: var(--bg-message-user);
  color: var(--text-message-user);
  border-bottom-right-radius: 6px;
}
.ai-message {
  background-color: var(--bg-message-ai);
  color: var(--text-message-ai);
  border-bottom-left-radius: 6px;
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
  background-color: var(--bg-message-info, #e3f2fd);
  color: var(--text-secondary);
  width: 100%;
  text-align: center;
  font-style: italic;
  font-size: 0.9em;
  border: 1px dashed var(--border-color-medium);
  border-radius: 8px;
  padding-top: 0.8rem;
  padding-bottom: 0.8rem;
  margin-left: auto;
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
  border-style: solid;
  font-style: normal;
  background-color: var(--bg-message-error);
  color: var(--text-error);
}
.system-container {
  width: 100%;
  justify-content: center;
  align-self: center;
  max-width: 100%;
}
.message-image-thumbnail {
  max-width: 150px;
  max-height: 100px;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  object-fit: contain;
  border: 1px solid var(--border-color-light);
  align-self: flex-start;
}
.timestamp {
  font-size: 0.7em;
  color: var(--text-timestamp);
  margin-top: 0.3rem;
  text-align: right;
  user-select: none;
  -webkit-user-select: none;
  width: 100%;
}
.placeholder-message {
  color: var(--text-placeholder);
  font-style: italic;
  font-family: sans-serif;
  text-align: center;
  margin: 2rem auto;
  padding: 1rem;
  background-color: var(--bg-input-area);
  border-radius: 8px;
  max-width: 80%;
}
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
.image-preview-area {
  padding: 0.5rem 0.75rem 0.5rem;
  margin: 0 0.75rem;
  background-color: var(--bg-sidebar);
  border: 1px solid var(--border-color-medium);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
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
  color: #fff;
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
  align-items: flex-end;
  padding: 0.75rem;
  background-color: var(--bg-input-area);
  flex-shrink: 0;
  gap: 0.5rem;
  border-radius: 0;
  border-top: none;
  position: relative;
}
.chat-view:not(:has(.image-preview-area)) .input-area {
  border-top: 1px solid var(--border-color-medium);
}
.input-area textarea {
  flex-grow: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color-medium);
  border-radius: 15px;
  resize: none;
  font-family: sans-serif;
  font-size: 1em;
  min-height: 40px;
  max-height: 150px;
  overflow-y: auto;
  line-height: 1.4;
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.input-area textarea::placeholder {
  color: var(--text-placeholder);
  opacity: 1;
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
  border-radius: 50%;
  cursor: pointer;
  min-height: 40px;
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em;
  flex-shrink: 0;
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease,
    transform 0.1s ease,
    box-shadow 0.2s ease;
}
.input-area button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  animation: none !important;
  box-shadow: none !important;
}
.input-area button:active:not(:disabled) {
  transform: scale(0.95);
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
  animation: pulse-red 1.5s infinite ease-in-out;
}
.send-button {
  background-color: var(--bg-button-primary);
  color: var(--text-button-primary);
  font-size: 1.5em;
  padding: 0.5rem 0.5rem;
  line-height: 1;
}
.send-button:hover:not(:disabled) {
  background-color: var(--bg-button-primary-hover);
}
.send-button:disabled {
  background-color: color-mix(in srgb, var(--bg-button-primary) 50%, var(--bg-input-area));
}
.send-button-plasma:not(:disabled) {
  animation: plasma-arrow-pulse 2s infinite ease-in-out;
  box-shadow: 0 0 5px 1px color-mix(in srgb, var(--accent-color-primary) 30%, transparent);
}
.send-button-plasma.flash-active {
  animation: plasma-shoot 0.3s ease-out forwards;
}
.tts-button {
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  font-size: 1.1em;
  border: 1px solid transparent;
}
.tts-button.tts-on {
  background-color: var(--accent-color-primary);
  color: var(--bg-input-area);
  border-color: var(--accent-color-primary);
}
.tts-button:hover:not(:disabled) {
  background-color: var(--bg-button-secondary-hover);
  border-color: transparent;
}
.tts-button.tts-on:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--accent-color-primary) 90%, #000);
  border-color: color-mix(in srgb, var(--accent-color-primary) 90%, #000);
  color: var(--bg-input-area);
}
.loading-indicator-visual-container {
  position: absolute;
  top: -4px;
  left: 0;
  width: 100%;
  height: 4px;
  overflow: hidden;
  background-color: transparent;
}
.loading-indicator-visual {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, var(--accent-color-primary), transparent);
  background-size: 200% 100%;
  animation: loading-gradient 1.5s linear infinite;
  border-radius: 2px;
}
</style>
