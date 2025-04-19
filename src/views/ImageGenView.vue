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
      ></textarea>
      <button
        @click="generateImage"
        :disabled="!prompt.trim() || isLoading"
        class="generate-button"
      >
        Generate
      </button>
    </div>

    <div class="image-display-area">
      <div v-if="isLoading" class="loading-indicator">Generating image...</div>
      <div v-else-if="generatedImageUrl" class="generated-image-container">
        <img :src="generatedImageUrl" alt="Generated image" class="generated-image" />
      </div>
      <div v-else class="placeholder-text">Your generated image will appear here.</div>
      <div v-if="error" class="error-message">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const prompt = ref('')
const generatedImageUrl = ref(null) // Store URL of the generated image
const isLoading = ref(false)
const error = ref(null) // Store any error messages

// Placeholder function - will be implemented later to call the chosen API
const generateImage = async () => {
  // Check if prompt is empty or only whitespace, or if already loading
  if (!prompt.value.trim() || isLoading.value) return

  isLoading.value = true
  error.value = null
  generatedImageUrl.value = null // Clear previous image

  console.log('Placeholder: Image generation triggered with prompt:', prompt.value)

  // --- Placeholder: API Call will go here ---
  // Simulating a delay and potential outcome
  await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate API call time

  // Example outcomes (replace with actual API logic later)
  const success = Math.random() > 0.3 // Simulate success/failure
  if (success) {
    // Use a placeholder image service for now
    generatedImageUrl.value = `https://picsum.photos/seed/${Date.now()}/512/512` // Example placeholder URL
    console.log('Placeholder: Image generated successfully (using placeholder).')
    // Optionally clear prompt on success? Maybe not for image gen.
    // prompt.value = '';
  } else {
    error.value = 'Placeholder: Failed to generate image. Please try again.'
    console.error('Placeholder: Image generation failed.')
  }
  // --- End Placeholder ---

  isLoading.value = false
}
</script>

<style scoped>
.image-gen-view {
  padding: 1.5rem 2rem;
  height: 100%;
  display: flex;
  flex-direction: column; /* Stack controls and display area */
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
  flex-shrink: 0; /* Prevent shrinking */
}

.image-gen-controls {
  display: flex;
  flex-direction: column; /* Stack textarea and button */
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-shrink: 0; /* Prevent shrinking */
}

.prompt-input {
  width: 100%;
  padding: 0.75rem 1rem; /* Slightly more padding */
  border: 1px solid var(--border-color-medium);
  border-radius: 8px; /* Slightly less rounded than chat input */
  resize: vertical; /* Allow vertical resize only */
  font-family: sans-serif;
  font-size: 1em;
  min-height: 60px; /* Minimum rows equivalent */
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

.generate-button {
  padding: 0.6rem 1.5rem; /* Standard button padding */
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
  flex-grow: 1; /* Take remaining space */
  border: 1px dashed var(--border-color-light); /* Dashed border for placeholder */
  border-radius: 8px;
  display: flex;
  flex-direction: column; /* Stack placeholder/image and error */
  justify-content: center; /* Center content vertically */
  align-items: center; /* Center content horizontally */
  padding: 1rem;
  background-color: var(--bg-input-field); /* Slightly different background */
  min-height: 200px; /* Ensure it has some height */
  position: relative; /* For potential absolute positioning of elements later */
  overflow: hidden; /* Hide overflow if image is too big before styling */
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
  max-height: 100%; /* Adjust as needed, maybe limit height more */
  object-fit: contain; /* Show the whole image */
  border-radius: 4px;
}

.placeholder-text,
.loading-indicator {
  color: var(--text-placeholder);
  font-style: italic;
  font-size: 0.9em;
  text-align: center;
}
.loading-indicator {
  font-style: normal;
  color: var(--text-secondary);
  animation: pulse 1.5s infinite ease-in-out; /* Reuse pulse animation */
}

@keyframes pulse {
  /* Ensure pulse is defined if not global */
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.error-message {
  color: var(--text-error);
  background-color: var(--bg-message-error);
  border: 1px solid var(--border-color-error);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  margin-top: 1rem;
  font-size: 0.9em;
  text-align: center;
  position: absolute; /* Position at bottom or top */
  bottom: 1rem; /* Example positioning */
  left: 1rem;
  right: 1rem;
  max-width: calc(100% - 2rem); /* Ensure padding is respected */
}
</style>
