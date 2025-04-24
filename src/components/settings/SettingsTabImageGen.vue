<template>
  <div>
    <div class="setting-item">
      <label for="img-aspect-select" class="setting-label">
        Default Aspect Ratio
        <span class="setting-description">Shape of generated images.</span>
      </label>
      <select id="img-aspect-select" class="settings-select" v-model="imageGenDefaultAspectRatio">
        <option v-for="ratio in settingsStore.VALID_ASPECT_RATIOS" :key="ratio" :value="ratio">
          {{ ratio }}
          <template v-if="ratio === '1:1'"> (Square)</template>
          <template v-if="ratio === '16:9'"> (Landscape)</template>
          <template v-if="ratio === '9:16'"> (Portrait)</template>
        </option>
      </select>
      <button
        class="help-button pulsing-help"
        @click="
          showHelp(
            'Default Aspect Ratio',
            'Sets the default shape (width-to-height ratio) for generated images. Common options are Square, Landscape (Wide), and Portrait (Tall). The underlying AI model may support specific resolutions for these ratios.',
          )
        "
        aria-label="Help with Default Aspect Ratio"
        title="Help with Default Aspect Ratio"
      >
        ?
      </button>
    </div>

    <div class="setting-item">
      <label for="img-style-select" class="setting-label">
        Default Style Preset
        <span class="setting-description">Artistic style for generated images.</span>
      </label>
      <select id="img-style-select" class="settings-select" v-model="imageGenDefaultStyle">
        <option v-for="style in settingsStore.VALID_IMAGE_STYLES" :key="style" :value="style">
          {{ style }}
        </option>
      </select>
      <button
        class="help-button pulsing-help"
        @click="
          showHelp(
            'Default Style Preset',
            'Influences the overall look and feel of the generated image (e.g., realistic, cartoonish, artistic). Availability depends on the AI model.',
          )
        "
        aria-label="Help with Default Style Preset"
        title="Help with Default Style Preset"
      >
        ?
      </button>
    </div>

    <div class="setting-item">
      <label for="img-num-images" class="setting-label">
        Number of Images
        <span class="setting-description">How many images to generate per prompt.</span>
      </label>
      <div class="input-container">
        <input
          type="number"
          id="img-num-images"
          class="settings-input number-input"
          :min="settingsStore.MIN_NUM_IMAGES"
          :max="settingsStore.MAX_NUM_IMAGES"
          step="1"
          v-model.number="imageGenDefaultNumImages"
          aria-label="Number of Images"
        />
      </div>
      <button
        class="help-button pulsing-help"
        @click="
          showHelp(
            'Number of Images',
            `Determines how many image variations are generated each time you submit a prompt (between ${settingsStore.MIN_NUM_IMAGES} and ${settingsStore.MAX_NUM_IMAGES}). Some AI models may have limitations.`,
          )
        "
        aria-label="Help with Number of Images"
        title="Help with Number of Images"
      >
        ?
      </button>
    </div>

    <div class="setting-item wide-item">
      <label for="img-negative-prompt" class="setting-label">
        Default Negative Prompt
        <span class="setting-description">Describe what you DON'T want to see.</span>
      </label>
      <textarea
        id="img-negative-prompt"
        class="settings-textarea"
        rows="2"
        placeholder="e.g., blurry, text, watermark, deformed..."
        v-model="imageGenDefaultNegativePrompt"
      ></textarea>
      <button
        class="help-button pulsing-help"
        @click="
          showHelp(
            'Default Negative Prompt',
            'Enter keywords or phrases describing elements you want the AI to avoid in generated images (e.g., low quality, extra fingers, text). This helps refine the output.',
          )
        "
        aria-label="Help with Default Negative Prompt"
        title="Help with Default Negative Prompt"
      >
        ?
      </button>
    </div>

    <div
      class="advanced-toggle-header"
      @click="toggleAdvanced"
      tabindex="0"
      @keydown.enter.prevent="toggleAdvanced"
      @keydown.space.prevent="toggleAdvanced"
    >
      <h3>Advanced Image Settings</h3>
      <button
        class="advanced-arrow"
        :class="{ expanded: isAdvancedVisible }"
        aria-label="Toggle Advanced Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          width="20px"
          height="20px"
        >
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
        </svg>
      </button>
    </div>

    <transition name="collapse">
      <div class="advanced-settings-section" v-show="isAdvancedVisible">
        <div class="setting-item">
          <label for="img-resolution-select" class="setting-label">
            Default Resolution <span class="setting-description">Size of generated images.</span>
          </label>
          <select id="img-resolution-select" class="settings-select" disabled>
            <option value="1024">1024x1024</option>
            <option value="1792">1792x1024</option>
            <option value="1024">1024x1792</option>
          </select>
          <button
            class="help-button pulsing-help"
            @click="
              showHelp(
                'Default Resolution',
                'Sets the default width/height (pixels). Availability depends on model (e.g., DALL-E 3 prefers 1024x1024, 1792x1024, or 1024x1792). (Setting not yet active)',
              )
            "
          >
            ?
          </button>
        </div>

        <div class="setting-item">
          <label for="img-seed" class="setting-label">
            Seed <span class="setting-description">Number controlling initial noise pattern.</span>
          </label>
          <input
            type="number"
            id="img-seed"
            class="settings-input"
            placeholder="Leave blank for random"
            disabled
          />
          <button
            class="help-button pulsing-help"
            @click="
              showHelp(
                'Seed',
                'Specific number to initialize generation. Same seed + prompt ≈ same result. Blank = random. (Setting not yet active)',
              )
            "
          >
            ?
          </button>
        </div>

        <div class="setting-item">
          <label for="img-cfg-slider" class="setting-label">
            Guidance Scale (CFG)
            <span class="setting-description">How strongly image follows prompt.</span>
          </label>
          <div class="slider-container">
            <input
              type="range"
              id="img-cfg-slider"
              class="settings-slider"
              min="1"
              max="20"
              step="0.5"
              value="7"
              disabled
            />
            <span class="slider-value">7</span>
          </div>
          <button
            class="help-button pulsing-help"
            @click="
              showHelp(
                'Guidance Scale (CFG)',
                'Controls prompt adherence. Lower = more creative, Higher = stricter. Common: 5-15. (Not standard in all models). (Setting not yet active)',
              )
            "
          >
            ?
          </button>
        </div>

        <div class="setting-item">
          <label for="img-sampler-select" class="setting-label">
            Sampler Method
            <span class="setting-description">Algorithm used during generation.</span>
          </label>
          <select id="img-sampler-select" class="settings-select" disabled>
            <option value="auto">Automatic</option>
          </select>
          <button
            class="help-button pulsing-help"
            @click="
              showHelp(
                'Sampler Method',
                'Specific algorithm used. Different samplers can affect style/detail. (Not usually user-controlled in simple APIs). (Setting not yet active)',
              )
            "
          >
            ?
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { defineProps, ref } from 'vue'
// *** Import store and utilities ***
import { useSettingsStore } from '@/stores/settingsStore'
import { storeToRefs } from 'pinia'

// --- Props ---
defineProps({
  showHelp: {
    type: Function,
    required: true,
  },
})

// --- Store Access ---
const settingsStore = useSettingsStore()
// Get needed state refs for v-model
const {
  imageGenDefaultAspectRatio,
  imageGenDefaultStyle,
  imageGenDefaultNegativePrompt,
  imageGenDefaultNumImages,
} = storeToRefs(settingsStore)

// --- Advanced Section State & Toggle ---
const isAdvancedVisible = ref(false) // Default collapsed
const toggleAdvanced = () => {
  isAdvancedVisible.value = !isAdvancedVisible.value
}
</script>

<style scoped>
/* Reuse styles from SettingsTabGeneral where possible */
.setting-item {
  display: grid;
  grid-template-columns: 1fr auto auto; /* Label | Control | Help */
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color-light);
  gap: 1rem;
}
.setting-item:last-child {
  border-bottom: none;
}

.setting-item.wide-item {
  /* Adjusted grid for textarea */
  grid-template-columns: auto 1fr auto;
  grid-template-areas:
    'label control help'
    '. description .';
  align-items: start;
}
.setting-item.wide-item .setting-label {
  grid-area: label;
}
.setting-item.wide-item .setting-description {
  grid-area: description;
  padding-left: 0;
  padding-top: 0.3rem;
}
.setting-item.wide-item .settings-textarea {
  grid-area: control;
  justify-self: stretch;
}
.setting-item.wide-item .help-button {
  grid-area: help;
  justify-self: end;
}

.setting-label {
  display: flex;
  flex-direction: column;
  font-weight: 500;
  font-family: sans-serif;
  cursor: default;
  margin-right: 1rem;
  line-height: 1.3;
}
.setting-description {
  font-size: 0.8em;
  color: var(--text-secondary);
  font-weight: 400;
  margin-top: 0.2rem;
  white-space: normal;
}

/* Align controls and help button to the end */
.settings-select,
.settings-slider,
.settings-input,
.settings-textarea,
.help-button,
.slider-container,
.input-container {
  /* Simple container for number input */
  justify-self: end;
}

/* Control base styles */
.settings-select,
.settings-slider,
.settings-input,
.settings-textarea {
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--border-color-medium);
  background-color: var(--bg-input-field);
  color: var(--text-primary);
  font-family: sans-serif;
  font-size: 0.9em;
  flex-shrink: 0;
  min-width: 100px; /* Base min width */
  max-width: 200px; /* Max width for selects/inputs */
  box-sizing: border-box;
}
.settings-select:focus,
.settings-slider:focus,
.settings-input:focus,
.settings-textarea:focus {
  outline: none;
  border-color: var(--accent-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.settings-select:disabled,
.settings-slider:disabled,
.settings-input:disabled,
.settings-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: color-mix(in srgb, var(--bg-input-field) 70%, var(--bg-main-content));
}

.settings-textarea {
  min-width: 200px; /* Wider */
  max-width: 100%;
  resize: vertical;
  min-height: calc(1.4em * 2 + 0.8rem); /* Approx 2 rows */
}

.settings-slider {
  cursor: pointer;
  padding: 0;
  height: 20px;
  vertical-align: middle;
  min-width: 120px;
  max-width: 150px;
}

.settings-input.number-input {
  max-width: 100px; /* Smaller width for number input */
  text-align: right;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.slider-value {
  font-size: 0.9em;
  color: var(--text-secondary);
  min-width: 3ch; /* Space for '20' */
  text-align: right;
}

/* Help button style */
.help-button {
  background-color: var(--bg-button-secondary);
  color: var(--text-button-secondary);
  border: none;
  border-radius: 50%;
  width: 24px;
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
  outline: none;
}
.help-button:focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.help-button:hover {
  background-color: var(--bg-button-secondary-hover);
}
/* Apply faint pulse animation */
.help-button.pulsing-help {
  animation: faintGreenPulse 3s infinite alternate ease-in-out;
}

/* --- Advanced Section --- */
.advanced-toggle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 0.5rem;
  margin-top: 2rem;
  background-color: var(--bg-input-area);
  border: 1px solid var(--border-color-light);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  outline: none;
}
.advanced-toggle-header:hover {
  background-color: var(--bg-button-secondary-hover);
}
.advanced-toggle-header:focus-visible {
  border-color: var(--accent-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color-primary) 50%, transparent);
}
.advanced-toggle-header h3 {
  margin: 0;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.95em;
  user-select: none;
}
.advanced-arrow {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    transform 0.3s ease,
    color 0.2s ease;
  animation: faintGreenPulse 3.5s infinite alternate ease-in-out;
}
.advanced-arrow:hover {
  color: var(--text-primary);
}
.advanced-arrow svg {
  display: block;
}
.advanced-arrow.expanded {
  transform: rotate(180deg);
}

.advanced-settings-section {
  padding: 1rem 1rem 0 1rem;
  border: 1px solid var(--border-color-light);
  border-top: none;
  border-radius: 0 0 6px 6px;
  margin-bottom: 1rem;
  background-color: var(--bg-main-content);
  overflow: hidden;
}

/* --- Transition for Collapse --- */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease-in-out;
  max-height: 600px; /* Increased max-height */
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-top-width: 0;
  border-bottom-width: 0;
  margin-top: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 600px; /* Increased max-height */
}
</style>
