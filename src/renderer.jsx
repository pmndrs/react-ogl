import * as OGL from 'ogl'
import { reconciler } from './reconciler'
import { RENDER_MODES } from './constants'
import { OGLContext } from './shared/hooks'

// Store roots here since we can render to multiple canvases
const roots = new Map()

/**
 * Renders React elements into OGL elements.
 */
export const render = (element, canvas, { mode = 'blocking', ...config } = {}) => {
  // Get store and init/update OGL state
  let store = roots.get(canvas)
  let root = store?.root
  const state = Object.assign(store?.state || {}, config)

  // Init
  if (!root) {
    // Create scene if one isn't provided
    if (!state.scene) state.scene = new OGL.Transform()

    // Create root
    root = reconciler.createContainer(state.scene, RENDER_MODES[mode], false, null)

    // Bind events
    if (state.events?.connect) state.events.connect(canvas, state)
  }

  // Update root
  roots.set(canvas, { root, state })

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
export const unmountComponentAtNode = (canvas) => {
  const store = roots.get(canvas)
  if (!store) return

  const { state, root } = store

  // Clear container
  reconciler.updateContainer(null, root, null, () => {
    // Delete root
    roots.delete(canvas)

    // Cancel animation
    if (state.animation) cancelAnimationFrame(state.animation)

    // Unbind events
    if (state.events?.disconnect) state.events.disconnect(canvas)
  })
}

/**
 * Creates a root to safely render/unmount.
 */
export const createRoot = (canvas, config) => ({
  render: (element) => render(element, canvas, config),
  unmount: () => unmountComponentAtNode(canvas),
})
