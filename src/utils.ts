import * as React from 'react'
// @ts-ignore
import * as OGL from 'ogl'
import { createRoot } from './renderer'
import { useIsomorphicLayoutEffect } from './hooks'
import { RESERVED_PROPS } from './constants'
import { Instance, InstanceProps, RootState, EventHandlers, RenderProps, Subscription } from './types'

/**
 * Converts camelCase primitives to PascalCase.
 */
export const toPascalCase = (str: string) => str.charAt(0).toUpperCase() + str.substring(1)

/**
 * Checks whether key/value pair is an attribute
 */
export const isAttribute = (key: string, value: any) =>
  !key.startsWith('attributes-') && value?.data && typeof value?.size === 'number'

/**
 * Filters keys from an object.
 */
export const filterKeys = (obj: any, prune = false, ...keys: string[]) => {
  const keysToSelect = new Set(keys.flat())

  return Object.fromEntries(Object.entries(obj).filter(([key]) => keysToSelect.has(key) === !prune))
}

/**
 * Safely mutates an OGL element, respecting special JSX syntax.
 */
export const applyProps = (instance: Instance, newProps: InstanceProps, oldProps: InstanceProps = {}) => {
  // Filter identical props and reserved keys
  const identical = Object.keys(newProps).filter((key) => newProps[key] === oldProps[key])
  const handlers = Object.keys(newProps).filter((key) => typeof newProps[key] === 'function' && key.startsWith('on'))
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
 * Shallow checks objects.
 */
export const checkShallow = (a: any, b: any) => {
  // If comparing arrays, shallow compare
  if (Array.isArray(a)) {
    // Check if types match
    if (!Array.isArray(b)) return false

    // Shallow compare for match
    if (a == b) return true

    // Sort through keys
    if (a.every((v, i) => v === b[i])) return true
  }

  // Atomically compare
  if (a === b) return true

  return false
}

/**
 * Prepares a set of changes to be applied to the instance.
 */
export const diffProps = (instance: Instance, newProps: InstanceProps, oldProps: InstanceProps = {}) => {
  // Prune reserved props
  newProps = filterKeys(newProps, true, ...RESERVED_PROPS)
  oldProps = filterKeys(oldProps, true, ...RESERVED_PROPS)

  const changedProps: InstanceProps = {}

  // Sort through props
  Object.entries(newProps).forEach(([key, value]) => {
    // Skip primitives
    if (instance.isPrimitive && key === 'object') return
    // Skip if props match
    if (checkShallow(value, oldProps[key])) return

    // Props changed, add them
    changedProps[key] = value
  })

  return changedProps
}

/**
 * Creates event handlers, returning an event handler method.
 */
export const createEvents = (state: RootState) => {
  // Init event state
  state.mouse = new OGL.Vec2()
  state.raycaster = new OGL.Raycast(state.gl)
  state.hovered = new Map()

  const handleEvent = (event: MouseEvent | PointerEvent, type: keyof EventHandlers) => {
    // Convert mouse coordinates
    state.mouse.x = (event.clientX / state.renderer.width) * 2 - 1
    state.mouse.y = -(event.clientY / state.renderer.height) * 2 + 1

    // Get elements that intersect with our pointer
    state.raycaster.castMouse(state.camera, state.mouse)
    const intersects: OGL.Transform[] = state.raycaster.intersectBounds(state.scene.children as OGL.Mesh[])

    // Used to discern between generic events and custom hover events.
    // We hijack the pointermove event to handle hover state
    const isHoverEvent = type === 'onPointerMove'

    // Trigger events for hovered elements
    intersects.forEach((object) => {
      const handlers = object.__handlers

      if (isHoverEvent && !state.hovered.get(object.id)) {
        // Mark object as hovered and fire its hover events
        state.hovered.set(object.id, object)

        // Fire hover events
        if (handlers?.onHover) handlers.onHover(event)
        if (handlers?.onPointerOver) handlers.onPointerOver(event)
      } else if (!isHoverEvent && handlers?.[type]) {
        // Otherwise, fire its generic event
        handlers[type](event)
      }
    })

    // Cleanup stale hover events
    if (isHoverEvent) {
      state.hovered.forEach((object: OGL.Mesh & { __handlers?: any }) => {
        const handlers = object.__handlers

        if (!intersects.length || !intersects.find((i) => i === object)) {
          // Reset hover state
          state.hovered.delete(object.id)

          // Fire unhover event
          if (handlers?.onPointerOut) handlers.onPointerOut(event)
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
      : new OGL.Renderer({
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
          ...(props.renderer as any),
          canvas: canvas,
        })
  if (props.renderer) applyProps(renderer, props.renderer as InstanceProps)
  const gl = renderer.gl

  // Create or accept camera, apply props
  const camera = props.camera instanceof OGL.Camera ? props.camera : new OGL.Camera({ ...(props.camera as any) })
  camera.position.z = 5
  if (props.camera) applyProps(camera, props.camera as InstanceProps)

  // Create scene
  const scene = new OGL.Transform()

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

export type SetBlock = false | Promise<null> | null

export type UnblockProps = {
  set: React.Dispatch<React.SetStateAction<SetBlock>>
  children: React.ReactNode
}

/**
 * Used to block rendering via its `set` prop. Useful for suspenseful effects.
 */
export const Block = ({ set }: Omit<UnblockProps, 'children'>) => {
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
