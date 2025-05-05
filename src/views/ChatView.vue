<template>
  <div class="chat-view">
    <AssistantSelectorBar
      :showAssistantSelectorBar="showAssistantSelectorBar"
      :isAssistantSelectorExpanded="isAssistantSelectorExpanded"
      :availableAssistants="availableAssistants"
      :activeSessionId="activeSessionId"
      @toggle-selector="toggleAssistantSelector"
      @select-assistant="selectAssistant"
    />
    <MessageDisplayArea
      :displayMessages="displayMessages"
      :ttsSupported="ttsSupported"
      :isTtsEnabled="isTtsEnabled"
      :isSending="isSending"
      :copiedState="copiedState"
      :ttsHandleMessageClick="ttsHandleMessageClick"
      :copyText="copyText"
      :processMessageText="processMessageText"
      :formatTimestamp="formatTimestamp"
      :getAvatarDetailsForMessage="getAvatarDetailsForMessage"
    />
    <ChatInputArea
      ref="chatInputAreaRef"
      v-model:userInput="userInput"
      :placeholder="currentPlaceholder"
      :isSending="isSending"
      :isListening="isListening"
      :speechSupported="speechSupported"
      :ttsSupported="ttsSupported"
      :isTtsEnabled="isTtsEnabled"
      :selectedImagePreview="selectedImagePreview"
      :selectedFile="selectedFile"
      :handleSendMessage="handleSendMessage"
      :handleEnterKey="handleEnterKey"
      :autoGrowTextarea="autoGrowTextarea"
      :toggleListening="toggleListening"
      :triggerFileInput="triggerFileInput"
      :handleFileSelected="handleFileSelected"
      :removeSelectedImage="removeSelectedImage"
      :ttsToggle="ttsToggle"
    />
  </div>
</template>

<script setup>
// Import ref
import { ref } from 'vue'
// Import the primary composable that drives the chat view's logic
import { useChatViewLogic } from '@/composables/useChatViewLogic'
// Import child components
import ChatInputArea from '@/components/ChatInputArea.vue'
import MessageDisplayArea from '@/components/MessageDisplayArea.vue'
import AssistantSelectorBar from '@/components/AssistantSelectorBar.vue'

// Define props passed to the component (e.g., for test mode)
const props = defineProps({
  initialAssistantId: {
    // Used by AssistantView's test modal
    type: String,
    required: false,
    default: null,
  },
  isTestMode: {
    // Used by AssistantView's test modal
    type: Boolean,
    required: false,
    default: false,
  },
  // assistantConfig prop seems unused based on current logic, keeping for now if needed later
  // assistantConfig: { type: Object, required: false, default: null },
})

// --- Define userInput ref locally in the Parent View ---
const userInput = ref('') // This ref will be managed by v-model in ChatInputArea

// --- Define Ref for Child Component Access ---
const chatInputAreaRef = ref(null) // Used to potentially call methods on ChatInputArea

// --- Use the Chat View Logic Composable ---
// Pass the local userInput ref and component props into the composable.
// Destructure all the reactive state and methods needed by the template.
const {
  isSending,
  isListening,
  isAssistantSelectorExpanded,
  selectedImagePreview,
  selectedFile,
  activeSessionId, // From conversationStore via logic
  showAssistantSelectorBar,
  currentPlaceholder, // Calculated placeholder text
  displayMessages, // Formatted messages for display
  availableAssistants, // List for the selector bar
  // selectedAssistant: logicSelectedAssistant, // Removed - Was only for debug
  speechSupported,
  ttsSupported,
  isTtsEnabled,
  copiedState, // For copy feedback
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
  processMessageText, // For rendering markdown/code blocks
  formatTimestamp, // Utility for displaying dates/times
  getAvatarDetailsForMessage, // Provides avatar info for messages
  autoGrowTextarea, // Input area utility
} = useChatViewLogic(userInput, props, { chatInputAreaRef })
</script>

<style scoped>
/* Styles remain unchanged */
.chat-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-main-content);
  color: var(--text-primary);
  overflow: hidden; /* Prevent chat view itself from scrolling */
}
</style>
