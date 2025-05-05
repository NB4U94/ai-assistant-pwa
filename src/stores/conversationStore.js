// src/stores/conversationStore.js
// Removed '/* global process */' comment as 'process' is not used.
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
  const activeMessages = ref([]) // Holds message objects { messageId, role, content, timestamp, imagePreviewUrl, isLoading }
  const loadedMemoryId = ref(null)
  const currentSessionMemoryId = ref(null)
  const memories = ref([])
  const isStoreInitialized = ref(false)
  const isCurrentSessionTestMode = ref(false)

  // --- Internal Helper Functions ---
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
    // Initial checks - skip if test mode, not initialized, or no messages
    if (isCurrentSessionTestMode.value) {
      console.log('[Store - saveActive] Test mode active. Skipping save.')
      return null
    }
    if (!isStoreInitialized.value || !activeMessages.value || activeMessages.value.length === 0) {
      console.log('[Store - saveActive] Store not ready or no messages. Skipping save.')
      return null
    }

    // --- Settings Checks Added ---
    if (!settingsStore.saveConversationsGlobally) {
      console.log('[Store - saveActive] Global conversation saving is disabled. Skipping save.')
      return null
    }
    // --- FIX: Use .has() for Set instead of .includes() ---
    if (settingsStore.excludedAssistantIds.has(activeSessionId.value)) {
      console.log(
        `[Store - saveActive] Assistant (${activeSessionId.value}) is excluded from saving (using .has()). Skipping save.`,
      )
      return null
    }
    // --- End Settings Checks ---

    const now = Date.now()
    const messagesToSaveRaw = toRaw(activeMessages.value)
    let memoryToSave = null
    let existingMemoryIndex = -1
    let isNewMemory = false

    // Update loaded memory?
    if (loadedMemoryId.value) {
      existingMemoryIndex = memories.value.findIndex((mem) => mem.memoryId === loadedMemoryId.value)
      if (existingMemoryIndex !== -1) {
        memories.value[existingMemoryIndex].messages = messagesToSaveRaw
        memories.value[existingMemoryIndex].timestamp = now
        memoryToSave = toRaw(memories.value[existingMemoryIndex])
      } else {
        // If loaded memory ID is somehow invalid, clear it
        loadedMemoryId.value = null
        currentSessionMemoryId.value = null // Also clear this to force new memory creation
      }
    }

    // Update current session memory? (Only if not already handled by loadedMemoryId)
    if (!memoryToSave && currentSessionMemoryId.value) {
      existingMemoryIndex = memories.value.findIndex(
        (mem) => mem.memoryId === currentSessionMemoryId.value,
      )
      if (existingMemoryIndex !== -1) {
        memories.value[existingMemoryIndex].messages = messagesToSaveRaw
        memories.value[existingMemoryIndex].timestamp = now
        memoryToSave = toRaw(memories.value[existingMemoryIndex])
      } else {
        // If current session memory ID is somehow invalid, clear it
        currentSessionMemoryId.value = null
      }
    }

    // Create new memory? (Only if no existing memory was found/updated)
    if (!memoryToSave) {
      const newMemoryObject = createNewMemoryObject(messagesToSaveRaw, now)
      memories.value.push(newMemoryObject)
      currentSessionMemoryId.value = newMemoryObject.memoryId
      loadedMemoryId.value = null // Ensure loaded ID is cleared when starting new memory
      isNewMemory = true
      memoryToSave = toRaw(newMemoryObject)
    }

    // Perform Save
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
        return memoryToSave.memoryId // Return the ID of the saved/updated memory
      } catch (error) {
        console.error(
          `[Store - saveActive] ERROR saving memory ID: ${memoryToSave?.memoryId}. Error:`,
          error,
        )
        return null // Indicate save failure
      }
    } else {
      // This case should ideally not be reached if the logic above is correct
      console.error('[Store - saveActive] Logic error: memoryToSave is null after checks.')
      return null
    }
  }

  async function loadMemory(memoryId) {
    if (!memoryId) return
    if (!isStoreInitialized.value) await initializeStore()
    if (!isStoreInitialized.value) return // Check again after potential async init

    // Save current state *before* loading new one
    await saveActiveConversationToMemories() // Respects settings

    const memoryToLoad = memories.value.find((mem) => mem.memoryId === memoryId)
    if (memoryToLoad) {
      activeSessionId.value = memoryToLoad.sessionId
      // Ensure messages is an array before spreading
      activeMessages.value = Array.isArray(memoryToLoad.messages)
        ? [...toRaw(memoryToLoad.messages)]
        : []
      loadedMemoryId.value = memoryId
      currentSessionMemoryId.value = null // Loading a memory means it's not the 'current unsaved' one
      isCurrentSessionTestMode.value = false // Loading always exits test mode

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
      // Fallback to a clean main chat session if load fails
      await setActiveSession(MAIN_CHAT_ID)
    }
  }

  async function deleteMemory(memoryId) {
    const index = memories.value.findIndex((mem) => mem.memoryId === memoryId)
    if (index !== -1) {
      const name = memories.value[index].name || `ID: ${memoryId}`
      memories.value.splice(index, 1) // Remove from reactive list first
      console.log(`[Store] Removed memory "${name}" (${memoryId}) from reactive list.`)

      try {
        await deleteMemoryDB(memoryId) // Delete from IndexedDB
        console.log(`[Store] Deleted memory ${memoryId} from DB.`)
      } catch (error) {
        console.error(`[Store] ERROR deleting memory ${memoryId} from DB:`, error)
        // Consider re-adding to list or providing feedback if critical
        alert(`Failed to delete memory "${name}" from storage. It may reappear on refresh.`)
      }

      // Reset view if the deleted memory was active
      if (currentSessionMemoryId.value === memoryId) currentSessionMemoryId.value = null
      if (loadedMemoryId.value === memoryId) {
        await setActiveSession(MAIN_CHAT_ID) // Switch to main chat safely
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
    let clearCurrentSessionMemoryId = false

    // Filter out memories belonging to the session ID
    memories.value = memories.value.filter((mem) => {
      if (mem.sessionId === sessionId) {
        memoryIdsToDelete.push(mem.memoryId)
        // Check if the memory being deleted is currently active
        if (loadedMemoryId.value === mem.memoryId) resetActiveViewRequired = true
        if (currentSessionMemoryId.value === mem.memoryId) clearCurrentSessionMemoryId = true
        return false // Exclude this memory
      }
      return true // Keep this memory
    })

    // Reset state if needed
    if (clearCurrentSessionMemoryId) {
      currentSessionMemoryId.value = null
    }
    if (resetActiveViewRequired) {
      await setActiveSession(MAIN_CHAT_ID) // Safely reset to main chat
    }

    console.log(
      `[Store] Found ${memoryIdsToDelete.length} memories to delete for session ${sessionId}.`,
    )

    // Perform DB deletions
    if (memoryIdsToDelete.length > 0) {
      const deletePromises = memoryIdsToDelete.map((id) =>
        deleteMemoryDB(id).catch((e) => {
          console.error(`[Store] DB delete failed for memory ID ${id}:`, e)
          // Optionally track failures
        }),
      )
      try {
        const results = await Promise.allSettled(deletePromises)
        console.log(
          `[Store] DB deletion attempted for ${memoryIdsToDelete.length} memories. Results:`,
          results.map((r) => ({ id: r.status === 'fulfilled' ? 'Success' : 'Failed', ...r })), // Basic summary
        )
        // Handle potential failures if needed (e.g., notify user)
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
    let clearCurrentSessionId = false

    // Filter reactive list and identify state changes needed
    memories.value = memories.value.filter((mem) => {
      const shouldDelete = memoryIdsToDelete.includes(mem.memoryId)
      if (shouldDelete) {
        memoryIdsActuallyDeleted.push(mem.memoryId)
        if (loadedMemoryId.value === mem.memoryId) resetActiveView = true
        if (currentSessionMemoryId.value === mem.memoryId) clearCurrentSessionId = true
      }
      return !shouldDelete
    })

    // Update state if active memory was deleted
    if (clearCurrentSessionId) {
      currentSessionMemoryId.value = null
    }

    // Perform DB Deletions
    if (memoryIdsActuallyDeleted.length > 0) {
      const deletePromises = memoryIdsActuallyDeleted.map((id) =>
        deleteMemoryDB(id).catch((e) => {
          console.error(`[Store] DB delete failed for memory ID ${id}:`, e)
        }),
      )
      await Promise.allSettled(deletePromises)
      console.log(
        `[Store] Attempted IndexedDB deletion for ${memoryIdsActuallyDeleted.length} memories.`,
      )
    } else {
      console.log('[Store] No matching memories found in reactive list for deletion.')
    }

    // Reset view if necessary (after potential async deletions)
    if (resetActiveView) {
      await setActiveSession(MAIN_CHAT_ID)
    }
  }

  async function deleteAllMemories() {
    const count = memories.value.length
    if (count === 0) {
      console.log('[Store] No memories to delete.')
      return
    }

    memories.value = [] // Clear reactive list
    currentSessionMemoryId.value = null // Clear current session tracking
    await setActiveSession(MAIN_CHAT_ID) // Reset view to main chat

    console.log(`[Store] Cleared ${count} memories from reactive list. Now clearing DB...`)
    try {
      await clearMemoryStore() // Clear IndexedDB store
      console.log('[Store] Cleared IndexedDB memory store.')
    } catch (error) {
      console.error('[Store] ERROR clearing memory store:', error)
      alert('Failed to clear all memories from storage. Please try again.')
      // Consider attempting to reload memories here if critical
    }
  }

  async function setActiveSession(sessionId, isTest = false) {
    const trimmedId = sessionId ? sessionId.trim() : MAIN_CHAT_ID
    if (!trimmedId) {
      console.error('[Store] setActiveSession: Invalid sessionId provided.')
      return // Prevent setting invalid session
    }

    // Check if the target session is the same as the current one (and not loading a memory)
    // And test mode status is unchanged.
    if (
      activeSessionId.value === trimmedId &&
      loadedMemoryId.value === null && // Ensure we are not in a 'loaded memory' state
      isCurrentSessionTestMode.value === isTest
    ) {
      console.log(`[Store] Session ${trimmedId} is already active. No change needed.`)
      // Ensure assistant store is synced even if no state change happens here
      try {
        assistantsStore.selectAssistant(trimmedId === MAIN_CHAT_ID ? null : trimmedId)
      } catch (e) {
        console.error(`Error syncing assistant store on no-op setActiveSession:`, e)
      }
      return // No state change needed
    }

    // Save current session before switching, respecting settings
    if (!isCurrentSessionTestMode.value && activeMessages.value.length > 0) {
      console.log(
        `[Store] Saving session ${activeSessionId.value} before switching to ${trimmedId}...`,
      )
      // Use try-catch here as this save operation might fail
      try {
        await saveActiveConversationToMemories()
      } catch (saveError) {
        console.error(
          `[Store] FAILED to save session ${activeSessionId.value} before switching. Error:`,
          saveError,
        )
        // Decide if you want to proceed despite the save failure.
        // For now, we'll log the error and continue switching.
        // Alternatively, you could alert the user or return here.
      }
    }

    // Reset state for the new session
    activeSessionId.value = trimmedId
    activeMessages.value = []
    loadedMemoryId.value = null // New session always starts fresh, not loaded
    currentSessionMemoryId.value = null // Clear any previous unsaved session ID
    isCurrentSessionTestMode.value = isTest

    console.log(`[Store] Set active session to ${trimmedId}. Test mode: ${isTest}`)

    // Sync with assistant store
    try {
      assistantsStore.selectAssistant(trimmedId === MAIN_CHAT_ID ? null : trimmedId)
    } catch (e) {
      console.error(`Error calling assistantsStore.selectAssistant for ID ${trimmedId}:`, e)
    }
  }

  // --- MODIFIED: addMessageToActiveSession to handle isLoading ---
  async function addMessageToActiveSession(
    role,
    content,
    timestamp,
    imagePreviewUrl,
    messageId = null,
    isLoading = false, // Default is false
  ) {
    const hasTextContent = typeof content === 'string' && content.trim() !== ''
    const hasImage = !!imagePreviewUrl

    // Validate role
    if (!['user', 'assistant', 'system'].includes(role)) {
      console.warn(`[Store] Invalid role "${role}" for addMessageToActiveSession.`)
      return
    }
    // Allow adding an empty assistant message shell (for streaming), but not others
    if (!hasTextContent && !hasImage && role !== 'assistant') {
      console.warn(`[Store] Skipping empty non-assistant message (Role: ${role}).`)
      return
    }

    const newMessage = {
      messageId: messageId || generateUniqueId(role === 'user' ? 'msg' : 'asst'),
      role: role,
      content: content, // Keep original content structure
      timestamp: timestamp || Date.now(),
      imagePreviewUrl: imagePreviewUrl || null,
      isLoading: isLoading, // Store the loading state
    }

    activeMessages.value.push(newMessage)

    console.log(
      `[Store] Added ${role} message (ID: ${newMessage.messageId}, Loading: ${isLoading}) to session ${activeSessionId.value}. Total: ${activeMessages.value.length}`,
    )

    // Autosave logic - Triggered when a *complete* assistant message is added.
    // Saving after user message happens implicitly when assistant responds or session changes.
    // Saving for streaming messages happens in updateMessageLoadingState when isLoading becomes false.
    if (role === 'assistant' && !isLoading && !isCurrentSessionTestMode.value) {
      console.log('[Store] Complete assistant message added, triggering background save...')
      // Intentionally *not* awaiting this - it runs in background
      saveActiveConversationToMemories().catch((error) => {
        console.error('[Store] Background save failed after complete assistant message:', error)
      })
    } else if (isLoading) {
      // console.log('[Store] Assistant message shell added (isLoading=true), skipping immediate autosave.');
    } else if (isCurrentSessionTestMode.value) {
      // console.log('[Store] Message added in test mode, skipping autosave.');
    }
  }

  // --- NEW ACTION: appendContentToMessage ---
  function appendContentToMessage(messageId, textChunk) {
    if (!messageId || typeof textChunk !== 'string') {
      // Also check if textChunk is actually a string
      console.warn('[Store] appendContentToMessage called with invalid parameters.')
      return
    }
    const messageIndex = activeMessages.value.findIndex((m) => m.messageId === messageId)

    if (messageIndex !== -1) {
      const message = activeMessages.value[messageIndex]
      // Ensure content is treated as a string for appending
      if (typeof message.content !== 'string') {
        console.warn(
          `[Store] Trying to append chunk to non-string content for message ${messageId}. Coercing to string.`,
        )
        // Coerce potential null/undefined/other types, preserving existing if possible
        message.content = String(message.content || '') + textChunk
      } else {
        message.content += textChunk // Append normally
      }
    } else {
      console.warn(`[Store] Message ID ${messageId} not found for content append.`)
    }
  }

  // --- NEW ACTION: updateMessageLoadingState ---
  function updateMessageLoadingState(messageId, isLoading) {
    if (!messageId) return
    const messageIndex = activeMessages.value.findIndex((m) => m.messageId === messageId)

    if (messageIndex !== -1) {
      const message = activeMessages.value[messageIndex]
      const newState = !!isLoading // Ensure boolean
      // Only update and trigger save if the state actually changes
      if (message.isLoading !== newState) {
        message.isLoading = newState

        // Trigger autosave when loading finishes for an assistant message
        if (
          message.role === 'assistant' &&
          !newState && // i.e., isLoading is now false
          !isCurrentSessionTestMode.value
        ) {
          console.log(
            `[Store] Assistant message ${messageId} finished loading (isLoading=false), triggering background save...`,
          )
          // Intentionally *not* awaiting this
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
    console.log(
      '[Store - clearActiveChatView] Preparing to clear view. Saving current state first...',
    )
    // Save current state respecting settings, then clear
    saveActiveConversationToMemories().finally(() => {
      activeMessages.value = []
      loadedMemoryId.value = null
      currentSessionMemoryId.value = null
      // Keep the activeSessionId and isCurrentSessionTestMode as they are,
      // clearing only the messages and memory links.
      console.log('[Store] Cleared active chat view messages and memory links.')
    })
  }

  async function initializeStore() {
    if (isStoreInitialized.value) return
    console.log('[Store] Initializing conversation store...')
    try {
      const loaded = await getAllMemories()
      // Ensure loaded is an array and add default isPinned if missing
      memories.value = Array.isArray(loaded)
        ? loaded.map((mem) => ({ ...mem, isPinned: mem.isPinned || false }))
        : []
      console.log(`[Store] Loaded ${memories.value.length} memories from IndexedDB.`)
    } catch (error) {
      console.error('[Store] ERROR loading memories from IndexedDB:', error)
      memories.value = [] // Start with empty memories on error
      alert('Error loading previous conversations. Starting fresh.')
    } finally {
      // Reset active state regardless of load success/failure
      activeSessionId.value = MAIN_CHAT_ID
      activeMessages.value = []
      loadedMemoryId.value = null
      currentSessionMemoryId.value = null
      isCurrentSessionTestMode.value = false
      isStoreInitialized.value = true // Mark as initialized
      console.log('[Store] Conversation store initialization complete.')
      // Ensure assistant store reflects the initial main chat state
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
      memoryToUpdate.isPinned = !memoryToUpdate.isPinned // Toggle the status

      console.log(
        `[Store] Toggled pin for memory ${memoryId} to ${memoryToUpdate.isPinned}. Saving...`,
      )

      const plainMemory = toRaw(memoryToUpdate) // Get plain object for saving
      try {
        await saveMemory(plainMemory) // Save the updated memory to DB
        console.log(`[Store] Saved pin status for ${memoryId}.`)
      } catch (error) {
        // Revert the change in UI if save fails
        memoryToUpdate.isPinned = originalPinStatus
        console.error(`[Store] ERROR saving pin status for ${memoryId}:`, error)
        alert('Failed to update pin status in storage.')
      }
    } else {
      console.warn(`[Store] Memory ID ${memoryId} not found for pinning.`)
    }
  }

  async function manualRenameMemory(memoryId, newName) {
    // Use the existing updateMemoryName function, marking it as manual
    await updateMemoryName(memoryId, newName, true)
  }

  // --- Computed Properties & Getters ---
  const activeHistory = computed(() => activeMessages.value)

  const memoryListForDisplay = computed(() => {
    // Ensure dependencies are properly tracked
    const currentMemories = memories.value
    // Removed unused variable: const currentAssistants = assistantsStore.assistants

    const sortedMemories = [...currentMemories] // Create a shallow copy for sorting

    // Sort: Pinned first, then by timestamp descending
    sortedMemories.sort((a, b) => {
      const pinDiff = (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
      if (pinDiff !== 0) return pinDiff
      return (b.timestamp || 0) - (a.timestamp || 0) // Ensure timestamp exists
    })

    // Map to display format, fetching assistant details
    return sortedMemories.map((mem) => {
      let assistantName = 'Unknown / Deleted'
      let assistantImageUrl = null
      let assistantColor = null
      const isMain = isMainChatSession(mem.sessionId)

      try {
        if (isMain) {
          assistantName = 'Nb4U-Ai' // Default name for main chat
          // Optionally define default image/color for main chat if needed
        } else {
          // Ensure assistants are loaded before trying to get one
          if (assistantsStore.isStoreInitialized) {
            const assistant = assistantsStore.getAssistantById(mem.sessionId)
            if (assistant) {
              assistantName = assistant.name || 'Unnamed Assistant'
              assistantImageUrl = assistant.imageUrl || null
              assistantColor = assistant.color || null
            } else {
              // Assistant ID exists but no matching assistant found (deleted?)
              assistantName = `Deleted (${mem.sessionId.substring(0, 4)}...)`
            }
          } else {
            assistantName = 'Loading Assistants...' // Indicate assistants aren't ready yet
          }
        }
      } catch (e) {
        console.error(`Error fetching assistant details for session ${mem.sessionId}:`, e)
        if (isMain) assistantName = 'Nb4U-Ai' // Fallback for main chat on error
        // Keep default 'Unknown / Deleted' for others on error
      }

      return {
        id: mem.memoryId,
        name: mem.name || `Memory ${mem.memoryId.substring(0, 6)}...`, // Fallback name
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

  // getFormattedHistoryForAPI function - Formats messages for API calls
  const getFormattedHistoryForAPI = ({ excludeLast = false } = {}) => {
    // Ensure store is ready and messages exist
    if (!isStoreInitialized.value || !Array.isArray(activeMessages.value)) {
      console.warn('[Store - API History] Store not ready or messages not an array.')
      return []
    }

    const formatted = []
    const currentSessionId = activeSessionId.value

    // 1. Add System Prompt (if not main chat and assistant has instructions)
    if (!isMainChatSession(currentSessionId)) {
      try {
        // Check if assistants store is initialized
        if (assistantsStore.isStoreInitialized) {
          const assistant = assistantsStore.getAssistantById(currentSessionId)
          if (assistant?.instructions?.trim()) {
            formatted.push({ role: 'system', content: assistant.instructions.trim() })
          }
        } else {
          console.warn('[Store - API History] Assistants store not ready for system prompt.')
        }
      } catch (e) {
        console.error(
          `[Store - API History] Error getting assistant instructions for ${currentSessionId}:`,
          e,
        )
      }
    }

    // 2. Process Messages
    const messagesToProcess = excludeLast ? activeMessages.value.slice(0, -1) : activeMessages.value

    if (Array.isArray(messagesToProcess)) {
      messagesToProcess.forEach((msg) => {
        // Basic validation for message structure
        if (!msg || !msg.role || typeof msg.content === 'undefined' || msg.isLoading) {
          // Skip invalid, undefined content, or messages still loading
          return
        }

        let apiFormattedContent = null

        // Handle different content types (currently focusing on string and image placeholder)
        if (typeof msg.content === 'string') {
          apiFormattedContent = msg.content.trim()
        } else {
          // Placeholder for other potential content types if needed in future
          console.warn(
            `[Store - API History] Skipping non-string content for message ID ${msg.messageId}`,
          )
        }

        // Add image placeholder for user messages with images
        if (msg.imagePreviewUrl && msg.role === 'user') {
          const imagePlaceholder = '[User sent an image]' // Simple placeholder
          apiFormattedContent = apiFormattedContent
            ? `${imagePlaceholder}\n${apiFormattedContent}` // Prepend placeholder
            : imagePlaceholder // Use placeholder only if no text
        }

        // Add to formatted list if role is valid and content is not empty
        if (
          ['user', 'assistant', 'system'].includes(msg.role) &&
          apiFormattedContent !== null && // Ensure content was processed
          apiFormattedContent !== '' // Ensure content is not just whitespace
        ) {
          formatted.push({ role: msg.role, content: apiFormattedContent })
        }
      })
    } else {
      console.error('[Store - API History] messagesToProcess is not an array!')
    }

    // console.log('[Store - API History] Formatted history:', formatted); // Optional: Log for debugging
    return formatted
  }

  function isMainChatSession(sessionId) {
    return sessionId === MAIN_CHAT_ID
  }

  // --- Initialize & Return ---
  // Initialize store automatically when it's first used
  initializeStore()

  return {
    // State refs
    activeSessionId,
    memories, // The raw memories array
    isStoreInitialized,
    loadedMemoryId, // ID of the memory currently loaded in the view
    isCurrentSessionTestMode,
    currentSessionMemoryId, // ID of the *new* memory being built in the current session (if any)

    // Computed refs (Getters)
    activeHistory, // Reactive array of messages for the active view
    memoryListForDisplay, // Formatted and sorted list for UI

    // Actions
    initializeStore,
    setActiveSession, // Switches the active chat (main or assistant), saves previous state
    addMessageToActiveSession, // Adds a message to the active view
    clearActiveChatView, // Clears messages/memory links from active view, saves state first
    saveActiveConversationToMemories, // Saves the *current* activeMessages (respects settings)
    loadMemory, // Loads a specific memory into the active view, saves previous state first
    deleteMemory, // Deletes a single memory by ID
    deleteMultipleMemories, // Deletes multiple memories by ID array
    deleteAllMemories, // Deletes ALL memories
    toggleMemoryPin, // Toggles the pinned status of a memory
    renameMemory: manualRenameMemory, // Manually renames a memory
    deleteMemoriesForSession, // Deletes all memories associated with an assistant ID
    appendContentToMessage, // Appends text chunk to an existing message (for streaming)
    updateMessageLoadingState, // Updates isLoading flag on a message (triggers save on completion)

    // Helpers/Utilities exposed (if needed externally)
    getFormattedHistoryForAPI, // Gets message history formatted for API calls
    isMainChatSession, // Checks if a session ID is the main chat
    MAIN_CHAT_ID, // Expose the main chat ID constant
  }
}) // End defineStore
