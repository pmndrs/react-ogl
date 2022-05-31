import * as React from 'react'
// eslint-disable-next-line import/named
import useMeasure, { Options as ResizeOptions } from 'react-use-measure'
import { useIsomorphicLayoutEffect } from './hooks'
import { Block, ErrorBoundary } from './utils'
import { events as createPointerEvents } from './events'
import { RenderProps, DPR, SetBlock } from './types'
import { render, unmountComponentAtNode } from './renderer'

export interface CanvasProps extends Omit<RenderProps, 'size'>, React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  resize?: ResizeOptions
}

/**
 * Interpolates DPR from [min, max] based on device capabilities.
 */
const calculateDpr = (dpr: DPR) =>
  Array.isArray(dpr) ? Math.min(Math.max(dpr[0], window.devicePixelRatio), dpr[1]) : dpr

/**
 * A resizeable canvas whose children are declarative OGL elements.
 */
export const Canvas = React.forwardRef<HTMLCanvasElement, CanvasProps>(function Canvas(
  {
    resize,
    children,
    style,
    renderer,
    dpr,
    camera,
    orthographic,
    frameloop,
    events = createPointerEvents,
    onCreated,
    ...props
  },
  forwardedRef,
) {
  const canvasRef = React.useRef<HTMLCanvasElement>()
  const [div, { width, height }] = useMeasure({
    scroll: true,
    debounce: { scroll: 50, resize: 0 },
    ...resize,
  })
  const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null)
  const [block, setBlock] = React.useState<SetBlock>(false)
  const [error, setError] = React.useState(false)
  React.useImperativeHandle(forwardedRef, () => canvasRef.current)

  // Suspend this component if block is a promise (2nd run)
  if (block) throw block
  // Throw exception outwards if anything within Canvas throws
  if (error) throw error

  if (canvas && width > 0 && height > 0) {
    // Render to screen
    const state = render(
      <ErrorBoundary set={setError}>
        <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
      </ErrorBoundary>,

      canvas,
      {
        renderer,
        dpr,
        camera,
        orthographic,
        frameloop,
        events,
        onCreated(state) {
          // Animate
          const animate = (time?: number) => {
            // Cancel animation if frameloop is set, otherwise keep looping
            if (state.frameloop === 'never') return cancelAnimationFrame(state.animation)
            state.animation = requestAnimationFrame(animate)

            // Call subscribed elements
            state.subscribed.forEach((ref) => ref.current?.(state, time))

            // If rendering manually, skip render
            if (state.priority) return

            // Render to screen
            state.renderer.render({ scene: state.scene, camera: state.camera })
          }
          if (state.frameloop !== 'never') animate()

          return onCreated?.(state)
        },
      },
    ).getState()

    // Set dpr, handle resize
    state.renderer.dpr = calculateDpr(dpr || [1, 2])
    state.renderer.setSize(width, height)

    // Update projection
    const projection = orthographic ? 'orthographic' : 'perspective'
    state.camera[projection]({ aspect: width / height })
  }

  useIsomorphicLayoutEffect(() => {
    setCanvas(canvasRef.current)
  }, [])

  // Cleanup on unmount
  React.useEffect(() => {
    if (canvas) return () => unmountComponentAtNode(canvas)
  }, [canvas])

  return (
    <div
      {...props}
      ref={div}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...style,
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
})
