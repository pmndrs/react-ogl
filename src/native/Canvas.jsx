import { forwardRef, useRef, useState, useEffect, Suspense } from 'react'
import { PixelRatio, View } from 'react-native'
import { GLView } from 'expo-gl'
import { useIsomorphicLayoutEffect } from '../shared/hooks'
import { createInternals } from '../shared/utils'
import { ErrorBoundary, Block } from '../shared/components'
import { events } from './events'
import { filterKeys } from '../utils'
import { RESERVED_PROPS } from '../constants'

/**
 * A list of custom Canvas props.
 */
export const CANVAS_PROPS = [
  'renderer',
  'camera',
  'orthographic',
  'frameloop',
  'events',
  'onCreated',
]

/**
 * A resizeable canvas whose children are declarative OGL elements.
 */
export const Canvas = forwardRef(({ children, style, ...rest }, forwardedRef) => {
  const internalProps = filterKeys(rest, false, ...CANVAS_PROPS)
  const viewProps = filterKeys(rest, true, ...CANVAS_PROPS, ...RESERVED_PROPS)
  const internalState = useRef()
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 })
  const [context, setContext] = useState()
  const [bind, setBind] = useState()
  const [block, setBlock] = useState(false)
  const [error, setError] = useState(false)

  // Suspend this component if block is a promise (2nd run)
  if (block) throw block
  // Throw exception outwards if anything within Canvas throws
  if (error) throw error

  // Execute JSX in the reconciler as a layout-effect
  useIsomorphicLayoutEffect(() => {
    if (width > 0 && height > 0 && context) {
      // If first run, create default state
      if (!internalState.current) {
        internalState.current = createInternals(view.current, {
          events,
          ...internalProps,
          renderer: { ...internalProps?.renderer, context },
        })
      }

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
          <Suspense fallback={<Block set={setBlock} />}>{children}</Suspense>
        </ErrorBoundary>,
      )
      setBind(state.events.connected.getEventHandlers())
    }
  }, [width, height, context, internalProps, children])

  // Cleanup on unmount
  useEffect(() => {
    const state = internalState.current
    return () => state?.root.unmount()
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
      {width > 0 && (
        <GLView onContextCreate={setContext} style={StyleSheet.absoluteFill} />
      )}
    </View>
  )
})
