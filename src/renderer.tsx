import * as OGL from 'ogl'
import * as React from 'react'
import { ConcurrentRoot } from 'react-reconciler/constants.js'
import { createWithEqualityFn } from 'zustand/traditional'
import { reconciler } from './reconciler'
import { OGLContext, useStore, useIsomorphicLayoutEffect } from './hooks'
import { RenderProps, Root, RootState, RootStore, Subscription } from './types'
import { applyProps, calculateDpr, prepare } from './utils'

// Store roots here since we can render to multiple targets
const roots = new Map<HTMLCanvasElement, { container: any; store: RootStore }>()

/**
 * Renders React elements into OGL elements.
 */
export function render(
  element: React.ReactNode,
  target: HTMLCanvasElement,
  {
    dpr = [1, 2],
    size = { width: target.parentElement?.clientWidth ?? 0, height: target.parentElement?.clientHeight ?? 0 },
    frameloop = 'always',
    orthographic = false,
    events,
    ...config
  }: RenderProps = {},
) {
  // Check for existing root, create on first run
  let root = roots.get(target)
  if (!root) {
    // Create root store
    const store = createWithEqualityFn<RootState>((set, get) => {
      // Create renderer
      const renderer =
        config.renderer instanceof OGL.Renderer
          ? config.renderer
          : typeof config.renderer === 'function'
          ? config.renderer(target)
          : new OGL.Renderer({
              alpha: true,
              antialias: true,
              powerPreference: 'high-performance',
              ...(config.renderer as any),
              canvas: target,
            })
      if (config.renderer && typeof config.renderer !== 'function') applyProps(renderer as any, config.renderer as any)

      renderer.dpr = calculateDpr(dpr)

      const gl = renderer.gl
      gl.clearColor(1, 1, 1, 0)

      // Create or accept camera, apply props
      const camera =
        config.camera instanceof OGL.Camera
          ? config.camera
          : new OGL.Camera(gl, { fov: 75, near: 1, far: 1000, ...(config.camera as any) })
      camera.position.z = 5
      if (config.camera) applyProps(camera as any, config.camera as any)

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
        subscribe(refCallback: React.RefObject<Subscription>, renderPriority = 0) {
          // Subscribe callback
          const { subscribed } = get()
          subscribed.push(refCallback)

          // Enable manual rendering if renderPriority is positive
          set((state) => ({ priority: state.priority + renderPriority }))
        },
        unsubscribe(refCallback: React.RefObject<Subscription>, renderPriority = 0) {
          // Unsubscribe callback
          const { subscribed } = get()
          const index = subscribed.indexOf(refCallback)
          if (index !== -1) subscribed.splice(index, 1)

          // Disable manual rendering if renderPriority is positive
          set((state) => ({ priority: state.priority - renderPriority }))
        },
        events,
        mouse: new OGL.Vec2(),
        raycaster: new OGL.Raycast(),
        hovered: new Map(),
        set,
        get,
      } as RootState
    }) as RootStore

    // Prepare scene
    const state = store.getState()
    prepare(state.scene, store, '', {})

    // Bind events
    if (state.events?.connect && !state.events?.connected) state.events.connect(target, state)

    // Handle callback
    config.onCreated?.(state)

    // Toggle rendering modes
    let nextFrame: number
    function animate(time = 0, frame?: XRFrame) {
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
    function onResize(state: RootState) {
      const { width, height } = state.size
      const projection = state.orthographic ? 'orthographic' : 'perspective'

      if (state.renderer.width !== width || state.renderer.height !== height || state.camera.type !== projection) {
        state.renderer.setSize(width, height)
        state.camera[projection]({ aspect: width / height })
      }
    }
    store.subscribe(onResize)
    onResize(state)

    // Report when an error was detected in a previous render
    const logRecoverableError = typeof reportError === 'function' ? reportError : console.error

    // Create root container
    const container = (reconciler as any).createContainer(
      store, // containerInfo
      ConcurrentRoot, // tag
      null, // hydrationCallbacks
      false, // isStrictMode
      null, // concurrentUpdatesByDefaultOverride
      '', // identifierPrefix
      logRecoverableError, // onUncaughtError
      logRecoverableError, // onCaughtError
      logRecoverableError, // onRecoverableError
      null, // transitionCallbacks
    )

    // Set root
    root = { container, store }
    roots.set(target, root)
  }

  // Update reactive props
  const state = root.store.getState()
  if (state.size.width !== size.width || state.size.height !== size.height) state.set(() => ({ size }))
  if (state.frameloop !== frameloop) state.set(() => ({ frameloop }))
  if (state.orthographic !== orthographic) state.set(() => ({ orthographic }))

  // Update contanier
  reconciler.updateContainer(
    <OGLContext.Provider value={root.store}>{element}</OGLContext.Provider>,
    root.container,
    null,
    () => undefined,
  )

  return root.store
}

/**
 * Removes and cleans up internals on unmount.
 */
export function unmountComponentAtNode(target: HTMLCanvasElement) {
  const root = roots.get(target)
  if (!root) return

  // Clear container
  reconciler.updateContainer(null, root.container, null, () => {
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

interface PortalRootProps {
  children: React.ReactElement
  target: OGL.Transform
  state?: Partial<RootState>
}
function PortalRoot({ children, target, state }: PortalRootProps): React.JSX.Element {
  const store = useStore()
  const container = React.useMemo(
    () =>
      createWithEqualityFn<RootState>((set, get) => ({
        ...store.getState(),
        set,
        get,
        scene: target,
      })),
    [store, target],
  )

  useIsomorphicLayoutEffect(() => {
    const { set, get, scene } = container.getState()
    return store.subscribe((parentState) => container.setState({ ...parentState, ...state, set, get, scene }))
  }, [container, store, state])

  return (
    // @ts-expect-error
    <>
      {reconciler.createPortal(
        <OGLContext.Provider value={store}>{children}</OGLContext.Provider>,
        container,
        null,
        null,
      )}
    </>
  )
}

/**
 * Portals into a remote OGL element.
 */
export function createPortal(
  children: React.ReactElement,
  target: OGL.Transform,
  state?: Partial<RootState>,
): React.JSX.Element {
  return (
    <PortalRoot target={target} state={state}>
      {children}
    </PortalRoot>
  )
}

/**
 * Force React to flush any updates inside the provided callback synchronously and immediately.
 */
export function flushSync<R>(fn: () => R): R {
  return reconciler.flushSync(fn)
}
