// src/stores/assistantsStore.js
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEY = 'custom-assistants'

// Helper function to load from localStorage (Ensure body is present)
function loadAssistantsFromLocalStorage() {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY)
    if (storedData) {
      const parsedData = JSON.parse(storedData)
      // Add validation for array and basic structure (id)
      if (Array.isArray(parsedData) && parsedData.every((a) => a && a.id)) {
        console.log(`[AssistantsStore] Loaded ${parsedData.length} assistants from localStorage.`)
        // Ensure necessary fields exist, provide defaults if missing (optional robustness)
        return parsedData.map((a) => ({
          ...a,
          // Provide defaults for potentially missing fields from older saves
          model: a.model || null,
          level: a.level || 'General',
          imageUrl: a.imageUrl || null,
          color: a.color || null,
          isDefault: a.isDefault || false,
          // createdAt might be missing, handle if needed
        }))
      } else {
        console.warn('[AssistantsStore] Invalid data structure found in localStorage, ignoring.')
        localStorage.removeItem(STORAGE_KEY) // Clear invalid data
      }
    }
  } catch (error) {
    console.error('[AssistantsStore] Error loading or parsing localStorage:', error)
    localStorage.removeItem(STORAGE_KEY) // Clear potentially corrupt data
  }
  console.log('[AssistantsStore] No valid assistants found in localStorage, initializing default.')
  // Return empty array or potentially a default Nb4U-Ai assistant if needed
  return []
}

export const useAssistantsStore = defineStore('assistants', () => {
  // --- State ---
  const assistants = ref(loadAssistantsFromLocalStorage())
  // Default to null selection, matching main_chat concept
  const selectedAssistantId = ref(null)
  const lastError = ref(null)

  console.log(
    `[AssistantsStore] Initializing. selectedAssistantId defaulted to: ${selectedAssistantId.value}`,
  )

  // --- Getters --- (Ensure bodies are present)
  const getAssistantById = computed(() => {
    return (assistantId) => {
      if (!assistantId) return null
      return assistants.value.find((a) => a && a.id === assistantId) || null
    }
  })

  const selectedAssistant = computed(() => {
    if (!selectedAssistantId.value) return null
    return assistants.value.find((a) => a.id === selectedAssistantId.value) || null
  })

  const defaultAssistant = computed(() => {
    // Find explicitly marked default first, then fallback to first, then null
    return assistants.value.find((a) => a.isDefault) || assistants.value[0] || null
  })

  // --- Actions --- (Ensure bodies are present)

  // Internal save function
  function _saveAssistantsToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assistants.value))
      // console.log(`[AssistantsStore] Saved assistants to localStorage.`); // Reduce noise
    } catch (error) {
      console.error('[AssistantsStore] Error saving to localStorage:', error)
      lastError.value = 'Failed to save assistants. Storage might be full.'
    }
  }

  // Add assistant (Includes color validation/storage)
  function addAssistant(assistantConfig) {
    lastError.value = null
    // Validate color format if present
    if (assistantConfig.color && !/^#[0-9A-F]{6}$/i.test(assistantConfig.color)) {
      console.warn(
        `[AssistantsStore] Invalid color format provided: ${assistantConfig.color}. Ignoring color.`,
      )
      assistantConfig.color = null
    }
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
      id: uuidv4(),
      name: trimmedName,
      instructions: assistantConfig.instructions,
      model: assistantConfig.model || null,
      level: assistantConfig.level || 'General',
      createdAt: new Date().toISOString(),
      imageUrl: assistantConfig.imageUrl || null,
      color: assistantConfig.color || null, // Store color
      isDefault: assistants.value.length === 0, // First added is default initially
    }
    assistants.value.push(newAssistant)
    console.log(
      `[AssistantsStore] Assistant added: "${newAssistant.name}" (Color: ${newAssistant.color})`,
    )
    // Optionally select the newly added assistant
    // selectAssistant(newAssistant.id);
    return true
  }

  // Update assistant (Includes color validation/storage)
  function updateAssistant(updatedAssistantConfig) {
    lastError.value = null
    if (!updatedAssistantConfig?.id) {
      lastError.value = 'Missing assistant ID for update.'
      console.error('[AssistantsStore]', lastError.value, updatedAssistantConfig)
      return false
    }
    // Validate color format if present in update
    if (updatedAssistantConfig.color && !/^#[0-9A-F]{6}$/i.test(updatedAssistantConfig.color)) {
      console.warn(
        `[AssistantsStore] Invalid color format during update: ${updatedAssistantConfig.color}. Ignoring color update.`,
      )
      delete updatedAssistantConfig.color // Don't apply invalid color
    }
    const index = assistants.value.findIndex((a) => a.id === updatedAssistantConfig.id)
    if (index !== -1) {
      const originalAssistant = assistants.value[index]
      const newName = updatedAssistantConfig.name
        ? updatedAssistantConfig.name.trim()
        : originalAssistant.name
      // Check for name conflict only if name is changing
      if (
        newName !== originalAssistant.name &&
        assistants.value.some((a) => a.name === newName && a.id !== updatedAssistantConfig.id)
      ) {
        lastError.value = `Assistant name "${newName}" already exists.`
        console.error(`[AssistantsStore] Update conflict: ${lastError.value}`)
        return false
      }
      // Merge updates safely, preserving critical fields
      assistants.value[index] = {
        ...originalAssistant,
        ...updatedAssistantConfig, // Apply incoming updates
        name: newName, // Apply potentially updated name
        id: originalAssistant.id, // MUST preserve original ID
        createdAt: originalAssistant.createdAt, // MUST preserve original creation date
        updatedAt: new Date().toISOString(), // Add/update modification date
      }
      console.log(`[AssistantsStore] Assistant updated: "${assistants.value[index].name}"`)
      return true
    } else {
      lastError.value = `Assistant with ID ${updatedAssistantConfig.id} not found for update.`
      console.error(`[AssistantsStore] ${lastError.value}`)
      return false
    }
  }

  // Delete assistant
  function deleteAssistant(assistantId) {
    lastError.value = null
    const index = assistants.value.findIndex((a) => a.id === assistantId)
    if (index !== -1) {
      const deletedAssistant = assistants.value[index]
      const wasSelected = selectedAssistantId.value === assistantId
      const wasDefault = deletedAssistant.isDefault
      assistants.value.splice(index, 1) // Remove from array
      console.log(
        `[AssistantsStore] Assistant deleted: ${deletedAssistant.name || `ID: ${assistantId}`}`,
      )
      // Handle selection: If deleted was selected, select default or null
      if (wasSelected) {
        const newDefault = defaultAssistant.value
        selectAssistant(newDefault ? newDefault.id : null) // Use existing select action
      }
      // Handle default: If default was deleted, make first assistant the new default
      if (wasDefault && assistants.value.length > 0 && !assistants.value.some((a) => a.isDefault)) {
        setDefaultAssistant(assistants.value[0].id) // Use existing set default action
      }
      return true
    } else {
      lastError.value = `Assistant with ID ${assistantId} not found for deletion.`
      console.error(`[AssistantsStore] ${lastError.value}`)
      return false
    }
  }

  // Select assistant (accepts null for main_chat)
  function selectAssistant(assistantId) {
    if (assistantId === null || assistants.value.some((a) => a.id === assistantId)) {
      if (selectedAssistantId.value !== assistantId) {
        selectedAssistantId.value = assistantId
        console.log(`[AssistantsStore] Selected assistant ID set to: ${assistantId}`)
      }
    } else {
      console.warn(
        `[AssistantsStore] Attempted to select non-existent assistant ID: ${assistantId}. Keeping current: ${selectedAssistantId.value}`,
      )
    }
  }

  // Set default assistant
  function setDefaultAssistant(id) {
    if (!id) return
    let found = false
    assistants.value.forEach((assistant) => {
      // Set isDefault flag based on matching ID
      assistant.isDefault = assistant.id === id
      if (assistant.isDefault) {
        found = true
      }
    })
    if (!found) {
      console.error(`[AssistantsStore] Cannot set default: Assistant with ID ${id} not found.`)
      lastError.value = `Assistant with ID ${id} not found. Cannot set default.`
    } else {
      console.log(`[AssistantsStore] Assistant ID ${id} set as default.`)
    }
    // Watcher will trigger save implicitly by modifying the array item
  }

  // --- Watcher --- (Ensure body is present)
  watch(
    assistants,
    () => {
      // Removed unused 'newValue' parameter
      // console.log('[AssistantsStore] Assistants array changed, auto-saving...');
      _saveAssistantsToLocalStorage() // Call internal save function
    },
    { deep: true }, // Deep watch needed to detect changes inside assistant objects (like isDefault)
  )

  // --- Return Public API --- (Ensure complete)
  return {
    assistants,
    selectedAssistantId,
    selectedAssistant,
    defaultAssistant,
    getAssistantById,
    lastError,
    addAssistant,
    updateAssistant,
    deleteAssistant,
    selectAssistant,
    setDefaultAssistant,
  }
}) // End defineStore
