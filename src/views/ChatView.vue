<template>
  <div class="chat-view">
    <div
      class="debug-info"
      style="
        background: #333;
        color: white;
        padding: 5px;
        font-size: 0.8em;
        border-bottom: 1px solid #555;
        white-space: pre-wrap;
        margin-bottom: 5px;
      "
    >
      <p><strong>DEBUG INFO:</strong></p>
      <p>AssistStore - Selected ID: {{ assistantsStore.selectedAssistantId }}</p>
      <p>AssistStore - Selected Name: {{ assistantsStore.selectedAssistant?.name }}</p>
      <p>ConvoStore - Active Session ID: {{ conversationStore.activeSessionId }}</p>
      <p>ConvoStore - Loaded Memory ID: {{ conversationStore.loadedMemoryId }}</p>
      <hr style="border-color: #555" />
      <p>ChatLogic - Current Placeholder: {{ currentPlaceholder }}</p>
      <p>ChatLogic - Selected Assistant Name (via Ref): {{ logicSelectedAssistant?.name }}</p>
    </div>
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
// Import ref and stores
import { ref } from 'vue'
import { useChatViewLogic } from '@/composables/useChatViewLogic'
import { useAssistantsStore } from '@/stores/assistantsStore' // Added Store Import
import { useConversationStore } from '@/stores/conversationStore' // Added Store Import
import ChatInputArea from '@/components/ChatInputArea.vue'
import MessageDisplayArea from '@/components/MessageDisplayArea.vue'
import AssistantSelectorBar from '@/components/AssistantSelectorBar.vue'

// Get store instances for debugging
const assistantsStore = useAssistantsStore()
const conversationStore = useConversationStore()

// Define props passed to the component (Unchanged)
const props = defineProps({
  assistantConfig: { type: Object, required: false, default: null },
})

// --- Define userInput ref locally in the Parent View ---
const userInput = ref('') // This ref will be managed by v-model

// --- Define Ref for Child Component ---
const chatInputAreaRef = ref(null)

// --- PASS local userInput ref INTO the composable ---
// --- DESTRUCTURE results directly ---
// Destructure selectedAssistant from logic result as well for debug comparison
const {
  isSending,
  isListening,
  isAssistantSelectorExpanded,
  selectedImagePreview,
  selectedFile,
  activeSessionId, // From conversationStore via logic
  showAssistantSelectorBar,
  currentPlaceholder, // From logic
  displayMessages,
  availableAssistants,
  selectedAssistant: logicSelectedAssistant, // Get the ref from the composable result
  speechSupported,
  ttsSupported,
  isTtsEnabled,
  copiedState,
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
  processMessageText,
  formatTimestamp,
  getAvatarDetailsForMessage,
  autoGrowTextarea,
} = useChatViewLogic(userInput, props, { chatInputAreaRef })
</script>

<style scoped>
/* Styles unchanged */
.chat-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-main-content);
  color: var(--text-primary);
  overflow: hidden;
}
/* Optional: Style for the debug info */
.debug-info {
  flex-shrink: 0; /* Prevent shrinking */
  /* Add other styles as needed */
}
</style>
