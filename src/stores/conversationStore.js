// src/stores/conversationStore.js
import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'
import { useAssistantsStore } from './assistantsStore'
import {
  getAllMemories,
  saveMemory,
  deleteMemoryDB,
  clearMemoryStore,
} from '@/composables/useIndexedDB'
import { useApi } from '@/composables/useApi'

// Removed unused 'prefix' parameter
function generateUniqueId(prefix = 'msg') {
  // Keep default for potential future use, but don't require it
  // Fixed useless escapes
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export const useConversationStore = defineStore('conversation', () => {
  const MAIN_CHAT_ID = 'main_chat'
  const assistantsStore = useAssistantsStore()
  const { callApi } = useApi()

  const activeSessionId = ref(MAIN_CHAT_ID)
  const activeMessages = ref([])
  const loadedMemoryId = ref(null)
  const currentSessionMemoryId = ref(null)
  const memories = ref([])
  const isStoreInitialized = ref(false)
  const isCurrentSessionTestMode = ref(false)

  // --- Internal Helper Functions ---
  function createNewMemoryObject(rawMessages, timestamp) {
    const currentSessionId = activeSessionId.value
    const placeholderName = `Processing Title... (${new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`
    const newMemory = {
      memoryId: generateUniqueId('mem'), // Use function without passing prefix explicitly if not needed
      sessionId: currentSessionId,
      timestamp: timestamp,
      name: placeholderName,
      messages: rawMessages,
      isPinned: false,
    }
    return newMemory
  }
  async function triggerAiTitleGeneration(memoryId, messagesForSummary) {
    if (!memoryId || !messagesForSummary || messagesForSummary.length === 0) return
    console.log(`[Store] Triggering AI title generation for new memory: ${memoryId}`)
    const url = '/.netlify/functions/generate-title'
    const payload = { messages: messagesForSummary, memoryId: memoryId }
    const fallbackName = `Untitled Chat - ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    try {
      const response = await callApi(url, payload, 'POST')
      if (response && response.title && response.memoryId === memoryId) {
        await updateMemoryName(memoryId, response.title, false)
      } else {
        console.warn(`[Store] AI title generation failed or returned invalid data for ${memoryId}.`)
        await updateMemoryName(memoryId, fallbackName, true)
      }
    } catch (error) {
      console.error(`[Store] Error calling AI title gen function for ${memoryId}:`, error)
      await updateMemoryName(memoryId, fallbackName, true)
    }
  }
  async function updateMemoryName(memoryId, newName, isFallbackOrManual = false) {
    const trimmedName = newName.trim()
    if (!memoryId || !trimmedName) {
      console.warn('[Store] updateMemoryName called with invalid parameters.')
      return
    }
    const index = memories.value.findIndex((mem) => mem.memoryId === memoryId)
    if (index !== -1) {
      const memoryToUpdate = memories.value[index]
      if (memoryToUpdate.name !== trimmedName) {
        memoryToUpdate.name = trimmedName
        const updateType = isFallbackOrManual ? '(Fallback/Manual)' : '(AI Generated)'
        // Fixed useless escapes
        console.log(
          `[Store] Updating name for memory ${memoryId} to "${trimmedName}" ${updateType}`,
        )
        const plainMemory = toRaw(memoryToUpdate)
        try {
          // Fixed useless escapes
          console.log(
            `%c[Store] DB save (updateMemoryName): memoryId=${plainMemory?.memoryId}, sessionId=${plainMemory?.sessionId}`,
            'color: orange',
          )
          await saveMemory(plainMemory)
        } catch (error) {
          console.error(`[Store] ERROR saving updated name for memory ${memoryId}:`, error)
        }
      }
    } else {
      console.warn(`[Store] Memory ID ${memoryId} not found for name update.`)
    }
  }

  // --- Core Actions ---
  async function saveActiveConversationToMemories() {
    // 1. Check Test Mode
    if (isCurrentSessionTestMode.value) {
      console.log('[Store - saveActive] Test mode is active. Skipping save.')
      return null
    }
    // 2. Check Initialization and Messages
    if (!isStoreInitialized.value || !activeMessages.value || activeMessages.value.length === 0) {
      return null
    }

    const now = Date.now()
    const messagesToSaveRaw = toRaw(activeMessages.value)
    let memoryToSave = null
    let existingMemoryIndex = -1
    let isNewMemory = false

    // 3. Check if explicitly loaded memory needs update
    if (loadedMemoryId.value) {
      existingMemoryIndex = memories.value.findIndex((mem) => mem.memoryId === loadedMemoryId.value)
      if (existingMemoryIndex !== -1) {
        console.log(
          `[Store - saveActive] Updating explicitly loaded memory: ${loadedMemoryId.value}`,
        )
        memories.value[existingMemoryIndex].messages = messagesToSaveRaw
        memories.value[existingMemoryIndex].timestamp = now
        memoryToSave = toRaw(memories.value[existingMemoryIndex])
        isNewMemory = false
      } else {
        console.warn(
          `[Store - saveActive] Loaded memory ID ${loadedMemoryId.value} not found. Resetting.`,
        )
        loadedMemoryId.value = null
        currentSessionMemoryId.value = null
      }
    }

    // 4. Check if a memory for the *current live session* needs update
    if (!memoryToSave && currentSessionMemoryId.value) {
      existingMemoryIndex = memories.value.findIndex(
        (mem) => mem.memoryId === currentSessionMemoryId.value,
      )
      if (existingMemoryIndex !== -1) {
        console.log(
          `[Store - saveActive] Updating memory created for current session: ${currentSessionMemoryId.value}`,
        )
        memories.value[existingMemoryIndex].messages = messagesToSaveRaw
        memories.value[existingMemoryIndex].timestamp = now
        memoryToSave = toRaw(memories.value[existingMemoryIndex])
        isNewMemory = false
      } else {
        console.warn(
          `[Store - saveActive] Current session memory ID ${currentSessionMemoryId.value} not found. Resetting.`,
        )
        currentSessionMemoryId.value = null
      }
    }

    // 5. If no existing memory found for this session/load context, create a new one
    if (!memoryToSave) {
      console.log(
        `[Store - saveActive] No loaded/session memory found for session ${activeSessionId.value}. Creating new memory.`,
      )
      const newMemoryObject = createNewMemoryObject(messagesToSaveRaw, now)
      memories.value.push(newMemoryObject)
      currentSessionMemoryId.value = newMemoryObject.memoryId
      loadedMemoryId.value = null
      isNewMemory = true
      memoryToSave = toRaw(newMemoryObject)
      console.log(
        `[Store - saveActive] Created new memory object. ID: ${currentSessionMemoryId.value}`,
      )
    }

    // 6. Perform Save to IndexedDB
    if (memoryToSave) {
      console.log(
        `%c[Store] Preparing to save to DB:
            Memory ID: ${memoryToSave.memoryId}
            Session ID: ${memoryToSave.sessionId}
            Is New Memory Flag: ${isNewMemory}
            Loaded ID Ref: ${loadedMemoryId.value}
            Current Session Memory ID Ref: ${currentSessionMemoryId.value}`,
        'color: cyan; background-color: #333; padding: 2px;',
      )

      console.log(
        `[Store - saveActive] Attempting DB save for memory ID: ${memoryToSave.memoryId}.`,
      )
      try {
        await saveMemory(memoryToSave)
        console.log(
          `[Store - saveActive] Successfully called saveMemory for ID: ${memoryToSave.memoryId}.`,
        )

        if (isNewMemory && messagesToSaveRaw.length > 0) {
          const messagesForSummary = messagesToSaveRaw.slice(0, 6)
          triggerAiTitleGeneration(memoryToSave.memoryId, messagesForSummary)
        }
        return memoryToSave.memoryId
      } catch (error) {
        console.error(
          `[Store - saveActive] ERROR calling saveMemory for ID: ${memoryToSave?.memoryId}. Error:`,
          error,
        )
        return null
      }
    } else {
      console.error('[Store - saveActive] Logic error: memoryToSave is null after checks.')
      return null
    }
  }

  // --- Other Actions ---
  async function loadMemory(memoryId) {
    if (!memoryId) return
    if (!isStoreInitialized.value) await initializeStore()
    if (!isStoreInitialized.value) return
    await saveActiveConversationToMemories()
    const memoryToLoad = memories.value.find((mem) => mem.memoryId === memoryId)
    if (memoryToLoad) {
      activeSessionId.value = memoryToLoad.sessionId
      activeMessages.value = Array.isArray(memoryToLoad.messages)
        ? [...toRaw(memoryToLoad.messages)]
        : []
      loadedMemoryId.value = memoryId
      currentSessionMemoryId.value = null
      isCurrentSessionTestMode.value = false
      console.log(`[Store] Loaded memory ${memoryId}.`)
      assistantsStore.selectAssistant(
        activeSessionId.value === MAIN_CHAT_ID ? null : activeSessionId.value,
      )
    } else {
      console.error(`[Store] Memory ID ${memoryId} not found.`)
      alert(`Error: Could not find Memory ID ${memoryId}.`)
      setActiveSession(MAIN_CHAT_ID)
    }
  }
  async function deleteMemory(memoryId) {
    const index = memories.value.findIndex((mem) => mem.memoryId === memoryId)
    if (index !== -1) {
      // Removed unused 'deletedMemory' variable
      const name = memories.value[index].name // Get name for logging before splice
      memories.value.splice(index, 1)
      // Fixed useless escapes
      console.log(`[Store] Removed memory ${name} (${memoryId}) from reactive list.`)
      try {
        await deleteMemoryDB(memoryId)
        console.log(`[Store] Successfully deleted memory ${memoryId} from IndexedDB.`)
      } catch (error) {
        console.error(`[Store] ERROR deleting memory ${memoryId} from DB:`, error)
        alert(`Failed to delete memory ${memoryId} from storage. It may reappear on refresh.`)
      }
      if (currentSessionMemoryId.value === memoryId) currentSessionMemoryId.value = null
      if (loadedMemoryId.value === memoryId) setActiveSession(MAIN_CHAT_ID)
    } else {
      console.warn(`[Store] Memory ID ${memoryId} not found for deletion.`)
    }
  }
  async function deleteMemoriesForSession(sessionId) {
    if (!sessionId || sessionId === MAIN_CHAT_ID) return
    console.log(`[Store] Deleting all memories for session ID: ${sessionId}`)
    const memoryIdsToDelete = []
    let resetActiveViewRequired = false
    let clearCurrentSessionMemoryId = false
    memories.value = memories.value.filter((mem) => {
      if (mem.sessionId === sessionId) {
        memoryIdsToDelete.push(mem.memoryId)
        if (loadedMemoryId.value === mem.memoryId) resetActiveViewRequired = true
        if (currentSessionMemoryId.value === mem.memoryId) clearCurrentSessionMemoryId = true
        return false
      }
      return true
    })
    if (clearCurrentSessionMemoryId) {
      console.log(
        `[Store] Cleared currentSessionMemoryId as its memory was deleted during session batch delete.`,
      )
      currentSessionMemoryId.value = null
    }
    if (resetActiveViewRequired) {
      console.log(
        `[Store] Resetting active view as loaded session ${sessionId} memories were deleted.`,
      )
      setActiveSession(MAIN_CHAT_ID)
    }
    console.log(
      `[Store] Found ${memoryIdsToDelete.length} memories to delete for session ${sessionId}.`,
    )
    if (memoryIdsToDelete.length > 0) {
      const deletePromises = memoryIdsToDelete.map((id) =>
        deleteMemoryDB(id).catch((e) =>
          console.error(`[Store] DB delete failed for memory ID ${id}:`, e),
        ),
      )
      try {
        const results = await Promise.allSettled(deletePromises)
        console.log(
          `[Store] DB deletion attempted for ${memoryIdsToDelete.length} memories. Results:`,
          results,
        )
      } catch (error) {
        console.error(`[Store] Error during Promise.allSettled for memory deletion:`, error)
      }
    }
  }
  async function deleteMultipleMemories(memoryIdsToDelete) {
    if (!Array.isArray(memoryIdsToDelete) || memoryIdsToDelete.length === 0) return
    const memoryIdsActuallyDeleted = []
    let resetActiveView = false
    let clearCurrentSessionId = false
    memories.value = memories.value.filter((mem) => {
      const shouldDelete = memoryIdsToDelete.includes(mem.memoryId)
      if (shouldDelete) {
        memoryIdsActuallyDeleted.push(mem.memoryId)
        if (loadedMemoryId.value === mem.memoryId) resetActiveView = true
        if (currentSessionMemoryId.value === mem.memoryId) clearCurrentSessionId = true
      }
      return !shouldDelete
    })
    console.log(`[Store] Removed ${memoryIdsActuallyDeleted.length} memories from reactive list.`)
    if (clearCurrentSessionId) {
      console.log(
        `[Store] Cleared currentSessionMemoryId as its memory was deleted during bulk delete.`,
      )
      currentSessionMemoryId.value = null
    }
    const deletePromises = memoryIdsActuallyDeleted.map((id) =>
      deleteMemoryDB(id).catch((e) =>
        console.error(`[Store] DB delete failed for memory ID ${id}:`, e),
      ),
    )
    await Promise.allSettled(deletePromises)
    console.log(
      `[Store] Attempted IndexedDB deletion for ${memoryIdsActuallyDeleted.length} memories.`,
    )
    if (resetActiveView) {
      console.log('[Store] Cleared active view as loaded memory was bulk-deleted.')
      setActiveSession(MAIN_CHAT_ID)
    }
  }
  async function deleteAllMemories() {
    const count = memories.value.length
    memories.value = []
    currentSessionMemoryId.value = null
    setActiveSession(MAIN_CHAT_ID)
    console.log(`[Store] Cleared ${count} memories from reactive list.`)
    try {
      await clearMemoryStore()
      console.log('[Store] Successfully cleared IndexedDB memory store.')
    } catch (error) {
      console.error('[Store] ERROR clearing memory store:', error)
      alert('Failed to clear all memories from storage.')
    }
  }
  async function setActiveSession(sessionId, isTest = false) {
    const trimmedId = sessionId ? sessionId.trim() : MAIN_CHAT_ID
    if (!trimmedId) {
      console.error('[Store] setActiveSession: Invalid sessionId:', trimmedId)
      return
    }

    if (
      activeSessionId.value === trimmedId &&
      loadedMemoryId.value === null &&
      isCurrentSessionTestMode.value === isTest
    ) {
      console.log(
        `[Store] Already on live session ${trimmedId} with test mode ${isTest}. No switch needed.`,
      )
      try {
        assistantsStore.selectAssistant(trimmedId === MAIN_CHAT_ID ? null : trimmedId)
      } catch (e) {
        console.error(`[Store] Error syncing assistant store on no-op setActiveSession:`, e)
      }
      return
    }

    if (!isCurrentSessionTestMode.value && activeMessages.value.length > 0) {
      console.log('[Store - setActiveSession] Saving current session before switching...')
      await saveActiveConversationToMemories()
    } else {
      console.log(
        '[Store - setActiveSession] Current session empty or test mode, no save needed before switching.',
      )
    }

    activeSessionId.value = trimmedId
    activeMessages.value = []
    loadedMemoryId.value = null
    currentSessionMemoryId.value = null
    isCurrentSessionTestMode.value = isTest
    console.log(
      `[Store] Set active session to ${trimmedId}. Cleared messages/IDs. Test mode: ${isTest}`,
    )
    try {
      assistantsStore.selectAssistant(trimmedId === MAIN_CHAT_ID ? null : trimmedId)
    } catch (e) {
      console.error(`[Store] Error calling assistantsStore.selectAssistant for ID ${trimmedId}:`, e)
    }
  }
  async function addMessageToActiveSession(
    role,
    content,
    timestamp,
    imagePreviewUrl,
    messageId = null,
  ) {
    const hasTextContent = typeof content === 'string' && content.trim() !== ''
    const hasImage = !!imagePreviewUrl
    if ((!hasTextContent && !hasImage) || !['user', 'assistant', 'system'].includes(role)) return

    const newMessage = {
      messageId: messageId || generateUniqueId(role === 'user' ? 'msg' : 'asst'),
      role: role,
      content: typeof content === 'string' ? content.trim() : content,
      timestamp: timestamp || Date.now(),
      imagePreviewUrl: imagePreviewUrl || null,
    }

    activeMessages.value.push(newMessage)
    console.log(
      `[Store] Added ${role} message (ID: ${newMessage.messageId}) to session ${activeSessionId.value}. Total: ${activeMessages.value.length}`,
    )

    if (!isCurrentSessionTestMode.value) {
      if (role === 'assistant') {
        console.log(
          '[Store] Assistant message added (non-test mode), triggering background save...',
        )
        saveActiveConversationToMemories().catch((error) => {
          console.error('[Store] Background save failed after assistant message:', error)
        })
      }
    } else {
      console.log('[Store] Message added in test mode, skipping autosave.')
    }
  }
  function clearActiveChatView() {
    console.log(
      '[Store - clearActiveChatView] Saving current state (if applicable) before clearing...',
    )
    saveActiveConversationToMemories().finally(() => {
      activeMessages.value = []
      loadedMemoryId.value = null
      currentSessionMemoryId.value = null
      isCurrentSessionTestMode.value = false
      console.log(
        '[Store] Cleared active chat view messages, loaded ID, session memory ID, and test mode.',
      )
    })
  }
  async function initializeStore() {
    if (isStoreInitialized.value) return
    console.log('[Store] Initializing conversation store...')
    try {
      const loaded = await getAllMemories()
      memories.value = Array.isArray(loaded)
        ? loaded.map((mem) => ({ ...mem, isPinned: mem.isPinned || false }))
        : []
      console.log(`[Store] Loaded ${memories.value.length} memories from IndexedDB.`)
    } catch (error) {
      console.error('[Store] ERROR loading memories from IDB:', error)
      memories.value = []
    } finally {
      activeSessionId.value = MAIN_CHAT_ID
      activeMessages.value = []
      loadedMemoryId.value = null
      currentSessionMemoryId.value = null
      isCurrentSessionTestMode.value = false
      isStoreInitialized.value = true
      console.log('[Store] Conversation store initialized.')
    }
  }
  async function toggleMemoryPin(memoryId) {
    const index = memories.value.findIndex((mem) => mem.memoryId === memoryId)
    if (index !== -1) {
      const memoryToUpdate = memories.value[index]
      const originalPinStatus = memoryToUpdate.isPinned
      memoryToUpdate.isPinned = !memoryToUpdate.isPinned
      console.log(`[Store] Toggled pin status for ${memoryId} to ${memoryToUpdate.isPinned}.`)
      const plainMemory = toRaw(memoryToUpdate)
      try {
        await saveMemory(plainMemory)
        console.log(`[Store] Successfully saved pin status for ${memoryId}.`)
      } catch (error) {
        memoryToUpdate.isPinned = originalPinStatus
        console.error(`[Store] ERROR saving pin status for ${memoryId}:`, error)
        alert('Failed to update pin status.')
      }
    } else {
      console.warn(`[Store] Memory ID ${memoryId} not found for pinning.`)
    }
  }
  async function manualRenameMemory(memoryId, newName) {
    await updateMemoryName(memoryId, newName, true)
  }

  // --- Computed Properties & Getters ---
  const activeHistory = computed(() => activeMessages.value)

  const memoryListForDisplay = computed(() => {
    const sortedMemories = [...memories.value]
    sortedMemories.sort((a, b) => {
      const pinDiff = (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
      if (pinDiff !== 0) return pinDiff
      return (b.timestamp || 0) - (a.timestamp || 0)
    })
    return sortedMemories.map((mem) => {
      let assistantName = 'Unknown Assistant'
      let assistantImageUrl = null
      let assistantColor = null
      const isMain = isMainChatSession(mem.sessionId)
      try {
        const assistant = assistantsStore.getAssistantById(mem.sessionId)
        if (assistant) {
          assistantName = assistant.name || (isMain ? 'Nb4U-Ai' : 'Unnamed Assistant')
          assistantImageUrl = assistant.imageUrl || null
          assistantColor = assistant.color || null
        } else if (isMain) {
          assistantName = 'Nb4U-Ai'
        } else {
          assistantName = `Deleted Assistant (${mem.sessionId.substring(0, 4)}...)`
        }
      } catch (e) {
        console.error(`[Store] Error fetching assistant details for session ${mem.sessionId}:`, e)
        if (isMain) assistantName = 'Nb4U-Ai' // Fallback for main if error
      }
      return {
        id: mem.memoryId,
        name: mem.name || `Memory ${mem.memoryId.substring(0, 6)}`,
        sessionId: mem.sessionId,
        timestamp: mem.timestamp,
        messageCount: Array.isArray(mem.messages) ? mem.messages.length : 0,
        isPinned: mem.isPinned || false,
        isMainChat: isMain,
        assistantName: assistantName,
        assistantImageUrl: assistantImageUrl,
        assistantColor: assistantColor,
      }
    })
  })

  const getFormattedHistoryForAPI = ({ excludeLast = false } = {}) => {
    if (!isStoreInitialized.value || !Array.isArray(activeMessages.value)) return []
    const formatted = []
    const currentSessionId = activeSessionId.value
    if (!isMainChatSession(currentSessionId)) {
      try {
        const assistant = assistantsStore.getAssistantById(currentSessionId)
        if (assistant?.instructions && assistant.instructions.trim() !== '') {
          formatted.push({ role: 'system', content: assistant.instructions.trim() })
        }
      } catch (e) {
        console.error(`[Store] Error getting assistant instructions for ${currentSessionId}:`, e)
      }
    }
    const messagesToProcess = excludeLast ? activeMessages.value.slice(0, -1) : activeMessages.value
    if (Array.isArray(messagesToProcess)) {
      messagesToProcess.forEach((msg) => {
        if (!msg || !msg.role || typeof msg.content === 'undefined') return
        let apiFormattedContent = null
        if (typeof msg.content === 'string') {
          apiFormattedContent = msg.content.trim()
        } else {
          console.warn(`[Store] Skipping non-string content for API for msgId ${msg.messageId}`)
        }
        if (msg.imagePreviewUrl && msg.role === 'user') {
          console.warn(
            '[Store] User message with image detected - API formatting might need adjustment.',
          )
          const imagePlaceholder = '[User sent an image]'
          // Fixed useless escapes
          apiFormattedContent = apiFormattedContent
            ? `${imagePlaceholder}\n${apiFormattedContent}`
            : imagePlaceholder
        }
        if (
          ['user', 'assistant', 'system'].includes(msg.role) &&
          apiFormattedContent !== null &&
          apiFormattedContent !== ''
        ) {
          formatted.push({ role: msg.role, content: apiFormattedContent })
        }
      })
    } else {
      console.error('[Store] getFormattedHistoryForAPI: messagesToProcess is not an array!')
    }
    return formatted
  }

  function isMainChatSession(sessionId) {
    return sessionId === MAIN_CHAT_ID
  }

  // --- Initialize & Return ---
  initializeStore()
  return {
    // State refs
    activeSessionId,
    memories,
    isStoreInitialized,
    loadedMemoryId,
    isCurrentSessionTestMode,
    currentSessionMemoryId, // <<< Export new state

    // Computed refs (Getters)
    activeHistory, // Still reflects the live conversation messages
    memoryListForDisplay,

    // Actions
    initializeStore,
    setActiveSession,
    addMessageToActiveSession,
    clearActiveChatView,
    saveActiveConversationToMemories, // Core save logic
    loadMemory,
    deleteMemory,
    deleteMultipleMemories,
    deleteAllMemories,
    toggleMemoryPin,
    renameMemory: manualRenameMemory,
    deleteMemoriesForSession,

    // Helpers/Utilities
    getFormattedHistoryForAPI,
    isMainChatSession,
    MAIN_CHAT_ID,
  }
}) // End defineStore
