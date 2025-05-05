/* global process */ // Tell ESLint about process
// netlify/functions/call-google-gemini.mjs
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
// import { ReadableStream } from 'node:stream/web'; // <<< REMOVED this unused import
import { PassThrough } from 'node:stream' // <<< KEEP this one for the Node.js stream

// Basic safety settings (Unchanged)
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
]

// Helper to create NON-STREAMING JSON error/options responses (Unchanged)
const createJsonResponse = (statusCode, body) => {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(body),
  }
}

// processGeminiChunk function (Unchanged)
/**
 * Processes stream chunks from Gemini API.
 * Extracts the text content.
 * @param {object} chunk - The chunk object from the Gemini stream.
 * @returns {string | null} - The text content string or null.
 */
function processGeminiChunk(chunk) {
  try {
    const text = chunk?.text?.()
    if (typeof text === 'string') {
      return text
    }
    const blockReason = chunk?.promptFeedback?.blockReason
    if (blockReason) {
      console.warn(`[call-google-gemini] Stream chunk blocked: ${blockReason}`)
      return `\n(Content blocked: ${blockReason})\n`
    }
  } catch (error) {
    console.error('[call-google-gemini] Error processing Gemini stream chunk:', chunk, error)
  }
  return null
}

// Main handler function (Unchanged)
export const handler = async (event) => {
  // --- CORS Preflight Check ---
  if (event.httpMethod === 'OPTIONS') {
    return createJsonResponse(200, {})
  }

  // --- Method Check ---
  if (event.httpMethod !== 'POST') {
    console.warn(`[call-google-gemini] Received non-POST request: ${event.httpMethod}`)
    return createJsonResponse(405, { error: 'Method Not Allowed' })
  }

  // --- API Key Check ---
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    console.error('[call-google-gemini] GOOGLE_API_KEY environment variable not set.')
    return createJsonResponse(500, { error: 'Server configuration error: Missing API Key.' })
  }

  // --- Initialize Google AI Client ---
  let genAI
  try {
    genAI = new GoogleGenerativeAI(apiKey)
  } catch (initError) {
    console.error('[call-google-gemini] Failed to initialize GoogleGenerativeAI:', initError)
    return createJsonResponse(500, {
      error: 'Server configuration error: Failed to initialize AI Client.',
    })
  }

  // --- Parse Request Body ---
  let requestPayload
  try {
    if (!event.body) throw new Error('Request body is missing.')
    requestPayload = JSON.parse(event.body)
  } catch (error) {
    console.error('[call-google-gemini] Error parsing request body:', error)
    return createJsonResponse(400, {
      error: `Invalid request body: ${error.message}. Expecting JSON.`,
    })
  }

  // --- Validate and Prepare Data ---
  const {
    model: modelId = 'gemini-1.5-flash-latest',
    messages,
    temperature,
    max_tokens,
    top_p,
  } = requestPayload

  if (!Array.isArray(messages) || messages.length === 0) {
    return createJsonResponse(400, { error: 'Bad Request: Missing messages.' })
  }

  // Separate System Prompt and History (Unchanged)
  let systemInstructionContent = null
  const historyContents = messages
    .filter(
      /* ... filter logic unchanged ... */ (msg) => {
        if (msg.role === 'system') {
          if (typeof msg.content === 'string') systemInstructionContent = msg.content
          return false
        }
        return msg.role === 'user' || msg.role === 'assistant'
      },
    )
    .map(
      /* ... mapping logic unchanged ... */ (msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: Array.isArray(msg.content)
          ? msg.content.map((part) => ({ text: part.text }))
          : [{ text: String(msg.content || '') }],
      }),
    )

  // Prepare generation config (Unchanged)
  const generationConfig = {
    temperature: temperature ?? undefined,
    topP: top_p ?? undefined,
  }
  if (max_tokens && Number.isInteger(Number(max_tokens)) && Number(max_tokens) > 0) {
    generationConfig.maxOutputTokens = Number(max_tokens)
  }

  // --- Initialize Model (Unchanged) ---
  console.log(`[call-google-gemini] Initializing model: ${modelId}`)
  if (systemInstructionContent) {
    console.log('[call-google-gemini] Using system instruction.')
  }
  let model
  try {
    model = genAI.getGenerativeModel({
      model: modelId,
      safetySettings,
      systemInstruction: systemInstructionContent || undefined,
      generationConfig,
    })
  } catch (modelError) {
    console.error(`[call-google-gemini] Error initializing model ${modelId}:`, modelError)
    return createJsonResponse(500, {
      error: `Server error: Could not initialize AI model. ${modelError.message}`,
    })
  }

  // --- Call Google AI and Stream Response (Unchanged from previous version) ---
  try {
    console.log(`[call-google-gemini] Calling generateContentStream for model: ${modelId}`)

    const streamResult = await model.generateContentStream({
      contents: historyContents,
    })

    // Create a PassThrough Stream for Netlify
    // const { PassThrough } = await import('node:stream'); // Keep import at top
    const nodeStream = new PassThrough()

    // Function to pipe the web stream to the Node stream (Unchanged)
    const pipeStream = async () => {
      const encoder = new TextEncoder()
      try {
        for await (const chunk of streamResult.stream) {
          const text = processGeminiChunk(chunk)
          if (text) {
            nodeStream.write(encoder.encode(text))
          }
        }
        console.log('[call-google-gemini] Google SDK stream finished.')
      } catch (error) {
        console.error('[call-google-gemini] Error piping Gemini stream:', error)
        nodeStream.write(encoder.encode(`\n\n--- Stream Error: ${error.message} ---\n`))
      } finally {
        console.log('[call-google-gemini] Closing Node stream.')
        nodeStream.end()
      }
    }

    pipeStream() // Start piping

    // Return the Node.js Stream for Netlify (Unchanged)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
      body: nodeStream,
      isBase64Encoded: false,
    }
  } catch (error) {
    // Handle setup errors (Unchanged)
    console.error('[call-google-gemini] Error calling Google AI API or setting up stream:', error)
    return createJsonResponse(500, { error: `Server error calling AI: ${error.message}` })
  }
}
