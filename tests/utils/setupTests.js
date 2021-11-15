const React = require('react')
const WebGLRenderingContext = require('./WebGLRenderingContext')

// Mock scheduler to test React features
jest.mock('scheduler', () => require('scheduler/unstable_mock'))

// Polyfill PointerEvent
if (!global.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type, params = {}) {
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

  global.PointerEvent = PointerEvent
}

// Polyfill WebGL Context
HTMLCanvasElement.prototype.getContext = function () {
  return new WebGLRenderingContext(this)
}

// Mock useMeasure for react-ogl/web
jest.mock('react-use-measure', () => ({
  __esModule: true,
  default() {
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
    const ref = (node) => {
      if (!node || element.current) return

      element.current = node
    }
    return [ref, bounds]
  },
}))

// Mock native dependencies for react-ogl/native
jest.mock('react-native', () => ({
  StyleSheet: {},
  View: React.memo(
    React.forwardRef(({ onLayout, ...props }, ref) => {
      React.useLayoutEffect(() => {
        onLayout({
          nativeEvent: {
            layout: {
              width: 1280,
              height: 800,
            },
          },
        })

        ref = { current: { props } }
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
      const gl = new WebGLRenderingContext({ width: 1280, height: 800 })
      onContextCreate(gl)
    }, [])

    return null
  },
}))
