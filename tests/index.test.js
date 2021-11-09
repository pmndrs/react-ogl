import * as React from 'react'
import * as OGL from 'ogl'
import { render } from '../dist/test'
import { extend, reconciler } from '../dist'

describe('renderer', () => {
  it('should render JSX', async () => {
    let state

    await reconciler.act(async () => {
      state = render(<transform />)
    })

    expect(state.scene.children.length).not.toBe(0)
  })

  it('should render extended elements', async () => {
    let state

    class CustomElement extends OGL.Transform {}

    await reconciler.act(async () => {
      extend({ CustomElement })
      state = render(<customElement />)
    })

    const [element] = state.scene.children

    expect(element instanceof CustomElement).toBe(true)
  })

  it('should set pierced props', async () => {
    let state

    await reconciler.act(async () => {
      state = render(
        <mesh>
          <geometry attributes-test={{ size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) }} />
          <program vertex="vertex" fragment="fragment" />
        </mesh>,
      )
    })

    const [element] = state.scene.children

    expect(Object.keys(element.geometry.attributes)).toStrictEqual(['test'])
  })

  it('should pass gl to args', async () => {
    let crashed = false

    try {
      await reconciler.act(async () => render(<box />))
    } catch (_) {
      crashed = true
    }

    expect(crashed).toBe(false)
  })

  it('should accept vertex and fragment as program args', async () => {
    let state

    const vertex = 'vertex'
    const fragment = 'fragment'

    await reconciler.act(async () => {
      state = render(
        <mesh>
          <box />
          <program vertex={vertex} fragment={fragment} />
        </mesh>,
      )
    })

    const [mesh] = state.scene.children

    expect(mesh.program.vertex).toBe(vertex)
    expect(mesh.program.fragment).toBe(fragment)
  })

  it('should update program uniforms reactively', async () => {
    let state

    const Mesh = ({ value }) => (
      <mesh>
        <box />
        <program vertex="vertex" fragment="fragment" uniforms={{ uniform: { value } }} />
      </mesh>
    )

    await reconciler.act(async () => {
      state = render(<Mesh value={false} />)
    })

    expect(state.scene.children[0].program.uniforms.uniform.value).toBe(false)

    await reconciler.act(async () => {
      state = render(<Mesh value={true} />, state)
    })

    expect(state.scene.children[0].program.uniforms.uniform.value).toBe(true)
  })

  it('should accept props as geometry attributes', async () => {
    let state

    const vertex = 'vertex'
    const fragment = 'fragment'

    const position = { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) }
    const uv = { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) }

    await reconciler.act(async () => {
      state = render(
        <mesh>
          <geometry position={position} uv={uv} />
          <program vertex={vertex} fragment={fragment} />
        </mesh>,
      )
    })

    const [mesh] = state.scene.children

    expect(mesh.geometry.attributes.position).toBeDefined()
    expect(mesh.geometry.attributes.uv).toBeDefined()
  })

  it('should bind & unbind events', async () => {
    let bind = false
    let unbind = false

    await reconciler.act(async () => {
      const state = render(<transform />, {
        events: {
          connect: () => (bind = true),
          disconnect: () => (unbind = true),
        },
      })
      state.root.unmount()
    })

    expect(bind).toBe(true)
    expect(unbind).toBe(true)
  })
})
