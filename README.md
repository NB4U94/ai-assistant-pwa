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

                target="\_blank"

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

        accept="image/\*"

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

        :disabled="isLoading"

      >

        <span v-if="!isListening">🎙️</span>

        <span v-else>🔘</span>

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

        @click="toggleTts"

        :class="['tts-button', 'icon-button', isTtsEnabled ? 'tts-on' : 'tts-off']"

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

// *** FULL SCRIPT SECTION - Identical to the last fully correct version ***

import { ref, nextTick, computed, onMounted, onUnmounted, watch } from 'vue'

import { useAssistantsStore } from '@/stores/assistantsStore'

import { useSettingsStore } from '@/stores/settingsStore' // Import settings store

import { storeToRefs } from 'pinia'



// --- Props ---

const props = defineProps({

  assistantConfig: { type: Object, required: false, default: null },

})



// --- Store Setup ---

const assistantsStore = useAssistantsStore()

const settingsStore = useSettingsStore() // Get settings store instance



// Use storeToRefs for reactive access

const { assistants: availableAssistants, getAssistantById } = storeToRefs(assistantsStore)

const { isTtsEnabled, selectedVoiceUri } = storeToRefs(settingsStore) // Get reactive state from settings store



// --- Refs ---

const messageAreaRef = ref(null)

const inputAreaRef = ref(null)

const sendButtonRef = ref(null)

const fileInputRef = ref(null)



// --- Reactive State ---

const userInput = ref('')

const messages = ref([]) // Stores { id, text, sender, timestamp, imagePreviewUrl?, isError? }

const isLoading = ref(false)

// isTtsEnabled removed - using store's ref now

const synth = window.speechSynthesis

const ttsSupported = ref(!!synth)

const availableVoices = ref([]) // Store fetched voices locally in ChatView for speaking

const selectedImagePreview = ref(null) // Holds the data URL for image preview

const selectedFile = ref(null) // Holds the actual File object

const selectedAssistantId = ref(null) // NEW: Track selected assistant ID (null for default)



// --- Speech Recognition State ---

const isListening = ref(false)

const recognition = ref(null)

const speechSupported = ref(false)

// -----------------------------



// --- Computed Properties ---

// Determines the currently active assistant (either from prop or selection)

const activeAssistant = computed(() => {

  if (props.assistantConfig) return props.assistantConfig

  if (selectedAssistantId.value) return getAssistantById.value(selectedAssistantId.value)

  return null

})

const activeAssistantName = computed(() => activeAssistant.value?.name || 'Default AI')

const chatHistoryForApi = computed(() =>

  messages.value

    .filter((msg) => (msg.sender === 'User' || msg.sender === 'AI') && !msg.isError) // Exclude errors

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

  // Setup placeholder interval (unchanged)

  let placeholderIndex = 0

  placeholderInterval = setInterval(() => {

    placeholderIndex = (placeholderIndex + 1) % placeholders.length

    if (!userInput.value && !selectedImagePreview.value) {

      const basePlaceholder = activeAssistant.value

        ? `Ask ${activeAssistant.value.name}...`

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

  // Fetch TTS voices (unchanged)

  if (ttsSupported.value && synth) {

    const loadVoices = () => {

      availableVoices.value = synth.getVoices().sort((a, b) => a.name.localeCompare(b.name))

      if (availableVoices.value.length > 0) {

        console.log('ChatView: Voices loaded:', availableVoices.value.length)

        if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = null

      } else {

        setTimeout(() => {

          const vr = synth.getVoices()

          if (vr.length > 0) {

            availableVoices.value = vr.sort((a, b) => a.name.localeCompare(b.name))

            console.log('ChatView: Voices loaded retry:', availableVoices.value.length)

          } else {

            console.warn('ChatView: Voices not loaded after retry.')

          }

        }, 500)

      }

    }

    if (synth.getVoices().length > 0) loadVoices()

    else if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices

    else setTimeout(loadVoices, 500)

  }

  // Initial setup based on props (unchanged)

  if (props.assistantConfig) {

    selectedAssistantId.value = props.assistantConfig.id

    addMessage({ text: `Testing: ${props.assistantConfig.name}.` }, 'System')

  } else {

    console.log('ChatView mounted (main view).')

  }

})

onUnmounted(() => {

  // Cleanup (unchanged)

  clearInterval(placeholderInterval)

  if (synth) synth.cancel()

  if (recognition.value) recognition.value.abort()

})



// --- Watcher (unchanged) ---

watch(

  () => props.assistantConfig,

  (newConfig, oldConfig) => {

    if (newConfig !== oldConfig && props.assistantConfig) {

      messages.value = []

      selectedAssistantId.value = newConfig?.id || null

      if (newConfig) addMessage({ text: `Testing: ${newConfig.name}.` }, 'System')

      userInput.value = ''

      removeSelectedImage()

      scrollToBottom('auto')

    }

  },

  { immediate: false },

)



// --- Assistant Selection (unchanged) ---

const selectAssistant = (assistantId) => {

  if (props.assistantConfig) return

  if (selectedAssistantId.value === assistantId) return

  selectedAssistantId.value = assistantId

  messages.value = []

  const selAsst = activeAssistant.value

  addMessage({ text: `Switched to ${selAsst?.name || 'Default AI'}.` }, 'System')

  userInput.value = ''

  removeSelectedImage()

  scrollToBottom('auto')

  inputAreaRef.value?.focus()

  const p = selAsst ? `Ask ${selAsst.name}...` : placeholders[0]

  currentPlaceholder.value = p

}



// --- Speech Recognition --- (Full implementation - unchanged)

const setupSpeechRecognition = () => {

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition

  if (SR) {

    speechSupported.value = true

    try {

      recognition.value = new SR()

      recognition.value.continuous = false

      recognition.value.lang = 'en-US'

      recognition.value.interimResults = false

      recognition.value.maxAlternatives = 1

      recognition.value.onresult = (e) => {

        const t = e.results?.[0]?.[0]?.transcript

        if (t) {

          userInput.value += (userInput.value ? ' ' : '') + t

          nextTick(() => {

            if (inputAreaRef.value) autoGrowTextarea({ target: inputAreaRef.value })

          })

        }

      }

      recognition.value.onerror = (e) => {

        console.error('Speech Err:', e.error, e.message)

        let m = `Speech Err: ${e.error}`

        if (['not-allowed', 'service-not-allowed'].includes(e.error)) m = 'Mic access denied.'

        else if (e.error === 'no-speech') m = 'No speech.'

        else if (e.error === 'audio-capture') m = 'Mic problem.'

        addMessage({ isError: true, text: m }, 'System')

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

      console.error('SR init Err:', e)

      speechSupported.value = false

      addMessage({ isError: true, text: 'Speech init failed.' }, 'System')

    }

  } else {

    speechSupported.value = false

  }

}

const startListening = () => {

  if (!speechSupported.value || !recognition.value || isListening.value) return

  try {

    recognition.value.start()

  } catch (e) {

    console.error(`Start Err: ${e.name}`, e)

    if (e.name !== 'InvalidStateError')

      addMessage({ isError: true, text: `Voice start Err: ${e.message}` }, 'System')

    isListening.value = false

  }

}

const stopListening = () => {

  if (!speechSupported.value || !recognition.value || !isListening.value) return

  try {

    recognition.value.stop()

  } catch (e) {

    console.warn('Stop Err:', e)

    isListening.value = false

  }

}

const toggleListening = () => {

  if (!speechSupported.value) {

    addMessage({ isError: true, text: 'Voice not supported.' }, 'System')

    return

  }

  if (isListening.value) stopListening()

  else startListening()

}



// --- File Input Handling --- (Full implementation - unchanged)

const triggerFileInput = () => {

  fileInputRef.value?.click()

}

const readFileAsBase64 = (file) => {

  return new Promise((res, rej) => {

    const r = new FileReader()

    r.onload = () => {

      const b = r.result?.toString().split(',')[1]

      if (b) res({ base64Data: b, mimeType: file.type })

      else rej(new Error('Base64 read fail.'))

    }

    r.onerror = (e) => rej(e)

    r.readAsDataURL(file)

  })

}

const handleFileSelected = async (event) => {

  const f = event.target.files?.[0]

  if (!f) {

    removeSelectedImage()

    return

  }

  if (!f.type.startsWith('image/')) {

    addMessage({ isError: true, text: `Invalid type: ${f.name}` }, 'System')

    removeSelectedImage()

    return

  }

  const maxMB = 4

  if (f.size > maxMB * 1024 * 1024) {

    addMessage({ isError: true, text: `Too large (>${maxMB}MB): ${f.name}` }, 'System')

    removeSelectedImage()

    return

  }

  selectedFile.value = f

  const pR = new FileReader()

  pR.onload = (e) => {

    selectedImagePreview.value = e.target?.result

    currentPlaceholder.value = 'Image selected.'

  }

  pR.onerror = (e) => {

    console.error('Preview Err:', e)

    addMessage({ isError: true, text: 'Preview read error.' }, 'System')

    removeSelectedImage()

  }

  pR.readAsDataURL(f)

  event.target.value = null

}

const removeSelectedImage = () => {

  selectedImagePreview.value = null

  selectedFile.value = null

  if (fileInputRef.value) fileInputRef.value.value = null

  if (!userInput.value) {

    const p = activeAssistant.value ? `Ask ${activeAssistant.value.name}...` : placeholders[0]

    currentPlaceholder.value = p

  }

}



// --- Textarea Auto-Grow --- (Full implementation - unchanged)

const autoGrowTextarea = (event) => {

  const t = event.target

  t.style.height = 'auto'

  const maxH = 150

  t.style.height = `${Math.min(t.scrollHeight, maxH)}px`

}



// --- Text-to-Speech (TTS) --- (Full implementation - unchanged, uses store state)

const speakText = (text) => {

  if (!ttsSupported.value || !synth || !text || !isTtsEnabled.value) return

  if (synth.speaking) {

    synth.cancel()

    setTimeout(() => {

      trySpeak(text)

    }, 50)

  } else {

    trySpeak(text)

  }

}

const trySpeak = (text) => {

  const u = new SpeechSynthesisUtterance(text)

  if (selectedVoiceUri.value && availableVoices.value.length > 0) {

    const v = availableVoices.value.find((v) => v.voiceURI === selectedVoiceUri.value)

    if (v) u.voice = v

    else console.warn(`Voice URI ${selectedVoiceUri.value} not found.`)

  }

  u.onerror = (e) => {

    console.error(`TTS Err: ${e.error}`)

    if (!['interrupted', 'canceled'].includes(e.error))

      addMessage({ isError: true, text: `Speech Err: ${e.error}` }, 'System')

  }

  synth.speak(u)

}

const handleMessageClick = (text) => {

  if (isTtsEnabled.value) speakText(text)

}

const toggleTts = () => {

  if (!ttsSupported.value) {

    addMessage({ isError: true, text: 'TTS not supported.' }, 'System')

    return

  }

  settingsStore.setTtsEnabled(!isTtsEnabled.value)

  if (!settingsStore.isTtsEnabled && synth.speaking) synth.cancel()

}



// --- Timestamp Formatting --- (Full implementation - unchanged)

const formatTimestamp = (ts) => {

  if (!ts) return ''

  try {

    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })

  } catch (e) {

    return '?'

  }

}



// --- Copy to Clipboard --- (Full implementation - unchanged)

const copyText = async (text, event) => {

  if (!navigator.clipboard) {

    addMessage({ isError: true, text: 'Clipboard unavailable.' }, 'System')

    return

  }

  try {

    await navigator.clipboard.writeText(text)

    const b = event?.currentTarget

    if (b) {

      const o = b.innerHTML

      b.innerHTML = '✅'

      b.disabled = true

      setTimeout(() => {

        if (b) {

          b.innerHTML = o

          b.disabled = false

        }

      }, 1500)

    }

  } catch (err) {

    console.error('Copy Err:', err)

    addMessage({ isError: true, text: `Copy failed: ${err.message}` }, 'System')

  }

}



// --- Link Processing --- (Full implementation - unchanged)

const processMessageText = (text) => {

  if (!text) return [{ type: 'text', text: '' }]

  const r =

    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%?=~_|])|(\bwww\.[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%?=~_|])(?![^<]*?>|[^<>]*?<\/(a|button|textarea|input)[^<>]*?>)/gi

  const s = []

  let l = 0

  let m

  while ((m = r.exec(text)) !== null) {

    if (m.index > l) s.push({ type: 'text', text: text.substring(l, m.index) })

    let u = m[0]

    if (!u.match(/^(https?|ftp|file):\/\//i)) u = 'https://' + u

    s.push({ type: 'link', text: m[0], url: u })

    l = r.lastIndex

  }

  if (l < text.length) s.push({ type: 'text', text: text.substring(l) })

  if (s.length === 0 && text) s.push({ type: 'text', text: text })

  return s

}



// --- Message Handling --- (Full implementation - unchanged, includes aiText fix)

const scrollToBottom = (behavior = 'smooth') => {

  nextTick(() => {

    const el = messageAreaRef.value

    if (el) el.scrollTo({ top: el.scrollHeight, behavior: behavior })

  })

}

const addMessage = (payload, sender = 'User', imagePreviewUrl = null) => {

  let txt = ''

  let snd = sender

  let err = false

  if (typeof payload === 'string') txt = payload

  else if (typeof payload === 'object' && payload !== null) {

    err = payload.isError === true

    snd = payload.sender || sender

    if (err) {

      txt = payload.text || 'Error.'

      snd = 'System'

    } else if (typeof payload.aiText === 'string') {

      txt = payload.aiText

      snd = 'AI'

    } else if (snd === 'System' && typeof payload.text === 'string') txt = payload.text

    else {

      txt = JSON.stringify(payload)

      snd = 'System'

      err = true

    }

  } else return

  const trimTxt = txt.trim()

  if (trimTxt === '' && !imagePreviewUrl && snd !== 'System') {

    if (!(snd === 'User' && txt.startsWith('[Sent Image:'))) return

  }

  const newMsg = {

    id: Date.now() + Math.random(),

    text: trimTxt,

    sender: snd,

    timestamp: Date.now(),

    imagePreviewUrl: imagePreviewUrl,

    isError: err,

  }

  messages.value.push(newMsg)

  scrollToBottom('smooth')

  if (snd === 'AI' && !err && isTtsEnabled.value && newMsg.text) speakText(newMsg.text)

}



// --- API Call Logic --- (Full implementation - unchanged)

const callBackendApi = async (inputText, imageFile) => {

  const URL = '/.netlify/functions/call-gemini'

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

    const r = await fetch(URL, {

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

    if (typeof d.aiText === 'string') return d

    else return { isError: true, text: '[Invalid AI content]' }

  } catch (e) {

    return { isError: true, text: `API Error: ${e.message}` }

  }

}



// --- Send Button Flash --- (Keep original version)

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



// --- Send Message Action --- (Full implementation, no thinking message)

const sendMessage = async () => {

  const txt = userInput.value

  const file = selectedFile.value

  const preview = selectedImagePreview.value

  if (isLoading.value || (txt.trim() === '' && !file)) return

  /* triggerSendFlash(); Don't trigger flash if using plasma animation */ let userMsg = txt.trim()

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

  isLoading.value = true

  scrollToBottom('smooth')

  const apiResp = await callBackendApi(txtToSend, imgToSend)

  addMessage(apiResp)

  isLoading.value = false

  nextTick(() => {

    inputAreaRef.value?.focus()

  })

}

// --- End Full Script ---

</script>

<style scoped>

/* --- Styles include previous fixes + NEW icon button styles --- */

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

@keyframes pulse-red {

  0%,

  100% {

    box-shadow: 0 0 0 0px color-mix(in srgb, var(--bg-button-listening) 70%, transparent);

  }

  50% {

    box-shadow: 0 0 0 5px color-mix(in srgb, var(--bg-button-listening) 0%, transparent);

  }

}



/* --- Send Button --- */

.send-button {

  /* Inherits .icon-button size/shape/etc */

  background-color: var(--bg-button-primary);

  color: var(--text-button-primary);

  font-size: 1.5em; /* Make arrow larger */

  padding: 0.5rem 0.5rem; /* Adjusted padding */

  line-height: 1; /* Better vertical centering for arrow */

}

.send-button:hover:not(:disabled) {

  background-color: var(--bg-button-primary-hover);

}

.send-button:disabled {

  background-color: color-mix(in srgb, var(--bg-button-primary) 50%, var(--bg-input-area));

}

/* Plasma Animation for Send Button */

.send-button-plasma:not(:disabled) {

  animation: plasma-arrow-pulse 2s infinite ease-in-out;

  box-shadow: 0 0 5px 1px color-mix(in srgb, var(--accent-color-primary) 30%, transparent);

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



/* --- TTS Button --- */

.tts-button {

  /* Inherits .icon-button size/shape */

  background-color: var(--bg-button-secondary); /* Off state */

  color: var(--text-button-secondary);

  font-size: 1.1em;

  border: 1px solid transparent; /* Add transparent border to maintain size */

}

.tts-button.tts-on {

  /* ON state */

  background-color: var(--accent-color-primary); /* Green background */

  color: var(--bg-input-area); /* Dark icon on green */

  border-color: var(--accent-color-primary);

}

.tts-button:hover:not(:disabled) {

  /* Slightly darker secondary for OFF hover */

  background-color: var(--bg-button-secondary-hover);

  border-color: transparent;

}

.tts-button.tts-on:hover:not(:disabled) {

  /* Slightly darker green for ON hover */

  background-color: color-mix(in srgb, var(--accent-color-primary) 90%, #000000);

  border-color: color-mix(in srgb, var(--accent-color-primary) 90%, #000000);

  color: var(--bg-input-area);

}



/* --- Loading Indicator Styles (Enhanced) --- */

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

.loading-indicator-visual::before,

.loading-indicator-visual::after {

  content: '';

  position: absolute;

  top: 50%;

  left: 50%;

  width: 2px;

  height: 10px;

  background-color: var(--accent-color-primary);

  border-radius: 1px;

  transform-origin: 50% 50%;

  animation: plasma-shoot 0.6s infinite linear;

  opacity: 0;

  box-shadow: 0 0 3px 1px color-mix(in srgb, var(--accent-color-primary) 80%, transparent);

}

.loading-indicator-visual::before {

  transform: translate(-50%, -50%) rotate(0deg);

  --angle: 0deg;

}

.loading-indicator-visual::after {

  transform: translate(-50%, -50%) rotate(90deg);

  animation-delay: -0.3s;

  --angle: 90deg;

}

@keyframes plasma-shoot {

  0% {

    transform: translate(-50%, -50%) scale(0.8) rotate(var(--angle, 0deg));

    opacity: 0.9;

    height: 8px;

  }

  70% {

    opacity: 0.3;

    height: 20px;

    transform: translate(-50%, -50%) scale(2.5) rotate(var(--angle, 0deg));

  }

  100% {

    transform: translate(-50%, -50%) scale(3.5) rotate(var(--angle, 0deg));

    opacity: 0;

    height: 3px;

  }

}

</style>
