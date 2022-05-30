// @ts-ignore
import * as OGL from 'ogl'
import { applyProps, Instance } from '../src'

describe('applyProps', () => {
  it('should accept shorthand uniforms', async () => {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    const program = new OGL.Program(gl, {
      vertex: ' ',
      fragment: ' ',
      uniforms: {},
    })

    applyProps(program, {
      uniforms: {
        foo: { value: 0 },
        bar: 1,
      },
    })

    expect(program.uniforms).toMatchSnapshot()
  })

  it('should convert CSS color names to color uniforms', async () => {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    const program = new OGL.Program(gl, {
      vertex: ' ',
      fragment: ' ',
      uniforms: {},
    })

    applyProps(program, {
      uniforms: {
        color: 'red',
      },
    })

    expect(program.uniforms).toMatchSnapshot()
  })

  it('should convert arrays into vector uniforms', async () => {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    const program = new OGL.Program(gl, {
      vertex: ' ',
      fragment: ' ',
      uniforms: {},
    })

    applyProps(program, {
      uniforms: {
        uv: [0, 1],
      },
    })

    expect(program.uniforms).toMatchSnapshot()
  })

  it('should diff & merge uniforms', async () => {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    const program = new OGL.Program(gl, {
      vertex: ' ',
      fragment: ' ',
      uniforms: {},
    })

    applyProps(program, {
      uniforms: {
        a: 0,
        b: 1,
        c: null,
      },
    })
    applyProps(program, { uniforms: { c: 2 } })

    expect(program.uniforms).toMatchSnapshot()
  })

  it('should pierce into nested properties', async () => {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    const program = new OGL.Program(gl, {
      vertex: ' ',
      fragment: ' ',
      uniforms: {},
    })

    applyProps(program, {
      'uniforms-color': 'red',
    })

    expect(program.uniforms).toMatchSnapshot()
  })

  it('should prefer to copy from external props', async () => {
    const target = { color: new OGL.Color() } as unknown as Instance
    target.color.copy = jest.fn()

    applyProps(target, {
      color: new OGL.Color(),
    })

    expect(target.color).toBeInstanceOf(OGL.Color)
    expect(target.color.copy).toHaveBeenCalled()
  })

  it('should spread array prop values', async () => {
    const target = { position: new OGL.Vec3() } as unknown as Instance

    applyProps(target, {
      position: [1, 2, 3],
    })

    expect(target.position).toBeInstanceOf(OGL.Vec3)
    expect(Array.from(target.position)).toMatchSnapshot()
  })

  it('should accept scalar shorthand', async () => {
    const target = { position: new OGL.Vec3() } as unknown as Instance

    applyProps(target, {
      position: 3,
    })

    expect(target.position).toBeInstanceOf(OGL.Vec3)
    expect(Array.from(target.position)).toMatchSnapshot()
  })
})
