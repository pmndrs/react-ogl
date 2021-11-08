import { createEvents } from '../shared/utils'

/**
 * Base DOM events and their JSX keys with passive args.
 */
export const EVENT_TYPES = {
  click: ['onClick', false],
  dblclick: ['onDoubleClick', false],
  pointerup: ['onPointerUp', true],
  pointerdown: ['onPointerDown', true],
  pointermove: ['onPointerMove', true],
}

/**
 * DOM OGL events manager.
 */
export const events = {
  /**
   * Creates and registers event listeners on our canvas.
   */
  connect(canvas, state) {
    // Event handlers
    const { handleEvent } = createEvents(state)

    // Save listeners to canvas
    canvas.__listeners = {}

    // Register events
    Object.entries(EVENT_TYPES).forEach(([name, [type, passive]]) => {
      const listener = (event) => handleEvent(event, type)
      canvas.addEventListener(name, listener, { passive })
      canvas.__listeners[name] = listener
    })
  },
  /**
   * Deletes and disconnects event listeners from canvas.
   */
  disconnect(canvas) {
    // Get listeners from canvas
    const listeners = canvas.__listeners

    // Disconnect listeners
    Object.entries(listeners).forEach(([name, listener]) => {
      canvas.removeEventListener(name, listener)
    })

    // Remove listeners from canvas
    delete canvas.__listeners
  },
}
