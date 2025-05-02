// netlify/functions/call-google-gemini.mjs
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

// Basic safety settings
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

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) {
    console.error('[call-google-gemini] GOOGLE_API_KEY environment variable not set.')
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error: Missing API Key.' }),
    }
  }

  let genAI
  try {
    genAI = new GoogleGenerativeAI(apiKey)
  } catch (initError) {
    console.error('[call-google-gemini] Failed to initialize GoogleGenerativeAI:', initError)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Server configuration error: Failed to initialize AI Client.',
      }),
    }
  }

  try {
    const {
      model: modelId = 'gemini-1.5-flash-latest',
      messages,
      temperature,
      max_tokens,
      top_p,
    } = JSON.parse(event.body)

    if (!Array.isArray(messages) || messages.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Bad Request: Missing messages.' }) }
    }

    // --- Separate System Prompt from History ---
    let systemInstructionContent = null
    const historyContents = messages
      .filter((msg) => {
        if (msg.role === 'system') {
          // Extract the *last* system message found as the instruction
          // Assumes context injection logic correctly formats this
          if (typeof msg.content === 'string') {
            systemInstructionContent = msg.content
          }
          return false // Exclude system messages from history
        }
        return msg.role === 'user' || msg.role === 'assistant' // Keep only user/assistant
      })
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user', // Map roles correctly
        // Map content structure correctly (handle potential image arrays etc.)
        parts: Array.isArray(msg.content)
          ? msg.content.map((part) => ({
              // Rebuild parts array if needed
              text: part.text, // Assuming text part exists
              // TODO: Handle inline_data for images if needed by Google's API here
            }))
          : [{ text: String(msg.content || '') }], // Default to text part
      }))

    // --- Prepare generation config ---
    const generationConfig = {
      temperature: temperature ?? undefined,
      topP: top_p ?? undefined,
    }
    if (max_tokens && Number.isInteger(Number(max_tokens)) && Number(max_tokens) > 0) {
      generationConfig.maxOutputTokens = Number(max_tokens)
    }

    // --- Initialize Model with System Instruction ---
    console.log(`[call-google-gemini] Initializing model: ${modelId}`)
    if (systemInstructionContent) {
      console.log('[call-google-gemini] Using system instruction derived from input messages.')
      // console.log("System Instruction:", systemInstructionContent); // Optional: Log instruction content
    }
    const model = genAI.getGenerativeModel({
      model: modelId,
      safetySettings,
      // Pass extracted system prompt here
      systemInstruction: systemInstructionContent || undefined, // Pass null/undefined if none
    })

    // --- Call Google AI with only user/model history ---
    const result = await model.generateContent({
      contents: historyContents, // Send only user/model messages
      generationConfig,
    })
    const response = await result.response

    // --- Handle Response (same as before) ---
    if (!response) {
      throw new Error('No response object received from Google AI API.')
    }
    const aiText = response.text()?.trim()
    if (!aiText && response.promptFeedback?.blockReason) {
      console.warn(`[call-google-gemini] Request blocked: ${response.promptFeedback.blockReason}`)
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiText: `(Content blocked: ${response.promptFeedback.blockReason})`,
        }),
      }
    } else if (!aiText) {
      console.warn(
        '[call-google-gemini] Received empty text response. Finish Reason:',
        response.candidates?.[0]?.finishReason,
      )
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiText: '(No content generated)' }),
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiText: aiText }),
    }
  } catch (error) {
    console.error('[call-google-gemini] Error during Google AI API call execution:')
    console.error('Error Name:', error.name)
    console.error('Error Message:', error.message)
    if (error instanceof Error && error.cause) {
      console.error('Error Cause:', error.cause)
    }
    if (error.details) {
      console.error('Error Details:', error.details)
    }
    console.error('Error Stack:', error.stack)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to get response from Google AI due to an internal server error.',
      }),
    }
  }
}
