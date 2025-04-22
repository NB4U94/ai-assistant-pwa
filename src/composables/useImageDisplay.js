// src/composables/useImageDisplay.js
import { ref } from 'vue'

// Props expected by the composable
// - generatedImageUrl: Ref<string | null> (from useImageGenerationApi)
// - apiError: Ref<string | null> (from useImageGenerationApi, to set download errors)
export function useImageDisplay(props) {
  const { generatedImageUrl, apiError } = props

  // --- State ---
  const showFullScreen = ref(false) // Controls visibility of the full-screen modal

  // --- Methods ---

  // Full Screen Modal Functions
  const openFullScreen = () => {
    // Ensure generatedImageUrl is accessed via .value if it's a ref
    if (generatedImageUrl?.value) {
      showFullScreen.value = true
      console.log('[Display] Opening fullscreen modal.')
    } else {
      console.warn('[Display] Cannot open fullscreen, no image URL available.')
    }
  }

  const closeFullScreen = () => {
    showFullScreen.value = false
    console.log('[Display] Closing fullscreen modal.')
  }

  // Download Image Function
  const downloadImage = () => {
    const imageUrl = generatedImageUrl?.value // Access reactive ref value
    if (!imageUrl) {
      console.warn('[Display] Cannot download, no image URL available.')
      return
    }

    try {
      const link = document.createElement('a')
      link.href = imageUrl // Works for Data URLs or regular URLs

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      // Attempt to determine extension from Data URL, default to png
      const mimeTypeMatch = imageUrl.match(/data:(image\/\w+);/)
      let extension = 'png' // Default
      if (mimeTypeMatch && mimeTypeMatch[1]) {
        extension = mimeTypeMatch[1].split('/')[1] || 'png'
        // Handle jpeg/jpg inconsistency if needed
        if (extension === 'jpeg') extension = 'jpg'
      }
      // Could add more complex logic here if dealing with URLs without extensions

      link.download = `generated-image-${timestamp}.${extension}`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      console.log('[Display] Image download initiated.')
    } catch (err) {
      console.error('[Display] Error preparing image download:', err)
      // Use the apiError ref passed from useImageGenerationApi to display error
      if (apiError) {
        apiError.value = `Failed to prepare download: ${err.message}`
      }
    }
  }

  // --- Expose State and Methods ---
  return {
    // State
    showFullScreen,

    // Methods
    openFullScreen,
    closeFullScreen,
    downloadImage,
  }
}
