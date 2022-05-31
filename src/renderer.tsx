import * as OGL from 'ogl'
import * as React from 'react'
import { Fiber } from 'react-reconciler'
import create, { SetState } from 'zustand'
import { reconciler } from './reconciler'
import { RENDER_MODES } from './constants'
import { OGLContext } from './hooks'
import { InstanceProps, RenderProps, Root, RootState, RootStore, Subscription } from './types'
import { applyProps } from './utils'

// Store roots here since we can render to multiple targets
const roots = new Map<HTMLCanvasElement, { fiber: Fiber; store: RootStore }>()

/**
 * Renders React elements into OGL elements.
 */
export const render = (
  element: React.ReactNode,
  target: HTMLCanvasElement,
  { mode = 'blocking', ...config }: RenderProps = {},
) => {
  // Check for existing root, create on first run
  let root = roots.get(target)
  if (!root) {
    // Create renderer
    const renderer =
      config.renderer instanceof OGL.Renderer
        ? config.renderer
        : typeof config.renderer === 'function'
        ? config.renderer(target)
        : new OGL.Renderer({
            antialias: true,
            powerPreference: 'high-performance',
            ...(config.renderer as any),
            canvas: target,
          })
    if (config.renderer && typeof config.renderer !== 'function') applyProps(renderer, config.renderer as InstanceProps)

    const gl = renderer.gl
    gl.clearColor(1, 1, 1, 0)

    // Flush frame for native
    if ((gl as any).endFrameEXP) {
      const renderFrame = renderer.render.bind(renderer)
      renderer.render = ({ scene, camera }) => {
        renderFrame({ scene, camera })
        ;(gl as any).endFrameEXP()
      }
    }

    // Create or accept camera, apply props
    const camera =
      config.camera instanceof OGL.Camera
        ? config.camera
        : new OGL.Camera(gl, { fov: 75, near: 1, far: 1000, ...(config.camera as any) })
    camera.position.z = 5
    if (config.camera) applyProps(camera, config.camera as InstanceProps)

    // Create scene
    const scene = new OGL.Transform()

    // Init rendering internals for useFrame, keep track of subscriptions
    let priority = 0
    const subscribed = []

    // Subscribe/unsubscribe elements to the render loop
    const subscribe = (refCallback: React.MutableRefObject<Subscription>, renderPriority?: number) => {
      // Subscribe callback
      subscribed.push(refCallback)

      // Enable manual rendering if renderPriority is positive
      if (renderPriority) priority += 1
    }

    const unsubscribe = (refCallback: React.MutableRefObject<Subscription>, renderPriority?: number) => {
      // Unsubscribe callback
      const index = subscribed.indexOf(refCallback)

      if (index !== -1) subscribed.splice(index, 0)

      // Disable manual rendering if renderPriority is positive
      if (renderPriority) priority -= 1
    }

    // Init event state
    const mouse = new OGL.Vec2()
    const raycaster = new OGL.Raycast(gl)
    const hovered = new Map()

    // Create root store
    const store = create((set: SetState<RootState>, get: SetState<RootState>) => ({
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
      events: config.events,
      set,
      get,
    })) as RootStore

    // Bind events
    const state = store.getState()
    if (state.events?.connect && !state.events?.connected) state.events.connect(target, state)

    // Handle callback
    config.onCreated?.(state)

    // Create root fiber
    const fiber = reconciler.createContainer(state, RENDER_MODES[mode] ?? RENDER_MODES['blocking'], false, null)

    // Set root
    root = { fiber, store }
    roots.set(target, root)
  }

  // Update fiber
  reconciler.updateContainer(
    <OGLContext.Provider value={root.store}>{element}</OGLContext.Provider>,
    root.fiber,
    null,
    () => undefined,
  )

  return root.store
}

/**
 * Removes and cleans up internals on unmount.
 */
export const unmountComponentAtNode = (target: HTMLCanvasElement) => {
  const root = roots.get(target)
  if (!root) return

  // Clear container
  reconciler.updateContainer(null, root.fiber, null, () => {
    // Delete root
    roots.delete(target)

    const state = root.store.getState()

    // Cancel animation
    if (state.animation) cancelAnimationFrame(state.animation)

    // Unbind events
    if (state.events?.disconnect) state.events.disconnect(target, state)
  })
}

/**
 * Creates a root to safely render/unmount.
 */
export const createRoot = (target: HTMLCanvasElement, config?: RenderProps): Root => ({
  render: (element) => render(element, target, config),
  unmount: () => unmountComponentAtNode(target),
})

/**
 * Portals into a remote OGL element.
 */
export const createPortal = (children: React.ReactNode, target: OGL.Transform): React.ReactNode =>
  reconciler.createPortal(children, target, null, null)
