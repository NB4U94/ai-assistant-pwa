// src/composables/useUIUtils.js
import { reactive } from 'vue'

// Error callback type definition (optional JSDoc)
/**
 * @callback AddErrorCallback
 * @param {string} errorMessage - The error message text.
 */

/**
 * Composable providing various UI utility functions for the ChatView.
 * @param {object} [dependencies={}] - Optional dependencies object.
 * @param {AddErrorCallback} [dependencies.addErrorMessage] - Callback to display errors. Defaults to console.error.
 * @returns {object} - Utility functions and related state.
 */
export function useUIUtils(dependencies = {}) {
  // Default to empty object if no args passed
  // Destructure with a default function if addErrorMessage is missing
  const {
    addErrorMessage = (msg) =>
      console.error('useUIUtils: addErrorMessage callback was not provided!', msg),
  } = dependencies

  // --- State for Copy Button Animation ---
  const copiedState = reactive({})

  // --- Timestamp Formatting ---
  const formatTimestamp = (ts) => {
    /* ... function body ... */
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
  const copyText = async (text, messageId, event = null) => {
    /* ... function body ... */
    if (!navigator.clipboard) {
      addErrorMessage('Clipboard API not available.')
      return
    }
    if (!messageId) {
      console.warn('copyText called without messageId.')
      try {
        await navigator.clipboard.writeText(text)
      } catch (e) {
        /* ignore */
      }
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      copiedState[messageId] = true
      setTimeout(() => {
        copiedState[messageId] = false
      }, 1500)
    } catch (err) {
      console.error('Copy to clipboard failed:', err)
      addErrorMessage(`Copy failed: ${err.message}`)
      copiedState[messageId] = false
    }
  }

  // --- Link Processing ---
  const processMessageText = (text) => {
    /* ... function body ... */
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
    /* ... function body ... */
    const textarea = event.target
    if (!textarea) return
    textarea.style.height = 'auto'
    const maxH = 150
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxH)}px`
  }

  // --- Return Utilities & State ---
  return {
    copiedState,
    formatTimestamp,
    copyText,
    processMessageText,
    autoGrowTextarea,
  }
}
