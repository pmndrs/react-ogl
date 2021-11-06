import { forwardRef, useRef, useState, Suspense } from 'react'
import useMeasure from 'react-use-measure'
import mergeRefs from 'react-merge-refs'
import { useDefaults, useIsomorphicLayoutEffect, OGLContext } from '../shared/hooks'
import { ErrorBoundary, Block } from '../shared/components'
import { filterKeys } from '../utils'
import { RESERVED_PROPS } from '../constants'

/**
 * A list of custom Canvas props.
 */
export const CANVAS_PROPS = ['renderer', 'dpr', 'camera', 'orthographic', 'events', 'onCreated']

/**
 * Interpolates DPR from [min, max] based on device capabilities.
 */
const calculateDpr = (dpr) => (Array.isArray(dpr) ? Math.min(Math.max(dpr[0], window.devicePixelRatio), dpr[1]) : dpr)

export const Canvas = forwardRef(({ resize, children, style, fallback, ...rest }, ref) => {
  const internalProps = filterKeys(rest, false, ...CANVAS_PROPS)
  const divProps = filterKeys(rest, true, ...CANVAS_PROPS, ...RESERVED_PROPS)
  const [div, { width, height }] = useMeasure({
    scroll: true,
    debounce: { scroll: 50, resize: 0 },
    ...resize,
  })
  const canvas = useRef()
  const initialState = useDefaults(canvas, internalProps)
  const [block, setBlock] = useState(false)
  const [error, setError] = useState(false)

  // Suspend this component if block is a promise (2nd run)
  if (block) throw block
  // Throw exception outwards if anything within Canvas throws
  if (error) throw error

  // Execute JSX in the reconciler as a layout-effect
  useIsomorphicLayoutEffect(() => {
    const state = initialState.current

    // Set dpr, handle resize
    state.renderer.dpr = calculateDpr(internalProps.dpr || [1, 2])
    state.renderer.setSize(width, height)

    // Update projection
    const cameraType = internalProps.orthographic ? 'orthographic' : 'perspective'
    state.camera[cameraType]({ aspect: width / height })

    if (width > 0 && height > 0) {
      state.root.render(
        <ErrorBoundary set={setError}>
          <Suspense fallback={<Block set={setBlock} />}>
            <OGLContext.Provider value={{ ...state }}>{children}</OGLContext.Provider>
          </Suspense>
        </ErrorBoundary>,
      )
    }
  }, [internalProps, width, height, children])

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
})
