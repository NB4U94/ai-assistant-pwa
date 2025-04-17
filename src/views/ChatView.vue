<template>
    <div class="chat-view">
      <div class="message-display-area" ref="messageAreaRef">
        <div v-for="message in messages" :key="message.id" :class="['message', message.sender === 'User' ? 'user-message' : 'ai-message']">
          <span class="message-text">{{ message.text }}</span>
        </div>
        <p v-if="messages.length === 0 && !isLoading" class="placeholder-message">
          No messages yet. Start the conversation!
        </p>
        <p v-if="isLoading" class="placeholder-message loading-indicator">
          AI is thinking...
        </p>
      </div>
      <div class="input-area">
        <textarea
          ref="inputAreaRef"
          v-model="userInput"
          placeholder="Type your message here..."
          rows="3"
          @keydown.enter.prevent="sendMessage"
          :disabled="isLoading"
          aria-label="Chat message input"
        ></textarea>
        <button @click="sendMessage" :disabled="isLoading" aria-label="Send message">Send</button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, nextTick } from 'vue';
  
  // --- Configuration ---
  // 🚨🚨🚨 WARNING: Replace with your NEW, PRIVATE key for LOCAL TESTING ONLY.
  // 🚨🚨🚨 DO NOT COMMIT YOUR REAL API KEY TO GIT!
  const GEMINI_API_KEY = 'YOUR_API_KEY_HERE';
  // You can change the model name if needed (e.g., 'gemini-pro')
  const MODEL_NAME = 'gemini-1.5-flash';
  // ---------------------
  
  // Template ref to access the message display DOM element
  const messageAreaRef = ref(null);
  // Template ref to access the input textarea DOM element
  const inputAreaRef = ref(null);
  
  // Reactive variable to hold the user's input
  const userInput = ref('');
  
  // Reactive array to hold the chat messages
  const messages = ref([]);
  
  // Reactive variable to indicate if we are waiting for AI response
  const isLoading = ref(false);
  
  // Function to scroll the message area to the bottom
  const scrollToBottom = () => {
    nextTick(() => {
      const messageArea = messageAreaRef.value;
      if (messageArea) {
        messageArea.scrollTop = messageArea.scrollHeight;
      }
    });
  };
  
  // Function to add a message to the list
  const addMessage = (text, sender = 'User') => {
    // Simple check to prevent adding duplicate "thinking" messages if one is already showing
    if (sender === 'AI' && text === 'AI is thinking...' && messages.value.some(msg => msg.text === 'AI is thinking...')) {
      return;
    }
     // Prevent adding empty or only whitespace messages
    if (typeof text !== 'string' || text.trim() === '') {
      console.warn("Attempted to add an empty message.");
      return;
    }
    messages.value.push({
      id: Date.now() + Math.random(), // Unique ID
      text: text.trim(),
      sender: sender
    });
    scrollToBottom();
  };
  
  
  // Function to call the Gemini API
  const callGeminiApi = async (inputText) => {
    // Construct the API endpoint URL
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
  
    // Prepare the request body
    const requestBody = {
      contents: [{
        parts: [{
          text: inputText
        }]
      }]
      // We can add generationConfig and safetySettings here later if needed
    };
  
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
  
      if (!response.ok) {
        // Handle HTTP errors (like 4xx, 5xx)
        const errorData = await response.json().catch(() => ({ message: response.statusText })); // Try to parse error JSON
        console.error('API Error Response:', errorData);
        throw new Error(`API request failed with status ${response.status}: ${errorData.error?.message || response.statusText}`);
      }
  
      const responseData = await response.json();
  
      // Extract the text from the response - check structure carefully
      // Based on Gemini API docs, text is usually here:
      const aiText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
  
      if (typeof aiText !== 'string') { // Check if aiText is actually a string
          console.error('Could not find valid text in API response:', responseData);
          throw new Error('Invalid response structure from API.');
      }
  
      return aiText;
  
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      // Return an error message to display to the user
      return `Error: ${error.message}`;
    }
  };
  
  // Function called when user clicks Send or presses Enter
  const sendMessage = async () => {
    const currentInput = userInput.value;
    if (currentInput.trim() === '' || isLoading.value) return;
  
    addMessage(currentInput, 'User');
    userInput.value = ''; // Clear input immediately
  
    isLoading.value = true; // Show loading indicator
    addMessage('AI is thinking...', 'AI'); // Add thinking message
  
    // Call the actual API
    const aiResponseText = await callGeminiApi(currentInput);
  
    // Remove the "thinking..." message before adding the final response
    const thinkingIndex = messages.value.findIndex(msg => msg.text === 'AI is thinking...');
    if (thinkingIndex !== -1) {
      messages.value.splice(thinkingIndex, 1);
    }
  
    // Add the actual AI response (or error message)
    addMessage(aiResponseText, 'AI');
  
    isLoading.value = false; // Hide loading indicator
  
    // Refocus the input area after the response is added and loading is false
    nextTick(() => {
      inputAreaRef.value?.focus(); // Use optional chaining just in case
    });
  
    scrollToBottom(); // Ensure scroll after final message (might already be called in addMessage)
  };
  
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
  
  .message {
    margin-bottom: 0.75rem;
    padding: 0.6rem 0.9rem; /* Adjusted padding */
    border-radius: 12px; /* Slightly more rounded */
    max-width: 80%; /* Prevent messages from taking full width */
    word-wrap: break-word; /* Wrap long words */
    font-family: sans-serif;
    line-height: 1.4;
  }
  
  /* Style user messages */
  .user-message {
    background-color: #d1eaff; /* Brighter blue for user */
    color: #333;
    align-self: flex-end; /* Align user messages to the right */
    margin-left: auto; /* Push to right */
    border-bottom-right-radius: 4px; /* Add a slight tail effect */
  }
  
  /* Style AI messages */
  .ai-message {
    background-color: #e9e9eb; /* Lighter grey for AI */
    color: #333;
    align-self: flex-start; /* Align other messages to the left */
    margin-right: auto; /* Push to left */
    border-bottom-left-radius: 4px; /* Add a slight tail effect */
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
  }
  
  
  .input-area {
    display: flex; /* Arrange input and button side-by-side */
    padding: 0.75rem;
    border-top: 1px solid #ccc; /* Separator line */
    background-color: #f0f0f0; /* Light grey for input area */
    flex-shrink: 0; /* Prevent input area from shrinking */
    gap: 0.5rem; /* Add gap between textarea and button */
  }
  
  .input-area textarea {
    flex-grow: 1; /* Input takes up available space */
    padding: 0.5rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 15px; /* More rounded input */
    resize: none; /* Prevent manual resizing */
    font-family: sans-serif;
    font-size: 1em;
    height: auto;
    min-height: 40px; /* Ensure minimum height */
    line-height: 1.4;
  }
  
  .input-area textarea:disabled {
    background-color: #e0e0e0;
    cursor: not-allowed;
  }
  
  .input-area button {
    padding: 0.5rem 1rem;
    background-color: #0b57d0; /* Google blue */
    color: white;
    border: none;
    border-radius: 15px; /* More rounded button */
    cursor: pointer;
    font-size: 1em;
    font-weight: 500;
    align-self: flex-end; /* Align button to bottom */
    min-height: 40px; /* Match textarea min height */
    transition: background-color 0.2s ease;
  }
  
  .input-area button:hover:not(:disabled) {
    background-color: #0a4cb0; /* Darker Google blue */
  }
  
  .input-area button:disabled {
    background-color: #a0a0a0;
    cursor: not-allowed;
  }
  </style>
  