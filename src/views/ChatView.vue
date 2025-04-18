<template>
    <div class="chat-view">
      <div class="message-display-area" ref="messageAreaRef">
         <div v-for="message in messages" :key="message.id" :class="['message-container', message.sender === 'User' ? 'user-container' : (message.sender === 'AI' ? 'ai-container' : 'system-container')]" @click="message.sender === 'AI' ? handleMessageClick(message.text) : null" :title="message.sender === 'AI' ? 'Click to read aloud' : ''">
          <div class="avatar-placeholder" :title="message.sender">
            {{ message.sender === 'User' ? 'U' : 'AI' }}
          </div>
          <div :class="['message', message.sender === 'User' ? 'user-message' : (message.sender === 'AI' ? 'ai-message' : 'system-message')]">
            <span class="message-text">{{ message.text }}</span>
            <span class="timestamp">{{ formatTimestamp(message.timestamp) }}</span>
             <button v-if="message.sender === 'AI'" @click.stop="copyText(message.text)" class="copy-button" title="Copy response">
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
           <span v-else>⏹️</span> </button>
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
  const isTtsEnabled = ref(false); // For automatic speaking of new AI messages
  const synth = window.speechSynthesis;
  const ttsSupported = ref(!!synth);
  const selectedImagePreview = ref(null);
  const selectedFile = ref(null);
  
  // --- Speech Recognition State ---
  const isListening = ref(false);
  const recognition = ref(null);
  const speechSupported = ref(false);
  // -----------------------------
  
  // --- Animated Placeholder ---
  const placeholders = [
    "Type your message or use the mic...",
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
  
    // Setup Speech Recognition (Logs removed)
    setupSpeechRecognition();
  
    // Add event listener to get voices loaded, needed for some browsers
    if (ttsSupported.value && synth) {
      const loadVoices = () => {
          const voices = synth.getVoices();
          if (voices.length > 0) {
              console.log("TTS voices loaded:", voices.length);
          }
      };
      if (synth.getVoices().length > 0) { loadVoices(); }
      else if (synth.onvoiceschanged !== undefined) { synth.onvoiceschanged = loadVoices; }
    }
  });
  
  onUnmounted(() => {
    clearInterval(placeholderInterval);
    if (synth) { synth.cancel(); }
    if (recognition.value) { recognition.value.abort(); }
  });
  // ---------------------------
  
  // --- Speech Recognition Setup & Control (Logs removed) ---
  const setupSpeechRecognition = () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
          speechSupported.value = true;
          try {
              recognition.value = new SpeechRecognition();
              recognition.value.continuous = false; recognition.value.lang = 'en-US';
              recognition.value.interimResults = false; recognition.value.maxAlternatives = 1;
              recognition.value.onresult = (event) => {
                  const transcript = event.results?.[0]?.[0]?.transcript;
                  if (transcript) { userInput.value += (userInput.value ? ' ' : '') + transcript; autoGrowTextarea({ target: inputAreaRef.value }); }
                  else { console.warn("No transcript found in result event."); }
              };
              recognition.value.onerror = (event) => {
                  console.error('Speech recognition error:', event.error, event.message);
                  let errorMsg = `Speech recognition error: ${event.error}`;
                  if (event.error === 'not-allowed' || event.error === 'service-not-allowed') { errorMsg = "Microphone access denied."; }
                  else if (event.error === 'no-speech') { errorMsg = "No speech detected."; }
                  else { errorMsg = `Speech error: ${event.error} - ${event.message || '(no details)'}`; }
                  addMessage({ error: true, text: errorMsg }, 'System'); isListening.value = false;
              };
              recognition.value.onstart = () => { isListening.value = true; };
              recognition.value.onend = () => { isListening.value = false; nextTick(() => { inputAreaRef.value?.focus(); }); };
          } catch (e) {
              console.error("Error creating SpeechRecognition object:", e); speechSupported.value = false;
              addMessage({ error: true, text: "Failed to initialize speech recognition." }, 'System');
          }
      } else { console.warn("Speech Recognition not supported."); speechSupported.value = false; }
  };
  const startListening = () => {
      if (!speechSupported.value || !recognition.value || isListening.value) return;
      try { recognition.value.start(); }
      catch (error) { console.error(`Error calling recognition.start(): ${error.name} - ${error.message}`); addMessage({ error: true, text: `Could not start voice input: ${error.message}` }, 'System'); isListening.value = false; }
  };
  const stopListening = () => {
      if (!speechSupported.value || !recognition.value || !isListening.value) return;
      try { recognition.value.stop(); }
      catch (error) { console.error("Error stopping speech recognition:", error); isListening.value = false; }
  };
  const toggleListening = () => {
      if (!speechSupported.value) { addMessage({ error: true, text: 'Sorry, your browser does not support voice input.' }, 'System'); return; }
      if (isListening.value) { stopListening(); } else { startListening(); }
  };
  // ------------------------------------
  
  // --- File Input Handling ---
  const triggerFileInput = () => { fileInputRef.value?.click(); };
  const readFileAsBase64 = (file) => { /* ... (implementation unchanged) ... */
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
              const base64String = reader.result?.toString().split(',')[1];
              if (base64String) { resolve({ base64Data: base64String, mimeType: file.type }); }
              else { reject(new Error("Failed to read file as base64 data URL.")); }
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
      });
  };
  const handleFileSelected = async (event) => { /* ... (implementation unchanged) ... */
      const file = event.target.files?.[0];
      if (!file) { removeSelectedImage(); return; }
      if (!file.type.startsWith('image/')) { addMessage({ error: true, text: `Selected file (${file.name}) is not an image.` }, 'System'); removeSelectedImage(); return; }
      const maxSizeMB = 4; const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) { addMessage({ error: true, text: `Image file (${file.name}) is too large (>${maxSizeMB}MB).` }, 'System'); removeSelectedImage(); return; }
      selectedFile.value = file;
      const readerPreview = new FileReader();
      readerPreview.onload = (e) => { selectedImagePreview.value = e.target?.result; currentPlaceholder.value = "Image selected. Add a message or send."; };
      readerPreview.onerror = (e) => { console.error("FileReader error for preview:", e); addMessage({ error: true, text: "Error reading image for preview." }, 'System'); removeSelectedImage(); };
      readerPreview.readAsDataURL(file);
      event.target.value = null;
  };
  const removeSelectedImage = () => { /* ... (implementation unchanged) ... */
      selectedImagePreview.value = null; selectedFile.value = null;
      if (fileInputRef.value) { fileInputRef.value.value = null; }
      if (!userInput.value) { currentPlaceholder.value = placeholders[0]; }
  };
  // -------------------------
  
  // --- Textarea Auto-Grow ---
  const autoGrowTextarea = (event) => { /* ... (implementation unchanged) ... */
    const textarea = event.target; textarea.style.height = 'auto';
    const maxHeight = 150; textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  };
  // -------------------------
  
  // --- Text-to-Speech (TTS) ---
  // Function to speak text (handles interruptions better)
  const speakText = (text) => {
    if (!ttsSupported.value || !synth || !text) return;
  
    // Cancel *only if* synth is already speaking.
    if (synth.speaking) {
        console.log("TTS: Cancelling previous speech.");
        synth.cancel();
    }
  
    // Use nextTick AND a small timeout
    nextTick(() => {
        setTimeout(() => {
            // Double check synth isn't speaking *again* right before speaking
            if (synth.speaking) {
                console.log("TTS: Still speaking before new utterance, cancelling again.");
                synth.cancel();
                setTimeout(() => { // Extra delay after second cancel
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.onerror = (event) => { console.error(`TTS onerror: ${event.error}`); if (event.error !== 'interrupted' && event.error !== 'canceled') { addMessage({ error: true, text: `Speech error: ${event.error}` }, 'System'); } };
                    console.log("TTS: Attempting to speak (after second cancel)...");
                    synth.speak(utterance);
                }, 30);
                return;
            }
  
            // If not speaking, proceed normally
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onerror = (event) => { console.error(`TTS onerror: ${event.error}`); if (event.error !== 'interrupted' && event.error !== 'canceled') { addMessage({ error: true, text: `Speech error: ${event.error}` }, 'System'); } };
            console.log("TTS: Attempting to speak...");
            synth.speak(utterance);
        }, 50); // 50ms delay
    });
  };
  
  // Function called by clicking an AI message bubble
  const handleMessageClick = (textToSpeak) => {
      speakText(textToSpeak); // Call the refined speakText function
  };
  
  // Function called by the main TTS toggle button
  const toggleTts = () => {
    if (!ttsSupported.value) { addMessage({ error: true, text: 'Sorry, browser does not support TTS.' }, 'System'); return; }
    isTtsEnabled.value = !isTtsEnabled.value;
    console.log("TTS Toggle Enabled:", isTtsEnabled.value);
    if (!isTtsEnabled.value && synth.speaking) {
        console.log("TTS: Cancelling speech due to toggle OFF.");
        synth.cancel();
    }
  };
  // -----------------------------
  
  // --- Timestamp Formatting ---
  const formatTimestamp = (timestamp) => { /* ... (implementation unchanged) ... */
      if (!timestamp) return ''; const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  // --------------------------
  
  // --- Copy to Clipboard ---
  const copyText = async (textToCopy) => { /* ... (implementation unchanged) ... */
      if (!navigator.clipboard) { addMessage({ error: true, text: "Cannot copy: Clipboard API not available." }, 'System'); return; }
      try { await navigator.clipboard.writeText(textToCopy); console.log("Text copied!"); }
      catch (err) { console.error('Failed to copy: ', err); addMessage({ error: true, text: `Failed to copy: ${err.message}` }, 'System'); }
  };
  // -------------------------
  
  // --- Message Handling ---
  const scrollToBottom = () => { /* ... (implementation unchanged) ... */
    nextTick(() => { const messageArea = messageAreaRef.value; if (messageArea) { messageArea.scrollTop = messageArea.scrollHeight; } });
  };
  const addMessage = (payload, sender = 'User') => {
      let messageText = ''; let messageSender = sender; let isError = false;
      if (typeof payload === 'string') { messageText = payload; }
      else if (typeof payload === 'object' && payload !== null && payload.error === true) { messageText = payload.text; messageSender = 'System'; isError = true; }
      else { console.warn("Invalid payload:", payload); return; }
      if (messageText.trim() === '') { console.warn("Empty message."); return; }
      if (messageSender === 'AI' && messageText === 'AI is thinking...' && messages.value.some(msg => msg.text === 'AI is thinking...')) return;
  
      const newMessage = { id: Date.now() + Math.random(), text: messageText.trim(), sender: messageSender, timestamp: Date.now() };
      messages.value.push(newMessage);
      nextTick(scrollToBottom);
  
      // *** CHANGE HERE: Removed the check for !synth.speaking ***
      // Let speakText handle interruptions if needed
      if (messageSender === 'AI' && !isError && isTtsEnabled.value) {
          speakText(newMessage.text);
      }
  };
  // -----------------------
  
  // --- API Call Logic ---
  const chatHistoryForApi = computed(() => { /* ... (implementation unchanged) ... */
    return messages.value
      .filter(msg => msg.sender === 'User' || msg.sender === 'AI')
      .map(msg => ({ role: msg.sender === 'User' ? 'user' : 'model', parts: [{ text: msg.text }] }));
  });
  const callGeminiApi = async (inputText, imageFile) => { /* ... (implementation unchanged) ... */
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
    const history = chatHistoryForApi.value; let userParts = [];
    if (inputText.trim() !== '') { userParts.push({ text: inputText }); }
    if (imageFile) {
        try {
            const { base64Data, mimeType } = await readFileAsBase64(imageFile);
            userParts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
        } catch (error) { console.error("Error reading image file for API:", error); return { error: true, text: "Error processing image file." }; }
    }
    if (userParts.length === 0) { return { error: true, text: "Nothing to send." }; }
    const requestBody = { contents: [ ...history, { role: 'user', parts: userParts } ] };
  
    try {
      const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
      const responseData = await response.json();
      if (!response.ok) { const specificError = responseData?.error?.message || response.statusText; throw new Error(`API ${response.status}: ${specificError}`); }
      if (responseData.candidates?.length > 0) {
          const candidate = responseData.candidates[0];
          if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
               const safetyFeedback = candidate.safetyRatings ? ` Ratings: ${JSON.stringify(candidate.safetyRatings)}` : '';
               return { error: true, text: `Blocked: ${candidate.finishReason}.${safetyFeedback}`};
          }
          if (candidate.content?.parts?.length > 0) {
              const aiText = candidate.content.parts[0].text;
               if (typeof aiText === 'string') { return aiText; }
          }
          return { error: true, text: "[No text content received]" };
      }
      if (responseData.promptFeedback?.blockReason) {
          const safetyFeedback = responseData.promptFeedback.safetyRatings ? ` Ratings: ${JSON.stringify(responseData.promptFeedback.safetyRatings)}` : '';
          return { error: true, text: `Request Blocked: ${responseData.promptFeedback.blockReason}.${safetyFeedback}`};
      }
      throw new Error('Invalid response structure');
    } catch (error) { console.error('Error calling Gemini API:', error); return { error: true, text: `Error: ${error.message}` }; }
  };
  // -----------------------
  
  // --- Send Button Flash Animation ---
  const triggerSendFlash = () => { /* ... (implementation unchanged) ... */
      const button = sendButtonRef.value; if (button) { button.classList.add('flash-active'); setTimeout(() => { button.classList.remove('flash-active'); }, 300); }
  };
  // -------------------------------
  
  // --- Send Message Action ---
  const sendMessage = async () => { /* ... (implementation unchanged) ... */
    const currentInput = userInput.value; const currentFile = selectedFile.value;
    if ((currentInput.trim() === '' && !currentFile) || isLoading.value) return;
    triggerSendFlash();
    let userMessageText = currentInput.trim();
    if (currentFile && userMessageText === '') { userMessageText = `[Image: ${currentFile.name}]`; }
    addMessage(userMessageText, 'User');
    const textToSend = currentInput; const imageToSend = currentFile;
    userInput.value = ''; removeSelectedImage();
    nextTick(() => { if(inputAreaRef.value) { inputAreaRef.value.style.height = 'auto'; autoGrowTextarea({ target: inputAreaRef.value }); } currentPlaceholder.value = placeholders[0]; });
    isLoading.value = true; addMessage('AI is thinking...', 'AI');
    const aiResponse = await callGeminiApi(textToSend, imageToSend);
    const thinkingIndex = messages.value.findIndex(msg => msg.text === 'AI is thinking...');
    if (thinkingIndex !== -1) { messages.value.splice(thinkingIndex, 1); }
    addMessage(aiResponse, 'AI'); // Will trigger speakText if enabled
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
      position: relative; /* Needed for copy button positioning */
  }
  /* Add cursor pointer for AI messages to indicate click-to-speak */
  .ai-container {
      cursor: pointer;
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
    position: relative; /* Keep relative for timestamp/copy button */
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
      /* Ensure system message container takes full width available */
      margin-left: auto;
      margin-right: auto;
      max-width: 90%; /* Limit width slightly */
  }
  /* Ensure system container itself aligns center */
  .system-container {
      width: 100%;
      justify-content: center;
      align-self: center; /* Override default align-self */
  }
  
  
  /* Timestamp Styling */
  .timestamp {
      display: block;
      font-size: 0.7em;
      color: #999;
      margin-top: 0.3rem;
      text-align: right;
      /* Prevent timestamp from being copied */
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
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
      bottom: 2px; /* Adjust position slightly */
      right: -30px; /* Position outside the bubble */
      background-color: transparent;
      border: none;
      color: #888;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      font-size: 1em; /* Make icon slightly larger */
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease, color 0.2s ease;
      z-index: 1;
      padding: 0; /* Remove default padding */
  }
  /* Show copy button when message container is hovered */
  .ai-container:hover .copy-button { /* Target container hover */
      opacity: 0.6; /* Slightly visible */
  }
  .copy-button:hover {
      opacity: 1; /* Fully visible on hover */
      color: #333; /* Darker on hover */
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
  