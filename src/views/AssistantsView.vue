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
      <div v-else-if="!assistants || assistants.length === 0" class="placeholder-text">
        You haven't created any assistants yet. Click the button above to create one!
      </div>
      <ul v-else-if="Array.isArray(assistants)" class="assistants-list">
        <li
          v-for="assistant in assistants"
          :key="assistant?.id || Math.random()"
          class="assistant-item"
        >
          <template v-if="assistant">
            <div class="assistant-avatar">
              <img
                v-if="assistant.imageUrl"
                :src="assistant.imageUrl"
                :alt="`${assistant.name || 'Assistant'} avatar`"
                @error="onImageError($event, assistant.id)"
                class="assistant-image"
                :data-assistant-id="assistant.id"
              />
              <div v-else class="assistant-placeholder">
                {{ assistant.name ? assistant.name.charAt(0).toUpperCase() : '?' }}
              </div>
            </div>
            <div class="assistant-info">
              <span class="assistant-name">{{ assistant.name || 'Unnamed Assistant' }}</span>
              <span class="assistant-detail"
                >Level {{ assistant.level || 'N/A' }} | Created:
                {{ formatTimestamp(assistant.createdAt) }}</span
              >
            </div>
            <div class="assistant-actions">
              <button @click="openTestModal(assistant)" title="Test this Assistant">Test</button>
              <button @click="editAssistant(assistant)" title="Edit Assistant Settings">
                Edit
              </button>
              <button
                @click="confirmDeleteAssistant(assistant)"
                title="Delete Assistant"
                class="delete-button"
              >
                Delete
              </button>
            </div>
          </template>
          <template v-else>
            <li class="assistant-item assistant-item--invalid">Invalid assistant data found</li>
          </template>
        </li>
      </ul>
      <div v-else class="error-message">Error: Assistant data is not in the expected format.</div>
    </div>

    <div
      class="modal-overlay creator-modal"
      v-if="showCreatorModal"
      @click.self="closeCreatorModal"
    >
      <AssistantCreator @cancel="closeCreatorModal" @assistant-created="closeCreatorModal" />
    </div>

    <div class="modal-overlay test-modal" v-if="isTestModalVisible" @click.self="closeTestModal">
      <div class="test-modal-content">
        <div class="test-modal-header">
          <h3>Testing Assistant: "{{ assistantBeingTested?.name }}"</h3>
          <button @click="closeTestModal" class="close-modal-button" title="Close Test Chat">
            ✖
          </button>
        </div>
        <div class="test-modal-chat-area">
          <ChatView v-if="assistantBeingTested" :assistant-config="assistantBeingTested" />
        </div>
        <div class="test-modal-footer">
          <button @click="editAssistantFromTest" title="Edit This Assistant's Configuration">
            Edit Assistant
          </button>
          <button @click="closeTestModal" title="Close Test Chat Window">Close Test</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAssistantsStore } from '@/stores/assistantsStore'
// Ensure paths are correct
import AssistantCreator from '@/components/AssistantCreator.vue'
import ChatView from '@/views/ChatView.vue'

// --- Router ---
const router = useRouter()

// --- Store Setup ---
const assistantsStore = useAssistantsStore()
const { assistants } = storeToRefs(assistantsStore)

// --- Component State ---
const showCreatorModal = ref(false)
const isTestModalVisible = ref(false)
const assistantBeingTested = ref(null)
const isLoading = ref(false)
const error = ref(null)

// --- Lifecycle Hooks ---
onMounted(() => {
  console.log('[AssistantsView] Mounted. Displaying assistants from store:', assistants.value)
})

// --- Creator Modal Control ---
const startCreateAssistant = () => {
  showCreatorModal.value = true
}
// This function is now also called when 'assistant-created' event is emitted
const closeCreatorModal = () => {
  showCreatorModal.value = false
}

// --- Test Chat Modal Control ---
const openTestModal = (assistant) => {
  if (!assistant) {
    console.error('[AssistantsView] Attempted to open test modal with invalid assistant data.')
    return
  }
  console.log('[AssistantsView] Opening test modal for assistant:', assistant.name)
  assistantBeingTested.value = assistant
  isTestModalVisible.value = true
}

const closeTestModal = () => {
  console.log('[AssistantsView] Closing test modal.')
  isTestModalVisible.value = false
  assistantBeingTested.value = null
}

// --- Timestamp Formatting ---
const formatTimestamp = (timestamp) => {
  if (!timestamp) return ''
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) {
      console.warn('[AssistantsView] Invalid timestamp received:', timestamp)
      return 'Invalid Date'
    }
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
  } catch (e) {
    console.error('[AssistantsView] Error formatting timestamp:', timestamp, e)
    return 'Invalid Date'
  }
}

// --- Assistant Actions ---

// Navigate to the edit route
const editAssistant = (assistant) => {
  if (!assistant || !assistant.id) {
    console.error('[AssistantsView] Invalid assistant data passed to editAssistant:', assistant)
    return
  }
  console.log('[AssistantsView] Navigating to edit assistant:', assistant.name, assistant.id)
  router.push({ name: 'assistant-edit', params: { id: assistant.id } })

  if (isTestModalVisible.value && assistantBeingTested.value?.id === assistant.id) {
    closeTestModal()
  }
}

// Edit button within the test modal
const editAssistantFromTest = () => {
  if (assistantBeingTested.value) {
    editAssistant(assistantBeingTested.value)
  } else {
    console.warn('[AssistantsView] Edit from test clicked but no assistant was being tested.')
  }
}

// Delete assistant
const confirmDeleteAssistant = (assistant) => {
  if (!assistant || !assistant.id) {
    console.error(
      '[AssistantsView] Invalid assistant data passed to confirmDeleteAssistant:',
      assistant,
    )
    return
  }
  if (
    window.confirm(
      `Are you sure you want to delete the assistant "${assistant.name || 'this assistant'}"? This cannot be undone.`, // Added fallback name
    )
  ) {
    console.log('[AssistantsView] Attempting to delete assistant:', assistant.name, assistant.id)
    const success = assistantsStore.deleteAssistant(assistant.id)
    if (!success) {
      alert(
        `Failed to delete assistant "${assistant.name || 'this assistant'}". Check console for details.`,
      )
    }
  }
}

/**
 * Handles errors when loading an assistant's image.
 */
const onImageError = (event, assistantId) => {
  const imgElement = event.target
  if (!imgElement || imgElement.tagName !== 'IMG') return
  console.warn(
    `[AssistantsView] Assistant image failed to load for ID ${assistantId}:`,
    imgElement.src,
  )
  imgElement.style.display = 'none'
  const avatarContainer = imgElement.closest('.assistant-avatar')
  if (avatarContainer) {
    const placeholder = avatarContainer.querySelector('.assistant-placeholder')
    if (placeholder) {
      placeholder.style.display = 'flex'
    } else {
      console.warn(
        '[AssistantsView] Could not find placeholder element for assistant ID:',
        assistantId,
      )
    }
  } else {
    console.warn(
      '[AssistantsView] Could not find avatar container for failed image, ID:',
      assistantId,
    )
  }
}
</script>

<style scoped>
/* Styles should be identical to the previous version (view-display-images-fix-attempt-3) */
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
  padding-right: 5px;
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
  align-items: center;
  padding: 0.8rem 1rem;
  margin-bottom: 0.75rem;
  background-color: var(--bg-input-field);
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
  gap: 1rem;
}
.assistant-item:hover {
  border-color: var(--accent-color-primary);
  background-color: color-mix(in srgb, var(--bg-input-field) 90%, var(--bg-app-container));
}
.assistant-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  background-color: var(--bg-sidebar);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color-light);
  position: relative;
}
.assistant-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.assistant-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4em;
  font-weight: 600;
  color: var(--text-secondary);
  background-color: var(--bg-sidebar);
  border-radius: 50%;
  user-select: none;
  -webkit-user-select: none;
}
.assistant-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex-grow: 1;
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
}
.delete-button:hover {
  background-color: #a82d22;
}
.placeholder-text,
.loading-indicator,
.error-message {
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
  border: none;
  background: none;
  color: var(--text-secondary);
  font-style: normal;
}
.error-message {
  border-color: var(--border-color-error);
  background-color: var(--bg-message-error);
  color: var(--text-error);
  font-style: normal;
}
.assistant-item--invalid {
  color: var(--text-error);
  font-style: italic;
  justify-content: center;
  border-color: var(--border-color-error);
}
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
.creator-modal > :deep(.assistant-creator) {
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: hidden;
  cursor: default;
  box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
  padding: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-main-content);
  border-radius: 8px;
}
.test-modal .test-modal-content {
  max-width: 90vw;
  width: 800px;
  max-height: 90vh;
  background-color: var(--bg-modal, var(--bg-main-content));
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: default;
}
.test-modal .test-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background-color: var(--bg-header, #2a2a2a);
  color: var(--text-light, #fff);
  border-bottom: 1px solid var(--border-color-heavy, #444);
  flex-shrink: 0;
}
.test-modal .test-modal-header h3 {
  margin: 0;
  font-size: 1.1em;
  font-weight: 600;
}
.test-modal .close-modal-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5em;
  line-height: 1;
  padding: 0.2rem;
  cursor: pointer;
  transition: color 0.2s ease;
}
.test-modal .close-modal-button:hover {
  color: var(--text-primary);
}
.test-modal .test-modal-chat-area {
  flex-grow: 1;
  overflow-y: hidden;
  display: flex;
}
.test-modal .test-modal-chat-area > :deep(.chat-view) {
  height: 100%;
  width: 100%;
  border-radius: 0;
}
.test-modal .test-modal-footer {
  padding: 0.75rem 1.5rem;
  background-color: var(--bg-input-area, #1a1a1a);
  border-top: 1px solid var(--border-color-medium, #333);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-shrink: 0;
}
.test-modal .test-modal-footer button {
  padding: 0.5rem 1rem;
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 500;
  transition: background-color 0.2s ease;
}
.test-modal .test-modal-footer button:hover {
  background-color: var(--bg-button-secondary-hover);
}
</style>
