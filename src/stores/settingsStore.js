import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  // Arrow function recommended for state definition
  state: () => ({
    theme: 'dark', // Example setting: 'light', 'dark', or 'system'
    // Add other settings here later, e.g.:
    // isTtsEnabled: true,
  }),
  getters: {
    // Example getter:
    // isDarkTheme: (state) => state.theme === 'dark',
  },
  actions: {
    // Example action:
    // setTheme(newTheme) {
    //   if (['light', 'dark', 'system'].includes(newTheme)) {
    //     this.theme = newTheme
    //     // Maybe save to localStorage here too?
    //   } else {
    //     console.error('Invalid theme value:', newTheme);
    //   }
    // },
    // setTtsEnabled(enabled) {
    //  this.isTtsEnabled = !!enabled; // Ensure boolean
    // }
  },
})
