import { WebGLRenderingContext } from '../src/test'

// Mock scheduler to test React features
jest.mock('scheduler', () => require('scheduler/unstable_mock'))

// Polyfill WebGL Context
HTMLCanvasElement.prototype.getContext = function () {
  return new WebGLRenderingContext(this)
} as any

// Polyfill PointerEvent
if (!global.PointerEvent) {
  class PointerEvent extends MouseEvent {
    public height?: number
    public isPrimary?: boolean
    public pointerId?: number
    public pointerType?: string
    public pressure?: number
    public tangentialPressure?: number
    public tiltX?: number
    public tiltY?: number
    public twist?: number
    public width?: number

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)

      this.pointerId = params.pointerId
      this.width = params.width
      this.height = params.height
      this.pressure = params.pressure
      this.tangentialPressure = params.tangentialPressure
      this.tiltX = params.tiltX
      this.tiltY = params.tiltY
      this.pointerType = params.pointerType
      this.isPrimary = params.isPrimary
    }
  }

  global.PointerEvent = PointerEvent as any
}
