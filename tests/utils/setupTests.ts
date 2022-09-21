import * as React from 'react'
import { ViewProps, LayoutChangeEvent } from 'react-native'
import type { GLViewProps, ExpoWebGLRenderingContext } from 'expo-gl'
import WebGLRenderingContext from './WebGLRenderingContext'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

// Let React know that we'll be testing effectful components
global.IS_REACT_ACT_ENVIRONMENT = true

// Mock scheduler to test React features
jest.mock('scheduler', () => ({
  ...jest.requireActual('scheduler/unstable_mock'),
  unstable_scheduleCallback: (_: any, callback: () => void) => callback(),
}))

// PointerEvent is not in JSDOM
// https://github.com/jsdom/jsdom/pull/2666#issuecomment-691216178
// https://w3c.github.io/pointerevents/#pointerevent-interface
if (!global.PointerEvent) {
  global.PointerEvent = class extends MouseEvent implements PointerEvent {
    readonly pointerId: number = 0
    readonly width: number = 1
    readonly height: number = 1
    readonly pressure: number = 0
    readonly tangentialPressure: number = 0
    readonly tiltX: number = 0
    readonly tiltY: number = 0
    readonly twist: number = 0
    readonly pointerType: string = ''
    readonly isPrimary: boolean = false

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      Object.assign(this, params)
    }

    getCoalescedEvents = () => []
    getPredictedEvents = () => []
  }
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

    // @ts-ignore
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
  View: class extends React.Component<ViewProps> {
    componentDidMount(): void {
      this.props.onLayout?.({
        nativeEvent: {
          layout: {
            x: 0,
            y: 0,
            width: 1280,
            height: 800,
          },
        },
      } as LayoutChangeEvent)
    }

    render() {
      return this.props.children
    }
  },
  StyleSheet: {
    absoluteFill: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
  },
  PixelRatio: {
    get() {
      return 1
    },
  },
}))
jest.mock(
  'react-native/Libraries/Pressability/Pressability.js',
  () =>
    class {
      getEventHandlers = () => ({})
      reset() {}
    },
)

jest.mock('expo-gl', () => ({
  GLView({ onContextCreate }: GLViewProps) {
    const canvas = React.useMemo(
      () => Object.assign(document.createElement('canvas'), { width: 1280, height: 800 }),
      [],
    )

    React.useLayoutEffect(() => {
      const gl = canvas.getContext('webgl2') as ExpoWebGLRenderingContext
      gl.endFrameEXP = () => {}
      onContextCreate?.(gl)
    }, [canvas, onContextCreate])

    return null
  },
}))
