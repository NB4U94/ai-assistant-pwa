<template>
  <button
    ref="sendButtonRef"
    @click="handleClick"
    :disabled="props.disabled"
    :class="{ sending: isSending }"
    aria-label="Send message"
    class="icon-button send-button"
    title="Send message"
    type="button"
  >
    <div class="send-icon-container">
      <div class="shatter-overlay disperse-overlay-1"></div>
      <div class="shatter-overlay disperse-overlay-2"></div>
      <div class="shatter-overlay disperse-overlay-3"></div>
      <div class="shatter-overlay disperse-overlay-4"></div>
      <div class="shatter-overlay disperse-overlay-5"></div>
      <div class="shatter-overlay disperse-overlay-6"></div>
      <div class="shatter-overlay disperse-overlay-7"></div>
      <div class="shatter-overlay disperse-overlay-8"></div>
      <div class="shatter-overlay disperse-overlay-9"></div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        class="svg-icon static-icon"
        :key="props.disabled ? 'disabled-icon' : 'enabled-icon'"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <g v-if="props.disabled">
          <path stroke-width="2.4" d="M15 4 L22 12 L15 20" />
          <line stroke-width="2.4" x1="2" y1="12" x2="16" y2="12" />
          <g class="fragments-view1" stroke-width="1.8">
            <line x1="5" y1="9.5" x2="8" y2="9.5" />
            <line x1="9" y1="14.5" x2="12" y2="14.5" class="fragment-green" />
            <line x1="13" y1="10.5" x2="15" y2="10.5" />
            <line x1="3" y1="13.5" x2="6" y2="13.5" stroke-width="1.6" />
            <line x1="7" y1="8" x2="10" y2="8" class="fragment-green" stroke-width="1.6" />
          </g>
        </g>
        <g v-else fill="none">
          <polygon :fill="'var(--accent-color-primary, #42b983)'" points="14,4 23,12 14,20 16,12" />
          <line stroke="#FFF" stroke-width="2.2" x1="1" y1="12" x2="16" y2="12" />
          <g stroke="#FFF" stroke-width="1.6">
            <line x1="4" y1="6" x2="8" y2="6" />
            <line x1="12" y1="8" x2="15" y2="8" />
            <line x1="2" y1="16" x2="7" y2="16" />
            <line x1="15" y1="18" x2="17" y2="18" stroke-width="1.4" />
            <line x1="9" y1="19" x2="13" y2="19" />
            <line x1="1" y1="9" x2="3" y2="9" stroke-width="1.4" />
          </g>
          <g class="fragment-green" stroke-width="1.6">
            <line x1="10" y1="4" x2="13" y2="4" />
            <line x1="7" y1="14" x2="12" y2="14" stroke-width="1.8" />
            <line x1="14" y1="16.5" x2="16" y2="16.5" />
            <line x1="2" y1="7.5" x2="6" y2="7.5" />
            <line x1="15" y1="5.5" x2="17" y2="5.5" stroke-width="1.4" />
            <line x1="8" y1="20" x2="11" y2="20" stroke-width="1.4" />
          </g>
        </g>
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        class="svg-icon animated-icon"
        key="animated-icon"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <g fill="none">
          <polygon
            class="anim-head"
            :fill="'var(--accent-color-primary, #42b983)'"
            points="14,4 23,12 14,20 16,12"
          />
          <line class="anim-tail" stroke="#FFF" stroke-width="2.2" x1="1" y1="12" x2="16" y2="12" />
          <g class="anim-frags-white" stroke="#FFF" stroke-width="1.6">
            <line x1="4" y1="6" x2="8" y2="6" />
            <line x1="12" y1="8" x2="15" y2="8" />
            <line x1="2" y1="16" x2="7" y2="16" />
            <line x1="15" y1="18" x2="17" y2="18" stroke-width="1.4" />
            <line x1="9" y1="19" x2="13" y2="19" />
            <line x1="1" y1="9" x2="3" y2="9" stroke-width="1.4" />
          </g>
          <g class="anim-frags-green fragment-green" stroke-width="1.6">
            <line x1="10" y1="4" x2="13" y2="4" />
            <line x1="7" y1="14" x2="12" y2="14" stroke-width="1.8" />
            <line x1="14" y1="16.5" x2="16" y2="16.5" />
            <line x1="2" y1="7.5" x2="6" y2="7.5" />
            <line x1="15" y1="5.5" x2="17" y2="5.5" stroke-width="1.4" />
            <line x1="8" y1="20" x2="11" y2="20" stroke-width="1.4" />
          </g>
        </g>
      </svg>
    </div>
  </button>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  disabled: { type: Boolean, default: false },
  handleSendMessage: { type: Function, required: true },
})

const sendButtonRef = ref(null) // Keep ref for potential parent access if needed later
const isSending = ref(false)
const animationDuration = 500

const triggerSendAnimation = () => {
  // console.log('[DEBUG] SendButton: triggerSendAnimation function called.'); // Removed debug log
  if (isSending.value) return
  isSending.value = true
  setTimeout(() => {
    isSending.value = false
  }, animationDuration)
}

defineExpose({ triggerSendAnimation })

const handleClick = () => {
  if (props.disabled) return
  triggerSendAnimation() // Trigger animation visually
  // console.log("[DEBUG] SendButton: Attempting to call props.handleSendMessage..."); // Removed debug log
  props.handleSendMessage() // Call the parent's logic passed as a prop
}
</script>

<style scoped>
/* Styles unchanged - ensure they are correct */
.icon-button {
  padding: 0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  height: 40px;
  width: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: transparent;
  color: var(--text-medium, #ccc);
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.1s ease-out,
    filter 0.1s ease-out;
  position: relative;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  overflow: visible;
  vertical-align: middle;
}
.icon-button:disabled {
  cursor: not-allowed;
  pointer-events: none;
  background-color: color-mix(
    in srgb,
    var(--accent-color-primary, #42b983) 15%,
    var(--bg-input-area, #333)
  );
  color: var(--text-disabled, #aaa);
  overflow: hidden;
}
.send-button:not(:disabled) {
  background-color: transparent;
  color: var(--text-light, #fff);
}
.icon-button:active:not(:disabled):not(.sending) {
  transform: none;
  filter: none;
}
.send-icon-container {
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.svg-icon {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transform: scale(1.1);
  transition: opacity 0.1s ease-out;
}
.static-icon {
  position: relative;
  z-index: 1;
  opacity: 1;
}
.animated-icon {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  opacity: 0;
}
.fragment-green {
  stroke: var(--accent-color-primary, #42b983);
}
.sending .static-icon {
  opacity: 0;
  z-index: 0;
  transition: opacity 0.05s ease-out;
}
.sending .animated-icon {
  opacity: 1;
  z-index: 1;
}
@keyframes head-explode {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(25px) scale(1.1);
    opacity: 0;
  }
}
@keyframes tail-blowback {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(-30px) scale(0.8);
    opacity: 0;
  }
}
@keyframes frags-blowback-white {
  from {
    transform: translateX(0) rotate(0);
    opacity: 1;
  }
  to {
    transform: translateX(-35px) rotate(-45deg) scale(0.7);
    opacity: 0;
  }
}
@keyframes frags-blowback-green {
  from {
    transform: translateX(0) rotate(0);
    opacity: 1;
  }
  to {
    transform: translateX(-35px) rotate(30deg) scale(0.7);
    opacity: 0;
  }
}
.sending .animated-icon .anim-head {
  animation: head-explode 500ms ease-out forwards;
}
.sending .animated-icon .anim-tail {
  animation: tail-blowback 500ms ease-out forwards;
}
.sending .animated-icon .anim-frags-white {
  animation: frags-blowback-white 500ms ease-out forwards;
}
.sending .animated-icon .anim-frags-green {
  animation: frags-blowback-green 500ms ease-out forwards;
}
.shatter-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: currentColor;
  opacity: 0;
  width: 1.5px;
  height: 8px;
  border-radius: 1px;
  z-index: 0;
  pointer-events: none;
} /* Style for removed elements, can be deleted if not used */
</style>
