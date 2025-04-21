// src/composables/useAssistantForm.js
import { ref, computed, watch } from 'vue'
import { useAssistantsStore } from '@/stores/assistantsStore'
import { useRouter } from 'vue-router' // Import router for navigation on update

// Props or refs expected by the composable (passed from component/other composables)
// - selectedLevel: Ref<number | null> (from useAssistantWizard)
// - currentQuestions: Ref<Array> (from useAssistantWizard)
// - isEditMode: Ref<boolean> (from component props/state)
// - assistantIdToEdit: Ref<string | null> (from component props/state)
// - emit: Function to emit events (from component setup context)
export function useAssistantForm(props) {
  const { selectedLevel, currentQuestions, isEditMode, assistantIdToEdit, emit } = props

  // Store and Router
  const assistantsStore = useAssistantsStore()
  const router = useRouter()

  // --- Form State ---
  const assistantName = ref('')
  const answers = ref([]) // Holds answers to the questions for the selected level
  const assistantImageUrl = ref('') // Holds Data URL for preview/new image, or existing URL
  const imageFile = ref(null) // Holds the File object if a new one is selected
  const imageFileInputRef = ref(null) // Ref for the hidden file input element
  const imageError = ref(null) // Error message for image upload/preview
  const finalInstructions = ref('')
  const boilerplateInstructions = ref('') // Simple boilerplate text based on level
  const isSaving = ref(false)
  const saveError = ref(null) // Error during save/update operation

  // --- Computed Properties ---
  // (Example: might need computed properties based on form state later)

  // --- Methods ---

  // Initialize or Reset Form State
  const resetFormState = () => {
    console.log('[Form] Resetting form state.')
    assistantName.value = ''
    answers.value = new Array(currentQuestions.value?.length || 0).fill('')
    assistantImageUrl.value = ''
    imageFile.value = null
    imageError.value = null
    finalInstructions.value = ''
    boilerplateInstructions.value = ''
    saveError.value = null
    isSaving.value = false
    resetFileInput() // Ensure file input is cleared
  }

  // Load data when editing
  const loadAssistantData = (assistant) => {
    if (!assistant) {
      console.error('[Form] Attempted to load invalid assistant data.')
      saveError.value = 'Failed to load assistant data for editing.'
      return
    }
    console.log('[Form] Loading assistant data for edit:', assistant.name)
    assistantName.value = assistant.name || ''
    // answers are repopulated via wizard/component logic based on instructions
    finalInstructions.value = assistant.instructions || ''
    assistantImageUrl.value = assistant.imageUrl || '' // Load existing URL for preview
    imageFile.value = null // Clear any previously selected file
    imageError.value = null
    saveError.value = null

    // Note: Repopulating 'answers' from 'finalInstructions' happens
    // in the component's loadAssistantForEdit logic after level/questions are set.
    // We might move that parsing logic here later if needed.
  }

  // Generate Instructions Logic
  const generateFinalInstructions = () => {
    let markdown = ''
    if (currentQuestions.value && currentQuestions.value.length === answers.value.length) {
      currentQuestions.value.forEach((question, index) => {
        markdown += `**${question.promptKey}:**\n`
        markdown += `${answers.value[index]?.trim() || '(Not specified)'}\n\n`
      })
      finalInstructions.value = markdown.trim()
    } else {
      console.error('[Form] Mismatch between questions and answers length or questions not loaded.')
      finalInstructions.value = 'Error generating instructions.'
    }
    // Set boilerplate...
    if (selectedLevel.value === 1) {
      boilerplateInstructions.value =
        'Remember that this is a foundational instruction set. It covers the core requirements but might lack nuance for complex scenarios.'
    } else if (selectedLevel.value === 2) {
      boilerplateInstructions.value =
        'This instruction set provides a good level of detail, balancing clarity with conciseness for moderately complex assistants.'
    } else {
      boilerplateInstructions.value =
        'This is a comprehensive instruction set designed for precise control and handling various interaction aspects.'
    }
    console.log('[Form] Final instructions generated/updated.')
  }

  // Image Handling Logic
  const triggerImageUpload = () => {
    imageFileInputRef.value?.click()
  }

  const handleImageFileSelected = (event) => {
    const file = event.target.files?.[0]
    imageError.value = null
    assistantImageUrl.value = '' // Clear previous preview immediately
    imageFile.value = null // Clear previous file object

    if (!file) return

    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      imageError.value = 'Invalid file type. Please select PNG, JPG, GIF, or WEBP.'
      resetFileInput()
      return
    }

    const maxSizeMB = 2
    if (file.size > maxSizeMB * 1024 * 1024) {
      imageError.value = `File is too large. Maximum size is ${maxSizeMB}MB.`
      resetFileInput()
      return
    }

    imageFile.value = file // Store the File object

    // Read file as Base64 Data URL for preview
    const reader = new FileReader()
    reader.onload = (e) => {
      assistantImageUrl.value = e.target?.result // Set Data URL for preview
      console.log('[Form] Image loaded as Data URL for preview.')
    }
    reader.onerror = (e) => {
      console.error('[Form] FileReader error:', e)
      imageError.value = 'Error reading image file.'
      resetFileInput()
      imageFile.value = null // Ensure file object is cleared on error
    }
    reader.readAsDataURL(file)
  }

  const removeSelectedImage = () => {
    assistantImageUrl.value = ''
    imageFile.value = null // Clear the File object
    imageError.value = null
    resetFileInput()
    console.log('[Form] Selected image removed.')
  }

  const resetFileInput = () => {
    if (imageFileInputRef.value) {
      imageFileInputRef.value.value = null
    }
  }

  const onImagePreviewError = (event) => {
    console.warn('Preview image failed to load:', event.target.src.substring(0, 100) + '...')
    imageError.value = 'Could not display image preview.'
    // Don't clear assistantImageUrl if it might be a valid existing URL
    // Hide the broken img tag in the component's template logic instead
  }

  // Save / Update Logic
  const saveOrUpdateAssistant = async () => {
    if (!assistantName.value.trim()) {
      saveError.value = `Please enter a name before ${isEditMode.value ? 'updating' : 'saving'}.`
      // Triggering UI feedback (like shake) should ideally happen in the component
      // based on the error state, but we log it here.
      console.warn('[Form] Save/Update blocked: Assistant name is empty.')
      return false // Indicate failure
    }

    isSaving.value = true
    saveError.value = null
    imageError.value = null
    generateFinalInstructions() // Ensure instructions are current

    // **Image Upload Handling (Placeholder)**
    // If a new imageFile exists, we'd normally upload it here FIRST
    // and get back a permanent URL to save in the store.
    // For now, we'll save the Data URL directly if it's a new image,
    // or the existing URL if no new file was selected.
    // This is NOT ideal for production (stores large base64 strings).
    let urlToSave = assistantImageUrl.value // Assume current value is okay
    if (imageFile.value && assistantImageUrl.value.startsWith('data:image')) {
      console.warn(
        '[Form] Saving Base64 Data URL directly. Consider implementing proper image uploads.',
      )
      // In a real app:
      // 1. Call an upload function (e.g., to Netlify Large Media, S3, Cloudinary)
      //    const uploadResult = await uploadImage(imageFile.value);
      // 2. If successful, urlToSave = uploadResult.url;
      // 3. If failed, set saveError, set isSaving=false, return false;
    } else if (!imageFile.value && !assistantImageUrl.value) {
      // No image selected and no existing image = save null
      urlToSave = null
    }
    // If assistantImageUrl is a regular URL (http/https), it means user didn't change it, so keep it.

    const assistantConfig = {
      id: isEditMode.value ? assistantIdToEdit.value : undefined,
      name: assistantName.value.trim(),
      level: selectedLevel.value,
      instructions: finalInstructions.value,
      imageUrl: urlToSave, // Use the determined URL
    }

    let success = false
    try {
      if (isEditMode.value) {
        console.log('[Form] Attempting to update assistant via store:', assistantConfig)
        success = await assistantsStore.updateAssistant(assistantConfig) // Assuming store action might be async if it persists
        if (success) {
          console.log(`[Form] Assistant updated successfully.`)
          router.push({ name: 'assistants' }) // Navigate back to list
        } else {
          saveError.value =
            assistantsStore.lastError ||
            `Failed to update assistant. Name might already exist or store error occurred.`
          console.error(`[Form] Failed update via store. Error: ${saveError.value}`)
        }
      } else {
        console.log('[Form] Attempting to add assistant via store:', assistantConfig)
        success = await assistantsStore.addAssistant(assistantConfig) // Assuming store action might be async
        if (success) {
          console.log(`[Form] Assistant saved successfully.`)
          emit('assistant-created') // Signal success to parent component
          // resetFormState(); // Optionally reset form after successful creation
          // resetWizard(); // Also reset wizard state via passed function?
        } else {
          saveError.value =
            assistantsStore.lastError ||
            `Failed to save assistant. Name might already exist or store error occurred.`
          console.error(`[Form] Failed add via store. Error: ${saveError.value}`)
        }
      }
    } catch (e) {
      console.error(`[Form] Error during ${isEditMode.value ? 'update' : 'save'} operation:`, e)
      saveError.value = `An unexpected error occurred: ${e.message}`
      success = false
    } finally {
      isSaving.value = false
    }
    return success // Return success status
  }

  // --- Watchers (Optional) ---
  // Example: Watch answers to regenerate instructions automatically? Or do it manually on review step.
  // watch(answers, generateFinalInstructions, { deep: true });

  // --- Expose State and Methods ---
  return {
    // Form State Refs
    assistantName,
    answers,
    assistantImageUrl,
    imageFile, // Expose the file object if needed elsewhere
    imageFileInputRef, // Expose ref for the component template
    imageError,
    finalInstructions,
    boilerplateInstructions,
    isSaving,
    saveError,

    // Methods
    loadAssistantData,
    resetFormState,
    generateFinalInstructions,
    triggerImageUpload,
    handleImageFileSelected,
    removeSelectedImage,
    onImagePreviewError,
    saveOrUpdateAssistant,
  }
}
