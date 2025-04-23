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
                v-if="assistant.imageUrl"
                :src="assistant.imageUrl"
                :alt="`${assistant.name || 'Assistant'} avatar`"
                @error.stop="onImageError($event, assistant.id)"
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
              <button @click.stop="openTestModal(assistant)" title="Test this Assistant">
                Test
              </button>
              <button @click.stop="editAssistant(assistant)" title="Edit Assistant Settings">
                Edit
              </button>
              <button
                @click.stop="confirmDeleteAssistant(assistant)"
                title="Delete Assistant"
                class="delete-button"
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
import { useConversationStore } from '@/stores/conversationStore' // Import conversation store
// Ensure component paths are correct
import AssistantCreator from '@/components/AssistantCreator.vue'
import ChatView from '@/views/ChatView.vue' // Assuming ChatView can handle an optional assistant config

// --- Router ---
const router = useRouter()

// --- Store Setup ---
const assistantsStore = useAssistantsStore()
const { assistants } = storeToRefs(assistantsStore)
const conversationStore = useConversationStore() // Instantiate conversation store

// --- Component State ---
const showCreatorModal = ref(false)
const isTestModalVisible = ref(false)
const assistantBeingTested = ref(null)
const isLoading = ref(false) // Assume you might add loading state later
const error = ref(null) // Assume you might add error handling later

// --- Lifecycle Hooks ---
onMounted(() => {
  // Optionally fetch assistants if not already loaded, or just log
  console.log('[AssistantsView] Mounted. Displaying assistants from store:', assistants.value)
  // TODO: Consider adding fetch logic here if assistants aren't loaded automatically
})

// --- Creator Modal Control ---
const startCreateAssistant = () => {
  showCreatorModal.value = true
}
// This function is now also called when 'assistant-created' event is emitted from AssistantCreator
const closeCreatorModal = () => {
  showCreatorModal.value = false
  // Optional: Refetch or update assistant list if needed after creation
}

// --- Test Chat Modal Control ---
const openTestModal = (assistant) => {
  if (!assistant || !assistant.id) {
    // Add ID check
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
  if (!timestamp) return 'N/A' // Provide fallback
  try {
    const date = new Date(timestamp)
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('[AssistantsView] Invalid timestamp received:', timestamp)
      return 'Invalid Date'
    }
    // Use locale-specific date format
    return date.toLocaleDateString(undefined, {
      // Use user's locale
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch (e) {
    console.error('[AssistantsView] Error formatting timestamp:', timestamp, e)
    return 'Date Error' // Indicate an error occurred
  }
}

// --- Assistant Actions ---

// Navigate to the edit route for a specific assistant
const editAssistant = (assistant) => {
  if (!assistant || !assistant.id) {
    console.error('[AssistantsView] Invalid assistant data passed to editAssistant:', assistant)
    return
  }
  console.log('[AssistantsView] Navigating to edit assistant:', assistant.name, assistant.id)
  router.push({ name: 'assistant-edit', params: { id: assistant.id } }) // Ensure route name is correct

  // Close test modal if editing the assistant currently being tested
  if (isTestModalVisible.value && assistantBeingTested.value?.id === assistant.id) {
    closeTestModal()
  }
}

// Edit button action within the test modal
const editAssistantFromTest = () => {
  if (assistantBeingTested.value) {
    editAssistant(assistantBeingTested.value)
  } else {
    console.warn('[AssistantsView] Edit from test clicked but no assistant was being tested.')
  }
}

// Confirm and delete an assistant
const confirmDeleteAssistant = (assistant) => {
  if (!assistant || !assistant.id) {
    console.error(
      '[AssistantsView] Invalid assistant data passed to confirmDeleteAssistant:',
      assistant,
    )
    return
  }
  // Use a more user-friendly confirmation dialog
  if (
    window.confirm(
      `Are you sure you want to delete the assistant "${assistant.name || 'this assistant'}"? This action cannot be undone.`,
    )
  ) {
    console.log('[AssistantsView] Attempting to delete assistant:', assistant.name, assistant.id)
    try {
      // Assuming deleteAssistant potentially throws an error or returns success/failure
      const success = assistantsStore.deleteAssistant(assistant.id) // Ensure this method exists and handles state update
      if (!success) {
        // Provide more specific feedback if possible
        alert(
          `Failed to delete assistant "${assistant.name || 'this assistant'}". Please check the console for details.`,
        )
      } else {
        console.log(`[AssistantsView] Assistant ${assistant.id} deleted successfully.`)
        // Optional: Add a user notification confirming deletion
      }
    } catch (err) {
      console.error(`[AssistantsView] Error deleting assistant ${assistant.id}:`, err)
      alert(`An error occurred while trying to delete "${assistant.name || 'this assistant'}".`)
    }
  }
}

/**
 * Handles errors when loading an assistant's image.
 * Prevents the browser's default broken image icon and shows the placeholder.
 * Stops the event propagation.
 */
const onImageError = (event, assistantId) => {
  // event.stopPropagation(); // Handled by .stop modifier now

  const imgElement = event.target
  if (!imgElement || imgElement.tagName !== 'IMG') return

  console.warn(
    `[AssistantsView] Assistant image failed to load for ID ${assistantId}:`,
    imgElement.src,
  )

  // Hide the broken image element itself
  imgElement.style.display = 'none'

  // Find the parent avatar container
  const avatarContainer = imgElement.closest('.assistant-avatar')
  if (avatarContainer) {
    // Find the placeholder div within the container
    const placeholder = avatarContainer.querySelector('.assistant-placeholder')
    if (placeholder) {
      // Make the placeholder visible (ensure it's styled for display: flex)
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

/**
 * Starts a new chat session with the selected assistant and navigates to the main chat view.
 * This is triggered by clicking the main list item.
 */
const startChatWithAssistant = (assistant) => {
  // No need for event.stopPropagation() due to @click.stop on inner buttons

  if (!assistant || !assistant.id) {
    console.error(
      '[AssistantsView] Invalid assistant data passed to startChatWithAssistant:',
      assistant,
    )
    alert('Could not start chat. Invalid assistant data.') // User feedback
    return
  }
  console.log('[AssistantsView] Starting chat with assistant:', assistant.name, assistant.id)

  try {
    // Set the active session in the store
    conversationStore.setActiveSession(assistant.id)

    // *** CORRECTED NAVIGATION ***
    // Navigate to the chat view using its NAME ('chat') instead of path
    router.push({ name: 'chat' })
  } catch (error) {
    // Catch potential errors during session activation or navigation
    console.error('[AssistantsView] Error setting active session or navigating:', error)
    alert(
      `Failed to start chat with ${assistant.name || 'assistant'}. Please check the console for errors.`,
    ) // User feedback
  }
}
</script>

<style scoped>
/* Styles should be identical to the previous correct version */
/* --- Base View --- */
.assistants-view {
  padding: 1.5rem 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* Scroll main view if content overflows */
  background-color: var(--bg-main-content);
  color: var(--text-primary);
  position: relative; /* For potential absolute positioning of children */
}

/* --- Header --- */
.assistants-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color-medium);
  flex-shrink: 0; /* Prevent header from shrinking */
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
  white-space: nowrap; /* Prevent text wrapping */
}
.create-button:hover {
  background-color: var(--bg-button-primary-hover);
}

/* --- List Container --- */
.assistants-list-container {
  flex-grow: 1; /* Allow list to take remaining space */
  overflow-y: auto; /* Enable scrolling for the list only */
  padding-right: 5px; /* Small space for scrollbar, adjust as needed */
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

/* --- List Item --- */
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
  gap: 1rem; /* Space between avatar, info, actions */
  cursor: pointer; /* Make the whole item indicate clickability */
}
.assistant-item:hover {
  border-color: var(--accent-color-primary);
  background-color: color-mix(
    in srgb,
    var(--bg-input-field) 90%,
    var(--bg-app-container)
  ); /* Subtle hover background */
}

/* --- Avatar --- */
.assistant-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0; /* Prevent avatar resizing */
  border-radius: 50%; /* Circular avatar */
  overflow: hidden; /* Crucial for image shape */
  background-color: var(--bg-sidebar); /* Fallback background */
  display: flex; /* Center placeholder text/icon */
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color-light);
  position: relative; /* Needed if using absolute positioning inside */
}
.assistant-image {
  width: 100%;
  height: 100%;
  object-fit: cover; /* Cover the area, might crop image */
  display: block; /* Remove potential extra space below image */
}
.assistant-placeholder {
  /* Styles for when image fails or isn't present */
  width: 100%;
  height: 100%;
  display: flex; /* Initially shown if no image URL */
  align-items: center;
  justify-content: center;
  font-size: 1.4em;
  font-weight: 600;
  color: var(--text-secondary);
  background-color: var(--bg-sidebar); /* Match avatar background */
  border-radius: 50%; /* Match avatar shape */
  user-select: none; /* Prevent text selection */
  -webkit-user-select: none;
  /* Ensure this is displayed by default if no image is loaded */
  /* If image fails, onImageError handler will ensure display:flex */
}

/* --- Info Section --- */
.assistant-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem; /* Small gap between name and detail */
  flex-grow: 1; /* Allow info section to take up available space */
  overflow: hidden; /* Prevent text overflow issues */
  /* Clicks on this area should trigger the main item click */
}
.assistant-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1.05em;
  white-space: nowrap; /* Prevent wrapping */
  overflow: hidden; /* Hide overflow */
  text-overflow: ellipsis; /* Add '...' for long names */
}
.assistant-detail {
  font-size: 0.8em;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* --- Action Buttons --- */
.assistant-actions {
  display: flex;
  gap: 0.5rem; /* Space between buttons */
  flex-shrink: 0; /* Prevent buttons wrapping */
}
.assistant-actions button {
  padding: 0.3rem 0.7rem;
  font-size: 0.8em;
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  border: none;
  border-radius: 4px;
  cursor: pointer; /* Keep cursor pointer for buttons */
  transition: background-color 0.2s ease;
  white-space: nowrap; /* Prevent button text wrapping */
}
.assistant-actions button:hover {
  background-color: var(--bg-button-secondary-hover);
}
.delete-button {
  background-color: var(--bg-button-danger, #8c1c13); /* Use CSS variable if defined */
  color: var(--text-button-danger, white);
}
.delete-button:hover {
  background-color: var(--bg-button-danger-hover, #a82d22);
}

/* --- Placeholders & Messages --- */
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
  /* Style for the div used when assistant data is invalid */
  color: var(--text-error);
  font-style: italic;
  justify-content: center; /* Center the text */
  align-items: center;
  padding: 0.8rem 1rem; /* Match item padding */
  margin-bottom: 0.75rem; /* Match item margin */
  border: 1px dashed var(--border-color-error); /* Distinct border */
  background-color: var(--bg-message-error);
  border-radius: 8px;
  display: flex; /* Needed for justify/align */
  cursor: default; /* Don't make invalid items clickable */
}

/* --- Modal Styles --- */
/* Base Overlay */
.modal-overlay {
  position: fixed; /* Cover the whole viewport */
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7); /* Darker semi-transparent background */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; /* Ensure it's on top of other content */
  padding: 1rem; /* Padding around the modal content */
  box-sizing: border-box;
  cursor: pointer; /* Indicate clicking outside closes */
}

/* Creator Modal Specific Container */
/* Selects the AssistantCreator component rendered inside .creator-modal */
.creator-modal > :deep(.assistant-creator) {
  max-width: 700px; /* Max width for the creator form */
  width: 100%; /* Responsive width */
  max-height: 90vh; /* Limit height to avoid overflow */
  overflow-y: hidden; /* Let internal component handle its own scroll */
  cursor: default; /* Prevent closing when clicking inside the creator */
  box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
  padding: 0; /* Remove padding if AssistantCreator component handles it internally */
  display: flex; /* Ensure component takes structure */
  flex-direction: column;
  background-color: var(--bg-main-content); /* Ensure background matches theme */
  border-radius: 8px;
}

/* Test Modal Specific Content Box */
.test-modal .test-modal-content {
  max-width: 90vw; /* Responsive max width */
  width: 800px; /* Default width for test chat */
  max-height: 90vh; /* Responsive max height */
  background-color: var(--bg-modal, var(--bg-main-content)); /* Use variable or fallback */
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); /* More prominent shadow */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* CRUCIAL for containing scrolling chat view */
  cursor: default; /* Override overlay cursor */
}

/* Test Modal Header */
.test-modal .test-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background-color: var(--bg-header, #2a2a2a); /* Darker header background */
  color: var(--text-light, #fff);
  border-bottom: 1px solid var(--border-color-heavy, #444);
  flex-shrink: 0; /* Prevent header shrinking */
}
.test-modal .test-modal-header h3 {
  margin: 0;
  font-size: 1.1em;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis; /* Handle long assistant names */
}
.test-modal .close-modal-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5em;
  line-height: 1; /* Align '✖' better */
  padding: 0.2rem;
  cursor: pointer;
  transition: color 0.2s ease;
}
.test-modal .close-modal-button:hover {
  color: var(--text-primary);
}

/* Test Modal Chat Area */
.test-modal .test-modal-chat-area {
  flex-grow: 1; /* Take available vertical space */
  overflow-y: hidden; /* Parent handles modal overflow, ChatView should handle its internal scroll */
  display: flex; /* To make ChatView fill the space */
  /* Background can be set here if needed, or rely on ChatView's background */
  /* background-color: var(--bg-main-content); */
}
/* Style the ChatView component specifically when it's inside the test modal */
.test-modal .test-modal-chat-area > :deep(.chat-view) {
  height: 100%; /* Make ChatView fill the container height */
  width: 100%; /* Make ChatView fill the container width */
  border-radius: 0; /* Remove any border-radius it might have */
  /* Ensure ChatView has appropriate background and overflow handling */
}

/* Test Modal Footer */
.test-modal .test-modal-footer {
  padding: 0.75rem 1.5rem;
  background-color: var(--bg-input-area, #1a1a1a); /* Dark footer background */
  border-top: 1px solid var(--border-color-medium, #333);
  display: flex;
  justify-content: flex-end; /* Align buttons to the right */
  gap: 0.75rem;
  flex-shrink: 0; /* Prevent footer shrinking */
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
