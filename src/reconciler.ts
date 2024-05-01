import Reconciler from 'react-reconciler'
// @ts-ignore
import { NoEventPriority, DefaultEventPriority } from 'react-reconciler/constants.js'
import { unstable_IdlePriority as idlePriority, unstable_scheduleCallback as scheduleCallback } from 'scheduler'
import * as OGL from 'ogl'
import * as React from 'react'
import { toPascalCase, applyProps, attach, detach, classExtends, prepare } from './utils'
import { RESERVED_PROPS } from './constants'
import { Act, Catalogue, ConstructorRepresentation, Instance, OGLElements, RootStore } from './types'

// Custom objects that extend the OGL namespace
const catalogue = { ...OGL } as unknown as Catalogue

// Effectful catalogue elements that require a `WebGLRenderingContext`.
const catalogueGL: ConstructorRepresentation[] = [
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
  OGL.AxesHelper,
  OGL.GridHelper,
  OGL.WireMesh,
]

/**
 * Extends the OGL catalogue, accepting an object of keys pointing to external classes.
 * `gl` will flag `objects` to receive a `WebGLRenderingContext` on creation.
 */
export function extend(objects: Partial<Catalogue>, gl = false) {
  for (const key in objects) {
    const value = objects[key as keyof Catalogue]!
    catalogue[key as keyof Catalogue] = value
    if (gl) catalogueGL.push(value)
  }
}

// https://github.com/facebook/react/issues/20271
// This will make sure events and attach are only handled once when trees are complete
function handleContainerEffects(parent: Instance, child: Instance) {
  // Bail if tree isn't mounted or parent is not a container.
  // This ensures that the tree is finalized and React won't discard results to Suspense
  const state = child.root.getState()
  if (!parent.parent && parent.object !== state.scene) return

  // Create instance object
  if (child.type !== 'primitive') {
    const name = toPascalCase(child.type) as keyof Catalogue
    const target = catalogue[name]
    const { args = [], ...props } = child.props

    // Pass internal state to elements which depend on it.
    // This lets them be immutable upon creation and use props
    const isGLInstance = Object.values(catalogueGL).some((elem) => classExtends(elem, target))
    if (isGLInstance) {
      const { gl } = child.root.getState()
      const filtered = args.filter((arg) => arg !== gl)

      // Accept props as args for programs & geometry
      if (child.type === 'program' || child.type === 'geometry') {
        const attrs = Object.entries(props).reduce((acc, [key, value]) => {
          // Don't include non-attributes for geometry
          if (child.type === 'geometry' && !(value as OGL.Attribute)?.data) return acc
          // Include non-pierced props
          if (!key.includes('-')) acc[key] = value
          return acc
        }, filtered[0] ?? {})

        child.object = new target(gl, attrs)
      } else {
        child.object = new target(gl, ...filtered)
      }
    } else {
      child.object = new target(...args)
    }
  }

  // Link instance handle
  child.object.__ogl = child

  // Auto-attach geometry and programs to meshes
  if (!child.props.attach) {
    if (child.object instanceof OGL.Geometry) child.props.attach = 'geometry'
    else if (child.object instanceof OGL.Program) child.props.attach = 'program'
  }

  // Apply props to OGL object
  applyProps(child.object, child.props)

  // Handle attach
  if (child.props.attach) {
    attach(parent, child)
  } else if (child.object instanceof OGL.Transform && parent.object instanceof OGL.Transform) {
    child.object.setParent(parent.object)
  }

  // Link subtree
  for (const childInstance of child.children) handleContainerEffects(child, childInstance)
}

/**
 * Creates an OGL element from a React node.
 */
function createInstance(type: keyof OGLElements, props: Instance['props'], root: RootStore) {
  // Convert lowercase primitive to PascalCase
  const name = toPascalCase(type) as keyof Catalogue

  // Get class from extended OGL catalogue
  const target = catalogue[name]

  // Validate OGL elements
  if (type !== 'primitive' && !target) throw `${type} is not a part of the OGL catalogue! Did you forget to extend?`

  // Validate primitives
  if (type === 'primitive' && !props.object) throw `"object" must be set when using primitives.`

  // Create instance
  const instance = prepare(props.object, root, type, props)

  return instance
}

/**
 * Adds elements to our scene and attaches children to their parents.
 */
const appendChild = (parent: Instance, child: Instance) => {
  // Link instances
  child.parent = parent
  parent.children.push(child)

  // Attach tree once complete
  handleContainerEffects(parent, child)
}

/**
 * Removes elements from scene and disposes of them.
 */
function removeChild(parent: Instance, child: Instance, dispose?: boolean, recursive?: boolean) {
  // Unlink instances
  child.parent = null
  if (recursive === undefined) {
    const childIndex = parent.children.indexOf(child)
    if (childIndex !== -1) parent.children.splice(childIndex, 1)
  }

  // Remove instance objects
  if (child.props.attach) {
    detach(parent, child)
  } else if (parent.object instanceof OGL.Transform && child.object instanceof OGL.Transform) {
    parent.object.removeChild(child.object)
  }

  // Allow objects to bail out of unmount disposal with dispose={null}
  const shouldDispose = child.props.dispose !== null && dispose !== false

  // Recursively remove instance children
  if (recursive !== false) {
    for (const node of child.children) removeChild(child, node, shouldDispose, true)
    child.children = []
  }

  // Dispose if able
  if (shouldDispose) {
    const object = child.object
    scheduleCallback(idlePriority, () => object.dispose?.())
    delete child.object.__ogl
    child.object = null
  }
}

/**
 * Inserts an instance between instances of a ReactNode.
 */
function insertBefore(parent: Instance, child: Instance, beforeChild: Instance, replace = false) {
  if (!child) return

  // Link instances
  child.parent = parent
  const childIndex = parent.children.indexOf(beforeChild)
  if (childIndex !== -1) parent.children.splice(childIndex, replace ? 1 : 0, child)
  if (replace) beforeChild.parent = null

  // Attach tree once complete
  handleContainerEffects(parent, child)
}

/**
 * Switches instance to a new one, moving over children.
 */
function switchInstance(
  oldInstance: Instance,
  type: keyof OGLElements,
  props: Instance['props'],
  fiber: Reconciler.Fiber,
) {
  // React 19 regression from (un)hide hooks
  oldInstance.object.visible = true

  // Create a new instance
  const newInstance = createInstance(type, props, oldInstance.root)

  // Move children to new instance
  for (const child of oldInstance.children) {
    removeChild(oldInstance, child, false, false)
    appendChild(newInstance, child)
  }
  oldInstance.children = []

  // Link up new instance
  const parent = oldInstance.parent
  if (parent) {
    insertBefore(parent, newInstance, oldInstance, true)
  }

  // Switches the react-internal fiber node
  // https://github.com/facebook/react/issues/14983
  ;[fiber, fiber.alternate].forEach((fiber) => {
    if (fiber !== null) {
      fiber.stateNode = newInstance
      if (fiber.ref) {
        if (typeof fiber.ref === 'function') fiber.ref(newInstance.object)
        else fiber.ref.current = newInstance.object
      }
    }
  })

  return newInstance
}

/**
 * Shallow checks objects.
 */
function checkShallow(a: any, b: any) {
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
function diffProps<T extends ConstructorRepresentation = any>(
  instance: Instance<T>,
  newProps: Instance<T>['props'],
  oldProps: Instance<T>['props'],
): Instance<T>['props'] {
  const changedProps: Instance<T>['props'] = {}

  // Sort through props
  for (const key in newProps) {
    // Skip reserved keys
    if (RESERVED_PROPS.includes(key as typeof RESERVED_PROPS[number])) continue
    // Skip primitives
    if (instance.type === 'primitive' && key === 'object') continue
    // Skip if props match
    if (checkShallow(newProps[key], oldProps[key])) continue

    // Props changed, add them
    changedProps[key] = newProps[key]
  }

  return changedProps
}

const NO_CONTEXT = {}

let currentUpdatePriority: number = NoEventPriority

/**
 * Centralizes and handles mutations through an OGL scene-graph.
 */
export const reconciler = Reconciler<
  // Instance type
  keyof OGLElements,
  // Instance props
  Instance['props'],
  // Root Store
  RootStore,
  // Normal instance
  Instance,
  // Text instance
  never,
  // Suspense instance
  Instance,
  // Hydratable instance
  never,
  // Public (ref) instance
  Instance['object'],
  // Host context
  {},
  // applyProps diff sets
  null | [true] | [false, Instance['props']],
  // Hydration child set
  never,
  // Timeout id handle
  typeof setTimeout | undefined,
  // NoTimeout
  -1
>({
  // Configure renderer for tree-like mutation and interop w/react-dom
  isPrimaryRenderer: false,
  supportsMutation: true,
  supportsHydration: false,
  supportsPersistence: false,
  // Add SSR time fallbacks
  scheduleTimeout: () => (typeof setTimeout !== 'undefined' ? setTimeout : undefined),
  cancelTimeout: () => (typeof clearTimeout !== 'undefined' ? clearTimeout : undefined),
  noTimeout: -1,
  // Text isn't supported so we skip it
  shouldSetTextContent: () => false,
  resetTextContent: () => {},
  createTextInstance() {
    throw new Error('Text is not allowed in the OGL scene-graph!')
  },
  hideTextInstance() {
    throw new Error('Text is not allowed in the OGL scene-graph!')
  },
  unhideTextInstance: () => {},
  // Modifies the ref to return the instance object itself.
  getPublicInstance: (instance) => instance.object,
  // We can optionally access different host contexts on instance creation/update.
  // Instances' data structures are self-sufficient, so we don't make use of this
  getRootHostContext: () => NO_CONTEXT,
  getChildHostContext: () => NO_CONTEXT,
  // We can optionally mutate portal containers here, but we do that in createPortal instead from state
  preparePortalMount: (container) => prepare(container.getState().scene, container, '', {}),
  // This lets us store stuff at the container-level before/after React mutates our OGL elements.
  // Elements are mutated in isolation, so we don't do anything here.
  prepareForCommit: () => null,
  resetAfterCommit: () => {},
  // This can modify the container and clear children.
  // Might be useful for disposing on demand later
  clearContainer: () => false,
  // This creates a OGL element from a React element
  createInstance,
  // These methods add elements to the scene
  appendChild,
  appendInitialChild: appendChild,
  appendChildToContainer(container, child) {
    const scene = (container.getState().scene as unknown as Instance<OGL.Transform>['object']).__ogl
    if (!child || !scene) return

    appendChild(scene, child)
  },
  // We can specify an order for children to be inserted here.
  // This is useful if you want to override stuff like materials
  insertBefore,
  insertInContainerBefore(container, child, beforeChild) {
    const scene = (container.getState().scene as unknown as Instance<OGL.Transform>['object']).__ogl
    if (!child || !beforeChild || !scene) return

    insertBefore(scene, child, beforeChild)
  },
  // These methods remove elements from the scene
  removeChild,
  removeChildFromContainer(container, child) {
    const scene = (container.getState().scene as unknown as Instance<OGL.Transform>['object']).__ogl
    if (!child || !scene) return

    removeChild(scene, child)
  },
  // This is where we mutate OGL elements in the render phase
  // @ts-ignore
  commitUpdate(instance: Instance, type: Type, oldProps: Instance['props'], newProps: Instance['props'], fiber: any) {
    let reconstruct = false

    // Element is a primitive. We must recreate it when its object prop is changed
    if (instance.type === 'primitive' && oldProps.object !== newProps.object) reconstruct = true
    // Element is a program. Check whether its vertex or fragment props changed to recreate
    else if (type === 'program') {
      if (oldProps.vertex !== newProps.vertex) reconstruct = true
      if (oldProps.fragment !== newProps.fragment) reconstruct = true
    }
    // Element is a geometry. Check whether its attribute props changed to recreate.
    else if (type === 'geometry') {
      for (const key in oldProps) {
        const isAttribute = (oldProps[key] as OGL.Attribute)?.data || (newProps[key] as OGL.Attribute)?.data
        if (isAttribute && oldProps[key] !== newProps[key]) {
          reconstruct = true
          break
        }
      }
    }
    // If the instance has new args, recreate it
    else if (newProps.args?.length !== oldProps.args?.length) reconstruct = true
    else if (newProps.args?.some((value, index) => value !== oldProps.args?.[index])) reconstruct = true

    // If flagged for recreation, swap to a new instance.
    if (reconstruct) return switchInstance(instance, type, newProps, fiber)

    // Diff through props and flag with changes
    const changedProps = diffProps(instance, newProps, oldProps)
    if (Object.keys(changedProps).length) {
      // Handle attach update
      if (changedProps?.attach) {
        if (oldProps.attach) detach(instance.parent!, instance)
        instance.props.attach = newProps.attach
        if (newProps.attach) attach(instance.parent!, instance)
      }

      // Update instance props
      Object.assign(instance.props, changedProps)
      // Apply changed props
      applyProps(instance.object, changedProps)
    }
  },
  // Methods to toggle instance visibility on demand.
  // React uses this with React.Suspense to display fallback content
  hideInstance(instance) {
    if (instance.object instanceof OGL.Transform) {
      instance.object.visible = false
    }

    instance.isHidden = true
  },
  unhideInstance(instance) {
    if (instance.isHidden && instance.object instanceof OGL.Transform && instance.props.visible !== false) {
      instance.object.visible = true
    }

    instance.isHidden = false
  },
  // Configures a callback once the tree is finalized after commit-effects are fired
  finalizeInitialChildren: () => false,
  commitMount() {},
  beforeActiveInstanceBlur: () => {},
  afterActiveInstanceBlur: () => {},
  detachDeletedInstance: () => {},
  prepareScopeUpdate() {},
  getInstanceFromScope: () => null,
  // @ts-ignore untyped react-experimental options inspired by react-art
  // TODO: add shell types for these and upstream to DefinitelyTyped
  // https://github.com/facebook/react/blob/main/packages/react-art/src/ReactFiberConfigART.js
  setCurrentUpdatePriority(newPriority) {
    currentUpdatePriority = newPriority
  },
  getCurrentUpdatePriority() {
    return currentUpdatePriority
  },
  resolveUpdatePriority() {
    return currentUpdatePriority || DefaultEventPriority
  },
  shouldAttemptEagerTransition() {
    return false
  },
  requestPostPaintCallback() {},
  maySuspendCommit() {
    return false
  },
  preloadInstance() {
    return true // true indicates already loaded
  },
  startSuspendingCommit() {},
  suspendInstance() {},
  waitForCommitToBeReady() {
    return null
  },
  NotPendingTransition: null,
  resetFormInstance() {},
})

/**
 * Safely flush async effects when testing, simulating a legacy root.
 */
export const act: Act = (React as any).act

// Inject renderer meta into devtools
const isProd = typeof process === 'undefined' || process.env?.['NODE_ENV'] === 'production'
reconciler.injectIntoDevTools({
  findFiberByHostInstance: () => null,
  bundleType: isProd ? 0 : 1,
  version: React.version,
  rendererPackageName: 'react-ogl',
})
