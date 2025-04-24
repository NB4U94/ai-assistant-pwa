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
        class="help-button pulsing-help"
        @click="
          showHelp(
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

    <div class="setting-item">
      <label class="setting-label">
        Assistant API Keys
        <span class="setting-description"
          >Manage API keys if using external models for assistants.</span
        >
      </label>
      <div class="placeholder-text">(Future: Add inputs for OpenAI, Anthropic, etc. keys here)</div>
      <button
        class="help-button pulsing-help"
        @click="
          showHelp(
            'Assistant API Keys',
            'This section will allow you to enter your own API keys for different AI model providers (like OpenAI) if you want custom assistants to use specific external models. This feature is not yet implemented.',
          )
        "
        aria-label="Help with Assistant API Keys"
        title="Help with Assistant API Keys"
      >
        ?
      </button>
    </div>

    <div
      class="advanced-toggle-header"
      @click="toggleAdvanced"
      tabindex="0"
      @keydown.enter.prevent="toggleAdvanced"
      @keydown.space.prevent="toggleAdvanced"
    >
      <h3>Advanced Assistants Management</h3>
      <button
        class="advanced-arrow"
        :class="{ expanded: isAdvancedVisible }"
        aria-label="Toggle Advanced Settings"
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
        <div class="setting-item">
          <label for="startup-assistant-select" class="setting-label">
            Default Assistant on Startup
            <span class="setting-description">Which assistant is active when app opens.</span>
          </label>
          <select id="startup-assistant-select" class="settings-select" disabled>
            <option value="main_chat">Default AI (Nb4U-Ai)</option>
          </select>
          <button
            class="help-button pulsing-help"
            @click="
              showHelp(
                'Default Assistant on Startup',
                'Choose which Assistant (including the Default AI) should be automatically selected in the Chat view every time you open the application. (Setting not yet active)',
              )
            "
          >
            ?
          </button>
        </div>

        <div class="setting-item">
          <label for="show-selector-toggle" class="setting-label">
            Show Assistant Selector Bar
            <span class="setting-description">Display the bar above chat input.</span>
          </label>
          <div
            class="toggle-switch disabled-placeholder"
            id="show-selector-toggle"
            role="switch"
            aria-checked="true"
            tabindex="-1"
          >
            <div class="toggle-knob"></div>
          </div>
          <button
            class="help-button pulsing-help"
            @click="
              showHelp(
                'Show Assistant Selector Bar',
                'Controls whether the horizontal bar allowing you to switch between Assistants is visible above the chat input area. (Setting not yet active)',
              )
            "
          >
            ?
          </button>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            Export All Assistants
            <span class="setting-description">Save configurations of all assistants.</span>
          </label>
          <button class="quick-setting-button" disabled>Export All...</button>
          <button
            class="help-button pulsing-help"
            @click="
              showHelp(
                'Export All Assistants',
                'Creates a single file containing the configurations for all custom assistants you have created. Useful for backups or transferring. (Action not yet active)',
              )
            "
          >
            ?
          </button>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            Import Assistants
            <span class="setting-description">Load assistant configurations from file.</span>
          </label>
          <button class="quick-setting-button" disabled>Import...</button>
          <button
            class="help-button pulsing-help"
            @click="
              showHelp(
                'Import Assistants',
                'Loads assistant configurations from a previously exported file. Imported assistants will be added to your existing list. (Action not yet active)',
              )
            "
          >
            ?
          </button>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            Delete All Custom Assistants
            <span class="setting-description">Permanently remove all created assistants.</span>
          </label>
          <button class="quick-setting-button danger-button" disabled>Delete All Now</button>
          <button
            class="help-button pulsing-help"
            @click="
              showHelp(
                'Delete All Custom Assistants',
                'WARNING: This will immediately and permanently delete ALL the custom assistants you have created. This action cannot be undone. (Action not yet active)',
              )
            "
          >
            ?
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { defineProps, ref } from 'vue'
// *** Import store and utilities ***
import { useSettingsStore } from '@/stores/settingsStore'
import { storeToRefs } from 'pinia'

// --- Props ---
defineProps({
  showHelp: {
    type: Function,
    required: true,
  },
  // Add other props here later if needed
})

// --- Store Access ---
const settingsStore = useSettingsStore()
// Get needed state ref for v-model
const { assistantsDefaultInstructions } = storeToRefs(settingsStore)

// --- Advanced Section State & Toggle ---
const isAdvancedVisible = ref(false) // Default collapsed
const toggleAdvanced = () => {
  isAdvancedVisible.value = !isAdvancedVisible.value
}
</script>

<style scoped>
/* Reuse styles from other Setting Tab components */
.setting-item {
  display: grid;
  grid-template-columns: 1fr auto auto; /* Label | Control | Help */
  align-items: center; /* Align items vertically */
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color-light);
  gap: 1rem;
}
.setting-item:last-child {
  border-bottom: none;
}
/* Special layout for wide items like textareas */
.setting-item.wide-item {
  grid-template-columns: auto 1fr auto;
  grid-template-areas:
    'label control help'
    '. description .';
  align-items: start; /* Align top for multi-line */
}
.setting-item.wide-item .setting-label {
  grid-area: label;
  align-self: start;
}
.setting-item.wide-item .setting-description {
  grid-area: description;
  padding-left: 0;
  padding-top: 0.3rem;
}
.setting-item.wide-item .settings-textarea {
  grid-area: control;
  justify-self: stretch;
}
.setting-item.wide-item .help-button {
  grid-area: help;
  justify-self: end;
  align-self: start;
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
.settings-select,
.settings-textarea,
.quick-setting-button,
.help-button,
.placeholder-text,
.toggle-switch.disabled-placeholder {
  justify-self: end;
}

/* Control base styles */
.settings-select,
.settings-textarea,
.quick-setting-button {
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--border-color-medium);
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  font-family: sans-serif;
  font-size: 0.9em;
  flex-shrink: 0;
  min-width: 100px;
  max-width: 250px; /* Default max width */
  box-sizing: border-box;
}
.settings-select:focus,
.settings-textarea:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.settings-select:disabled,
.settings-textarea:disabled,
.quick-setting-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-input-field) 70%, var(--bg-main-content));
}

.settings-textarea {
  max-width: 100%; /* Allow textarea to fill grid area */
  resize: vertical;
  min-height: calc(1.4em * 4 + 0.8rem); /* Approx 4 rows */
}

.quick-setting-button {
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
  padding: 0.5rem 1rem;
}
.quick-setting-button:not(:disabled):hover {
  background-color: var(--bg-button-secondary-hover);
}
.danger-button {
  background-color: var(--bg-error, #a04040);
  color: var(--text-light, white);
  border-color: var(--bg-error, #a04040);
}
.danger-button:not(:disabled):hover {
  background-color: color-mix(in srgb, var(--bg-error, #a04040) 85%, black);
  border-color: color-mix(in srgb, var(--bg-error, #a04040) 85%, black);
}

.placeholder-text {
  font-style: italic;
  color: var(--text-secondary);
  font-size: 0.9em;
  text-align: right;
  padding: 0.4rem 0.6rem;
}

/* Disabled toggle switch styling */
.toggle-switch {
  width: 44px;
  height: 24px;
  background-color: var(--bg-button-secondary);
  border-radius: 12px;
  padding: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background-color 0.3s ease;
  flex-shrink: 0;
  border: 1px solid var(--border-color-medium);
  outline: none;
  box-sizing: content-box;
}
.toggle-switch.disabled-placeholder {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-input-field) 70%, var(--bg-main-content));
}
.toggle-switch[aria-checked='true']:not(.disabled-placeholder) {
  background-color: var(--accent-color-primary);
}
.toggle-knob {
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
}
.toggle-switch[aria-checked='true'] .toggle-knob {
  transform: translateX(20px);
}

/* Help button style */
.help-button {
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 0.9em;
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background-color 0.2s ease;
  outline: none;
}
.help-button:focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.help-button:hover {
  background-color: var(--bg-button-secondary-hover);
}
.help-button.pulsing-help {
  animation: faintGreenPulse 3s infinite alternate ease-in-out;
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
  margin: 0;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    transform 0.3s ease,
    color 0.2s ease;
  animation: faintGreenPulse 3.5s infinite alternate ease-in-out;
}
.advanced-arrow:hover {
  color: var(--text-primary);
}
.advanced-arrow svg {
  display: block;
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
