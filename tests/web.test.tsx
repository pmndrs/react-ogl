import * as React from 'react'
import { render, RenderResult } from '@testing-library/react'
import { reconciler, Canvas } from '../src'

describe('Canvas', () => {
  it('should correctly mount', async () => {
    let renderer: RenderResult

    await reconciler.act(async () => {
      renderer = render(
        <Canvas>
          <transform />
        </Canvas>,
      )
    })

    expect(renderer.container).toMatchSnapshot()
  })

  it('should forward ref', async () => {
    const ref = React.createRef<HTMLCanvasElement>()

    await reconciler.act(async () => {
      render(
        <Canvas ref={ref}>
          <transform />
        </Canvas>,
      )
    })

    expect(ref.current).toBeDefined()
  })

  it('should correctly unmount', async () => {
    let renderer: RenderResult

    await reconciler.act(async () => {
      renderer = render(
        <Canvas>
          <transform />
        </Canvas>,
      )
    })

    expect(() => renderer.unmount()).not.toThrow()
  })
})
