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
