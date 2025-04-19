<template>
  <div class="assistants-view">
    <div class="assistants-header">
      <h2>Assistants</h2>
      <button @click="startCreateAssistant" class="create-button">+ Create New Assistant</button>
    </div>

    <div class="assistants-list-container">
      <h3>Your Assistants</h3>
      <div v-if="isLoading" class="loading-indicator">Loading assistants...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <div v-else-if="assistants.length === 0" class="placeholder-text">
        You haven't created any assistants yet. Click the button above to create one!
      </div>
      <ul v-else class="assistants-list">
        <li v-for="assistant in assistants" :key="assistant.id" class="assistant-item">
          <div class="assistant-info">
            <span class="assistant-name">{{ assistant.name }}</span>
            <span class="assistant-detail"
              >Level {{ assistant.level }} | Created:
              {{ formatTimestamp(assistant.createdAt) }}</span
            >
          </div>
          <div class="assistant-actions">
            <button @click="selectAssistant(assistant)" title="Chat with this Assistant">
              Chat
            </button>
            <button @click="editAssistant(assistant)" title="Edit Assistant Settings">Edit</button>
            <button
              @click="confirmDeleteAssistant(assistant)"
              title="Delete Assistant"
              class="delete-button"
            >
              Delete
            </button>
          </div>
        </li>
      </ul>
    </div>

    <div class="modal-overlay" v-if="showCreatorModal" @click.self="closeCreatorModal">
      <AssistantCreator @cancel="closeCreatorModal" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia' // Import storeToRefs for reactive store state
import { useAssistantsStore } from '@/stores/assistantsStore' // Import the assistants store
import AssistantCreator from '@/components/AssistantCreator.vue'

// --- Store Setup ---
const assistantsStore = useAssistantsStore()
// Use storeToRefs to make the 'assistants' array reactive in the template
const { assistants } = storeToRefs(assistantsStore)

// --- Component State ---
const showCreatorModal = ref(false)
// isLoading/error can be used later if loading from localStorage/API
const isLoading = ref(false)
const error = ref(null)

// --- Lifecycle Hooks ---
onMounted(() => {
  // Placeholder: Later, this could call an action to load assistants
  // e.g., assistantsStore.loadAssistantsFromLocalStorage();
  console.log('AssistantsView mounted. Displaying assistants from store:', assistants.value)
})

// --- Modal Control ---
const startCreateAssistant = () => {
  showCreatorModal.value = true
}
const closeCreatorModal = () => {
  showCreatorModal.value = false
  // The list should update automatically because 'assistants' is reactive
}

// --- Timestamp Formatting ---
const formatTimestamp = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  // Simple date format, customize as needed
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

// --- Assistant Actions ---
const selectAssistant = (assistant) => {
  console.log('Placeholder: Start chat with assistant:', assistant.name, assistant.id)
  alert(`Placeholder: Starting chat with ${assistant.name}. Not implemented.`)
  // TODO: Implement navigation or state change to activate chat with this assistant
  // Will need to load assistant.instructions into the chat context/prompt.
}

const editAssistant = (assistant) => {
  console.log('Placeholder: Edit assistant:', assistant.name, assistant.id)
  alert(`Placeholder: Editing ${assistant.name}. Not implemented.`)
  // TODO: Implement logic to open creator modal pre-filled with assistant data
  // This will require adding an 'update' mode and logic to AssistantCreator.vue
}

const confirmDeleteAssistant = (assistant) => {
  // Use window.confirm for simple confirmation
  if (
    window.confirm(
      `Are you sure you want to delete the assistant "${assistant.name}"? This cannot be undone.`,
    )
  ) {
    console.log('Attempting to delete assistant:', assistant.name, assistant.id)
    const success = assistantsStore.deleteAssistant(assistant.id)
    if (!success) {
      alert(`Failed to delete assistant "${assistant.name}". Check console for details.`)
    }
    // List updates automatically via Pinia reactivity
  }
}
</script>

<style scoped>
.assistants-view {
  padding: 1.5rem 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background-color: var(--bg-main-content);
  color: var(--text-primary);
  position: relative;
}

.assistants-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color-medium);
  flex-shrink: 0;
}

.assistants-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-family: sans-serif;
  font-weight: 600;
}

.create-button {
  padding: 0.5rem 1rem;
  background-color: var(--bg-button-primary);
  color: var(--text-button-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: sans-serif;
  font-size: 0.9em;
  font-weight: 500;
  transition: background-color 0.2s ease;
  white-space: nowrap;
}
.create-button:hover {
  background-color: var(--bg-button-primary-hover);
}

.assistants-list-container {
  flex-grow: 1;
  overflow-y: auto;
  padding-right: 5px; /* Scrollbar padding */
}
.assistants-list-container h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--text-secondary);
  font-size: 1.1em;
  font-weight: 500;
}

.assistants-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.assistant-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1rem;
  margin-bottom: 0.75rem;
  background-color: var(--bg-input-field);
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}
.assistant-item:hover {
  border-color: var(--accent-color-primary);
  background-color: color-mix(in srgb, var(--bg-input-field) 90%, var(--bg-app-container));
}

.assistant-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem; /* Slightly more space */
  flex-grow: 1;
  margin-right: 1rem;
  overflow: hidden;
}
.assistant-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1.05em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.assistant-detail {
  /* Combined description/details */
  font-size: 0.8em;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.assistant-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
.assistant-actions button {
  padding: 0.3rem 0.7rem;
  font-size: 0.8em;
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  white-space: nowrap;
}
.assistant-actions button:hover {
  background-color: var(--bg-button-secondary-hover);
}
.delete-button {
  background-color: #8c1c13;
  color: white;
} /* Dark red */
.delete-button:hover {
  background-color: #a82d22;
} /* Lighter red */

/* Placeholder, Loading, Error Styles */
.placeholder-text {
  color: var(--text-placeholder);
  font-style: italic;
  font-size: 0.9em;
  text-align: center;
  margin-top: 2rem;
  padding: 1rem;
  border: 1px dashed var(--border-color-light);
  border-radius: 6px;
  background-color: color-mix(in srgb, var(--bg-main-content) 50%, var(--bg-input-field));
}
.loading-indicator {
  color: var(--text-secondary);
  text-align: center;
  padding: 1rem;
  font-style: italic;
}
.error-message {
  color: var(--text-error);
  background-color: var(--bg-message-error);
  border: 1px solid var(--border-color-error);
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-top: 1rem;
  font-size: 0.9em;
  text-align: center;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
  box-sizing: border-box;
  cursor: pointer;
}
/* Use :deep to target root element of child component */
.modal-overlay > :deep(.assistant-creator) {
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: hidden; /* Creator handles internal scroll */
  cursor: default;
  box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
  padding: 0;
  display: flex;
  flex-direction: column;
}
</style>
