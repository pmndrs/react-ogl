import * as React from 'react'
// @ts-ignore
import * as OGL from 'ogl'
import { suspend } from 'suspend-react'
import { useOGL } from '../hooks'
import { buildGraph } from '../shared/utils'

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

/**
 * An SSR-friendly useLayoutEffect.
 */
export const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

/**
 * Creates an `ObjectMap` from an object.
 */
export const useGraph = (object: OGL.Transform) => {
  return React.useMemo(() => buildGraph(object), [object])
}
