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
      <div class="input-area">
         <button class="icon-button" aria-label="Attach file" title="Attach file (Not implemented)">
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
  const GEMINI_API_KEY = 'YOUR_API_KEY_HERE';
  const MODEL_NAME = 'gemini-1.5-flash';
  // ---------------------
  
  // --- Refs ---
  const messageAreaRef = ref(null);
  const inputAreaRef = ref(null);
  const sendButtonRef = ref(null);
  
  // --- Reactive State ---
  const userInput = ref('');
  const messages = ref([]); // Now stores objects like { id, text, sender, timestamp }
  const isLoading = ref(false);
  const isTtsEnabled = ref(false);
  const synth = window.speechSynthesis;
  const ttsSupported = ref(!!synth);
  
  // --- Animated Placeholder ---
  const placeholders = [
    "Type your message here...",
    "Ask me anything...",
    "Write a story about a dragon...",
    "Explain quantum physics simply...",
    "Give me a recipe for chocolate cake...",
    "Translate 'hello' to Spanish...",
  ];
  const currentPlaceholder = ref(placeholders[0]);
  let placeholderInterval = null;
  
  onMounted(() => {
    let placeholderIndex = 0;
    placeholderInterval = setInterval(() => {
      placeholderIndex = (placeholderIndex + 1) % placeholders.length;
      currentPlaceholder.value = placeholders[placeholderIndex];
    }, 3000);
  });
  
  onUnmounted(() => {
    clearInterval(placeholderInterval);
    if (synth) {
        synth.cancel();
    }
  });
  // ---------------------------
  
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
    console.log("TTS Enabled:", isTtsEnabled.value);
  };
  // -----------------------------
  
  // --- Timestamp Formatting ---
  const formatTimestamp = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }); // e.g., 10:30 AM
  }
  // --------------------------
  
  // --- Copy to Clipboard ---
  const copyText = async (textToCopy) => {
      if (!navigator.clipboard) {
          console.warn("Clipboard API not available.");
          addMessage("Cannot copy text: Clipboard API not supported or not available in this context (e.g., non-HTTPS).", 'System');
          return;
      }
      try {
          await navigator.clipboard.writeText(textToCopy);
          // Optional: Show a temporary success message or change button appearance
          console.log("Text copied to clipboard!");
          // Example: Briefly change button text (requires making button state reactive)
          // copyButtonText.value = 'Copied!';
          // setTimeout(() => { copyButtonText.value = '📋'; }, 1500);
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
  
  const addMessage = (text, sender = 'User') => {
    if (sender === 'AI' && text === 'AI is thinking...' && messages.value.some(msg => msg.text === 'AI is thinking...')) return;
    if (typeof text !== 'string' || text.trim() === '') {
      console.warn("Attempted to add an empty message.");
      return;
    }
    let messageText = text;
    let messageSender = sender;
    if (typeof text === 'object' && text !== null && text.error === true) {
        messageText = text.text;
        messageSender = 'System';
    }
  
    const newMessage = {
      id: Date.now() + Math.random(),
      text: messageText.trim(),
      sender: messageSender,
      timestamp: Date.now() // Add timestamp when message is created
    };
    messages.value.push(newMessage);
    scrollToBottom(); // Scroll after adding any message
  
    // Speak only actual AI responses, not system errors or thinking messages
    if (messageSender === 'AI' && isTtsEnabled.value) {
      speakText(newMessage.text);
    }
  };
  // -----------------------
  
  // --- API Call Logic ---
  const chatHistoryForApi = computed(() => {
    return messages.value
      .filter(msg => msg.text !== 'AI is thinking...' && msg.sender !== 'System')
      .map(msg => ({
        role: msg.sender === 'User' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
  });
  
  const callGeminiApi = async (inputText) => {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
    const history = chatHistoryForApi.value;
    const requestBody = {
      contents: [ ...history, { role: 'user', parts: [{ text: inputText }] } ]
    };
  
    console.log("Sending to API:", JSON.stringify(requestBody, null, 2));
  
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
                  return aiText;
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
    if (currentInput.trim() === '' || isLoading.value) return;
  
    triggerSendFlash();
  
    addMessage(currentInput, 'User');
    const textToSend = currentInput;
    userInput.value = '';
    nextTick(() => {
        if(inputAreaRef.value) {
            inputAreaRef.value.style.height = 'auto';
            autoGrowTextarea({ target: inputAreaRef.value });
        }
    });
  
  
    isLoading.value = true;
    addMessage('AI is thinking...', 'AI');
  
    const aiResponse = await callGeminiApi(textToSend);
  
    const thinkingIndex = messages.value.findIndex(msg => msg.text === 'AI is thinking...');
    if (thinkingIndex !== -1) {
      messages.value.splice(thinkingIndex, 1);
    }
  
    addMessage(aiResponse, 'AI');
  
    isLoading.value = false;
  
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
    /* Remove margin-bottom as it's on container now */
    padding: 0.6rem 1.0rem; /* Adjusted padding */
    border-radius: 18px; /* More rounded bubbles */
    /* max-width removed, handled by container */
    word-wrap: break-word; /* Wrap long words */
    font-family: sans-serif;
    line-height: 1.45; /* Slightly more line spacing */
    position: relative; /* Needed for absolute positioning of timestamp/copy */
    min-width: 50px; /* Ensure very short messages have some width */
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
      /* align-self: center; Handled by container */
      width: 100%; /* Take full width of container */
      text-align: center;
      font-style: italic;
      font-size: 0.9em;
      border: 1px dashed #ffcdd2;
      border-radius: 8px; /* Match other messages */
      padding-top: 0.8rem; /* More padding for centered text */
      padding-bottom: 0.8rem;
  }
  
  /* Timestamp Styling */
  .timestamp {
      display: block; /* Put timestamp on new line */
      font-size: 0.7em;
      color: #999; /* Lighter grey for timestamp */
      margin-top: 0.3rem;
      text-align: right; /* Align timestamp to the right within the bubble */
  }
  .user-message .timestamp {
      color: #c0d8ff; /* Lighter blue for user timestamp */
  }
  .ai-message .timestamp {
      color: #777; /* Darker grey for AI timestamp */
  }
  
  /* Copy Button Styling */
  .copy-button {
      position: absolute; /* Position relative to message bubble */
      bottom: -5px; /* Adjust position */
      right: -10px; /* Adjust position */
      background-color: #f0f0f0;
      border: 1px solid #ccc;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      font-size: 0.8em;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0; /* Hidden by default */
      transition: opacity 0.2s ease, background-color 0.2s ease;
      z-index: 1; /* Ensure it's clickable */
  }
  .message:hover .copy-button {
      opacity: 1; /* Show on hover */
  }
  .copy-button:hover {
      background-color: #e0e0e0;
  }
  
  
  .placeholder-message {
    color: #888;
    font-style: italic;
    font-family: sans-serif;
    text-align: center;
    margin: 2rem auto; /* Center vertically and horizontally */
  }
  
  .loading-indicator {
    color: #555;
    font-style: normal;
     /* Simple pulsing animation */
    animation: pulse 1.5s infinite ease-in-out;
  }
  
  /* Loading animation */
  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  
  
  .input-area {
    display: flex; /* Arrange input and button side-by-side */
    align-items: flex-end; /* Align items to bottom */
    padding: 0.75rem;
    border-top: 1px solid #ccc; /* Separator line */
    background-color: #f0f0f0; /* Light grey for input area */
    flex-shrink: 0; /* Prevent input area from shrinking */
    gap: 0.5rem; /* Add gap between elements */
  }
  
  .input-area textarea {
    flex-grow: 1; /* Input takes up available space */
    padding: 0.5rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 15px; /* More rounded input */
    resize: none; /* Prevent manual resizing */
    font-family: sans-serif;
    font-size: 1em;
    min-height: 40px; /* Ensure minimum height matches buttons */
    max-height: 150px; /* Limit max height before scrolling */
    overflow-y: auto; /* Allow scrolling within textarea */
    line-height: 1.4;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .input-area textarea:focus {
      outline: none;
      border-color: #0b57d0; /* Google blue on focus */
      box-shadow: 0 0 0 2px rgba(11, 87, 208, 0.2); /* Subtle glow on focus */
  }
  
  
  .input-area textarea:disabled {
    background-color: #e0e0e0;
    cursor: not-allowed;
  }
  
  /* Base style for all buttons in input area */
  .input-area button {
    padding: 0.5rem; /* Consistent padding */
    border: none;
    border-radius: 50%; /* Make icon buttons circular */
    cursor: pointer;
    min-height: 40px; /* Match textarea min height */
    min-width: 40px; /* Make circular */
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2em; /* Slightly larger icons */
    flex-shrink: 0; /* Prevent buttons from shrinking */
    transition: background-color 0.2s ease, opacity 0.2s ease, transform 0.1s ease; /* Added transform */
  }
  .input-area button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .input-area button:active:not(:disabled) {
      transform: scale(0.95); /* Slight shrink on click */
  }
  
  
  /* Specific styles for icon buttons */
  .icon-button {
      background-color: #d1d1d1; /* Neutral grey */
      color: #333;
  }
  .icon-button:hover:not(:disabled) {
      background-color: #c0c0c0; /* Slightly darker grey */
  }
  .icon-button:disabled {
      background-color: #e0e0e0;
  }
  
  
  /* Specific styles for Send button */
  .send-button {
    background-color: #0b57d0; /* Google blue */
    color: white;
    border-radius: 15px; /* Keep rounded rectangle */
    padding: 0.5rem 1rem; /* Restore original padding */
    font-size: 1em;
    font-weight: 500;
    min-width: auto; /* Allow width to adjust */
  }
  .send-button:hover:not(:disabled) {
    background-color: #0a4cb0; /* Darker Google blue */
  }
  .send-button:disabled {
    background-color: #a0a0a0;
  }
  /* Flash animation for send button */
  .send-button.flash-active {
      animation: flash-animation 0.3s ease-out;
  }
  
  @keyframes flash-animation {
      0% { transform: scale(1); background-color: #0b57d0; }
      50% { transform: scale(1.1); background-color: #8ec5fc; } /* Flash color */
      100% { transform: scale(1); background-color: #0b57d0; }
  }
  
  
  /* Specific styles for TTS button */
  .tts-button {
    background-color: #e0e0e0; /* Default grey */
    color: #333;
    font-size: 1.1em; /* Adjust icon size if needed */
  }
  .tts-button.tts-on {
    background-color: #66bb6a; /* Green when ON */
    color: white;
  }
  .tts-button:hover:not(.tts-on):not(:disabled) {
    background-color: #d5d5d5;
  }
  .tts-button.tts-on:hover:not(:disabled) {
    background-color: #5a9a5d;
  }
  
  </style>
  