import * as React from 'react'
import { ViewProps, LayoutChangeEvent } from 'react-native'
import WebGLRenderingContext from './WebGLRenderingContext'

// Mock scheduler to test React features
jest.mock('scheduler', () => require('scheduler/unstable_mock'))

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

// Polyfill WebGL Context
;(HTMLCanvasElement.prototype as any).getContext = function () {
  return new WebGLRenderingContext(this)
}

// Mock useMeasure for react-ogl/web
const Measure = () => {
  const element = React.useRef(null)
  const [bounds] = React.useState({
    left: 0,
    top: 0,
    width: 1280,
    height: 800,
    bottom: 0,
    right: 0,
    x: 0,
    y: 0,
  })
  const ref = (node: React.ReactNode) => {
    if (!node || element.current) return

    element.current = node
  }
  return [ref, bounds]
}
jest.mock('react-use-measure', () => ({
  __esModule: true,
  default: Measure,
}))

// Mock native dependencies for react-ogl/native
jest.mock('react-native', () => ({
  StyleSheet: {},
  View: React.memo(
    React.forwardRef(({ onLayout, ...props }: ViewProps, ref) => {
      React.useLayoutEffect(() => {
        onLayout({
          nativeEvent: {
            layout: {
              x: 0,
              y: 0,
              width: 1280,
              height: 800,
            },
          },
        } as LayoutChangeEvent)

        // eslint-disable-next-line react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars
        ref = { current: { props } }

        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])

      return null
    }),
  ),
}))
jest.mock('react-native/Libraries/Pressability/Pressability.js', () => ({}))
jest.mock('expo-asset', () => ({}))
jest.mock('expo-file-system', () => ({}))
jest.mock('expo-gl', () => ({
  GLView: ({ onContextCreate }) => {
    React.useLayoutEffect(() => {
      const gl = new WebGLRenderingContext({ width: 1280, height: 800 } as HTMLCanvasElement)
      onContextCreate(gl)

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return null
  },
}))
