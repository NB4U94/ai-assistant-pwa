// netlify/functions/call-gemini.js

// Use native Node.js fetch (available in recent Node versions used by Netlify)

// Securely access the API key from Netlify environment variables
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
      'Access-Control-Allow-Origin': '*', // Allow requests from any origin (adjust for production)
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(body),
  }
}

/**
 * The main handler function for the Netlify serverless function.
 * Handles POST requests to interact with the Google Gemini API.
 * Expects a JSON body with { history: [], inputText: "", imageFile?: { base64Data: "", mimeType: "" }, assistantInstructions?: string | null }
 * @param {object} event - The Netlify event object containing request details.
 * @param {object} context - The Netlify context object.
 * @returns {Promise<object>} - A promise resolving to the Netlify Function response object.
 */
export const handler = async (event, context) => {
  // --- CORS Preflight Check ---
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {})
  }

  // --- Method Check ---
  if (event.httpMethod !== 'POST') {
    console.warn(`Received non-POST request: ${event.httpMethod}`)
    return createResponse(405, { error: 'Method Not Allowed' })
  }

  // --- API Key Check ---
  if (!GEMINI_API_KEY) {
    console.error('FATAL: Gemini API key is not configured in Netlify environment variables.')
    return createResponse(500, { error: 'Internal Server Error: API key not configured.' })
  }

  // --- Parse Request Body ---
  let requestPayload
  try {
    if (!event.body) {
      throw new Error('Request body is missing.')
    }
    requestPayload = JSON.parse(event.body)
    // console.log("Received payload:", JSON.stringify(requestPayload, null, 2));
  } catch (error) {
    console.error('Error parsing request body:', error)
    return createResponse(400, { error: `Invalid request body: ${error.message}. Expecting JSON.` })
  }

  // --- Prepare Gemini API Request ---
  const history = requestPayload.history || []
  const inputText = requestPayload.inputText || ''
  const imageInfo = requestPayload.imageFile
  // *** Extract assistant instructions ***
  const assistantInstructions = requestPayload.assistantInstructions || null
  // ************************************

  // Construct the 'parts' array for the *current* user message.
  let userParts = []
  if (inputText.trim() !== '') {
    userParts.push({ text: inputText })
  }
  if (imageInfo && imageInfo.base64Data && imageInfo.mimeType) {
    if (!imageInfo.mimeType.startsWith('image/')) {
      console.warn(`Invalid image mime type received: ${imageInfo.mimeType}`)
      return createResponse(400, { error: `Invalid image mime type: ${imageInfo.mimeType}` })
    }
    userParts.push({
      inlineData: {
        mimeType: imageInfo.mimeType,
        data: imageInfo.base64Data.includes(',')
          ? imageInfo.base64Data.split(',')[1]
          : imageInfo.base64Data,
      },
    })
  }

  // Prevent API call if there's no content for the current user turn.
  if (userParts.length === 0) {
    console.warn('Attempted to call API with no content parts for the current turn.')
    return createResponse(400, { error: 'Nothing to send to AI. Please provide text or an image.' })
  }

  // Construct the final request body for the Gemini API.
  const geminiRequestBody = {
    // The 'contents' array now only includes history + current user message
    contents: [...history, { role: 'user', parts: userParts }],
    // generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
    // safetySettings: [ { category: "HARM_CATEGORY_...", threshold: "BLOCK_MEDIUM_AND_ABOVE" } ]
  }

  // *** NEW: Add systemInstruction field IF instructions were provided ***
  if (
    assistantInstructions &&
    typeof assistantInstructions === 'string' &&
    assistantInstructions.trim() !== ''
  ) {
    console.log('Adding systemInstruction field to request body.')
    geminiRequestBody.systemInstruction = {
      parts: [{ text: assistantInstructions.trim() }],
    }
  } else {
    console.log('No assistant instructions provided, not adding systemInstruction field.')
  }
  // *********************************************************************

  // Construct the API endpoint URL.
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`

  // --- Call Gemini API ---
  try {
    // console.log(`Calling Gemini API: ${API_URL}`);
    // console.log("Sending Request Body:", JSON.stringify(geminiRequestBody, null, 2)); // Log the final body

    const geminiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequestBody),
    })

    let geminiData
    try {
      geminiData = await geminiResponse.json()
    } catch (parseError) {
      console.error('Error parsing Gemini API response JSON:', parseError)
      const rawText = await geminiResponse.text()
      console.error('Raw Gemini API response text:', rawText)
      return createResponse(geminiResponse.status, {
        error: `Failed to parse API response. Status: ${geminiResponse.status}. Response: ${rawText.substring(0, 200)}...`,
      })
    }

    // console.log("Raw Gemini Response:", JSON.stringify(geminiData, null, 2));

    if (!geminiResponse.ok) {
      const errorPayload = geminiData?.error || { message: `API Error ${geminiResponse.status}` }
      console.error('Gemini API Error:', JSON.stringify(errorPayload, null, 2))
      return createResponse(geminiResponse.status, {
        error: `Gemini API Error: ${errorPayload.message || 'Unknown error'}`,
      })
    }

    // --- Process Successful Response ---
    let aiText = null
    let blockReason = null
    let safetyRatings = null

    if (geminiData.candidates && geminiData.candidates.length > 0) {
      const candidate = geminiData.candidates[0]
      blockReason = candidate.finishReason
      safetyRatings = candidate.safetyRatings

      if (blockReason && blockReason !== 'STOP' && blockReason !== 'MAX_TOKENS') {
        console.warn(`Gemini response potentially blocked or truncated due to: ${blockReason}`)
        if (candidate.content?.parts?.length > 0 && candidate.content.parts[0].text) {
          aiText = candidate.content.parts[0].text
        }
      } else if (candidate.content?.parts?.length > 0 && candidate.content.parts[0].text) {
        aiText = candidate.content.parts[0].text
      } else {
        console.warn('Gemini response candidate received but no text part found.')
      }
    } else if (geminiData.promptFeedback?.blockReason) {
      blockReason = geminiData.promptFeedback.blockReason
      safetyRatings = geminiData.promptFeedback.safetyRatings
      console.warn(`Gemini prompt blocked due to: ${blockReason}`)
    } else {
      console.warn('Unexpected Gemini response structure:', JSON.stringify(geminiData, null, 2))
    }

    // Send the processed response back to the front-end.
    return createResponse(200, {
      aiText: aiText,
      blockReason: blockReason,
      safetyRatings: safetyRatings,
    })
  } catch (error) {
    console.error('Error fetching from Gemini API or processing response:', error)
    return createResponse(500, { error: `Server error: ${error.message}` })
  }
}
