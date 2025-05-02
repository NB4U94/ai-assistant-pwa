<template>
  <div class="right-sidebar-content">
    <h2 class="sidebar-title">Quick Actions</h2>

    <div class="quick-settings-list">
      <template v-if="isChatView">
        <p class="no-quick-settings">(No chat actions yet)</p>
      </template>

      <template v-else-if="isImageGenView">
        <button class="quick-setting-button" @click="placeholderAction('Clear Canvas')">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="20px"
            viewBox="0 0 24 24"
            width="20px"
            fill="currentColor"
          >
            <path d="M0 0h24v24H0V0z" fill="none" />
            <path
              d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z"
            />
          </svg>
          <span>Clear Canvas</span>
          <span class="button-highlight"></span>
        </button>
        <button class="quick-setting-button" @click="placeholderAction('Change Aspect Ratio')">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="20px"
            viewBox="0 0 24 24"
            width="20px"
            fill="currentColor"
          >
            <path d="M0 0h24v24H0V0z" fill="none" />
            <path
              d="M19 12h-2v3h-3v2h5v-5zM7 9h3V7H5v5h2V9zm14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z"
            />
          </svg>
          <span>Aspect Ratio...</span>
          <span class="button-highlight"></span>
        </button>
      </template>

      <template v-else-if="isAssistantsView">
        <button class="quick-setting-button" @click="placeholderAction('New Assistant...')">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="20px"
            viewBox="0 0 24 24"
            width="20px"
            fill="currentColor"
          >
            <path d="M0 0h24v24H0V0z" fill="none" />
            <path
              d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
            />
          </svg>
          <span>New Assistant...</span>
          <span class="button-highlight"></span>
        </button>
      </template>

      <template v-else-if="isMemoriesView">
        <button
          @click="handleDeleteAllMemories"
          class="quick-setting-button danger-button delete-all-button"
          title="Delete ALL saved memories"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="20px"
            viewBox="0 0 24 24"
            width="20px"
            fill="currentColor"
          >
            <path d="M0 0h24v24H0V0z" fill="none" />
            <path
              d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"
            />
          </svg>
          <span>Delete All Memories</span>
        </button>
      </template>

      <template v-else>
        <p class="no-quick-settings">(No quick actions for this view)</p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useConversationStore } from '@/stores/conversationStore'

const route = useRoute()
const conversationStore = useConversationStore()

// Computed properties to determine current view
const isChatView = computed(() => route.path === '/')
const isImageGenView = computed(() => route.path === '/image-gen')
const isAssistantsView = computed(
  () => route.path === '/assistants' || route.name === 'assistant-edit',
)
const isMemoriesView = computed(() => route.path === '/memories')
// *** Removed unused isSettingsView ***
// const isSettingsView = computed(() => route.path === '/settings')

// Placeholder action
const placeholderAction = (actionName) => {
  alert(`Action not yet implemented: ${actionName}`)
}

// Handler for Delete All Memories
const handleDeleteAllMemories = () => {
  if (window.confirm('DELETE ALL MEMORIES?\n\nAre you absolutely sure...?')) {
    if (window.confirm('SECOND CONFIRMATION:\n\nThis action cannot be undone...')) {
      if (window.confirm('FINAL CONFIRMATION:\n\nReally delete everything?')) {
        console.log(`[RightSidebar] Deleting ALL memories...`)
        try {
          conversationStore.deleteAllMemories()
        } catch (error) {
          console.error('[RightSidebar] Error calling deleteAllMemories:', error)
          alert('An error occurred.')
        }
      }
    }
  }
}
</script>

<style scoped>
/* Styles remain the same as response #85 */
@keyframes plasma-highlight-pulse {
  0%,
  100% {
    opacity: 0.6;
    box-shadow: 0 0 4px 1px color-mix(in srgb, var(--accent-color-primary) 40%, transparent);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 8px 2px color-mix(in srgb, var(--accent-color-primary) 60%, transparent);
  }
}
@keyframes press-glow {
  from {
    filter: drop-shadow(0 0 2px var(--accent-color-primary));
  }
  to {
    filter: drop-shadow(0 0 5px var(--accent-color-primary));
  }
}
@keyframes faint-title-glow {
  0%,
  100% {
    text-shadow: 0 0 3px color-mix(in srgb, var(--accent-color-primary) 20%, transparent);
  }
  50% {
    text-shadow: 0 0 6px color-mix(in srgb, var(--accent-color-primary) 35%, transparent);
  }
}
.right-sidebar-content {
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.sidebar-title {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: color-mix(in srgb, var(--text-light) 95%, var(--text-secondary));
  animation: faint-title-glow 3s infinite ease-in-out alternate;
  font-family: sans-serif;
  text-align: center;
  font-weight: 600;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-color-medium);
  padding-bottom: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
}
.quick-settings-list {
  flex-grow: 1;
  overflow-y: auto;
}
.no-quick-settings {
  color: var(--text-secondary);
  font-family: sans-serif;
  font-size: 0.9em;
  text-align: center;
  font-style: italic;
  margin-top: 2rem;
}
.quick-setting-button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.6rem 1rem;
  margin-bottom: 0.8rem;
  text-align: left;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--text-secondary);
  font-family: sans-serif;
  font-size: 0.9em;
  cursor: pointer;
  transition: color 0.2s ease;
  outline: none;
  box-shadow: none;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.quick-setting-button svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
  flex-shrink: 0;
  transition: filter 0.2s ease;
  filter: none;
}
.quick-setting-button .button-highlight {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--accent-color-primary);
  border-radius: inherit;
  opacity: 0;
  z-index: -1;
  transition: opacity 0.3s ease;
  box-shadow: none;
  animation: none;
}
.quick-setting-button:not(.danger-button):hover:not(:disabled),
.quick-setting-button:not(.danger-button):focus-visible:not(:disabled) {
  color: var(--text-light);
  border-color: transparent;
}
.quick-setting-button:not(.danger-button):hover:not(:disabled) .button-highlight,
.quick-setting-button:not(.danger-button):focus-visible:not(:disabled) .button-highlight {
  opacity: 0.15;
  animation: plasma-highlight-pulse 1.5s infinite ease-in-out;
}
.quick-setting-button:active:not(:disabled) svg {
  filter: drop-shadow(0 0 3px var(--accent-color-primary));
}
.quick-setting-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.danger-button {
  color: var(--text-light);
  background-color: var(--bg-error, #a04040);
  border-color: var(--bg-error, #a04040);
}
.danger-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--bg-error, #a04040) 85%, black);
  border-color: color-mix(in srgb, var(--bg-error, #a04040) 85%, black);
  color: var(--text-light);
}
.danger-button .button-highlight {
  display: none;
}
.danger-button:hover:not(:disabled) .button-highlight,
.danger-button:focus-visible:not(:disabled) .button-highlight {
  display: none;
  animation: none;
}
.delete-all-button {
  margin-top: 1rem;
}
</style>
