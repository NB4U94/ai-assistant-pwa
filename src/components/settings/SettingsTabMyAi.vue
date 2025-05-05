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
          @click="props.showHelp('Display Name', 'This name will be shown when you send messages.')"
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
          @click="
            props.showHelp(
              'Avatar Picture',
              'Upload an image (PNG, JPG, GIF, WEBP) to use as your chat avatar. Max 1MB.',
            )
          "
          aria-label="Help with Avatar Picture"
          title="Help with Avatar Picture"
        >
          ?
        </button>
      </div>
    </div>

    <div class="segment-management">
      <h4>My AI Context Segments</h4>
      <p class="setting-description">
        Add pieces of information about yourself (e.g., interests, profession, location) that the AI
        can use to personalize its responses. This context is sent along with your chat history.
      </p>
      <ul v-if="myAiContextSegments.length > 0" class="segment-list">
        <li v-for="(segment, index) in myAiContextSegments" :key="index" class="segment-item">
          <span class="segment-text">{{ segment }}</span>
          <button
            @click="deleteSegment(index)"
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
          placeholder="Enter a new context segment (e.g., 'I live in Brisbane and work as a web developer.')"
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
        @click="
          props.showHelp(
            'My AI Context Segments',
            'Provide specific facts or preferences about yourself. The AI will consider this information when generating replies. Manage which assistants use this context below.',
          )
        "
        aria-label="Help with My AI Context Segments"
        title="Help with My AI Context Segments"
      >
        ?
      </button>
    </div>

    <div
      class="advanced-toggle-header"
      @click="settingsStore.toggleSettingsTabAdvancedVisible(tabId)"
      tabindex="0"
      @keydown.enter.prevent="settingsStore.toggleSettingsTabAdvancedVisible(tabId)"
      @keydown.space.prevent="settingsStore.toggleSettingsTabAdvancedVisible(tabId)"
    >
      <h3>Context Application Settings</h3>
      <button
        class="advanced-arrow solid-glow-effect-primary"
        :class="{ expanded: isAdvancedVisible }"
        aria-label="Toggle Context Application Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          width="20px"
          height="20px"
        >
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
        </svg>
      </button>
    </div>
    <transition name="collapse">
      <div class="advanced-settings-section" v-show="isAdvancedVisible">
        <div class="setting-item">
          <label for="myai-apply-all-toggle" class="setting-label">
            Apply 'My AI' Context to All Assistants
            <span class="setting-description"
              >If enabled, the context segments above will be sent to all assistants. If disabled,
              you can select specific assistants below.</span
            >
          </label>
          <div
            :class="['toggle-switch', { active: myAiContextApplyToAll }]"
            id="myai-apply-all-toggle"
            role="switch"
            :aria-checked="myAiContextApplyToAll.toString()"
            @click="handleApplyToAllToggle"
            @keydown.enter="handleApplyToAllToggle"
            @keydown.space.prevent="handleApplyToAllToggle"
            tabindex="0"
            :title="`Apply context to ${myAiContextApplyToAll ? 'SELECTED assistants only' : 'ALL assistants'}`"
          >
            <div class="toggle-knob"></div>
          </div>
          <button
            class="help-button neon-glow-effect-primary"
            @click="
              props.showHelp(
                'Apply Context to All',
                'Enable this to automatically include your context segments in conversations with every assistant. Disable it to choose specific assistants below.',
              )
            "
            aria-label="Help with Apply Context to All"
            title="Help with Apply Context to All"
          >
            ?
          </button>
        </div>
        <div v-if="!myAiContextApplyToAll" class="assistant-allow-list setting-item wide-item">
          <label class="setting-label">Allow Specific Assistants:</label>
          <div class="exclusion-controls">
            <ul class="assistants-checkbox-list">
              <li class="assistant-checkbox-item">
                <input
                  type="checkbox"
                  :id="'allow-' + conversationStore.MAIN_CHAT_ID"
                  :checked="myAiContextAllowedAssistantIds.has(conversationStore.MAIN_CHAT_ID)"
                  @change="handleAllowedAssistantToggle(conversationStore.MAIN_CHAT_ID)"
                />
                <label :for="'allow-' + conversationStore.MAIN_CHAT_ID">Default AI (Nb4U-Ai)</label>
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
          </div>
          <button
            class="help-button neon-glow-effect-primary list-help"
            @click="
              props.showHelp(
                'Allow Specific Assistants',
                'Check the box next to each assistant that should receive your \'My AI\' context segments. Uncheck to exclude them.',
              )
            "
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
import { ref, computed, defineProps } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAssistantsStore } from '@/stores/assistantsStore'
import { useConversationStore } from '@/stores/conversationStore'
import { storeToRefs } from 'pinia'

// --- Props ---
const props = defineProps({ showHelp: { type: Function, required: true } })

// --- Stores ---
const settingsStore = useSettingsStore()
const assistantsStore = useAssistantsStore()
const conversationStore = useConversationStore()

// --- Reactive State from Stores ---
const {
  userDisplayName,
  userAvatarUrl,
  myAiContextSegments,
  myAiContextApplyToAll,
  myAiContextAllowedAssistantIds,
  settingsTabsAdvancedVisible, // Get shared state object
} = storeToRefs(settingsStore)
const { assistants } = storeToRefs(assistantsStore)

// --- Local State ---
const newSegmentText = ref('')
const avatarInputRef = ref(null)
const avatarError = ref(null)
const tabId = 'myAi' // Define ID for this tab

// --- Computed ---
// Get visibility for *this* tab from the shared state object
const isAdvancedVisible = computed(() => !!settingsTabsAdvancedVisible.value[tabId])

// Filter out main chat for the allow list display
const assistantList = computed(() => {
  return assistants.value.filter((a) => a.id !== conversationStore.MAIN_CHAT_ID)
})

// --- Methods ---
const addSegment = () => {
  if (newSegmentText.value.trim()) {
    settingsStore.addMyAiContextSegment(newSegmentText.value)
    newSegmentText.value = ''
  }
}

const deleteSegment = (index) => {
  settingsStore.deleteMyAiContextSegment(index)
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
  const file = event.target.files?.[0]
  if (!file) {
    avatarError.value = 'No file selected.'
    return
  }
  const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    avatarError.value = 'Invalid file type. Please select PNG, JPG, GIF, or WEBP.'
    return
  }
  const maxSizeMB = 1
  if (file.size > maxSizeMB * 1024 * 1024) {
    avatarError.value = `File is too large. Maximum size is ${maxSizeMB}MB.`
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result
    if (typeof result === 'string') {
      settingsStore.setUserAvatarUrl(result)
      avatarError.value = null
    } else {
      avatarError.value = 'Could not read file.'
    }
  }
  reader.onerror = () => {
    avatarError.value = 'Error reading file.'
  }
  reader.readAsDataURL(file)
  if (avatarInputRef.value) avatarInputRef.value.value = null
}

const removeAvatar = () => {
  settingsStore.setUserAvatarUrl(null)
  avatarError.value = null
  if (avatarInputRef.value) avatarInputRef.value.value = null
}
</script>

<style scoped>
/* Styles are assumed unchanged unless specific adjustments are needed */

/* General layout for this tab */
.setting-item {
  display: grid;
  grid-template-columns: minmax(150px, auto) 1fr auto;
  align-items: start;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color-light);
  gap: 1rem;
}
.setting-item:last-child {
  border-bottom: none;
}
.setting-item.wide-item {
  grid-template-columns: minmax(150px, auto) 1fr auto;
  align-items: start;
}
.setting-label {
  display: flex;
  flex-direction: column;
  font-weight: 500;
  font-family: sans-serif;
  cursor: default;
  line-height: 1.3;
  align-self: start;
  padding-top: 0.3rem;
}
.setting-description {
  font-size: 0.8em;
  color: var(--text-secondary);
  font-weight: 400;
  margin-top: 0.2rem;
  white-space: normal;
}

/* Control alignment */
.settings-text-input,
.avatar-setting-controls,
.toggle-switch,
.exclusion-controls {
  justify-self: start;
  align-self: center;
}
.setting-item .help-button {
  justify-self: end;
  align-self: center;
}

/* Specific control styles */
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
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  border: 1px solid var(--border-color-medium);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.avatar-setting-controls .quick-setting-button:hover {
  background-color: var(--bg-button-secondary-hover);
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
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--border-color-medium);
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  font-family: sans-serif;
  font-size: 0.9em;
  flex-shrink: 0;
  min-width: 100px;
  box-sizing: border-box;
  resize: vertical;
  min-height: calc(1.4em * 2 + 0.8rem);
}
.add-segment-area .settings-textarea:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.add-segment-area .quick-setting-button {
  background-color: var(--accent-color-primary);
  color: var(--text-light);
  border-color: var(--accent-color-primary);
  margin-left: auto;
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.9em;
  min-width: 100px;
  border-width: 1px;
}
.add-segment-area .quick-setting-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--accent-color-primary) 85%, black);
  border-color: color-mix(in srgb, var(--accent-color-primary) 85%, black);
}
.add-segment-area .quick-setting-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--accent-color-primary) 50%, var(--bg-main-content));
}

.help-button {
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  border: 1px solid var(--border-color-medium);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 0.8em;
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.help-button:hover {
  background-color: var(--bg-button-secondary-hover);
  color: var(--accent-color-primary);
  border-color: var(--accent-color-primary);
  transform: scale(1.1);
}
.help-button.overall-help {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  align-self: initial;
}
.help-button.list-help {
  align-self: start;
  margin-top: 0.1rem;
}

/* Advanced Section */
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
  user-select: none;
}
.advanced-arrow {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
  color: var(--text-button-secondary);
}
.advanced-arrow:hover {
  color: var(--accent-color-primary);
}
.advanced-arrow svg {
  display: block;
  width: 20px;
  height: 20px;
  fill: currentColor;
}
.advanced-arrow.expanded {
  transform: rotate(180deg);
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

/* Toggle Switch Styling */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
  background-color: var(--bg-toggle-inactive, #555);
  border-radius: 13px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-top: 5px;
  justify-self: start;
}
.toggle-switch .toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.2s ease;
}
.toggle-switch.active {
  background-color: var(--accent-color-primary);
}
.toggle-switch.active .toggle-knob {
  transform: translateX(24px);
}
.toggle-switch[aria-disabled='true'] {
  opacity: 0.6;
  cursor: not-allowed;
}

.exclusion-controls {
  /* Re-using class from memories tab */
  justify-self: start;
  align-self: start;
  width: 100%;
  max-width: 400px;
}
.assistants-checkbox-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem 0;
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid var(--border-color-light);
  border-radius: 4px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent-color-primary) 60%, var(--bg-sidebar))
    var(--bg-sidebar);
  background-color: var(--bg-input-area);
  padding: 0.5rem;
}
.assistants-checkbox-list::-webkit-scrollbar {
  width: 8px;
}
.assistants-checkbox-list::-webkit-scrollbar-track {
  background: var(--bg-input-area);
  border-radius: 4px;
}
.assistants-checkbox-list::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--accent-color-primary) 60%, var(--bg-input-area));
  border-radius: 4px;
  border: 2px solid var(--bg-input-area);
}
.assistants-checkbox-list::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(in srgb, var(--accent-color-primary) 80%, var(--bg-input-area));
}
.assistant-checkbox-item {
  display: flex;
  align-items: center;
  padding: 0.4rem 0.2rem;
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
  user-select: none;
}
.no-custom-assistants-message {
  font-style: italic;
  color: var(--text-secondary);
  padding: 0.4rem 0;
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
</style>
