<template>
  <div>
    <div class="setting-item">
      <label for="theme-toggle" class="setting-label">
        Theme
        <span class="setting-description">Switch between light and dark mode.</span>
      </label>
      <div
        class="toggle-switch-placeholder"
        id="theme-toggle"
        role="switch"
        :aria-checked="isDarkMode.toString()"
        @click="toggleTheme"
        @keydown.enter="toggleTheme"
        @keydown.space.prevent="toggleTheme"
        tabindex="0"
        :title="`Switch to ${isDarkMode ? 'light' : 'dark'} mode`"
      >
        <div class="toggle-knob"></div>
      </div>
      <button
        class="help-button"
        @click="
          showHelp(
            'Theme Setting',
            'This setting controls the overall appearance of the application. \'Dark\' mode uses a darker color scheme, which can be easier on the eyes in low light. \'Light\' mode uses a brighter scheme, which some users prefer during the day. Your choice is saved automatically.',
          )
        "
        aria-label="Help with Theme Setting"
        title="Help with Theme Setting"
      >
        ?
      </button>
    </div>

    <div class="setting-item">
      <label for="font-size-slider" class="setting-label">
        App Font Size
        <span class="setting-description">Adjust the base text size across the app.</span>
      </label>
      <div class="slider-container">
        <input
          type="range"
          id="font-size-slider"
          class="settings-slider"
          min="80"
          max="120"
          v-model="fontSizeModel"
          aria-label="App Font Size"
        />
        <span class="slider-value">{{ fontSizeModel }}%</span>
      </div>
      <button
        class="help-button"
        @click="
          showHelp(
            'App Font Size',
            'Increases or decreases the size of most text within the application (as a percentage of the default size) for better readability. Affects menus, chat bubbles, settings descriptions, etc.',
          )
        "
      >
        ?
      </button>
    </div>

    <div class="setting-item">
      <label for="notification-toggle" class="setting-label">
        Enable Notifications (Placeholder)
        <span class="setting-description">Allow the app to send browser notifications.</span>
      </label>
      <div
        class="toggle-switch-placeholder"
        id="notification-toggle"
        role="switch"
        aria-checked="false"
        tabindex="0"
        title="Toggle Notifications (Placeholder)"
      >
        <div class="toggle-knob"></div>
      </div>
      <button
        class="help-button"
        @click="
          showHelp(
            'Enable Notifications',
            'Allows the application to show pop-up notifications through your browser, for example, when a long process finishes. You may need to grant permission in your browser settings. (Setting not yet active)',
          )
        "
      >
        ?
      </button>
    </div>

    <div class="advanced-settings-section">
      <h3>Advanced General Settings</h3>
      <div class="setting-item">
        <label class="setting-label"
          >Export Settings
          <span class="setting-description">Save your current app settings to a file.</span>
        </label>
        <button class="quick-setting-button" disabled>Export...</button>
        <button
          class="help-button"
          @click="
            showHelp(
              'Export Settings',
              'Creates a file containing all your current application settings (theme, chat preferences, etc.) that you can save as a backup or transfer to another device. (Action not yet active)',
            )
          "
        >
          ?
        </button>
      </div>
      <div class="setting-item">
        <label class="setting-label"
          >Import Settings
          <span class="setting-description"
            >Load app settings from a previously exported file.</span
          >
        </label>
        <button class="quick-setting-button" disabled>Import...</button>
        <button
          class="help-button"
          @click="
            showHelp(
              'Import Settings',
              'Loads settings from a file you previously exported. This will overwrite your current settings. (Action not yet active)',
            )
          "
        >
          ?
        </button>
      </div>
      <div class="setting-item">
        <label class="setting-label"
          >Reset All Settings
          <span class="setting-description"
            >Restore all application settings to their defaults.</span
          >
        </label>
        <button class="quick-setting-button danger-button" disabled>Reset Now</button>
        <button
          class="help-button"
          @click="
            showHelp(
              'Reset All Settings',
              'WARNING: This will immediately reset all settings across all tabs (General, Chat, Image Gen, Assistants) back to their original default values. This action cannot be undone. (Action not yet active)',
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
import { defineProps, defineEmits, computed } from 'vue'

// Define the props this component expects from its parent
const props = defineProps({
  isDarkMode: { type: Boolean, required: true },
  toggleTheme: { type: Function, required: true },
  showHelp: { type: Function, required: true },
  modelValue: { type: Number, required: true }, // Use modelValue for font size (v-model)
})

// Define the event for v-model updates
const emit = defineEmits(['update:modelValue'])

// Internal computed property for v-model on the range slider
const fontSizeModel = computed({
  get: () => props.modelValue,
  set: (value) => {
    // Ensure value is treated as a number when emitting
    emit('update:modelValue', Number(value))
  },
})
</script>

<style scoped>
/* Include styles consistent with other tabs */
.setting-item {
  display: grid;
  /* Adjust grid for potential value display next to slider */
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

/* NEW: Container for slider and its value */
.slider-container {
  display: flex;
  align-items: center;
  gap: 0.75rem; /* Space between slider and value */
  justify-self: end; /* Align the container to the end */
}

/* NEW: Style for the value display */
.slider-value {
  font-size: 0.9em;
  color: var(--text-secondary);
  min-width: 4ch; /* Ensure space for '100%' */
  text-align: right;
  font-variant-numeric: tabular-nums; /* Keep numbers aligned */
}

.toggle-switch-placeholder,
.settings-slider,
.quick-setting-button,
.help-button {
  justify-self: end; /* Align control to the end */
}
/* Remove justify-self from slider-container itself if its children handle alignment */
.slider-container {
  justify-self: end;
}

.settings-slider {
  justify-self: initial; /* Let slider take space within flex container */
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

/* Slider, Button base styles */
.settings-slider,
.quick-setting-button {
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

.settings-slider {
  cursor: pointer;
  padding: 0; /* Remove padding for range input */
  height: 20px; /* Consistent height */
  vertical-align: middle;
  min-width: 120px;
  max-width: 150px;
}

.quick-setting-button {
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
  padding: 0.5rem 1rem; /* Keep padding for buttons */
  min-width: 100px;
  max-width: 200px;
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

.settings-slider:disabled,
.quick-setting-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-input-field) 70%, var(--bg-main-content));
}
.settings-slider:focus {
  outline: none;
  border-color: var(--accent-color-primary); /* Might not show on range */
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent); /* Might not show on range */
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
  justify-self: end; /* Ensure it aligns right */
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
