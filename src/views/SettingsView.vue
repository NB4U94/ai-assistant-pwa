<template>
  <div class="settings-view">
    <h2>Settings</h2>

    <div class="settings-tabs-nav">
      <button class="tab-button active">General</button>
      <button class="tab-button">Chat</button>
      <button class="tab-button">Image Gen</button>
      <button class="tab-button">Assistants</button>
    </div>

    <div class="settings-tab-content">
      <div class="setting-item">
        <label for="theme-toggle" class="setting-label">
          Theme
          <span class="setting-description">Switch between light and dark mode.</span>
        </label>
        <div
          class="toggle-switch-placeholder"
          id="theme-toggle"
          role="switch"
          :aria-checked="isDarkMode.toString()"
          @click="toggleTheme"
          @keydown.enter="toggleTheme"
          @keydown.space.prevent="toggleTheme"
          tabindex="0"
          :title="`Switch to ${isDarkMode ? 'light' : 'dark'} mode`"
        >
          <div class="toggle-knob"></div>
        </div>
        <button
          class="help-button"
          aria-label="Help with Theme Setting"
          title="Help with Theme Setting"
        >
          ?
        </button>
      </div>

      <p class="placeholder-text">(More settings for the 'General' tab will appear here)</p>

      <div class="advanced-settings-section">
        <h3>Advanced Settings</h3>
        <p class="placeholder-text">(Advanced settings specific to this tab will appear here)</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore' // Adjust path if your store is elsewhere

// Get a reference to the Pinia settings store
const settingsStore = useSettingsStore()

// Create a computed property to check if the current theme is 'dark'
// This will automatically update when the store's state changes
const isDarkMode = computed(() => settingsStore.theme === 'dark')

// Function to call the store's action to toggle the theme
const toggleTheme = () => {
  const newTheme = isDarkMode.value ? 'light' : 'dark'
  settingsStore.setTheme(newTheme)
}

// Placeholder: In the future, we'll need state for the active tab
// const activeTab = ref('General');
</script>

<style scoped>
.settings-view {
  padding: 1.5rem 2rem; /* Add some padding */
  height: 100%;
  overflow-y: auto; /* Allow scrolling if content exceeds height */
  background-color: var(--bg-main-content); /* Use theme variable */
  color: var(--text-primary); /* Use theme variable */
}

h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
  font-family: sans-serif;
  text-align: center;
  font-weight: 600;
  border-bottom: 1px solid var(--border-color-medium); /* Add separator */
  padding-bottom: 1rem;
}

/* Tab Navigation Styles (Basic Placeholders) */
.settings-tabs-nav {
  display: flex;
  flex-wrap: wrap; /* Allow tabs to wrap on smaller screens */
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color-medium);
  padding-bottom: 1rem;
}

.tab-button {
  padding: 0.5rem 1rem;
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: sans-serif;
  font-size: 0.9em;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.tab-button:hover:not(.active) {
  background-color: var(--bg-button-secondary-hover);
}

.tab-button.active {
  background-color: var(--accent-color-primary); /* Use green for active tab */
  color: var(--bg-main-content); /* Dark text on green */
  font-weight: 600;
}

/* Tab Content Area */
.settings-tab-content {
  padding-top: 1rem;
}

/* Individual Setting Item Layout */
.setting-item {
  display: flex;
  align-items: center; /* Vertically align items */
  justify-content: space-between; /* Space out label, control, help */
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color-light); /* Separator */
  gap: 1rem; /* Space between elements */
  flex-wrap: wrap; /* Allow wrapping if needed */
}

.setting-label {
  display: flex;
  flex-direction: column; /* Stack label and description */
  flex-grow: 1; /* Allow label area to grow */
  font-weight: 500;
  font-family: sans-serif;
  cursor: default; /* Default cursor for label */
  margin-right: 1rem; /* Ensure space before toggle */
}

.setting-description {
  font-size: 0.8em;
  color: var(--text-secondary);
  font-weight: 400;
  margin-top: 0.2rem;
}

/* Toggle Switch Styling */
.toggle-switch-placeholder {
  width: 44px; /* Fixed width */
  height: 24px; /* Fixed height */
  background-color: var(--bg-button-secondary); /* Off state background */
  border-radius: 12px; /* Rounded ends */
  padding: 2px; /* Padding around knob */
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background-color 0.3s ease;
  flex-shrink: 0; /* Prevent shrinking */
  border: 1px solid var(--border-color-medium);
  outline: none; /* Remove default focus outline */
}
/* Add focus ring style for accessibility */
.toggle-switch-placeholder:focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}

.toggle-switch-placeholder[aria-checked='true'] {
  background-color: var(--accent-color-primary); /* On state background (green) */
}

.toggle-knob {
  width: 20px; /* Knob size */
  height: 20px;
  background-color: white;
  border-radius: 50%; /* Circular knob */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
}

.toggle-switch-placeholder[aria-checked='true'] .toggle-knob {
  transform: translateX(20px); /* Move knob to the right for 'on' state */
}

/* Help Button Styling */
.help-button {
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  border: none;
  border-radius: 50%;
  width: 24px; /* Small circular button */
  height: 24px;
  font-size: 0.9em;
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background-color 0.2s ease;
  outline: none; /* Remove default focus outline */
}
.help-button:focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}

.help-button:hover {
  background-color: var(--bg-button-secondary-hover);
}

/* Advanced Settings Section */
.advanced-settings-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid var(--border-color-medium); /* Stronger separator */
}

.advanced-settings-section h3 {
  margin-bottom: 1rem;
  color: var(--text-secondary);
}

.placeholder-text {
  color: var(--text-placeholder);
  font-style: italic;
  font-size: 0.9em;
  text-align: center;
  margin-top: 1rem;
}
</style>
