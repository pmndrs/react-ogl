import * as React from 'react'
import * as OGL from 'ogl'
import { suspend } from 'suspend-react'
import type { Instance, RootState, RootStore, Subscription } from './types'
import { classExtends } from './utils'

/**
 * An SSR-friendly useLayoutEffect.
 *
 * React currently throws a warning when using useLayoutEffect on the server.
 * To get around it, we can conditionally useEffect on the server (no-op) and
 * useLayoutEffect elsewhere.
 *
 * @see https://github.com/facebook/react/issues/14927
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' && (window.document?.createElement || window.navigator?.product === 'ReactNative')
    ? React.useLayoutEffect
    : React.useEffect

/**
 * Exposes an object's {@link Instance}.
 *
 * **Note**: this is an escape hatch to react-internal fields. Expect this to change significantly between versions.
 */
export function useInstanceHandle<O>(ref: React.RefObject<O>): React.RefObject<Instance> {
  const instance = React.useRef<Instance>(null!)
  useIsomorphicLayoutEffect(
    () => void (instance.current = (ref.current as unknown as Instance<O>['object']).__ogl!),
    [ref],
  )
  return instance
}

/**
 * Internal OGL context.
 */
export const OGLContext = React.createContext<RootStore>(null!)

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
  selector: (state: RootState) => T = (state) => state as unknown as T,
  equalityFn?: <T>(state: T, newState: T) => boolean,
) {
  return useStore()(selector, equalityFn!)
}

export interface ObjectMap {
  nodes: Record<string, OGL.Mesh>
  programs: Record<string, OGL.Program>
}

/**
 * Creates an `ObjectMap` from an object.
 */
export function useGraph(object: OGL.Transform) {
  return React.useMemo(() => {
    const data: ObjectMap = { nodes: {}, programs: {} }

    object.traverse((obj: OGL.Transform | OGL.Mesh) => {
      if (!(obj instanceof OGL.Mesh)) return

      // @ts-ignore
      if (obj.name) data.nodes[obj.name] = obj

      // @ts-ignore
      if (obj.program.gltfMaterial && !data.programs[obj.program.gltfMaterial.name]) {
        // @ts-ignore
        data.programs[obj.program.gltfMaterial.name] = obj.program
      }
    })

    return data
  }, [object])
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
  useIsomorphicLayoutEffect(() => void (ref.current = callback), [callback])
  // Subscribe on mount and unsubscribe on unmount
  useIsomorphicLayoutEffect(() => {
    subscribe(ref, renderPriority)
    return () => void unsubscribe(ref, renderPriority)
  }, [subscribe, unsubscribe, renderPriority])
}

export type LoaderRepresentation =
  | { load(gl: OGL.OGLRenderingContext, url: string): Promise<any> }
  | Pick<typeof OGL.TextureLoader, 'load'>

export type LoaderResult<L extends LoaderRepresentation> = Awaited<ReturnType<L['load']>>

/**
 * Loads assets suspensefully.
 */
export function useLoader<L extends LoaderRepresentation, I extends string | string[], R = LoaderResult<L>>(
  loader: L,
  input: I,
  extensions?: (loader: L) => void,
): I extends any[] ? R[] : R {
  const gl = useOGL((state) => state.gl)

  // Put keys into an array so their contents are spread and cached with suspend
  const keys = Array.isArray(input) ? input : [input]

  return suspend(
    async (gl, loader, ...urls) => {
      // Call extensions
      extensions?.(loader)

      const result = await Promise.all(
        urls.map(async (url: string) => {
          // @ts-ignore OGL's loaders don't have a consistent signature
          if (classExtends(loader, OGL.TextureLoader)) return loader.load(gl, { src: url })
          // @ts-ignore
          return await loader.load(gl, url)
        }),
      )

      // Return result | result[], mirroring input | input[]
      return Array.isArray(input) ? result : result[0]
    },
    [gl, loader, ...keys],
  )
}
