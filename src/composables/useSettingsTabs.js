import { ref } from 'vue'

export function useSettingsTabs() {
  // --- Tab State ---
  const activeTab = ref('general') // Default tab

  const tabs = ref([
    { id: 'general', name: 'General' },
    { id: 'chat', name: 'Chat' },
    { id: 'imageGen', name: 'Image Gen' },
    { id: 'assistants', name: 'Assistants' },
  ])

  const changeTab = (tabId) => {
    activeTab.value = tabId
  }

  // Expose state and methods
  return {
    activeTab,
    tabs,
    changeTab,
  }
}
