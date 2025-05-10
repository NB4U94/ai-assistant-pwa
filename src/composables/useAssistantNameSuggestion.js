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

    console.log('[NameSuggestion] Attempting to suggest name via useApi...')

    // The Netlify function generate-assistant-name.mjs expects 'instructions'
    // which we will derive from role and task for the prompt it uses internally.
    // The prompt construction in this frontend composable is for the OpenAI call
    // that might have been used previously. For the gemini based Netlify function,
    // we need to send what IT expects.
    // The Netlify function 'generate-assistant-name.mjs' itself constructs the detailed prompt.
    // We just need to pass it the core 'instructions'.
    const instructionsForNetlifyFunction = `Role: ${role}\nTask: ${task}`

    try {
      // The URL should match the actual endpoint that proxies to generate-assistant-name.mjs
      // If you're using a generic call-openai-gpt-4 function that then routes based on payload,
      // ensure that routing logic is correct.
      // Based on the Netlify function provided, it's a direct endpoint.
      // Assuming the call to /call-openai-gpt-4 in your logs was a typo and it should be
      // /generate-assistant-name or similar.
      // For now, I'll keep the URL from your previous logs, but this might need adjustment
      // if that function is not the one that routes to generate-assistant-name.mjs.

      // Let's assume your Netlify function is directly named and exposed as:
      const url = '/.netlify/functions/generate-assistant-name' // Corrected URL to match your function
      const payload = {
        instructions: instructionsForNetlifyFunction, // Pass the instructions it expects
        // Remove GPT-specific parameters like messages, temperature, max_tokens, model
        // as the gemini-based Netlify function handles its own model and prompting.
      }

      console.log('[NameSuggestion] Calling API with payload:', payload)
      const responseData = await callApi(url, payload, 'POST')

      // Handle Successful Response
      // The Netlify function generate-assistant-name.mjs returns { "name": "The Name" }
      if (responseData && typeof responseData.name === 'string') {
        // Check if responseData and responseData.name exist and is a string
        const suggestedNameResponse = responseData.name.trim().replace(/^["']|["']$/g, '')

        if (suggestedNameResponse) {
          if (assistantName) {
            assistantName.value = suggestedNameResponse // Assign the single suggestion
            console.log(`[NameSuggestion] Suggested name set to: ${assistantName.value}`)
          } else {
            console.error('[NameSuggestion] assistantName ref was not provided.')
            suggestNameError.value = 'Internal error: Cannot update name.'
          }
        } else {
          console.warn('[NameSuggestion] AI did not return a valid name string:', responseData.name)
          suggestNameError.value = 'AI did not return a valid name string.'
        }
      } else {
        console.warn(
          '[NameSuggestion] API response missing expected "name" field or not a string:',
          responseData,
        )
        suggestNameError.value = 'AI response did not contain a valid suggested name.'
      }
    } catch (err) {
      // Handle API Call Errors (err object is { isError: true, message: string })
      console.error('[NameSuggestion] Error suggesting name:', err)
      suggestNameError.value = `Failed to suggest name: ${err.message || 'Unknown API error'}`
    }
  }

  // Expose State and Method
  return {
    isSuggestingName,
    suggestNameError,
    suggestName,
  }
}
