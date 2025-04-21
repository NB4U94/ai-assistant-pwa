// src/composables/useApi.js
import { ref } from 'vue'
// Removed unused store imports for generic use case
// import { useConversationStore } from '@/stores/conversationStore';
// import { useSettingsStore } from '@/stores/settingsStore';
// import { storeToRefs } from 'pinia';

/**
 * Composable for handling generic API calls to backend functions.
 *
 * @param {object} options - Optional initial configuration (e.g., for image processing).
 * @param {Function} options.readFileAsBase64 - Optional function to read file as base64 (if needed by caller).
 * @returns {object} - Reactive loading state and the function to call the API.
 */
export function useApi(options = {}) {
  // Use the passed-in function if provided, otherwise null
  const readFileAsBase64 = options.readFileAsBase64 || null

  // Single loading state for the composable instance
  const isLoading = ref(false)
  const error = ref(null) // Add an error ref

  /**
   * Calls a specified backend Netlify function.
   * @param {string} url - The Netlify function endpoint (e.g., '/.netlify/functions/call-something').
   * @param {object} payload - The JSON payload to send to the function.
   * @param {string} method - The HTTP method (default: 'POST').
   * @returns {Promise<object>} - Promise resolving to the parsed JSON response object on success,
   * or rejects with an error object ({ isError: true, message: string }) on failure.
   */
  const callApi = async (url, payload, method = 'POST') => {
    isLoading.value = true
    error.value = null // Clear previous errors
    console.log(`[useApi] Calling ${method} ${url}`)

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      // Try to get text regardless of status for better error reporting
      const responseText = await response.text()

      if (!response.ok) {
        let errorMessage = `API Error: HTTP ${response.status} from ${url}`
        try {
          const parsedError = JSON.parse(responseText)
          errorMessage =
            parsedError.error?.message ||
            parsedError.error ||
            `${errorMessage}: ${responseText.substring(0, 150)}`
        } catch (parseError) {
          errorMessage += `: ${responseText.substring(0, 150)}`
        }
        console.error(`[useApi] API Error received: ${errorMessage}`)
        throw new Error(errorMessage) // Throw to be caught below
      }

      // Attempt to parse successful response as JSON
      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        console.error('[useApi] Invalid JSON received from API:', responseText)
        throw new Error(`Invalid JSON received from API: ${responseText.substring(0, 150)}`)
      }

      // Optional: Check for application-level errors in the successful response
      if (data.error) {
        console.error('[useApi] API returned error object:', data.error)
        const errMsg =
          typeof data.error === 'string'
            ? data.error
            : data.error?.message || JSON.stringify(data.error)
        throw new Error(errMsg)
      }

      console.log('[useApi] API call successful.')
      isLoading.value = false
      return data // Resolve with the parsed data
    } catch (err) {
      console.error('[useApi] Error during API call:', err)
      error.value = err.message || 'An unknown API error occurred.' // Store error message
      isLoading.value = false
      // Reject the promise on failure for await/async handling
      throw { isError: true, message: error.value } // Reject standard error object
    }
  }

  // Return reactive states and the API call function
  // Keep readFileAsBase64 available if it was passed in, for ChatView compatibility
  return {
    isLoading,
    error, // Expose error state
    callApi,
    readFileAsBase64, // Make available if provided
  }
}
