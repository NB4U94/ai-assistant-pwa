import { createRouter, createWebHistory } from 'vue-router'
// Import all the view components
import ChatView from '../views/ChatView.vue'
import ImageGenView from '../views/ImageGenView.vue' // Added
import AssistantsView from '../views/AssistantsView.vue' // Added
import SettingsView from '../views/SettingsView.vue' // Added

const router = createRouter({
  // Use createWebHistory for standard URLs (without '#' hash)
  history: createWebHistory(import.meta.env.BASE_URL),
  // Define the application routes
  routes: [
    {
      // Chat View (Home)
      path: '/',
      name: 'chat',
      component: ChatView
    },
    {
      // Image Gen View
      path: '/image-gen', // Matches link in LeftSidebar
      name: 'image-gen',
      component: ImageGenView // Use the imported component
    },
    {
      // Assistants View
      path: '/assistants', // Matches link in LeftSidebar
      name: 'assistants',
      component: AssistantsView // Use the imported component
    },
    {
      // Settings View
      path: '/settings', // Matches link in LeftSidebar
      name: 'settings',
      component: SettingsView // Use the imported component
    }
    // We can add more routes later if needed
  ]
})

export default router
