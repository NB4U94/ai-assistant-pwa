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
          Next: Define Assistant
        </button>
      </div>
    </div>

    <div v-if="wizard.currentStep.value === 2" class="creator-step">
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
          @click="wizard.goBackToLevelSelection"
          v-if="!isEditMode"
          class="button-tertiary back-button footer-back-button back-to-level-button"
        >
          Back to Level Selection
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

    <div v-if="wizard.currentStep.value === 3" class="creator-step">
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

        <button @click="wizard.goBackToQuestions" class="button-secondary">Edit Answers</button>
        <button @click="handleTestAssistantClick" class="button-secondary">
          Test {{ isEditMode ? '(Current Settings)' : '(Not Saved)' }}
        </button>
        <button
          @click="form.saveOrUpdateAssistant"
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
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAssistantsStore } from '@/stores/assistantsStore'
import ChatView from '@/views/ChatView.vue' // Ensure path is correct

// Import the data and ALL the composables
// import { intricacyLevels, questionsByLevel } from '@/data/assistantQuestions.js'; // No longer needed directly here
import { useAssistantWizard } from '@/composables/useAssistantWizard.js'
import { useAssistantForm } from '@/composables/useAssistantForm.js'
import { useAssistantNameSuggestion } from '@/composables/useAssistantNameSuggestion.js'
import { useAssistantTesting } from '@/composables/useAssistantTesting.js'

// --- Props & Emits ---
const props = defineProps({
  id: { type: String, required: false, default: null }, // For edit mode
})
const emit = defineEmits(['cancel', 'assistant-created'])

// --- Router & Store ---
const router = useRouter()
const route = useRoute()
const assistantsStore = useAssistantsStore()

// --- Component State (Minimal state remains here) ---
const isEditMode = ref(false) // Tracks if editing an existing assistant
const assistantIdToEdit = ref(null) // ID of assistant being edited
const answerTextareaRef = ref(null) // Ref for focusing the textarea
const visibleHelpIndex = ref(null) // State for toggling help boxes

// --- Initialize Composables (Pass reactive refs and functions) ---

// 1. Form Composable (manages name, answers, image, instructions, saving)
const form = useAssistantForm({
  selectedLevel: computed(() => wizard.selectedLevel.value), // Pass reactive computed from wizard
  currentQuestions: computed(() => wizard.currentQuestions.value), // Pass reactive computed from wizard
  isEditMode: isEditMode,
  assistantIdToEdit: assistantIdToEdit,
  emit: emit,
})

// 2. Wizard Composable (manages steps, level, question index, navigation)
const wizard = useAssistantWizard({
  isEditMode: isEditMode,
  answers: form.answers, // Pass answers ref FROM form
  resetFormState: form.resetFormState, // Pass reset function FROM form
  generateFinalInstructions: form.generateFinalInstructions, // Pass function FROM form
  focusTextarea: (select = false) => {
    // Pass function to focus textarea
    nextTick(() => {
      answerTextareaRef.value?.focus()
      if (select) answerTextareaRef.value?.select()
    })
  },
})

// 3. Name Suggestion Composable (Needs refs from form)
const nameSuggestion = useAssistantNameSuggestion({
  answers: form.answers,
  assistantName: form.assistantName,
})

// 4. Testing Modal Composable (Needs store & functions/data from form)
const testing = useAssistantTesting({
  assistantsStore: assistantsStore,
  generateFinalInstructions: form.generateFinalInstructions,
})

// --- Methods specific to this component ---

// Help Box Toggle
const toggleHelp = (index) => {
  visibleHelpIndex.value = visibleHelpIndex.value === index ? null : index
}
const isHelpVisible = (index) => {
  return visibleHelpIndex.value === index
}

// Cancel Action (Handles routing or emitting)
const cancelCreation = () => {
  if (isEditMode.value) {
    console.log('[CreatorComponent] Edit cancelled. Navigating back.')
    router.push({ name: 'assistants' }) // Navigate back to list on cancel edit
  } else {
    console.log('[CreatorComponent] Creation cancelled.')
    wizard.resetWizard() // Reset wizard state
    form.resetFormState() // Reset form state
    emit('cancel') // Emit cancel event for modal parent
  }
}

// Prepare data and open test modal using data from Form Composable
const handleTestAssistantClick = () => {
  // Validation now implicitly handled by the button's disabled state using form.assistantName
  if (!form.assistantName.value.trim()) {
    form.saveError.value = 'Please enter a name for the assistant before testing.'
    // Add shake animation if possible/needed via class binding?
    return
  }
  form.saveError.value = null // Clear previous save errors
  // Gather data needed by the testing composable's open function
  const currentAssistantFormData = {
    name: form.assistantName.value,
    level: wizard.selectedLevel.value,
    imageUrl: form.assistantImageUrl.value,
    instructions: form.finalInstructions.value, // Use potentially updated instructions
  }
  testing.openTestModal(currentAssistantFormData, assistantIdToEdit.value)
}

// --- Lifecycle & Watchers ---

// Load data if ID prop is present (Edit Mode)
// This function now coordinates setting state in Wizard and Form composables
const loadAssistantForEdit = (id) => {
  console.log(`[CreatorComponent] Attempting to load assistant ID: ${id} for edit.`)
  const assistantToEdit = assistantsStore.getAssistantById(id)

  if (assistantToEdit) {
    assistantIdToEdit.value = assistantToEdit.id
    isEditMode.value = true

    // 1. Set Wizard State (Level)
    wizard.selectedLevel.value = assistantToEdit.level

    // 2. Set Form State (Name, Image, Instructions)
    // Make sure form composable's load function is robust
    form.loadAssistantData(assistantToEdit)

    // 3. Repopulate answers ref in Form Composable based on loaded instructions
    // Wait for wizard's currentQuestions to update based on selectedLevel
    nextTick(() => {
      const instructionLines = assistantToEdit.instructions?.split('\n\n') || []
      const loadedAnswers = new Array(wizard.currentQuestions.value.length).fill('')
      const keyToAnswerMap = new Map()
      instructionLines.forEach((line) => {
        const match = line.match(/^\*\*(.*?):\*\*\s*\n([\s\S]*)/)
        if (match && match[1] && match[2]) {
          keyToAnswerMap.set(match[1].trim(), match[2].trim())
        }
      })
      // Use the correct 'currentQuestions' from the wizard
      wizard.currentQuestions.value.forEach((question, index) => {
        const answer = keyToAnswerMap.get(question.promptKey)
        loadedAnswers[index] = answer && answer !== '(Not specified)' ? answer : ''
      })
      form.answers.value = loadedAnswers // Update the ref inside useAssistantForm

      // 4. Set Wizard Step & Focus
      wizard.currentStep.value = 2 // Start editing at questions
      wizard.currentQuestionIndex.value = 0 // Start at first question
      console.log('[CreatorComponent] Edit mode activated and state populated.')
      nextTick(() => {
        // Focus after state is set
        answerTextareaRef.value?.focus()
      })
    })
  } else {
    console.error(`[CreatorComponent] Assistant ID ${id} not found. Redirecting.`)
    form.saveError.value = `Error: Assistant with ID ${id} not found. Cannot edit.`
    isEditMode.value = false // Ensure not stuck in edit mode
    assistantIdToEdit.value = null // Clear the invalid ID
    wizard.resetWizard() // Reset wizard to step 1
    form.resetFormState() // Reset form
    // Consider navigating away or showing a persistent error message
    router.push({ name: 'assistants' }).catch((err) => console.error('Navigation failed:', err)) // Redirect with error catch
  }
}

// Handle initial load or route changes for editing
onMounted(() => {
  if (props.id) {
    loadAssistantForEdit(props.id)
  } else {
    // Ensure clean state for creation mode
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
      // Navigated away from edit (e.g., to create view or list)
      console.log('[CreatorComponent] Navigated away from edit. Resetting state.')
      isEditMode.value = false
      assistantIdToEdit.value = null
      wizard.resetWizard()
      form.resetFormState()
    }
  },
  { immediate: false }, // Don't run on initial mount if props.id handles it
)

// Watch for level changes in CREATE mode to reset answers array length
watch(
  () => wizard.selectedLevel.value,
  (newLevel, oldLevel) => {
    if (!isEditMode.value && newLevel !== oldLevel) {
      console.log('[CreatorComponent] Level changed in create mode, resetting answers array.')
      // Ensure answers array length matches new questions
      form.answers.value = new Array(wizard.currentQuestions.value?.length || 0).fill('')
    }
  },
  { immediate: false },
) // Don't run on initial mount
</script>

<style scoped>
/* Use the SAME styles as the original component */
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

/* Class for each step's container */
.creator-step {
  display: flex;
  flex-direction: column;
  height: 100%; /* Allow step content to fill */
  overflow: hidden; /* Prevent step itself from scrolling */
  flex-grow: 1; /* Ensure step takes full height */
}

h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  text-align: center;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 1.25em;
  flex-shrink: 0; /* Keep header fixed */
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
  flex-shrink: 0; /* Keep fixed unless step needs scroll */
  /* Add overflow if levels might exceed space */
  /* overflow-y: auto; */
}

/* Level Option Styles */
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

/* Step 2 & 3 Structure for Scrolling */
.scrollable-content-area {
  flex-grow: 1; /* Allow content to take available space */
  overflow-y: auto; /* Enable vertical scrolling ONLY for this area */
  padding: 0.5rem 0.5rem 0 0.5rem; /* Add some padding inside scroll area, less at bottom */
  margin-bottom: 1rem; /* Space before footer actions */
  min-height: 0; /* Crucial for flex children in overflow containers */
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

/* Question Area (Step 2) - Now inside scrollable-content-area */
.question-area {
  /* Contains header, help, textarea */
  display: flex;
  flex-direction: column;
  /* Removed height: 100% - let content define size */
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
  min-height: 100px; /* Keep a minimum size */
  box-sizing: border-box;
  flex-shrink: 0; /* Prevent shrinking, let scroll container handle overflow */
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

/* Review Area (Step 3) - Now inside scrollable-content-area */
.review-area {
  /* Contains name, image, errors, instructions */
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
  height: 38px; /* Match button height approx */
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
  padding: 0.5rem 0.8rem !important; /* Ensure padding is applied */
  font-size: 0.85em !important;
  height: 38px; /* Match input height */
  flex-shrink: 0;
  /* Add width to fit spinner/icon */
  min-width: 38px; /* Ensure it's roughly square if just icon */
  display: flex;
  align-items: center;
  justify-content: center;
}
.suggest-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Image Upload Styles */
.image-upload-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.upload-button {
  padding: 0.5rem 1rem !important; /* Override general button padding if needed */
  font-size: 0.85em !important;
  height: 40px; /* Match preview height */
}
.image-preview-container {
  position: relative;
  width: 40px; /* Explicit size */
  height: 40px;
  flex-shrink: 0; /* Prevent shrinking */
}
.image-url-preview {
  width: 100%; /* Fill container */
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
  z-index: 1; /* Ensure it's above preview */
}
.remove-image-button:hover {
  background: rgba(0, 0, 0, 0.8);
}
.image-error {
  margin-top: 0.3rem; /* Space below controls */
}

.error-text {
  font-size: 0.8em;
  color: var(--text-error);
  min-height: 1.2em; /* Reserve space */
}
.suggest-error {
  margin: 0.2rem 0 0.5rem 0;
  /* padding-left: 105px; /* Align roughly under suggest button if name input wraps - might need adjustment */
}
.save-error {
  margin-top: 0.5rem;
  /* text-align: right; /* Align with save button if needed */
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
  /* FIX: Remove flex-shrink to allow it to be contained by scrollable parent */
  /* flex-shrink: 0; */
  /* Allow natural height, scrolling handled by parent */
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
  flex-shrink: 0; /* Keep this fixed relative to generated instructions */
}
.additional-instructions strong {
  display: block;
  margin-bottom: 0.3rem;
  color: var(--text-primary);
}
.additional-instructions p {
  margin: 0;
}

/* Footer Actions (Common) */
.creator-actions.footer-actions {
  display: flex;
  flex-wrap: wrap; /* Allow buttons to wrap */
  /* justify-content: flex-end; /* Default alignment */
  gap: 0.75rem; /* Space between buttons */
  margin-top: auto; /* Push to bottom */
  padding-top: 1rem;
  border-top: 1px solid var(--border-color-light);
  flex-shrink: 0; /* Keep footer fixed */
  background-color: var(--bg-input-field); /* Match creator background */
  /* FIX: Simplify padding/margin - Use component's padding */
  padding: 1rem; /* Consistent padding */
  /* Removed negative margins */
  align-items: center; /* Align items vertically if they wrap */
}
/* Specific justifications */
.footer-actions.question-nav,
.footer-actions.review-actions {
  justify-content: space-between; /* Space out first/last groups */
}

/* Special handling for the first button if it's a 'back' type */
.footer-actions > .back-button:first-child {
  margin-right: auto; /* Pushes subsequent items/groups to the right */
}

/* Group buttons that should stay together */
.footer-actions span, /* Question counter */
.footer-actions .button-secondary,
.footer-actions .button-primary {
  margin-left: 0.5rem; /* Add space between right-aligned buttons/items */
}
.footer-actions > .back-button:first-child + * {
  margin-left: 0; /* Remove margin from item immediately after back button */
}

/* Buttons (Base Styles) */
.button-primary,
.button-secondary,
.button-tertiary {
  padding: 0.6rem 1.2rem;
  border: 1px solid transparent; /* Base border */
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
  /* FIX: Ensure buttons don't shrink too small and text doesn't wrap */
  flex-shrink: 0;
  white-space: nowrap;
  /* min-width: 80px; /* Avoid fixed min-width if possible, let padding define size */
  text-align: center;
  line-height: 1.2; /* Prevent text descenders causing height jumps */
}
/* Primary Button */
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
/* Secondary Button */
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
/* Tertiary Button */
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

/* FIX: Specific style for the "Back to Level" button */
.back-to-level-button {
  background-color: var(--bg-error, #a04040) !important; /* Use error background */
  color: var(--text-light, white) !important; /* Ensure text is readable */
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
  margin: 0 0.5rem; /* Adjust spacing */
  flex-shrink: 0;
  white-space: nowrap;
}

/* Shake animation */
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

/* Modal styles */
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
  width: 800px; /* Or your preferred max width */
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
  overflow-y: hidden; /* ChatView handles its own scrolling */
  display: flex; /* Required for flex child */
  background-color: var(--bg-main-content); /* Ensure background consistency */
}
/* Target ChatView specifically if needed */
.test-modal .test-modal-chat-area > :deep(.chat-view) {
  height: 100%;
  width: 100%;
  border-radius: 0; /* Remove border-radius if ChatView has one */
  border: none; /* Remove border if ChatView has one */
  /* Add any overrides if ChatView styles conflict */
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

/* --- ADDED STYLES for Spinner and Green Plasma --- */

/* Spinner for Suggest Button */
.button-spinner {
  width: 16px; /* Adjust size as needed */
  height: 16px;
  border: 2px solid var(--text-button-secondary); /* Spinner color */
  border-top-color: transparent;
  border-radius: 50%;
  animation: button-spin 0.8s linear infinite;
  margin: auto; /* Center it if button padding allows */
}

@keyframes button-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Green Plasma Effect for Suggest Button */
/* Define green plasma color variables (or use existing if suitable) */
/* These could be moved to a global CSS file like main.css */
:root {
  --plasma-color-green-bright: hsl(120, 80%, 70%);
  --plasma-color-green-mid: hsl(120, 70%, 50%);
  --plasma-color-green-dim: hsl(120, 60%, 30%);
}

.suggest-button-plasma:not(:disabled) {
  position: relative; /* Needed for pseudo-element */
  overflow: hidden; /* Keep effect contained */
  /* Add a subtle base shadow */
  box-shadow: 0 0 3px 1px color-mix(in srgb, var(--plasma-color-green-mid) 20%, transparent);
}

.suggest-button-plasma:not(:disabled)::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 150%; /* Make it larger than the button */
  padding-bottom: 150%; /* Make it square */
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
  z-index: 0; /* Behind button content */
}

.suggest-button-plasma:not(:disabled):hover::before {
  /* Optional: Enhance effect on hover */
  /* animation-duration: 1.5s; */
}

/* Ensure button content stays above pseudo-element */
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

/* Override tertiary button styles slightly for better effect visibility */
.suggest-button-plasma.button-tertiary {
  background-color: color-mix(in srgb, var(--bg-sidebar) 50%, black); /* Darker base */
  border-color: var(--plasma-color-green-dim); /* Hint of color */
  color: var(--plasma-color-green-bright); /* Text color */
  font-size: 1.2em !important; /* Make dice slightly larger */
  padding: 0 !important; /* Remove padding if only icon */
  width: 38px; /* Make it square */
}
.suggest-button-plasma.button-tertiary:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--bg-sidebar) 30%, black);
  border-color: var(--plasma-color-green-mid);
  color: white;
}
</style>
