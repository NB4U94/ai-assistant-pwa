<template>
  <div class="memories-view">
    <h1>Conversation Memories</h1>
    <p>
      Review, load, pin, rename, or delete your past conversation memories. Pinned memories appear
      first.
    </p>

    <div v-if="memoryList && memoryList.length > 0" class="memory-list">
      <ul>
        <li
          v-for="memory in memoryList"
          :key="memory.id"
          class="memory-item"
          :class="{ 'editing-item': editingMemoryId === memory.id }"
        >
          <div class="assistant-avatar-container">
            <div class="assistant-avatar">
              <img
                v-if="memory.assistantImageUrl"
                :src="memory.assistantImageUrl"
                :alt="memory.assistantName"
              />
              <div v-else class="avatar-placeholder">
                {{
                  memory.isMainChat
                    ? 'N'
                    : memory.assistantName && memory.assistantName.trim().length > 0
                      ? memory.assistantName.trim().charAt(0).toUpperCase()
                      : '?'
                }}
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
                <button
                  @click="saveRename"
                  class="action-button save-button"
                  title="Save new name (Enter)"
                >
                  Save
                </button>
                <button
                  @click="cancelEditing"
                  class="action-button cancel-button"
                  title="Cancel rename (Esc)"
                >
                  Cancel
                </button>
              </template>
              <template v-else>
                <button
                  @click="startEditing(memory)"
                  class="action-button rename-button"
                  title="Rename this memory"
                >
                  Rename
                </button>
                <button
                  @click="pinMemoryHandler(memory.id)"
                  class="action-button pin-button"
                  :class="{ unpin: memory.isPinned }"
                  :title="memory.isPinned ? 'Unpin this memory' : 'Pin this memory to top'"
                >
                  {{ memory.isPinned ? 'Unpin' : 'Pin' }}
                </button>
                <button
                  @click="loadMemoryHandler(memory.id)"
                  class="action-button load-button"
                  title="Load this memory into the chat view"
                >
                  Load
                </button>
                <button
                  @click="deleteSingleMemoryHandler(memory.id, memory.name)"
                  class="action-button delete-button"
                  title="Delete this memory permanently"
                >
                  Delete
                </button>
              </template>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div v-else class="memory-list-placeholder">
      <p>No saved memories found yet.</p>
      <p>
        Your conversations will be automatically saved as memories here. You can pin or rename
        important ones!
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useConversationStore } from '@/stores/conversationStore'
const conversationStore = useConversationStore()
const router = useRouter()
const memoryList = computed(() => conversationStore.memoryListForDisplay)

// --- State for inline editing ---
const editingMemoryId = ref(null)
const editingMemoryName = ref('')

// --- Functions ---
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
  } catch (_e) {
    console.error('Error formatting timestamp:', _e)
    try {
      return new Date(timestamp).toLocaleDateString()
    } catch {
      return 'Invalid Date'
    }
  }
}
const loadMemoryHandler = (memoryId) => {
  conversationStore.loadMemory(memoryId)
  router.push('/')
}
const deleteSingleMemoryHandler = (memoryId, memoryName) => {
  if (window.confirm(`Are you sure you want to permanently delete the memory "${memoryName}"?`)) {
    conversationStore.deleteMemory(memoryId)
  }
}
const pinMemoryHandler = (memoryId) => {
  try {
    conversationStore.toggleMemoryPin(memoryId)
  } catch (error) {
    console.error('[MemoriesView] Error calling toggleMemoryPin:', error)
    alert('An error occurred.')
  }
}

// --- Rename Logic Functions ---
const startEditing = async (memory) => {
  if (editingMemoryId.value !== null && editingMemoryId.value !== memory.id) return
  editingMemoryId.value = memory.id
  editingMemoryName.value = memory.name
  await nextTick()
  const inputElement = document.getElementById(`rename-input-${memory.id}`)
  inputElement?.focus()
  inputElement?.select()
}
const cancelEditing = () => {
  editingMemoryId.value = null
  editingMemoryName.value = ''
}
const saveRename = () => {
  const newName = editingMemoryName.value.trim()
  const currentId = editingMemoryId.value
  if (!currentId) return
  const originalMemory = memoryList.value.find((m) => m.id === currentId)
  const originalName = originalMemory ? originalMemory.name : ''
  if (newName && newName !== originalName) {
    try {
      conversationStore.renameMemory(currentId, newName)
    } catch (error) {
      console.error('[MemoriesView] Error calling renameMemory:', error)
      alert('An error occurred.')
    }
  } else if (!newName) {
    alert('Memory name cannot be empty.')
    return
  }
  cancelEditing()
}
const handleBlur = (event) => {
  const relatedTarget = event.relatedTarget
  if (relatedTarget && relatedTarget.classList.contains('action-button')) return
  setTimeout(() => {
    if (editingMemoryId.value !== null && !event.relatedTarget?.closest('.memory-item')) {
      cancelEditing()
    }
  }, 100)
}
</script>

<style scoped>
/* Base styles */
.memories-view {
  padding: 1.5rem 2rem;
  height: 100%;
  overflow-y: auto;
  /* *** UPDATED Main Background *** */
  background-color: #101010; /* Near black */
  /* Keep text primary bright */
  color: var(--text-primary);
}
h1 {
  color: var(--text-primary);
  margin-bottom: 1rem;
  text-align: center;
  border-bottom: 1px solid var(--border-color-medium);
  padding-bottom: 1rem;
  font-weight: 600;
}
.memory-list-placeholder {
  margin-top: 2rem;
  padding: 1.5rem;
  border: 1px dashed var(--border-color-medium);
  border-radius: 8px;
  /* Make placeholder slightly lighter than pure black */
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
  padding: 0.7rem 0.5rem; /* Keep padding for ripple space */
  border-bottom: 1px solid var(--border-color-light);
  gap: 0.5rem;
  transition: background-color 0.2s ease;
}
.memory-item:last-child {
  border-bottom: none;
}
/* Add hover effect for list items on dark background */
.memory-item:hover {
  background-color: var(--bg-main-content-hover, #2a2a2a); /* Use existing hover or a dark grey */
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
  /* position: relative; handled globally */
}

.assistant-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: relative;
  z-index: 1;
  border-radius: 50%;
}

.assistant-avatar .avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3em;
  font-weight: 600;
  border-radius: 50%;
  user-select: none;
  position: relative;
  z-index: 1;
  /* *** UPDATED Background (Grey) and Text Color (White) *** */
  background-color: var(--bg-sidebar); /* Grey background */
  color: #dcdcdc; /* Brighter grey/off-white text */
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
  min-height: 1.4em;
  display: block;
}
.memory-name:hover {
  background-color: var(--bg-input-area); /* Keep hover distinct */
}
.memory-name.pinned-name {
  animation: faintTextGlow 3.2s infinite alternate ease-in-out;
  color: var(--accent-color-primary);
  font-weight: 600;
}
@keyframes faintTextGlow {
  0% {
    text-shadow: 0 0 2px transparent;
  }
  100% {
    text-shadow: 0 0 5px color-mix(in srgb, var(--accent-color-primary) 30%, transparent);
  }
}
.memory-meta {
  font-size: 0.8em;
  /* *** UPDATED Meta Text Color *** */
  color: #dcdcdc; /* Brighter grey/off-white */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.1rem;
}
/* Ensure assistant name within meta also uses the brighter color */
.memory-meta .meta-assistant-name {
  color: inherit; /* Inherit from .memory-meta */
  font-weight: 500; /* Optional: make slightly bolder */
}
.pinned-indicator {
  margin-left: 0.5em;
  font-size: 0.9em;
  display: inline-block;
}
.memory-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  align-items: center;
}
/* Button styles remain the same */
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
    opacity 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}
.action-button:hover:not(:disabled) {
  background-color: var(--bg-button-secondary-hover);
}
.action-button:disabled {
  opacity: 0.5;
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
.pin-button {
  min-width: 60px;
  text-align: center;
}
.pin-button.unpin {
  background-color: var(--bg-button-secondary);
  border-color: var(--accent-color-primary);
  color: var(--accent-color-primary);
  font-weight: 600;
}
.pin-button.unpin:hover:not(:disabled) {
  background-color: var(--bg-button-secondary-hover);
  border-color: color-mix(in srgb, var(--accent-color-primary) 80%, black);
  color: var(--accent-color-primary);
}

/* --- Rename Styles --- */
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
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
  flex-grow: 1;
  min-width: 100px;
  box-sizing: border-box;
  line-height: 1.4;
}
.memory-item.editing-item .memory-info {
  overflow: visible;
}
.memory-item.editing-item .memory-meta {
  display: none;
}
.save-button {
  background-color: var(--accent-color-primary);
  border-color: var(--accent-color-primary);
  color: var(--text-light);
  min-width: 60px;
  text-align: center;
}
.save-button:hover {
  background-color: color-mix(in srgb, var(--accent-color-primary) 85%, black);
  border-color: color-mix(in srgb, var(--accent-color-primary) 85%, black);
}
.cancel-button {
  min-width: 60px;
  text-align: center;
}
.rename-button {
  min-width: 60px;
  text-align: center;
}
.rename-input:focus {
  border-color: color-mix(in srgb, var(--accent-color-primary) 80%, #fff);
}
</style>
