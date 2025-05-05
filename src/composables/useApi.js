// src/composables/useApi.js
import { ref } from 'vue'

/**
 * Composable for handling generic API calls to backend functions.
 * Now handles both JSON and streaming text responses.
 *
 * @param {object} options - Optional initial configuration.
 * @param {Function} options.readFileAsBase64 - Optional function (remains for compatibility).
 * @returns {object} - Reactive loading/error state and the callApi function.
 */
export function useApi(options = {}) {
  const readFileAsBase64 = options.readFileAsBase64 || null
  const isLoading = ref(false)
  const error = ref(null)

  /**
   * Calls a specified backend Netlify function.
   * Determines response type (JSON or Stream) based on Content-Type header.
   *
   * @param {string} url - The Netlify function endpoint.
   * @param {object} payload - The JSON payload to send.
   * @param {string} method - The HTTP method (default: 'POST').
   * @returns {Promise<object|Response>} - Promise resolving to:
   * - Parsed JSON object for 'application/json' responses.
   * - The raw Response object for 'text/plain' (streaming) responses.
   * Rejects with an error object ({ isError: true, message: string }) on failure.
   */
  const callApi = async (url, payload, method = 'POST') => {
    isLoading.value = true
    error.value = null
    console.log(`[useApi] Calling ${method} ${url}`)

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      // --- Handle initial non-OK responses (applies to both JSON and Stream attempts) ---
      if (!response.ok) {
        let errorMessage = `API Error: HTTP ${response.status} from ${url}`
        let responseText = ''
        try {
          responseText = await response.text()
          const parsedError = JSON.parse(responseText)
          errorMessage =
            parsedError.error?.message ||
            parsedError.error ||
            `${errorMessage}: ${responseText.substring(0, 150)}`
        } catch {
          // <-- Removed 'parseError' variable
          // If parsing error body fails, use the text we got (if any)
          errorMessage += `: ${responseText.substring(0, 150) || response.statusText}`
        }
        console.error(`[useApi] API Error received: ${errorMessage}`)
        throw new Error(errorMessage)
      }

      // --- Handle OK responses based on Content-Type ---
      const contentType = response.headers.get('content-type')?.toLowerCase() || ''

      if (contentType.includes('text/plain')) {
        // --- Handle Streaming Response ---
        console.log(
          `[useApi] Received streaming response (Content-Type: ${contentType}). Returning raw Response object.`,
        )
        isLoading.value = false
        return response
      } else if (contentType.includes('application/json')) {
        // --- Handle JSON Response ---
        console.log(`[useApi] Received JSON response (Content-Type: ${contentType}). Parsing body.`)
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch {
          // <-- Removed 'e' variable
          console.error('[useApi] Invalid JSON received from API:', responseText)
          throw new Error(`Invalid JSON received from API: ${responseText.substring(0, 150)}`)
        }

        // Optional: Check for application-level errors in JSON
        if (data.error) {
          console.error('[useApi] API returned JSON error object:', data.error)
          const errMsg =
            typeof data.error === 'string'
              ? data.error
              : data.error?.message || JSON.stringify(data.error)
          throw new Error(errMsg)
        }

        console.log('[useApi] JSON API call successful.')
        isLoading.value = false
        return data
      } else {
        // --- Handle Unexpected Content-Type ---
        console.warn(
          `[useApi] Received unexpected Content-Type: ${contentType}. Attempting to read as text.`,
        )
        const fallbackText = await response.text()
        console.log('[useApi] Fallback text content:', fallbackText.substring(0, 200))
        isLoading.value = false
        return { fallbackText: fallbackText }
      }
    } catch (err) {
      console.error('[useApi] Error during API call:', err)
      error.value = err.message || 'An unknown API error occurred.'
      isLoading.value = false
      throw { isError: true, message: error.value }
    }
  }

  // Return reactive states and the API call function
  return {
    isLoading,
    error,
    callApi,
    readFileAsBase64,
  }
}
