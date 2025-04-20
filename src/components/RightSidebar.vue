<template>
  <div class="right-sidebar-content">
    <h2>Quick Settings</h2>
    <p>(Placeholder for quick settings - styling applied)</p>
  </div>
</template>

<script setup>
// Component-specific JavaScript logic will go here later
</script>

<style scoped>
/* Define the pulsing halo animation for interactive elements */
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

/* Styles specific to the right sidebar */
.right-sidebar-content {
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  /* FIX: Base text color changed to primary accent (green) */
  color: var(--accent-color-primary);
}

h2 {
  margin-top: 0;
  margin-bottom: 1.5rem; /* Match left sidebar */
  color: var(--text-primary); /* Keep primary text color for heading */
  font-family: sans-serif;
  text-align: center; /* Center heading */
  font-weight: 600;
  flex-shrink: 0; /* Prevent heading shrinking if content overflows */
}

p {
  /* FIX: Ensure placeholder text uses the base accent color */
  color: var(--accent-color-primary);
  font-family: sans-serif;
  font-size: 0.9em;
  text-align: center; /* Center placeholder text */
  flex-grow: 1; /* Allow paragraph to take up space */
  display: flex;
  align-items: center; /* Vertically center if needed */
  justify-content: center;
}

/* --- Styles for future interactive elements --- */
/* FIX: Uncommented example styles for reference/use */

.quick-setting-button {
  display: block;
  width: 100%;
  padding: 0.6rem 1rem;
  margin-bottom: 0.8rem;
  text-align: left;
  background-color: transparent;
  border: 1px solid var(--border-color-medium);
  border-radius: 6px;
  color: var(--accent-color-primary); /* Green text */
  font-family: sans-serif;
  font-size: 0.9em; /* Match placeholder text */
  cursor: pointer;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    /* Added background transition */ border-color 0.2s ease; /* Added border transition */
  outline: none;
  box-shadow: none; /* Ensure no default shadow */
  flex-shrink: 0; /* Prevent shrinking */
}

/* Apply halo and subtle background on hover/focus */
.quick-setting-button:hover:not(:disabled),
.quick-setting-button:focus-visible:not(:disabled) {
  /* Use focus-visible */
  color: var(--accent-color-primary); /* Keep text green */
  border-color: var(--accent-color-primary); /* Highlight border */
  background-color: color-mix(
    in srgb,
    var(--accent-color-primary) 10%,
    transparent
  ); /* Subtle background highlight */
  animation: pulse-halo 1.5s infinite ease-in-out; /* Apply halo */
}

.quick-setting-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  /* Remove hover effects for disabled state if needed */
  /* animation: none; */
  /* background-color: transparent; */
  /* border-color: var(--border-color-medium); */
}

/* --- End Example Styles --- */
</style>
