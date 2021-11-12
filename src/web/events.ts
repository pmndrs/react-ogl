import { createEvents } from '../utils'
import { EventManager } from '../types'

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
    state.events?.disconnect?.(canvas, state)

    // Get event handler
    const { handleEvent } = createEvents(state)

    // Create handlers
    state.events.handlers = Object.entries(EVENTS).reduce(
      (acc, [name, [type]]: [keyof typeof EVENTS, typeof EVENTS[keyof typeof EVENTS]]) => ({
        ...acc,
        [name]: (event: PointerEvent) => handleEvent(event, type),
      }),
      {},
    )

    // Register handlers
    Object.entries(state.events.handlers ?? []).forEach(([name, handler]) => {
      const [, passive] = EVENTS[name]
      canvas.addEventListener(name, handler as any, { passive })
    })

    // Mark events as connected
    state.events.connected = true
  },
  /**
   * Deletes and disconnects event listeners from canvas.
   */
  disconnect(canvas, state) {
    // Disconnect handlers
    Object.entries(state.events?.handlers ?? []).forEach(([name, handler]) => {
      canvas.removeEventListener(name, handler as any)
    })

    // Mark events as disconnected
    state.events.connected = false
  },
}
