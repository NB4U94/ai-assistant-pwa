// src/composables/useAssistantForm.js
import { ref /* removed computed, watch */ } from 'vue'
import { useAssistantsStore } from '@/stores/assistantsStore'
import { useRouter } from 'vue-router'

export function useAssistantForm(props) {
  const { selectedLevel, currentQuestions, isEditMode, assistantIdToEdit, emit, selectedColor } =
    props

  const assistantsStore = useAssistantsStore()
  const router = useRouter()

  // --- Form State ---
  const assistantName = ref('')
  const answers = ref([])
  const assistantImageUrl = ref('')
  const imageFile = ref(null)
  const imageFileInputRef = ref(null)
  const imageError = ref(null)
  const finalInstructions = ref('')
  const boilerplateInstructions = ref('')
  const isSaving = ref(false)
  const saveError = ref(null)

  // --- Methods ---
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
    resetFileInput()
  }
  const loadAssistantData = (assistant) => {
    if (!assistant) {
      console.error('[Form] Attempted to load invalid assistant data.')
      saveError.value = 'Failed to load assistant data for editing.'
      return
    }
    console.log('[Form] Loading assistant data for edit:', assistant.name)
    assistantName.value = assistant.name || ''
    finalInstructions.value = assistant.instructions || ''
    assistantImageUrl.value = assistant.imageUrl || ''
    if (selectedColor && typeof selectedColor.value !== 'undefined') {
      selectedColor.value = assistant.color || null
      console.log('[Form] Loaded assistant color:', selectedColor.value)
    } else {
      console.error("[Form] Cannot load color - 'selectedColor' ref missing or invalid.")
    }
    imageFile.value = null
    imageError.value = null
    saveError.value = null
  }
  const generateFinalInstructions = () => {
    let markdown = ''
    if (currentQuestions.value && currentQuestions.value.length === answers.value.length) {
      currentQuestions.value.forEach((question, index) => {
        markdown += `**${question.promptKey}:**\n${answers.value[index]?.trim() || '(Not specified)'}\n\n`
      })
      finalInstructions.value = markdown.trim()
    } else {
      console.error('[Form] Mismatch questions/answers length or questions not loaded.')
      finalInstructions.value = 'Error generating instructions.'
    }
    if (selectedLevel.value === 1) {
      boilerplateInstructions.value = 'Remember this is a foundational instruction set...'
    } else if (selectedLevel.value === 2) {
      boilerplateInstructions.value = 'This instruction set provides a good level of detail...'
    } else {
      boilerplateInstructions.value = 'This is a comprehensive instruction set...'
    }
    console.log('[Form] Final instructions generated/updated.')
  }
  const triggerImageUpload = () => {
    imageFileInputRef.value?.click()
  }
  // Removed unused 'event' parameter
  const handleImageFileSelected = (event) => {
    const file = event.target.files?.[0]
    imageError.value = null
    assistantImageUrl.value = ''
    imageFile.value = null
    if (!file) return
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      imageError.value = 'Invalid file type...'
      resetFileInput()
      return
    }
    const maxSizeMB = 2
    if (file.size > maxSizeMB * 1024 * 1024) {
      imageError.value = `File is too large... (${maxSizeMB}MB max)`
      resetFileInput()
      return
    }
    imageFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      assistantImageUrl.value = e.target?.result
    }
    reader.onerror = (e) => {
      console.error('[Form] FileReader error:', e)
      imageError.value = 'Error reading image file.'
      resetFileInput()
      imageFile.value = null
    }
    reader.readAsDataURL(file)
  }
  const removeSelectedImage = () => {
    assistantImageUrl.value = ''
    imageFile.value = null
    imageError.value = null
    resetFileInput()
    console.log('[Form] Selected image removed.')
  }
  const resetFileInput = () => {
    if (imageFileInputRef.value) {
      imageFileInputRef.value.value = null
    }
  }
  // Removed unused 'event' parameter
  const onImagePreviewError = (/*event*/) => {
    console.warn('Preview image failed to load...')
    imageError.value = 'Could not display image preview.'
  }
  const saveOrUpdateAssistant = async () => {
    if (!assistantName.value.trim()) {
      saveError.value = `Please enter a name...`
      console.warn('[Form] Save/Update blocked: Assistant name is empty.')
      return false
    }
    isSaving.value = true
    saveError.value = null
    imageError.value = null
    generateFinalInstructions()
    let urlToSave = assistantImageUrl.value
    if (imageFile.value && assistantImageUrl.value.startsWith('data:image')) {
      console.warn('[Form] Saving Base64 Data URL directly...')
    } else if (!imageFile.value && !assistantImageUrl.value) {
      urlToSave = null
    }
    const assistantConfig = {
      id: isEditMode.value ? assistantIdToEdit.value : undefined,
      name: assistantName.value.trim(),
      level: selectedLevel.value,
      instructions: finalInstructions.value,
      imageUrl: urlToSave,
      color: selectedColor?.value || null, // Include color
    }
    let success = false
    try {
      if (isEditMode.value) {
        console.log('[Form] Attempting to update assistant via store:', assistantConfig)
        success = await assistantsStore.updateAssistant(assistantConfig)
        if (success) {
          console.log(`[Form] Assistant updated successfully.`)
          router.push({ name: 'assistants' })
        } else {
          saveError.value = assistantsStore.lastError || `Failed to update assistant.`
          console.error(`[Form] Failed update via store. Error: ${saveError.value}`)
        }
      } else {
        console.log('[Form] Attempting to add assistant via store:', assistantConfig)
        success = await assistantsStore.addAssistant(assistantConfig)
        if (success) {
          console.log(`[Form] Assistant saved successfully.`)
          emit('assistant-created')
        } else {
          saveError.value = assistantsStore.lastError || `Failed to save assistant.`
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
    return success
  }

  // --- Return Public API ---
  return {
    assistantName,
    answers,
    assistantImageUrl,
    imageFile,
    imageFileInputRef,
    imageError,
    finalInstructions,
    boilerplateInstructions,
    isSaving,
    saveError,
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
