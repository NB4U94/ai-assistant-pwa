<template>
  <div>
    <div class="setting-item">
      <label for="tts-master-toggle" class="setting-label">
        Enable Text-to-Speech (TTS)
        <span class="setting-description">Allow the AI to speak responses aloud.</span>
      </label>
      <div
        :class="['toggle-switch-placeholder', { active: props.isTtsEnabled }]"
        id="tts-master-toggle"
        role="switch"
        :aria-checked="props.isTtsEnabled.toString()"
        @click="props.toggleTtsEnabled"
        @keydown.enter="props.toggleTtsEnabled"
        @keydown.space.prevent="props.toggleTtsEnabled"
        tabindex="0"
        :title="`Turn TTS ${props.isTtsEnabled ? 'OFF' : 'ON'}`"
        :disabled="!props.ttsSupported"
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
        :value="props.modelValue"
        @change="emit('update:modelValue', $event.target.value)"
        :disabled="!props.ttsSupported || props.availableVoices.length === 0"
      >
        <option :value="null">System Default</option>
        <option v-if="props.ttsSupported && props.availableVoices.length === 0" disabled>
          Loading voices...
        </option>
        <option v-if="!props.ttsSupported" disabled>TTS Not Available</option>
        <option
          v-for="voice in props.availableVoices"
          :key="voice.voiceURI"
          :value="voice.voiceURI"
        >
          {{ voice.name }} ({{ voice.lang }})
        </option>
      </select>
      <button class="help-button" @click="showVoiceHelp">?</button>
    </div>

    <div class="setting-item">
      <label for="context-length" class="setting-label">
        Conversation Context Length
        <span class="setting-description"
          >How many past message pairs to send as context (1-10).</span
        >
      </label>
      <div class="slider-container">
        <input
          type="range"
          id="context-length"
          class="settings-slider"
          min="1"
          max="10"
          step="1"
          :value="props.contextLength"
          @input="emit('update:contextLength', Number($event.target.value))"
          aria-label="Conversation Context Length"
        />
        <span class="slider-value">{{ props.contextLength }}</span>
      </div>
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
        :class="['toggle-switch-placeholder', { active: props.sendOnEnter }]"
        id="send-enter-toggle"
        role="switch"
        :aria-checked="props.sendOnEnter.toString()"
        @click="props.toggleSendOnEnter"
        @keydown.enter="props.toggleSendOnEnter"
        @keydown.space.prevent="props.toggleSendOnEnter"
        tabindex="0"
        :title="`Turn Send on Enter ${props.sendOnEnter ? 'OFF' : 'ON'}`"
      >
        <div class="toggle-knob"></div>
      </div>
      <button class="help-button" @click="showSendOnEnterHelp">?</button>
    </div>

    <div class="advanced-settings-section">
      <h3>Advanced Chat Settings</h3>

      <div class="setting-item">
        <label for="chat-model-select" class="setting-label">
          Chat Model
          <span class="setting-description">Select the base AI model.</span>
        </label>
        <select
          id="chat-model-select"
          class="settings-select"
          :value="props.modelId"
          @change="emit('update:modelId', $event.target.value)"
          aria-label="Chat Model Selection"
        >
          <option value="gpt-4o">GPT-4o (Latest)</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
        </select>
        <button class="help-button" @click="showChatModelHelp">?</button>
      </div>

      <div class="setting-item">
        <label for="temperature-slider" class="setting-label">
          Temperature
          <span class="setting-description">Controls randomness. Lower is more focused.</span>
        </label>
        <div class="slider-container">
          <input
            type="range"
            id="temperature-slider"
            class="settings-slider"
            min="0"
            max="2"
            step="0.1"
            :value="props.temperature"
            @input="emit('update:temperature', Number($event.target.value))"
            aria-label="Chat Temperature"
          />
          <span class="slider-value">{{ props.temperature.toFixed(1) }}</span>
        </div>
        <button class="help-button" @click="showTemperatureHelp">?</button>
      </div>

      <div class="setting-item">
        <label for="top-p-slider" class="setting-label">
          Top-P (Nucleus Sampling)
          <span class="setting-description">Alternative randomness control (0.0 - 1.0).</span>
        </label>
        <div class="slider-container">
          <input
            type="range"
            id="top-p-slider"
            class="settings-slider"
            min="0"
            max="1"
            step="0.01"
            :value="props.chatTopP"
            @input="emit('update:chatTopP', Number($event.target.value))"
            aria-label="Top-P Nucleus Sampling"
          />
          <span class="slider-value">{{ props.chatTopP.toFixed(2) }}</span>
        </div>
        <button class="help-button" @click="showTopPHelp">?</button>
      </div>

      <div class="setting-item">
        <label for="max-tokens-input" class="setting-label">
          Max Response Tokens
          <span class="setting-description">Max length of AI response.</span>
        </label>
        <input
          type="number"
          id="max-tokens-input"
          class="settings-input"
          :value="props.maxTokens"
          @input="
            emit('update:maxTokens', $event.target.value === '' ? '' : Number($event.target.value))
          "
          min="1"
          step="1"
          placeholder="e.g., 1024"
          aria-label="Maximum response tokens"
        />
        <button class="help-button" @click="showMaxTokensHelp">?</button>
      </div>

      <div class="setting-item">
        <label class="setting-label">
          Clear Chat History
          <span class="setting-description"
            >Permanently delete messages in the current session.</span
          >
        </label>
        <button class="quick-setting-button danger-button" @click="props.handleClearHistory">
          Clear Now
        </button>
        <button class="help-button" @click="showClearHistoryHelp">?</button>
      </div>

      <div class="setting-item">
        <label class="setting-label">
          Reset Chat Settings
          <span class="setting-description">Reset all settings on this tab to their defaults.</span>
        </label>
        <button class="quick-setting-button" @click="props.handleResetChatDefaults">
          Reset Chat Defaults
        </button>
        <button class="help-button" @click="showResetChatHelp">?</button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Script remains the same as the previous version
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  isTtsEnabled: { type: Boolean, required: true },
  toggleTtsEnabled: { type: Function, required: true },
  ttsSupported: { type: Boolean, required: true },
  modelValue: { type: [String, null], default: null },
  availableVoices: { type: Array, required: true },
  showHelp: { type: Function, required: true },
  temperature: { type: Number, required: true },
  modelId: { type: String, required: true },
  maxTokens: { type: [Number, String], required: true },
  contextLength: { type: Number, required: true },
  sendOnEnter: { type: Boolean, required: true },
  toggleSendOnEnter: { type: Function, required: true },
  chatTopP: { type: Number, required: true },
  handleClearHistory: { type: Function, required: true },
  handleResetChatDefaults: { type: Function, required: true },
})

const emit = defineEmits([
  'update:modelValue',
  'update:temperature',
  'update:modelId',
  'update:maxTokens',
  'update:contextLength',
  'update:chatTopP',
])

const showTtsHelp = () =>
  props.showHelp('Enable TTS', `Allows the AI's chat responses to be spoken aloud...`)
const showVoiceHelp = () =>
  props.showHelp('AI Voice Selection', `Choose from available system voices...`)
const showContextHelp = () =>
  props.showHelp('Conversation Context Length', 'Determines how many previous message pairs...')
const showSendOnEnterHelp = () =>
  props.showHelp('Send on Enter', `When enabled, pressing the Enter key...`)
const showChatModelHelp = () => props.showHelp('Chat Model', 'Selects the underlying AI engine...')
const showTemperatureHelp = () =>
  props.showHelp('Temperature', `Controls the perceived creativity/randomness...`)
const showMaxTokensHelp = () =>
  props.showHelp('Max Response Tokens', "Limits the maximum length of the AI's response...")
const showTopPHelp = () =>
  props.showHelp('Top-P (Nucleus Sampling)', `An alternative way to control randomness...`)
const showClearHistoryHelp = () =>
  props.showHelp('Clear Chat History', `WARNING: Immediately and permanently deletes...`)
const showResetChatHelp = () =>
  props.showHelp('Reset Chat Settings', `Resets all options on this "Chat" tab...`)
</script>

<style scoped>
/* --- Toggle active state CSS UPDATED FOR SPECIFICITY --- */
/* Use element.class.class selector */
div.toggle-switch-placeholder.active {
  background-color: var(--accent-color-primary); /* Use theme variable */
}
/* Also target knob within active toggle */
div.toggle-switch-placeholder.active .toggle-knob {
  transform: translateX(20px);
}
/* --- End CSS Update --- */

/* Styles remain the same */
/* ... all other styles from previous version ... */
.setting-item {
  display: grid;
  grid-template-columns: 1fr auto auto; /* Label | Control | Help */
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color-light);
  gap: 1rem; /* Gap between columns */
}
.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  display: flex;
  flex-direction: column;
  font-weight: 500;
  font-family: sans-serif;
  cursor: default; /* Labels aren't interactive themselves */
  margin-right: 1rem; /* Space between label and control */
}

.setting-description {
  font-size: 0.8em;
  color: var(--text-secondary);
  font-weight: 400;
  margin-top: 0.2rem;
  white-space: normal; /* Allow description to wrap */
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 0.75rem; /* Space between slider and value display */
  justify-self: end; /* Align container to the right grid column */
}

.slider-value {
  font-size: 0.9em;
  color: var(--text-secondary);
  min-width: 4ch; /* Ensure space for values like 1.00 or 10 */
  text-align: right;
  font-variant-numeric: tabular-nums; /* Keep numbers aligned */
}

/* Align controls and buttons to the right */
.toggle-switch-placeholder,
.settings-select,
.settings-slider, /* Slider itself within its container */
.settings-input,
.quick-setting-button,
.help-button {
  justify-self: end; /* Align item itself to the end of its grid cell */
}
/* Override for slider within its container */
.slider-container .settings-slider {
  justify-self: initial; /* Slider takes space within the flex container */
}

.toggle-switch-placeholder {
  width: 44px;
  height: 24px;
  background-color: var(--bg-button-secondary);
  border-radius: 12px;
  padding: 2px;
  cursor: pointer;
  display: flex; /* Use flex to align knob */
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

.toggle-knob {
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
}

/* Select, Input, Buttons Base Styles */
.settings-select,
.settings-input,
.quick-setting-button {
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--border-color-medium);
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  font-family: sans-serif;
  font-size: 0.9em;
  flex-shrink: 0; /* Prevent shrinking in grid */
  box-sizing: border-box;
  min-width: 80px; /* Minimum width */
}
.settings-select:focus,
.settings-input:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.settings-select:disabled,
.settings-input:disabled,
.quick-setting-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-input-field) 70%, var(--bg-main-content));
}

/* Specific Control Styles */
.settings-select {
  max-width: 250px; /* Limit dropdown width */
}

.settings-slider {
  cursor: pointer;
  padding: 0;
  height: 20px; /* Example height */
  vertical-align: middle;
  min-width: 120px; /* Ensure slider has decent width */
  max-width: 150px;
  /* Add appearance reset if needed */
  -webkit-appearance: none;
  appearance: none;
  background: transparent; /* Let track be styled */
  border: none; /* Remove default border if any */
}
/* Optional: Style slider thumb/track */
.settings-slider::-webkit-slider-runnable-track {
  height: 6px;
  background: var(--border-color-light);
  border-radius: 3px;
}
.settings-slider::-moz-range-track {
  height: 6px;
  background: var(--border-color-light);
  border-radius: 3px;
}
.settings-slider::-webkit-slider-thumb {
  -webkit-appearance: none; /* Override default look */
  appearance: none;
  margin-top: -7px; /* Center thumb on track (tweak as needed) */
  background: var(--accent-color-primary);
  height: 20px;
  width: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid var(--bg-input-field); /* Match background */
}
.settings-slider::-moz-range-thumb {
  background: var(--accent-color-primary);
  height: 16px; /* Firefox might size slightly differently */
  width: 16px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid var(--bg-input-field);
}
.settings-slider:focus::-webkit-slider-thumb {
  /* Focus style for thumb */
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color-primary) 30%, transparent);
}
.settings-slider:focus::-moz-range-thumb {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color-primary) 30%, transparent);
}

.settings-input {
  max-width: 150px;
  text-align: right; /* Align number input text */
}
.settings-input[type='number'] {
  -moz-appearance: textfield; /* Firefox */
}
.settings-input[type='number']::-webkit-outer-spin-button,
.settings-input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none; /* Safari and Chrome */
  margin: 0;
}

.quick-setting-button {
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
  padding: 0.5rem 1rem;
  max-width: 200px;
}
.quick-setting-button:not(:disabled):hover {
  background-color: var(--bg-button-secondary-hover);
}
.danger-button {
  background-color: var(--bg-error, #a04040); /* Use a variable or fallback */
  color: var(--text-light, white);
  border-color: var(--bg-error, #a04040);
}
.danger-button:not(:disabled):hover {
  background-color: color-mix(in srgb, var(--bg-error, #a04040) 85%, black);
  border-color: color-mix(in srgb, var(--bg-error, #a04040) 85%, black);
}

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

/* Style for the new reset button - can be adjusted */
.setting-item:has(.quick-setting-button:not(.danger-button)) .quick-setting-button {
  background-color: var(--bg-button-secondary); /* Default secondary style */
  color: var(--text-button-secondary);
  border-color: var(--border-color-medium);
}
.setting-item:has(.quick-setting-button:not(.danger-button))
  .quick-setting-button:not(:disabled):hover {
  background-color: var(--bg-button-secondary-hover);
}
</style>
