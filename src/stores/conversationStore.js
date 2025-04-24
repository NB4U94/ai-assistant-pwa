// src/stores/conversationStore.js
import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'
import { useAssistantsStore } from './assistantsStore'
import { getAllMemories, saveMemory, deleteMemoryDB } from '@/composables/useIndexedDB'

// Helper function (unchanged)
function generateUniqueId(prefix = 'mem') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export const useConversationStore = defineStore('conversation', () => {
  // Constants (unchanged)
  const MAIN_CHAT_ID = 'main_chat'

  // Assistants Store (unchanged)
  const assistantsStore = useAssistantsStore()

  // State (unchanged)
  const activeSessionId = ref(MAIN_CHAT_ID)
  const activeMessages = ref([])
  const loadedMemoryId = ref(null)
  const memories = ref([])
  const isStoreInitialized = ref(false)

  /**
   * Helper function to create a new memory object structure using raw messages.
   */
  function createNewMemoryObject(rawMessages, timestamp) {
    const currentSessionId = activeSessionId.value
    let defaultName = `Chat (${currentSessionId}) ${new Date(timestamp).toLocaleString()}`
    if (rawMessages.length > 0 && typeof rawMessages[0].content === 'string') {
      defaultName = rawMessages[0].content.substring(0, 30) + '...'
    } else if (currentSessionId !== MAIN_CHAT_ID) {
      try {
        const assistant = assistantsStore.getAssistantById(currentSessionId)
        if (assistant) defaultName = `${assistant.name} ${new Date(timestamp).toLocaleTimeString()}`
      } catch (_e) {
        /* ignore */
      }
    }
    const newMemory = {
      memoryId: generateUniqueId(),
      sessionId: currentSessionId,
      timestamp: timestamp,
      name: defaultName,
      messages: rawMessages,
    }
    console.log(`[ConversationStore] Created new memory object structure: ${newMemory.memoryId}`)
    return newMemory
  }

  /**
   * Saves the current activeMessages array as a new memory or updates an existing one.
   * Persists the change to IndexedDB using raw data.
   * @returns {Promise<string | null>} The memoryId of the saved/updated memory, or null if not saved.
   */
  async function saveActiveConversationToMemories() {
    if (!isStoreInitialized.value) {
      console.warn(
        '[ConversationStore] saveActiveConversationToMemories called before store initialized.',
      )
      return null
    }
    if (!activeMessages.value || activeMessages.value.length === 0) {
      return null
    }
    const now = Date.now()
    const messagesToSaveRaw = toRaw(activeMessages.value)
    let memoryToSave = null

    if (loadedMemoryId.value) {
      const index = memories.value.findIndex((mem) => mem.memoryId === loadedMemoryId.value)
      if (index !== -1) {
        memories.value[index].messages = messagesToSaveRaw
        memories.value[index].timestamp = now
        memoryToSave = { ...memories.value[index] }
        memoryToSave.messages = messagesToSaveRaw
      } else {
        memoryToSave = createNewMemoryObject(messagesToSaveRaw, now)
        memories.value.push(memoryToSave)
        loadedMemoryId.value = memoryToSave.memoryId
      }
    } else {
      memoryToSave = createNewMemoryObject(messagesToSaveRaw, now)
      memories.value.push(memoryToSave)
      loadedMemoryId.value = memoryToSave.memoryId
    }

    if (memoryToSave) {
      try {
        await saveMemory(memoryToSave)
        console.log(
          `[ConversationStore] SUCCESS: Memory ${memoryToSave.memoryId} saveMemory call completed.`,
        )
        return memoryToSave.memoryId
      } catch (error) {
        console.error(
          `[ConversationStore] ERROR: Failed to save memory ${memoryToSave.memoryId} to IndexedDB:`,
          error,
        )
        return null
      }
    }
    return null
  }

  // --- Other Actions (loadMemory, deleteMemory, setActiveSession, addMessageToActiveSession, clearActiveChatView) ---

  async function loadMemory(memoryId) {
    if (!isStoreInitialized.value) {
      await initializeStore()
      if (!isStoreInitialized.value) {
        return
      }
    }
    const memoryToLoad = memories.value.find((mem) => mem.memoryId === memoryId)
    if (memoryToLoad) {
      await saveActiveConversationToMemories()
      activeSessionId.value = memoryToLoad.sessionId
      activeMessages.value = [...memoryToLoad.messages]
      loadedMemoryId.value = memoryId
      console.log(`[ConversationStore] Loaded memory ${memoryId}.`)
    } else {
      console.error(`[ConversationStore] Memory ID ${memoryId} not found.`)
    }
  }

  async function deleteMemory(memoryId) {
    const index = memories.value.findIndex((mem) => mem.memoryId === memoryId)
    if (index !== -1) {
      memories.value.splice(index, 1)
      console.log(`[ConversationStore] Deleted memory from array: ${memoryId}`)
      try {
        await deleteMemoryDB(memoryId)
        console.log(
          `[ConversationStore] SUCCESS: Memory ${memoryId} deleteMemoryDB call completed.`,
        )
      } catch (error) {
        console.error(
          `[ConversationStore] ERROR: Failed to delete memory ${memoryId} from IndexedDB:`,
          error,
        )
      }
      if (loadedMemoryId.value === memoryId) {
        activeSessionId.value = MAIN_CHAT_ID
        activeMessages.value = []
        loadedMemoryId.value = null
      }
    } else {
      console.warn(`[ConversationStore] Memory ID ${memoryId} not found for deletion.`)
    }
  }

  // *** NEW ACTION TO DELETE MULTIPLE MEMORIES ***
  /**
   * Deletes multiple memories from the ref array and IndexedDB based on IDs.
   * @param {Array<string>} memoryIdsToDelete - An array of memory IDs to delete.
   */
  async function deleteMultipleMemories(memoryIdsToDelete) {
    if (!Array.isArray(memoryIdsToDelete) || memoryIdsToDelete.length === 0) {
      console.warn('[ConversationStore] deleteMultipleMemories called with invalid or empty array.')
      return
    }
    console.log(`[ConversationStore] Attempting to delete ${memoryIdsToDelete.length} memories...`)

    const memoryIdsActuallyDeleted = []
    let resetActiveView = false

    // --- First, remove from the reactive array ---
    // Filter keeping only those NOT in the deletion list
    const originalLength = memories.value.length
    memories.value = memories.value.filter((mem) => {
      const shouldDelete = memoryIdsToDelete.includes(mem.memoryId)
      if (shouldDelete) {
        memoryIdsActuallyDeleted.push(mem.memoryId)
        // Check if the currently loaded memory is being deleted
        if (loadedMemoryId.value === mem.memoryId) {
          resetActiveView = true
        }
      }
      return !shouldDelete // Keep if NOT in the deletion list
    })
    console.log(
      `[ConversationStore] Removed ${originalLength - memories.value.length} memories from reactive array.`,
    )

    // --- Second, delete from IndexedDB ---
    // Use Promise.allSettled to attempt all deletions even if some fail
    const deletePromises = memoryIdsActuallyDeleted.map((id) => deleteMemoryDB(id))
    const results = await Promise.allSettled(deletePromises)

    results.forEach((result, index) => {
      const id = memoryIdsActuallyDeleted[index]
      if (result.status === 'fulfilled') {
        console.log(`[ConversationStore] SUCCESS: Memory ${id} deleted from IndexedDB.`)
      } else {
        console.error(
          `[ConversationStore] ERROR: Failed to delete memory ${id} from IndexedDB:`,
          result.reason,
        )
      }
    })

    // --- Reset active view if necessary ---
    if (resetActiveView) {
      console.log('[ConversationStore] Resetting active view as loaded memory was deleted.')
      activeSessionId.value = MAIN_CHAT_ID
      activeMessages.value = []
      loadedMemoryId.value = null
    }
  }

  async function setActiveSession(sessionId) {
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      console.error('[ConversationStore] setActiveSession: Invalid sessionId.')
      return
    }
    const trimmedId = sessionId.trim()
    if (activeSessionId.value === trimmedId && !loadedMemoryId.value) {
      return
    }
    await saveActiveConversationToMemories()
    activeSessionId.value = trimmedId
    activeMessages.value = []
    loadedMemoryId.value = null
    console.log(`[ConversationStore] Active session context set to: ${activeSessionId.value}.`)
  }

  async function addMessageToActiveSession(role, content, timestamp, imagePreviewUrl) {
    const hasTextContent = typeof content === 'string' && content.trim() !== ''
    const hasImage = !!imagePreviewUrl
    if (!hasTextContent && !hasImage) return
    if (role !== 'user' && role !== 'assistant' && role !== 'system') {
      console.error(`[ConversationStore] Invalid role "${role}".`)
      return
    }
    const messageTimestamp = timestamp || Date.now()
    const newMessage = {
      role: role,
      content: typeof content === 'string' ? content.trim() : content,
      timestamp: messageTimestamp,
      imagePreviewUrl: imagePreviewUrl || null,
    }
    activeMessages.value.push(newMessage)

    if (role === 'assistant') {
      await saveActiveConversationToMemories()
    }
  }

  function clearActiveChatView() {
    activeMessages.value = []
    loadedMemoryId.value = null
    console.log('[ConversationStore] Active chat view cleared manually.')
  }

  // --- Asynchronous Initialization ---
  async function initializeStore() {
    if (isStoreInitialized.value) {
      return
    }
    console.log('[ConversationStore] Initializing store (async)...')
    try {
      const loadedMemories = await getAllMemories()
      if (Array.isArray(loadedMemories)) {
        memories.value = loadedMemories
        console.log(
          `[ConversationStore] ${memories.value.length} memories assigned to state from IndexedDB.`,
        )
      } else {
        memories.value = []
      }
    } catch (error) {
      console.error(
        '[ConversationStore] ERROR during initializeStore loading from IndexedDB:',
        error,
      )
      memories.value = []
    } finally {
      activeSessionId.value = MAIN_CHAT_ID
      activeMessages.value = []
      loadedMemoryId.value = null
      isStoreInitialized.value = true
      console.log('[ConversationStore] Initialization finally block executed.')
    }
  }

  // --- Load Initial State ---
  initializeStore()

  // --- Computed Getters --- (Unchanged)
  const activeHistory = computed(() => activeMessages.value)
  const memoryListForDisplay = computed(() => {
    return memories.value
      .map((mem) => ({
        id: mem.memoryId,
        name: mem.name || `Memory ${mem.memoryId.substring(0, 6)}`,
        sessionId: mem.sessionId,
        timestamp: mem.timestamp,
        messageCount: mem.messages?.length || 0,
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
  })

  // --- Getter Functions --- (Unchanged)
  const getFormattedHistoryForAPI = (options = {}) => {
    const { excludeLast = false } = options
    const formatted = []
    const currentSessionId = activeSessionId.value
    const messagesToFormat = activeMessages.value.slice()

    if (currentSessionId !== MAIN_CHAT_ID) {
      try {
        const assistant = assistantsStore.getAssistantById(currentSessionId)
        if (assistant?.instructions && assistant.instructions.trim() !== '') {
          formatted.push({ role: 'system', content: assistant.instructions.trim() })
        }
      } catch (e) {
        console.error(`[ConversationStore] Error getting assistant instructions:`, e)
      }
    }
    const messagesToProcess = excludeLast ? messagesToFormat.slice(0, -1) : messagesToFormat
    messagesToProcess.forEach((msg) => {
      let apiFormattedContent = null
      if (msg.role === 'user' || msg.role === 'assistant') {
        if (typeof msg.content === 'string' && msg.content.trim() !== '') {
          apiFormattedContent = msg.content.trim()
        }
      } else if (msg.role === 'system' && typeof msg.content === 'string') {
        apiFormattedContent = msg.content.trim()
      }
      if (msg.role && apiFormattedContent !== null) {
        formatted.push({ role: msg.role, content: apiFormattedContent })
      }
    })
    return formatted
  }

  // --- Return state, getters, and actions ---
  return {
    activeSessionId,
    memories,
    isStoreInitialized,
    activeHistory,
    memoryListForDisplay,
    getFormattedHistoryForAPI,
    setActiveSession,
    addMessageToActiveSession,
    clearActiveChatView,
    saveActiveConversationToMemories,
    loadMemory,
    deleteMemory,
    // *** Export the new action ***
    deleteMultipleMemories,
    initializeStore,
  }
})
