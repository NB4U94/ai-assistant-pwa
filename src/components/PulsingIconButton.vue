<template>
  <button
    :disabled="disabled || isLoading"
    class="pulsing-icon-button"
    :title="title"
    @click="$emit('click')"
  >
    <span v-if="!isLoading" class="icon-wrapper">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="1.5em"
        height="1.5em"
        class="icon-svg"
      >
        <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
      </svg>
    </span>
    <div v-else class="button-spinner"></div>
  </button>
</template>

<script setup>
defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Action',
  },
})
defineEmits(['click'])
</script>

<style scoped>
/* --- Styles focusing on direct fill --- */

.pulsing-icon-button {
  padding: 0;
  border: 1px solid #555;
  border-radius: 50%;
  cursor: pointer;
  height: 40px;
  width: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: #333;
  position: relative;
  overflow: visible; /* Allow potential glow */
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease,
    transform 0.1s ease,
    border-color 0.2s ease;
}

.pulsing-icon-button:hover:not(:disabled) {
  border-color: hsl(120, 70%, 50%);
  background-color: #444;
}

.pulsing-icon-button:active:not(:disabled) {
  transform: scale(0.95);
}

.pulsing-icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none !important;
  background-color: #404040;
  border-color: #555;
}

/* --- Icon Styling --- */
.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  /* Apply animation here */
  animation: svg-plasma-pulse 2s infinite ease-in-out;
}

/* Target SVG directly for fill color */
.icon-svg {
  fill: hsl(120, 90%, 75%) !important; /* Bright green - FORCED on fill */
}

/* Pulsing Glow Animation using filter: drop-shadow */
@keyframes svg-plasma-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.9;
    filter: drop-shadow(0 0 2px hsl(120, 90%, 75%)) /* bright */
      drop-shadow(0 0 3px hsl(120, 80%, 60%)) /* mid */ drop-shadow(0 0 5px hsl(120, 70%, 40%)); /* dim */
  }
  50% {
    transform: scale(1.1); /* Slightly larger */
    opacity: 1;
    filter: drop-shadow(0 0 4px hsl(120, 90%, 75%)) /* bright */
      drop-shadow(0 0 7px hsl(120, 80%, 60%)) /* mid */ drop-shadow(0 0 10px hsl(120, 70%, 40%)); /* dim */
  }
}

/* --- Spinner Styles --- */
.button-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #aaa;
  border-top-color: transparent;
  border-radius: 50%;
  animation: button-spin 0.8s linear infinite;
}

@keyframes button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
