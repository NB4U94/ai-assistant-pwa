import { defineStore } from 'pinia'
import { ref } from 'vue' // Use ref for reactive state in setup store style

// Using setup store syntax for potentially easier reactivity setup later
export const useAssistantsStore = defineStore('assistants', () => {
  // --- State ---
  const assistants = ref([
    // Example initial data (can be removed later if you don't want defaults)
    // { id: 'preset-1', name: 'Creative Writer', level: 2, instructions: '...', createdAt: Date.now() }
  ])

  // --- Getters --- (Optional)
  // const assistantCount = computed(() => assistants.value.length);

  // --- Actions ---
  /**
   * Adds a new assistant configuration to the store.
   * @param {object} assistantConfig - Object containing name, instructions, level. ID and createdAt generated here.
   * @returns {boolean} - True if successful, false otherwise.
   */
  function addAssistant(assistantConfig) {
    // --- CORRECTED Validation ---
    // Check only for fields provided by the component (name, instructions, level)
    if (
      !assistantConfig ||
      !assistantConfig.name ||
      !assistantConfig.instructions ||
      !assistantConfig.level
    ) {
      console.error(
        '[AssistantsStore] Invalid or incomplete assistant config passed to addAssistant (missing name, instructions, or level):',
        assistantConfig,
      )
      return false // Indicate failure
    }
    // --- END CORRECTION ---

    // Check for duplicate names (optional but recommended)
    if (assistants.value.some((a) => a.name === assistantConfig.name.trim())) {
      console.warn(
        `[AssistantsStore] Assistant with name "${assistantConfig.name.trim()}" already exists.`,
      )
      // Allow duplicate names for now, but log warning.
    }

    // Create a new object with a unique ID and timestamp
    const newAssistant = {
      id: Date.now().toString(), // Generate unique ID here
      name: assistantConfig.name.trim(),
      level: assistantConfig.level,
      instructions: assistantConfig.instructions,
      createdAt: Date.now(), // Add creation timestamp here
    }

    assistants.value.push(newAssistant)
    console.log(
      `[AssistantsStore] Assistant added: "${newAssistant.name}" (ID: ${newAssistant.id})`,
    )
    // Optional TODO: Persist the assistants list to localStorage here later
    // saveAssistantsToLocalStorage();
    return true // Indicate success
  }

  /**
   * Deletes an assistant by ID.
   * @param {string} assistantId - The ID of the assistant to delete.
   * @returns {boolean} - True if successful, false otherwise.
   */
  function deleteAssistant(assistantId) {
    const index = assistants.value.findIndex((a) => a.id === assistantId)
    if (index !== -1) {
      const deletedName = assistants.value[index].name
      assistants.value.splice(index, 1)
      console.log(`[AssistantsStore] Assistant deleted: ${deletedName} (ID: ${assistantId})`)
      // Optional: Update localStorage here
      // saveAssistantsToLocalStorage();
      return true
    } else {
      console.error(`[AssistantsStore] Assistant with ID ${assistantId} not found for deletion.`)
      return false
    }
  }

  // TODO: Add actions later for updating an assistant, loading from storage, etc.

  // Return state, getters, and actions to make them available
  return {
    assistants,
    // assistantCount,
    addAssistant,
    deleteAssistant,
  }
})
