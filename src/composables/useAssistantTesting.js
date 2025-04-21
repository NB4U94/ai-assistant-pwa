// src/composables/useAssistantTesting.js
import { ref } from 'vue'

// Props expected by the composable
// - assistantData: Ref<object> | Function returning object - Needs access to the current
//   assistant name, level, instructions, imageUrl from useAssistantForm state.
//   Let's assume it gets the *current* form data passed in when opening.
// - assistantIdToEdit: Ref<string | null> - To preserve original ID/createdAt if editing.
// - assistantsStore: The Pinia store instance (to get original createdAt if needed).
// - generateFinalInstructions: Function (from useAssistantForm) to ensure instructions are current before testing.
export function useAssistantTesting(props) {
  const { assistantsStore, generateFinalInstructions } = props

  // --- State ---
  const isTestModalVisible = ref(false)
  const assistantBeingTested = ref(null) // Holds the config passed to ChatView in modal

  // --- Methods ---

  /**
   * Opens the test modal with the current state of the assistant form.
   * Requires the current form data to be passed in.
   * @param {object} currentAssistantFormData - Object containing { name, level, imageUrl }
   * @param {string | null} existingId - The original ID if editing, null otherwise.
   */
  const openTestModal = (currentAssistantFormData, existingId = null) => {
    // Ensure instructions are up-to-date before testing
    generateFinalInstructions?.()

    // Construct the config object for the ChatView prop
    // Make sure all required fields for the temporary assistant object are present
    assistantBeingTested.value = {
      id: existingId || `temp_${Date.now()}`, // Use existing ID or create temporary one
      name: currentAssistantFormData?.name?.trim() || 'Unnamed Assistant',
      level: currentAssistantFormData?.level, // Should be selectedLevel from wizard
      instructions: currentAssistantFormData?.instructions || '', // Use generated instructions
      imageUrl: currentAssistantFormData?.imageUrl || null,
      // Try to preserve original creation date if editing, otherwise use now
      createdAt:
        (existingId ? assistantsStore?.getAssistantById(existingId)?.createdAt : null) ||
        Date.now(),
    }

    console.log('[Testing] Opening test modal for assistant config:', assistantBeingTested.value)
    isTestModalVisible.value = true
  }

  const closeTestModal = () => {
    console.log('[Testing] Closing test modal.')
    isTestModalVisible.value = false
    assistantBeingTested.value = null // Clear the tested assistant data
  }

  // --- Expose State and Methods ---
  return {
    isTestModalVisible,
    assistantBeingTested, // The config object for the modal's ChatView
    openTestModal,
    closeTestModal,
  }
}
