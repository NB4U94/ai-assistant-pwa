<template>
  <div class="chat-view">
    <div v-if="assistantConfig" class="testing-assistant-header">
      Testing: {{ activeAssistantName }}
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
            v-if="message.sender === 'AI'"
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
          activeAssistantName ? ` with ${activeAssistantName}` : ''
        }}!
      </p>
      <p v-if="isLoading" class="placeholder-message loading-indicator">AI is thinking...</p>
    </div>

    <div v-if="selectedImagePreview" class="image-preview-area">
      <img :src="selectedImagePreview" alt="Selected image preview" class="image-preview" />
      <button @click="removeSelectedImage" class="remove-image-button" title="Remove image">
        ✖
      </button>
    </div>

    <div class="input-area">
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
      >
        📎
      </button>
      <button
        @click="toggleListening"
        :class="['icon-button', isListening ? 'listening' : '']"
        aria-label="Use voice input"
        title="Use voice input"
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
      >
        <span v-if="isTtsEnabled" title="Speech ON">🔊</span>
        <span v-else title="Speech OFF">🔇</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, computed, onMounted, onUnmounted, watch } from 'vue'

// --- Props (NEW) ---
const props = defineProps({
  assistantConfig: {
    type: Object,
    required: false, // Make it optional
    default: null,
  },
})
// ------------------

// --- Configuration ---
// API Key is handled by the Netlify function
// ---------------------

// --- Refs ---
const messageAreaRef = ref(null)
const inputAreaRef = ref(null)
const sendButtonRef = ref(null)
const fileInputRef = ref(null)

// --- Reactive State ---
const userInput = ref('')
const messages = ref([]) // Stores { id, text, sender, timestamp, imagePreviewUrl? }
const isLoading = ref(false)
const isTtsEnabled = ref(false)
const synth = window.speechSynthesis
const ttsSupported = ref(!!synth)
const selectedImagePreview = ref(null) // Holds the data URL for image preview
const selectedFile = ref(null) // Holds the actual File object

// --- Speech Recognition State ---
const isListening = ref(false)
const recognition = ref(null)
const speechSupported = ref(false)
// -----------------------------

// --- Computed Properties (NEW/MODIFIED) ---
const activeAssistantName = computed(() => {
  return props.assistantConfig?.name || null
})

const chatHistoryForApi = computed(() => {
  // Convert messages array to the format Gemini API expects
  // Only include relevant messages (User/AI, not system/thinking)
  return messages.value
    .filter(
      (msg) => (msg.sender === 'User' || msg.sender === 'AI') && msg.text !== 'AI is thinking...',
    )
    .map((msg) => ({
      role: msg.sender === 'User' ? 'user' : 'model',
      // For now, just include text part. Image part is handled separately in payload.
      parts: [{ text: msg.text }],
    }))
})
// --------------------------------------

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
  // Setup animated placeholder
  let placeholderIndex = 0
  placeholderInterval = setInterval(() => {
    placeholderIndex = (placeholderIndex + 1) % placeholders.length
    if (!userInput.value && !selectedImagePreview.value) {
      // Update placeholder based on whether testing an assistant
      const basePlaceholder = activeAssistantName.value
        ? `Ask ${activeAssistantName.value} something...`
        : placeholders[placeholderIndex]
      currentPlaceholder.value = basePlaceholder
    } else if (!selectedImagePreview.value) {
      const defaultText = activeAssistantName.value
        ? `Continue chatting with ${activeAssistantName.value}...`
        : placeholders[0]
      currentPlaceholder.value = defaultText // Default if image deselected but text exists
    }
  }, 3000)

  // Setup Speech Recognition
  setupSpeechRecognition()

  // Add event listener to get voices loaded
  if (ttsSupported.value && synth) {
    const loadVoices = () => {
      const voices = synth.getVoices()
      if (voices.length > 0) {
        console.log('TTS voices loaded:', voices.length)
        if (synth.onvoiceschanged !== undefined) {
          synth.onvoiceschanged = null
        }
      }
    }
    if (synth.getVoices().length > 0) {
      loadVoices()
    } else if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices
    } else {
      setTimeout(loadVoices, 500)
    }
  }

  // Clear chat when component mounts IF testing an assistant (NEW)
  if (props.assistantConfig) {
    console.log('ChatView mounted with assistantConfig. Clearing messages for test.')
    messages.value = []
    addMessage({ text: `You are now chatting with ${props.assistantConfig.name}.` }, 'System')
  }
})

onUnmounted(() => {
  clearInterval(placeholderInterval)
  if (synth) {
    synth.cancel()
  }
  if (recognition.value) {
    recognition.value.abort()
  }
})

// --- Watcher (NEW) ---
// Watch for changes in the assistantConfig prop. If it changes (e.g., user closes
// modal and reopens for another assistant), clear the chat.
watch(
  () => props.assistantConfig,
  (newConfig, oldConfig) => {
    if (newConfig !== oldConfig) {
      console.log('Assistant config changed. Clearing chat.')
      messages.value = []
      if (newConfig) {
        addMessage({ text: `You are now chatting with ${newConfig.name}.` }, 'System')
      }
      // Reset input field as well
      userInput.value = ''
      removeSelectedImage()
      // Force scroll to top after clearing
      scrollToBottom('auto') // Use auto for instant jump
    }
  },
  { immediate: false },
) // Don't run immediately on mount, onMounted handles initial state
// -----------------------

// --- Speech Recognition Setup & Control ---
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
            if (inputAreaRef.value) {
              autoGrowTextarea({ target: inputAreaRef.value })
            }
          })
        } else {
          console.warn('No transcript found in speech result event.')
        }
      }

      recognition.value.onerror = (event) => {
        console.error('Speech recognition error:', event.error, event.message)
        let errorMsg = `Speech recognition error: ${event.error}`
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          errorMsg = 'Microphone access denied. Please allow access in browser settings.'
        } else if (event.error === 'no-speech') {
          errorMsg = 'No speech detected. Please try again.'
        } else if (event.error === 'audio-capture') {
          errorMsg = 'Microphone not found or not working.'
        } else {
          errorMsg = `Speech error: ${event.error} - ${event.message || '(no details)'}`
        }
        addMessage({ error: true, text: errorMsg }, 'System')
        isListening.value = false
      }

      recognition.value.onstart = () => {
        isListening.value = true
      }

      recognition.value.onend = () => {
        isListening.value = false
        nextTick(() => {
          inputAreaRef.value?.focus()
        })
      }
    } catch (e) {
      console.error('Error creating SpeechRecognition object:', e)
      speechSupported.value = false
      addMessage(
        { error: true, text: 'Failed to initialize speech recognition feature.' },
        'System',
      )
    }
  } else {
    console.warn('Speech Recognition API not supported in this browser.')
    speechSupported.value = false
  }
}

const startListening = () => {
  if (!speechSupported.value || !recognition.value || isListening.value) return
  try {
    recognition.value.start()
  } catch (error) {
    console.error(`Error calling recognition.start(): ${error.name} - ${error.message}`)
    if (error.name !== 'InvalidStateError') {
      addMessage({ error: true, text: `Could not start voice input: ${error.message}` }, 'System')
    }
    isListening.value = false
  }
}

const stopListening = () => {
  if (!speechSupported.value || !recognition.value || !isListening.value) return
  try {
    recognition.value.stop()
  } catch (error) {
    console.error('Error stopping speech recognition:', error)
    isListening.value = false
  }
}

const toggleListening = () => {
  if (!speechSupported.value) {
    addMessage({ error: true, text: 'Sorry, your browser does not support voice input.' }, 'System')
    return
  }
  if (isListening.value) {
    stopListening()
  } else {
    startListening()
  }
}
// ------------------------------------

// --- File Input Handling ---
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64String = reader.result?.toString().split(',')[1]
      if (base64String) {
        resolve({ base64Data: base64String, mimeType: file.type })
      } else {
        reject(new Error('Failed to read file as base64 data URL.'))
      }
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
    addMessage(
      { error: true, text: `Selected file (${file.name}) is not a supported image type.` },
      'System',
    )
    removeSelectedImage()
    return
  }

  const maxSizeMB = 4
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    addMessage(
      { error: true, text: `Image file (${file.name}) is too large (max ${maxSizeMB}MB).` },
      'System',
    )
    removeSelectedImage()
    return
  }

  selectedFile.value = file

  const readerPreview = new FileReader()
  readerPreview.onload = (e) => {
    selectedImagePreview.value = e.target?.result
    currentPlaceholder.value = 'Image selected. Add a message or send.'
  }
  readerPreview.onerror = (e) => {
    console.error('FileReader error generating preview:', e)
    addMessage({ error: true, text: 'Error reading image file for preview.' }, 'System')
    removeSelectedImage()
  }
  readerPreview.readAsDataURL(file)

  event.target.value = null
}

const removeSelectedImage = () => {
  selectedImagePreview.value = null
  selectedFile.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = null
  }
  if (!userInput.value) {
    const basePlaceholder = activeAssistantName.value
      ? `Ask ${activeAssistantName.value} something...`
      : placeholders[0] // Use index 0 or update based on interval logic if needed
    currentPlaceholder.value = basePlaceholder
  }
}
// -------------------------

// --- Textarea Auto-Grow ---
const autoGrowTextarea = (event) => {
  const textarea = event.target
  textarea.style.height = 'auto'
  const maxHeight = 150
  textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
}
// -------------------------

// --- Text-to-Speech (TTS) ---
const speakText = (text) => {
  if (!ttsSupported.value || !synth || !text) return

  if (synth.speaking) {
    console.log('TTS: Cancelling previous speech.')
    synth.cancel()
  }

  nextTick(() => {
    setTimeout(() => {
      if (synth.speaking) {
        console.log('TTS: Still speaking after delay, cancelling again.')
        synth.cancel()
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.onerror = (event) => {
            console.error(`TTS onerror event: ${event.error}`)
            if (event.error !== 'interrupted' && event.error !== 'canceled') {
              addMessage({ error: true, text: `Speech synthesis error: ${event.error}` }, 'System')
            }
          }
          synth.speak(utterance)
        }, 50)
      } else {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.onerror = (event) => {
          console.error(`TTS onerror event: ${event.error}`)
          if (event.error !== 'interrupted' && event.error !== 'canceled') {
            addMessage({ error: true, text: `Speech synthesis error: ${event.error}` }, 'System')
          }
        }
        synth.speak(utterance)
      }
    }, 50)
  })
}

const handleMessageClick = (textToSpeak) => {
  if (isTtsEnabled.value) {
    speakText(textToSpeak)
  }
}

const toggleTts = () => {
  if (!ttsSupported.value) {
    addMessage(
      { error: true, text: 'Sorry, your browser does not support Text-to-Speech.' },
      'System',
    )
    return
  }
  isTtsEnabled.value = !isTtsEnabled.value
  console.log('TTS Enabled Toggled:', isTtsEnabled.value)
  if (!isTtsEnabled.value && synth.speaking) {
    console.log('TTS: Cancelling speech due to toggle OFF.')
    synth.cancel()
  }
}
// -----------------------------

// --- Timestamp Formatting ---
const formatTimestamp = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
}
// --------------------------

// --- Copy to Clipboard ---
const copyText = async (textToCopy, event) => {
  if (!navigator.clipboard) {
    addMessage(
      { error: true, text: 'Clipboard access is not available or denied in this browser.' },
      'System',
    )
    return
  }
  try {
    await navigator.clipboard.writeText(textToCopy)
    console.log('AI response copied to clipboard!')

    const buttonElement = event?.currentTarget
    if (buttonElement) {
      const originalContent = buttonElement.innerHTML
      buttonElement.innerHTML = '✅'
      buttonElement.disabled = true
      setTimeout(() => {
        if (buttonElement) {
          buttonElement.innerHTML = originalContent
          buttonElement.disabled = false
        }
      }, 1500)
    }
  } catch (err) {
    console.error('Failed to copy text: ', err)
    addMessage({ error: true, text: `Could not copy text: ${err.message}` }, 'System')
  }
}

// -------------------------

// --- Link Processing ---
const processMessageText = (text) => {
  if (!text) return [{ type: 'text', text: '' }]

  const urlRegex =
    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%?=~_|])|(\bwww\.[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%?=~_|])|(\b[a-zA-Z0-9.-]{2,}\.[a-zA-Z]{2,6}\b(?:\/[-A-Z0-9+&@#%?=~_|!:,.;]*)?(?![^<]*?>|[^<>]*?<\/[^<>]*?>))/gi

  const segments = []
  let lastIndex = 0
  let match

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: text.substring(lastIndex, match.index) })
    }

    let matchedString = match[0]
    let url = matchedString

    if (!url.match(/^(https?|ftp|file):\/\//i)) {
      url = 'https://' + url
    }
    segments.push({ type: 'link', text: matchedString, url: url })

    lastIndex = urlRegex.lastIndex
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.substring(lastIndex) })
  }

  if (segments.length === 0 && text) {
    segments.push({ type: 'text', text: text })
  }

  return segments
}

// ---------------------

// --- Message Handling ---
const scrollToBottom = (behavior = 'smooth') => {
  nextTick(() => {
    const messageArea = messageAreaRef.value
    if (messageArea) {
      messageArea.scrollTo({ top: messageArea.scrollHeight, behavior: behavior })
    }
  })
}

const addMessage = (payload, sender = 'User', imagePreviewUrl = null) => {
  let messageText = ''
  let messageSender = sender
  let isError = false

  if (typeof payload === 'string') {
    messageText = payload
  } else if (typeof payload === 'object' && payload !== null) {
    if (payload.error === true) {
      messageText = payload.text || 'An unspecified error occurred.'
      messageSender = 'System'
      isError = true
    } else if (typeof payload.aiText === 'string') {
      messageText = payload.aiText
      messageSender = 'AI'
    } else if (typeof payload.text === 'string' && sender === 'System') {
      // Allow passing {text: '...'} for system messages directly
      messageText = payload.text
      messageSender = 'System'
    } else {
      console.warn('Invalid object payload for addMessage:', payload)
      messageText = payload.text || JSON.stringify(payload)
      messageSender = 'System'
      isError = true
    }
  } else {
    console.error('Invalid payload type passed to addMessage:', payload)
    return
  }

  // Allow empty system messages if needed, but prevent empty user/AI unless image
  if (messageText.trim() === '' && !imagePreviewUrl && messageSender !== 'System') {
    console.warn('Attempted to add an empty user/AI message.')
    return
  }

  // Avoid adding duplicate "AI is thinking..." messages
  if (
    messageSender === 'AI' &&
    messageText === 'AI is thinking...' &&
    messages.value.some((msg) => msg.text === 'AI is thinking...')
  ) {
    return
  }

  const newMessage = {
    id: Date.now() + Math.random(),
    text: messageText.trim(), // Trim here
    sender: messageSender,
    timestamp: Date.now(),
    imagePreviewUrl: imagePreviewUrl,
  }

  messages.value.push(newMessage)

  scrollToBottom('smooth')

  if (
    messageSender === 'AI' &&
    !isError &&
    isTtsEnabled.value &&
    newMessage.text !== 'AI is thinking...' &&
    newMessage.text // Ensure text is not empty before speaking
  ) {
    speakText(newMessage.text)
  }
}
// -----------------------

// --- API Call Logic --- MODIFIED ---
const callBackendApi = async (inputText, imageFile) => {
  const NETLIFY_FUNCTION_URL = '/.netlify/functions/call-gemini'
  let imageFileData = null

  if (imageFile) {
    try {
      imageFileData = await readFileAsBase64(imageFile)
    } catch (error) {
      console.error('Error reading image file for backend API call:', error)
      return { error: true, text: 'Error processing the image file before sending.' }
    }
  }

  // Prepare payload, including assistant instructions if available (NEW)
  const payload = {
    history: chatHistoryForApi.value,
    inputText: inputText.trim(),
    imageFile: imageFileData,
    assistantInstructions: props.assistantConfig?.instructions || null, // Pass instructions
  }

  console.log('Sending payload to backend:', payload) // Log the payload

  try {
    console.log('Calling Netlify function:', NETLIFY_FUNCTION_URL)
    const response = await fetch(NETLIFY_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const rawText = await response.text()

    if (!response.ok) {
      let errorPayload = { error: `Function returned HTTP status ${response.status}` }
      try {
        const parsedError = JSON.parse(rawText)
        if (parsedError.error) {
          errorPayload.error = parsedError.error
        }
      } catch (e) {
        console.warn('Non-JSON error response from function:', rawText.substring(0, 100) + '...')
        errorPayload.error += `: ${rawText.substring(0, 100)}...`
      }
      throw new Error(errorPayload.error)
    }

    let responseData
    try {
      responseData = JSON.parse(rawText)
    } catch (e) {
      console.error('Failed to parse successful response JSON:', e)
      console.error('Raw text from successful response:', rawText)
      throw new Error(
        `Received invalid JSON from backend function even though status was OK. Content: ${rawText.substring(0, 100)}...`,
      )
    }

    if (responseData.error) {
      throw new Error(responseData.error)
    }

    if (
      responseData.blockReason &&
      responseData.blockReason !== 'STOP' &&
      responseData.blockReason !== 'MAX_TOKENS'
    ) {
      const safetyFeedback = responseData.safetyRatings
        ? ` Ratings: ${JSON.stringify(responseData.safetyRatings)}`
        : ''
      console.warn(`AI response blocked due to: ${responseData.blockReason}`)
      return {
        error: true,
        text: `Response blocked by safety filters (${responseData.blockReason}).${safetyFeedback}`,
      }
    }

    if (typeof responseData.aiText === 'string') {
      return responseData
    } else {
      console.warn('Received successful response but aiText is missing or invalid:', responseData)
      return { error: true, text: '[AI response received, but content is missing or invalid]' }
    }
  } catch (error) {
    console.error('Error during callBackendApi:', error)
    return { error: true, text: `Failed to get response: ${error.message}` }
  }
}
// --- END API Call Logic --- MODIFIED ---

// --- Send Button Flash Animation ---
const triggerSendFlash = () => {
  const button = sendButtonRef.value
  if (button) {
    button.classList.remove('flash-active')
    void button.offsetWidth
    button.classList.add('flash-active')
    setTimeout(() => {
      if (button) {
        button.classList.remove('flash-active')
      }
    }, 300)
  }
}
// -------------------------------

// --- Send Message Action ---
const sendMessage = async () => {
  const currentInput = userInput.value
  const currentFile = selectedFile.value
  const currentPreview = selectedImagePreview.value

  if (isLoading.value || (currentInput.trim() === '' && !currentFile)) {
    return
  }

  triggerSendFlash()

  let userMessageText = currentInput.trim()
  if (currentFile && userMessageText === '') {
    userMessageText = `[Sent Image: ${currentFile.name}]`
  }

  // Don't add user message if it's truly empty (even after image placeholder check)
  if (userMessageText === '' && !currentPreview) return

  addMessage(userMessageText, 'User', currentPreview)

  const textToSend = currentInput
  const imageToSend = currentFile

  userInput.value = ''
  removeSelectedImage()

  nextTick(() => {
    if (inputAreaRef.value) {
      inputAreaRef.value.style.height = 'auto'
      autoGrowTextarea({ target: inputAreaRef.value })
    }
    const basePlaceholder = activeAssistantName.value
      ? `Ask ${activeAssistantName.value} something...`
      : placeholders[0]
    currentPlaceholder.value = basePlaceholder
  })

  isLoading.value = true
  addMessage('AI is thinking...', 'AI')
  scrollToBottom('smooth')

  const apiResponse = await callBackendApi(textToSend, imageToSend)

  const thinkingIndex = messages.value.findIndex((msg) => msg.text === 'AI is thinking...')
  if (thinkingIndex !== -1) {
    messages.value.splice(thinkingIndex, 1)
  }

  // Handle response (which might be an error object or success object)
  addMessage(apiResponse, 'AI') // addMessage now handles object structure

  isLoading.value = false

  nextTick(() => {
    inputAreaRef.value?.focus()
  })
}

// -------------------------
</script>

<style scoped>
/* Styles specific to the chat view - USING CSS Variables */
.chat-view {
  height: 100%;
  display: flex;
  flex-direction: column; /* Arrange elements vertically */
  background-color: var(--bg-main-content); /* Use variable */
  color: var(--text-primary); /* Use variable */
}

/* --- Testing Assistant Header (NEW) --- */
.testing-assistant-header {
  padding: 0.4rem 1rem;
  background-color: color-mix(
    in srgb,
    var(--accent-color-primary) 15%,
    var(--bg-header)
  ); /* Subtle green tint */
  color: var(--text-light);
  text-align: center;
  font-size: 0.9em;
  font-weight: 500;
  flex-shrink: 0; /* Prevent shrinking */
  border-bottom: 1px solid
    color-mix(in srgb, var(--accent-color-primary) 50%, var(--border-color-heavy));
  user-select: none;
  -webkit-user-select: none;
}
/* --- End Testing Assistant Header --- */

.message-display-area {
  flex-grow: 1; /* Take up most of the vertical space */
  overflow-y: auto; /* Allow scrolling for messages */
  padding: 1rem;
  background-color: var(--bg-main-content); /* Use variable */
  display: flex;
  flex-direction: column; /* Stack messages vertically */
}

/* Container for avatar + message bubble */
.message-container {
  display: flex;
  margin-bottom: 0.75rem;
  max-width: 85%; /* Container max width */
  opacity: 0; /* Start hidden for animation */
  transform: translateY(10px);
  animation: fadeIn 0.3s ease forwards;
  position: relative; /* Needed for copy button positioning */
}
/* Allow clicking AI messages for TTS */
.ai-container {
  cursor: pointer;
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
  background-color: var(--bg-avatar-ai); /* Use variable */
  color: var(--text-light); /* Use variable */
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9em;
  flex-shrink: 0;
  margin-top: 4px;
  margin-right: 0.5rem;
}
.user-container .avatar-placeholder {
  margin-right: 0;
  margin-left: 0.5rem;
  background-color: var(--bg-avatar-user); /* Use variable */
}
/* Hide avatar placeholder for system messages */
.system-container .avatar-placeholder {
  display: none;
}

.message {
  padding: 0.6rem 1rem;
  border-radius: 18px;
  word-wrap: break-word;
  font-family: sans-serif;
  line-height: 1.45;
  position: relative; /* For timestamp/copy button positioning if needed */
  min-width: 50px; /* Prevent tiny bubbles */
  display: flex;
  flex-direction: column; /* Stack text/image/timestamp */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); /* Subtle shadow for depth */
}

.user-message {
  background-color: var(--bg-message-user); /* Use variable */
  color: var(--text-message-user); /* Use variable */
  border-bottom-right-radius: 6px; /* Slightly point towards avatar */
}

.ai-message {
  background-color: var(--bg-message-ai); /* Use variable */
  color: var(--text-message-ai); /* Use variable */
  border-bottom-left-radius: 6px; /* Slightly point towards avatar */
}
/* Style links within messages using :deep selector */
.message-text :deep(a) {
  color: var(--text-link); /* Use variable */
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
.message-text :deep(a:hover) {
  color: var(--text-link-hover); /* Use variable */
  text-decoration: none; /* Optional: remove underline on hover */
}

/* System messages (errors, info) styling */
.system-message {
  background-color: var(--bg-message-info); /* Use neutral info background */
  color: var(--text-secondary); /* Use secondary text color */
  width: 100%;
  text-align: center;
  font-style: italic;
  font-size: 0.9em;
  border: 1px dashed var(--border-color-medium); /* Use medium border */
  border-radius: 8px;
  padding-top: 0.8rem;
  padding-bottom: 0.8rem;
  margin-left: auto; /* Center within the container */
  margin-right: auto;
  max-width: 90%; /* Limit width */
  box-shadow: none; /* Remove shadow from system messages */
}
/* Specific styling for error system messages */
.system-message[data-error='true'] {
  /* You might need JS to add this attribute */
  background-color: var(--bg-message-error); /* Use variable */
  color: var(--text-message-error); /* Use variable */
  border-color: var(--border-color-error); /* Use variable */
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
  object-fit: contain; /* Show whole image within bounds */
  border: 1px solid var(--border-color-light); /* Use variable */
  align-self: flex-start; /* Align image to start of bubble */
}

.timestamp {
  font-size: 0.7em;
  color: var(--text-timestamp); /* Use variable */
  margin-top: 0.3rem;
  text-align: right;
  user-select: none; /* Prevent accidental selection */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  width: 100%; /* Ensure it takes full width for text-align */
}

/* Copy button positioning and style */
.copy-button {
  position: absolute;
  bottom: 2px;
  right: -30px; /* Position outside the bubble to the right */
  background-color: transparent;
  border: none;
  color: var(--text-secondary); /* Use variable */
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
    color 0.2s ease;
  z-index: 1; /* Ensure it's clickable */
  padding: 0;
}
/* Show copy button on AI message hover */
.ai-container:hover .copy-button {
  opacity: 0.6;
}
.copy-button:hover {
  opacity: 1;
  color: var(--text-primary); /* Use variable */
}
.copy-button:disabled {
  cursor: default;
  opacity: 0.8; /* Show feedback clearly */
}

.placeholder-message {
  color: var(--text-placeholder); /* Use variable */
  font-style: italic;
  font-family: sans-serif;
  text-align: center;
  margin: 2rem auto; /* Center vertically/horizontally */
}

.loading-indicator {
  color: var(--text-secondary); /* Use variable */
  font-style: normal;
  animation: pulse 1.5s infinite ease-in-out;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

/* Image preview area above input */
.image-preview-area {
  padding: 0.5rem 0.75rem 0.5rem;
  margin: 0 0.75rem; /* Match input area horizontal padding */
  background-color: var(--bg-sidebar); /* Use variable, matches sidebar bg */
  border: 1px solid var(--border-color-medium); /* Use variable */
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
  border: 1px solid var(--border-color-light); /* Use variable */
  object-fit: cover; /* Cover the area */
}
.remove-image-button {
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 0.8em;
  line-height: 1; /* Center the 'X' */
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

/* Main input area styling */
.input-area {
  display: flex;
  align-items: flex-end; /* Align items to bottom (for textarea growth) */
  padding: 0.75rem;
  background-color: var(--bg-input-area); /* Use variable */
  flex-shrink: 0; /* Prevent shrinking */
  gap: 0.5rem; /* Space between buttons/input */
  border-radius: 0 0 8px 8px; /* Default: round bottom corners */
  border-top: 1px solid var(--border-color-medium); /* Use variable */
}
/* Remove top border and make square if image preview IS showing */
.chat-view:has(.image-preview-area) .input-area {
  border-top: none;
  border-radius: 0;
}

.input-area textarea {
  flex-grow: 1; /* Take available horizontal space */
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color-medium); /* Use variable */
  border-radius: 15px; /* Rounded corners */
  resize: none; /* Disable manual resize handle */
  font-family: sans-serif;
  font-size: 1em;
  min-height: 40px; /* Minimum height = button height */
  max-height: 150px; /* Limit growth */
  overflow-y: auto; /* Allow scrolling if max height exceeded */
  line-height: 1.4;
  background-color: var(--bg-input-field); /* Use variable */
  color: var(--text-primary); /* Use variable */
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.input-area textarea::placeholder {
  color: var(--text-placeholder); /* Use variable */
}

/* --- TEXTAREA HOVER STATE --- */
.input-area textarea:hover:not(:focus):not(:disabled) {
  border-color: var(--accent-color-primary); /* Use green accent on hover */
}
/* --- END TEXTAREA HOVER STATE --- */

/* --- TEXTAREA FOCUS STATE --- */
.input-area textarea:focus {
  outline: none; /* Remove default browser outline */
  border-color: var(--accent-color-primary); /* Use NEON GREEN for border */
  box-shadow: var(
    --input-focus-shadow,
    0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent)
  ); /* Green glow with fallback */
}
/* --- END TEXTAREA FOCUS STATE --- */

.input-area textarea:disabled {
  background-color: color-mix(in srgb, var(--bg-input-field) 50%, var(--bg-input-area));
  cursor: not-allowed;
  opacity: 0.7;
}

/* General Button styles in input area */
.input-area button {
  padding: 0.5rem;
  border: none;
  border-radius: 50%; /* Make icon buttons circular */
  cursor: pointer;
  min-height: 40px; /* Match textarea min-height */
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em; /* Adjust icon size */
  flex-shrink: 0; /* Prevent buttons shrinking */
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

/* Specific Icon Button styles (Attach, Mic) */
.icon-button {
  background-color: var(--bg-button-secondary); /* Use variable */
  color: var(--text-button-secondary); /* Use variable */
}
.icon-button:hover:not(:disabled) {
  background-color: var(--bg-button-secondary-hover); /* Use variable */
}

/* Microphone button listening state */
.icon-button.listening {
  background-color: var(--bg-button-listening); /* Use variable */
  color: var(--text-button-listening); /* Use variable */
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

/* Send Button styles */
.send-button {
  background-color: var(--bg-button-primary); /* Use variable */
  color: var(--text-button-primary); /* Use variable */
  border-radius: 15px; /* Match textarea radius */
  padding: 0.5rem 1rem; /* More padding for text button */
  font-size: 1em;
  font-weight: 500;
  min-width: auto; /* Allow button to size to content */
}
.send-button:hover:not(:disabled) {
  background-color: var(--bg-button-primary-hover); /* Use variable */
}
.send-button:disabled {
  background-color: color-mix(in srgb, var(--bg-button-primary) 50%, var(--bg-input-area));
}
/* Flash animation for send button */
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
    background-color: var(--bg-button-primary-flash); /* Use Variable */
  }
  100% {
    transform: scale(1);
    background-color: var(--bg-button-primary);
  }
}

/* TTS Toggle Button */
.tts-button {
  background-color: var(--bg-button-secondary); /* Use variable */
  color: var(--text-button-secondary); /* Use variable */
  font-size: 1.1em; /* Slightly larger icon */
}
.tts-button.tts-on {
  background-color: var(--bg-button-tts-on); /* Use Variable */
  color: var(--text-button-tts-on); /* Use Variable */
}
.tts-button:hover:not(.tts-on):not(:disabled) {
  background-color: var(--bg-button-secondary-hover); /* Use variable */
}
.tts-button.tts-on:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--bg-button-tts-on) 90%, #000000);
}
</style>
