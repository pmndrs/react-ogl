import * as OGL from 'ogl'
import { applyProps } from '../utils'
import { createRoot } from '../renderer'

/**
 * Creates default rendering internals.
 */
export const createDefaults = (canvas, props) => {
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
  const camera =
    props.camera instanceof OGL.Camera
      ? props.camera
      : new OGL.Camera({ ...props.camera })
  camera.position.z = 5
  if (props.camera) applyProps(camera, props.camera)

  // Create scene
  const scene = new OGL.Transform()

  // Init rendering internals for useFrame, keep track of subscriptions
  let priority = 0
  let subscribed = []

  // Subscribe/unsubscribe elements to the render loop
  const subscribe = (refCallback, renderPriority) => {
    // Subscribe callback
    subscribed.push(refCallback)

    // Enable manual rendering if renderPriority is positive
    if (renderPriority) priority += 1
  }

  const unsubscribe = (refCallback, renderPriority) => {
    // Unsubscribe callback
    subscribed = subscribed.filter((entry) => entry !== refCallback)

    // Disable manual rendering if renderPriority is positive
    if (renderPriority) priority -= 1
  }

  // Set initial state
  const state = {
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
  state.root = createRoot(canvas, state)

  // Handle callback
  if (props.onCreated) props.onCreated(state)

  // Animate
  const animate = (time) => {
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

  return state
}
