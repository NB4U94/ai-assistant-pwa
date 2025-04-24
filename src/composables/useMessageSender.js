// src/composables/useMessageSender.js
import { ref } from 'vue'
import { useConversationStore } from '@/stores/conversationStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useApi } from '@/composables/useApi'
import { useFileInput } from '@/composables/useFileInput'

/**
 * Composable for handling the message sending process, including API interaction.
 */
export function useMessageSender() {
  const conversationStore = useConversationStore()
  const settingsStore = useSettingsStore()
  const { callApi, isLoading, error: apiError } = useApi()
  const { readFileAsBase64 } = useFileInput({}) // Review dependency if needed

  const error = ref(null) // Local error state

  const sendMessage = async (textInput, imageFile, imagePreviewUrlForStore) => {
    error.value = null
    const trimmedInput = textInput?.trim() ?? ''

    if (isLoading.value) {
      console.warn('[useMessageSender] Already sending, please wait.')
      return { success: false }
    }
    if (trimmedInput === '' && !imageFile) {
      console.warn('[useMessageSender] No text or image to send.')
      return { success: false }
    }

    // 1. Add User Message to Store (for display, with preview URL)
    // This happens *before* getting history for the API call.
    conversationStore.addMessageToActiveSession(
      'user',
      trimmedInput,
      Date.now(),
      imagePreviewUrlForStore,
    )

    // 2. Prepare Image Data (if any) for API
    let imgDataForApi = null
    if (imageFile && typeof readFileAsBase64 === 'function') {
      try {
        // Read the actual file data for the API payload
        imgDataForApi = await readFileAsBase64(imageFile)
      } catch (e) {
        console.error('[useMessageSender] Error processing image file:', e)
        error.value = `Image processing error: ${e.message}`
        return { success: false }
      }
    } else if (imageFile) {
      console.error('[useMessageSender] readFileAsBase64 function not available.')
      error.value = 'Internal error: Cannot process image file.'
      return { success: false }
    }

    // 3. Prepare API Payload
    let messagesToSend = []
    try {
      // Get history *excluding* the message just added above
      const historyForApi = conversationStore.getFormattedHistoryForAPI({ excludeLast: true })

      // Apply context limit to the history *before* adding the current message
      const contextLimit = settingsStore.chatContextLength
      const limitedHistory = historyForApi
        .filter((msg) => msg.role !== 'system')
        .slice(-(contextLimit > 0 ? contextLimit : Infinity))
      const systemPrompt = historyForApi.find((msg) => msg.role === 'system')

      // Start building the final message list
      if (systemPrompt) messagesToSend.push(systemPrompt)
      messagesToSend.push(...limitedHistory)

      // Construct the *current* user message in the API format
      const currentUserMessageContent = []
      if (trimmedInput) {
        currentUserMessageContent.push({ type: 'text', text: trimmedInput })
      }
      // ** USE imgDataForApi here **
      if (imgDataForApi && imgDataForApi.mimeType && imgDataForApi.base64Data) {
        currentUserMessageContent.push({
          type: 'image_url',
          image_url: { url: `data:${imgDataForApi.mimeType};base64,${imgDataForApi.base64Data}` },
        })
      } else if (imgDataForApi) {
        // Handle cases where readFileAsBase64 might return invalid structure (though it shouldn't)
        console.error('[useMessageSender] Invalid image data structure received:', imgDataForApi)
        error.value = 'Internal error: Failed to format image data for API.'
        return { success: false }
      }

      // Add the fully constructed current user message to the payload
      if (currentUserMessageContent.length > 0) {
        messagesToSend.push({ role: 'user', content: currentUserMessageContent })
      } else {
        console.warn(
          '[useMessageSender] No content (text or image) could be formatted for the current user message API call.',
        )
        // This case should ideally not happen due to checks at the start, but good to handle.
        error.value = 'No message content to send.'
        return { success: false }
      }

      // Final check for empty payload
      if (
        messagesToSend.length === 0 ||
        (messagesToSend.length === 1 && messagesToSend[0].role === 'system')
      ) {
        console.warn(
          '[useMessageSender] No suitable messages found to send to API after formatting.',
        )
        error.value = 'No message content to send.'
        return { success: false }
      }
      console.log('[useMessageSender] History prepared for API:', messagesToSend)
    } catch (e) {
      console.error('[useMessageSender] Error preparing message history:', e)
      error.value = 'Internal Error: Cannot prepare message history.'
      return { success: false }
    }

    const payload = {
      model: settingsStore.chatModel || 'gpt-4o',
      temperature: settingsStore.chatTemperature ?? 0.7,
      max_tokens: settingsStore.chatMaxTokens || 1024,
      top_p: settingsStore.chatTopP ?? 1.0,
      messages: messagesToSend,
    }

    // 4. Call API
    const url = '/.netlify/functions/call-openai-gpt-4' // Adjust if needed
    let aiResponseText = null
    try {
      const responseData = await callApi(url, payload, 'POST')

      // 5. Handle Response
      aiResponseText = responseData?.aiText
      if (typeof aiResponseText === 'string' && aiResponseText.trim() !== '') {
        conversationStore.addMessageToActiveSession('assistant', aiResponseText.trim(), Date.now())
        error.value = null // Clear error on success
        return { success: true, aiResponse: aiResponseText.trim() }
      } else {
        console.warn('[useMessageSender] API response missing expected AI content:', responseData)
        error.value = 'Received an empty or invalid response from the AI.'
        return { success: false }
      }
    } catch (err) {
      console.error('[useMessageSender] API call failed:', apiError.value || err)
      error.value = apiError.value || `An error occurred: ${err.message}`
      return { success: false }
    }
  }

  return {
    sendMessage,
    isLoading,
    error,
  }
}
