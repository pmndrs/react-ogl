// @ts-ignore
import * as OGL from 'ogl'
import { applyProps } from '../src'

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
    const target = { color: new OGL.Color() }
    target.color.copy = jest.fn()

    applyProps(target, {
      color: new OGL.Color(),
    })

    expect(target.color).toBeInstanceOf(OGL.Color)
    expect(target.color.copy).toHaveBeenCalled()
  })

  it('should spread array prop values', async () => {
    const target = { position: new OGL.Vec3() }

    applyProps(target, {
      position: [1, 2, 3],
    })

    expect(target.position).toBeInstanceOf(OGL.Vec3)
    expect(Array.from(target.position)).toMatchSnapshot()
  })

  it('should accept scalar shorthand', async () => {
    const target = { position: new OGL.Vec3() }

    applyProps(target, {
      position: 3,
    })

    expect(target.position).toBeInstanceOf(OGL.Vec3)
    expect(Array.from(target.position)).toMatchSnapshot()
  })

  it('should properly set array-like buffer views', async () => {
    const target = { pixel: null }
    const pixel = new Uint8Array([255, 0, 0, 255])

    applyProps(target, { pixel })

    expect(target.pixel).toBe(pixel)
  })

  it('should properly set non-math classes who implement set', async () => {
    const target = { test: new Map() }
    const test = new Map()
    test.set(1, 2)

    applyProps(target, { test })

    expect(target.test).toBe(test)
  })
})
