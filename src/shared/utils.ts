// @ts-ignore
import * as OGL from 'ogl'
import { applyProps } from '../utils'
import { createRoot } from '../renderer'
import { RootState, EventHandlers, RenderProps, Subscription } from '../types'
import { MutableRefObject } from 'react'

/**
 * Creates event handlers, returning an event handler method.
 */
export const createEvents = (state: RootState) => {
  // Init event state
  state.mouse = new OGL.Vec2()
  state.raycaster = new OGL.Raycast(state.gl)
  state.hovered = new Map()

  const handleEvent = (event: MouseEvent | PointerEvent, type: keyof EventHandlers) => {
    // Convert mouse coordinates
    state.mouse.x = (event.clientX / state.renderer.width) * 2 - 1
    state.mouse.y = -(event.clientY / state.renderer.height) * 2 + 1

    // Get elements that intersect with our pointer
    state.raycaster.castMouse(state.camera, state.mouse)
    const intersects: OGL.Transform[] = state.raycaster.intersectBounds(state.scene.children)

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

/**
 * Configures rendering internals akin to R3F.
 */
export const createInternals = (canvas: HTMLCanvasElement, props: RenderProps): RootState => {
  // Create or accept renderer, apply props
  const renderer =
    props.renderer instanceof OGL.Renderer
      ? props.renderer
      : new OGL.Renderer({
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
          ...props.renderer,
          canvas: canvas,
        })
  if (props.renderer) applyProps(renderer, props.renderer)
  const gl = renderer.gl

  // Create or accept camera, apply props
  const camera = props.camera instanceof OGL.Camera ? props.camera : new OGL.Camera({ ...props.camera })
  camera.position.z = 5
  if (props.camera) applyProps(camera, props.camera)

  // Create scene
  const scene = new OGL.Transform()

  // Init rendering internals for useFrame, keep track of subscriptions
  let priority = 0
  let subscribed = []

  // Subscribe/unsubscribe elements to the render loop
  const subscribe = (refCallback: MutableRefObject<Subscription>, renderPriority?: number) => {
    // Subscribe callback
    subscribed.push(refCallback)

    // Enable manual rendering if renderPriority is positive
    if (renderPriority) priority += 1
  }

  const unsubscribe = (refCallback: MutableRefObject<Subscription>, renderPriority?: number) => {
    // Unsubscribe callback
    subscribed = subscribed.filter((entry) => entry !== refCallback)

    // Disable manual rendering if renderPriority is positive
    if (renderPriority) priority -= 1
  }

  // Set initial state
  const state: RootState = {
    ...props,
    renderer,
    gl,
    camera,
    scene,
    priority,
    subscribed,
    subscribe,
    unsubscribe,
  }

  // Init root
  const root = createRoot(canvas, state)

  // Handle callback
  if (props.onCreated) props.onCreated(state)

  // Animate
  const animate = (time?: number) => {
    // Cancel animation if frameloop is set, otherwise keep looping
    if (props.frameloop === 'never') return cancelAnimationFrame(state.animation)
    state.animation = requestAnimationFrame(animate)

    // Call subscribed elements
    subscribed.forEach((ref) => ref.current?.(state, time))

    // If rendering manually, skip render
    if (priority) return

    // Render to screen
    renderer.render({ scene, camera })
  }
  if (props.frameloop !== 'never') animate()

  return { ...state, root }
}
