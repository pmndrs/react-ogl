import * as React from 'react'
import { it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { reconciler, Canvas } from 'react-ogl'

it('handles onPointerOut', async () => {
  const canvas = React.createRef<HTMLCanvasElement>()
  const handlePointerOut = vi.fn()

  await reconciler.act(async () => {
    render(
      <Canvas ref={canvas}>
        <mesh scale={2} onPointerOut={handlePointerOut}>
          <box />
          <normalProgram />
        </mesh>
      </Canvas>,
    )
  })

  // Move pointer over mesh
  const event = new PointerEvent('pointermove')
  ;(event as any).offsetX = 640
  ;(event as any).offsetY = 400
  fireEvent(canvas.current, event)

  // Move pointer away from mesh
  const event2 = new PointerEvent('pointermove')
  ;(event2 as any).offsetX = 0
  ;(event2 as any).offsetY = 0

  fireEvent(canvas.current, event2)

  expect(handlePointerOut).toHaveBeenCalled()
})
