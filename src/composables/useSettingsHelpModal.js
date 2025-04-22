import { ref } from 'vue'

export function useSettingsHelpModal() {
  // --- Help Modal State ---
  const isHelpModalVisible = ref(false)
  const currentHelpContent = ref({ title: '', text: '' })

  // --- Help Modal Logic ---
  const showHelp = (title, text) => {
    currentHelpContent.value = { title, text }
    isHelpModalVisible.value = true
  }

  const closeHelpModal = () => {
    isHelpModalVisible.value = false
  }

  // Expose state and methods
  return {
    isHelpModalVisible,
    currentHelpContent,
    showHelp,
    closeHelpModal,
  }
}
