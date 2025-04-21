// netlify/functions/call-openai-gpt-4.js

// Securely access the OpenAI API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
// Define the OpenAI API endpoint for Chat Completions
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

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
 * Maps the finish reason from OpenAI to a simplified reason code.
 * @param {string | null} openaiFinishReason - The finish reason from OpenAI API.
 * @returns {string | null} - Simplified reason code ('STOP', 'MAX_TOKENS', 'SAFETY', 'TOOL_CALLS', 'OTHER', null).
 */
const mapFinishReason = (openaiFinishReason) => {
  if (!openaiFinishReason) return null
  switch (openaiFinishReason) {
    case 'stop':
      return 'STOP'
    case 'length':
      return 'MAX_TOKENS'
    case 'content_filter':
      return 'SAFETY'
    case 'tool_calls':
      return 'TOOL_CALLS'
    default:
      console.warn(`Unknown OpenAI finish reason encountered: ${openaiFinishReason}`)
      return 'OTHER'
  }
}

/**
 * The main handler function for the Netlify serverless function.
 * Handles POST requests to interact with the OpenAI Chat Completions API.
 * Now expects a JSON body matching the OpenAI API structure, including a 'messages' array.
 * @param {object} event - The Netlify event object containing request details.
 * @param {object} _context - The Netlify context object (unused).
 * @returns {Promise<object>} - A promise resolving to the Netlify Function response object.
 */
export const handler = async (event, _context) => {
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
  if (!OPENAI_API_KEY) {
    console.error('FATAL: OpenAI API key is not configured in Netlify environment variables.')
    return createResponse(500, { error: 'Internal Server Error: API key not configured.' })
  }

  // --- Parse Request Body ---
  let requestPayload
  try {
    if (!event.body) {
      throw new Error('Request body is missing.')
    }
    requestPayload = JSON.parse(event.body)
    // Optional: Log the received payload to verify structure during testing
    // console.log("Parsed frontend payload:", JSON.stringify(requestPayload, null, 2));
  } catch (error) {
    console.error('Error parsing request body:', error)
    return createResponse(400, { error: `Invalid request body: ${error.message}. Expecting JSON.` })
  }

  // --- Validate Essential Payload Data ---
  // Check if the 'messages' array exists and is not empty
  if (
    !requestPayload.messages ||
    !Array.isArray(requestPayload.messages) ||
    requestPayload.messages.length === 0
  ) {
    console.error('Invalid payload: Missing or empty "messages" array.')
    return createResponse(400, { error: 'Invalid payload: Missing or empty "messages" array.' })
  }

  // Check the last message isn't empty (basic check)
  const lastMessage = requestPayload.messages[requestPayload.messages.length - 1]
  if (
    !lastMessage ||
    !lastMessage.content ||
    (Array.isArray(lastMessage.content) && lastMessage.content.length === 0) ||
    (typeof lastMessage.content === 'string' && !lastMessage.content.trim())
  ) {
    console.error('Invalid payload: Last message has no content.')
    // Allow OpenAI API to handle this potentially, but good to check.
    // return createResponse(400, { error: 'Invalid payload: Last message has no content.' });
  }

  // --- Prepare OpenAI API Request Body ---
  // Use parameters directly from the frontend payload, providing defaults
  const openaiRequestBody = {
    model: requestPayload.model || 'gpt-4o', // Default to gpt-4o if not provided
    messages: requestPayload.messages, // Use the messages array directly from frontend
    temperature: requestPayload.temperature ?? 0.7, // Default temperature
    max_tokens: requestPayload.max_tokens || 1024, // Default max tokens
    // Add any other parameters you might want to control (e.g., top_p, presence_penalty)
    // top_p: requestPayload.top_p,
  }

  // --- Call OpenAI API ---
  try {
    console.log(`Calling OpenAI API with model ${openaiRequestBody.model}`)
    // Optional: Log the final body being sent to OpenAI
    // console.log("Sending Request Body to OpenAI:", JSON.stringify(openaiRequestBody, null, 2));

    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(openaiRequestBody),
    })

    let openaiData
    try {
      // Get raw text first in case JSON parsing fails
      const rawText = await openaiResponse.text()
      // console.log("Raw OpenAI Response Text:", rawText); // Log raw text for debugging
      openaiData = JSON.parse(rawText)
    } catch (parseError) {
      console.error('Error parsing OpenAI API response JSON:', parseError)
      // Log the raw text again if parsing failed
      // console.error('Raw OpenAI API response text on parse error:', rawText);
      return createResponse(openaiResponse.status, {
        error: `Failed to parse API response. Status: ${openaiResponse.status}. See function logs for raw response.`,
      })
    }

    // console.log("Parsed OpenAI Response Data:", JSON.stringify(openaiData, null, 2));

    if (!openaiResponse.ok) {
      // Extract error details from OpenAI response if available
      const errorPayload = openaiData?.error || { message: `API Error ${openaiResponse.status}` }
      console.error('OpenAI API Error Response:', JSON.stringify(errorPayload, null, 2))
      return createResponse(openaiResponse.status, {
        // Send the specific error message from OpenAI back to frontend
        error: `OpenAI API Error: ${errorPayload.message || 'Unknown error'}`,
      })
    }

    // --- Process Successful Response ---
    let aiText = null
    let finishReason = null
    let usage = null // Include usage data

    if (openaiData.choices && openaiData.choices.length > 0) {
      const choice = openaiData.choices[0]
      finishReason = choice.finish_reason
      usage = openaiData.usage // Capture usage data

      if (choice.message && choice.message.content) {
        aiText = choice.message.content
      } else {
        console.warn('OpenAI response choice received but no message content found.')
      }

      if (finishReason && finishReason !== 'stop') {
        console.warn(`OpenAI response potentially stopped or truncated due to: ${finishReason}`)
      }
    } else {
      console.warn(
        'Unexpected OpenAI response structure (no choices):',
        JSON.stringify(openaiData, null, 2),
      )
    }

    const mappedFinishReason = mapFinishReason(finishReason)

    // Send the processed response back to the front-end.
    // The frontend expects 'aiText' key for the response content.
    return createResponse(200, {
      // Rename the key from OpenAI 'response' to what frontend uses
      response: {
        // Keep the nested 'response' structure if frontend expects it
        choices: [
          {
            // Mimic structure slightly if needed
            message: {
              content: aiText,
            },
          },
        ],
        // You might not need to mimic the full choices structure, check frontend:
        // Often just sending the text directly is fine:
        // aiText: aiText
      },
      // Or simply send the core data directly if frontend handles it:
      aiText: aiText, // Send aiText directly as frontend likely expects this key
      blockReason: mappedFinishReason, // Use the mapped reason
      usage: usage, // Optionally include token usage data
    })
  } catch (error) {
    console.error('Error fetching from OpenAI API or processing response:', error)
    return createResponse(500, { error: `Server error: ${error.message}` })
  }
}
