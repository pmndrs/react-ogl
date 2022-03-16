// @ts-ignore
import * as OGL from 'ogl'
import { applyProps } from '../src'

describe('applyProps', () => {
  it('should diff & merge uniforms', async () => {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    const program = new OGL.Program(gl, {
      vertex: '',
      fragment: '',
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
})
