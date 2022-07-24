import { createEvents } from './utils'
import { EventManager } from './types'

/**
 * Base DOM events and their JSX keys with passive args.
 */
export const EVENTS = {
  click: ['onClick', false],
  pointerup: ['onPointerUp', true],
  pointerdown: ['onPointerDown', true],
  pointermove: ['onPointerMove', true],
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
    state.events!.disconnect?.(canvas, state)

    // Get event handler
    const { handleEvent } = createEvents(state)

    // Create handlers
    state.events!.handlers = Object.entries(EVENTS).reduce(
      (acc, [name, [type]]) => ({
        ...acc,
        [name]: (event: PointerEvent) => handleEvent(event, type),
      }),
      {} as any,
    )

    // Register handlers
    for (const key in EVENTS) {
      const handler = state.events!.handlers?.[key]
      if (handler) {
        const [, passive] = EVENTS[key as keyof typeof EVENTS]
        canvas.addEventListener(key, handler, { passive })
      }
    }

    // Mark events as connected
    state.events!.connected = true
  },
  /**
   * Deletes and disconnects event listeners from canvas.
   */
  disconnect(canvas, state) {
    // Disconnect handlers
    for (const key in EVENTS) {
      const handler = state.events!.handlers?.[key]
      if (handler) {
        canvas.removeEventListener(key, handler as any)
      }
    }

    // Mark events as disconnected
    state.events!.connected = false
  },
}
