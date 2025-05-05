// src/composables/useAssistantWizard.js
import { ref, computed, nextTick } from 'vue'
import { intricacyLevels, questionsByLevel } from '@/data/assistantQuestions.js'

export function useAssistantWizard(props) {
  // Removed unused props: isEditMode, resetFormState
  const answers = props.answers ?? ref([]) // Keep as it's used in confirmLevelAndProceed
  const generateFinalInstructions = props.generateFinalInstructions ?? (() => {}) // Keep, used in nextQuestion
  const focusTextarea = props.focusTextarea ?? (() => {}) // Keep, used in navigation

  // --- Wizard State ---
  const currentStep = ref(1) // 1: Level Select, 2: Color Select, 3: Questions, 4: Review
  const selectedLevel = ref(null)
  const selectedColor = ref(null)
  const currentQuestionIndex = ref(0)

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
    const level = intricacyLevels.find((lvl) => lvl.value === selectedLevel.value)
    return level ? level.name : ''
  })

  // --- Wizard Navigation Methods ---
  const selectLevel = (levelValue) => {
    if (selectedLevel.value !== levelValue) {
      selectedLevel.value = levelValue
      selectedColor.value = null // Reset color when level changes
      console.log(`[Wizard] Level selected: ${levelValue}`)
    }
  }
  const confirmLevelAndProceed = () => {
    if (!selectedLevel.value) return
    console.log('[Wizard] Confirming level and proceeding to Color Selection.')
    currentStep.value = 2
    // Reset answers array based on the new level's questions
    if (answers && Array.isArray(answers.value)) {
      const questionCount = currentQuestions.value?.length || 0
      answers.value.length = questionCount // Resize array
      answers.value.fill('') // Fill with empty strings
      console.log(`[Wizard] Answers array reset for ${questionCount} questions.`)
    } else {
      console.warn("[Wizard] Cannot reset answers array - 'answers' prop incorrect?")
    }
  }
  const confirmColorAndProceed = () => {
    console.log(
      `[Wizard] Color confirmed (${selectedColor.value || 'default/none'}), proceeding to Questions.`,
    )
    currentQuestionIndex.value = 0 // Start at first question
    currentStep.value = 3
    nextTick(() => {
      focusTextarea?.() // Focus textarea when entering question step
    })
  }
  const nextQuestion = () => {
    if (!isLastQuestion.value) {
      console.log('[Wizard] Moving to next question.')
      currentQuestionIndex.value++
      nextTick(() => {
        focusTextarea?.(true) // Focus and select text in next question's textarea
      })
    } else {
      console.log(
        '[Wizard] Last question answered, generating instructions and proceeding to Review.',
      )
      generateFinalInstructions?.() // Call provided function to generate instructions
      currentStep.value = 4 // Move to Review step
    }
  }
  const previousQuestion = () => {
    if (currentQuestionIndex.value > 0) {
      console.log('[Wizard] Moving to previous question.')
      currentQuestionIndex.value--
      nextTick(() => {
        focusTextarea?.(true) // Focus and select text in previous question's textarea
      })
    }
  }
  const goBack = () => {
    console.log(`[Wizard] Go Back requested from Step ${currentStep.value}`)
    if (currentStep.value === 4) {
      // From Review back to Questions
      currentStep.value = 3
      nextTick(() => {
        focusTextarea?.() // Focus textarea
      })
    } else if (currentStep.value === 3) {
      // From Questions back to Color
      currentStep.value = 2
    } else if (currentStep.value === 2) {
      // From Color back to Level
      currentStep.value = 1
    }
  }
  const resetWizard = () => {
    // Resets only the wizard's internal state
    console.log('[Wizard] Resetting wizard state.')
    currentStep.value = 1
    selectedLevel.value = null
    selectedColor.value = null
    currentQuestionIndex.value = 0
    // Note: Does not reset form answers/name etc., parent component handles that via useAssistantForm.resetFormState
  }

  // --- Expose State and Methods ---
  return {
    currentStep,
    selectedLevel,
    selectedColor,
    currentQuestionIndex,
    currentQuestions,
    isLastQuestion,
    currentLevelName,
    intricacyLevels: ref(intricacyLevels), // Expose levels data for UI
    selectLevel,
    confirmLevelAndProceed,
    confirmColorAndProceed,
    previousQuestion,
    nextQuestion,
    goBack,
    resetWizard,
  }
}
