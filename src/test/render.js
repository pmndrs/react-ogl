import { createRoot, reconciler } from '../'
import { createDefaults } from '../shared'

/**
 * Renders JSX into OGL state.
 */
export const render = async (element, config = {}) => {
  // Create canvas shim
  const canvas = config.canvas || document.createElement('canvas')

  // Init state
  const internalState = createDefaults(canvas, {
    ...config,
    frameloop: 'never',
    events: null,
  })

  // Render and get output state
  let state = {}
  await reconciler.act(async () => {
    if (!state.root) state.root = createRoot(canvas, internalState)
    state = state.root.render(element)
  })

  return state
}
