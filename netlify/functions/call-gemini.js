// netlify/functions/call-gemini.js

// Use native Node.js fetch (available in recent Node versions used by Netlify)

// Securely access the API key from Netlify environment variables
// Ensure GEMINI_API_KEY is set in Netlify build/deploy settings or .env for local dev
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
// Define the model name to use
const MODEL_NAME = 'gemini-1.5-flash' // Or 'gemini-pro', etc.

/**
 * Helper function to create a consistent JSON response object for Netlify Functions.
 * Includes CORS headers.
 * @param {number} statusCode - The HTTP status code.
 * @param {object} body - The JSON body to send back.
 * @returns {object} - The Netlify Function response object.
 */
const createResponse = (statusCode, body) => {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      // Allow requests from any origin. Restrict this in production if needed.
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      // Allow POST for the actual request and OPTIONS for CORS preflight checks.
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(body),
  }
}

/**
 * The main handler function for the Netlify serverless function.
 * Handles POST requests to interact with the Google Gemini API.
 * Expects a JSON body with { history: [], inputText: "", imageFile: { base64Data: "", mimeType: "" } | null }
 * @param {object} event - The Netlify event object containing request details.
 * @param {object} context - The Netlify context object.
 * @returns {Promise<object>} - A promise resolving to the Netlify Function response object.
 */
export const handler = async (event, context) => {
  // --- CORS Preflight Check ---
  // Browsers send an OPTIONS request first to check CORS policy.
  if (event.httpMethod === 'OPTIONS') {
    // Respond successfully to the preflight request.
    return createResponse(200, {})
  }

  // --- Method Check ---
  // Ensure the request is a POST request.
  if (event.httpMethod !== 'POST') {
    console.warn(`Received non-POST request: ${event.httpMethod}`)
    return createResponse(405, { error: 'Method Not Allowed' })
  }

  // --- API Key Check ---
  // Verify the API key is available in the environment.
  if (!GEMINI_API_KEY) {
    console.error('FATAL: Gemini API key is not configured in Netlify environment variables.')
    // Do not expose detailed errors to the client in production if possible.
    return createResponse(500, { error: 'Internal Server Error: API key not configured.' })
  }

  // --- Parse Request Body ---
  let requestPayload
  try {
    // Ensure the request body exists and is valid JSON.
    if (!event.body) {
      throw new Error('Request body is missing.')
    }
    requestPayload = JSON.parse(event.body)
    // Optional: Log received data for debugging (consider removing sensitive data in production logs)
    // console.log("Received payload:", JSON.stringify(requestPayload, null, 2));
  } catch (error) {
    console.error('Error parsing request body:', error)
    return createResponse(400, { error: `Invalid request body: ${error.message}. Expecting JSON.` })
  }

  // --- Prepare Gemini API Request ---
  // Extract data from the parsed payload, providing defaults.
  const history = requestPayload.history || []
  const inputText = requestPayload.inputText || ''
  const imageInfo = requestPayload.imageFile // Expects { base64Data, mimeType } or null/undefined

  // Construct the 'parts' array for the user's message.
  let userParts = []
  // Add text part if it's not empty.
  if (inputText.trim() !== '') {
    userParts.push({ text: inputText })
  }
  // Add image part if valid image data is provided.
  if (imageInfo && imageInfo.base64Data && imageInfo.mimeType) {
    // Basic validation for mime type (optional but recommended)
    if (!imageInfo.mimeType.startsWith('image/')) {
      console.warn(`Invalid image mime type received: ${imageInfo.mimeType}`)
      return createResponse(400, { error: `Invalid image mime type: ${imageInfo.mimeType}` })
    }
    userParts.push({
      inlineData: {
        mimeType: imageInfo.mimeType,
        // Ensure only the base64 data itself is sent, without data URI prefix
        data: imageInfo.base64Data.includes(',')
          ? imageInfo.base64Data.split(',')[1]
          : imageInfo.base64Data,
      },
    })
    // console.log("Image data included in parts for API call.");
  } else {
    // console.log("No image data included in parts for API call.");
  }

  // Prevent API call if there's no text and no image.
  if (userParts.length === 0) {
    console.warn('Attempted to call API with no content parts (no text or image).')
    return createResponse(400, { error: 'Nothing to send to AI. Please provide text or an image.' })
  }

  // Construct the final request body for the Gemini API.
  const geminiRequestBody = {
    // Combine previous history with the new user message.
    contents: [...history, { role: 'user', parts: userParts }],
    // Add generationConfig and safetySettings if needed for customization.
    // generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
    // safetySettings: [ { category: "HARM_CATEGORY_...", threshold: "BLOCK_MEDIUM_AND_ABOVE" } ]
  }

  // Construct the API endpoint URL.
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`

  // --- Call Gemini API ---
  try {
    // console.log(`Calling Gemini API: ${API_URL}`); // Log URL only if debugging needed
    const geminiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequestBody),
    })

    // Attempt to parse the response body as JSON, regardless of status code.
    let geminiData
    try {
      geminiData = await geminiResponse.json()
    } catch (parseError) {
      // Handle cases where the response is not valid JSON (e.g., plain text error from proxy/Google)
      console.error('Error parsing Gemini API response JSON:', parseError)
      // Try to get raw text response if JSON parsing fails
      const rawText = await geminiResponse.text()
      console.error('Raw Gemini API response text:', rawText)
      return createResponse(geminiResponse.status, {
        error: `Failed to parse API response. Status: ${geminiResponse.status}. Response: ${rawText.substring(0, 200)}...`,
      })
    }

    // Log the raw response from Gemini (optional, for debugging)
    // console.log("Raw Gemini Response:", JSON.stringify(geminiData, null, 2));

    // Check if the API call itself was successful (HTTP status code).
    if (!geminiResponse.ok) {
      // Extract error details from the parsed JSON response if available.
      const errorPayload = geminiData?.error || { message: `API Error ${geminiResponse.status}` }
      console.error('Gemini API Error:', JSON.stringify(errorPayload, null, 2))
      // Return a structured error to the front-end.
      return createResponse(geminiResponse.status, {
        error: `Gemini API Error: ${errorPayload.message || 'Unknown error'}`,
      })
    }

    // --- Process Successful Response ---
    let aiText = null
    let blockReason = null
    let safetyRatings = null

    // Check if the response contains candidates (successful generation).
    if (geminiData.candidates && geminiData.candidates.length > 0) {
      const candidate = geminiData.candidates[0]
      // Capture finish reason (e.g., STOP, MAX_TOKENS, SAFETY, RECITATION, OTHER).
      blockReason = candidate.finishReason
      // Capture safety ratings if provided.
      safetyRatings = candidate.safetyRatings

      // Check if the generation was stopped for reasons other than normal completion.
      if (blockReason && blockReason !== 'STOP' && blockReason !== 'MAX_TOKENS') {
        console.warn(`Gemini response potentially blocked or truncated due to: ${blockReason}`)
        // Decide if you want to return partial text or indicate blockage
        // If content exists even with a block reason, extract it
        if (candidate.content?.parts?.length > 0 && candidate.content.parts[0].text) {
          aiText = candidate.content.parts[0].text
        }
      } else if (candidate.content?.parts?.length > 0 && candidate.content.parts[0].text) {
        // Normal case: Extract the generated text.
        aiText = candidate.content.parts[0].text
      } else {
        // Case: No text part found even if finishReason was STOP.
        console.warn('Gemini response candidate received but no text part found.')
      }
    } else if (geminiData.promptFeedback?.blockReason) {
      // Handle cases where the entire prompt was blocked before generation.
      blockReason = geminiData.promptFeedback.blockReason
      safetyRatings = geminiData.promptFeedback.safetyRatings
      console.warn(`Gemini prompt blocked due to: ${blockReason}`)
    } else {
      // Handle unexpected response structure.
      console.warn('Unexpected Gemini response structure:', JSON.stringify(geminiData, null, 2))
    }

    // Send the processed response back to the front-end.
    return createResponse(200, {
      aiText: aiText, // Will be null if blocked/error or no text generated
      blockReason: blockReason, // Include block reason (STOP, SAFETY, etc.)
      safetyRatings: safetyRatings, // Include safety ratings if available
    })
  } catch (error) {
    // Catch network errors or other unexpected issues during the fetch call.
    console.error('Error fetching from Gemini API or processing response:', error)
    return createResponse(500, { error: `Server error: ${error.message}` })
  }
}
