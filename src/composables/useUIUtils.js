// src/composables/useUIUtils.js
import { reactive } from 'vue'

// Error callback type definition
/**
 * @callback AddErrorCallback
 * @param {string} errorMessage - The error message text.
 */

/**
 * Composable providing various UI utility functions for the ChatView.
 * @param {object} options
 * @param {AddErrorCallback} options.addErrorMessage - Callback to display errors (used by copyText).
 * @returns {object} - Utility functions and related state.
 */
export function useUIUtils({ addErrorMessage }) {
  // --- State for Copy Button Animation ---
  const copiedState = reactive({})

  // --- Timestamp Formatting ---
  const formatTimestamp = (ts) => {
    if (!ts) return ''
    try {
      return new Date(ts).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    } catch (e) {
      console.warn('Error formatting timestamp:', ts, e)
      return '?'
    }
  }

  // --- Copy to Clipboard ---
  /**
   * Copies text to clipboard and handles button animation state.
   * @param {string} text - The text to copy.
   * @param {string | number} messageId - The unique ID of the message being copied.
   * @param {Event | null} event - Optional click event for button reference (currently not strictly needed).
   */
  const copyText = async (text, messageId, event = null) => {
    if (!navigator.clipboard) {
      addErrorMessage('Clipboard API not available.')
      return
    }
    if (!messageId) {
      console.warn('copyText called without messageId for animation.')
      // Fallback: just copy without animation state if needed, or do nothing
      try {
        await navigator.clipboard.writeText(text)
      } catch (e) {
        /* ignore fallback error */
      }
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      copiedState[messageId] = true
      // We don't strictly need the button element ref anymore with reactive state driving the template
      // const buttonElement = event?.currentTarget;
      // if (buttonElement) buttonElement.disabled = true;

      setTimeout(() => {
        copiedState[messageId] = false
        // if (buttonElement) buttonElement.disabled = false;
      }, 1500)
    } catch (err) {
      console.error('Copy to clipboard failed:', err)
      addErrorMessage(`Copy failed: ${err.message}`)
      copiedState[messageId] = false // Reset state on error
      // if (buttonElement) buttonElement.disabled = false;
    }
  }

  // --- Link Processing ---
  const processMessageText = (text) => {
    if (!text) return [{ type: 'text', text: '' }]
    const urlRegex =
      /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%?=~_.]*[-A-Z0-9+&@#/%=~_|])|(\bwww\.[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%?=~_.]*[-A-Z0-9+&@#/%=~_|])(?![^<]*?>|[^<>]*?<\/(a|button|textarea|input|img)[^<>]*?>)/gi
    const segments = []
    let lastIndex = 0
    let match
    while ((match = urlRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', text: text.substring(lastIndex, match.index) })
      }
      let rawUrl = match[0]
      let displayUrl = rawUrl
      if (match[3] && !rawUrl.match(/^(https?|ftp|file):\/\//i)) {
        rawUrl = 'https://' + rawUrl
      }
      segments.push({ type: 'link', text: displayUrl, url: rawUrl })
      lastIndex = urlRegex.lastIndex
    }
    if (lastIndex < text.length) {
      segments.push({ type: 'text', text: text.substring(lastIndex) })
    }
    if (segments.length === 0 && text) {
      segments.push({ type: 'text', text: text })
    }
    return segments
  }

  // --- Textarea Auto-Grow ---
  function autoGrowTextarea(event) {
    const textarea = event.target
    if (!textarea) return
    textarea.style.height = 'auto'
    const maxH = 150 // Max height in pixels
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxH)}px`
  }

  // --- Return Utilities & State ---
  return {
    copiedState, // The reactive state for copy animations
    formatTimestamp,
    copyText,
    processMessageText,
    autoGrowTextarea,
  }
}
