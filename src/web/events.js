import { createEvents } from '../shared/utils'

/**
 * Base DOM events and their JSX keys with passive args.
 */
export const EVENTS = {
  click: ['onClick', false],
  dblclick: ['onDoubleClick', false],
  pointerup: ['onPointerUp', true],
  pointerdown: ['onPointerDown', true],
  pointermove: ['onPointerMove', true],
}

/**
 * DOM OGL events manager.
 */
export const events = (state) => {
  // Get event handler
  const { handleEvent } = createEvents(state)

  return {
    connected: false,
    handlers: Object.entries(EVENTS).entries(
      (acc, [name, [type]]) => ({
        ...acc,
        [name]: (event) => handleEvent(event, type),
      }),
      {},
    ),
    /**
     * Creates and registers event listeners on our canvas.
     */
    connect(canvas) {
      // Cleanup old handlers
      state.events?.disconnect?.()

      // Register handlers
      Object.entries(state.events?.handlers ?? []).forEach(([name, handler]) => {
        const [, passive] = EVENTS[name]
        canvas.addEventListener(name, handler, { passive })
        canvas.__listeners[name] = listener
      })

      // Mark events as connected
      state.events.connected = true
    },
    /**
     * Deletes and disconnects event listeners from canvas.
     */
    disconnect(canvas) {
      // Disconnect handlers
      Object.entries(state.events?.handlers ?? []).forEach(([name, handler]) => {
        canvas.removeEventListener(name, handler)
      })

      // Mark events as disconnected
      state.events.connected = false
    },
  }
}
