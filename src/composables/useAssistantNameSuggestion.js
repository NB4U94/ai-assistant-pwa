// src/composables/useAssistantNameSuggestion.js
import { ref, watch } from 'vue'
import { useApi } from '@/composables/useApi' // Correctly import useApi

export function useAssistantNameSuggestion(props) {
  const { answers, assistantName } = props

  // Initialize useApi
  const { isLoading: apiIsLoading, error: apiError, callApi } = useApi()

  // State
  const isSuggestingName = apiIsLoading // Directly use loading state from useApi
  const suggestNameError = ref(null) // Local error for specific suggestion logic issues

  // Clear local error state when API call starts or API error clears
  watch(isSuggestingName, (loading) => {
    if (loading) {
      suggestNameError.value = null
    }
  })
  watch(apiError, (newApiErr) => {
    if (!newApiErr) {
      suggestNameError.value = null
    }
  })

  // Method to suggest name
  const suggestName = async () => {
    // Validation
    if (!answers || !Array.isArray(answers.value) || answers.value.length < 2) {
      suggestNameError.value = 'Cannot suggest name: Required answers are missing.'
      return
    }
    const role = answers.value[0]?.trim()
    const task = answers.value[1]?.trim()
    if (!role || !task) {
      suggestNameError.value = "Please answer the 'Role' and 'Task' questions first."
      return
    }

    // Clear previous local error
    suggestNameError.value = null

    console.log('[NameSuggestion] Attempting to suggest name via useApi targeting GPT-4...')

    const suggestionPrompt = `Based on the following AI assistant configuration details, suggest exactly ONE concise and relevant name for the assistant. Focus on the Role and Task. Do not add any extra text or explanations, just the single suggested name.

**Precise Role/Persona:**
${role}

**Primary Task/Objective:**
${task}

Suggested Name:`

    // --- Use callApi from useApi composable ---
    try {
      const url = '/.netlify/functions/call-openai-gpt-4' // Target the correct function
      const payload = {
        messages: [{ role: 'user', content: suggestionPrompt }],
        temperature: 0.7,
        max_tokens: 20,
        model: 'gpt-4o', // Or your preferred model available via the function
      }

      console.log('[NameSuggestion] Calling API with payload:', payload)
      const responseData = await callApi(url, payload, 'POST')

      // Handle Successful Response
      if (responseData.aiText) {
        const suggestedNameResponse = responseData.aiText.trim().replace(/^["']|["']$/g, '')

        if (suggestedNameResponse) {
          if (assistantName) {
            assistantName.value = suggestedNameResponse // Assign the single suggestion
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
      // Handle API Call Errors (err object is { isError: true, message: string })
      console.error('[NameSuggestion] Error suggesting name:', err)
      suggestNameError.value = `Failed to suggest name: ${err.message || 'Unknown API error'}`
    }
    // isLoading (isSuggestingName) is automatically handled by useApi
  }

  // Expose State and Method
  return {
    isSuggestingName,
    suggestNameError,
    suggestName,
  }
}
