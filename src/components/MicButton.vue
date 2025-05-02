<template>
  <div class="mic-button-wrapper">
    <button
      @click="props.toggleListening"
      :class="['icon-button', 'mic-button', { 'listening-active': isListening }]"
      aria-label="Use voice input"
      title="Use voice input"
      :disabled="disabled || !speechSupported"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="svg-icon"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
        />
      </svg>
    </button>
    <div class="mic-listening-bars" v-if="isListening">
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
    </div>
  </div>
</template>

<script setup>
// Props needed from the parent
const props = defineProps({
  isListening: { type: Boolean, default: false },
  speechSupported: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  toggleListening: { type: Function, required: true },
})
</script>

<style scoped>
/* --- Base Button Styles (Copied) --- */
.icon-button {
  padding: 0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  height: 40px;
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: var(--bg-button-secondary);
  color: var(--text-medium);
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
  position: relative;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background-color: var(--bg-button-disabled);
  color: var(--text-disabled);
  pointer-events: none;
  /* Disable animations on disabled state */
  filter: none !important;
  box-shadow: none !important;
}
.icon-button:disabled::before,
.icon-button:disabled::after {
  display: none; /* Hide pseudo elements when disabled */
}
.icon-button:not(:disabled):hover {
  background-color: var(--bg-button-secondary-hover);
  color: var(--text-light);
}

/* --- Mic Button Specific --- */
.mic-button-wrapper {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mic-button {
  position: relative; /* Keep relative for stacking context */
  z-index: 2; /* Button base above ripple */
  overflow: hidden; /* Contain internal lines */
  transition: background-color 0.2s ease;
  background-color: var(--bg-button-secondary);
  filter: none;
  box-shadow: none;
}
.mic-button .svg-icon {
  position: relative; /* Keep icon centered */
  z-index: 2; /* Icon above lines/ripple */
  width: 20px;
  height: 20px;
  transition:
    color 0.2s ease,
    filter 0.3s ease;
  color: var(--text-medium);
  filter: none; /* Default no glow */
}
.mic-button.listening-active {
  background-color: color-mix(
    in srgb,
    var(--bg-button-secondary) 85%,
    #000
  ); /* Darker background */
  filter: none;
  overflow: visible; /* Allow ripple to expand */
}
.mic-button.listening-active .svg-icon {
  color: var(--text-light); /* Lighter icon */
  /* Apply glow filter directly TO ICON */
  filter: drop-shadow(0 0 2px var(--accent-color-primary))
    drop-shadow(0 0 4px color-mix(in srgb, var(--accent-color-primary) 60%, transparent));
}
/* Green Ripple Effect */
.mic-button.listening-active::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(0);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--accent-color-primary); /* Green ripple */
  opacity: 0.7;
  animation: ripple-out 3.5s infinite ease-out;
  z-index: 0; /* Ripple behind everything */
  pointer-events: none;
}
/* Internal Green "Stress Lines" Effect */
.mic-button.listening-active::before {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background-image:
    linear-gradient(var(--accent-color-primary) 1px, transparent 1px),
    linear-gradient(var(--accent-color-primary) 1px, transparent 1px),
    linear-gradient(var(--accent-color-primary) 1px, transparent 1px),
    linear-gradient(var(--accent-color-primary) 1px, transparent 1px);
  background-size:
    50% 1px,
    50% 1px,
    1px 50%,
    1px 50%;
  background-position:
    top left,
    bottom right,
    top right,
    bottom left;
  background-repeat: no-repeat;
  opacity: 0;
  animation: stress-lines-pulse 1.8s infinite ease-in-out;
  z-index: 1; /* Lines above ripple, behind icon */
  pointer-events: none;
  transform: rotate(0deg);
}

/* Shared Animations */
@keyframes ripple-out {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0.6;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.8);
    opacity: 0;
  }
}
@keyframes stress-lines-pulse {
  0% {
    opacity: 0;
    transform: rotate(0deg) scale(0.9);
  }
  50% {
    opacity: 0.6;
    transform: rotate(45deg) scale(1);
  }
  100% {
    opacity: 0;
    transform: rotate(90deg) scale(0.9);
  }
}

/* Listening bars animation */
.mic-listening-bars {
  position: absolute;
  bottom: calc(100% + 3px); /* Position above the button */
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-end; /* Align bars to their bottom */
  justify-content: center;
  gap: 3px;
  height: 15px; /* Max height of bars */
  width: 30px;
  pointer-events: none;
  z-index: 3; /* Ensure bars are above button */
}
.mic-listening-bars .bar {
  width: 3px;
  background-color: var(--accent-color-primary);
  border-radius: 2px;
  animation: mic-bar-level 1.2s infinite ease-in-out alternate;
}
/* Stagger bar animation delays and initial heights */
.mic-listening-bars .bar:nth-child(1) {
  height: 60%;
  animation-delay: 0s;
}
.mic-listening-bars .bar:nth-child(2) {
  height: 30%;
  animation-delay: 0.2s;
}
.mic-listening-bars .bar:nth-child(3) {
  height: 80%;
  animation-delay: 0.4s;
}
.mic-listening-bars .bar:nth-child(4) {
  height: 50%;
  animation-delay: 0.6s;
}
.mic-listening-bars .bar:nth-child(5) {
  height: 70%;
  animation-delay: 0.8s;
}

@keyframes mic-bar-level {
  0% {
    height: 10%;
    opacity: 0.7;
  }
  50% {
    height: 100%;
    opacity: 1;
  }
  100% {
    height: 10%;
    opacity: 0.7;
  }
}
</style>
