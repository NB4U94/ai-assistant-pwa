// src/composables/useGeneralSettings.js
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { storeToRefs } from 'pinia'

export function useGeneralSettings() {
  const settingsStore = useSettingsStore()

  // Get reactive state from the store using storeToRefs
  const {
    theme,
    appFontSize,
    uiSoundEffectsEnabled, // Added
    showAssistantSelectorBar, // Added
  } = storeToRefs(settingsStore)

  // Get actions directly from the store instance
  const {
    setAppFontSize,
    setTheme, // Use the action for theme setting
    // We will add setUiSoundEffectsEnabled and setShowAssistantSelectorBar actions in the store next
  } = settingsStore

  // Computed property to check if dark mode is active
  const isDarkMode = computed(() => theme.value === 'dark')

  // Function to toggle the theme by calling the store action
  const toggleTheme = () => {
    const newTheme = isDarkMode.value ? 'light' : 'dark'
    setTheme(newTheme) // Correctly uses the action
  }

  // --- NEW: Function to toggle UI Sound Effects ---
  const toggleUiSoundEffects = () => {
    // This will call a new action we'll add to the store
    // Assumes the action will be named 'setUiSoundEffectsEnabled'
    settingsStore.setUiSoundEffectsEnabled(!uiSoundEffectsEnabled.value)
  }

  // --- NEW: Function to toggle Assistant Selector Bar ---
  const toggleShowAssistantSelectorBar = () => {
    // This will call a new action we'll add to the store
    // Assumes the action will be named 'setShowAssistantSelectorBar'
    settingsStore.setShowAssistantSelectorBar(!showAssistantSelectorBar.value)
  }

  // Expose reactive state and methods needed by the component
  return {
    // Theme related
    isDarkMode,
    toggleTheme,
    // Font size related
    appFontSize, // The reactive font size state (value: 80-120)
    setAppFontSize, // The action function to update font size
    // --- NEWLY EXPOSED ---
    uiSoundEffectsEnabled, // Expose the state
    toggleUiSoundEffects, // Expose the toggle function
    showAssistantSelectorBar, // Expose the state
    toggleShowAssistantSelectorBar, // Expose the toggle function
  }
}
