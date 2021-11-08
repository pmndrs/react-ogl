import { createRoot } from '../'
import { createInternals } from '../shared'

/**
 * Renders JSX into OGL state.
 */
export const render = (element, config = {}) => {
  // Create canvas shim
  const canvas = config.canvas || document.createElement('canvas')

  // Init state
  const internalState = createInternals(canvas, config)

  // Render and get output state
  let state = {}
  if (!state.root) state.root = createRoot(canvas, internalState)
  state = state.root.render(element)

  return state
}
