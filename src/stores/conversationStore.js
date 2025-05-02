// src/stores/conversationStore.js
import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue' // Ensure toRaw is imported if used
import { useAssistantsStore } from './assistantsStore'
import {
  getAllMemories, // Ensure used by initializeStore
  saveMemory, // Ensure used by save/update functions
  deleteMemoryDB, // Ensure used by delete functions
  clearMemoryStore, // Ensure used by deleteAllMemories
} from '@/composables/useIndexedDB'
import { useApi } from '@/composables/useApi'

// generateUniqueId is used internally
function generateUniqueId(prefix = 'msg') {
  // prefix parameter is used
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export const useConversationStore = defineStore('conversation', () => {
  const MAIN_CHAT_ID = 'main_chat'

  // assistantsStore and callApi are used internally
  const assistantsStore = useAssistantsStore()
  const { callApi } = useApi()

  const activeSessionId = ref(MAIN_CHAT_ID)
  const activeMessages = ref([])
  const loadedMemoryId = ref(null)
  const memories = ref([])
  const isStoreInitialized = ref(false)

  // --- Internal Helper Functions ---

  // generateDefaultMemoryName is used internally by createNewMemoryObject if needed, or directly? Check usage.
  // Currently seems unused, but let's keep it for potential future use or if createNewMemoryObject needs it.
  // function generateDefaultMemoryName(messages, timestamp, sessionId) { /* ... */ }

  // createNewMemoryObject is used by saveActiveConversationToMemories
  function createNewMemoryObject(rawMessages, timestamp) {
    // parameters are used
    const currentSessionId = activeSessionId.value
    // Consider using generateDefaultMemoryName here if complex default name is needed
    const placeholderName = `Processing Title... (${new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`
    const newMemory = {
      memoryId: generateUniqueId('mem'), // Uses generateUniqueId
      sessionId: currentSessionId,
      timestamp: timestamp,
      name: placeholderName,
      messages: rawMessages,
      isPinned: false,
    }
    return newMemory
  }

  // triggerAiTitleGeneration is used by saveActiveConversationToMemories
  async function triggerAiTitleGeneration(memoryId, messagesForSummary) {
    // parameters are used
    if (!memoryId || !messagesForSummary || messagesForSummary.length === 0) return
    const url = '/.netlify/functions/generate-title'
    const payload = { messages: messagesForSummary, memoryId: memoryId }
    try {
      const response = await callApi(url, payload, 'POST') // Uses callApi
      if (response && response.title && response.memoryId === memoryId) {
        await updateMemoryName(memoryId, response.title, false) // Uses updateMemoryName
      } else {
        await updateMemoryName(
          memoryId,
          `Untitled Chat - ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
          true,
        )
      }
    } catch (error) {
      console.error(`[Store] Error triggering AI title gen for ${memoryId}:`, error)
      await updateMemoryName(
        memoryId,
        `Untitled Chat - ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
        true,
      )
    }
  }

  // updateMemoryName is used by triggerAiTitleGeneration and manualRenameMemory
  async function updateMemoryName(memoryId, newName, isFallbackOrManual = false) {
    // parameters are used
    const trimmedName = newName.trim()
    if (!memoryId || !trimmedName) {
      return
    }
    const index = memories.value.findIndex((mem) => mem.memoryId === memoryId)
    if (index !== -1) {
      const memoryToUpdate = memories.value[index]
      if (memoryToUpdate.name !== trimmedName) {
        memoryToUpdate.name = trimmedName
        const updateType = isFallbackOrManual ? '(Fallback/Manual)' : '(AI Generated)'
        console.log(
          `[Store] Updating name for memory ${memoryId} to "${trimmedName}" ${updateType}`,
        )
        const plainMemory = toRaw(memoryToUpdate) // Uses toRaw
        try {
          await saveMemory(plainMemory)
        } catch (error) {
          // Uses saveMemory
          console.error(`[Store] ERROR saving updated name for memory ${memoryId}:`, error)
        }
      }
    } else {
      console.warn(`[Store] Memory ID ${memoryId} not found for name update.`)
    }
  }

  // --- Core Actions --- (Exported and Used)

  // saveActiveConversationToMemories is used by setActiveSession, loadMemory
  async function saveActiveConversationToMemories() {
    if (!isStoreInitialized.value || !activeMessages.value || activeMessages.value.length === 0) {
      return null
    }
    const now = Date.now()
    const messagesToSaveRaw = toRaw(activeMessages.value) // Uses toRaw
    let memoryToSave = null
    let isNewMemory = false
    if (loadedMemoryId.value) {
      const index = memories.value.findIndex((mem) => mem.memoryId === loadedMemoryId.value)
      if (index !== -1) {
        memories.value[index].messages = messagesToSaveRaw
        memories.value[index].timestamp = now
        memoryToSave = toRaw(memories.value[index]) // Uses toRaw
      } else {
        console.warn(
          `[Store] Loaded memory ID ${loadedMemoryId.value} not found in list during save. Creating new memory.`,
        )
        memoryToSave = createNewMemoryObject(messagesToSaveRaw, now) // Uses createNewMemoryObject
        memories.value.push(memoryToSave)
        isNewMemory = true
        memoryToSave = toRaw(memoryToSave) // Uses toRaw
      }
    } else {
      memoryToSave = createNewMemoryObject(messagesToSaveRaw, now) // Uses createNewMemoryObject
      memories.value.push(memoryToSave)
      // Line removed correctly: loadedMemoryId.value = memoryToSave.memoryId;
      isNewMemory = true
      memoryToSave = toRaw(memoryToSave) // Uses toRaw
    }
    if (memoryToSave) {
      console.log(
        `[Store - saveActiveConversation] Attempting to save memory ID: ${memoryToSave.memoryId}. isNew: ${isNewMemory}`,
      )
      if (Array.isArray(memoryToSave.messages)) {
        console.log(
          `[Store - saveActiveConversation] Checking ${memoryToSave.messages.length} messages...`,
        )
      } else {
        console.warn(`messages is not an array!`)
      }
      console.log(
        `[Store - saveActiveConversation] Pre-save check complete... Proceeding with saveMemory().`,
      )
      try {
        await saveMemory(memoryToSave) // Uses saveMemory
        console.log(
          `[Store - saveActiveConversation] Successfully saved memory ID: ${memoryToSave.memoryId}.`,
        )
        if (isNewMemory) {
          const messagesForSummary = messagesToSaveRaw.slice(0, 6)
          triggerAiTitleGeneration(memoryToSave.memoryId, messagesForSummary) // Uses triggerAiTitleGeneration
        }
        return memoryToSave.memoryId
      } catch (error) {
        console.error(
          `[Store - saveActiveConversation] ERROR saving memory ID: ${memoryToSave?.memoryId}. Error caught:`,
          error,
        )
        return null
      }
    }
    return null
  }

  // loadMemory is exported and used
  async function loadMemory(memoryId) {
    // parameter is used
    if (!isStoreInitialized.value) {
      await initializeStore()
      if (!isStoreInitialized.value) {
        console.error('[Store] Initialization failed, cannot load memory.')
        return
      }
    }
    const memoryToLoad = memories.value.find((mem) => mem.memoryId === memoryId)
    if (memoryToLoad) {
      await saveActiveConversationToMemories()
      activeSessionId.value = memoryToLoad.sessionId
      activeMessages.value = Array.isArray(memoryToLoad.messages)
        ? [...toRaw(memoryToLoad.messages)]
        : [] // Uses toRaw
      loadedMemoryId.value = memoryId
      console.log(
        `[Store] Loaded memory ${memoryId} (Session: ${activeSessionId.value}) into active view.`,
      )
    } else {
      console.error(`[Store] Memory ID ${memoryId} not found.`)
    }
  }

  // deleteMemory is exported and used
  async function deleteMemory(memoryId) {
    // parameter is used
    const index = memories.value.findIndex((mem) => mem.memoryId === memoryId)
    if (index !== -1) {
      const deletedMemory = memories.value.splice(index, 1)[0]
      console.log(`[Store] Removed memory ${deletedMemory.name} (${memoryId}) from reactive list.`)
      try {
        await deleteMemoryDB(memoryId)
        console.log(`[Store] Successfully deleted memory ${memoryId} from IndexedDB.`)
      } catch (error) {
        // Uses deleteMemoryDB
        console.error(`[Store] ERROR deleting memory ${memoryId} from DB:`, error)
      }
      if (loadedMemoryId.value === memoryId) {
        activeSessionId.value = MAIN_CHAT_ID
        activeMessages.value = []
        loadedMemoryId.value = null
        console.log(`[Store] Cleared active view as deleted memory ${memoryId} was loaded.`)
      }
    } else {
      console.warn(`[Store] Memory ID ${memoryId} not found for deletion.`)
    }
  }

  // deleteMultipleMemories is exported and used
  async function deleteMultipleMemories(memoryIdsToDelete) {
    // parameter is used
    if (!Array.isArray(memoryIdsToDelete) || memoryIdsToDelete.length === 0) {
      return
    }
    const memoryIdsActuallyDeleted = []
    let resetActiveView = false
    memories.value = memories.value.filter((mem) => {
      const shouldDelete = memoryIdsToDelete.includes(mem.memoryId)
      if (shouldDelete) {
        memoryIdsActuallyDeleted.push(mem.memoryId)
        if (loadedMemoryId.value === mem.memoryId) resetActiveView = true
      }
      return !shouldDelete
    })
    console.log(`[Store] Removed ${memoryIdsActuallyDeleted.length} memories from reactive list.`)
    const deletePromises = memoryIdsActuallyDeleted.map((id) =>
      deleteMemoryDB(id).catch((e) => console.error(`DB delete failed for ${id}:`, e)),
    ) // Uses deleteMemoryDB
    await Promise.allSettled(deletePromises)
    console.log(
      `[Store] Attempted IndexedDB deletion for ${memoryIdsActuallyDeleted.length} memories.`,
    )
    if (resetActiveView) {
      activeSessionId.value = MAIN_CHAT_ID
      activeMessages.value = []
      loadedMemoryId.value = null
      console.log('[Store] Cleared active view as one of the bulk-deleted memories was loaded.')
    }
  }

  // deleteAllMemories is exported and used
  async function deleteAllMemories() {
    const count = memories.value.length
    memories.value = []
    if (loadedMemoryId.value) {
      activeSessionId.value = MAIN_CHAT_ID
      activeMessages.value = []
      loadedMemoryId.value = null
    }
    console.log(`[Store] Cleared ${count} memories from reactive list.`)
    try {
      await clearMemoryStore()
      console.log('[Store] Successfully cleared IndexedDB memory store.')
    } catch (error) {
      // Uses clearMemoryStore
      console.error('[Store] ERROR clearing memory store from IndexedDB:', error)
    }
  }

  // toggleMemoryPin is exported and used
  async function toggleMemoryPin(memoryId) {
    // parameter is used
    const index = memories.value.findIndex((mem) => mem.memoryId === memoryId)
    if (index !== -1) {
      const memoryToUpdate = memories.value[index]
      memoryToUpdate.isPinned = !memoryToUpdate.isPinned
      console.log(`[Store] Toggled pin status for ${memoryId} to ${memoryToUpdate.isPinned}.`)
      const plainMemory = toRaw(memoryToUpdate) // Uses toRaw
      try {
        await saveMemory(plainMemory)
        console.log(`[Store] Successfully saved pin status for ${memoryId}.`)
      } catch (error) {
        // Uses saveMemory
        memoryToUpdate.isPinned = !memoryToUpdate.isPinned
        console.error(`[Store] ERROR saving pin status for ${memoryId}:`, error)
        alert('Failed to update pin status.')
      }
    } else {
      console.warn(`[Store] Memory ID ${memoryId} not found for pinning.`)
    }
  }

  // manualRenameMemory is exported and used (via renameMemory alias)
  async function manualRenameMemory(memoryId, newName) {
    await updateMemoryName(memoryId, newName, true)
  } // Uses updateMemoryName, parameters used

  // setActiveSession is exported and used
  async function setActiveSession(sessionId) {
    // parameter is used
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      console.warn('[Store] setActiveSession called with invalid sessionId:', sessionId)
      return
    }
    const trimmedId = sessionId.trim()
    if (activeSessionId.value === trimmedId && !loadedMemoryId.value) {
      console.log(`[Store] Already on live session ${trimmedId}. No action needed.`)
      return
    }
    await saveActiveConversationToMemories() // Uses saveActive...
    activeSessionId.value = trimmedId
    activeMessages.value = []
    loadedMemoryId.value = null
    console.log(
      `[Store] Set active session to ${trimmedId}. Cleared messages and ensured loadedMemoryId is null.`,
    )
  }

  // addMessageToActiveSession is exported and used
  async function addMessageToActiveSession(role, content, timestamp, imagePreviewUrl) {
    // parameters are used
    const hasTextContent = typeof content === 'string' && content.trim() !== ''
    const hasImage = !!imagePreviewUrl
    if (!hasTextContent && !hasImage) {
      console.warn('[Store] addMessageToActiveSession: Attempted to add empty message.')
      return
    }
    if (role !== 'user' && role !== 'assistant' && role !== 'system') {
      console.error('[Store] addMessageToActiveSession: Invalid role provided:', role)
      return
    }
    const messageTimestamp = timestamp || Date.now()
    const newMessage = {
      messageId: generateUniqueId('msg'),
      role: role,
      content: typeof content === 'string' ? content.trim() : content,
      timestamp: messageTimestamp,
      imagePreviewUrl: imagePreviewUrl || null,
    } // Uses generateUniqueId
    activeMessages.value.push(newMessage)
    console.log(
      `[Store] Added ${role} message (ID: ${newMessage.messageId}) to active session ${activeSessionId.value}.`,
    )
    if (role === 'assistant') {
      console.log('[Store] Assistant message added, triggering background save...')
      await saveActiveConversationToMemories()
    } // Uses saveActive...
  }

  // clearActiveChatView is exported and used
  function clearActiveChatView() {
    activeMessages.value = []
    loadedMemoryId.value = null
    console.log('[Store] Cleared active chat view (messages and loaded ID).')
  }

  // initializeStore is exported and used (called below)
  async function initializeStore() {
    if (isStoreInitialized.value) {
      return
    }
    console.log('[Store] Initializing conversation store...')
    try {
      const loadedMemories = await getAllMemories() // Uses getAllMemories
      if (Array.isArray(loadedMemories)) {
        memories.value = loadedMemories.map((mem) => ({ ...mem, isPinned: mem.isPinned || false }))
        console.log(`[Store] Loaded ${memories.value.length} memories from IndexedDB.`)
      } else {
        console.warn('[Store] getAllMemories did not return an array. Initializing empty.')
        memories.value = []
      }
    } catch (error) {
      console.error('[Store] ERROR loading memories from IDB:', error)
      memories.value = []
    } finally {
      activeSessionId.value = MAIN_CHAT_ID
      activeMessages.value = []
      loadedMemoryId.value = null
      isStoreInitialized.value = true
      console.log('[Store] Conversation store initialized.')
    }
  }

  initializeStore() // Called internally

  // --- Computed Properties --- (Exported)
  const activeHistory = computed(() => activeMessages.value) // activeHistory is exported

  const memoryListForDisplay = computed(() => {
    // memoryListForDisplay is exported
    const sortedMemories = [...memories.value]
    sortedMemories.sort((a, b) => b.isPinned - a.isPinned || b.timestamp - a.timestamp)
    // Ensure map function returns a value
    return sortedMemories.map((mem) => {
      let assistantName = 'Unknown Assistant'
      let assistantImageUrl = null
      let assistantColor = null
      const isMain = isMainChatSession(mem.sessionId) // Use getter here
      if (isMain) {
        assistantName = 'Nb4U-Ai'
        try {
          const mainAssistant = assistantsStore.getAssistantById(MAIN_CHAT_ID)
          if (mainAssistant) {
            assistantImageUrl = mainAssistant.imageUrl || null
            assistantColor = mainAssistant.color || null
          }
        } catch {
          /* Ignore */
        } // Uses assistantsStore
      } else {
        try {
          const assistant = assistantsStore.getAssistantById(mem.sessionId)
          if (assistant) {
            assistantName = assistant.name
            assistantImageUrl = assistant.imageUrl || null
            assistantColor = assistant.color || null
          }
        } catch {
          // Uses assistantsStore
          console.warn(
            `[Store] Assistant for memory ${mem.memoryId} (SessionID: ${mem.sessionId}) not found.`,
          )
        }
      }
      // Return object for each memory
      return {
        id: mem.memoryId,
        name: mem.name || `Memory ${mem.memoryId.substring(0, 6)}`,
        sessionId: mem.sessionId,
        timestamp: mem.timestamp,
        messageCount: mem.messages?.length || 0,
        isPinned: mem.isPinned || false,
        isMainChat: isMain,
        assistantName: assistantName,
        assistantImageUrl: assistantImageUrl,
        assistantColor: assistantColor,
      }
    }) // Ensure map function returns
  }) // Ensure computed property returns

  // getFormattedHistoryForAPI is exported and used
  const getFormattedHistoryForAPI = ({ excludeLast = false } = {}) => {
    // parameter is used
    if (!isStoreInitialized.value || !Array.isArray(activeMessages.value)) {
      console.warn('...')
      return []
    }
    const formatted = []
    const currentSessionId = activeSessionId.value // Uses activeSessionId ref
    const messagesToFormat = activeMessages.value
    if (!isMainChatSession(currentSessionId)) {
      // Uses isMainChatSession getter
      try {
        const assistant = assistantsStore.getAssistantById(currentSessionId) // Uses assistantsStore
        if (assistant?.instructions && assistant.instructions.trim() !== '') {
          formatted.push({ role: 'system', content: assistant.instructions.trim() })
        }
      } catch (e) {
        console.error(`[Store] Error getting assistant instructions for ${currentSessionId}:`, e)
      }
    }
    const messagesToProcess = excludeLast ? messagesToFormat.slice(0, -1) : messagesToFormat
    if (Array.isArray(messagesToProcess)) {
      messagesToProcess.forEach((msg) => {
        let apiFormattedContent = null
        if (
          (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') &&
          typeof msg.content === 'string'
        ) {
          apiFormattedContent = msg.content.trim()
        }
        if (msg.imagePreviewUrl && msg.role === 'user') {
          console.warn('[Store] Image detected...')
          if (!apiFormattedContent) {
            apiFormattedContent = '[User sent an image]'
          }
        }
        if (msg.role && apiFormattedContent) {
          formatted.push({ role: msg.role, content: apiFormattedContent })
        }
      })
    } else {
      console.error(
        '[Store] getFormattedHistoryForAPI: messagesToProcess is not an array!',
        messagesToProcess,
      )
    }
    return formatted // Ensure return
  }

  // isMainChatSession is exported and used
  function isMainChatSession(sessionId) {
    return sessionId === MAIN_CHAT_ID
  } // parameter is used

  // --- Return Public API ---
  // Ensure all used functions/state/getters are returned
  return {
    activeSessionId,
    memories,
    isStoreInitialized,
    loadedMemoryId,
    activeHistory,
    memoryListForDisplay,
    getFormattedHistoryForAPI,
    setActiveSession,
    addMessageToActiveSession,
    clearActiveChatView,
    saveActiveConversationToMemories,
    loadMemory,
    deleteMemory,
    deleteMultipleMemories,
    deleteAllMemories,
    toggleMemoryPin,
    renameMemory: manualRenameMemory, // Alias for clarity
    initializeStore, // Although called internally, might be useful externally
    isMainChatSession, // Export the getter
  }
}) // End defineStore
