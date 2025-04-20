<template>
  <div class="settings-view">
    <h2>Settings</h2>

    <div class="settings-tabs-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="changeTab(tab.id)"
      >
        {{ tab.name }}
      </button>
    </div>

    <div class="settings-tab-content">
      <div v-if="activeTab === 'general'">
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
            @click="showHelp('Theme Setting', themeHelpText)"
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
          <input
            type="range"
            id="font-size-slider"
            class="settings-slider"
            min="80"
            max="120"
            value="100"
            disabled
          />
          <button
            class="help-button"
            @click="
              showHelp(
                'App Font Size',
                'Increases or decreases the size of most text within the application for better readability. Affects menus, chat bubbles, settings descriptions, etc. (Setting not yet active)',
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

      <div v-else-if="activeTab === 'chat'">
        <div class="setting-item">
          <label for="tts-master-toggle" class="setting-label">
            Enable Text-to-Speech (TTS)
            <span class="setting-description">Allow the AI to speak responses aloud.</span>
          </label>
          <div
            class="toggle-switch-placeholder"
            id="tts-master-toggle"
            role="switch"
            :aria-checked="settingsStore.isTtsEnabled.toString()"
            @click="toggleTtsEnabled"
            @keydown.enter="toggleTtsEnabled"
            @keydown.space.prevent="toggleTtsEnabled"
            tabindex="0"
            :title="`Turn TTS ${settingsStore.isTtsEnabled ? 'OFF' : 'ON'}`"
          >
            <div class="toggle-knob"></div>
          </div>
          <button
            class="help-button"
            @click="
              showHelp(
                'Enable TTS',
                'Allows the AI\'s chat responses to be automatically read out loud. You can toggle speech for individual messages in the chat window.',
              )
            "
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
            v-model="selectedVoiceUriModel"
            :disabled="availableVoices.length === 0"
          >
            <option :value="null">Default</option>
            <option v-if="availableVoices.length === 0" disabled>Loading voices...</option>
            <option v-for="voice in availableVoices" :key="voice.voiceURI" :value="voice.voiceURI">
              {{ voice.name }} ({{ voice.lang }})
            </option>
          </select>
          <button
            class="help-button"
            @click="
              showHelp(
                'AI Voice Selection',
                'Choose from available system voices for the AI\'s text-to-speech output. Availability depends on your browser and operating system.',
              )
            "
          >
            ?
          </button>
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
          <button
            class="help-button"
            @click="
              showHelp(
                'Conversation Context',
                'Determines how many previous messages are sent to the AI with your new message. Higher values help the AI remember more context but may increase processing time and cost. (Setting not yet active)',
              )
            "
          >
            ?
          </button>
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
          <button
            class="help-button"
            @click="
              showHelp(
                'Send on Enter',
                'When enabled, pressing the Enter key in the chat input will send the message. Press Shift+Enter to create a new line within the input box. When disabled, Enter creates a new line, and you must click the Send button. (Setting not yet active)',
              )
            "
          >
            ?
          </button>
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
            <button
              class="help-button"
              @click="
                showHelp(
                  'Temperature',
                  'Controls the creativity/randomness of the AI\'s responses. Lower values (e.g., 0.2) make the output more deterministic and focused. Higher values (e.g., 0.9) make it more creative and unpredictable. Default is usually around 0.7. (Setting not yet active)',
                )
              "
            >
              ?
            </button>
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
            <button
              class="help-button"
              @click="
                showHelp(
                  'Top-P (Nucleus Sampling)',
                  'An alternative way to control randomness. The AI considers only the most probable words whose cumulative probability mass exceeds the Top-P value. Lower values narrow the choices, higher values consider more options. Often used instead of Temperature. (Setting not yet active)',
                )
              "
            >
              ?
            </button>
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
            <button
              class="help-button"
              @click="
                showHelp(
                  'Safety Filtering Level',
                  'Adjusts the sensitivity of the AI\'s built-in safety filters for harmful content. Higher levels are more restrictive. Setting to \'None\' may result in unfiltered or potentially offensive content. (Setting not yet active)',
                )
              "
            >
              ?
            </button>
          </div>
          <div class="setting-item">
            <label class="setting-label"
              >Clear Chat History
              <span class="setting-description">Permanently delete all current chat messages.</span>
            </label>
            <button class="quick-setting-button danger-button" disabled>Clear Now</button>
            <button
              class="help-button"
              @click="
                showHelp(
                  'Clear Chat History',
                  'WARNING: Immediately and permanently deletes all messages in the current chat session for the selected assistant or default AI. This cannot be undone. (Action not yet active)',
                )
              "
            >
              ?
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'imageGen'">
        <div class="setting-item">
          <label for="img-resolution-select" class="setting-label">
            Default Resolution <span class="setting-description">Size of generated images.</span>
          </label>
          <select id="img-resolution-select" class="settings-select" disabled>
            <option value="1024">1024x1024</option>
            <option value="1536">1536x1024</option>
            <option value="1024">1024x1536</option>
          </select>
          <button
            class="help-button"
            @click="
              showHelp(
                'Default Resolution',
                'Sets the default width and height (in pixels) for images generated in the Image Gen mode. Available options may depend on the underlying AI model. (Setting not yet active)',
              )
            "
          >
            ?
          </button>
        </div>
        <div class="setting-item">
          <label for="img-aspect-select" class="setting-label">
            Default Aspect Ratio <span class="setting-description">Shape of generated images.</span>
          </label>
          <select id="img-aspect-select" class="settings-select" disabled>
            <option value="1:1">1:1</option>
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="4:3">4:3</option>
            <option value="3:4">3:4</option>
          </select>
          <button
            class="help-button"
            @click="
              showHelp(
                'Default Aspect Ratio',
                'Sets the default shape (width-to-height ratio) for generated images. This often works together with the resolution setting. (Setting not yet active)',
              )
            "
          >
            ?
          </button>
        </div>
        <div class="setting-item">
          <label for="img-count-slider" class="setting-label">
            Number of Images
            <span class="setting-description">How many images to generate at once.</span>
          </label>
          <input
            type="range"
            id="img-count-slider"
            class="settings-slider"
            min="1"
            max="4"
            step="1"
            value="1"
            disabled
          />
          <button
            class="help-button"
            @click="
              showHelp(
                'Number of Images',
                'Determines how many image variations are generated each time you submit a prompt. Generating more images takes longer and may use more resources. (Setting not yet active)',
              )
            "
          >
            ?
          </button>
        </div>
        <div class="advanced-settings-section">
          <h3>Advanced Image Generation Settings</h3>
          <div class="setting-item wide-item">
            <label for="img-negative-prompt" class="setting-label">
              Negative Prompt
              <span class="setting-description">Describe what you DON'T want to see.</span>
            </label>
            <textarea
              id="img-negative-prompt"
              class="settings-textarea"
              rows="2"
              placeholder="e.g., blurry, text, watermark..."
              disabled
            ></textarea>
            <button
              class="help-button"
              @click="
                showHelp(
                  'Negative Prompt',
                  'Enter keywords or phrases describing elements you want the AI to avoid in the generated image. This helps refine the output and prevent common unwanted artifacts. (Setting not yet active)',
                )
              "
            >
              ?
            </button>
          </div>
          <div class="setting-item">
            <label for="img-seed" class="setting-label">
              Seed
              <span class="setting-description">Number controlling initial noise pattern.</span>
            </label>
            <input
              type="number"
              id="img-seed"
              class="settings-input"
              placeholder="Leave blank for random"
              disabled
            />
            <button
              class="help-button"
              @click="
                showHelp(
                  'Seed',
                  'A specific number used to initialize the image generation process. Using the same seed with the same prompt and settings will usually produce very similar results. Leave blank to use a random seed for more varied outputs each time. (Setting not yet active)',
                )
              "
            >
              ?
            </button>
          </div>
          <div class="setting-item">
            <label for="img-cfg-slider" class="setting-label">
              Guidance Scale (CFG)
              <span class="setting-description">How strongly the image follows the prompt.</span>
            </label>
            <input
              type="range"
              id="img-cfg-slider"
              class="settings-slider"
              min="1"
              max="20"
              step="0.5"
              value="7"
              disabled
            />
            <button
              class="help-button"
              @click="
                showHelp(
                  'Guidance Scale (CFG)',
                  'Controls how closely the generated image should adhere to your text prompt. Lower values allow more creative freedom, while higher values stick more strictly to the prompt. Typical values range from 5 to 15. (Setting not yet active)',
                )
              "
            >
              ?
            </button>
          </div>
          <div class="setting-item">
            <label for="img-sampler-select" class="setting-label">
              Sampler Method
              <span class="setting-description">Algorithm used during generation.</span>
            </label>
            <select id="img-sampler-select" class="settings-select" disabled>
              <option value="euler">Euler</option>
              <option value="dpm++">DPM++ 2M Karras</option>
              <option value="ddim">DDIM</option>
            </select>
            <button
              class="help-button"
              @click="
                showHelp(
                  'Sampler Method',
                  'Selects the specific algorithm (sampling method) the AI uses to create the image step-by-step. Different samplers can produce slightly different styles or levels of detail. Experiment to see which works best for your prompts. (Setting not yet active)',
                )
              "
            >
              ?
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'assistants'">
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
    </div>

    <div class="modal-overlay help-modal" v-if="isHelpModalVisible" @click.self="closeHelpModal">
      <div class="help-modal-content">
        <div class="help-modal-header">
          <h3>{{ currentHelpContent.title }}</h3>
          <button @click="closeHelpModal" class="close-modal-button" title="Close Help">✖</button>
        </div>
        <div class="help-modal-body">
          <p>{{ currentHelpContent.text }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { storeToRefs } from 'pinia' // Import storeToRefs

// --- Settings Store ---
const settingsStore = useSettingsStore()
// Use storeToRefs to keep reactivity for state properties used in template
const { isTtsEnabled, selectedVoiceUri, theme } = storeToRefs(settingsStore)
// Use computed for theme check
const isDarkMode = computed(() => theme.value === 'dark')

const toggleTheme = () => {
  const newTheme = isDarkMode.value ? 'light' : 'dark'
  settingsStore.setTheme(newTheme)
}

// --- NEW: TTS Toggle Action ---
const toggleTtsEnabled = () => {
  settingsStore.setTtsEnabled(!isTtsEnabled.value) // Use the action via store instance
}
// ---------------------------

// --- NEW: Voice Selection State & Logic ---
const synth = window.speechSynthesis
const availableVoices = ref([])
const ttsSupported = ref(!!synth)

// Need a computed property with getter/setter to use v-model with Pinia state
const selectedVoiceUriModel = computed({
  get: () => selectedVoiceUri.value, // Read from store state
  set: (value) => {
    settingsStore.setSelectedVoice(value) // Write using store action
  },
})

const populateVoiceList = () => {
  if (!ttsSupported.value) return
  const voices = synth.getVoices()
  if (voices.length > 0) {
    availableVoices.value = voices.sort((a, b) => a.name.localeCompare(b.name)) // Sort voices alphabetically
    console.log('Voices populated:', availableVoices.value.length)
  } else {
    console.log('getVoices() returned empty list initially.')
    // Fallback or retry logic might be needed if voices load late
    // Setting a timeout as a simple retry mechanism
    setTimeout(() => {
      console.log('Retrying getVoices()')
      const voicesRetry = synth.getVoices()
      if (voicesRetry.length > 0) {
        availableVoices.value = voicesRetry.sort((a, b) => a.name.localeCompare(b.name))
        console.log('Voices populated on retry:', availableVoices.value.length)
      } else {
        console.warn('Could not populate voices after retry.')
      }
    }, 500) // Retry after 500ms
  }
}

onMounted(() => {
  if (ttsSupported.value) {
    // Voices might load asynchronously.
    populateVoiceList()
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = populateVoiceList
    }
  }
})
// ------------------------------------

// --- Tab State ---
const activeTab = ref('general')
const tabs = ref([
  { id: 'general', name: 'General' },
  { id: 'chat', name: 'Chat' },
  { id: 'imageGen', name: 'Image Gen' },
  { id: 'assistants', name: 'Assistants' },
])
const changeTab = (tabId) => {
  activeTab.value = tabId
}

// --- Help Modal State & Logic ---
const isHelpModalVisible = ref(false)
const currentHelpContent = ref({ title: '', text: '' })
const themeHelpText = `This setting controls the overall appearance of the application. 'Dark' mode uses a darker color scheme, which can be easier on the eyes in low light. 'Light' mode uses a brighter scheme, which some users prefer during the day. Your choice is saved automatically.`

const showHelp = (title, text) => {
  currentHelpContent.value = { title, text }
  isHelpModalVisible.value = true
}
const closeHelpModal = () => {
  isHelpModalVisible.value = false
}
</script>

<style scoped>
/* Styles identical to previous version, just added .settings-input, .settings-textarea, .danger-button */
.settings-view {
  padding: 1.5rem 2rem;
  height: 100%;
  overflow-y: auto;
  background-color: var(--bg-main-content);
  color: var(--text-primary);
  position: relative;
}
h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
  font-family: sans-serif;
  text-align: center;
  font-weight: 600;
  border-bottom: 1px solid var(--border-color-medium);
  padding-bottom: 1rem;
}
.settings-tabs-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color-medium);
  padding-bottom: 1rem;
}
.tab-button {
  padding: 0.5rem 1rem;
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: sans-serif;
  font-size: 0.9em;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}
.tab-button:hover:not(.active) {
  background-color: var(--bg-button-secondary-hover);
}
.tab-button.active {
  background-color: var(--accent-color-primary);
  color: var(--text-light);
  font-weight: 600;
}
.settings-tab-content {
  padding-top: 1rem;
}
.setting-item {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color-light);
  gap: 1rem;
}
.setting-item.wide-item {
  grid-template-columns: auto 1fr auto;
  grid-template-areas: 'label control help' '. description .';
  align-items: start;
}
.setting-item.wide-item .setting-label {
  grid-area: label;
}
.setting-item.wide-item .setting-description {
  grid-area: description;
  padding-left: 0;
  padding-top: 0.3rem;
}
.setting-item.wide-item .settings-textarea {
  grid-area: control;
}
.setting-item.wide-item .help-button {
  grid-area: help;
}
.setting-label {
  display: flex;
  flex-direction: column;
  font-weight: 500;
  font-family: sans-serif;
  cursor: default;
  white-space: nowrap;
}
.setting-description {
  font-size: 0.8em;
  color: var(--text-secondary);
  font-weight: 400;
  margin-top: 0.2rem;
  white-space: normal;
}
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
  justify-self: end;
}
.toggle-switch-placeholder:focus-visible {
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
.settings-select,
.settings-slider,
.settings-input,
.settings-textarea,
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
  max-width: 200px;
  justify-self: end;
  box-sizing: border-box;
}
.settings-textarea {
  min-width: 200px;
  max-width: 100%;
  resize: vertical;
  min-height: calc(1.4em * 2 + 0.8rem);
}
.settings-select:focus,
.settings-slider:focus,
.settings-input:focus,
.settings-textarea:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.settings-select:disabled,
.settings-slider:disabled,
.settings-input:disabled,
.settings-textarea:disabled,
.quick-setting-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-input-field) 70%, var(--bg-main-content));
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
.advanced-settings-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid var(--border-color-medium);
}
.advanced-settings-section h3 {
  margin-bottom: 1rem;
  color: var(--text-secondary);
}
.placeholder-text {
  color: var(--text-placeholder);
  font-style: italic;
  font-size: 0.9em;
  text-align: center;
  margin-top: 1rem;
}
.modal-overlay.help-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 1rem;
  box-sizing: border-box;
  cursor: pointer;
  animation: fadeInOverlay 0.3s ease forwards;
}
@keyframes fadeInOverlay {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.help-modal-content {
  background-color: var(--bg-modal, var(--bg-main-content));
  color: var(--text-primary);
  padding: 1.5rem 2rem;
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  cursor: default;
  animation: slideInModal 0.3s ease forwards;
  transform: translateY(-20px);
}
@keyframes slideInModal {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.help-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color-medium);
}
.help-modal-header h3 {
  margin: 0;
  font-size: 1.2em;
  font-weight: 600;
  color: var(--text-primary);
}
.close-modal-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.6em;
  line-height: 1;
  padding: 0.2rem;
  cursor: pointer;
  transition: color 0.2s ease;
}
.close-modal-button:hover {
  color: var(--text-primary);
}
.help-modal-body {
  font-size: 0.95em;
  line-height: 1.6;
  color: var(--text-secondary);
}
.help-modal-body p {
  margin: 0;
}
</style>
