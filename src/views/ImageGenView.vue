<template>
  <div class="image-gen-view">
    <h2>Image Generation</h2>

    <div class="image-gen-controls">
      <textarea
        v-model="prompt"
        placeholder="Enter your image prompt here... (Press Enter to generate, Shift+Enter for new line)"
        rows="3"
        class="prompt-input"
        aria-label="Image generation prompt"
        @keydown.enter.exact.prevent="generateImage"
        :disabled="isLoading"
      ></textarea>
      <button
        @click="generateImage"
        :disabled="!prompt.trim() || isLoading"
        class="generate-button"
      >
        {{ isLoading ? 'Generating...' : 'Generate' }}
      </button>
    </div>

    <div class="image-display-area">
      <div v-if="isLoading" class="loading-indicator">
        <div class="spinner"></div>
        Generating image... (this may take a moment)
      </div>
      <div v-else-if="generatedImageUrl" class="generated-image-container">
        <img :src="generatedImageUrl" alt="Generated image" class="generated-image" />
      </div>
      <div v-else-if="!error" class="placeholder-text">Your generated image will appear here.</div>
      <div v-if="error" class="error-message">
        <p><strong>Error generating image:</strong></p>
        <p>{{ error }}</p>
        <button @click="clearError" class="clear-error-button">Dismiss</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const prompt = ref('')
const generatedImageUrl = ref(null) // Store URL of the generated image
const isLoading = ref(false)
const error = ref(null) // Store any error messages

const generateImage = async () => {
  // Prevent generation if prompt is empty/whitespace or already loading
  if (!prompt.value.trim() || isLoading.value) return

  isLoading.value = true
  error.value = null // Clear previous errors
  generatedImageUrl.value = null // Clear previous image

  console.log('Attempting to generate image via Netlify function...')

  try {
    const response = await fetch('/.netlify/functions/call-stability-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: prompt.value }), // Send prompt in JSON body
    })

    // Get the response body regardless of status code first
    let responseData
    try {
      responseData = await response.json()
    } catch (e) {
      console.error('Failed to parse JSON response:', e)
      // If JSON parsing fails, try to get raw text for better error message
      let rawText = `Response status: ${response.status}. Could not parse response body.`
      try {
        rawText = await response.text()
      } catch (e2) {
        /* ignore */
      }
      throw new Error(
        `Received non-JSON response from backend function. ${rawText.substring(0, 150)}`,
      )
    }

    // Check if the response status indicates failure
    if (!response.ok) {
      // Use error message from parsed JSON if available, otherwise default
      const errorMsg = responseData?.error || `Function returned HTTP status ${response.status}`
      throw new Error(errorMsg)
    }

    // Check if the expected image data is present in the successful response
    if (!responseData.imageBase64) {
      console.error('Missing imageBase64 in successful response:', responseData)
      throw new Error('Backend function did not return image data.')
    }

    // Construct the data URL (assuming webp format from backend function)
    generatedImageUrl.value = `data:image/webp;base64,${responseData.imageBase64}`
    console.log('Image generated and displayed successfully.')
    // Optionally clear the prompt after success?
    // prompt.value = '';
  } catch (err) {
    console.error('Error in generateImage function:', err)
    error.value = err.message || 'An unknown error occurred.' // Set the error message for display
    generatedImageUrl.value = null // Ensure no old image is shown on error
  } finally {
    isLoading.value = false // Ensure loading indicator is turned off
  }
}

// Function to clear the error message
const clearError = () => {
  error.value = null
}
</script>

<style scoped>
.image-gen-view {
  padding: 1.5rem 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background-color: var(--bg-main-content);
  color: var(--text-primary);
}

h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
  font-family: sans-serif;
  text-align: center;
  font-weight: 600;
  border-bottom: 1px solid var(--border-color-medium);
  padding-bottom: 1rem;
  flex-shrink: 0;
}

.image-gen-controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-shrink: 0;
}

.prompt-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color-medium);
  border-radius: 8px;
  resize: vertical;
  font-family: sans-serif;
  font-size: 1em;
  min-height: 60px;
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.prompt-input::placeholder {
  color: var(--text-placeholder);
}
.prompt-input:hover:not(:focus):not(:disabled) {
  border-color: var(--accent-color-primary);
}
.prompt-input:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: var(--input-focus-shadow);
}
.prompt-input:disabled {
  background-color: color-mix(in srgb, var(--bg-input-field) 50%, var(--bg-main-content));
  cursor: not-allowed;
  opacity: 0.7;
}

.generate-button {
  padding: 0.6rem 1.5rem;
  background-color: var(--bg-button-primary);
  color: var(--text-button-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: sans-serif;
  font-size: 1em;
  font-weight: 500;
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease;
  align-self: flex-end; /* Align button to the right */
}

.generate-button:hover:not(:disabled) {
  background-color: var(--bg-button-primary-hover);
}

.generate-button:disabled {
  background-color: color-mix(in srgb, var(--bg-button-primary) 50%, var(--bg-main-content));
  cursor: not-allowed;
  opacity: 0.7;
}

/* Image display area styling */
.image-display-area {
  flex-grow: 1;
  border: 1px dashed var(--border-color-light);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  background-color: var(--bg-input-field);
  min-height: 200px; /* Minimum height */
  position: relative;
  overflow: hidden;
}

.generated-image-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.generated-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
  /* Add transition if needed */
  /* transition: opacity 0.3s ease; */
}

/* Placeholder and Loading */
.placeholder-text,
.loading-indicator {
  color: var(--text-placeholder);
  font-style: italic;
  font-size: 0.9em;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.loading-indicator {
  font-style: normal;
  color: var(--text-secondary);
}

/* Spinner animation */
.spinner {
  border: 4px solid var(--border-color-light); /* Light grey border */
  border-top: 4px solid var(--accent-color-primary); /* Green spinner part */
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Error Message Styling */
.error-message {
  width: calc(100% - 2rem); /* Respect padding */
  background-color: var(--bg-message-error);
  color: var(--text-message-error);
  border: 1px solid var(--border-color-error);
  padding: 1rem;
  border-radius: 6px;
  font-size: 0.9em;
  text-align: center;
  box-sizing: border-box; /* Include padding in width */
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}
.error-message p {
  margin: 0;
}

.clear-error-button {
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  border: none;
  border-radius: 4px;
  padding: 0.3rem 0.8rem;
  font-size: 0.8em;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: background-color 0.2s ease;
}
.clear-error-button:hover {
  background-color: var(--bg-button-secondary-hover);
}
</style>
