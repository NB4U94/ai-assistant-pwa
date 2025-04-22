<template>
  <div>
    <div class="setting-item">
      <label for="startup-assistant-select" class="setting-label">
        Default Assistant on Startup
        <span class="setting-description">Which assistant is active when app opens.</span>
      </label>
      <select id="startup-assistant-select" class="settings-select" disabled>
        <option value="default">Default AI</option>
      </select>
      <button
        class="help-button"
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
        class="toggle-switch-placeholder"
        id="show-selector-toggle"
        role="switch"
        aria-checked="true"
        tabindex="0"
        title="Toggle Assistant Selector (Placeholder)"
      >
        <div class="toggle-knob"></div>
      </div>
      <button
        class="help-button"
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
    <div class="advanced-settings-section">
      <h3>Advanced Assistants Management</h3>
      <div class="setting-item">
        <label class="setting-label"
          >Export All Assistants
          <span class="setting-description">Save configurations of all assistants.</span>
        </label>
        <button class="quick-setting-button" disabled>Export All...</button>
        <button
          class="help-button"
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
        <label class="setting-label"
          >Import Assistants
          <span class="setting-description">Load assistant configurations from file.</span>
        </label>
        <button class="quick-setting-button" disabled>Import...</button>
        <button
          class="help-button"
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
        <label class="setting-label"
          >Delete All Custom Assistants
          <span class="setting-description">Permanently remove all created assistants.</span>
        </label>
        <button class="quick-setting-button danger-button" disabled>Delete All Now</button>
        <button
          class="help-button"
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
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

// Define the props this component expects from its parent
defineProps({
  showHelp: {
    type: Function,
    required: true,
  },
  // Add other props here later when functionality is added
  // e.g., assistantsList, defaultAssistantId, etc.
})
</script>

<style scoped>
/* Include styles consistent with other tabs */
.setting-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color-light);
  gap: 1rem;
}
.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  display: flex;
  flex-direction: column;
  font-weight: 500;
  font-family: sans-serif;
  cursor: default;
  margin-right: 1rem;
}
.setting-description {
  font-size: 0.8em;
  color: var(--text-secondary);
  font-weight: 400;
  margin-top: 0.2rem;
  white-space: normal;
}

.toggle-switch-placeholder,
.settings-select,
.quick-setting-button,
.help-button {
  justify-self: end; /* Align control to the end */
}

/* Toggle switch styles */
.toggle-switch-placeholder {
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
}
.toggle-switch-placeholder[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-input-field) 70%, var(--bg-main-content));
}
.toggle-switch-placeholder:not([disabled]):focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.toggle-switch-placeholder[aria-checked='true'] {
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
.toggle-switch-placeholder[aria-checked='true'] .toggle-knob {
  transform: translateX(20px);
}

/* Select, Button base styles */
.settings-select,
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
  max-width: 250px; /* Allow select to be wider */
  box-sizing: border-box;
}
.settings-select:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.settings-select:disabled,
.quick-setting-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-input-field) 70%, var(--bg-main-content));
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

/* Advanced section */
.advanced-settings-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid var(--border-color-medium);
}
.advanced-settings-section h3 {
  margin-bottom: 1rem;
  color: var(--text-secondary);
  font-weight: 600;
}
</style>
