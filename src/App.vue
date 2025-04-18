<template>
  <div id="app-container">
    <LeftSidebar id="left-sidebar" />

    <main id="main-content">
      <RouterView />
    </main>

    <RightSidebar id="right-sidebar" />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
// Import the sidebar components so we can use them in the template
import LeftSidebar from './components/LeftSidebar.vue'
import RightSidebar from './components/RightSidebar.vue'

// --- Pinia Store Integration ---
import { useSettingsStore } from '@/stores/settingsStore' // <-- NEW: Import the store

const settingsStore = useSettingsStore() // <-- NEW: Create an instance of the store

// Optional: Log the theme to console to verify access
console.log('Theme from Pinia store:', settingsStore.theme) // <-- NEW: Example access

// We might add more JavaScript logic here later
</script>

<style scoped>
/* Basic styling to visualize the layout */
#app-container {
  display: flex; /* Use Flexbox to arrange children side-by-side */
  height: 100vh; /* Make the container take full viewport height */
  width: 100vw; /* Make the container take full viewport width */
  overflow: hidden; /* Prevent accidental scrollbars on the main container */
  background-color: #f0f0f0; /* Light grey background for the page */
  margin: 0; /* Remove default body margin */
  padding: 0; /* Remove default body padding */
}

/* Apply IDs to the component tags */
#left-sidebar {
  width: 250px; /* Fixed width for the left sidebar */
  background-color: #e0e0ff; /* Light blue background */
  height: 100%;
  overflow-y: auto;
  flex-shrink: 0;
}

#main-content {
  flex-grow: 1; /* Allow main content to take remaining horizontal space */
  background-color: #ffffff; /* White background */
  /* Padding is removed here, should be handled by the view inside RouterView */
  height: 100%;
  overflow-y: auto; /* Allow view content to scroll */
}

#right-sidebar {
  width: 200px; /* Fixed width for the right sidebar */
  background-color: #e0ffe0; /* Light green background */
  height: 100%;
  overflow-y: auto;
  flex-shrink: 0;
}

/* Ensure root elements take full size and remove margin/padding */
/* This is better placed in a global CSS file like src/assets/main.css */
:global(html),
:global(body) {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden; /* Prevent body scrollbars */
}
</style>
