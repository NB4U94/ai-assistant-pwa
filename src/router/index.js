// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
// Import all the view components
import ChatView from '../views/ChatView.vue'
import ImageGenView from '../views/ImageGenView.vue'
import AssistantsView from '../views/AssistantsView.vue'
import SettingsView from '../views/SettingsView.vue'
import AssistantCreator from '../components/AssistantCreator.vue'
import MemoriesView from '../views/MemoriesView.vue' // *** NEW: Import MemoriesView ***

const router = createRouter({
  // Use createWebHistory for standard URLs (without '#' hash)
  history: createWebHistory(import.meta.env.BASE_URL),
  // Define the application routes
  routes: [
    {
      // Chat View (Home)
      path: '/',
      name: 'chat',
      component: ChatView,
    },
    {
      // Image Gen View
      path: '/image-gen', // Matches link in LeftSidebar
      name: 'image-gen',
      component: ImageGenView,
    },
    {
      // Assistants View (List)
      path: '/assistants', // Matches link in LeftSidebar
      name: 'assistants',
      component: AssistantsView,
    },
    {
      // Route for Editing an Assistant
      path: '/assistants/edit/:id', // e.g., /assistants/edit/1713500000000
      name: 'assistant-edit',
      component: AssistantCreator,
      props: true,
    },
    // *** NEW Route for Memories View ***
    {
      path: '/memories',
      name: 'memories',
      component: MemoriesView,
    },
    // *** END NEW Route ***
    {
      // Settings View
      path: '/settings', // Matches link in LeftSidebar
      name: 'settings',
      component: SettingsView,
    },
    // We can add more routes later if needed
  ],
})

export default router
