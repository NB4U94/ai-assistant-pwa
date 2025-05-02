// netlify/functions/generate-title.mjs
import { GoogleGenerativeAI } from '@google/generative-ai'
// *** Removed Netlify import ***
// import { Netlify } from "@netlify/functions";

const TITLE_MODEL = 'gemini-1.5-flash-latest'

// Access API key using process.env
const apiKey = process.env.GOOGLE_API_KEY

// Initialize client (check key existence later in handler)
let genAI
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey)
}

export const handler = async (event, context) => {
  // Keep context parameter
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  // *** Check process.env key again inside handler ***
  if (!apiKey) {
    console.error('[generate-title] GOOGLE_API_KEY environment variable not set.')
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error: Missing API Key.' }),
    }
  }

  // Ensure client was initialized
  if (!genAI) {
    console.error('[generate-title] Google AI Client not initialized.')
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error.' }) }
  }
  const model = genAI.getGenerativeModel({ model: TITLE_MODEL })

  try {
    const { messages, memoryId } = JSON.parse(event.body)

    if (!Array.isArray(messages) || messages.length === 0 || !memoryId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Bad Request: Missing messages or memoryId.' }),
      }
    }

    const messagesForSummary = messages.slice(0, 6)
    const conversationExcerpt = messagesForSummary
      .map(
        (msg) =>
          `${msg.role}: ${typeof msg.content === 'string' ? msg.content : '[non-text content]'}`,
      )
      .join('\n')
    const systemPrompt = `Generate a concise title (max 5-7 words) summarizing the main topic of the following conversation excerpt. Be specific and relevant. Output only the title text, nothing else.\n\nExcerpt:\n${conversationExcerpt}`

    const result = await model.generateContent(systemPrompt)
    const response = await result.response
    const generatedTitle = response.text()?.trim() || 'Untitled Conversation'
    const cleanedTitle = generatedTitle.replace(/^["'*]+|["'*]+$/g, '')

    console.log(`[generate-title] Generated title for ${memoryId}: "${cleanedTitle}"`)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: cleanedTitle, memoryId: memoryId }),
    }
  } catch (error) {
    console.error('[generate-title] Error generating title via Google AI:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate title due to an internal error.' }),
    }
  }
}
