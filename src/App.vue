<template>
  <div id="app-container" :class="appContainerClass" :style="appStyle">
    <header id="main-header">
      <button
        @click="toggleLeftSidebar"
        class="hamburger-button header-button"
        aria-label="Toggle Menu"
      >
        <span></span> <span></span> <span></span>
      </button>

      <div id="header-logo">
        <span
          v-for="(char, index) in logoText"
          :key="index"
          :class="['header-char', `char-${index}`]"
        >
          {{ char }}
        </span>
      </div>

      <button
        v-if="showRightSidebarAndToggle"
        @click="toggleRightSidebar"
        class="settings-button header-button"
        aria-label="Toggle Quick Options Panel"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 0 24 24"
          width="24px"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M0 0h24v24H0V0z" fill="none" />
          <path
            d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"
          />
        </svg>
      </button>
    </header>

    <div class="main-layout-wrapper">
      <LeftSidebar id="left-sidebar" :class="{ 'sidebar-closed': !isLeftSidebarOpen }" />
      <main id="main-content"><RouterView /></main>
      <RightSidebar
        v-if="showRightSidebarAndToggle"
        id="right-sidebar"
        :class="{ 'sidebar-closed': !isRightSidebarOpen }"
      />
    </div>
  </div>
</template>

<script setup>
// Script setup content remains the same as response #49
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import LeftSidebar from './components/LeftSidebar.vue'
import RightSidebar from './components/RightSidebar.vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useConversationStore } from '@/stores/conversationStore'
import { storeToRefs } from 'pinia'

const settingsStore = useSettingsStore()
const conversationStore = useConversationStore()
const route = useRoute()

const { theme, appFontSize } = storeToRefs(settingsStore)

// Left Sidebar State
const isLeftSidebarOpen = ref(true)
const toggleLeftSidebar = () => {
  isLeftSidebarOpen.value = !isLeftSidebarOpen.value
}

// Right Sidebar State
const isRightSidebarOpen = ref(true)
const toggleRightSidebar = () => {
  isRightSidebarOpen.value = !isRightSidebarOpen.value
}

// Computed property to control Right Sidebar visibility
const showRightSidebarAndToggle = computed(() => {
  return route.path !== '/settings'
})

// Theme Management
const appContainerClass = computed(() => {
  return {
    'dark-theme': theme.value === 'dark',
    'left-sidebar-closed-app': !isLeftSidebarOpen.value,
    'right-sidebar-hidden-app': !showRightSidebarAndToggle.value || !isRightSidebarOpen.value,
  }
})

// Dynamic App Style for Font Size
const appStyle = computed(() => ({
  fontSize: `${appFontSize.value}%`,
}))

// Header Logo Text
const logoText = ref('Nb4U-Ai')

// Before Unload Handler
const handleBeforeUnload = () => {
  console.log('[App.vue] beforeunload event triggered. Saving conversation...')
  conversationStore.saveActiveConversationToMemories()
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style>
/* Global styles (Variables) - Unchanged */
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
  /* Removed unused shadow variables */
  --sidebar-left-width-open: 250px;
  --sidebar-left-width-closed: 60px;
  --sidebar-right-width-open: 200px;
  --sidebar-right-width-closed: 0px;
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
  /* Removed unused shadow variables */
}

/* --- Animations --- */
@keyframes faintGreenPulse {
  0%,
  100% {
    filter: drop-shadow(0 0 1px color-mix(in srgb, var(--accent-color-primary) 50%, transparent));
  }
  50% {
    filter: drop-shadow(0 0 3px color-mix(in srgb, var(--accent-color-primary) 70%, transparent));
  }
}
@keyframes faintTextGlow {
  0%,
  100% {
    text-shadow: 0 0 3px color-mix(in srgb, var(--accent-color-primary) 30%, transparent);
  }
  50% {
    text-shadow: 0 0 6px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
  }
}
/* Removed unused flicker keyframes */
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
  justify-content: space-between;
}

/* Shared style for header buttons */
.header-button {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  flex-shrink: 0;
  z-index: 1;
  animation: faintGreenPulse 3s infinite alternate ease-in-out;
}
.header-button:hover {
  color: var(--text-primary);
}
.header-button svg {
  width: 22px;
  height: 22px;
}

/* Hamburger specific styles */
.hamburger-button {
  flex-direction: column;
  justify-content: space-around;
}
.hamburger-button span {
  display: block;
  width: 20px;
  height: 1.5px;
  background-color: currentColor;
  border-radius: 1px;
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

/* Settings button specific styles */
.settings-button {
  animation-duration: 3.5s;
}

/* Header Logo */
#header-logo {
  position: absolute;
  left: 50%;
  top: 48%;
  transform: translate(-50%, -50%);
  font-family: 'Orbitron', sans-serif;
  font-size: 1.6em;
  font-weight: 600;
  color: var(--text-light);
  text-shadow: none;
  transition: none;
  user-select: none;
  display: inline-block;
  animation: faintTextGlow 3.2s infinite alternate ease-in-out;
}
.header-char {
  display: inline-block;
  color: inherit;
}
/* --- REMOVED OBSOLETE/EMPTY RULES for flicker animation --- */
/* #header-logo.active { ... } */
/* #header-logo.active .header-char { ... } */
/* .animate-flicker-basic { ... } */
/* .animate-flicker-slow-partial { ... } */
/* .animate-flicker-fast-full { ... } */
/* .animate-flicker-slow-fade { ... } */

/* Layout Wrapper and Content (Unchanged) */
.main-layout-wrapper {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
}
#main-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-main-content);
  color: var(--text-primary);
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
  overflow-y: auto;
}

/* Sidebars Base Styles (Unchanged) */
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
    width 0.3s ease,
    padding 0.3s ease,
    opacity 0.3s ease,
    min-width 0.3s ease;
  padding: 1rem;
  box-sizing: border-box;
  opacity: 1;
}

/* Left Sidebar Specifics (Unchanged) */
#left-sidebar {
  width: var(--sidebar-left-width-open);
  border-right: 1px solid var(--border-color-medium);
}
#left-sidebar.sidebar-closed {
  width: var(--sidebar-left-width-closed);
  padding: 1rem 0.5rem;
}

/* Right Sidebar Specifics (Unchanged) */
#right-sidebar {
  width: var(--sidebar-right-width-open);
  border-left: 1px solid var(--border-color-medium);
}
#right-sidebar.sidebar-closed {
  width: var(--sidebar-right-width-closed);
  min-width: 0;
  padding: 0;
  border-left: none;
  overflow: hidden;
  opacity: 0;
}

/* --- REMOVED empty rule --- */
/* .right-sidebar-hidden-app #main-content { ... } */
</style>
