// netlify/functions/call-stability-api.js

// Note: `Workspace` and `FormData` are built-in in modern Node.js environments used by Netlify Functions.
// The `process` object for environment variables is also globally available in this environment.

// Securely access the Stability AI API key from environment variables
const STABILITY_API_KEY = process.env.STABILITY_API_KEY
// Define the Stability AI API endpoint we want to use
const STABILITY_API_HOST = 'https://api.stability.ai'
// Using 'sd3' engine ID
const ENGINE_ID = 'sd3'
const API_URL = `${STABILITY_API_HOST}/v2beta/stable-image/generate/${ENGINE_ID}`

/**
 * Helper function to create a consistent JSON response for Netlify Functions.
 * Includes CORS headers.
 */
const createResponse = (statusCode, body) => {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Allow requests from any origin (adjust in production if needed)
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(body),
  }
}

// Renamed 'context' to '_context' to indicate it's intentionally unused
export const handler = async (event, _context) => {
  // --- CORS Preflight Check ---
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {})
  }

  // --- Method Check ---
  if (event.httpMethod !== 'POST') {
    console.warn(`Method Not Allowed: Received ${event.httpMethod}`)
    return createResponse(405, { error: 'Method Not Allowed' })
  }

  // --- API Key Check ---
  if (!STABILITY_API_KEY) {
    console.error('FATAL: Stability AI API key is not configured in environment variables.')
    return createResponse(500, { error: 'Internal Server Error: API key configuration issue.' })
  }

  // --- Parse Request Body ---
  let requestPayload
  try {
    if (!event.body) {
      throw new Error('Request body is missing.')
    }
    requestPayload = JSON.parse(event.body)
    if (
      !requestPayload.prompt ||
      typeof requestPayload.prompt !== 'string' ||
      requestPayload.prompt.trim() === ''
    ) {
      throw new Error('Missing or invalid "prompt" string in request body.')
    }
  } catch (error) {
    console.error('Error parsing request body:', error)
    return createResponse(400, {
      error: `Invalid request body: ${error.message}. Expecting JSON object with a non-empty 'prompt' string.`,
    })
  }

  const prompt = requestPayload.prompt

  // --- Prepare Stability AI API Request ---
  const formData = new FormData()
  formData.append('prompt', prompt)
  // *** CHANGED OUTPUT FORMAT TO JPEG ***
  formData.append('output_format', 'jpeg') // Changed from 'png' to 'jpeg'
  // *** END CHANGE ***
  formData.append('aspect_ratio', '1:1') // Default aspect ratio

  console.log(`Calling Stability API (${ENGINE_ID}) for prompt: "${prompt.substring(0, 50)}..."`)

  // --- Call Stability AI API ---
  try {
    const stabilityResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STABILITY_API_KEY}`,
        Accept: 'application/json', // Request JSON response containing base64 image
      },
      body: formData,
    })

    // Check if the API call itself failed
    if (!stabilityResponse.ok) {
      let errorBody = `Stability API Error (${stabilityResponse.status} ${stabilityResponse.statusText})`
      let rawText = ''
      try {
        rawText = await stabilityResponse.text()
        try {
          const errorJson = JSON.parse(rawText)
          const message = errorJson.errors
            ? errorJson.errors.join(', ')
            : errorJson.message || JSON.stringify(errorJson)
          errorBody = message
        } catch (_parseError) {
          console.warn(
            'Non-JSON error response received from Stability API:',
            rawText.substring(0, 150) + '...',
          )
          errorBody += `: ${rawText.substring(0, 150)}...`
        }
      } catch (readError) {
        console.error('Failed to read error response body:', readError)
        errorBody += ': Failed to read error response body.'
      }
      console.error('Stability API Error Response Details:', errorBody)
      return createResponse(stabilityResponse.status, {
        error: `Stability API Error: ${errorBody}`,
      })
    }

    // If response is OK, parse the successful JSON response
    const responseData = await stabilityResponse.json()

    // Validate the structure of the successful response
    if (
      !responseData ||
      typeof responseData.image !== 'string' ||
      responseData.image.trim() === ''
    ) {
      console.error('Unexpected successful response structure from Stability AI:', responseData)
      throw new Error('Received unexpected successful response format from Stability API.')
    }

    // Send the base64 image back to the front-end
    console.log(`Successfully received image data from Stability API.`)
    return createResponse(200, {
      imageBase64: responseData.image,
    })
  } catch (error) {
    // Catch network errors during fetch or errors thrown during response processing
    console.error('Error calling/processing Stability API:', error)
    return createResponse(500, { error: `Server error: ${error.message}` })
  }
}
