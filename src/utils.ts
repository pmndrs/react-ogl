import * as React from 'react'
import * as OGL from 'ogl'
import { COLORS, POINTER_EVENTS, RESERVED_PROPS } from './constants'
import { useIsomorphicLayoutEffect } from './hooks'
import { createRoot } from './renderer'
import {
  EventHandlers,
  Instance,
  InstanceProps,
  ObjectMap,
  RenderProps,
  RootState,
  SetBlock,
  Subscription,
} from './types'

/**
 * Converts camelCase primitives to PascalCase.
 */
export const toPascalCase = (str: string) => str.charAt(0).toUpperCase() + str.substring(1)

/**
 * Converts a stringified color name into a Color.
 */
export const toColor = (name: keyof typeof COLORS) => new OGL.Color(COLORS[name] ?? name)

/**
 * Converts an array of integers into a Vector.
 */
export const toVector = (values: number[]) => new OGL[`Vec${values.length}`](...values)

/**
 * Filters keys from an object.
 */
export const filterKeys = (obj: any, prune = false, ...keys: string[]) => {
  const keysToSelect = new Set(keys.flat())

  return Object.fromEntries(Object.entries(obj).filter(([key]) => keysToSelect.has(key) === !prune))
}

/**
 * Attaches an instance to a parent via its `attach` prop.
 */
export const attach = (parent: Instance, child: Instance) => {
  if (!child.attach) return

  parent[child.attach] = child
  parent.__attached = parent.__attached || {}
  parent.__attached[child.attach] = child
}

/**
 * Removes an instance from a parent via its `attach` prop.
 */
export const detach = (parent: Instance, child: Instance) => {
  if (!parent?.__attached?.[child.attach]) return

  delete parent.__attached[child.attach]
  parent[child.attach] = null
}

/**
 * Safely mutates an OGL element, respecting special JSX syntax.
 */
export const applyProps = (instance: Instance, newProps: InstanceProps, oldProps: InstanceProps = {}) => {
  // Filter identical props and reserved keys
  const identical = Object.keys(newProps).filter((key) => newProps[key] === oldProps[key])
  const handlers = Object.keys(newProps).filter(
    (key) => typeof newProps[key] === 'function' && POINTER_EVENTS.includes(key as typeof POINTER_EVENTS[number]),
  )
  const props = filterKeys(newProps, true, ...identical, ...handlers, ...RESERVED_PROPS)

  // Mutate our OGL element
  if (Object.keys(props).length) {
    Object.entries(props).forEach(([key, value]) => {
      let root = instance
      let target = root[key]

      // Set deeply nested properties using piercing.
      // <element prop1-prop2={...} /> => Element.prop1.prop2 = ...
      if (key.includes('-')) {
        // Build new target from chained props
        const chain = key.split('-')
        target = chain.reduce((acc, key) => acc[key], instance)

        // Switch root of target if atomic
        if (!target?.set) {
          // We're modifying the first of the chain instead of element.
          // Remove the key from the chain and target it instead.
          key = chain.pop()
          root = chain.reduce((acc, key) => acc[key], instance)
        }
      }

      // Prefer to use properties' copy and set methods
      // otherwise, mutate the property directly
      if (target?.set) {
        if (target.constructor.name === value.constructor.name) {
          target.copy(value)
        } else if (Array.isArray(value)) {
          target.set(...value)
        } else {
          // Support shorthand scalar syntax like scale={1}
          const scalar = new Array(target.length).fill(value)
          target.set(...scalar)
        }
      } else {
        // Allow shorthand values for uniforms
        if (key === 'uniforms') {
          Object.entries(value).forEach(([uniform, entry]) => {
            // Handle uniforms which don't have a value key set
            if (entry?.value === undefined) {
              let value: any

              if (typeof entry === 'string') {
                // Uniform is a string, convert it into a color
                value = toColor(entry as keyof typeof COLORS)
              } else if (Array.isArray(entry)) {
                // Uniform is an array, convert it into a vector
                value = toVector(entry)
              } else {
                // Uniform is something else, don't convert it
                value = entry
              }

              entry = { value }
            }

            root[key][uniform] = entry
          })
          // we apply uniforms directly to object as patch, not need apply value
          return
        }

        // Mutate the property directly
        root[key] = value
      }
    })
  }

  // Collect event handlers.
  if (handlers.length) {
    instance.__handlers = handlers.reduce((acc, key) => ({ ...acc, [key]: newProps[key] }), {})
  }
}

/**
 * Collects nodes and programs from a Mesh.
 */
export const buildGraph = (object: OGL.Transform) => {
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
      if ((node as Instance).__handlers && node.geometry?.attributes?.position) interactive.push(node)
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
  const renderer = (
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
  ) as OGL.Renderer

  if (props.renderer && typeof props.renderer !== 'function') Object.assign(renderer, props.renderer)
  const gl = renderer.gl
  gl.clearColor(1, 1, 1, 0)

  // Flush frame for native
  if ('endFrameEXP' in renderer.gl) {
    const renderFrame = renderer.render.bind(renderer)
    renderer.render = ({ scene, camera }) => {
      renderFrame({ scene, camera })
      ;(renderer.gl as any).endFrameEXP()
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

/**
 * Used to block rendering via its `set` prop. Useful for suspenseful effects.
 */
export const Block = ({ set }: { set: React.Dispatch<React.SetStateAction<SetBlock>> }) => {
  useIsomorphicLayoutEffect(() => {
    set(new Promise(() => null))
    return () => set(false)
  }, [])

  return null
}

/**
 * Generic error boundary. Calls its `set` prop on error.
 */
export class ErrorBoundary extends React.Component<{ set: React.Dispatch<any> }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError = () => ({ error: true })
  componentDidCatch(error: any) {
    this.props.set(error)
  }
  render() {
    return this.state.error ? null : this.props.children
  }
}
