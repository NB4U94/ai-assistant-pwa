<template>
  <div class="memories-view">
    <h1>Conversation Memories</h1>
    <p>
      Review, load, pin, rename, or delete your past conversation memories. Pinned memories appear
      first.
    </p>

    <div class="search-filter-controls">
      <div class="search-input-wrapper">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search memories by name..."
          class="search-input"
          aria-label="Search memories by name"
        />
        <button
          class="search-button icon-button"
          aria-label="Search"
          title="Search (filter applied automatically)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="svg-icon"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            width="20"
            height="20"
          >
            <g fill="none">
              <polygon
                :fill="'var(--accent-color-primary, #42b983)'"
                points="14,4 23,12 14,20 16,12"
              />
              <line stroke="white" stroke-width="2.2" x1="1" y1="12" x2="16" y2="12" />
              <g stroke="white" stroke-width="1.6">
                <line x1="4" y1="6" x2="8" y2="6" />
                <line x1="12" y1="8" x2="15" y2="8" />
                <line x1="2" y1="16" x2="7" y2="16" />
                <line x1="15" y1="18" x2="17" y2="18" stroke-width="1.4" />
                <line x1="9" y1="19" x2="13" y2="19" />
                <line x1="1" y1="9" x2="3" y2="9" stroke-width="1.4" />
              </g>
              <g stroke="var(--accent-color-primary, #42b983)" stroke-width="1.6">
                <line x1="10" y1="4" x2="13" y2="4" />
                <line x1="7" y1="14" x2="12" y2="14" stroke-width="1.8" />
                <line x1="14" y1="16.5" x2="16" y2="16.5" />
                <line x1="2" y1="7.5" x2="6" y2="7.5" />
                <line x1="15" y1="5.5" x2="17" y2="5.5" stroke-width="1.4" />
                <line x1="8" y1="20" x2="11" y2="20" stroke-width="1.4" />
              </g>
            </g>
          </svg>
        </button>
      </div>
      <div class="filter-select-wrapper">
        <label for="assistant-filter" class="sr-only">Filter by Assistant</label>
        <select id="assistant-filter" v-model="selectedAssistantFilter" class="filter-select">
          <option value="all">All Assistants</option>
          <option value="main_chat">Nb4U-Ai</option>
          <option
            v-for="assistant in assistantFilterOptions"
            :key="assistant.id"
            :value="assistant.id"
          >
            {{ assistant.name }}
          </option>
        </select>
      </div>
    </div>
    <div v-if="filteredMemoryList && filteredMemoryList.length > 0" class="memory-list">
      <ul>
        <li
          v-for="memory in filteredMemoryList"
          :key="memory.id"
          class="memory-item"
          :class="{ 'editing-item': editingMemoryId === memory.id }"
        >
          <div class="assistant-avatar-container">
            <div class="assistant-avatar">
              <Nb4uLogoPlaceholder v-if="memory.isMainChat" />
              <img
                v-else-if="memory.assistantImageUrl && !avatarLoadError[memory.id]"
                :src="memory.assistantImageUrl"
                :alt="`${memory.assistantName || 'Assistant'} avatar`"
                @error="handleAvatarError(memory.id)"
                class="assistant-image"
              />
              <div v-else :style="getPlaceholderStyle(memory)" class="avatar-placeholder">
                {{ !memory.isMainChat ? getInitials(memory.assistantName) : '' }}
              </div>
            </div>
          </div>
          <div class="memory-item-content">
            <div class="memory-info">
              <input
                v-if="editingMemoryId === memory.id"
                type="text"
                v-model="editingMemoryName"
                :id="'rename-input-' + memory.id"
                class="rename-input"
                @keyup.enter="saveRename"
                @keyup.esc="cancelEditing"
                @blur="handleBlur"
                placeholder="Enter new name"
              />
              <span
                v-else
                class="memory-name"
                :class="{ 'pinned-name': memory.isPinned }"
                @dblclick="startEditing(memory)"
                title="Double-click to rename"
                >{{ memory.name }}</span
              >

              <span class="memory-meta">
                <span class="meta-assistant-name">{{ memory.assistantName }}</span> -
                {{ memory.messageCount }} message(s) - Saved:
                {{ formatMemoryTimestamp(memory.timestamp) }}
                <span v-if="memory.isPinned" class="pinned-indicator" title="Pinned">📌</span>
              </span>
            </div>
            <div class="memory-actions">
              <template v-if="editingMemoryId === memory.id">
                <button @click="saveRename" class="action-button save-button" title="Save">
                  Save
                </button>
                <button @click="cancelEditing" class="action-button cancel-button" title="Cancel">
                  Cancel
                </button>
              </template>
              <template v-else>
                <button
                  @click="startEditing(memory)"
                  class="action-button rename-button"
                  title="Rename"
                >
                  Rename
                </button>
                <button
                  @click="pinMemoryHandler(memory.id)"
                  class="action-button pin-button"
                  :class="{ unpin: memory.isPinned }"
                  :title="memory.isPinned ? 'Unpin' : 'Pin'"
                >
                  {{ memory.isPinned ? 'Unpin' : 'Pin' }}
                </button>
                <button
                  @click="loadMemoryHandler(memory.id)"
                  class="action-button load-button"
                  title="Load"
                >
                  Load
                </button>
                <button
                  @click="deleteSingleMemoryHandler(memory.id, memory.name)"
                  class="action-button delete-button"
                  title="Delete"
                >
                  Delete
                </button>
              </template>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div v-else-if="!memoryList || memoryList.length === 0" class="memory-list-placeholder">
      <p>No saved memories found yet.</p>
      <p>Your conversations will be automatically saved as memories here.</p>
    </div>
    <div v-else class="memory-list-placeholder">
      <p>No memories match your current search or filter.</p>
    </div>
  </div>
</template>

<script setup>
// Script setup remains the same as the previous version
import { computed, ref, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useConversationStore } from '@/stores/conversationStore'
import { useAssistantsStore } from '@/stores/assistantsStore'
import Nb4uLogoPlaceholder from '@/components/Nb4uLogoPlaceholder.vue'

const conversationStore = useConversationStore()
const assistantsStore = useAssistantsStore()
const router = useRouter()

const { memoryListForDisplay: memoryList } = storeToRefs(conversationStore)
const { assistants } = storeToRefs(assistantsStore)

const editingMemoryId = ref(null)
const editingMemoryName = ref('')
const avatarLoadError = ref({})
const searchQuery = ref('')
const selectedAssistantFilter = ref('all')

onMounted(() => {
  avatarLoadError.value = {}
})

const assistantFilterOptions = computed(() => {
  return assistants.value
    .filter((a) => a.id !== 'main_chat')
    .map((a) => ({ id: a.id, name: a.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const filteredMemoryList = computed(() => {
  let filtered = memoryList.value
  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    filtered = filtered.filter((memory) => memory.name.toLowerCase().includes(query))
  }
  const filter = selectedAssistantFilter.value
  if (filter !== 'all') {
    filtered = filtered.filter((memory) => memory.sessionId === filter)
  }
  return filtered
})

const handleAvatarError = (memoryId) => {
  if (!memoryId) return
  avatarLoadError.value[memoryId] = true
}
const getInitials = (name) => {
  return name ? name.trim().charAt(0).toUpperCase() : '?'
}
const getPlaceholderStyle = (memory) => {
  return memory?.assistantColor && !memory.isMainChat
    ? { backgroundColor: memory.assistantColor }
    : {}
}
const formatMemoryTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A'
  try {
    const opts = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }
    return new Date(timestamp).toLocaleString(undefined, opts)
  } catch {
    // <-- Removed (_e) here
    try {
      return new Date(timestamp).toLocaleDateString()
    } catch {
      return 'Invalid Date'
    }
  }
}
const loadMemoryHandler = (memoryId) => {
  if (!memoryId) return
  try {
    conversationStore.loadMemory(memoryId)
    router.push({ name: 'chat' })
  } catch (e) {
    console.error(e)
    alert('Failed to load memory.')
  }
}
const deleteSingleMemoryHandler = (memoryId, memoryName) => {
  if (!memoryId) return
  if (window.confirm(`Delete "${memoryName || 'this memory'}"?`)) {
    try {
      conversationStore.deleteMemory(memoryId)
    } catch (e) {
      console.error(e)
      alert('Failed to delete memory.')
    }
  }
}
const pinMemoryHandler = (memoryId) => {
  if (!memoryId) return
  try {
    conversationStore.toggleMemoryPin(memoryId)
  } catch (e) {
    console.error(e)
    alert('An error occurred.')
  }
}
const startEditing = async (memory) => {
  if (!memory?.id) return
  if (editingMemoryId.value !== null && editingMemoryId.value !== memory.id) return
  editingMemoryId.value = memory.id
  editingMemoryName.value = memory.name || ''
  await nextTick()
  const el = document.getElementById(`rename-input-${memory.id}`)
  el?.focus()
  el?.select()
}
const cancelEditing = () => {
  editingMemoryId.value = null
  editingMemoryName.value = ''
}
const saveRename = () => {
  const newName = editingMemoryName.value.trim()
  const currentId = editingMemoryId.value
  if (!currentId) {
    cancelEditing()
    return
  }
  const storeMem = memoryList.value.find((m) => m.id === currentId)
  const oldName = storeMem ? storeMem.name : ''
  if (!newName) {
    alert('Name cannot be empty.')
    return
  }
  if (newName !== oldName) {
    try {
      conversationStore.renameMemory(currentId, newName)
    } catch (e) {
      console.error(e)
      alert('An error occurred.')
    }
  }
  cancelEditing()
}
const handleBlur = (event) => {
  const currentId = editingMemoryId.value
  if (currentId === null) return
  const relatedTarget = event.relatedTarget
  const pItem = event.target.closest('.memory-item')
  if (
    pItem &&
    relatedTarget &&
    pItem.contains(relatedTarget) &&
    relatedTarget.classList.contains('action-button')
  )
    return
  setTimeout(() => {
    if (editingMemoryId.value === currentId) {
      saveRename()
    }
  }, 150)
}
</script>

<style scoped>
/* Base styles */
.memories-view {
  padding: 1.5rem 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #101010;
  color: var(--text-primary);
}
h1 {
  color: var(--text-primary);
  margin-bottom: 1rem;
  text-align: center;
  border-bottom: 1px solid var(--border-color-medium);
  padding-bottom: 1rem;
  font-weight: 600;
  flex-shrink: 0;
}
.memories-view > p {
  text-align: center;
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.9em;
  flex-shrink: 0;
}

/* Search and Filter Controls */
.search-filter-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.search-input-wrapper {
  display: flex;
  flex-grow: 1;
  min-width: 250px;
  background-color: var(--bg-input-area);
  border-radius: 6px;
  border: 1px solid var(--border-color-medium);
  overflow: hidden;
  height: 40px; /* Match icon button height */
}
.search-input {
  flex-grow: 1;
  padding: 0.5rem 0.8rem;
  background-color: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 0.95em;
  outline: none;
  height: 100%;
}
.search-input::placeholder {
  color: var(--text-placeholder);
}
.search-input-wrapper:focus-within {
  border-color: var(--accent-color-primary);
  box-shadow: 0 0 0 1px var(--accent-color-primary);
}

/* --- FINAL Search Button Styles START --- */
.search-button {
  /* Base icon button styles (mimic SendButton) */
  padding: 0;
  border: none;
  border-radius: 0 6px 6px 0; /* Match wrapper corner */
  cursor: pointer;
  height: 100%; /* Fill wrapper height */
  width: 45px; /* Slightly wider to fit icon comfortably */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: transparent; /* Match wrapper */
  color: var(--text-light, #fff); /* Icon color like enabled SendButton */
  transition:
    color 0.2s ease,
    background-color 0.2s ease;
  vertical-align: middle;
  border-left: 1px solid var(--border-color-medium); /* Separator */
}
.search-button svg.svg-icon {
  /* Target the SVG specifically */
  display: block;
  width: 20px; /* Icon size */
  height: 20px;
  stroke-width: 1.5; /* Optional: Adjust stroke */
}
/* Use fill/stroke directly if SVG doesn't use currentColor effectively */
/* .search-button svg path { fill: var(--text-light, #fff); } */
/* .search-button svg line { stroke: var(--text-light, #fff); } */

.search-button:hover {
  color: var(--accent-color-primary); /* Highlight icon on hover */
  background-color: color-mix(
    in srgb,
    var(--accent-color-primary) 10%,
    transparent
  ); /* Subtle bg */
}
.search-button:focus-visible {
  outline: 2px solid var(--accent-color-primary);
  outline-offset: -2px;
  z-index: 1;
}
/* .icon-button {}  <-- Removed this empty rule */
/* --- FINAL Search Button Styles END --- */

.filter-select-wrapper {
  flex-shrink: 0;
}
.filter-select {
  padding: 0.5rem 0.8rem;
  background-color: var(--bg-input-area);
  border: 1px solid var(--border-color-medium);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.95em;
  height: 40px;
  cursor: pointer;
  min-width: 150px;
}
.filter-select:focus {
  border-color: var(--accent-color-primary);
  outline: none;
  box-shadow: 0 0 0 1px var(--accent-color-primary);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Memory List */
.memory-list {
  flex-grow: 1;
  overflow-y: auto;
  margin: 0 -0.5rem;
  padding: 0 0.5rem;
}
/* --- Consistent Scrollbar Styling --- */
/* Webkit (Chrome, Safari, Edge) */
.memory-list::-webkit-scrollbar {
  width: 8px; /* Width of the scrollbar */
}
.memory-list::-webkit-scrollbar-track {
  background: var(--bg-input-area, #2a2a2a); /* Track background */
  border-radius: 4px;
}
.memory-list::-webkit-scrollbar-thumb {
  background-color: var(--border-color-medium, #555); /* Thumb color */
  border-radius: 4px; /* Rounded corners */
  border: 2px solid var(--bg-input-area, #2a2a2a); /* Creates padding around thumb */
}
.memory-list::-webkit-scrollbar-thumb:hover {
  background-color: var(--border-color-light, #777); /* Thumb color on hover */
}
/* Firefox */
.memory-list {
  scrollbar-width: thin; /* "auto" or "thin" */
  scrollbar-color: var(--border-color-medium, #555) var(--bg-input-area, #2a2a2a); /* thumb track */
}
/* --- End Consistent Scrollbar Styling --- */

.memory-list-placeholder {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
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
  margin: 0;
}
.memory-item {
  display: flex;
  align-items: center;
  padding: 0.7rem 0.5rem;
  border-bottom: 1px solid var(--border-color-light);
  gap: 0.5rem;
  transition: background-color 0.2s ease;
}
.memory-item:last-child {
  border-bottom: none;
}
.memory-item:hover {
  background-color: var(--bg-main-content-hover, #2a2a2a);
}

/* Avatar Styles */
.assistant-avatar-container {
  flex-shrink: 0;
  padding-right: 0.5rem;
}
.assistant-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color-light);
  flex-shrink: 0;
  overflow: hidden;
  background-color: var(--bg-sidebar);
}
.assistant-avatar > :deep(.nb4u-logo-placeholder),
.assistant-avatar > .assistant-image,
.assistant-avatar > .avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.assistant-avatar .assistant-image {
  object-fit: cover;
  position: relative;
  z-index: 1;
  border-radius: 50%;
}
.assistant-avatar .avatar-placeholder {
  font-size: 1.3em;
  font-weight: 600;
  border-radius: 50%;
  user-select: none;
  position: relative;
  z-index: 1;
  background-color: var(--bg-sidebar);
  color: #dcdcdc;
}

/* Item Content Styles */
.memory-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-grow: 1;
  gap: 1rem;
  overflow: hidden;
}
.memory-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  overflow: hidden;
  flex-grow: 1;
  align-self: stretch;
}
.memory-name {
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border: 1px solid transparent;
  border-radius: 4px;
  line-height: 1.4;
  min-height: calc(1.4em + 0.4rem);
  display: block;
  transition:
    background-color 0.15s ease,
    color 0.2s ease;
}
.memory-name:hover {
  background-color: var(--bg-input-area);
}
.memory-name.pinned-name {
  color: #fd7e14;
  font-weight: 600;
  animation: none;
}
.memory-meta {
  font-size: 0.8em;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.1rem;
}
.memory-meta .meta-assistant-name {
  color: inherit;
  font-weight: 500;
}
.pinned-indicator {
  margin-left: 0.5em;
  font-size: 0.9em;
  display: inline-block;
  vertical-align: middle;
}
.memory-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  align-items: center;
}

/* Outline Button Styles */
.action-button {
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border-width: 2px;
  border-style: solid;
  border-color: transparent;
  background-color: transparent;
  color: white;
  font-family: sans-serif;
  font-size: 0.85em;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    opacity 0.2s ease;
  white-space: nowrap;
  min-width: 60px;
  text-align: center;
  position: relative;
  box-shadow: none;
}
.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: var(--border-color-medium);
  background-color: transparent;
  color: var(--text-disabled, #888);
}
.rename-button,
.save-button {
  border-color: var(--accent-color-primary);
} /* Green */
.delete-button {
  border-color: #e53e3e;
} /* Red */
.pin-button {
  border-color: #ffc107;
} /* Yellow */
.pin-button.unpin {
  border-color: #fd7e14;
} /* Orange */
.load-button {
  border-color: #0d6efd;
} /* Blue */
.cancel-button {
  border-color: var(--border-color-medium);
} /* Gray */
.action-button:hover:not(:disabled) {
  color: white;
}
.rename-button:hover:not(:disabled),
.save-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--accent-color-primary) 20%, transparent);
}
.delete-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, #e53e3e 20%, transparent);
}
.pin-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, #ffc107 20%, transparent);
}
.pin-button.unpin:hover:not(:disabled) {
  background-color: color-mix(in srgb, #fd7e14 20%, transparent);
}
.load-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, #0d6efd 20%, transparent);
}
.cancel-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--border-color-medium) 20%, transparent);
}

/* Rename Input Styles */
.rename-input {
  padding: 0.2rem 0.4rem;
  font-size: 1em;
  font-weight: 500;
  font-family: sans-serif;
  border: 1px solid var(--accent-color-primary);
  border-radius: 4px;
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 20%, transparent);
  flex-grow: 1;
  min-width: 100px;
  box-sizing: border-box;
  line-height: 1.4;
  height: calc(1.4em + 0.4rem + 2px);
}
.memory-item.editing-item .memory-info {
  overflow: visible;
}
.memory-item.editing-item .memory-meta {
  display: none;
}
.rename-input:focus {
  border-color: color-mix(in srgb, var(--accent-color-primary) 80%, #fff);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color-primary) 30%, transparent);
}

/* --- ADDED SCROLLBAR STYLING TO MATCH MEMORIES VIEW --- */
/* Ensures consistency across scrollable lists */

/* Webkit (Chrome, Safari, Edge) */
.memory-list::-webkit-scrollbar {
  width: 8px; /* Width of the scrollbar */
}

.memory-list::-webkit-scrollbar-track {
  background: var(--bg-input-area, #2a2a2a); /* Track background */
  border-radius: 4px;
}

.memory-list::-webkit-scrollbar-thumb {
  background-color: var(--border-color-medium, #555); /* Thumb color */
  border-radius: 4px; /* Rounded corners */
  border: 2px solid var(--bg-input-area, #2a2a2a); /* Creates padding around thumb */
}

.memory-list::-webkit-scrollbar-thumb:hover {
  background-color: var(--border-color-light, #777); /* Thumb color on hover */
}

/* Firefox */
.memory-list {
  scrollbar-width: thin; /* "auto" or "thin" */
  scrollbar-color: var(--border-color-medium, #555) var(--bg-input-area, #2a2a2a); /* thumb track */
}
/* --- END SCROLLBAR STYLING --- */
</style>
