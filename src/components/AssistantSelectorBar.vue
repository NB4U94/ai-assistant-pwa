<script setup>
import { ref, onMounted } from 'vue'
import Nb4uLogoPlaceholder from '@/components/Nb4uLogoPlaceholder.vue'

// Props definition (remains the same)
// eslint-disable-next-line no-unused-vars
const props = defineProps({
  availableAssistants: { type: Array, required: true },
  activeSessionId: { type: String, default: 'main_chat' },
  isAssistantSelectorExpanded: { type: Boolean, required: true },
  showAssistantSelectorBar: { type: Boolean, default: true },
})

// Emits definition (remains the same)
const emit = defineEmits(['select-assistant', 'toggle-selector'])

// --- State for Avatar Errors ---
const avatarLoadError = ref({}) // Tracks image load errors { assistantId: true }

// --- Lifecycle Hooks ---
onMounted(() => {
  // Reset error state on component mount
  avatarLoadError.value = {}
})

// --- Avatar Helper Functions ---
const handleAvatarError = (assistantId) => {
  if (!assistantId) return
  console.warn(`[AssistantSelector] Avatar image failed to load for assistant ID: ${assistantId}`)
  avatarLoadError.value[assistantId] = true
}

const getPlaceholderStyle = (assistant) => {
  return assistant && assistant.color ? { backgroundColor: assistant.color } : {}
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1 && parts[0].length > 0) {
    if (parts[0].includes('-')) {
      const hyphenParts = parts[0].split('-')
      if (hyphenParts.length > 1 && hyphenParts[0] && hyphenParts[1]) {
        // Added checks for parts[0]/[1]
        return (hyphenParts[0][0] + (hyphenParts[1][0] || '')).toUpperCase()
      }
    }
    return parts[0].substring(0, 1).toUpperCase()
  }
  if (parts.length > 1) {
    const firstInitial = parts[0][0] || ''
    const lastInitial = parts[parts.length - 1][0] || ''
    return (firstInitial + lastInitial).toUpperCase()
  }
  return '?'
}
// --- End Avatar Helper Functions ---

// Event handlers (remain the same)
function handleSelectAssistant(assistantId) {
  emit('select-assistant', assistantId)
}
function handleToggleSelector() {
  emit('toggle-selector')
}
</script>

<template>
  <div v-if="showAssistantSelectorBar" class="assistant-selector-container">
    <div class="selector-bar-header">
      <button
        @click="handleToggleSelector"
        class="assistant-selector-toggle-arrow solid-glow-effect-primary"
        :class="{ expanded: isAssistantSelectorExpanded }"
        aria-label="Toggle Assistant Selector"
        :aria-expanded="isAssistantSelectorExpanded.toString()"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.23 8.29a.75.75 0 01.02-1.06z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>

    <hr v-if="!isAssistantSelectorExpanded" class="selector-separator" />

    <Transition name="expand">
      <div
        v-if="isAssistantSelectorExpanded"
        class="assistant-list-wrapper"
        :class="{ 'expanded-border': isAssistantSelectorExpanded }"
      >
        <div class="assistant-list-container">
          <ul class="assistant-list">
            <li
              @click="handleSelectAssistant('main_chat')"
              :class="{ active: activeSessionId === 'main_chat' || activeSessionId === null }"
              class="assistant-list-item"
              role="button"
              tabindex="0"
              @keydown.enter.space="handleSelectAssistant('main_chat')"
              title="Nb4U-Ai (Main Chat)"
            >
              <div class="assistant-avatar">
                <Nb4uLogoPlaceholder />
              </div>
              <span class="assistant-name">Nb4U-Ai</span>
            </li>
            <li
              v-for="assistant in availableAssistants"
              :key="assistant.id"
              @click="handleSelectAssistant(assistant.id)"
              :class="{ active: activeSessionId === assistant.id }"
              class="assistant-list-item"
              role="button"
              tabindex="0"
              @keydown.enter.space="handleSelectAssistant(assistant.id)"
              :title="assistant.name"
            >
              <div class="assistant-avatar">
                <img
                  v-if="assistant.imageUrl && !avatarLoadError[assistant.id]"
                  :src="assistant.imageUrl"
                  :alt="`${assistant.name || 'Assistant'} avatar`"
                  class="avatar-image"
                  @error="handleAvatarError(assistant.id)"
                />
                <div v-else :style="getPlaceholderStyle(assistant)" class="avatar-placeholder">
                  {{ getInitials(assistant.name) }}
                </div>
              </div>
              <span class="assistant-name">{{ assistant.name }}</span>
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.assistant-selector-container {
  width: 100%;
  background-color: var(--bg-assistant-selector, var(--bg-main-content));
  padding: 5px 15px 0;
  position: relative;
  box-sizing: border-box;
  z-index: 10; /* Ensure it sits above chat content if needed */
}

.selector-bar-header {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 30px; /* Ensure space for the toggle button */
  padding-bottom: 5px; /* Space below toggle button */
}

.assistant-selector-toggle-arrow {
  padding: 4px;
  border-radius: 50%;
  display: flex; /* Center SVG */
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
  /* Glow effect applied by class solid-glow-effect-primary */
  background-color: transparent; /* Explicitly set for clarity */
  border: none; /* Explicitly set for clarity */
  color: var(--accent-color-primary); /* Make arrow icon colored */
  cursor: pointer; /* Ensure cursor changes */
}
.assistant-selector-toggle-arrow svg {
  width: 20px;
  height: 20px;
}

.assistant-selector-toggle-arrow.expanded {
  transform: rotate(180deg);
}

/* Separator line when collapsed */
.selector-separator {
  border: none;
  height: 1px;
  background-color: var(--border-color-light);
  margin: 0;
}

/* Wrapper for the list when expanded */
.assistant-list-wrapper {
  overflow: hidden;
  border-bottom: 1px solid transparent; /* Prepare for accent border */
  transition: border-color 0.3s ease;
}
.assistant-list-wrapper.expanded-border {
  /* Add accent border only when expanded */
  border-bottom: 1px solid var(--accent-color-primary);
  box-shadow: 0 2px 6px -2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}

/* Container for scrollable list */
.assistant-list-container {
  max-height: 210px; /* Limit height */
  overflow-y: auto; /* Enable vertical scroll */
  padding: 10px 0; /* Padding above/below list */
  /* Custom scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: var(--accent-color-primary) var(--bg-main-content);
}
.assistant-list-container::-webkit-scrollbar {
  width: 6px;
}
.assistant-list-container::-webkit-scrollbar-track {
  background: var(--bg-main-content);
  border-radius: 3px;
}
.assistant-list-container::-webkit-scrollbar-thumb {
  background-color: var(--accent-color-primary);
  border-radius: 3px;
}

/* Flex container for list items */
.assistant-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap; /* Allow items to wrap */
  gap: 15px; /* Spacing between items */
  justify-content: flex-start; /* Align items to start */
  padding-left: 5px; /* Small padding for alignment */
  padding-right: 5px;
}

/* Individual list item styling */
.assistant-list-item {
  display: flex;
  flex-direction: column; /* Stack avatar and name vertically */
  align-items: center; /* Center content horizontally */
  gap: 0; /* No gap between avatar and name */
  padding: 5px;
  cursor: pointer;
  border-radius: 8px; /* Rounded corners */
  transition: background-color 0.2s ease;
  width: 85px; /* Fixed width for grid layout */
  text-align: center;
  border: 1px solid transparent; /* Border placeholder for active state */
  box-sizing: border-box; /* Include padding/border in width */
  position: relative; /* For potential future use (e.g., badges) */
  outline: none; /* Remove default focus outline */
}
/* Add focus-visible style */
.assistant-list-item:focus-visible {
  box-shadow: 0 0 0 2px var(--accent-color-primary); /* Use box-shadow for focus */
}

/* Avatar Styling (specific to list items) */
.assistant-avatar {
  width: 48px; /* Size for the selector items */
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0; /* Prevent shrinking */
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-input-field); /* Fallback background color */
  border: 1px solid var(--border-color-medium); /* Default border */
  margin-bottom: 4px; /* Space between avatar and name */
  overflow: hidden; /* Clip image/placeholder/logo */
}

/* Ensure direct children fill the avatar container */
.assistant-avatar > .avatar-image,
.assistant-avatar > .avatar-placeholder,
.assistant-avatar > :deep(.nb4u-logo-placeholder) {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-image {
  object-fit: cover;
  display: block;
  border-radius: 50%;
  z-index: 1;
  position: relative;
}

.avatar-placeholder {
  font-weight: bold;
  color: var(--text-primary);
  font-size: 1.2em;
  line-height: 1;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  z-index: 1;
  position: relative;
  background-color: var(--bg-input-field); /* CSS Fallback color */
  user-select: none;
}

/* Assistant Name Styling */
.assistant-name {
  color: var(--text-secondary);
  font-size: 0.85em;
  line-height: 1.3;
  white-space: normal; /* Allow wrapping */
  word-break: break-word; /* Break long words */
  max-width: 100%;
  margin-top: 2px;
  height: 2.6em; /* Allow up to two lines (adjust as needed) */
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2; /* Limit to 2 lines */
  line-clamp: 2; /* Standard property */
  -webkit-box-orient: vertical;
  text-align: center;
}

/* Hover effect for list items */
.assistant-list-item:hover {
  background-color: var(--bg-hover-light); /* Use a subtle hover background */
}

/* Active state styling */
.assistant-list-item.active {
  background-color: color-mix(in srgb, var(--accent-color-primary) 20%, transparent);
  font-weight: 500;
  border: 1px solid var(--accent-color-primary); /* Highlight border */
}
.assistant-list-item.active .assistant-avatar {
  border-color: var(--accent-color-primary); /* Match border highlight */
}
.assistant-list-item.active .assistant-name {
  color: var(--text-primary); /* Use primary text color when active */
}

/* Expansion Transition */
.expand-enter-active,
.expand-leave-active {
  transition:
    max-height 0.3s ease-out,
    opacity 0.2s ease-out 0.1s,
    padding-bottom 0.3s ease-out,
    margin-bottom 0.3s ease-out; /* If margin is used */
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-bottom: 0;
  margin-bottom: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 220px; /* Match container max-height + padding */
  opacity: 1;
  padding-bottom: 10px; /* Match container padding */
}
</style>
