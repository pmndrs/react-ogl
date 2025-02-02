import * as React from 'react'
import * as OGL from 'ogl'
import { render } from './utils'
import { OGLElement, extend, createPortal } from '../src'

class CustomElement extends OGL.Transform {}

declare module '../src' {
  interface OGLElements {
    customElement: OGLElement<typeof CustomElement>
  }
}

describe('renderer', () => {
  it('should render JSX', async () => {
    const state = await React.act(async () => render(<transform />))
    expect(state.scene.children.length).not.toBe(0)
  })

  it('should render extended elements', async () => {
    extend({ CustomElement })
    const state = await React.act(async () => render(<customElement />))
    expect(state.scene.children[0]).toBeInstanceOf(CustomElement)
  })

  it('should go through lifecycle', async () => {
    const lifecycle: string[] = []

    function Test() {
      React.useInsertionEffect(() => void lifecycle.push('useInsertionEffect'), [])
      React.useImperativeHandle(React.useRef(), () => void lifecycle.push('refCallback'))
      React.useLayoutEffect(() => void lifecycle.push('useLayoutEffect'), [])
      React.useEffect(() => void lifecycle.push('useEffect'), [])
      lifecycle.push('render')
      return (
        <transform
          ref={() => void lifecycle.push('ref')}
          attach={() => (lifecycle.push('attach'), () => lifecycle.push('detach'))}
        />
      )
    }
    await React.act(async () => render(<Test />))

    expect(lifecycle).toStrictEqual([
      'render',
      'useInsertionEffect',
      'attach',
      'ref',
      'refCallback',
      'useLayoutEffect',
      'useEffect',
    ])
  })

  it('should set pierced props', async () => {
    const mesh = React.createRef<OGL.Mesh>()

    await React.act(async () => {
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
    const state = await React.act(async () =>
      render(
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
      ),
    )

    const [element1, element2] = state.scene.children as OGL.Mesh[]

    expect(element1.program).not.toBe(undefined)
    expect(element2.program).not.toBe(undefined)
  })

  it('should pass gl to args', async () => {
    let crashed = false

    try {
      await React.act(async () => render(<box />))
    } catch (_) {
      crashed = true
    }

    expect(crashed).toBe(false)
  })

  it('should accept vertex and fragment as program args', async () => {
    const vertex = 'vertex'
    const fragment = 'fragment'

    const state = await React.act(async () =>
      render(
        <mesh>
          <box />
          <program vertex={vertex} fragment={fragment} />
        </mesh>,
      ),
    )

    const [mesh] = state.scene.children as OGL.Mesh[]

    expect((mesh.program as any).vertex).toBe(vertex)
    expect((mesh.program as any).fragment).toBe(fragment)
  })

  it('should update program uniforms reactively', async () => {
    const mesh = React.createRef<OGL.Mesh>()

    const Test = ({ value }: { value: any }) => (
      <mesh ref={mesh}>
        <box />
        <normalProgram uniforms={{ uniform: { value } }} />
      </mesh>
    )

    await React.act(async () => render(<Test value={false} />))
    expect(mesh.current!.program.uniforms.uniform.value).toBe(false)

    await React.act(async () => render(<Test value={true} />))
    expect(mesh.current!.program.uniforms.uniform.value).toBe(true)
  })

  it('should accept shorthand props as uniforms', async () => {
    const mesh = React.createRef<OGL.Mesh>()

    const renderer = new OGL.Renderer({ canvas: document.createElement('canvas') })
    const texture = new OGL.Texture(renderer.gl)

    await React.act(async () => {
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

    await React.act(async () => {
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

    await React.act(async () => {
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
    const object1 = new OGL.Transform()
    const object2 = new OGL.Transform()

    object1.addChild(new OGL.Transform())
    object2.addChild(new OGL.Transform())

    const Test = ({ n }: { n: number }) => (
      <primitive object={n === 1 ? object1 : object2}>
        <transform attach="test" />
        <transform visible={false} />
      </primitive>
    )

    let state = await React.act(async () => render(<Test n={1} />))

    const [oldInstance] = state.scene.children as any[]
    expect(oldInstance).toBe(object1)

    state = await React.act(async () => render(<Test n={2} />))

    const [newInstance] = state.scene.children as any[]
    expect(newInstance).toBe(object2) // Swapped to new instance
    expect(newInstance.children[1].visible).toBe(false) // Preserves scene hierarchy
    expect(newInstance.test.visible).toBe(true) // Preserves scene hierarchy through attach
  })

  it('should prepare foreign objects when portaling', async () => {
    const object = new OGL.Transform()
    const mesh = React.createRef<OGL.Mesh>()

    const state = await React.act(async () =>
      render(
        createPortal(
          <mesh ref={mesh}>
            <box />
            <normalProgram />
          </mesh>,
          object,
        ),
      ),
    )

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

    await React.act(async () => render(<Test first mono />))
    expect(mesh.current!.program).toBe(program1.current)

    await React.act(async () => render(<Test mono />, { frameloop: 'never' }))
    expect(mesh.current!.program).toBe(undefined)

    await React.act(async () => render(<Test first />))
    expect(mesh.current!.program).toBe(program1.current)

    await React.act(async () => render(<Test />))
    expect(mesh.current!.program).toBe(program2.current)
  })
})
