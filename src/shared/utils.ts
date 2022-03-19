import * as React from 'react'
// @ts-ignore
import * as OGL from 'ogl'
import { createRoot } from '../renderer'
import { applyProps } from '../utils'
import { Instance, InstanceProps, RootState, EventHandlers, RenderProps, Subscription } from '../types'

export type ObjectMap = {
  nodes: { [name: string]: OGL.Mesh }
  programs: { [name: string]: OGL.Program }
}

/**
 * Collects nodes and programs from a Mesh.
 */
export const buildGraph = (object: OGL.Mesh) => {
  const data: ObjectMap = { nodes: {}, programs: {} }

  if (object) {
    object.traverse((obj: any) => {
      if (obj.name) {
        data.nodes[obj.name] = obj
      }

      if (obj.program?.gltfMaterial && !data.programs[obj.program.gltfMaterial.name]) {
        data.programs[obj.program.gltfMaterial.name] = obj.program
      }
    })
  }

  return data
}

/**
 * Creates event handlers, returning an event handler method.
 */
export const createEvents = (state: RootState) => {
  const handleEvent = (event: PointerEvent, type: keyof EventHandlers) => {
    // Convert mouse coordinates
    state.mouse.x = (event.offsetX / state.renderer.width) * 2 - 1
    state.mouse.y = -(event.offsetY / state.renderer.height) * 2 + 1

    // Filter to interactive meshes
    const interactive: OGL.Mesh[] = []
    state.scene.traverse((node: OGL.Mesh) => {
      // Mesh has registered events and a defined volume
      if (node.__handlers && node?.geometry?.attributes?.position) interactive.push(node)
    })

    // Get elements that intersect with our pointer
    state.raycaster.castMouse(state.camera, state.mouse)
    const intersects: Instance[] = state.raycaster.intersectMeshes(interactive)

    // Used to discern between generic events and custom hover events.
    // We hijack the pointermove event to handle hover state
    const isHoverEvent = type === 'onPointerMove'

    // Trigger events for hovered elements
    intersects.forEach((object) => {
      const handlers = object.__handlers

      // Bail if object doesn't have handlers (managed externally)
      if (!handlers) return

      if (isHoverEvent && !state.hovered.get(object.id)) {
        // Mark object as hovered and fire its hover events
        state.hovered.set(object.id, object)

        // Fire hover events
        handlers.onPointerMove?.({ event, hit: object.hit })
        handlers.onPointerOver?.({ event, hit: object.hit })
      } else {
        // Otherwise, fire its generic event
        handlers[type]?.({ event, hit: object.hit })
      }
    })

    // Cleanup stale hover events
    if (isHoverEvent || type === 'onPointerDown') {
      state.hovered.forEach((object: Instance) => {
        const handlers = object.__handlers

        if (!intersects.length || !intersects.find((i) => i === object)) {
          // Reset hover state
          state.hovered.delete(object.id)

          // Fire unhover event
          if (handlers?.onPointerOut) handlers.onPointerOut({ event, hit: object.hit })
        }
      })
    }

    return intersects
  }

  return { handleEvent }
}

/**
 * Configures rendering internals akin to R3F.
 */
export const createInternals = (canvas: HTMLCanvasElement, props: RenderProps): RootState => {
  // Create or accept renderer, apply props
  const renderer =
    props.renderer instanceof OGL.Renderer
      ? props.renderer
      : typeof props.renderer === 'function' 
      ? props.renderer(canvas)
      : new OGL.Renderer({
          antialias: true,
          powerPreference: 'high-performance',
          ...(props.renderer as any),
          canvas: canvas,
        })
  if (props.renderer) applyProps(renderer, props.renderer as InstanceProps)
  const gl = renderer.gl
  gl.clearColor(1, 1, 1, 0)

  // Flush frame for native
  if (renderer.gl.endFrameEXP) {
    const renderFrame = renderer.render.bind(renderer)
    renderer.render = ({ scene, camera }) => {
      renderFrame({ scene, camera })
      renderer.gl.endFrameEXP()
    }
  }

  // Create or accept camera, apply props
  const camera =
    props.camera instanceof OGL.Camera
      ? props.camera
      : new OGL.Camera(gl, { fov: 75, near: 1, far: 1000, ...(props.camera as any) })
  camera.position.z = 5
  if (props.camera) applyProps(camera, props.camera as InstanceProps)

  // Create scene
  const scene = new OGL.Transform(gl)

  // Init rendering internals for useFrame, keep track of subscriptions
  let priority = 0
  let subscribed = []

  // Subscribe/unsubscribe elements to the render loop
  const subscribe = (refCallback: React.MutableRefObject<Subscription>, renderPriority?: number) => {
    // Subscribe callback
    subscribed.push(refCallback)

    // Enable manual rendering if renderPriority is positive
    if (renderPriority) priority += 1
  }

  const unsubscribe = (refCallback: React.MutableRefObject<Subscription>, renderPriority?: number) => {
    // Unsubscribe callback
    subscribed = subscribed.filter((entry) => entry !== refCallback)

    // Disable manual rendering if renderPriority is positive
    if (renderPriority) priority -= 1
  }

  // Init event state
  const mouse = new OGL.Vec2()
  const raycaster = new OGL.Raycast(gl)
  const hovered = new Map()

  // Set initial state
  const state: RootState = {
    ...props,
    renderer,
    gl,
    camera,
    scene,
    priority,
    subscribed,
    subscribe,
    unsubscribe,
    mouse,
    raycaster,
    hovered,
  }

  // Init root
  const root = createRoot(canvas, state)

  // Handle callback
  if (props.onCreated) props.onCreated(state)

  // Animate
  const animate = (time?: number) => {
    // Cancel animation if frameloop is set, otherwise keep looping
    if (props.frameloop === 'never') return cancelAnimationFrame(state.animation)
    state.animation = requestAnimationFrame(animate)

    // Call subscribed elements
    subscribed.forEach((ref) => ref.current?.(state, time))

    // If rendering manually, skip render
    if (priority) return

    // Render to screen
    renderer.render({ scene, camera })
  }
  if (props.frameloop !== 'never') animate()

  return { ...state, root }
}
