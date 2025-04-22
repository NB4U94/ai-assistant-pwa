import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { storeToRefs } from 'pinia'

export function useGeneralSettings() {
  const settingsStore = useSettingsStore()

  // Get reactive state from the store using storeToRefs
  // This ensures reactivity is maintained correctly
  const { theme, appFontSize } = storeToRefs(settingsStore)

  // Get actions directly from the store instance
  const { setAppFontSize } = settingsStore // Or settingsStore.setAppFontSize

  // Computed property to check if dark mode is active
  const isDarkMode = computed(() => theme.value === 'dark')

  // Function to toggle the theme by calling the store action
  const toggleTheme = () => {
    const newTheme = isDarkMode.value ? 'light' : 'dark'
    settingsStore.setTheme(newTheme) // Use the action
  }

  // Expose reactive state and methods needed by the component
  return {
    // Theme related
    isDarkMode,
    toggleTheme,
    // Font size related
    appFontSize, // The reactive font size state (value: 80-120)
    setAppFontSize, // The action function to update font size
    // We can add other general settings logic here later
  }
}
