<template>
  <div class="assistant-creator">
    <div v-if="wizard.currentStep.value === 1 && !isEditMode" class="creator-step">
      <h3>Create New Assistant</h3>
      <p class="intro-text">
        Hello! I'm the Assistant Creator. I'm here to help you craft a powerful custom AI assistant.
        To start, please tell me what level of intricacy you'd like for your assistant's
        instructions. Choose from the following options:
      </p>
      <div class="level-selection">
        <div
          v-for="level in wizard.intricacyLevels.value"
          :key="level.value"
          class="level-option"
          :class="{ selected: wizard.selectedLevel.value === level.value }"
          @click="wizard.selectLevel(level.value)"
          tabindex="0"
          @keydown.enter.prevent="wizard.selectLevel(level.value)"
          @keydown.space.prevent="wizard.selectLevel(level.value)"
          role="radio"
          :aria-checked="wizard.selectedLevel.value === level.value"
          aria-label="Select Level"
        >
          <input
            type="radio"
            :id="'level-' + level.value"
            :value="level.value"
            v-model="wizard.selectedLevel.value"
            class="visually-hidden"
            name="intricacyLevel"
          />
          <label :for="'level-' + level.value">
            <strong>{{ level.name }}</strong> - {{ level.description }}
          </label>
        </div>
      </div>
      <div class="creator-actions footer-actions">
        <button @click="cancelCreation" class="button-secondary back-button">Cancel</button>
        <button
          @click="wizard.confirmLevelAndProceed"
          class="button-primary"
          :disabled="!wizard.selectedLevel.value"
        >
          Next: Choose Color
        </button>
      </div>
    </div>

    <div v-if="wizard.currentStep.value === 2" class="creator-step">
      <h3>Choose Assistant Avatar Color</h3>
      <div class="scrollable-content-area">
        <ColorPaletteSelector :colors="predefinedColors" v-model="wizard.selectedColor.value" />
        <p
          style="
            font-size: 0.8em;
            text-align: center;
            margin-top: 15px;
            color: var(--text-secondary);
          "
        >
          (This color will be used if no image is uploaded)
        </p>
      </div>
      <div class="creator-actions footer-actions">
        <button @click="wizard.goBack" class="button-secondary back-button">Back</button>
        <button @click="wizard.confirmColorAndProceed" class="button-primary">
          Next: Define Assistant
        </button>
      </div>
    </div>

    <div v-if="wizard.currentStep.value === 3" class="creator-step">
      <h3>
        {{ isEditMode ? 'Edit Assistant Definition' : 'Define Assistant' }} (Level
        {{ wizard.selectedLevel.value }}: {{ wizard.currentLevelName.value }})
      </h3>
      <div class="scrollable-content-area">
        <div v-if="wizard.currentQuestions.value.length > 0" class="question-area">
          <div class="question-header">
            <label :for="'question-' + wizard.currentQuestionIndex.value" class="question-label">
              {{ wizard.currentQuestionIndex.value + 1 }}.
              {{ wizard.currentQuestions.value[wizard.currentQuestionIndex.value].text }}
            </label>
            <button
              class="help-icon"
              @click="toggleHelp(wizard.currentQuestionIndex.value)"
              :aria-expanded="isHelpVisible(wizard.currentQuestionIndex.value).toString()"
              :aria-controls="'help-' + wizard.currentQuestionIndex.value"
              title="Show help for this question"
            >
              ?
            </button>
          </div>
          <div
            class="help-box"
            :id="'help-' + wizard.currentQuestionIndex.value"
            v-if="isHelpVisible(wizard.currentQuestionIndex.value)"
          >
            <p>
              <strong>Guidance:</strong>
              {{ wizard.currentQuestions.value[wizard.currentQuestionIndex.value].help }}
            </p>
            <p>
              <strong>Example:</strong>
              <em>{{
                wizard.currentQuestions.value[wizard.currentQuestionIndex.value].example
              }}</em>
            </p>
          </div>
          <textarea
            :id="'question-' + wizard.currentQuestionIndex.value"
            v-model="form.answers.value[wizard.currentQuestionIndex.value]"
            class="answer-input"
            rows="5"
            :placeholder="`Provide details for: ${wizard.currentQuestions.value[wizard.currentQuestionIndex.value].promptKey}... (Shift+Enter for new line)`"
            @keydown.enter.exact.prevent="wizard.nextQuestion"
            ref="answerTextareaRef"
          ></textarea>
        </div>
      </div>
      <div class="creator-actions footer-actions question-nav">
        <button
          @click="wizard.goBack"
          v-if="!isEditMode"
          class="button-tertiary back-button footer-back-button"
          :class="{ 'back-to-level-button': !isEditMode }"
        >
          Back
        </button>
        <button
          @click="cancelCreation"
          v-else
          class="button-secondary back-button footer-back-button"
        >
          Cancel Edit
        </button>

        <button
          @click="wizard.previousQuestion"
          class="button-secondary"
          :disabled="wizard.currentQuestionIndex.value === 0"
        >
          Previous
        </button>
        <span class="question-counter"
          >{{ wizard.currentQuestionIndex.value + 1 }} /
          {{ wizard.currentQuestions.value.length }}</span
        >
        <button @click="wizard.nextQuestion" class="button-primary">
          {{ wizard.isLastQuestion.value ? 'Finish & Review Instructions' : 'Next Question' }}
        </button>
      </div>
    </div>

    <div v-if="wizard.currentStep.value === 4" class="creator-step">
      <h3>{{ isEditMode ? 'Review & Update Assistant' : 'Review & Save Assistant' }}</h3>
      <div class="scrollable-content-area">
        <div class="review-area">
          <div class="review-input-group">
            <label for="assistant-name">Assistant Name:</label>
            <div class="name-input-area">
              <input
                type="text"
                id="assistant-name"
                v-model="form.assistantName.value"
                placeholder="Enter a name (or suggest one)"
              />
              <button
                @click="nameSuggestion.suggestName"
                class="button-tertiary suggest-button suggest-button-plasma"
                title="Suggest name based on Role/Task"
                :disabled="nameSuggestion.isSuggestingName.value"
              >
                <span v-if="!nameSuggestion.isSuggestingName.value">🎲</span>
                <div v-else class="button-spinner"></div>
              </button>
            </div>
            <div v-if="nameSuggestion.suggestNameError.value" class="error-text suggest-error">
              {{ nameSuggestion.suggestNameError.value }}
            </div>
          </div>

          <div class="review-input-group">
            <label for="assistant-image-upload">Assistant Image (Optional):</label>
            <div class="image-upload-controls">
              <input
                type="file"
                id="assistant-image-upload"
                :ref="(el) => (form.imageFileInputRef.value = el)"
                @change="form.handleImageFileSelected"
                accept="image/png, image/jpeg, image/gif, image/webp"
                style="display: none"
              />
              <button
                type="button"
                @click="form.triggerImageUpload"
                class="button-secondary upload-button"
              >
                {{ form.assistantImageUrl.value ? 'Change Image' : 'Upload Image' }}
              </button>
              <div class="image-preview-container">
                <img
                  v-if="form.assistantImageUrl.value"
                  :src="form.assistantImageUrl.value"
                  alt="Image Preview"
                  class="image-url-preview"
                  @error="form.onImagePreviewError"
                />
                <div v-if="!form.assistantImageUrl.value" class="image-url-preview placeholder">
                  ?
                </div>
                <button
                  v-if="form.assistantImageUrl.value"
                  @click="form.removeSelectedImage"
                  class="remove-image-button"
                  title="Remove image"
                >
                  ✖
                </button>
              </div>
            </div>
            <div v-if="form.imageError.value" class="error-text image-error">
              {{ form.imageError.value }}
            </div>
          </div>
          <div v-if="form.saveError.value" class="error-text save-error">
            {{ form.saveError.value }}
          </div>

          <label class="review-label">Generated Instructions:</label>
          <pre class="generated-instructions">{{ form.finalInstructions.value }}</pre>
          <div class="additional-instructions">
            <strong>Quick Guide:</strong>
            <p>{{ form.boilerplateInstructions.value }}</p>
          </div>
        </div>
      </div>
      <div class="creator-actions footer-actions review-actions">
        <button @click="cancelCreation" class="button-secondary back-button">Cancel</button>

        <button @click="wizard.goBack" class="button-secondary">Edit Answers</button>
        <button @click="handleTestAssistantClick" class="button-secondary">
          Test {{ isEditMode ? '(Current Settings)' : '(Not Saved)' }}
        </button>
        <button
          @click="handleSave"
          class="button-primary"
          :disabled="!form.assistantName.value.trim() || form.isSaving.value"
        >
          {{
            form.isSaving.value
              ? isEditMode
                ? 'Updating...'
                : 'Saving...'
              : isEditMode
                ? 'Update Assistant'
                : 'Save Assistant'
          }}
        </button>
      </div>

      <div
        class="modal-overlay test-modal"
        v-if="testing.isTestModalVisible.value"
        @click.self="testing.closeTestModal"
      >
        <div class="test-modal-content">
          <div class="test-modal-header">
            <h3>Testing Assistant: "{{ testing.assistantBeingTested.value?.name }}"</h3>
            <button
              @click="testing.closeTestModal"
              class="close-modal-button"
              title="Close Test Chat"
            >
              ✖
            </button>
          </div>
          <div class="test-modal-chat-area">
            <ChatView
              v-if="testing.assistantBeingTested.value"
              :assistant-config="testing.assistantBeingTested.value"
            />
          </div>
          <div class="test-modal-footer">
            <button @click="testing.closeTestModal" title="Close Test Chat Window">
              Close Test
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Imports
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAssistantsStore } from '@/stores/assistantsStore'
import ChatView from '@/views/ChatView.vue'
import ColorPaletteSelector from '@/components/ColorPaletteSelector.vue' // *** IMPORTED ***
import { useAssistantWizard } from '@/composables/useAssistantWizard.js'
import { useAssistantForm } from '@/composables/useAssistantForm.js'
import { useAssistantNameSuggestion } from '@/composables/useAssistantNameSuggestion.js'
import { useAssistantTesting } from '@/composables/useAssistantTesting.js'

// --- Props & Emits ---
const props = defineProps({ id: { type: String, required: false, default: null } })
const emit = defineEmits(['cancel', 'assistant-created'])

// --- Router & Store ---
const router = useRouter()
const route = useRoute()
const assistantsStore = useAssistantsStore()

// --- Component State ---
const isEditMode = ref(false)
const assistantIdToEdit = ref(null)
const answerTextareaRef = ref(null)
const visibleHelpIndex = ref(null)

// --- Define Predefined Colors ---
const predefinedColors = ref([
  // Now defined here
  '#FF5733',
  '#FF8D33',
  '#FFC133',
  '#FFE333',
  '#D7FF33',
  '#A1FF33',
  '#33FF57',
  '#33FFAD',
  '#33FFFF',
  '#33A1FF',
  '#3357FF',
  '#6E33FF',
  '#AD33FF',
  '#FF33F6',
  '#FF33A1',
  '#FF3357',
  '#F87171',
  '#FBBF24',
  '#34D399',
  '#60A5FA',
  '#A78BFA',
  '#F472B6',
  '#C084FC',
  '#67E8F9',
])

// --- Initialize Composables ---

// 1. Wizard Composable (Ensure props are passed correctly later)
const wizard = useAssistantWizard({
  isEditMode: isEditMode,
  // Defer passing form refs until 'form' is defined below
  answers: computed(() => form?.answers?.value || []), // Use optional chaining and default
  resetFormState: () => form?.resetFormState(),
  generateFinalInstructions: () => form?.generateFinalInstructions(),
  focusTextarea: (select = false) => {
    nextTick(() => {
      answerTextareaRef.value?.focus()
      if (select) answerTextareaRef.value?.select()
    })
  },
})

// 2. Form Composable (Pass wizard's selectedColor ref)
const form = useAssistantForm({
  selectedLevel: wizard.selectedLevel,
  currentQuestions: wizard.currentQuestions,
  isEditMode: isEditMode,
  assistantIdToEdit: assistantIdToEdit,
  emit: emit,
  selectedColor: wizard.selectedColor, // *** PASSING COLOR REF ***
})

// 3. Name Suggestion Composable
const nameSuggestion = useAssistantNameSuggestion({
  answers: form.answers,
  assistantName: form.assistantName,
})

// 4. Testing Modal Composable
const testing = useAssistantTesting({
  assistantsStore: assistantsStore,
  generateFinalInstructions: form.generateFinalInstructions, // Pass generate function
  // Pass necessary form state for testing modal
  getAssistantTestData: () => ({
    name: form.assistantName.value,
    level: wizard.selectedLevel.value,
    imageUrl: form.assistantImageUrl.value,
    instructions: form.finalInstructions.value,
    color: wizard.selectedColor.value,
  }),
})

// --- Methods specific to this component ---

// Help Box Toggle
const toggleHelp = (index) => {
  visibleHelpIndex.value = visibleHelpIndex.value === index ? null : index
}
const isHelpVisible = (index) => {
  return visibleHelpIndex.value === index
}

// Cancel Action
const cancelCreation = () => {
  if (isEditMode.value) {
    console.log('[CreatorComponent] Edit cancelled. Navigating back.')
    router.push({ name: 'assistants' })
  } else {
    console.log('[CreatorComponent] Creation cancelled.')
    wizard.resetWizard()
    form.resetFormState()
    emit('cancel')
  }
}

// Test Assistant Click (Modified slightly to use testing composable better)
const handleTestAssistantClick = () => {
  if (!form.assistantName.value.trim()) {
    form.saveError.value = 'Please enter a name for the assistant before testing.'
    return
  }
  form.saveError.value = null
  // generateFinalInstructions might need to be called if answers changed since last review step
  form.generateFinalInstructions()
  // Pass the ID being edited if applicable
  testing.openTestModal(assistantIdToEdit.value)
}

// Wrapper for Save/Update action
const handleSave = async () => {
  const success = await form.saveOrUpdateAssistant()
  if (success && !isEditMode.value) {
    // Reset wizard only after successful *creation*
    // The parent component might handle closing the modal via 'assistant-created' emit
    wizard.resetWizard()
    // Maybe call cancelCreation logic here if modal should close?
    // emit('cancel'); // Example if this closes a modal
  }
  // Navigation on successful update is handled within form.saveOrUpdateAssistant via router
}

// --- Lifecycle & Watchers ---

// Load data for edit mode
const loadAssistantForEdit = (id) => {
  console.log(`[CreatorComponent] Attempting to load assistant ID: ${id} for edit.`)
  const assistantToEdit = assistantsStore.getAssistantById(id)

  if (assistantToEdit) {
    assistantIdToEdit.value = assistantToEdit.id
    isEditMode.value = true
    wizard.selectedLevel.value = assistantToEdit.level
    form.loadAssistantData(assistantToEdit) // Loads name, instructions, image, color

    nextTick(() => {
      const instructionLines = assistantToEdit.instructions?.split('\n\n') || []
      const loadedAnswers = new Array(wizard.currentQuestions.value?.length || 0).fill('')
      const keyToAnswerMap = new Map()
      instructionLines.forEach((line) => {
        const match = line.match(/^\*\*(.*?):\*\*\s*\n([\s\S]*)/)
        if (match && match[1] && match[2]) {
          keyToAnswerMap.set(match[1].trim(), match[2].trim())
        }
      })
      wizard.currentQuestions.value.forEach((question, index) => {
        const answer = keyToAnswerMap.get(question.promptKey)
        loadedAnswers[index] = answer && answer !== '(Not specified)' ? answer : ''
      })
      form.answers.value = loadedAnswers

      wizard.currentStep.value = 3 // Start editing at Questions (Step 3)
      wizard.currentQuestionIndex.value = 0
      console.log('[CreatorComponent] Edit mode activated and state populated.')
      nextTick(() => {
        answerTextareaRef.value?.focus()
      })
    })
  } else {
    console.error(`[CreatorComponent] Assistant ID ${id} not found. Redirecting.`)
    form.saveError.value = `Error: Assistant with ID ${id} not found. Cannot edit.`
    isEditMode.value = false
    assistantIdToEdit.value = null
    wizard.resetWizard()
    form.resetFormState()
    router.push({ name: 'assistants' }).catch((err) => console.error('Navigation failed:', err))
  }
}

// Handle initial load or route changes
onMounted(() => {
  if (props.id) {
    loadAssistantForEdit(props.id)
  } else {
    isEditMode.value = false
    assistantIdToEdit.value = null
    wizard.resetWizard()
    form.resetFormState()
    console.log('[CreatorComponent] Mounted in CREATE mode.')
  }
})

watch(
  () => route.params.id,
  (newId) => {
    const currentId = assistantIdToEdit.value
    if (newId && newId !== currentId) {
      console.log(`[CreatorComponent] Route ID changed to: ${newId}. Reloading for edit.`)
      loadAssistantForEdit(newId)
    } else if (!newId && isEditMode.value) {
      console.log('[CreatorComponent] Navigated away from edit. Resetting state.')
      isEditMode.value = false
      assistantIdToEdit.value = null
      wizard.resetWizard()
      form.resetFormState()
    }
  },
  { immediate: false },
)

// Watch level changes
watch(
  () => wizard.selectedLevel.value,
  (newLevel, oldLevel) => {
    if (!isEditMode.value && newLevel !== oldLevel) {
      console.log('[CreatorComponent] Level changed in create mode, resetting answers array.')
      form.answers.value = new Array(wizard.currentQuestions.value?.length || 0).fill('')
    }
  },
  { immediate: false },
)
</script>

<style scoped>
/* Paste the FULL styles from your original 1200-line file here */
/* Make sure to include .assistant-creator, .creator-step, etc. */
/* Also include styles for .color-palette-container if needed */
.assistant-creator {
  padding: 1.5rem 2rem;
  background-color: var(--bg-input-field); /* Or appropriate background */
  border: 1px solid var(--border-color-medium);
  border-radius: 12px;
  color: var(--text-primary);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 100%; /* Ensure it doesn't overflow parent */
  box-sizing: border-box;
  overflow: hidden; /* Prevent creator itself from scrolling */
  position: relative;
}
.creator-step {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  flex-grow: 1;
}
h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  text-align: center;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 1.25em;
  flex-shrink: 0;
}
.intro-text {
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
  line-height: 1.5;
  font-size: 0.95em;
  text-align: left;
  flex-shrink: 0;
}
.level-selection {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-shrink: 0;
}
.level-option {
  padding: 1rem 1.25rem;
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.1s ease;
  outline: none;
  background-color: var(--bg-sidebar);
}
.level-option:hover {
  border-color: var(--accent-color-primary);
  background-color: color-mix(in srgb, var(--bg-sidebar) 90%, var(--bg-app-container));
  transform: translateY(-1px);
}
.level-option:focus-visible {
  border-color: var(--accent-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.level-option.selected {
  border-color: var(--accent-color-primary);
  background-color: color-mix(in srgb, var(--accent-color-primary) 15%, var(--bg-sidebar));
  border-width: 2px;
  padding: calc(1rem - 1px) calc(1.25rem - 1px);
  transform: none;
}
.level-option label {
  display: block;
  cursor: pointer;
  font-size: 0.9em;
  line-height: 1.4;
  color: var(--text-secondary);
}
.level-option label strong {
  display: block;
  margin-bottom: 0.2rem;
  font-size: 1.1em;
  color: var(--text-primary);
  font-weight: 600;
}
.level-option.selected label strong {
  color: var(--accent-color-primary);
}
.visually-hidden {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
.scrollable-content-area {
  flex-grow: 1;
  overflow-y: auto;
  padding: 0.5rem 0.5rem 0 0.5rem;
  margin-bottom: 1rem;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--accent-color-primary) var(--bg-sidebar);
}
.scrollable-content-area::-webkit-scrollbar {
  width: 8px;
}
.scrollable-content-area::-webkit-scrollbar-track {
  background: var(--bg-sidebar);
  border-radius: 4px;
}
.scrollable-content-area::-webkit-scrollbar-thumb {
  background-color: var(--accent-color-primary);
  border-radius: 4px;
  border: 2px solid var(--bg-sidebar);
}
.scrollable-content-area::-webkit-scrollbar-thumb:hover {
  background-color: var(--accent-color-secondary);
}
.question-area {
  display: flex;
  flex-direction: column;
}
.question-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  gap: 0.5rem;
  flex-shrink: 0;
}
.question-label {
  display: block;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1.05em;
  line-height: 1.4;
  flex-grow: 1;
}
.help-icon {
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 0.8em;
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background-color 0.2s ease;
}
.help-icon:hover {
  background-color: var(--bg-button-secondary-hover);
}
.help-box {
  background-color: color-mix(in srgb, var(--bg-sidebar) 85%, black);
  border: 1px solid var(--border-color-light);
  border-radius: 4px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  font-size: 0.85em;
  line-height: 1.4;
  color: var(--text-secondary);
  animation: fadeInHelp 0.3s ease;
  flex-shrink: 0;
}
.help-box p {
  margin: 0 0 0.5rem 0;
}
.help-box strong {
  color: var(--text-primary);
}
.help-box em {
  color: var(--text-primary);
  font-style: normal;
}
@keyframes fadeInHelp {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.answer-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color-medium);
  border-radius: 6px;
  resize: vertical;
  font-family: sans-serif;
  font-size: 1em;
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  min-height: 100px;
  box-sizing: border-box;
  flex-shrink: 0;
}
.answer-input:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: var(--input-focus-shadow);
}
.answer-input::placeholder {
  color: var(--text-placeholder);
  font-style: italic;
  font-size: 0.9em;
}
.review-area {
  display: flex;
  flex-direction: column;
}
.review-input-group {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex-shrink: 0;
}
.review-input-group label {
  font-weight: 600;
  font-size: 0.9em;
  color: var(--text-secondary);
}
.name-input-area {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.name-input-area input[type='text'] {
  flex-grow: 1;
  height: 38px;
  padding: 0.5rem 0.8rem;
  border: 1px solid var(--border-color-medium);
  border-radius: 6px;
  font-size: 0.9em;
  background-color: var(--bg-input-field);
  color: var(--text-primary);
}
.name-input-area input[type='text']:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: var(--input-focus-shadow);
}
.suggest-button {
  padding: 0.5rem 0.8rem !important;
  font-size: 0.85em !important;
  height: 38px;
  flex-shrink: 0;
  min-width: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.suggest-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.image-upload-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.upload-button {
  padding: 0.5rem 1rem !important;
  font-size: 0.85em !important;
  height: 40px;
}
.image-preview-container {
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}
.image-url-preview {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid var(--border-color-light);
  background-color: var(--bg-sidebar);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-placeholder);
  font-size: 1.5em;
  font-weight: bold;
}
.image-url-preview.placeholder {
  border-style: dashed;
}
.remove-image-button {
  position: absolute;
  top: -5px;
  right: -5px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 0.7em;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
  z-index: 1;
}
.remove-image-button:hover {
  background: rgba(0, 0, 0, 0.8);
}
.image-error {
  margin-top: 0.3rem;
}
.error-text {
  font-size: 0.8em;
  color: var(--text-error);
  min-height: 1.2em;
}
.suggest-error {
  margin: 0.2rem 0 0.5rem 0;
}
.save-error {
  margin-top: 0.5rem;
}
.image-error {
  margin-top: 0.3rem;
}
.review-label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: block;
  font-size: 0.9em;
  flex-shrink: 0;
  margin-top: 1rem;
}
.generated-instructions {
  background-color: var(--bg-sidebar);
  border: 1px solid var(--border-color-light);
  border-radius: 6px;
  padding: 1rem;
  font-family: monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 0.85em;
  margin-bottom: 1rem;
  color: var(--text-primary);
}
.additional-instructions {
  font-size: 0.85em;
  color: var(--text-secondary);
  background-color: color-mix(in srgb, var(--bg-sidebar) 50%, transparent);
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
  line-height: 1.4;
  border: 1px dashed var(--border-color-light);
  flex-shrink: 0;
}
.additional-instructions strong {
  display: block;
  margin-bottom: 0.3rem;
  color: var(--text-primary);
}
.additional-instructions p {
  margin: 0;
}
.creator-actions.footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color-light);
  flex-shrink: 0;
  background-color: var(--bg-input-field);
  padding: 1rem;
  align-items: center;
}
.footer-actions.question-nav,
.footer-actions.review-actions {
  justify-content: space-between;
}
.footer-actions > .back-button:first-child {
  margin-right: auto;
}
.footer-actions span,
.footer-actions .button-secondary,
.footer-actions .button-primary {
  margin-left: 0.5rem;
}
.footer-actions > .back-button:first-child + * {
  margin-left: 0;
}
.button-primary,
.button-secondary,
.button-tertiary {
  padding: 0.6rem 1.2rem;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font-family: sans-serif;
  font-size: 0.9em;
  font-weight: 500;
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
  flex-shrink: 0;
  white-space: nowrap;
  text-align: center;
  line-height: 1.2;
}
.button-primary {
  background-color: var(--bg-button-primary);
  color: var(--text-button-primary);
  border-color: var(--bg-button-primary);
}
.button-primary:hover:not(:disabled) {
  background-color: var(--bg-button-primary-hover);
  border-color: var(--bg-button-primary-hover);
}
.button-primary:disabled {
  background-color: color-mix(in srgb, var(--bg-button-primary) 50%, var(--bg-input-field));
  border-color: color-mix(in srgb, var(--bg-button-primary) 50%, var(--bg-input-field));
  cursor: not-allowed;
  opacity: 0.7;
}
.button-secondary {
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  border-color: var(--bg-button-secondary);
}
.button-secondary:hover:not(:disabled) {
  background-color: var(--bg-button-secondary-hover);
  border-color: var(--bg-button-secondary-hover);
}
.button-secondary:disabled {
  background-color: color-mix(in srgb, var(--bg-button-secondary) 50%, var(--bg-input-field));
  border-color: color-mix(in srgb, var(--bg-button-secondary) 50%, var(--bg-input-field));
  cursor: not-allowed;
  opacity: 0.7;
}
.button-tertiary {
  background-color: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color-light);
}
.button-tertiary:hover:not(:disabled) {
  background-color: var(--bg-button-secondary);
  border-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
}
.back-to-level-button {
  background-color: var(--bg-error, #a04040) !important;
  color: var(--text-light, white) !important;
  border: 1px solid var(--bg-error, #a04040) !important;
}
.back-to-level-button:hover {
  background-color: color-mix(in srgb, var(--bg-error, #a04040) 85%, black) !important;
  border-color: color-mix(in srgb, var(--bg-error, #a04040) 85%, black) !important;
  color: var(--text-light, white) !important;
}
.question-counter {
  color: var(--text-secondary);
  font-size: 0.9em;
  margin: 0 0.5rem;
  flex-shrink: 0;
  white-space: nowrap;
}
@keyframes shake {
  10%,
  90% {
    transform: translate3d(-1px, 0, 0);
  }
  20%,
  80% {
    transform: translate3d(2px, 0, 0);
  }
  30%,
  50%,
  70% {
    transform: translate3d(-3px, 0, 0);
  }
  40%,
  60% {
    transform: translate3d(3px, 0, 0);
  }
}
.input-error-shake {
  animation: shake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  border-color: var(--text-error) !important;
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
  z-index: 2000;
  padding: 1rem;
  box-sizing: border-box;
  cursor: pointer;
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
  background-color: var(--bg-main-content);
}
.test-modal .test-modal-chat-area > :deep(.chat-view) {
  height: 100%;
  width: 100%;
  border-radius: 0;
  border: none;
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
/* Spinner for Suggest Button */
.button-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--text-button-secondary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: button-spin 0.8s linear infinite;
  margin: auto;
}
@keyframes button-spin {
  to {
    transform: rotate(360deg);
  }
}
/* Green Plasma Effect for Suggest Button */
:root {
  --plasma-color-green-bright: hsl(120, 80%, 70%);
  --plasma-color-green-mid: hsl(120, 70%, 50%);
  --plasma-color-green-dim: hsl(120, 60%, 30%);
}
.suggest-button-plasma:not(:disabled) {
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 3px 1px color-mix(in srgb, var(--plasma-color-green-mid) 20%, transparent);
}
.suggest-button-plasma:not(:disabled)::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 150%;
  padding-bottom: 150%;
  background: radial-gradient(
    circle at center,
    color-mix(in srgb, var(--plasma-color-green-bright) 60%, transparent) 0%,
    color-mix(in srgb, var(--plasma-color-green-mid) 40%, transparent) 40%,
    color-mix(in srgb, var(--plasma-color-green-dim) 20%, transparent) 70%,
    transparent 100%
  );
  border-radius: 50%;
  transform-origin: center center;
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
  transition: opacity 0.5s ease-out;
  animation: suggest-plasma-pulse 2.5s infinite ease-in-out;
  z-index: 0;
}
.suggest-button-plasma span,
.suggest-button-plasma .button-spinner {
  position: relative;
  z-index: 1;
}
@keyframes suggest-plasma-pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.7);
    opacity: 0.4;
  }
  50% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.7;
  }
  100% {
    transform: translate(-50%, -50%) scale(0.7);
    opacity: 0.4;
  }
}
.suggest-button-plasma.button-tertiary {
  background-color: color-mix(in srgb, var(--bg-sidebar) 50%, black);
  border-color: var(--plasma-color-green-dim);
  color: var(--plasma-color-green-bright);
  font-size: 1.2em !important;
  padding: 0 !important;
  width: 38px;
}
.suggest-button-plasma.button-tertiary:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--bg-sidebar) 30%, black);
  border-color: var(--plasma-color-green-mid);
  color: white;
}
</style>
