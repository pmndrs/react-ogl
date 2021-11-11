import * as React from 'react'
import { PixelRatio, ViewProps, ViewStyle, View, StyleSheet } from 'react-native'
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl'
import { useIsomorphicLayoutEffect } from '../hooks'
import { createInternals, SetBlock, ErrorBoundary, Block, filterKeys } from '../utils'
import { events } from './events'
import { RESERVED_PROPS } from '../constants'
import { RenderProps, RootState } from '../types'

export type GLContext = ExpoWebGLRenderingContext | WebGLRenderingContext

export interface Props extends Omit<RenderProps, 'dpr' | 'size'>, ViewProps {
  children: React.ReactNode
  style?: ViewStyle
}

/**
 * A list of custom Canvas props.
 */
export const CANVAS_PROPS = ['renderer', 'camera', 'orthographic', 'frameloop', 'events', 'onCreated'] as const

/**
 * A resizeable canvas whose children are declarative OGL elements.
 */
export const Canvas = React.forwardRef<View, Props>(({ children, style, ...rest }, forwardedRef) => {
  const internalProps: RenderProps = filterKeys(rest, false, ...CANVAS_PROPS)
  const viewProps: ViewProps = filterKeys(rest, true, ...CANVAS_PROPS, ...RESERVED_PROPS)
  const internalState = React.useRef<RootState>()
  const [{ width, height }, setSize] = React.useState({ width: 0, height: 0 })
  const [context, setContext] = React.useState<GLContext | null>()
  const [bind, setBind] = React.useState()
  const [block, setBlock] = React.useState<SetBlock>(false)
  const [error, setError] = React.useState<any>(false)

  // Suspend this component if block is a promise (2nd run)
  if (block) throw block
  // Throw exception outwards if anything within Canvas throws
  if (error) throw error

  // Execute JSX in the reconciler as a layout-effect
  useIsomorphicLayoutEffect(() => {
    if (!context) return

    // If first run, create default state & bind events
    if (!internalState.current) {
      // Create canvas shim
      const canvas = {
        width: context.drawingBufferWidth,
        height: context.drawingBufferHeight,
        style: {},
        addEventListener: (() => {}) as any,
        removeEventListener: (() => {}) as any,
        clientHeight: context.drawingBufferHeight,
      } as HTMLCanvasElement

      // Bind context
      ;(canvas.getContext as any) = () => context

      // Init state
      internalState.current = createInternals(canvas, {
        events,
        ...internalProps,
      })

      // Bind events
      if (internalState.current.events) {
        const manager = internalState.current.events.connected as any
        setBind(manager.getEventHandlers?.())
      }
    }

    if (width > 0 && height > 0) {
      const state = internalState.current

      // Set dpr, handle resize
      state.renderer.dpr = PixelRatio.get()
      state.renderer.setSize(width, height)

      // Update projection
      const projection = internalProps.orthographic ? 'orthographic' : 'perspective'
      state.camera[projection]({ aspect: width / height })

      // Render to screen
      state.root.render(
        <ErrorBoundary set={setError}>
          <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
        </ErrorBoundary>,
      )
    }
  }, [width, height, context, internalProps, children])

  // Cleanup on unmount
  React.useEffect(() => {
    const state = internalState.current
    return () => state.root.unmount()
  }, [])

  return (
    <View
      {...viewProps}
      ref={forwardedRef}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout
        setSize({ width, height })
      }}
      style={{ flex: 1, ...style }}
      {...bind}
    >
      {width > 0 && <GLView onContextCreate={setContext} style={StyleSheet.absoluteFill} />}
    </View>
  )
})
