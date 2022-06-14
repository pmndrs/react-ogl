/**
 * react-ogl's virtual pointer events.
 */
export const POINTER_EVENTS = [
  'onClick',
  'onPointerUp',
  'onPointerDown',
  'onPointerMove',
  'onPointerOver',
  'onPointerOut',
] as const

/**
 * React rendering modes (defaults to blocking).
 */
export const RENDER_MODES = {
  legacy: 0,
  blocking: 1,
  concurrent: 2,
} as const

/**
 * React internal props.
 */
export const RESERVED_PROPS = ['children', 'key', 'ref', '__self', '__source'] as const

/**
 * react-ogl instance-specific props.
 */
export const INSTANCE_PROPS = ['args', 'object', 'dispose', 'attach']
