<template>
  <div class="left-sidebar-content">
    <h2>Main Menu</h2>
    <nav class="main-menu">
      <ul>
        <li>
          <RouterLink to="/">Chat</RouterLink>
        </li>
        <li>
          <RouterLink to="/image-gen">Image Gen</RouterLink>
        </li>
        <li>
          <RouterLink to="/assistants">Assistants</RouterLink>
        </li>
        <li>
          <RouterLink to="/settings">Settings</RouterLink>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'

// Component-specific JavaScript logic will go here later
</script>

<style scoped>
/* Define the pulsing halo animation */
@keyframes pulse-halo {
  0% {
    box-shadow: 0 0 0 0px color-mix(in srgb, var(--accent-color-primary) 40%, transparent);
  }
  50% {
    /* Increase shadow size slightly */
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-color-primary) 25%, transparent);
  }
  100% {
    box-shadow: 0 0 0 0px color-mix(in srgb, var(--accent-color-primary) 40%, transparent);
  }
}

/* Styles specific to the left sidebar - using CSS Variables directly */
.left-sidebar-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
  font-family: sans-serif;
  text-align: center;
  font-weight: 600;
}

.main-menu ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.main-menu li {
  margin-bottom: 0.8rem;
}

.main-menu a {
  /* Style the RouterLink */
  display: block;
  padding: 0.6rem 1rem;
  text-decoration: none;
  color: var(--accent-color-primary); /* Use green accent */
  font-family: sans-serif;
  border-radius: 6px;
  background-color: transparent; /* Ensure background is transparent */
  transition: color 0.2s ease; /* Only transition color if needed, removed background transition */
  position: relative; /* Needed for potential future pseudo-elements if required */
  outline: none; /* Remove default browser outline */
  /* Reset box-shadow to ensure animation starts clean */
  box-shadow: none;
}

/* Apply pulsing halo animation on hover */
.main-menu a:hover {
  /* Text color remains green from the base 'a' style */
  animation: pulse-halo 1.5s infinite ease-in-out;
}

/* Apply pulsing halo animation for the active link */
.main-menu a.router-link-active {
  /* Text color remains green from the base 'a' style */
  animation: pulse-halo 1.5s infinite ease-in-out;
}
</style>
