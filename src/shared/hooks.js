import { useLayoutEffect, useEffect, createContext, useContext, useRef } from 'react'
import * as OGL from 'ogl'
import { createRoot } from '../renderer'
import { applyProps } from '../utils'

/**
 * An SSR-friendly useLayoutEffect.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Internal OGL context.
 */
export const OGLContext = createContext(null)

/**
 * Accesses internal OGL state.
 */
export const useOGL = () => {
  const state = useContext(OGLContext)
  // We can only access context from within the scope of a context provider.
  // If used outside, we throw an error instead of returning null for DX.
  if (!state) throw 'Hooks must used inside a canvas or OGLContext provider!'
  return state
}

/**
 * Subscribe an element into a shared render loop.
 */
export const useFrame = (callback, renderPriority = 0) => {
  const state = useOGL()
  // Store frame callback in a ref so we can pass a mutable reference.
  // This allows the callback to dynamically update without blocking
  // the render loop.
  const ref = useRef(callback)
  useLayoutEffect(() => void (ref.current = callback), [callback])
  // Subscribe on mount and unsubscribe on unmount
  useLayoutEffect(() => {
    state.subscribe(ref, renderPriority)
    return () => state.unsubscribe(ref, renderPriority)
  }, [state, renderPriority])
}

/**
 * Creates default OGL rendering internals.
 */
export const useDefaults = (canvas, props) => {
  const state = useRef()
  const animation = useRef()

  useIsomorphicLayoutEffect(() => {
    // Create or accept renderer, apply props
    const renderer =
      props.renderer instanceof OGL.Renderer
        ? props.renderer
        : new OGL.Renderer({
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
            ...props.renderer,
            canvas: canvas.current,
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
    state.current = {
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
    state.current.root = createRoot(canvas.current, state.current)

    // Animate
    const animate = (time) => {
      // Cancel animation if frameloop is set, otherwise keep looping
      if (props.frameloop === 'never') return cancelAnimationFrame(animation.current)
      animation.current = requestAnimationFrame(animate)

      // Call subscribed elements
      subscribed.forEach((ref) => ref.current?.(state.current, time))

      // If rendering manually, skip render
      if (priority) return

      // Render to screen
      renderer.render({ scene, camera })
    }
    if (props.frameloop !== 'never') animate()

    // Handle callback
    if (props.onCreated) props.onCreated(state.current)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    const animationRef = animation.current

    return () => {
      cancelAnimationFrame(animationRef)
      if (state.current.root) state.current.root.unmount()
    }
  }, [])

  return state
}
