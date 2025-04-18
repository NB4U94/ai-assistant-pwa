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
         <button @click="toggleListening" :class="['icon-button', isListening ? 'listening' : '']" aria-label="Use voice input" title="Use voice input">
           <span v-if="!isListening">🎤</span>
           <span v-else> MUTE </span> </button>
        <textarea
          ref="inputAreaRef"
          v-model="userInput"
          :placeholder="currentPlaceholder" rows="1"
          @input="autoGrowTextarea"
          @keydown.enter.prevent="sendMessage"
          :disabled="isLoading"
          aria-label="Chat message input"
        ></textarea>
        <button ref="sendButtonRef" @click="sendMessage" :disabled="isLoading || (!userInput.trim() && !selectedFile)" aria-label="Send message" class="send-button">Send</button> <button @click="toggleTts" :class="['tts-button', isTtsEnabled ? 'tts-on' : 'tts-off']" :aria-pressed="isTtsEnabled" aria-label="Toggle text to speech">
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
  const GEMINI_API_KEY = 'YOUR_API_KEY_HERE';
  const MODEL_NAME = 'gemini-1.5-flash';
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
  const selectedImagePreview = ref(null);
  const selectedFile = ref(null);
  
  // --- Speech Recognition State ---
  const isListening = ref(false);
  const recognition = ref(null); // Holds the SpeechRecognition instance
  const speechSupported = ref(false);
  // -----------------------------
  
  // --- Animated Placeholder ---
  const placeholders = [
    "Type your message or use the mic...", // Updated placeholder
    "Ask me anything...",
    "Attach an image and ask about it...",
    "Write a story about a dragon...",
    "Explain quantum physics simply...",
  ];
  const currentPlaceholder = ref(placeholders[0]);
  let placeholderInterval = null;
  
  // --- Lifecycle Hooks ---
  onMounted(() => {
    // Setup animated placeholder
    let placeholderIndex = 0;
    placeholderInterval = setInterval(() => {
      placeholderIndex = (placeholderIndex + 1) % placeholders.length;
      if (!userInput.value && !selectedImagePreview.value) {
           currentPlaceholder.value = placeholders[placeholderIndex];
      } else if (!selectedImagePreview.value) {
          currentPlaceholder.value = placeholders[0];
      }
    }, 3000);
  
    // Setup Speech Recognition
    setupSpeechRecognition();
  });
  
  onUnmounted(() => {
    clearInterval(placeholderInterval);
    if (synth) {
        synth.cancel();
    }
    // Stop recognition if component is destroyed
    if (recognition.value) {
        recognition.value.stop();
    }
  });
  // ---------------------------
  
  // --- Speech Recognition Setup & Control ---
  const setupSpeechRecognition = () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
          speechSupported.value = true;
          recognition.value = new SpeechRecognition();
          recognition.value.continuous = false; // Stop after first pause
          recognition.value.lang = 'en-US'; // Set language
          recognition.value.interimResults = false; // We only want final results
          recognition.value.maxAlternatives = 1;
  
          // Event Handlers
          recognition.value.onresult = (event) => {
              const transcript = event.results[0][0].transcript;
              console.log('Speech recognized:', transcript);
              userInput.value += (userInput.value ? ' ' : '') + transcript; // Append to existing input
              autoGrowTextarea({ target: inputAreaRef.value }); // Adjust height after adding text
          };
  
          recognition.value.onerror = (event) => {
              console.error('Speech recognition error:', event.error);
              let errorMsg = `Speech recognition error: ${event.error}`;
              if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                  errorMsg = "Microphone access denied. Please allow microphone access in browser settings.";
              } else if (event.error === 'no-speech') {
                  errorMsg = "No speech detected. Please try again.";
              }
              addMessage({ error: true, text: errorMsg }, 'System');
              isListening.value = false; // Ensure listening state is reset on error
          };
  
          recognition.value.onstart = () => {
              console.log('Speech recognition started');
              isListening.value = true;
          };
  
          recognition.value.onend = () => {
              console.log('Speech recognition ended');
              isListening.value = false;
              // Refocus input after listening stops
               nextTick(() => {
                  inputAreaRef.value?.focus();
               });
          };
  
      } else {
          console.warn("Speech Recognition not supported by this browser.");
          speechSupported.value = false;
      }
  };
  
  const startListening = () => {
      if (!speechSupported.value || !recognition.value || isListening.value) return;
      try {
          recognition.value.start();
      } catch (error) {
          console.error("Error starting speech recognition:", error);
          addMessage({ error: true, text: "Could not start voice input." }, 'System');
      }
  };
  
  const stopListening = () => {
      if (!speechSupported.value || !recognition.value || !isListening.value) return;
      recognition.value.stop();
  };
  
  const toggleListening = () => {
      if (!speechSupported.value) {
           addMessage({ error: true, text: 'Sorry, your browser does not support voice input.' }, 'System');
          return;
      }
      if (isListening.value) {
          stopListening();
      } else {
          startListening();
      }
  };
  // ------------------------------------
  
  // --- File Input Handling ---
  const triggerFileInput = () => {
      fileInputRef.value?.click();
  };
  
  const readFileAsBase64 = (file) => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
              const base64String = reader.result?.toString().split(',')[1];
              if (base64String) {
                  resolve({ base64Data: base64String, mimeType: file.type });
              } else {
                  reject(new Error("Failed to read file as base64 data URL."));
              }
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
      });
  };
  
  const handleFileSelected = async (event) => {
      const file = event.target.files?.[0];
      if (!file) { removeSelectedImage(); return; }
      if (!file.type.startsWith('image/')) {
          addMessage({ error: true, text: `Selected file (${file.name}) is not an image.` }, 'System');
          removeSelectedImage(); return;
      }
      const maxSizeMB = 4;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
          addMessage({ error: true, text: `Image file (${file.name}) is too large (>${maxSizeMB}MB).` }, 'System');
          removeSelectedImage(); return;
      }
      selectedFile.value = file;
      const readerPreview = new FileReader();
      readerPreview.onload = (e) => {
          selectedImagePreview.value = e.target?.result;
          currentPlaceholder.value = "Image selected. Add a message or send.";
      };
      readerPreview.onerror = (e) => {
          console.error("FileReader error for preview:", e);
          addMessage({ error: true, text: "Error reading image for preview." }, 'System');
          removeSelectedImage();
      };
      readerPreview.readAsDataURL(file);
      event.target.value = null;
  };
  
  const removeSelectedImage = () => {
      selectedImagePreview.value = null;
      selectedFile.value = null;
      if (fileInputRef.value) { fileInputRef.value.value = null; }
      if (!userInput.value) { currentPlaceholder.value = placeholders[0]; }
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
      addMessage({ error: true, text: `Speech error: ${event.error}` }, 'System');
    };
    synth.speak(utterance);
  };
  
  const toggleTts = () => {
    if (!ttsSupported.value) {
        addMessage({ error: true, text: 'Sorry, your browser does not support text-to-speech.' }, 'System');
        return;
    }
    isTtsEnabled.value = !isTtsEnabled.value;
    if (!isTtsEnabled.value) { synth.cancel(); }
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
          addMessage({ error: true, text: "Cannot copy text: Clipboard API not supported or not available." }, 'System');
          return;
      }
      try {
          await navigator.clipboard.writeText(textToCopy);
          console.log("Text copied to clipboard!");
      } catch (err) {
          console.error('Failed to copy text: ', err);
          addMessage({ error: true, text: `Failed to copy: ${err.message}` }, 'System');
      }
  };
  // -------------------------
  
  // --- Message Handling ---
  const scrollToBottom = () => {
    nextTick(() => {
      const messageArea = messageAreaRef.value;
      if (messageArea) { messageArea.scrollTop = messageArea.scrollHeight; }
    });
  };
  
  const addMessage = (payload, sender = 'User') => {
      let messageText = '';
      let messageSender = sender;
      let isError = false;
      if (typeof payload === 'string') { messageText = payload; }
      else if (typeof payload === 'object' && payload !== null && payload.error === true) {
          messageText = payload.text; messageSender = 'System'; isError = true;
      } else { console.warn("Invalid payload:", payload); return; }
      if (messageText.trim() === '') { console.warn("Empty message."); return; }
      if (messageSender === 'AI' && messageText === 'AI is thinking...' && messages.value.some(msg => msg.text === 'AI is thinking...')) return;
  
      const newMessage = { id: Date.now() + Math.random(), text: messageText.trim(), sender: messageSender, timestamp: Date.now() };
      messages.value.push(newMessage);
      nextTick(scrollToBottom);
      if (messageSender === 'AI' && !isError && isTtsEnabled.value) { speakText(newMessage.text); }
  };
  // -----------------------
  
  // --- API Call Logic ---
  const chatHistoryForApi = computed(() => {
    return messages.value
      .filter(msg => msg.sender === 'User' || msg.sender === 'AI')
      .map(msg => ({ role: msg.sender === 'User' ? 'user' : 'model', parts: [{ text: msg.text }] }));
  });
  
  const callGeminiApi = async (inputText, imageFile) => {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
    const history = chatHistoryForApi.value;
    let userParts = [];
    if (inputText.trim() !== '') { userParts.push({ text: inputText }); }
    if (imageFile) {
        try {
            const { base64Data, mimeType } = await readFileAsBase64(imageFile);
            userParts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
            console.log("Image added to request parts. MIME type:", mimeType);
        } catch (error) {
            console.error("Error reading image file for API:", error);
            return { error: true, text: "Error processing image file before sending." };
        }
    }
    if (userParts.length === 0) {
        console.warn("Attempted to call API with no content parts.");
        return { error: true, text: "Nothing to send." }; // Avoid empty API call
    }
    const requestBody = { contents: [ ...history, { role: 'user', parts: userParts } ] };
  
    try {
      const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
      const responseData = await response.json();
      if (!response.ok) { const specificError = responseData?.error?.message || response.statusText; throw new Error(`API request failed with status ${response.status}: ${specificError}`); }
      if (responseData.candidates?.length > 0) {
          const candidate = responseData.candidates[0];
          if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
               const safetyFeedback = candidate.safetyRatings ? ` Safety ratings: ${JSON.stringify(candidate.safetyRatings)}` : '';
               return { error: true, text: `My response was blocked due to: ${candidate.finishReason}.${safetyFeedback}`};
          }
          if (candidate.content?.parts?.length > 0) {
              const aiText = candidate.content.parts[0].text;
               if (typeof aiText === 'string') { return aiText; }
          }
          console.warn("API response finished but no valid text content.", responseData);
          return { error: true, text: "[No text content received from AI]" };
      }
      if (responseData.promptFeedback?.blockReason) {
          const safetyFeedback = responseData.promptFeedback.safetyRatings ? ` Safety ratings: ${JSON.stringify(responseData.promptFeedback.safetyRatings)}` : '';
          return { error: true, text: `My request was blocked due to: ${responseData.promptFeedback.blockReason}.${safetyFeedback}`};
      }
      console.error('No valid candidates in API response:', responseData);
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
      if (button) { button.classList.add('flash-active'); setTimeout(() => { button.classList.remove('flash-active'); }, 300); }
  };
  // -------------------------------
  
  // --- Send Message Action ---
  const sendMessage = async () => {
    const currentInput = userInput.value;
    const currentFile = selectedFile.value;
    if ((currentInput.trim() === '' && !currentFile) || isLoading.value) return;
  
    triggerSendFlash();
  
    let userMessageText = currentInput.trim();
    if (currentFile && userMessageText === '') { userMessageText = `[Image: ${currentFile.name}]`; }
    // Decide whether to append [Image attached] - keeping it simple for now
    // else if (currentFile) { userMessageText = `${userMessageText} [Image attached]`; }
    addMessage(userMessageText, 'User');
  
    const textToSend = currentInput;
    const imageToSend = currentFile;
  
    userInput.value = '';
    removeSelectedImage(); // Clear preview and file state *before* API call
  
    nextTick(() => {
        if(inputAreaRef.value) { inputAreaRef.value.style.height = 'auto'; autoGrowTextarea({ target: inputAreaRef.value }); }
        currentPlaceholder.value = placeholders[0];
    });
  
    isLoading.value = true;
    addMessage('AI is thinking...', 'AI');
  
    const aiResponse = await callGeminiApi(textToSend, imageToSend);
  
    const thinkingIndex = messages.value.findIndex(msg => msg.text === 'AI is thinking...');
    if (thinkingIndex !== -1) { messages.value.splice(thinkingIndex, 1); }
  
    addMessage(aiResponse, 'AI'); // Handles string or error object
  
    isLoading.value = false;
  
    nextTick(() => { inputAreaRef.value?.focus(); });
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
    /* border-top: 1px solid #ccc; // Removed, handled by preview area potentially */
    background-color: #f0f0f0;
    flex-shrink: 0;
    gap: 0.5rem;
     /* Adjust border radius if preview area is shown */
    border-radius: 0 0 8px 8px; /* Round bottom corners */
  }
  /* Style input area differently if preview IS NOT shown */
  .chat-view:not(:has(.image-preview-area)) .input-area {
       border-top: 1px solid #ccc; /* Add top border back */
       border-radius: 0; /* Reset border radius if no preview */
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
  /* Style for listening state */
  .icon-button.listening {
      background-color: #ff4d4d; /* Red when listening */
      color: white;
      animation: pulse-red 1.5s infinite ease-in-out;
  }
  @keyframes pulse-red {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 77, 77, 0.7); }
    50% { box-shadow: 0 0 0 5px rgba(255, 77, 77, 0); }
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
  