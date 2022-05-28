import * as OGL from 'ogl'
import type { MutableRefObject } from 'react'
import { RENDER_MODES } from './constants'

// Util funcs
export type Args<T> = T extends new (...args: any) => any ? ConstructorParameters<T> : T
export type NonFunctionKeys<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]
export type Overwrite<T, O> = Omit<T, NonFunctionKeys<O>> & O
export type Filter<T, O> = T extends []
  ? []
  : T extends [infer H, ...infer R]
  ? H extends O
    ? Filter<R, O>
    : [H, ...Filter<R, O>]
  : T

/**
 * Internal suspense promise type.
 */
export type SetBlock = false | Promise<null> | null

/**
 * A map representation of a loader result.
 */
export type ObjectMap = {
  nodes: { [name: string]: OGL.Mesh }
  programs: { [name: string]: OGL.Program }
}

/**
 * Extended OGL namespace.
 */
export type Catalogue = { [key: string]: any }

/**
 * Base OGL React instance.
 */
export type BaseInstance = Omit<OGL.Transform, 'children' | 'attach'> & {
  isPrimitive?: boolean
  __handlers?: EventHandlers
  __attached?: Record<string, BaseInstance>
  children: Instance[]
  attach?: string
  remove?(): void
  dispose?(): void
}

/**
 * Extended OGL React instance.
 */
export type Instance = BaseInstance & { [key: string]: any }

/**
 * OGL.Transform React instance.
 */
export type InstanceProps = {
  [key: string]: unknown
} & {
  args?: any[]
  object?: object
  visible?: boolean
  dispose?: null
  attach?: string
}

/**
 * Base react-ogl events.
 */
export type Events = {
  onClick: EventListener
  onPointerUp: EventListener
  onPointerDown: EventListener
  onPointerMove: EventListener
}

export interface IHitResult {
  localPoint: OGL.Vec3
  point: OGL.Vec3
  distance: number

  faceNormal?: OGL.Vec3
  localFaceNormal?: OGL.Vec3
  localNormal?: OGL.Vec3
  normal?: OGL.Vec3

  uv?: OGL.Vec2
}

export interface IEventPair<T> {
  event: T
  hit?: IHitResult
}
/**
 * react-ogl event handlers.
 */
export type EventHandlers = {
  onClick?: (event: IEventPair<MouseEvent>) => void
  onPointerUp?: (event: IEventPair<PointerEvent>) => void
  onPointerDown?: (event: IEventPair<PointerEvent>) => void
  onPointerMove?: (event: IEventPair<PointerEvent>) => void
  onPointerOver?: (event: IEventPair<PointerEvent>) => void
  onPointerOut?: (event: IEventPair<PointerEvent>) => void
}

/**
 * react-ogl root.
 */
export interface Root {
  render: (element: React.ReactNode) => RootState
  unmount: () => void
}

/**
 * react-ogl event manager.
 */
export interface EventManager {
  connected: boolean
  handlers?: any
  connect?: (target: HTMLCanvasElement, state: RootState) => void
  disconnect?: (target: HTMLCanvasElement, state: RootState) => void
}

/**
 * useFrame subscription.
 */
export type Subscription = (state: RootState, time: number) => any

/**
 * react-ogl internal state.
 */
export interface RootState {
  renderer: OGL.Renderer
  gl: OGL.OGLRenderingContext
  scene: Omit<OGL.Transform, 'children'> & { children: any[] }
  camera: OGL.Camera
  priority: number
  subscribed: Subscription[]
  subscribe: (refCallback: MutableRefObject<Subscription>, renderPriority?: number) => void
  unsubscribe: (refCallback: MutableRefObject<Subscription>, renderPriority?: number) => void
  animation?: number
  events?: EventManager
  mouse?: OGL.Vec2
  raycaster?: OGL.Raycast
  hovered?: Map<number, OGL.Transform>
  [key: string]: any
}

/**
 * `fixed` | [`min`, `max`] — `min` and `max` are interpolated from native DPR.
 */
export type DPR = [number, number] | number

/**
 * Canvas & imperative render method props.
 */
export type RenderProps = {
  size?: { width: number; height: number }
  dpr?: DPR
  renderer?: (
    canvas: HTMLCanvasElement,
  ) => OGL.Renderer | OGL.Renderer | Partial<NonFunctionKeys<OGL.Renderer>> | Partial<OGL.RendererOptions>
  gl?: OGL.OGLRenderingContext
  frameloop?: 'always' | 'never'
  camera?: CameraProps | Partial<NonFunctionKeys<OGL.Camera>> | Partial<OGL.CameraOptions>
  orthographic?: boolean
  events?: EventManager
  onCreated?: (state: RootState) => any
  mode?: keyof typeof RENDER_MODES
}

// JSX types
export interface NodeProps<T> {
  /** Attaches this class onto the parent under the given name and nulls it on unmount */
  attach?: string
  /** Constructor arguments */
  args?: Filter<Args<T>, OGL.OGLRenderingContext>
  children?: React.ReactNode
  ref?: React.Ref<React.ReactNode | {}>
  key?: React.Key
}

export type Node<T, P> = Overwrite<Partial<T>, NodeProps<P>>

export type TransformNode<T, P> = Overwrite<
  Node<T, P>,
  {
    visible?: boolean
    matrix?: Mat4Props
    worldMatrix?: Mat4Props
    matrixAutoUpdate?: boolean
    worldMatrixNeedsUpdate?: boolean
    position?: Vec3Props
    scale?: Vec3Props
    up?: Vec3Props
    quaternion?: QuatProps
    rotation?: EulerProps
  }
> &
  EventHandlers

export type PrimitiveProps = { object: any } & { [properties: string]: any }

// Core
export type GeometryProps = Node<OGL.Geometry, typeof OGL.Geometry> & {
  [attributes: string]: { data: ArrayBufferView; size?: number }
}
export type ProgramProps = Omit<Node<OGL.Program, typeof OGL.Program>, 'uniforms'> & {
  vertex?: string
  fragment?: string
  uniforms?: { [uniform: string]: number[] | string | any }
}
export type RendererProps = Node<OGL.Renderer, typeof OGL.Renderer>
export type CameraProps = TransformNode<OGL.Camera, typeof OGL.Camera>
export type TransformProps = Node<OGL.Transform, typeof OGL.Transform>
export type MeshProps = TransformNode<OGL.Mesh, typeof OGL.Mesh>
export type TextureProps = Node<OGL.Texture, typeof OGL.Texture>
export type RenderTargetProps = Node<OGL.RenderTarget, typeof OGL.RenderTarget>

// Math
export type ColorProps = ConstructorParameters<typeof OGL.Color> | OGL.Color | number | string
export type EulerProps = OGL.Euler | Parameters<OGL.Euler['set']>
export type Mat3Props = OGL.Mat3 | Parameters<OGL.Mat3['set']>
export type Mat4Props = OGL.Mat4 | Parameters<OGL.Mat4['set']>
export type QuatProps = OGL.Quat | Parameters<OGL.Quat['set']>
export type Vec2Props = OGL.Vec2 | Parameters<OGL.Vec2['set']> | number
export type Vec3Props = OGL.Vec3 | Parameters<OGL.Vec3['set']> | number
export type Vec4Props = OGL.Vec4 | Parameters<OGL.Vec4['set']> | number

// Extras
export type PlaneProps = Node<OGL.Plane, typeof OGL.Plane>
export type BoxProps = Node<OGL.Box, typeof OGL.Box>
export type SphereProps = Node<OGL.Sphere, typeof OGL.Sphere>
export type CylinderProps = Node<OGL.Cylinder, typeof OGL.Cylinder>
export type TriangleProps = Node<OGL.Triangle, typeof OGL.Triangle>
export type TorusProps = Node<OGL.Torus, typeof OGL.Torus>
export type OrbitProps = Node<OGL.Orbit, typeof OGL.Orbit>
export type RaycastProps = Node<OGL.Raycast, typeof OGL.Raycast>
export type CurveProps = Node<OGL.Curve, typeof OGL.Curve>
export type PostProps = Node<OGL.Post, typeof OGL.Post>
export type SkinProps = TransformNode<OGL.Skin, typeof OGL.Skin>
export type AnimationProps = Node<OGL.Animation, typeof OGL.Animation>
export type TextProps = Node<OGL.Text, typeof OGL.Text>
export type NormalProgramProps = Omit<ProgramProps, 'vertex' | 'fragment'>
export type FlowmapProps = Node<OGL.Flowmap, typeof OGL.Flowmap>
export type GPGPUProps = Node<OGL.GPGPU, typeof OGL.GPGPU>
export type PolylineProps = Node<OGL.Polyline, typeof OGL.Polyline>
export type ShadowProps = Node<OGL.Shadow, typeof OGL.Shadow>
export type KTXTextureProps = Node<OGL.KTXTexture, typeof OGL.KTXTexture>
export type TextureLoaderProps = Node<OGL.TextureLoader, typeof OGL.TextureLoader>
export type GLTFLoaderProps = Node<OGL.GLTFLoader, typeof OGL.GLTFLoader>
export type GLTFSkinProps = TransformNode<OGL.GLTFSkin, typeof OGL.GLTFSkin>
export type BasisManagerProps = Node<OGL.BasisManager, typeof OGL.BasisManager>

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // primitive
      primitive: PrimitiveProps

      // Core
      geometry: GeometryProps
      program: ProgramProps
      renderer: RendererProps
      camera: CameraProps
      transform: TransformProps
      mesh: MeshProps
      texture: TextureProps
      renderTarget: RenderTargetProps

      // Math
      color: ColorProps
      euler: EulerProps
      mat3: Mat3Props
      mat4: Mat4Props
      quat: QuatProps
      vec2: Vec2Props
      vec3: Vec3Props
      vec4: Vec4Props

      // Extra
      plane: PlaneProps
      box: BoxProps
      sphere: SphereProps
      cylinder: CylinderProps
      triangle: TriangleProps
      torus: TorusProps
      orbit: OrbitProps
      raycast: RaycastProps
      curve: CurveProps
      post: PostProps
      skin: SkinProps
      animation: AnimationProps
      // text: TextProps
      normalProgram: NormalProgramProps
      flowmap: FlowmapProps
      gPGPU: GPGPUProps
      // polyline: PolylineProps
      shadow: ShadowProps
      kTXTexture: KTXTextureProps
      textureLoader: TextureLoaderProps
      gLTFLoader: GLTFLoaderProps
      gLTFSkin: GLTFSkinProps
      basisManager: BasisManagerProps
    }
  }
}
