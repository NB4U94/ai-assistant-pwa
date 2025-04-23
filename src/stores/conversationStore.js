// src/stores/conversationStore.js
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAssistantsStore } from './assistantsStore'

export const useConversationStore = defineStore('conversation', () => {
  // --- Constants ---
  const SESSIONS_STORAGE_KEY = 'nb4u_ai_conversation_sessions'
  const ACTIVE_SESSION_ID_STORAGE_KEY = 'nb4u_ai_active_session_id'
  const MAIN_CHAT_ID = 'main_chat'

  // --- Private Persistence Functions ---
  const saveSessionsToLocalStorage = () => {
    try {
      console.log('[DEBUG] Saving sessions to localStorage...')
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.value))
      console.log('[DEBUG] Sessions saved.')
    } catch (error) {
      console.error('[ConversationStore] Error saving sessions:', error)
    }
  }

  const loadSessionsFromLocalStorage = () => {
    try {
      console.log('[DEBUG] Attempting to load sessions from localStorage...')
      const storedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY)
      if (storedSessions) {
        const loadedData = JSON.parse(storedSessions)
        console.log('[DEBUG] Raw sessions loaded from localStorage:', loadedData)

        // Basic validation and migration logic (unchanged)
        Object.keys(loadedData).forEach((id) => {
          if (!loadedData[id]) {
            console.warn(
              `[ConversationStore] Invalid data found for session ID ${id} during load. Skipping.`,
            )
            delete loadedData[id]
            return
          }
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
          if (!Array.isArray(loadedData[id].history)) loadedData[id].history = []
          if (loadedData[id].systemInstructions === undefined)
            loadedData[id].systemInstructions = null
        })
        sessions.value = loadedData
        console.log('[ConversationStore] Sessions loaded & potentially migrated.')
      } else {
        console.log('[DEBUG] No sessions found in localStorage.')
        initializeDefaultSession()
        console.log('[ConversationStore] No stored sessions found, initialized default.')
      }
    } catch (error) {
      console.error('[ConversationStore] Error loading/parsing sessions:', error)
      sessions.value = {}
      initializeDefaultSession()
    }
  }

  const saveActiveSessionIdToLocalStorage = () => {
    try {
      if (activeSessionId.value) {
        localStorage.setItem(ACTIVE_SESSION_ID_STORAGE_KEY, activeSessionId.value)
      } else {
        localStorage.removeItem(ACTIVE_SESSION_ID_STORAGE_KEY)
      }
    } catch (error) {
      console.error('[ConversationStore] Error saving active session ID:', error)
    }
  }

  const loadActiveSessionIdFromLocalStorage = () => {
    try {
      console.log('[DEBUG] Setting active session ID to default...')
      activeSessionId.value = MAIN_CHAT_ID
      console.log(`[ConversationStore] Forcing active session to default: ${activeSessionId.value}`)
      ensureSessionExists(MAIN_CHAT_ID)
      saveActiveSessionIdToLocalStorage()
      console.log('[DEBUG] Default active session ID set and saved.')
    } catch (error) {
      console.error('[ConversationStore] Error setting default active session ID:', error)
      activeSessionId.value = MAIN_CHAT_ID
      try {
        ensureSessionExists(MAIN_CHAT_ID)
      } catch (ensureError) {
        console.error(
          '[ConversationStore] CRITICAL: Failed to ensure main chat session exists after error:',
          ensureError,
        )
        sessions.value = {}
        sessions.value[MAIN_CHAT_ID] = {
          name: 'Main Chat',
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
          history: [],
          systemInstructions: null,
        }
      }
    }
  }

  // --- Initialize Assistants Store ---
  const assistantsStore = useAssistantsStore()

  // --- State ---
  const sessions = ref({})
  const activeSessionId = ref(null)

  // --- Helper Functions (Defined Before Use) ---
  function ensureSessionExists(sessionId) {
    // (Function body unchanged)
    if (!sessionId || typeof sessionId !== 'string') {
      console.error('[ConversationStore] ensureSessionExists called with invalid ID:', sessionId)
      return
    }
    const exists = !!sessions.value[sessionId]
    if (!exists) {
      const now = Date.now()
      let sessionName = `Chat ${sessionId.substring(0, 6)}`
      let systemPrompt = null
      if (sessionId === MAIN_CHAT_ID) {
        sessionName = 'Main Chat'
      } else {
        try {
          const assistant = assistantsStore.getAssistantById(sessionId)
          if (assistant) {
            sessionName = assistant.name
            systemPrompt = assistant.instructions || null
          }
        } catch (e) {
          console.error(
            `[ConversationStore] Error getting assistant details for ID ${sessionId}:`,
            e,
          )
        }
      }
      sessions.value[sessionId] = {
        name: sessionName,
        createdAt: now,
        lastUpdatedAt: now,
        history: [],
        systemInstructions: systemPrompt,
      }
      console.log(
        `[ConversationStore] Created new session structure: ${sessionId} with name "${sessionName}"`,
      )
    }
  }

  function initializeDefaultSession() {
    if (!sessions.value[MAIN_CHAT_ID]) {
      console.log('[DEBUG] Initializing default session structure...')
      ensureSessionExists(MAIN_CHAT_ID)
    }
  }

  // --- Actions (Defined Before Load/Initialization Call) ---
  function setActiveSession(sessionId) {
    // (Function body unchanged)
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      console.error('[ConversationStore] setActiveSession: Invalid sessionId provided.')
      return
    }
    const trimmedId = sessionId.trim()
    ensureSessionExists(trimmedId)
    if (activeSessionId.value !== trimmedId) {
      activeSessionId.value = trimmedId
      console.log(`[ConversationStore] Active session set to: ${activeSessionId.value}`)
    }
  }

  function clearActiveConversation() {
    // (Function body unchanged - it correctly clears the active session's history)
    console.log('[DEBUG] Attempting to clear active conversation...')
    if (!activeSessionId.value || !sessions.value[activeSessionId.value]) {
      console.warn(
        '[ConversationStore] Cannot clear conversation, no active session or session data.',
      )
      return
    }
    const idToClear = activeSessionId.value
    console.log(`[DEBUG] ID to clear: ${idToClear}`)
    if (sessions.value[idToClear] && Array.isArray(sessions.value[idToClear].history)) {
      sessions.value[idToClear].history = []
      sessions.value[idToClear].lastUpdatedAt = Date.now()
      console.log(
        `[ConversationStore] Cleared history for session: ${idToClear}. History length now: ${sessions.value[idToClear]?.history?.length}`,
      )
    } else {
      console.warn(
        `[ConversationStore] Could not clear history for ${idToClear}. Session or history array missing?`,
        sessions.value[idToClear],
      )
    }
  }

  // ... other actions (addMessageToActiveSession, setSystemInstructionsForActiveSession, deleteSession, createNewSession) unchanged ...
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
      console.error(
        `[ConversationStore] Invalid role "${role}" provided. Only 'user' or 'assistant' allowed.`,
      )
      return
    }
    const messageTimestamp = timestamp || Date.now()
    const newMessage = {
      role: role,
      content: typeof content === 'string' ? content.trim() : content,
      timestamp: messageTimestamp,
      imagePreviewUrl: imagePreviewUrl || null,
    }
    if (!Array.isArray(sessions.value[activeSessionId.value].history)) {
      sessions.value[activeSessionId.value].history = []
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

  function deleteSession(sessionId) {
    if (!sessionId || sessionId === MAIN_CHAT_ID) {
      console.warn(
        `[ConversationStore] Cannot delete main chat session or invalid ID provided: ${sessionId}`,
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
    const newId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    console.log(`[ConversationStore] createNewSession called. Attempting to create ID: ${newId}`)
    ensureSessionExists(newId)
    setActiveSession(newId)
    console.log(`[ConversationStore] Started new session: ${newId}`)
    return newId
  }

  // --- Load Initial State (Without Clearing Main Chat) ---
  console.log('[DEBUG] Store Initialization: Starting initial load...')
  // 1. Load all saved session data
  loadSessionsFromLocalStorage()
  // 2. Set the active session ID (now always defaults to main_chat)
  loadActiveSessionIdFromLocalStorage()
  // 3. *** REMOVED: clearActiveConversation(); ***

  console.log(
    '[DEBUG] Store Initialization: Load complete. Active session defaulted to main_chat. History NOT cleared.',
  ) // Updated log

  // --- Watchers (for Persistence) ---
  console.log('[DEBUG] Setting up watchers...')
  watch(sessions, saveSessionsToLocalStorage, { deep: true })
  watch(activeSessionId, saveActiveSessionIdToLocalStorage)
  console.log('[DEBUG] Watchers set up.')

  // --- Computed Getters ---
  const activeSession = computed(() => {
    return activeSessionId.value ? sessions.value[activeSessionId.value] : null
  })
  const activeHistory = computed(() => {
    return activeSession.value?.history ?? []
  })
  const activeSystemInstructions = computed(() => {
    return activeSession.value?.systemInstructions ?? null
  })
  const getSessionListForDisplay = computed(() => {
    return Object.entries(sessions.value)
      .map(([id, sessionData]) => ({
        id: id,
        name: sessionData.name || `Chat ${id.substring(0, 6)}`,
        createdAt: sessionData.createdAt || 0,
        lastUpdatedAt: sessionData.lastUpdatedAt || 0,
        messageCount: sessionData.history?.length || 0,
      }))
      .sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt)
  })

  // --- Getter Functions ---
  const getFormattedHistoryForAPI = () => {
    // (Function body unchanged)
    const formatted = []
    const session = activeSession.value
    if (!session) return formatted
    if (session.systemInstructions && session.systemInstructions.trim() !== '') {
      formatted.push({ role: 'system', content: session.systemInstructions.trim() })
    }
    if (Array.isArray(session.history)) {
      session.history.forEach((msg) => {
        if (msg.role && msg.content !== undefined && msg.content !== null) {
          if (typeof msg.content === 'string') {
            formatted.push({ role: msg.role, content: msg.content })
          } else if (Array.isArray(msg.content)) {
            formatted.push({ role: msg.role, content: msg.content })
          } else {
            console.warn(
              '[ConversationStore] Skipping message with unexpected content format in getFormattedHistoryForAPI:',
              msg,
            )
          }
        } else {
          console.warn(
            '[ConversationStore] Skipping message with missing role/content in getFormattedHistoryForAPI:',
            msg,
          )
        }
      })
    }
    return formatted
  }

  // --- Return state, getters, and actions ---
  console.log('[DEBUG] Conversation store setup complete.')
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
    getFormattedHistoryForAPI,
    // Actions
    setActiveSession,
    addMessageToActiveSession,
    setSystemInstructionsForActiveSession,
    clearActiveConversation, // Keep the action available for manual use
    deleteSession,
    createNewSession,
  }
})
