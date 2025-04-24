// src/stores/conversationStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAssistantsStore } from './assistantsStore'

// Helper to generate simple unique IDs
function generateUniqueId(prefix = 'mem') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export const useConversationStore = defineStore('conversation', () => {
  // --- Constants ---
  const MEMORIES_STORAGE_KEY = 'nb4u_ai_memories'
  const MAIN_CHAT_ID = 'main_chat'

  // --- Initialize Assistants Store ---
  const assistantsStore = useAssistantsStore()

  // --- State ---
  const activeSessionId = ref(MAIN_CHAT_ID)
  const activeMessages = ref([])
  const loadedMemoryId = ref(null)
  const memories = ref([])

  // --- Private Persistence Functions ---
  const saveMemoriesToLocalStorage = () => {
    try {
      localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(memories.value))
      // console.log('[ConversationStore] Memories saved to localStorage.') // Optional: Reduce noise
    } catch (error) {
      console.error('[ConversationStore] Error saving memories:', error)
    }
  }

  const loadMemoriesFromLocalStorage = () => {
    try {
      const storedMemories = localStorage.getItem(MEMORIES_STORAGE_KEY)
      if (storedMemories) {
        const loadedData = JSON.parse(storedMemories)
        if (Array.isArray(loadedData)) {
          memories.value = loadedData.map((mem) => ({
            memoryId: mem.memoryId || generateUniqueId(),
            sessionId: mem.sessionId || MAIN_CHAT_ID,
            timestamp: mem.timestamp || Date.now(),
            name: mem.name || `Memory ${new Date(mem.timestamp || Date.now()).toLocaleString()}`,
            messages: Array.isArray(mem.messages) ? mem.messages : [],
          }))
          console.log(`[ConversationStore] ${memories.value.length} memories loaded.`)
        } else {
          console.warn('[ConversationStore] Invalid memories format. Initializing empty.')
          memories.value = []
        }
      } else {
        memories.value = []
        console.log('[ConversationStore] No stored memories found.')
      }
    } catch (error) {
      console.error('[ConversationStore] Error loading/parsing memories:', error)
      memories.value = []
    }
  }

  // --- Actions ---

  function saveActiveConversationToMemories() {
    if (!activeMessages.value || activeMessages.value.length === 0) {
      // console.log('[ConversationStore] No active messages to save.') // Optional: Reduce noise
      return
    }
    const now = Date.now()
    const messagesToSave = activeMessages.value.slice()

    if (loadedMemoryId.value) {
      const index = memories.value.findIndex((mem) => mem.memoryId === loadedMemoryId.value)
      if (index !== -1) {
        memories.value[index].messages = messagesToSave
        memories.value[index].timestamp = now
        console.log(`[ConversationStore] Updated memory: ${loadedMemoryId.value}`)
      } else {
        console.warn(
          `[ConversationStore] Loaded memory ID ${loadedMemoryId.value} not found. Saving as new.`,
        )
        createNewMemory(messagesToSave, now)
        loadedMemoryId.value = null
      }
    } else {
      createNewMemory(messagesToSave, now)
    }
    saveMemoriesToLocalStorage()
  }

  function createNewMemory(messages, timestamp) {
    const currentSessionId = activeSessionId.value
    let defaultName = `Chat (${currentSessionId}) ${new Date(timestamp).toLocaleString()}`
    if (messages.length > 0 && typeof messages[0].content === 'string') {
      defaultName = messages[0].content.substring(0, 30) + '...'
    } else if (currentSessionId !== MAIN_CHAT_ID) {
      try {
        const assistant = assistantsStore.getAssistantById(currentSessionId)
        if (assistant) defaultName = `${assistant.name} ${new Date(timestamp).toLocaleTimeString()}`
      } catch (e) {
        /* ignore */
      }
    }
    const newMemory = {
      memoryId: generateUniqueId(),
      sessionId: currentSessionId,
      timestamp: timestamp,
      name: defaultName,
      messages: messages,
    }
    memories.value.push(newMemory)
    console.log(`[ConversationStore] Created new memory: ${newMemory.memoryId}`)
  }

  function loadMemory(memoryId) {
    const memoryToLoad = memories.value.find((mem) => mem.memoryId === memoryId)
    if (memoryToLoad) {
      saveActiveConversationToMemories() // Save current work first
      activeSessionId.value = memoryToLoad.sessionId
      activeMessages.value = [...memoryToLoad.messages]
      loadedMemoryId.value = memoryId
      console.log(
        `[ConversationStore] Loaded memory ${memoryId}. Session: ${activeSessionId.value}`,
      )
    } else {
      console.error(`[ConversationStore] Memory ID ${memoryId} not found.`)
    }
  }

  function deleteMemory(memoryId) {
    const index = memories.value.findIndex((mem) => mem.memoryId === memoryId)
    if (index !== -1) {
      const deletedMemory = memories.value.splice(index, 1)[0]
      console.log(`[ConversationStore] Deleted memory: ${memoryId} (Name: ${deletedMemory.name})`)
      saveMemoriesToLocalStorage()
      if (loadedMemoryId.value === memoryId) {
        activeSessionId.value = MAIN_CHAT_ID
        activeMessages.value = []
        loadedMemoryId.value = null
      }
    } else {
      console.warn(`[ConversationStore] Memory ID ${memoryId} not found for deletion.`)
    }
  }

  function setActiveSession(sessionId) {
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      console.error('[ConversationStore] setActiveSession: Invalid sessionId.')
      return
    }
    const trimmedId = sessionId.trim()
    if (activeSessionId.value === trimmedId && !loadedMemoryId.value) {
      return
    }
    saveActiveConversationToMemories()
    activeSessionId.value = trimmedId
    activeMessages.value = []
    loadedMemoryId.value = null
    console.log(`[ConversationStore] Active session context set to: ${activeSessionId.value}.`)
  }

  function addMessageToActiveSession(role, content, timestamp, imagePreviewUrl) {
    const hasTextContent = typeof content === 'string' && content.trim() !== ''
    const hasImage = !!imagePreviewUrl
    if (!hasTextContent && !hasImage) return
    if (role !== 'user' && role !== 'assistant' && role !== 'system') {
      // Allow system role internally
      console.error(`[ConversationStore] Invalid role "${role}".`)
      return
    }
    const messageTimestamp = timestamp || Date.now()
    const newMessage = {
      role: role,
      content: typeof content === 'string' ? content.trim() : content,
      timestamp: messageTimestamp,
      imagePreviewUrl: imagePreviewUrl || null, // Primarily for user message display
    }
    activeMessages.value.push(newMessage)
  }

  function clearActiveChatView() {
    activeMessages.value = []
    loadedMemoryId.value = null
  }

  // --- Load Initial State ---
  loadMemoriesFromLocalStorage()
  activeSessionId.value = MAIN_CHAT_ID
  activeMessages.value = []
  loadedMemoryId.value = null
  console.log('[ConversationStore] Initialized. Active session defaulted.')

  // --- Computed Getters ---
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

  // --- Getter Functions ---
  /**
   * Formats message history for sending to an API.
   * @param {object} [options] - Optional configuration.
   * @param {boolean} [options.excludeLast=false] - If true, excludes the last message.
   * @returns {Array<object>} - Formatted message history.
   */
  const getFormattedHistoryForAPI = (options = {}) => {
    const { excludeLast = false } = options
    const formatted = []
    // Use .value here to access reactive state within the function
    const currentSessionId = activeSessionId.value
    const messagesToFormat = activeMessages.value.slice() // Use .value

    // Add system prompt if applicable
    if (currentSessionId !== MAIN_CHAT_ID) {
      // Use constant directly
      try {
        // Use store instance directly
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
      // Simplified formatting logic for history (current message built in sender composable)
      if (msg.role === 'user' || msg.role === 'assistant') {
        if (typeof msg.content === 'string' && msg.content.trim() !== '') {
          apiFormattedContent = msg.content.trim()
        }
        // Note: Ignoring images in past messages for API for now
      } else if (msg.role === 'system' && typeof msg.content === 'string') {
        // Handle potential system messages in history
        apiFormattedContent = msg.content.trim()
      }

      if (msg.role && apiFormattedContent !== null) {
        formatted.push({ role: msg.role, content: apiFormattedContent })
      } else {
        // console.warn('[ConversationStore] Skipping message format for API history:', msg) // Optional: reduce noise
      }
    })
    return formatted
  }

  // --- Return state, getters, and actions ---
  return {
    // State
    activeSessionId,
    memories,

    // Computed Getters
    activeHistory,
    memoryListForDisplay,

    // Getter Functions
    getFormattedHistoryForAPI, // *** UNCOMMENTED/PRESENT ***

    // Actions
    setActiveSession,
    addMessageToActiveSession,
    clearActiveChatView,
    saveActiveConversationToMemories,
    loadMemory,
    deleteMemory,
  }
})
