import * as React from 'react'
// @ts-ignore
import * as OGL from 'ogl'
import { render } from './utils'
import { Node, extend, reconciler, RootState, createPortal } from '../src'

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
    let state: RootState = null!

    await reconciler.act(async () => {
      state = render(<transform />)
    })

    expect(state.scene.children.length).not.toBe(0)
  })

  it('should render extended elements', async () => {
    let state: RootState = null!

    await reconciler.act(async () => {
      extend({ CustomElement })
      state = render(<customElement />)
    })

    const [element] = state.scene.children

    expect(element instanceof CustomElement).toBe(true)
  })

  it('should complete view on mount', async () => {
    const lifecycle: string[] = []

    function Test() {
      React.useLayoutEffect(() => void lifecycle.push('useLayoutEffect'), [])
      React.useEffect(() => void lifecycle.push('useEffect'), [])
      return <transform attach={() => (lifecycle.push('attach'), () => {})} />
    }

    await reconciler.act(async () => {
      render(<Test />)
    })

    expect(lifecycle).toStrictEqual(['attach', 'useLayoutEffect', 'useEffect'])
  })

  it('should set pierced props', async () => {
    const mesh = React.createRef<OGL.Mesh>()

    await reconciler.act(async () => {
      render(
        <mesh ref={mesh}>
          <geometry attributes-test={{ size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) }} />
          <normalProgram />
        </mesh>,
      )
    })

    expect(Object.keys(mesh.current!.geometry.attributes)).toStrictEqual(['test'])
  })

  it('should handle attach', async () => {
    let state: RootState = null!

    await reconciler.act(async () => {
      state = render(
        <>
          <mesh>
            <geometry />
            <normalProgram attach="program" />
          </mesh>
          <mesh>
            <geometry />
            <normalProgram
              attach={(parent, self) => {
                parent.program = self
                return () => (parent.program = undefined)
              }}
            />
          </mesh>
        </>,
      )
    })

    const [element1, element2] = state.scene.children as OGL.Mesh[]

    expect(element1.program).not.toBe(undefined)
    expect(element2.program).not.toBe(undefined)
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
    let state: RootState = null!

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

    const [mesh] = state.scene.children as OGL.Mesh[]

    expect((mesh.program as any).vertex).toBe(vertex)
    expect((mesh.program as any).fragment).toBe(fragment)
  })

  it('should update program uniforms reactively', async () => {
    const mesh = React.createRef<OGL.Mesh>()

    const Test = ({ value }) => (
      <mesh ref={mesh}>
        <box />
        <normalProgram uniforms={{ uniform: { value } }} />
      </mesh>
    )

    await reconciler.act(async () => render(<Test value={false} />))
    expect(mesh.current!.program.uniforms.uniform.value).toBe(false)

    await reconciler.act(async () => render(<Test value={true} />))
    expect(mesh.current!.program.uniforms.uniform.value).toBe(true)
  })

  it('should accept shorthand props as uniforms', async () => {
    const mesh = React.createRef<OGL.Mesh>()

    const renderer = new OGL.Renderer({ canvas: document.createElement('canvas') })
    const texture = new OGL.Texture(renderer.gl)

    await reconciler.act(async () => {
      render(
        <mesh ref={mesh}>
          <box />
          <normalProgram uniforms={{ color: 'white', vector: [0, 0, 0], textures: [texture, texture] }} />
        </mesh>,
      )
    })

    const { color, vector, textures } = mesh.current!.program.uniforms

    expect(color.value).toBeInstanceOf(OGL.Color)
    expect(vector.value).toBeInstanceOf(OGL.Vec3)
    expect(textures.value).toBeInstanceOf(Array)
    expect(textures.value[0]).toBe(texture)
    expect(textures.value[1]).toBe(texture)
  })

  it('should accept props as geometry attributes', async () => {
    const mesh = React.createRef<OGL.Mesh>()

    const position = { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) }
    const uv = { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) }

    await reconciler.act(async () => {
      render(
        <mesh ref={mesh}>
          <geometry position={position} uv={uv} />
          <normalProgram />
        </mesh>,
      )
    })

    expect(mesh.current!.geometry.attributes.position).toBeDefined()
    expect(mesh.current!.geometry.attributes.uv).toBeDefined()
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

  it('should create an identical instance when reconstructing', async () => {
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

    const [oldInstance] = state.scene.children as any[]
    oldInstance.original = true

    await reconciler.act(async () => {
      state = render(<Test n={2} />)
    })

    const [newInstance] = state.scene.children as any[]
    expect(newInstance.original).not.toBe(true) // Created a new instance
    expect(newInstance.children[0].visible).toBe(false) // Preserves scene hierarchy
    expect(newInstance.test.visible).toBe(true) // Preserves scene hierarchy through attach
  })

  it('should prepare foreign objects when portaling', async () => {
    let state: RootState = null!
    const object = new OGL.Transform()
    const mesh = React.createRef<OGL.Mesh>()

    await reconciler.act(async () => {
      state = render(
        createPortal(
          <mesh ref={mesh}>
            <box />
            <normalProgram />
          </mesh>,
          object,
        ),
      )
    })

    expect(state.scene.children.length).toBe(0)
    expect(object.children.length).not.toBe(0)
    expect(mesh.current!.parent).toBe(object)
  })

  it('should update attach reactively', async () => {
    const mesh = React.createRef<OGL.Mesh>()
    const program1 = React.createRef<OGL.Program>()
    const program2 = React.createRef<OGL.Program>()

    const Test = ({ first = false, mono = false }) => (
      <mesh ref={mesh}>
        <box />
        <normalProgram ref={program1} attach={first ? 'program' : 'oldprogram1'} />
        {!mono && <normalProgram ref={program2} attach={first ? 'oldprogram2' : 'program'} />}
      </mesh>
    )

    await reconciler.act(async () => render(<Test first mono />))
    expect(mesh.current!.program).toBe(program1.current)

    await reconciler.act(async () => render(<Test mono />, { frameloop: 'never' }))
    expect(mesh.current!.program).toBe(undefined)

    await reconciler.act(async () => render(<Test first />))
    expect(mesh.current!.program).toBe(program1.current)

    await reconciler.act(async () => render(<Test />))
    expect(mesh.current!.program).toBe(program2.current)
  })
})
