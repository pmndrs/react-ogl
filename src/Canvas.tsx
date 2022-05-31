import * as React from 'react'
// eslint-disable-next-line import/named
import useMeasure, { Options as ResizeOptions } from 'react-use-measure'
import { useIsomorphicLayoutEffect } from './hooks'
import { Block, ErrorBoundary } from './utils'
import { events as createPointerEvents } from './events'
import { RenderProps, SetBlock } from './types'
import { render, unmountComponentAtNode } from './renderer'

export interface CanvasProps extends RenderProps, React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  resize?: ResizeOptions
  orthographic?: boolean
  frameloop?: 'always' | 'never'
}

/**
 * A resizeable canvas whose children are declarative OGL elements.
 */
export const Canvas = React.forwardRef<HTMLCanvasElement, CanvasProps>(function Canvas(
  {
    resize,
    children,
    style,
    mode,
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
        mode,
        renderer,
        dpr,
        camera,
        events,
        onCreated(state) {
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
