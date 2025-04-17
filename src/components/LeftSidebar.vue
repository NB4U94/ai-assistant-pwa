<template>
    <div class="left-sidebar-content">
      <h2>Main Menu</h2>
      <nav class="main-menu">
        <ul>
          <li>
            <RouterLink to="/">Chat</RouterLink>
          </li>
          <li>
            <RouterLink to="/image-gen">Image Gen</RouterLink>
          </li>
          <li>
            <RouterLink to="/assistants">Assistants</RouterLink>
          </li>
          <li>
            <RouterLink to="/settings">Settings</RouterLink>
          </li>
          </ul>
      </nav>
    </div>
  </template>
  
  <script setup>
  // Import RouterLink if needed (often globally available, but good practice)
  import { RouterLink } from 'vue-router';
  
  // Component-specific JavaScript logic will go here later
  </script>
  
  <style scoped>
  /* Styles specific to the left sidebar */
  .left-sidebar-content {
    padding: 1rem;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  h2 {
    margin-top: 0;
    margin-bottom: 1.5rem; /* Add space below title */
    color: #1a237e; /* Darker blue for title */
    font-family: sans-serif;
    text-align: center;
  }
  
  .main-menu ul {
    list-style: none; /* Remove default bullet points */
    padding: 0;
    margin: 0;
  }
  
  .main-menu li {
    margin-bottom: 0.8rem; /* Space between menu items */
  }
  
  .main-menu a { /* Style the RouterLink */
    display: block; /* Make the link take full width */
    padding: 0.6rem 1rem;
    text-decoration: none;
    color: #333; /* Dark grey text */
    font-family: sans-serif;
    border-radius: 6px;
    transition: background-color 0.2s ease, color 0.2s ease;
  }
  
  .main-menu a:hover {
    background-color: #d1eaff; /* Light blue background on hover */
    color: #0b57d0; /* Darker blue text on hover */
  }
  
  /* Style for the currently active link (uses router-link-active class) */
  .main-menu a.router-link-active {
    background-color: #0b57d0; /* Google blue background for active link */
    color: white; /* White text for active link */
    font-weight: bold;
  }
  </style>
  