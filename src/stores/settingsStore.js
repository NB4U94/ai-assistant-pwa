import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  // Arrow function recommended for state definition
  state: () => ({
    theme: 'dark', // Default theme
    // Add other settings here later, e.g.:
    // isTtsEnabled: true,
  }),
  getters: {
    // Example getter (we might use this later):
    // isDarkTheme: (state) => state.theme === 'dark',
  },
  actions: {
    /**
     * Sets the application theme.
     * @param {string} newTheme - The new theme value ('light' or 'dark').
     */
    setTheme(newTheme) {
      // Basic validation to ensure only allowed values are set
      if (newTheme === 'light' || newTheme === 'dark') {
        this.theme = newTheme
        console.log(`Theme set to: ${this.theme}`) // Log change for debugging
        // Optional TODO: Persist theme choice to localStorage here later
      } else {
        console.error('Invalid theme value provided to setTheme:', newTheme)
      }
    },
    // Other actions can be added below
    // setTtsEnabled(enabled) {
    //   this.isTtsEnabled = !!enabled; // Ensure boolean
    // }
  },
})
