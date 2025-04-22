// src/composables/useParamHelp.js
import { ref } from 'vue'

export function useParamHelp() {
  // --- State ---
  // Stores the key ('model', 'size', 'quality', 'style') of the currently visible help popup
  const visibleHelpParam = ref(null)

  // --- Methods ---

  /**
   * Toggles the visibility of a specific help popup.
   * If the clicked one is already open, it closes it.
   * If a different one is open, it closes that one and opens the clicked one.
   * @param {string} paramKey - The key identifying the parameter help ('model', 'size', etc.)
   */
  const toggleParamHelp = (paramKey) => {
    if (visibleHelpParam.value === paramKey) {
      visibleHelpParam.value = null // Close if clicking the same one
    } else {
      visibleHelpParam.value = paramKey // Open the clicked one (closes any other)
      console.log(`[Help] Showing help for: ${paramKey}`)
    }
  }

  /**
   * Closes any currently open help popup.
   * Intended for use with v-on-click-outside directive.
   */
  const closeHelp = () => {
    if (visibleHelpParam.value) {
      console.log('[Help] Closing help popup.')
      visibleHelpParam.value = null
    }
  }

  // --- Expose State and Methods ---
  return {
    visibleHelpParam,
    toggleParamHelp,
    closeHelp,
  }
}
