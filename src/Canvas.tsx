import * as React from 'react'
// eslint-disable-next-line import/named
import useMeasure, { Options as ResizeOptions } from 'react-use-measure'
import { useContextBridge, FiberProvider } from 'its-fine'
import { useIsomorphicLayoutEffect } from './hooks'
import { Block, SetBlock, ErrorBoundary } from './utils'
import { events as createPointerEvents } from './events'
import { RenderProps } from './types'
import { render, unmountComponentAtNode } from './renderer'

export interface CanvasProps extends Omit<RenderProps, 'size'>, React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  resize?: ResizeOptions
}

const CanvasImpl = React.forwardRef<HTMLCanvasElement, CanvasProps>(function Canvas(
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
  const Bridge = useContextBridge()
  const canvasRef = React.useRef<HTMLCanvasElement>(null!)
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

  // Render to screen
  if (canvas && width > 0 && height > 0) {
    render(
      <Bridge>
        <ErrorBoundary set={setError}>
          <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
        </ErrorBoundary>
      </Bridge>,
      canvas,
      {
        size: { width, height },
        orthographic,
        frameloop,
        renderer,
        dpr,
        camera,
        events,
        onCreated,
      },
    )
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

/**
 * A resizeable canvas whose children are declarative OGL elements.
 */
export const Canvas = React.forwardRef<HTMLCanvasElement, CanvasProps>(function CanvasWrapper(props, ref) {
  return (
    <FiberProvider>
      <CanvasImpl {...props} ref={ref} />
    </FiberProvider>
  )
})
