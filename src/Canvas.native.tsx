import * as React from 'react'
import { PixelRatio, ViewProps, ViewStyle, View, StyleSheet, LayoutChangeEvent } from 'react-native'
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl'
import { Block, SetBlock, ErrorBoundary } from './utils'
import { events as createTouchEvents } from './events'
import { RenderProps } from './types'
import { render, unmountComponentAtNode } from './renderer'
import '@expo/browser-polyfill'

export type GLContext = ExpoWebGLRenderingContext | WebGLRenderingContext

export interface CanvasProps extends Omit<RenderProps, 'size' | 'dpr'>, ViewProps {
  children: React.ReactNode
  style?: ViewStyle
}

/**
 * A resizeable canvas whose children are declarative OGL elements.
 */
export const Canvas = React.forwardRef<View, CanvasProps>(function Canvas(
  { children, style, mode, renderer, camera, orthographic, frameloop, events = createTouchEvents, onCreated, ...props },
  forwardedRef,
) {
  const [{ width, height }, setSize] = React.useState({ width: 0, height: 0 })
  const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null)
  const [bind, setBind] = React.useState<any>()
  const [block, setBlock] = React.useState<SetBlock>(false)
  const [error, setError] = React.useState<any>(false)

  // Suspend this component if block is a promise (2nd run)
  if (block) throw block
  // Throw exception outwards if anything within Canvas throws
  if (error) throw error

  const onLayout = React.useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize({ width, height })
  }, [])

  const onContextCreate = React.useCallback((context: ExpoWebGLRenderingContext) => {
    const canvasShim = {
      width: context.drawingBufferWidth,
      height: context.drawingBufferHeight,
      style: {},
      addEventListener: (() => {}) as any,
      removeEventListener: (() => {}) as any,
      clientHeight: context.drawingBufferHeight,
      getContext: (() => context) as any,
    } as HTMLCanvasElement
    ;(context as any).canvas = canvasShim

    setCanvas(canvasShim)
  }, [])

  // Render to screen
  if (canvas && width > 0 && height > 0) {
    render(
      <ErrorBoundary set={setError}>
        <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
      </ErrorBoundary>,
      canvas,
      {
        size: { width, height },
        mode,
        orthographic,
        frameloop,
        renderer,
        // expo-gl can only render at native dpr/resolution
        // https://github.com/expo/expo-three/issues/39
        dpr: PixelRatio.get(),
        camera,
        events,
        onCreated(state) {
          // Flush frame for native
          const gl = state.gl as unknown as ExpoWebGLRenderingContext | WebGL2RenderingContext
          if ('endFrameEXP' in gl) {
            const renderFrame = state.renderer.render.bind(state.renderer)
            state.renderer.render = (...args) => {
              renderFrame(...args)
              gl.endFrameEXP()
            }
          }

          // Bind events
          setBind(state.events?.connected)

          return onCreated?.(state)
        },
      },
    )
  }

  // Cleanup on unmount
  React.useEffect(() => {
    if (canvas) {
      return () => unmountComponentAtNode(canvas)
    }
  }, [canvas])

  return (
    <View {...props} ref={forwardedRef} onLayout={onLayout} style={{ flex: 1, ...style }} {...bind}>
      {width > 0 && <GLView onContextCreate={onContextCreate} style={StyleSheet.absoluteFill} />}
    </View>
  )
})
