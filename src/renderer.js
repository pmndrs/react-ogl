import * as OGL from 'ogl'
import { reconciler } from './reconciler'
import { RENDER_MODES } from './constants'

// We store roots here since we can render to multiple canvases
const roots = new Map()

/**
 * This renders an element to a canvas, creating a renderer, scene, etc.
 */
export const render = (element, canvas, { mode = 'blocking', ...config } = {}) => {
  // Get store and init/update OGL state
  let store = roots.get(canvas)
  let root = store?.root
  const state = Object.assign(store?.state || {}, config)

  // Create root
  if (!root) {
    if (!state.scene) state.scene = new OGL.Transform()
    root = reconciler.createContainer(state.scene, RENDER_MODES[mode], false, null)
  }

  // Update root
  roots.set(canvas, { root, state })

  // Update fiber
  state.scene.state = state
  reconciler.updateContainer(element, root, null, () => undefined)

  return state
}

/**
 * This is used to remove and cleanup internals on unmount.
 */
export const unmountComponentAtNode = (canvas) => {
  const state = roots.get(canvas)
  if (!state) return

  reconciler.updateContainer(null, state.root, null, () => roots.delete(canvas))
}

/**
 * The react-dom 18 API changes how you create roots, letting you specify
 * a container once and safely render/unmount later, so we mirror that.
 */
export const createRoot = (canvas, config) => ({
  render: (element) => render(element, canvas, config),
  unmount: () => unmountComponentAtNode(canvas),
})
