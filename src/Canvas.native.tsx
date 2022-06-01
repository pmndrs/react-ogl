import * as React from 'react'
import { PixelRatio, ViewProps, ViewStyle, View, StyleSheet, LayoutChangeEvent } from 'react-native'
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl'
import { Block, ErrorBoundary } from './utils'
import { events as createTouchEvents } from './events'
import { RenderProps, SetBlock } from './types'
import { render, unmountComponentAtNode } from './renderer'
import '@expo/browser-polyfill'

export type GLContext = ExpoWebGLRenderingContext | WebGLRenderingContext

export interface CanvasProps extends Omit<RenderProps, 'dpr'>, ViewProps {
  children: React.ReactNode
  style?: ViewStyle
  orthographic?: boolean
  frameloop?: 'always' | 'never'
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

  if (canvas && width > 0 && height > 0) {
    // Render to screen
    const state = render(
      <ErrorBoundary set={setError}>
        <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
      </ErrorBoundary>,
      canvas,
      {
        mode,
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

          // Animate
          const animate = (time?: number) => {
            // Cancel animation if frameloop is set, otherwise keep looping
            if (frameloop === 'never') return cancelAnimationFrame(state.animation)
            state.animation = requestAnimationFrame(animate)

            // Call subscribed elements
            for (const ref of state.subscribed) ref.current?.(state, time)

            // If rendering manually, skip render
            if (state.priority) return

            // Render to screen
            state.renderer.render({ scene: state.scene, camera: state.camera })
          }
          if (frameloop !== 'never') animate()

          return onCreated?.(state)
        },
      },
    ).getState()

    // Handle resize
    if (state.renderer.width !== width || state.renderer.height !== height) {
      // Set dpr, handle resize
      state.renderer.setSize(width, height)

      // Update projection
      const projection = orthographic ? 'orthographic' : 'perspective'
      state.camera[projection]({ aspect: width / height })
    }

    // Bind events
    if (!bind) setBind(state.events.connected)
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
