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
    // 'light-theme': settingsStore.theme === 'light', // Can explicitly add light-theme class if needed for specific overrides
  }
})

// --- Header Logo Animation Logic ---
const logoText = ref('Nb4U-Ai')
const isHeaderActive = ref(false)
let idleFlickerInterval = null
let activeTimeout = null // Keep track of the active state timeout

// Function to apply random flicker classes
const applyFlicker = (intensity = 'low') => {
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
      // Automatically remove class after a duration slightly longer than longest animation
      setTimeout(() => char.classList.remove(flickerClass), 1100)
    }
  })
}

// Start idle flicker effect
const startHeaderIdleFlicker = () => {
  stopHeaderIdleFlicker() // Ensure no duplicates
  idleFlickerInterval = setInterval(() => {
    if (!isHeaderActive.value) {
      applyFlicker('low')
    }
  }, 2500) // Interval between idle flickers
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
  isHeaderActive.value = true
  stopHeaderIdleFlicker() // Stop idle flicker during active state
  applyFlicker('high') // Initial burst of flicker
  const busyInterval = setInterval(() => applyFlicker('high'), 500) // Continuous high flicker

  // Clear previous timeout if one exists, to extend duration on rapid triggers
  if (activeTimeout) {
    clearTimeout(activeTimeout)
  }

  // Automatically turn off active state after duration
  activeTimeout = setTimeout(() => {
    isHeaderActive.value = false
    clearInterval(busyInterval) // Stop the busy flicker
    startHeaderIdleFlicker() // Resume idle flicker
    activeTimeout = null // Clear the timeout ID tracker
  }, durationMs)
}

// --- Keypress Listener ---
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
  startHeaderIdleFlicker()
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  stopHeaderIdleFlicker()
  window.removeEventListener('keydown', handleKeyPress)
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
  --bg-message-user: #0b57d0; /* Google blue */
  --bg-message-ai: #e9e9eb;
  --bg-message-error: #ffebee;
  --bg-button-primary: #007bff; /* Bootstrap blue */
  --bg-button-primary-hover: #0056b3;
  --bg-button-primary-flash: #8ec5fc;
  --bg-button-secondary: #d1d1d1;
  --bg-button-secondary-hover: #c0c0c0;
  --bg-button-listening: #ff4d4d; /* Red */
  --bg-button-tts-on: #66bb6a; /* Green */
  --bg-avatar-user: #0b57d0;
  --bg-avatar-ai: #757575;

  --text-primary: #333333;
  --text-secondary: #555555; /* Default secondary text */
  --text-header: #444444;
  --text-header-active: #111111;
  --text-light: #ffffff;
  --text-placeholder: #888888;
  --text-link: #1a0dab; /* Google link color */
  --text-link-hover: #60076a; /* Darker purple */
  --text-error: #c62828; /* Dark red */
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

  /* --- MODIFIED FOR LIGHT THEME CONTRAST --- */
  --accent-color-primary: #1e8449; /* Darker Green for light mode */
  /* --- END MODIFICATION --- */

  --accent-shadow-primary: rgba(30, 132, 73, 0.8); /* Adjusted shadow to match darker green */
  /* Use darker green for focus shadow in light mode */
  --input-focus-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
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
  --bg-message-user: #005090; /* Kept deep blue */
  --bg-message-ai: #3a3a3a;
  --bg-message-error: #700; /* Dark red */
  --bg-button-primary: #007bff; /* Keep primary blue */
  --bg-button-primary-hover: #0056b3;
  --bg-button-primary-flash: #58a6ff; /* Lighter blue flash */
  --bg-button-secondary: #555;
  --bg-button-secondary-hover: #666;
  --bg-button-listening: #a00; /* Darker red */
  --bg-button-tts-on: #388e3c; /* Darker green */
  --bg-avatar-user: #005090;
  --bg-avatar-ai: #555;

  --text-primary: #eee;
  --text-secondary: #aaa; /* Lighter secondary for dark */
  --text-header: #aaa;
  --text-header-active: #ddd;
  --text-light: #ffffff;
  --text-placeholder: #888;
  --text-link: #8ab4f8; /* Google blue for links */
  --text-link-hover: #aecbfa;
  --text-error: #fcc; /* Light red for errors */
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

  /* --- Ensure Dark Theme uses VIBRANT Green --- */
  --accent-color-primary: #0f0; /* Vibrant Green for dark mode */
  /* --- END --- */
  --accent-shadow-primary: rgba(0, 255, 100, 0.8); /* Vibrant shadow */
  /* Use vibrant green for focus shadow in dark mode */
  --input-focus-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
  --header-shadow-idle: none;
  --header-shadow-active: 0 0 3px rgba(255, 255, 255, 0.3), 0 0 5px var(--accent-color-primary);
  --header-shadow-flicker: 0 0 5px rgba(255, 255, 255, 0.7), 0 0 10px var(--accent-color-primary);
}
/* --- End CSS Variables Definition --- */

/* --- Header Animation Keyframes --- */
@keyframes basicFlicker {
  0%,
  100% {
    opacity: inherit;
    text-shadow: var(--header-shadow-idle);
  }
  50% {
    opacity: 0.7;
    text-shadow: var(--header-shadow-flicker);
  }
}
@keyframes slowPartialFlicker {
  0%,
  10%,
  90%,
  100% {
    opacity: inherit;
    text-shadow: var(--header-shadow-idle);
  }
  30%,
  70% {
    opacity: 0.5;
    text-shadow: var(--header-shadow-active);
  }
  50% {
    opacity: 0.9;
    text-shadow: var(--header-shadow-flicker);
  }
}
@keyframes fastFullFlicker {
  0%,
  100% {
    opacity: inherit;
    text-shadow: var(--header-shadow-idle);
  }
  25% {
    opacity: 0.3;
    text-shadow: var(--header-shadow-flicker);
  }
  50% {
    opacity: 0.9;
    text-shadow: var(--header-shadow-active);
  }
  75% {
    opacity: 0.5;
    text-shadow: var(--header-shadow-flicker);
  }
}
@keyframes slowFadeFlicker {
  0%,
  100% {
    opacity: inherit;
    text-shadow: var(--header-shadow-idle);
  }
  50% {
    opacity: 0.4;
    text-shadow: var(--header-shadow-idle);
  }
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
  overflow: hidden; /* Prevent body scroll */
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
  height: 50px; /* Fixed header height */
  background-color: var(--bg-header);
  border-bottom: 1px solid var(--border-color-header);
  display: flex;
  align-items: center;
  padding: 0 1rem;
  flex-shrink: 0; /* Prevent header shrinking */
  position: relative;
  z-index: 10; /* Keep header above content */
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
  -webkit-user-select: none; /* Safari */
  -moz-user-select: none; /* Firefox */
  -ms-user-select: none; /* IE */
  display: inline-block; /* Needed for individual char animations */
}

.header-char {
  display: inline-block; /* Allow animation */
  opacity: 0.6; /* Dimmer when idle */
  color: var(--text-header);
  text-shadow: var(--header-shadow-idle);
  transition:
    opacity 0.3s ease,
    color 0.2s ease,
    text-shadow 0.3s ease;
}

#header-logo.active .header-char {
  opacity: 0.85; /* Brighter when active */
  color: var(--text-header-active);
  text-shadow: var(--header-shadow-active);
}

/* Apply animations via classes */
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

/* Wrapper for main layout (sidebars + content) */
.main-layout-wrapper {
  display: flex;
  flex-grow: 1; /* Take remaining vertical space */
  overflow: hidden; /* Prevent content overflow from causing body scroll */
}

#left-sidebar,
#right-sidebar {
  /* height: 100%; */ /* Let flexbox handle height */
  overflow-y: auto; /* Allow scrolling within sidebars */
  flex-shrink: 0; /* Prevent sidebars shrinking */
  background-color: var(--bg-sidebar);
  color: var(--text-secondary); /* Base text color for sidebars */
  border-color: var(--border-color-medium);
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
  padding: 1rem; /* Default padding */
}

#left-sidebar {
  width: 250px;
  border-right: 1px solid var(--border-color-medium);
}

#main-content {
  flex-grow: 1; /* Take remaining horizontal space */
  /* height: 100%; */ /* Let flexbox handle height */
  display: flex; /* Use flex for router-view */
  flex-direction: column; /* Stack elements within main */
  background-color: var(--bg-main-content);
  color: var(--text-primary);
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
  overflow: hidden; /* Prevent internal scroll */
}

/* Ensure RouterView content within main-content can scroll if needed */
#main-content > :deep(div) {
  /* Target immediate child div (usually the view component) */
  height: 100%;
  overflow-y: auto;
}

#right-sidebar {
  width: 200px;
  border-left: 1px solid var(--border-color-medium);
}
</style>
