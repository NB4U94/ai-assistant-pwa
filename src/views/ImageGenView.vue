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
        <img
          :src="generatedImageUrl"
          alt="Generated image"
          class="generated-image"
          @click="openFullScreen"
          title="Click to enlarge"
        />
        <div class="image-actions">
          <button @click="downloadImage" class="image-action-button" title="Download Image">
            Download 💾
          </button>
        </div>
      </div>
      <div v-else-if="!error" class="placeholder-text">Your generated image will appear here.</div>
      <div v-if="error" class="error-message">
        <p><strong>Error generating image:</strong></p>
        <p>{{ error }}</p>
        <button @click="clearError" class="clear-error-button">Dismiss</button>
      </div>
    </div>

    <div class="fullscreen-modal" v-if="showFullScreen" @click.self="closeFullScreen">
      <img :src="generatedImageUrl" alt="Generated image - full screen" class="fullscreen-image" />
      <button
        @click="closeFullScreen"
        class="close-fullscreen-button"
        title="Close full screen view"
      >
        &times;
      </button>
      <button @click="downloadImage" class="download-fullscreen-button" title="Download Image">
        Download 💾
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const prompt = ref('')
const generatedImageUrl = ref(null) // Store URL of the generated image
const isLoading = ref(false)
const error = ref(null) // Store any error messages
const showFullScreen = ref(false) // Controls visibility of the full-screen modal

// Function to call the Netlify backend for image generation
const generateImage = async () => {
  if (!prompt.value.trim() || isLoading.value) return
  isLoading.value = true
  error.value = null
  generatedImageUrl.value = null
  console.log('Attempting to generate image via Netlify function...')

  try {
    const response = await fetch('/.netlify/functions/call-stability-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.value }),
    })

    let responseData
    try {
      responseData = await response.json()
    } catch (e) {
      console.error('Failed to parse JSON response:', e)
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

    if (!response.ok) {
      const errorMsg = responseData?.error || `Function returned HTTP status ${response.status}`
      throw new Error(errorMsg)
    }
    if (!responseData.imageBase64) {
      console.error('Missing imageBase64 in successful response:', responseData)
      throw new Error('Backend function did not return image data.')
    }

    // Construct the data URL for JPEG format
    generatedImageUrl.value = `data:image/jpeg;base64,${responseData.imageBase64}`
    console.log('Image generated and displayed successfully.')
  } catch (err) {
    console.error('Error in generateImage function:', err)
    error.value = err.message || 'An unknown error occurred.'
    generatedImageUrl.value = null
  } finally {
    isLoading.value = false
  }
}

// Function to clear the error message
const clearError = () => {
  error.value = null
}

// --- Full Screen Modal Functions ---
const openFullScreen = () => {
  if (generatedImageUrl.value) {
    showFullScreen.value = true
  }
}
const closeFullScreen = () => {
  showFullScreen.value = false
}
// --- End Full Screen Modal Functions ---

// --- Download Image Function ---
const downloadImage = () => {
  if (!generatedImageUrl.value) return

  // Create a temporary link element
  const link = document.createElement('a')
  link.href = generatedImageUrl.value

  // Create a filename (e.g., generated-image-timestamp.jpeg)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-') // Simple timestamp for unique name
  link.download = `generated-image-${timestamp}.jpeg`

  // Append to body, click, and remove
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
// --- End Download Image Function ---
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
  align-self: flex-end;
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
  position: relative; /* For positioning action buttons */
  overflow: hidden;
}

.generated-image-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column; /* Stack image and actions */
  justify-content: center;
  align-items: center;
  position: relative; /* For positioning actions within */
  gap: 0.5rem; /* Space between image and actions */
}

.generated-image {
  max-width: 100%;
  max-height: calc(100% - 40px); /* Leave space for action buttons */
  object-fit: contain;
  border-radius: 4px;
  cursor: pointer; /* Indicate clickable */
  display: block; /* Remove extra space below image */
}

.image-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem; /* Space above buttons */
  /* Position at bottom-right of container if needed, or just center below */
  /* position: absolute;
  bottom: 10px;
  right: 10px; */
}

.image-action-button {
  background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent background */
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.3rem 0.8rem;
  font-size: 0.8em;
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.image-action-button:hover {
  background-color: rgba(0, 0, 0, 0.7);
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
  border: 4px solid var(--border-color-light);
  border-top: 4px solid var(--accent-color-primary);
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
  width: calc(100% - 2rem);
  background-color: var(--bg-message-error);
  color: var(--text-message-error);
  border: 1px solid var(--border-color-error);
  padding: 1rem;
  border-radius: 6px;
  font-size: 0.9em;
  text-align: center;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  /* Position absolutely if needed, or just let flexbox place it */
  /* position: absolute; bottom: 1rem; left: 1rem; right: 1rem; */
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

/* --- Full Screen Modal Styles --- */
.fullscreen-modal {
  position: fixed; /* Stay in place */
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.85); /* Dark semi-transparent overlay */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; /* Ensure it's on top */
  padding: 2rem; /* Padding around the image */
  box-sizing: border-box;
  cursor: pointer; /* Indicate clicking overlay closes it */
}

.fullscreen-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
  cursor: default; /* Default cursor for the image itself */
}

.close-fullscreen-button {
  position: absolute;
  top: 15px;
  right: 20px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 50%;
  width: 35px;
  height: 35px;
  font-size: 1.8em;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}
.close-fullscreen-button:hover {
  background: rgba(255, 255, 255, 0.4);
}

.download-fullscreen-button {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background-color: var(--bg-button-primary);
  color: var(--text-button-primary);
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.9em;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  z-index: 1001; /* Above modal background */
}
.download-fullscreen-button:hover {
  background-color: var(--bg-button-primary-hover);
}
/* --- End Full Screen Modal Styles --- */
</style>
