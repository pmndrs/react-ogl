import * as React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { reconciler, Canvas } from '../src/web'

it('handles all interactive meshes', async () => {
  const canvas = React.createRef<HTMLCanvasElement>()
  const handleOnClick = jest.fn()

  await reconciler.act(async () => {
    render(
      <Canvas ref={canvas}>
        <transform>
          <mesh scale={2} onClick={handleOnClick}>
            <box />
            <normalProgram />
          </mesh>
        </transform>
      </Canvas>,
    )
  })

  const event = new MouseEvent('click')
  ;(event as any).offsetX = 640
  ;(event as any).offsetY = 400

  fireEvent(canvas.current, event)

  expect(handleOnClick).toHaveBeenCalled()
})

it('handles onClick', async () => {
  const canvas = React.createRef<HTMLCanvasElement>()
  const handleOnClick = jest.fn()

  await reconciler.act(async () => {
    render(
      <Canvas ref={canvas}>
        <mesh scale={2} onClick={handleOnClick}>
          <box />
          <normalProgram />
        </mesh>
      </Canvas>,
    )
  })

  const event = new MouseEvent('click')
  ;(event as any).offsetX = 640
  ;(event as any).offsetY = 400

  fireEvent(canvas.current, event)

  expect(handleOnClick).toHaveBeenCalled()
})

it('handles onPointerUp', async () => {
  const canvas = React.createRef<HTMLCanvasElement>()
  const handlePointerUp = jest.fn()

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

it('handles onPointerDown', async () => {
  const canvas = React.createRef<HTMLCanvasElement>()
  const handlePointerDown = jest.fn()

  await reconciler.act(async () => {
    render(
      <Canvas ref={canvas}>
        <mesh scale={2} onPointerDown={handlePointerDown}>
          <box />
          <normalProgram />
        </mesh>
      </Canvas>,
    )
  })

  const event = new PointerEvent('pointerdown')
  ;(event as any).offsetX = 640
  ;(event as any).offsetY = 400

  fireEvent(canvas.current, event)

  expect(handlePointerDown).toHaveBeenCalled()
})

it('handles onPointerMove', async () => {
  const canvas = React.createRef<HTMLCanvasElement>()
  const handlePointerMove = jest.fn()

  await reconciler.act(async () => {
    render(
      <Canvas ref={canvas}>
        <mesh scale={2} onPointerMove={handlePointerMove}>
          <box />
          <normalProgram />
        </mesh>
      </Canvas>,
    )
  })

  const event = new PointerEvent('pointermove')
  ;(event as any).offsetX = 640
  ;(event as any).offsetY = 400

  fireEvent(canvas.current, event)

  expect(handlePointerMove).toHaveBeenCalled()
})

it('handles onPointerOver', async () => {
  const canvas = React.createRef<HTMLCanvasElement>()
  const handleOnPointerOver = jest.fn()

  await reconciler.act(async () => {
    render(
      <Canvas ref={canvas}>
        <mesh scale={2} onPointerOver={handleOnPointerOver}>
          <box />
          <normalProgram />
        </mesh>
      </Canvas>,
    )
  })

  const event = new PointerEvent('pointermove')
  ;(event as any).offsetX = 640
  ;(event as any).offsetY = 400

  fireEvent(canvas.current, event)

  expect(handleOnPointerOver).toHaveBeenCalled()
})

it('handles onPointerOut', async () => {
  const canvas = React.createRef<HTMLCanvasElement>()
  const handlePointerOut = jest.fn()

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
