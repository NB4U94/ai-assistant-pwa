<template>
    <div class="chat-view">
      <div class="message-display-area" ref="messageAreaRef">
         <div v-for="message in messages" :key="message.id" :class="['message-container', message.sender === 'User' ? 'user-container' : 'ai-container']">
          <div class="avatar-placeholder" :title="message.sender">
            {{ message.sender === 'User' ? 'U' : 'AI' }}
          </div>
          <div :class="['message', message.sender === 'User' ? 'user-message' : (message.sender === 'AI' ? 'ai-message' : 'system-message')]">
            <span class="message-text">{{ message.text }}</span>
            <span class="timestamp">{{ formatTimestamp(message.timestamp) }}</span>
            <button v-if="message.sender === 'AI'" @click="copyText(message.text)" class="copy-button" title="Copy response">
              📋
            </button>
          </div>
        </div>
        <p v-if="messages.length === 0 && !isLoading" class="placeholder-message">
          No messages yet. Start the conversation!
        </p>
        <p v-if="isLoading" class="placeholder-message loading-indicator">
          AI is thinking...
        </p>
      </div>
  
      <div v-if="selectedImagePreview" class="image-preview-area">
          <img :src="selectedImagePreview" alt="Selected image preview" class="image-preview" />
          <button @click="removeSelectedImage" class="remove-image-button" title="Remove image">✖</button>
      </div>
  
      <div class="input-area">
         <input type="file" ref="fileInputRef" @change="handleFileSelected" accept="image/*" style="display: none;" />
         <button @click="triggerFileInput" class="icon-button" aria-label="Attach image" title="Attach image">
           📎
         </button>
         <button class="icon-button" aria-label="Use voice input" title="Use voice input (Not implemented)">
           🎤
         </button>
        <textarea
          ref="inputAreaRef"
          v-model="userInput"
          :placeholder="currentPlaceholder" rows="1"
          @input="autoGrowTextarea"
          @keydown.enter.prevent="sendMessage"
          :disabled="isLoading"
          aria-label="Chat message input"
        ></textarea>
        <button ref="sendButtonRef" @click="sendMessage" :disabled="isLoading" aria-label="Send message" class="send-button">Send</button>
        <button @click="toggleTts" :class="['tts-button', isTtsEnabled ? 'tts-on' : 'tts-off']" :aria-pressed="isTtsEnabled" aria-label="Toggle text to speech">
          <span v-if="isTtsEnabled" title="Speech ON">🔊</span>
          <span v-else title="Speech OFF">🔇</span>
        </button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, nextTick, computed, onMounted, onUnmounted } from 'vue';
  
  // --- Configuration ---
  // 🚨🚨🚨 WARNING: Replace with your NEW, PRIVATE key for LOCAL TESTING ONLY.
  // 🚨🚨🚨 DO NOT COMMIT YOUR REAL API KEY TO GIT!
  const GEMINI_API_KEY = 'YOUR API KEY HERE';
  const MODEL_NAME = 'gemini-1.5-flash'; // Ensure this model supports multimodal input
  // ---------------------
  
  // --- Refs ---
  const messageAreaRef = ref(null);
  const inputAreaRef = ref(null);
  const sendButtonRef = ref(null);
  const fileInputRef = ref(null);
  
  // --- Reactive State ---
  const userInput = ref('');
  const messages = ref([]);
  const isLoading = ref(false);
  const isTtsEnabled = ref(false);
  const synth = window.speechSynthesis;
  const ttsSupported = ref(!!synth);
  const selectedImagePreview = ref(null); // Holds the data URL for image preview
  const selectedFile = ref(null); // Holds the actual File object
  
  // --- Animated Placeholder ---
  const placeholders = [
    "Type your message here...",
    "Ask me anything...",
    "Attach an image and ask about it...",
    "Write a story about a dragon...",
    "Explain quantum physics simply...",
  ];
  const currentPlaceholder = ref(placeholders[0]);
  let placeholderInterval = null;
  
  onMounted(() => {
    let placeholderIndex = 0;
    placeholderInterval = setInterval(() => {
      placeholderIndex = (placeholderIndex + 1) % placeholders.length;
      if (!userInput.value && !selectedImagePreview.value) {
           currentPlaceholder.value = placeholders[placeholderIndex];
      } else if (!selectedImagePreview.value) {
          currentPlaceholder.value = placeholders[0];
      }
    }, 3000);
  });
  
  onUnmounted(() => {
    clearInterval(placeholderInterval);
    if (synth) {
        synth.cancel();
    }
  });
  // ---------------------------
  
  // --- File Input Handling ---
  const triggerFileInput = () => {
      fileInputRef.value?.click();
  };
  
  // Helper function to read file as base64 (returns a Promise)
  const readFileAsBase64 = (file) => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
              // Result includes the prefix "data:image/jpeg;base64,"
              // The API expects only the pure base64 part
              const base64String = reader.result.split(',')[1];
              resolve({
                  base64Data: base64String,
                  mimeType: file.type // Get MIME type from the file object
              });
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
      });
  };
  
  
  const handleFileSelected = async (event) => { // Make async to handle await if needed later
      const file = event.target.files?.[0];
      if (!file) {
          removeSelectedImage();
          return;
      }
  
      if (!file.type.startsWith('image/')) {
          addMessage(`Selected file (${file.name}) is not an image.`, 'System');
          removeSelectedImage();
          return;
      }
  
      const maxSizeMB = 4; // Gemini API limit for inline data
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
          addMessage(`Image file (${file.name}) is too large (>${maxSizeMB}MB).`, 'System');
          removeSelectedImage();
          return;
      }
  
      selectedFile.value = file; // Store the File object
  
      // Generate preview immediately (doesn't need await)
      const reader = new FileReader();
      reader.onload = (e) => {
          selectedImagePreview.value = e.target?.result;
          currentPlaceholder.value = "Image selected. Add a message or send.";
      };
      reader.onerror = (e) => {
          console.error("FileReader error for preview:", e);
          addMessage("Error reading image for preview.", 'System');
          removeSelectedImage();
      };
      reader.readAsDataURL(file);
  
      event.target.value = null; // Reset input
  };
  
  const removeSelectedImage = () => {
      selectedImagePreview.value = null;
      selectedFile.value = null;
      if (fileInputRef.value) {
          fileInputRef.value.value = null;
      }
      if (!userInput.value) {
          currentPlaceholder.value = placeholders[0];
      }
  };
  // -------------------------
  
  // --- Textarea Auto-Grow ---
  const autoGrowTextarea = (event) => {
    const textarea = event.target;
    textarea.style.height = 'auto';
    const maxHeight = 150;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  };
  // -------------------------
  
  // --- Text-to-Speech (TTS) ---
  const speakText = (text) => {
    if (!ttsSupported.value || !synth || !text) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onerror = (event) => {
      console.error('SpeechSynthesisUtterance.onerror', event);
      addMessage(`Speech error: ${event.error}`, 'System');
    };
    synth.speak(utterance);
  };
  
  const toggleTts = () => {
    if (!ttsSupported.value) {
        addMessage('Sorry, your browser does not support text-to-speech.', 'System');
        return;
    }
    isTtsEnabled.value = !isTtsEnabled.value;
    if (!isTtsEnabled.value) {
        synth.cancel();
    }
  };
  // -----------------------------
  
  // --- Timestamp Formatting ---
  const formatTimestamp = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  // --------------------------
  
  // --- Copy to Clipboard ---
  const copyText = async (textToCopy) => {
      if (!navigator.clipboard) {
          addMessage("Cannot copy text: Clipboard API not supported or not available.", 'System');
          return;
      }
      try {
          await navigator.clipboard.writeText(textToCopy);
          console.log("Text copied to clipboard!");
      } catch (err) {
          console.error('Failed to copy text: ', err);
          addMessage(`Failed to copy: ${err.message}`, 'System');
      }
  };
  // -------------------------
  
  // --- Message Handling ---
  const scrollToBottom = () => {
    nextTick(() => {
      const messageArea = messageAreaRef.value;
      if (messageArea) {
        messageArea.scrollTop = messageArea.scrollHeight;
      }
    });
  };
  
  const addMessage = (payload, sender = 'User') => {
      let messageText = '';
      let messageSender = sender;
      let isError = false;
  
      if (typeof payload === 'string') {
          messageText = payload;
      } else if (typeof payload === 'object' && payload !== null && payload.error === true) {
          messageText = payload.text;
          messageSender = 'System';
          isError = true;
      } else {
          console.warn("Attempted to add message with invalid payload:", payload);
          return;
      }
  
      if (messageText.trim() === '') {
          console.warn("Attempted to add an empty message.");
          return;
      }
      if (messageSender === 'AI' && messageText === 'AI is thinking...' && messages.value.some(msg => msg.text === 'AI is thinking...')) {
          return;
      }
  
      const newMessage = {
          id: Date.now() + Math.random(),
          text: messageText.trim(),
          sender: messageSender,
          timestamp: Date.now()
      };
      messages.value.push(newMessage);
      scrollToBottom();
  
      if (messageSender === 'AI' && !isError && isTtsEnabled.value) {
          speakText(newMessage.text);
      }
  };
  // -----------------------
  
  // --- API Call Logic ---
  const chatHistoryForApi = computed(() => {
    // Exclude non-API messages from history
    return messages.value
      .filter(msg => msg.sender === 'User' || msg.sender === 'AI') // Only include User and AI messages
      .map(msg => ({
        role: msg.sender === 'User' ? 'user' : 'model',
        parts: [{ text: msg.text }]
        // Note: This history currently doesn't include images sent in previous turns.
        // Handling multi-turn multimodal history is more complex.
      }));
  });
  
  // Function to call the Gemini API (handles both text and image)
  const callGeminiApi = async (inputText, imageFile) => {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
    const history = chatHistoryForApi.value; // Get current text history
  
    let requestParts = [];
  
    // Add text part if present
    if (inputText.trim() !== '') {
        requestParts.push({ text: inputText });
    }
  
    // Add image part if present
    if (imageFile) {
        try {
            // Read the image file as base64 *within* the function call
            const { base64Data, mimeType } = await readFileAsBase64(imageFile);
            requestParts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            });
            console.log("Image added to request parts. MIME type:", mimeType);
        } catch (error) {
            console.error("Error reading image file for API:", error);
            return { error: true, text: "Error processing image file before sending." };
        }
    }
  
    // Construct the final request body
    const requestBody = {
        // Combine history with the new user turn (which includes text and/or image)
        contents: [ ...history, { role: 'user', parts: requestParts } ]
    };
  
    console.log("Sending to API:", JSON.stringify(requestBody, null, 2)); // Careful: might log base64 data
  
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
  
      const responseData = await response.json();
      console.log("Received from API:", JSON.stringify(responseData, null, 2));
  
      if (!response.ok) {
        const specificError = responseData?.error?.message || response.statusText;
        throw new Error(`API request failed with status ${response.status}: ${specificError}`);
      }
  
       if (responseData.candidates && responseData.candidates.length > 0) {
          const candidate = responseData.candidates[0];
          if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
               console.warn(`Response stopped due to: ${candidate.finishReason}`);
               const safetyFeedback = candidate.safetyRatings ? ` Safety ratings: ${JSON.stringify(candidate.safetyRatings)}` : '';
               return { error: true, text: `My response was blocked due to: ${candidate.finishReason}.${safetyFeedback}`};
          }
          if (candidate.content?.parts?.length > 0) {
              const aiText = candidate.content.parts[0].text;
               if (typeof aiText === 'string') {
                  return aiText; // Success case
              }
          }
          console.warn("API response finished with STOP but no valid text content found.", responseData);
          return { error: true, text: "[No text content received from AI]" };
      }
  
      console.error('No valid candidates found in API response:', responseData);
      throw new Error('Invalid response structure: No candidates found.');
  
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return { error: true, text: `Error: ${error.message}` };
    }
  };
  // -----------------------
  
  // --- Send Button Flash Animation ---
  const triggerSendFlash = () => {
      const button = sendButtonRef.value;
      if (button) {
          button.classList.add('flash-active');
          setTimeout(() => {
              button.classList.remove('flash-active');
          }, 300);
      }
  };
  // -------------------------------
  
  // --- Send Message Action ---
  const sendMessage = async () => {
    const currentInput = userInput.value;
    const currentFile = selectedFile.value; // Get the selected file
  
    // Require text input OR an image to send
    if ((currentInput.trim() === '' && !currentFile) || isLoading.value) {
        return;
    }
  
    triggerSendFlash();
  
    // Add user message representation
    // If image is present, maybe indicate that in the text message?
    let userMessageText = currentInput.trim();
    if (currentFile && userMessageText === '') {
        userMessageText = `[Image: ${currentFile.name}]`; // Placeholder text if only image
    } else if (currentFile) {
        userMessageText = `${userMessageText} [Image attached]`; // Append if text also present
    }
    addMessage(userMessageText, 'User');
  
    const textToSend = currentInput; // Keep original text for API
    const imageToSend = currentFile; // Keep file for API
  
    // Clear inputs *after* capturing values for the API call
    userInput.value = '';
    // Clear the image preview and file state *before* the API call starts loading
    // This prevents sending the same image twice if user clicks send quickly
    removeSelectedImage();
  
    nextTick(() => {
        if(inputAreaRef.value) {
            inputAreaRef.value.style.height = 'auto';
            autoGrowTextarea({ target: inputAreaRef.value });
        }
        // Ensure placeholder resets correctly after clearing image
        currentPlaceholder.value = placeholders[0];
    });
  
  
    isLoading.value = true;
    addMessage('AI is thinking...', 'AI');
  
    // Call the API with both text and potentially an image file
    const aiResponse = await callGeminiApi(textToSend, imageToSend);
  
    const thinkingIndex = messages.value.findIndex(msg => msg.text === 'AI is thinking...');
    if (thinkingIndex !== -1) {
      messages.value.splice(thinkingIndex, 1);
    }
  
    addMessage(aiResponse, 'AI'); // Handles string or error object
  
    isLoading.value = false;
  
    // Refocus input after everything is done
    nextTick(() => {
      inputAreaRef.value?.focus();
    });
  };
  // -------------------------
  
  </script>
  
  <style scoped>
  /* Styles specific to the chat view */
  .chat-view {
    height: 100%;
    display: flex;
    flex-direction: column; /* Arrange elements vertically */
    background-color: #f9f9f9; /* Slightly off-white background for chat */
  }
  
  .message-display-area {
    flex-grow: 1; /* Take up most of the vertical space */
    overflow-y: auto; /* Allow scrolling for messages */
    padding: 1rem;
    border-bottom: 1px solid #ccc; /* Separator line */
    background-color: #ffffff; /* White background for messages */
    display: flex; /* Use flexbox to align messages */
    flex-direction: column; /* Stack messages vertically */
  }
  
  /* Container for avatar + message bubble */
  .message-container {
      display: flex;
      margin-bottom: 0.75rem;
      max-width: 85%; /* Container max width */
      opacity: 0; /* Start hidden for animation */
      transform: translateY(10px);
      animation: fadeIn 0.3s ease forwards;
  }
  .user-container {
      align-self: flex-end;
      margin-left: auto;
      flex-direction: row-reverse; /* Avatar on the right */
  }
  .ai-container, .system-container { /* System messages also align left */
      align-self: flex-start;
      margin-right: auto;
      flex-direction: row; /* Avatar on the left */
  }
  
  /* Animation for message container appearance */
  @keyframes fadeIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .avatar-placeholder {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #ccc;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.9em;
      flex-shrink: 0;
      margin-top: 4px; /* Align avatar slightly lower */
      margin-right: 0.5rem; /* Space between avatar and bubble (AI/System) */
  }
  .user-container .avatar-placeholder {
      margin-right: 0; /* Remove right margin for user */
      margin-left: 0.5rem; /* Add left margin for user */
      background-color: #0b57d0; /* Match user bubble */
  }
  .ai-container .avatar-placeholder {
      background-color: #757575; /* Grey for AI */
  }
  /* Hide avatar for system messages */
  .system-container .avatar-placeholder {
      display: none;
  }
  
  
  .message {
    padding: 0.6rem 1.0rem;
    border-radius: 18px;
    word-wrap: break-word;
    font-family: sans-serif;
    line-height: 1.45;
    position: relative;
    min-width: 50px;
  }
  
  
  /* Style user messages */
  .user-message {
    background-color: #0b57d0; /* Google blue for user */
    color: white; /* White text */
    border-bottom-right-radius: 6px; /* Different corner for tail */
  }
  
  /* Style AI messages */
  .ai-message {
    background-color: #e9e9eb; /* Lighter grey for AI */
    color: #333;
    border-bottom-left-radius: 6px; /* Different corner for tail */
  }
  
  /* Style System messages (e.g., errors) */
  .system-message {
      background-color: #ffebee; /* Light red background for errors */
      color: #c62828; /* Darker red text */
      width: 100%; /* Take full width of container */
      text-align: center;
      font-style: italic;
      font-size: 0.9em;
      border: 1px dashed #ffcdd2;
      border-radius: 8px;
      padding-top: 0.8rem;
      padding-bottom: 0.8rem;
  }
  
  /* Timestamp Styling */
  .timestamp {
      display: block;
      font-size: 0.7em;
      color: #999;
      margin-top: 0.3rem;
      text-align: right;
  }
  .user-message .timestamp {
      color: #c0d8ff;
  }
  .ai-message .timestamp {
      color: #777;
  }
  
  /* Copy Button Styling */
  .copy-button {
      position: absolute;
      bottom: -5px;
      right: -10px;
      background-color: rgba(240, 240, 240, 0.8); /* Slightly transparent */
      border: 1px solid #ccc;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      font-size: 0.8em;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease, background-color 0.2s ease;
      z-index: 1;
  }
  /* Show copy button when message container is hovered */
  .message-container:hover .copy-button {
      opacity: 1;
  }
  .copy-button:hover {
      background-color: rgba(224, 224, 224, 0.9); /* Less transparent on hover */
  }
  
  
  .placeholder-message {
    color: #888;
    font-style: italic;
    font-family: sans-serif;
    text-align: center;
    margin: 2rem auto;
  }
  
  .loading-indicator {
    color: #555;
    font-style: normal;
    animation: pulse 1.5s infinite ease-in-out;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  
  /* Image Preview Area Styling */
  .image-preview-area {
      padding: 0.5rem 0.75rem 0.5rem; /* Add padding bottom */
      margin: 0 0.75rem; /* Match input area horizontal padding */
      background-color: #e0e0e0; /* Slightly different background */
      border: 1px solid #ccc;
      border-bottom: none; /* Remove bottom border */
      border-radius: 8px 8px 0 0; /* Round top corners */
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
  }
  .image-preview {
      max-height: 50px; /* Slightly smaller preview */
      max-width: 80px;
      border-radius: 4px;
      border: 1px solid #b0b0b0;
      object-fit: cover;
  }
  .remove-image-button {
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      font-size: 0.8em;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
  }
  .remove-image-button:hover {
      background: rgba(0, 0, 0, 0.7);
  }
  
  
  .input-area {
    display: flex;
    align-items: flex-end;
    padding: 0.75rem;
    border-top: 1px solid #ccc;
    background-color: #f0f0f0;
    flex-shrink: 0;
    gap: 0.5rem;
     /* Adjust border radius if preview area is shown */
    border-radius: 0 0 8px 8px; /* Match preview area */
  }
  /* Adjust border radius if preview is NOT shown */
  .input-area:not(:has(+ .image-preview-area)) { /* Rough approximation */
       border-radius: 8px; /* Standard radius if no preview */
  }
  
  
  .input-area textarea {
    flex-grow: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 15px;
    resize: none;
    font-family: sans-serif;
    font-size: 1em;
    min-height: 40px;
    max-height: 150px;
    overflow-y: auto;
    line-height: 1.4;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .input-area textarea:focus {
      outline: none;
      border-color: #0b57d0;
      box-shadow: 0 0 0 2px rgba(11, 87, 208, 0.2);
  }
  .input-area textarea:disabled {
    background-color: #e0e0e0;
    cursor: not-allowed;
  }
  
  .input-area button {
    padding: 0.5rem;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    min-height: 40px;
    min-width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2em;
    flex-shrink: 0;
    transition: background-color 0.2s ease, opacity 0.2s ease, transform 0.1s ease;
  }
  .input-area button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .input-area button:active:not(:disabled) {
      transform: scale(0.95);
  }
  
  .icon-button {
      background-color: #d1d1d1;
      color: #333;
  }
  .icon-button:hover:not(:disabled) {
      background-color: #c0c0c0;
  }
  .icon-button:disabled {
      background-color: #e0e0e0;
  }
  
  .send-button {
    background-color: #0b57d0;
    color: white;
    border-radius: 15px;
    padding: 0.5rem 1rem;
    font-size: 1em;
    font-weight: 500;
    min-width: auto;
  }
  .send-button:hover:not(:disabled) {
    background-color: #0a4cb0;
  }
  .send-button:disabled {
    background-color: #a0a0a0;
  }
  .send-button.flash-active {
      animation: flash-animation 0.3s ease-out;
  }
  
  @keyframes flash-animation {
      0% { transform: scale(1); background-color: #0b57d0; }
      50% { transform: scale(1.1); background-color: #8ec5fc; }
      100% { transform: scale(1); background-color: #0b57d0; }
  }
  
  .tts-button {
    background-color: #e0e0e0;
    color: #333;
    font-size: 1.1em;
  }
  .tts-button.tts-on {
    background-color: #66bb6a;
    color: white;
  }
  .tts-button:hover:not(.tts-on):not(:disabled) {
    background-color: #d5d5d5;
  }
  .tts-button.tts-on:hover:not(:disabled) {
    background-color: #5a9a5d;
  }
  
  </style>
  