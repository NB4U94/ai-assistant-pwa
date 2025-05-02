<template>
  <div class="image-gen-view">
    <div class="image-display-area">
      <div v-if="isLoading" class="loading-indicator">
        <div class="loading-indicator-visual large-plasma-loader"></div>
        Loading...
      </div>

      <div v-else-if="generatedImageUrl" class="generated-image-container">
        <div class="image-wrapper">
          <img
            :src="generatedImageUrl"
            alt="Generated image"
            class="generated-image"
            @click="openFullScreen"
            title="Click to enlarge"
          />
        </div>
        <div class="image-actions">
          <button
            @click="downloadImage"
            class="image-action-button icon-button"
            title="Download Image"
          >
            ⬇️
          </button>
          <span
            v-if="revisedPrompt"
            class="revised-prompt-display"
            :title="`Revised Prompt: ${revisedPrompt}`"
          >
            ✏️ Revised
          </span>
        </div>
      </div>

      <div v-else-if="!apiError" class="placeholder-text">
        Your generated image will appear here.
      </div>

      <div v-if="apiError" class="error-message">
        <p><strong>Error generating image:</strong></p>
        <p>{{ apiError }}</p>
        <button @click="clearError" class="clear-error-button">Dismiss</button>
      </div>
    </div>

    <div class="image-gen-controls parameter-controls">
      <div class="param-group">
        <div class="param-label-group">
          <label for="img-model">Model</label>
          <button @click="toggleParamHelp('model')" class="help-icon-button" title="Model Info">
            ?
          </button>
        </div>
        <select id="img-model" v-model="selectedModel" :disabled="isLoading">
          <option value="dall-e-3">DALL-E 3</option>
          <option value="dall-e-2">DALL-E 2</option>
        </select>
        <div
          class="param-help-box"
          v-if="visibleHelpParam === 'model'"
          v-on-click-outside="closeHelp"
        >
          Select the generation model. DALL-E 3 is newer. DALL-E 2 offers different sizes/params.
        </div>
      </div>
      <div class="param-group">
        <div class="param-label-group">
          <label for="img-size">Size</label>
          <button @click="toggleParamHelp('size')" class="help-icon-button" title="Size Info">
            ?
          </button>
        </div>
        <select id="img-size" v-model="selectedSize" :disabled="isLoading">
          <option
            v-for="sizeOption in availableSizes"
            :key="sizeOption.value"
            :value="sizeOption.value"
          >
            {{ sizeOption.label }}
          </option>
        </select>
        <div
          class="param-help-box"
          v-if="visibleHelpParam === 'size'"
          v-on-click-outside="closeHelp"
        >
          Image dimensions. DALL-E 3: 1024x1024, 1792x1024 (Wide), 1024x1792 (Tall). DALL-E 2:
          1024x1024, 512x512, 256x256.
        </div>
      </div>
      <div class="param-group" v-if="selectedModel === 'dall-e-3'">
        <div class="param-label-group">
          <label for="img-quality">Quality</label>
          <button @click="toggleParamHelp('quality')" class="help-icon-button" title="Quality Info">
            ?
          </button>
        </div>
        <select id="img-quality" v-model="selectedQuality" :disabled="isLoading">
          <option value="standard">Standard</option>
          <option value="hd">HD</option>
        </select>
        <div
          class="param-help-box"
          v-if="visibleHelpParam === 'quality'"
          v-on-click-outside="closeHelp"
        >
          (DALL-E 3 Only) 'HD' = finer detail, slower. 'Standard' = faster.
        </div>
      </div>
      <div class="param-group" v-if="selectedModel === 'dall-e-3'">
        <div class="param-label-group">
          <label for="img-style">Style</label>
          <button @click="toggleParamHelp('style')" class="help-icon-button" title="Style Info">
            ?
          </button>
        </div>
        <select id="img-style" v-model="selectedStyle" :disabled="isLoading">
          <option value="vivid">Vivid</option>
          <option value="natural">Natural</option>
        </select>
        <div
          class="param-help-box"
          v-if="visibleHelpParam === 'style'"
          v-on-click-outside="closeHelp"
        >
          (DALL-E 3 Only) 'Vivid' = hyper-real, dramatic. 'Natural' = more realistic, less
          hyper-real.
        </div>
      </div>
    </div>

    <div class="image-gen-controls prompt-controls input-area">
      <textarea
        v-model="prompt"
        :placeholder="currentPlaceholder"
        rows="1"
        class="prompt-input"
        aria-label="Image generation prompt"
        @input="autoGrowPromptInput"
        @keydown.enter.exact.prevent="generateImage"
        :disabled="isLoading"
        ref="promptInputRef"
      ></textarea>
      <PulsingIconButton
        :is-loading="isLoading"
        :disabled="!prompt.trim() || isLoading"
        title="Generate Image"
        @click="generateImage"
        class="generate-button"
      />
    </div>

    <div class="fullscreen-modal" v-if="showFullScreen" @click.self="closeFullScreen">
      <img :src="generatedImageUrl" alt="Generated image - full screen" class="fullscreen-image" />
      <button
        @click="closeFullScreen"
        class="close-fullscreen-button icon-button"
        title="Close full screen view"
      >
        &times;
      </button>
      <button
        @click="downloadImage"
        class="download-fullscreen-button icon-button"
        title="Download Image"
      >
        ⬇️
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { vOnClickOutside } from '@vueuse/components'
import PulsingIconButton from '@/components/PulsingIconButton.vue'

const { isLoading, error: apiError, callApi } = useApi()

const prompt = ref('')
const generatedImageUrl = ref(null)
const revisedPrompt = ref(null)
const showFullScreen = ref(false)
const promptInputRef = ref(null)
const selectedModel = ref('dall-e-3')
const selectedSize = ref('1024x1024')
const selectedQuality = ref('standard')
const selectedStyle = ref('vivid')
const visibleHelpParam = ref(null)

const placeholderSuggestions = [
  'A cyberpunk cityscape at dusk, raining neon...',
  'A photorealistic cat wearing tiny glasses reading a book...',
  'An oil painting of a majestic mountain range...',
  'A cute robot tending a garden on Mars...',
  'Pixel art scene of a medieval fantasy village...',
  'Surreal image of clocks melting in a desert landscape...',
  'A watercolor painting of a hummingbird sipping nectar...',
  'Enter your image prompt here...',
]
const currentPlaceholder = ref(placeholderSuggestions[placeholderSuggestions.length - 1])
let placeholderIntervalId = null
let currentPlaceholderIndex = 0

const cyclePlaceholder = () => {
  currentPlaceholderIndex = (currentPlaceholderIndex + 1) % placeholderSuggestions.length
  currentPlaceholder.value = placeholderSuggestions[currentPlaceholderIndex]
}

const DALL_E_3_SIZES = [
  { value: '1024x1024', label: '1024x1024 (Square)' },
  { value: '1792x1024', label: '1792x1024 (Wide)' },
  { value: '1024x1792', label: '1024x1792 (Tall)' },
]
const DALL_E_2_SIZES = [
  { value: '1024x1024', label: '1024x1024' },
  { value: '512x512', label: '512x512' },
  { value: '256x256', label: '256x256' },
]
const availableSizes = computed(() => {
  return selectedModel.value === 'dall-e-2' ? DALL_E_2_SIZES : DALL_E_3_SIZES
})

watch(selectedModel, () => {
  const currentSizeIsValidForNewModel = availableSizes.value.some(
    (s) => s.value === selectedSize.value,
  )
  if (!currentSizeIsValidForNewModel) {
    selectedSize.value = '1024x1024'
  }
  visibleHelpParam.value = null
})

const autoGrowPromptInput = () => {
  nextTick(() => {
    const el = promptInputRef.value
    if (el) {
      el.style.height = 'auto'
      const maxHeight = 150
      const newHeight = Math.min(el.scrollHeight, maxHeight)
      el.style.height = `${newHeight}px`
      el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
    }
  })
}

const generateImage = async () => {
  if (!prompt.value.trim() || isLoading.value) return
  generatedImageUrl.value = null
  revisedPrompt.value = null
  apiError.value = null

  try {
    const url = '/.netlify/functions/call-openai-dalle3'
    const payload = {
      prompt: prompt.value,
      model: selectedModel.value,
      size: selectedSize.value,
      ...(selectedModel.value === 'dall-e-3' && { quality: selectedQuality.value }),
      ...(selectedModel.value === 'dall-e-3' && { style: selectedStyle.value }),
    }
    console.log('Sending payload to API:', payload)
    const responseData = await callApi(url, payload, 'POST')
    console.log('Received response from API:', responseData)

    if (!responseData || !responseData.imageBase64) {
      let errorMessage = 'Backend function did not return valid image data.'
      if (responseData && responseData.error)
        errorMessage += ` Backend Error: ${responseData.error}`
      else if (responseData && responseData.revisedPrompt)
        errorMessage += ` Revised Prompt was: ${responseData.revisedPrompt}`
      else if (!responseData) errorMessage += ' No response data received.'
      throw new Error(errorMessage)
    }
    generatedImageUrl.value = `data:image/png;base64,${responseData.imageBase64}`
    revisedPrompt.value = responseData.revisedPrompt || null
  } catch (err) {
    console.error('Error during image generation call:', err)
    if (!apiError.value) {
      apiError.value = err.message || 'An unknown error occurred during image generation.'
    }
  }
}

const clearError = () => {
  apiError.value = null
}
const openFullScreen = () => {
  if (generatedImageUrl.value) showFullScreen.value = true
}
const closeFullScreen = () => {
  showFullScreen.value = false
}

const downloadImage = () => {
  if (!generatedImageUrl.value) return
  try {
    const link = document.createElement('a')
    link.href = generatedImageUrl.value
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
    const mimeTypeMatch = generatedImageUrl.value.match(/data:(image\/(\w+));/)
    const extension = mimeTypeMatch && mimeTypeMatch[2] ? mimeTypeMatch[2] : 'png'
    link.download = `generated-image-${timestamp}.${extension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (err) {
    console.error('Download failed:', err)
    apiError.value = `Failed to prepare download: ${err.message}`
  }
}

const toggleParamHelp = (paramKey) => {
  visibleHelpParam.value = visibleHelpParam.value === paramKey ? null : paramKey
}
const closeHelp = () => {
  visibleHelpParam.value = null
}

onMounted(() => {
  autoGrowPromptInput()
  placeholderIntervalId = setInterval(cyclePlaceholder, 3500)
})
onUnmounted(() => {
  if (placeholderIntervalId) clearInterval(placeholderIntervalId)
})
watch(prompt, autoGrowPromptInput)
</script>

<style scoped>
/* --- Green Plasma Variables --- */
:root {
  --plasma-color-green-bright: hsl(120, 90%, 75%);
  --plasma-color-green-mid: hsl(120, 80%, 60%);
  --plasma-color-green-dim: hsl(120, 70%, 40%);
}

/* --- Main Layout --- */
.image-gen-view {
  padding: 1rem 1.5rem;
  height: calc(100vh - 60px); /* Adjust based on actual header height */
  max-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* *** UPDATED Background Color *** */
  background-color: #101010; /* Near black */
  color: var(--text-primary);
  box-sizing: border-box;
}

.image-display-area {
  flex-grow: 1;
  border: none; /* No border for main display */
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 0.5rem;
  background-color: transparent; /* Transparent background */
  min-height: 150px; /* Minimum height */
  position: relative;
  overflow: hidden; /* Hide potential overflow */
  margin-bottom: 1rem;
}

.parameter-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-shrink: 0;
  justify-content: flex-start; /* Align to start */
  padding: 0 0.5rem; /* Horizontal padding */
  align-items: flex-end; /* Align items at the bottom */
}

.input-area {
  display: flex;
  align-items: flex-end;
  padding: 0.75rem;
  background-color: var(--bg-input-area);
  flex-shrink: 0;
  gap: 0.5rem;
  border-top: 1px solid var(--border-color-medium);
}

/* --- Component Styles --- */
.prompt-input {
  flex-grow: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color-medium);
  border-radius: 18px;
  resize: none;
  font-family: sans-serif;
  font-size: 1em;
  min-height: 40px;
  max-height: 150px;
  overflow-y: hidden;
  line-height: 1.4;
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  box-sizing: border-box;
}
.prompt-input::placeholder {
  color: var(--text-placeholder);
  opacity: 0.8;
  transition: opacity 0.5s ease-in-out;
}
.prompt-input:hover:not(:focus):not(:disabled) {
  border-color: var(--accent-color-secondary);
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

.icon-button {
  padding: 0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  height: 40px;
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5em;
  flex-shrink: 0;
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease,
    transform 0.1s ease;
  line-height: 1;
  background-color: transparent;
  color: var(--text-secondary);
}
.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none !important;
}
.icon-button:active:not(:disabled) {
  transform: scale(0.95);
}
.icon-button:hover:not(:disabled) {
  background-color: var(--bg-button-secondary-hover);
}

.generate-button {
  margin-left: 0.5rem;
}

/* Parameter Controls Styles */
.param-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  position: relative;
}
.param-label-group {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.param-label-group label {
  font-size: 0.85em;
  color: #dcdcdc; /* Brighter label */
  font-weight: 500;
  margin-bottom: 0.1rem;
}
.help-icon-button {
  background: none;
  border: 1px solid var(--text-placeholder);
  padding: 0;
  margin: 0 0 0.1rem 0;
  cursor: pointer;
  color: var(--text-placeholder);
  font-size: 0.8em;
  line-height: 1;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  transition: all 0.2s ease;
}
.help-icon-button:hover,
.help-icon-button:focus-visible {
  background-color: var(--plasma-color-green-dim);
  color: white;
  border-color: var(--plasma-color-green-mid);
  box-shadow: 0 0 5px var(--plasma-color-green-dim);
  outline: none;
}
.param-help-box {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--bg-tooltip, #3a3a3a);
  color: var(--text-light, white);
  padding: 0.6rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85em;
  line-height: 1.4;
  white-space: normal;
  width: max-content;
  max-width: 280px;
  z-index: 10;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color-heavy);
  animation: fadeInHelpPopup 0.2s ease-out;
  cursor: pointer;
}
.param-help-box::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -6px;
  border-width: 6px;
  border-style: solid;
  border-color: var(--bg-tooltip, #3a3a3a) transparent transparent transparent;
}
@keyframes fadeInHelpPopup {
  from {
    opacity: 0;
    transform: translate(-50%, 5px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.param-group select {
  padding: 0.5rem 0.75rem;
  height: 38px;
  border: 1px solid var(--border-color-medium);
  border-radius: 6px;
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  font-family: sans-serif;
  font-size: 0.9em;
  min-width: 120px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  box-sizing: border-box;
}
.param-group select:hover:not(:disabled) {
  border-color: var(--accent-color-secondary);
}
.param-group select:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: var(--input-focus-shadow);
}
.param-group select:disabled {
  background-color: color-mix(in srgb, var(--bg-input-field) 50%, var(--bg-main-content));
  cursor: not-allowed;
  opacity: 0.7;
}

/* Generated Image Display */
.generated-image-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  gap: 0.5rem;
  overflow: hidden;
}
.image-wrapper {
  width: 100%;
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  min-height: 0;
}
.generated-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
  cursor: pointer;
  display: block;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.image-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: center;
  padding-top: 0.5rem;
  width: 100%;
  flex-shrink: 0;
  position: relative;
  bottom: 0;
}
.image-action-button.icon-button {
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  font-size: 1em;
  cursor: pointer;
  transition: background-color 0.2s ease;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.image-action-button.icon-button:hover {
  background-color: rgba(0, 0, 0, 0.7);
}
.revised-prompt-display {
  font-size: 0.75em;
  font-style: italic;
  color: #dcdcdc; /* Brighter */
  background-color: rgba(255, 255, 255, 0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  max-width: calc(100% - 80px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: help;
}

/* Placeholders & Loaders */
.placeholder-text {
  color: var(--text-placeholder);
  font-style: italic;
  font-size: 0.9em;
  text-align: center;
  margin: auto;
}
.loading-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(16, 16, 16, 0.7); /* Match dark background */
  backdrop-filter: blur(2px);
  z-index: 5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: #dcdcdc; /* Brighter text */
  font-style: normal;
  font-size: 0.9em;
}
.loading-indicator-visual.large-plasma-loader {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--accent-color-primary) 80%, white) 0%,
    var(--accent-color-primary) 50%,
    color-mix(in srgb, var(--accent-color-primary) 50%, transparent) 70%
  );
  animation: large-plasma-pulse 1.2s infinite ease-in-out;
  box-shadow: 0 0 12px 3px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
@keyframes large-plasma-pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.7;
    box-shadow: 0 0 8px 2px color-mix(in srgb, var(--accent-color-primary) 40%, transparent);
  }
  50% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 0 16px 4px color-mix(in srgb, var(--accent-color-primary) 60%, transparent);
  }
  100% {
    transform: scale(0.8);
    opacity: 0.7;
    box-shadow: 0 0 8px 2px color-mix(in srgb, var(--accent-color-primary) 40%, transparent);
  }
}

/* Error Message */
.error-message {
  width: calc(100% - 2rem);
  max-width: 600px;
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
  margin: 1rem auto;
  position: relative;
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
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
  box-sizing: border-box;
  cursor: pointer;
}
.fullscreen-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
  cursor: default;
}
.close-fullscreen-button {
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(40, 40, 40, 0.7);
  color: white;
  width: 44px;
  height: 44px;
  font-size: 1.8em;
  line-height: 1;
  padding: 0;
  z-index: 1002; /* Inherits .icon-button styles */
}
.close-fullscreen-button:hover {
  background: rgba(70, 70, 70, 0.8);
}
.download-fullscreen-button.icon-button {
  position: absolute;
  bottom: 15px;
  right: 15px;
  background-color: var(--bg-button-primary);
  color: var(--text-button-primary);
  font-size: 1.5em;
  transition: background-color 0.2s ease;
  z-index: 1001;
  width: 44px;
  height: 44px;
}
.download-fullscreen-button.icon-button:hover {
  background-color: var(--bg-button-primary-hover);
}
</style>
