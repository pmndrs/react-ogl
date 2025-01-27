import * as React from 'react'
import { View } from 'react-native'
import { create, ReactTestRenderer } from 'react-test-renderer'
import { Canvas } from '../src/Canvas.native' // explicitly require native module

describe('Canvas', () => {
  it('should correctly mount', async () => {
    let renderer: ReactTestRenderer = null!

    await React.act(async () => {
      renderer = create(
        <Canvas>
          <transform />
        </Canvas>,
      )
    })

    expect(renderer.toJSON()).toMatchSnapshot()
  })

  it('should forward ref', async () => {
    const ref = React.createRef<View>()

    await React.act(async () => {
      create(
        <Canvas ref={ref}>
          <transform />
        </Canvas>,
      )
    })

    expect(ref.current).toBeDefined()
  })

  it('should forward context', async () => {
    const ParentContext = React.createContext<boolean>(null!)
    let receivedValue!: boolean

    function Test() {
      receivedValue = React.useContext(ParentContext)
      return null
    }

    await React.act(async () => {
      create(
        <ParentContext.Provider value={true}>
          <Canvas>
            <Test />
          </Canvas>
        </ParentContext.Provider>,
      )
    })

    expect(receivedValue).toBe(true)
  })

  it('should correctly unmount', async () => {
    let renderer: ReactTestRenderer

    await React.act(async () => {
      renderer = create(
        <Canvas>
          <transform />
        </Canvas>,
      )
    })

    expect(async () => await React.act(async () => renderer.unmount())).not.toThrow()
  })
})
