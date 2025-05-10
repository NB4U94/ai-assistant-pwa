<template>
  <div class="chat-view">
    <AssistantSelectorBar
      :showAssistantSelectorBar="shouldShowAssistantSelectorBarEffective"
      :isAssistantSelectorExpanded="isAssistantSelectorExpanded"
      :availableAssistants="availableAssistants"
      :activeSessionId="activeSessionId"
      @toggle-selector="toggleAssistantSelector"
      @select-assistant="selectAssistant"
    />
    <MessageDisplayArea
      ref="messageDisplayAreaComponentRef"
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
import { ref } from 'vue'
import { useChatViewLogic } from '@/composables/useChatViewLogic'
import ChatInputArea from '@/components/ChatInputArea.vue'
import MessageDisplayArea from '@/components/MessageDisplayArea.vue'
import AssistantSelectorBar from '@/components/AssistantSelectorBar.vue'

const props = defineProps({
  initialAssistantId: { type: String, required: false, default: null },
  assistantConfig: { type: Object, required: false, default: null },
  isTestMode: { type: Boolean, required: false, default: false },
})

const userInput = ref('')
const chatInputAreaRef = ref(null)
const messageDisplayAreaComponentRef = ref(null)

const {
  isSending,
  isListening,
  isAssistantSelectorExpanded,
  selectedImagePreview,
  selectedFile,
  activeSessionId,
  shouldShowAssistantSelectorBarEffective, // MODIFIED: Use this instead of showAssistantSelectorBar
  currentPlaceholder,
  displayMessages,
  availableAssistants,
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
} = useChatViewLogic(userInput, props, {
  chatInputAreaRef,
  messageDisplayAreaComponentRef: messageDisplayAreaComponentRef,
})
</script>

<style scoped>
.chat-view {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-main-content);
  color: var(--text-primary);
  overflow: hidden;
}
</style>
