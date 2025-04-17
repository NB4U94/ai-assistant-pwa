import { createRouter, createWebHistory } from 'vue-router'
// Import the ChatView component we created
import ChatView from '../views/ChatView.vue'

const router = createRouter({
  // Use createWebHistory for standard URLs (without '#' hash)
  history: createWebHistory(import.meta.env.BASE_URL),
  // Define the application routes
  routes: [
    {
      // When the user visits the root path ('/')
      path: '/',
      // Give the route a unique name
      name: 'chat', // Changed from 'home'
      // Load the ChatView component
      component: ChatView // Changed from HomeView
    },
    // We removed the default '/about' route for now.
    // We can add routes for other views (Image Gen, Assistants, Settings) here later.
  ]
})

export default router
