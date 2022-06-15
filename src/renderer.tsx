import * as OGL from 'ogl'
import * as React from 'react'
import { Fiber, ReactPortal } from 'react-reconciler'
import create, { GetState, SetState } from 'zustand'
import { reconciler } from './reconciler'
import { RENDER_MODES } from './constants'
import { OGLContext, useStore } from './hooks'
import { Instance, InstanceProps, RenderProps, Root, RootState, RootStore, Subscription } from './types'
import { applyProps, calculateDpr } from './utils'

// Store roots here since we can render to multiple targets
const roots = new Map<HTMLCanvasElement, { fiber: Fiber; store: RootStore }>()

/**
 * Renders React elements into OGL elements.
 */
export const render = (
  element: React.ReactNode,
  target: HTMLCanvasElement,
  {
    mode = 'blocking',
    dpr = [1, 2],
    size = { width: target.parentElement?.clientWidth ?? 0, height: target.parentElement?.clientHeight ?? 0 },
    frameloop = 'always',
    orthographic = false,
    events,
    ...config
  }: RenderProps = {},
) => {
  // Check for existing root, create on first run
  let root = roots.get(target)
  if (!root) {
    // Create root store
    const store = create((set: SetState<RootState>, get: GetState<RootState>) => {
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
      if (config.renderer && typeof config.renderer !== 'function')
        applyProps(renderer as unknown as Instance, config.renderer as InstanceProps)

      renderer.dpr = calculateDpr(dpr)

      const gl = renderer.gl
      gl.clearColor(1, 1, 1, 0)

      // Create or accept camera, apply props
      const camera =
        config.camera instanceof OGL.Camera
          ? config.camera
          : new OGL.Camera(gl, { fov: 75, near: 1, far: 1000, ...(config.camera as any) })
      camera.position.z = 5
      if (config.camera) applyProps(camera, config.camera as InstanceProps)

      return {
        size,
        xr: {
          session: null,
          setSession(session) {
            set((state) => ({ xr: { ...state.xr, session } }))
          },
          connect(session) {
            get().xr.setSession(session)
          },
          disconnect() {
            get().xr.setSession(null)
          },
        },
        renderer,
        frameloop,
        orthographic,
        gl,
        camera,
        scene: config.scene ?? new OGL.Transform(),
        priority: 0,
        subscribed: [],
        // Subscribe/unsubscribe elements to the render loop
        subscribe(refCallback: React.MutableRefObject<Subscription>, renderPriority = 0) {
          // Subscribe callback
          const { subscribed } = get()
          subscribed.push(refCallback)

          // Enable manual rendering if renderPriority is positive
          set((state) => ({ priority: state.priority + renderPriority }))
        },
        unsubscribe(refCallback: React.MutableRefObject<Subscription>, renderPriority = 0) {
          // Unsubscribe callback
          const { subscribed } = get()
          const index = subscribed.indexOf(refCallback)
          if (index !== -1) subscribed.splice(index, 1)

          // Disable manual rendering if renderPriority is positive
          set((state) => ({ priority: state.priority - renderPriority }))
        },
        events,
        set,
        get,
      } as RootState
    }) as RootStore

    // Bind events
    const state = store.getState()
    if (state.events?.connect && !state.events?.connected) state.events.connect(target, state)

    // Handle callback
    config.onCreated?.(state)

    // Toggle rendering modes
    let nextFrame: number
    const animate = (time = 0, frame?: XRFrame) => {
      // Toggle XR rendering
      const state = store.getState()
      const mode = state.xr.session ?? window

      // Cancel animation if frameloop is set, otherwise keep looping
      if (state.frameloop === 'never') return mode.cancelAnimationFrame(nextFrame)
      nextFrame = mode.requestAnimationFrame(animate)

      // Call subscribed elements
      for (const ref of state.subscribed) ref.current?.(state, time, frame)

      // If rendering manually, skip render
      if (state.priority) return

      // Render to screen
      state.renderer.render({ scene: state.scene, camera: state.camera })
    }
    if (state.frameloop !== 'never') animate()

    // Handle resize
    const onResize = (state: RootState) => {
      const { width, height } = state.size
      const projection = state.orthographic ? 'orthographic' : 'perspective'

      if (state.renderer.width !== width || state.renderer.height !== height || state.camera.type !== projection) {
        state.renderer.setSize(width, height)
        state.camera[projection]({ aspect: width / height })
      }
    }
    store.subscribe(onResize)
    onResize(state)

    // Create root fiber
    const fiber = reconciler.createContainer(store, RENDER_MODES[mode] ?? RENDER_MODES['blocking'], false, null)

    // Set root
    root = { fiber, store }
    roots.set(target, root)
  }

  // Update reactive props
  const state = root.store.getState()
  if (state.size.width !== size.width || state.size.height !== size.height) state.set(() => ({ size }))
  if (state.frameloop !== frameloop) state.set(() => ({ frameloop }))
  if (state.orthographic !== orthographic) state.set(() => ({ orthographic }))

  // Update fiber
  reconciler.updateContainer(
    <OGLContext.Provider value={root.store}>
      <primitive object={state.scene}>{element}</primitive>
    </OGLContext.Provider>,
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
    state.set(() => ({ frameloop: 'never' }))

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

// Prepares portal target
interface PortalRootProps {
  children: React.ReactElement
  target: OGL.Transform
  container: any
}
function PortalRoot({ children, target, container }: PortalRootProps) {
  const store = useStore()
  React.useMemo(() => Object.assign(container, store), [container, store])
  return <primitive object={target}>{children}</primitive>
}

/**
 * Portals into a remote OGL element.
 */
export const createPortal = (children: React.ReactElement, target: OGL.Transform): ReactPortal => {
  const container = {}
  return reconciler.createPortal(
    <PortalRoot target={target} container={container}>
      {children}
    </PortalRoot>,
    container,
    null,
    null,
  )
}
