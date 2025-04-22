<template>
  <div>
    <div class="setting-item">
      <label for="tts-master-toggle" class="setting-label">
        Enable Text-to-Speech (TTS)
        <span class="setting-description">Allow the AI to speak responses aloud.</span>
      </label>
      <div
        class="toggle-switch-placeholder"
        id="tts-master-toggle"
        role="switch"
        :aria-checked="isTtsEnabled.toString()"
        @click="toggleTtsEnabled"
        @keydown.enter="toggleTtsEnabled"
        @keydown.space.prevent="toggleTtsEnabled"
        tabindex="0"
        :title="`Turn TTS ${isTtsEnabled ? 'OFF' : 'ON'}`"
        :disabled="!ttsSupported"
      >
        <div class="toggle-knob"></div>
      </div>
      <button class="help-button" @click="showTtsHelp">?</button>
    </div>

    <div class="setting-item">
      <label for="tts-voice-select" class="setting-label">
        AI Voice
        <span class="setting-description">Select the voice used for spoken responses.</span>
      </label>
      <select
        id="tts-voice-select"
        class="settings-select"
        v-model="selectedVoiceModelInternal"
        :disabled="!ttsSupported || availableVoices.length === 0"
      >
        <option :value="null">System Default</option>
        <option v-if="ttsSupported && availableVoices.length === 0" disabled>
          Loading voices...
        </option>
        <option v-if="!ttsSupported" disabled>TTS Not Available</option>
        <option v-for="voice in availableVoices" :key="voice.voiceURI" :value="voice.voiceURI">
          {{ voice.name }} ({{ voice.lang }})
        </option>
      </select>
      <button class="help-button" @click="showVoiceHelp">?</button>
    </div>

    <div class="setting-item">
      <label for="context-length" class="setting-label">
        Conversation Context
        <span class="setting-description"
          >How much past conversation to remember (Placeholder).</span
        >
      </label>
      <input
        type="range"
        id="context-length"
        class="settings-slider"
        min="1"
        max="10"
        value="5"
        disabled
      />
      <button class="help-button" @click="showContextHelp">?</button>
    </div>

    <div class="setting-item">
      <label for="send-enter-toggle" class="setting-label">
        Send on Enter Key
        <span class="setting-description"
          >Press Enter to send message (Shift+Enter for new line).</span
        >
      </label>
      <div
        class="toggle-switch-placeholder"
        id="send-enter-toggle"
        role="switch"
        aria-checked="true"
        tabindex="0"
        title="Toggle Send on Enter (Placeholder)"
      >
        <div class="toggle-knob"></div>
      </div>
      <button class="help-button" @click="showSendOnEnterHelp">?</button>
    </div>

    <div class="advanced-settings-section">
      <h3>Advanced Chat Settings</h3>
      <div class="setting-item">
        <label for="temperature-slider" class="setting-label">
          Temperature
          <span class="setting-description">Controls randomness. Lower is more focused.</span>
        </label>
        <input
          type="range"
          id="temperature-slider"
          class="settings-slider"
          min="0"
          max="1"
          step="0.1"
          value="0.7"
          disabled
        />
        <button class="help-button" @click="showTemperatureHelp">?</button>
      </div>
      <div class="setting-item">
        <label for="top-p-slider" class="setting-label">
          Top-P (Nucleus Sampling)
          <span class="setting-description">Alternative randomness control.</span>
        </label>
        <input
          type="range"
          id="top-p-slider"
          class="settings-slider"
          min="0"
          max="1"
          step="0.05"
          value="0.95"
          disabled
        />
        <button class="help-button" @click="showTopPHelp">?</button>
      </div>
      <div class="setting-item">
        <label for="safety-filter-select" class="setting-label">
          Safety Filtering Level
          <span class="setting-description">Adjust content safety filters (if available).</span>
        </label>
        <select id="safety-filter-select" class="settings-select" disabled>
          <option value="default">Default</option>
          <option value="medium">Medium</option>
          <option value="strict">Strict</option>
          <option value="none">None (Use with caution)</option>
        </select>
        <button class="help-button" @click="showSafetyHelp">?</button>
      </div>
      <div class="setting-item">
        <label class="setting-label">
          Clear Chat History
          <span class="setting-description">Permanently delete all current chat messages.</span>
        </label>
        <button class="quick-setting-button danger-button" disabled>Clear Now</button>
        <button class="help-button" @click="showClearHistoryHelp">?</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue'

// Define the props this component expects from its parent
const props = defineProps({
  isTtsEnabled: { type: Boolean, required: true },
  toggleTtsEnabled: { type: Function, required: true },
  ttsSupported: { type: Boolean, required: true },
  modelValue: { type: [String, null], required: true }, // For v-model on select
  availableVoices: { type: Array, required: true },
  showHelp: { type: Function, required: true }, // Function passed from parent/composable
})

// Define the event for v-model
const emit = defineEmits(['update:modelValue'])

// Internal computed property for v-model on select
const selectedVoiceModelInternal = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
  },
})

// --- Help Text Functions ---
// Define functions to call showHelp (passed as a prop) with specific text
const showTtsHelp = () => {
  props.showHelp(
    'Enable TTS',
    `Allows the AI's chat responses to be automatically read out loud using your browser's speech features.${!props.ttsSupported ? ' (TTS not supported by your browser or failed to initialize)' : ''} You can toggle speech for individual messages in the chat window.`,
  )
}

const showVoiceHelp = () => {
  props.showHelp(
    'AI Voice Selection',
    'Choose from available system voices for the AI\'s text-to-speech output. Availability depends on your browser and operating system. Select "System Default" to let the browser choose.',
  )
}

const showContextHelp = () => {
  props.showHelp(
    'Conversation Context',
    'Determines how many previous messages are sent to the AI with your new message. Higher values help the AI remember more context but may increase processing time and cost. (Setting not yet active)',
  )
}

const showSendOnEnterHelp = () => {
  props.showHelp(
    'Send on Enter',
    'When enabled, pressing the Enter key in the chat input will send the message. Press Shift+Enter to create a new line within the input box. When disabled, Enter creates a new line, and you must click the Send button. (Setting not yet active)',
  )
}

const showTemperatureHelp = () => {
  props.showHelp(
    'Temperature',
    "Controls the creativity/randomness of the AI's responses. Lower values (e.g., 0.2) make the output more deterministic and focused. Higher values (e.g., 0.9) make it more creative and unpredictable. Default is usually around 0.7. (Setting not yet active)",
  )
}

const showTopPHelp = () => {
  props.showHelp(
    'Top-P (Nucleus Sampling)',
    'An alternative way to control randomness. The AI considers only the most probable words whose cumulative probability mass exceeds the Top-P value. Lower values narrow the choices, higher values consider more options. Often used instead of Temperature. (Setting not yet active)',
  )
}

const showSafetyHelp = () => {
  props.showHelp(
    'Safety Filtering Level',
    "Adjusts the sensitivity of the AI's built-in safety filters for harmful content. Higher levels are more restrictive. Setting to 'None' may result in unfiltered or potentially offensive content. (Setting not yet active)",
  )
}

const showClearHistoryHelp = () => {
  props.showHelp(
    'Clear Chat History',
    'WARNING: Immediately and permanently deletes all messages in the current chat session for the selected assistant or default AI. This cannot be undone. (Action not yet active)',
  )
}
</script>

<style scoped>
/* Styles remain the same */
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
.settings-slider,
.settings-input, /* Although no input here yet */
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

/* Select, Slider, Button base styles */
.settings-select,
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
  min-width: 100px;
  max-width: 200px; /* Adjusted max-width for select */
  box-sizing: border-box;
}
.settings-select:focus,
.settings-slider:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.settings-select:disabled,
.settings-slider:disabled,
.quick-setting-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-input-field) 70%, var(--bg-main-content));
}

.settings-select {
  max-width: 250px; /* Allow select to be a bit wider for voice names */
}

.settings-slider {
  cursor: pointer;
  padding: 0;
  height: 20px;
  vertical-align: middle;
  min-width: 120px;
  max-width: 150px;
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
