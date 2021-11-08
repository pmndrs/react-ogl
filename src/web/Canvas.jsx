import { forwardRef, useRef, useState, useEffect, Suspense } from 'react'
import useMeasure from 'react-use-measure'
import mergeRefs from 'react-merge-refs'
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
  'dpr',
  'camera',
  'orthographic',
  'frameloop',
  'events',
  'onCreated',
]

/**
 * Interpolates DPR from [min, max] based on device capabilities.
 */
const calculateDpr = (dpr) =>
  Array.isArray(dpr) ? Math.min(Math.max(dpr[0], window.devicePixelRatio), dpr[1]) : dpr

/**
 * A resizeable canvas whose children are declarative OGL elements.
 */
export const Canvas = forwardRef(
  ({ resize, children, style, fallback, ...rest }, ref) => {
    const internalProps = filterKeys(rest, false, ...CANVAS_PROPS)
    const divProps = filterKeys(rest, true, ...CANVAS_PROPS, ...RESERVED_PROPS)
    const [div, { width, height }] = useMeasure({
      scroll: true,
      debounce: { scroll: 50, resize: 0 },
      ...resize,
    })
    const canvas = useRef()
    const internalState = useRef()
    const [block, setBlock] = useState(false)
    const [error, setError] = useState(false)

    // Suspend this component if block is a promise (2nd run)
    if (block) throw block
    // Throw exception outwards if anything within Canvas throws
    if (error) throw error

    // Execute JSX in the reconciler as a layout-effect
    useIsomorphicLayoutEffect(() => {
      // If first run, create default state
      if (!internalState.current) {
        internalState.current = createInternals(canvas.current, {
          events,
          ...internalProps,
        })
      }

      const state = internalState.current

      if (width > 0 && height > 0) {
        // Set dpr, handle resize
        state.renderer.dpr = calculateDpr(internalProps.dpr || [1, 2])
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
      }
    }, [internalProps, width, height, children])

    // Cleanup on unmount
    useEffect(() => {
      const state = internalState.current
      return () => state?.root.unmount()
    }, [])

    return (
      <div
        ref={div}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          ...style,
        }}
        {...divProps}
      >
        <canvas ref={mergeRefs([canvas, ref])} style={{ display: 'block' }}>
          {fallback}
        </canvas>
      </div>
    )
  },
)
