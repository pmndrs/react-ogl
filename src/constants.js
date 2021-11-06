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
