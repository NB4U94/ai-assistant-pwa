// src/composables/useAssistantWizard.js
import { ref, computed, nextTick } from 'vue'
// *** FIXED: Added import for data ***
import { intricacyLevels, questionsByLevel } from '@/data/assistantQuestions.js'

// Props expected by the composable (passed from the component that uses it)
// - isEditMode: Boolean ref indicating if editing existing assistant
// - answers: Ref to the answers array (managed by useAssistantForm, but needed here for reset)
// - resetFormState: Function to call when resetting/cancelling (from useAssistantForm)
// - generateFinalInstructions: Function to generate instructions (from useAssistantForm)
// - focusTextarea: Function to focus the relevant textarea (passed from component or another composable)
export function useAssistantWizard(props) {
  // Destructure props carefully, providing defaults or checks if necessary
  const isEditMode = props.isEditMode ?? ref(false) // Use passed ref or default
  const answers = props.answers ?? ref([])
  const resetFormState = props.resetFormState ?? (() => {})
  const generateFinalInstructions = props.generateFinalInstructions ?? (() => {})
  const focusTextarea = props.focusTextarea ?? (() => {})

  // --- Wizard State ---
  const currentStep = ref(1) // 1: Level Select, 2: Questions, 3: Review
  const selectedLevel = ref(null) // Stores the value (1, 2, or 3)
  const currentQuestionIndex = ref(0) // Index within the current level's questions

  // --- Computed Properties ---
  const currentQuestions = computed(() => {
    // Now uses the imported questionsByLevel
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
    // Now uses the imported intricacyLevels
    const level = intricacyLevels.find((lvl) => lvl.value === selectedLevel.value)
    return level ? level.name : ''
  })

  // --- Wizard Navigation Methods ---

  const selectLevel = (levelValue) => {
    selectedLevel.value = levelValue
    console.log(`[Wizard] Level selected: ${levelValue}`)
  }

  const confirmLevelAndProceed = () => {
    if (!selectedLevel.value) return
    console.log('[Wizard] Confirming level and proceeding to questions.')
    currentQuestionIndex.value = 0
    if (answers && Array.isArray(answers.value)) {
      // Ensure answers array matches the length of the NEW questions
      answers.value = new Array(currentQuestions.value.length).fill('')
    }
    currentStep.value = 2
    nextTick(() => {
      focusTextarea?.()
    })
  }

  const previousQuestion = () => {
    if (currentQuestionIndex.value > 0) {
      console.log('[Wizard] Moving to previous question.')
      currentQuestionIndex.value--
      nextTick(() => {
        focusTextarea?.(true) // Focus and select
      })
    }
  }

  const nextQuestion = () => {
    console.log('[Wizard] Moving to next question or review.')
    if (!isLastQuestion.value) {
      currentQuestionIndex.value++
      nextTick(() => {
        focusTextarea?.(true) // Focus and select
      })
    } else {
      generateFinalInstructions?.()
      currentStep.value = 3
    }
  }

  const goBackToQuestions = () => {
    console.log('[Wizard] Going back to questions from review.')
    currentStep.value = 2
    nextTick(() => {
      focusTextarea?.()
    })
  }

  const goBackToLevelSelection = () => {
    if (!isEditMode.value) {
      console.log('[Wizard] Going back to level selection.')
      selectedLevel.value = null
      currentStep.value = 1
    } else {
      console.log('[Wizard] Back button clicked in edit mode - treating as cancel.')
      // Component's cancelCreation handles actual cancel logic
    }
  }

  const resetWizard = () => {
    console.log('[Wizard] Resetting wizard state.')
    currentStep.value = 1
    selectedLevel.value = null
    currentQuestionIndex.value = 0
  }

  // --- Expose State and Methods ---
  return {
    // State Refs
    currentStep,
    selectedLevel,
    currentQuestionIndex,

    // Computed Refs
    currentQuestions,
    isLastQuestion,
    currentLevelName,
    // *** FIXED: Expose the imported intricacyLevels data ***
    // Wrap in ref() so component template can access .value consistently if needed,
    // although direct export might also work depending on Vue version/setup.
    // Using direct value for simplicity as it's static.
    intricacyLevels: ref(intricacyLevels), // Pass the imported array

    // Methods
    selectLevel,
    confirmLevelAndProceed,
    previousQuestion,
    nextQuestion,
    goBackToQuestions,
    goBackToLevelSelection,
    resetWizard,
  }
}
