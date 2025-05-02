// src/composables/useAssistantWizard.js
import { ref, computed, nextTick } from 'vue'
import { intricacyLevels, questionsByLevel } from '@/data/assistantQuestions.js'

export function useAssistantWizard(props) {
  const isEditMode = props.isEditMode ?? ref(false)
  const answers = props.answers ?? ref([])
  const resetFormState = props.resetFormState ?? (() => {})
  const generateFinalInstructions = props.generateFinalInstructions ?? (() => {})
  const focusTextarea = props.focusTextarea ?? (() => {})

  // --- Wizard State ---
  const currentStep = ref(1) // 1: Level Select, 2: Color Select, 3: Questions, 4: Review
  const selectedLevel = ref(null)
  const selectedColor = ref(null)
  const currentQuestionIndex = ref(0)

  // --- Computed Properties --- (Full Implementations)
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

  // --- Wizard Navigation Methods --- (Full Implementations)
  const selectLevel = (levelValue) => {
    if (selectedLevel.value !== levelValue) {
      selectedLevel.value = levelValue
      selectedColor.value = null
      console.log(`[Wizard] Level selected: ${levelValue}`)
    }
  }
  const confirmLevelAndProceed = () => {
    if (!selectedLevel.value) return
    console.log('[Wizard] Confirming level and proceeding to Color Selection.')
    currentStep.value = 2
    if (answers && Array.isArray(answers.value)) {
      const questionCount = currentQuestions.value?.length || 0
      answers.value = new Array(questionCount).fill('')
      console.log(`[Wizard] Answers array reset for ${questionCount} questions.`)
    } else {
      console.warn("[Wizard] Cannot reset answers array - 'answers' prop incorrect?")
    }
  }
  const confirmColorAndProceed = () => {
    console.log(
      `[Wizard] Color confirmed (${selectedColor.value || 'default/none'}), proceeding to Questions.`,
    )
    currentQuestionIndex.value = 0
    currentStep.value = 3
    nextTick(() => {
      focusTextarea?.()
    })
  }
  const nextQuestion = () => {
    if (!isLastQuestion.value) {
      console.log('[Wizard] Moving to next question.')
      currentQuestionIndex.value++
      nextTick(() => {
        focusTextarea?.(true)
      })
    } else {
      console.log(
        '[Wizard] Last question answered, generating instructions and proceeding to Review.',
      )
      generateFinalInstructions?.()
      currentStep.value = 4
    }
  }
  const previousQuestion = () => {
    if (currentQuestionIndex.value > 0) {
      console.log('[Wizard] Moving to previous question.')
      currentQuestionIndex.value--
      nextTick(() => {
        focusTextarea?.(true)
      })
    }
  }
  const goBack = () => {
    console.log(`[Wizard] Go Back requested from Step ${currentStep.value}`)
    if (currentStep.value === 4) {
      currentStep.value = 3
      nextTick(() => {
        focusTextarea?.()
      })
    } else if (currentStep.value === 3) {
      currentStep.value = 2
    } else if (currentStep.value === 2) {
      currentStep.value = 1
    }
  }
  const resetWizard = () => {
    console.log('[Wizard] Resetting wizard state.')
    currentStep.value = 1
    selectedLevel.value = null
    selectedColor.value = null
    currentQuestionIndex.value = 0
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
    intricacyLevels: ref(intricacyLevels),
    selectLevel,
    confirmLevelAndProceed,
    confirmColorAndProceed,
    previousQuestion,
    nextQuestion,
    goBack,
    resetWizard,
  }
}
