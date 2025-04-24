// src/composables/useChatScroll.js
import { ref, watch, nextTick } from 'vue'

/**
 * Composable for managing automatic scrolling of a chat message area.
 * @param {Ref<HTMLElement | null>} scrollElementRef - A template ref pointing to the scrollable element.
 * @param {Ref<Array<any>>} messagesRef - A ref containing the array of messages to watch.
 */
export function useChatScroll(scrollElementRef, messagesRef) {
  const isScrolledToBottom = ref(true)

  const scrollToBottom = async (behavior = 'smooth') => {
    await nextTick()
    const el = scrollElementRef.value
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior })
    } else {
      console.warn('[useChatScroll] scrollToBottom called but scrollElementRef is not available.')
    }
  }

  const instantScrollToBottom = () => scrollToBottom('auto')

  watch(
    messagesRef,
    // Removed unused arguments from the callback signature
    async () => {
      const el = scrollElementRef.value
      if (el) {
        const scrollThreshold = 50
        isScrolledToBottom.value =
          el.scrollHeight - el.scrollTop - el.clientHeight < scrollThreshold
      } else {
        isScrolledToBottom.value = true
      }

      if (!el) {
        await nextTick()
      }

      if (scrollElementRef.value && isScrolledToBottom.value) {
        scrollToBottom('smooth')
      }
    },
    { deep: true },
  )

  return {
    scrollToBottom,
    instantScrollToBottom,
  }
}
