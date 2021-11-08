import * as OGL from 'ogl'

/**
 * OGL elements which must accept `gl` via constructor args.
 */
export const GL_ELEMENTS = [OGL.Camera, OGL.Geometry, OGL.Mesh, OGL.Program]

/**
 * React's internal props.
 */
export const RESERVED_PROPS = ['children', 'key', 'ref', '__self', '__source']

/**
 * React rendering modes (defaults to blocking).
 */
export const RENDER_MODES = {
  legacy: 0,
  blocking: 1,
  concurrent: 2,
}
