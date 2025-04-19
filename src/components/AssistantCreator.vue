<template>
  <div class="assistant-creator">
    <div v-if="currentStep === 1 && !isEditMode" class="creator-step">
      <h3>Create New Assistant</h3>
      <p class="intro-text">
        Hello! I'm the Assistant Creator. I'm here to help you craft a powerful custom AI assistant.
        To start, please tell me what level of intricacy you'd like for your assistant's
        instructions. Choose from the following options:
      </p>
      <div class="level-selection">
        <div
          v-for="level in intricacyLevels"
          :key="level.value"
          class="level-option"
          :class="{ selected: selectedLevel === level.value }"
          @click="selectLevel(level.value)"
          tabindex="0"
          @keydown.enter.prevent="selectLevel(level.value)"
          @keydown.space.prevent="selectLevel(level.value)"
          role="radio"
          :aria-checked="selectedLevel === level.value"
          aria-label="Select Level"
        >
          <input
            type="radio"
            :id="'level-' + level.value"
            :value="level.value"
            v-model="selectedLevel"
            class="visually-hidden"
            name="intricacyLevel"
          />
          <label :for="'level-' + level.value">
            <strong>{{ level.name }}</strong> - {{ level.description }}
          </label>
        </div>
      </div>
      <div class="creator-actions footer-actions">
        <button @click="cancelCreation" class="button-secondary">Cancel</button>
        <button @click="confirmLevelAndProceed" class="button-primary" :disabled="!selectedLevel">
          Next: Define Assistant
        </button>
      </div>
    </div>

    <div v-if="currentStep === 2" class="creator-step">
      <h3>
        {{ isEditMode ? 'Edit Assistant Definition' : 'Define Assistant' }} (Level
        {{ selectedLevel }}: {{ currentLevelName }})
      </h3>
      <div v-if="currentQuestions.length > 0" class="question-area scrollable-content">
        <div class="question-header">
          <label :for="'question-' + currentQuestionIndex" class="question-label">
            {{ currentQuestionIndex + 1 }}. {{ currentQuestions[currentQuestionIndex].text }}
          </label>
          <button
            class="help-icon"
            @click="toggleHelp(currentQuestionIndex)"
            :aria-expanded="isHelpVisible(currentQuestionIndex).toString()"
            :aria-controls="'help-' + currentQuestionIndex"
            title="Show help for this question"
          >
            ?
          </button>
        </div>
        <div
          class="help-box"
          :id="'help-' + currentQuestionIndex"
          v-if="isHelpVisible(currentQuestionIndex)"
        >
          <p><strong>Guidance:</strong> {{ currentQuestions[currentQuestionIndex].help }}</p>
          <p>
            <strong>Example:</strong> <em>{{ currentQuestions[currentQuestionIndex].example }}</em>
          </p>
        </div>
        <textarea
          :id="'question-' + currentQuestionIndex"
          v-model="answers[currentQuestionIndex]"
          class="answer-input"
          rows="5"
          :placeholder="`Provide details for: ${currentQuestions[currentQuestionIndex].promptKey}... (Shift+Enter for new line)`"
          @keydown.enter.exact.prevent="nextQuestion"
          ref="answerTextareaRef"
        ></textarea>
      </div>
      <div class="creator-actions footer-actions question-nav">
        <button
          @click="previousQuestion"
          class="button-secondary"
          :disabled="currentQuestionIndex === 0"
        >
          Previous
        </button>
        <span class="question-counter"
          >{{ currentQuestionIndex + 1 }} / {{ currentQuestions.length }}</span
        >
        <button @click="nextQuestion" class="button-primary">
          {{ isLastQuestion ? 'Finish & Review Instructions' : 'Next Question' }}
        </button>
      </div>
      <button
        @click="goBackToLevelSelection"
        v-if="!isEditMode"
        class="button-tertiary back-button footer-back-button"
      >
        Back to Level Selection
      </button>
      <button @click="cancelCreation" v-else class="button-tertiary back-button footer-back-button">
        Cancel Edit
      </button>
    </div>

    <div v-if="currentStep === 3" class="creator-step">
      <h3>{{ isEditMode ? 'Review & Update Assistant' : 'Review & Save Assistant' }}</h3>

      <div class="review-area scrollable-content">
        <div class="review-input-group">
          <label for="assistant-name">Assistant Name:</label>
          <div class="name-input-area">
            <input
              type="text"
              id="assistant-name"
              v-model="assistantName"
              placeholder="Enter a name (or suggest one)"
            />
            <button
              @click="suggestName"
              class="button-tertiary suggest-button"
              title="Suggest name based on Role/Task"
              :disabled="isSuggestingName"
            >
              {{ isSuggestingName ? 'Suggesting...' : 'Suggest' }}
            </button>
          </div>
          <div v-if="suggestNameError" class="error-text suggest-error">{{ suggestNameError }}</div>
        </div>

        <div class="review-input-group">
          <label for="assistant-image-upload">Assistant Image (Optional):</label>
          <div class="image-upload-controls">
            <input
              type="file"
              id="assistant-image-upload"
              ref="imageFileInputRef"
              @change="handleImageFileSelected"
              accept="image/png, image/jpeg, image/gif, image/webp"
              style="display: none"
            />
            <button
              type="button"
              @click="triggerImageUpload"
              class="button-secondary upload-button"
            >
              {{ assistantImageUrl ? 'Change Image' : 'Upload Image' }}
            </button>
            <div class="image-preview-container">
              <img
                v-if="assistantImageUrl"
                :src="assistantImageUrl"
                alt="Image Preview"
                class="image-url-preview"
                @error="onImagePreviewError"
              />
              <div v-if="!assistantImageUrl" class="image-url-preview placeholder">?</div>
              <button
                v-if="assistantImageUrl"
                @click="removeSelectedImage"
                class="remove-image-button"
                title="Remove image"
              >
                ✖
              </button>
            </div>
          </div>
          <div v-if="imageError" class="error-text image-error">{{ imageError }}</div>
        </div>
        <div v-if="saveError" class="error-text save-error">{{ saveError }}</div>

        <label class="review-label">Generated Instructions:</label>
        <pre class="generated-instructions">{{ finalInstructions }}</pre>
        <div class="additional-instructions">
          <strong>Quick Guide:</strong>
          <p>{{ boilerplateInstructions }}</p>
        </div>
      </div>
      <div class="creator-actions footer-actions review-actions">
        <button @click="goBackToQuestions" class="button-secondary">Edit Answers</button>
        <button @click="testAssistant" class="button-secondary">
          Test {{ isEditMode ? '(Current Settings)' : '(Not Saved)' }}
        </button>
        <button
          @click="saveOrUpdateAssistant"
          class="button-primary"
          :disabled="!assistantName.trim() || isSaving"
        >
          {{
            isSaving
              ? isEditMode
                ? 'Updating...'
                : 'Saving...'
              : isEditMode
                ? 'Update Assistant'
                : 'Save Assistant'
          }}
        </button>
      </div>
      <button @click="cancelCreation" class="button-tertiary back-button footer-back-button">
        Cancel
      </button>

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
            <button @click="closeTestModal" title="Close Test Chat Window">Close Test</button>
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
import ChatView from '@/views/ChatView.vue' // Check path

// --- Props (from router) ---
const props = defineProps({
  id: { type: String, required: false, default: null },
})

// --- Emits ---
// *** Added 'assistant-created' back for signaling modal closure ***
const emit = defineEmits(['cancel', 'assistant-created'])

// --- Router and Route ---
const router = useRouter()
const route = useRoute()

// --- Pinia Store Instance ---
const assistantsStore = useAssistantsStore()

// --- State Management ---
const currentStep = ref(1)
const selectedLevel = ref(null)
const currentQuestionIndex = ref(0)
const answers = ref([])
const finalInstructions = ref('')
const boilerplateInstructions = ref('')
const visibleHelpIndex = ref(null)
const assistantName = ref('')
const assistantImageUrl = ref('') // Will hold Base64 Data URL or existing URL
const imageFileInputRef = ref(null) // Ref for the file input element
const imageError = ref(null) // Error message for image upload
const isSuggestingName = ref(false)
const suggestNameError = ref(null)
const isSaving = ref(false)
const saveError = ref(null)
const answerTextareaRef = ref(null)
const isTestModalVisible = ref(false)
const assistantBeingTested = ref(null)
const isEditMode = ref(false)
const assistantIdToEdit = ref(null)

// --- Intricacy Levels & Questions Data --- (Keep full data)
const intricacyLevels = ref([
  {
    value: 1,
    name: 'Level 1: Basic',
    description:
      'Covers core Role, Task, Context, and Format. Ideal for quicker creation of simpler assistants.',
  },
  {
    value: 2,
    name: 'Level 2: Intermediate',
    description:
      'Adds Tone, Examples, Detail Level, Things to Avoid, and Audience. For assistants needing more specific guidance.',
  },
  {
    value: 3,
    name: 'Level 3: Advanced',
    description:
      'Most comprehensive set covering all aspects for precise behavior and handling various scenarios.',
  },
])
const questionsByLevel = {
  1: [
    {
      text: 'What is the precise role or persona?',
      promptKey: 'Precise Role/Persona',
      help: 'Define the identity or character the assistant should adopt.',
      example: 'A helpful and friendly coding tutor specializing in Python.',
    },
    {
      text: 'What is the primary task or objective?',
      promptKey: 'Primary Task/Objective',
      help: 'What should the assistant primarily help the user accomplish?',
      example: 'To explain complex Python concepts clearly and provide working code examples.',
    },
    {
      text: 'What is the essential context or background?',
      promptKey: 'Essential Context/Background Information',
      help: 'Key information the assistant needs to know to perform its task.',
      example: 'The user is a beginner learning Python 3. Focus on core language features.',
    },
    {
      text: 'What specific output format or structure?',
      promptKey: 'Specific Output Format/Structure',
      help: 'How should the final output look? (e.g., code blocks, bullet points, specific sections)',
      example:
        'Provide explanations in clear paragraphs, followed by markdown code blocks for examples.',
    },
  ],
  2: [
    /* Level 2 Questions */
    {
      text: 'What is the precise role or persona?',
      promptKey: 'Precise Role/Persona',
      help: 'Define the identity or character the assistant should adopt.',
      example: 'A professional travel agent specializing in budget-friendly European trips.',
    },
    {
      text: 'What is the primary task or objective?',
      promptKey: 'Primary Task/Objective',
      help: 'What should the assistant primarily help the user accomplish?',
      example:
        'To create customized 1-week travel itineraries based on user preferences and budget.',
    },
    {
      text: 'What is the essential context or background?',
      promptKey: 'Essential Context/Background Information',
      help: 'Key information the assistant needs to know.',
      example:
        'Focus on travel within Schengen Area countries. Assume user prefers hostels or budget hotels.',
    },
    {
      text: 'What specific output format or structure?',
      promptKey: 'Specific Output Format/Structure',
      help: 'How should the final output look?',
      example: 'A day-by-day itinerary with suggested activities, transport, and estimated costs.',
    },
    {
      text: 'What tone and style?',
      promptKey: 'Tone and Style',
      help: 'Describe the desired communication style (e.g., formal, friendly, enthusiastic).',
      example: 'Friendly, informative, and slightly enthusiastic.',
    },
    {
      text: 'Provide one or two concrete examples of ideal output.',
      promptKey: 'Concrete Examples of Ideal Output',
      help: 'Paste or describe an example of what a good response looks like.',
      example:
        "'Day 1 (Paris): Arrive at CDG, take RER B to city center. Check into hostel near Le Marais (€30). Afternoon: Explore Le Marais, visit Place des Vosges. Evening: Budget dinner (€15), walk along the Seine.'",
    },
    {
      text: 'What is the desired level of detail/complexity?',
      promptKey: 'Desired Level of Detail/Complexity',
      help: 'How much detail should be included? (e.g., brief overview, very detailed steps)',
      example:
        'Provide moderate detail, including specific suggestions but allowing for flexibility.',
    },
    {
      text: 'Are there things to avoid?',
      promptKey: 'Things to Avoid',
      help: 'Specify any topics, phrases, or behaviors the assistant should not engage in.',
      example:
        'Avoid recommending luxury hotels or expensive fine dining. Do not suggest activities outside the specified region.',
    },
    {
      text: 'Who is the intended audience?',
      promptKey: 'Intended Audience',
      help: 'Describe the user this assistant is for.',
      example: 'Young adults or students looking for budget travel options in Europe.',
    },
  ],
  3: [
    /* Level 3 Questions */
    {
      text: 'What is the precise role or persona?',
      promptKey: 'Precise Role/Persona',
      help: 'Define the identity.',
      example: 'A meticulous technical documentation writer.',
    },
    {
      text: 'What is the primary task or objective?',
      promptKey: 'Primary Task/Objective',
      help: 'What should it do?',
      example: 'Generate API documentation based on provided code comments and specifications.',
    },
    {
      text: 'What is the essential context?',
      promptKey: 'Essential Context/Background Information',
      help: 'What background info is needed?',
      example: 'Assume input is well-commented Python code following standard conventions.',
    },
    {
      text: 'What specific output format?',
      promptKey: 'Specific Output Format/Structure',
      help: 'How should output look?',
      example: 'Markdown format with sections for Parameters, Returns, Examples.',
    },
    {
      text: 'What tone and style?',
      promptKey: 'Tone and Style',
      help: 'Communication style?',
      example: 'Formal, precise, and objective.',
    },
    {
      text: 'Provide examples of ideal output.',
      promptKey: 'Concrete Examples of Ideal Output',
      help: 'Show a good example.',
      example:
        '### FunctionName \n\n ```python\ndef FunctionName(param1: str): ...```\n\n**Parameters:**\n * `param1` (str): Description.\n\n**Returns:**\n * `str`: Description.',
    },
    {
      text: 'What is the desired level of detail?',
      promptKey: 'Desired Level of Detail/Complexity',
      help: 'How detailed?',
      example: 'Very detailed, covering all parameters and potential exceptions.',
    },
    {
      text: 'Should it explain its reasoning/steps?',
      promptKey: 'Explanation of Reasoning/Steps',
      help: 'Explain how it got the answer?',
      example: 'No, just provide the documentation.',
    },
    {
      text: 'Are there things to avoid?',
      promptKey: 'Things to Avoid',
      help: "What shouldn't it do?",
      example:
        'Avoid making assumptions about code functionality not present in comments. Do not add subjective opinions.',
    },
    {
      text: 'How should it handle follow-up questions?',
      promptKey: 'Handling Follow-up Questions',
      help: 'Responding to clarification requests?',
      example:
        'Answer based on the original context and instructions, ask for clarification if the follow-up is ambiguous.',
    },
    {
      text: 'Who is the intended audience?',
      promptKey: 'Intended Audience',
      help: 'Who is this for?',
      example: 'Other software developers using the API.',
    },
    {
      text: 'Any specific steps or order?',
      promptKey: 'Instructional Hierarchy/Order of Operations',
      help: 'Order of operations?',
      example: 'First parse parameters, then return values, then generate examples.',
    },
    {
      text: "Any absolute 'do not do' directives?",
      promptKey: 'Negative Constraints',
      help: 'Strict boundaries?',
      example:
        "Do not invent parameters or functionality. Do not include placeholder text like 'TODO'.",
    },
    {
      text: 'How should it respond to feedback/revisions?',
      promptKey: 'Iterative Refinement',
      help: 'Handling correction requests?',
      example:
        'Accept the feedback and regenerate the specific section requested, incorporating the correction.',
    },
    {
      text: 'How should it handle ambiguity?',
      promptKey: 'Handling Ambiguity',
      help: 'If the input is unclear?',
      example:
        'State that the input is ambiguous and ask for specific clarification on the unclear part.',
    },
    {
      text: 'How should it integrate context?',
      promptKey: 'Knowledge Integration',
      help: 'Prioritizing provided info?',
      example: 'Prioritize explicit comments in the code over general programming knowledge.',
    },
    {
      text: 'Should it have internal evaluation criteria?',
      promptKey: 'Output Evaluation (Internal)',
      help: 'Self-check before output?',
      example: 'Yes, check if all documented parameters have a description.',
    },
    {
      text: 'What are default behaviors if info is missing?',
      promptKey: 'Default Behaviors',
      help: 'Assumptions for missing info?',
      example: "If return type is missing, state 'Return type not specified'.",
    },
    {
      text: 'Multi-turn expected? How to remember?',
      promptKey: 'Multi-Turn Conversation',
      help: 'Remembering previous turns?',
      example: 'Yes, maintain context of the current function being documented across turns.',
    },
  ],
}

// --- Computed Properties ---
const currentQuestions = computed(() => {
  return selectedLevel.value && questionsByLevel[selectedLevel.value]
    ? questionsByLevel[selectedLevel.value]
    : []
})
const isLastQuestion = computed(() => {
  return (
    currentQuestions.value.length > 0 &&
    currentQuestionIndex.value === currentQuestions.value.length - 1
  )
})
const currentLevelName = computed(() => {
  const level = intricacyLevels.value.find((level) => level.value === selectedLevel.value)
  return level ? level.name : ''
})

// --- Methods ---

/**
 * Load assistant data for editing.
 */
const loadAssistantForEdit = (id) => {
  console.log(`[AssistantCreator] Attempting to load assistant with ID: ${id}`)
  const assistantToEdit = assistantsStore.getAssistantById(id)

  if (assistantToEdit) {
    console.log('[AssistantCreator] Found assistant:', assistantToEdit)
    assistantIdToEdit.value = assistantToEdit.id
    assistantName.value = assistantToEdit.name
    selectedLevel.value = assistantToEdit.level
    finalInstructions.value = assistantToEdit.instructions
    assistantImageUrl.value = assistantToEdit.imageUrl || '' // Load imageUrl
    imageError.value = null // Clear previous image errors

    nextTick(() => {
      // Repopulate answers array
      const instructionLines = assistantToEdit.instructions.split('\n\n')
      const loadedAnswers = new Array(currentQuestions.value.length).fill('')
      const keyToAnswerMap = new Map()
      instructionLines.forEach((line) => {
        const match = line.match(/^\*\*(.*?):\*\*\s*\n([\s\S]*)/)
        if (match && match[1] && match[2]) {
          keyToAnswerMap.set(match[1].trim(), match[2].trim())
        }
      })
      currentQuestions.value.forEach((question, index) => {
        const answer = keyToAnswerMap.get(question.promptKey)
        loadedAnswers[index] = answer && answer !== '(Not specified)' ? answer : ''
      })
      answers.value = loadedAnswers

      isEditMode.value = true
      currentStep.value = 2 // Start editing at questions
      console.log('[AssistantCreator] Edit mode activated. State populated.')
    })
  } else {
    console.error(`[AssistantCreator] Assistant with ID ${id} not found in store.`)
    saveError.value = `Error: Assistant with ID ${id} not found. Cannot edit.`
    setTimeout(() => {
      router.push({ name: 'assistants' })
    }, 3000)
  }
}

const selectLevel = (levelValue) => {
  selectedLevel.value = levelValue
}

const confirmLevelAndProceed = () => {
  if (!selectedLevel.value) return
  currentQuestionIndex.value = 0
  answers.value = new Array(currentQuestions.value.length).fill('')
  visibleHelpIndex.value = null
  assistantName.value = ''
  assistantImageUrl.value = '' // Reset image URL
  imageError.value = null // Reset image error
  saveError.value = null
  suggestNameError.value = null
  finalInstructions.value = ''
  isEditMode.value = false
  assistantIdToEdit.value = null
  currentStep.value = 2
  nextTick(() => {
    answerTextareaRef.value?.focus()
  })
}

const previousQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    visibleHelpIndex.value = null
    currentQuestionIndex.value--
    nextTick(() => {
      answerTextareaRef.value?.focus()
      answerTextareaRef.value?.select()
    })
  }
}

const nextQuestion = () => {
  visibleHelpIndex.value = null
  if (!isLastQuestion.value) {
    currentQuestionIndex.value++
    nextTick(() => {
      answerTextareaRef.value?.focus()
      answerTextareaRef.value?.select()
    })
  } else {
    generateFinalInstructions()
    currentStep.value = 3
  }
}

const generateFinalInstructions = () => {
  let markdown = ''
  if (currentQuestions.value && currentQuestions.value.length === answers.value.length) {
    currentQuestions.value.forEach((question, index) => {
      markdown += `**${question.promptKey}:**\n`
      markdown += `${answers.value[index]?.trim() || '(Not specified)'}\n\n`
    })
    finalInstructions.value = markdown.trim()
  } else {
    console.error(
      '[AssistantCreator] Mismatch between questions and answers length or questions not loaded.',
    )
    finalInstructions.value = 'Error generating instructions.'
  }
  // Set boilerplate...
  if (selectedLevel.value === 1) {
    boilerplateInstructions.value = 'Remember that this is a foundational instruction set...'
  } else if (selectedLevel.value === 2) {
    boilerplateInstructions.value = 'This instruction set provides a good level of detail...'
  } else {
    boilerplateInstructions.value = 'This is a comprehensive instruction set...'
  }
}

const goBackToQuestions = () => {
  visibleHelpIndex.value = null
  saveError.value = null
  currentStep.value = 2
  nextTick(() => {
    answerTextareaRef.value?.focus()
  })
}

const goBackToLevelSelection = () => {
  if (!isEditMode.value) {
    selectedLevel.value = null
    visibleHelpIndex.value = null
    currentStep.value = 1
  } else {
    cancelCreation()
  }
}

const toggleHelp = (index) => {
  visibleHelpIndex.value = visibleHelpIndex.value === index ? null : index
}
const isHelpVisible = (index) => {
  return visibleHelpIndex.value === index
}

// *** NEW: Trigger hidden file input ***
const triggerImageUpload = () => {
  imageFileInputRef.value?.click()
}

// *** NEW: Handle selected image file ***
const handleImageFileSelected = (event) => {
  const file = event.target.files?.[0]
  imageError.value = null // Clear previous error

  if (!file) {
    return // No file selected
  }

  // Basic Validation (Type and Size)
  const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    imageError.value = 'Invalid file type. Please select PNG, JPG, GIF, or WEBP.'
    resetFileInput()
    return
  }

  const maxSizeMB = 2 // Set max size in MB
  if (file.size > maxSizeMB * 1024 * 1024) {
    imageError.value = `File is too large. Maximum size is ${maxSizeMB}MB.`
    resetFileInput()
    return
  }

  // Read file as Base64 Data URL
  const reader = new FileReader()
  reader.onload = (e) => {
    assistantImageUrl.value = e.target?.result // Set the Data URL for preview and saving
    console.log(
      '[AssistantCreator] Image loaded as Data URL (length):',
      assistantImageUrl.value?.length,
    )
  }
  reader.onerror = (e) => {
    console.error('[AssistantCreator] FileReader error:', e)
    imageError.value = 'Error reading image file.'
    resetFileInput() // Clear selection on error
  }
  reader.readAsDataURL(file)
}

// *** NEW: Remove selected image ***
const removeSelectedImage = () => {
  assistantImageUrl.value = ''
  imageError.value = null
  resetFileInput()
}

// *** NEW: Helper to reset file input ***
const resetFileInput = () => {
  if (imageFileInputRef.value) {
    imageFileInputRef.value.value = null // Clear the selected file
  }
}

// *** NEW: Handle preview image error ***
const onImagePreviewError = (event) => {
  console.warn(
    'Preview image failed to load (might be invalid Data URL or temporary issue):',
    event.target.src.substring(0, 100) + '...',
  )
  imageError.value = 'Could not display image preview.'
  // Don't clear assistantImageUrl here, as it might still be a valid URL saved previously
  // Just hide the broken img tag
  event.target.style.display = 'none'
  // Ensure placeholder is shown
  const placeholder = event.target.nextElementSibling
  if (placeholder && placeholder.classList.contains('placeholder')) {
    placeholder.style.display = 'flex'
  }
}

// suggestName remains the same
const suggestName = async () => {
  if (answers.value.length < 2) {
    suggestNameError.value = 'Please answer the first two questions first.'
    return
  }
  const role = answers.value[0]?.trim()
  const task = answers.value[1]?.trim()
  if (!role || !task) {
    suggestNameError.value = "Please answer the 'Role' and 'Task' questions first."
    return
  }
  isSuggestingName.value = true
  suggestNameError.value = null
  const suggestionPrompt = `Based on the following details...\n\nSuggest exactly 3 names... Example: Name One, Name Two, Name Three`
  try {
    const response = await fetch('/.netlify/functions/call-gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputText: suggestionPrompt, history: [] }),
    })
    let responseData = await response.json()
    if (!response.ok || responseData.error) {
      throw new Error(responseData.error || `Name suggestion failed`)
    }
    if (responseData.aiText) {
      const suggestedNames = responseData.aiText
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name)
      if (suggestedNames.length > 0) {
        assistantName.value = suggestedNames[0]
      } else {
        throw new Error('AI did not return names in the expected format.')
      }
    } else {
      throw new Error('AI response did not contain suggested names.')
    }
  } catch (err) {
    console.error('Error suggesting name:', err)
    suggestNameError.value = `Failed to suggest name: ${err.message}`
  } finally {
    isSuggestingName.value = false
  }
}

// testAssistant remains the same
const testAssistant = () => {
  if (!assistantName.value.trim()) {
    saveError.value = 'Please enter a name for the assistant before testing.'
    const nameInput = document.getElementById('assistant-name')
    if (nameInput) {
      nameInput.classList.add('input-error-shake')
      setTimeout(() => nameInput.classList.remove('input-error-shake'), 600)
      nameInput.focus()
    }
    return
  }
  saveError.value = null
  console.log(`Opening test modal for assistant "${assistantName.value}"...`)
  openTestModal()
}

// openTestModal remains the same (includes imageUrl)
const openTestModal = () => {
  generateFinalInstructions()
  assistantBeingTested.value = {
    id: assistantIdToEdit.value || `temp_${Date.now()}`,
    name: assistantName.value.trim(),
    level: selectedLevel.value,
    instructions: finalInstructions.value,
    imageUrl: assistantImageUrl.value || null,
    createdAt: Date.now(), // Or load original createdAt if editing? Decide later.
  }
  isTestModalVisible.value = true
}

// closeTestModal remains the same
const closeTestModal = () => {
  console.log('Closing test modal from creator.')
  isTestModalVisible.value = false
  assistantBeingTested.value = null
}

/**
 * Save or Update Assistant. Includes imageUrl.
 * *** NOW EMITS 'assistant-created' when creating, NAVIGATES when updating. ***
 */
const saveOrUpdateAssistant = () => {
  if (!assistantName.value.trim()) {
    saveError.value = `Please enter a name before ${isEditMode.value ? 'updating' : 'saving'}.`
    const nameInput = document.getElementById('assistant-name')
    if (nameInput) {
      nameInput.classList.add('input-error-shake')
      setTimeout(() => nameInput.classList.remove('input-error-shake'), 600)
      nameInput.focus()
    }
    return
  }
  isSaving.value = true
  saveError.value = null
  imageError.value = null // Clear image error on save attempt
  generateFinalInstructions() // Ensure instructions are up-to-date

  const assistantConfig = {
    id: assistantIdToEdit.value, // Null if creating
    name: assistantName.value.trim(),
    level: selectedLevel.value,
    instructions: finalInstructions.value,
    imageUrl: assistantImageUrl.value || null, // Use current value (Data URL or existing URL)
  }

  let success = false
  try {
    if (isEditMode.value) {
      // --- UPDATE ---
      console.log('[AssistantCreator] Attempting to update assistant via store:', assistantConfig)
      success = assistantsStore.updateAssistant(assistantConfig)
      if (success) {
        console.log(`[AssistantCreator] Assistant updated successfully.`)
        router.push({ name: 'assistants' }) // Navigate back to list on successful update
      } else {
        saveError.value = `Failed to update assistant. Name might already exist or store error occurred.`
        console.error(`Failed to update assistant via store action.`)
      }
    } else {
      // --- CREATE ---
      console.log('[AssistantCreator] Attempting to add assistant via store:', assistantConfig)
      const { id, ...configToAdd } = assistantConfig // Don't pass null ID for add
      success = assistantsStore.addAssistant(configToAdd)
      if (success) {
        console.log(`[AssistantCreator] Assistant saved successfully.`)
        emit('assistant-created') // *** Emit event on successful creation ***
      } else {
        saveError.value = `Failed to save assistant. Name might already exist or store error occurred.`
        console.error(`Failed to add assistant via store action.`)
      }
    }
  } catch (e) {
    console.error(
      `[AssistantCreator] Error during ${isEditMode.value ? 'update' : 'save'} operation:`,
      e,
    )
    saveError.value = `An unexpected error occurred: ${e.message}`
    success = false
  } finally {
    isSaving.value = false // Reset saving state regardless of outcome
  }
}

// cancelCreation remains the same
const cancelCreation = () => {
  if (isEditMode.value) {
    console.log('Edit cancelled by user. Navigating back.')
    router.push({ name: 'assistants' })
  } else {
    console.log('Creation cancelled by user.')
    emit('cancel') // Close the creation modal
  }
}

// --- Lifecycle Hooks ---
onMounted(() => {
  if (props.id) {
    loadAssistantForEdit(props.id)
  } else {
    // Ensure create mode starts fresh
    isEditMode.value = false
    assistantIdToEdit.value = null
    currentStep.value = 1
    console.log('[AssistantCreator] Mounted in CREATE mode.')
    selectedLevel.value = null
    answers.value = []
    assistantName.value = ''
    assistantImageUrl.value = ''
    imageError.value = null
    finalInstructions.value = ''
    saveError.value = null
    suggestNameError.value = null
  }
})

watch(
  () => route.params.id,
  (newId, oldId) => {
    // Handle navigation between edit routes or from edit to create/other
    if (newId && newId !== assistantIdToEdit.value) {
      console.log(`[AssistantCreator] Route ID changed to: ${newId}. Reloading data.`)
      loadAssistantForEdit(newId)
    } else if (!newId && isEditMode.value) {
      // Navigated away from edit mode, reset to create state
      console.log('[AssistantCreator] Navigated away from edit mode. Resetting state.')
      isEditMode.value = false
      assistantIdToEdit.value = null
      currentStep.value = 1
      selectedLevel.value = null
      answers.value = []
      assistantName.value = ''
      assistantImageUrl.value = ''
      imageError.value = null
      finalInstructions.value = ''
      saveError.value = null
      suggestNameError.value = null
    }
  },
  { immediate: false },
)
</script>

<style scoped>
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
  /* Let parent modal control height */
  /* height: 100%; */
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
div[v-if='currentStep === 2'] > .scrollable-content,
div[v-if='currentStep === 3'] > .scrollable-content {
  flex-grow: 1; /* Allow content to take available space */
  overflow-y: auto; /* Enable vertical scrolling ONLY for this area */
  padding: 0.5rem; /* Add some padding inside scroll area */
  margin-bottom: 1rem; /* Space before footer actions */
}

/* Question Area (Step 2) */
.question-area {
  /* Removed margin-bottom, padding, background, border-radius as they are handled by scrollable-content */
  /* Removed flex-grow, display, flex-direction, overflow-y */
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
  flex-grow: 1; /* Allow textarea to grow vertically */
  min-height: 100px;
  box-sizing: border-box;
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

/* Review Area (Step 3) */
.review-area {
  /* Removed flex-grow, overflow-y */
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
} /* Input takes space */
.suggest-button {
  padding: 0.5rem 0.8rem;
  font-size: 0.85em;
  flex-shrink: 0;
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
}
.image-preview-container {
  position: relative;
} /* For positioning remove button */
.image-url-preview {
  width: 40px;
  height: 40px;
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
  padding-left: 105px;
}
.save-error {
  margin-top: 0.5rem;
  text-align: right;
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
  word-wrap: break-word; /* Removed overflow-y, handled by parent */
  font-size: 0.85em;
  margin-bottom: 1rem;
  color: var(--text-primary); /* Removed flex-grow, min-height */
  flex-shrink: 0; /* Prevent shrinking, let parent scroll */
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

/* Footer Actions (Common) */
.creator-actions.footer-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: auto; /* Push to bottom */
  padding-top: 1rem;
  border-top: 1px solid var(--border-color-light);
  flex-shrink: 0; /* Keep footer fixed */
  background-color: var(--bg-input-field); /* Match creator background */
  /* Add padding to match parent if needed, or remove parent padding */
  margin-left: -2rem; /* Counteract parent padding */
  margin-right: -2rem;
  margin-bottom: -1.5rem;
  padding: 1rem 2rem; /* Match parent padding */
}
.footer-actions.question-nav {
  justify-content: space-between;
}
.footer-actions.review-actions {
  justify-content: space-between;
}

/* Back button in footer */
.footer-back-button {
  margin-right: auto; /* Push other buttons right */
}

/* Buttons (Copied from previous) */
.button-primary,
.button-secondary,
.button-tertiary {
  padding: 0.6rem 1.2rem;
  border: none;
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
}
.button-primary {
  background-color: var(--bg-button-primary);
  color: var(--text-button-primary);
}
.button-primary:hover:not(:disabled) {
  background-color: var(--bg-button-primary-hover);
}
.button-primary:disabled {
  background-color: color-mix(in srgb, var(--bg-button-primary) 50%, var(--bg-input-field));
  cursor: not-allowed;
  opacity: 0.7;
}
.button-secondary {
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
}
.button-secondary:hover:not(:disabled) {
  background-color: var(--bg-button-secondary-hover);
}
.button-secondary:disabled {
  background-color: color-mix(in srgb, var(--bg-button-secondary) 50%, var(--bg-input-field));
  cursor: not-allowed;
  opacity: 0.7;
}
.button-tertiary {
  background-color: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color-light);
}
.button-tertiary:hover {
  background-color: var(--bg-button-secondary);
  border-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
}
/* .back-button { margin-right: auto; justify-self: flex-start; } */ /* Handled by footer-back-button */

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
