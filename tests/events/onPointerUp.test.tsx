import * as React from 'react'
import { it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { reconciler, Canvas } from 'react-ogl'

it('handles onPointerUp', async () => {
  const canvas = React.createRef<HTMLCanvasElement>()
  const handlePointerUp = vi.fn()

  await reconciler.act(async () => {
    render(
      <Canvas ref={canvas}>
        <mesh scale={2} onPointerUp={handlePointerUp}>
          <box />
          <normalProgram />
        </mesh>
      </Canvas>,
    )
  })

  const event = new PointerEvent('pointerup')
  ;(event as any).offsetX = 640
  ;(event as any).offsetY = 400

  fireEvent(canvas.current, event)

  expect(handlePointerUp).toHaveBeenCalled()
})
