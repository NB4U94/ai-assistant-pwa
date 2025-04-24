<template>
  <div>
    <div class="segment-management">
      <h4>My AI Context Segments</h4>
      <p class="setting-description">
        Add pieces of information about yourself, your preferences, or anything else you want the AI
        to always remember for better context during chats. This information will be included with
        your prompts based on the settings below.
      </p>

      <ul v-if="myAiContextSegments.length > 0" class="segment-list">
        <li v-for="(segment, index) in myAiContextSegments" :key="index" class="segment-item">
          <span class="segment-text">{{ segment }}</span>
          <button
            @click="deleteSegment(index)"
            class="delete-segment-button"
            title="Delete this segment"
            aria-label="Delete segment"
          >
            ✖
          </button>
        </li>
      </ul>
      <p v-else class="no-segments-message">No context segments added yet.</p>

      <div class="add-segment-area">
        <textarea
          v-model="newSegmentText"
          class="settings-textarea"
          rows="2"
          placeholder="Enter a new context segment (e.g., My name is Jake, I enjoy coding.)"
          aria-label="New context segment input"
        ></textarea>
        <button
          @click="addSegment"
          class="quick-setting-button add-button"
          :disabled="!newSegmentText.trim()"
          title="Add new segment"
        >
          Add Segment
        </button>
      </div>
      <button
        class="help-button pulsing-help overall-help"
        @click="
          showHelp(
            'My AI Context Segments',
            'This area allows you to provide persistent information for the AI. Each segment should be a distinct piece of context (like a sentence or two). The AI will use the relevant segments based on your selection below when generating responses, helping personalize the conversation.',
          )
        "
        aria-label="Help with My AI Context Segments"
        title="Help with My AI Context Segments"
      >
        ?
      </button>
    </div>

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
        aria-label="Default Instructions for New Assistants"
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

    <div
      class="advanced-toggle-header"
      @click="toggleAdvanced"
      tabindex="0"
      @keydown.enter.prevent="toggleAdvanced"
      @keydown.space.prevent="toggleAdvanced"
    >
      <h3>Context Application Settings</h3>
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
          <label for="myai-apply-all-toggle" class="setting-label">
            Apply 'My AI' Context to All Assistants
            <span class="setting-description"
              >Allow all assistants (including default) to use the context segments.</span
            >
          </label>
          <div
            class="toggle-switch"
            id="myai-apply-all-toggle"
            role="switch"
            :aria-checked="myAiContextApplyToAll.toString()"
            @click="handleApplyToAllToggle"
            @keydown.enter="handleApplyToAllToggle"
            @keydown.space.prevent="handleApplyToAllToggle"
            tabindex="0"
            :title="`Turn Apply to All ${myAiContextApplyToAll ? 'OFF' : 'ON'}`"
          >
            <div class="toggle-knob"></div>
          </div>
          <button
            class="help-button pulsing-help"
            @click="
              showHelp(
                'Apply Context to All',
                'When ON, all your AI context segments will be automatically sent to every assistant, including the default AI. When OFF, you can choose specific assistants below that are allowed to receive this context.',
              )
            "
            aria-label="Help with Apply Context to All"
            title="Help with Apply Context to All"
          >
            ?
          </button>
        </div>

        <div v-if="!myAiContextApplyToAll" class="assistant-allow-list">
          <h4>Allow Specific Assistants:</h4>
          <ul class="assistants-checkbox-list">
            <li class="assistant-checkbox-item">
              <input
                type="checkbox"
                id="allow-main_chat"
                :checked="myAiContextAllowedAssistantIds.has('main_chat')"
                @change="handleAllowedAssistantToggle('main_chat')"
              />
              <label for="allow-main_chat">Default AI (Nb4U-Ai)</label>
            </li>
            <li
              v-for="assistant in assistantList"
              :key="assistant.id"
              class="assistant-checkbox-item"
            >
              <input
                type="checkbox"
                :id="'allow-' + assistant.id"
                :checked="myAiContextAllowedAssistantIds.has(assistant.id)"
                @change="handleAllowedAssistantToggle(assistant.id)"
              />
              <label :for="'allow-' + assistant.id">{{ assistant.name }}</label>
            </li>
          </ul>
          <button
            class="help-button pulsing-help list-help"
            @click="
              showHelp(
                'Allow Specific Assistants',
                'Check the box next to each assistant (including the Default AI) that you want to have access to your \'My AI Context Segments\'. Only checked assistants will receive this information during chats.',
              )
            "
            aria-label="Help with Allow Specific Assistants"
            title="Help with Allow Specific Assistants"
          >
            ?
          </button>
        </div>

        <div class="setting-item api-key-placeholder">
          <label class="setting-label">
            Assistant API Keys
            <span class="setting-description"
              >Manage API keys if using external models for assistants.</span
            >
          </label>
          <div class="placeholder-text">
            (Future: Add inputs for OpenAI, Anthropic, etc. keys here)
          </div>
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
      </div>
    </transition>
  </div>
</template>

<script setup>
import { defineProps, ref, computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAssistantsStore } from '@/stores/assistantsStore'
import { storeToRefs } from 'pinia'

// --- Props ---
defineProps({
  showHelp: { type: Function, required: true },
})

// --- Store Access ---
const settingsStore = useSettingsStore()
const assistantsStore = useAssistantsStore()

const {
  myAiContextSegments,
  myAiContextApplyToAll,
  myAiContextAllowedAssistantIds,
  assistantsDefaultInstructions, // Add ref for default instructions
} = storeToRefs(settingsStore)

const { assistants } = storeToRefs(assistantsStore)

// --- Local State ---
const newSegmentText = ref('') // For the input field to add new segments
const isAdvancedVisible = ref(false)

// --- Computed Properties ---
// Filtered list for display (if needed, currently using full list + manual default option)
const assistantList = computed(() => {
  return assistants.value
})

// --- Methods ---
const addSegment = () => {
  if (newSegmentText.value.trim()) {
    settingsStore.addMyAiContextSegment(newSegmentText.value)
    newSegmentText.value = ''
  }
}

const deleteSegment = (index) => {
  // Add confirmation?
  // if (window.confirm("Delete this segment?")) {
  settingsStore.deleteMyAiContextSegment(index)
  // }
}

const toggleAdvanced = () => {
  isAdvancedVisible.value = !isAdvancedVisible.value
}

const handleApplyToAllToggle = () => {
  settingsStore.setMyAiContextApplyToAll(!myAiContextApplyToAll.value)
}

const handleAllowedAssistantToggle = (assistantId) => {
  settingsStore.toggleMyAiContextAllowedAssistant(assistantId)
}
</script>

<style scoped>
/* Reuse common styles */
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
.setting-item.wide-item {
  grid-template-columns: auto 1fr auto;
  grid-template-areas: 'label control help' '. description .';
  align-items: start;
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

/* Align controls */
.settings-textarea,
.quick-setting-button,
.help-button,
.placeholder-text,
.toggle-switch,
.assistant-allow-list {
  justify-self: end;
}
.add-segment-area {
  grid-column: 1 / -1; /* Span full width below label */
}

/* Textarea Style */
.settings-textarea {
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--border-color-medium);
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  font-family: sans-serif;
  font-size: 0.9em;
  flex-shrink: 0;
  min-width: 100px;
  max-width: 100%;
  box-sizing: border-box;
  resize: vertical;
}
.settings-textarea:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.settings-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-input-field) 70%, var(--bg-main-content));
}
/* Specific height for default instructions */
#asst-default-instructions {
  min-height: calc(1.4em * 4 + 0.8rem);
} /* Approx 4 rows */
.add-segment-area .settings-textarea {
  min-height: calc(1.4em * 2 + 0.8rem); /* Approx 2 rows */
}

/* Toggle Switch */
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
.toggle-switch[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-input-field) 70%, var(--bg-main-content));
}
.toggle-switch:not([disabled]):focus-visible {
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

/* Quick Button */
.quick-setting-button {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--border-color-medium);
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  font-family: sans-serif;
  font-size: 0.9em;
  flex-shrink: 0;
  box-sizing: border-box;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
  min-width: 100px;
  max-width: 200px;
}
.quick-setting-button.add-button {
  background-color: var(--accent-color-primary);
  color: var(--text-light);
  border-color: var(--accent-color-primary);
  margin-left: auto;
  margin-top: 0.5rem;
}
.quick-setting-button.add-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--accent-color-primary) 85%, black);
  border-color: color-mix(in srgb, var(--accent-color-primary) 85%, black);
}
.quick-setting-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-input-field) 70%, var(--bg-main-content));
}

/* Placeholder Text */
.placeholder-text {
  font-style: italic;
  color: var(--text-secondary);
  font-size: 0.9em;
  text-align: right;
  padding: 0.4rem 0.6rem;
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
  justify-self: end;
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
.help-button.overall-help {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
}

/* Segment Management Section */
.segment-management {
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  position: relative;
}
.segment-management h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-weight: 600;
}
.segment-management > .setting-description {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color-light);
}
.segment-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem 0;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-color-light);
  border-radius: 4px;
}
.segment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border-color-light);
  gap: 0.5rem;
}
.segment-item:last-child {
  border-bottom: none;
}
.segment-text {
  flex-grow: 1;
  font-size: 0.9em;
  word-break: break-word;
}
.delete-segment-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.2em;
  padding: 0.2rem;
  line-height: 1;
  flex-shrink: 0;
}
.delete-segment-button:hover {
  color: var(--bg-error, #a04040);
}
.no-segments-message {
  font-style: italic;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  text-align: center;
  padding: 1rem;
}
.add-segment-area {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-end;
}
.add-segment-area .settings-textarea {
  width: 100%;
  max-width: none;
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
  padding: 0 1rem;
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

/* Assistant Allow List */
.assistant-allow-list {
  padding: 1rem 0 0 0;
  margin-top: 1rem;
  border-top: 1px solid var(--border-color-light);
  position: relative;
}
.assistant-allow-list h4 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-weight: 600;
  font-size: 0.9em;
  color: var(--text-secondary);
}
.assistants-checkbox-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 250px;
  overflow-y: auto;
}
.assistant-checkbox-item {
  display: flex;
  align-items: center;
  padding: 0.4rem 0;
  gap: 0.75rem;
}
.assistant-checkbox-item input[type='checkbox'] {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  accent-color: var(--accent-color-primary);
  cursor: pointer;
}
.assistant-checkbox-item label {
  font-size: 0.9em;
  cursor: pointer;
  user-select: none;
}
.assistant-allow-list .list-help {
  position: absolute;
  top: 0.75rem;
  right: 0;
}
.api-key-placeholder {
  /* Specific style for placeholder item if needed */
}

/* Collapse Transition */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease-in-out;
  max-height: 800px;
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
  max-height: 800px;
}
</style>
