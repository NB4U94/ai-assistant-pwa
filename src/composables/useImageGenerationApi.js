// src/composables/useImageGenerationApi.js
import { ref } from 'vue'
import { useApi } from '@/composables/useApi' // Import generic API handler

export function useImageGenerationApi() {
  // --- Initialize Generic API Handler ---
  // Error ref will be exposed directly from useApi
  const { isLoading, error: apiError, callApi } = useApi()

  // --- State Specific to Image Generation Results ---
  const generatedImageUrl = ref(null) // Holds the Base64 Data URL
  const revisedPrompt = ref(null) // Holds the prompt DALL-E actually used

  // --- Method to Trigger Image Generation ---

  /**
   * Calls the backend function to generate an image.
   * @param {object} payload - The payload object containing { prompt, model, size, quality?, style? }
   * @returns {Promise<boolean>} - True if generation was successful, false otherwise.
   */
  const generateImageApiCall = async (payload) => {
    // Clear previous results before starting new request
    generatedImageUrl.value = null
    revisedPrompt.value = null
    // apiError is cleared automatically by useApi on new call

    console.log('[ImageAPI] Attempting generation with payload:', payload)

    try {
      const url = '/.netlify/functions/call-openai-dalle3' // Target our DALL-E function

      // Use the generic callApi function
      const responseData = await callApi(url, payload, 'POST')

      // --- Handle Successful Response ---
      if (!responseData?.imageBase64) {
        console.error('[ImageAPI] Missing imageBase64 in successful response:', responseData)
        // Set apiError through the composable if possible, or throw
        throw new Error(
          `Backend function did not return image data.${responseData?.revisedPrompt ? ` Revised Prompt: ${responseData.revisedPrompt}` : ''}`,
        )
        // Returning false might be handled differently depending on error strategy
        // return false;
      }

      generatedImageUrl.value = `data:image/png;base64,${responseData.imageBase64}`
      revisedPrompt.value = responseData.revisedPrompt || null
      console.log('[ImageAPI] Image generated successfully.')
      if (revisedPrompt.value) {
        console.log('[ImageAPI] Revised prompt from OpenAI:', revisedPrompt.value)
      }
      return true // Indicate success
    } catch (err) {
      // --- Handle API Call Errors ---
      // Error message is automatically set in apiError by useApi
      console.error('[ImageAPI] Error caught during API call:', err)
      // Ensure local state is cleared on error
      generatedImageUrl.value = null
      revisedPrompt.value = null
      return false // Indicate failure
    }
    // isLoading is handled automatically by useApi
  }

  // Method to clear the error state manually if needed
  const clearApiError = () => {
    apiError.value = null
  }

  // --- Expose State and Methods ---
  return {
    // State
    isLoading, // Loading state from useApi
    apiError, // Error state from useApi
    generatedImageUrl, // Resulting image URL
    revisedPrompt, // Resulting revised prompt

    // Methods
    generateImageApiCall, // Function to trigger the generation
    clearApiError, // Function to clear errors
  }
}
