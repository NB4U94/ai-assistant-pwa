// src/composables/useMessageSender.js
import { ref, nextTick } from 'vue'
import { useConversationStore } from '@/stores/conversationStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAssistantsStore } from '@/stores/assistantsStore'
import { useApi } from '@/composables/useApi'
import { useFileInput } from '@/composables/useFileInput'

// Helper function to generate unique message IDs
function generateMessageId(prefix = 'msg') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// Constants for "natural typing" animation delays
const BASE_CHAR_DELAY_MS = 15
const SPACE_DELAY_MS = 45
const COMMA_DELAY_MS = 60
const SENTENCE_END_DELAY_MS = 175
const NEW_LINE_DELAY_MS = 125
const TURBO_DIVISOR = 4
const EMPTY_AI_RESPONSE_PLACEHOLDER = '[AI returned no text]'

// Constants for safety settings (matching Google's HarmCategory and HarmBlockThreshold)
// These are typically defined by the GoogleGenerativeAI SDK, but we define them here for clarity
// if sending them in the payload to a backend that then uses the SDK.
const HARM_CATEGORY_HARASSMENT = 'HARM_CATEGORY_HARASSMENT'
const HARM_CATEGORY_HATE_SPEECH = 'HARM_CATEGORY_HATE_SPEECH'
const HARM_CATEGORY_SEXUALLY_EXPLICIT = 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
const HARM_CATEGORY_DANGEROUS_CONTENT = 'HARM_CATEGORY_DANGEROUS_CONTENT'
const BLOCK_NONE = 'BLOCK_NONE' // Most permissive threshold

export function useMessageSender() {
  const conversationStore = useConversationStore()
  const settingsStore = useSettingsStore()
  const assistantsStore = useAssistantsStore()
  const { callApi, isLoading, error: apiError } = useApi()
  const { readFileAsBase64 } = useFileInput({})

  const error = ref(null)
  const isAnimatingText = ref(false)
  const animationCharacterQueue = ref([])
  const isTurboActive = ref(false)

  const toggleTurboMode = () => {
    isTurboActive.value = !isTurboActive.value
    console.log('[MessageSender] Turbo mode:', isTurboActive.value ? 'ON' : 'OFF')
  }

  async function processAnimationQueue(assistantMessageId, resultRef, streamReadingDoneRef) {
    if (isAnimatingText.value && animationCharacterQueue.value.length > 0) {
      return
    }
    isAnimatingText.value = true
    const currentIsTestMode = conversationStore.isCurrentSessionTestMode

    try {
      while (animationCharacterQueue.value.length > 0) {
        const char = animationCharacterQueue.value.shift()
        if (!currentIsTestMode) {
          const message = conversationStore.activeHistory.find(
            (m) => m.messageId === assistantMessageId,
          )
          if (message) {
            message.content += char
          }
        } else if (resultRef.value.assistantMessage) {
          resultRef.value.assistantMessage.content += char
        }

        let delayMs = BASE_CHAR_DELAY_MS
        if (char === ' ') delayMs = SPACE_DELAY_MS
        else if (char === ',') delayMs = COMMA_DELAY_MS
        else if (['.', '!', '?'].includes(char)) delayMs = SENTENCE_END_DELAY_MS
        else if (char === '\n') delayMs = NEW_LINE_DELAY_MS

        if (isTurboActive.value) {
          delayMs = Math.max(1, Math.floor(delayMs / TURBO_DIVISOR))
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    } catch (animError) {
      console.error('[MessageSender] Error during text animation:', animError)
    } finally {
      isAnimatingText.value = false
      if (animationCharacterQueue.value.length === 0 && streamReadingDoneRef.value) {
        const rawAiResponse =
          typeof resultRef.value.aiResponse === 'string' ? resultRef.value.aiResponse : ''
        console.log(
          `[MessageSender FINALIZE] Stream done. Raw AI response for ${assistantMessageId}: "${rawAiResponse}"`,
        )

        if (!currentIsTestMode) {
          const storeMsg = conversationStore.activeHistory.find(
            (m) => m.messageId === assistantMessageId,
          )
          if (storeMsg) {
            storeMsg.content = rawAiResponse === '' ? EMPTY_AI_RESPONSE_PLACEHOLDER : rawAiResponse
            if (rawAiResponse === '') {
              console.log(
                `[MessageSender Main Chat FINALIZE] AI response for ${assistantMessageId} was empty. Using placeholder for display.`,
              )
            }
          }
          conversationStore.updateMessageLoadingState(assistantMessageId, false)
        } else {
          // Test Mode
          if (resultRef.value.assistantMessage) {
            resultRef.value.assistantMessage.content = rawAiResponse
            if (rawAiResponse === '') {
              console.log(
                `[MessageSender Test Mode FINALIZE] AI response for ${assistantMessageId} was empty. Storing "" for history. UI should show placeholder.`,
              )
            }
            resultRef.value.assistantMessage.isLoading = false
          }
        }
        await nextTick()
      }
    }
  }

  async function readStreamAndAnimateText(
    response,
    assistantMessageId,
    resultRef,
    streamReadingDoneInScopeRef,
  ) {
    let fullText = ''
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    const currentIsTestMode = conversationStore.isCurrentSessionTestMode

    const assistantMessageShell = {
      messageId: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      imagePreviewUrl: null,
      isLoading: true,
    }

    if (!reader) {
      console.error('[MessageSender] Failed to get reader from stream body.')
      resultRef.value.success = false
      const errorMessage = 'Error: Failed to get reader from stream body.'
      resultRef.value.aiResponse = errorMessage
      streamReadingDoneInScopeRef.value = true

      if (currentIsTestMode) {
        resultRef.value.assistantMessage = {
          ...assistantMessageShell,
          isLoading: false,
          content: errorMessage,
        }
      } else {
        const storeMsg = conversationStore.activeHistory.find(
          (m) => m.messageId === assistantMessageId,
        )
        if (storeMsg) {
          storeMsg.content = errorMessage
          storeMsg.isLoading = false
        } else {
          conversationStore.addMessageToActiveSession(
            assistantMessageShell.role,
            errorMessage,
            assistantMessageShell.timestamp,
            null,
            assistantMessageId,
            false,
          )
        }
      }
      throw new Error(errorMessage)
    }

    if (!currentIsTestMode) {
      conversationStore.addMessageToActiveSession(
        assistantMessageShell.role,
        assistantMessageShell.content,
        assistantMessageShell.timestamp,
        assistantMessageShell.imagePreviewUrl,
        assistantMessageShell.messageId,
        assistantMessageShell.isLoading,
      )
    } else {
      resultRef.value.assistantMessage = { ...assistantMessageShell }
    }
    await nextTick()

    let lineBuffer = ''
    let chunkCount = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        chunkCount++

        if (done) {
          console.log(
            `[MessageSender STREAM] Done reading stream for ${assistantMessageId} after ${chunkCount} chunks. Final lineBuffer: "${lineBuffer.trim()}"`,
          )
          streamReadingDoneInScopeRef.value = true
          if (lineBuffer.trim()) {
            const sseMessages = lineBuffer.split('\n\n')
            for (const sseMessage of sseMessages) {
              if (sseMessage.startsWith('data: ')) {
                try {
                  const jsonStr = sseMessage.substring(5).trim()
                  if (jsonStr) {
                    const parsed = JSON.parse(jsonStr)
                    let textChunk = ''
                    if (parsed.done && parsed.message === 'Stream complete') {
                      // Check for our custom done event
                      console.log(
                        `[MessageSender STREAM] Received 'done' event for ${assistantMessageId}.`,
                      )
                      // Do not add this to fullText or animationCharacterQueue
                    } else if (parsed.text !== undefined && typeof parsed.text === 'string') {
                      textChunk = parsed.text
                    } else if (parsed.error) {
                      textChunk = `\n(Stream Error: ${parsed.error})\n`
                    }

                    if (textChunk) {
                      // Only process if textChunk has content (not from done event)
                      console.log(
                        `[MessageSender STREAM] Final/Buffered chunk for ${assistantMessageId}: "${textChunk}"`,
                      )
                      fullText += textChunk
                      for (const char of textChunk) animationCharacterQueue.value.push(char)
                    }
                  }
                } catch (e) {
                  console.warn(
                    '[MessageSender STREAM] Failed to parse FINAL SSE JSON:',
                    sseMessage.substring(5),
                    e,
                  )
                }
              }
            }
          }
          break
        }

        const decodedChunk = decoder.decode(value, { stream: true })
        // console.log(`[MessageSender STREAM] Received raw chunk ${chunkCount} for ${assistantMessageId}: "${decodedChunk}"`); // Can be very verbose
        lineBuffer += decodedChunk
        let eolIndex
        while ((eolIndex = lineBuffer.indexOf('\n\n')) >= 0) {
          const messageToProcess = lineBuffer.substring(0, eolIndex).trim()
          lineBuffer = lineBuffer.substring(eolIndex + 2)
          if (messageToProcess.startsWith('data: ')) {
            try {
              const jsonStr = messageToProcess.substring(5).trim()
              if (jsonStr) {
                const parsed = JSON.parse(jsonStr)
                let textChunk = ''
                if (parsed.done && parsed.message === 'Stream complete') {
                  console.log(
                    `[MessageSender STREAM] Received 'done' event mid-stream for ${assistantMessageId}.`,
                  )
                  // This might mean the stream is ending. We'll let the main 'done' flag handle termination.
                } else if (parsed.text !== undefined && typeof parsed.text === 'string') {
                  textChunk = parsed.text
                } else if (parsed.error) {
                  textChunk = `\n(Stream Error: ${parsed.error})\n`
                }

                if (textChunk) {
                  // Only process if textChunk has content
                  // console.log(`[MessageSender STREAM] Parsed text chunk for ${assistantMessageId}: "${textChunk}"`);
                  fullText += textChunk
                  for (const char of textChunk) animationCharacterQueue.value.push(char)
                  if (!isAnimatingText.value && animationCharacterQueue.value.length > 0) {
                    processAnimationQueue(
                      assistantMessageId,
                      resultRef,
                      streamReadingDoneInScopeRef,
                    )
                  }
                }
              }
            } catch (e) {
              console.warn(
                '[MessageSender STREAM] Failed to parse SSE JSON from chunk:',
                messageToProcess.substring(5),
                e,
              )
            }
          }
        }
      }

      resultRef.value.success = true
      resultRef.value.aiResponse = fullText.trim()

      console.log(
        `[MessageSender STREAM] Completed processing stream for ${assistantMessageId}. Full raw text accumulated: "${resultRef.value.aiResponse}"`,
      )
      if (resultRef.value.aiResponse === '') {
        console.log(
          `[MessageSender STREAM] Stream for ${assistantMessageId} resulted in an empty string. This will be handled by final sync in processAnimationQueue.`,
        )
      }

      if (!isAnimatingText.value && animationCharacterQueue.value.length > 0) {
        processAnimationQueue(assistantMessageId, resultRef, streamReadingDoneInScopeRef)
      } else if (animationCharacterQueue.value.length === 0 && streamReadingDoneInScopeRef.value) {
        console.log(
          `[MessageSender STREAM] Animation queue empty and stream done for ${assistantMessageId}. Triggering finalization.`,
        )
        if (
          currentIsTestMode &&
          resultRef.value.assistantMessage &&
          resultRef.value.assistantMessage.isLoading
        ) {
          const rawAiResponseForFinalSync =
            typeof resultRef.value.aiResponse === 'string' ? resultRef.value.aiResponse : ''
          resultRef.value.assistantMessage.content = rawAiResponseForFinalSync
          if (rawAiResponseForFinalSync === '') {
            console.log(
              `[MessageSender Test Mode STREAM EMPTY] Storing "" for history. UI should show placeholder.`,
            )
          }
          resultRef.value.assistantMessage.isLoading = false
        } else if (!currentIsTestMode) {
          const storeMsg = conversationStore.activeHistory.find(
            (m) => m.messageId === assistantMessageId,
          )
          if (storeMsg && storeMsg.isLoading) {
            const rawAiResponseForFinalSync =
              typeof resultRef.value.aiResponse === 'string' ? resultRef.value.aiResponse : ''
            storeMsg.content =
              rawAiResponseForFinalSync === ''
                ? EMPTY_AI_RESPONSE_PLACEHOLDER
                : rawAiResponseForFinalSync
            if (rawAiResponseForFinalSync === '') {
              console.log(`[MessageSender Main Chat STREAM EMPTY] Using placeholder for display.`)
            }
            conversationStore.updateMessageLoadingState(assistantMessageId, false)
          }
        }
        await nextTick()
        // Call processAnimationQueue one last time to ensure its `finally` block runs for content sync,
        // especially if the above direct updates didn't cover all cases or if animation was expected.
        processAnimationQueue(assistantMessageId, resultRef, streamReadingDoneInScopeRef)
      }
    } catch (streamReadError) {
      console.error('[MessageSender STREAM] Stream reading/processing error:', streamReadError)
      streamReadingDoneInScopeRef.value = true
      error.value = streamReadError.message || 'Failed to read stream'
      resultRef.value.success = false
      resultRef.value.aiResponse = fullText.trim()
      const errorSuffix = `\n\n--- (Error during stream: ${error.value}) ---`
      const cleanAccumulatedTextOnError = fullText.trim()
      isAnimatingText.value = false
      animationCharacterQueue.value = []
      if (!currentIsTestMode) {
        const existingMsg = conversationStore.activeHistory.find(
          (m) => m.messageId === assistantMessageId,
        )
        if (existingMsg) {
          existingMsg.content = cleanAccumulatedTextOnError + errorSuffix
          conversationStore.updateMessageLoadingState(assistantMessageId, false)
        }
      } else if (resultRef.value.assistantMessage) {
        resultRef.value.assistantMessage.content = cleanAccumulatedTextOnError + errorSuffix
        resultRef.value.assistantMessage.isLoading = false
      }
      await nextTick()
    }
  }

  const sendMessage = async (
    textInput,
    imageFile,
    imagePreviewUrlForStore,
    currentTestMessages = null,
  ) => {
    error.value = null
    apiError.value = null
    animationCharacterQueue.value = []
    const streamReadingDoneInScope = ref(false)

    const trimmedInput = textInput?.trim() ?? ''
    const timestamp = Date.now()
    const result = ref({
      success: false,
      aiResponse: null,
      userMessage: null,
      assistantMessage: null,
    })

    const isInTestMode = conversationStore.isCurrentSessionTestMode
    const testConfigValue = conversationStore.testModeAssistantConfig

    if (isLoading.value) {
      console.warn('[MessageSender] API call already in progress (useApi). Aborting new send.')
      error.value = 'Another API call is already in progress.'
      return result.value
    }

    if (trimmedInput === '' && !imageFile) {
      console.warn('[MessageSender] No text or image to send.')
      error.value = 'Nothing to send. Please type a message or add an image.'
      return result.value
    }

    const userMessageObject = {
      messageId: generateMessageId('user'),
      role: 'user',
      content: trimmedInput,
      timestamp: timestamp,
      imagePreviewUrl: imagePreviewUrlForStore,
      isLoading: false,
    }

    if (isInTestMode) {
      result.value.userMessage = userMessageObject
    } else {
      conversationStore.addMessageToActiveSession(
        userMessageObject.role,
        userMessageObject.content,
        userMessageObject.timestamp,
        userMessageObject.imagePreviewUrl,
        userMessageObject.messageId,
      )
    }
    await nextTick()

    let imgDataForApi = null
    if (imageFile) {
      if (typeof readFileAsBase64 === 'function') {
        try {
          imgDataForApi = await readFileAsBase64(imageFile)
          if (!imgDataForApi?.mimeType || !imgDataForApi?.base64Data) {
            throw new Error('Processed image data missing mimeType or base64Data.')
          }
        } catch (e) {
          error.value = `Image processing error: ${e.message || 'Unknown error'}`
          result.value.success = false
          return result.value
        }
      } else {
        error.value = 'Internal error: readFileAsBase64 is not available.'
        result.value.success = false
        return result.value
      }
    }

    let modelIdToUse = settingsStore.chatModel
    let targetUrl = ''
    let currentContextAssistantId =
      isInTestMode && testConfigValue ? testConfigValue.id : conversationStore.activeSessionId

    if (isInTestMode && testConfigValue) {
      if (testConfigValue.model) modelIdToUse = testConfigValue.model
    } else if (
      currentContextAssistantId &&
      !conversationStore.isMainChatSession(currentContextAssistantId)
    ) {
      try {
        const assistant = assistantsStore.getAssistantById(currentContextAssistantId)
        if (assistant && assistant.model) modelIdToUse = assistant.model
      } catch (e) {
        console.error(
          `[MessageSender] Error getting assistant config for ${currentContextAssistantId}: ${e}`,
        )
      }
    }

    targetUrl = modelIdToUse?.toLowerCase().includes('gemini')
      ? '/.netlify/functions/call-google-gemini'
      : '/.netlify/functions/call-openai-gpt-4'

    let messagesToSend = []
    try {
      if (isInTestMode) {
        let historyForTestMode
        if (
          currentTestMessages &&
          Array.isArray(currentTestMessages) &&
          currentTestMessages.length > 0
        ) {
          historyForTestMode = currentTestMessages
          // console.log('[MessageSender] Test Mode: Using currentTestMessages. Count:', currentTestMessages.length) // Verbose
        } else {
          console.warn(
            '[MessageSender] Test Mode: currentTestMessages was empty or invalid. Using only new user message for context.',
          )
          historyForTestMode = [userMessageObject]
        }
        messagesToSend = conversationStore.getFormattedHistoryForAPI({
          messagesForContext: historyForTestMode,
          excludeLast: false,
        })
      } else {
        messagesToSend = conversationStore.getFormattedHistoryForAPI({ excludeLast: false })
      }

      const { myAiContextSegments, myAiContextApplyToAll, myAiContextAllowedAssistantIds } =
        settingsStore
      let shouldApplyMyAiContext = false

      if (myAiContextSegments?.length > 0 && currentContextAssistantId) {
        if (myAiContextApplyToAll) {
          shouldApplyMyAiContext = true
          // console.log(`[MessageSender] "My AI Context" applying due to "Apply to All" for context ID: ${currentContextAssistantId}`); // Verbose
        } else if (
          myAiContextAllowedAssistantIds instanceof Set &&
          myAiContextAllowedAssistantIds.has(currentContextAssistantId)
        ) {
          shouldApplyMyAiContext = true
          // console.log(`[MessageSender] "My AI Context" applying because context ID ${currentContextAssistantId} is in allowed list.`); // Verbose
        } else {
          // console.log(`[MessageSender] "My AI Context" NOT applying for context ID: ${currentContextAssistantId}. Not in allowed list and "Apply to All" is false.`); // Verbose
        }
      }

      if (shouldApplyMyAiContext) {
        const contextPreamble = 'Remember these facts/preferences about the user: '
        const contextString = myAiContextSegments.join('; ')
        const myAiSystemMessage = {
          role: 'system',
          content: `${contextPreamble}${contextString}`,
        }
        const existingSystemMessageIndex = messagesToSend.findIndex((msg) => msg.role === 'system')
        if (existingSystemMessageIndex !== -1) {
          messagesToSend[existingSystemMessageIndex].content =
            `${myAiSystemMessage.content}\n\n${messagesToSend[existingSystemMessageIndex].content}`
          // console.log('[MessageSender] Prepended "My AI Context" to existing system message.'); // Verbose
        } else {
          messagesToSend.unshift(myAiSystemMessage)
          // console.log('[MessageSender] Added "My AI Context" as new system message.'); // Verbose
        }
      }

      if (messagesToSend.length === 0) {
        console.error(
          '[MessageSender] messagesToSend is empty after formatting and My AI Context. This indicates an issue.',
        )
        let minimalUserContentForApi = []
        if (trimmedInput) minimalUserContentForApi.push({ type: 'text', text: trimmedInput })
        if (imgDataForApi && modelIdToUse?.toLowerCase().includes('gemini')) {
          minimalUserContentForApi.push({
            inline_data: { mime_type: imgDataForApi.mimeType, data: imgDataForApi.base64Data },
          })
        } else if (imgDataForApi) {
          minimalUserContentForApi.push({
            type: 'image_url',
            image_url: { url: `data:${imgDataForApi.mimeType};base64,${imgDataForApi.base64Data}` },
          })
        }
        if (minimalUserContentForApi.length > 0) {
          messagesToSend.push({
            role: 'user',
            content:
              minimalUserContentForApi.length === 1 &&
              minimalUserContentForApi[0].type === 'text' &&
              !imgDataForApi
                ? trimmedInput
                : minimalUserContentForApi,
          })
        }
        if (messagesToSend.length === 0) {
          throw new Error('Cannot send to API: No messages in the payload after all preparations.')
        }
      }
    } catch (e) {
      error.value = `Internal Error preparing messages: ${e.message || 'Cannot prepare message history.'}`
      console.error(
        '[MessageSender] Error during message preparation step:',
        e,
        'Current messagesToSend:',
        JSON.stringify(messagesToSend),
      )
      result.value.success = false
      return result.value
    }

    const payload = {
      model: modelIdToUse,
      temperature: settingsStore.chatTemperature ?? undefined,
      max_tokens: settingsStore.chatMaxTokens || undefined,
      top_p: settingsStore.chatTopP ?? undefined,
      messages: messagesToSend,
    }

    // EXPERIMENT: Add permissive safety settings ONLY for test mode
    if (isInTestMode) {
      console.log(
        '[MessageSender] TEST MODE: Applying experimental permissive safety settings for this request.',
      )
      payload.safetySettings = [
        { category: HARM_CATEGORY_HARASSMENT, threshold: BLOCK_NONE },
        { category: HARM_CATEGORY_HATE_SPEECH, threshold: BLOCK_NONE },
        { category: HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: BLOCK_NONE },
        { category: HARM_CATEGORY_DANGEROUS_CONTENT, threshold: BLOCK_NONE },
      ]
    }

    console.log('[MessageSender] FINAL PAYLOAD to API:', JSON.stringify(payload, null, 2))

    const assistantMessageId = generateMessageId('asst')

    try {
      const apiResponse = await callApi(targetUrl, payload, 'POST')

      if (apiResponse instanceof Response && apiResponse.body) {
        await readStreamAndAnimateText(
          apiResponse,
          assistantMessageId,
          result,
          streamReadingDoneInScope,
        )
      } else if (
        typeof apiResponse === 'object' &&
        apiResponse !== null &&
        apiResponse.aiText !== undefined
      ) {
        const aiRawText = apiResponse.aiText
        const processedResponse = (typeof aiRawText === 'string' ? aiRawText : '').trim()

        result.value.aiResponse = processedResponse
        result.value.success = true
        streamReadingDoneInScope.value = true

        const contentForHistory = processedResponse
        const contentForDisplayInStore =
          processedResponse === '' ? EMPTY_AI_RESPONSE_PLACEHOLDER : processedResponse

        console.log(
          `[MessageSender] Non-streaming response. Raw/ForHistory: "${processedResponse}", For Main Chat Store Display: "${contentForDisplayInStore}"`,
        )

        const assistantMessageObject = {
          messageId: assistantMessageId,
          role: 'assistant',
          content: isInTestMode ? contentForHistory : contentForDisplayInStore,
          timestamp: Date.now(),
          imagePreviewUrl: null,
          isLoading: false,
        }

        if (!isInTestMode) {
          conversationStore.addMessageToActiveSession(
            assistantMessageObject.role,
            assistantMessageObject.content,
            assistantMessageObject.timestamp,
            assistantMessageObject.imagePreviewUrl,
            assistantMessageObject.messageId,
            assistantMessageObject.isLoading,
          )
          if (processedResponse === '') {
            console.warn(
              '[MessageSender Main Chat] AI returned empty non-streaming response. Placeholder set for store.',
            )
          }
        } else {
          result.value.assistantMessage = { ...assistantMessageObject, content: contentForHistory }
          if (processedResponse === '') {
            console.warn(
              '[MessageSender Test Mode] AI returned empty non-streaming response. Storing "" for history. UI will show placeholder.',
            )
          }
        }
        await nextTick()
      } else {
        error.value = apiError.value || `Received unexpected response format from API call.`
        if (apiResponse && typeof apiResponse === 'object' && apiResponse.message) {
          error.value = `API Error: ${apiResponse.message}`
        }
        console.error(`[MessageSender] Unexpected API response format. Response:`, apiResponse)
        result.value.success = false
        streamReadingDoneInScope.value = true
      }
    } catch (err) {
      const caughtErrorMessage =
        apiError.value || (err instanceof Error ? err.message : 'Unknown API error')
      if (!error.value) error.value = `API Error: ${caughtErrorMessage}`
      console.error(`[MessageSender] sendMessage error caught: ${error.value}`, err)
      result.value.success = false
      streamReadingDoneInScope.value = true

      const errorSuffixFinal = `\n\n--- (Request Failed: ${error.value}) ---`
      const cleanAccumulatedTextOnError = result.value.aiResponse || ''

      if (!isInTestMode && assistantMessageId) {
        const existingMsg = conversationStore.activeHistory.find(
          (m) => m.messageId === assistantMessageId,
        )
        if (existingMsg) {
          existingMsg.content = cleanAccumulatedTextOnError + errorSuffixFinal
          existingMsg.isLoading = false
        } else {
          conversationStore.addMessageToActiveSession(
            'system',
            `Error processing request: ${error.value}`,
            Date.now(),
            null,
            generateMessageId('err'),
            false,
          )
        }
      } else if (isInTestMode) {
        result.value.assistantMessage = {
          messageId: assistantMessageId,
          role: 'assistant',
          content: cleanAccumulatedTextOnError + errorSuffixFinal,
          timestamp: Date.now(),
          imagePreviewUrl: null,
          isLoading: false,
        }
      }
      await nextTick()
    }

    if (streamReadingDoneInScope.value) {
      const currentIsTestModeCheck = conversationStore.isCurrentSessionTestMode
      if (!currentIsTestModeCheck) {
        const storeMsg = conversationStore.activeHistory.find(
          (m) => m.messageId === assistantMessageId,
        )
        if (storeMsg && storeMsg.isLoading) {
          conversationStore.updateMessageLoadingState(assistantMessageId, false)
        }
      } else if (result.value.assistantMessage && result.value.assistantMessage.isLoading) {
        result.value.assistantMessage.isLoading = false
      }
    }
    return result.value
  }

  return { sendMessage, isLoading, error, isAnimatingText, isTurboActive, toggleTurboMode }
}
