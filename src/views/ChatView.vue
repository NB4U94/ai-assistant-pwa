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
        v-for="message in messages"
        :key="message.id"
        :class="[
          'message-container',
          message.sender === 'User'
            ? 'user-container'
            : message.sender === 'AI'
              ? 'ai-container'
              : 'system-container',
        ]"
        @click="message.sender === 'AI' ? handleMessageClick(message.text) : null"
        :title="message.sender === 'AI' ? 'Click to read aloud' : ''"
      >
        <div class="avatar-placeholder" :title="message.sender">
          {{ message.sender === 'User' ? 'U' : 'AI' }}
        </div>
        <div
          :class="[
            'message',
            message.sender === 'User'
              ? 'user-message'
              : message.sender === 'AI'
                ? 'ai-message'
                : 'system-message',
            { 'error-message-style': message.isError }, // Add class if message is an error
          ]"
        >
          <img
            v-if="message.imagePreviewUrl"
            :src="message.imagePreviewUrl"
            alt="Sent image thumbnail"
            class="message-image-thumbnail"
          />
          <span class="message-text">
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
          <span class="timestamp">{{ formatTimestamp(message.timestamp) }}</span>
          <button
            v-if="message.sender === 'AI' && !message.isError"
            @click.stop="copyText(message.text, $event)"
            class="copy-button"
            title="Copy response"
          >
            📋
          </button>
        </div>
      </div>
      <p v-if="messages.length === 0 && !isLoading" class="placeholder-message">
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
        aria-label="Attach image"
        title="Attach image"
        :disabled="isLoading"
      >
        📎
      </button>
      <button
        @click="toggleListening"
        :class="['icon-button', isListening ? 'listening' : '']"
        aria-label="Use voice input"
        title="Use voice input"
        :disabled="isLoading"
      >
        <span v-if="!isListening">🎤</span>
        <span v-else>⏹️</span>
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
        class="send-button"
      >
        Send
      </button>
      <button
        @click="toggleTts"
        :class="['tts-button', isTtsEnabled ? 'tts-on' : 'tts-off']"
        :aria-pressed="isTtsEnabled"
        aria-label="Toggle text to speech"
        :disabled="isLoading"
      >
        <span v-if="isTtsEnabled" title="Speech ON">🔊</span>
        <span v-else title="Speech OFF">🔇</span>
      </button>
    </div>
  </div>
</template>

<script setup>
// *** This is the FULL script section from your original + loading indicator changes ***
import { ref, nextTick, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAssistantsStore } from '@/stores/assistantsStore'
import { storeToRefs } from 'pinia'

// --- Props ---
const props = defineProps({
  assistantConfig: { type: Object, required: false, default: null },
})

// --- Store Setup ---
const assistantsStore = useAssistantsStore()
const { assistants: availableAssistants, getAssistantById } = storeToRefs(assistantsStore)

// --- Refs ---
const messageAreaRef = ref(null)
const inputAreaRef = ref(null)
const sendButtonRef = ref(null)
const fileInputRef = ref(null)

// --- Reactive State ---
const userInput = ref('')
const messages = ref([])
const isLoading = ref(false)
const isTtsEnabled = ref(false)
const synth = window.speechSynthesis
const ttsSupported = ref(!!synth)
const selectedImagePreview = ref(null)
const selectedFile = ref(null)
const selectedAssistantId = ref(null)

// --- Speech Recognition State ---
const isListening = ref(false)
const recognition = ref(null)
const speechSupported = ref(false)

// --- Computed Properties ---
const activeAssistant = computed(() => {
  if (props.assistantConfig) return props.assistantConfig
  if (selectedAssistantId.value) return getAssistantById.value(selectedAssistantId.value)
  return null
})

const activeAssistantName = computed(() => activeAssistant.value?.name || 'Default AI')

const chatHistoryForApi = computed(() =>
  messages.value
    .filter((msg) => (msg.sender === 'User' || msg.sender === 'AI') && !msg.isError) // Correctly filter out errors
    .map((msg) => ({
      role: msg.sender === 'User' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    })),
)

// --- Animated Placeholder ---
const placeholders = [
  'Type your message or use the mic...',
  'Ask me anything...',
  'Attach an image and ask about it...',
  'Write a story about a dragon...',
  'Explain quantum physics simply...',
]
const currentPlaceholder = ref(placeholders[0])
let placeholderInterval = null

// --- Lifecycle Hooks ---
onMounted(() => {
  let placeholderIndex = 0
  placeholderInterval = setInterval(() => {
    placeholderIndex = (placeholderIndex + 1) % placeholders.length
    if (!userInput.value && !selectedImagePreview.value) {
      const basePlaceholder = activeAssistant.value
        ? `Ask ${activeAssistant.value.name} something...`
        : placeholders[placeholderIndex]
      currentPlaceholder.value = basePlaceholder
    } else if (!selectedImagePreview.value) {
      const defaultText = activeAssistant.value
        ? `Continue chatting with ${activeAssistant.value.name}...`
        : placeholders[0]
      currentPlaceholder.value = defaultText
    }
  }, 3000)

  setupSpeechRecognition()

  if (ttsSupported.value && synth) {
    const loadVoices = () => {
      const voices = synth.getVoices()
      if (voices.length > 0) {
        console.log('TTS voices loaded:', voices.length)
        if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = null
      }
    }
    if (synth.getVoices().length > 0) loadVoices()
    else if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices
    else setTimeout(loadVoices, 500)
  }

  if (props.assistantConfig) {
    console.log('ChatView mounted WITH assistantConfig (testing).')
    selectedAssistantId.value = props.assistantConfig.id
    addMessage(
      { text: `Testing: ${props.assistantConfig.name}. Messages will not be saved.` },
      'System',
    )
  } else {
    console.log('ChatView mounted WITHOUT assistantConfig (main view).')
    // Optionally select default on mount if needed
    // selectAssistant(null);
  }
})

onUnmounted(() => {
  clearInterval(placeholderInterval)
  if (synth) synth.cancel()
  if (recognition.value) recognition.value.abort()
})

// --- Watcher ---
watch(
  () => props.assistantConfig,
  (newConfig, oldConfig) => {
    if (newConfig !== oldConfig && props.assistantConfig) {
      console.log('Assistant config prop changed. Clearing chat for testing.')
      messages.value = []
      selectedAssistantId.value = newConfig?.id || null
      if (newConfig)
        addMessage({ text: `Testing: ${newConfig.name}. Messages will not be saved.` }, 'System')
      userInput.value = ''
      removeSelectedImage()
      scrollToBottom('auto')
    }
  },
  { immediate: false },
)

// --- Assistant Selection ---
const selectAssistant = (assistantId) => {
  if (props.assistantConfig) {
    console.warn('Cannot change assistant while in testing mode.')
    return
  }
  if (selectedAssistantId.value === assistantId) return

  console.log(`Selecting assistant ID: ${assistantId === null ? 'Default AI' : assistantId}`)
  selectedAssistantId.value = assistantId
  messages.value = [] // Clear history

  const selectedAssistant = activeAssistant.value
  addMessage({ text: `Switched to ${selectedAssistant?.name || 'Default AI'}.` }, 'System')

  userInput.value = ''
  removeSelectedImage()
  scrollToBottom('auto')
  inputAreaRef.value?.focus()

  const basePlaceholder = selectedAssistant ? `Ask ${selectedAssistant.name}...` : placeholders[0]
  currentPlaceholder.value = basePlaceholder
}

// --- Speech Recognition ---
// (Full implementation from original code)
const setupSpeechRecognition = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (SpeechRecognition) {
    speechSupported.value = true
    try {
      recognition.value = new SpeechRecognition()
      recognition.value.continuous = false
      recognition.value.lang = 'en-US'
      recognition.value.interimResults = false
      recognition.value.maxAlternatives = 1

      recognition.value.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript
        if (transcript) {
          userInput.value += (userInput.value ? ' ' : '') + transcript
          nextTick(() => {
            if (inputAreaRef.value) autoGrowTextarea({ target: inputAreaRef.value })
          })
        } else {
          console.warn('No transcript found.')
        }
      }

      recognition.value.onerror = (event) => {
        console.error('Speech recognition error:', event.error, event.message)
        let errorMsg = `Speech error: ${event.error}`
        if (['not-allowed', 'service-not-allowed'].includes(event.error))
          errorMsg = 'Mic access denied.'
        else if (event.error === 'no-speech') errorMsg = 'No speech detected.'
        else if (event.error === 'audio-capture') errorMsg = 'Mic not found/working.'
        addMessage({ isError: true, text: errorMsg }, 'System')
        isListening.value = false
      }

      recognition.value.onstart = () => {
        isListening.value = true
      }
      recognition.value.onend = () => {
        isListening.value = false
        nextTick(() => inputAreaRef.value?.focus())
      }
    } catch (e) {
      console.error('Error creating SpeechRecognition:', e)
      speechSupported.value = false
      addMessage({ isError: true, text: 'Speech recognition init failed.' }, 'System')
    }
  } else {
    console.warn('Speech Recognition not supported.')
    speechSupported.value = false
  }
}

const startListening = () => {
  if (!speechSupported.value || !recognition.value || isListening.value) return
  try {
    recognition.value.start()
  } catch (error) {
    console.error(`Error starting recognition: ${error.name}`, error)
    if (error.name !== 'InvalidStateError')
      addMessage({ isError: true, text: `Voice input start error: ${error.message}` }, 'System')
    isListening.value = false
  }
}

const stopListening = () => {
  if (!speechSupported.value || !recognition.value || !isListening.value) return
  try {
    recognition.value.stop()
  } catch (error) {
    console.warn('Error stopping recognition:', error)
    isListening.value = false
  }
}

const toggleListening = () => {
  if (!speechSupported.value) {
    addMessage({ isError: true, text: 'Voice input not supported.' }, 'System')
    return
  }
  if (isListening.value) stopListening()
  else startListening()
}

// --- File Input Handling ---
// (Full implementation from original code)
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64String = reader.result?.toString().split(',')[1]
      if (base64String) resolve({ base64Data: base64String, mimeType: file.type })
      else reject(new Error('Failed reading file base64.'))
    }
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

const handleFileSelected = async (event) => {
  const file = event.target.files?.[0]
  if (!file) {
    removeSelectedImage()
    return
  }
  if (!file.type.startsWith('image/')) {
    addMessage({ isError: true, text: `Invalid file type: ${file.name}` }, 'System')
    removeSelectedImage()
    return
  }
  const maxSizeMB = 4
  if (file.size > maxSizeMB * 1024 * 1024) {
    addMessage({ isError: true, text: `Too large (>${maxSizeMB}MB): ${file.name}` }, 'System')
    removeSelectedImage()
    return
  }
  selectedFile.value = file
  const readerPreview = new FileReader()
  readerPreview.onload = (e) => {
    selectedImagePreview.value = e.target?.result
    currentPlaceholder.value = 'Image selected.'
  }
  readerPreview.onerror = (e) => {
    console.error('Preview error:', e)
    addMessage({ isError: true, text: 'Preview read error.' }, 'System')
    removeSelectedImage()
  }
  readerPreview.readAsDataURL(file)
  event.target.value = null // Reset input
}

const removeSelectedImage = () => {
  selectedImagePreview.value = null
  selectedFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = null
  if (!userInput.value) {
    const basePlaceholder = activeAssistant.value
      ? `Ask ${activeAssistant.value.name}...`
      : placeholders[0]
    currentPlaceholder.value = basePlaceholder
  }
}

// --- Textarea Auto-Grow ---
// (Full implementation from original code)
const autoGrowTextarea = (event) => {
  const textarea = event.target
  textarea.style.height = 'auto' // Reset height
  const maxHeight = 150 // Define max height
  // Set height based on scroll height, capped at max height
  textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
}

// --- Text-to-Speech (TTS) ---
// (Full implementation from original code)
const speakText = (text) => {
  if (!ttsSupported.value || !synth || !text) return
  if (synth.speaking) {
    console.log('TTS: Cancelling previous.')
    synth.cancel()
    setTimeout(() => {
      trySpeak(text)
    }, 50)
  } else {
    trySpeak(text)
  }
}

const trySpeak = (text) => {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.onerror = (event) => {
    console.error(`TTS error: ${event.error}`)
    if (!['interrupted', 'canceled'].includes(event.error))
      addMessage({ isError: true, text: `Speech error: ${event.error}` }, 'System')
  }
  // Optional: Select voice here if needed
  synth.speak(utterance)
}

const handleMessageClick = (textToSpeak) => {
  if (isTtsEnabled.value) speakText(textToSpeak)
}

const toggleTts = () => {
  if (!ttsSupported.value) {
    addMessage({ isError: true, text: 'TTS not supported.' }, 'System')
    return
  }
  isTtsEnabled.value = !isTtsEnabled.value
  if (!isTtsEnabled.value && synth.speaking) synth.cancel()
}

// --- Timestamp Formatting ---
// (Full implementation from original code)
const formatTimestamp = (timestamp) => {
  if (!timestamp) return ''
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return 'Invalid Date'
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch (e) {
    console.error('Timestamp format error:', e)
    return 'Invalid Date'
  }
}

// --- Copy to Clipboard ---
// (Full implementation from original code)
const copyText = async (textToCopy, event) => {
  if (!navigator.clipboard) {
    addMessage({ isError: true, text: 'Clipboard unavailable.' }, 'System')
    return
  }
  try {
    await navigator.clipboard.writeText(textToCopy)
    const btn = event?.currentTarget
    if (btn) {
      const old = btn.innerHTML
      btn.innerHTML = '✅'
      btn.disabled = true
      setTimeout(() => {
        if (btn) {
          btn.innerHTML = old
          btn.disabled = false
        }
      }, 1500)
    }
  } catch (err) {
    console.error('Copy failed: ', err)
    addMessage({ isError: true, text: `Copy failed: ${err.message}` }, 'System')
  }
}

// --- Link Processing ---
// (Full implementation from original code)
const processMessageText = (text) => {
  if (!text) return [{ type: 'text', text: '' }]
  const urlRegex =
    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%?=~_|])|(\bwww\.[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%?=~_|])(?![^<]*?>|[^<>]*?<\/(a|button|textarea|input)[^<>]*?>)/gi
  const segments = []
  let lastIndex = 0
  let match
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex)
      segments.push({ type: 'text', text: text.substring(lastIndex, match.index) })
    let url = match[0]
    if (!url.match(/^(https?|ftp|file):\/\//i)) url = 'https://' + url
    segments.push({ type: 'link', text: match[0], url: url })
    lastIndex = urlRegex.lastIndex
  }
  if (lastIndex < text.length) segments.push({ type: 'text', text: text.substring(lastIndex) })
  if (segments.length === 0 && text) segments.push({ type: 'text', text: text })
  return segments
}

// --- Message Handling ---
// (Full implementation from original code, including aiText fix)
const scrollToBottom = (behavior = 'smooth') => {
  nextTick(() => {
    const el = messageAreaRef.value
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: behavior })
  })
}

const addMessage = (payload, sender = 'User', imagePreviewUrl = null) => {
  let messageText = ''
  let messageSender = sender
  let isError = false
  if (typeof payload === 'string') messageText = payload
  else if (typeof payload === 'object' && payload !== null) {
    isError = payload.isError === true
    messageSender = payload.sender || sender
    if (isError) {
      messageText = payload.text || 'Error.'
      messageSender = 'System'
    } else if (typeof payload.aiText === 'string') {
      messageText = payload.aiText
      messageSender = 'AI'
    } // Correctly use aiText
    else if (messageSender === 'System' && typeof payload.text === 'string')
      messageText = payload.text
    else {
      messageText = JSON.stringify(payload)
      messageSender = 'System'
      isError = true
    }
  } else return

  const trimmedText = messageText.trim()
  if (trimmedText === '' && !imagePreviewUrl && messageSender !== 'System') {
    if (!(messageSender === 'User' && messageText.startsWith('[Sent Image:'))) return
  }

  const newMessage = {
    id: Date.now() + Math.random(),
    text: trimmedText,
    sender: messageSender,
    timestamp: Date.now(),
    imagePreviewUrl: imagePreviewUrl,
    isError: isError,
  }
  messages.value.push(newMessage)
  scrollToBottom('smooth')
  if (messageSender === 'AI' && !isError && isTtsEnabled.value && newMessage.text)
    speakText(newMessage.text)
}

// --- API Call Logic ---
// (Full implementation from original code)
const callBackendApi = async (inputText, imageFile) => {
  const NETLIFY_FUNCTION_URL = '/.netlify/functions/call-gemini'
  let imgData = null
  if (imageFile) {
    try {
      imgData = await readFileAsBase64(imageFile)
    } catch (e) {
      return { isError: true, text: 'Image processing error.' }
    }
  }
  const cfg = activeAssistant.value
  const instr = cfg?.instructions || null
  const payload = {
    history: chatHistoryForApi.value,
    inputText: inputText.trim(),
    imageFile: imgData,
    assistantInstructions: instr,
  }
  console.log('Sending payload structure:', {
    history: `(${payload.history?.length || 0})`,
    input: !!payload.inputText,
    img: !!payload.imageFile,
    instr: !!payload.assistantInstructions,
  })
  try {
    const r = await fetch(NETLIFY_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const rt = await r.text()
    if (!r.ok) {
      let e = `HTTP ${r.status}`
      try {
        const p = JSON.parse(rt)
        e = p.error || `${e}: ${rt.substring(0, 100)}`
      } catch (err) {
        e += `: ${rt.substring(0, 100)}`
      }
      throw new Error(e)
    }
    let d
    try {
      d = JSON.parse(rt)
    } catch (e) {
      throw new Error(`Invalid JSON: ${rt.substring(0, 100)}`)
    }
    if (d.error) throw new Error(d.error)
    if (d.blockReason && !['STOP', 'MAX_TOKENS'].includes(d.blockReason))
      return { isError: true, text: `Blocked: ${d.blockReason}` }
    if (typeof d.aiText === 'string')
      return d // Return full object on success
    else return { isError: true, text: '[Invalid AI content]' }
  } catch (e) {
    return { isError: true, text: `API Error: ${e.message}` }
  }
}

// --- Send Button Flash ---
// (Full implementation from original code)
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

// --- Send Message Action ---
// (Full implementation from original code, with thinking message removed)
const sendMessage = async () => {
  const txt = userInput.value
  const file = selectedFile.value
  const preview = selectedImagePreview.value
  if (isLoading.value || (txt.trim() === '' && !file)) return
  triggerSendFlash()
  let userMsg = txt.trim()
  if (file && userMsg === '') userMsg = `[Sent Image: ${file.name}]`
  if (userMsg !== '' || preview) addMessage(userMsg, 'User', preview)
  else return
  const txtToSend = txt.trim()
  const imgToSend = file
  userInput.value = ''
  removeSelectedImage()
  nextTick(() => {
    if (inputAreaRef.value) {
      inputAreaRef.value.style.height = 'auto'
      autoGrowTextarea({ target: inputAreaRef.value })
    }
    const p = activeAssistant.value ? `Ask ${activeAssistant.value.name}...` : placeholders[0]
    currentPlaceholder.value = p
  })

  isLoading.value = true // Start loading
  // REMOVED thinking message: addMessage({ text: 'AI is thinking...' }, 'AI');
  scrollToBottom('smooth') // Scroll after adding user message

  const apiResp = await callBackendApi(txtToSend, imgToSend)

  // REMOVED removing thinking message

  addMessage(apiResp) // Add AI response/error (addMessage handles the object)
  isLoading.value = false // Stop loading
  nextTick(() => {
    inputAreaRef.value?.focus()
  })
}
// --- End Full Script ---
</script>

<style scoped>
/* --- Styles are identical to previous correct version + ENHANCED loading indicator styles --- */
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
  overflow-x: auto;
  padding-bottom: 5px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.assistant-selector-row::-webkit-scrollbar {
  display: none;
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
  opacity: 0;
  transform: translateY(10px);
  animation: fadeIn 0.3s ease forwards;
  position: relative;
}
.ai-container {
  cursor: pointer;
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
    color 0.2s ease;
  z-index: 1;
  padding: 0;
}
.ai-container:hover .copy-button {
  opacity: 0.6;
}
.copy-button:hover {
  opacity: 1;
  color: var(--text-primary);
}
.copy-button:disabled {
  cursor: default;
  opacity: 0.8;
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
  align-items: flex-end;
  padding: 0.75rem;
  background-color: var(--bg-input-area);
  flex-shrink: 0;
  gap: 0.5rem;
  border-radius: 0;
  border-top: none;
  position: relative;
}
.chat-view:has(.image-preview-area) .input-area {
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
}
.input-area textarea:hover:not(:focus):not(:disabled) {
  border-color: var(--accent-color-primary);
}
.input-area textarea:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: var(
    --input-focus-shadow,
    0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent)
  );
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
    transform 0.1s ease;
}
.input-area button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
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
  background-color: var(--bg-button-primary);
  color: var(--text-button-primary);
  border-radius: 15px;
  padding: 0.5rem 1rem;
  font-size: 1em;
  font-weight: 500;
  min-width: auto;
}
.send-button:hover:not(:disabled) {
  background-color: var(--bg-button-primary-hover);
}
.send-button:disabled {
  background-color: color-mix(in srgb, var(--bg-button-primary) 50%, var(--bg-input-area));
}
.send-button.flash-active {
  animation: flash-animation 0.3s ease-out;
}
@keyframes flash-animation {
  0% {
    transform: scale(1);
    background-color: var(--bg-button-primary);
  }
  50% {
    transform: scale(1.05);
    background-color: var(--bg-button-primary-flash);
  }
  100% {
    transform: scale(1);
    background-color: var(--bg-button-primary);
  }
}
.tts-button {
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  font-size: 1.1em;
}
.tts-button.tts-on {
  background-color: var(--bg-button-tts-on);
  color: var(--text-button-tts-on);
}
.tts-button:hover:not(.tts-on):not(:disabled) {
  background-color: var(--bg-button-secondary-hover);
}
.tts-button.tts-on:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--bg-button-tts-on) 90%, #000000);
}

/* --- Enhanced Loading Indicator Styles --- */
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
  position: relative; /* Needed for pseudo-elements */
  overflow: visible; /* Allow pseudo-elements to extend outside */
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

/* Add pseudo-elements for lightning/plasma bolts */
.loading-indicator-visual::before,
.loading-indicator-visual::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px; /* Thickness of the bolt */
  height: 10px; /* Initial length of the bolt */
  background-color: var(--accent-color-primary);
  border-radius: 1px;
  transform-origin: 50% 50%; /* Scale/rotate from center */
  animation: plasma-shoot 0.6s infinite linear; /* Faster animation */
  opacity: 0; /* Start invisible */
  box-shadow: 0 0 3px 1px color-mix(in srgb, var(--accent-color-primary) 80%, transparent);
}
.loading-indicator-visual::before {
  transform: translate(-50%, -50%) rotate(0deg); /* Position and initial rotation */
}
.loading-indicator-visual::after {
  transform: translate(-50%, -50%) rotate(90deg); /* Position and initial rotation */
  animation-delay: -0.3s; /* Offset the animation start */
}

/* Keyframes for the shooting plasma/lightning effect */
@keyframes plasma-shoot {
  0% {
    transform: translate(-50%, -50%) scale(0.8) rotate(var(--angle, 0deg)); /* Start smaller */
    opacity: 0.9;
    height: 8px;
  }
  70% {
    /* Extend faster */
    opacity: 0.3;
    height: 20px; /* Extend length further */
    transform: translate(-50%, -50%) scale(2.5) rotate(var(--angle, 0deg)); /* Scale outwards */
  }
  100% {
    transform: translate(-50%, -50%) scale(3.5) rotate(var(--angle, 0deg)); /* Scale further */
    opacity: 0;
    height: 3px; /* Shrink thickness */
  }
}
/* Apply rotation using CSS variable (can be simpler if only 2 needed) */
.loading-indicator-visual::before {
  --angle: 0deg;
}
.loading-indicator-visual::after {
  --angle: 90deg;
} /* Ensure angle matches initial transform */
/* --- End Enhanced Loading Indicator Styles --- */
</style>
