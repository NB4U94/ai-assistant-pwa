<template>
  <div class="color-palette-container">
    <p class="palette-instruction">Choose a color for the assistant's avatar:</p>
    <div class="color-grid">
      <button
        v-for="color in colors"
        :key="color"
        type="button"
        class="color-swatch subtle-pulse"
        :class="{ selected: modelValue === color }"
        :style="{ backgroundColor: color }"
        :aria-label="`Select color ${color}`"
        @click="selectColor(color)"
      >
        <span v-if="modelValue === color" class="checkmark">✔</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

// Props:
// - colors: Array of hex color strings (e.g., ['#ff0000', '#00ff00', ...])
// - modelValue: The currently selected color hex string (for v-model)
const props = defineProps({
  colors: {
    type: Array,
    required: true,
    validator: (value) =>
      value.every((color) => typeof color === 'string' && /^#[0-9A-F]{6}$/i.test(color)),
  },
  modelValue: {
    type: String,
    default: null,
    validator: (value) => value === null || /^#[0-9A-F]{6}$/i.test(value),
  },
})

// Emit event for v-model compatibility
const emit = defineEmits(['update:modelValue'])

// Function to emit the selected color
function selectColor(color) {
  emit('update:modelValue', color)
}
</script>

<style scoped>
.color-palette-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  /* Add background/styling as needed for full-screen feel */
  background-color: var(--bg-main-content, #1a1a1a);
  border-radius: 8px;
}

.palette-instruction {
  margin-bottom: 20px;
  font-size: 1.1em;
  color: var(--text-primary);
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(45px, 1fr)); /* Responsive grid */
  gap: 15px;
  width: 100%;
  max-width: 500px; /* Adjust max-width as needed */
  justify-content: center;
}

.color-swatch {
  width: 45px;
  height: 45px;
  border-radius: 50%; /* Circular swatches */
  border: 2px solid transparent;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease;
  position: relative; /* For checkmark positioning */
  padding: 0; /* Reset button padding */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  /* Apply pulse animation */
  animation: subtle-pulse 1.5s infinite ease-in-out; /* Adjust timing */
}

.color-swatch:hover {
  transform: scale(1.1);
  border-color: var(--accent-color-primary, #42b983);
}

.color-swatch.selected {
  border-color: var(--text-primary, #fff);
  transform: scale(1.1);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.checkmark {
  color: white;
  font-size: 1.5em; /* Adjust size */
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.5); /* Make checkmark more visible */
}

/* Assuming subtle-pulse animation exists globally or add it here */
@keyframes subtle-pulse {
  0% {
    box-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
  }
  50% {
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
  } /* Enhanced glow */
  100% {
    box-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
  }
}
</style>
