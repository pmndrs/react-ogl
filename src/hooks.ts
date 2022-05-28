import * as React from 'react'
import * as OGL from 'ogl'
import { suspend } from 'suspend-react'
import { RootState, Subscription } from './types'
import { buildGraph } from './utils'

/**
 * An SSR-friendly useLayoutEffect.
 */
const isSSR =
  typeof window === 'undefined' || !window.navigator || /ServerSideRendering|^Deno\//.test(window.navigator.userAgent)
export const useIsomorphicLayoutEffect = isSSR ? React.useEffect : React.useLayoutEffect

/**
 * Internal OGL context.
 */
export const OGLContext = React.createContext<RootState | null>(null)

/**
 * Accesses internal OGL state.
 */
export const useOGL = () => {
  const state = React.useContext(OGLContext)
  // We can only access context from within the scope of a context provider.
  // If used outside, we throw an error instead of returning null for DX.
  if (!state) throw 'Hooks must used inside a canvas or OGLContext provider!'
  return state
}

/**
 * Creates an `ObjectMap` from an object.
 */
export const useGraph = (object: OGL.Transform) => {
  return React.useMemo(() => buildGraph(object), [object])
}

/**
 * Subscribe an element into a shared render loop.
 */
export const useFrame = (callback: Subscription, renderPriority = 0) => {
  const state = useOGL()
  // Store frame callback in a ref so we can pass a mutable reference.
  // This allows the callback to dynamically update without blocking
  // the render loop.
  const ref = React.useRef(callback)
  React.useLayoutEffect(() => void (ref.current = callback), [callback])
  // Subscribe on mount and unsubscribe on unmount
  React.useLayoutEffect(() => {
    state.subscribe(ref, renderPriority)
    return () => void state.unsubscribe(ref, renderPriority)
  }, [state, renderPriority])
}

/**
 * Loads assets suspensefully.
 */
export const useLoader = (loader: any, input: string | string[], extensions?: (loader: any) => void) => {
  const { gl } = useOGL()

  // Put keys into an array so their contents are spread and cached with suspend
  const keys = Array.isArray(input) ? input : [input]

  return suspend(
    async (loader, ...urls) => {
      // Call extensions
      extensions?.(loader)

      const result = await Promise.all(
        urls.map(async (url) => {
          // OGL's loaders don't have a consistent signature
          if (loader === OGL.TextureLoader) return loader.load(gl, { url })

          const data = await loader.load(gl, url)

          // Cleanup GLTF and build a graph
          if (data.scene) {
            const scene = data.scene.length ? data.scene[0] : data.scene
            const graph = buildGraph(scene)

            Object.assign(data, { scene, ...graph })
          }

          return data
        }),
      )

      // Return result | result[], mirroring input | input[]
      return Array.isArray(input) ? result : result[0]
    },
    [loader, ...keys],
  )
}
