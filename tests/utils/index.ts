import * as React from 'react'
import { createInternals, RenderProps, RootState } from '../../src'

/**
 * Renders JSX into OGL state.
 */
export const render = (element: React.ReactNode, config?: RenderProps): RootState => {
  // Create canvas
  const canvas = document.createElement('canvas')

  // Init internals
  const { root } = createInternals(canvas, config || {}).getState()

  // Render and get output state
  const state = root.render(element).getState()

  return { ...state, root }
}
