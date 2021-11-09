import { GestureResponderEvent } from 'react-native'
import Pressability from 'react-native/Libraries/Pressability/Pressability'
import { createEvents } from '../shared/utils'
import { EventHandlers, EventManager } from '../types'

/**
 * Base Pressability events and their JSX keys for native & web.
 */
export const EVENTS = {
  onPress: 'onClick',
  onPressIn: 'onPointerDown',
  onPressOut: 'onPointerUp',
  onPressMove: 'onPointerMove',
} as const

/**
 * DOM OGL events manager.
 */
export const events: EventManager = {
  connected: false,
  /**
   * Creates and registers event listeners on our canvas.
   */
  connect(canvas, state) {
    // Cleanup old handlers
    state.events.disconnect?.(canvas, state)

    // Event handlers
    const { handleEvent } = createEvents(state)

    // Emulate DOM events
    const handleTouch = (event: GestureResponderEvent, type: keyof EventHandlers) => {
      event.persist()

      // Apply offset
      ;(event.nativeEvent as any).offsetX = event.nativeEvent.pageX
      ;(event.nativeEvent as any).offsetY = event.nativeEvent.pageY

      // Handle event
      return handleEvent(event.nativeEvent as unknown as MouseEvent | PointerEvent, type)
    }

    // Init handlers
    state.events.handlers = Object.entries(EVENTS).reduce(
      (acc, [name, type]: [keyof typeof EVENTS, typeof EVENTS[keyof typeof EVENTS]]) => ({
        ...acc,
        [name]: (event: GestureResponderEvent) => handleTouch(event, type),
      }),
      {},
    )

    // Create event manager
    const manager = new Pressability()

    // Mark events as connected
    state.events.connected = manager
  },
  /**
   * Deletes and disconnects event listeners from canvas.
   */
  disconnect(_, state) {
    // Early return if controls already disconnected
    if (!state.events?.connected) return // Disconnect handlers
    ;(state.events.connected as any).reset?.()

    // Mark events as disconnected
    state.events.connected = false
  },
}
