<template>
  <button
    @click="props.ttsToggle"
    :class="['icon-button', 'tts-button', { 'tts-on': isTtsEnabled }]"
    :aria-pressed="isTtsEnabled"
    aria-label="Toggle text to speech"
    :disabled="disabled || !ttsSupported"
    :title="isTtsEnabled ? 'Speech ON' : 'Speech OFF'"
  >
    <div class="tts-bars" v-if="isTtsEnabled">
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
    </div>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1"
      stroke="currentColor"
      class="svg-icon tts-icon"
    >
      <path
        class="tts-icon-speaker"
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
      />
      <path
        class="tts-icon-waves"
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424"
      />
    </svg>
  </button>
</template>

<script setup>
// Props needed from the parent
const props = defineProps({
  isTtsEnabled: { type: Boolean, default: false },
  ttsSupported: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  ttsToggle: { type: Function, required: true },
})
</script>

<style scoped>
/* --- Base Button Styles --- */
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
}
.icon-button:disabled::before,
.icon-button:disabled::after {
  display: none; /* Hide pseudo elements when disabled */
}
.icon-button:not(:disabled):hover {
  background-color: var(--bg-button-secondary-hover);
  color: var(--text-light);
}

/* --- TTS Button Specific --- */
.tts-button {
  position: relative;
  overflow: hidden; /* Contain internal lines */
  transition: background-color 0.2s ease;
  background-color: var(--bg-button-secondary);
}
.tts-button .tts-icon {
  width: 20px;
  height: 20px;
  position: relative; /* Keep icon centered */
  z-index: 2; /* Icon above lines/ripple */
  transition:
    color 0.2s ease,
    filter 0.3s ease,
    transform 0.3s ease;
  color: var(--text-medium);
  filter: none;
  /* Always flipped horizontally */
  transform: scaleX(-1);
}
/* Style wave parts grey when inactive */
.tts-icon .tts-icon-waves {
  stroke: var(--text-disabled);
  transition: stroke 0.2s ease;
}
/* Styles when TTS is ON */
.tts-button.tts-on {
  background-color: color-mix(in srgb, var(--bg-button-secondary) 80%, #007791); /* Darker blue */
  overflow: visible; /* Allow ripple + bars */
}
.tts-button.tts-on .tts-icon {
  transform: scaleX(-1); /* Keep flip */
  color: var(--text-light); /* Lighter icon */
  /* Electric blue glow filter */
  filter: drop-shadow(0 0 3px #00ffff)
    drop-shadow(0 0 6px color-mix(in srgb, #00ffff 70%, transparent));
}
.tts-button.tts-on .tts-icon .tts-icon-waves {
  stroke: var(--text-light); /* Make waves light */
}
/* Electric Blue Ripple Effect for TTS */
.tts-button.tts-on::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(0);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #00ffff; /* Electric blue, thicker */
  opacity: 0.7;
  animation: ripple-out 3.5s infinite ease-out;
  z-index: 0; /* Ripple behind everything */
  pointer-events: none;
}
/* Internal Electric Blue "Stress Lines" Effect for TTS */
.tts-button.tts-on::before {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background-image:
    linear-gradient(#00ffff 1px, transparent 1px), linear-gradient(#00ffff 1px, transparent 1px),
    linear-gradient(#00ffff 1px, transparent 1px), linear-gradient(#00ffff 1px, transparent 1px);
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
  /* Use reversed animation */
  animation: tts-stress-lines-pulse 1.8s infinite ease-in-out;
  z-index: 1; /* Lines above ripple, behind icon */
  pointer-events: none;
  transform: rotate(0deg);
}

/* Blue Mirrored bars above button */
.tts-bars {
  position: absolute;
  bottom: calc(100% + 3px); /* Position above */
  left: 50%;
  transform: translateX(-50%); /* Center */
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
  height: 15px;
  width: 30px;
  pointer-events: none;
  z-index: 3; /* Bars above ripple/icon/lines */
}
.tts-bars .bar {
  width: 3px;
  background-color: #00ffff; /* Electric blue */
  border-radius: 2px;
  animation: tts-bar-level 1.2s infinite ease-in-out alternate;
}
/* Mirrored animation delays */
.tts-bars .bar:nth-child(1) {
  height: 70%;
  animation-delay: 0.8s;
}
.tts-bars .bar:nth-child(2) {
  height: 50%;
  animation-delay: 0.6s;
}
.tts-bars .bar:nth-child(3) {
  height: 80%;
  animation-delay: 0.4s;
}
.tts-bars .bar:nth-child(4) {
  height: 30%;
  animation-delay: 0.2s;
}
.tts-bars .bar:nth-child(5) {
  height: 60%;
  animation-delay: 0s;
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
/* Animation for STT lines */
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
/* Reversed animation for TTS lines */
@keyframes tts-stress-lines-pulse {
  0% {
    opacity: 0;
    transform: rotate(0deg) scale(0.9);
  }
  50% {
    opacity: 0.6;
    transform: rotate(-45deg) scale(1);
  } /* Reversed rotation */
  100% {
    opacity: 0;
    transform: rotate(-90deg) scale(0.9);
  } /* Reversed rotation */
}
/* Animation for TTS bars */
@keyframes tts-bar-level {
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
