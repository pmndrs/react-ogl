import * as React from 'react'
// @ts-ignore
import * as OGL from 'ogl'
import { render } from './utils'
import { Node, extend, reconciler, RootState } from '../src'

class CustomElement extends OGL.Transform {}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      customElement: Node<CustomElement, typeof CustomElement>
    }
  }
}

describe('renderer', () => {
  it('should render JSX', async () => {
    let state: RootState

    await reconciler.act(async () => {
      state = render(<transform />)
    })

    expect(state.scene.children.length).not.toBe(0)
  })

  it('should render extended elements', async () => {
    let state: RootState

    await reconciler.act(async () => {
      extend({ CustomElement })
      state = render(<customElement />)
    })

    const [element] = state.scene.children

    expect(element instanceof CustomElement).toBe(true)
  })

  it('should set pierced props', async () => {
    let state: RootState

    await reconciler.act(async () => {
      state = render(
        <mesh>
          <geometry attributes-test={{ size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) }} />
          <normalProgram />
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
    let state: RootState

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
    let state: RootState

    const Mesh = ({ value }) => (
      <mesh>
        <box />
        <normalProgram uniforms={{ uniform: { value } }} />
      </mesh>
    )

    await reconciler.act(async () => {
      state = render(<Mesh value={false} />)
    })

    expect(state.scene.children[0].program.uniforms.uniform.value).toBe(false)

    await reconciler.act(async () => {
      state = render(<Mesh value={true} />)
    })

    expect(state.scene.children[0].program.uniforms.uniform.value).toBe(true)
  })

  it('should accept shorthand props as uniforms', async () => {
    let state: RootState

    await reconciler.act(async () => {
      state = render(
        <mesh>
          <box />
          <normalProgram uniforms={{ color: 'white', vector: [0, 0, 0] }} />
        </mesh>,
      )
    })

    const [mesh] = state.scene.children
    const { color, vector } = mesh.program.uniforms

    expect(color.value instanceof OGL.Color).toBe(true)
    expect(vector.value instanceof OGL.Vec3).toBe(true)
  })

  it('should accept props as geometry attributes', async () => {
    let state: RootState

    const position = { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) }
    const uv = { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) }

    await reconciler.act(async () => {
      state = render(
        <mesh>
          <geometry position={position} uv={uv} />
          <normalProgram />
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
          connected: false,
          connect: () => (bind = true),
          disconnect: () => (unbind = true),
        },
      })
      state.root.unmount()
    })

    expect(bind).toBe(true)
    expect(unbind).toBe(true)
  })

  it('will create an identical instance when reconstructing', async () => {
    let state: RootState = null!

    const Test = ({ n }: { n: number }) => (
      // @ts-ignore args isn't a valid prop but changing it will swap
      <transform args={[n]}>
        <transform attach="test" />
        <transform visible={false} />
      </transform>
    )

    await reconciler.act(async () => {
      state = render(<Test n={1} />)
    })

    const [oldInstance] = state.scene.children
    oldInstance.original = true

    await reconciler.act(async () => {
      state = render(<Test n={2} />)
    })

    const [newInstance] = state.scene.children
    expect(newInstance.original).not.toBe(true) // Created a new instance
    expect(newInstance.children[0].visible).toBe(false) // Preserves scene hierarchy
    expect(newInstance.test.visible).toBe(true) // Preserves scene hierarchy through attach
  })
})
