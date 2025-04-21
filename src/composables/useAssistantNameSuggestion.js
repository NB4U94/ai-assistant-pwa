// src/composables/useAssistantNameSuggestion.js
import { ref, watch } from 'vue' // Added watch for potential error clearing
import { useApi } from '@/composables/useApi'

export function useAssistantNameSuggestion(props) {
  const { answers, assistantName } = props

  // Initialize useApi
  const { isLoading: apiIsLoading, error: apiError, callApi } = useApi()

  // State
  const isSuggestingName = apiIsLoading
  const suggestNameError = ref(null)

  // Clear local error when a new suggestion starts successfully
  watch(isSuggestingName, (loading) => {
    if (loading) {
      suggestNameError.value = null // Clear previous local error on new attempt
    }
  })

  // Also clear local error if API error is cleared
  watch(apiError, (newApiErr) => {
    if (!newApiErr) {
      suggestNameError.value = null
    }
  })

  // Method
  const suggestName = async () => {
    // Validate required answers
    if (!answers || !Array.isArray(answers.value) || answers.value.length < 2) {
      suggestNameError.value = 'Cannot suggest name: Required answers are missing.'
      console.error('[NameSuggestion] Answers ref not provided or too short.')
      return
    }
    const role = answers.value[0]?.trim()
    const task = answers.value[1]?.trim()
    if (!role || !task) {
      suggestNameError.value = "Please answer the 'Role' and 'Task' questions first."
      return
    }

    // Clear previous errors before starting
    suggestNameError.value = null
    // apiError is cleared automatically by useApi on new call

    console.log('[NameSuggestion] Attempting to suggest name via useApi...')

    // *** UPDATED PROMPT: Ask for exactly ONE name ***
    const suggestionPrompt = `Based on the following AI assistant configuration details, suggest exactly ONE concise and relevant name for the assistant. Focus on the Role and Task. Do not add any extra text or explanations, just the single suggested name.

**Precise Role/Persona:**
${role}

**Primary Task/Objective:**
${task}

Suggested Name:`
    // *** END OF UPDATED PROMPT ***

    try {
      const url = '/.netlify/functions/call-openai-gpt-4'
      const payload = {
        messages: [{ role: 'user', content: suggestionPrompt }],
        temperature: 0.7, // Temperature can be slightly higher for creative names
        max_tokens: 20, // Reduced max tokens needed for one name
        model: 'gpt-4o', // Or specify another if preferred
      }

      console.log('[NameSuggestion] Calling API with payload:', payload)
      const responseData = await callApi(url, payload, 'POST')

      // Handle Successful Response - Expect single name in aiText
      if (responseData.aiText) {
        // Remove potential quotes or extra formatting from the single name
        const suggestedName = responseData.aiText.trim().replace(/^["']|["']$/g, '')

        if (suggestedName) {
          if (assistantName) {
            assistantName.value = suggestedName // Assign the single suggestion
            console.log(`[NameSuggestion] Suggested name set to: ${assistantName.value}`)
          } else {
            console.error('[NameSuggestion] assistantName ref was not provided.')
            suggestNameError.value = 'Internal error: Cannot update name.'
          }
        } else {
          console.warn('[NameSuggestion] AI did not return a valid name:', responseData.aiText)
          suggestNameError.value = 'AI did not return a valid name.'
        }
      } else {
        console.warn('[NameSuggestion] API response missing expected aiText field:', responseData)
        suggestNameError.value = 'AI response did not contain suggested names.'
      }
    } catch (err) {
      console.error('[NameSuggestion] Error suggesting name:', err)
      suggestNameError.value = `Failed to suggest name: ${err.message || 'Unknown API error'}`
    }
    // isLoading is handled by useApi
  }

  // Expose State and Method
  return {
    isSuggestingName,
    suggestNameError,
    suggestName,
  }
}
