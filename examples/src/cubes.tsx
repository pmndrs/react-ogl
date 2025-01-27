import * as OGL from 'ogl'
import * as React from 'react'
import { type OGLElements, useFrame, Canvas } from 'react-ogl'

const hotpink = new OGL.Color(0xfba2d4)
const orange = new OGL.Color(0xf5ce54)

const Box = (props: OGLElements['mesh']) => {
  const mesh = React.useRef<OGL.Mesh>(null!)
  const [hovered, setHover] = React.useState(false)
  const [active, setActive] = React.useState(false)

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
        uniforms={{ uColor: hovered ? hotpink : orange }}
      />
    </mesh>
  )
}

export default (
  <Canvas>
    <Box position={[-1.2, 0, 0]} />
    <Box position={[1.2, 0, 0]} />
  </Canvas>
)
