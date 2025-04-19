<template>
  <div class="chat-view">
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
        No messages yet. Start the conversation!
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
import { ref, nextTick, computed, onMounted, onUnmounted } from 'vue'

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
const messages = ref([]) // Now stores objects like { id, text, sender, timestamp, imagePreviewUrl? }
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
      currentPlaceholder.value = placeholders[placeholderIndex]
    } else if (!selectedImagePreview.value) {
      currentPlaceholder.value = placeholders[0] // Default if image deselected but text exists
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
        // Stop trying once loaded
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
      // Fallback if onvoiceschanged isn't supported reliably
      setTimeout(loadVoices, 500)
    }
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
// ---------------------------

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
          // Ensure textarea grows after speech input
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
        isListening.value = false // Ensure listening state is reset
      }

      recognition.value.onstart = () => {
        isListening.value = true
      }

      recognition.value.onend = () => {
        isListening.value = false
        // Refocus input after speech ends, useful on desktop
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
    // Catch errors like "recognition already started"
    console.error(`Error calling recognition.start(): ${error.name} - ${error.message}`)
    // Provide user feedback if start fails unexpectedly
    if (error.name !== 'InvalidStateError') {
      // Don't show error if it's just already started
      addMessage({ error: true, text: `Could not start voice input: ${error.message}` }, 'System')
    }
    isListening.value = false // Ensure state is correct if start fails
  }
}

const stopListening = () => {
  if (!speechSupported.value || !recognition.value || !isListening.value) return
  try {
    recognition.value.stop()
  } catch (error) {
    // Catch errors like "recognition not started"
    console.error('Error stopping speech recognition:', error)
    // Force listening state off if stop fails or was called inappropriately
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
  // Reads file and returns promise with { base64Data, mimeType }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // result includes the data URL prefix (e.g., "data:image/jpeg;base64,"), remove it.
      const base64String = reader.result?.toString().split(',')[1]
      if (base64String) {
        resolve({ base64Data: base64String, mimeType: file.type })
      } else {
        reject(new Error('Failed to read file as base64 data URL.'))
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file) // Reads the file content as a data URL
  })
}

const handleFileSelected = async (event) => {
  const file = event.target.files?.[0]
  if (!file) {
    removeSelectedImage() // Clear if no file selected
    return
  }

  // Validate Type
  if (!file.type.startsWith('image/')) {
    addMessage(
      { error: true, text: `Selected file (${file.name}) is not a supported image type.` },
      'System',
    )
    removeSelectedImage()
    return
  }

  // Validate Size (e.g., 4MB limit for Gemini API)
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

  selectedFile.value = file // Store the actual File object

  // Generate preview URL (using FileReader again for simplicity)
  const readerPreview = new FileReader()
  readerPreview.onload = (e) => {
    selectedImagePreview.value = e.target?.result // This is the Data URL for the <img> src
    currentPlaceholder.value = 'Image selected. Add a message or send.'
  }
  readerPreview.onerror = (e) => {
    console.error('FileReader error generating preview:', e)
    addMessage({ error: true, text: 'Error reading image file for preview.' }, 'System')
    removeSelectedImage()
  }
  readerPreview.readAsDataURL(file)

  // Reset the file input visually so the same file can be selected again if needed
  event.target.value = null
}

const removeSelectedImage = () => {
  selectedImagePreview.value = null
  selectedFile.value = null
  // Also clear the file input element itself
  if (fileInputRef.value) {
    fileInputRef.value.value = null
  }
  // Reset placeholder if input is also empty
  if (!userInput.value) {
    currentPlaceholder.value = placeholders[0]
  }
}
// -------------------------

// --- Textarea Auto-Grow ---
const autoGrowTextarea = (event) => {
  const textarea = event.target
  textarea.style.height = 'auto' // Temporarily shrink to calculate correct scrollHeight
  const maxHeight = 150 // Max height in pixels
  // Set height to scroll height but not exceeding max height
  textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
}
// -------------------------

// --- Text-to-Speech (TTS) ---
const speakText = (text) => {
  if (!ttsSupported.value || !synth || !text) return

  // Cancel any ongoing speech immediately
  if (synth.speaking) {
    console.log('TTS: Cancelling previous speech.')
    synth.cancel()
  }

  // Use nextTick and a small timeout to ensure cancel finishes before starting new speech
  nextTick(() => {
    setTimeout(() => {
      // Double check if something else started speaking in the meantime
      if (synth.speaking) {
        console.log('TTS: Still speaking after delay, cancelling again.')
        synth.cancel()
        // Add another tiny delay before speaking
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.onerror = (event) => {
            console.error(`TTS onerror event: ${event.error}`)
            // Avoid showing errors for interruptions/cancellations
            if (event.error !== 'interrupted' && event.error !== 'canceled') {
              addMessage({ error: true, text: `Speech synthesis error: ${event.error}` }, 'System')
            }
          }
          synth.speak(utterance)
        }, 50) // Short delay after second cancel
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
    }, 50) // Initial delay after first cancel
  })
}

const handleMessageClick = (textToSpeak) => {
  // Only speak if TTS is currently enabled
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
  // If TTS is turned off while speaking, stop the speech.
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
  // Use browser's default locale for formatting
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

    // Provide visual feedback on the button
    const buttonElement = event?.currentTarget // Use currentTarget
    if (buttonElement) {
      const originalContent = buttonElement.innerHTML
      buttonElement.innerHTML = '✅' // Checkmark feedback
      buttonElement.disabled = true // Briefly disable
      setTimeout(() => {
        if (buttonElement) {
          // Check if button still exists
          buttonElement.innerHTML = originalContent
          buttonElement.disabled = false // Re-enable
        }
      }, 1500) // Duration of feedback
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

  // Regex to find URLs (starting with http/https/ftp/file or www.) and potential domain names
  // This regex is simplified and might capture some false positives (like file.txt)
  // Updated to be slightly less aggressive on domain-like matches without slashes
  const urlRegex =
    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%?=~_|])|(\bwww\.[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%?=~_|])|(\b[a-zA-Z0-9.-]{2,}\.[a-zA-Z]{2,6}\b(?:\/[-A-Z0-9+&@#%?=~_|!:,.;]*)?(?![^<]*?>|[^<>]*?<\/[^<>]*?>))/gi

  const segments = []
  let lastIndex = 0
  let match

  while ((match = urlRegex.exec(text)) !== null) {
    // Add text segment before the link
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: text.substring(lastIndex, match.index) })
    }

    let matchedString = match[0]
    let url = matchedString

    // Prepend https:// if scheme is missing (for www. or domain-like matches)
    if (!url.match(/^(https?|ftp|file):\/\//i)) {
      url = 'https://' + url
    }
    segments.push({ type: 'link', text: matchedString, url: url })

    lastIndex = urlRegex.lastIndex
  }

  // Add any remaining text after the last link
  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.substring(lastIndex) })
  }

  // Handle case where no links were found at all
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

  // Handle different payload types
  if (typeof payload === 'string') {
    messageText = payload
  } else if (typeof payload === 'object' && payload !== null) {
    if (payload.error === true) {
      messageText = payload.text || 'An unspecified error occurred.'
      messageSender = 'System'
      isError = true
    } else if (typeof payload.aiText === 'string') {
      // Assuming payload is { aiText: "..." }
      messageText = payload.aiText
      messageSender = 'AI' // Ensure sender is AI if using aiText structure
    } else {
      console.warn('Invalid object payload for addMessage:', payload)
      // Assign a default error message if structure is unknown but seems like an error object
      messageText = payload.text || JSON.stringify(payload)
      messageSender = 'System'
      isError = true
    }
  } else {
    console.error('Invalid payload type passed to addMessage:', payload)
    return // Don't add message if payload is totally wrong
  }

  // Avoid adding empty messages unless they contain an image
  if (messageText.trim() === '' && !imagePreviewUrl) {
    console.warn('Attempted to add an empty message.')
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
    id: Date.now() + Math.random(), // Simple unique ID
    text: messageText.trim(),
    sender: messageSender,
    timestamp: Date.now(),
    imagePreviewUrl: imagePreviewUrl, // Include the preview URL if provided
  }

  messages.value.push(newMessage)

  // Scroll smoothly for new messages
  scrollToBottom('smooth')

  // Trigger TTS only for valid, non-error AI messages if enabled
  if (
    messageSender === 'AI' &&
    !isError &&
    isTtsEnabled.value &&
    newMessage.text !== 'AI is thinking...'
  ) {
    speakText(newMessage.text)
  }
}
// -----------------------

// --- API Call Logic --- CORRECTED ---
const chatHistoryForApi = computed(() => {
  // Convert messages array to the format Gemini API expects
  return messages.value
    .filter(
      (msg) => (msg.sender === 'User' || msg.sender === 'AI') && msg.text !== 'AI is thinking...',
    )
    .map((msg) => ({
      role: msg.sender === 'User' ? 'user' : 'model',
      parts: [{ text: msg.text }], // Assumes only text for now
    }))
})

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

  const payload = {
    history: chatHistoryForApi.value,
    inputText: inputText.trim(),
    imageFile: imageFileData,
  }

  try {
    console.log('Calling Netlify function:', NETLIFY_FUNCTION_URL)
    const response = await fetch(NETLIFY_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    // Read the response body as text FIRST
    const rawText = await response.text()

    // Check if the HTTP response status indicates failure AFTER reading text
    if (!response.ok) {
      // Try to parse the raw text as JSON to get error details from the function if possible
      let errorPayload = { error: `Function returned HTTP status ${response.status}` }
      try {
        const parsedError = JSON.parse(rawText)
        if (parsedError.error) {
          errorPayload.error = parsedError.error
        }
      } catch (e) {
        // Ignore parsing error if the error response wasn't JSON
        console.warn('Non-JSON error response from function:', rawText.substring(0, 100) + '...')
        // Keep the original HTTP status error message
        errorPayload.error += `: ${rawText.substring(0, 100)}...`
      }
      // Throw using the potentially extracted error message
      throw new Error(errorPayload.error)
    }

    // If response.ok is true, attempt to parse the raw text as JSON
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

    // --- Process the successful JSON data ---

    // Check for application-level errors within the successful response data
    if (responseData.error) {
      // This shouldn't happen if response.ok was true, but check just in case
      throw new Error(responseData.error)
    }

    // Check for block reasons (e.g., safety filters)
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

    // Check if aiText is actually present and a string
    if (typeof responseData.aiText === 'string') {
      return responseData // Return successful data object { aiText: "..." }
    } else {
      console.warn('Received successful response but aiText is missing or invalid:', responseData)
      return { error: true, text: '[AI response received, but content is missing or invalid]' }
    }
  } catch (error) {
    // Catch fetch errors, errors thrown above, etc.
    console.error('Error during callBackendApi:', error)
    return { error: true, text: `Failed to get response: ${error.message}` }
  }
}
// --- END API Call Logic --- CORRECTED ---

// --- Send Button Flash Animation ---
const triggerSendFlash = () => {
  const button = sendButtonRef.value
  if (button) {
    button.classList.remove('flash-active') // Ensure animation restarts if triggered quickly
    // Force reflow to restart animation if needed - slight delay can achieve this
    void button.offsetWidth
    button.classList.add('flash-active')
    // Remove class after animation duration (300ms in CSS)
    setTimeout(() => {
      if (button) {
        // Check button still exists
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
  const currentPreview = selectedImagePreview.value // Get preview URL for user message

  // Prevent sending if already loading or if both input and file are empty
  if (isLoading.value || (currentInput.trim() === '' && !currentFile)) {
    return
  }

  // Trigger visual feedback on send button
  triggerSendFlash()

  // Determine text for the user's message bubble
  let userMessageText = currentInput.trim()
  // If there's an image but no text, create placeholder text for the bubble
  if (currentFile && userMessageText === '') {
    userMessageText = `[Sent Image: ${currentFile.name}]` // More descriptive placeholder
  }

  // Add the user's message to the display (including image preview if present)
  addMessage(userMessageText, 'User', currentPreview)

  // Prepare data to send to the API
  const textToSend = currentInput // Send original text (even if only spaces, API might handle it)
  const imageToSend = currentFile // Send the File object

  // Clear the input field and remove the selected image preview *after* adding the user message
  userInput.value = ''
  removeSelectedImage() // This also resets selectedFile

  // Reset textarea height and placeholder after clearing
  nextTick(() => {
    if (inputAreaRef.value) {
      inputAreaRef.value.style.height = 'auto' // Reset height before recalculating
      autoGrowTextarea({ target: inputAreaRef.value }) // Recalculate
    }
    currentPlaceholder.value = placeholders[0] // Reset placeholder
  })

  // Set loading state and add "thinking" message
  isLoading.value = true
  addMessage('AI is thinking...', 'AI') // Add placeholder AI message
  scrollToBottom('smooth') // Ensure "thinking" message is visible

  // Call the backend API function
  const apiResponse = await callBackendApi(textToSend, imageToSend)

  // --- Process Response ---
  // Find and remove the "AI is thinking..." message regardless of API outcome
  const thinkingIndex = messages.value.findIndex((msg) => msg.text === 'AI is thinking...')
  if (thinkingIndex !== -1) {
    messages.value.splice(thinkingIndex, 1)
  }

  // Add the actual AI response or error message from the API
  addMessage(apiResponse, 'AI') // addMessage handles {error: true} or {aiText: "..."} objects

  // Clear loading state
  isLoading.value = false

  // Refocus the input area for convenience
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
  background-color: var(--bg-message-error); /* Use variable */
  color: var(--text-message-error); /* Use variable */
  width: 100%;
  text-align: center;
  font-style: italic;
  font-size: 0.9em;
  border: 1px dashed var(--border-color-error); /* Use variable */
  border-radius: 8px;
  padding-top: 0.8rem;
  padding-bottom: 0.8rem;
  margin-left: auto; /* Center within the container */
  margin-right: auto;
  max-width: 90%; /* Limit width */
  box-shadow: none; /* Remove shadow from system messages */
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
  /* Conditional border/radius handled below */
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

/* --- TEXTAREA HOVER STATE (Added) --- */
.input-area textarea:hover:not(:focus):not(:disabled) {
  border-color: var(--accent-color-primary); /* Use green accent on hover */
}
/* --- END TEXTAREA HOVER STATE --- */

/* --- TEXTAREA FOCUS STATE --- */
.input-area textarea:focus {
  outline: none; /* Remove default browser outline */
  border-color: var(--accent-color-primary); /* Use NEON GREEN for border */
  /* Use the dedicated variable for green focus shadow */
  box-shadow: var(
    --input-focus-shadow,
    0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent)
  ); /* Green glow with fallback */
}
/* --- END TEXTAREA FOCUS STATE --- */

.input-area textarea:disabled {
  /* Using color-mix for disabled state, requires modern browser */
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
/* Add slight scale effect on button press */
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
  /* Using color-mix for disabled state, requires modern browser */
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
    transform: scale(1.05); /* Slightly smaller flash */
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
/* Hover state for TTS OFF */
.tts-button:hover:not(.tts-on):not(:disabled) {
  background-color: var(--bg-button-secondary-hover); /* Use variable */
}
/* Hover state for TTS ON */
.tts-button.tts-on:hover:not(:disabled) {
  background-color: color-mix(
    in srgb,
    var(--bg-button-tts-on) 90%,
    /* Darken the 'on' color slightly */ #000000 /* Mix with black */
  );
}
</style>
