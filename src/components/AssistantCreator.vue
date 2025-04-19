<template>
  <div class="assistant-creator">
    <div v-if="currentStep === 1">
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
      <div class="creator-actions">
        <button @click="cancelCreation" class="button-secondary">Cancel</button>
        <button @click="confirmLevelAndProceed" class="button-primary" :disabled="!selectedLevel">
          Next: Define Assistant
        </button>
      </div>
    </div>

    <div v-if="currentStep === 2">
      <h3>Define Assistant (Level {{ selectedLevel }}: {{ currentLevelName }})</h3>
      <div v-if="currentQuestions.length > 0" class="question-area">
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
      <div class="creator-actions question-nav">
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
      <button @click="goBackToLevelSelection" class="button-tertiary back-button">
        Back to Level Selection
      </button>
    </div>

    <div v-if="currentStep === 3">
      <h3>Review & Save Assistant</h3>
      <div class="name-input-area">
        <label for="assistant-name">Assistant Name:</label>
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
      <div v-if="saveError" class="error-text save-error">{{ saveError }}</div>

      <label class="review-label">Generated Instructions:</label>
      <pre class="generated-instructions">{{ finalInstructions }}</pre>
      <div class="additional-instructions">
        <strong>Quick Guide:</strong>
        <p>{{ boilerplateInstructions }}</p>
      </div>
      <div class="creator-actions review-actions">
        <button @click="goBackToQuestions" class="button-secondary">Edit Answers</button>
        <button @click="testAssistant" class="button-secondary">Test (Not Saved)</button>
        <button
          @click="saveAssistant"
          class="button-primary"
          :disabled="!assistantName.trim() || isSaving"
        >
          {{ isSaving ? 'Saving...' : 'Save Assistant' }}
        </button>
      </div>
      <button @click="cancelCreation" class="button-tertiary back-button">Cancel</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useAssistantsStore } from '@/stores/assistantsStore' // Import the assistants store

const emit = defineEmits(['level-confirmed', 'cancel', 'assistant-created', 'test-assistant'])

// --- Pinia Store Instance ---
const assistantsStore = useAssistantsStore() // Get instance of the store

// --- State Management ---
const currentStep = ref(1)
const selectedLevel = ref(null)
const currentQuestionIndex = ref(0)
const answers = ref([])
const finalInstructions = ref('')
const boilerplateInstructions = ref('')
const visibleHelpIndex = ref(null)
const assistantName = ref('')
const isSuggestingName = ref(false)
const suggestNameError = ref(null)
const isSaving = ref(false)
const saveError = ref(null)
const answerTextareaRef = ref(null)

// --- Intricacy Levels --- (Same as previous version)
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

// --- Questions Data --- (Same as previous version)
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
    // Simplified examples for brevity - expand as needed
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

// --- Computed Properties --- (Same as previous version)
const currentQuestions = computed(() => {
  return selectedLevel.value ? questionsByLevel[selectedLevel.value] : []
})
const isLastQuestion = computed(() => {
  return (
    currentQuestions.value.length > 0 &&
    currentQuestionIndex.value === currentQuestions.value.length - 1
  )
})
const currentLevelName = computed(() => {
  return intricacyLevels.value.find((level) => level.value === selectedLevel.value)?.name || ''
})

// --- Methods --- (Mostly same as previous version, except saveAssistant)
const selectLevel = (levelValue) => {
  selectedLevel.value = levelValue
}

const confirmLevelAndProceed = () => {
  if (!selectedLevel.value) return
  currentQuestionIndex.value = 0
  answers.value = new Array(currentQuestions.value.length).fill('')
  visibleHelpIndex.value = null
  assistantName.value = ''
  saveError.value = null
  suggestNameError.value = null
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
  currentQuestions.value.forEach((question, index) => {
    markdown += `**${question.promptKey}:**\n`
    markdown += `${answers.value[index]?.trim() || '(Not specified)'}\n\n`
  })
  finalInstructions.value = markdown.trim()

  if (selectedLevel.value === 1) {
    boilerplateInstructions.value =
      'Remember that this is a foundational instruction set. You can further refine it by adding more specific details, examples, or by using built-in rewriting tools for instructions. Always preview and test your assistant before finalizing.'
  } else if (selectedLevel.value === 2) {
    boilerplateInstructions.value =
      'This instruction set provides a good level of detail for creating effective custom assistants. Consider adding more specific examples or constraints as needed. Remember to preview and test your assistant.'
  } else {
    boilerplateInstructions.value =
      'This is a comprehensive instruction set. Review carefully and test thoroughly before finalizing your assistant.'
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
  selectedLevel.value = null
  visibleHelpIndex.value = null
  currentStep.value = 1
}

const toggleHelp = (index) => {
  visibleHelpIndex.value = visibleHelpIndex.value === index ? null : index
}
const isHelpVisible = (index) => {
  return visibleHelpIndex.value === index
}

const suggestName = async () => {
  // ... (AI name suggestion logic - same as previous version) ...
  const role = answers.value[0]?.trim()
  const task = answers.value[1]?.trim()
  if (!role || !task) {
    suggestNameError.value = "Please answer the 'Role' and 'Task' questions first."
    return
  }
  isSuggestingName.value = true
  suggestNameError.value = null
  const suggestionPrompt = `Based on the following details for a custom AI assistant:\nRole/Persona: ${role}\nPrimary Task/Objective: ${task}\n\nSuggest exactly 3 creative, concise, and relevant names for this assistant. Present the names ONLY as a comma-separated list with no extra text, explanation, or numbering. Example: Name One, Name Two, Name Three`
  try {
    const response = await fetch('/.netlify/functions/call-gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputText: suggestionPrompt, history: [] }),
    })
    let responseData
    try {
      responseData = await response.json()
    } catch (e) {
      let rawText = `Response status: ${response.status}. Could not parse response body.`
      try {
        rawText = await response.text()
      } catch (e2) {
        /* ignore */
      }
      throw new Error(
        `Received non-JSON response from name suggestion. ${rawText.substring(0, 100)}`,
      )
    }
    if (!response.ok || responseData.error) {
      throw new Error(responseData.error || `Name suggestion failed with status ${response.status}`)
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

// Placeholder test function
const testAssistant = () => {
  if (!assistantName.value.trim()) {
    saveError.value = 'Please enter a name for the assistant before testing.'
    return
  }
  saveError.value = null
  console.log(`Placeholder: Testing assistant "${assistantName.value}"...`)
  alert(`Placeholder: Testing "${assistantName.value}". Functionality not yet implemented.`)
}

// --- Updated Save Function ---
const saveAssistant = () => {
  if (!assistantName.value.trim()) {
    saveError.value = 'Please enter a name before saving.'
    return
  }
  isSaving.value = true
  saveError.value = null // Clear previous errors

  const assistantConfig = {
    // ID and createdAt will be generated by the store action
    name: assistantName.value.trim(),
    level: selectedLevel.value,
    instructions: finalInstructions.value,
  }

  console.log('Attempting to add assistant via store:', assistantConfig)

  // Call the Pinia store action
  const success = assistantsStore.addAssistant(assistantConfig)

  if (success) {
    console.log('Assistant saved successfully via store.')
    emit('cancel') // Close modal on successful save
  } else {
    // Error message potentially set by store (e.g., duplicate name warning handled there)
    // Or set a generic error here if addAssistant returns false
    saveError.value = 'Failed to save assistant. Check console for store logs.'
    console.error('Failed to add assistant via store action. Store returned false.')
  }
  isSaving.value = false // Reset saving state
}
// --- End Updated Save Function ---

const cancelCreation = () => {
  console.log('Creation cancelled by user.')
  emit('cancel')
}
</script>

<style scoped>
/* Styles are getting long, consider splitting complex parts later if needed */
.assistant-creator {
  padding: 1.5rem 2rem;
  background-color: var(--bg-input-field);
  border: 1px solid var(--border-color-medium);
  border-radius: 12px;
  color: var(--text-primary);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  width: 100%; /* Takes width from modal parent */
  height: 100%; /* Takes height from modal parent */
  box-sizing: border-box;
  overflow: hidden; /* Parent handles overflow */
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
  overflow-y: auto; /* Allow level selection scroll if needed */
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

/* Step 2 & 3 Container */
div[v-if='currentStep === 2'],
div[v-if='currentStep === 3'] {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden; /* Parent handles overflow, inner parts scroll */
}

/* Step 2: Question Area */
.question-area {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: var(--bg-sidebar);
  border-radius: 8px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* Scroll question area if needed */
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
  flex-grow: 1;
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

.question-nav {
  justify-content: space-between;
  flex-shrink: 0;
}
.question-counter {
  font-size: 0.9em;
  color: var(--text-secondary);
  align-self: center;
}

/* Step 3: Review Area */
.name-input-area {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-shrink: 0;
}
.name-input-area label {
  font-weight: 600;
  flex-shrink: 0;
  font-size: 0.95em;
}
.name-input-area input[type='text'] {
  flex-grow: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color-medium);
  border-radius: 6px;
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  font-size: 1em;
}
.name-input-area input[type='text']:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: var(--input-focus-shadow);
}
.suggest-button {
  padding: 0.5rem 0.8rem;
  font-size: 0.85em;
  flex-shrink: 0;
}
.suggest-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.error-text {
  font-size: 0.8em;
  color: var(--text-error);
  height: 1.2em; /* Reserve space */
}
.suggest-error {
  margin: -0.25rem 0 0.5rem 0; /* Adjust spacing */
}
.save-error {
  margin-bottom: 0.5rem;
  text-align: right;
} /* Position near save */

.review-label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: block;
  font-size: 0.9em;
  flex-shrink: 0;
}
.generated-instructions {
  background-color: var(--bg-sidebar);
  border: 1px solid var(--border-color-light);
  border-radius: 6px;
  padding: 1rem;
  font-family: monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-y: auto;
  font-size: 0.85em;
  margin-bottom: 1rem;
  color: var(--text-primary);
  flex-grow: 1;
  min-height: 100px;
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
.review-actions {
  justify-content: space-between;
}

/* Action Buttons */
.creator-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color-light);
  flex-shrink: 0;
}
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
.back-button {
  margin-right: auto;
  justify-self: flex-start;
}
</style>
