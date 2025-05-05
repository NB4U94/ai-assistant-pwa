// src/composables/useMessageSender.js
import { ref } from 'vue'
import { useConversationStore } from '@/stores/conversationStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAssistantsStore } from '@/stores/assistantsStore'
import { useApi } from '@/composables/useApi'
import { useFileInput } from '@/composables/useFileInput'

// --- Configuration ---
const TYPING_DELAY_MS = 20 // <<< UPDATED: Back to 2.0x speed (40 / 2.0)
// --- End Configuration ---

// Helper to generate message IDs consistently
function generateMessageId(prefix = 'msg') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function useMessageSender() {
  const conversationStore = useConversationStore()
  const settingsStore = useSettingsStore()
  const assistantsStore = useAssistantsStore()
  const { callApi, isLoading, error: apiError } = useApi()
  const { readFileAsBase64 } = useFileInput({})

  const error = ref(null) // Local error state

  // --- Stream Reader Helper with Throttled and Varied Display ---
  /**
   * Reads a streaming text response, buffers it, and updates message content incrementally
   * with variable delays to simulate natural typing.
   * @param {Response} response - The raw Response object from fetch.
   * @param {string} assistantMessageId - The ID of the message to update.
   * @param {boolean} isTestMode - Whether currently in test mode.
   * @param {object} resultRef - The ref to the result object to update on completion/error.
   * @param {object} store - The conversationStore instance.
   */
  async function readStreamAndThrottleUpdate(
    response,
    assistantMessageId,
    isTestMode,
    resultRef,
    store,
  ) {
    let fullText = ''
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    const assistantMessageShell = {
      messageId: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      imagePreviewUrl: null,
      isLoading: true,
    }

    if (!reader) {
      throw new Error('Failed to get reader from stream body.')
    }

    // Throttling state
    const charQueue = []
    let isProcessingQueue = false
    let streamEnded = false
    let timeoutId = null

    // Function to process the character queue with variable delay
    const processQueue = () => {
      if (charQueue.length <= 0) {
        // Queue is empty
        if (streamEnded) {
          // AND stream is done
          isProcessingQueue = false
          resultRef.value.success = true
          resultRef.value.aiResponse = fullText.trim()
          if (!isTestMode) {
            store.updateMessageLoadingState(assistantMessageId, false)
          } else if (resultRef.value.assistantMessage) {
            resultRef.value.assistantMessage.isLoading = false
          }
          return // Stop the loop
        } else {
          // Stream not done, just wait
          isProcessingQueue = false
          return
        }
      }

      // Process one character
      const char = charQueue.shift()
      fullText += char

      // Update store or result object
      if (!isTestMode) {
        store.appendContentToMessage(assistantMessageId, char)
      } else if (resultRef.value && resultRef.value.assistantMessage) {
        resultRef.value.assistantMessage.content += char
      }

      // --- Calculate Delay for NEXT character ---
      let nextDelay = TYPING_DELAY_MS // Start with base delay (now 20ms)

      // Pause after punctuation
      if (['.', '!', '?'].includes(char)) {
        nextDelay += Math.random() * 60 + 60 // Add 60-120ms extra
      }
      // Occasional pause after space
      else if (char === ' ' && Math.random() < 0.07) {
        // 7% chance
        nextDelay += Math.random() * 120 + 60 // Add 60-180ms extra
      }
      // Pause for paragraph break (\n\n) - Peek ahead
      else if (char === '\n' && charQueue.length > 0 && charQueue[0] === '\n') {
        nextDelay += Math.random() * 150 + 200 // Add 200-350ms extra
      }
      // Random brief hesitation pause (very low chance)
      else if (Math.random() < 0.01) {
        // 1% chance
        nextDelay += Math.random() * 200 + 100 // Add 100-300ms extra
      }

      // Ensure delay isn't excessively long
      nextDelay = Math.min(nextDelay, 600) // Cap max delay

      // Schedule next iteration
      timeoutId = setTimeout(processQueue, Math.floor(nextDelay)) // Use calculated delay
    }

    // Function to start processing the queue if not already active
    const startQueueProcessing = () => {
      if (!isProcessingQueue) {
        isProcessingQueue = true
        timeoutId = setTimeout(processQueue, 0) // Start on next tick
      }
    }

    // Add the initial shell message
    if (!isTestMode) {
      store.addMessageToActiveSession(
        assistantMessageShell.role,
        assistantMessageShell.content,
        assistantMessageShell.timestamp,
        assistantMessageShell.imagePreviewUrl,
        assistantMessageShell.messageId,
        assistantMessageShell.isLoading,
      )
    } else {
      resultRef.value.assistantMessage = assistantMessageShell
    }

    // Main stream reading loop
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          streamEnded = true
          startQueueProcessing()
          break
        }
        const chunkText = decoder.decode(value, { stream: false })
        if (chunkText) {
          charQueue.push(...chunkText.split(''))
          startQueueProcessing()
        }
      }
    } catch (streamError) {
      const errorMessage = `Stream Error: ${streamError.message || 'Failed to read response'}`
      error.value = errorMessage
      resultRef.value.success = false
      resultRef.value.aiResponse = fullText

      if (timeoutId) clearTimeout(timeoutId)
      isProcessingQueue = false
      streamEnded = true

      const errorSuffix = `\n\n--- (Error receiving full response: ${errorMessage}) ---`
      if (!isTestMode) {
        store.appendContentToMessage(assistantMessageId, errorSuffix)
        store.updateMessageLoadingState(assistantMessageId, false)
      } else if (resultRef.value && resultRef.value.assistantMessage) {
        resultRef.value.assistantMessage.content += errorSuffix
        resultRef.value.assistantMessage.isLoading = false
      }
      throw new Error(errorMessage) // Re-throw
    }
  }

  // --- sendMessage Function ---
  const sendMessage = async (textInput, imageFile, imagePreviewUrlForStore, isTestMode = false) => {
    error.value = null
    const trimmedInput = textInput?.trim() ?? ''
    const timestamp = Date.now()

    const result = ref({
      success: false,
      aiResponse: null,
      userMessage: null,
      assistantMessage: null,
    })

    if (isLoading.value) {
      return result.value
    }
    if (trimmedInput === '' && !imageFile) {
      return result.value
    }

    // Construct User Message Object
    const userMessageObject = {
      messageId: generateMessageId('user'),
      role: 'user',
      content: trimmedInput,
      timestamp: timestamp,
      imagePreviewUrl: imagePreviewUrlForStore,
    }

    // Add User Message to Store (Conditionally)
    if (!isTestMode) {
      conversationStore.addMessageToActiveSession(
        userMessageObject.role,
        userMessageObject.content,
        userMessageObject.timestamp,
        userMessageObject.imagePreviewUrl,
        userMessageObject.messageId,
      )
    } else {
      result.value.userMessage = userMessageObject
    }

    // Process Image (if any)
    let imgDataForApi = null
    if (imageFile) {
      if (typeof readFileAsBase64 === 'function') {
        try {
          imgDataForApi = await readFileAsBase64(imageFile)
          if (!imgDataForApi?.mimeType || !imgDataForApi?.base64Data)
            throw new Error('Processed image data missing.')
        } catch (e) {
          error.value = `Image processing error: ${e.message || 'Unknown error'}`
          return result.value
        }
      } else {
        error.value = 'Internal error: Cannot process image file.'
        return result.value
      }
    }

    // Determine Model, Target URL, System Prompt
    let modelIdToUse = settingsStore.chatModel
    let targetUrl = '/.netlify/functions/call-openai-gpt-4'
    let systemPromptContent = null
    const currentActiveSessionId = conversationStore.activeSessionId
    if (currentActiveSessionId && !conversationStore.isMainChatSession(currentActiveSessionId)) {
      try {
        const assistant = assistantsStore.getAssistantById(currentActiveSessionId)
        if (assistant) {
          if (assistant.model) modelIdToUse = assistant.model
          if (assistant.instructions?.trim()) systemPromptContent = assistant.instructions.trim()
        }
      } catch (e) {
        console.error(`Error getting assistant config: ${e}`)
      }
    }
    if (modelIdToUse?.toLowerCase().includes('gemini')) {
      targetUrl = '/.netlify/functions/call-google-gemini'
    } else {
      targetUrl = '/.netlify/functions/call-openai-gpt-4'
    }
    console.log(`Using Model: ${modelIdToUse}, Routing request to: ${targetUrl}`)

    // Prepare Message History & Context
    let messagesToSend = []
    try {
      let baseHistory = []
      if (!isTestMode) {
        baseHistory = conversationStore.getFormattedHistoryForAPI({ excludeLast: true })
      }
      let finalSystemPrompt = systemPromptContent
      // Apply My AI Context if applicable
      const segments = settingsStore.myAiContextSegments
      const applyToAll = settingsStore.myAiContextApplyToAll
      const allowedIds = settingsStore.myAiContextAllowedAssistantIds
      let shouldApplyContext = false
      if (segments?.length > 0 && currentActiveSessionId) {
        if (
          applyToAll ||
          (allowedIds instanceof Set && allowedIds.has(currentActiveSessionId)) ||
          (Array.isArray(allowedIds) && allowedIds.includes(currentActiveSessionId))
        ) {
          shouldApplyContext = true
        }
      }
      if (shouldApplyContext) {
        const contextPreamble = 'Remember these facts/preferences about the user: '
        const contextString = segments.join('; ')
        finalSystemPrompt = finalSystemPrompt
          ? `${contextPreamble}${contextString}\n\n---\n\n${finalSystemPrompt}`
          : `${contextPreamble}${contextString}`
      }
      if (finalSystemPrompt) messagesToSend.push({ role: 'system', content: finalSystemPrompt })
      // Prepare history
      const nonSystemMessages = baseHistory.filter((msg) => msg.role !== 'system')
      const contextLimit = settingsStore.chatContextLength
      const limitedHistory = nonSystemMessages.slice(-(contextLimit > 0 ? contextLimit : Infinity))
      messagesToSend.push(...limitedHistory)
      // Construct final user message payload
      let finalUserMessagePayload = null
      if (trimmedInput && !imgDataForApi) {
        finalUserMessagePayload = { role: 'user', content: trimmedInput }
      } else if (trimmedInput && imgDataForApi) {
        finalUserMessagePayload = {
          role: 'user',
          content: [
            { type: 'text', text: trimmedInput },
            {
              type: 'image_url',
              image_url: {
                url: `data:${imgDataForApi.mimeType};base64,${imgDataForApi.base64Data}`,
              },
            },
          ],
        }
      } else if (imgDataForApi) {
        finalUserMessagePayload = {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${imgDataForApi.mimeType};base64,${imgDataForApi.base64Data}`,
              },
            },
          ],
        }
      }
      if (finalUserMessagePayload) {
        messagesToSend.push(finalUserMessagePayload)
      } else if (!trimmedInput && !imgDataForApi) {
        throw new Error('No content found.')
      }
      if (messagesToSend.filter((msg) => msg.role !== 'system').length === 0) {
        throw new Error('No messages to send.')
      }
    } catch (e) {
      error.value = `Internal Error: ${e.message || 'Cannot prepare history.'}`
      return result.value
    }

    // Construct Final API Payload
    const payload = {
      model: modelIdToUse,
      temperature: settingsStore.chatTemperature ?? undefined,
      max_tokens: settingsStore.chatMaxTokens || undefined,
      top_p: settingsStore.chatTopP ?? undefined,
      messages: messagesToSend,
    }

    // --- Call API and Handle Response ---
    const assistantMessageId = generateMessageId('asst')
    try {
      const apiResult = await callApi(targetUrl, payload, 'POST')

      // Check if the result is a streaming Response
      if (apiResult instanceof Response) {
        console.log('[useMessageSender] Received stream Response from useApi.')
        await readStreamAndThrottleUpdate(
          apiResult,
          assistantMessageId,
          isTestMode,
          result,
          conversationStore,
        )
      }
      // Handle Non-Streaming JSON Response
      else if (typeof apiResult === 'object' && apiResult !== null && apiResult.aiText) {
        console.log('[useMessageSender] Received JSON response from useApi.')
        const aiResponseText = apiResult.aiText
        if (typeof aiResponseText === 'string' && aiResponseText.trim() !== '') {
          const assistantMessageObject = {
            messageId: assistantMessageId,
            role: 'assistant',
            content: aiResponseText.trim(),
            timestamp: Date.now(),
            imagePreviewUrl: null,
            isLoading: false,
          }
          if (!isTestMode) {
            conversationStore.addMessageToActiveSession(
              assistantMessageObject.role,
              assistantMessageObject.content,
              assistantMessageObject.timestamp,
              assistantMessageObject.imagePreviewUrl,
              assistantMessageObject.messageId,
              assistantMessageObject.isLoading,
            )
          } else {
            result.value.assistantMessage = assistantMessageObject
          }
          result.value.success = true
          result.value.aiResponse = aiResponseText.trim()
        } else {
          error.value = 'Received empty or invalid response from AI.'
          result.value.success = false
        }
      }
      // Handle Unexpected Response Type
      else {
        console.error(
          '[useMessageSender] Unexpected response type received from useApi:',
          apiResult,
        )
        error.value = 'Received unexpected response format from API handler.'
        result.value.success = false
      }
    } catch (err) {
      // Catch errors from callApi or the stream reader helper
      const message = apiError.value || (err instanceof Error ? err.message : 'Unknown API error')
      console.error('[useMessageSender] API call or stream processing failed:', message, err)
      error.value = `API Error: ${message}`
      result.value.success = false

      // Error handling for stream failure
      if (!isTestMode && assistantMessageId) {
        if (conversationStore.activeHistory.find((m) => m.messageId === assistantMessageId)) {
          const errorSuffix = `\n\n--- (Request failed: ${error.value}) ---`
          conversationStore.appendContentToMessage(assistantMessageId, errorSuffix)
          conversationStore.updateMessageLoadingState(assistantMessageId, false)
        } else {
          console.warn(
            '[useMessageSender] Stream errored before message shell could be added/found in store.',
          )
          conversationStore.addMessageToActiveSession(
            'system',
            `Error sending message: ${error.value}`,
            Date.now(),
            null,
            generateMessageId('err'),
          )
        }
      } else if (isTestMode && result.value.assistantMessage) {
        const errorSuffix = `\n\n--- (Request failed: ${error.value}) ---`
        result.value.assistantMessage.content += errorSuffix
        result.value.assistantMessage.isLoading = false
      }
    }

    // Return the final result object's value
    console.log('[useMessageSender] sendMessage finished, returning result:', result.value)
    return result.value
  } // End sendMessage function

  // Return the public interface
  return {
    sendMessage,
    isLoading,
    error,
  }
} // End useMessageSender composable
