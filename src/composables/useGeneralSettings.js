import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { storeToRefs } from 'pinia'

export function useGeneralSettings() {
  const settingsStore = useSettingsStore()

  // Get reactive state from the store
  const { theme } = storeToRefs(settingsStore)

  // Computed property to check if dark mode is active
  const isDarkMode = computed(() => theme.value === 'dark')

  // Function to toggle the theme by calling the store action
  const toggleTheme = () => {
    const newTheme = isDarkMode.value ? 'light' : 'dark'
    settingsStore.setTheme(newTheme) // Use the action
  }

  // Expose reactive state and methods needed by the component
  return {
    isDarkMode,
    toggleTheme,
    // We can add other general settings logic here later
  }
}
