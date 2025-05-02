<template>
  <div>
    <div class="user-profile-settings">
      <h4>My Details</h4>
      <p class="setting-description">Set your display name and avatar for the chat.</p>
      <div class="setting-item">
        <label for="user-display-name" class="setting-label">Display Name</label>
        <input
          type="text"
          id="user-display-name"
          class="settings-text-input"
          :value="userDisplayName"
          @input="updateDisplayName"
          placeholder="Enter your display name"
        />
        <button
          class="help-button neon-glow-effect-primary"
          @click="showHelp('Display Name', '...')"
          aria-label="Help with Display Name"
          title="Help with Display Name"
        >
          ?
        </button>
      </div>
      <div class="setting-item">
        <label class="setting-label">Avatar Picture</label>
        <div class="avatar-setting-controls">
          <img
            v-if="userAvatarUrl"
            :src="userAvatarUrl"
            alt="Current avatar"
            class="avatar-preview"
          />
          <div v-else class="avatar-placeholder-setting" title="No avatar set">?</div>
          <input
            type="file"
            ref="avatarInputRef"
            @change="handleAvatarFileChange"
            accept="image/png, image/jpeg, image/gif, image/webp"
            style="display: none"
          />
          <button @click="triggerAvatarInput" class="quick-setting-button">Choose Image</button>
          <button
            v-if="userAvatarUrl"
            @click="removeAvatar"
            class="quick-setting-button remove-button"
          >
            Remove
          </button>
          <p v-if="avatarError" class="error-text">{{ avatarError }}</p>
        </div>
        <button
          class="help-button neon-glow-effect-primary"
          @click="showHelp('Avatar Picture', '...')"
          aria-label="Help with Avatar Picture"
          title="Help with Avatar Picture"
        >
          ?
        </button>
      </div>
    </div>

    <div class="segment-management">
      <h4>My AI Context Segments</h4>
      <p class="setting-description">Add pieces of information about yourself...</p>
      <ul v-if="myAiContextSegments.length > 0" class="segment-list">
        <li v-for="(segment, _index) in myAiContextSegments" :key="_index" class="segment-item">
          <span class="segment-text">{{ segment }}</span>
          <button
            @click="deleteSegment(_index)"
            class="delete-segment-button"
            title="Delete segment"
            aria-label="Delete segment"
          >
            ✖
          </button>
        </li>
      </ul>
      <p v-else class="no-segments-message">No context segments added yet.</p>
      <div class="add-segment-area">
        <textarea
          v-model="newSegmentText"
          class="settings-textarea"
          rows="2"
          placeholder="Enter a new context segment..."
          aria-label="New context segment input"
        ></textarea>
        <button
          @click="addSegment"
          class="quick-setting-button add-button"
          :disabled="!newSegmentText.trim()"
          title="Add new segment"
        >
          Add Segment
        </button>
      </div>
      <button
        class="help-button neon-glow-effect-primary overall-help"
        @click="showHelp('My AI Context Segments', '...')"
        aria-label="Help with My AI Context Segments"
        title="Help with My AI Context Segments"
      >
        ?
      </button>
    </div>

    <div
      class="advanced-toggle-header"
      @click="toggleAdvanced"
      tabindex="0"
      @keydown.enter.prevent="toggleAdvanced"
      @keydown.space.prevent="toggleAdvanced"
    >
      <h3>Context Application Settings</h3>
      <button
        class="advanced-arrow solid-glow-effect-primary"
        :class="{ expanded: isAdvancedVisible }"
        aria-label="Toggle Advanced Settings"
      >
        <svg>...</svg>
      </button>
    </div>
    <transition name="collapse">
      <div class="advanced-settings-section" v-show="isAdvancedVisible">
        <div class="setting-item">
          <label for="myai-apply-all-toggle" class="setting-label">
            Apply 'My AI' Context to All Assistants <span class="setting-description">...</span>
          </label>
          <div
            class="toggle-switch"
            id="myai-apply-all-toggle"
            role="switch"
            :aria-checked="myAiContextApplyToAll.toString()"
            @click="handleApplyToAllToggle"
            @keydown.enter="handleApplyToAllToggle"
            @keydown.space.prevent="handleApplyToAllToggle"
            tabindex="0"
            :title="`...`"
          >
            <div class="toggle-knob"></div>
          </div>
          <button
            class="help-button neon-glow-effect-primary"
            @click="showHelp('Apply Context to All', '...')"
            aria-label="Help with Apply Context to All"
            title="Help with Apply Context to All"
          >
            ?
          </button>
        </div>
        <div v-if="!myAiContextApplyToAll" class="assistant-allow-list">
          <h4>Allow Specific Assistants:</h4>
          <ul class="assistants-checkbox-list">
            <li class="assistant-checkbox-item">
              <input
                type="checkbox"
                id="allow-main_chat"
                :checked="myAiContextAllowedAssistantIds.has('main_chat')"
                @change="handleAllowedAssistantToggle('main_chat')"
              />
              <label for="allow-main_chat">Default AI (Nb4U-Ai)</label>
            </li>
            <li
              v-for="assistant in assistantList"
              :key="assistant.id"
              class="assistant-checkbox-item"
            >
              <input
                type="checkbox"
                :id="'allow-' + assistant.id"
                :checked="myAiContextAllowedAssistantIds.has(assistant.id)"
                @change="handleAllowedAssistantToggle(assistant.id)"
              />
              <label :for="'allow-' + assistant.id">{{ assistant.name }}</label>
            </li>
            <li v-if="assistantList.length === 0" class="no-custom-assistants-message">
              You haven't created any custom assistants yet.
            </li>
          </ul>
          <button
            class="help-button neon-glow-effect-primary list-help"
            @click="showHelp('Allow Specific Assistants', '...')"
            aria-label="Help with Allow Specific Assistants"
            title="Help with Allow Specific Assistants"
          >
            ?
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
// Script setup remains the same as Response #57
import { defineProps, ref, computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAssistantsStore } from '@/stores/assistantsStore'
import { storeToRefs } from 'pinia'

defineProps({ showHelp: { type: Function, required: true } })
const settingsStore = useSettingsStore()
const assistantsStore = useAssistantsStore()
const {
  userDisplayName,
  userAvatarUrl,
  myAiContextSegments,
  myAiContextApplyToAll,
  myAiContextAllowedAssistantIds,
} = storeToRefs(settingsStore)
const { assistants } = storeToRefs(assistantsStore)
const newSegmentText = ref('')
const isAdvancedVisible = ref(false)
const avatarInputRef = ref(null)
const avatarError = ref(null)
const assistantList = computed(() => assistants.value)
const addSegment = () => {
  if (newSegmentText.value.trim()) {
    settingsStore.addMyAiContextSegment(newSegmentText.value)
    newSegmentText.value = ''
  }
}
// Use index directly in deleteSegment call
const deleteSegment = (index) => {
  settingsStore.deleteMyAiContextSegment(index)
}
const toggleAdvanced = () => {
  isAdvancedVisible.value = !isAdvancedVisible.value
}
const handleApplyToAllToggle = () => {
  settingsStore.setMyAiContextApplyToAll(!myAiContextApplyToAll.value)
}
const handleAllowedAssistantToggle = (assistantId) => {
  settingsStore.toggleMyAiContextAllowedAssistant(assistantId)
}
const updateDisplayName = (event) => {
  settingsStore.setUserDisplayName(event.target.value)
}
const triggerAvatarInput = () => {
  avatarError.value = null
  avatarInputRef.value?.click()
}
const handleAvatarFileChange = (event) => {
  /* ... (validation, file reading, setUserAvatarUrl call) ... */
}
const removeAvatar = () => {
  settingsStore.setUserAvatarUrl(null)
  avatarError.value = null
  if (avatarInputRef.value) avatarInputRef.value.value = null
}
</script>

<style scoped>
/* Styles remain unchanged from Response #57 */
/* ... */
.setting-item {
  display: grid;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color-light);
  gap: 1rem;
}
.setting-item:last-child {
  border-bottom: none;
}
.setting-item:not(.wide-item) {
  grid-template-columns: 1fr auto auto;
}
.setting-label {
  display: flex;
  flex-direction: column;
  font-weight: 500;
  font-family: sans-serif;
  cursor: default;
  margin-right: 1rem;
  line-height: 1.3;
}
.setting-description {
  font-size: 0.8em;
  color: var(--text-secondary);
  font-weight: 400;
  margin-top: 0.2rem;
  white-space: normal;
}
.settings-textarea,
.quick-setting-button,
.help-button,
.toggle-switch,
.assistant-allow-list {
  justify-self: end;
}
.add-segment-area {
  grid-column: 1 / -1;
}
.settings-textarea {
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--border-color-medium);
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  font-family: sans-serif;
  font-size: 0.9em;
  flex-shrink: 0;
  min-width: 100px;
  max-width: 100%;
  box-sizing: border-box;
  resize: vertical;
}
.settings-textarea:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.add-segment-area .settings-textarea {
  min-height: calc(1.4em * 2 + 0.8rem);
}
.quick-setting-button {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--border-color-medium);
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  font-family: sans-serif;
  font-size: 0.9em;
  flex-shrink: 0;
  box-sizing: border-box;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
  min-width: 100px;
  max-width: 200px;
}
.quick-setting-button.add-button {
  background-color: var(--accent-color-primary);
  color: var(--text-light);
  border-color: var(--accent-color-primary);
  margin-left: auto;
  margin-top: 0.5rem;
}
.quick-setting-button.add-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--accent-color-primary) 85%, black);
  border-color: color-mix(in srgb, var(--accent-color-primary) 85%, black);
}
.quick-setting-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-button-secondary) 50%, var(--bg-main-content));
}
.quick-setting-button.add-button:disabled {
  background-color: color-mix(in srgb, var(--accent-color-primary) 50%, var(--bg-main-content));
}
.help-button.overall-help {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
}
.segment-management {
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  position: relative;
}
.segment-management h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-weight: 600;
}
.segment-management > .setting-description {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color-light);
}
.segment-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem 0;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-color-light);
  border-radius: 4px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent-color-primary) 60%, var(--bg-sidebar))
    var(--bg-sidebar);
}
.segment-list::-webkit-scrollbar {
  width: 8px;
}
.segment-list::-webkit-scrollbar-track {
  background: var(--bg-sidebar);
  border-radius: 4px;
}
.segment-list::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--accent-color-primary) 60%, var(--bg-sidebar));
  border-radius: 4px;
  border: 2px solid var(--bg-sidebar);
}
.segment-list::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(in srgb, var(--accent-color-primary) 80%, var(--bg-sidebar));
}
.segment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border-color-light);
  gap: 0.5rem;
}
.segment-item:last-child {
  border-bottom: none;
}
.segment-text {
  flex-grow: 1;
  font-size: 0.9em;
  word-break: break-word;
}
.delete-segment-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.2em;
  padding: 0.2rem;
  line-height: 1;
  flex-shrink: 0;
}
.delete-segment-button:hover {
  color: var(--bg-error, #a04040);
}
.no-segments-message {
  font-style: italic;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  text-align: center;
  padding: 1rem;
}
.add-segment-area {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-end;
  margin-top: 1rem;
}
.add-segment-area .settings-textarea {
  width: 100%;
  max-width: none;
}
.advanced-toggle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 0.5rem;
  margin-top: 1rem;
  background-color: var(--bg-input-area);
  border: 1px solid var(--border-color-light);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  outline: none;
}
.advanced-toggle-header:hover {
  background-color: var(--bg-button-secondary-hover);
}
.advanced-toggle-header:focus-visible {
  border-color: var(--accent-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.advanced-toggle-header h3 {
  margin: 0;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.95em;
  -webkit-user-select: none;
  user-select: none;
}
.advanced-settings-section {
  padding: 0 1rem;
  border: 1px solid var(--border-color-light);
  border-top: none;
  border-radius: 0 0 6px 6px;
  margin-bottom: 1rem;
  background-color: var(--bg-main-content);
  overflow: hidden;
}
.advanced-settings-section .setting-item {
  padding-left: 0;
  padding-right: 0;
}
.advanced-settings-section .setting-item:first-child {
  padding-top: 1rem;
}
.advanced-settings-section .setting-item:last-child {
  border-bottom: none;
  padding-bottom: 1rem;
}
.assistant-allow-list {
  padding: 1rem 0 0 0;
  margin-top: 1rem;
  border-top: 1px solid var(--border-color-light);
  position: relative;
}
.assistant-allow-list h4 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-weight: 600;
  font-size: 0.9em;
  color: var(--text-secondary);
}
.assistants-checkbox-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem 0;
  max-height: 250px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent-color-primary) 60%, var(--bg-sidebar))
    var(--bg-sidebar);
}
.assistants-checkbox-list::-webkit-scrollbar {
  width: 8px;
}
.assistants-checkbox-list::-webkit-scrollbar-track {
  background: var(--bg-sidebar);
  border-radius: 4px;
}
.assistants-checkbox-list::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--accent-color-primary) 60%, var(--bg-sidebar));
  border-radius: 4px;
  border: 2px solid var(--bg-sidebar);
}
.assistants-checkbox-list::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(in srgb, var(--accent-color-primary) 80%, var(--bg-sidebar));
}
.assistant-checkbox-item {
  display: flex;
  align-items: center;
  padding: 0.4rem 0;
  gap: 0.75rem;
}
.assistant-checkbox-item input[type='checkbox'] {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  accent-color: var(--accent-color-primary);
  cursor: pointer;
  margin: 0;
}
.assistant-checkbox-item label {
  font-size: 0.9em;
  cursor: pointer;
  -webkit-user-select: none;
  user-select: none;
}
.no-custom-assistants-message {
  font-style: italic;
  color: var(--text-secondary);
  padding: 0.4rem 0;
}
.assistant-allow-list .list-help {
  position: absolute;
  top: 0.75rem;
  right: 0;
}
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease-in-out;
  max-height: 800px;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-width: 0;
  margin-top: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 800px;
}
.user-profile-settings {
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
}
.user-profile-settings h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-weight: 600;
}
.user-profile-settings > .setting-description {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color-light);
}
.user-profile-settings .setting-item {
  grid-template-columns: minmax(100px, auto) 1fr auto;
  padding: 1rem 0;
}
.settings-text-input {
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--border-color-medium);
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  font-family: sans-serif;
  font-size: 0.9em;
  width: 100%;
  max-width: 400px;
  box-sizing: border-box;
}
.settings-text-input:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.avatar-setting-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-self: start;
}
.avatar-preview {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-color-medium);
  background-color: var(--bg-input-field);
}
.avatar-placeholder-setting {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--bg-button-secondary);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5em;
  font-weight: bold;
  border: 1px solid var(--border-color-medium);
}
.avatar-setting-controls .quick-setting-button {
  padding: 0.4rem 0.8rem;
  font-size: 0.85em;
  min-width: auto;
}
.avatar-setting-controls .remove-button {
  background-color: var(--bg-error-secondary, #5c3b3b);
  border-color: var(--bg-error-secondary, #5c3b3b);
  color: var(--text-light);
}
.avatar-setting-controls .remove-button:hover {
  background-color: var(--bg-error, #a04040);
  border-color: var(--bg-error, #a04040);
}
.error-text {
  color: var(--text-error);
  font-size: 0.8em;
  margin-left: 1rem;
}
</style>
