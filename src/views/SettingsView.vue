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
        <SettingsTabGeneral
          :isDarkMode="isDarkMode"
          :toggleTheme="toggleTheme"
          :showHelp="showHelp"
          :modelValue="appFontSize"
          @update:modelValue="setAppFontSize"
        />
      </div>

      <div v-else-if="activeTab === 'chat'">
        <SettingsTabChat
          :isTtsEnabled="isTtsEnabled"
          :toggleTtsEnabled="toggleTtsEnabled"
          :ttsSupported="ttsSupported"
          :modelValue="selectedVoiceUri"
          @update:modelValue="setSelectedVoice"
          :availableVoices="availableVoices"
          :temperature="chatTemperature"
          @update:temperature="setChatTemperature"
          :modelId="chatModel"
          @update:modelId="setChatModel"
          :maxTokens="chatMaxTokens"
          @update:maxTokens="setChatMaxTokens"
          :contextLength="chatContextLength"
          @update:contextLength="setChatContextLength"
          :showHelp="showHelp"
          :sendOnEnter="sendOnEnter"
          :toggleSendOnEnter="toggleSendOnEnter"
          :chatTopP="chatTopP"
          @update:chatTopP="setChatTopP"
          :handleClearHistory="handleClearHistory"
          :handleResetChatDefaults="handleResetChatDefaults"
        />
      </div>

      <div v-else-if="activeTab === 'imageGen'">
        <SettingsTabImageGen :showHelp="showHelp" />
      </div>

      <div v-else-if="activeTab === 'assistants'">
        <SettingsTabAssistants :showHelp="showHelp" />
      </div>

      <div v-else-if="activeTab === 'memories'">
        <SettingsTabMemories :showHelp="showHelp" />
      </div>

      <div v-else-if="activeTab === 'myAi'">
        <SettingsTabMyAi :showHelp="showHelp" />
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
// --- Import Vue Helpers ---
import { ref, watch } from 'vue' // <<< Added ref, watch
import { storeToRefs } from 'pinia' // <<< Added storeToRefs

// --- Import Stores ---
import { useSettingsStore } from '@/stores/settingsStore' // <<< Added settings store

// --- Import Composables ---
import { useSettingsTabs } from '@/composables/useSettingsTabs' // Still used for the 'tabs' array
import { useSettingsHelpModal } from '@/composables/useSettingsHelpModal'
import { useGeneralSettings } from '@/composables/useGeneralSettings'
import { useChatSettings } from '@/composables/useChatSettings'

// --- Import Tab Components ---
import SettingsTabGeneral from '@/components/settings/SettingsTabGeneral.vue'
import SettingsTabChat from '@/components/settings/SettingsTabChat.vue'
import SettingsTabImageGen from '@/components/settings/SettingsTabImageGen.vue'
import SettingsTabAssistants from '@/components/settings/SettingsTabAssistants.vue'
import SettingsTabMyAi from '@/components/settings/SettingsTabMyAi.vue'
import SettingsTabMemories from '@/components/settings/SettingsTabMemories.vue' // <<< UPDATED Import Name

// --- Use Composables ---
const { tabs } = useSettingsTabs() // Only need 'tabs' from here now
const { isHelpModalVisible, currentHelpContent, showHelp, closeHelpModal } = useSettingsHelpModal()
const { isDarkMode, toggleTheme, appFontSize, setAppFontSize } = useGeneralSettings()
const {
  isTtsEnabled,
  toggleTtsEnabled,
  availableVoices,
  ttsSupported,
  selectedVoiceUri,
  setSelectedVoice,
  chatTemperature,
  setChatTemperature,
  chatModel,
  setChatModel,
  chatMaxTokens,
  setChatMaxTokens,
  chatContextLength,
  setChatContextLength,
  sendOnEnter,
  toggleSendOnEnter,
  chatTopP,
  setChatTopP,
  handleClearHistory,
  handleResetChatDefaults,
} = useChatSettings()

// --- Settings Store Access --- <<< NEW SECTION
const settingsStore = useSettingsStore()
const { lastActiveSettingsTabId } = storeToRefs(settingsStore)
const { setLastActiveSettingsTabId } = settingsStore

// --- Local Active Tab State (synced with store) --- <<< NEW SECTION
// Initialize local activeTab with the value from the store
const activeTab = ref(lastActiveSettingsTabId.value)

// Define local function to change the tab
const changeTab = (tabId) => {
  activeTab.value = tabId
}

// Watch the local activeTab and update the store whenever it changes
watch(activeTab, (newTabId) => {
  // console.log(`SettingsView: Active tab changed to ${newTabId}, updating store.`); // Optional debug log
  setLastActiveSettingsTabId(newTabId)
})
</script>

<style scoped>
/* Styles remain the same */
.settings-view {
  padding: 1.5rem 2rem;
  height: 100%;
  overflow-y: auto;
  background-color: #101010; /* Near black */
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

/* Modal styles */
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
  opacity: 0;
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
