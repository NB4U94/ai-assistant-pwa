<template>
  <div>
    <div class="setting-item">
      <label for="tts-master-toggle" class="setting-label">
        Enable Text-to-Speech (TTS)
        <span class="setting-description">Allow the AI to speak responses aloud.</span>
      </label>
      <div
        :class="['toggle-switch', { active: props.isTtsEnabled }]"
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
        class="help-button"
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
        class="help-button"
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
        class="help-button"
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
        class="help-button"
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
        class="advanced-arrow solid-glow-effect-primary"
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
            Chat Model <span class="setting-description">Select the base AI model for chats.</span>
          </label>
          <select
            id="chat-model-select"
            class="settings-select"
            v-model="modelIdModel"
            aria-label="Chat Model Selection"
          >
            <option
              v-for="model in settingsStore.VALID_CHAT_MODELS"
              :key="model.id"
              :value="model.id"
            >
              {{ model.name }}
            </option>
          </select>
          <button
            class="help-button"
            @click="showChatModelHelp"
            aria-label="Help with Chat Model"
            title="Help with Chat Model"
          >
            ?
          </button>
        </div>
        <div class="setting-item">
          <label for="temperature-slider" class="setting-label">
            Temperature <span class="setting-description">Controls randomness (0.0-2.0).</span>
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
            class="help-button"
            @click="showTemperatureHelp"
            aria-label="Help with Temperature"
            title="Help with Temperature"
          >
            ?
          </button>
        </div>
        <div class="setting-item">
          <label for="top-p-slider" class="setting-label">
            Top-P
            <span class="setting-description"
              >Alt. randomness control ({{ settingsStore.MIN_TOP_P.toFixed(1) }} -
              {{ settingsStore.MAX_TOP_P.toFixed(1) }}).</span
            >
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
            class="help-button"
            @click="showTopPHelp"
            aria-label="Help with Top-P"
            title="Help with Top-P"
          >
            ?
          </button>
        </div>
        <div class="setting-item">
          <label for="max-tokens-input" class="setting-label">
            Max Response Tokens <span class="setting-description">Max length of AI response.</span>
          </label>
          <input
            type="number"
            id="max-tokens-input"
            class="settings-input number-input"
            v-model="maxTokensModel"
            min="1"
            step="1"
            placeholder="Model Default"
            aria-label="Maximum response tokens"
          />
          <button
            class="help-button"
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
            class="help-button"
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
            <span class="setting-description">Reset all settings on this tab to defaults.</span>
          </label>
          <button class="quick-setting-button" @click="props.handleResetChatDefaults">
            Reset Chat Defaults
          </button>
          <button
            class="help-button"
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
// Script setup remains the same
import { defineProps, defineEmits, computed, ref } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
const settingsStore = useSettingsStore()
const props = defineProps({
  isTtsEnabled: { type: Boolean, required: true },
  toggleTtsEnabled: { type: Function, required: true },
  ttsSupported: { type: Boolean, required: true },
  modelValue: { type: [String, null], default: null },
  availableVoices: { type: Array, required: true },
  showHelp: { type: Function, required: true },
  temperature: { type: Number, required: true },
  modelId: { type: String, required: true },
  maxTokens: { type: [Number, String, null], required: true },
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
const ttsVoiceModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
const contextLengthModel = computed({
  get: () => props.contextLength,
  set: (value) => emit('update:contextLength', Number(value)),
})
const modelIdModel = computed({
  get: () => props.modelId,
  set: (value) => emit('update:modelId', value),
})
const temperatureModel = computed({
  get: () => props.temperature,
  set: (value) => emit('update:temperature', Number(value)),
})
const chatTopPModel = computed({
  get: () => props.chatTopP,
  set: (value) => emit('update:chatTopP', Number(value)),
})
const maxTokensModel = computed({
  get: () => props.maxTokens,
  set: (value) => {
    const numValue = value === '' ? null : Number(value)
    emit('update:maxTokens', numValue)
  },
})
const isAdvancedVisible = ref(false)
const toggleAdvanced = () => {
  isAdvancedVisible.value = !isAdvancedVisible.value
}
// Help text functions remain the same
const showTtsHelp = () =>
  props.showHelp(
    'Enable TTS',
    `Allows AI responses to be spoken aloud using your browser's built-in speech synthesis. Availability and quality of voices depend on your browser and operating system.`,
  )
const showVoiceHelp = () =>
  props.showHelp(
    'AI Voice Selection',
    `Choose from the voices provided by your system for text-to-speech output. If "System Default" is selected, the browser/OS default voice will be used. Requires TTS to be enabled.`,
  )
const showContextHelp = () =>
  props.showHelp(
    'Conversation Context Length',
    `Determines how many of the most recent message pairs (your message + AI response) are sent back to the AI with each new message you send. Higher values help the AI remember more of the conversation but consume more resources/tokens and may increase costs or slow down responses. Valid range: ${settingsStore.MIN_CONTEXT_LENGTH}-${settingsStore.MAX_CONTEXT_LENGTH}.`,
  )
const showSendOnEnterHelp = () =>
  props.showHelp(
    'Send on Enter',
    `When enabled, pressing the 'Enter' key in the chat input will send the message immediately. To create a new line, press 'Shift + Enter'. When disabled, 'Enter' creates a new line, and you must click the send button.`,
  )
const showChatModelHelp = () =>
  props.showHelp(
    'Chat Model',
    'Selects the underlying Artificial Intelligence model used for generating chat responses. Different models have varying strengths, knowledge cutoffs, response speeds, and potential costs associated with their use (e.g., via API keys). Choose the one that best suits your needs and budget. "(Paid)" indicates models typically requiring API credits or subscriptions.',
  )
const showTemperatureHelp = () =>
  props.showHelp(
    'Temperature (0.0 - 2.0)',
    `Controls the randomness of the AI's output. Lower values (e.g., 0.2) make the output more deterministic and focused, suitable for factual answers. Higher values (e.g., 1.0) increase creativity and diversity but may also increase the chance of nonsensical responses. A value of 0 means the AI will likely always pick the most probable next word.`,
  )
const showMaxTokensHelp = () =>
  props.showHelp(
    'Max Response Tokens',
    "Sets a limit on the maximum number of 'tokens' (roughly words or parts of words) the AI is allowed to generate in a single response. This helps control response length and associated costs. Leave blank or set to 0 to use the model's default maximum limit.",
  )
const showTopPHelp = () =>
  props.showHelp(
    'Top-P (0.0 - 1.0)',
    `An alternative method to control randomness, called nucleus sampling. The AI considers only the most probable tokens whose cumulative probability mass exceeds the Top-P value. A value of 1.0 considers all tokens. Lower values (e.g., 0.9) restrict the AI's choices more. It's generally recommended to adjust *either* Temperature *or* Top-P, not both.`,
  )
const showClearHistoryHelp = () =>
  props.showHelp(
    'Clear Chat History',
    `WARNING: This action permanently deletes all messages currently visible in the active chat session (the one you're currently viewing). This cannot be undone. It does *not* delete saved Memories.`,
  )
const showResetChatHelp = () =>
  props.showHelp(
    'Reset Chat Settings',
    `Resets all options specifically on this "Chat" settings tab (TTS, Voice, Context Length, Send on Enter, Model, Temperature, Top-P, Max Tokens) back to their original default values.`,
  )
</script>

<style scoped>
/* Removed scoped styles for .toggle-switch, .toggle-knob, .help-button, .advanced-arrow, @keyframes faintGreenPulse */
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
  line-height: 1.3;
}
.setting-description {
  font-size: 0.8em;
  color: var(--text-secondary);
  font-weight: 400;
  margin-top: 0.2rem;
  white-space: normal;
}
.toggle-switch,
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

.settings-input {
  max-width: 150px;
  text-align: right;
}
.settings-input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}
.settings-input[type='number']::-webkit-outer-spin-button,
.settings-input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
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
  background-color: var(--bg-error, #a04040);
  color: var(--text-light, #fff);
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

/* Styles removed as they are global */

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
