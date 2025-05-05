<template>
  <div class="settings-tab-memories">
    <h4 class="section-title">
      Basic Operations
      <button
        v-if="props.showHelp"
        @click="
          showHelp(
            'basicMemoryHelp',
            helpContent.basicMemoryHelp.title,
            helpContent.basicMemoryHelp.text,
          )
        "
        class="help-button"
        title="Help for Basic Operations"
        aria-label="Help for Basic Operations"
      >
        ?
      </button>
    </h4>
    <p class="section-description">
      Manage memories for specific assistants or delete all history.
    </p>
    <div class="setting-item">
      <label for="delete-by-assistant-select" class="setting-label">
        Delete by Assistant
        <span class="setting-description"
          >Select an assistant to delete all of its associated memories.</span
        >
      </label>
      <div class="controls-container">
        <select
          id="delete-by-assistant-select"
          v-model="selectedAssistantIdToDelete"
          class="settings-select"
          aria-label="Select Assistant to delete memories for"
        >
          <option :value="null" disabled>-- Select Assistant --</option>
          <option
            v-for="assistant in assistantOptionsForDelete"
            :key="assistant.id"
            :value="assistant.id"
          >
            {{ assistant.name }}
          </option>
        </select>
        <button
          class="quick-setting-button danger-button"
          @click="handleDeleteByAssistant"
          :disabled="!selectedAssistantIdToDelete"
          title="Delete all memories for selected assistant"
        >
          Delete for Selected
        </button>
      </div>
      <button
        class="help-button"
        @click="
          showHelp(
            'deleteByAssistantHelp',
            helpContent.deleteByAssistantHelp.title,
            helpContent.deleteByAssistantHelp.text,
          )
        "
        aria-label="Help with Delete by Assistant"
        title="Help with Delete by Assistant"
      >
        ?
      </button>
    </div>
    <div class="setting-item">
      <label class="setting-label">
        Delete All Memories
        <span class="setting-description"
          >Permanently delete all saved conversation memories for all assistants.</span
        >
      </label>
      <button
        class="quick-setting-button danger-button"
        @click="handleDeleteAll"
        title="Delete ALL conversation memories (Use with caution!)"
      >
        Delete All Now
      </button>
      <button
        class="help-button"
        @click="
          showHelp('deleteAllHelp', helpContent.deleteAllHelp.title, helpContent.deleteAllHelp.text)
        "
        aria-label="Help with Delete All Memories"
        title="Help with Delete All Memories"
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
      <h3>Advanced Saving Preferences</h3>
      <button
        class="advanced-arrow solid-glow-effect-primary"
        :class="{ expanded: isAdvancedVisible }"
        aria-label="Toggle Advanced Saving Preferences"
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
          <label for="global-save-toggle" class="setting-label">
            Enable Conversation Saving
            <span class="setting-description"
              >Globally enable or disable automatic conversation saving.</span
            >
          </label>
          <div
            :class="['toggle-switch', { active: saveConversationsGlobally }]"
            id="global-save-toggle"
            role="switch"
            :aria-checked="saveConversationsGlobally.toString()"
            @click="settingsStore.toggleSaveConversationsGlobally"
            @keydown.enter="settingsStore.toggleSaveConversationsGlobally"
            @keydown.space.prevent="settingsStore.toggleSaveConversationsGlobally"
            tabindex="0"
            :title="`Turn Conversation Saving ${saveConversationsGlobally ? 'OFF' : 'ON'}`"
          >
            <div class="toggle-knob"></div>
          </div>
          <button
            class="help-button"
            @click="
              showHelp(
                'globalSaveHelp',
                helpContent.globalSaveHelp.title,
                helpContent.globalSaveHelp.text,
              )
            "
            aria-label="Help with Enable Conversation Saving"
            title="Help with Enable Conversation Saving"
          >
            ?
          </button>
        </div>

        <fieldset class="setting-item exclusion-fieldset" :disabled="!saveConversationsGlobally">
          <legend class="setting-label">
            Exclude Assistants from Saving
            <span class="setting-description"
              >Select specific assistants whose conversations should NOT be saved, even if global
              saving is enabled.</span
            >
          </legend>
          <div class="exclusion-controls">
            <div class="exclusion-list" v-if="customAssistants.length > 0">
              <div v-for="assistant in customAssistants" :key="assistant.id" class="checkbox-item">
                <input
                  type="checkbox"
                  :id="'exclude-' + assistant.id"
                  :checked="excludedAssistantIds.has(assistant.id)"
                  @change="settingsStore.toggleAssistantExclusion(assistant.id)"
                  :disabled="!saveConversationsGlobally"
                />
                <label :for="'exclude-' + assistant.id">
                  {{ assistant.name }}
                </label>
              </div>
            </div>
            <p v-else class="no-custom-assistants"><i>No custom assistants created yet.</i></p>
          </div>
          <button
            class="help-button"
            @click="
              showHelp('excludeHelp', helpContent.excludeHelp.title, helpContent.excludeHelp.text)
            "
            aria-label="Help with Exclude Assistants"
            title="Help with Exclude Assistants"
            :disabled="!saveConversationsGlobally"
          >
            ?
          </button>
        </fieldset>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, defineProps } from 'vue' // Removed unused nextTick
import { useConversationStore } from '@/stores/conversationStore'
import { useAssistantsStore } from '@/stores/assistantsStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { storeToRefs } from 'pinia'
// Removed Nb4uLogoPlaceholder import - not used in this specific settings tab

// --- Props ---
const props = defineProps({
  showHelp: { type: Function, required: true },
})

// --- Stores ---
const conversationStore = useConversationStore()
const assistantsStore = useAssistantsStore()
const settingsStore = useSettingsStore()

// --- Reactive State from Stores ---
const { assistants } = storeToRefs(assistantsStore)
// Get persistent settings state needed for bindings
const { saveConversationsGlobally, excludedAssistantIds } = storeToRefs(settingsStore)
// Get non-persistent UI state object for advanced sections
const { settingsTabsAdvancedVisible } = storeToRefs(settingsStore) // <<< Get shared state object

// --- Local State ---
const selectedAssistantIdToDelete = ref(null)
// Removed local isAdvancedVisible ref
const tabId = 'memories' // Define ID for this tab <<< ADDED tabId

// --- Computed ---
// Get visibility for *this* tab from the shared state object <<< ADDED computed prop
const isAdvancedVisible = computed(() => !!settingsTabsAdvancedVisible.value[tabId])

// Assistants for the delete dropdown (exclude main chat)
const assistantOptionsForDelete = computed(() => {
  return assistants.value.filter((a) => a.id !== conversationStore.MAIN_CHAT_ID)
})
// Assistants for the exclusion list (only custom ones)
const customAssistants = computed(() => {
  return assistants.value.filter((a) => a.id !== conversationStore.MAIN_CHAT_ID)
})

// --- Methods ---
// Removed local toggleAdvanced method

const handleDeleteByAssistant = () => {
  const assistantId = selectedAssistantIdToDelete.value
  if (!assistantId) return

  let assistantName = 'Unknown Assistant'
  // Make sure not to use main_chat ID which should be filtered from dropdown now
  const assistant = assistants.value.find((a) => a.id === assistantId)
  assistantName = assistant ? assistant.name : `ID ${assistantId.substring(0, 6)}...`

  if (
    window.confirm(
      `ARE YOU SURE?\n\nThis will permanently delete ALL saved conversation memories associated ONLY with the assistant: "${assistantName}".\n\nThis action cannot be undone.`,
    )
  ) {
    conversationStore.deleteMemoriesForSession(assistantId)
    selectedAssistantIdToDelete.value = null // Reset dropdown
    alert(`Memories for "${assistantName}" have been deleted.`)
  }
}

const handleDeleteAll = () => {
  if (
    window.confirm(
      'ARE YOU ABSOLUTELY SURE?\n\nThis will permanently delete ALL saved conversation memories for ALL assistants.\n\nTHIS ACTION CANNOT BE UNDONE!',
    )
  ) {
    if (window.confirm('SECOND CONFIRMATION:\n\nReally delete absolutely everything?')) {
      conversationStore.deleteAllMemories()
      alert('All conversation memories have been deleted.')
    }
  }
}

// --- Help Content ---
// (Help content remains the same)
const helpContent = {
  basicMemoryHelp: {
    title: 'Basic Memory Operations',
    text: 'Use these controls to perform bulk deletion of saved conversation histories (memories). You can target a specific Assistant or delete everything at once. Use with caution!',
  },
  deleteByAssistantHelp: {
    title: 'Delete by Assistant',
    text: 'Select an Assistant from the dropdown list. Clicking "Delete for Selected" will permanently remove all saved conversation memories associated ONLY with that specific Assistant. The main Nb4U-Ai chat history cannot be deleted using this specific button.',
  },
  deleteAllHelp: {
    title: 'Delete All Memories',
    text: 'WARNING: Clicking "Delete All Now" will permanently remove ALL saved conversation memories for Nb4U-Ai AND all custom Assistants from your device. This is irreversible.',
  },
  globalSaveHelp: {
    title: 'Enable Conversation Saving',
    text: 'Turn this OFF to prevent any new conversations from being automatically saved as memories. Existing memories will not be deleted. Turn it ON to allow conversations to be saved according to the exclusion rules below.',
  },
  excludeHelp: {
    title: 'Exclude Assistants from Saving',
    text: 'Check the box next to any assistant whose conversations you DO NOT want to be saved automatically, even when global saving is enabled. Uncheck the box to allow saving for that assistant.',
  },
}
</script>

<style scoped>
/* Styles remain largely the same, adjusted root class name if needed */
.settings-tab-memories {
  /* Renamed root class */
  padding: 0.5rem 0;
}
/* ... (rest of the styles from MemorySettings.vue) ... */

.section-title {
  font-size: 1.15em;
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.section-title:first-of-type {
  margin-top: 0;
}
.section-description {
  font-size: 0.9em;
  color: var(--text-secondary);
  margin-top: -0.25rem;
  margin-bottom: 1rem;
}
.setting-item {
  display: grid;
  grid-template-columns: 1fr auto auto; /* Label, Control(s), Help Button */
  align-items: start; /* Align items to the top */
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
  cursor: default;
  line-height: 1.3;
  padding-top: 0.3rem; /* Align label text better with controls */
}

.setting-description {
  font-size: 0.8em;
  color: var(--text-secondary);
  font-weight: 400;
  margin-top: 0.2rem;
  white-space: normal;
}

.controls-container,
.toggle-switch,
.quick-setting-button,
.help-button,
.exclusion-controls {
  justify-self: end; /* Align control elements to the right within their grid cell */
  align-self: start; /* Align control elements to the top */
}

.controls-container {
  display: flex;
  gap: 0.5rem;
  align-items: center; /* Vertically center items within this flex container */
}
.settings-select {
  padding: 0.5rem 0.75rem;
  height: 38px;
  border: 1px solid var(--border-color-medium);
  border-radius: 6px;
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  font-size: 0.9em;
  min-width: 150px;
  max-width: 250px;
  cursor: pointer;
}
.settings-select:disabled {
  background-color: color-mix(in srgb, var(--bg-input-field) 50%, var(--bg-main-content));
  cursor: not-allowed;
  opacity: 0.7;
}
.quick-setting-button {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--border-color-medium);
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  font-size: 0.9em;
  cursor: pointer;
  min-width: 100px;
  height: 38px; /* Match select height */
  display: inline-flex; /* Align text vertically */
  align-items: center;
  justify-content: center;
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
.quick-setting-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-input-field) 70%, var(--bg-main-content));
}
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
  margin-top: 7px; /* Align roughly with top of controls */
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
}
.advanced-toggle-header:hover {
  background-color: var(--bg-button-secondary-hover);
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
  color: var(--text-button-secondary); /* Match help button color */
}
.advanced-arrow:hover {
  color: var(--accent-color-primary); /* Match help button hover */
}
.advanced-arrow svg {
  display: block;
  width: 20px;
  height: 20px;
  fill: currentColor; /* Use text color */
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
.advanced-settings-section .setting-item:last-child {
  border-bottom: none;
}

/* Transition */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease-in-out;
  max-height: 500px; /* Adjust if list is long */
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin-top: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* Placeholder text styling */
.setting-item p i {
  color: var(--text-placeholder);
  font-size: 0.9em;
}

/* Toggle Switch Styling */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px; /* Width of the switch */
  height: 26px; /* Height of the switch */
  background-color: var(--bg-toggle-inactive, #555);
  border-radius: 13px; /* Half the height */
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-top: 5px; /* Align with label text */
}
.toggle-switch .toggle-knob {
  position: absolute;
  top: 3px; /* Padding inside the switch */
  left: 3px; /* Padding inside the switch */
  width: 20px; /* Size of the knob */
  height: 20px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.2s ease;
}
.toggle-switch.active {
  background-color: var(--accent-color-primary);
}
.toggle-switch.active .toggle-knob {
  transform: translateX(24px); /* Move knob to the right */
}
.toggle-switch[aria-disabled='true'] {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Exclusion List Specific Styles */
.exclusion-fieldset {
  grid-column: 1 / -1; /* Span all columns */
  padding: 0;
  border: none;
  margin: 0;
  display: contents; /* Allow legend/label to stay in grid */
}
.exclusion-fieldset[disabled] .exclusion-controls,
.exclusion-fieldset[disabled] .help-button {
  /* Disable help too */
  opacity: 0.6;
  pointer-events: none;
  user-select: none;
}
.exclusion-fieldset .setting-label {
  /* Use legend as label visually */
  grid-column: 1 / 2;
  align-self: start; /* Align label to top */
  margin-bottom: 0.5rem;
}
.exclusion-controls {
  grid-column: 2 / 3; /* Place controls in the second column */
  justify-self: start; /* Align controls to the left within their column */
  align-self: start; /* Align to top */
  width: 100%;
  max-width: 300px; /* Limit width */
}
.exclusion-fieldset .help-button {
  grid-column: 3 / 4; /* Place help button in the third column */
  align-self: start; /* Align help to top */
}

.exclusion-list {
  max-height: 150px; /* Allow scrolling for long lists */
  overflow-y: auto;
  border: 1px solid var(--border-color-light);
  border-radius: 4px;
  padding: 0.5rem;
  background-color: var(--bg-input-area); /* Slightly different background */
}
.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;
}
.checkbox-item label {
  cursor: pointer;
  font-size: 0.9em;
  color: var(--text-secondary);
  flex-grow: 1; /* Allow label to take space */
  display: flex; /* Align text and debug info */
  justify-content: space-between; /* Push debug info right */
  align-items: center;
}
.checkbox-item input[type='checkbox'] {
  cursor: pointer;
  width: 16px;
  height: 16px;
  accent-color: var(--accent-color-primary); /* Style the checkmark color */
  margin: 0; /* Reset default margin */
  flex-shrink: 0; /* Prevent checkbox shrinking */
}
.no-custom-assistants {
  font-style: italic;
  color: var(--text-secondary);
  font-size: 0.9em;
  padding: 0.5rem;
}
</style>
