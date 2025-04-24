<template>
  <div class="memories-view">
    <h1>Conversation Memories</h1>
    <p>
      Review, reload, or delete your past conversation memories. Memories are sorted by the most
      recently saved time.
    </p>

    <div v-if="memoryList && memoryList.length > 0" class="memory-list">
      <ul>
        <li v-for="memory in memoryList" :key="memory.id" class="memory-item">
          <div class="memory-info">
            <span class="memory-name">{{ memory.name }}</span>
            <span class="memory-meta">
              {{ memory.messageCount }} message(s) - Saved:
              {{ formatMemoryTimestamp(memory.timestamp) }}
            </span>
          </div>
          <div class="memory-actions">
            <button
              @click="loadMemoryHandler(memory.id)"
              class="action-button load-button"
              title="Load this memory into the chat view"
            >
              Load
            </button>
            <button
              @click="deleteMemoryHandler(memory.id, memory.name)"
              class="action-button delete-button"
              title="Delete this memory permanently"
            >
              Delete
            </button>
          </div>
        </li>
      </ul>
    </div>
    <div v-else class="memory-list-placeholder">
      <p>No saved memories found yet.</p>
      <p>
        Your conversations will be automatically saved as memories here when you close or refresh
        the app.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useConversationStore } from '@/stores/conversationStore'

const conversationStore = useConversationStore()
const router = useRouter()

// Get the formatted memory list using the new getter
const memoryList = computed(() => conversationStore.memoryListForDisplay)

/**
 * Formats a timestamp into a readable date/time string.
 * @param {number} timestamp - The timestamp number (e.g., Date.now()).
 * @returns {string} - Formatted date/time string.
 */
const formatMemoryTimestamp = (timestamp) => {
  // Renamed parameter for clarity
  if (!timestamp) return 'N/A'
  try {
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true, // Use 12-hour format
    }
    // Use 'en-AU' locale for Australian date format, fallback to browser default
    return new Date(timestamp).toLocaleString(['en-AU', undefined], options)
  } catch (e) {
    console.error('Error formatting timestamp:', e)
    return new Date(timestamp).toLocaleDateString() // Fallback to date only
  }
}

/**
 * Loads the selected memory into the active chat view and navigates there.
 * @param {string} memoryId - The ID of the memory to load.
 */
const loadMemoryHandler = (memoryId) => {
  // Renamed function
  console.log(`[MemoriesView] Loading memory: ${memoryId}`)
  conversationStore.loadMemory(memoryId) // Use the new store action
  router.push('/') // Navigate to the main chat view route
}

/**
 * Handles the delete button click, shows confirmation, and calls store action.
 * @param {string} memoryId - The ID of the memory to delete.
 * @param {string} memoryName - The name of the memory for the confirmation dialog.
 */
const deleteMemoryHandler = (memoryId, memoryName) => {
  // Renamed function
  // Confirmation dialog
  if (
    window.confirm(
      `Are you sure you want to permanently delete the memory "${memoryName}"? This cannot be undone.`,
    )
  ) {
    console.log(`[MemoriesView] Deleting memory: ${memoryId}`)
    conversationStore.deleteMemory(memoryId) // Use the new store action
    // The list will update automatically because it's a computed property.
  }
}
</script>

<style scoped>
.memories-view {
  padding: 1.5rem 2rem;
  height: 100%;
  overflow-y: auto;
  color: var(--text-primary);
  background-color: var(--bg-main-content);
}

h1 {
  color: var(--text-primary);
  margin-bottom: 1rem;
  text-align: center;
  border-bottom: 1px solid var(--border-color-medium);
  padding-bottom: 1rem;
  font-weight: 600;
}

/* Updated class name */
.memory-list-placeholder {
  margin-top: 2rem;
  padding: 1.5rem;
  border: 1px dashed var(--border-color-medium);
  border-radius: 8px;
  background-color: var(--bg-input-area);
  color: var(--text-secondary);
  text-align: center;
}
/* Updated class name */
.memory-list ul {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0 0;
}
/* Updated class name */
.memory-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0.5rem;
  border-bottom: 1px solid var(--border-color-light);
  gap: 1rem;
}
.memory-item:last-child {
  border-bottom: none;
}
/* Updated class name */
.memory-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  overflow: hidden; /* Prevent long names breaking layout */
}
/* Updated class name */
.memory-name {
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* Updated class name */
.memory-meta {
  font-size: 0.8em;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* Updated class name */
.memory-actions {
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

/* Removed .main-chat-note styles as the element is gone */
</style>
