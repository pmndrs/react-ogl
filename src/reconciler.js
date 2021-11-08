import createReconciler from 'react-reconciler'
import * as OGL from 'ogl'
import { toPascalCase, applyProps, diffProps } from './utils'
import { GL_ELEMENTS } from './constants'

// Custom objects that extend the OGL namespace
const catalogue = {}

/**
 * Extends the OGL namespace, accepting an object of keys pointing to external classes.
 */
export const extend = (objects) =>
  Object.entries(objects).forEach(([key, value]) => (catalogue[key] = value))

/**
 * Creates an OGL element from a React node.
 */
export const createInstance = (type, { object, args, ...props }, root) => {
  // Convert lowercase primitive to PascalCase
  const name = toPascalCase(type)

  // Get class from extended OGL namespace
  const target = catalogue[name] || OGL[name]

  // Validate OGL elements
  if (type !== 'primitive' && !target)
    throw `${type} is not a part of the OGL namespace! Did you forget to extend?`

  // Validate primitives
  if (type === 'primitive' && !object) throw `"object" must be set when using primitives.`

  // Accept shader props as args for Programs
  if (type === 'program' && !args?.[1]) {
    args = {
      vertex: props?.vertex,
      fragment: props?.fragment,
      ...args,
    }
  }

  // Accept attribute props as args for Geometries
  if (type === 'geometry' && !args?.[1]) {
    const attributes = Object.entries(props || {}).reduce((acc, [key, prop]) => {
      if (prop.data && typeof prop.size === 'number') acc[key] = prop
      return acc
    }, {})

    args = {
      ...attributes,
      ...args,
    }
  }

  // Pass internal state to elements which depend on it.
  // This lets them be immutable upon creation and use props
  if (
    GL_ELEMENTS.some(
      (elem) => Object.prototype.isPrototypeOf.call(elem, target) || elem === target,
    )
  ) {
    const { gl } = root.stateNode
    args = Array.isArray(args) ? [gl, ...args] : [gl, args]
  }

  // Create instance
  const instance =
    object || (Array.isArray(args) ? new target(...args) : new target(args))

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
export const switchInstance = (instance, type, props, root) => {
  // Create a new instance
  const newInstance = createInstance(type, props, root)

  // Move children to new instance
  if (!instance.isPrimitive && instance.children) {
    instance.children.forEach((child) => appendChild(newInstance, child))
    instance.children = []
  }

  // Replace instance in scene-graph
  removeChild(instance.parent, instance)
  appendChild(instance.parent, newInstance)

  return newInstance
}

/**
 * Adds elements to our scene and attaches children to their parents.
 */
export const appendChild = (parentInstance, child) => {
  if (!child) return

  // Attach material, geometry, fog, etc.
  if (child.attach) {
    parentInstance[child.attach] = child
    child.parent = parentInstance
  } else {
    child.setParent(parentInstance)
  }
}

/**
 * Removes elements from scene and disposes of them.
 */
export const removeChild = (parentInstance, child) => {
  if (!child) return

  // Remove material, geometry, fog, etc
  if (!child.attach) {
    child.parent.removeChild(child)
  }

  // TODO: handle dispose
}

/**
 * Centralizes and handles mutations through an OGL scene-graph.
 */
export const reconciler = createReconciler({
  // OGL elements can be updated, so we inform the renderer
  supportsMutation: true,
  // We set this to false because this can work on top of react-dom
  isPrimaryRenderer: false,
  // We can modify the ref here, but we return it instead (no-op)
  getPublicInstance: (instance) => instance,
  // This object that's passed into the reconciler is the host context.
  // We don't need to expose it though
  getRootHostContext: () => ({}),
  getChildHostContext: () => ({}),
  // Text isn't supported so we skip it
  createTextInstance: () => console.warn('Text is not allowed in the OGL scene-graph!'),
  // This lets us store stuff before React mutates our OGL elements.
  // We don't do anything here but return an empty object
  prepareForCommit: () => ({}),
  resetAfterCommit: () => ({}),
  // OGL elements don't have textContent, so we skip this
  shouldSetTextContent: () => false,
  // We can mutate elements once they're assembled into the scene graph here.
  // applyProps removes the need for this though
  finalizeInitialChildren: () => false,
  // This can modify the container and clear children.
  // Might be useful for disposing on demand later
  clearContainer: () => false,
  // This creates a OGL element from a React element
  createInstance,
  // These methods add elements to the scene
  appendChild,
  appendInitialChild: appendChild,
  appendChildToContainer: appendChild,
  // These methods remove elements from the scene
  removeChild,
  removeChildFromContainer: removeChild,
  // We can specify an order for children to be specified here.
  // This is useful if you want to override stuff like materials
  insertBefore(parentInstance, child, beforeChild) {
    if (!child) return

    child.parent = parentInstance

    const index = parentInstance.children.indexOf(beforeChild)
    parentInstance.children = [
      ...parentInstance.children.slice(0, index),
      child,
      ...parentInstance.children.slice(index),
    ]
  },
  // Used to calculate updates in the render phase or commitUpdate.
  // Greatly improves performance by reducing paint to rapid mutations.
  // Returns [shouldReconstruct: boolean, changedProps]
  prepareUpdate(instance, type, oldProps, newProps) {
    // Element is a primitive. We must recreate it when its object prop is changed
    if (instance.isPrimitive && newProps.object && newProps.object !== instance)
      return [true]

    // Element is a program. Check whether its vertex or fragment props changed to recreate
    if (type === 'program') {
      if (oldProps.vertex !== newProps.vertex) return [true]
      if (oldProps.fragment !== newProps.fragment) return [true]
      if (oldProps.uniforms !== newProps.uniform) return [true]
    }

    // Element is a geometry. Check whether its attribute props changed to recreate.
    if (type === 'geometry') {
      const oldAttributes = Object.keys(oldProps).filter(
        (key) => oldProps[key].data && typeof oldProps[key].size === 'number',
      )
      if (oldAttributes.some((key) => oldProps[key] !== newProps[key])) return [true]
    }

    // If the instance has new props or arguments, recreate it
    if (newProps.args?.some((value, index) => value !== oldProps.args[index]))
      return [true]

    // Diff through props and flag with changes
    const changedProps = diffProps(instance, newProps, oldProps)
    if (changedProps.length) return [false, changedProps]

    // No changes, don't update the instance
    return null
  },
  // This is where we mutate OGL elements in the render phase
  commitUpdate(instance, [reconstruct, changedProps], type, oldProps, newProps, root) {
    // If flagged for recreation, swap to a new instance.
    if (reconstruct) return switchInstance(instance, type, newProps, root)

    // Otherwise, just apply changed props
    applyProps(instance, changedProps)
  },
})

// Injects renderer meta into devtools.
reconciler.injectIntoDevTools({
  bundleType: process.env.NODE_ENV === 'production' ? 0 : 1,
  rendererPackageName: 'react-ogl',
  version: '0.1.0',
})

/**
 * Portals into a remote OGL element.
 */
export const createPortal = (children, target) =>
  reconciler.createPortal(children, target, null, null)
