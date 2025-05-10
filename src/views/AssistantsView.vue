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
          @click="startChatWithAssistant(assistant)"
          title="Click to start a chat with this assistant"
        >
          <template v-if="assistant">
            <div class="assistant-avatar">
              <img
                v-if="assistant.imageUrl && !avatarLoadError[assistant.id]"
                :src="assistant.imageUrl"
                :alt="`${assistant.name || 'Assistant'} avatar`"
                @error="handleAvatarError(assistant.id)"
                class="assistant-image"
              />
              <div v-else :style="getPlaceholderStyle(assistant)" class="assistant-placeholder">
                {{ getInitials(assistant.name) }}
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
              <button
                @click.stop="openTestModal(assistant)"
                class="action-button test-button"
                title="Test this Assistant"
              >
                Test
              </button>
              <button
                @click.stop="editAssistant(assistant)"
                class="action-button edit-button"
                title="Edit Assistant Settings"
              >
                Edit
              </button>
              <button
                @click.stop="confirmDeleteAssistant(assistant)"
                class="action-button delete-button"
                title="Delete Assistant"
              >
                Delete
              </button>
            </div>
          </template>
          <template v-else>
            <div class="assistant-item assistant-item--invalid">Invalid assistant data found</div>
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
          <ChatView
            v-if="assistantBeingTested && conversationStore.isCurrentSessionTestMode"
            key="test-chat-view"
            :initial-assistant-id="assistantBeingTested.id"
            :is-test-mode="true"
          />
          <div v-else class="loading-indicator">Preparing test environment...</div>
        </div>
        <div class="test-modal-footer">
          <button
            @click="editAssistantFromTest"
            class="action-button edit-button"
            title="Edit This Assistant's Configuration"
          >
            Edit Assistant
          </button>
          <button
            @click="closeTestModal"
            class="action-button cancel-button"
            title="Close Test Chat Window"
          >
            Close Test
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, toRaw } from 'vue' // Added toRaw
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAssistantsStore } from '@/stores/assistantsStore'
import { useConversationStore } from '@/stores/conversationStore'
import AssistantCreator from '@/components/AssistantCreator.vue'
import ChatView from '@/views/ChatView.vue'

const router = useRouter()
const assistantsStore = useAssistantsStore()
const conversationStore = useConversationStore()
const { assistants } = storeToRefs(assistantsStore) // isLoading and error refs from assistantsStore

const showCreatorModal = ref(false)
const isTestModalVisible = ref(false)
const assistantBeingTested = ref(null)
const isLoading = ref(false) // Local loading for this view, if needed, distinct from store's
const error = ref(null) // Local error for this view
const avatarLoadError = ref({})

onMounted(() => {
  avatarLoadError.value = {}
  // If assistants are not loaded, you might want to trigger a load here,
  // though typically the store handles its own initialization.
  // Example: if (!assistantsStore.isStoreInitialized) assistantsStore.initializeStore();
})

// --- Avatar Helper Functions ---
const handleAvatarError = (assistantId) => {
  if (!assistantId) return
  console.warn(`[AssistantsView] Avatar image failed to load for assistant ID: ${assistantId}`)
  avatarLoadError.value[assistantId] = true
}

const getInitials = (name) => {
  return name ? name.trim().charAt(0).toUpperCase() : '?'
}

const getPlaceholderStyle = (assistant) => {
  return assistant?.color ? { backgroundColor: assistant.color } : {}
}
// --- End Avatar Helper Functions ---

const startCreateAssistant = () => {
  showCreatorModal.value = true
}
const closeCreatorModal = () => {
  showCreatorModal.value = false
  // Ensure test mode is cleared if a creation process was cancelled
  // and it somehow entered test mode (though unlikely from here)
  if (conversationStore.isCurrentSessionTestMode) {
    conversationStore.clearTestModeAssistantConfig()
  }
}

// MODIFIED: openTestModal to correctly set test mode in conversationStore
const openTestModal = (assistant) => {
  if (!assistant || !assistant.id) {
    console.error('[AssistantsView] Attempted to test an invalid assistant object:', assistant)
    alert('Cannot test this assistant: Invalid data.')
    return
  }

  // Fetch the full, reactive assistant configuration from the store
  // This ensures we have the most up-to-date version, including instructions, model, etc.
  const fullAssistantConfig = assistantsStore.getAssistantById(assistant.id)

  if (!fullAssistantConfig) {
    console.error(
      `[AssistantsView] Could not find full assistant config for ID: ${assistant.id} in assistantsStore.`,
    )
    alert('Error: Could not load complete assistant configuration for testing.')
    return
  }

  console.log(
    '[AssistantsView] Opening test modal for assistant:',
    fullAssistantConfig.name,
    fullAssistantConfig.id,
  )

  // Set the test mode in the conversation store using the *full assistant configuration*
  // Pass a raw (non-reactive) copy to avoid potential reactivity issues across stores/composables
  // if the original object in assistantsStore is modified while testing.
  conversationStore.setTestModeAssistantConfig(toRaw(fullAssistantConfig))

  assistantBeingTested.value = fullAssistantConfig // Store the config for the modal header and ChatView props
  isTestModalVisible.value = true
}

// MODIFIED: closeTestModal to correctly clear test mode from conversationStore
const closeTestModal = () => {
  console.log('[AssistantsView] Closing test modal.')
  isTestModalVisible.value = false
  assistantBeingTested.value = null

  // Crucially, clear the test mode configuration from the conversation store
  // so that normal chat operations resume correctly.
  conversationStore.clearTestModeAssistantConfig()
}

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A'
  try {
    const d = new Date(timestamp)
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch (_error) {
    console.error('Error formatting timestamp:', _error)
    return 'Date Error'
  }
}
const editAssistant = (assistant) => {
  if (!assistant?.id) return
  // Before navigating to edit, ensure any active test mode (especially for this assistant) is cleared.
  if (isTestModalVisible.value && assistantBeingTested.value?.id === assistant.id) {
    closeTestModal() // This will also clearTestModeAssistantConfig
  } else if (conversationStore.isCurrentSessionTestMode) {
    // If some other test mode is active, or if the modal wasn't closed properly
    conversationStore.clearTestModeAssistantConfig()
  }
  router.push({ name: 'assistant-edit', params: { id: assistant.id } })
}

const editAssistantFromTest = () => {
  if (assistantBeingTested.value) {
    // The editAssistant function already handles closing the modal and clearing test mode.
    editAssistant(assistantBeingTested.value)
  }
}

const confirmDeleteAssistant = async (assistant) => {
  if (!assistant?.id) return
  const assistantName = assistant.name || 'this assistant'
  if (window.confirm(`Are you sure you want to delete the assistant "${assistantName}"?`)) {
    let deleteMemoriesToo = false
    if (assistant.id !== conversationStore.MAIN_CHAT_ID) {
      deleteMemoriesToo = window.confirm(
        `Also delete all conversation memories associated with "${assistantName}"? \n\n(Click OK to delete memories, Cancel to keep them)`,
      )
    } else {
      console.warn('[AssistantsView] Attempted to delete MAIN_CHAT_ID assistant definition.')
      alert('Cannot delete the main Nb4U-Ai assistant definition.')
      return
    }

    console.log(
      `User chose to delete assistant ${assistant.id}. Delete memories: ${deleteMemoriesToo}`,
    )
    try {
      if (deleteMemoriesToo) {
        console.log(`Deleting memories for session ID: ${assistant.id}`)
        await conversationStore.deleteMemoriesForSession(assistant.id)
      }
      console.log(`Deleting assistant definition for ID: ${assistant.id}`)
      const success = assistantsStore.deleteAssistant(assistant.id) // This should be synchronous or return a promise
      if (!success) {
        // Assuming deleteAssistant returns a boolean for success
        console.error(`assistantsStore.deleteAssistant failed for ID: ${assistant.id}`)
        alert(`Failed to delete assistant definition "${assistantName}".`)
      } else {
        console.log(`Assistant ${assistant.id} definition deleted.`)
        if (isTestModalVisible.value && assistantBeingTested.value?.id === assistant.id) {
          closeTestModal() // This will also clear test mode config
        }
      }
    } catch (err) {
      console.error(`Error during deletion process for assistant ${assistant.id}:`, err)
      alert(`An error occurred deleting "${assistantName}". Check console for details.`)
    }
  } else {
    console.log(`User cancelled deletion for assistant ${assistant.id}.`)
  }
}

const startChatWithAssistant = (assistant) => {
  if (!assistant || !assistant.id) {
    alert('Could not start chat. Invalid assistant data.')
    return
  }
  console.log('[AssistantsView] Starting chat with assistant:', assistant.name, assistant.id)
  try {
    // Ensure any active test mode is cleared before starting a normal chat.
    if (conversationStore.isCurrentSessionTestMode) {
      conversationStore.clearTestModeAssistantConfig()
    }
    conversationStore.setActiveSession(assistant.id) // This sets up for normal chat
    router.push({ name: 'chat' })
  } catch (error) {
    console.error('[AssistantsView] Error setting active session or navigating:', error)
    alert(
      `Failed to start chat with ${assistant.name || 'assistant'}. Please check the console for errors.`,
    )
  }
}
</script>

<style scoped>
/* Base View */
.assistants-view {
  padding: 1.5rem 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background-color: #101010;
  color: var(--text-primary);
  position: relative;
}

/* Header */
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
  /* Primary action outline style */
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border-width: 2px;
  border-style: solid;
  border-color: var(--accent-color-primary);
  background-color: transparent;
  color: white;
  font-family: sans-serif;
  font-size: 0.9em;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  white-space: nowrap;
}
.create-button:hover {
  background-color: color-mix(in srgb, var(--accent-color-primary) 20%, transparent);
}

/* List Container */
.assistants-list-container {
  flex-grow: 1;
  overflow-y: auto; /* Make sure list container scrolls if needed */
  padding-right: 5px; /* Space for scrollbar */
  min-height: 100px; /* Ensure it has some height */
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: var(--accent-color-primary) var(--bg-sidebar); /* Firefox */
}
/* Webkit Scrollbar Styles */
.assistants-list-container::-webkit-scrollbar {
  width: 8px;
}
.assistants-list-container::-webkit-scrollbar-track {
  background: var(--bg-sidebar);
  border-radius: 4px;
}
.assistants-list-container::-webkit-scrollbar-thumb {
  background-color: var(--accent-color-primary);
  border-radius: 4px;
  border: 2px solid var(--bg-sidebar);
}
.assistants-list-container::-webkit-scrollbar-thumb:hover {
  background-color: var(--accent-color-secondary);
}

.assistants-list-container h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #dcdcdc;
  font-size: 1.1em;
  font-weight: 500;
}
.assistants-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* List Item */
.assistant-item {
  display: flex;
  align-items: center;
  padding: 0.7rem 1rem;
  margin-bottom: 0.75rem;
  background-color: #1c1c1c;
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
  gap: 1rem;
  cursor: pointer;
}
.assistant-item:hover {
  border-color: var(--accent-color-primary);
  background-color: #2a2a2a;
}

/* Avatar */
.assistant-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  background-color: var(--bg-sidebar); /* Fallback */
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color-light);
  position: relative;
  overflow: hidden;
}
.assistant-avatar::after {
  /* Ripple */
  content: '';
  position: absolute;
  top: -3px;
  left: -3px;
  right: -3px;
  bottom: -3px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--accent-color-primary, #42b983) 50%, transparent);
  opacity: 0;
  animation: ripplePulse 2.5s infinite ease-out;
  pointer-events: none;
  z-index: 0;
}
.assistant-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  position: relative;
  z-index: 1;
  border-radius: 50%;
}
.assistant-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4em;
  font-weight: 600;
  color: #dcdcdc;
  background-color: var(--bg-sidebar); /* Default bg, overridden by :style */
  border-radius: 50%;
  user-select: none;
  position: relative;
  z-index: 1;
}

/* Info Section */
.assistant-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex-grow: 1;
  overflow: hidden; /* Prevent long text overflowing */
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

/* Action Buttons Container */
.assistant-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* Outline Button Styles */
.action-button {
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border-width: 2px;
  border-style: solid;
  border-color: transparent; /* Base border color */
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
  box-shadow: none; /* Remove default shadow */
}
.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: var(--border-color-medium); /* Use medium border for disabled */
  background-color: transparent;
  color: var(--text-disabled, #888);
}
/* Specific Outline Colors */
.edit-button {
  border-color: var(--accent-color-primary);
} /* Edit = Green */
.test-button {
  border-color: #ffc107;
} /* Test = Yellow */
.delete-button {
  border-color: #e53e3e;
} /* Delete = Red */
.save-button {
  border-color: var(--accent-color-primary);
} /* Save = Green */
.cancel-button {
  border-color: var(--border-color-medium);
} /* Cancel / Close Test = Gray */

/* Hover Effects - Fill background */
.action-button:hover:not(:disabled) {
  color: white;
}
.edit-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--accent-color-primary) 20%, transparent);
}
.test-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, #ffc107 20%, transparent);
}
.delete-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, #e53e3e 20%, transparent);
}
.save-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--accent-color-primary) 20%, transparent);
}
.cancel-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--border-color-medium) 20%, transparent);
}

/* Placeholders & Messages */
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
  background-color: color-mix(in srgb, #101010 50%, var(--bg-input-field));
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
  align-items: center;
  padding: 0.8rem 1rem;
  margin-bottom: 0.75rem;
  border: 1px dashed var(--border-color-error);
  background-color: var(--bg-message-error);
  border-radius: 8px;
  display: flex;
  cursor: default;
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
.creator-modal > :deep(.assistant-creator) {
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: hidden; /* Let AssistantCreator handle its own scroll */
  cursor: default;
  box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
  padding: 0; /* Remove padding if AssistantCreator has its own */
  display: flex; /* Added */
  flex-direction: column; /* Added */
  background-color: var(--bg-main-content); /* Ensure this is set */
  border-radius: 8px; /* Ensure this is set */
}
.test-modal .test-modal-content {
  max-width: 90vw;
  width: 800px; /* Or your preferred width */
  max-height: 90vh;
  background-color: var(--bg-modal, var(--bg-main-content));
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Important for internal scrolling of chat area */
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
  flex-shrink: 0; /* Prevent header from shrinking */
}
.test-modal .test-modal-header h3 {
  margin: 0;
  font-size: 1.1em;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  flex-grow: 1; /* Allow chat area to take available space */
  overflow-y: hidden; /* ChatView should handle its own scrolling */
  display: flex; /* Make ChatView fill this area */
}
.test-modal .test-modal-chat-area > :deep(.chat-view) {
  height: 100%; /* Ensure ChatView takes full height of its container */
  width: 100%; /* Ensure ChatView takes full width */
  border-radius: 0; /* Remove any border radius from ChatView itself if modal has one */
}
.test-modal .test-modal-footer {
  padding: 0.75rem 1.5rem;
  background-color: var(--bg-input-area, #1a1a1a);
  border-top: 1px solid var(--border-color-medium, #333);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-shrink: 0; /* Prevent footer from shrinking */
}

/* Keyframes */
@keyframes ripplePulse {
  0% {
    transform: scale(0.95);
    opacity: 0.6;
    border-width: 1px;
    border-color: color-mix(in srgb, var(--accent-color-primary, #42b983) 60%, transparent);
  }
  70% {
    transform: scale(1.4);
    opacity: 0;
    border-width: 1px;
    border-color: color-mix(in srgb, var(--accent-color-primary, #42b983) 40%, transparent);
  }
  100% {
    transform: scale(0.95);
    opacity: 0;
    border-width: 1px;
  }
}
</style>
