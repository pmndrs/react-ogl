import * as React from 'react'
import { View } from 'react-native'
import { render, RenderAPI } from '@testing-library/react-native'
import { reconciler } from '../src'
import { Canvas } from '../src/Canvas.native' // explicitly require native module

describe('Canvas', () => {
  it('should correctly mount', async () => {
    let renderer: RenderAPI

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
    const ref = React.createRef<View>()

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
    let renderer: RenderAPI

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
