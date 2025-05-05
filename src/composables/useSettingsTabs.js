// src/composables/useSettingsTabs.js
import { ref } from 'vue'

// Define the tabs configuration directly inside the composable
const TABS = [
  { id: 'general', name: 'General' },
  { id: 'chat', name: 'Chat' },
  { id: 'imageGen', name: 'Image Gen' },
  { id: 'assistants', name: 'Assistants' },
  { id: 'memories', name: 'Memories' }, // <<< MOVED Memories tab here
  { id: 'myAi', name: 'My AI' },
]

// Default active tab ID
const DEFAULT_TAB = 'general'

export function useSettingsTabs() {
  // --- Tab State ---
  // Initialize activeTab with the default
  const activeTab = ref(DEFAULT_TAB)

  // Use the defined TABS configuration
  const tabs = ref(TABS) // Keep it as a ref

  const changeTab = (tabId) => {
    // Ensure the tabId exists before setting it
    if (TABS.some((tab) => tab.id === tabId)) {
      activeTab.value = tabId
    } else {
      console.warn(
        `[useSettingsTabs] Attempted to switch to non-existent tab ID: ${tabId}. Staying on ${activeTab.value}.`,
      )
    }
  }

  // Expose state and methods
  return {
    activeTab,
    tabs, // Expose the reactive ref containing the tabs array
    changeTab,
  }
}
