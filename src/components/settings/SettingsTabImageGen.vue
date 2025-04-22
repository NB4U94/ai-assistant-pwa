<template>
  <div>
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
        class="help-button"
        @click="
          showHelp(
            'Default Resolution',
            'Sets the default width and height (in pixels) for images generated in the Image Gen mode. Available options may depend on the underlying AI model (e.g., DALL-E 3 prefers 1024x1024, 1792x1024, or 1024x1792). (Setting not yet active)',
          )
        "
      >
        ?
      </button>
    </div>
    <div class="setting-item">
      <label for="img-aspect-select" class="setting-label">
        Default Aspect Ratio <span class="setting-description">Shape of generated images.</span>
      </label>
      <select id="img-aspect-select" class="settings-select" disabled>
        <option value="1:1">1:1 (Square)</option>
        <option value="16:9">16:9 (Landscape)</option>
        <option value="9:16">9:16 (Portrait)</option>
      </select>
      <button
        class="help-button"
        @click="
          showHelp(
            'Default Aspect Ratio',
            'Sets the default shape (width-to-height ratio) for generated images. Works with the resolution setting. DALL-E 3 typically uses square (1:1), wide (16:9 via 1792x1024), or tall (9:16 via 1024x1792). (Setting not yet active)',
          )
        "
      >
        ?
      </button>
    </div>
    <div class="setting-item">
      <label for="img-count-slider" class="setting-label">
        Number of Images
        <span class="setting-description">How many images to generate at once.</span>
      </label>
      <input
        type="range"
        id="img-count-slider"
        class="settings-slider"
        min="1"
        max="4"
        step="1"
        value="1"
        disabled
      />
      <button
        class="help-button"
        @click="
          showHelp(
            'Number of Images',
            'Determines how many image variations are generated each time you submit a prompt. Some models (like DALL-E 3) currently only support generating one image at a time via API. DALL-E 2 supports multiple. (Setting not yet active)',
          )
        "
      >
        ?
      </button>
    </div>
    <div class="advanced-settings-section">
      <h3>Advanced Image Generation Settings</h3>
      <div class="setting-item wide-item">
        <label for="img-negative-prompt" class="setting-label">
          Negative Prompt
          <span class="setting-description">Describe what you DON'T want to see.</span>
        </label>
        <textarea
          id="img-negative-prompt"
          class="settings-textarea"
          rows="2"
          placeholder="e.g., blurry, text, watermark, deformed..."
          disabled
        ></textarea>
        <button
          class="help-button"
          @click="
            showHelp(
              'Negative Prompt',
              'Enter keywords or phrases describing elements you want the AI to avoid in the generated image. This helps refine the output and prevent common unwanted artifacts. (Note: Not officially supported by DALL-E 3 API, but common in other models). (Setting not yet active)',
            )
          "
        >
          ?
        </button>
      </div>
      <div class="setting-item">
        <label for="img-seed" class="setting-label">
          Seed
          <span class="setting-description">Number controlling initial noise pattern.</span>
        </label>
        <input
          type="number"
          id="img-seed"
          class="settings-input"
          placeholder="Leave blank for random"
          disabled
        />
        <button
          class="help-button"
          @click="
            showHelp(
              'Seed',
              'A specific number used to initialize the image generation process. Using the same seed with the same prompt and settings will usually produce very similar results, allowing reproducibility. Leave blank to use a random seed for more varied outputs each time. (Setting not yet active)',
            )
          "
        >
          ?
        </button>
      </div>
      <div class="setting-item">
        <label for="img-cfg-slider" class="setting-label">
          Guidance Scale (CFG)
          <span class="setting-description">How strongly the image follows the prompt.</span>
        </label>
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
        <button
          class="help-button"
          @click="
            showHelp(
              'Guidance Scale (CFG)',
              'Controls how closely the generated image should adhere to your text prompt. Lower values allow more creative freedom, while higher values stick more strictly to the prompt. Typical values range from 5 to 15. (Note: Not officially supported by DALL-E 3 API, but common in other models). (Setting not yet active)',
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
          class="help-button"
          @click="
            showHelp(
              'Sampler Method',
              'Selects the specific algorithm (sampling method) the AI uses to create the image step-by-step. Different samplers can produce slightly different styles or levels of detail. (Note: Not typically user-configurable for DALL-E API). (Setting not yet active)',
            )
          "
        >
          ?
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

// Define the props this component expects from its parent
defineProps({
  showHelp: {
    type: Function,
    required: true,
  },
  // Add other props here if/when image gen settings become active
})
</script>

<style scoped>
/* Include styles consistent with other tabs */
.setting-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color-light);
  gap: 1rem;
}
.setting-item:last-child {
  border-bottom: none;
}

.setting-item.wide-item {
  grid-template-columns: auto 1fr auto; /* Original layout for wide */
  grid-template-areas:
    'label control help'
    '. description .';
  align-items: start; /* Align start for multi-line content */
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
}
.setting-description {
  font-size: 0.8em;
  color: var(--text-secondary);
  font-weight: 400;
  margin-top: 0.2rem;
  white-space: normal;
}

.settings-select,
.settings-slider,
.settings-input,
.settings-textarea,
.help-button {
  justify-self: end; /* Align control to the end */
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
  min-width: 100px;
  max-width: 200px;
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
  min-width: 200px;
  max-width: 100%; /* Allow it to fill */
  resize: vertical;
  min-height: calc(1.4em * 2 + 0.8rem);
}

.settings-slider {
  cursor: pointer;
  padding: 0;
  height: 20px;
  vertical-align: middle;
  min-width: 120px;
  max-width: 150px;
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

/* Advanced section */
.advanced-settings-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid var(--border-color-medium);
}
.advanced-settings-section h3 {
  margin-bottom: 1rem;
  color: var(--text-secondary);
  font-weight: 600;
}
</style>
