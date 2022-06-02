import * as React from 'react'
import { RenderProps, RootState, render } from 'react-ogl'

/**
 * Renders JSX into OGL state.
 */
export const renderAsync = async (element: React.ReactNode, config?: RenderProps): Promise<RootState> =>
  new Promise((res) => render(element, document.createElement('canvas'), config, (store) => res(store.getState())))
