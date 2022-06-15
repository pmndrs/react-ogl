import * as React from 'react'
import * as OGL from 'ogl'
import { suspend } from 'suspend-react'
import type { StateSelector, EqualityChecker } from 'zustand'
import { RootState, RootStore, Subscription } from './types'
import { buildGraph, classExtends } from './utils'

/**
 * An SSR-friendly useLayoutEffect.
 */
const isSSR =
  typeof window === 'undefined' || !window.navigator || /ServerSideRendering|^Deno\//.test(window.navigator.userAgent)
export const useIsomorphicLayoutEffect = isSSR ? React.useEffect : React.useLayoutEffect

/**
 * Internal OGL context.
 */
export const OGLContext = React.createContext<RootStore>(null)

/**
 * Returns the internal OGL store.
 */
export function useStore() {
  const store = React.useContext(OGLContext)
  if (!store) throw `react-ogl hooks can only used inside a canvas or OGLContext provider!`
  return store
}

/**
 * Returns the internal OGL state.
 */
export function useOGL<T = RootState>(
  selector: StateSelector<RootState, T> = (state) => (state as unknown) as T,
  equalityFn?: EqualityChecker<T>,
) {
  return useStore()(selector, equalityFn)
}

/**
 * Creates an `ObjectMap` from an object.
 */
export function useGraph(object: OGL.Transform) {
  return React.useMemo(() => buildGraph(object), [object])
}

/**
 * Subscribe an element into a shared render loop.
 */
export function useFrame(callback: Subscription, renderPriority = 0) {
  const subscribe = useOGL((state) => state.subscribe)
  const unsubscribe = useOGL((state) => state.unsubscribe)
  // Store frame callback in a ref so we can pass a mutable reference.
  // This allows the callback to dynamically update without blocking
  // the render loop.
  const ref = React.useRef(callback)
  React.useLayoutEffect(() => void (ref.current = callback), [callback])
  // Subscribe on mount and unsubscribe on unmount
  React.useLayoutEffect(() => {
    subscribe(ref, renderPriority)
    return () => void unsubscribe(ref, renderPriority)
  }, [subscribe, unsubscribe, renderPriority])
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
          if (classExtends(loader, OGL.TextureLoader)) return loader.load(gl, { url })

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
