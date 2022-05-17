import Reconciler from 'react-reconciler'
// @ts-ignore
import * as OGL from 'ogl'
import { toPascalCase, applyProps, diffProps } from './utils'
import { GL_ELEMENTS } from './constants'
import { Catalogue, Instance, InstanceProps, RootState } from './types'

// Custom objects that extend the OGL namespace
const catalogue: Catalogue = {}

/**
 * Extends the OGL namespace, accepting an object of keys pointing to external classes.
 */
export const extend = (objects: Catalogue) =>
  Object.entries(objects).forEach(([key, value]) => (catalogue[key] = value))

/**
 * Creates an OGL element from a React node.
 */
export const createInstance = (type: string, { object, args, ...props }: InstanceProps, root: RootState) => {
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
  if (!object && GL_ELEMENTS.some((elem) => Object.prototype.isPrototypeOf.call(elem, target) || elem === target)) {
    // Checks whether arg is an instance of a GL context
    const isGL = (arg: any) => arg instanceof WebGL2RenderingContext || arg instanceof WebGLRenderingContext

    // Get gl arg, use root gl as fallback
    const gl = args?.find((arg) => isGL(arg)) ?? root.gl

    // Get attribute arg
    const attrs = args?.find((arg) => !isGL(arg)) ?? {}

    // Accept props as args
    const propAttrs = Object.entries(props || {}).reduce((acc, [key, value]) => {
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
 * Switches instance to a new one, moving over children.
 */
export const switchInstance = (instance: Instance, type: string, props: InstanceProps, root: RootState) => {
  // Create a new instance
  const newInstance = createInstance(type, props, root)

  // Move children to new instance
  if (!instance.isPrimitive && instance.children) {
    instance.children.forEach((child) => appendChild(newInstance, child))
    instance.children = []
  }

  if (instance.__attached) {
    Object.values(instance.__attached).forEach((attach) => appendChild(newInstance, attach))
  }

  const parent = instance.parent
  // Replace instance in scene-graph
  removeChild(parent, instance)
  appendChild(parent, newInstance)

  return newInstance
}

/**
 * Adds elements to our scene and attaches children to their parents.
 */
export const appendChild = (parentInstance: Instance, child: Instance) => {
  if (!child) return

  // Attach material, geometry, fog, etc.
  if (child.attach) {
    parentInstance[child.attach] = child
    parentInstance.__attached = parentInstance.__attached || {}
    parentInstance.__attached[child.attach] = child
  } else {
    child.setParent?.(parentInstance)
  }

  child.parent = parentInstance
}

/**
 * Removes elements from scene and disposes of them.
 */
export const removeChild = (parentInstance: Instance, child: Instance) => {
  if (!child) return

  // Remove material, geometry, fog, etc
  if (!child.attach && child.setParent) {
    parentInstance?.removeChild?.(child)
  }

  if (parentInstance?.__attached?.[child.attach]) {
    delete parentInstance.__attached[child.attach]
    parentInstance[child.attach] = null
  }

  if (child.dispose) return child.dispose()
  if (child.remove) return child.remove()
  // TODO: handle dispose
}

/**
 * Gets the root store and container from a target container and child instance.
 */
export const getContainer = (
  container: RootState | Instance,
  child: Instance,
): { root: RootState; container: Instance } => ({
  root: container?.scene ? container : container?.rootNode ?? child.rootNode,
  container: container?.scene || container,
})

/**
 * Inserts an instance between instances of a ReactNode.
 */
export const insertBefore = (parentInstance: Instance, child: Instance, beforeChild: Instance) => {
  if (!child) return

  child.parent = parentInstance

  const index = parentInstance.children.indexOf(beforeChild)
  parentInstance.children = [...parentInstance.children.slice(0, index), child, ...parentInstance.children.slice(index)]
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
  // We can mutate elements once they're assembled into the scene graph here.
  // applyProps removes the need for this though
  finalizeInitialChildren: () => false,
  preparePortalMount: (container: any) => container,
  // This can modify the container and clear children.
  // Might be useful for disposing on demand later
  clearContainer: () => false,
  // This creates a OGL element from a React element
  createInstance,
  // These methods add elements to the scene
  appendChild,
  appendInitialChild: appendChild,
  // @ts-ignore
  appendChildToContainer(parentInstance: RootState | Instance, child: Instance) {
    const { root, container } = getContainer(parentInstance, child)

    // Update child's copy of local state
    child.stateNode = root

    // Add child to container
    appendChild(container, child)
  },
  // These methods remove elements from the scene
  removeChild,
  // @ts-ignore
  removeChildFromContainer(parentInstance: RootState | Instance, child: Instance) {
    const { container } = getContainer(parentInstance, child)
    removeChild(container, child)
  },
  // We can specify an order for children to be specified here.
  // This is useful if you want to override stuff like materials
  insertBefore,
  // @ts-ignore
  insertInContainerBefore(parentInstance: RootState | Instance, child: Instance, beforeChild: Instance) {
    const { container } = getContainer(parentInstance, child)
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
      const oldAttributes = Object.keys(oldProps).filter((key) => !key.startsWith('attributes-'))
      if (oldAttributes.some((key) => oldProps[key] !== newProps[key])) return [true]
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
    root: RootState,
  ) {
    // If flagged for recreation, swap to a new instance.
    if (reconstruct) return switchInstance(instance, type, newProps, root)

    // Otherwise, just apply changed props
    applyProps(instance, changedProps)
  },
  hideInstance(instance: Instance) {
    instance.visible = false
  },
  unhideInstance(instance: Instance) {
    instance.visible = true
  },
})

// Injects renderer meta into devtools.
reconciler.injectIntoDevTools({
  bundleType: process.env.NODE_ENV === 'production' ? 0 : 1,
  rendererPackageName: 'react-ogl',
  version: '17.0.2',
})
