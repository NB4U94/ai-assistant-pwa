<template>
  <div id="app-container" :class="appContainerClass">
    <header id="main-header">
      <button @click="toggleSidebar" class="hamburger-button" aria-label="Toggle Menu">
        <span></span> <span></span>
        <span></span>
      </button>
      <div id="header-logo" :class="{ active: isHeaderActive }">
        <span
          v-for="(char, index) in logoText"
          :key="index"
          :class="['header-char', `char-${index}`]"
        >
          {{ char }}
        </span>
      </div>
      <div class="header-spacer"></div>
    </header>

    <div class="main-layout-wrapper">
      <LeftSidebar id="left-sidebar" :class="{ 'sidebar-closed': !isSidebarOpen }" />
      <main id="main-content"><RouterView /></main>
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

// *** NEW: Sidebar State ***
const isSidebarOpen = ref(true) // Default to open

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}
// *** END NEW ***

// --- Theme Management ---
const appContainerClass = computed(() => {
  return {
    'dark-theme': settingsStore.theme === 'dark',
    // 'light-theme': settingsStore.theme === 'light',
    'left-sidebar-closed-app': !isSidebarOpen.value, // Check if this class is used globally
  }
})

// --- Header Logo Animation Logic --- (No change)
const logoText = ref('Nb4U-Ai')
const isHeaderActive = ref(false)
let idleFlickerInterval = null
let activeTimeout = null

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
      // Use requestAnimationFrame for potentially smoother removal timing, though setTimeout is likely fine
      setTimeout(() => char.classList.remove(flickerClass), 1100)
    }
  })
}

const startHeaderIdleFlicker = () => {
  stopHeaderIdleFlicker() // Ensure no duplicates
  idleFlickerInterval = setInterval(() => {
    if (!isHeaderActive.value) {
      applyFlicker('low')
    }
  }, 2500)
}

const stopHeaderIdleFlicker = () => {
  if (idleFlickerInterval) {
    clearInterval(idleFlickerInterval)
    idleFlickerInterval = null
  }
}

const triggerHeaderActiveAnimation = (durationMs = 500) => {
  isHeaderActive.value = true
  stopHeaderIdleFlicker()
  applyFlicker('high')
  const busyInterval = setInterval(() => applyFlicker('high'), 500) // Flicker more often when active

  // Clear existing timeout if triggered again quickly
  if (activeTimeout) {
    clearTimeout(activeTimeout)
  }

  activeTimeout = setTimeout(() => {
    isHeaderActive.value = false
    clearInterval(busyInterval)
    startHeaderIdleFlicker() // Resume idle flicker
    activeTimeout = null
  }, durationMs)
}

const handleKeyPress = (event) => {
  const activeElement = document.activeElement
  const isInputFocused =
    activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')

  if (isInputFocused) {
    const key = event.key.toLowerCase()
    if (key === 'enter') {
      triggerHeaderActiveAnimation(700) // Longer animation on Enter
    } else if (['a', 'e', 'i', 'o', 'u'].includes(key)) {
      triggerHeaderActiveAnimation(400) // Shorter animation on vowels
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
  // Clear timeout on unmount as well
  if (activeTimeout) {
    clearTimeout(activeTimeout)
  }
})
// --- End Header Logo Animation Logic ---
</script>

<style>
/* Non-scoped global styles (Variables, Keyframes) remain the same */
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

  /* *** NEW: Sidebar Width Variables *** */
  --sidebar-width-open: 250px;
  --sidebar-width-closed: 60px; /* Adjust as needed for icon size */
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
/* (Assuming these are correct and unchanged) */
@keyframes basicFlicker {
  /* ... */
}
@keyframes slowPartialFlicker {
  /* ... */
}
@keyframes fastFullFlicker {
  /* ... */
}
@keyframes slowFadeFlicker {
  /* ... */
}
/* --- End Keyframes --- */
</style>

<style scoped>
/* Scoped styles */
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
  gap: 1rem; /* Add gap for items */
}

/* *** NEW: Hamburger Button Styles *** */
.hamburger-button {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  width: 30px; /* Adjust size */
  height: 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
}
.hamburger-button span {
  display: block;
  width: 20px; /* Line width */
  height: 2px; /* Line thickness */
  background-color: var(--text-secondary); /* Use secondary text color */
  border-radius: 1px;
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}
.hamburger-button:hover span {
  background-color: var(--text-primary);
}
/* Add animation for burger -> X (optional) */

/* Header Logo Styles */
/* (Assuming these are correct and unchanged) */
#header-logo {
  /* ... */
}
.header-char {
  /* ... */
}
#header-logo.active .header-char {
  /* ... */
}
.animate-flicker-basic {
  /* ... */
}
.animate-flicker-slow-partial {
  /* ... */
}
.animate-flicker-fast-full {
  /* ... */
}
.animate-flicker-slow-fade {
  /* ... */
}

/* *** NEW: Header Spacer *** */
.header-spacer {
  flex-grow: 1; /* Pushes items to the right */
}

/* Wrapper for main layout */
.main-layout-wrapper {
  display: flex;
  flex-grow: 1;
  overflow: hidden; /* Important to contain flex items */
}

#left-sidebar,
#right-sidebar {
  overflow-y: auto;
  flex-shrink: 0;
  background-color: var(--bg-sidebar);
  color: var(--text-secondary);
  border-color: var(--border-color-medium);
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease,
    width 0.3s ease; /* Add width transition */
  padding: 1rem;
  box-sizing: border-box; /* Include padding in width calculation */
}

#left-sidebar {
  width: var(--sidebar-width-open); /* Use variable */
  border-right: 1px solid var(--border-color-medium);
}

/* *** NEW: Styles for Closed Sidebar *** */
#left-sidebar.sidebar-closed {
  width: var(--sidebar-width-closed); /* Use variable */
  padding: 1rem 0.5rem; /* Adjust padding when closed */
}

#main-content {
  flex-grow: 1;
  display: flex; /* Ensure it behaves as a flex item */
  flex-direction: column; /* Stack child elements (like RouterView) vertically */
  background-color: var(--bg-main-content);
  color: var(--text-primary);
  /* Remove margin-left transition - rely on flexbox */
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
  overflow: hidden; /* Hide overflow from main content area itself */
}

/* Remove unnecessary margin adjustment rule */
/* #main-content.sidebar-closed { */
/* margin-left: var(--sidebar-width-closed); */
/* } */

/* Adjust the router view container styling */
#main-content > :deep(div), /* If router view renders a div */
#main-content > :deep(section) /* Or if it renders a section, etc. */ {
  height: 100%; /* Make the view container fill main-content */
  width: 100%;
  overflow-y: auto; /* Allow the *view* to scroll if its content overflows */
  box-sizing: border-box; /* Include padding if view adds its own */
}

#right-sidebar {
  width: 200px; /* Consider making this a variable too */
  border-left: 1px solid var(--border-color-medium);
}
</style>
