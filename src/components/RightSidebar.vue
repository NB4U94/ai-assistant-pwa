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
        <button class="quick-setting-button" @click="placeholderAction('Change Resolution')">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            enable-background="new 0 0 24 24"
            height="20px"
            viewBox="0 0 24 24"
            width="20px"
            fill="currentColor"
          >
            <g><rect fill="none" height="24" width="24" /></g>
            <g>
              <g>
                <path d="M3,17.25V6.75H2V19h17v-1.75H3z" />
                <path
                  d="M22,7v10h-2v-4h-2V9h2V5h4V7z M19,17.15L19,17.15c-1.73,0-3.15-1.42-3.15-3.15s1.42-3.15,3.15-3.15 M20,2H7C5.9,2,5,2.9,5,4v12 c0,1.1,0.9,2,2,2h12c0.69,0,1.28-0.35,1.64-0.86l2.55-3.72C23.79,12.67,24,11.86,24,11v-1C24,7.79,22.21,6,20,6z"
                />
              </g>
            </g>
          </svg>
          <span>Resolution...</span>
          <span class="button-highlight"></span>
        </button>
      </template>

      <template v-else-if="isAssistantsView">
        <button class="quick-setting-button" @click="placeholderAction('Sort Assistants')">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="20px"
            viewBox="0 0 24 24"
            width="20px"
            fill="currentColor"
          >
            <path d="M0 0h24v24H0V0z" fill="none" />
            <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />
          </svg>
          <span>Sort Assistants</span>
          <span class="button-highlight"></span>
        </button>
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

      <template v-else-if="isSettingsView || isMemoriesView"></template>
      <template v-else><p class="no-quick-settings">(No quick actions for this view)</p></template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
// Removed unused ConversationStore import
// import { useConversationStore } from '@/stores/conversationStore';

const route = useRoute()
// Removed unused store instance and action
// const conversationStore = useConversationStore();
// const { clearActiveConversation } = conversationStore;

// Computed properties
const isChatView = computed(() => route.path === '/')
const isImageGenView = computed(() => route.path === '/image-gen')
const isAssistantsView = computed(
  () => route.path === '/assistants' || route.name === 'assistant-edit',
)
const isSettingsView = computed(() => route.path === '/settings')
const isMemoriesView = computed(() => route.path === '/memories')

// Placeholder action
const placeholderAction = (actionName) => {
  alert(`Action not yet implemented: ${actionName}`)
}
// Removed handleClearChatClick
</script>

<style scoped>
/* Animation Definitions */
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
  100% {
    opacity: 0.6;
    box-shadow: 0 0 4px 1px color-mix(in srgb, var(--accent-color-primary) 40%, transparent);
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

/* Component Styles */
.right-sidebar-content {
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.sidebar-title {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: color-mix(in srgb, var(--text-light) 95%, var(--text-secondary)); /* Dimmer white */
  animation: faint-title-glow 3s infinite ease-in-out alternate; /* Constant faint pulse */
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

/* Base Button Style */
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

/* Regular Button Hover/Focus */
.quick-setting-button:hover:not(:disabled),
.quick-setting-button:focus-visible:not(:disabled) {
  color: var(--text-light);
  border-color: transparent;
}
.quick-setting-button:hover:not(:disabled) .button-highlight,
.quick-setting-button:focus-visible:not(:disabled) .button-highlight {
  opacity: 0.15;
  animation: plasma-highlight-pulse 1.5s infinite ease-in-out;
}

/* Icon Glow on Press */
.quick-setting-button:active:not(:disabled) svg {
  filter: drop-shadow(0 0 3px var(--accent-color-primary));
}

/* Disabled State */
.quick-setting-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Removed Danger Button specific styles as button is gone */
</style>
