// src/stores/conversationStore.js
import { defineStore } from 'pinia'
// Removed unused storeToRefs import
import { ref, computed, watch } from 'vue'
import { useAssistantsStore } from './assistantsStore'

export const useConversationStore = defineStore('conversation', () => {
  // --- Constants ---
  const SESSIONS_STORAGE_KEY = 'nb4u_ai_conversation_sessions'
  const ACTIVE_SESSION_ID_STORAGE_KEY = 'nb4u_ai_active_session_id' // Linter might falsely flag this
  const MAIN_CHAT_ID = 'main_chat'

  // --- Private Persistence Functions ---
  const saveSessionsToLocalStorage = () => {
    try {
      console.log(
        '[ConversationStore DEBUG] Saving sessions to localStorage. Keys:',
        Object.keys(sessions.value),
      )
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.value))
    } catch (error) {
      console.error('[ConversationStore] Error saving sessions:', error)
    }
  }

  const loadSessionsFromLocalStorage = () => {
    try {
      const storedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY) // Uses constant
      if (storedSessions) {
        const loadedData = JSON.parse(storedSessions)
        // Migration logic
        Object.keys(loadedData).forEach((id) => {
          if (!loadedData[id].name) {
            const assistant = assistantsStore.getAssistantById(id)
            loadedData[id].name =
              id === MAIN_CHAT_ID
                ? 'Main Chat'
                : assistant
                  ? assistant.name
                  : `Chat ${id.substring(0, 6)}`
          }
          if (!loadedData[id].createdAt) {
            loadedData[id].createdAt = loadedData[id].history?.[0]?.timestamp || Date.now()
          }
          if (!loadedData[id].lastUpdatedAt) {
            const history = loadedData[id].history || []
            loadedData[id].lastUpdatedAt =
              history[history.length - 1]?.timestamp || loadedData[id].createdAt
          }
          if (!loadedData[id].history) loadedData[id].history = []
          if (loadedData[id].systemInstructions === undefined)
            loadedData[id].systemInstructions = null
        })
        sessions.value = loadedData
        console.log('[ConversationStore] Sessions loaded & potentially migrated.')
      } else {
        initializeDefaultSession() // Uses helper
        console.log('[ConversationStore] No stored sessions found, initialized default.')
      }
    } catch (error) {
      console.error('[ConversationStore] Error loading/parsing sessions:', error)
      sessions.value = {}
      initializeDefaultSession() // Uses helper
    }
  }

  const saveActiveSessionIdToLocalStorage = () => {
    try {
      if (activeSessionId.value) {
        localStorage.setItem(ACTIVE_SESSION_ID_STORAGE_KEY, activeSessionId.value)
      } // Uses constant
      else {
        localStorage.removeItem(ACTIVE_SESSION_ID_STORAGE_KEY)
      } // Uses constant
    } catch (error) {
      console.error('[ConversationStore] Error saving active session ID:', error)
    }
  }

  const loadActiveSessionIdFromLocalStorage = () => {
    try {
      const storedId = localStorage.getItem(ACTIVE_SESSION_ID_STORAGE_KEY) // Uses constant
      if (storedId && sessions.value[storedId]) {
        activeSessionId.value = storedId
        console.log(`[ConversationStore] Active session ID loaded: ${activeSessionId.value}`)
      } else {
        console.warn(
          `[ConversationStore] Stored session ID "${storedId}" not found or invalid. Defaulting.`,
        )
        activeSessionId.value = MAIN_CHAT_ID
        ensureSessionExists(MAIN_CHAT_ID)
        saveActiveSessionIdToLocalStorage()
      }
    } catch (error) {
      console.error('[ConversationStore] Error loading active session ID:', error)
      activeSessionId.value = MAIN_CHAT_ID
      ensureSessionExists(MAIN_CHAT_ID)
    }
  }

  // --- Initialize Assistants Store ---
  const assistantsStore = useAssistantsStore()

  // --- State ---
  const sessions = ref({})
  const activeSessionId = ref(null)

  // --- Helper to initialize the default session ---
  // Linter might falsely flag this as unused, but it IS used in loadSessionsFromLocalStorage
  function initializeDefaultSession() {
    if (!sessions.value[MAIN_CHAT_ID]) {
      ensureSessionExists(MAIN_CHAT_ID)
    }
  }

  // --- Actions Defined Before Load ---
  // Define ensureSessionExists before load functions use it
  function ensureSessionExists(sessionId) {
    const exists = !!sessions.value[sessionId]
    if (!exists) {
      const now = Date.now()
      let sessionName = `Chat ${sessionId.substring(0, 6)}`
      if (sessionId === MAIN_CHAT_ID) {
        sessionName = 'Main Chat'
      } else {
        try {
          const assistant = assistantsStore.getAssistantById(sessionId)
          if (assistant) {
            sessionName = assistant.name
          }
        } catch (e) {
          console.error(`[ConversationStore] Error getting assistant name for ID ${sessionId}:`, e)
        }
      }
      sessions.value[sessionId] = {
        name: sessionName,
        createdAt: now,
        lastUpdatedAt: now,
        history: [],
        systemInstructions: null,
      }
      console.log(
        `[ConversationStore] Created new session: ${sessionId} with name "${sessionName}"`,
      )
    }
  }

  // --- Load Initial State ---
  loadSessionsFromLocalStorage()
  loadActiveSessionIdFromLocalStorage()

  // --- Watchers ---
  watch(sessions, saveSessionsToLocalStorage, { deep: true })
  watch(activeSessionId, saveActiveSessionIdToLocalStorage)

  // --- Computed Getters (with implementation) ---
  const activeSession = computed(() => {
    return activeSessionId.value ? sessions.value[activeSessionId.value] : null
  })

  const activeHistory = computed(() => {
    return activeSession.value ? activeSession.value.history : []
  })

  const activeSystemInstructions = computed(() => {
    return activeSession.value ? activeSession.value.systemInstructions : null
  })

  const getSessionListForDisplay = computed(() => {
    // Removed unused sessionKeys variable
    const list = Object.entries(sessions.value)
      .map(([id, sessionData]) => ({
        id: id,
        name: sessionData.name || `Chat ${id.substring(0, 6)}`,
        createdAt: sessionData.createdAt || 0,
        lastUpdatedAt: sessionData.lastUpdatedAt || 0,
        messageCount: sessionData.history?.length || 0,
      }))
      .sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt)
    return list
  })

  // --- Getter Functions (with implementation) ---
  const getFormattedHistoryForAPI = () => {
    const formatted = []
    const session = activeSession.value
    if (!session) return formatted
    if (session.systemInstructions && session.systemInstructions.trim() !== '') {
      formatted.push({ role: 'system', content: session.systemInstructions.trim() })
    }
    session.history.forEach((msg) => {
      // Simplified: Assuming history content is always string for API
      if (msg.role && typeof msg.content === 'string') {
        formatted.push({ role: msg.role, content: msg.content })
      }
    })
    return formatted
  }

  // --- Actions (with implementation) ---
  function setActiveSession(sessionId) {
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      console.error('[ConversationStore] Invalid sessionId provided.')
      return
    }
    const trimmedId = sessionId.trim()
    ensureSessionExists(trimmedId) // Ensure it exists before setting active
    if (activeSessionId.value !== trimmedId) {
      activeSessionId.value = trimmedId
      console.log(`[ConversationStore] Active session set to: ${activeSessionId.value}`)
    }
  }

  function addMessageToActiveSession(role, content, timestamp, imagePreviewUrl) {
    if (!activeSessionId.value || !sessions.value[activeSessionId.value]) {
      console.error('[ConversationStore] Cannot add message, no valid active session found.')
      return
    }
    const hasTextContent = typeof content === 'string' && content.trim() !== ''
    const hasImage = !!imagePreviewUrl
    if (!hasTextContent && !hasImage) {
      console.warn('[ConversationStore] Attempted to add message with NO text and NO image.')
      return
    }
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[ConversationStore] Invalid role "${role}" provided.`)
      return
    }
    const messageTimestamp = timestamp || Date.now()
    const newMessage = {
      role: role,
      content: content.trim(),
      timestamp: messageTimestamp,
      imagePreviewUrl: imagePreviewUrl || null,
    }
    sessions.value[activeSessionId.value].history.push(newMessage)
    sessions.value[activeSessionId.value].lastUpdatedAt = messageTimestamp
  }

  function setSystemInstructionsForActiveSession(instructions) {
    if (!activeSessionId.value || !sessions.value[activeSessionId.value]) {
      console.error('[ConversationStore] Cannot set system instructions, no valid active session.')
      return
    }
    const newInstructions = instructions ? instructions.trim() : null
    if (sessions.value[activeSessionId.value].systemInstructions !== newInstructions) {
      sessions.value[activeSessionId.value].systemInstructions = newInstructions
      sessions.value[activeSessionId.value].lastUpdatedAt = Date.now()
      console.log(
        `[ConversationStore] System instructions updated for session: ${activeSessionId.value}`,
      )
    }
  }

  function clearActiveConversation() {
    if (!activeSessionId.value || !sessions.value[activeSessionId.value]) {
      console.warn('[ConversationStore] Cannot clear conversation, no active session.')
      return
    }
    const idToClear = activeSessionId.value
    console.log(
      `[ConversationStore DEBUG] Clearing history for session: ${idToClear}. Session exists?`,
      !!sessions.value[idToClear],
    )
    console.log(
      `[ConversationStore DEBUG] Session keys BEFORE clear: [${Object.keys(sessions.value).join(', ')}]`,
    )
    sessions.value[idToClear].history = []
    sessions.value[idToClear].lastUpdatedAt = Date.now()
    console.log(
      `[ConversationStore DEBUG] Cleared history for session: ${idToClear}. History length now: ${sessions.value[idToClear]?.history?.length}`,
    )
    console.log(
      `[ConversationStore DEBUG] Session keys AFTER clear: [${Object.keys(sessions.value).join(', ')}]`,
    )
  }

  function deleteSession(sessionId) {
    if (!sessionId || sessionId === MAIN_CHAT_ID) {
      console.warn(
        `[ConversationStore] Cannot delete main chat session or invalid ID: ${sessionId}`,
      )
      return
    }
    if (sessions.value[sessionId]) {
      const wasActive = activeSessionId.value === sessionId
      delete sessions.value[sessionId]
      console.log(`[ConversationStore] Deleted session: ${sessionId}`)
      if (wasActive) {
        setActiveSession(MAIN_CHAT_ID)
      }
    } else {
      console.warn(`[ConversationStore] Session ID "${sessionId}" not found for deletion.`)
    }
  }

  function createNewSession() {
    const newId = `chat-${Date.now()}`
    console.log(
      `[ConversationStore DEBUG] createNewSession called. Attempting to create ID: ${newId}`,
    )
    ensureSessionExists(newId)
    setActiveSession(newId)
    console.log(`[ConversationStore] Started new session: ${newId}`)
    return newId
  }

  // --- Return state, getters, and actions ---
  return {
    // State
    sessions,
    activeSessionId,
    // Computed Getters
    activeSession,
    activeHistory,
    activeSystemInstructions,
    getSessionListForDisplay,
    // Getter Functions
    getFormattedHistoryForAPI, // Ensured this is returned
    // Actions
    setActiveSession,
    addMessageToActiveSession,
    setSystemInstructionsForActiveSession,
    clearActiveConversation,
    deleteSession,
    createNewSession,
  }
})
