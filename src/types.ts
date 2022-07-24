/// <reference types="webxr" />
import type { Fiber as ReconcilerFiber } from 'react-reconciler'
import type * as OGL from 'ogl'
import type * as React from 'react'
import type { SetState, GetState, UseBoundStore, StoreApi } from 'zustand'
import type { RENDER_MODES } from './constants'

export interface OGLEvent<TEvent extends Event> extends Partial<OGL.RaycastHit> {
  nativeEvent: TEvent
}

export interface EventHandlers {
  /** Fired when the mesh is clicked or tapped. */
  onClick?: (event: OGLEvent<MouseEvent>) => void
  /** Fired when a pointer becomes inactive over the mesh. */
  onPointerUp?: (event: OGLEvent<PointerEvent>) => void
  /** Fired when a pointer becomes active over the mesh. */
  onPointerDown?: (event: OGLEvent<PointerEvent>) => void
  /** Fired when a pointer moves over the mesh. */
  onPointerMove?: (event: OGLEvent<PointerEvent>) => void
  /** Fired when a pointer enters the mesh's bounds. */
  onPointerOver?: (event: OGLEvent<PointerEvent>) => void
  /** Fired when a pointer leaves the mesh's bounds. */
  onPointerOut?: (event: OGLEvent<PointerEvent>) => void
}

export type Attach = string | ((parent: any, self: any) => () => void)

export type Fiber = RootStore & ReconcilerFiber

export type Catalogue = Record<Capitalize<keyof OGLElements>, { new (...args: any): any }>

export type InstanceProps = {
  [key: string]: unknown
} & {
  /** Used to instantiate the underlying OGL object. Changing `args` will reconstruct the object and update any associated refs */
  args?: any[]
  /** An external OGL object to attach this element to */
  object?: any
  /** Describes how to attach this element via a property or set of add & remove callbacks */
  attach?: Attach
  /** Optionally opt-out of disposal with `dispose={null}` */
  dispose?: null
}

/**
 * Internal react-ogl instance.
 */
export interface Instance {
  root: Fiber
  parent: Instance | null
  children: Instance[]
  type: keyof OGLElements
  props: InstanceProps
  object: any | null
}

export interface XRManager {
  session: XRSession | null
  setSession(session: XRSession | null): void
  connect(session: XRSession): void
  disconnect(): void
}

export interface EventManager {
  connected: boolean
  connect: (target: HTMLCanvasElement, state: RootState) => void
  disconnect: (target: HTMLCanvasElement, state: RootState) => void
  [name: string]: any
}

export interface Size {
  width: number
  height: number
}

export type Frameloop = 'always' | 'never'

export type Subscription = (state: RootState, time: number, frame?: XRFrame) => any

export type Interactive = OGL.Mesh & { __handlers?: Partial<EventHandlers> }

export interface RootState {
  set: SetState<RootState>
  get: GetState<RootState>
  size: Size
  xr: XRManager
  orthographic: boolean
  frameloop: Frameloop
  renderer: OGL.Renderer
  gl: OGL.OGLRenderingContext
  scene: OGL.Transform
  camera: OGL.Camera
  priority: number
  subscribed: React.MutableRefObject<Subscription>[]
  subscribe: (refCallback: React.MutableRefObject<Subscription>, renderPriority?: number) => void
  unsubscribe: (refCallback: React.MutableRefObject<Subscription>, renderPriority?: number) => void
  events?: EventManager
  mouse?: OGL.Vec2
  raycaster?: OGL.Raycast
  hovered?: Map<number, Interactive>
  [key: string]: any
}

export type RootStore = UseBoundStore<RootState, StoreApi<RootState>>

export interface Root {
  render: (element: React.ReactNode) => RootStore
  unmount: () => void
}

export type DPR = [number, number] | number

export type RenderProps = {
  size?: Size
  orthographic?: boolean
  frameloop?: Frameloop
  renderer?:
    | ((canvas: HTMLCanvasElement) => OGL.Renderer)
    | OGL.Renderer
    | WithOGLProps<OGL.Renderer>
    | Partial<OGL.RendererOptions>
  gl?: OGL.OGLRenderingContext
  dpr?: DPR
  camera?: OGL.Camera | WithOGLProps<OGL.Camera> | Partial<OGL.CameraOptions>
  scene?: OGL.Transform
  events?: EventManager
  onCreated?: (state: RootState) => any
  mode?: keyof typeof RENDER_MODES
}

type NonFunctionKeys<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]
type Filter<T, O> = T extends []
  ? []
  : T extends [infer H, ...infer R]
  ? H extends O
    ? Filter<R, O>
    : [H, ...Filter<R, O>]
  : T
type Args<T> = T extends new (...args: any) => any ? ConstructorParameters<T> : never

type ColorNames = 'black' | 'white' | 'red' | 'green' | 'blue' | 'fuchsia' | 'cyan' | 'yellow' | 'orange'
type UniformValue = ColorNames | number | number[] | OGL.Texture | OGL.Texture[]
type UniformRepresentation = UniformValue | { [structName: string]: UniformValue }
type UniformList = {
  [uniform: string]: UniformRepresentation | { value: UniformRepresentation }
}

interface MathRepresentation extends Array<number> {
  set(...args: any): any
}
type MathProps<T extends MathRepresentation> = T | Parameters<T['set']> | number
type WithMathProps<T> = { [K in keyof T]: T[K] extends MathRepresentation ? MathProps<T[K]> : T[K] }
type WithProgramProps<T> = T extends OGL.Program
  ? Omit<T, 'vertex' | 'fragment' | 'uniforms'> & {
      vertex?: string
      fragment?: string
      uniforms?: UniformList
    }
  : T
type WithGeometryProps<T> = T extends OGL.Geometry
  ? T & {
      [name: string]: Partial<Omit<OGL.Attribute, 'data'>> & Required<Pick<OGL.Attribute, 'data'>>
    }
  : T
export type WithOGLProps<T, O = {}> = Partial<
  WithGeometryProps<WithProgramProps<WithMathProps<Omit<T, NonFunctionKeys<O>>>>>
> &
  O

export type Node<T, P> = WithOGLProps<
  T,
  {
    args?: Filter<Args<P>, OGL.OGLRenderingContext>
    dispose?: null
    attach?: Attach
    children?: React.ReactNode
    ref?: React.Ref<T>
    key?: React.Key
  } & (T extends OGL.Mesh ? Partial<EventHandlers> : {})
>

export interface OGLElements {
  // primitive
  primitive: Omit<Node<{}, {}>, 'args'> & { object: any }

  // Core
  geometry: Node<OGL.Geometry, typeof OGL.Geometry>
  program: Node<OGL.Program, typeof OGL.Program>
  renderer: Node<OGL.Renderer, typeof OGL.Renderer>
  camera: Node<OGL.Camera, typeof OGL.Camera>
  transform: Node<OGL.Transform, typeof OGL.Transform>
  mesh: Node<OGL.Mesh, typeof OGL.Mesh>
  texture: Node<OGL.Texture, typeof OGL.Texture>
  renderTarget: Node<OGL.RenderTarget, typeof OGL.RenderTarget>

  // Math
  color: Node<OGL.Color, typeof OGL.Color>
  euler: Node<OGL.Euler, typeof OGL.Euler>
  mat3: Node<OGL.Mat3, typeof OGL.Mat3>
  mat4: Node<OGL.Mat4, typeof OGL.Mat4>
  quat: Node<OGL.Quat, typeof OGL.Quat>
  vec2: Node<OGL.Vec2, typeof OGL.Vec2>
  vec3: Node<OGL.Vec3, typeof OGL.Vec3>
  vec4: Node<OGL.Vec4, typeof OGL.Vec4>

  // Extra
  plane: Node<OGL.Plane, typeof OGL.Plane>
  box: Node<OGL.Box, typeof OGL.Box>
  sphere: Node<OGL.Sphere, typeof OGL.Sphere>
  cylinder: Node<OGL.Cylinder, typeof OGL.Cylinder>
  triangle: Node<OGL.Triangle, typeof OGL.Triangle>
  torus: Node<OGL.Torus, typeof OGL.Torus>
  orbit: Node<OGL.Orbit, typeof OGL.Orbit>
  raycast: Node<OGL.Raycast, typeof OGL.Raycast>
  curve: Node<OGL.Curve, typeof OGL.Curve>
  post: Node<OGL.Post, typeof OGL.Post>
  skin: Node<OGL.Skin, typeof OGL.Skin>
  animation: Node<OGL.Animation, typeof OGL.Animation>
  text: Node<OGL.Text, typeof OGL.Text>
  normalProgram: Node<OGL.Program, typeof OGL.Program>
  flowmap: Node<OGL.Flowmap, typeof OGL.Flowmap>
  gPGPU: Node<OGL.GPGPU, typeof OGL.GPGPU>
  polyline: Node<OGL.Polyline, typeof OGL.Polyline>
  shadow: Node<OGL.Shadow, typeof OGL.Shadow>
  kTXTexture: Node<OGL.KTXTexture, typeof OGL.KTXTexture>
  textureLoader: Node<OGL.TextureLoader, typeof OGL.TextureLoader>
  gLTFLoader: Node<OGL.GLTFLoader, typeof OGL.GLTFLoader>
  gLTFSkin: Node<OGL.GLTFSkin, typeof OGL.GLTFSkin>
  basisManager: Node<OGL.BasisManager, typeof OGL.BasisManager>
  axesHelper: Node<OGL.AxesHelper, typeof OGL.AxesHelper>
  faceNormalsHelper: Node<OGL.FaceNormalsHelper, typeof OGL.FaceNormalsHelper>
  gridHelper: Node<OGL.GridHelper, typeof OGL.GridHelper>
  vertexNormalsHelper: Node<OGL.VertexNormalsHelper, typeof OGL.VertexNormalsHelper>
  wireMesh: Node<OGL.WireMesh, typeof OGL.WireMesh>
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends OGLElements {}
  }
}
