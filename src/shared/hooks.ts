import * as React from 'react'
// @ts-ignore
import * as OGL from 'ogl'
import { buildGraph } from './utils'

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
