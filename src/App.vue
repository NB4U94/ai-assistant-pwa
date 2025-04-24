<template>
  <div id="app-container" :class="appContainerClass" :style="appStyle">
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import LeftSidebar from './components/LeftSidebar.vue'
import RightSidebar from './components/RightSidebar.vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useConversationStore } from '@/stores/conversationStore' // *** NEW: Import Conversation Store ***
import { storeToRefs } from 'pinia'

const settingsStore = useSettingsStore()
const conversationStore = useConversationStore() // *** NEW: Get Conversation Store instance ***

const { theme, appFontSize } = storeToRefs(settingsStore)

// *** Sidebar State ***
const isSidebarOpen = ref(true) // Default to open
const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

// --- Theme Management ---
const appContainerClass = computed(() => {
  return {
    'dark-theme': theme.value === 'dark',
    'left-sidebar-closed-app': !isSidebarOpen.value,
  }
})

// --- Dynamic App Style for Font Size ---
const appStyle = computed(() => ({
  fontSize: `${appFontSize.value}%`,
}))

// --- Header Logo Animation Logic ---
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
      setTimeout(() => char.classList.remove(flickerClass), 1100)
    }
  })
}

const startHeaderIdleFlicker = () => {
  stopHeaderIdleFlicker()
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
  const busyInterval = setInterval(() => applyFlicker('high'), 500)

  if (activeTimeout) {
    clearTimeout(activeTimeout)
  }

  activeTimeout = setTimeout(() => {
    isHeaderActive.value = false
    clearInterval(busyInterval)
    startHeaderIdleFlicker()
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
      triggerHeaderActiveAnimation(700)
    } else if (['a', 'e', 'i', 'o', 'u'].includes(key)) {
      triggerHeaderActiveAnimation(400)
    }
  }
}

// *** NEW: Handler for beforeunload event ***
const handleBeforeUnload = () => {
  console.log('[App.vue] beforeunload event triggered. Saving conversation...')
  conversationStore.saveActiveConversationToMemories()
  // Note: You cannot prevent the user from leaving the page here in most modern browsers.
  // This just ensures the save action is called.
}

onMounted(() => {
  startHeaderIdleFlicker()
  window.addEventListener('keydown', handleKeyPress)
  // *** NEW: Add beforeunload listener ***
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  stopHeaderIdleFlicker()
  window.removeEventListener('keydown', handleKeyPress)
  if (activeTimeout) {
    clearTimeout(activeTimeout)
  }
  // *** NEW: Remove beforeunload listener ***
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
// --- End Header Logo Animation Logic ---
</script>

<style>
/* Global styles (Variables, Keyframes) */
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
  --text-secondary: #555555;
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
  --accent-color-primary: #1e8449;
  --accent-shadow-primary: rgba(30, 132, 73, 0.8);
  --input-focus-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
  --header-shadow-idle: none;
  --header-shadow-active: 0 0 3px rgba(0, 0, 0, 0.3), 0 0 5px var(--accent-color-primary);
  --header-shadow-flicker: 0 0 5px rgba(0, 0, 0, 0.5), 0 0 10px var(--accent-color-primary);
  --sidebar-width-open: 250px;
  --sidebar-width-closed: 60px;
}

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
  --text-secondary: #aaa;
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
  --accent-color-primary: #0f0;
  --accent-shadow-primary: rgba(0, 255, 100, 0.8);
  --input-focus-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
  --header-shadow-idle: none;
  --header-shadow-active: 0 0 3px rgba(255, 255, 255, 0.3), 0 0 5px var(--accent-color-primary);
  --header-shadow-flicker: 0 0 5px rgba(255, 255, 255, 0.7), 0 0 10px var(--accent-color-primary);
}
/* Header Animation Keyframes */
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
  /* Font size transition can be added if desired */
  /* transition: font-size 0.2s ease; */
}

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
  gap: 1rem;
}

.hamburger-button {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
}
.hamburger-button span {
  display: block;
  width: 20px;
  height: 2px;
  background-color: var(--text-secondary);
  border-radius: 1px;
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}
.hamburger-button:hover span {
  background-color: var(--text-primary);
}

/* Header Logo & Animation Styles */
#header-logo {
  font-family: 'Orbitron', sans-serif; /* Example font */
  font-size: 1.4em;
  font-weight: 600;
  color: var(--text-header);
  text-shadow: var(--header-shadow-idle);
  transition:
    text-shadow 0.5s ease,
    color 0.3s ease;
  user-select: none;
  display: inline-block; /* Needed for potential transforms/animations */
}
.header-char {
  display: inline-block; /* Allow transforms */
  transition:
    opacity 0.5s ease,
    transform 0.3s ease;
  color: inherit; /* Inherit color from #header-logo */
}
#header-logo.active {
  color: var(--text-header-active);
  text-shadow: var(--header-shadow-active);
}
#header-logo.active .header-char {
  /* Add active char styles if any */
}
.animate-flicker-basic {
  animation: basicFlicker 0.8s linear infinite alternate;
}
.animate-flicker-slow-partial {
  animation: slowPartialFlicker 1.5s ease-in-out infinite alternate;
}
.animate-flicker-fast-full {
  animation: fastFullFlicker 0.3s linear infinite alternate;
}
.animate-flicker-slow-fade {
  animation: slowFadeFlicker 2s ease infinite alternate;
}

.header-spacer {
  flex-grow: 1;
}

.main-layout-wrapper {
  display: flex;
  flex-grow: 1;
  overflow: hidden; /* Keep this to prevent wrapper itself from scrolling */
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
    width 0.3s ease;
  padding: 1rem;
  box-sizing: border-box;
}

#left-sidebar {
  width: var(--sidebar-width-open);
  border-right: 1px solid var(--border-color-medium);
}

#left-sidebar.sidebar-closed {
  width: var(--sidebar-width-closed);
  padding: 1rem 0.5rem;
}

#main-content {
  flex-grow: 1;
  display: flex; /* Keep display: flex if view roots need flex context */
  flex-direction: column; /* Keep if view roots need flex context */
  background-color: var(--bg-main-content);
  color: var(--text-primary);
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
  overflow-y: auto; /* Let's try adding scroll handling here */
}

#right-sidebar {
  width: 200px; /* Consider making this a CSS variable */
  border-left: 1px solid var(--border-color-medium);
}
</style>
