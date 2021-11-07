# react-ogl

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

Elements can be completely declarative, or imperative with `<primitive object={MyOGLObject} />`.

```jsx
import * as OGL from 'ogl'
import { createRoot } from 'react-ogl'

// Init rendering internals
const renderer = new OGL.Renderer({ canvas })
const camera = new OGL.Camera()
const scene = new OGL.Transform()

// Set initial size
renderer.setSize(window.innerWidth, window.innerHeight)
camera.perspective({ aspect: window.innerWidth / window.innerHeight })

// Create root
const root = createRoot(canvas, { renderer, camera, scene })
root.render(
  <mesh>
    <box args={[{ width: 1.5, height: 1.5, depth: 1.5 }]} />
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
      uniforms={{
        uColor: { value: new OGL.Color(0xf5ce54) },
      }}
    />
  </mesh>,
)

// Render to screen
renderer.render({ scene, camera })
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
import * as OGL from 'ogl'
import { useRef, useState } from 'react'
import { useFrame, Canvas } from 'react-ogl/web'
import { render } from 'react-dom'

const hotpink = new OGL.Color(0xfba2d4)
const orange = new OGL.Color(0xf5ce54)

const Box = (props) => {
  const mesh = useRef()
  const [hovered, setHover] = useState(false)
  const [active, setActive] = useState(false)

  useFrame(() => (mesh.current.rotation.x += 0.01))

  return (
    <mesh
      {...props}
      ref={mesh}
      onClick={() => setActive((value) => !value)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <box
        args={[
          active
            ? { width: 1.5, height: 1.5, depth: 1.5 }
            : { width: 1, height: 1, depth: 1 },
        ]}
      />
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
        uniforms={{
          uColor: { value: hovered ? hotpink : orange },
        }}
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

This example uses [`expo-cli`](https://docs.expo.dev/get-started/create-a-new-app) for the sake of simplicity, but you can use your own barebones setup if you wish.

```bash
# Install expo-cli, this will create our app
npm install expo-cli -g

# Create app and cd into it
expo init my-app
cd my-app

# Install dependencies
npm install ogl react-ogl

# Start
expo start
```

Inside of our app, you can use the same API as web while running on native OpenGLES — no webview needed.

```js
import * as OGL from 'ogl'
import { useRef, useState } from 'react'
import { useFrame, Canvas } from 'react-ogl/native'
import { registerRootComponent } from 'expo'

const hotpink = new OGL.Color(0xfba2d4)
const orange = new OGL.Color(0xf5ce54)

const Box = (props) => {
  const mesh = useRef()
  const [hovered, setHover] = useState(false)
  const [active, setActive] = useState(false)

  useFrame(() => (mesh.current.rotation.x += 0.01))

  return (
    <mesh
      {...props}
      ref={mesh}
      onClick={() => setActive((value) => !value)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <box
        args={[
          active
            ? { width: 1.5, height: 1.5, depth: 1.5 }
            : { width: 1, height: 1, depth: 1 },
        ]}
      />
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
        uniforms={{
          uColor: { value: hovered ? hotpink : orange },
        }}
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

registerRootComponent(App)
```

</details>
