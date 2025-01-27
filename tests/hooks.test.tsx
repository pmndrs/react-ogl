import * as React from 'react'
import * as OGL from 'ogl'
import { create } from 'zustand'
import { render } from './utils'
import { OGLContext, useOGL, useFrame, RootState, Subscription, Instance, useInstanceHandle } from '../src'

describe('useOGL', () => {
  it('should return OGL state', async () => {
    let state: RootState = null!

    const Test = () => {
      state = useOGL()
      return null
    }

    await React.act(async () => {
      render(
        <OGLContext.Provider value={create(() => ({ test: 'test' })) as any}>
          <Test />
        </OGLContext.Provider>,
      )
    })

    expect(state.test).toBe('test')
  })

  it('should throw when used outside of context', async () => {
    let threw = false

    try {
      useOGL()
    } catch (_) {
      threw = true
    }

    expect(threw).toBe(true)
  })
})

describe('useFrame', () => {
  it('should subscribe an element to the frameloop', async () => {
    let state: RootState = null!
    let time: number = null!

    const subscribe = (callback: React.RefObject<Subscription>) => {
      callback.current('test' as any, 1)
    }

    const Test = () => {
      useFrame((...args) => {
        state = args[0]
        time = args[1]
      })
      return null
    }

    await React.act(async () => {
      render(
        <OGLContext.Provider value={create(() => ({ subscribe })) as any}>
          <Test />
        </OGLContext.Provider>,
      )
    })

    expect(state).toBeDefined()
    expect(time).toBeDefined()
  })

  it('should accept render priority', async () => {
    let priority = 0

    const subscribe = (_: React.RefObject<Subscription>, renderPriority: number) => {
      if (renderPriority) priority += renderPriority
    }

    const Test = () => {
      useFrame(null!, 1)
      return null
    }

    await React.act(async () => {
      render(
        <OGLContext.Provider value={create(() => ({ subscribe })) as any}>
          <Test />
        </OGLContext.Provider>,
      )
    })

    expect(priority).not.toBe(0)
  })
})

describe('useInstanceHandle', () => {
  it('should return Instance state', async () => {
    const ref = React.createRef<OGL.Transform>()
    let instance!: React.RefObject<Instance>

    const Component = () => {
      instance = useInstanceHandle(ref)
      return <transform ref={ref} />
    }
    await React.act(async () => render(<Component />))

    expect(instance.current).toBe((ref.current as unknown as any).__ogl)
  })
})
