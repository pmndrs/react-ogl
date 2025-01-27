import Reconciler from 'react-reconciler'
import {
  // NoEventPriority,
  ContinuousEventPriority,
  DiscreteEventPriority,
  DefaultEventPriority,
} from 'react-reconciler/constants.js'
import { unstable_IdlePriority as idlePriority, unstable_scheduleCallback as scheduleCallback } from 'scheduler'
import * as OGL from 'ogl'
import * as React from 'react'
import { toPascalCase, applyProps, attach, detach, classExtends, prepare } from './utils'
import { RESERVED_PROPS } from './constants'
import { Act, Catalogue, ConstructorRepresentation, Instance, OGLElements, RootStore } from './types'

// @ts-ignore
const __DEV__ = /* @__PURE__ */ (() => typeof process !== 'undefined' && process.env.NODE_ENV !== 'production')()

// TODO: upstream to DefinitelyTyped for React 19
// https://github.com/facebook/react/issues/28956
type EventPriority = number

function createReconciler<
  Type,
  Props,
  Container,
  Instance,
  TextInstance,
  SuspenseInstance,
  HydratableInstance,
  FormInstance,
  PublicInstance,
  HostContext,
  ChildSet,
  TimeoutHandle,
  NoTimeout,
  TransitionStatus,
>(
  config: Omit<
    Reconciler.HostConfig<
      Type,
      Props,
      Container,
      Instance,
      TextInstance,
      SuspenseInstance,
      HydratableInstance,
      PublicInstance,
      HostContext,
      null, // updatePayload
      ChildSet,
      TimeoutHandle,
      NoTimeout
    >,
    'getCurrentEventPriority' | 'prepareUpdate' | 'commitUpdate'
  > & {
    /**
     * This method should mutate the `instance` and perform prop diffing if needed.
     *
     * The `internalHandle` data structure is meant to be opaque. If you bend the rules and rely on its internal fields, be aware that it may change significantly between versions. You're taking on additional maintenance risk by reading from it, and giving up all guarantees if you write something to it.
     */
    commitUpdate?(
      instance: Instance,
      type: Type,
      prevProps: Props,
      nextProps: Props,
      internalHandle: Reconciler.OpaqueHandle,
    ): void

    // Undocumented
    // https://github.com/facebook/react/pull/26722
    NotPendingTransition: TransitionStatus | null
    HostTransitionContext: React.Context<TransitionStatus>
    // https://github.com/facebook/react/pull/28751
    setCurrentUpdatePriority(newPriority: EventPriority): void
    getCurrentUpdatePriority(): EventPriority
    resolveUpdatePriority(): EventPriority
    // https://github.com/facebook/react/pull/28804
    resetFormInstance(form: FormInstance): void
    // https://github.com/facebook/react/pull/25105
    requestPostPaintCallback(callback: (time: number) => void): void
    // https://github.com/facebook/react/pull/26025
    shouldAttemptEagerTransition(): boolean
    // https://github.com/facebook/react/pull/31528
    trackSchedulerEvent(): void
    // https://github.com/facebook/react/pull/31008
    resolveEventType(): null | string
    resolveEventTimeStamp(): number

    /**
     * This method is called during render to determine if the Host Component type and props require some kind of loading process to complete before committing an update.
     */
    maySuspendCommit(type: Type, props: Props): boolean
    /**
     * This method may be called during render if the Host Component type and props might suspend a commit. It can be used to initiate any work that might shorten the duration of a suspended commit.
     */
    preloadInstance(type: Type, props: Props): boolean
    /**
     * This method is called just before the commit phase. Use it to set up any necessary state while any Host Components that might suspend this commit are evaluated to determine if the commit must be suspended.
     */
    startSuspendingCommit(): void
    /**
     * This method is called after `startSuspendingCommit` for each Host Component that indicated it might suspend a commit.
     */
    suspendInstance(type: Type, props: Props): void
    /**
     * This method is called after all `suspendInstance` calls are complete.
     *
     * Return `null` if the commit can happen immediately.
     *
     * Return `(initiateCommit: Function) => Function` if the commit must be suspended. The argument to this callback will initiate the commit when called. The return value is a cancellation function that the Reconciler can use to abort the commit.
     *
     */
    waitForCommitToBeReady(): ((initiateCommit: Function) => Function) | null
  },
): Reconciler.Reconciler<Container, Instance, TextInstance, SuspenseInstance, PublicInstance> {
  const reconciler = Reconciler(config as any)

  reconciler.injectIntoDevTools({
    bundleType: __DEV__ ? 1 : 0,
    rendererPackageName: 'react-ogl',
    version: React.version,
  })

  return reconciler as any
}

const NoEventPriority = 0

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
export const reconciler = /* @__PURE__ */ createReconciler<
  keyof OGLElements, // type
  Instance['props'], // props
  RootStore, // container
  Instance, // instance
  never, // text instance
  Instance, // suspense instance
  never, // hydratable instance
  never, // form instance
  Instance['object'], // public instance
  {}, // host context
  never, // child set
  typeof setTimeout | undefined, // timeout handle
  -1, // no timeout
  null // transition status
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
  // Undocumented
  getInstanceFromNode: () => null,
  beforeActiveInstanceBlur() {},
  afterActiveInstanceBlur() {},
  detachDeletedInstance() {},
  prepareScopeUpdate() {},
  getInstanceFromScope: () => null,
  shouldAttemptEagerTransition: () => false,
  trackSchedulerEvent: () => {},
  resolveEventType: () => null,
  resolveEventTimeStamp: () => -1.1,
  requestPostPaintCallback() {},
  maySuspendCommit: () => false,
  preloadInstance: () => true, // true indicates already loaded
  startSuspendingCommit() {},
  suspendInstance() {},
  waitForCommitToBeReady: () => null,
  NotPendingTransition: null,
  HostTransitionContext: /* @__PURE__ */ React.createContext(null),
  setCurrentUpdatePriority(newPriority: number) {
    currentUpdatePriority = newPriority
  },
  getCurrentUpdatePriority() {
    return currentUpdatePriority
  },
  resolveUpdatePriority() {
    if (currentUpdatePriority !== NoEventPriority) return currentUpdatePriority

    switch (typeof window !== 'undefined' && window.event?.type) {
      case 'click':
      case 'contextmenu':
      case 'dblclick':
      case 'pointercancel':
      case 'pointerdown':
      case 'pointerup':
        return DiscreteEventPriority
      case 'pointermove':
      case 'pointerout':
      case 'pointerover':
      case 'pointerenter':
      case 'pointerleave':
      case 'wheel':
        return ContinuousEventPriority
      default:
        return DefaultEventPriority
    }
  },
  resetFormInstance() {},
})
