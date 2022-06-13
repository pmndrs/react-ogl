import Reconciler from 'react-reconciler'
import * as OGL from 'ogl'
import * as React from 'react'
import { toPascalCase, applyProps, attach, detach, classExtends } from './utils'
import { Fiber, Instance, InstanceProps } from './types'

// Custom objects that extend the OGL namespace
const catalogue: { [name: string]: any } = {}

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
export const extend = (objects: typeof catalogue, passGL = false) => {
  for (const key in objects) {
    const value = objects[key]
    catalogue[key] = value
    if (passGL) catalogueGL.push(value)
  }
}

/**
 * Creates an OGL element from a React node.
 */
const createInstance = (type: string, { object = null, args = [], ...props }: InstanceProps, root: Fiber) => {
  // Convert lowercase primitive to PascalCase
  const name = toPascalCase(type)

  // Get class from extended OGL namespace
  const target = catalogue[name] ?? OGL[name]

  // Validate OGL elements
  if (type !== 'primitive' && !target) throw `${type} is not a part of the OGL catalogue! Did you forget to extend?`

  // Validate primitives
  if (type === 'primitive' && !object) throw `"object" must be set when using primitives.`

  // Create instance
  const instance: Instance = {
    root,
    parent: null,
    children: [],
    type,
    props: { ...props, args },
    object,
  }

  return instance
}

/**
 * Adds elements to our scene and attaches children to their parents.
 */
const appendChild = (parent: Instance, child: Instance) => {
  child.parent = parent
  parent.children.push(child)
}

/**
 * Removes elements from scene and disposes of them.
 */
const removeChild = (parent: Instance, child: Instance) => {
  child.parent = null
  const childIndex = parent.children.indexOf(child)
  if (childIndex !== -1) parent.children.splice(childIndex, 1)

  if (child.props.attach) detach(parent, child)
  else if (child.object instanceof OGL.Transform) parent.object.removeChild(child.object)

  if (child.props.dispose !== null) child.object.dispose?.()
  child.object = null
}

const commitInstance = (instance: Instance) => {
  if (instance.type !== 'primitive' && !instance.object) {
    const name = toPascalCase(instance.type)
    const target = catalogue[name] ?? OGL[name]

    // Pass internal state to elements which depend on it.
    // This lets them be immutable upon creation and use props
    const isGLInstance = Object.values(catalogueGL).some((elem) => classExtends(elem, target))
    if (isGLInstance) {
      const { gl } = instance.root.getState()
      const { args, ...props } = instance.props
      const attrs = args.find((arg) => arg !== gl) ?? {}

      // Accept props as args
      const propAttrs = Object.entries(props).reduce((acc, [key, value]) => {
        if (!key.includes('-')) acc[key] = value
        return acc
      }, attrs)

      instance.object = new target(gl, propAttrs)
    } else {
      instance.object = new target(...instance.props.args)
    }
  }

  // Auto-attach geometry and programs to meshes
  if (!instance.props.attach) {
    if (instance.object instanceof OGL.Geometry) {
      instance.props.attach = 'geometry'
    } else if (instance.object instanceof OGL.Program) {
      instance.props.attach = 'program'
    }
  }

  for (const child of instance.children) {
    if (child.props.attach) {
      attach(instance, child)
    } else if (child.object instanceof OGL.Transform) {
      child.object.setParent(instance.object)
    }
  }

  applyProps(instance.object, instance.props)
}

/**
 * Switches instance to a new one, moving over children.
 */
const switchInstance = (instance: Instance, type: string, props: InstanceProps, root: Fiber) => {
  // Create a new instance
  const newInstance = createInstance(type, props, root)

  // Replace instance in scene-graph
  const parent = instance.parent
  removeChild(parent, instance)
  appendChild(parent, newInstance)

  // Commit new instance object
  commitInstance(newInstance)

  // Append to scene-graph
  if (props.attach) {
    detach(parent, instance)
    attach(parent, newInstance)
  } else if (newInstance.object instanceof OGL.Transform) {
    newInstance.object.setParent(parent.object)
  }

  // Move children to new instance
  if (instance.type !== 'primitive') {
    for (const child of instance.children) {
      appendChild(newInstance, child)
      if (child.props.attach) {
        detach(instance, child)
        attach(newInstance, child)
      }
    }
    instance.children = []
  }

  // Switches the react-internal fiber node
  // https://github.com/facebook/react/issues/14983
  ;[root, root.alternate].forEach((fiber) => {
    if (fiber !== null) {
      fiber.stateNode = newInstance
      if (fiber.ref) {
        if (typeof fiber.ref === 'function') (fiber as unknown as any).ref(newInstance.object)
        else (fiber.ref as Reconciler.RefObject).current = newInstance.object
      }
    }
  })

  return newInstance
}

/**
 * Shallow checks objects.
 */
const checkShallow = (a: any, b: any) => {
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
const diffProps = (instance: Instance, newProps: InstanceProps, oldProps: InstanceProps) => {
  const changedProps: InstanceProps = {}

  // Sort through props
  for (const key in newProps) {
    // Skip reserved keys
    if (key === 'children') continue
    // Skip primitives
    if (instance.type === 'primitive' && key === 'object') continue
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
const insertBefore = (parent: Instance, child: Instance, beforeChild: Instance) => {
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
  getPublicInstance: (instance: Instance) => instance.object,
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
  appendChildToContainer: () => {},
  // These methods remove elements from the scene
  removeChild,
  removeChildFromContainer: () => {},
  // We can specify an order for children to be specified here.
  // This is useful if you want to override stuff like materials
  insertBefore,
  insertInContainerBefore: () => {},
  // Used to calculate updates in the render phase or commitUpdate.
  // Greatly improves performance by reducing paint to rapid mutations.
  // Returns [shouldReconstruct: boolean, changedProps]
  prepareUpdate(instance: Instance, type: string, oldProps: InstanceProps, newProps: InstanceProps) {
    // Element is a primitive. We must recreate it when its object prop is changed
    if (instance.type === 'primitive' && oldProps.object !== newProps.object) return [true]

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
    root: Fiber,
  ) {
    // If flagged for recreation, swap to a new instance.
    if (reconstruct) switchInstance(instance, type, newProps, root)
    // Otherwise, just apply changed props
    else applyProps(instance.object, changedProps)
  },
  hideInstance(instance: Instance) {
    if (instance.object instanceof OGL.Transform) {
      instance.object.visible = false
    }
  },
  unhideInstance(instance: Instance) {
    if (instance.object instanceof OGL.Transform) {
      instance.object.visible = instance.props.visible ?? true
    }
  },
  finalizeInitialChildren: () => true,
  commitMount: commitInstance,
})

// Injects renderer meta into devtools.
const isProd = typeof process === 'undefined' || process.env?.['NODE_ENV'] === 'production'
reconciler.injectIntoDevTools({
  findFiberByHostInstance: (instance: Instance) => instance.root,
  bundleType: isProd ? 0 : 1,
  version: React.version,
  rendererPackageName: 'react-ogl',
})
