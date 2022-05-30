import * as OGL from 'ogl'
import * as React from 'react'
import { Fiber } from 'react-reconciler'
import create, { SetState } from 'zustand'
import { reconciler } from './reconciler'
import { RENDER_MODES } from './constants'
import { OGLContext } from './hooks'
import { Root, RootState, RootStore } from './types'

// Store roots here since we can render to multiple targets
const roots = new Map<HTMLCanvasElement, { fiber: Fiber; store: RootStore }>()

/**
 * Renders React elements into OGL elements.
 */
export const render = (
  element: React.ReactNode,
  target: HTMLCanvasElement,
  { mode = 'blocking', ...config }: Partial<RootState>,
) => {
  // Check for existing root, create on first run
  let root = roots.get(target)
  if (!root) {
    // Create root store
    const store = create((set: SetState<RootState>, get: SetState<RootState>) => ({
      scene: new OGL.Transform(),
      gl: config.renderer?.gl,
      ...(config as RootState),
      set,
      get,
    }))

    // Bind events
    const state = store.getState()
    if (state.events?.connect && !state.events?.connected) state.events.connect(target, state)

    // Create root fiber
    const fiber = reconciler.createContainer(state, RENDER_MODES[mode] ?? RENDER_MODES['blocking'], false, null)

    // Set root
    root = { fiber, store }
    roots.set(target, root)
  }

  // Update fiber
  reconciler.updateContainer(
    <OGLContext.Provider value={root.store}>{element}</OGLContext.Provider>,
    root.fiber,
    null,
    () => undefined,
  )

  return root.store
}

/**
 * Removes and cleans up internals on unmount.
 */
export const unmountComponentAtNode = (target: HTMLCanvasElement) => {
  const root = roots.get(target)
  if (!root) return

  // Clear container
  reconciler.updateContainer(null, root.fiber, null, () => {
    // Delete root
    roots.delete(target)

    const state = root.store.getState()

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
