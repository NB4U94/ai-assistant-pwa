// src/stores/conversationStore.js
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

// Using setup store syntax
export const useConversationStore = defineStore('conversation', () => {
  // --- Constants for localStorage Keys ---
  const SESSIONS_STORAGE_KEY = 'nb4u_ai_conversation_sessions'
  const ACTIVE_SESSION_ID_STORAGE_KEY = 'nb4u_ai_active_session_id'

  // --- Private Persistence Functions ---
  const saveSessionsToLocalStorage = () => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.value))
      // console.log('[ConversationStore] Sessions saved to localStorage.');
    } catch (error) {
      console.error('[ConversationStore] Error saving sessions to localStorage:', error)
    }
  }

  const loadSessionsFromLocalStorage = () => {
    try {
      const storedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY)
      if (storedSessions) {
        sessions.value = JSON.parse(storedSessions)
        console.log('[ConversationStore] Sessions loaded from localStorage.')
      } else {
        ensureSessionExists('main_chat')
        console.log('[ConversationStore] No stored sessions found, initialized main_chat.')
      }
    } catch (error) {
      console.error('[ConversationStore] Error loading sessions from localStorage:', error)
      sessions.value = {}
      ensureSessionExists('main_chat')
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
      console.error('[ConversationStore] Error saving active session ID to localStorage:', error)
    }
  }

  const loadActiveSessionIdFromLocalStorage = () => {
    try {
      const storedId = localStorage.getItem(ACTIVE_SESSION_ID_STORAGE_KEY)
      if (storedId && sessions.value[storedId]) {
        activeSessionId.value = storedId
        console.log(`[ConversationStore] Active session ID loaded: ${activeSessionId.value}`)
      } else {
        activeSessionId.value = 'main_chat'
        ensureSessionExists('main_chat')
        saveActiveSessionIdToLocalStorage()
        console.log(
          '[ConversationStore] No valid active session ID found, defaulting to main_chat.',
        )
      }
    } catch (error) {
      console.error('[ConversationStore] Error loading active session ID from localStorage:', error)
      activeSessionId.value = 'main_chat'
      ensureSessionExists('main_chat')
    }
  }

  // --- State ---
  const sessions = ref({}) // Key: sessionId, Value: { history: Array, systemInstructions: string | null }
  const activeSessionId = ref(null)

  // --- Load Initial State ---
  loadSessionsFromLocalStorage()
  loadActiveSessionIdFromLocalStorage()

  // --- Watch for changes and persist automatically ---
  watch(sessions, saveSessionsToLocalStorage, { deep: true })
  watch(activeSessionId, saveActiveSessionIdToLocalStorage)

  // --- Getters ---
  const activeSession = computed(() => {
    return activeSessionId.value ? sessions.value[activeSessionId.value] : null
  })

  const activeHistory = computed(() => {
    // Ensure reactivity by accessing .value here if needed, or rely on Pinia's magic
    return activeSession.value ? activeSession.value.history : []
  })

  const activeSystemInstructions = computed(() => {
    return activeSession.value ? activeSession.value.systemInstructions : null
  })

  const getAllSessionIds = computed(() => {
    return Object.keys(sessions.value)
  })

  // --- Getter Functions ---
  // Prepares history in standard OpenAI format {role, content}
  // Includes system prompt if available.
  const getFormattedHistoryForAPI = () => {
    const formatted = []
    const session = activeSession.value
    if (!session) return formatted

    // Add system instructions if they exist
    if (session.systemInstructions && session.systemInstructions.trim() !== '') {
      formatted.push({ role: 'system', content: session.systemInstructions.trim() })
    }

    // Add history messages (already should be in {role, content} format now)
    // We also need imagePreviewUrl if sending to vision model *again*, but ChatView handles adding the *current* image.
    // Decide if past image URLs need to be sent to the API. For now, assume just text content is needed for history.
    session.history.forEach((msg) => {
      // Basic check to ensure message has role and content before adding
      if (msg.role && typeof msg.content === 'string') {
        // Only sending text content of history for now
        formatted.push({ role: msg.role, content: msg.content })
      }
      // NOTE: If you need to send historical images to the API, you'd need
      // to reconstruct the complex content array here based on msg.content and msg.imagePreviewUrl
    })

    return formatted
  }

  // Simple getter for the raw history array (used by ChatView display)
  const getChatDisplayHistory = () => {
    return activeHistory.value // Directly return the reactive history
  }

  // --- Actions ---

  function ensureSessionExists(sessionId) {
    if (!sessions.value[sessionId]) {
      sessions.value[sessionId] = {
        history: [],
        systemInstructions: null,
      }
      console.log(`[ConversationStore] Created new session: ${sessionId}`)
    }
  }

  function setActiveSession(sessionId) {
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      console.error('[ConversationStore] Invalid sessionId provided.')
      return
    }
    const trimmedId = sessionId.trim()
    ensureSessionExists(trimmedId)
    activeSessionId.value = trimmedId
    console.log(`[ConversationStore] Active session set to: ${activeSessionId.value}`)
  }

  // --- *** MODIFIED Action *** ---
  function addMessageToActiveSession(role, content, timestamp, imagePreviewUrl) {
    if (!activeSessionId.value) {
      console.error('[ConversationStore] Cannot add message, no active session set.')
      return
    }
    ensureSessionExists(activeSessionId.value) // Ensure session object exists

    // --- FIX 1: Modify Validity Check ---
    const hasTextContent = typeof content === 'string' && content.trim() !== ''
    const hasImage = !!imagePreviewUrl // Check if URL is truthy

    // Only reject if BOTH text and image are missing
    if (!hasTextContent && !hasImage) {
      console.warn('[ConversationStore] Attempted to add message with NO text and NO image.')
      return // Stop execution for truly empty messages
    }
    // --- End FIX 1 ---

    if (role !== 'user' && role !== 'assistant') {
      console.error(`[ConversationStore] Invalid role "${role}" provided.`)
      return
    }

    // --- FIX 2 & 3: Include timestamp and imagePreviewUrl in the saved object ---
    const newMessage = {
      role: role,
      content: content.trim(), // Save the actual text content (trimmed or empty)
      timestamp: timestamp || Date.now(), // Use provided timestamp or default
      imagePreviewUrl: imagePreviewUrl || null, // Save the URL or null
    }

    // Push the complete message object
    sessions.value[activeSessionId.value].history.push(newMessage)
    // Watcher saves this change automatically due to deep watch on `sessions`

    console.log(
      `[ConversationStore] Added ${role} message to session ${activeSessionId.value}:`,
      newMessage,
    ) // Log the added message object
  }
  // --- *** END MODIFIED Action *** ---

  function setSystemInstructionsForActiveSession(instructions) {
    if (!activeSessionId.value) {
      console.error('[ConversationStore] Cannot set system instructions, no active session.')
      return
    }
    ensureSessionExists(activeSessionId.value)
    sessions.value[activeSessionId.value].systemInstructions = instructions
      ? instructions.trim()
      : null
    console.log(`[ConversationStore] System instructions set for session: ${activeSessionId.value}`)
  }

  function clearActiveConversation() {
    if (!activeSessionId.value) {
      console.warn('[ConversationStore] Cannot clear conversation, no active session.')
      return
    }
    if (sessions.value[activeSessionId.value]) {
      sessions.value[activeSessionId.value].history = []
      console.log(`[ConversationStore] Cleared history for session: ${activeSessionId.value}`)
    }
  }

  function deleteSession(sessionId) {
    if (sessions.value[sessionId]) {
      const wasActive = activeSessionId.value === sessionId
      delete sessions.value[sessionId]
      if (wasActive) {
        setActiveSession('main_chat')
      }
      console.log(`[ConversationStore] Deleted session: ${sessionId}`)
    } else {
      console.warn(`[ConversationStore] Session ID "${sessionId}" not found for deletion.`)
    }
  }

  // Return state, getters, and actions
  return {
    // State
    sessions,
    activeSessionId,
    // Computed Getters
    activeSession,
    activeHistory,
    activeSystemInstructions,
    getAllSessionIds,
    // Getter Functions
    getFormattedHistoryForAPI,
    getChatDisplayHistory, // You might not need this if activeHistory is used directly
    // Actions
    setActiveSession,
    addMessageToActiveSession,
    setSystemInstructionsForActiveSession,
    clearActiveConversation,
    deleteSession,
  }
})
