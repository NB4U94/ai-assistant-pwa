<template>
  <div>
    <div class="setting-item">
      <label for="theme-toggle" class="setting-label">
        Theme
        <span class="setting-description">Switch between light and dark mode.</span>
      </label>
      <div
        class="toggle-switch"
        id="theme-toggle"
        role="switch"
        :aria-checked="props.isDarkMode.toString()"
        @click="props.toggleTheme"
        @keydown.enter="props.toggleTheme"
        @keydown.space.prevent="props.toggleTheme"
        tabindex="0"
        :title="`Switch to ${props.isDarkMode ? 'light' : 'dark'} mode`"
      >
        <div class="toggle-knob"></div>
      </div>
      <button
        class="help-button"
        @click="
          showHelp(
            'Theme Setting',
            'Controls the overall appearance. \'Dark\' mode uses a darker scheme, good for low light. \'Light\' mode uses a brighter scheme. Your choice is saved automatically.',
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
          :min="settingsStore.MIN_FONT_SIZE"
          :max="settingsStore.MAX_FONT_SIZE"
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
            'Increases or decreases the size of most text (as a percentage of default) for better readability.',
          )
        "
        aria-label="Help with App Font Size"
        title="Help with App Font Size"
      >
        ?
      </button>
    </div>

    <div class="setting-item">
      <label for="sound-toggle" class="setting-label">
        UI Sound Effects
        <span class="setting-description"
          >Enable sounds for actions like message send/receive.</span
        >
      </label>
      <div
        class="toggle-switch"
        id="sound-toggle"
        role="switch"
        :aria-checked="uiSoundEffectsEnabled.toString()"
        @click="toggleUiSoundEffects"
        @keydown.enter="toggleUiSoundEffects"
        @keydown.space.prevent="toggleUiSoundEffects"
        tabindex="0"
        :title="`Turn UI sounds ${uiSoundEffectsEnabled ? 'off' : 'on'}`"
      >
        <div class="toggle-knob"></div>
      </div>
      <button
        class="help-button"
        @click="
          showHelp(
            'UI Sound Effects',
            'Plays short sounds to provide feedback for certain actions within the application, like sending a message or receiving a response.',
          )
        "
        aria-label="Help with UI Sound Effects"
        title="Help with UI Sound Effects"
      >
        ?
      </button>
    </div>

    <div class="setting-item">
      <label for="default-assistant-select" class="setting-label">
        Default Startup Assistant
        <span class="setting-description">Choose which assistant loads when the app starts.</span>
      </label>
      <select
        id="default-assistant-select"
        v-model="defaultAssistantId"
        class="settings-select"
        aria-label="Default Startup Assistant"
      >
        <option
          v-for="option in startupAssistantOptions"
          :key="option.id ?? 'default-option-key'"
          :value="option.id"
        >
          {{ option.name }}
        </option>
      </select>
      <button
        class="help-button"
        @click="
          showHelp(
            'Default Startup Assistant',
            'Select the Assistant that should be active by default when you open the application. \'Nb4U-Ai\' is the main default.',
          )
        "
        aria-label="Help with Default Startup Assistant"
        title="Help with Default Startup Assistant"
      >
        ?
      </button>
    </div>

    <div class="setting-item">
      <label for="show-selector-toggle" class="setting-label">
        Show Assistant Selector Bar
        <span class="setting-description">Show/hide the assistant selection bar in Chat view.</span>
      </label>
      <div
        class="toggle-switch"
        id="show-selector-toggle"
        role="switch"
        :aria-checked="showAssistantSelectorBar.toString()"
        @click="toggleShowAssistantSelectorBar"
        @keydown.enter="toggleShowAssistantSelectorBar"
        @keydown.space.prevent="toggleShowAssistantSelectorBar"
        tabindex="0"
        :title="`Turn Assistant Selector Bar ${showAssistantSelectorBar ? 'off' : 'on'}`"
      >
        <div class="toggle-knob"></div>
      </div>
      <button
        class="help-button"
        @click="
          showHelp(
            'Show Assistant Selector Bar',
            'Controls whether the horizontal bar allowing quick selection between Assistants is visible at the top of the main Chat view.',
          )
        "
        aria-label="Help with Show Assistant Selector Bar"
        title="Help with Show Assistant Selector Bar"
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
      <h3>Advanced Settings</h3>
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
          <label class="setting-label"
            >Export Settings
            <span class="setting-description">Save your current app settings to a file.</span>
          </label>
          <button
            class="quick-setting-button"
            @click="exportSettings"
            title="Export settings as JSON file"
          >
            Export...
          </button>
          <button
            class="help-button"
            @click="
              showHelp(
                'Export Settings',
                'Creates a JSON file containing all your current application settings (theme, chat preferences, etc.) that you can save as a backup or transfer to another device.',
              )
            "
            aria-label="Help with Export Settings"
            title="Help with Export Settings"
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
          <input
            type="file"
            ref="importFileRef"
            @change="handleFileImport"
            accept=".json"
            style="display: none"
          />
          <button
            class="quick-setting-button"
            @click="triggerImport"
            title="Import settings from JSON file"
          >
            Import...
          </button>
          <button
            class="help-button"
            @click="
              showHelp(
                'Import Settings',
                'Loads settings from a JSON file you previously exported. This will overwrite your current settings.',
              )
            "
            aria-label="Help with Import Settings"
            title="Help with Import Settings"
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
          <button
            class="quick-setting-button danger-button"
            @click="handleResetSettings"
            title="Reset all settings to default"
          >
            Reset Now
          </button>
          <button
            class="help-button"
            @click="
              showHelp(
                'Reset All Settings',
                'WARNING: This will immediately reset all settings across all tabs (General, Chat, Image Gen, Assistants) back to their original default values. This action cannot be undone.',
              )
            "
            aria-label="Help with Reset All Settings"
            title="Help with Reset All Settings"
          >
            ?
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
// Script setup remains the same as previous correct version
import { defineProps, defineEmits, computed, ref } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAssistantsStore } from '@/stores/assistantsStore'
import { storeToRefs } from 'pinia'
import { useGeneralSettings } from '@/composables/useGeneralSettings'

// --- Props ---
const props = defineProps({
  isDarkMode: { type: Boolean, required: true },
  toggleTheme: { type: Function, required: true },
  showHelp: { type: Function, required: true },
  modelValue: { type: Number, required: true }, // For font size v-model
})

// --- Emits ---
const emit = defineEmits(['update:modelValue'])

// --- Store Access ---
const settingsStore = useSettingsStore()
const assistantsStore = useAssistantsStore()
// Get needed state directly for binding using storeToRefs
const {
  uiSoundEffectsEnabled, // Keep for binding :aria-checked, :title
  defaultAssistantId,
  showAssistantSelectorBar, // Keep for binding :aria-checked, :title
} = storeToRefs(settingsStore)
const { assistants } = storeToRefs(assistantsStore)

// --- Use General Settings Composable ---
const {
  // No need to get state refs again, already have them above
  toggleUiSoundEffects, // Get the toggle function
  toggleShowAssistantSelectorBar, // Get the toggle function
} = useGeneralSettings()

// --- Computed for v-model ---
const fontSizeModel = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', Number(value))
  },
})

// --- Computed property for startup assistant dropdown options ---
const startupAssistantOptions = computed(() => {
  const options = [{ id: null, name: 'Nb4U-Ai (Default)' }]
  if (Array.isArray(assistants.value)) {
    assistants.value.forEach((assistant) => {
      if (assistant && assistant.id && assistant.name) {
        options.push({ id: assistant.id, name: assistant.name })
      } else {
        console.warn('Skipping invalid assistant object in dropdown:', assistant)
      }
    })
  }
  return options
})

// --- Advanced Section State & Toggle ---
const isAdvancedVisible = ref(false)
const toggleAdvanced = () => {
  isAdvancedVisible.value = !isAdvancedVisible.value
}

// --- Action Handlers ---
const handleResetSettings = () => {
  settingsStore.resetAllSettingsToDefaults()
  // Reset font size v-model via emit
  emit('update:modelValue', settingsStore.DEFAULT_FONT_SIZE)
}

// --- Import/Export ---
const importFileRef = ref(null)
const triggerImport = () => {
  importFileRef.value?.click()
}

const handleFileImport = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const importedSettings = JSON.parse(e.target.result)
      console.log('Imported settings data:', importedSettings)
      if (typeof importedSettings !== 'object' || importedSettings === null) {
        throw new Error('Imported data is not a valid settings object.')
      }
      if (window.confirm('Importing settings will overwrite your current settings. Continue?')) {
        // Use store actions where available, otherwise direct assignment (needs review)
        if (settingsStore.setTheme) settingsStore.setTheme(importedSettings.theme)
        else settingsStore.theme = importedSettings.theme ?? settingsStore.theme

        // Emit font size update correctly
        fontSizeModel.value = importedSettings.appFontSize ?? settingsStore.appFontSize

        if (settingsStore.setUiSoundEffectsEnabled)
          settingsStore.setUiSoundEffectsEnabled(importedSettings.uiSoundEffectsEnabled)
        else
          settingsStore.uiSoundEffectsEnabled =
            importedSettings.uiSoundEffectsEnabled ?? settingsStore.uiSoundEffectsEnabled

        if (settingsStore.setShowAssistantSelectorBar)
          settingsStore.setShowAssistantSelectorBar(importedSettings.showAssistantSelectorBar)
        else
          settingsStore.showAssistantSelectorBar =
            importedSettings.showAssistantSelectorBar ?? settingsStore.showAssistantSelectorBar

        // Assign other settings (consider adding specific actions for these in store later)
        settingsStore.defaultAssistantId =
          importedSettings.defaultAssistantId === undefined
            ? settingsStore.defaultAssistantId
            : importedSettings.defaultAssistantId
        settingsStore.isTtsEnabled = importedSettings.isTtsEnabled ?? settingsStore.isTtsEnabled
        settingsStore.selectedVoiceUri =
          importedSettings.selectedVoiceUri ?? settingsStore.selectedVoiceUri
        settingsStore.chatModel = importedSettings.chatModel ?? settingsStore.chatModel
        settingsStore.chatTemperature =
          importedSettings.chatTemperature ?? settingsStore.chatTemperature
        settingsStore.chatMaxTokens = importedSettings.chatMaxTokens ?? settingsStore.chatMaxTokens
        settingsStore.chatContextLength =
          importedSettings.chatContextLength ?? settingsStore.chatContextLength
        settingsStore.sendOnEnter = importedSettings.sendOnEnter ?? settingsStore.sendOnEnter
        settingsStore.chatTopP = importedSettings.chatTopP ?? settingsStore.chatTopP
        settingsStore.imageGenDefaultAspectRatio =
          importedSettings.imageGenDefaultAspectRatio ?? settingsStore.imageGenDefaultAspectRatio
        settingsStore.imageGenDefaultStyle =
          importedSettings.imageGenDefaultStyle ?? settingsStore.imageGenDefaultStyle
        settingsStore.imageGenDefaultNegativePrompt =
          importedSettings.imageGenDefaultNegativePrompt ??
          settingsStore.imageGenDefaultNegativePrompt
        settingsStore.imageGenDefaultNumImages =
          importedSettings.imageGenDefaultNumImages ?? settingsStore.imageGenDefaultNumImages
        settingsStore.assistantsDefaultInstructions =
          importedSettings.assistantsDefaultInstructions ??
          settingsStore.assistantsDefaultInstructions

        // My AI Settings
        if (importedSettings.myAiContextSegments)
          settingsStore.myAiContextSegments = importedSettings.myAiContextSegments
        if (importedSettings.myAiContextApplyToAll !== undefined)
          settingsStore.myAiContextApplyToAll = importedSettings.myAiContextApplyToAll
        if (importedSettings.myAiContextAllowedAssistantIds)
          settingsStore.myAiContextAllowedAssistantIds = new Set(
            importedSettings.myAiContextAllowedAssistantIds,
          )

        alert('Settings imported successfully!')
        // Watcher in store triggers save
      }
    } catch (error) {
      console.error('Error reading or parsing settings file:', error)
      alert('Failed to import settings. Ensure the file is a valid JSON exported from this app.')
    } finally {
      if (importFileRef.value) importFileRef.value.value = ''
    }
  }
  reader.onerror = (error) => {
    console.error('Error reading file:', error)
    alert('Failed to read the settings file.')
    if (importFileRef.value) importFileRef.value.value = ''
  }
  reader.readAsText(file)
}

const exportSettings = () => {
  try {
    // Use store state directly for export
    const settingsToExport = {
      theme: settingsStore.theme,
      appFontSize: settingsStore.appFontSize,
      uiSoundEffectsEnabled: settingsStore.uiSoundEffectsEnabled,
      defaultAssistantId: settingsStore.defaultAssistantId,
      showAssistantSelectorBar: settingsStore.showAssistantSelectorBar,
      isTtsEnabled: settingsStore.isTtsEnabled,
      selectedVoiceUri: settingsStore.selectedVoiceUri,
      chatModel: settingsStore.chatModel,
      chatTemperature: settingsStore.chatTemperature,
      chatMaxTokens: settingsStore.chatMaxTokens,
      chatContextLength: settingsStore.chatContextLength,
      sendOnEnter: settingsStore.sendOnEnter,
      chatTopP: settingsStore.chatTopP,
      imageGenDefaultAspectRatio: settingsStore.imageGenDefaultAspectRatio,
      imageGenDefaultStyle: settingsStore.imageGenDefaultStyle,
      imageGenDefaultNegativePrompt: settingsStore.imageGenDefaultNegativePrompt,
      imageGenDefaultNumImages: settingsStore.imageGenDefaultNumImages,
      assistantsDefaultInstructions: settingsStore.assistantsDefaultInstructions,
      myAiContextSegments: settingsStore.myAiContextSegments,
      myAiContextApplyToAll: settingsStore.myAiContextApplyToAll,
      myAiContextAllowedAssistantIds: Array.from(settingsStore.myAiContextAllowedAssistantIds),
    }
    const jsonString = JSON.stringify(settingsToExport, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const timestamp = new Date().toISOString().slice(0, 10) // yyyy-MM-dd format
    link.download = `nb4u-ai-settings-${timestamp}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting settings:', error)
    alert('Failed to export settings.')
  }
}
</script>

<style scoped>
/* Styles consistent with other tabs */
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

/* Align controls and help button */
.toggle-switch,
.settings-slider,
.settings-select,
.quick-setting-button,
.help-button,
.slider-container {
  justify-self: end;
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
}
.settings-slider:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.settings-slider:focus {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}

/* Select Styles */
.settings-select {
  padding: 0.5rem 0.75rem;
  height: 38px;
  border: 1px solid var(--border-color-medium);
  border-radius: 6px;
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  font-family: sans-serif;
  font-size: 0.9em;
  min-width: 150px;
  max-width: 250px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  box-sizing: border-box;
}
.settings-select:hover:not(:disabled) {
  border-color: var(--accent-color-secondary);
}
.settings-select:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: var(--input-focus-shadow);
}
.settings-select:disabled {
  background-color: color-mix(in srgb, var(--bg-input-field) 50%, var(--bg-main-content));
  cursor: not-allowed;
  opacity: 0.7;
}

/* Quick action buttons */
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
.quick-setting-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-input-field) 70%, var(--bg-main-content));
}

/* --- Advanced Section --- */
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

/* Arrow button styles */
.advanced-arrow {
  /* Base styles are now global in main.css */
  /* Scoped styles only need hover/focus if different */
}
/* SVG color comes from global rule */
.advanced-arrow svg {
  display: block;
}
.advanced-arrow.expanded {
  transform: rotate(180deg);
}

/* Styles for the collapsible content area */
.advanced-settings-section {
  padding: 1rem 1rem 0 1rem;
  border: 1px solid var(--border-color-light);
  border-top: none;
  border-radius: 0 0 6px 6px;
  margin-bottom: 1rem;
  background-color: var(--bg-main-content);
  overflow: hidden;
}

/* --- Transition for Collapse --- */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease-in-out;
  max-height: 500px; /* Adjust as needed */
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-width: 0;
  margin-top: 0; /* Adjust if margin is part of transition */
}
.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 500px; /* Match enter-active */
}
</style>
