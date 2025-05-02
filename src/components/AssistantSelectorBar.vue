<script setup>
import { computed } from 'vue'

// Props definition (remains the same)
const props = defineProps({
  availableAssistants: { type: Array, required: true },
  activeSessionId: { type: String, default: 'main_chat' },
  isAssistantSelectorExpanded: { type: Boolean, required: true },
  showAssistantSelectorBar: { type: Boolean, default: true },
})

// Emits definition (remains the same)
const emit = defineEmits(['select-assistant', 'toggle-selector'])

// getInitials helper function (remains the same)
function getInitials(name) {
  if (!name || typeof name !== 'string') return '?'
  const parts = name.split(' ')
  if (parts.length === 1) {
    return name.substring(0, 1).toUpperCase()
  }
  const firstInitial = parts[0][0] || ''
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] || '' : ''
  return (firstInitial + lastInitial).toUpperCase().substring(0, 2)
}

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
              :class="{ active: activeSessionId === 'main_chat' }"
              class="assistant-list-item"
              role="button"
              tabindex="0"
              @keydown.enter.space="handleSelectAssistant('main_chat')"
            >
              <div class="assistant-avatar">
                <div class="avatar-placeholder">
                  {{ getInitials('Nb4U-Ai') }}
                </div>
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
            >
              <div class="assistant-avatar">
                <img
                  v-if="assistant.imageUrl"
                  :src="assistant.imageUrl"
                  alt=""
                  class="avatar-image"
                  @error="(e) => (e.target.style.display = 'none')"
                />
                <div
                  v-else
                  class="avatar-placeholder"
                  :style="{ backgroundColor: assistant.color || 'var(--bg-input-field)' }"
                >
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
  z-index: 10;
}

.selector-bar-header {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 30px;
  padding-bottom: 5px;
}

/* Avatar Styling (List only) */
.assistant-avatar {
  /* Ripple effect applied globally via main.css */
  width: 48px; /* Increased size */
  height: 48px; /* Increased size */
  border-radius: 50%;
  flex-shrink: 0;
  position: relative; /* Needed for ripple ::after */
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-input-field); /* Default grey background */
  border: 1px solid var(--border-color-medium);
  margin-bottom: 4px;
}
.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 50%;
  z-index: 1;
  position: relative;
}
.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  font-size: 1.2em; /* Slightly larger initials for bigger avatar */
  line-height: 1;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  z-index: 1;
  position: relative;
  background-color: inherit;
}

.assistant-selector-toggle-arrow {
  /* Centered by parent */
}

.selector-separator {
  border: none;
  height: 1px;
  background-color: var(--border-color-light);
  margin: 0;
}

.assistant-list-wrapper {
  overflow: hidden;
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s ease;
}
.assistant-list-wrapper.expanded-border {
  border-bottom: 1px solid var(--accent-color-primary);
  box-shadow: 0 2px 6px -2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}

.assistant-list-container {
  max-height: 210px; /* Adjusted max-height to accommodate larger items */
  overflow-y: auto;
  padding: 10px 0;
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

/* List Items Layout */
.assistant-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  justify-content: flex-start;
  padding-left: 5px;
  padding-right: 5px;
}

.assistant-list-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 5px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s ease;
  width: 85px; /* Adjusted width for larger avatar */
  text-align: center;
  border: 1px solid transparent;
}

.assistant-name {
  color: #f0f0f0; /* Whiter text color */
  font-size: 0.85em;
  line-height: 1.3;
  white-space: normal;
  word-break: break-word;
  max-width: 100%;
  margin-top: 2px;
  height: 2.6em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.assistant-list-item:hover {
  background-color: var(--bg-hover-light);
}

.assistant-list-item.active {
  background-color: color-mix(in srgb, var(--accent-color-primary) 20%, transparent);
  color: var(--text-primary); /* Use primary text color when active */
  font-weight: 500;
  border: 1px solid var(--accent-color-primary);
}
.assistant-list-item.active .assistant-avatar {
  border-color: var(--accent-color-primary);
}
.assistant-list-item.active .assistant-name {
  color: var(--text-primary); /* Match active text color */
}

/* Expansion Transition */
.expand-enter-active,
.expand-leave-active {
  transition:
    max-height 0.3s ease-out,
    opacity 0.2s ease-out 0.1s,
    padding-bottom 0.3s ease-out,
    margin-bottom 0.3s ease-out;
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
  max-height: 220px; /* Adjusted max-height for transition */
  opacity: 1;
  padding-bottom: 5px;
}
</style>
