import * as React from 'react'
import * as OGL from 'ogl'
import { COLORS, POINTER_EVENTS } from './constants'
import { useIsomorphicLayoutEffect } from './hooks'
import {
  DPR,
  EventHandlers,
  Instance,
  InstanceProps,
  ObjectMap,
  RootState,
  SetBlock,
  UniformList,
  UniformRepresentation,
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
 * Checks for inheritance between two classes.
 */
export const classExtends = (a: any, b: any) => (Object.prototype.isPrototypeOf.call(a, b) as boolean) || a === b

/**
 * Interpolates DPR from [min, max] based on device capabilities.
 */
export const calculateDpr = (dpr: DPR) =>
  Array.isArray(dpr) ? Math.min(Math.max(dpr[0], window.devicePixelRatio), dpr[1]) : dpr

/**
 * Resolves a stringified attach type against an `Instance`.
 */
export const resolveAttach = (instance: Instance, key: string) => {
  let target = instance
  if (key.includes('-')) {
    const entries = key.split('-')
    const last = entries.pop() as string
    target = entries.reduce((acc, key) => acc[key], instance)
    return { target, key: last }
  } else return { target, key }
}

// Checks if a dash-cased string ends with an integer
const INDEX_REGEX = /-\d+$/

/**
 * Attaches an instance to a parent via its `attach` prop.
 */
export const attach = (parent: Instance, child: Instance) => {
  if (!child.attach) return

  parent.__attached = parent.__attached ?? []
  parent.__attached.push(child)

  if (typeof child.attach === 'string') {
    // If attaching into an array (foo-0), create one
    if (INDEX_REGEX.test(child.attach)) {
      const root = child.attach.replace(INDEX_REGEX, '')
      const { target, key } = resolveAttach(parent, root)
      if (!Array.isArray(target[key])) target[key] = []
    }

    const { target, key } = resolveAttach(parent, child.attach)
    child.__previousAttach = target[key]
    target[key] = child
  } else {
    child.__previousAttach = child.attach(parent, child)
  }
}

/**
 * Removes an instance from a parent via its `attach` prop.
 */
export const detach = (parent: Instance, child: Instance) => {
  const attachIndex = parent?.__attached?.indexOf(child)
  if (typeof attachIndex !== 'number' || attachIndex === -1) return

  child.__previousAttach = undefined
  parent.__attached.splice(attachIndex, 1)

  if (typeof child.attach === 'string') {
    const { target, key } = resolveAttach(parent, child.attach)
    target[key] = child.__previousAttach
  } else {
    child.__previousAttach?.(parent, child)
  }
}

/**
 * Safely mutates an OGL element, respecting special JSX syntax.
 */
export const applyProps = (instance: Instance, newProps: InstanceProps, oldProps?: InstanceProps) => {
  // Mutate our OGL element
  for (let key in newProps) {
    // Don't mutate reserved keys
    if (key === 'children') continue

    // Don't mutate unchanged keys
    if (newProps[key] === oldProps?.[key]) continue

    // Collect event handlers
    const isHandler = POINTER_EVENTS.includes(key as typeof POINTER_EVENTS[number])
    if (isHandler) {
      instance.__handlers = { ...instance.__handlers, [key]: newProps[key] }
      continue
    }

    const value = newProps[key]
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
      const uniformList = value as UniformList
      if (key === 'uniforms') {
        for (const uniform in uniformList) {
          // @ts-ignore
          let uniformValue: UniformRepresentation = uniformList[uniform]?.value ?? uniformList[uniform]

          // Handle uniforms shorthand
          if (typeof uniformValue === 'string') {
            // Uniform is a string, convert it into a color
            uniformValue = toColor(uniformValue as keyof typeof COLORS)
          } else if (
            uniformValue?.constructor === Array &&
            (uniformValue as any[]).every((v: any) => typeof v === 'number')
          ) {
            // Uniform is an array, convert it into a vector
            uniformValue = toVector(uniformValue as number[])
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
  // Init event state
  state.mouse = new OGL.Vec2()
  state.raycaster = new OGL.Raycast(state.gl)
  state.hovered = new Map()

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
    for (const object of intersects) {
      const handlers = object.__handlers

      // Bail if object doesn't have handlers (managed externally)
      if (!handlers) continue

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
    }

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
