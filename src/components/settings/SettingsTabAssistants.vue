<template>
  <div>
    <div class="setting-item wide-item">
      <label for="asst-default-instructions" class="setting-label">
        Default Instructions (New Assistants)
        <span class="setting-description"
          >System prompt automatically added when creating a new assistant.</span
        >
      </label>
      <textarea
        id="asst-default-instructions"
        class="settings-textarea"
        rows="4"
        placeholder="e.g., You are a helpful AI assistant focused on..."
        v-model="assistantsDefaultInstructions"
      ></textarea>
      <button
        class="help-button neon-glow-effect-primary"
        @click="
          props.showHelp(
            'Default Instructions (New Assistants)',
            'Enter the default system prompt or instructions you want every new custom assistant to start with. You can always edit it later when creating or modifying a specific assistant.',
          )
        "
        aria-label="Help with Default Instructions"
        title="Help with Default Instructions"
      >
        ?
      </button>
    </div>

    <div
      class="advanced-toggle-header"
      @click="settingsStore.toggleSettingsTabAdvancedVisible(tabId)"
      tabindex="0"
      @keydown.enter.prevent="settingsStore.toggleSettingsTabAdvancedVisible(tabId)"
      @keydown.space.prevent="settingsStore.toggleSettingsTabAdvancedVisible(tabId)"
    >
      <h3>Advanced Assistants Management</h3>
      <button
        class="advanced-arrow solid-glow-effect-primary"
        :class="{ expanded: isAdvancedVisible }"
        aria-label="Toggle Advanced Assistants Management Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          width="20px"
          height="20px"
        >
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
        </svg>
      </button>
    </div>

    <transition name="collapse">
      <div class="advanced-settings-section" v-show="isAdvancedVisible">
        <div class="setting-item api-key-item">
          <label class="setting-label">
            Assistant API Keys
            <span class="setting-description">Manage API keys for external models (Optional).</span>
          </label>
          <div class="api-key-inputs">
            <div class="api-key-entry">
              <label for="openai-key">OpenAI Key:</label>
              <input
                type="password"
                id="openai-key"
                class="settings-input api-key-input"
                placeholder="sk-..."
                disabled
                title="API Key management not yet implemented"
              />
            </div>
            <div class="api-key-entry">
              <label for="anthropic-key">Anthropic Key:</label>
              <input
                type="password"
                id="anthropic-key"
                class="settings-input api-key-input"
                placeholder="sk-ant-..."
                disabled
                title="API Key management not yet implemented"
              />
            </div>
            <div class="api-key-entry">
              <label for="gemini-key">Google AI Key:</label>
              <input
                type="password"
                id="gemini-key"
                class="settings-input api-key-input"
                placeholder="AIzaSy..."
                disabled
                title="API Key management not yet implemented"
              />
            </div>
          </div>
          <button
            class="help-button neon-glow-effect-primary"
            @click="
              props.showHelp(
                'Assistant API Keys',
                'Optionally enter your personal API keys here if you want your custom assistants to use specific external paid models (like GPT-4 via OpenAI, Claude via Anthropic, or Gemini Pro via Google AI Studio). Ensure keys are kept secure. These keys would be stored locally in your browser. (Feature not yet fully implemented)',
              )
            "
            aria-label="Help with Assistant API Keys"
            title="Help with Assistant API Keys"
          >
            ?
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { defineProps, computed } from 'vue' // Removed ref import
import { useSettingsStore } from '@/stores/settingsStore'
import { storeToRefs } from 'pinia'

// --- Props ---
const props = defineProps({
  showHelp: {
    type: Function,
    required: true,
  },
})

// --- Store Access ---
const settingsStore = useSettingsStore()
// Get needed persistent state ref for v-model
const { assistantsDefaultInstructions } = storeToRefs(settingsStore)
// Get non-persistent UI state object for advanced sections
const { settingsTabsAdvancedVisible } = storeToRefs(settingsStore) // <<< Get shared state object

// --- Local State ---
const tabId = 'assistants' // Define ID for this tab <<< ADDED tabId
// Removed local isAdvancedVisible ref

// --- Computed ---
// Get visibility for *this* tab from the shared state object <<< ADDED computed prop
const isAdvancedVisible = computed(() => !!settingsTabsAdvancedVisible.value[tabId])

// Removed local toggleAdvanced method
</script>

<style scoped>
/* Reuse styles where possible, remove redundant ones */
.setting-item {
  display: grid;
  grid-template-columns: 1fr auto auto; /* Label | Control | Help */
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color-light);
  gap: 1rem;
}
.setting-item:last-child {
  border-bottom: none;
}

/* Layout for wide items like textareas */
.setting-item.wide-item {
  grid-template-columns: auto 1fr auto;
  grid-template-areas:
    'label control help'
    'label description help'; /* Description below label */
  align-items: start;
}
.setting-item.wide-item .setting-label {
  grid-area: label;
  align-self: start; /* Align top */
  padding-top: 0.4rem; /* Align with textarea padding */
}
.setting-item.wide-item .setting-description {
  grid-area: description;
  margin-top: 0; /* Remove default top margin */
  padding-left: 0;
  grid-column: 2 / 3; /* Ensure description is in the second column */
}
.setting-item.wide-item .settings-textarea {
  grid-area: control;
  justify-self: stretch;
}
.setting-item.wide-item .help-button {
  grid-area: help;
  justify-self: end;
  align-self: start; /* Align with top of label/textarea */
  margin-top: 0.4rem; /* Match label padding */
}

/* Layout for API Key section */
.setting-item.api-key-item {
  grid-template-columns: auto 1fr auto; /* Label | Inputs | Help */
  grid-template-areas:
    'label inputs help'
    'description inputs help'; /* Description below label */
  align-items: start;
}
.setting-item.api-key-item .setting-label {
  grid-area: label;
  align-self: start;
  padding-top: 0.4rem;
}
.setting-item.api-key-item .setting-description {
  grid-area: description;
  margin-top: 0;
  padding-left: 0;
  grid-column: 1 / 2; /* Keep desc under label */
}
.setting-item.api-key-item .api-key-inputs {
  grid-area: inputs;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  justify-self: stretch;
  padding: 0.4rem 0;
}
.setting-item.api-key-item .help-button {
  grid-area: help;
  justify-self: end;
  align-self: start;
  margin-top: 0.4rem;
}

.api-key-entry {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.5rem;
}
.api-key-entry label {
  font-size: 0.9em;
  color: var(--text-secondary);
  text-align: right;
  min-width: 90px;
}
.api-key-input {
  max-width: none;
}

.setting-label {
  display: flex;
  flex-direction: column;
  font-weight: 500;
  font-family: sans-serif;
  cursor: default;
  margin-right: 1rem;
  line-height: 1.3;
}
.setting-description {
  font-size: 0.8em;
  color: var(--text-secondary);
  font-weight: 400;
  margin-top: 0.2rem;
  white-space: normal;
}

/* Align controls and help button to the end */
.settings-textarea,
.help-button,
.api-key-inputs {
  justify-self: end;
}

/* Control base styles */
.settings-textarea,
.settings-input {
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--border-color-medium);
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  font-family: sans-serif;
  font-size: 0.9em;
  flex-shrink: 0;
  box-sizing: border-box;
}
.settings-textarea:focus,
.settings-input:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.settings-textarea:disabled,
.settings-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-input-field) 70%, var(--bg-main-content));
}

.settings-textarea {
  width: 100%;
  resize: vertical;
  min-height: calc(1.4em * 4 + 0.8rem);
}

/* Help Button */
.help-button {
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  border: 1px solid var(--border-color-medium);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 0.8em;
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.help-button:hover {
  background-color: var(--bg-button-secondary-hover);
  color: var(--accent-color-primary);
  border-color: var(--accent-color-primary);
  transform: scale(1.1);
}

/* Advanced Section */
.advanced-toggle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 0.5rem;
  margin-top: 2rem;
  background-color: var(--bg-input-area);
  border: 1px solid var(--border-color-light);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  outline: none;
}
.advanced-toggle-header:hover {
  background-color: var(--bg-button-secondary-hover);
}
.advanced-toggle-header:focus-visible {
  border-color: var(--accent-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.advanced-toggle-header h3 {
  margin: 0;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.95em;
  user-select: none;
}
.advanced-arrow {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
  color: var(--text-button-secondary);
}
.advanced-arrow:hover {
  color: var(--accent-color-primary);
}
.advanced-arrow svg {
  display: block;
  width: 20px;
  height: 20px;
  fill: currentColor;
}
.advanced-arrow.expanded {
  transform: rotate(180deg);
}

.advanced-settings-section {
  padding: 1rem 1rem 0 1rem;
  border: 1px solid var(--border-color-light);
  border-top: none;
  border-radius: 0 0 6px 6px;
  margin-bottom: 1rem;
  background-color: var(--bg-main-content);
  overflow: hidden;
}
.advanced-settings-section .setting-item {
  padding-left: 0;
  padding-right: 0;
}

/* Collapse Transition */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease-in-out;
  max-height: 600px;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-width: 0;
  margin-top: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 600px;
}
</style>
