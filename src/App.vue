<template>
  <div id="app-container" :class="appContainerClass">
    <header id="main-header">
      <div id="header-logo" :class="{ active: isHeaderActive }">
        <span
          v-for="(char, index) in logoText"
          :key="index"
          :class="['header-char', `char-${index}`]"
        >
          {{ char }}
        </span>
      </div>
    </header>

    <div class="main-layout-wrapper">
      <LeftSidebar id="left-sidebar" />
      <main id="main-content">
        <RouterView />
      </main>
      <RightSidebar id="right-sidebar" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterView } from 'vue-router'
import LeftSidebar from './components/LeftSidebar.vue'
import RightSidebar from './components/RightSidebar.vue'
import { useSettingsStore } from '@/stores/settingsStore'

const settingsStore = useSettingsStore()

// --- Theme Management ---
const appContainerClass = computed(() => {
  return {
    'dark-theme': settingsStore.theme === 'dark',
  }
})

// --- Header Logo Animation Logic ---
const logoText = ref('Nb4U-Ai')
const isHeaderActive = ref(false)
let idleFlickerInterval = null
let activeTimeout = null // Keep track of the active state timeout

// Function to apply random flicker classes
const applyFlicker = (intensity = 'low') => {
  // console.log(`[Debug Animation] applyFlicker called with intensity: ${intensity}`); // Keep logs commented unless debugging
  const logoElement = document.getElementById('header-logo')
  if (!logoElement) return
  const chars = logoElement.querySelectorAll('.header-char')
  if (chars.length === 0) return

  chars.forEach((char) => {
    char.className = char.className.replace(/ animate-flicker-\S+/g, '')
    const randomChance = Math.random()
    let flickerClass = ''
    if (intensity === 'high' && randomChance < 0.6) {
      flickerClass =
        randomChance < 0.1
          ? 'animate-flicker-fast-full'
          : randomChance < 0.3
            ? 'animate-flicker-basic'
            : 'animate-flicker-slow-partial'
    } else if (intensity === 'low' && randomChance < 0.15) {
      flickerClass =
        randomChance < 0.05 ? 'animate-flicker-slow-fade' : 'animate-flicker-slow-partial'
    }
    if (flickerClass) {
      char.classList.add(flickerClass)
      setTimeout(() => char.classList.remove(flickerClass), 1000)
    }
  })
}

// Start idle flicker effect
const startHeaderIdleFlicker = () => {
  // console.log('[Debug Animation] startHeaderIdleFlicker called.'); // Keep logs commented unless debugging
  stopHeaderIdleFlicker()
  idleFlickerInterval = setInterval(() => {
    if (!isHeaderActive.value) {
      applyFlicker('low')
    }
  }, 2500)
}

// Stop idle flicker effect
const stopHeaderIdleFlicker = () => {
  if (idleFlickerInterval) {
    clearInterval(idleFlickerInterval)
    idleFlickerInterval = null
  }
}

// Trigger active state
const triggerHeaderActiveAnimation = (durationMs = 500) => {
  // Shorter duration for keypress
  // console.log(`[Debug Animation] triggerHeaderActiveAnimation called for ${durationMs}ms.`); // Keep logs commented unless debugging
  isHeaderActive.value = true
  stopHeaderIdleFlicker()
  applyFlicker('high') // Initial burst
  const busyInterval = setInterval(() => applyFlicker('high'), 500)

  // Clear previous timeout if one exists, to extend duration on rapid triggers
  if (activeTimeout) {
    clearTimeout(activeTimeout)
  }

  // Automatically turn off active state after duration
  activeTimeout = setTimeout(() => {
    // console.log('[Debug Animation] triggerHeaderActiveAnimation: Timeout reached, deactivating.'); // Keep logs commented
    isHeaderActive.value = false
    clearInterval(busyInterval)
    startHeaderIdleFlicker() // Resume idle flicker
    activeTimeout = null // Clear the timeout ID tracker
  }, durationMs)
}

// --- NEW: Keypress Listener ---
const handleKeyPress = (event) => {
  // Check if focus is likely within an input/textarea to avoid triggering everywhere
  const activeElement = document.activeElement
  const isInputFocused =
    activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')

  if (isInputFocused) {
    const key = event.key.toLowerCase()
    // Trigger on Enter key
    if (key === 'enter') {
      triggerHeaderActiveAnimation(700) // Slightly longer flash for Enter
    }
    // Trigger on vowels
    else if (['a', 'e', 'i', 'o', 'u'].includes(key)) {
      triggerHeaderActiveAnimation(400) // Short flash for vowels
    }
  }
}

onMounted(() => {
  // console.log('[Debug Animation] App.vue onMounted: Setting up header flicker.'); // Keep logs commented
  startHeaderIdleFlicker()
  // Add keypress listener
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  // console.log('[Debug Animation] App.vue onUnmounted: Stopping header flicker.'); // Keep logs commented
  stopHeaderIdleFlicker()
  // Remove keypress listener
  window.removeEventListener('keydown', handleKeyPress)
  // Clear any pending timeout for active state
  if (activeTimeout) {
    clearTimeout(activeTimeout)
  }
})
// --- End Header Logo Animation Logic ---
</script>

<style>
/* Non-scoped for variables and keyframes */
/* --- CSS Variables Definition --- */
/* Default (Light Theme) Variables */
:root {
  --bg-app-container: #ffffff;
  --bg-sidebar: #f0f0f8;
  --bg-main-content: #ffffff;
  --bg-input-area: #f5f5f5;
  --bg-input-field: #ffffff;
  --bg-header: #ededf0;
  --bg-message-user: #0b57d0;
  --bg-message-ai: #e9e9eb;
  --bg-message-error: #ffebee;
  --bg-button-primary: #007bff;
  --bg-button-primary-hover: #0056b3;
  --bg-button-primary-flash: #8ec5fc;
  --bg-button-secondary: #d1d1d1;
  --bg-button-secondary-hover: #c0c0c0;
  --bg-button-listening: #ff4d4d;
  --bg-button-tts-on: #66bb6a;
  --bg-avatar-user: #0b57d0;
  --bg-avatar-ai: #757575;

  --text-primary: #333333;
  --text-secondary: #555555; /* Default secondary text */
  --text-header: #444444;
  --text-header-active: #111111;
  --text-light: #ffffff;
  --text-placeholder: #888888;
  --text-link: #1a0dab;
  --text-link-hover: #60076a;
  --text-error: #c62828;
  --text-message-user: #ffffff;
  --text-message-ai: #333333;
  --text-message-error: #c62828;
  --text-timestamp: #777777;
  --text-button-primary: #ffffff;
  --text-button-secondary: #333333;
  --text-button-listening: #ffffff;
  --text-button-tts-on: #ffffff;

  --border-color-light: #ccc;
  --border-color-medium: #aaa;
  --border-color-dark: #3a3a3a;
  --border-color-header: #d0d0d5;
  --border-color-error: #ffcdd2;

  --accent-color-primary: #0f0; /* Vibrant Green */
  --accent-shadow-primary: rgba(0, 255, 100, 0.8);
  --input-focus-shadow: 0 0 0 2px var(--accent-color-primary); /* Green focus */
  --header-shadow-idle: none;
  --header-shadow-active: 0 0 3px rgba(0, 0, 0, 0.3), 0 0 5px var(--accent-color-primary);
  --header-shadow-flicker: 0 0 5px rgba(0, 0, 0, 0.5), 0 0 10px var(--accent-color-primary);
}

/* Dark Theme Overrides */
.dark-theme {
  --bg-app-container: #1c1c1c;
  --bg-sidebar: #252525;
  --bg-main-content: #1a1a1a;
  --bg-input-area: #252525;
  --bg-input-field: #333;
  --bg-header: #252525;
  --bg-message-user: #005090;
  --bg-message-ai: #3a3a3a;
  --bg-message-error: #700;
  --bg-button-primary: #007bff;
  --bg-button-primary-hover: #0056b3;
  --bg-button-primary-flash: #58a6ff;
  --bg-button-secondary: #555;
  --bg-button-secondary-hover: #666;
  --bg-button-listening: #a00;
  --bg-button-tts-on: #388e3c;
  --bg-avatar-user: #005090;
  --bg-avatar-ai: #555;

  --text-primary: #eee;
  --text-secondary: #eee; /* **** UPDATED FOR BETTER CONTRAST **** */
  --text-header: #aaa;
  --text-header-active: #ddd;
  --text-light: #ffffff;
  --text-placeholder: #888;
  --text-link: #8ab4f8;
  --text-link-hover: #aecbfa;
  --text-error: #fcc;
  --text-message-user: #fff;
  --text-message-ai: #eee;
  --text-message-error: #fcc;
  --text-timestamp: #888;
  --text-button-primary: #ffffff;
  --text-button-secondary: #ffffff;
  --text-button-listening: #fff;
  --text-button-tts-on: #ffffff;

  --border-color-light: #555;
  --border-color-medium: #3a3a3a;
  --border-color-dark: #222;
  --border-color-header: #3a3a3a;
  --border-color-error: #a00;

  /* Green focus shadow remains the same */
  /* --input-focus-shadow: 0 0 0 2px var(--accent-color-primary); */
  --header-shadow-idle: none;
  --header-shadow-active: 0 0 3px rgba(255, 255, 255, 0.3), 0 0 5px var(--accent-color-primary);
  --header-shadow-flicker: 0 0 5px rgba(255, 255, 255, 0.7), 0 0 10px var(--accent-color-primary);
}
/* --- End CSS Variables Definition --- */

/* --- Header Animation Keyframes --- */
@keyframes basicFlicker {
  /* ... keyframes unchanged ... */
}
@keyframes slowPartialFlicker {
  /* ... keyframes unchanged ... */
}
@keyframes fastFullFlicker {
  /* ... keyframes unchanged ... */
}
@keyframes slowFadeFlicker {
  /* ... keyframes unchanged ... */
}
/* --- End Keyframes --- */
</style>

<style scoped>
/* Scoped styles - Mostly unchanged, relies on variables */
#app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  margin: 0;
  padding: 0;
  background-color: var(--bg-app-container);
  color: var(--text-primary);
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

/* Header Styles */
#main-header {
  height: 50px;
  background-color: var(--bg-header);
  border-bottom: 1px solid var(--border-color-header);
  display: flex;
  align-items: center;
  padding: 0 1rem;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
}

#header-logo {
  font-family: 'Courier New', Courier, monospace;
  font-size: 1.4em;
  font-weight: bold;
  cursor: default;
  user-select: none;
  display: inline-block;
}

.header-char {
  display: inline-block;
  opacity: 0.6;
  color: var(--text-header);
  text-shadow: var(--header-shadow-idle);
  transition:
    opacity 0.3s ease,
    color 0.2s ease,
    text-shadow 0.3s ease;
}

#header-logo.active .header-char {
  opacity: 0.85;
  color: var(--text-header-active);
  text-shadow: var(--header-shadow-active);
}

/* Apply animations */
.animate-flicker-basic {
  animation: basicFlicker 0.3s linear;
}
.animate-flicker-slow-partial {
  animation: slowPartialFlicker 0.8s linear;
}
.animate-flicker-fast-full {
  animation: fastFullFlicker 0.2s linear;
}
.animate-flicker-slow-fade {
  animation: slowFadeFlicker 1s linear;
}

/* Wrapper for main layout */
.main-layout-wrapper {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
}

#left-sidebar,
#right-sidebar {
  height: 100%;
  overflow-y: auto;
  flex-shrink: 0;
  background-color: var(--bg-sidebar);
  color: var(--text-secondary); /* Uses updated variable */
  border-color: var(--border-color-medium);
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
  padding: 1rem; /* Add some padding to sidebars */
}

#left-sidebar {
  width: 250px;
  border-right: 1px solid var(--border-color-medium);
}

#main-content {
  flex-grow: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-main-content);
  color: var(--text-primary);
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

#right-sidebar {
  width: 200px;
  border-left: 1px solid var(--border-color-medium);
}
</style>
