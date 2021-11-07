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
 * This hooks lets users access internal OGL state.
 */
export const useOGL = () => {
  const state = useContext(OGLContext)
  // We can only access context from within the scope of a context provider.
  // If used outside, we throw an error instead of returning null for DX.
  if (!state) throw 'Hooks must used inside a canvas or OGLContext provider!'
  return state
}

/**
 * This hook lets users subscribe their elements into a shared render loop.
 */
export const useFrame = (callback) => {
  const state = useOGL()
  // Store frame callback in a ref so we can pass a mutable reference.
  // This allows the callback to dynamically update without blocking
  // the render loop.
  const ref = useRef(callback)
  useLayoutEffect(() => void (ref.current = callback), [callback])
  // Subscribe on mount and unsubscribe on unmount (runs twice).
  // We used void in the last effect to have it only run on mount
  useLayoutEffect(() => state.subscribe(ref), [state])
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

    // Keep track of elements subscribed to the render loop with useFrame
    let subscribed = []

    // Subscribe/unsubscribe elements to the render loop
    const subscribe = (refCallback) => {
      if (subscribed.includes(refCallback)) {
        subscribed = subscribed.filter((entry) => entry !== refCallback)
      } else {
        subscribed.push(refCallback)
      }
    }

    // Animate
    const animate = (time) => {
      requestAnimationFrame(animate)

      subscribed.forEach((ref) => ref.current?.(state.current, time))
      renderer.render({ scene, camera })
    }
    animate()

    // Set initial state
    state.current = { renderer, gl, camera, scene, subscribe }

    // Init root
    state.current.root = createRoot(canvas.current, state.current)

    // Bind events
    if (props.events) {
      state.current.events = props.events
      state.current.events.connect(canvas.current, state.current)
    }

    // Handle callback
    if (props.onCreated) props.onCreated(state.current)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    const animationRef = animation.current

    return () => {
      cancelAnimationFrame(animationRef)
      if (state.current.events?.disconnect) state.current.events.disconnect()
      if (state.current.root) state.current.root.unmount()
    }
  }, [])

  return state
}
