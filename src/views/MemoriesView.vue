<template>
  <div class="memories-view">
    <h1>Conversation Memories</h1>
    <p>
      This area will display your saved conversation sessions for both the main chat and individual
      assistants.
    </p>

    <div class="session-list-placeholder">
      <p>Loading sessions...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useConversationStore } from '@/stores/conversationStore' // Path relative to src/views/

const conversationStore = useConversationStore()

// Example: Get session IDs for future use
const sessionIds = computed(() => conversationStore.getAllSessionIds)

onMounted(() => {
  console.log('MemoriesView mounted.')
  console.log('Available session IDs:', sessionIds.value)
  // TODO: Fetch and display session details
})

// TODO: Add methods for selecting/viewing/deleting sessions
</script>

<style scoped>
.memories-view {
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
  color: var(--text-primary); /* Assuming you have CSS variables set up */
  background-color: var(--bg-main-content);
}

h1 {
  color: var(--accent-color-primary); /* Example styling */
  margin-bottom: 1rem;
}

.session-list-placeholder {
  margin-top: 2rem;
  padding: 1rem;
  border: 1px dashed var(--border-color-medium);
  border-radius: 8px;
  background-color: var(--bg-input-area);
  color: var(--text-secondary);
}
</style>
