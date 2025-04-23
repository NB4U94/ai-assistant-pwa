// src/composables/useFileInput.js
import { ref } from 'vue'

// Callback type definitions for clarity (optional JSDoc)
/**
 * @callback AddErrorCallback
 * @param {string} errorMessage - The error message text.
 */
/**
 * @callback UpdatePlaceholderCallback
 * @param {boolean} isImageSelected - Whether an image is currently selected.
 */
/**
 * @callback ImageSelectedCallback
 */

/**
 * Reads a File object and returns its base64 representation and mime type.
 * @param {File} file - The file to read.
 * @returns {Promise<{base64Data: string, mimeType: string}>} - A promise resolving with base64 data and mime type.
 */
const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result?.toString()
      if (result) {
        const parts = result.match(/^data:(.+?);base64,(.+)$/)
        if (parts && parts.length === 3) {
          const mimeType = parts[1]
          const base64Data = parts[2]
          resolve({ base64Data, mimeType })
        } else {
          // Handle cases without proper data URI mime type (fallback)
          const commaIndex = result.indexOf(',')
          if (commaIndex !== -1) {
            const base64Data = result.substring(commaIndex + 1)
            // Try to get mime from file object if not in data URI
            const mimeType = file.type || 'application/octet-stream' // Provide a default mime
            console.warn(
              `[useFileInput] Could not parse mime type from Data URL, using file.type: ${mimeType}`,
            )
            resolve({ base64Data, mimeType })
          } else {
            reject(new Error('Invalid Data URL format.'))
          }
        }
      } else {
        reject(new Error('Failed to read file as Data URL.'))
      }
    }
    reader.onerror = (error) => reject(new Error(`FileReader error: ${error}`))
    reader.readAsDataURL(file)
  })
}

/**
 * Composable for handling file input, specifically for images.
 *
 * @param {object} [dependencies={}] - Optional dependencies object.
 * @param {AddErrorCallback} [dependencies.addErrorMessage] - Callback function to display errors.
 * @param {UpdatePlaceholderCallback} [dependencies.updatePlaceholder] - Callback to update input placeholder based on selection.
 * @param {ImageSelectedCallback} [dependencies.onImageSelected] - Optional callback executed when image preview is ready.
 * @returns {object} - Reactive state and methods for file input.
 */
export function useFileInput(dependencies = {}) {
  // Default to empty object
  // Destructure with safe defaults
  const {
    addErrorMessage = (msg) => console.error('useFileInput: addErrorMessage not provided!', msg),
    updatePlaceholder = (isSelected) =>
      console.warn('useFileInput: updatePlaceholder not provided! Selected:', isSelected),
    onImageSelected = () => {}, // Default to an empty function
  } = dependencies

  const selectedImagePreview = ref(null)
  const selectedFile = ref(null)
  const fileInputRef = ref(null)

  const triggerFileInput = () => {
    fileInputRef.value?.click()
  }

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = null // Reset input so same file can be selected again

    if (!file) {
      removeSelectedImage()
      return
    }

    if (!file.type.startsWith('image/')) {
      addErrorMessage(`Invalid file type: "${file.name}". Please select an image.`)
      removeSelectedImage()
      return
    }

    const maxMB = 20 // Increased max size based on vision model limits
    if (file.size > maxMB * 1024 * 1024) {
      addErrorMessage(`File "${file.name}" is too large (max ${maxMB}MB).`)
      removeSelectedImage()
      return
    }

    selectedFile.value = file

    // Generate preview
    try {
      const previewReader = new FileReader()
      previewReader.onload = (e) => {
        selectedImagePreview.value = e.target?.result?.toString() || null // Ensure string or null
        updatePlaceholder(true)
        // Call the image selected callback
        if (typeof onImageSelected === 'function') {
          onImageSelected()
        }
      }
      previewReader.onerror = (e) => {
        console.error('[useFileInput] Error reading file for preview:', e)
        addErrorMessage('Could not generate image preview.')
        removeSelectedImage()
      }
      previewReader.readAsDataURL(file)
    } catch (previewError) {
      console.error('[useFileInput] Exception during file preview generation:', previewError)
      addErrorMessage('Error setting up image preview.')
      removeSelectedImage()
    }
  }

  const removeSelectedImage = () => {
    selectedImagePreview.value = null
    selectedFile.value = null
    if (fileInputRef.value) {
      // Clear the file input value if ref exists
      fileInputRef.value.value = ''
    }
    updatePlaceholder(false) // Notify placeholder update
  }

  return {
    selectedImagePreview,
    selectedFile,
    fileInputRef,
    triggerFileInput,
    handleFileSelected,
    removeSelectedImage,
    readFileAsBase64, // Export the utility function if needed elsewhere, or keep internal
  }
}
