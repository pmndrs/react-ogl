import * as React from 'react'
import { View } from 'react-native'
import { create, ReactTestRenderer } from 'react-test-renderer'
import { act } from '../src'
import { Canvas } from '../src/Canvas.native' // explicitly require native module

describe('Canvas', () => {
  it('should correctly mount', async () => {
    let renderer: ReactTestRenderer = null!

    await act(async () => {
      renderer = create(
        <Canvas>
          <transform />
        </Canvas>,
      )
    })

    expect(renderer.toTree()).toMatchSnapshot()
  })

  it('should forward ref', async () => {
    const ref = React.createRef<View>()

    await act(async () => {
      create(
        <Canvas ref={ref}>
          <transform />
        </Canvas>,
      )
    })

    expect(ref.current).toBeDefined()
  })

  it('should correctly unmount', async () => {
    let renderer: ReactTestRenderer

    await act(async () => {
      renderer = create(
        <Canvas>
          <transform />
        </Canvas>,
      )
    })

    expect(() => renderer.unmount()).not.toThrow()
  })
})
