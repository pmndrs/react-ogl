import * as React from 'react'
import * as OGL from 'ogl'
import type { Fiber } from 'react-reconciler'
import { RESERVED_PROPS, INSTANCE_PROPS, POINTER_EVENTS } from './constants'
import { useIsomorphicLayoutEffect } from './hooks'
import { ConstructorRepresentation, DPR, EventHandlers, Instance, RootState, RootStore } from './types'

/**
 * Converts camelCase primitives to PascalCase.
 */
export const toPascalCase = (str: string) => str.charAt(0).toUpperCase() + str.substring(1)

/**
 * Checks for inheritance between two classes.
 */
export const classExtends = (a: any, b: any) => (Object.prototype.isPrototypeOf.call(a, b) as boolean) || a === b

/**
 * Interpolates DPR from [min, max] based on device capabilities.
 */
export const calculateDpr = (dpr: DPR) =>
  Array.isArray(dpr) ? Math.min(Math.max(dpr[0], window.devicePixelRatio), dpr[1]) : dpr

/**
 * Returns only instance props from reconciler fibers.
 */
export function getInstanceProps<T = any>(queue: Fiber['pendingProps']): Instance<T>['props'] {
  const props: Instance<T>['props'] = {}

  for (const key in queue) {
    if (!RESERVED_PROPS.includes(key)) props[key] = queue[key]
  }

  return props
}

/**
 * Prepares an object, returning an instance descriptor.
 */
export function prepare<T>(target: T, root: RootStore, type: string, props: Instance<T>['props']): Instance<T> {
  const object = (target as unknown as Instance['object']) ?? {}

  // Create instance descriptor
  let instance = object.__ogl
  if (!instance) {
    instance = {
      root,
      parent: null,
      children: [],
      type,
      props: getInstanceProps(props),
      object,
      isHidden: false,
    }
    object.__ogl = instance
  }

  return instance
}

/**
 * Resolves a potentially pierced key type against an object.
 */
export function resolve(root: any, key: string) {
  let target = root[key]
  if (!key.includes('-')) return { root, key, target }

  // Resolve pierced target
  const chain = key.split('-')
  target = chain.reduce((acc, key) => acc[key], root)
  key = chain.pop()!

  // Switch root if atomic
  if (!target?.set) root = chain.reduce((acc, key) => acc[key], root)

  return { root, key, target }
}

// Checks if a dash-cased string ends with an integer
const INDEX_REGEX = /-\d+$/

/**
 * Attaches an instance to a parent via its `attach` prop.
 */
export function attach(parent: Instance, child: Instance) {
  if (typeof child.props.attach === 'string') {
    // If attaching into an array (foo-0), create one
    if (INDEX_REGEX.test(child.props.attach)) {
      const target = child.props.attach.replace(INDEX_REGEX, '')
      const { root, key } = resolve(parent.object, target)
      if (!Array.isArray(root[key])) root[key] = []
    }

    const { root, key } = resolve(parent.object, child.props.attach)
    child.object.__previousAttach = root[key]
    root[key] = child.object
    child.object.__currentAttach = parent.object.__currentAttach = root[key]
  } else if (typeof child.props.attach === 'function') {
    child.object.__previousAttach = child.props.attach(parent.object, child.object)
  }
}

/**
 * Removes an instance from a parent via its `attach` prop.
 */
export function detach(parent: Instance, child: Instance) {
  if (typeof child.props.attach === 'string') {
    // Reset parent key if last attached
    if (parent.object.__currentAttach === child.object.__currentAttach) {
      const { root, key } = resolve(parent.object, child.props.attach)
      root[key] = child.object.__previousAttach
    }
  } else {
    child.object.__previousAttach(parent.object, child.object)
  }

  delete child.object.__previousAttach
  delete child.object.__currentAttach
  delete parent.object.__currentAttach
}

/**
 * Safely mutates an OGL element, respecting special JSX syntax.
 */
export function applyProps<T = any>(target: T, newProps: Instance<T>['props'], oldProps?: Instance<T>['props']): void {
  const object = target as Instance<T>['object']

  // Mutate our OGL element
  for (const prop in newProps) {
    // Don't mutate reserved keys
    if (RESERVED_PROPS.includes(prop as typeof RESERVED_PROPS[number])) continue
    if (INSTANCE_PROPS.includes(prop as typeof INSTANCE_PROPS[number])) continue

    // Don't mutate unchanged keys
    if (newProps[prop] === oldProps?.[prop]) continue

    // Collect event handlers
    const isHandler = POINTER_EVENTS.includes(prop as typeof POINTER_EVENTS[number])
    if (isHandler) {
      object.__handlers = { ...object.__handlers, [prop]: newProps[prop] }
      continue
    }

    const value = newProps[prop]
    const { root, key, target } = resolve(object, prop)

    // Prefer to use properties' copy and set methods
    // otherwise, mutate the property directly
    const isMathClass = typeof target?.set === 'function' && typeof target?.copy === 'function'
    if (!ArrayBuffer.isView(value) && isMathClass) {
      if (target.constructor === (value as ConstructorRepresentation).constructor) {
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
      const uniformList = value as any
      if (key === 'uniforms') {
        for (const uniform in uniformList) {
          // @ts-ignore
          let uniformValue = uniformList[uniform]?.value ?? uniformList[uniform]

          // Handle uniforms shorthand
          if (typeof uniformValue === 'string') {
            // Uniform is a string, convert it into a color
            uniformValue = new OGL.Color(uniformValue)
          } else if (
            uniformValue?.constructor === Array &&
            (uniformValue as any[]).every((v: any) => typeof v === 'number')
          ) {
            // @ts-ignore Uniform is an array, convert it into a vector
            uniformValue = new OGL[`Vec${uniformValue.length}`](...uniformValue)
          }

          root.uniforms[uniform] = { value: uniformValue }
        }
      } else {
        // Mutate the property directly
        root[key] = value
      }
    }
  }
}

/**
 * Creates event handlers, returning an event handler method.
 */
export function createEvents(state: RootState) {
  const handleEvent = (event: PointerEvent, type: keyof EventHandlers) => {
    // Convert mouse coordinates
    state.mouse!.x = (event.offsetX / state.size.width) * 2 - 1
    state.mouse!.y = -(event.offsetY / state.size.height) * 2 + 1

    // Filter to interactive meshes
    const interactive: OGL.Mesh[] = []
    state.scene.traverse((node: OGL.Transform) => {
      // Mesh has registered events and a defined volume
      if (
        node instanceof OGL.Mesh &&
        (node as Instance<OGL.Mesh>['object']).__handlers &&
        node.geometry?.attributes?.position
      )
        interactive.push(node)
    })

    // Get elements that intersect with our pointer
    state.raycaster!.castMouse(state.camera, state.mouse)
    const intersects: OGL.Mesh[] = state.raycaster!.intersectMeshes(interactive)

    // Used to discern between generic events and custom hover events.
    // We hijack the pointermove event to handle hover state
    const isHoverEvent = type === 'onPointerMove'

    // Trigger events for hovered elements
    for (const entry of intersects) {
      // Bail if object doesn't have handlers (managed externally)
      if (!(entry as unknown as any).__handlers) continue

      const object = entry as Instance<OGL.Mesh>['object']
      const handlers = object.__handlers

      if (isHoverEvent && !state.hovered!.get(object.id)) {
        // Mark object as hovered and fire its hover events
        state.hovered!.set(object.id, object)

        // Fire hover events
        handlers.onPointerMove?.({ ...object.hit, nativeEvent: event })
        handlers.onPointerOver?.({ ...object.hit, nativeEvent: event })
      } else {
        // Otherwise, fire its generic event
        handlers[type]?.({ ...object.hit, nativeEvent: event })
      }
    }

    // Cleanup stale hover events
    if (isHoverEvent || type === 'onPointerDown') {
      state.hovered!.forEach((object) => {
        const handlers = object.__handlers

        if (!intersects.length || !intersects.find((i) => i === object)) {
          // Reset hover state
          state.hovered!.delete(object.id)

          // Fire unhover event
          if (handlers?.onPointerOut) handlers.onPointerOut({ ...object.hit, nativeEvent: event })
        }
      })
    }

    return intersects
  }

  return { handleEvent }
}

export type SetBlock = false | Promise<null> | null

/**
 * Used to block rendering via its `set` prop. Useful for suspenseful effects.
 */
export function Block({ set }: { set: React.Dispatch<React.SetStateAction<SetBlock>> }) {
  useIsomorphicLayoutEffect(() => {
    set(new Promise(() => null))
    return () => set(false)
  }, [])

  return null
}

/**
 * Generic error boundary. Calls its `set` prop on error.
 */
export class ErrorBoundary extends React.Component<
  { set: React.Dispatch<any>; children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false }
  static getDerivedStateFromError = () => ({ error: true })
  componentDidCatch(error: any) {
    this.props.set(error)
  }
  render() {
    return this.state.error ? null : this.props.children
  }
}
