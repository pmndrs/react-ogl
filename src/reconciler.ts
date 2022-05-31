import Reconciler from 'react-reconciler'
import * as OGL from 'ogl'
import * as React from 'react'
import { toPascalCase, applyProps, attach, detach, classExtends } from './utils'
import { RESERVED_PROPS } from './constants'
import { Catalogue, Instance, InstanceProps, RootState } from './types'

// Custom objects that extend the OGL namespace
const catalogue: Catalogue = {}

// Effectful catalogue elements that require a `WebGLRenderingContext`.
const catalogueGL: any[] = [
  // Core
  OGL.Camera,
  OGL.Geometry,
  OGL.Mesh,
  OGL.Program,
  OGL.RenderTarget,
  OGL.Texture,

  // Extras
  OGL.Flowmap,
  OGL.GPGPU,
  OGL.NormalProgram,
  OGL.Polyline,
  OGL.Post,
  OGL.Shadow,
]

/**
 * Extends the OGL namespace, accepting an object of keys pointing to external classes.
 * `passGL` will flag the element to receive a `WebGLRenderingContext` on creation.
 */
export const extend = (objects: Catalogue, passGL = false) => {
  for (const key in objects) {
    const value = objects[key]
    catalogue[key] = value
    if (passGL) catalogueGL.push(value)
  }
}

/**
 * Creates an OGL element from a React node.
 */
export const createInstance = (type: string, { object, args, ...props }: InstanceProps, fiber: Reconciler.Fiber) => {
  // Convert lowercase primitive to PascalCase
  const name = toPascalCase(type)

  // Get class from extended OGL namespace
  const target = catalogue[name] || OGL[name]

  // Validate OGL elements
  if (type !== 'primitive' && !target) throw `${type} is not a part of the OGL namespace! Did you forget to extend?`

  // Validate primitives
  if (type === 'primitive' && !object) throw `"object" must be set when using primitives.`

  // Pass internal state to elements which depend on it.
  // This lets them be immutable upon creation and use props
  const isGLInstance = Object.values(catalogueGL).some((elem) => classExtends(elem, target))
  if (!object && isGLInstance) {
    // Checks whether arg is an instance of a GL context
    const isGL = (arg: any) => arg instanceof WebGL2RenderingContext || arg instanceof WebGLRenderingContext

    // Get gl arg, use root gl as fallback
    const gl = args?.find((arg) => isGL(arg)) ?? (fiber as unknown as RootState).gl

    // Get attribute arg
    const attrs = args?.find((arg) => !isGL(arg)) ?? {}

    // Accept props as args
    const propAttrs = Object.entries(props).reduce((acc, [key, value]) => {
      if (!key.includes('-')) acc[key] = value
      return acc
    }, attrs)

    // Rebuild args
    args = [gl, propAttrs]
  }

  // Create instance
  const instance = object || (Array.isArray(args) ? new target(...args) : new target(args))

  // If primitive, make a note of it
  if (type === 'primitive') instance.isPrimitive = true

  // Auto-attach geometry and programs to meshes
  if (instance instanceof OGL.Geometry) {
    props = { attach: 'geometry', ...props }
  } else if (instance instanceof OGL.Program) {
    props = { attach: 'program', ...props }
  }

  // Set initial props
  applyProps(instance, props)

  return instance
}

/**
 * Adds elements to our scene and attaches children to their parents.
 */
export const appendChild = (parent: Instance, child: Instance) => {
  if (!child) return

  if (!child.attach) child.setParent?.(parent)
  child.parent = parent
}

/**
 * Removes elements from scene and disposes of them.
 */
export const removeChild = (parent: Instance, child: Instance) => {
  if (!child) return

  if (child.attach) {
    detach(parent, child)
  } else {
    parent?.removeChild?.(child)
  }

  child.parent = null
  child.dispose?.()
}

/**
 * Switches instance to a new one, moving over children.
 */
export const switchInstance = (instance: Instance, type: string, props: InstanceProps, fiber: Reconciler.Fiber) => {
  // Create a new instance
  const newInstance = createInstance(type, props, fiber)

  // Move children to new instance
  if (!instance.isPrimitive && instance.children) {
    for (const child of instance.children) {
      appendChild(newInstance, child)
    }
    instance.children = []
  }

  // Move over attached instances
  if (instance.__attached) {
    for (const attachedInstance of Object.values(instance.__attached)) {
      attachedInstance.parent = newInstance
      detach(instance, attachedInstance)
      attach(newInstance, attachedInstance)
    }
  }

  // Replace instance in scene-graph
  removeChild(instance.parent, instance)
  appendChild(instance.parent, newInstance)

  // Switches the react-internal fiber node
  // https://github.com/facebook/react/issues/14983
  ;[fiber, fiber.alternate].forEach((fiber) => {
    if (fiber !== null) {
      fiber.stateNode = newInstance
      if (fiber.ref) {
        if (typeof fiber.ref === 'function') (fiber as unknown as any).ref(newInstance)
        else (fiber.ref as Reconciler.RefObject).current = newInstance
      }
    }
  })

  return newInstance
}

/**
 * Gets the root store and container from a target container and child instance.
 */
export const getContainer = (
  container: RootState | Instance | null,
  child: Instance,
): { root: Reconciler.Fiber; container: Instance } => ({
  root: container?.scene ? container : container?.rootNode ?? child.rootNode,
  container: container?.scene || container,
})

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
  const changedProps: InstanceProps = {}

  // Sort through props
  for (const key in newProps) {
    // Skip reserved keys
    if (RESERVED_PROPS.includes(key as typeof RESERVED_PROPS[number])) continue
    // Skip primitives
    if (instance.isPrimitive && key === 'object') continue
    // Skip if props match
    if (checkShallow(newProps[key], oldProps[key])) continue

    // Props changed, add them
    changedProps[key] = newProps[key]
  }

  return changedProps
}

/**
 * Inserts an instance between instances of a ReactNode.
 */
export const insertBefore = (parent: Instance, child: Instance, beforeChild: Instance) => {
  if (!child) return

  child.parent = parent
  parent.children.splice(parent.children.indexOf(beforeChild), 0, child)
}

/**
 * Centralizes and handles mutations through an OGL scene-graph.
 */
export const reconciler = Reconciler({
  now: typeof performance !== 'undefined' ? performance.now : Date.now,
  supportsHydration: false,
  supportsPersistence: false,
  scheduleTimeout: typeof setTimeout !== 'undefined' ? setTimeout : undefined,
  cancelTimeout: typeof clearTimeout !== 'undefined' ? clearTimeout : undefined,
  noTimeout: -1,
  // OGL elements can be updated, so we inform the renderer
  supportsMutation: true,
  // We set this to false because this can work on top of react-dom
  isPrimaryRenderer: false,
  // We can modify the ref here, but we return it instead (no-op)
  getPublicInstance: (instance: Instance) => instance,
  // This object that's passed into the reconciler is the host context.
  // Don't expose the root though, only children for portalling
  getRootHostContext: () => null,
  getChildHostContext: (parentHostContext: any) => parentHostContext,
  // Text isn't supported so we skip it
  createTextInstance: () => console.warn('Text is not allowed in the OGL scene-graph!'),
  // This lets us store stuff before React mutates our OGL elements.
  // We don't do anything here
  prepareForCommit: () => null,
  resetAfterCommit: () => {},
  // OGL elements don't have textContent, so we skip this
  shouldSetTextContent: () => false,
  preparePortalMount: (container: any) => container,
  // This can modify the container and clear children.
  // Might be useful for disposing on demand later
  clearContainer: () => false,
  // This creates a OGL element from a React element
  createInstance,
  // These methods add elements to the scene
  appendChild,
  appendInitialChild: appendChild,
  appendChildToContainer(parent: RootState | Instance, child: Instance) {
    const { container } = getContainer(parent, child)
    appendChild(container, child)
  },
  // These methods remove elements from the scene
  removeChild,
  removeChildFromContainer(parent: RootState | Instance, child: Instance) {
    const { container } = getContainer(parent, child)
    removeChild(container, child)
  },
  // We can specify an order for children to be specified here.
  // This is useful if you want to override stuff like materials
  insertBefore,
  insertInContainerBefore(parent: RootState | Instance, child: Instance, beforeChild: Instance) {
    const { container } = getContainer(parent, child)
    insertBefore(container, child, beforeChild)
  },
  // Used to calculate updates in the render phase or commitUpdate.
  // Greatly improves performance by reducing paint to rapid mutations.
  // Returns [shouldReconstruct: boolean, changedProps]
  prepareUpdate(instance: Instance, type: string, oldProps: InstanceProps, newProps: InstanceProps) {
    // Element is a primitive. We must recreate it when its object prop is changed
    if (instance.isPrimitive && newProps.object && newProps.object !== instance) return [true]

    // Element is a program. Check whether its vertex or fragment props changed to recreate
    if (type === 'program') {
      if (oldProps.vertex !== newProps.vertex) return [true]
      if (oldProps.fragment !== newProps.fragment) return [true]
    }

    // Element is a geometry. Check whether its attribute props changed to recreate.
    if (instance instanceof OGL.Geometry) {
      for (const key in oldProps) {
        if (!key.startsWith('attributes-') && oldProps[key] !== newProps[key]) return [true]
      }
    }

    // If the instance has new props or arguments, recreate it
    if (newProps.args?.some((value, index) => value !== oldProps.args[index])) return [true]

    // Diff through props and flag with changes
    const changedProps = diffProps(instance, newProps, oldProps)
    if (Object.keys(changedProps).length) return [false, changedProps]

    // No changes, don't update the instance
    return null
  },
  // This is where we mutate OGL elements in the render phase
  commitUpdate(
    instance: Instance,
    [reconstruct, changedProps]: [boolean, InstanceProps],
    type: string,
    oldProps: InstanceProps,
    newProps: InstanceProps,
    fiber: Reconciler.Fiber,
  ) {
    // If flagged for recreation, swap to a new instance.
    if (reconstruct) return switchInstance(instance, type, newProps, fiber)

    // Otherwise, just apply changed props
    applyProps(instance, changedProps)
  },
  hideInstance(instance: Instance) {
    if (instance instanceof OGL.Transform) instance.visible = false
  },
  unhideInstance(instance: Instance, props: InstanceProps) {
    if ((instance instanceof OGL.Transform && props.visible == null) || props.visible) instance.visible = true
  },
  finalizeInitialChildren(instance: Instance) {
    // https://github.com/facebook/react/issues/20271
    // Returning true will trigger commitMount
    return !!instance.attach
  },
  commitMount(instance: Instance) {
    // https://github.com/facebook/react/issues/20271
    // This will make sure attachments are only added once to the central container through suspense
    if (instance.attach) attach(instance.parent, instance)
  },
})

// Injects renderer meta into devtools.
reconciler.injectIntoDevTools({
  findFiberByHostInstance(instance: Instance) {
    return getContainer(instance.parent, instance.child).root
  },
  bundleType: process.env.NODE_ENV === 'production' ? 0 : 1,
  version: React.version,
  rendererPackageName: 'react-ogl',
})
