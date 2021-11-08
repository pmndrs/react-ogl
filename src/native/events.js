import Pressability from 'react-native/Libraries/Pressability/Pressability'
import { createEvents } from '../shared/utils'

/**
 * Base Pressability events and their JSX keys for native & web.
 */
export const EVENTS = {
  onPress: 'onClick',
  onPressIn: 'onPointerDown',
  onPressOut: 'onPointerUp',
  onLongPress: 'onDoubleClick',
  onPressMove: 'onPointerMove',
}

/**
 * DOM OGL events manager.
 */
export const events = (state) => {
  // Event handlers
  const { handleEvent } = createEvents(state)

  // Emulate DOM events
  const handleTouch = (event, type) => {
    event.persist()

    // Apply offset
    event.nativeEvent.offsetX = event.nativeEvent.pageX
    event.nativeEvent.offsetY = event.nativeEvent.pageY

    // Handle event
    return handleEvent(event.nativeEvent, type)
  }

  return {
    connected: false,
    handlers: Object.entries(EVENTS).entries(
      (acc, [name, type]) => ({
        ...acc,
        [name]: (event) => handleTouch(event, type),
      }),
      {},
    ),
    /**
     * Creates and registers event listeners on our canvas.
     */
    connect() {
      // Cleanup old handlers
      state.events.disconnect?.()

      // Create event manager
      const manager = new Pressability(state.events?.handlers)

      // Mark events as connected
      state.events.connected = manager
    },
    /**
     * Deletes and disconnects event listeners from canvas.
     */
    disconnect() {
      // Early return if controls already disconnected
      if (!state.events?.connected) return

      // Disconnect handlers
      state.events.connected.reset?.()

      // Mark events as disconnected
      state.events.connected = false
    },
  }
}
