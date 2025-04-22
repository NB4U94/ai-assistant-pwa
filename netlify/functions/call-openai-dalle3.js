// netlify/functions/call-openai-dalle3.js

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_URL = 'https://api.openai.com/v1/images/generations'

const createResponse = (statusCode, body) => {
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

export const handler = async (event, _context) => {
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {})
  }
  if (event.httpMethod !== 'POST') {
    return createResponse(405, { error: 'Method Not Allowed' })
  }
  if (!OPENAI_API_KEY) {
    console.error('FATAL: OpenAI API key not configured.')
    return createResponse(500, { error: 'Internal Server Error: API key not configured.' })
  }

  let requestPayload
  try {
    if (!event.body) throw new Error('Request body is missing.')
    requestPayload = JSON.parse(event.body)
    if (!requestPayload.prompt?.trim()) {
      throw new Error('Missing or invalid "prompt" string in request body.')
    }
  } catch (error) {
    console.error('Error parsing request body:', error)
    return createResponse(400, { error: `Invalid request body: ${error.message}` })
  }

  // --- Extract Parameters & Validate ---
  const prompt = requestPayload.prompt
  // *** NEW: Determine model, default to dall-e-3 ***
  const model = requestPayload.model === 'dall-e-2' ? 'dall-e-2' : 'dall-e-3'
  const size = requestPayload.size // Size will be validated based on model
  const quality = requestPayload.quality || 'standard' // Used only for DALL-E 3
  const style = requestPayload.style || 'vivid' // Used only for DALL-E 3
  const response_format = 'b64_json' // Keep using Base64
  const n = 1 // Keep n=1 for simplicity and DALL-E 3 compatibility

  // --- Model-Specific Validation ---
  let validSizes
  if (model === 'dall-e-3') {
    validSizes = ['1024x1024', '1792x1024', '1024x1792']
    if (!size || !validSizes.includes(size)) {
      console.error(`Invalid size for DALL-E 3: ${size}. Defaulting to 1024x1024.`)
      // Defaulting instead of erroring might be more user-friendly if frontend sends wrong size temporarily
      // return createResponse(400, { error: `Invalid size for DALL-E 3. Must be one of: ${validSizes.join(', ')}` });
    }
    // Validate quality and style only for DALL-E 3
    const validQualities = ['standard', 'hd']
    const validStyles = ['vivid', 'natural']
    if (!validQualities.includes(quality)) {
      console.error(`Invalid quality for DALL-E 3: ${quality}`)
      return createResponse(400, {
        error: `Invalid quality parameter for DALL-E 3. Must be 'standard' or 'hd'`,
      })
    }
    if (!validStyles.includes(style)) {
      console.error(`Invalid style for DALL-E 3: ${style}`)
      return createResponse(400, {
        error: `Invalid style parameter for DALL-E 3. Must be 'vivid' or 'natural'`,
      })
    }
  } else {
    // model === 'dall-e-2'
    validSizes = ['256x256', '512x512', '1024x1024']
    if (!size || !validSizes.includes(size)) {
      console.error(`Invalid size for DALL-E 2: ${size}. Defaulting to 1024x1024.`)
      // return createResponse(400, { error: `Invalid size for DALL-E 2. Must be one of: ${validSizes.join(', ')}` });
    }
  }
  // Use validated or default size
  const finalSize = validSizes.includes(size) ? size : '1024x1024'

  // --- Prepare OpenAI API Request Body ---
  const requestBody = {
    model: model, // Use selected model
    prompt: prompt,
    n: n,
    size: finalSize, // Use validated/defaulted size
    response_format: response_format,
  }

  // Add quality and style only for DALL-E 3
  if (model === 'dall-e-3') {
    requestBody.quality = quality
    requestBody.style = style
  }

  console.log(
    `Calling OpenAI Images API with Model=${model}, Size=${finalSize}, Prompt="${prompt.substring(0, 50)}..."`,
  )
  if (model === 'dall-e-3') {
    console.log(`   (Quality=${quality}, Style=${style})`)
  }

  // --- Call OpenAI API ---
  try {
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!openaiResponse.ok) {
      // Handle API error response (same as before)
      let errorBodyText = `OpenAI API Error (${openaiResponse.status} ${openaiResponse.statusText})`
      try {
        const errorJson = await openaiResponse.json()
        errorBodyText = errorJson?.error?.message || JSON.stringify(errorJson)
      } catch (_parseError) {
        try {
          const rawText = await openaiResponse.text()
          errorBodyText += `: ${rawText.substring(0, 200)}`
        } catch (textErr) {}
      }
      console.error('OpenAI API Error Response Details:', errorBodyText)
      return createResponse(openaiResponse.status, { error: `OpenAI API Error: ${errorBodyText}` })
    }

    const responseData = await openaiResponse.json()

    // Validate successful response structure (same as before for b64_json)
    if (!responseData?.data?.[0]?.b64_json) {
      console.error('Unexpected successful response structure from OpenAI:', responseData)
      throw new Error('Received unexpected successful response format from OpenAI API.')
    }

    const imageBase64 = responseData.data[0].b64_json
    // DALL-E 2 doesn't provide revised_prompt, DALL-E 3 might
    const revisedPrompt = responseData.data[0].revised_prompt || null

    console.log(`Successfully received image data (Base64) from OpenAI API.`)
    if (revisedPrompt) {
      console.log(`Original prompt was revised to: "${revisedPrompt.substring(0, 100)}..."`)
    }

    // Send response back to frontend
    return createResponse(200, {
      imageBase64: imageBase64,
      revisedPrompt: revisedPrompt,
    })
  } catch (error) {
    console.error('Error calling/processing OpenAI API:', error)
    return createResponse(500, { error: `Server error: ${error.message}` })
  }
}
