<template>
  <div>
    <div class="setting-item">
      <label for="tts-master-toggle" class="setting-label">
        Enable Text-to-Speech (TTS)
        <span class="setting-description">Allow the AI to speak responses aloud.</span>
      </label>
      <div
        :class="['toggle-switch', { active: props.isTtsEnabled }]"
        class="toggle-switch"
        id="tts-master-toggle"
        role="switch"
        :aria-checked="props.isTtsEnabled.toString()"
        @click="props.toggleTtsEnabled"
        @keydown.enter="props.toggleTtsEnabled"
        @keydown.space.prevent="props.toggleTtsEnabled"
        tabindex="0"
        :title="`Turn TTS ${props.isTtsEnabled ? 'OFF' : 'ON'}`"
        :aria-disabled="!props.ttsSupported"
        :style="{
          cursor: props.ttsSupported ? 'pointer' : 'not-allowed',
          opacity: props.ttsSupported ? 1 : 0.5,
        }"
      >
        <div class="toggle-knob"></div>
      </div>
      <button
        class="help-button pulsing-help"
        @click="showTtsHelp"
        aria-label="Help with TTS"
        title="Help with TTS"
      >
        ?
      </button>
    </div>

    <div class="setting-item">
      <label for="tts-voice-select" class="setting-label">
        AI Voice
        <span class="setting-description">Select the voice used for spoken responses.</span>
      </label>
      <select
        id="tts-voice-select"
        class="settings-select"
        v-model="ttsVoiceModel"
        :disabled="!props.isTtsEnabled || !props.ttsSupported || props.availableVoices.length === 0"
        aria-label="AI Voice Selection"
      >
        <option :value="null">System Default</option>
        <option
          v-if="props.ttsSupported && props.availableVoices.length === 0 && props.isTtsEnabled"
          disabled
        >
          Loading voices...
        </option>
        <option v-if="!props.ttsSupported" disabled>TTS Not Supported by Browser</option>
        <option
          v-for="voice in props.availableVoices"
          :key="voice.voiceURI"
          :value="voice.voiceURI"
        >
          {{ voice.name }} ({{ voice.lang }})
        </option>
      </select>
      <button
        class="help-button pulsing-help"
        @click="showVoiceHelp"
        aria-label="Help with AI Voice"
        title="Help with AI Voice"
      >
        ?
      </button>
    </div>

    <div class="setting-item">
      <label for="context-length" class="setting-label">
        Conversation Context Length
        <span class="setting-description"
          >How many past message pairs to send ({{ settingsStore.MIN_CONTEXT_LENGTH }}-{{
            settingsStore.MAX_CONTEXT_LENGTH
          }}).</span
        >
      </label>
      <div class="slider-container">
        <input
          type="range"
          id="context-length"
          class="settings-slider"
          :min="settingsStore.MIN_CONTEXT_LENGTH"
          :max="settingsStore.MAX_CONTEXT_LENGTH"
          step="1"
          v-model.number="contextLengthModel"
          aria-label="Conversation Context Length"
        />
        <span class="slider-value">{{ contextLengthModel }}</span>
      </div>
      <button
        class="help-button pulsing-help"
        @click="showContextHelp"
        aria-label="Help with Context Length"
        title="Help with Context Length"
      >
        ?
      </button>
    </div>

    <div class="setting-item">
      <label for="send-enter-toggle" class="setting-label">
        Send on Enter Key
        <span class="setting-description">Press Enter to send (Shift+Enter for new line).</span>
      </label>
      <div
        :class="['toggle-switch', { active: props.sendOnEnter }]"
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
      <button
        class="help-button pulsing-help"
        @click="showSendOnEnterHelp"
        aria-label="Help with Send on Enter"
        title="Help with Send on Enter"
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
      <h3>Advanced Chat Settings</h3>
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
          <label for="chat-model-select" class="setting-label">
            Chat Model
            <span class="setting-description">Select the base AI model.</span>
          </label>
          <select
            id="chat-model-select"
            class="settings-select"
            v-model="modelIdModel"
            aria-label="Chat Model Selection"
          >
            <option value="gpt-4o">GPT-4o (Latest)</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
          <button
            class="help-button pulsing-help"
            @click="showChatModelHelp"
            aria-label="Help with Chat Model"
            title="Help with Chat Model"
          >
            ?
          </button>
        </div>

        <div class="setting-item">
          <label for="temperature-slider" class="setting-label">
            Temperature
            <span class="setting-description"
              >Controls randomness (0.0-2.0). Lower is more focused.</span
            >
          </label>
          <div class="slider-container">
            <input
              type="range"
              id="temperature-slider"
              class="settings-slider"
              min="0"
              max="2"
              step="0.1"
              v-model.number="temperatureModel"
              aria-label="Chat Temperature"
            />
            <span class="slider-value">{{ temperatureModel.toFixed(1) }}</span>
          </div>
          <button
            class="help-button pulsing-help"
            @click="showTemperatureHelp"
            aria-label="Help with Temperature"
            title="Help with Temperature"
          >
            ?
          </button>
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
              :min="settingsStore.MIN_TOP_P"
              :max="settingsStore.MAX_TOP_P"
              step="0.01"
              v-model.number="chatTopPModel"
              aria-label="Top-P Nucleus Sampling"
            />
            <span class="slider-value">{{ chatTopPModel.toFixed(2) }}</span>
          </div>
          <button
            class="help-button pulsing-help"
            @click="showTopPHelp"
            aria-label="Help with Top-P"
            title="Help with Top-P"
          >
            ?
          </button>
        </div>

        <div class="setting-item">
          <label for="max-tokens-input" class="setting-label">
            Max Response Tokens
            <span class="setting-description">Max length of AI response (approx words/chars).</span>
          </label>
          <input
            type="number"
            id="max-tokens-input"
            class="settings-input number-input"
            v-model="maxTokensModel"
            min="1"
            step="1"
            placeholder="e.g., 1024"
            aria-label="Maximum response tokens"
          />
          <button
            class="help-button pulsing-help"
            @click="showMaxTokensHelp"
            aria-label="Help with Max Tokens"
            title="Help with Max Tokens"
          >
            ?
          </button>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            Clear Chat History (Current Session)
            <span class="setting-description">Permanently delete messages in the active chat.</span>
          </label>
          <button class="quick-setting-button danger-button" @click="props.handleClearHistory">
            Clear Now
          </button>
          <button
            class="help-button pulsing-help"
            @click="showClearHistoryHelp"
            aria-label="Help with Clear History"
            title="Help with Clear History"
          >
            ?
          </button>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            Reset Chat Settings
            <span class="setting-description"
              >Reset all settings on this tab to their defaults.</span
            >
          </label>
          <button class="quick-setting-button" @click="props.handleResetChatDefaults">
            Reset Chat Defaults
          </button>
          <button
            class="help-button pulsing-help"
            @click="showResetChatHelp"
            aria-label="Help with Reset Chat Settings"
            title="Help with Reset Chat Settings"
          >
            ?
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref } from 'vue'
// *** Import store for constants ***
import { useSettingsStore } from '@/stores/settingsStore'

const settingsStore = useSettingsStore() // Get store instance for constants

// --- Props ---
const props = defineProps({
  isTtsEnabled: { type: Boolean, required: true },
  toggleTtsEnabled: { type: Function, required: true },
  ttsSupported: { type: Boolean, required: true },
  modelValue: { type: [String, null], default: null }, // For TTS Voice v-model
  availableVoices: { type: Array, required: true },
  showHelp: { type: Function, required: true },
  temperature: { type: Number, required: true },
  modelId: { type: String, required: true },
  maxTokens: { type: [Number, String, null], required: true }, // Allow null from store
  contextLength: { type: Number, required: true },
  sendOnEnter: { type: Boolean, required: true },
  toggleSendOnEnter: { type: Function, required: true },
  chatTopP: { type: Number, required: true },
  handleClearHistory: { type: Function, required: true },
  handleResetChatDefaults: { type: Function, required: true },
})

// --- Emits ---
const emit = defineEmits([
  'update:modelValue', // For TTS Voice v-model
  'update:temperature',
  'update:modelId',
  'update:maxTokens',
  'update:contextLength',
  'update:chatTopP',
])

// --- Computed properties for v-model bindings ---
const ttsVoiceModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
const contextLengthModel = computed({
  get: () => props.contextLength,
  set: (value) => emit('update:contextLength', Number(value)), // Ensure number
})
const modelIdModel = computed({
  get: () => props.modelId,
  set: (value) => emit('update:modelId', value),
})
const temperatureModel = computed({
  get: () => props.temperature,
  set: (value) => emit('update:temperature', Number(value)), // Ensure number
})
const chatTopPModel = computed({
  get: () => props.chatTopP,
  set: (value) => emit('update:chatTopP', Number(value)), // Ensure number
})
const maxTokensModel = computed({
  get: () => props.maxTokens,
  set: (value) => {
    // Emit empty string if input is cleared, otherwise emit number
    const numValue = value === '' ? '' : Number(value)
    emit('update:maxTokens', numValue)
  },
})

// --- Advanced Section State & Toggle ---
const isAdvancedVisible = ref(false) // Default collapsed
const toggleAdvanced = () => {
  isAdvancedVisible.value = !isAdvancedVisible.value
}

// --- Help Text Handlers ---
const showTtsHelp = () =>
  props.showHelp(
    'Enable TTS',
    `Allows the AI's chat responses to be spoken aloud using your browser's text-to-speech capabilities. Requires browser support.`,
  )
const showVoiceHelp = () =>
  props.showHelp(
    'AI Voice Selection',
    `Choose from the voices available in your browser or operating system. 'System Default' allows the browser to choose.`,
  )
const showContextHelp = () =>
  props.showHelp(
    'Conversation Context Length',
    `Determines how many previous pairs of user/AI messages are sent back to the AI with your new message. More context helps the AI remember the conversation better but uses more tokens (potentially increasing cost/time and hitting limits). Recommended range: 3-7.`,
  )
const showSendOnEnterHelp = () =>
  props.showHelp(
    'Send on Enter',
    `When enabled, pressing the Enter key in the chat input will send the message immediately. Use Shift+Enter to create a new line within the input box. When disabled, Enter creates a new line, and you must click the Send button.`,
  )
const showChatModelHelp = () =>
  props.showHelp(
    'Chat Model',
    'Selects the underlying AI language model used for generating chat responses. Different models have varying capabilities, knowledge cutoffs, speeds, and costs (e.g., GPT-4o is generally more capable but potentially slower/more expensive than GPT-3.5 Turbo).',
  )
const showTemperatureHelp = () =>
  props.showHelp(
    'Temperature (0.0 - 2.0)',
    `Controls the randomness of the AI's responses. Lower values (e.g., 0.2) make the output more focused, deterministic, and repetitive. Higher values (e.g., 1.0+) make it more creative, diverse, and potentially less coherent. Default is often around 0.7.`,
  )
const showMaxTokensHelp = () =>
  props.showHelp(
    'Max Response Tokens',
    "Limits the maximum length (in 'tokens', roughly parts of words) of the AI's generated response. Leave blank or set a high value (e.g., 1024 or more) for longer answers. Setting it too low might cut off responses abruptly.",
  )
const showTopPHelp = () =>
  props.showHelp(
    'Top-P (Nucleus Sampling) (0.0 - 1.0)',
    `An alternative method to control randomness. The AI considers only the most probable words whose cumulative probability exceeds the 'Top-P' value. A value of 1.0 considers all words. A lower value (e.g., 0.9) restricts the choices, making responses less random but potentially more coherent. It's generally recommended to adjust *either* Temperature *or* Top-P, not both simultaneously.`,
  )
const showClearHistoryHelp = () =>
  props.showHelp(
    'Clear Chat History',
    `WARNING: Immediately and permanently deletes all messages within the *currently active* chat session shown in the main chat view. This does NOT delete saved Memories unless you are currently viewing a loaded Memory (in which case it empties that Memory).`,
  )
const showResetChatHelp = () =>
  props.showHelp(
    'Reset Chat Settings',
    `Resets all options specifically on this "Chat" settings tab back to their original default values.`,
  )
</script>

<style scoped>
/* Reuse styles from SettingsTabGeneral where possible */
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
.toggle-switch, /* Use actual class */
.settings-select,
.settings-slider,
.settings-input,
.quick-setting-button,
.help-button,
.slider-container {
  justify-self: end;
}
.slider-container .settings-slider {
  justify-self: initial;
}

/* Control base styles */
.settings-select,
.settings-slider,
.settings-input {
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--border-color-medium);
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  font-family: sans-serif;
  font-size: 0.9em;
  flex-shrink: 0;
  min-width: 80px;
  max-width: 250px;
  box-sizing: border-box;
}
.settings-select:focus,
.settings-slider:focus,
.settings-input:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.settings-select:disabled,
.settings-slider:disabled,
.settings-input:disabled,
.quick-setting-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-input-field) 70%, var(--bg-main-content));
}

/* Toggle switch */
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
.toggle-switch[aria-disabled='true'] {
  /* Correct attribute selector */
  opacity: 0.5;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-input-field) 70%, var(--bg-main-content));
}
.toggle-switch:not([aria-disabled='true']):focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.toggle-switch[aria-checked='true'] {
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

/* Slider specific styles */
.slider-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.slider-value {
  font-size: 0.9em;
  color: var(--text-secondary);
  min-width: 4ch;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.settings-slider {
  cursor: pointer;
  padding: 0;
  height: 20px;
  vertical-align: middle;
  min-width: 120px;
  max-width: 150px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  border: none;
}
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
  -webkit-appearance: none;
  appearance: none;
  margin-top: -7px;
  background: var(--accent-color-primary);
  height: 20px;
  width: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid var(--bg-input-field);
}
.settings-slider::-moz-range-thumb {
  background: var(--accent-color-primary);
  height: 16px;
  width: 16px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid var(--bg-input-field);
}
.settings-slider:focus::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color-primary) 30%, transparent);
}
.settings-slider:focus::-moz-range-thumb {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color-primary) 30%, transparent);
}

/* Input number specific styles */
.settings-input {
  max-width: 150px;
  text-align: right;
}
.settings-input[type='number'] {
  -moz-appearance: textfield;
}
.settings-input[type='number']::-webkit-outer-spin-button,
.settings-input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Button styles */
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
  background-color: var(--bg-error, #a04040);
  color: var(--text-light, white);
  border-color: var(--bg-error, #a04040);
}
.danger-button:not(:disabled):hover {
  background-color: color-mix(in srgb, var(--bg-error, #a04040) 85%, black);
  border-color: color-mix(in srgb, var(--bg-error, #a04040) 85%, black);
}
.setting-item:has(.quick-setting-button:not(.danger-button)) .quick-setting-button {
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  border-color: var(--border-color-medium);
}
.setting-item:has(.quick-setting-button:not(.danger-button))
  .quick-setting-button:not(:disabled):hover {
  background-color: var(--bg-button-secondary-hover);
}

/* Help button */
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
