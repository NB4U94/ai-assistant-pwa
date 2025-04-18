// Use native Node.js fetch (available in recent Node versions used by Netlify)
// No need to install 'node-fetch' usually

// Securely access the API key from Netlify environment variables
// IMPORTANT: You will need to set this variable in your Netlify site settings later!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-1.5-flash'; // Or make this configurable if needed

// Helper function to handle responses (ensures consistent JSON format)
const createResponse = (statusCode, body) => {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Allow requests from any origin (adjust if needed for security)
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST and OPTIONS for preflight
    },
    body: JSON.stringify(body),
  };
};

// Main function handler for Netlify
exports.handler = async (event, context) => {
  // Handle CORS preflight requests (sent by browser before POST)
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return createResponse(405, { error: 'Method Not Allowed' });
  }

  // Check if API key is configured on the server
  if (!GEMINI_API_KEY) {
    console.error("Gemini API key is not configured in Netlify environment variables.");
    return createResponse(500, { error: 'API key not configured on server.' });
  }

  let requestPayload;
  try {
    // Get the data sent from the front-end (Vue app)
    requestPayload = JSON.parse(event.body);
    console.log("Received payload:", JSON.stringify(requestPayload, null, 2)); // Log received data (optional)
  } catch (error) {
    console.error("Error parsing request body:", error);
    return createResponse(400, { error: 'Invalid request body. Expecting JSON.' });
  }

  // --- Prepare request for Gemini API ---
  // Expecting payload like: { history: [...], inputText: "...", imageFile: { base64Data: "...", mimeType: "..." } | null }
  const history = requestPayload.history || []; // Use provided history or empty array
  const inputText = requestPayload.inputText || '';
  const imageInfo = requestPayload.imageFile; // Expects { base64Data, mimeType } or null

  let userParts = [];
  // Add text part if present
  if (inputText.trim() !== '') {
    userParts.push({ text: inputText });
  }
  // Add image part if present
  if (imageInfo && imageInfo.base64Data && imageInfo.mimeType) {
    userParts.push({
      inlineData: {
        mimeType: imageInfo.mimeType,
        data: imageInfo.base64Data // Expecting pure base64 data from front-end
      }
    });
     console.log("Image data included in parts for API call.");
  } else {
      console.log("No image data included in parts for API call.");
  }

  // Prevent API call if there's nothing to send
   if (userParts.length === 0) {
      console.warn("Attempted to call API with no content parts.");
      return createResponse(400, { error: "Nothing to send to AI." });
   }

  // Construct the final request body for Gemini
  const geminiRequestBody = {
    contents: [...history, { role: 'user', parts: userParts }],
    // Add generationConfig and safetySettings if needed
    // generationConfig: { temperature: 0.7 },
    // safetySettings: [ { category: "HARM_CATEGORY_...", threshold: "BLOCK_MEDIUM_AND_ABOVE" } ]
  };

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

  // --- Make the call to Gemini API ---
  try {
    console.log(`Calling Gemini API: ${API_URL}`);
    const geminiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequestBody),
    });

    const geminiData = await geminiResponse.json();

    // Log the raw response from Gemini (optional, for debugging)
    // console.log("Raw Gemini Response:", JSON.stringify(geminiData, null, 2));

    if (!geminiResponse.ok) {
      // Handle API errors from Google
      const errorPayload = geminiData?.error || { message: `API Error ${geminiResponse.status}` };
      console.error('Gemini API Error:', errorPayload);
      // Return a structured error to the front-end
      return createResponse(geminiResponse.status, { error: `Gemini API Error: ${errorPayload.message || 'Unknown error'}` });
    }

    // Process successful response
    let aiText = null;
    let blockReason = null;
    let safetyRatings = null;

    if (geminiData.candidates && geminiData.candidates.length > 0) {
        const candidate = geminiData.candidates[0];
        blockReason = candidate.finishReason; // Capture finish reason
        safetyRatings = candidate.safetyRatings; // Capture safety ratings

        // Check finish reason first
        if (blockReason && blockReason !== 'STOP' && blockReason !== 'MAX_TOKENS') {
             console.warn(`Gemini response blocked due to: ${blockReason}`);
             // We'll return the reason to the front-end
        } else if (candidate.content?.parts?.length > 0) {
            aiText = candidate.content.parts[0].text; // Extract text
        }
    } else if (geminiData.promptFeedback?.blockReason) {
        // Handle cases where the entire prompt was blocked
        blockReason = geminiData.promptFeedback.blockReason;
        safetyRatings = geminiData.promptFeedback.safetyRatings;
        console.warn(`Gemini prompt blocked due to: ${blockReason}`);
    }

    // Send response back to the front-end
    return createResponse(200, {
        aiText: aiText, // Will be null if blocked or no text found
        blockReason: blockReason, // Include block reason
        safetyRatings: safetyRatings // Include safety ratings
    });

  } catch (error) {
    console.error('Error fetching from Gemini API:', error);
    return createResponse(500, { error: `Server error: ${error.message}` });
  }
};

