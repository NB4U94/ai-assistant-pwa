<template>
  <div class="left-sidebar-content">
    <h2 class="sidebar-title">Main Menu</h2>

    <button
      class="new-chat-button"
      @click="handleNewChat"
      title="Start a new chat with the current AI/Assistant"
    >
      <svg
        class="new-chat-icon"
        xmlns="http://www.w3.org/2000/svg"
        height="24px"
        viewBox="0 0 24 24"
        width="24px"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M0 0h24v24H0V0z" fill="none" />
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
      </svg>
      <span class="link-text">New Chat</span>
    </button>

    <nav class="main-menu">
      <ul>
        <li>
          <RouterLink to="/">
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
                d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"
              />
            </svg>
            <span class="link-text">Chat</span>
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/image-gen">
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
                d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
              />
            </svg>
            <span class="link-text">Image Gen</span>
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/assistants">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              enable-background="new 0 0 24 24"
              height="24px"
              viewBox="0 0 24 24"
              width="24px"
              fill="currentColor"
              aria-hidden="true"
            >
              <g><rect fill="none" height="24" width="24" /></g>
              <g>
                <g>
                  <path
                    d="M19,7h-1V5h-4v2h-4V5H6v2H5C3.9,7,3,7.9,3,9v10c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V9C21,7.9,20.1,7,19,7z M5,19V9h14v10H5z"
                  />
                  <circle cx="16.5" cy="11.5" r="1.5" />
                  <circle cx="7.5" cy="11.5" r="1.5" />
                  <path d="M7.5,16.5h9v-1.5h-9V16.5z" />
                </g>
              </g>
            </svg>
            <span class="link-text">Assistants</span>
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/memories">
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
                d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8H12z"
              />
            </svg>
            <span class="link-text">Memories</span>
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/settings">
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
                d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73s-.01.42-.05.73l-.14 1.09.83.64.83.64-1 1.73-1.09-.44-1.09-.44-.5.38c-.25.19-.53.35-.81-.48l-1.13.45-.16 1.13L14 18H9.97l-.16-1.13-1.13-.45c-.29-.12-.56-.29-.81-.48l-.5-.38-1.09.44-1.09.44-1-1.73.83-.64.83-.64-.14-1.09c-.04-.31-.05-.52-.05-.73s.01-.42.05-.73l.14-1.09-.83-.64-.83-.64 1-1.73 1.09.44 1.09.44.5-.38c.25-.19.53-.35.81-.48l1.13-.45.16-1.13L9.97 6h4.05l.16 1.13 1.13.45c.29.12.56.29.81.48l.5.38 1.09-.44 1.09-.44 1 1.73-.83.64-.83.64.14 1.09zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"
              />
            </svg>
            <span class="link-text">Settings</span>
          </RouterLink>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { useConversationStore } from '@/stores/conversationStore'
// *** Import storeToRefs to get reactive access to state ***
import { storeToRefs } from 'pinia'

const conversationStore = useConversationStore()
const router = useRouter()

// *** Get reactive access to activeSessionId ***
const { activeSessionId } = storeToRefs(conversationStore)

const handleNewChat = async () => {
  // *** Get the current session ID BEFORE saving/resetting ***
  const currentId = activeSessionId.value
  console.log(`[LeftSidebar] New Chat clicked. Current session ID: ${currentId}. Saving session...`)

  try {
    // 1. Save the current conversation
    await conversationStore.saveActiveConversationToMemories()
    console.log('[LeftSidebar] Current session saved.')

    // 2. Reset the chat view for the *same* session ID (main_chat or assistant)
    // setActiveSession handles clearing messages and loadedMemoryId
    console.log(`[LeftSidebar] Resetting session view for ID: ${currentId}...`)
    conversationStore.setActiveSession(currentId) // Pass the ID we captured earlier

    // 3. Navigate to chat view if not already there
    if (router.currentRoute.value.path !== '/') {
      console.log('[LeftSidebar] Navigating to chat view...')
      router.push('/')
    }
  } catch (error) {
    console.error('[LeftSidebar] Error during handleNewChat:', error)
    // Optional: Add user feedback about the error
  }
}
</script>

<style scoped>
/* Styles are identical to the previous version - No changes needed */
/* --- Animation Definitions --- */
@keyframes plasma-highlight-pulse {
  0%,
  100% {
    opacity: 0.6;
    box-shadow: 0 0 4px 1px color-mix(in srgb, var(--accent-color-primary) 40%, transparent);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 8px 2px color-mix(in srgb, var(--accent-color-primary) 60%, transparent);
  }
}
@keyframes faint-title-glow {
  0%,
  100% {
    text-shadow: 0 0 3px color-mix(in srgb, var(--accent-color-primary) 20%, transparent);
  }
  50% {
    text-shadow: 0 0 6px color-mix(in srgb, var(--accent-color-primary) 35%, transparent);
  }
}
@keyframes faint-icon-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 1px color-mix(in srgb, var(--accent-color-primary) 50%, transparent));
  }
  50% {
    filter: drop-shadow(0 0 3px color-mix(in srgb, var(--accent-color-primary) 70%, transparent));
  }
}
@keyframes active-icon-glow {
  from {
    filter: drop-shadow(0 0 2px var(--accent-color-primary))
      drop-shadow(0 0 4px color-mix(in srgb, var(--accent-color-primary) 50%, transparent));
  }
  to {
    filter: drop-shadow(0 0 2px var(--accent-color-primary))
      drop-shadow(0 0 4px color-mix(in srgb, var(--accent-color-primary) 50%, transparent));
  }
}

/* --- Component Styles --- */
.left-sidebar-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}
h2.sidebar-title {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: color-mix(in srgb, var(--text-light) 95%, var(--text-secondary));
  font-family: sans-serif;
  text-align: center;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  flex-shrink: 0;
  animation: faint-title-glow 3s infinite ease-in-out alternate;
}

/* --- New Chat Button --- */
.new-chat-button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0.6rem 1rem;
  margin: 0 0.5rem 1.5rem 0.5rem;
  text-decoration: none;
  color: var(--text-secondary);
  background-color: transparent;
  border: 1px solid var(--border-color-light);
  border-radius: 6px;
  font-family: sans-serif;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
  outline: none;
  font-weight: 500;
  text-align: left;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.new-chat-button svg.new-chat-icon {
  width: 20px;
  height: 20px;
  fill: var(--accent-color-primary);
  flex-shrink: 0;
  animation: faint-icon-glow 2.5s infinite ease-in-out alternate;
}
.new-chat-button:hover:not(:disabled) {
  color: var(--text-primary);
  background-color: color-mix(in srgb, var(--accent-color-primary) 10%, transparent);
  border-color: var(--border-color-medium);
}
.new-chat-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* --- Main Menu --- */
.main-menu ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.main-menu li {
  margin-bottom: 0.2rem;
}
.main-menu a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0.6rem 1rem;
  margin: 0 0.5rem;
  text-decoration: none;
  color: var(--text-secondary);
  font-family: sans-serif;
  border-radius: 6px;
  background-color: transparent;
  transition: color 0.2s ease;
  position: relative;
  outline: none;
  box-shadow: none;
  overflow: hidden;
  white-space: nowrap;
}
.main-menu a svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
  flex-shrink: 0;
  transition:
    fill 0.2s ease,
    filter 0.3s ease;
  filter: none;
}
.link-text {
  flex-grow: 1;
}
.main-menu a::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--accent-color-primary);
  border-radius: inherit;
  opacity: 0;
  z-index: -1;
  transition: opacity 0.3s ease;
  box-shadow: none;
  animation: none;
}
.main-menu a:hover {
  color: var(--text-light);
}
.main-menu a:hover::after {
  opacity: 0.15;
  animation: plasma-highlight-pulse 1.5s infinite ease-in-out;
}
.main-menu a.router-link-active {
  color: var(--text-light);
}
.main-menu a.router-link-active::after {
  opacity: 0;
  animation: none;
}
.main-menu a.router-link-active svg {
  fill: var(--accent-color-primary);
  filter: drop-shadow(0 0 2px var(--accent-color-primary))
    drop-shadow(0 0 4px color-mix(in srgb, var(--accent-color-primary) 50%, transparent));
}
.main-menu a.router-link-active:hover::after {
  opacity: 0.15;
  animation: plasma-highlight-pulse 1.5s infinite ease-in-out;
}

/* --- Focus Visible --- */
.main-menu a:focus-visible {
  outline: 2px solid var(--accent-color-primary);
  outline-offset: -2px;
  background-color: color-mix(in srgb, var(--accent-color-primary) 10%, transparent);
  color: var(--text-light);
}
.new-chat-button:focus-visible {
  outline: 2px solid var(--accent-color-primary);
  outline-offset: 1px;
  border-color: var(--accent-color-primary);
}

/* --- Collapsed Styles --- */
#left-sidebar.sidebar-closed .main-menu a .link-text,
#left-sidebar.sidebar-closed .new-chat-button .link-text {
  display: none;
}
#left-sidebar.sidebar-closed .main-menu a,
#left-sidebar.sidebar-closed .new-chat-button {
  justify-content: center;
  padding: 0.6rem 0;
  gap: 0;
  margin-left: 0.25rem;
  margin-right: 0.25rem;
}
#left-sidebar.sidebar-closed h2 {
  display: none;
}
#left-sidebar.sidebar-closed .new-chat-button {
  width: auto;
  padding: 0.6rem;
}
</style>
