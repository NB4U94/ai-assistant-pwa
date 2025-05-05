/* global process */ // Tell ESLint about 'process'
// netlify/functions/call-openai-gpt-4.js
// No longer importing ReadableStream from 'node:stream/web'
import { PassThrough } from 'node:stream' // For creating Node.js stream for Netlify response

// Access API Key (Unchanged)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

// Helper to create NON-STREAMING JSON error/options responses (Unchanged)
const createJsonResponse = (statusCode, body) => {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(body),
  }
}

// processOpenAIChunk function (Unchanged from previous OpenAI version)
/**
 * Parses Server-Sent Events (SSE) chunks from OpenAI API stream.
 * Handles multiple events within a single chunk.
 * Extracts the text content from 'delta.content'.
 * @param {Uint8Array} chunk - The raw chunk from the stream.
 * @param {TextDecoder} decoder - TextDecoder instance to decode the chunk.
 * @returns {string[]} - An array of text content strings extracted from the chunk's events.
 */
function processOpenAIChunk(chunk, decoder) {
  const textContents = []
  const lines = decoder.decode(chunk, { stream: true }).split('\n\n')

  for (const line of lines) {
    if (line.trim().startsWith('data:')) {
      const dataContent = line.substring(5).trim()
      if (dataContent === '[DONE]') {
        continue
      }
      try {
        const parsedJson = JSON.parse(dataContent)
        const deltaContent = parsedJson.choices?.[0]?.delta?.content
        if (deltaContent) {
          textContents.push(deltaContent)
        }
      } catch (error) {
        console.error(
          '[Netlify Function - OpenAI] Error parsing OpenAI stream chunk JSON:',
          dataContent,
          error,
        )
      }
    }
  }
  return textContents
}

// mapFinishReason function (Unchanged - might not be used in stream)
/* const mapFinishReason = (openaiFinishReason) => { ... } */

// Main handler function (Modified for Streaming Return)
export const handler = async (event) => {
  // Removed unused _context
  // --- CORS Preflight Check (Unchanged) ---
  if (event.httpMethod === 'OPTIONS') {
    return createJsonResponse(200, {})
  }

  // --- Method Check (Unchanged) ---
  if (event.httpMethod !== 'POST') {
    console.warn(`[call-openai] Received non-POST request: ${event.httpMethod}`)
    return createJsonResponse(405, { error: 'Method Not Allowed' })
  }

  // --- API Key Check (Unchanged) ---
  if (!OPENAI_API_KEY) {
    console.error('[call-openai] FATAL: OpenAI API key is not configured.')
    return createJsonResponse(500, { error: 'Internal Server Error: API key not configured.' })
  }

  // --- Parse Request Body (Unchanged) ---
  let requestPayload
  try {
    if (!event.body) throw new Error('Request body is missing.')
    requestPayload = JSON.parse(event.body)
  } catch (error) {
    console.error('[call-openai] Error parsing request body:', error)
    return createJsonResponse(400, {
      error: `Invalid request body: ${error.message}. Expecting JSON.`,
    })
  }

  // --- Validate Essential Payload Data (Unchanged) ---
  if (
    !requestPayload.messages ||
    !Array.isArray(requestPayload.messages) ||
    requestPayload.messages.length === 0
  ) {
    console.error('[call-openai] Invalid payload: Missing or empty "messages" array.')
    return createJsonResponse(400, { error: 'Invalid payload: Missing or empty "messages" array.' })
  }

  // --- Prepare OpenAI API Request Body (Ensure stream: true) ---
  const openaiRequestBody = {
    model: requestPayload.model || 'gpt-4o',
    messages: requestPayload.messages,
    temperature: requestPayload.temperature ?? 0.7,
    max_tokens: requestPayload.max_tokens || 1024,
    top_p: requestPayload.top_p ?? 1.0,
    stream: true, // Ensure streaming is requested
  }

  // --- Call OpenAI API & Stream Response ---
  try {
    console.log(
      `[call-openai] Calling OpenAI API (Streaming) with model ${openaiRequestBody.model}`,
    )

    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(openaiRequestBody),
    })

    // --- Handle Non-OK Initial Response from OpenAI ---
    if (!openaiResponse.ok) {
      let errorPayload = { message: `OpenAI API Error: Status ${openaiResponse.status}` }
      try {
        const errorData = await openaiResponse.json() // Try parsing potential error JSON
        errorPayload = errorData?.error || errorPayload
      } catch (e) {
        console.error('[call-openai] Could not parse error response body from OpenAI:', e)
        const errorText = await openaiResponse.text().catch(() => openaiResponse.statusText) // Get text if possible
        errorPayload.message += `: ${errorText || ''}`.trim()
      }
      console.error(
        '[call-openai] OpenAI API Error Response Status:',
        openaiResponse.status,
        'Payload:',
        errorPayload,
      )
      return createJsonResponse(openaiResponse.status, { error: errorPayload.message })
    }

    // --- Create a PassThrough Stream for Netlify ---
    const nodeStream = new PassThrough()

    // Function to pipe the web stream (openaiResponse.body) to the Node stream (nodeStream)
    const pipeStream = async () => {
      const reader = openaiResponse.body.getReader()
      const decoder = new TextDecoder()
      const encoder = new TextEncoder()
      console.log('[call-openai] Started piping stream response back to client...')
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log('[call-openai] OpenAI stream ended.')
            break // Exit the loop when the stream is finished
          }
          // Process the chunk from OpenAI (can contain multiple SSE events)
          const textFragments = processOpenAIChunk(value, decoder)
          // Write each extracted text fragment to the Node stream
          for (const text of textFragments) {
            nodeStream.write(encoder.encode(text)) // Encode text back to Uint8Array
          }
        }
      } catch (error) {
        console.error('[call-openai] Error reading or processing OpenAI stream:', error)
        nodeStream.write(encoder.encode(`\n\n--- Stream Error: ${error.message} ---\n`)) // Write error to stream
      } finally {
        console.log('[call-openai] Closing Node stream.')
        nodeStream.end() // End the Node stream once the OpenAI stream is done or errors
      }
    }

    pipeStream() // Start piping asynchronously

    // --- Return the Node.js Stream for Netlify ---
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8', // Sending plain text chunks
        'Access-Control-Allow-Origin': '*', // CORS
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
      body: nodeStream, // Return the Node.js stream
      isBase64Encoded: false, // Let Netlify know body is not base64
    }
  } catch (error) {
    // Handle errors during the initial fetch setup
    console.error('[call-openai] Error setting up fetch to OpenAI API:', error)
    return createJsonResponse(500, { error: `Server setup error: ${error.message}` })
  }
}
