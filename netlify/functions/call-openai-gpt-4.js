/* global process */ // Tell ESLint about 'process'
// netlify/functions/call-openai-gpt-4.js
import { PassThrough } from 'node:stream' // For creating Node.js stream for Netlify response

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const AI_FALLBACK_MESSAGE = "I'm not sure how to respond to that. Can you try rephrasing?"

// Helper to create NON-STREAMING JSON error/options responses
const createJsonResponse = (statusCode, body) => {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Adjust for production
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(body),
  }
}

/**
 * Parses Server-Sent Events (SSE) chunks from OpenAI API stream.
 * Extracts the text content from 'delta.content'.
 * @param {string} sseLine - A single SSE line (e.g., "data: {...}").
 * @returns {string|null|'DONE'} - Text content, null if no content, or 'DONE' string.
 */
function parseOpenAISSEEvent(sseLine) {
  if (sseLine.trim().startsWith('data:')) {
    const dataContent = sseLine.substring(5).trim()
    if (dataContent === '[DONE]') {
      return 'DONE' // OpenAI's stream termination signal
    }
    try {
      const parsedJson = JSON.parse(dataContent)
      const deltaContent = parsedJson.choices?.[0]?.delta?.content
      if (deltaContent !== undefined && deltaContent !== null) {
        // Allow empty string from AI
        return deltaContent
      }
      // Check for finish reason if needed, though content is primary here
      // const finishReason = parsedJson.choices?.[0]?.finish_reason;
      // if (finishReason) {
      //   console.log(`[OpenAI Function] Finish reason from API: ${finishReason}`);
      // }
    } catch (error) {
      console.error('[OpenAI Function] Error parsing OpenAI stream data JSON:', dataContent, error)
    }
  }
  return null // No relevant content in this line
}

export const handler = async (event) => {
  console.log('[OpenAI Function] Received event:', event.httpMethod, event.path)
  if (event.httpMethod === 'OPTIONS') {
    return createJsonResponse(200, {})
  }
  if (event.httpMethod !== 'POST') {
    console.warn(`[OpenAI Function] Received non-POST request: ${event.httpMethod}`)
    return createJsonResponse(405, { error: 'Method Not Allowed' })
  }

  if (!OPENAI_API_KEY) {
    console.error('[OpenAI Function] FATAL: OpenAI API key is not configured.')
    return createJsonResponse(500, { error: 'Internal Server Error: API key not configured.' })
  }

  let requestPayload
  try {
    if (!event.body) throw new Error('Request body is missing.')
    requestPayload = JSON.parse(event.body)
    // console.log('[OpenAI Function] Parsed request payload successfully.'); // Verbose
  } catch (error) {
    console.error('[OpenAI Function] Error parsing request body:', error.message)
    return createJsonResponse(400, {
      error: `Invalid request body: ${error.message}. Expecting JSON.`,
    })
  }

  if (
    !requestPayload.messages ||
    !Array.isArray(requestPayload.messages) ||
    requestPayload.messages.length === 0
  ) {
    console.error('[OpenAI Function] Invalid payload: Missing or empty "messages" array.')
    return createJsonResponse(400, { error: 'Invalid payload: Missing or empty "messages" array.' })
  }

  // Prepare OpenAI API Request Body
  // Note: OpenAI doesn't have a separate 'systemInstruction' field like Gemini.
  // System messages should be the first message in the 'messages' array.
  const openaiRequestBody = {
    model: requestPayload.model || 'gpt-4o', // Or your preferred OpenAI model
    messages: requestPayload.messages, // Frontend should ensure system message is first if needed
    temperature: requestPayload.temperature ?? 0.7,
    max_tokens: requestPayload.max_tokens || 1024,
    top_p: requestPayload.top_p ?? 1.0,
    stream: true, // CRITICAL: Ensure streaming is requested
    // OpenAI doesn't use safetySettings in the same way as Gemini in the request body.
    // Content moderation is handled differently by OpenAI, often post-generation or via separate APIs.
  }
  // console.log('[OpenAI Function] OpenAI Request Body:', JSON.stringify(openaiRequestBody, null, 2)); // Verbose

  try {
    console.log(
      `[OpenAI Function] Calling OpenAI API (Streaming) with model ${openaiRequestBody.model}`,
    )
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        Accept: 'text/event-stream', // Important for OpenAI to know we want SSE
      },
      body: JSON.stringify(openaiRequestBody),
    })

    if (!openaiResponse.ok) {
      let errorPayload = { message: `OpenAI API Error: Status ${openaiResponse.status}` }
      try {
        const errorData = await openaiResponse.json()
        errorPayload = errorData?.error || errorPayload
      } catch (e) {
        const errorText = await openaiResponse.text().catch(() => openaiResponse.statusText)
        errorPayload.message += `: ${errorText || ''}`.trim()
      }
      console.error(
        '[OpenAI Function] OpenAI API Error Response:',
        openaiResponse.status,
        errorPayload,
      )
      return createJsonResponse(openaiResponse.status, {
        error: errorPayload.message || 'Unknown OpenAI API error',
      })
    }

    const nodeStream = new PassThrough()
    const encoder = new TextEncoder() // For converting string to Uint8Array for nodeStream.write
    const decoder = new TextDecoder() // For converting Uint8Array from OpenAI stream to string

    let streamProperlyFinished = false
    let anyTextSentFromOpenAI = false // Track if OpenAI sent any actual text

    const pipeStream = async () => {
      console.log('[OpenAI Function] pipeStream: Started for OpenAI API stream.')
      const reader = openaiResponse.body.getReader()
      let sseBuffer = '' // Buffer for incomplete SSE events

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log('[OpenAI Function] pipeStream: OpenAI SDK stream indicated it is done.')
            // Process any remaining buffer content
            if (sseBuffer.trim()) {
              const textContent = parseOpenAISSEEvent(sseBuffer)
              if (textContent === 'DONE') {
                // This is the OpenAI specific done signal, do nothing here, let outer loop finish
              } else if (textContent !== null && typeof textContent === 'string') {
                if (textContent.trim() !== '') anyTextSentFromOpenAI = true
                const ssePayload = { text: textContent }
                const sseFormattedChunk = `data: ${JSON.stringify(ssePayload)}\n\n`
                if (!nodeStream.writableEnded) nodeStream.write(encoder.encode(sseFormattedChunk))
              }
            }
            streamProperlyFinished = true
            break
          }

          sseBuffer += decoder.decode(value, { stream: true })
          let eolIndex
          // Process all complete SSE events in the buffer
          while ((eolIndex = sseBuffer.indexOf('\n\n')) >= 0) {
            const singleEventString = sseBuffer.substring(0, eolIndex)
            sseBuffer = sseBuffer.substring(eolIndex + 2)

            const textContent = parseOpenAISSEEvent(singleEventString)

            if (textContent === 'DONE') {
              // OpenAI stream is finished, but we let the main `done` flag from reader.read() handle loop exit
              console.log('[OpenAI Function] pipeStream: OpenAI sent [DONE] signal.')
              continue // Continue to check reader.read() for actual stream closure
            } else if (textContent !== null && typeof textContent === 'string') {
              // textContent can be an empty string if OpenAI sends delta.content: ""
              if (textContent.trim() !== '') anyTextSentFromOpenAI = true

              const ssePayload = { text: textContent }
              const sseFormattedChunk = `data: ${JSON.stringify(ssePayload)}\n\n`
              // console.log(`[OpenAI Function DEBUG] pipeStream: Streaming to client: "${textContent.substring(0,100)}"`); // Verbose
              if (!nodeStream.writableEnded) {
                nodeStream.write(encoder.encode(sseFormattedChunk))
              } else {
                console.warn(
                  '[OpenAI Function] pipeStream: Node stream to client ended prematurely.',
                )
                streamProperlyFinished = false
                return // Exit pipeStream if client stream is closed
              }
            }
          }
        }
        // This point is reached if reader.read() returned done:true
        console.log('[OpenAI Function] pipeStream: OpenAI stream processing loop finished.')
      } catch (error) {
        console.error('[OpenAI Function] pipeStream: Error during OpenAI stream iteration:', error)
        const sseError = `data: ${JSON.stringify({ error: `Stream Error: ${error.message}` })}\n\n`
        if (!nodeStream.writableEnded) {
          nodeStream.write(encoder.encode(sseError))
        }
        streamProperlyFinished = false
      } finally {
        if (streamProperlyFinished && !anyTextSentFromOpenAI && !nodeStream.writableEnded) {
          console.log(
            '[OpenAI Function] pipeStream: OpenAI stream was empty. Sending fallback message.',
          )
          const fallbackPayload = { text: AI_FALLBACK_MESSAGE }
          const fallbackSseChunk = `data: ${JSON.stringify(fallbackPayload)}\n\n`
          nodeStream.write(encoder.encode(fallbackSseChunk))
        }

        if (streamProperlyFinished && !nodeStream.writableEnded) {
          const doneEvent = `data: ${JSON.stringify({ done: true, message: 'Stream complete from server' })}\n\n`
          console.log('[OpenAI Function] pipeStream: Sending stream completion event to client.')
          nodeStream.write(encoder.encode(doneEvent))
        } else if (!streamProperlyFinished && !nodeStream.writableEnded) {
          const errorDoneEvent = `data: ${JSON.stringify({ done: true, error: 'Stream from AI ended unexpectedly or with error.' })}\n\n`
          console.log(
            '[OpenAI Function] pipeStream: Sending error/unexpected completion event to client.',
          )
          nodeStream.write(encoder.encode(errorDoneEvent))
        }
        console.log('[OpenAI Function] pipeStream: Closing (ending) Node stream to client.')
        if (!nodeStream.writableEnded) {
          nodeStream.end()
        }
      }
    }

    pipeStream()

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8', // Changed to text/event-stream
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
      body: nodeStream,
      isBase64Encoded: false,
    }
  } catch (error) {
    console.error(
      '[OpenAI Function] Outer try/catch: Error calling OpenAI API or setting up stream:',
      error,
    )
    return createJsonResponse(500, { error: `Server error calling AI: ${error.message}` })
  }
}
