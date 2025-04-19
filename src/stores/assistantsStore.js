import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Using setup store syntax
export const useAssistantsStore = defineStore('assistants', () => {
  // --- State ---
  const assistants = ref([
    // Example initial data (can be removed later)
    // { id: 'preset-1', name: 'Creative Writer', level: 2, instructions: '...', createdAt: Date.now(), imageUrl: 'https://placehold.co/64x64/eeddee/333333?text=CW' }
  ])

  // --- Getters ---
  const getAssistantById = computed(() => {
    return (assistantId) => {
      if (!Array.isArray(assistants.value)) {
        console.error('[AssistantsStore] assistants state is not an array!')
        return undefined
      }
      return assistants.value.find((a) => a && a.id === assistantId)
    }
  })

  // --- Actions ---

  /**
   * Adds a new assistant configuration to the store.
   * *** NOW PREVENTS adding if name already exists. ***
   * @param {object} assistantConfig - Object containing name, instructions, level, and optionally imageUrl.
   * @returns {boolean} - True if successful, false otherwise (e.g., validation failure, duplicate name).
   */
  function addAssistant(assistantConfig) {
    // Validation
    if (
      !assistantConfig ||
      !assistantConfig.name ||
      !assistantConfig.instructions ||
      !assistantConfig.level
    ) {
      console.error(
        '[AssistantsStore] Invalid or incomplete assistant config passed to addAssistant:',
        assistantConfig,
      )
      return false // Indicate failure
    }

    const trimmedName = assistantConfig.name.trim()

    // *** STRICTER Duplicate Name Check ***
    if (assistants.value.some((a) => a && a.name === trimmedName)) {
      console.error(
        // Changed from warn to error
        `[AssistantsStore] Assistant with name "${trimmedName}" already exists. Add failed.`,
      )
      // Optionally, you could provide more specific feedback to the UI here if needed
      // For now, just returning false indicates failure to the component.
      return false // Indicate failure: Assistant not added
    }
    // ************************************

    const newAssistant = {
      id: Date.now().toString(),
      name: trimmedName, // Use trimmed name
      level: assistantConfig.level,
      instructions: assistantConfig.instructions,
      createdAt: Date.now(),
      imageUrl: assistantConfig.imageUrl || null,
    }

    if (!Array.isArray(assistants.value)) {
      console.error('[AssistantsStore] Cannot add assistant, state is not an array!')
      return false
    }

    assistants.value.push(newAssistant)
    console.log(
      `[AssistantsStore] Assistant added: "${newAssistant.name}" (ID: ${newAssistant.id})`,
    )
    // TODO: Persist to localStorage
    return true // Indicate success
  }

  /**
   * Updates an existing assistant in the store.
   * @param {object} updatedAssistantConfig - Object containing the full assistant data, including its ID and optionally imageUrl.
   * @returns {boolean} - True if successful, false otherwise.
   */
  function updateAssistant(updatedAssistantConfig) {
    if (!updatedAssistantConfig || !updatedAssistantConfig.id) {
      console.error(
        '[AssistantsStore] Invalid or missing ID in updatedAssistantConfig:',
        updatedAssistantConfig,
      )
      return false
    }
    if (
      !updatedAssistantConfig.name ||
      !updatedAssistantConfig.instructions ||
      !updatedAssistantConfig.level
    ) {
      console.error(
        '[AssistantsStore] Incomplete assistant config passed to updateAssistant:',
        updatedAssistantConfig,
      )
      return false
    }

    if (!Array.isArray(assistants.value)) {
      console.error('[AssistantsStore] Cannot update assistant, state is not an array!')
      return false
    }

    const index = assistants.value.findIndex((a) => a && a.id === updatedAssistantConfig.id)

    if (index !== -1) {
      const originalAssistant = assistants.value[index]
      if (!originalAssistant) {
        console.error(
          `[AssistantsStore] Found index ${index} but original assistant data is invalid.`,
        )
        return false
      }
      const newName = updatedAssistantConfig.name.trim()

      // *** Check for duplicate name conflict during UPDATE ***
      if (
        newName !== originalAssistant.name &&
        assistants.value.some((a) => a && a.name === newName && a.id !== updatedAssistantConfig.id)
      ) {
        console.error(
          // Changed from warn to error
          `[AssistantsStore] Updating assistant (ID: ${updatedAssistantConfig.id}) would result in a duplicate name: "${newName}". Update failed.`,
        )
        // You might want to signal this specific error back to the UI
        return false // Prevent update if name conflict
      }
      // ******************************************************

      const updatedAssistant = {
        ...originalAssistant,
        ...updatedAssistantConfig,
        name: newName,
        imageUrl: updatedAssistantConfig.imageUrl || null,
        // createdAt is preserved via ...originalAssistant spread
      }

      assistants.value.splice(index, 1, updatedAssistant)
      console.log(
        `[AssistantsStore] Assistant updated: "${updatedAssistant.name}" (ID: ${updatedAssistant.id})`,
      )
      return true
    } else {
      console.error(
        `[AssistantsStore] Assistant with ID ${updatedAssistantConfig.id} not found for update.`,
      )
      return false
    }
  }

  /**
   * Deletes an assistant by ID.
   * @param {string} assistantId - The ID of the assistant to delete.
   * @returns {boolean} - True if successful, false otherwise.
   */
  function deleteAssistant(assistantId) {
    if (!Array.isArray(assistants.value)) {
      console.error('[AssistantsStore] Cannot delete assistant, state is not an array!')
      return false
    }
    const index = assistants.value.findIndex((a) => a && a.id === assistantId)
    if (index !== -1) {
      const deletedName = assistants.value[index]?.name || `ID: ${assistantId}`
      assistants.value.splice(index, 1)
      console.log(`[AssistantsStore] Assistant deleted: ${deletedName} (ID: ${assistantId})`)
      return true
    } else {
      console.error(`[AssistantsStore] Assistant with ID ${assistantId} not found for deletion.`)
      return false
    }
  }

  // Return state, getters, and actions
  return {
    assistants,
    getAssistantById,
    addAssistant,
    updateAssistant,
    deleteAssistant,
  }
})
