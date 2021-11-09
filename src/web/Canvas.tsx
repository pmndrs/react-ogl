import * as React from 'react'
// eslint-disable-next-line import/named
import useMeasure, { Options as ResizeOptions } from 'react-use-measure'
import mergeRefs from 'react-merge-refs'
import { useIsomorphicLayoutEffect } from '../shared/hooks'
import { createInternals } from '../shared/utils'
import { SetBlock, ErrorBoundary, Block } from '../shared/components'
import { events } from './events'
import { filterKeys } from '../utils'
import { RESERVED_PROPS } from '../constants'
import { RenderProps, DPR, RootState } from '../types'

export interface Props extends Omit<RenderProps, 'size'>, React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  fallback?: React.ReactNode
  resize?: ResizeOptions
}

/**
 * A list of custom Canvas props.
 */
export const CANVAS_PROPS = ['renderer', 'dpr', 'camera', 'orthographic', 'frameloop', 'events', 'onCreated'] as const

/**
 * Interpolates DPR from [min, max] based on device capabilities.
 */
const calculateDpr = (dpr: DPR) =>
  Array.isArray(dpr) ? Math.min(Math.max(dpr[0], window.devicePixelRatio), dpr[1]) : dpr

/**
 * A resizeable canvas whose children are declarative OGL elements.
 */
export const Canvas = React.forwardRef<HTMLCanvasElement, Props>(
  ({ resize, children, style, fallback, ...rest }, forwardedRef) => {
    const internalProps: RenderProps = filterKeys(rest, false, ...CANVAS_PROPS)
    const divProps: React.HTMLAttributes<HTMLDivElement> = filterKeys(rest, true, ...CANVAS_PROPS, ...RESERVED_PROPS)
    const [div, { width, height }] = useMeasure({
      scroll: true,
      debounce: { scroll: 50, resize: 0 },
      ...resize,
    })
    const canvas = React.useRef<HTMLCanvasElement>()
    const internalState = React.useRef<RootState>()
    const [block, setBlock] = React.useState<SetBlock>(false)
    const [error, setError] = React.useState(false)

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
            <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
          </ErrorBoundary>,
        )
      }
    }, [internalProps, width, height, children])

    // Cleanup on unmount
    React.useEffect(() => {
      const state = internalState.current
      return () => state?.root.unmount()
    }, [])

    return (
      <div
        {...divProps}
        ref={div}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          ...style,
        }}
      >
        <canvas ref={mergeRefs([canvas, forwardedRef])} style={{ display: 'block' }}>
          {fallback}
        </canvas>
      </div>
    )
  },
)
