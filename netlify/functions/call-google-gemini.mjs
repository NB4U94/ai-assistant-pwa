/* global process */ // Tell ESLint about process
// netlify/functions/call-google-gemini.mjs
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { PassThrough } from 'node:stream'

const defaultSafetySettings = [
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

const AI_FALLBACK_MESSAGE = "I'm not sure how to respond to that. Can you try rephrasing?"

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

export const handler = async (event) => {
  console.log('[Gemini Function] Received event:', event.httpMethod, event.path)
  if (event.httpMethod === 'OPTIONS') {
    return createJsonResponse(200, {})
  }
  if (event.httpMethod !== 'POST') {
    console.warn(`[Gemini Function] Received non-POST request: ${event.httpMethod}`)
    return createJsonResponse(405, { error: 'Method Not Allowed' })
  }

  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    console.error('[Gemini Function] GOOGLE_API_KEY environment variable not set.')
    return createJsonResponse(500, { error: 'Server configuration error: Missing API Key.' })
  }

  let genAI
  try {
    genAI = new GoogleGenerativeAI(apiKey)
  } catch (initError) {
    console.error('[Gemini Function] Failed to initialize GoogleGenerativeAI:', initError)
    return createJsonResponse(500, {
      error: 'Server configuration error: Failed to initialize AI Client.',
    })
  }

  let requestPayload
  try {
    if (!event.body) throw new Error('Request body is missing.')
    requestPayload = JSON.parse(event.body)
  } catch (error) {
    console.error('[Gemini Function] Error parsing request body:', error.message)
    return createJsonResponse(400, {
      error: `Invalid request body: ${error.message}. Expecting JSON.`,
    })
  }

  const {
    model: modelId = 'gemini-1.5-flash-latest',
    messages,
    temperature,
    max_tokens,
    top_p,
    safetySettings: requestSafetySettings,
  } = requestPayload

  if (!Array.isArray(messages) || messages.length === 0) {
    console.warn('[Gemini Function] Bad Request: Missing or empty messages array.')
    return createJsonResponse(400, { error: 'Bad Request: Missing or empty messages array.' })
  }

  let systemInstructionContent = null
  const historyContents = messages
    .filter((msg) => {
      if (!msg || !msg.role || typeof msg.content === 'undefined') return false
      if (msg.role === 'system') {
        if (typeof msg.content === 'string' && msg.content.trim() !== '') {
          systemInstructionContent = msg.content.trim()
        }
        return false
      }
      const hasContent =
        typeof msg.content === 'string'
          ? msg.content.trim() !== ''
          : Array.isArray(msg.content) &&
            msg.content.some(
              (part) => part && typeof part.text === 'string' && part.text.trim() !== '',
            )
      return (msg.role === 'user' || msg.role === 'assistant') && hasContent
    })
    .map((msg) => {
      let parts = []
      if (typeof msg.content === 'string') {
        const trimmedContent = msg.content.trim()
        if (trimmedContent) parts.push({ text: trimmedContent })
      } else if (Array.isArray(msg.content)) {
        msg.content.forEach((part) => {
          if (
            part &&
            part.type === 'text' &&
            typeof part.text === 'string' &&
            part.text.trim() !== ''
          ) {
            parts.push({ text: part.text.trim() })
          }
        })
      }
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: parts,
      }
    })
    .filter((item) => item.parts && item.parts.length > 0)

  const generationConfig = {}
  if (typeof temperature === 'number') generationConfig.temperature = temperature
  if (typeof top_p === 'number') generationConfig.topP = top_p
  if (max_tokens && Number.isInteger(Number(max_tokens)) && Number(max_tokens) > 0) {
    generationConfig.maxOutputTokens = Number(max_tokens)
  }

  if (historyContents.length === 0 && !systemInstructionContent) {
    console.warn(
      '[Gemini Function] No valid user/assistant message content to send to AI after filtering.',
    )
    return createJsonResponse(400, {
      error: 'Bad Request: No valid user/assistant message content to send to AI after filtering.',
    })
  }

  let modelInstance
  try {
    const modelParams = {
      model: modelId,
      safetySettings: requestSafetySettings || defaultSafetySettings,
      generationConfig,
    }
    if (systemInstructionContent) {
      modelParams.systemInstruction = {
        role: 'system',
        parts: [{ text: systemInstructionContent }],
      }
    }
    modelInstance = genAI.getGenerativeModel(modelParams)
  } catch (modelError) {
    console.error('[Gemini Function] Server error: Could not initialize AI model.', modelError)
    return createJsonResponse(500, {
      error: `Server error: Could not initialize AI model. ${modelError.message}`,
    })
  }

  try {
    const streamResult = await modelInstance.generateContentStream({ contents: historyContents })
    const nodeStream = new PassThrough()
    const encoder = new TextEncoder()
    let streamProperlyFinished = false
    let anyTextSentFromGoogle = false // Flag to track if Google sent any text at all

    const pipeStream = async () => {
      console.log('[Gemini Function] pipeStream: Started for Google SDK stream.')
      let streamChunkCounter = 0
      try {
        for await (const sdkChunk of streamResult.stream) {
          streamChunkCounter++
          let textFromCurrentSdkChunk = ''
          let blockReason = sdkChunk?.promptFeedback?.blockReason
          let processedPartsInChunk = false

          if (blockReason) {
            console.warn(
              `[Gemini Function] pipeStream: Content blocked by API in sdkChunk ${streamChunkCounter}. Reason: ${blockReason}`,
            )
            textFromCurrentSdkChunk = `\n(Content generation blocked by API: ${blockReason})\n`
            processedPartsInChunk = true
            anyTextSentFromGoogle = true // A block reason counts as "something"
          } else if (sdkChunk && sdkChunk.candidates && sdkChunk.candidates.length > 0) {
            const candidate = sdkChunk.candidates[0]
            if (
              candidate.content &&
              candidate.content.parts &&
              candidate.content.parts.length > 0
            ) {
              processedPartsInChunk = true
              for (const part of candidate.content.parts) {
                if (part.text !== undefined && typeof part.text === 'string') {
                  textFromCurrentSdkChunk += part.text
                  if (part.text.trim() !== '') {
                    anyTextSentFromGoogle = true // Mark if any non-whitespace text was found
                  }
                }
              }
            }
          }

          if (blockReason || processedPartsInChunk) {
            const ssePayload = { text: textFromCurrentSdkChunk }
            const sseFormattedChunk = `data: ${JSON.stringify(ssePayload)}\n\n`
            if (!nodeStream.writableEnded) {
              nodeStream.write(encoder.encode(sseFormattedChunk))
            } else {
              console.warn(
                `[Gemini Function] pipeStream: Node stream to client ended prematurely before writing sdkChunk ${streamChunkCounter}.`,
              )
              streamProperlyFinished = false
              break
            }
          }
        }

        if (!nodeStream.writableEnded) {
          console.log(
            `[Gemini Function] pipeStream: Google SDK stream finished successfully after ${streamChunkCounter} sdkChunks.`,
          )
          streamProperlyFinished = true
        } else {
          console.warn(
            `[Gemini Function] pipeStream: Google SDK stream loop may have exited because client stream was already closed.`,
          )
          streamProperlyFinished = false
        }
      } catch (error) {
        console.error(
          '[Gemini Function] pipeStream: Error during Google SDK stream iteration:',
          error,
        )
        const sseError = `data: ${JSON.stringify({ error: `Stream Error: ${error.message}` })}\n\n`
        if (!nodeStream.writableEnded) {
          nodeStream.write(encoder.encode(sseError))
        }
        streamProperlyFinished = false
      } finally {
        if (streamProperlyFinished && !anyTextSentFromGoogle && !nodeStream.writableEnded) {
          // If Google's stream finished, we processed parts, but no actual text was ever sent (all parts were empty)
          // AND no block reason occurred, send the fallback message.
          console.log(
            '[Gemini Function] pipeStream: Google stream was empty. Sending fallback message.',
          )
          const fallbackPayload = { text: AI_FALLBACK_MESSAGE }
          const fallbackSseChunk = `data: ${JSON.stringify(fallbackPayload)}\n\n`
          nodeStream.write(encoder.encode(fallbackSseChunk))
        }

        if (streamProperlyFinished && !nodeStream.writableEnded) {
          const doneEvent = `data: ${JSON.stringify({ done: true, message: 'Stream complete from server' })}\n\n`
          console.log('[Gemini Function] pipeStream: Sending stream completion event to client.')
          nodeStream.write(encoder.encode(doneEvent))
        } else if (!streamProperlyFinished && !nodeStream.writableEnded) {
          const errorDoneEvent = `data: ${JSON.stringify({ done: true, error: 'Stream from AI ended unexpectedly or with error.' })}\n\n`
          console.log(
            '[Gemini Function] pipeStream: Sending error/unexpected completion event to client.',
          )
          nodeStream.write(encoder.encode(errorDoneEvent))
        }
        console.log('[Gemini Function] pipeStream: Closing (ending) Node stream to client.')
        if (!nodeStream.writableEnded) {
          nodeStream.end()
        }
      }
    }

    pipeStream()

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
      body: nodeStream,
      isBase64Encoded: false,
    }
  } catch (error) {
    console.error(
      '[Gemini Function] Outer try/catch: Error calling Google AI API or setting up stream:',
      error,
    )
    return createJsonResponse(500, { error: `Server error calling AI: ${error.message}` })
  }
}
