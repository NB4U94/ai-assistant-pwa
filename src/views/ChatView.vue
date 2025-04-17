<template>
    <div class="chat-view">
      <div class="message-display-area">
        <p class="placeholder-message">Welcome to the chat!</p>
        <p class="placeholder-message">Messages will appear here...</p>
      </div>
      <div class="input-area">
        <textarea
          v-model="userInput"
          placeholder="Type your message here..."
          rows="3"
          @keydown.enter.prevent="sendMessage"
        ></textarea>
        <button @click="sendMessage">Send</button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  
  // Reactive variable to hold the user's input
  const userInput = ref('');
  
  // Placeholder function for sending a message (we'll add logic later)
  const sendMessage = () => {
    if (userInput.value.trim() === '') return; // Don't send empty messages
  
    console.log('Sending message:', userInput.value);
    // TODO: Implement actual message sending logic
    userInput.value = ''; // Clear the input field after "sending"
  };
  
  // We can add logic here later to fetch and display messages
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
  }
  
  .placeholder-message {
    color: #888;
    font-style: italic;
    font-family: sans-serif;
    margin-bottom: 0.5rem;
  }
  
  .input-area {
    display: flex; /* Arrange input and button side-by-side */
    padding: 0.75rem;
    border-top: 1px solid #ccc; /* Separator line */
    background-color: #f0f0f0; /* Light grey for input area */
    flex-shrink: 0; /* Prevent input area from shrinking */
  }
  
  .input-area textarea {
    flex-grow: 1; /* Input takes up available space */
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-right: 0.5rem;
    resize: none; /* Prevent manual resizing */
    font-family: sans-serif;
    font-size: 1em;
  }
  
  .input-area button {
    padding: 0.5rem 1rem;
    background-color: #4CAF50; /* Green button */
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
  }
  
  .input-area button:hover {
    background-color: #45a049; /* Darker green on hover */
  }
  </style>