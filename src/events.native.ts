import { GestureResponderEvent } from 'react-native'
import Pressability from 'react-native/Libraries/Pressability/Pressability'
import { createEvents } from './utils'
import { EventHandlers, EventManager } from './types'

/**
 * Base Pressability events and their JSX keys for native & web.
 */
export const EVENTS = {
  onPress: 'onClick',
  onPressIn: 'onPointerDown',
  onPressOut: 'onPointerUp',
  onPressMove: 'onPointerMove',
} as const

const managers = new Map<HTMLCanvasElement, any>()

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
      ;(event.nativeEvent as any).offsetX = event.nativeEvent.locationX
      ;(event.nativeEvent as any).offsetY = event.nativeEvent.locationY

      // Handle event
      return handleEvent(event.nativeEvent as unknown as PointerEvent, type)
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
    const manager = new Pressability(state.events.handlers)
    managers.set(canvas, manager)

    // Mark events as connected
    state.events.connected = true

    return state.events.connected
  },
  /**
   * Deletes and disconnects event listeners from canvas.
   */
  disconnect(canvas, state) {
    // Early return if controls already disconnected
    if (!state.events?.connected) return

    // Disconnect handlers
    const manager = managers.get(canvas)!
    manager.reset?.()

    // Mark events as disconnected
    state.events.connected = false
  },
}
