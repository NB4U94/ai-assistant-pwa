// src/composables/useApi.js
import { ref } from 'vue'

/**
 * Composable for handling generic API calls to backend functions.
 * Handles JSON and streaming text/event-stream responses.
 *
 * @param {object} options - Optional initial configuration.
 * @returns {object} - Reactive loading/error state and the callApi function.
 */
export function useApi(options = {}) {
  // readFileAsBase64 is not directly used in callApi but kept for potential other uses of this composable instance.
  const readFileAsBase64 = options.readFileAsBase64 || null
  const isLoading = ref(false)
  const error = ref(null)

  /**
   * Calls a specified backend Netlify function.
   * Determines response type based on Content-Type header.
   *
   * @param {string} url - The Netlify function endpoint.
   * @param {object} payload - The JSON payload to send.
   * @param {string} method - The HTTP method (default: 'POST').
   * @returns {Promise<object|Response>} - Promise resolving to:
   * - Parsed JSON object for 'application/json' responses.
   * - The raw Response object for 'text/event-stream' or 'text/plain' (streaming) responses.
   * Rejects with an error object ({ isError: true, message: string }) on failure.
   */
  const callApi = async (url, payload, method = 'POST') => {
    isLoading.value = true
    error.value = null
    console.log(`[useApi] Calling ${method} ${url}`)

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' }, // Payload to Netlify function is always JSON
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        let errorMessage = `API Error: HTTP ${response.status} from ${url}`
        let responseText = ''
        try {
          responseText = await response.text()
          // Try to parse as JSON for structured errors, otherwise use text
          const parsedError = JSON.parse(responseText)
          errorMessage =
            parsedError.error?.message || // Specific error message field
            parsedError.error || // Generic error field
            parsedError.message || // Another common error message field
            `${errorMessage}: ${responseText.substring(0, 150)}` // Fallback to raw text
        } catch {
          // If parsing error body as JSON fails, use the text we got (if any)
          errorMessage += `: ${responseText.substring(0, 150) || response.statusText}`
        }
        console.error(`[useApi] API Error received: ${errorMessage}`)
        throw new Error(errorMessage) // Throw so it's caught by the catch block below
      }

      const contentType = response.headers.get('content-type')?.toLowerCase() || ''

      if (contentType.includes('text/event-stream')) {
        // --- Handle Server-Sent Events (SSE) Streaming Response ---
        console.log(
          `[useApi] Received SSE streaming response (Content-Type: ${contentType}). Returning raw Response object.`,
        )
        isLoading.value = false
        return response // Return the raw Response for the caller to handle the stream
      } else if (contentType.includes('text/plain')) {
        // --- Handle Plain Text Streaming Response (Legacy or specific use cases) ---
        console.log(
          `[useApi] Received plain text streaming response (Content-Type: ${contentType}). Returning raw Response object.`,
        )
        isLoading.value = false
        return response // Return the raw Response for the caller to handle the stream
      } else if (contentType.includes('application/json')) {
        // --- Handle JSON Response ---
        console.log(`[useApi] Received JSON response (Content-Type: ${contentType}). Parsing body.`)
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (parseJsonError) {
          // Give the error variable a name
          console.error('[useApi] Invalid JSON received from API:', responseText, parseJsonError)
          throw new Error(`Invalid JSON received from API: ${responseText.substring(0, 150)}`)
        }

        // Optional: Check for application-level errors in JSON (if your APIs use a convention like { error: "..." })
        if (data.error) {
          console.error('[useApi] API returned JSON with an error field:', data.error)
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
        // This case should be less common if backends correctly set Content-Type
        console.warn(
          `[useApi] Received unexpected Content-Type: '${contentType}'. Attempting to read as text as a fallback.`,
        )
        const fallbackText = await response.text()
        console.log(
          '[useApi] Fallback text content (first 200 chars):',
          fallbackText.substring(0, 200),
        )
        isLoading.value = false
        // It's better to return an object that indicates this was a fallback,
        // rather than potentially confusing the caller.
        return { fallbackText: fallbackText, originalContentType: contentType }
      }
    } catch (err) {
      // Catch errors from fetch, !response.ok, or JSON parsing/handling
      console.error('[useApi] Error during API call execution:', err)
      // Ensure error.value is set with a meaningful message from the caught error
      error.value = err.message || 'An unknown API error occurred.'
      isLoading.value = false
      // Re-throw as a structured error for the calling function to handle
      throw { isError: true, message: error.value, originalError: err }
    }
  }

  return {
    isLoading,
    error,
    callApi,
    readFileAsBase64, // Kept for compatibility if used elsewhere by this instance
  }
}
