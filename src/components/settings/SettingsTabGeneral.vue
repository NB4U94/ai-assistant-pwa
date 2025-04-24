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
        class="help-button pulsing-help"
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
        class="help-button pulsing-help"
        @click="
          showHelp(
            'App Font Size',
            'Increases or decreases the size of most text (as a percentage of default) for better readability.',
          )
        "
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
        @click="settingsStore.setUiSoundEffectsEnabled(!uiSoundEffectsEnabled)"
        @keydown.enter="settingsStore.setUiSoundEffectsEnabled(!uiSoundEffectsEnabled)"
        @keydown.space.prevent="settingsStore.setUiSoundEffectsEnabled(!uiSoundEffectsEnabled)"
        tabindex="0"
        :title="`Turn UI sounds ${uiSoundEffectsEnabled ? 'off' : 'on'}`"
      >
        <div class="toggle-knob"></div>
      </div>
      <button
        class="help-button pulsing-help"
        @click="
          showHelp(
            'UI Sound Effects',
            'Plays short sounds to provide feedback for certain actions within the application, like sending a message or receiving a response.',
          )
        "
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
            class="help-button pulsing-help"
            @click="
              showHelp(
                'Export Settings',
                'Creates a JSON file containing all your current application settings (theme, chat preferences, etc.) that you can save as a backup or transfer to another device.',
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
            class="help-button pulsing-help"
            @click="
              showHelp(
                'Import Settings',
                'Loads settings from a JSON file you previously exported. This will overwrite your current settings.',
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
          <button
            class="quick-setting-button danger-button"
            @click="handleResetSettings"
            title="Reset all settings to default"
          >
            Reset Now
          </button>
          <button
            class="help-button pulsing-help"
            @click="
              showHelp(
                'Reset All Settings',
                'WARNING: This will immediately reset all settings across all tabs (General, Chat, Image Gen, Assistants) back to their original default values. This action cannot be undone.',
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
import { defineProps, computed, ref } from 'vue'
// *** Import store and utilities ***
import { useSettingsStore } from '@/stores/settingsStore'
import { storeToRefs } from 'pinia'

// --- Props ---
// Keep existing props passed down from SettingsView
const props = defineProps({
  isDarkMode: { type: Boolean, required: true },
  toggleTheme: { type: Function, required: true },
  showHelp: { type: Function, required: true },
  modelValue: { type: Number, required: true }, // For font size v-model
})

// --- Emits ---
// Keep existing emit for font size v-model
const emit = defineEmits(['update:modelValue'])

// --- Store Access ---
const settingsStore = useSettingsStore()
// Get needed state and actions using storeToRefs for reactivity
const { uiSoundEffectsEnabled } = storeToRefs(settingsStore)

// --- Computed for v-model ---
// Keep existing computed for font size slider
const fontSizeModel = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', Number(value))
  },
})

// --- Advanced Section State & Toggle ---
const isAdvancedVisible = ref(false) // Default collapsed
const toggleAdvanced = () => {
  isAdvancedVisible.value = !isAdvancedVisible.value
}

// --- Action Handlers ---
const handleResetSettings = () => {
  // Confirmation is handled within the store action now
  settingsStore.resetAllSettingsToDefaults()
  // Font size is handled via props/v-model, need to emit update if reset changes it
  // This assumes reset in store *also* resets the prop source if needed, or we might need to emit differently.
  // For now, assume the source value updates reactively.
}

// --- Import/Export (Basic Implementation) ---
const importFileRef = ref(null)

const triggerImport = () => {
  importFileRef.value?.click() // Trigger hidden file input
}

const handleFileImport = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const importedSettings = JSON.parse(e.target.result)
      console.log('Imported settings data:', importedSettings)
      // TODO: Add validation logic here to ensure importedSettings format is correct
      if (window.confirm('Importing settings will overwrite your current settings. Continue?')) {
        // Directly update store refs - this bypasses validation in loadSettings
        // A more robust approach would be a dedicated import action in the store
        // that includes validation.
        settingsStore.theme = importedSettings.theme ?? settingsStore.theme
        settingsStore.appFontSize = importedSettings.appFontSize ?? settingsStore.appFontSize
        settingsStore.uiSoundEffectsEnabled =
          importedSettings.uiSoundEffectsEnabled ?? settingsStore.uiSoundEffectsEnabled
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

        alert('Settings imported successfully!')
        // Force save after import
        settingsStore.saveSettingsToLocalStorage() // Manually trigger save
      }
    } catch (error) {
      console.error('Error reading or parsing settings file:', error)
      alert('Failed to import settings. Ensure the file is a valid JSON exported from this app.')
    } finally {
      // Reset file input value to allow importing the same file again
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
    // Create object with current settings values
    const settingsToExport = {
      theme: settingsStore.theme,
      appFontSize: settingsStore.appFontSize,
      uiSoundEffectsEnabled: settingsStore.uiSoundEffectsEnabled,
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
    }
    const jsonString = JSON.stringify(settingsToExport, null, 2) // Pretty print JSON
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const timestamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    link.download = `nb4u-ai-settings-${timestamp}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    alert('Settings exported successfully!')
  } catch (error) {
    console.error('Error exporting settings:', error)
    alert('Failed to export settings.')
  }
}
</script>

<style scoped>
/* Include styles consistent with other tabs */
.setting-item {
  display: grid;
  /* Adjust grid for potential value display next to slider */
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
  cursor: default;
  margin-right: 1rem; /* Space between label and control */
  line-height: 1.3;
}
.setting-description {
  font-size: 0.8em;
  color: var(--text-secondary);
  font-weight: 400;
  margin-top: 0.2rem;
  white-space: normal;
}

/* Align controls and help button to the end of the grid cell */
.toggle-switch, /* Renamed from placeholder */
.settings-slider,
.quick-setting-button,
.help-button,
.slider-container {
  /* Align the container too */
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
  /* Allow slider to take space within its flex container */
  /* justify-self: initial; */ /* No longer needed directly on slider */
}
.settings-slider:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.settings-slider:focus {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}

/* Toggle switch styles */
.toggle-switch {
  /* Renamed from placeholder */
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
  box-sizing: content-box; /* Ensure padding doesn't affect size */
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
  justify-self: end;
}
.help-button:focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.help-button:hover {
  background-color: var(--bg-button-secondary-hover);
}
/* Apply faint pulse animation */
.help-button.pulsing-help {
  /* Use animation defined globally in App.vue */
  animation: faintGreenPulse 3s infinite alternate ease-in-out;
}

/* --- Advanced Section --- */
/* Style for the clickable header that toggles the section */
.advanced-toggle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 0.5rem;
  margin-top: 2rem;
  background-color: var(--bg-input-area); /* Subtle background */
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
  user-select: none; /* Prevent text selection on click */
}

/* Arrow button styles */
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
  /* Apply glow animation */
  animation: faintGreenPulse 3.5s infinite alternate ease-in-out;
}
.advanced-arrow:hover {
  color: var(--text-primary);
}
.advanced-arrow svg {
  display: block; /* Prevent extra space below SVG */
}
.advanced-arrow.expanded {
  transform: rotate(180deg); /* Point arrow up when expanded */
}

/* Styles for the collapsible content area */
.advanced-settings-section {
  /* margin-top: 0rem; Remove top margin */
  padding: 1rem 1rem 0 1rem; /* Add padding inside */
  border: 1px solid var(--border-color-light); /* Keep border consistent */
  border-top: none; /* Remove top border as header has one */
  border-radius: 0 0 6px 6px; /* Round bottom corners */
  margin-bottom: 1rem; /* Space below */
  background-color: var(--bg-main-content); /* Match page bg or slight variant */
  overflow: hidden; /* Needed for smooth transition */
}

/* --- Transition for Collapse --- */
/* Define enter/leave transitions for smooth collapse/expand */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease-in-out;
  max-height: 500px; /* Adjust max-height if content is taller */
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-width: 0; /* Animate border smoothly */
  margin-top: 0; /* Animate margin smoothly */
}
.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 500px; /* Should match enter-active max-height */
}
</style>
