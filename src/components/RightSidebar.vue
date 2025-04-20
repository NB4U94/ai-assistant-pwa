<template>
  <div class="right-sidebar-content">
    <h2>Quick Settings</h2>

    <div class="quick-settings-list">
      <template v-if="isChatView">
        <button class="quick-setting-button" @click="placeholderAction('Save Transcript')">
          Save Transcript
        </button>
        <button class="quick-setting-button" @click="placeholderAction('Clear Chat')">
          Clear Chat
        </button>
      </template>

      <template v-else-if="isImageGenView">
        <button class="quick-setting-button" @click="placeholderAction('Clear Canvas')">
          Clear Canvas
        </button>
        <button class="quick-setting-button" @click="placeholderAction('Change Aspect Ratio')">
          Aspect Ratio
        </button>
      </template>

      <template v-else-if="isAssistantsView">
        <button class="quick-setting-button" @click="placeholderAction('Sort Assistants')">
          Sort Assistants
        </button>
      </template>

      <template v-else-if="isSettingsView">
        <p class="no-quick-settings">(Main settings active)</p>
      </template>

      <template v-else>
        <p class="no-quick-settings">(No quick settings for this view)</p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

// Get the current route object
const route = useRoute()

// Computed properties to check the current route path
const isChatView = computed(() => route.path === '/')
const isImageGenView = computed(() => route.path === '/image-gen')
const isAssistantsView = computed(
  () => route.path === '/assistants' || route.name === 'assistant-edit',
) // Include edit route
const isSettingsView = computed(() => route.path === '/settings')

// Placeholder function for button clicks (replace with real actions later)
const placeholderAction = (actionName) => {
  console.log(`[RightSidebar] Placeholder action clicked: ${actionName}`)
  alert(`Action not yet implemented: ${actionName}`)
}
</script>

<style scoped>
/* Define the pulsing halo animation */
@keyframes pulse-halo {
  0% {
    box-shadow: 0 0 0 0px color-mix(in srgb, var(--accent-color-primary) 40%, transparent);
  }
  50% {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-color-primary) 25%, transparent);
  }
  100% {
    box-shadow: 0 0 0 0px color-mix(in srgb, var(--accent-color-primary) 40%, transparent);
  }
}

/* Styles specific to the right sidebar */
.right-sidebar-content {
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--accent-color-primary); /* Base green text */
}

h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
  font-family: sans-serif;
  text-align: center;
  font-weight: 600;
  flex-shrink: 0;
}

/* Container for the list of settings */
.quick-settings-list {
  flex-grow: 1; /* Allow list to take space */
  overflow-y: auto; /* Allow scrolling if many settings */
}

/* Placeholder text if no settings */
.no-quick-settings {
  color: var(--text-secondary); /* Use secondary text color */
  font-family: sans-serif;
  font-size: 0.9em;
  text-align: center;
  font-style: italic;
  margin-top: 2rem;
}

/* Quick Setting Button Style */
.quick-setting-button {
  display: block;
  width: 100%;
  padding: 0.6rem 1rem;
  margin-bottom: 0.8rem;
  text-align: left;
  background-color: transparent;
  border: 1px solid var(--border-color-medium);
  border-radius: 6px;
  color: var(--accent-color-primary); /* Green text */
  font-family: sans-serif;
  font-size: 0.9em;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
  outline: none;
  box-shadow: none;
  flex-shrink: 0;
}

/* Apply halo and subtle background on hover/focus */
.quick-setting-button:hover:not(:disabled),
.quick-setting-button:focus-visible:not(:disabled) {
  color: var(--accent-color-primary);
  border-color: var(--accent-color-primary);
  background-color: color-mix(in srgb, var(--accent-color-primary) 10%, transparent);
  animation: pulse-halo 1.5s infinite ease-in-out;
}

.quick-setting-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
