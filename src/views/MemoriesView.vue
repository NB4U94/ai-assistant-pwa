<template>
  <div class="memories-view">
    <h1>Conversation Memories</h1>
    <p>
      Review, reload, or delete your past conversation sessions. Sessions are sorted by the most
      recently updated.
    </p>

    <div v-if="sessionsList && sessionsList.length > 0" class="session-list">
      <ul>
        <li v-for="session in sessionsList" :key="session.id" class="session-item">
          <div class="session-info">
            <span class="session-name">{{ session.name }}</span>
            <span class="session-meta">
              {{ session.messageCount }} message(s) - Last updated:
              {{ formatSessionTimestamp(session.lastUpdatedAt) }}
            </span>
          </div>
          <div class="session-actions">
            <button
              @click="loadSession(session.id)"
              class="action-button load-button"
              title="Load this session"
            >
              Load
            </button>
            <button
              v-if="session.id !== 'main_chat'"
              @click="deleteSessionHandler(session.id, session.name)"
              class="action-button delete-button"
              title="Delete this session"
            >
              Delete
            </button>
            <span v-else class="main-chat-note" title="Main chat cannot be deleted"
              >(Main Chat)</span
            >
          </div>
        </li>
      </ul>
    </div>
    <div v-else class="session-list-placeholder">
      <p>No saved sessions found yet.</p>
      <p>
        Your conversations with the default AI and specific assistants will appear here once you
        start chatting.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router' // Import router for navigation
import { useConversationStore } from '@/stores/conversationStore'

const conversationStore = useConversationStore()
const router = useRouter() // Get router instance

// Get the formatted session list using the new getter
const sessionsList = computed(() => conversationStore.getSessionListForDisplay)

/**
 * Formats a timestamp into a readable date/time string.
 * @param {number} timestamp - The timestamp number (e.g., Date.now()).
 * @returns {string} - Formatted date/time string.
 */
const formatSessionTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A'
  // Use current locale and sensible options. Adjust format as needed.
  // Current time is: Wednesday, April 23, 2025 12:22 PM AEST
  try {
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }
    return new Date(timestamp).toLocaleString(undefined, options) // Use browser's default locale
  } catch (e) {
    console.error('Error formatting timestamp:', e)
    return new Date(timestamp).toLocaleDateString() // Fallback to date only
  }
}

/**
 * Sets the selected session as active and navigates to the chat view.
 * @param {string} sessionId - The ID of the session to load.
 */
const loadSession = (sessionId) => {
  console.log(`[MemoriesView] Loading session: ${sessionId}`)
  conversationStore.setActiveSession(sessionId)
  router.push('/') // Navigate to the main chat view route
}

/**
 * Handles the delete button click, shows confirmation, and calls store action.
 * @param {string} sessionId - The ID of the session to delete.
 * @param {string} sessionName - The name of the session for the confirmation dialog.
 */
const deleteSessionHandler = (sessionId, sessionName) => {
  // Double-check prevention for main_chat (already handled by v-if, but good practice)
  if (sessionId === 'main_chat') {
    alert('The main chat session cannot be deleted.')
    return
  }

  if (
    window.confirm(
      `Are you sure you want to permanently delete the session "${sessionName}"? This cannot be undone.`,
    )
  ) {
    console.log(`[MemoriesView] Deleting session: ${sessionId}`)
    conversationStore.deleteSession(sessionId)
    // The list will update automatically because it's a computed property based on the store state.
  }
}
</script>

<style scoped>
.memories-view {
  padding: 1.5rem 2rem; /* Match settings view padding */
  height: 100%;
  overflow-y: auto;
  color: var(--text-primary);
  background-color: var(--bg-main-content);
}

h1 {
  color: var(--text-primary); /* Standard text color */
  margin-bottom: 1rem;
  text-align: center;
  border-bottom: 1px solid var(--border-color-medium);
  padding-bottom: 1rem;
  font-weight: 600;
}

.session-list-placeholder {
  margin-top: 2rem;
  padding: 1.5rem;
  border: 1px dashed var(--border-color-medium);
  border-radius: 8px;
  background-color: var(--bg-input-area);
  color: var(--text-secondary);
  text-align: center;
}

.session-list ul {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0 0;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0.5rem;
  border-bottom: 1px solid var(--border-color-light);
  gap: 1rem;
}
.session-item:last-child {
  border-bottom: none;
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  overflow: hidden; /* Prevent long names breaking layout */
}

.session-name {
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-meta {
  font-size: 0.8em;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0; /* Prevent buttons shrinking */
}

.action-button {
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: 1px solid var(--border-color-medium);
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  font-family: sans-serif;
  font-size: 0.85em;
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.action-button:hover:not(:disabled) {
  background-color: var(--bg-button-secondary-hover);
}
.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.load-button {
  /* Optional: Slightly different style for load? */
  background-color: var(--bg-button-primary);
  border-color: var(--bg-button-primary);
  color: var(--text-button-primary);
}
.load-button:hover:not(:disabled) {
  background-color: var(--bg-button-primary-hover);
  border-color: var(--bg-button-primary-hover);
}

.delete-button {
  background-color: var(--bg-error, #a04040);
  color: var(--text-light, white);
  border-color: var(--bg-error, #a04040);
}
.delete-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--bg-error, #a04040) 85%, black);
  border-color: color-mix(in srgb, var(--bg-error, #a04040) 85%, black);
}

.main-chat-note {
  font-size: 0.8em;
  color: var(--text-secondary);
  font-style: italic;
  padding: 0.4rem 0.8rem; /* Match button padding for alignment */
  display: inline-block;
  text-align: center;
  min-width: 60px; /* Approx width of delete button */
}
</style>
