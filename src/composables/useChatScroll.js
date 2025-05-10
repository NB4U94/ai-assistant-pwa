// src/composables/useChatScroll.js
import { ref, watch, nextTick } from 'vue'

/**
 * Composable for managing automatic scrolling of a chat message area.
 * @param {Ref<HTMLElement | null>} scrollElementRef - A template ref pointing to the scrollable element.
 * @param {Ref<Array<any>>} messagesRef - A ref containing the array of messages to watch.
 */
export function useChatScroll(scrollElementRef, messagesRef) {
  const internalScrollElementRef = ref(null) // To store the actual DOM element

  const scrollToBottom = async (behavior = 'auto') => {
    await nextTick() // Ensure DOM updates are processed
    const el = internalScrollElementRef.value
    if (el) {
      // console.log(`[useChatScroll] scrollToBottom CALLED. Behavior: ${behavior}. Element scrollHeight: ${el.scrollHeight}, current scrollTop: ${el.scrollTop}`);
      el.scrollTo({ top: el.scrollHeight, behavior })
      await nextTick() // Wait for scroll to take effect if behavior is 'smooth' (though 'auto' is usually instant)
      // console.log(`[useChatScroll] scrollToBottom AFTER SCROLL. New scrollTop: ${el.scrollTop}`);
    } else {
      console.warn('[useChatScroll] scrollToBottom called but scrollElementRef is not available.')
    }
  }

  const instantScrollToBottom = () => {
    // console.log('[useChatScroll] instantScrollToBottom CALLED.')
    scrollToBottom('auto') // Use 'auto' for immediate scroll
  }

  // Watch for the scrollable element itself to become available
  watch(
    scrollElementRef,
    (newEl) => {
      if (newEl) {
        // console.log('[useChatScroll] Scroll element ref ASSIGNED:', newEl)
        internalScrollElementRef.value = newEl
        instantScrollToBottom() // Scroll to bottom when element is first available
      } else {
        // console.log('[useChatScroll] Scroll element ref UNASSIGNED.')
        internalScrollElementRef.value = null
      }
    },
    { immediate: true }, // Run immediately to catch initially available element
  )

  // Watch for changes in the messages array to trigger auto-scroll
  watch(
    messagesRef,
    async () => {
      // Parameters _newMessages, _oldMessages removed as they were unused
      // console.log('[useChatScroll] messagesRef watcher TRIGGERED.');

      // REMOVED: Optional small delay (await new Promise((resolve) => setTimeout(resolve, 50)))
      // This delay might have caused issues with timely scroll updates.

      const el = internalScrollElementRef.value
      if (!el) {
        console.warn('[useChatScroll] messagesRef watcher: scrollElement is NOT available.')
        return
      }

      // Determine if the user was scrolled to the bottom before new messages were added.
      let wasScrolledToBottom = true // Assume true if no scrollbar or content fits
      if (el.scrollHeight > el.clientHeight) {
        // Check only if scrollbar is potentially present
        const scrollThreshold = 60 // Pixels from bottom to still be considered "at the bottom"
        wasScrolledToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < scrollThreshold
        // console.log(`[useChatScroll] Scroll CHECK: scrollHeight=${el.scrollHeight}, scrollTop=${el.scrollTop}, clientHeight=${el.clientHeight}, wasScrolledToBottom=${wasScrolledToBottom}`);
      } else {
        // console.log(`[useChatScroll] Scroll CHECK: No scrollbar present or content fits (scrollHeight=${el.scrollHeight}, clientHeight=${el.clientHeight}). Assuming at bottom.`);
      }

      if (wasScrolledToBottom) {
        // console.log('[useChatScroll] Condition MET (wasScrolledToBottom = true). Attempting to scroll.');
        await scrollToBottom('auto') // Scroll with 'auto' for more instant behavior
      } else {
        // console.log('[useChatScroll] Condition NOT MET (wasScrolledToBottom = false). Not auto-scrolling.');
      }
    },
    { deep: true, flush: 'post' }, // `deep` to watch for changes within messages, `post` to run after DOM updates
  )

  return {
    scrollToBottom,
    instantScrollToBottom,
  }
}
