[![Size](https://img.shields.io/bundlephobia/minzip/react-ogl?label=gzip&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/package/react-ogl)
[![Version](https://img.shields.io/npm/v/react-ogl?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-ogl)
[![Downloads](https://img.shields.io/npm/dt/react-ogl.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-ogl)
[![Twitter](https://img.shields.io/twitter/follow/pmndrs?label=%40pmndrs&style=flat&colorA=000000&colorB=000000&logo=twitter&logoColor=000000)](https://twitter.com/pmndrs)
[![Discord](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=000000)](https://discord.gg/poimandres)

<p align="left">
  <a id="cover" href="#cover">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset=".github/dark.svg">
      <img style="white-space:pre-wrap" alt="Build OGL scenes declaratively with re-usable, self-contained components that react to state, are readily interactive and can participate in React's ecosystem.&#10&#10react-ogl is a barebones react renderer for OGL with an emphasis on minimalism and modularity. Its reconciler simply expresses JSX as OGL elements — <mesh /> becomes new OGL.Mesh(). This happens dynamically; there's no wrapper involved.">
    </picture>
  </a>
</p>

## Table of Contents

- [Installation](#installation)
- [Getting Started](#getting-started)
  - [react-dom](#react-dom)
  - [react-native](#react-native)
- [Canvas](#canvas)
  - [Canvas Props](#canvas-props)
  - [Custom Canvas](#custom-canvas)
- [Creating Elements](#creating-elements)
  - [JSX, properties, and shortcuts](#jsx-properties-and-shortcuts)
  - [Setting constructor arguments via `args`](#setting-constructor-arguments-via-args)
  - [Attaching into element properties via `attach`](#attaching-into-element-properties-via-attach)
  - [Creating custom elements via `extend`](#creating-custom-elements-via-extend)
  - [Adding third-party objects via `<primitive />`](#adding-third-party-objects-via-primitive-)
- [Hooks](#hooks)
  - [Root State](#root-state)
  - [Accessing state via `useOGL`](#accessing-state-via-useogl)
  - [Frameloop subscriptions via `useFrame`](#frameloop-subscriptions-via-useframe)
  - [Loading assets via `useLoader`](#loading-assets-via-useloader)
  - [Object traversal via `useGraph`](#object-traversal-via-usegraph)
  - [Transient updates via `useStore`](#transient-updates-via-usestore)
  - [Access internals via `useInstanceHandle`](#access-internals-via-useinstancehandle)
- [Events](#events)
  - [Custom Events](#custom-events)
- [Portals](#portals)
- [Testing](#testing)

## Installation

```bash
# NPM
npm install ogl react-ogl

# Yarn
yarn add ogl react-ogl

# PNPM
pnpm add ogl react-ogl
```

## Getting Started

react-ogl itself is super minimal, but you can use the familiar [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) API with some helpers targeted for different platforms:

### react-dom

This example uses [`create-react-app`](https://reactjs.org/docs/create-a-new-react-app.html#create-react-app) for the sake of simplicity, but you can use your own environment or [create a codesandbox](https://react.new).

<details>
  <summary>Show full example</summary>
  
  <br />

```bash
# Create app
npx create-react-app my-app
cd my-app

# Install dependencies
npm install ogl react-ogl

# Start
npm run start
```

The following creates a re-usable component that has its own state, reacts to events and participates a shared render-loop.

```jsx
import * as React from 'react'
import { useFrame, Canvas } from 'react-ogl'
import { createRoot } from 'react-dom/client'

function Box(props) {
  // This reference will give us direct access to the mesh
  const mesh = React.useRef()
  // Set up state for the hovered and active state
  const [hovered, setHover] = React.useState(false)
  const [active, setActive] = React.useState(false)
  // Subscribe this component to the render-loop, rotate the mesh every frame
  useFrame(() => (mesh.current.rotation.x += 0.01))
  // Return view, these are regular OGL elements expressed in JSX
  return (
    <mesh
      {...props}
      ref={mesh}
      scale={active ? 1.5 : 1}
      onClick={() => setActive((value) => !value)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <box />
      <program
        vertex={`
          attribute vec3 position;
          attribute vec3 normal;

          uniform mat4 modelViewMatrix;
          uniform mat4 projectionMatrix;
          uniform mat3 normalMatrix;

          varying vec3 vNormal;

          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragment={`
          precision highp float;

          uniform vec3 uColor;
          varying vec3 vNormal;

          void main() {
            vec3 normal = normalize(vNormal);
            float lighting = dot(normal, normalize(vec3(10)));

            gl_FragColor.rgb = uColor + lighting * 0.1;
            gl_FragColor.a = 1.0;
          }
        `}
        uniforms={{ uColor: hovered ? 'hotpink' : 'orange' }}
      />
    </mesh>
  )
}

createRoot(document.getElementById('root')).render(
  <Canvas camera={{ position: [0, 0, 8] }}>
    <Box position={[-1.2, 0, 0]} />
    <Box position={[1.2, 0, 0]} />
  </Canvas>,
)
```

</details>

### react-native

This example uses [`expo-cli`](https://docs.expo.dev/get-started/create-a-new-app) but you can create a bare app with `react-native` CLI as well.

<details>
  <summary>Show full example</summary>
  
  <br />

```bash
# Create app and cd into it
npx expo init my-app # or npx react-native init my-app
cd my-app

# Automatically install & link expo modules
npx install-expo-modules@latest
expo install expo-gl

# Install NPM dependencies
npm install ogl react-ogl

# Start
npm run start
```

We'll also need to configure `metro.config.js` to look for the mjs file extension that OGL uses.

```js
module.exports = {
  resolver: {
    resolverMainFields: ['browser', 'exports', 'main'], // https://github.com/facebook/metro/issues/670
    sourceExts: ['json', 'js', 'jsx', 'ts', 'tsx', 'cjs', 'mjs'],
    assetExts: ['glb', 'gltf', 'png', 'jpg'],
  },
}
```

Inside of our app, you can use the same API as web while running on native OpenGL ES — no webview needed.

```js
import * as React from 'react'
import { useFrame, Canvas } from 'react-ogl'

function Box(props) {
  // This reference will give us direct access to the mesh
  const mesh = React.useRef()
  // Set up state for the hovered and active state
  const [hovered, setHover] = React.useState(false)
  const [active, setActive] = React.useState(false)
  // Subscribe this component to the render-loop, rotate the mesh every frame
  useFrame(() => (mesh.current.rotation.x += 0.01))
  // Return view, these are regular OGL elements expressed in JSX
  return (
    <mesh
      {...props}
      ref={mesh}
      scale={active ? 1.5 : 1}
      onClick={() => setActive((value) => !value)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <box />
      <program
        vertex={`
          attribute vec3 position;
          attribute vec3 normal;

          uniform mat4 modelViewMatrix;
          uniform mat4 projectionMatrix;
          uniform mat3 normalMatrix;

          varying vec3 vNormal;

          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragment={`
          precision highp float;

          uniform vec3 uColor;
          varying vec3 vNormal;

          void main() {
            vec3 normal = normalize(vNormal);
            float lighting = dot(normal, normalize(vec3(10)));

            gl_FragColor.rgb = uColor + lighting * 0.1;
            gl_FragColor.a = 1.0;
          }
        `}
        uniforms={{ uColor: hovered ? 'hotpink' : 'orange' }}
      />
    </mesh>
  )
}

export default () => (
  <Canvas camera={{ position: [0, 0, 8] }}>
    <Box position={[-1.2, 0, 0]} />
    <Box position={[1.2, 0, 0]} />
  </Canvas>
)
```

</details>

## Canvas

react-ogl provides an x-platform `<Canvas />` component for web and native that serves as the entrypoint for your OGL scenes. It is a real DOM canvas or native view that accepts OGL elements as children (see [creating elements](#creating-elements)).

### Canvas Props

In addition to its platform props, `<Canvas />` accepts a set of `RenderProps` to configure react-ogl and its rendering behavior.

```tsx
<Canvas
  // Configures the react rendering mode. Defaults to `blocking`
  mode={"legacy" | "blocking" | "concurrent"}
  // Creates, sets, or configures the default renderer.
  // Accepts a callback, an external renderer, or renderer constructor params/properties.
  // Defaults to `new OGL.Renderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
  renderer={(canvas: HTMLCanvasElement) => new Renderer(canvas) | renderer | { ...params, ...props }}
  // Sets the renderer pixel ratio from a clamped range or value. Default is `[1, 2]`
  dpr={[min, max] | value}
  // Sets or configures the default camera.
  // Accepts an external camera, or camera constructor params/properties.
  // Defaults to `new OGL.Camera(gl, { fov: 75, near: 1, far: 1000 })` with position-z `5`
  camera={camera | { ...params, ...props }}
  // Enables orthographic projection when using OGL's built-in camera. Default is `false`
  orthographic={true | false}
  // Defaults to `always`
  frameloop={'always' | 'never'}
  // An optional callback invoked after canvas creation and before commit.
  onCreated={(state: RootState) => void}
  // Optionally configures custom events. Defaults to built-in events exported as `events`
  events={EventManager | undefined}
>
  {/* Accepts OGL elements as children */}
  <transform />
</Canvas>

// e.g.

<Canvas
  renderer={{ alpha: true }}
  camera={{ fov: 45, position: [0, 1.3, 3] }}
  onCreated={(state) => void state.gl.clearColor(1, 1, 1, 0)}
>
  <transform />
</Canvas>
```

### Custom Canvas

A react 18 style `createRoot` API creates an imperative `Root` with the same options as `<Canvas />`, but you're responsible for updating it and configuring things like events (see [events](#events)). This root attaches to an `HTMLCanvasElement` and renders OGL elements into a scene. Useful for creating an entrypoint with react-ogl and for headless contexts like a server or testing (see [testing](#testing)).

```jsx
import { createRoot, events } from 'react-ogl'

const canvas = document.querySelector('canvas')
const root = createRoot(canvas, { events })
root.render(
  <mesh>
    <box />
    <normalProgram />
  </mesh>,
)
root.unmount()
```

`createRoot` can also be used to create a custom `<Canvas />`. The following constructs a custom canvas that renders its children into react-ogl.

```jsx
import * as React from 'react'
import { createRoot, events } from 'react-ogl'

function CustomCanvas({ children }) {
  // Init root from canvas
  const [canvas, setCanvas] = React.useState()
  const root = React.useMemo(() => canvas && createRoot(canvas, { events }), [canvas])
  // Render children as a render-effect
  root?.render(children)
  // Cleanup on unmount
  React.useEffect(() => () => root?.unmount(), [root])
  // Use callback-style ref to access canvas in render
  return <canvas ref={setCanvas} />
}
```

## Creating elements

react-ogl renders React components into an OGL scene-graph, and can be used on top of other renderers like [react-dom](https://npmjs.com/react-dom) and [react-native](https://npmjs.com/react-native) that render for web and native, respectively. react-ogl components are defined by primitives or lower-case elements native to the OGL namespace (for custom elements, see [extend](#creating-custom-elements-via-extend)).

```jsx
function Component(props) {
  return (
    <mesh {...props}>
      <box />
      <normalProgram />
    </mesh>
  )
}

;<transform>
  <Component position={[1, 2, 3]} />
</transform>
```

These elements are not exported or implemented internally, but merely expressed as JSX — `<mesh />` becomes `new OGL.Mesh()`. This happens dynamically; there's no wrapper involved.

### JSX, properties, and shortcuts

react-ogl elements can be modified with JSX attributes or props. These are native to their underlying OGL objects.

```jsx
<transform
  // Set non-atomic properties with literals
  // transform.visible = false
  visible={false}
  // Copy atomic properties with a stable reference (e.g. useMemo)
  // transform.rotation.copy(rotation)
  rotation={rotation}
  // Set atomic properties with declarative array syntax
  // transform.position.set(1, 2, 3)
  position={[1, 2, 3]}
  // Set scalars with shorthand for vector properties
  // transform.scale.set(1, 1, 1)
  scale={1}
  // Set CSS names or hex values as shorthand for color properties
  // transform.color.set('red')
  color="red"
  // Set sub properties with prop piercing or dash-case
  // transform.rotation.x = Math.PI / 2
  rotation-x={Math.PI / 2}
/>
```

### Setting constructor arguments via `args`

An array of constructor arguments (`args`) can be passed to instantiate elements' underlying OGL objects. Changing `args` will reconstruct the object and update any associated refs.

```jsx
// new OGL.Text({ font, text: 'Text' })
<text args={[{ font, text: 'Text' }]} />
```

Built-in elements that require a `gl` context such as `<mesh />`, `<geometry />`, or `<program />` are marked as effectful (see [extend](#creating-custom-elements-via-extend)) and do not require an `OGLRenderingContext` to be passed via `args`. They can be constructed mutably and manipulated via props:

```jsx
<mesh>
  <box />
  <normalProgram />
</mesh>
```

`<geometry />` and `<program />` also accept attributes and shader sources as props, which are passed to their respective constructors. This does not affect other properties like `drawRange` or `uniforms`.

```jsx
<mesh>
  <geometry
    position={{ size: 3, data: new Float32Array([-0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, -0.5, 0]) }}
    uv={{ size: 2, data: new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]) }}
    index={{ data: new Uint16Array([0, 1, 2, 1, 3, 2]) }}
  />
  {/* prettier-ignore */}
  <program
    vertex={/* glsl */ `...`}
    fragment={/* glsl */ `...`}
    uniforms={{ uniform: value }}
  />
</mesh>
```

### Attaching into element properties via `attach`

Some elements do not follow the traditional scene-graph and need to be added by other means. For this, the `attach` prop can describe where an element is added via a property or a callback to add & remove the element.

```jsx
// Attaches into parent.property, parent.sub.property, and parent.array[0]
<parent>
  <element attach="property" />
  <element attach="sub-property" />
  <element attach="array-0" />
</parent>

// Attaches via parent#setProperty and parent#removeProperty
<parent>
  <element
    attach={(parent, self) => {
      parent.setProperty(self)
      return () => parent.removeProperty(self)
    }}
    // lambda version
    attach={(parent, self) => (parent.setProperty(self), () => parent.removeProperty(self))}
  />
</parent>
```

Elements who extend `OGL.Geometry` or `OGL.Program` will automatically attach via `attach="geometry"` and `attach="program"`, respectively.

```jsx
<mesh>
  <box />
  <normalProgram />
</mesh>
```

### Creating custom elements via `extend`

react-ogl tracks an internal catalog of constructable elements, defaulting to the OGL namespace. This catalog can be expanded via `extend` to declaratively use custom elements as native elements.

```jsx
import { extend } from 'react-ogl'

class CustomElement {}
extend({ CustomElement })

<customElement />
```

TypeScript users will need to extend the `OGLElements` interface to describe custom elements and their properties.

```tsx
import { OGLElement, extend } from 'react-ogl'

class CustomElement {}

declare module 'react-ogl' {
  interface OGLElements {
    customElement: OGLElement<typeof CustomElement>
  }
}

extend({ CustomElement })
```

Effectful elements that require a `gl` context can mark themselves as effectful and receive a `OGLRenderingContext` when constructed, making args mutable and enabling the use of props. This is done for OGL built-in elements like `<mesh />`, `<geometry />`, and `<program />`.

```jsx
import { extend } from 'react-ogl'

class CustomElement {
  constructor(gl) {
    this.gl = gl
  }
}
extend({ CustomElement }, true)

<customElement />
```

### Adding third-party objects via `<primitive />`

Objects created outside of React (e.g. globally or from a loader) can be added to the scene-graph with the `<primitive />` element via its `object` prop. Primitives can be interacted with like any other element, but will modify `object` and cannot make use of `args`.

```jsx
import * as OGL from 'ogl'

const object = new OGL.Transform()

<primitive object={object} position={[1, 2, 3]} />
```

## Hooks

react-ogl ships with hooks that allow you to tie or request information to your components. These are called within the body of `<Canvas />` and contain imperative and possibly stateful code.

### Root State

Each `<Canvas />` or `Root` encapsulates its own OGL state via [React context](https://reactjs.org/docs/context.html) and a [Zustand](https://github.com/pmndrs/zustand) store, as defined by `RootState`. This can be accessed and modified with the `onCreated` canvas prop, and with hooks like `useOGL`.

```tsx
interface RootState {
  // Zustand setter and getter for live state manipulation.
  // See https://github.com/pmndrs/zustand
  get(): RootState
  set(fn: (previous: RootState) => (next: Partial<RootState>)): void
  // Canvas layout information
  size: { width: number; height: number }
  // OGL scene internals
  renderer: OGL.Renderer
  gl: OGL.OGLRenderingContext
  scene: OGL.Transform
  camera: OGL.Camera
  // OGL perspective and frameloop preferences
  orthographic: boolean
  frameloop: 'always' | 'never'
  // Internal XR manager to enable WebXR features
  xr: XRManager
  // Frameloop internals for custom render loops
  priority: number
  subscribed: React.RefObject<Subscription>[]
  subscribe: (refCallback: React.RefObject<Subscription>, renderPriority?: number) => void
  unsubscribe: (refCallback: React.RefObject<Subscription>, renderPriority?: number) => void
  // Optional canvas event manager and its state
  events?: EventManager
  mouse: OGL.Vec2
  raycaster: OGL.Raycast
  hovered: Map<number, Instance<OGL.Mesh>['object']>
}
```

### Accessing state via `useOGL`

Returns the current canvas' `RootState`, describing react-ogl state and OGL rendering internals (see [root state](#root-state)).

```tsx
const { renderer, gl, scene, camera, ... } = useOGL()
```

To subscribe to a specific key, `useOGL` accepts a [Zustand](https://github.com/pmndrs/zustand) selector:

```tsx
const renderer = useOGL((state) => state.renderer)
```

### Frameloop subscriptions via `useFrame`

Subscribes an element into a shared render loop outside of React. `useFrame` subscriptions are provided a live `RootState`, the current RaF time in seconds, and a `XRFrame` when in a WebXR session. Note: `useFrame` subscriptions should never update React state but prefer external mechanisms like refs.

```tsx
const object = React.useRef<OGL.Transform>(null!)

useFrame((state: RootState, time: number, frame?: XRFrame) => {
  object.current.rotation.x = time / 2000
  object.current.rotation.y = time / 1000
})

return <transform ref={object} />
```

### Loading assets via `useLoader`

Synchronously loads and caches assets with a loader via suspense. Note: the caller component must be wrapped in `React.Suspense`.

```jsx
const texture = useLoader(OGL.TextureLoader, '/path/to/image.jpg')
```

Multiple assets can be requested in parallel by passing an array:

```jsx
const [texture1, texture2] = useLoader(OGL.TextureLoader, ['/path/to/image1.jpg', '/path/to/image2.jpg'])
```

Custom loaders can be implemented via the `LoaderRepresentation` signature:

```tsx
class CustomLoader {
  async load(gl: OGLRenderingContext, url: string): Promise<void> {}
}

const result = useLoader(CustomLoader, '/path/to/resource')
```

### Object traversal via `useGraph`

Traverses an `OGL.Transform` for unique meshes and programs, returning an `ObjectMap`.

```tsx
const { nodes, programs } = useGraph(object)

<mesh geometry={nodes['Foo'].geometry} program={programs['Bar']} />
```

### Transient updates via `useStore`

Returns the internal [Zustand](https://github.com/pmndrs/zustand) store. Useful for transient updates outside of React (e.g. multiplayer/networking).

```tsx
const store = useStore()
React.useLayoutEffect(() => store.subscribe(state => ...), [store])
```

### Access internals via `useInstanceHandle`

Exposes an object's react-internal `Instance` state from a ref.

> **Note**: this is an escape hatch to react-internal fields. Expect this to change significantly between versions.

```tsx
const ref = React.useRef<OGL.Transform>()
const instance = useInstanceHandle(ref)

React.useLayoutEffect(() => {
  instance.parent.object.foo()
}, [])

<transform ref={ref} />
```

## Events

react-ogl implements mesh pointer-events with `OGL.Raycast` that can be tapped into via the following props:

```tsx
<mesh
  // Fired when the mesh is clicked or tapped.
  onClick={(event: OGLEvent<MouseEvent>) => ...}
  // Fired when a pointer becomes inactive over the mesh.
  onPointerUp={(event: OGLEvent<PointerEvent>) => ...}
  // Fired when a pointer becomes active over the mesh.
  onPointerDown={(event: OGLEvent<PointerEvent>) => ...}
  // Fired when a pointer moves over the mesh.
  onPointerMove={(event: OGLEvent<PointerEvent>) => ...}
  // Fired when a pointer enters the mesh's bounds.
  onPointerOver={(event: OGLEvent<PointerEvent>) => ...}
  // Fired when a pointer leaves the mesh's bounds.
  onPointerOut={(event: OGLEvent<PointerEvent>) => ...}
/>
```

Events contain the original event as `nativeEvent` and properties from `OGL.RaycastHit`.

```tsx
{
  nativeEvent: PointerEvent | MouseEvent,
  localPoint: Vec3,
  distance: number,
  point: Vec3,
  faceNormal: Vec3,
  localFaceNormal: Vec3,
  uv: Vec2,
  localNormal: Vec3,
  normal: Vec3,
}
```

### Custom events

Custom events can be implemented per the `EventManager` interface and passed via the `events` Canvas prop.

```tsx
const events: EventManager = {
  connected: false,
  connect(canvas: HTMLCanvasElement, state: RootState) {
    // Bind handlers
  },
  disconnect(canvas: HTMLCanvasElement, state: RootState) {
    // Cleanup
  },
}

<Canvas events={events}>
  <mesh onPointerMove={(event: OGLEvent<PointerEvent>) => console.log(event)}>
    <box />
    <normalProgram />
  </mesh>
</Canvas>
```

<details>
  <summary>Full example</summary>

```tsx
const events = {
  connected: false,
  connect(canvas: HTMLCanvasElement, state: RootState) {
    state.events.handlers = {
      pointermove(event: PointerEvent) {
        // Convert mouse coordinates
        state.mouse.x = (event.offsetX / state.size.width) * 2 - 1
        state.mouse.y = -(event.offsetY / state.size.height) * 2 + 1

        // Filter to interactive meshes
        const interactive: OGL.Mesh[] = []
        state.scene.traverse((node: OGL.Transform) => {
          // Mesh has registered events and a defined volume
          if (
            node instanceof OGL.Mesh &&
            (node as Instance<OGL.Mesh>['object']).__handlers &&
            node.geometry?.attributes?.position
          )
            interactive.push(node)
        })

        // Get elements that intersect with our pointer
        state.raycaster!.castMouse(state.camera, state.mouse)
        const intersects: OGL.Mesh[] = state.raycaster!.intersectMeshes(interactive)

        // Call mesh handlers
        for (const entry of intersects) {
          if ((entry as unknown as any).__handlers) {
            const object = entry as Instance<OGL.Mesh>['object']
            const handlers = object.__handlers

            const handlers = object.__handlers
            handlers?.onPointerMove?.({ ...object.hit, nativeEvent: event })
          }
        }
      },
    }

    // Bind
    state.events.connected = true
    for (const [name, handler] of Object.entries(state.events.handlers)) {
      canvas.addEventListener(name, handler)
    }
  },
  disconnect(canvas: HTMLCanvasElement, state: RootState) {
    // Unbind
    state.events.connected = false
    for (const [name, handler] of Object.entries(state.events.handlers)) {
      canvas.removeEventListener(name, handler)
    }
  },
}

<Canvas events={events}>
  <mesh onPointerMove={(event: OGLEvent<PointerEvent>) => console.log(event)}>
    <box />
    <normalProgram />
  </mesh>
</Canvas>
```

</details>

## Portals

Portal children into a foreign OGL element via `createPortal`, which can modify children's `RootState`. This is particularly useful for postprocessing and complex render effects.

```tsx
function Component {
  // scene & camera are inherited from portal parameters
  const { scene, camera, ... } = useOGL()
}

const scene = new OGL.Transform()
const camera = new OGL.Camera()

<transform>
  {createPortal(<Component />, scene, { camera })
</transform>
```

## Testing

In addition to `createRoot` (see [custom canvas](#custom-canvas)), react-ogl exports an `act` method which can be used to safely flush async effects in tests. The following emulates a legacy root and asserts against `RootState` (see [root state](#root-state)).

```tsx
import * as React from 'react'
import * as OGL from 'ogl'
import { type Root, type RootStore, type RootState, createRoot } from 'react-ogl'

it('tests against a react-ogl component or scene', async () => {
  const transform = React.createRef<OGL.Transform>()

  const root: Root = createRoot(document.createElement('canvas'))
  const store: RootStore = await React.act(async () => root.render(<transform ref={transform} />))
  const state: RootState = store.getState()

  expect(transform.current).toBeInstanceOf(OGL.Transform)
  expect(state.scene.children).toStrictEqual([transform.current])
})
```
