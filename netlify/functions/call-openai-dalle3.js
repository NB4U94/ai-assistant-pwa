// netlify/functions/call-openai-dalle3-api.js
// NOTE: This function originally called the Stability AI API, but has been modified
// to use the OpenAI DALL-E 3 API as per project requirements.

// Use native Node.js fetch (available in recent Node versions used by Netlify)

// Securely access the OpenAI API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
// Define the OpenAI API endpoint for DALL-E 3 image generation
const OPENAI_API_URL = 'https://api.openai.com/v1/images/generations'
// Define the model to use
const DALL_E_MODEL = 'dall-e-3'

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
  if (!OPENAI_API_KEY) {
    console.error('FATAL: OpenAI API key is not configured in environment variables.')
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
    // TODO: Consider adding optional parameters like size, quality, style from requestPayload if needed
  } catch (error) {
    console.error('Error parsing request body:', error)
    return createResponse(400, {
      error: `Invalid request body: ${error.message}. Expecting JSON object with a non-empty 'prompt' string.`,
    })
  }

  const prompt = requestPayload.prompt
  // Default settings - can be overridden by values from requestPayload if implemented
  const size = requestPayload.size || '1024x1024' // Default size for DALL-E 3
  const quality = requestPayload.quality || 'standard' // Default quality 'standard' or 'hd'
  const style = requestPayload.style || 'vivid' // Default style 'vivid' or 'natural'
  const response_format = 'b64_json' // Request Base64 JSON format

  // Validate requested size
  const validSizes = ['1024x1024', '1792x1024', '1024x1792']
  if (!validSizes.includes(size)) {
    console.error(`Invalid size parameter requested: ${size}`)
    return createResponse(400, {
      error: `Invalid size parameter. Must be one of: ${validSizes.join(', ')}`,
    })
  }

  // --- Prepare OpenAI API Request Body ---
  const requestBody = {
    model: DALL_E_MODEL,
    prompt: prompt,
    n: 1, // DALL-E 3 only supports n=1
    size: size,
    quality: quality,
    style: style,
    response_format: response_format,
    // user: "user-identifier" // Optional: Add if needed for abuse monitoring
  }

  console.log(`Calling OpenAI DALL-E 3 API for prompt: "${prompt.substring(0, 50)}..."`)

  // --- Call OpenAI API ---
  try {
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    })

    // Check if the API call itself failed
    if (!openaiResponse.ok) {
      let errorBodyText = `OpenAI API Error (${openaiResponse.status} ${openaiResponse.statusText})`
      try {
        const errorJson = await openaiResponse.json()
        errorBodyText = errorJson?.error?.message || JSON.stringify(errorJson)
      } catch (_parseError) {
        console.warn(
          'Non-JSON error response received from OpenAI API or failed to parse:',
          await openaiResponse.text(),
        )
        // Use the status text if JSON parsing fails
      }
      console.error('OpenAI API Error Response Details:', errorBodyText)
      return createResponse(openaiResponse.status, {
        error: `OpenAI API Error: ${errorBodyText}`,
      })
    }

    // If response is OK, parse the successful JSON response
    const responseData = await openaiResponse.json()

    // Validate the structure of the successful response
    if (
      !responseData ||
      !responseData.data ||
      responseData.data.length === 0 ||
      !responseData.data[0].b64_json
    ) {
      console.error('Unexpected successful response structure from OpenAI DALL-E 3:', responseData)
      throw new Error('Received unexpected successful response format from OpenAI DALL-E 3 API.')
    }

    // Extract the Base64 image data and revised prompt
    const imageBase64 = responseData.data[0].b64_json
    const revisedPrompt = responseData.data[0].revised_prompt || null // DALL-E 3 may revise the prompt

    console.log(`Successfully received image data from OpenAI DALL-E 3 API.`)
    if (revisedPrompt) {
      console.log(`Original prompt was revised to: "${revisedPrompt.substring(0, 100)}..."`)
    }

    // Send the base64 image back to the front-end
    // Keep the 'imageBase64' key for potential compatibility with existing front-end code
    return createResponse(200, {
      imageBase64: imageBase64,
      revisedPrompt: revisedPrompt, // Optionally include the revised prompt
    })
  } catch (error) {
    // Catch network errors during fetch or errors thrown during response processing
    console.error('Error calling/processing OpenAI DALL-E 3 API:', error)
    return createResponse(500, { error: `Server error: ${error.message}` })
  }
}
