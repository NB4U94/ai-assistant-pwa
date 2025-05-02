<template>
  <button
    ref="fileButtonRef"
    @click="handleFileButtonClick"
    @mousedown="handlePressStart"
    @mouseup="handlePressEnd"
    @mouseleave="handlePressEnd"
    @touchstart.prevent="handlePressStart"
    @touchend="handlePressEnd"
    :class="['icon-button', 'file-button', { 'folder-opening': isFolderVisualOpen }]"
    aria-label="Attach file"
    title="Attach file"
    :disabled="disabled"
  >
    <div class="icon-swap-container">
      <div v-if="isFolderVisualOpen" key="folder-open-complex" class="folder-open-state">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="svg-icon folder-base-icon"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
          />
        </svg>
        <div class="folder-card blue-card"></div>
        <div class="extra-doc doc-1"></div>
        <div class="extra-doc doc-2"></div>
        <div class="extra-doc doc-3"></div>
      </div>

      <svg
        v-else
        key="folder-closed"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="svg-icon folder-closed-icon"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
        />
      </svg>
    </div>
    <input
      type="file"
      ref="fileInputRef"
      @change="handleFileSelectedInternal"
      accept="image/*"
      style="display: none"
      aria-hidden="true"
    />
  </button>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'

// Define props directly
defineProps({
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['file-selected'])

const fileInputRef = ref(null)
const fileButtonRef = ref(null)
let pressTimeout = null
const isFolderVisualOpen = ref(false)
let openFolderTimeout = null

const handleFileButtonClick = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
  isFolderVisualOpen.value = true
  if (openFolderTimeout) clearTimeout(openFolderTimeout)
  openFolderTimeout = setTimeout(() => {
    isFolderVisualOpen.value = false
    openFolderTimeout = null
  }, 4000)
}

const handleFileSelectedInternal = (event) => {
  const file = event.target.files?.[0]
  if (file) {
    emit('file-selected', event)
  }
  if (event.target) {
    event.target.value = null
  }
}

const handlePressStart = () => {
  if (pressTimeout) {
    clearTimeout(pressTimeout)
    pressTimeout = null
  }
  if (fileButtonRef.value && !fileButtonRef.value.disabled) {
    fileButtonRef.value.style.transform = 'scale(0.90)'
  }
}

const handlePressEnd = () => {
  if (pressTimeout) {
    clearTimeout(pressTimeout)
    pressTimeout = null
  }
  pressTimeout = setTimeout(() => {
    if (fileButtonRef.value) {
      fileButtonRef.value.style.transform = ''
    }
    pressTimeout = null
  }, 100)
}

onUnmounted(() => {
  if (pressTimeout) clearTimeout(pressTimeout)
  if (openFolderTimeout) clearTimeout(openFolderTimeout)
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
.icon-button:not(:disabled):hover {
  background-color: var(--bg-button-secondary-hover);
  color: var(--text-light);
}

/* --- File Button Specific --- */
.file-button {
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.1s ease-out;
  overflow: visible;
}
/* Darken background when opening - ADDED !important FOR DEBUGGING */
.file-button.folder-opening {
  background-color: color-mix(in srgb, var(--bg-button-secondary) 85%, #000) !important;
}
.icon-swap-container {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.file-button .svg-icon {
  width: 20px;
  height: 20px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: opacity 0.15s ease-in-out;
  pointer-events: none;
}
.folder-open-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-style: preserve-3d;
}
.folder-base-icon {
  color: var(--text-medium);
  position: relative;
  width: 20px;
  height: 20px;
  z-index: 1;
}
.folder-card {
  position: absolute;
  width: 10px;
  height: 7px;
  background-color: #69d2e7;
  border-radius: 1px;
  filter: drop-shadow(0 0 2px #69d2e7)
    drop-shadow(0 0 4px color-mix(in srgb, #69d2e7 60%, transparent));
  opacity: 0;
  transform: translateY(-8px);
  transition:
    transform 0.25s 0.05s ease-out,
    opacity 0.2s 0.05s ease-in;
  z-index: 2;
}
.folder-opening .folder-card {
  opacity: 1;
  transform: translateY(-2px);
}
.extra-doc {
  position: absolute;
  border-radius: 1px;
  opacity: 0;
  left: 50%;
  top: 50%;
  transform-origin: center center;
  filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.6));
  animation-fill-mode: forwards;
  z-index: 3;
  pointer-events: none;
}
.doc-1 {
  width: 8px;
  height: 10px;
  background-color: #ff6347;
}
.doc-2 {
  width: 10px;
  height: 7px;
  background-color: #ffeb3b;
}
.doc-3 {
  width: 7px;
  height: 9px;
  background-color: var(--accent-color-primary);
}
.folder-opening .doc-1 {
  animation: doc-1-anim 2.5s ease-out forwards;
  animation-delay: 0.1s;
}
.folder-opening .doc-2 {
  animation: doc-2-anim 2.5s ease-out forwards;
  animation-delay: 0.5s;
}
.folder-opening .doc-3 {
  animation: doc-3-anim 2.5s ease-out forwards;
  animation-delay: 0.9s;
}
@keyframes doc-1-anim {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
  }
  100% {
    opacity: 1;
    transform: translate(-170%, -160%) scale(1) rotate(-20deg);
  }
}
@keyframes doc-2-anim {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
  }
  100% {
    opacity: 1;
    transform: translate(70%, -200%) scale(1) rotate(15deg);
  }
}
@keyframes doc-3-anim {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
  }
  100% {
    opacity: 1;
    transform: translate(100%, -40%) scale(1) rotate(25deg);
  }
}
</style>
