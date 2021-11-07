import * as OGL from 'ogl'

/**
 * Creates event handlers, returning an event handler method.
 */
export const createEvents = (state) => {
  // Init event state
  state.mouse = new OGL.Vec2()
  state.raycaster = new OGL.Raycast(state.gl)
  state.hovered = new Map()

  const handleEvent = (event, type) => {
    // Convert mouse coordinates
    state.mouse.x = (event.clientX / state.renderer.width) * 2 - 1
    state.mouse.y = -(event.clientY / state.renderer.height) * 2 + 1

    // Get elements that intersect with our pointer
    state.raycaster.castMouse(state.camera, state.mouse)
    const intersects = state.raycaster.intersectBounds(state.scene.children)

    // Used to discern between generic events and custom hover events.
    // We hijack the pointermove event to handle hover state
    const isHoverEvent = type === 'onPointerMove'

    // Trigger events for hovered elements
    intersects.forEach((object) => {
      const handlers = object.__handlers

      if (isHoverEvent && !state.hovered.get(object.id)) {
        // Mark object as hovered and fire its hover events
        state.hovered.set(object.id, object)

        // Fire hover events
        if (handlers?.onHover) handlers.onHover(event)
        if (handlers?.onPointerOver) handlers.onPointerOver(event)
      } else if (!isHoverEvent && handlers?.[type]) {
        // Otherwise, fire its generic event
        handlers[type](event)
      }
    })

    // Cleanup stale hover events
    if (isHoverEvent) {
      state.hovered.forEach((object) => {
        const handlers = object.__handlers

        if (!intersects.length || !intersects.find((i) => i === object)) {
          // Reset hover state
          state.hovered.delete(object.id)

          // Fire unhover event
          if (handlers?.onPointerOut) handlers.onPointerOut(event)
        }
      })
    }

    return intersects
  }

  return { handleEvent }
}
