// src/composables/useMessageSender.js
import { ref } from 'vue'
import { useConversationStore } from '@/stores/conversationStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAssistantsStore } from '@/stores/assistantsStore'
import { useApi } from '@/composables/useApi'
import { useFileInput } from '@/composables/useFileInput'

export function useMessageSender() {
  const conversationStore = useConversationStore()
  const settingsStore = useSettingsStore()
  const assistantsStore = useAssistantsStore()
  const { callApi, isLoading, error: apiError } = useApi()
  const { readFileAsBase64 } = useFileInput({})

  const error = ref(null)

  const sendMessage = async (textInput, imageFile, imagePreviewUrlForStore) => {
    error.value = null
    const trimmedInput = textInput?.trim() ?? ''

    if (isLoading.value) {
      return { success: false }
    }
    if (trimmedInput === '' && !imageFile) {
      return { success: false }
    }

    conversationStore.addMessageToActiveSession(
      'user',
      trimmedInput,
      Date.now(),
      imagePreviewUrlForStore,
    )

    let imgDataForApi = null
    if (imageFile && typeof readFileAsBase64 === 'function') {
      try {
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

    // --- Determine Model and Target URL ---
    let modelIdToUse = settingsStore.chatModel
    let targetUrl = '/.netlify/functions/call-openai-gpt-4'
    const currentId = conversationStore.activeSessionId
    if (currentId && !conversationStore.isMainChatSession(currentId)) {
      try {
        const currentAssistant = assistantsStore.getAssistantById(currentId)
        if (currentAssistant && currentAssistant.model) {
          modelIdToUse = currentAssistant.model
        }
      } catch (e) {
        console.error(`[useMessageSender] Error getting assistant config for ${currentId}: ${e}`)
      }
    }
    if (modelIdToUse && modelIdToUse.toLowerCase().startsWith('gemini')) {
      targetUrl = '/.netlify/functions/call-google-gemini'
    } else {
      targetUrl = '/.netlify/functions/call-openai-gpt-4'
    }
    console.log(
      `[useMessageSender] Routing request for model ${modelIdToUse} to endpoint: ${targetUrl}`,
    )

    // --- Prepare Message History & Context ---
    let messagesToSend = []
    try {
      messagesToSend = conversationStore.getFormattedHistoryForAPI({ excludeLast: true })
      // Inject "My AI" Context
      const segments = settingsStore.myAiContextSegments
      const applyToAll = settingsStore.myAiContextApplyToAll
      const allowedIds = settingsStore.myAiContextAllowedAssistantIds
      let shouldApplyContext = false
      if (segments && segments.length > 0 && currentId) {
        if (applyToAll) {
          shouldApplyContext = true
        } else if (
          allowedIds &&
          typeof allowedIds.has === 'function' &&
          allowedIds.has(currentId)
        ) {
          shouldApplyContext = true
        } else if (allowedIds && Array.isArray(allowedIds) && allowedIds.includes(currentId)) {
          shouldApplyContext = true
        }
      }
      if (shouldApplyContext) {
        const contextPreamble = 'Remember these facts/preferences about the user: '
        const contextString = segments.join('; ')
        const fullContextContent = contextPreamble + contextString
        const systemPromptIndex = messagesToSend.findIndex((msg) => msg.role === 'system')
        if (systemPromptIndex !== -1) {
          messagesToSend[systemPromptIndex].content =
            fullContextContent + '\n\n---\n\n' + messagesToSend[systemPromptIndex].content
        } else {
          messagesToSend.unshift({ role: 'system', content: fullContextContent })
        }
      }
      // Apply context limit
      const contextLimit = settingsStore.chatContextLength
      const systemPrompt = messagesToSend.find((msg) => msg.role === 'system')
      const nonSystemMessages = messagesToSend.filter((msg) => msg.role !== 'system')
      const limitedHistory = nonSystemMessages.slice(-(contextLimit > 0 ? contextLimit : Infinity))
      messagesToSend = systemPrompt ? [systemPrompt, ...limitedHistory] : [...limitedHistory]
      // Construct current user message content
      const currentUserMessageContent = []
      if (trimmedInput) {
        currentUserMessageContent.push({ type: 'text', text: trimmedInput })
      }
      if (imgDataForApi?.mimeType && imgDataForApi?.base64Data) {
        currentUserMessageContent.push({
          type: 'image_url',
          image_url: { url: `data:${imgDataForApi.mimeType};base64,${imgDataForApi.base64Data}` },
        })
      } else if (imgDataForApi) {
        console.error('[useMessageSender] Image data missing properties...')
        error.value = 'Internal error: Failed to format image data.'
        return { success: false }
      }
      if (currentUserMessageContent.length > 0) {
        messagesToSend.push({ role: 'user', content: currentUserMessageContent })
      } else {
        console.warn('[useMessageSender] No content found for current user message.')
        error.value = 'No message content to send.'
        return { success: false }
      }
      if (
        messagesToSend.length === 0 ||
        (messagesToSend.length === 1 && messagesToSend[0].role === 'system')
      ) {
        console.warn('[useMessageSender] History contains no user/assistant messages.')
        error.value = 'No message content to send.'
        return { success: false }
      }
    } catch (e) {
      console.error('[useMessageSender] Error preparing message history:', e)
      error.value = 'Internal Error: Cannot prepare message history.'
      return { success: false }
    }

    // *** Construct API Payload (FIXED - single declaration) ***
    const payload = {
      model: modelIdToUse,
      temperature: settingsStore.chatTemperature ?? undefined,
      max_tokens: settingsStore.chatMaxTokens || undefined, // Using || might be problematic if 0 is valid, consider ??
      top_p: settingsStore.chatTopP ?? undefined,
      messages: messagesToSend,
    }

    // Call API
    let aiResponseText = null
    try {
      const responseData = await callApi(targetUrl, payload, 'POST')
      aiResponseText = responseData?.aiText
      if (typeof aiResponseText === 'string' && aiResponseText.trim() !== '') {
        conversationStore.addMessageToActiveSession('assistant', aiResponseText.trim(), Date.now())
        error.value = null
        return { success: true, aiResponse: aiResponseText.trim() }
      } else {
        console.warn('[useMessageSender] API response missing content:', responseData)
        error.value = 'Received empty/invalid AI response.'
        return { success: false }
      }
    } catch (err) {
      console.error('[useMessageSender] API call failed:', apiError.value || err)
      error.value = apiError.value || `API error: ${err.message || 'Unknown API error'}`
      return { success: false }
    }
  } // End sendMessage function

  return { sendMessage, isLoading, error }
} // End useMessageSender composable
