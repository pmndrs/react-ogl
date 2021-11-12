// @ts-ignore
import * as OGL from 'ogl'
import * as React from 'react'
import { Fiber } from 'react-reconciler'
import { reconciler } from './reconciler'
import { RENDER_MODES } from './constants'
import { OGLContext } from './hooks'
import { Root, RootState } from './types'

// Store roots here since we can render to multiple targets
const roots = new Map<HTMLCanvasElement, { root: Fiber; state: RootState }>()

/**
 * Renders React elements into OGL elements.
 */
export const render = (element: React.ReactNode, target: HTMLCanvasElement, config: RootState) => {
  // Get store and init/update OGL state
  const store = roots.get(target)
  let root = store?.root
  const state = Object.assign(store?.state || {}, config)

  // Init
  if (!root) {
    // Create scene if one isn't provided
    if (!state.scene) state.scene = new OGL.Transform()

    // Add gl to state if not aliased
    if (!state.gl) state.gl = state.renderer.gl

    // Create root
    root = reconciler.createContainer(state.scene as any, RENDER_MODES['blocking'], false, null)

    // Bind events
    if (state.events?.connect) state.events.connect(target, state)
  }

  // Update root
  roots.set(target, { root, state })

  // Update fiber
  state.scene.stateNode = state
  reconciler.updateContainer(
    <OGLContext.Provider value={{ ...state }}>{element}</OGLContext.Provider>,
    root,
    null,
    () => undefined,
  )

  return state
}

/**
 * Removes and cleans up internals on unmount.
 */
export const unmountComponentAtNode = (target: HTMLCanvasElement) => {
  const store = roots.get(target)
  if (!store) return

  const { root, state } = store

  // Clear container
  reconciler.updateContainer(null, root, null, () => {
    // Delete root
    roots.delete(target)

    // Cancel animation
    if (state.animation) cancelAnimationFrame(state.animation)

    // Unbind events
    if (state.events?.disconnect) state.events.disconnect(target, state)
  })
}

/**
 * Creates a root to safely render/unmount.
 */
export const createRoot = (target: HTMLCanvasElement, config: RootState): Root => ({
  render: (element) => render(element, target, config),
  unmount: () => unmountComponentAtNode(target),
})

/**
 * Portals into a remote OGL element.
 */
export const createPortal = (children: React.ReactNode, target: OGL.Transform): React.ReactNode =>
  reconciler.createPortal(children, target, null, null)
