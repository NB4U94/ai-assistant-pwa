// netlify/functions/generate-assistant-name.mjs
/* global process */ // Tells ESLint to expect 'process' as a global variable

import { GoogleGenerativeAI } from '@google/generative-ai'

const NAME_MODEL = 'gemini-1.5-flash-latest'

// eslint-disable-next-line no-unused-vars
export const handler = async (event, _context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

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

  const model = genAI.getGenerativeModel({
    model: NAME_MODEL,
    generationConfig: { temperature: 0.8 }, // Temperature for varied suggestions
  })

  try {
    const { instructions } = JSON.parse(event.body)

    if (!instructions || typeof instructions !== 'string' || instructions.trim().length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Bad Request: Missing or empty instructions.' }),
      }
    }

    const instructionsForPrompt = instructions.substring(0, 1000) // Limit instruction length

    // Refined prompt for a single, short name
    const systemPrompt = `Suggest exactly ONE concise and catchy assistant name. This name should ideally be 2 to 3 words long (maximum 4 words).
Base this name on the provided assistant instructions.
Output *only* the name itself as a plain string, with no extra text, quotes, bullet points, or numbering.

Assistant Instructions:
"${instructionsForPrompt}"`

    console.log(`[generate-assistant-name] Requesting name based on instructions. Temp: 0.8`)

    const result = await model.generateContent(systemPrompt)
    const response = await result.response
    let rawGeneratedText = response.text()?.trim()
    let finalName = 'Unnamed Assistant' // Default fallback

    if (rawGeneratedText && rawGeneratedText.trim() !== '') {
      // Split by newline in case the AI gives a list. Take the first non-empty line.
      const potentialNames = rawGeneratedText.split('\n')
      let chosenName = ''
      for (const name of potentialNames) {
        const trimmedName = name.trim()
        if (trimmedName) {
          chosenName = trimmedName
          break // Found the first non-empty line
        }
      }

      if (chosenName) {
        // Remove any leading/trailing quotes or asterisks
        chosenName = chosenName.replace(/^["'*]+|["'*]+$/g, '')
        // Remove common list markers like "1. ", "- ", "* "
        chosenName = chosenName.replace(/^[\d]+\.\s*/, '') // "1. "
        chosenName = chosenName.replace(/^[-*]\s*/, '') // "- " or "* "
        chosenName = chosenName.trim() // Trim again after removing markers

        // Title case the chosen name
        if (chosenName) {
          // Ensure it's still not empty
          finalName = chosenName
            .split(' ')
            .filter((word) => word.length > 0) // Filter out empty strings if multiple spaces existed
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Ensure rest is lowercase then title case
            .join(' ')
        }
      }
    }

    // Optional: Enforce a word limit if strictly necessary, though prompt should guide this
    const wordsInFinalName = finalName.split(' ')
    if (wordsInFinalName.length > 4 && wordsInFinalName.length > 1) {
      // if more than 4 words, and not a single long word
      console.warn(
        `[generate-assistant-name] Generated name "${finalName}" was too long, truncating to 4 words.`,
      )
      finalName = wordsInFinalName.slice(0, 4).join(' ')
    }

    console.log(`[generate-assistant-name] Processed name: "${finalName}"`)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: finalName }), // Ensure 'name' property matches what frontend expects
    }
  } catch (error) {
    console.error('[generate-assistant-name] Error generating name via Google AI:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate name due to an internal server error.' }),
    }
  }
}
