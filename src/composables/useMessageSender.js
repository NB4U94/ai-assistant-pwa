// src/composables/useMessageSender.js
import { ref } from 'vue'
import { useConversationStore } from '@/stores/conversationStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAssistantsStore } from '@/stores/assistantsStore'
import { useApi } from '@/composables/useApi'
import { useFileInput } from '@/composables/useFileInput' // Assuming this provides readFileAsBase64

// Helper to generate message IDs consistently
function generateMessageId(prefix = 'msg') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function useMessageSender() {
  const conversationStore = useConversationStore()
  const settingsStore = useSettingsStore()
  const assistantsStore = useAssistantsStore()
  const { callApi, isLoading, error: apiError } = useApi()
  // Get readFileAsBase64 function from useFileInput
  const { readFileAsBase64 } = useFileInput({})

  const error = ref(null) // Local error state for this composable

  const sendMessage = async (textInput, imageFile, imagePreviewUrlForStore, isTestMode = false) => {
    error.value = null // Reset local error
    const trimmedInput = textInput?.trim() ?? ''
    const timestamp = Date.now() // Consistent timestamp for messages

    // Return object structure
    let result = {
      success: false,
      aiResponse: null,
      userMessage: null, // Will hold the message object in test mode
      assistantMessage: null, // Will hold the message object in test mode
    }

    if (isLoading.value) {
      console.warn('[useMessageSender] Already sending, skipping new request.')
      return result
    }
    if (trimmedInput === '' && !imageFile) {
      console.warn('[useMessageSender] No text or image provided.')
      return result
    }

    // --- Construct User Message Object ---
    // Create the object regardless of test mode, as we need it for the return value
    const userMessageObject = {
      messageId: generateMessageId('user'),
      role: 'user',
      content: trimmedInput,
      timestamp: timestamp,
      imagePreviewUrl: imagePreviewUrlForStore, // Store preview URL
    }

    // --- Add User Message to Store (Conditionally) ---
    if (!isTestMode) {
      console.log('[useMessageSender] Adding user message to store.')
      conversationStore.addMessageToActiveSession(
        userMessageObject.role,
        userMessageObject.content,
        userMessageObject.timestamp,
        userMessageObject.imagePreviewUrl,
        userMessageObject.messageId, // Pass ID if store function accepts it
      )
    } else {
      console.log('[useMessageSender] Test Mode: Skipping add user message to store.')
      result.userMessage = userMessageObject // Add to result for temporary display
    }

    // --- Process Image (if any) ---
    let imgDataForApi = null
    if (imageFile) {
      if (typeof readFileAsBase64 === 'function') {
        try {
          imgDataForApi = await readFileAsBase64(imageFile)
          if (!imgDataForApi?.mimeType || !imgDataForApi?.base64Data) {
            throw new Error('Processed image data is missing required properties.')
          }
        } catch (e) {
          console.error('[useMessageSender] Error processing image file:', e)
          error.value = `Image processing error: ${e.message || 'Unknown error'}`
          return result // Return default failure result
        }
      } else {
        console.error('[useMessageSender] readFileAsBase64 function not available.')
        error.value = 'Internal error: Cannot process image file.'
        return result // Return default failure result
      }
    }

    // --- Determine Model, Target URL, and System Prompt based on CURRENT Session ---
    let modelIdToUse = settingsStore.chatModel
    let targetUrl = '/.netlify/functions/call-openai-gpt-4'
    let systemPromptContent = null

    const currentActiveSessionId = conversationStore.activeSessionId
    console.log(
      `%c[useMessageSender] Preparing API call for activeSessionId: ${currentActiveSessionId}`,
      'color: yellow; font-weight: bold;',
    )

    if (currentActiveSessionId && !conversationStore.isMainChatSession(currentActiveSessionId)) {
      try {
        const currentAssistant = assistantsStore.getAssistantById(currentActiveSessionId)
        console.log(
          `[useMessageSender] Fetched assistant for API call:`,
          currentAssistant
            ? {
                id: currentAssistant.id,
                name: currentAssistant.name,
                model: currentAssistant.model,
              }
            : 'Not Found',
        )
        if (currentAssistant) {
          if (currentAssistant.model) modelIdToUse = currentAssistant.model
          if (currentAssistant.instructions && currentAssistant.instructions.trim() !== '') {
            systemPromptContent = currentAssistant.instructions.trim()
          }
        } else {
          console.warn(
            `[useMessageSender] Assistant config not found for ID: ${currentActiveSessionId}. Using defaults.`,
          )
        }
      } catch (e) {
        console.error(
          `[useMessageSender] Error getting assistant config for ${currentActiveSessionId}: ${e}`,
        )
      }
    } else {
      console.log(`[useMessageSender] Using main chat configuration.`)
    }

    if (modelIdToUse && modelIdToUse.toLowerCase().includes('gemini')) {
      targetUrl = '/.netlify/functions/call-google-gemini'
    } else {
      targetUrl = '/.netlify/functions/call-openai-gpt-4'
    }
    console.log(
      `[useMessageSender] Using Model: ${modelIdToUse}, Routing request to endpoint: ${targetUrl}`,
    )

    // --- Prepare Message History & Context ---
    let messagesToSend = []
    try {
      let baseHistory = []
      // Only fetch persistent history if NOT in test mode
      if (!isTestMode) {
        baseHistory = conversationStore.getFormattedHistoryForAPI({ excludeLast: true })
        console.log(
          `[useMessageSender] Fetched ${baseHistory.length} messages from persistent history.`,
        )
      } else {
        console.log(`[useMessageSender] Test Mode: Using empty base history for API call.`)
        baseHistory = []
      }
      if (!Array.isArray(baseHistory)) throw new Error('Base history preparation failed.')

      let finalSystemPrompt = systemPromptContent
      const segments = settingsStore.myAiContextSegments
      const applyToAll = settingsStore.myAiContextApplyToAll
      const allowedIds = settingsStore.myAiContextAllowedAssistantIds
      let shouldApplyContext = false

      if (segments && segments.length > 0 && currentActiveSessionId) {
        if (applyToAll) shouldApplyContext = true
        else if (allowedIds instanceof Set && allowedIds.has(currentActiveSessionId))
          shouldApplyContext = true
        else if (Array.isArray(allowedIds) && allowedIds.includes(currentActiveSessionId))
          shouldApplyContext = true
      }

      if (shouldApplyContext) {
        const contextPreamble = 'Remember these facts/preferences about the user: '
        const contextString = segments.join('; ')
        const fullContextContent = contextPreamble + contextString
        finalSystemPrompt = finalSystemPrompt
          ? fullContextContent + '\n\n---\n\n' + finalSystemPrompt
          : fullContextContent
        console.log('[useMessageSender] Applied My AI Context.')
      }

      if (finalSystemPrompt) messagesToSend.push({ role: 'system', content: finalSystemPrompt })

      const nonSystemMessages = baseHistory.filter((msg) => msg.role !== 'system')
      const contextLimit = settingsStore.chatContextLength
      const limitedHistory = nonSystemMessages.slice(-(contextLimit > 0 ? contextLimit : Infinity))
      messagesToSend.push(...limitedHistory)

      // Construct final user message payload for API
      let finalUserMessagePayload = null
      if (trimmedInput && !imgDataForApi) {
        finalUserMessagePayload = { role: 'user', content: trimmedInput }
      } else if (!trimmedInput && imgDataForApi) {
        console.warn(
          '[useMessageSender] Image-only messages need specific API formatting. Sending placeholder/skipping for now.',
        )
        error.value = 'Sending images without text is not fully implemented yet.'
        return result // Return default failure result
      } else if (trimmedInput && imgDataForApi) {
        console.warn(
          '[useMessageSender] Text+Image messages need specific Gemini API formatting. Ensure backend handles array content.',
        )
        finalUserMessagePayload = {
          role: 'user',
          content: [
            { text: trimmedInput },
            { inline_data: { mime_type: imgDataForApi.mimeType, data: imgDataForApi.base64Data } },
          ],
        }
      }

      if (finalUserMessagePayload) {
        messagesToSend.push(finalUserMessagePayload)
      } else if (!trimmedInput && !imgDataForApi) {
        console.warn('[useMessageSender] No text or image content found for current user message.')
        if (!error.value) error.value = 'No message content to send.'
        return result
      }

      if (
        messagesToSend.filter((msg) => msg.role === 'user' || msg.role === 'assistant').length === 0
      ) {
        console.warn('[useMessageSender] History contains no user/assistant messages to send.')
        if (!error.value) error.value = 'No message history to send.'
        return result
      }
    } catch (e) {
      console.error('[useMessageSender] Error preparing message history:', e)
      error.value = `Internal Error: ${e.message || 'Cannot prepare message history.'}`
      return result // Return default failure result
    }

    // --- Construct Final API Payload ---
    const payload = {
      model: modelIdToUse,
      temperature: settingsStore.chatTemperature ?? undefined,
      max_tokens: settingsStore.chatMaxTokens || undefined,
      top_p: settingsStore.chatTopP ?? undefined,
      messages: messagesToSend,
    }

    // --- Call API ---
    let aiResponseText = null
    try {
      console.log('[useMessageSender] Sending payload to API:', JSON.stringify(payload, null, 2))
      const responseData = await callApi(targetUrl, payload, 'POST')
      aiResponseText = responseData?.aiText

      if (typeof aiResponseText === 'string' && aiResponseText.trim() !== '') {
        const assistantResponseTimestamp = Date.now()
        // Construct assistant message object first
        const assistantMessageObject = {
          messageId: generateMessageId('asst'),
          role: 'assistant',
          content: aiResponseText.trim(),
          timestamp: assistantResponseTimestamp,
          imagePreviewUrl: null, // Assistants don't send images back yet
        }

        // Add to store conditionally
        if (!isTestMode) {
          console.log('[useMessageSender] Adding assistant message to store.')
          conversationStore.addMessageToActiveSession(
            assistantMessageObject.role,
            assistantMessageObject.content,
            assistantMessageObject.timestamp,
            assistantMessageObject.imagePreviewUrl,
            assistantMessageObject.messageId, // Pass ID if store function accepts it
          )
        } else {
          console.log('[useMessageSender] Test Mode: Skipping add assistant message to store.')
          result.assistantMessage = assistantMessageObject // Add to result for temporary display
        }

        error.value = null
        result.success = true
        result.aiResponse = aiResponseText.trim()
        return result // Return result object
      } else {
        console.warn('[useMessageSender] API response missing content or invalid:', responseData)
        error.value = 'Received empty or invalid response from AI.'
        return result // Return default failure result
      }
    } catch (err) {
      const message = apiError.value || (err instanceof Error ? err.message : 'Unknown API error')
      console.error('[useMessageSender] API call failed:', message, err)
      error.value = `API Error: ${message}`
      return result // Return default failure result
    }
  } // End sendMessage function

  // Return the public interface of the composable
  return {
    sendMessage,
    isLoading, // Expose loading state from useApi
    error, // Expose local error state
  }
} // End useMessageSender composable
