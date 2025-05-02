// netlify/functions/generate-assistant-name.mjs
import { GoogleGenerativeAI } from '@google/generative-ai'
// Ensure @netlify/functions is installed if needed by runtime, but don't import Netlify object
// import { Context } from "@netlify/functions"; // Only needed if using context object

const NAME_MODEL = 'gemini-1.5-flash-latest' // Use free tier model

export const handler = async (event, context) => {
  // context might be unused but good practice
  // Allow only POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  // Access API key using process.env (standard for Netlify)
  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) {
    console.error('[generate-assistant-name] GOOGLE_API_KEY environment variable not set.')
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error: Missing API Key.' }),
    }
  }

  let genAI
  try {
    genAI = new GoogleGenerativeAI(apiKey)
  } catch (initError) {
    console.error('[generate-assistant-name] Failed to initialize GoogleGenerativeAI:', initError)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Server configuration error: Failed to initialize AI Client.',
      }),
    }
  }
  const model = genAI.getGenerativeModel({ model: NAME_MODEL })

  try {
    // Expect instructions text in the body
    const { instructions } = JSON.parse(event.body)

    if (!instructions || typeof instructions !== 'string' || instructions.trim().length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Bad Request: Missing or empty instructions.' }),
      }
    }

    // Limit instruction length sent to API if necessary
    const instructionsForPrompt = instructions.substring(0, 1000) // Limit context sent

    // Prompt designed for name generation
    const systemPrompt = `Generate a short, catchy, descriptive name (2-4 words maximum) for an AI assistant based on the following instructions/purpose. Output ONLY the suggested name text, nothing else (no quotes, no preamble).\n\nInstructions:\n${instructionsForPrompt}`

    console.log(`[generate-assistant-name] Requesting name based on instructions...`)

    const result = await model.generateContent(systemPrompt)
    const response = await result.response
    let generatedName = response.text()?.trim() || 'Unnamed Assistant'

    // Clean up potential markdown/quotes
    generatedName = generatedName.replace(/^["'*]+|["'*]+$/g, '')
    // Capitalize words (optional nice touch)
    generatedName = generatedName
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    console.log(`[generate-assistant-name] Generated name: "${generatedName}"`)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: generatedName }), // Return just the name
    }
  } catch (error) {
    console.error('[generate-assistant-name] Error generating name via Google AI:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate name due to an internal server error.' }),
    }
  }
}
