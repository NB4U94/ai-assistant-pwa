<template>
  <div class="message-display-area" ref="messageAreaRef">
    <template v-if="displayMessages && displayMessages.length > 0">
      <div
        v-for="message in displayMessages"
        :key="message.messageId"
        :class="[
          'message-container',
          message.role === 'user'
            ? 'user-container'
            : message.role === 'assistant'
              ? 'ai-container'
              : 'system-container',
        ]"
        @click="message.role === 'assistant' ? props.ttsHandleMessageClick(message.content) : null"
        :title="
          message.role === 'assistant' && props.ttsSupported && props.isTtsEnabled
            ? 'Click to read aloud'
            : ''
        "
      >
        <div class="avatar-container" v-if="message.role !== 'system'">
          <template v-if="props.getAvatarDetailsForMessage">
            <Nb4uLogoPlaceholder v-if="props.getAvatarDetailsForMessage(message)?.isDefaultLogo" />

            <img
              v-else-if="
                props.getAvatarDetailsForMessage(message)?.imageUrl &&
                !avatarLoadError[message.messageId]
              "
              :src="props.getAvatarDetailsForMessage(message).imageUrl"
              :alt="`${props.getAvatarDetailsForMessage(message)?.type || 'AI'} avatar`"
              class="avatar-image"
              @error="handleAvatarError(message.messageId)"
            />

            <div
              v-else
              class="avatar-placeholder"
              :style="{
                backgroundColor:
                  props.getAvatarDetailsForMessage(message)?.bgColor || 'var(--avatar-bg-default)',
              }"
              :title="props.getAvatarDetailsForMessage(message)?.type || 'AI'"
            >
              {{ props.getAvatarDetailsForMessage(message)?.initials || '?' }}
            </div>
          </template>
          <div
            v-else
            class="avatar-placeholder"
            :style="{ backgroundColor: 'var(--avatar-bg-default)' }"
          >
            ?
          </div>
        </div>

        <div
          :class="[
            'message',
            message.role === 'user'
              ? 'user-message'
              : message.role === 'assistant'
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
          <span
            class="message-text"
            v-if="
              message.content &&
              typeof message.content === 'string' &&
              message.content.trim() !== ''
            "
          >
            <template
              v-for="(segment, index) in props.processMessageText(message.content)"
              :key="index"
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
            props.formatTimestamp(message.timestamp)
          }}</span>
          <button
            v-if="
              message.role === 'assistant' &&
              !message.isError &&
              typeof message.content === 'string'
            "
            @click.stop="props.copyText(message.content, message.messageId, $event)"
            class="copy-button"
            title="Copy response"
            :data-copied="props.copiedState[message.messageId] || false"
          >
            <span v-if="props.copiedState[message.messageId]">✅</span><span v-else>📋</span>
          </button>
        </div>
      </div>
    </template>
    <p v-else-if="!props.isSending" class="placeholder-message">No messages in this chat yet.</p>
  </div>
</template>

<script setup>
import { ref, defineProps, toRefs, onMounted, watch } from 'vue'
import { useChatScroll } from '@/composables/useChatScroll'
import Nb4uLogoPlaceholder from './Nb4uLogoPlaceholder.vue' // Import the logo component

// Props Definition (Unchanged)
const props = defineProps({
  displayMessages: { type: Array, default: () => [] },
  isSending: { type: Boolean, default: false },
  getAvatarDetailsForMessage: { type: Function, required: true },
  ttsHandleMessageClick: { type: Function, required: true },
  copyText: { type: Function, required: true },
  processMessageText: { type: Function, required: true },
  formatTimestamp: { type: Function, required: true },
  copiedState: { type: Object, required: true },
  ttsSupported: { type: Boolean, default: false },
  isTtsEnabled: { type: Boolean, default: false },
})

// Avatar Image Error Handling (Cleaned up unused param)
const avatarLoadError = ref({})
const handleAvatarError = (messageId) => {
  // messageId is used here
  if (messageId) {
    console.warn(
      `[MessageDisplayArea] Avatar image failed to load for messageId: ${messageId}. Falling back to placeholder.`,
    )
    avatarLoadError.value[messageId] = true
  } else {
    console.error('[MessageDisplayArea] handleAvatarError called with invalid messageId')
  }
}

// Watch to clear errors (Cleaned up unused param)
watch(
  () => props.displayMessages,
  (currentMessages) => {
    const currentMessageIds = new Set(currentMessages.map((m) => m.messageId))
    for (const errorMsgId in avatarLoadError.value) {
      if (avatarLoadError.value[errorMsgId] && !currentMessageIds.has(errorMsgId)) {
        delete avatarLoadError.value[errorMsgId]
      }
    }
  },
  { deep: false },
)

// Scrolling Logic (Ignoring spurious newValue/oldValue ESLint error)
const messageAreaRef = ref(null)
const displayMessagesRef = toRefs(props).displayMessages
const { instantScrollToBottom } = useChatScroll(messageAreaRef, displayMessagesRef)
onMounted(() => {
  instantScrollToBottom()
})
watch(
  displayMessagesRef,
  (newValue, oldValue) => {
    if (newValue?.length !== oldValue?.length || newValue?.length === 1) {
      instantScrollToBottom()
    }
  },
  { deep: true },
)
</script>

<style scoped>
/* Styles exactly as provided previously by user */
:root {
  --avatar-bg-user: #4a5568;
  --avatar-bg-current-ai: #38a169;
  --avatar-bg-historical-ai: #718096;
  --avatar-bg-system: #a0aec0;
  --avatar-bg-default: #555555;
}
.message-display-area {
  flex-grow: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem;
  background-color: var(--bg-main-content, #101010);
  display: flex;
  flex-direction: column;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: color-mix(
      in srgb,
      var(--accent-color-primary, #42b983) 60%,
      var(--bg-sidebar, #222)
    )
    var(--bg-sidebar, #222);
}
.message-display-area::-webkit-scrollbar {
  width: 8px;
}
.message-display-area::-webkit-scrollbar-track {
  background: var(--bg-sidebar, #222);
  border-radius: 4px;
}
.message-display-area::-webkit-scrollbar-thumb {
  background-color: color-mix(
    in srgb,
    var(--accent-color-primary, #42b983) 60%,
    var(--bg-sidebar, #222)
  );
  border-radius: 4px;
  border: 2px solid var(--bg-sidebar, #222);
}
.message-display-area::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(
    in srgb,
    var(--accent-color-primary, #42b983) 80%,
    var(--bg-sidebar, #222)
  );
}
.message-container {
  display: flex;
  margin-bottom: 0.75rem;
  max-width: 85%;
  opacity: 0;
  transform: translateY(10px);
  animation: fadeIn 0.3s ease forwards;
  position: relative;
  gap: 0.5rem;
  align-items: flex-end;
}
.user-container {
  align-self: flex-end;
  margin-left: auto;
  flex-direction: row-reverse;
}
.ai-container {
  align-self: flex-start;
  margin-right: auto;
  flex-direction: row;
}
.system-container {
  width: 100%;
  justify-content: center;
  align-self: center;
  max-width: 100%;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}
.avatar-container {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background-color: var(--avatar-bg-default);
}
.system-container .avatar-container {
  display: none;
}
.avatar-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background-color: var(--avatar-bg-default);
}
.avatar-placeholder {
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  width: 100%;
  height: 100%;
  font-size: 1.1em;
  line-height: 1;
  border-radius: 50%;
  text-transform: uppercase;
}
.message {
  padding: 0.6rem 1rem;
  border-radius: 18px;
  word-wrap: break-word;
  line-height: 1.45;
  position: relative;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  color: var(--text-primary, #ccc);
  min-width: 50px;
}
.user-message {
  background-color: var(--bg-message-user, #007bff);
  color: var(--text-message-user, white);
  border-bottom-right-radius: 6px;
}
.ai-message {
  background-color: var(--bg-message-ai, #444);
  color: var(--text-message-ai, #eee);
  border-bottom-left-radius: 6px;
}
.system-message {
  background-color: var(--bg-message-info, #e3f2fd);
  color: var(--text-secondary, #555);
  width: 100%;
  text-align: center;
  font-style: italic;
  font-size: 0.9em;
  border: 1px dashed var(--border-color-medium);
  border-radius: 8px;
  padding: 0.8rem 1rem;
  box-shadow: none;
}
.message-text {
  white-space: pre-wrap;
  word-break: break-word;
}
.message-text a {
  color: var(--text-link);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
.message-text a:hover {
  color: var(--text-link-hover);
  text-decoration: none;
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
  width: 100%;
  opacity: 0.8;
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
.ai-container .copy-button {
  right: -30px;
}
.user-container .copy-button {
  display: none;
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
@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes subtle-pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
}
</style>
