import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'
import { useAssistantsStore } from './assistantsStore'
import { useSettingsStore } from './settingsStore'
import {
  getAllMemories,
  saveMemory,
  deleteMemoryDB,
  clearMemoryStore,
} from '@/composables/useIndexedDB'
import { useApi } from '@/composables/useApi'

// Generate unique IDs
function generateUniqueId(prefix = 'msg') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export const useConversationStore = defineStore('conversation', () => {
  const MAIN_CHAT_ID = 'main_chat'
  const assistantsStore = useAssistantsStore()
  const settingsStore = useSettingsStore()
  const { callApi } = useApi()

  // State Refs
  const activeSessionId = ref(MAIN_CHAT_ID)
  const activeMessages = ref([]) // Holds messages for NORMAL (non-test) sessions
  const loadedMemoryId = ref(null)
  const currentSessionMemoryId = ref(null)
  const memories = ref([])
  const isStoreInitialized = ref(false)
  const isCurrentSessionTestMode = ref(false)
  const testModeAssistantConfig = ref(null)

  function createNewMemoryObject(rawMessages, timestamp) {
    const currentSessionId = activeSessionId.value
    const placeholderName = `Processing Title... (${new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`
    return {
      memoryId: generateUniqueId('mem'),
      sessionId: currentSessionId,
      timestamp: timestamp,
      name: placeholderName,
      messages: rawMessages,
      isPinned: false,
    }
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
        console.log(
          `[Store] Updating name for memory ${memoryId} to "${trimmedName}" ${updateType}`,
        )
        const plainMemory = toRaw(memoryToUpdate)
        try {
          await saveMemory(plainMemory)
        } catch (error) {
          console.error(`[Store] ERROR saving updated name for memory ${memoryId}:`, error)
        }
      }
    } else {
      console.warn(`[Store] Memory ID ${memoryId} not found for name update.`)
    }
  }

  const setTestModeAssistantConfig = (config) => {
    console.log('[Store] Setting Test Mode with Assistant Config:', config ? { ...config } : null)
    if (config) {
      testModeAssistantConfig.value = { ...config }
      isCurrentSessionTestMode.value = true
      activeMessages.value = [] // Clear main messages; test messages are local to ChatViewLogic
      loadedMemoryId.value = null
      currentSessionMemoryId.value = null
      if (config.id && !config.id.startsWith('temp_')) {
        activeSessionId.value = config.id
      } else if (config.id) {
        activeSessionId.value = config.id
      }
      console.log(
        `[Store] Test mode set. Config ID: ${testModeAssistantConfig.value?.id}, Active Session ID for context: ${activeSessionId.value}`,
      )
    } else {
      clearTestModeAssistantConfig()
    }
  }

  const clearTestModeAssistantConfig = () => {
    if (testModeAssistantConfig.value !== null || isCurrentSessionTestMode.value !== false) {
      console.log('[Store] Clearing Test Mode Assistant Config.')
      testModeAssistantConfig.value = null
      isCurrentSessionTestMode.value = false
    }
  }

  async function saveActiveConversationToMemories() {
    if (isCurrentSessionTestMode.value) {
      console.log('[Store - saveActive] Test mode active. Skipping save of activeMessages.')
      return null
    }
    if (!isStoreInitialized.value || !activeMessages.value || activeMessages.value.length === 0) {
      console.log('[Store - saveActive] Store not ready or no messages. Skipping save.')
      return null
    }
    if (!settingsStore.saveConversationsGlobally) {
      console.log('[Store - saveActive] Global conversation saving is disabled. Skipping save.')
      return null
    }
    if (settingsStore.excludedAssistantIds.has(activeSessionId.value)) {
      console.log(
        `[Store - saveActive] Assistant (${activeSessionId.value}) is excluded. Skipping save.`,
      )
      return null
    }
    const now = Date.now()
    const messagesToSaveRaw = toRaw(activeMessages.value)
    let memoryToSave = null
    let existingMemoryIndex = -1
    let isNewMemory = false
    if (loadedMemoryId.value) {
      existingMemoryIndex = memories.value.findIndex((mem) => mem.memoryId === loadedMemoryId.value)
      if (existingMemoryIndex !== -1) {
        memories.value[existingMemoryIndex].messages = messagesToSaveRaw
        memories.value[existingMemoryIndex].timestamp = now
        memoryToSave = toRaw(memories.value[existingMemoryIndex])
      } else {
        loadedMemoryId.value = null
        currentSessionMemoryId.value = null
      }
    }
    if (!memoryToSave && currentSessionMemoryId.value) {
      existingMemoryIndex = memories.value.findIndex(
        (mem) => mem.memoryId === currentSessionMemoryId.value,
      )
      if (existingMemoryIndex !== -1) {
        memories.value[existingMemoryIndex].messages = messagesToSaveRaw
        memories.value[existingMemoryIndex].timestamp = now
        memoryToSave = toRaw(memories.value[existingMemoryIndex])
      } else {
        currentSessionMemoryId.value = null
      }
    }
    if (!memoryToSave) {
      const newMemoryObject = createNewMemoryObject(messagesToSaveRaw, now)
      memories.value.push(newMemoryObject)
      currentSessionMemoryId.value = newMemoryObject.memoryId
      loadedMemoryId.value = null
      isNewMemory = true
      memoryToSave = toRaw(newMemoryObject)
    }
    if (memoryToSave) {
      console.log(
        `%c[Store] Preparing to save to DB: Memory ID: ${memoryToSave.memoryId}, Session ID: ${memoryToSave.sessionId}`,
        'color: cyan; background-color: #333; padding: 2px;',
      )
      try {
        await saveMemory(memoryToSave)
        console.log(`[Store - saveActive] Successfully saved memory ${memoryToSave.memoryId}.`)
        if (isNewMemory && messagesToSaveRaw.length > 0) {
          triggerAiTitleGeneration(memoryToSave.memoryId, messagesToSaveRaw.slice(0, 6))
        }
        return memoryToSave.memoryId
      } catch (error) {
        console.error(
          `[Store - saveActive] ERROR saving memory ID: ${memoryToSave?.memoryId}. Error:`,
          error,
        )
        return null
      }
    } else {
      console.error('[Store - saveActive] Logic error: memoryToSave is null after checks.')
      return null
    }
  }

  async function loadMemory(memoryId) {
    if (!memoryId) return
    if (!isStoreInitialized.value) await initializeStore()
    if (!isStoreInitialized.value) return

    await saveActiveConversationToMemories()
    const memoryToLoad = memories.value.find((mem) => mem.memoryId === memoryId)
    if (memoryToLoad) {
      clearTestModeAssistantConfig()
      activeSessionId.value = memoryToLoad.sessionId
      activeMessages.value = Array.isArray(memoryToLoad.messages)
        ? [...toRaw(memoryToLoad.messages)]
        : []
      loadedMemoryId.value = memoryId
      currentSessionMemoryId.value = null
      console.log(`[Store] Loaded memory ${memoryId}.`)
      try {
        assistantsStore.selectAssistant(
          activeSessionId.value === MAIN_CHAT_ID ? null : activeSessionId.value,
        )
      } catch (e) {
        console.error(`Error calling assistantsStore.selectAssistant during loadMemory:`, e)
      }
    } else {
      console.error(`[Store] Memory ID ${memoryId} not found. Cannot load.`)
      alert(`Error: Could not find Memory ID ${memoryId}. Returning to main chat.`)
      await setActiveSession(MAIN_CHAT_ID)
    }
  }

  async function setActiveSession(sessionId) {
    const trimmedId = sessionId ? sessionId.trim() : MAIN_CHAT_ID
    if (!trimmedId) {
      console.error('[Store] setActiveSession: Invalid sessionId provided.')
      return
    }

    if (
      activeSessionId.value === trimmedId &&
      loadedMemoryId.value === null &&
      !isCurrentSessionTestMode.value
    ) {
      console.log(`[Store] Session ${trimmedId} is already active (normal mode). No change needed.`)
      try {
        assistantsStore.selectAssistant(trimmedId === MAIN_CHAT_ID ? null : trimmedId)
      } catch (e) {
        console.error(`Error syncing assistant store on no-op setActiveSession:`, e)
      }
      return
    }

    if (activeMessages.value.length > 0 && !isCurrentSessionTestMode.value) {
      console.log(
        `[Store] Saving non-test session ${activeSessionId.value} before switching to ${trimmedId}...`,
      )
      try {
        await saveActiveConversationToMemories()
      } catch (saveError) {
        console.error(
          `[Store] FAILED to save session ${activeSessionId.value} before switching. Error:`,
          saveError,
        )
      }
    }

    clearTestModeAssistantConfig()
    console.log(`[Store] Setting active NORMAL session to ${trimmedId}.`)
    activeSessionId.value = trimmedId
    loadedMemoryId.value = null
    currentSessionMemoryId.value = null
    await loadConversationForSession(trimmedId)

    try {
      assistantsStore.selectAssistant(trimmedId === MAIN_CHAT_ID ? null : trimmedId)
    } catch (e) {
      console.error(`Error calling assistantsStore.selectAssistant for ID ${trimmedId}:`, e)
    }
  }

  async function loadConversationForSession(sessionId) {
    const mostRecentMemory = memories.value
      .filter((mem) => mem.sessionId === sessionId)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0]

    if (mostRecentMemory) {
      activeMessages.value = Array.isArray(mostRecentMemory.messages)
        ? [...toRaw(mostRecentMemory.messages)]
        : []
      currentSessionMemoryId.value = mostRecentMemory.memoryId
      console.log(
        `[Store] Loaded most recent history for session ${sessionId} (Memory ID: ${mostRecentMemory.memoryId}).`,
      )
    } else {
      activeMessages.value = []
      currentSessionMemoryId.value = null
      console.log(`[Store] No history for session ${sessionId}. Starting fresh.`)
    }
  }

  async function deleteMemory(memoryId) {
    const index = memories.value.findIndex((mem) => mem.memoryId === memoryId)
    if (index !== -1) {
      const name = memories.value[index].name || `ID: ${memoryId}`
      memories.value.splice(index, 1)
      console.log(`[Store] Removed memory "${name}" (${memoryId}) from reactive list.`)
      try {
        await deleteMemoryDB(memoryId)
        console.log(`[Store] Deleted memory ${memoryId} from DB.`)
      } catch (error) {
        console.error(`[Store] ERROR deleting memory ${memoryId} from DB:`, error)
        alert(`Failed to delete memory "${name}" from storage. It may reappear on refresh.`)
      }
      if (currentSessionMemoryId.value === memoryId) currentSessionMemoryId.value = null
      if (loadedMemoryId.value === memoryId) {
        await setActiveSession(MAIN_CHAT_ID)
      }
    } else {
      console.warn(`[Store] Memory ID ${memoryId} not found for deletion.`)
    }
  }

  async function deleteMemoriesForSession(sessionId) {
    if (!sessionId || sessionId === MAIN_CHAT_ID) {
      console.warn(`[Store] Attempted to delete memories for invalid/main session ID: ${sessionId}`)
      return
    }
    console.log(`[Store] Deleting memories for session: ${sessionId}`)
    const memoryIdsToDelete = []
    let resetActiveViewRequired = false
    let clearCurrentSessionMemoryIdLocal = false
    memories.value = memories.value.filter((mem) => {
      if (mem.sessionId === sessionId) {
        memoryIdsToDelete.push(mem.memoryId)
        if (loadedMemoryId.value === mem.memoryId) resetActiveViewRequired = true
        if (currentSessionMemoryId.value === mem.memoryId) clearCurrentSessionMemoryIdLocal = true
        return false
      }
      return true
    })
    if (clearCurrentSessionMemoryIdLocal) {
      currentSessionMemoryId.value = null
    }
    if (resetActiveViewRequired) {
      await setActiveSession(MAIN_CHAT_ID)
    }
    console.log(
      `[Store] Found ${memoryIdsToDelete.length} memories to delete for session ${sessionId}.`,
    )
    if (memoryIdsToDelete.length > 0) {
      const deletePromises = memoryIdsToDelete.map((id) =>
        deleteMemoryDB(id).catch((e) => {
          console.error(`[Store] DB delete failed for memory ID ${id}:`, e)
        }),
      )
      try {
        await Promise.allSettled(deletePromises)
      } catch (error) {
        console.error(`[Store] Error during Promise.allSettled for memory deletion:`, error)
      }
    }
  }

  async function deleteMultipleMemories(memoryIdsToDelete) {
    if (!Array.isArray(memoryIdsToDelete) || memoryIdsToDelete.length === 0) return
    console.log(`[Store] Attempting to delete ${memoryIdsToDelete.length} memories.`)
    let memoryIdsActuallyDeleted = []
    let resetActiveView = false
    let clearCurrentSessionIdLocal = false
    memories.value = memories.value.filter((mem) => {
      const shouldDelete = memoryIdsToDelete.includes(mem.memoryId)
      if (shouldDelete) {
        memoryIdsActuallyDeleted.push(mem.memoryId)
        if (loadedMemoryId.value === mem.memoryId) resetActiveView = true
        if (currentSessionMemoryId.value === mem.memoryId) clearCurrentSessionIdLocal = true
      }
      return !shouldDelete
    })
    if (clearCurrentSessionIdLocal) {
      currentSessionMemoryId.value = null
    }
    if (memoryIdsActuallyDeleted.length > 0) {
      const deletePromises = memoryIdsActuallyDeleted.map((id) =>
        deleteMemoryDB(id).catch((e) => {
          console.error(`[Store] DB delete failed for memory ID ${id}:`, e)
        }),
      )
      await Promise.allSettled(deletePromises)
    }
    if (resetActiveView) {
      await setActiveSession(MAIN_CHAT_ID)
    }
  }

  async function deleteAllMemories() {
    const count = memories.value.length
    if (count === 0) return
    memories.value = []
    currentSessionMemoryId.value = null
    await setActiveSession(MAIN_CHAT_ID)
    console.log(`[Store] Cleared ${count} memories from reactive list. Now clearing DB...`)
    try {
      await clearMemoryStore()
    } catch (error) {
      console.error('[Store] ERROR clearing memory store:', error)
      alert('Failed to clear all memories from storage. Please try again.')
    }
  }

  async function addMessageToActiveSession(
    role,
    content,
    timestamp,
    imagePreviewUrl,
    messageId = null,
    isLoading = false,
  ) {
    if (isCurrentSessionTestMode.value) {
      // Prevent adding to store's activeMessages during test mode
      console.log(
        '[Store] Test mode active. Skipping addMessageToActiveSession for store. Message handled by ChatViewLogic.',
      )
      return
    }
    const hasTextContent = typeof content === 'string' && content.trim() !== ''
    const hasImage = !!imagePreviewUrl
    if (!['user', 'assistant', 'system'].includes(role)) {
      console.warn(`[Store] Invalid role "${role}" for addMessageToActiveSession.`)
      return
    }
    if (!hasTextContent && !hasImage && role !== 'assistant') {
      console.warn(`[Store] Skipping empty non-assistant message (Role: ${role}).`)
      return
    }
    const newMessage = {
      messageId: messageId || generateUniqueId(role === 'user' ? 'msg' : 'asst'),
      role: role,
      content: content,
      timestamp: timestamp || Date.now(),
      imagePreviewUrl: imagePreviewUrl || null,
      isLoading: isLoading,
    }
    activeMessages.value.push(newMessage)
    console.log(
      `[Store] Added ${role} message (ID: ${newMessage.messageId}, Loading: ${isLoading}) to session ${activeSessionId.value}. Total: ${activeMessages.value.length}`,
    )
    if (role === 'assistant' && !isLoading && !isCurrentSessionTestMode.value) {
      // Double check test mode
      saveActiveConversationToMemories().catch((error) => {
        console.error('[Store] Background save failed after complete assistant message:', error)
      })
    }
  }

  function appendContentToMessage(messageId, textChunk) {
    if (isCurrentSessionTestMode.value) {
      // Prevent modification during test mode
      console.log(
        '[Store] Test mode active. Skipping appendContentToMessage for store. Message handled by ChatViewLogic.',
      )
      return
    }
    if (!messageId || typeof textChunk !== 'string') {
      console.warn('[Store] appendContentToMessage called with invalid parameters.')
      return
    }
    const messageIndex = activeMessages.value.findIndex((m) => m.messageId === messageId)
    if (messageIndex !== -1) {
      const message = activeMessages.value[messageIndex]
      if (typeof message.content !== 'string') {
        message.content = String(message.content || '') + textChunk
      } else {
        message.content += textChunk
      }
    } else {
      console.warn(`[Store] Message ID ${messageId} not found for content append.`)
    }
  }

  function updateMessageLoadingState(messageId, isLoading) {
    if (isCurrentSessionTestMode.value) {
      // Prevent modification during test mode
      console.log(
        '[Store] Test mode active. Skipping updateMessageLoadingState for store. Message handled by ChatViewLogic.',
      )
      return
    }
    if (!messageId) return
    const messageIndex = activeMessages.value.findIndex((m) => m.messageId === messageId)
    if (messageIndex !== -1) {
      const message = activeMessages.value[messageIndex]
      const newState = !!isLoading
      if (message.isLoading !== newState) {
        message.isLoading = newState
        if (message.role === 'assistant' && !newState && !isCurrentSessionTestMode.value) {
          // Double check test mode
          saveActiveConversationToMemories().catch((error) => {
            console.error(
              `[Store] Background save failed after message ${messageId} finished loading:`,
              error,
            )
          })
        }
      }
    } else {
      console.warn(`[Store] Message ID ${messageId} not found for loading state update.`)
    }
  }

  function clearActiveChatView() {
    saveActiveConversationToMemories().finally(() => {
      activeMessages.value = []
      loadedMemoryId.value = null
      currentSessionMemoryId.value = null
      console.log('[Store] Cleared active chat view messages and memory links.')
      // If clearing means going back to main chat after a test, ensure test mode is also cleared.
      // setActiveSession(MAIN_CHAT_ID) would handle this.
      // If this is called while ChatViewLogic for a test is unmounting, it will also clear test mode config.
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
      console.error('[Store] ERROR loading memories from IndexedDB:', error)
      memories.value = []
      alert('Error loading previous conversations. Starting fresh.')
    } finally {
      clearTestModeAssistantConfig()
      activeSessionId.value = MAIN_CHAT_ID
      activeMessages.value = [] // Start with empty messages for the main chat
      loadedMemoryId.value = null
      currentSessionMemoryId.value = null
      isStoreInitialized.value = true
      console.log('[Store] Conversation store initialization complete.')
      try {
        assistantsStore.selectAssistant(null)
      } catch (e) {
        console.error('Error syncing assistant store post-initialization:', e)
      }
    }
  }

  async function toggleMemoryPin(memoryId) {
    const index = memories.value.findIndex((mem) => mem.memoryId === memoryId)
    if (index !== -1) {
      const memoryToUpdate = memories.value[index]
      const originalPinStatus = memoryToUpdate.isPinned
      memoryToUpdate.isPinned = !memoryToUpdate.isPinned
      const plainMemory = toRaw(memoryToUpdate)
      try {
        await saveMemory(plainMemory)
      } catch (error) {
        memoryToUpdate.isPinned = originalPinStatus
        console.error(`[Store] ERROR saving pin status for ${memoryId}:`, error)
        alert('Failed to update pin status in storage.')
      }
    } else {
      console.warn(`[Store] Memory ID ${memoryId} not found for pinning.`)
    }
  }

  async function manualRenameMemory(memoryId, newName) {
    await updateMemoryName(memoryId, newName, true)
  }

  const activeHistory = computed(() => activeMessages.value)

  const memoryListForDisplay = computed(() => {
    const currentMemories = memories.value
    const sortedMemories = [...currentMemories]
    sortedMemories.sort((a, b) => {
      const pinDiff = (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
      if (pinDiff !== 0) return pinDiff
      return (b.timestamp || 0) - (a.timestamp || 0)
    })
    return sortedMemories.map((mem) => {
      let assistantName = 'Unknown / Deleted'
      let assistantImageUrl = null
      let assistantColor = null
      const isMain = isMainChatSession(mem.sessionId)
      try {
        if (isMain) {
          assistantName = 'Nb4U-Ai'
        } else {
          if (assistantsStore.isStoreInitialized) {
            const assistant = assistantsStore.getAssistantById(mem.sessionId)
            if (assistant) {
              assistantName = assistant.name || 'Unnamed Assistant'
              assistantImageUrl = assistant.imageUrl || null
              assistantColor = assistant.color || null
            } else {
              assistantName = `Deleted (${mem.sessionId.substring(0, 4)}...)`
            }
          } else {
            assistantName = 'Loading Assistants...'
          }
        }
      } catch (e) {
        console.error(`Error fetching assistant details for session ${mem.sessionId}:`, e)
        if (isMain) assistantName = 'Nb4U-Ai'
      }
      return {
        id: mem.memoryId,
        name: mem.name || `Memory ${mem.memoryId.substring(0, 6)}...`,
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

  // Corrected getFormattedHistoryForAPI
  const getFormattedHistoryForAPI = (options = {}) => {
    const { excludeLast = false, messagesForContext = null } = options
    const formatted = []
    let systemInstructions = null
    let messagesToProcess = []

    console.log(
      '[Store] getFormattedHistoryForAPI called. Options:',
      options,
      'TestMode:',
      isCurrentSessionTestMode.value,
    )

    if (isCurrentSessionTestMode.value && testModeAssistantConfig.value) {
      console.log(
        '[Store] Formatting API history for TEST mode. Config:',
        testModeAssistantConfig.value.name,
      )
      const testConfig = testModeAssistantConfig.value
      if (testConfig.instructions && testConfig.instructions.trim()) {
        systemInstructions = testConfig.instructions.trim()
      }
      // CRITICAL CHANGE HERE: Use messagesForContext if provided for test mode
      if (messagesForContext && Array.isArray(messagesForContext)) {
        console.log(
          '[Store] Test mode: Using messagesForContext for history. Count:',
          messagesForContext.length,
        )
        messagesToProcess = excludeLast ? messagesForContext.slice(0, -1) : [...messagesForContext]
      } else {
        // This path should ideally not be taken if useMessageSender passes currentTestMessages
        console.warn(
          '[Store] Test mode: messagesForContext not provided or invalid. History will be empty for test mode.',
        )
        messagesToProcess = []
      }
    } else {
      // Normal mode (not test mode)
      console.log(
        '[Store] Formatting API history for NORMAL mode. ActiveSessionId:',
        activeSessionId.value,
      )
      // Use activeMessages from the store for normal sessions
      messagesToProcess = excludeLast
        ? activeMessages.value.slice(0, -1)
        : [...activeMessages.value]

      if (!isMainChatSession(activeSessionId.value)) {
        if (assistantsStore.isStoreInitialized) {
          const assistant = assistantsStore.getAssistantById(activeSessionId.value)
          if (assistant?.instructions?.trim()) {
            systemInstructions = assistant.instructions.trim()
          }
        } else {
          console.warn(
            '[Store - API History] Assistants store not ready for system prompt in normal mode.',
          )
        }
      }
    }

    if (systemInstructions) {
      formatted.push({ role: 'system', content: systemInstructions })
    }

    if (Array.isArray(messagesToProcess)) {
      messagesToProcess.forEach((msg) => {
        if (!msg || !msg.role || typeof msg.content === 'undefined' || msg.isLoading) {
          // console.log('[Store] Skipping message in getFormattedHistoryForAPI:', msg);
          return
        }
        // For API, content should be string. Image data is handled by useMessageSender creating multipart.
        let apiFormattedContent = ''
        if (typeof msg.content === 'string') {
          apiFormattedContent = msg.content.trim()
        } else if (Array.isArray(msg.content)) {
          // If content is an array (e.g. for multimodal later)
          const textPart = msg.content.find((p) => p.type === 'text')
          if (textPart && typeof textPart.text === 'string') {
            apiFormattedContent = textPart.text.trim()
          }
        }
        // Add placeholder for image if imagePreviewUrl exists (for context, actual image data sent differently)
        if (msg.imagePreviewUrl && msg.role === 'user') {
          const imagePlaceholder = '[User sent an image]'
          apiFormattedContent = apiFormattedContent
            ? `${imagePlaceholder}\n${apiFormattedContent}`
            : imagePlaceholder
        }

        if (['user', 'assistant'].includes(msg.role) && apiFormattedContent) {
          // System role already added
          formatted.push({ role: msg.role, content: apiFormattedContent })
        }
      })
    }
    console.log('[Store] Formatted history for API:', JSON.parse(JSON.stringify(formatted)))
    return formatted
  }

  function isMainChatSession(sessionId) {
    return sessionId === MAIN_CHAT_ID
  }

  initializeStore()

  return {
    activeSessionId,
    memories,
    isStoreInitialized,
    loadedMemoryId,
    isCurrentSessionTestMode,
    currentSessionMemoryId,
    testModeAssistantConfig,

    activeHistory,
    memoryListForDisplay,

    initializeStore,
    setActiveSession,
    addMessageToActiveSession,
    clearActiveChatView,
    saveActiveConversationToMemories,
    loadMemory,
    deleteMemory,
    deleteMultipleMemories,
    deleteAllMemories,
    toggleMemoryPin,
    renameMemory: manualRenameMemory,
    deleteMemoriesForSession,
    appendContentToMessage,
    updateMessageLoadingState,
    setTestModeAssistantConfig,
    clearTestModeAssistantConfig,

    getFormattedHistoryForAPI,
    isMainChatSession,
    MAIN_CHAT_ID,
  }
})
