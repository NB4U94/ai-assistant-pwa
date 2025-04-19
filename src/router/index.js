import { createRouter, createWebHistory } from 'vue-router'
// Import all the view components
import ChatView from '../views/ChatView.vue'
import ImageGenView from '../views/ImageGenView.vue'
import AssistantsView from '../views/AssistantsView.vue'
import SettingsView from '../views/SettingsView.vue'
// *** Import AssistantCreator component ***
// Make sure the path is correct based on your project structure
import AssistantCreator from '../components/AssistantCreator.vue'

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
    // *** NEW Route for Editing an Assistant ***
    // This route uses a dynamic segment ':id' to capture the assistant's ID
    // It loads the AssistantCreator component, which will handle both create and edit modes.
    {
      path: '/assistants/edit/:id', // e.g., /assistants/edit/1713500000000
      name: 'assistant-edit', // Unique name for this route
      component: AssistantCreator, // Reuse the creator component
      props: true, // Automatically pass route params (like 'id') as props to the component
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
