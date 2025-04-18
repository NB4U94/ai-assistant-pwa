import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Create the Vue application instance
const app = createApp(App)

// Create the Pinia instance (the root store manager)
const pinia = createPinia()

// Tell Vue to use Pinia
app.use(pinia)
// Tell Vue to use the router
app.use(router)

// Mount the application to the DOM
app.mount('#app')
