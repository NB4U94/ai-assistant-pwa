// src/stores/assistantsStore.js
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEY = 'custom-assistants'

// Helper function to load from localStorage
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
  // Return empty array
  return []
}

export const useAssistantsStore = defineStore('assistants', () => {
  // --- State ---
  const assistants = ref([]) // Initialize as empty, load in initializeStore
  const selectedAssistantId = ref(null)
  const lastError = ref(null)
  const isStoreInitialized = ref(false) // <<< ADDED STATE FLAG

  // --- Initialization Action --- <<< ADDED
  async function initializeStore() {
    if (isStoreInitialized.value) return
    console.log('[AssistantsStore] Initializing...')
    try {
      assistants.value = loadAssistantsFromLocalStorage() // Load data
      // Ensure a default selection if none is set and assistants exist
      if (selectedAssistantId.value === undefined) {
        selectedAssistantId.value = null // Default to main chat if needed
        console.log('[AssistantsStore] Corrected undefined selectedAssistantId to null.')
      }
    } catch (error) {
      console.error('[AssistantsStore] Error during initialization:', error)
      assistants.value = [] // Reset on error
      lastError.value = 'Failed to initialize assistants store.'
    } finally {
      isStoreInitialized.value = true // <<< SET FLAG
      console.log(
        `[AssistantsStore] Initialization complete. Initial selection: ${selectedAssistantId.value}`,
      )
    }
  }

  // --- Getters ---
  const getAssistantById = computed(() => {
    return (assistantId) => {
      if (!assistantId || !isStoreInitialized.value) return null // <<< Check initialized
      return assistants.value.find((a) => a && a.id === assistantId) || null
    }
  })

  const selectedAssistant = computed(() => {
    if (!selectedAssistantId.value || !isStoreInitialized.value) return null // <<< Check initialized
    return assistants.value.find((a) => a.id === selectedAssistantId.value) || null
  })

  const defaultAssistant = computed(() => {
    if (!isStoreInitialized.value) return null // <<< Check initialized
    // Find explicitly marked default first, then fallback to first, then null
    return assistants.value.find((a) => a.isDefault) || assistants.value[0] || null
  })

  // --- Actions ---

  // Internal save function
  function _saveAssistantsToLocalStorage() {
    // Prevent saving if not initialized to avoid overwriting with empty array during setup
    if (!isStoreInitialized.value) {
      console.warn('[AssistantsStore] Attempted to save before initialization completed. Skipping.')
      return
    }
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
      // Set as default only if it's the very first custom assistant being added
      isDefault: assistants.value.length === 0,
    }
    assistants.value.push(newAssistant)
    console.log(
      `[AssistantsStore] Assistant added: "${newAssistant.name}" (Color: ${newAssistant.color})`,
    )
    // Optionally select the newly added assistant
    // selectAssistant(newAssistant.id);
    return newAssistant.id // Return new ID on success
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
    if (
      'color' in updatedAssistantConfig && // Check if color key exists in update
      updatedAssistantConfig.color &&
      !/^#[0-9A-F]{6}$/i.test(updatedAssistantConfig.color)
    ) {
      console.warn(
        `[AssistantsStore] Invalid color format during update: ${updatedAssistantConfig.color}. Ignoring color update.`,
      )
      delete updatedAssistantConfig.color // Don't apply invalid color
    } else if ('color' in updatedAssistantConfig && !updatedAssistantConfig.color) {
      // Handle setting color explicitly to null/empty
      updatedAssistantConfig.color = null
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
        // Ensure color is explicitly handled if needed (null vs missing)
        color:
          'color' in updatedAssistantConfig
            ? updatedAssistantConfig.color
            : originalAssistant.color,
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
        const newDefault = defaultAssistant.value // Recalculate default AFTER deletion
        selectAssistant(newDefault ? newDefault.id : null) // Use existing select action
      }

      // Handle default: If default was deleted, make first assistant the new default
      // Ensure there's no other default explicitly set already
      if (wasDefault && assistants.value.length > 0 && !assistants.value.some((a) => a.isDefault)) {
        console.log('[AssistantsStore] Deleted assistant was the default. Setting new default...')
        setDefaultAssistant(assistants.value[0].id) // Make the new first one default
      } else if (wasDefault && assistants.value.length === 0) {
        console.log('[AssistantsStore] Deleted assistant was the default. No assistants left.')
        // No action needed, selection should already be null
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
    // Allow null or check existence only if store is initialized
    const isValidTarget =
      assistantId === null ||
      (isStoreInitialized.value && assistants.value.some((a) => a.id === assistantId))

    if (isValidTarget) {
      if (selectedAssistantId.value !== assistantId) {
        selectedAssistantId.value = assistantId
        console.log(`[AssistantsStore] Selected assistant ID set to: ${assistantId}`)
      }
    } else if (!isStoreInitialized.value) {
      console.warn(
        `[AssistantsStore] Store not initialized. Cannot select assistant ID: ${assistantId} yet.`,
      )
      // Optionally queue selection or handle differently
      selectedAssistantId.value = null // Default to main chat if selection fails during init
    } else {
      console.warn(
        `[AssistantsStore] Attempted to select non-existent assistant ID: ${assistantId}. Keeping current: ${selectedAssistantId.value}`,
      )
      // Optionally force selection back to null or default if target is invalid post-init
      // selectedAssistantId.value = null;
    }
  }

  // Set default assistant
  function setDefaultAssistant(id) {
    if (!id || !isStoreInitialized.value) return // Ensure store is ready
    let found = false
    assistants.value.forEach((assistant) => {
      // Set isDefault flag based on matching ID
      const shouldBeDefault = assistant.id === id
      // Only update if the state changes to trigger watcher correctly
      if (assistant.isDefault !== shouldBeDefault) {
        assistant.isDefault = shouldBeDefault
      }
      if (assistant.isDefault) {
        found = true
      }
    })

    if (!found) {
      console.error(`[AssistantsStore] Cannot set default: Assistant with ID ${id} not found.`)
      lastError.value = `Assistant with ID ${id} not found. Cannot set default.`
    } else {
      console.log(`[AssistantsStore] Assistant ID ${id} set as default.`)
      // Trigger save explicitly if watcher might miss nested change (though deep should catch it)
      _saveAssistantsToLocalStorage()
    }
  }

  // --- Watcher ---
  watch(
    assistants,
    () => {
      // <<< REMOVED unused newValue, oldValue parameters
      // console.log('[AssistantsStore] Assistants array changed, auto-saving...');
      _saveAssistantsToLocalStorage() // Call internal save function
    },
    { deep: true }, // Deep watch needed to detect changes inside assistant objects (like isDefault)
  )

  // --- Auto-initialize ---
  initializeStore()

  // --- Return Public API ---
  return {
    // State
    assistants,
    selectedAssistantId,
    lastError,
    isStoreInitialized, // <<< EXPORT FLAG

    // Getters
    selectedAssistant,
    defaultAssistant,
    getAssistantById,

    // Actions
    initializeStore, // <<< EXPORT ACTION
    addAssistant,
    updateAssistant,
    deleteAssistant,
    selectAssistant,
    setDefaultAssistant,
  }
}) // End defineStore
