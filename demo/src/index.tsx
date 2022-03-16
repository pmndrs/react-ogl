// @ts-ignore
import * as OGL from 'ogl'
import * as React from 'react'
import { render } from 'react-dom'
// @ts-ignore
import { MeshProps, useFrame, Canvas } from 'react-ogl/web'

const hotpink = new OGL.Color(0xfba2d4)
const orange = new OGL.Color(0xf5ce54)

const Box = (props: MeshProps) => {
  const mesh = React.useRef<OGL.Mesh>()
  const [hovered, setHover] = React.useState(false)
  const [active, setActive] = React.useState(false)

  const programRef = React.useRef<OGL.Program>();

  let point = [0,0];

  useFrame(() => {
    mesh.current.rotation.x += 0.01;
    (programRef.current.uniforms as Record<string, {value: any}>).uPoint.value = point;
  });

  return (
    <mesh
      {...props}
      ref={mesh}
      scale={active ? 1.5 : 1}
      onClick={() => setActive((value) => !value)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      onPointerMove={({ hit }) => hit && (point = hit.uv)}
    >
      <box/>
      <program
        ref={ programRef }
        vertex={`
          attribute vec3 position;
          attribute vec3 normal;
          attribute vec2 uv;

          uniform mat4 modelViewMatrix;
          uniform mat4 projectionMatrix;
          uniform mat3 normalMatrix;

          varying vec3 vNormal;
          varying vec2 vUv;

          void main() {
            vNormal = normalize(normalMatrix * normal);
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragment={`
          precision highp float;

          uniform vec3 uColor;
          uniform vec2 uPoint;

          varying vec3 vNormal;
          varying vec2 vUv;

          void main() {
            vec3 normal = normalize(vNormal);
            float lighting = dot(normal, normalize(vec3(10)));

            gl_FragColor.rgb = vec3(vUv, 1.0) + lighting * 0.1;
            gl_FragColor.rgb = mix (vec3(0.0), gl_FragColor.rgb, step(0.01, length(uPoint - vUv)));
            gl_FragColor.a = 1.0;
          }
        `}
        uniforms={{ uColor: hovered ? hotpink : orange, uPoint: [0,0] }}
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
