import { useLayoutEffect, createContext, useContext, useRef } from 'react'

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
