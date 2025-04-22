// src/composables/useImageGenerationForm.js
import { ref, computed, watch } from 'vue'

// Define parameter options (can be moved to data file later if needed)
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

export function useImageGenerationForm() {
  // --- Reactive State ---
  const prompt = ref('')
  const selectedModel = ref('dall-e-3') // Default to DALL-E 3
  const selectedSize = ref('1024x1024')
  const selectedQuality = ref('standard')
  const selectedStyle = ref('vivid')
  const promptInputRef = ref(null) // Ref for the textarea element

  // --- Computed Properties ---
  const availableSizes = computed(() => {
    return selectedModel.value === 'dall-e-2' ? DALL_E_2_SIZES : DALL_E_3_SIZES
  })

  // --- Watchers ---
  // Reset size if it becomes invalid when switching models
  watch(selectedModel, (newModel) => {
    const currentSizeIsValid = availableSizes.value.some((s) => s.value === selectedSize.value)
    if (!currentSizeIsValid) {
      selectedSize.value = '1024x1024' // Reset to default valid size
    }
    // Reset quality/style defaults for DALL-E 2 (even though they'll be hidden)
    if (newModel === 'dall-e-2') {
      selectedQuality.value = 'standard'
      selectedStyle.value = 'vivid'
    }
  })

  // --- Methods ---
  const autoGrowPromptInput = () => {
    nextTick(() => {
      const el = promptInputRef.value
      if (el) {
        el.style.height = 'auto'
        const maxHeight = 150 // Example max height
        const newHeight = Math.min(el.scrollHeight, maxHeight)
        el.style.height = `${newHeight}px`
        el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
      }
    })
  }

  // Method to get current payload (used by API composable)
  const getPayload = () => {
    const payload = {
      prompt: prompt.value,
      model: selectedModel.value,
      size: selectedSize.value,
      ...(selectedModel.value === 'dall-e-3' && { quality: selectedQuality.value }),
      ...(selectedModel.value === 'dall-e-3' && { style: selectedStyle.value }),
    }
    return payload
  }

  // Expose state and methods
  return {
    prompt,
    selectedModel,
    selectedSize,
    selectedQuality,
    selectedStyle,
    promptInputRef, // Expose ref for template connection

    availableSizes, // Expose computed sizes

    autoGrowPromptInput,
    getPayload, // Expose function to get data for API call
  }
}
