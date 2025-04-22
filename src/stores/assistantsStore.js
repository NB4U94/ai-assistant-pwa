// src/stores/assistantsStore.js
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid' // Import uuid

// Key for localStorage
const STORAGE_KEY = 'custom-assistants' // Use your existing key

// --- Helper function to load from localStorage ---
// (Moved outside defineStore for clarity, but works inside too)
function loadAssistantsFromLocalStorage() {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY)
    if (storedData) {
      const parsedData = JSON.parse(storedData)
      // Basic validation: Check if it's an array and elements have IDs
      if (Array.isArray(parsedData) && parsedData.every((a) => a && a.id)) {
        console.log(`[AssistantsStore] Loaded ${parsedData.length} assistants from localStorage.`)
        return parsedData
      } else {
        console.warn('[AssistantsStore] Invalid data structure found in localStorage, ignoring.')
        localStorage.removeItem(STORAGE_KEY) // Clear invalid data
      }
    }
  } catch (error) {
    console.error('[AssistantsStore] Error loading or parsing localStorage:', error)
    localStorage.removeItem(STORAGE_KEY) // Clear potentially corrupt data
  }
  console.log('[AssistantsStore] No valid assistants found in localStorage, initializing empty.')
  return [] // Default to empty array
}

export const useAssistantsStore = defineStore('assistants', () => {
  // --- State ---
  const assistants = ref(loadAssistantsFromLocalStorage())
  const selectedAssistantId = ref(null) // ID of the currently selected assistant
  const lastError = ref(null)

  // --- Automatically select the default or first assistant on load ---
  if (assistants.value.length > 0) {
    const defaultAssistant = assistants.value.find((a) => a.isDefault)
    selectedAssistantId.value = defaultAssistant ? defaultAssistant.id : assistants.value[0].id
    console.log(`[AssistantsStore] Initial selection: ${selectedAssistantId.value}`)
  }

  // --- Getters ---
  const getAssistantById = computed(() => {
    return (assistantId) => assistants.value.find((a) => a && a.id === assistantId)
  })

  const selectedAssistant = computed(() => {
    if (!selectedAssistantId.value) return null
    return assistants.value.find((a) => a.id === selectedAssistantId.value) || null // Ensure null if not found
  })

  const defaultAssistant = computed(() => {
    // Find an assistant marked as default, or return the first one, or null
    return assistants.value.find((a) => a.isDefault) || assistants.value[0] || null
  })

  // --- Actions ---

  /**
   * Saves the current assistants array to localStorage.
   */
  function _saveAssistantsToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assistants.value))
      console.log(`[AssistantsStore] Saved ${assistants.value.length} assistants to localStorage.`)
    } catch (error) {
      console.error('[AssistantsStore] Error saving to localStorage:', error)
      lastError.value = 'Failed to save assistants. Storage might be full.'
    }
  }

  // --- Watcher ---
  watch(
    assistants,
    (newValue) => {
      console.log('[AssistantsStore] Assistants array changed, auto-saving...')
      _saveAssistantsToLocalStorage()
    },
    { deep: true },
  )

  /**
   * Adds a new assistant configuration.
   */
  function addAssistant(assistantConfig) {
    lastError.value = null
    // Basic validation (keep it simple or enhance as needed)
    if (!assistantConfig?.name || !assistantConfig.instructions) {
      lastError.value = 'Missing required fields (name, instructions).'
      console.error('[AssistantsStore] Invalid config for addAssistant:', assistantConfig)
      return false
    }

    const trimmedName = assistantConfig.name.trim()
    if (assistants.value.some((a) => a.name === trimmedName)) {
      lastError.value = `Assistant name "${trimmedName}" already exists.`
      console.error(`[AssistantsStore] ${lastError.value}`)
      return false
    }

    const newAssistant = {
      id: uuidv4(), // Use UUID for reliable unique ID
      name: trimmedName,
      instructions: assistantConfig.instructions,
      level: assistantConfig.level || 'General', // Default level if not provided
      createdAt: new Date().toISOString(),
      imageUrl: assistantConfig.imageUrl || null,
      isDefault: assistants.value.length === 0, // First assistant is default
    }

    assistants.value.push(newAssistant)
    console.log(`[AssistantsStore] Assistant added: "${newAssistant.name}"`)

    // If this is the first assistant, select it
    if (assistants.value.length === 1) {
      selectAssistant(newAssistant.id)
    }
    return true // Indicate success
  }

  /**
   * Updates an existing assistant.
   */
  function updateAssistant(updatedAssistantConfig) {
    lastError.value = null
    if (!updatedAssistantConfig?.id) {
      lastError.value = 'Missing assistant ID for update.'
      console.error('[AssistantsStore]', lastError.value, updatedAssistantConfig)
      return false
    }

    const index = assistants.value.findIndex((a) => a.id === updatedAssistantConfig.id)

    if (index !== -1) {
      const originalAssistant = assistants.value[index]
      const newName = updatedAssistantConfig.name
        ? updatedAssistantConfig.name.trim()
        : originalAssistant.name // Handle potential missing name in update

      // Check for name conflict (only if name changed and another assistant has the new name)
      if (
        newName !== originalAssistant.name &&
        assistants.value.some((a) => a.name === newName && a.id !== updatedAssistantConfig.id)
      ) {
        lastError.value = `Assistant name "${newName}" already exists.`
        console.error(`[AssistantsStore] Update conflict: ${lastError.value}`)
        return false
      }

      // Merge updates, preserving ID and createdAt
      assistants.value[index] = {
        ...originalAssistant, // Start with original
        ...updatedAssistantConfig, // Apply updates
        name: newName, // Ensure trimmed name
        id: originalAssistant.id, // Ensure ID is not overwritten
        createdAt: originalAssistant.createdAt, // Ensure createdAt is not overwritten
        updatedAt: new Date().toISOString(), // Add/update timestamp
      }
      console.log(`[AssistantsStore] Assistant updated: "${assistants.value[index].name}"`)
      return true // Indicate success
    } else {
      lastError.value = `Assistant with ID ${updatedAssistantConfig.id} not found for update.`
      console.error(`[AssistantsStore] ${lastError.value}`)
      return false
    }
  }

  /**
   * Deletes an assistant by ID.
   */
  function deleteAssistant(assistantId) {
    lastError.value = null
    const index = assistants.value.findIndex((a) => a.id === assistantId)

    if (index !== -1) {
      const deletedAssistant = assistants.value[index]
      const wasSelected = selectedAssistantId.value === assistantId
      const wasDefault = deletedAssistant.isDefault

      assistants.value.splice(index, 1)
      console.log(
        `[AssistantsStore] Assistant deleted: ${deletedAssistant.name || `ID: ${assistantId}`}`,
      )

      // Handle selection change
      if (wasSelected) {
        const newDefault = defaultAssistant.value // Check for a new default
        selectAssistant(newDefault ? newDefault.id : null) // Select default or null
      }
      // Handle default change
      if (wasDefault && assistants.value.length > 0 && !assistants.value.some((a) => a.isDefault)) {
        setDefaultAssistant(assistants.value[0].id) // Make the new first one default
      }

      return true // Indicate success
    } else {
      lastError.value = `Assistant with ID ${assistantId} not found for deletion.`
      console.error(`[AssistantsStore] ${lastError.value}`)
      return false
    }
  }

  /**
   * Selects an assistant by ID.
   */
  function selectAssistant(assistantId) {
    if (assistantId === null || assistants.value.some((a) => a.id === assistantId)) {
      selectedAssistantId.value = assistantId
      console.log(`[AssistantsStore] Selected assistant ID: ${assistantId}`)
    } else {
      console.warn(
        `[AssistantsStore] Attempted to select non-existent assistant ID: ${assistantId}. Keeping current selection: ${selectedAssistantId.value}`,
      )
      // Optionally select default instead:
      // const def = defaultAssistant.value;
      // selectedAssistantId.value = def ? def.id : null;
    }
  }

  /**
   * Sets a specific assistant as the default.
   */
  function setDefaultAssistant(id) {
    if (!id) return
    let found = false
    assistants.value.forEach((assistant) => {
      if (assistant.id === id) {
        assistant.isDefault = true
        found = true
      } else {
        assistant.isDefault = false // Ensure only one default
      }
    })
    if (!found) {
      console.error(`[AssistantsStore] Cannot set default: Assistant with ID ${id} not found.`)
      lastError.value = `Assistant with ID ${id} not found. Cannot set default.`
    } else {
      console.log(`[AssistantsStore] Assistant ID ${id} set as default.`)
      // No need to save explicitly, watcher handles it.
    }
  }

  // --- Return state, getters, and actions ---
  return {
    assistants,
    selectedAssistantId,
    selectedAssistant, // Expose the computed getter
    defaultAssistant, // Expose the computed getter
    getAssistantById,
    lastError,
    addAssistant,
    updateAssistant,
    deleteAssistant,
    selectAssistant, // Expose the action
    setDefaultAssistant, // Expose the action
  }
})
