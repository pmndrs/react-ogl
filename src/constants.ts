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
 * React internal props.
 */
export const RESERVED_PROPS = ['children', 'key', 'ref', '__self', '__source']

/**
 * react-ogl instance-specific props.
 */
export const INSTANCE_PROPS = ['args', 'object', 'dispose', 'attach']
