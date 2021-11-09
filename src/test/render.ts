import { createInternals } from '../shared'
import { RenderProps } from '../types'

/**
 * Renders JSX into OGL state.
 */
export const render = (element: React.ReactNode, config: RenderProps) => {
  // Create canvas shim
  const canvas = document.createElement('canvas')

  // Init internals
  const { root } = createInternals(canvas, config)

  // Render and get output state
  const state = root.render(element)

  return state
}
