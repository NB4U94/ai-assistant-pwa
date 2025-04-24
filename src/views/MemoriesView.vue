<template>
  <div class="memories-view">
    <h1>Conversation Memories</h1>
    <p>
      Review, reload, or delete your past conversation memories. Memories are sorted by the most
      recently saved time.
    </p>

    <div class="bulk-actions-area" v-if="memoryList && memoryList.length > 0">
      <button
        @click="handleDeleteSelected"
        :disabled="selectedMemoryIds.size === 0"
        class="action-button delete-button"
        title="Delete selected memories"
      >
        Delete Selected ({{ selectedMemoryIds.size }})
      </button>
    </div>

    <div v-if="memoryList && memoryList.length > 0" class="memory-list">
      <ul>
        <li v-for="memory in memoryList" :key="memory.id" class="memory-item">
          <input
            type="checkbox"
            :id="'select-memory-' + memory.id"
            :checked="selectedMemoryIds.has(memory.id)"
            @change="toggleMemorySelection(memory.id)"
            class="memory-checkbox"
            :aria-label="'Select memory: ' + memory.name"
          />

          <div class="memory-item-content">
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
                @click="deleteSingleMemoryHandler(memory.id, memory.name)"
                class="action-button delete-button single-delete-button"
                title="Delete this memory permanently"
              >
                Delete
              </button>
            </div>
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
// *** Import ref ***
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConversationStore } from '@/stores/conversationStore'

const conversationStore = useConversationStore()
const router = useRouter()

// *** State for selected memory IDs ***
const selectedMemoryIds = ref(new Set())

const memoryList = computed(() => conversationStore.memoryListForDisplay)

// --- Timestamp Formatting (Unchanged) ---
const formatMemoryTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A'
  try {
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }
    return new Date(timestamp).toLocaleString('en-AU', options)
  } catch (e) {
    console.error('Error formatting timestamp:', e)
    try {
      return new Date(timestamp).toLocaleDateString()
    } catch {
      return 'Invalid Date'
    }
  }
}

// --- Loading (Unchanged) ---
const loadMemoryHandler = (memoryId) => {
  console.log(`[MemoriesView] Loading memory: ${memoryId}`)
  conversationStore.loadMemory(memoryId)
  router.push('/')
}

// --- Selection Handling ---
const toggleMemorySelection = (memoryId) => {
  if (selectedMemoryIds.value.has(memoryId)) {
    selectedMemoryIds.value.delete(memoryId)
  } else {
    selectedMemoryIds.value.add(memoryId)
  }
  console.log('Selected IDs:', Array.from(selectedMemoryIds.value)) // Log selection changes
}

// --- Deletion Handling ---

// Handler for the single delete button next to each item
const deleteSingleMemoryHandler = (memoryId, memoryName) => {
  if (
    window.confirm(
      `Are you sure you want to permanently delete the memory "${memoryName}"? This cannot be undone.`,
    )
  ) {
    console.log(`[MemoriesView] Deleting single memory: ${memoryId}`)
    // Use the original single delete action (can be kept or refactored to use multi-delete)
    conversationStore.deleteMemory(memoryId)
    // Ensure it's removed from selection if it was selected
    selectedMemoryIds.value.delete(memoryId)
  }
}

// Handler for the "Delete Selected" button
const handleDeleteSelected = () => {
  const idsToDelete = Array.from(selectedMemoryIds.value)
  if (idsToDelete.length === 0) {
    alert('Please select at least one memory to delete.')
    return
  }

  if (
    window.confirm(
      `Are you sure you want to permanently delete the ${idsToDelete.length} selected memories? This cannot be undone.`,
    )
  ) {
    console.log(`[MemoriesView] Deleting ${idsToDelete.length} selected memories:`, idsToDelete)
    try {
      // Call the new store action
      conversationStore.deleteMultipleMemories(idsToDelete)
      // Clear the selection after triggering deletion
      selectedMemoryIds.value.clear()
    } catch (error) {
      console.error('[MemoriesView] Error calling deleteMultipleMemories:', error)
      alert('An error occurred while trying to delete the selected memories.')
    }
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

/* Style for the bulk actions area */
.bulk-actions-area {
  padding: 0.5rem 0.5rem 1rem; /* Padding above/below the button */
  border-bottom: 1px solid var(--border-color-light);
  margin-bottom: 1rem;
  display: flex;
  justify-content: flex-end; /* Position button to the right */
}

.memory-list-placeholder {
  margin-top: 2rem;
  padding: 1.5rem;
  border: 1px dashed var(--border-color-medium);
  border-radius: 8px;
  background-color: var(--bg-input-area);
  color: var(--text-secondary);
  text-align: center;
}
.memory-list ul {
  list-style: none;
  padding: 0;
  margin: 0; /* Removed top margin */
}
.memory-item {
  display: flex;
  /* justify-content: space-between; */ /* Let content handle spacing */
  align-items: center; /* Vertically align checkbox and content */
  padding: 0.75rem 0.5rem; /* Adjusted padding slightly */
  border-bottom: 1px solid var(--border-color-light);
  gap: 1rem; /* Space between checkbox and content */
}
.memory-item:last-child {
  border-bottom: none;
}

/* Checkbox style */
.memory-checkbox {
  flex-shrink: 0; /* Prevent checkbox from shrinking */
  /* Add some margin if needed, or rely on gap */
  accent-color: var(--accent-color-primary); /* Style the check color */
  width: 18px;
  height: 18px;
  cursor: pointer;
}

/* New container for the rest of the list item content */
.memory-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-grow: 1; /* Allow content to take remaining space */
  gap: 1rem;
  overflow: hidden; /* Prevent content overflow */
}

.memory-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  overflow: hidden;
  /* Let flexbox handle width */
}
.memory-name {
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.memory-meta {
  font-size: 0.8em;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.memory-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* Shared button style */
.action-button {
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: 1px solid var(--border-color-medium);
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  font-family: sans-serif;
  font-size: 0.85em;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease;
}
.action-button:hover:not(:disabled) {
  background-color: var(--bg-button-secondary-hover);
}
.action-button:disabled {
  opacity: 0.5; /* Make disabled state more obvious */
  cursor: not-allowed;
  background-color: var(--bg-button-secondary); /* Keep base color */
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

/* Style for ALL delete buttons */
.delete-button {
  background-color: var(--bg-error, #a04040);
  color: var(--text-light, white);
  border-color: var(--bg-error, #a04040);
}
.delete-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--bg-error, #a04040) 85%, black);
  border-color: color-mix(in srgb, var(--bg-error, #a04040) 85%, black);
}
/* Slightly different padding/margin for single delete? Optional */
.single-delete-button {
  /* Add specific styles if needed */
}
</style>
