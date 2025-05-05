<template>
  <div>
    <div v-if="props.selectedImagePreview" class="image-preview-area">
      <img :src="props.selectedImagePreview" alt="Selected image preview" class="image-preview" />
      <button @click="props.removeSelectedImage" class="remove-image-button" title="Remove image">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          width="12"
          height="12"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>

    <div class="input-area">
      <div class="loading-indicator-visual-container" v-if="props.isSending">
        <div class="loading-indicator-visual"></div>
      </div>

      <FileInputButton :disabled="props.isSending" @file-selected="props.handleFileSelected" />

      <MicButton
        :isListening="props.isListening"
        :speechSupported="props.speechSupported"
        :disabled="props.isSending"
        :toggleListening="props.toggleListening"
      />

      <textarea
        ref="inputAreaRef"
        :value="userInput"
        @input="handleInput"
        :placeholder="props.placeholder"
        rows="1"
        @keydown.enter="props.handleEnterKey"
        :disabled="props.isSending"
        aria-label="Chat message input"
        class="chat-textarea"
      ></textarea>

      <SendButton
        ref="sendButtonRef"
        :disabled="props.isSending || (!userInput?.trim() && !props.selectedFile)"
        :handleSendMessage="props.handleSendMessage"
      ></SendButton>

      <TtsButton
        :isTtsEnabled="props.isTtsEnabled"
        :ttsSupported="props.ttsSupported"
        :disabled="props.isSending"
        :ttsToggle="props.ttsToggle"
      />
    </div>
  </div>
</template>

<script setup>
// Removed defineEmits from import
import { ref, watch, defineProps, defineModel } from 'vue'
import FileInputButton from './FileInputButton.vue'
import MicButton from './MicButton.vue'
import TtsButton from './TtsButton.vue'
import SendButton from './SendButton.vue'

// --- Use defineModel for userInput (replaces prop and emit) ---
const userInput = defineModel('userInput', { type: String, required: true })

// --- Props Definition (userInput removed) ---
const props = defineProps({
  // userInput removed, handled by defineModel
  placeholder: { type: String, default: 'Type a message...' },
  isSending: { type: Boolean, default: false },
  isListening: { type: Boolean, default: false },
  speechSupported: { type: Boolean, default: false },
  ttsSupported: { type: Boolean, default: false },
  isTtsEnabled: { type: Boolean, default: false },
  selectedImagePreview: { type: [String, null], default: null },
  selectedFile: { type: [File, null], default: null },
  handleSendMessage: { type: Function, required: true },
  handleEnterKey: { type: Function, required: true },
  autoGrowTextarea: { type: Function, required: true },
  toggleListening: { type: Function, required: true },
  handleFileSelected: { type: Function, required: true },
  removeSelectedImage: { type: Function, required: true },
  ttsToggle: { type: Function, required: true },
})

// --- Emits Definition (REMOVED) ---
// const emit = defineEmits(['update:userInput']) // No longer needed

// --- Template Refs (Internal) ---
const inputAreaRef = ref(null) // Ref for the <textarea> element
const sendButtonRef = ref(null)

// --- Local Logic ---
// Update handleInput to directly set the model value
const handleInput = (event) => {
  userInput.value = event.target.value // Directly update the model value
  // Autogrow logic remains the same
  if (inputAreaRef.value) {
    props.autoGrowTextarea({ target: inputAreaRef.value })
  }
}

// Watcher now watches the model ref directly
watch(
  userInput, // Watch the model ref
  (newValue) => {
    if (inputAreaRef.value) {
      if (!newValue) {
        // Reset height if input is cleared
        inputAreaRef.value.style.height = 'auto'
      }
      // Still call autogrow on change
      props.autoGrowTextarea({ target: inputAreaRef.value })
    }
  },
)

// --- Methods to be Exposed ---
const triggerNestedSendAnimation = () => {
  sendButtonRef.value?.triggerSendAnimation()
}

const focusNestedInput = () => {
  inputAreaRef.value?.focus()
}

const resetTextareaHeight = () => {
  if (inputAreaRef.value) {
    inputAreaRef.value.style.height = 'auto' // Reset height
  }
}

// --- Expose METHODS and REFS --- // <<< MODIFIED HERE
defineExpose({
  triggerNestedSendAnimation,
  focusNestedInput,
  resetTextareaHeight,
  inputAreaRef, // <<< ADDED: Expose the textarea element ref
})
</script>

<style scoped>
/* Styles are unchanged */
.image-preview-area {
  padding: 0.5rem 0.75rem;
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
  font-size: 1em;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
  margin-left: auto;
}
.remove-image-button:hover {
  background: rgba(0, 0, 0, 0.7);
}
.remove-image-button svg {
  display: block;
}
.input-area {
  display: flex;
  align-items: flex-end;
  padding: 0.75rem;
  background-color: var(--bg-input-area);
  flex-shrink: 0;
  gap: 0.5rem;
  border-radius: 0;
  border-top: 1px solid var(--border-color-medium);
  position: relative;
}
:has(.image-preview-area) + .input-area {
  border-top: none;
}
.chat-textarea {
  flex-grow: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color-medium);
  border-radius: 18px;
  resize: none;
  font-family: inherit;
  font-size: 1em;
  min-height: 40px; /* Or match button height */
  max-height: 150px; /* Limit excessive growth */
  overflow-y: auto; /* Allow scrolling if max-height reached */
  line-height: 1.4;
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.chat-textarea::placeholder {
  color: var(--accent-color-primary); /* Use accent color for placeholder */
  opacity: 0.8;
  transition: opacity 0.2s ease;
}
.chat-textarea:focus::placeholder {
  opacity: 0.5; /* Fade placeholder on focus */
}
.chat-textarea:hover:not(:focus):not(:disabled) {
  border-color: var(--accent-color-primary); /* Hint on hover */
}

.chat-textarea:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: var(--input-focus-shadow); /* Use defined focus shadow */
}
.chat-textarea:disabled {
  background-color: color-mix(in srgb, var(--bg-input-field) 50%, var(--bg-input-area));
  cursor: not-allowed;
  opacity: 0.7;
}
.chat-textarea:disabled::placeholder {
  opacity: 0.5;
}

/* Loading Indicator Styles (Unchanged) */
.loading-indicator-visual-container {
  position: absolute;
  top: -4px; /* Position above the input area border */
  left: 0;
  width: 100%;
  height: 4px;
  overflow: hidden;
  background-color: transparent; /* Needed on some browsers */
  z-index: 3; /* Above input area */
}
.loading-indicator-visual {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--accent-color-primary) 90%, #fff),
    var(--accent-color-primary),
    color-mix(in srgb, var(--accent-color-primary) 90%, #fff),
    transparent
  );
  background-size: 300% 100%; /* Wider gradient for smoother effect */
  animation: loading-gradient-fast 1.2s linear infinite;
  position: relative; /* Needed for pseudo-element */
}
.loading-indicator-visual::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* Subtle sparkle effect */
  background-image: radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.4) 1px, transparent 0);
  background-size: 8px 8px; /* Adjust size of sparkles */
  opacity: 0;
  animation: loading-sparkle-fade 1.2s linear infinite; /* Match gradient speed */
}

@keyframes loading-gradient-fast {
  0% {
    background-position: 150% 0;
  }
  100% {
    background-position: -150% 0;
  }
}
/* Keyframes for subtle sparkle */
@keyframes loading-sparkle-fade {
  0% {
    opacity: 0;
    background-position: 0% 0;
  }
  25% {
    opacity: 0.6;
  }
  50% {
    opacity: 0;
    background-position: -100% 0;
  } /* Move sparkles */
  75% {
    opacity: 0.6;
  }
  100% {
    opacity: 0;
    background-position: -200% 0;
  }
}

/* Icon Button Base Styles (Unchanged) */
.icon-button {
  padding: 0;
  border: none;
  border-radius: 50%; /* Circular buttons */
  cursor: pointer;
  height: 40px; /* Match textarea min-height */
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0; /* Prevent shrinking */
  background-color: var(--bg-button-secondary);
  color: var(--text-medium);
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
  position: relative; /* For potential ::after effects or badges */
  -webkit-user-select: none; /* Prevent text selection */
  user-select: none;
  -webkit-tap-highlight-color: transparent; /* Remove tap highlight on mobile */
}

.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background-color: var(--bg-button-disabled); /* Use disabled background */
  color: var(--text-disabled); /* Use disabled text color */
  pointer-events: none; /* Disable hover effects */
}

.icon-button:not(:disabled):hover {
  background-color: var(--bg-button-secondary-hover);
  color: var(--text-light);
}

.icon-button .svg-icon {
  /* General class for icons inside buttons */
  width: 20px; /* Standard icon size */
  height: 20px;
  display: block;
  z-index: 1; /* Ensure icon is above background */
  position: relative; /* Allow z-index */
  pointer-events: none; /* Clicks go to the button */
}
</style>
