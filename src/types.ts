import * as OGL from 'ogl'
import type { MutableRefObject } from 'react'

export type Catalogue = { [key: string]: OGL.Transform }

export type BaseInstance = Omit<OGL.Transform, 'children' | 'attach'> & {
  isPrimitive?: boolean
  __handlers?: any
  children: Instance[]
  attach?: string
}

export type Instance = BaseInstance & { [key: string]: any }

export type InstanceProps = {
  [key: string]: unknown
} & {
  args?: any[]
  object?: object
  visible?: boolean
  dispose?: null
  attach?: string
}

export type Events = {
  onClick: EventListener
  onPointerUp: EventListener
  onPointerDown: EventListener
  onPointerMove: EventListener
}

export type EventHandlers = {
  onClick?: (event: MouseEvent) => void
  onHover?: (event: MouseEvent) => void
  onPointerUp?: (event: PointerEvent) => void
  onPointerDown?: (event: PointerEvent) => void
  onPointerMove?: (event: PointerEvent) => void
  onPointerOver?: (event: PointerEvent) => void
  onPointerOut?: (event: PointerEvent) => void
}

export interface Root {
  render: (element: React.ReactNode) => RootState
  unmount: () => void
}

export interface EventManager {
  connected: boolean
  handlers?: any
  connect?: (target: HTMLCanvasElement, state: RootState) => void
  disconnect?: (target: HTMLCanvasElement, state: RootState) => void
}

export type Subscription = (state: RootState) => any

export interface RootState {
  renderer: OGL.Renderer
  gl: OGL.Renderer.gl
  scene: OGL.Transform | OGL.Mesh
  camera: OGL.Camera
  priority: number
  subscribed: Subscription[]
  subscribe: (refCallback: MutableRefObject<Subscription>, renderPriority?: number) => void
  unsubscribe: (refCallback: MutableRefObject<Subscription>, renderPriority?: number) => void
  animation?: number
  root?: Root
  events?: EventManager
  mouse?: OGL.Vec2
  raycaster?: OGL.Raycast
  hovered?: Map<number, OGL.Transform>
  [key: string]: any
}

export type DPR = [number, number] | number

export type RenderProps = {
  size?: { width: number; height: number }
  dpr?: DPR
  renderer?: OGL.Renderer
  gl?: OGL.Renderer.gl
  frameloop?: 'always' | 'never'
  camera?: OGL.Camera
  orthographic?: boolean
  events?: EventManager
  onCreated?: (state: RootState) => any
}
