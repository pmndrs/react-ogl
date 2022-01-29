# react-ogl

[![Version](https://img.shields.io/npm/v/react-ogl?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-ogl)
[![Downloads](https://img.shields.io/npm/dt/react-ogl.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-ogl)
[![Twitter](https://img.shields.io/twitter/follow/pmndrs?label=%40pmndrs&style=flat&colorA=000000&colorB=000000&logo=twitter&logoColor=000000)](https://twitter.com/pmndrs)
[![Discord](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=000000)](https://discord.gg/poimandres)

Declaratively create scenes with re-usable OGL components that have their own state and effects and can tap into React's infinite ecosystem.

### Installation

```bash
npm install ogl react-ogl
```

### What is it?

react-ogl is a barebones [react renderer](https://reactjs.org/docs/codebase-overview.html#renderers) for [`ogl`](https://npmjs.com/ogl) with an emphasis on minimalism and modularity. Its reconciler simply expresses JSX as ogl elements — `<mesh />` becomes `new OGL.Mesh()`. This happens dynamically; there's no wrapper involved.

### How does this compare to [`@react-three/fiber`](https://github.com/pmndrs/react-three-fiber)?

react-ogl is a complete re-architecture of @react-three/fiber with:

- **no defaults**; you have complete control. No default renderer, camera, etc. For library/engine authors, this allows components to be completely transformative of rendering behavior and API. But this freedom leads to boilerplate. For both users and authors, there are —
- **extendable helpers**; react-ogl exports helper components and hooks for both web and native with an API familiar to @react-three/fiber, but these helpers are also modular. This enables you to change or extend rendering behavior and API while maintaining interop with the react-ogl ecosystem.

The API is the same as @react-three/fiber, but react-ogl is completely extensible.

### What does it look like?

The following takes complete control and declaratively renders a mesh that can react to state.

```jsx
import * as OGL from 'ogl'
import { createRoot } from 'react-ogl'

// Init rendering internals
const canvas = document.querySelector('canvas')
const renderer = new OGL.Renderer({ canvas })
const camera = new OGL.Camera(renderer.gl)
camera.position.z = 5
const scene = new OGL.Transform(renderer.gl)

// Or you can use our own internals. This will also set up a render loop.
// const { root, renderer, camera, scene } = createInternals(camera, config)

// Set initial size
renderer.setSize(window.innerWidth, window.innerHeight)
camera.perspective({ aspect: window.innerWidth / window.innerHeight })

// Create root
const root = createRoot(canvas, { renderer, camera, scene })
root.render(
  <mesh>
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
      uniforms={{ uColor: 'white' }}
    />
  </mesh>,
)

// Render to screen
const animate = () => {
  requestAnimationFrame(animate)
  renderer.render({ scene, camera })
}
animate()
```

react-ogl itself is super minimal, but you can use the familiar @react-three/fiber API with some helpers targeted for different platforms:

<details>
  <summary>Usage with react-dom</summary>

<br />

This example uses [`create-react-app`](https://reactjs.org/docs/create-a-new-react-app.html#create-react-app) for the sake of simplicity, but you can use your own environment or [create a codesandbox](https://react.new).

```bash
# Create app
npx create-react-app my-app
cd my-app

# Install dependencies
npm install ogl react-ogl

# Start
npm run start
```

Inside of our app, we can use the same API as @react-three/fiber but with OGL elements and methods.

```jsx
import { useRef, useState } from 'react'
import { useFrame, Canvas } from 'react-ogl/web'
import { render } from 'react-dom'

const Box = (props) => {
  const mesh = useRef()
  const [hovered, setHover] = useState(false)
  const [active, setActive] = useState(false)

  useFrame(() => (mesh.current.rotation.x += 0.01))

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

render(
  <Canvas camera={{ position: [0, 0, 8] }}>
    <Box position={[-1.2, 0, 0]} />
    <Box position={[1.2, 0, 0]} />
  </Canvas>,
  document.getElementById('root'),
)
```

</details>

<details>
  <summary>Usage with react-native</summary>

<br />

This example uses [`expo-cli`](https://docs.expo.dev/get-started/create-a-new-app) but you can create a bare app with `react-native` CLI as well.

```bash
# Create app and cd into it
npx expo init my-app # or npx react-native init my-app
cd my-app

# Automatically install & link expo modules
npx install-expo-modules
expo install expo-gl

# Install NPM dependencies
npm install ogl react-ogl

# Start
npm run start
```

We'll also need to configure `metro.config.js` to look for the mjs file extension that ogl uses.

```js
module.exports = {
  resolver: {
    sourceExts: ['json', 'js', 'jsx', 'ts', 'tsx', 'cjs', 'mjs'],
    assetExts: ['glb', 'gltf', 'png', 'jpg'],
  },
}
```

Inside of our app, you can use the same API as web while running on native OpenGLES — no webview needed.

```js
import React, { useRef, useState } from 'react'
import { useFrame, Canvas } from 'react-ogl/native'

const Box = (props) => {
  const mesh = useRef()
  const [hovered, setHover] = useState(false)
  const [active, setActive] = useState(false)

  useFrame(() => (mesh.current.rotation.x += 0.01))

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

const App = () => (
  <Canvas camera={{ position: [0, 0, 8] }}>
    <Box position={[-1.2, 0, 0]} />
    <Box position={[1.2, 0, 0]} />
  </Canvas>
)

export default App
```

</details>
