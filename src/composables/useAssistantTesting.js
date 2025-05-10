// src/composables/useAssistantTesting.js
import { ref, toRaw } from 'vue' // Added toRaw
import { useConversationStore } from '@/stores/conversationStore' // Added

/**
 * Composable for managing the assistant testing modal, typically within AssistantCreator.
 *
 * @param {object} props - The properties passed to the composable.
 * @param {object} props.assistantsStore - The Pinia store instance for assistants (used for fetching existing assistant data if needed, less relevant here).
 * @param {Function} props.generateFinalInstructions - Function from useAssistantForm to ensure instructions are current before testing.
 * @param {Function} props.getAssistantTestData - Function that returns the current (potentially unsaved) assistant data object for testing.
 * This function should provide: { id, name, level, instructions, imageUrl, color, createdAt (optional), model (optional) }.
 */
export function useAssistantTesting(props) {
  const { assistantsStore, generateFinalInstructions, getAssistantTestData } = props
  const conversationStore = useConversationStore() // Initialize conversation store

  // --- State ---
  const isTestModalVisible = ref(false)
  const assistantBeingTested = ref(null) // Holds the complete config passed to ChatView in modal

  // --- Methods ---

  /**
   * Opens the test modal using data fetched by the getAssistantTestData prop.
   * Sets the test mode in the conversation store.
   */
  const openTestModal = () => {
    // 1. Ensure instructions are up-to-date by calling the function from useAssistantForm.
    if (typeof generateFinalInstructions === 'function') {
      generateFinalInstructions()
      console.log('[Testing Composable] Called generateFinalInstructions.')
    } else {
      console.error(
        '[Testing Composable] generateFinalInstructions function is not provided to useAssistantTesting.',
      )
      // Allow to proceed but instructions might be stale
    }

    // 2. Get the most current assistant data using the function passed from AssistantCreator.
    if (typeof getAssistantTestData !== 'function') {
      console.error(
        '[Testing Composable] getAssistantTestData function is not provided to useAssistantTesting.',
      )
      assistantBeingTested.value = {
        id: `temp_error_fetcher_${Date.now()}`,
        name: 'Error: Data Function Missing',
        level: 1,
        instructions: 'Could not load assistant data for testing due to missing data fetcher.',
        imageUrl: null,
        color: '#CCCCCC',
        model: null, // Ensure model is part of the structure
        createdAt: Date.now(),
      }
      // Set test mode even with error data so ChatView can display something informative
      // or handle the partial config.
      conversationStore.setTestModeAssistantConfig(toRaw(assistantBeingTested.value))
      isTestModalVisible.value = true
      return
    }

    const currentData = getAssistantTestData()
    console.log('[Testing Composable] Fetched data via getAssistantTestData:', currentData)

    if (!currentData) {
      console.error('[Testing Composable] getAssistantTestData did not return data.')
      assistantBeingTested.value = {
        id: `temp_error_nodata_${Date.now()}`,
        name: 'Error: No Test Data',
        level: 1,
        instructions: 'Assistant data function returned nothing for testing.',
        imageUrl: null,
        color: '#CCCCCC',
        model: null,
        createdAt: Date.now(),
      }
      conversationStore.setTestModeAssistantConfig(toRaw(assistantBeingTested.value))
      isTestModalVisible.value = true
      return
    }

    // 3. Construct the final config object for testing.
    // 'id' from getAssistantTestData should be like `temp_${Date.now()}` for new assistants
    // or the actual ID if somehow testing an existing one via this path (though less likely).
    // 'createdAt' is less relevant for unsaved assistants but good to have for consistency.
    let createdAtDate = currentData.createdAt || Date.now() // Default to now if not provided

    // If testing an existing assistant (e.g., if this composable was ever reused for that)
    // and createdAt wasn't in currentData, try to get it from the store.
    // For a new assistant (temp_ id), this won't apply.
    if (!currentData.createdAt && currentData.id && !String(currentData.id).startsWith('temp_')) {
      const existingAssistant = assistantsStore?.getAssistantById(currentData.id)
      if (existingAssistant?.createdAt) {
        createdAtDate = existingAssistant.createdAt
      }
    }

    assistantBeingTested.value = {
      id: currentData.id || `temp_unknown_${Date.now()}`, // Ensure ID exists
      name: currentData.name?.trim() || 'Unnamed Assistant',
      level: currentData.level || 1, // Default level if not provided
      instructions: currentData.instructions || 'No instructions provided for this test.',
      imageUrl: currentData.imageUrl || null,
      color: currentData.color || '#808080', // Default color
      model: currentData.model || null, // Include model, default to null if not specified
      createdAt: createdAtDate,
    }

    console.log(
      '[Testing Composable] Setting test mode with assistant config:',
      assistantBeingTested.value,
    )
    // Set the test mode in the conversation store using the generated assistant configuration
    conversationStore.setTestModeAssistantConfig(toRaw(assistantBeingTested.value))

    isTestModalVisible.value = true
  }

  /**
   * Closes the test modal and clears the test mode from the conversation store.
   */
  const closeTestModal = () => {
    console.log('[Testing Composable] Closing test modal and clearing test mode config.')
    isTestModalVisible.value = false
    assistantBeingTested.value = null // Clear the tested assistant data

    // Crucially, clear the test mode configuration from the conversation store
    conversationStore.clearTestModeAssistantConfig()
  }

  // --- Expose State and Methods ---
  return {
    isTestModalVisible,
    assistantBeingTested,
    openTestModal,
    closeTestModal,
  }
}
