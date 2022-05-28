import * as React from 'react'
import { Canvas } from 'react-ogl'
import Controls from './components/Controls'

const Program = () => (
  <program
    cullFace={null}
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
      varying vec3 vNormal;

      void main() {
        vec3 normal = normalize(vNormal);
        float lighting = dot(normal, normalize(vec3(-0.3, 0.8, 0.6)));
        gl_FragColor.rgb = vec3(0.2, 0.8, 1.0) + lighting * 0.1;
        gl_FragColor.a = 1.0;
      }
    `}
  />
)

export default (
  <Canvas camera={{ fov: 35, position: [0, 1, 7] }}>
    <mesh position={[-1.8, 0, 0]}>
      <plane />
      <Program />
    </mesh>
    <mesh position={[-0.6, 0, 0]}>
      <sphere />
      <Program />
    </mesh>
    <mesh position={[0.6, 0, 0]}>
      <box />
      <Program />
    </mesh>
    <mesh position={[1.8, 0, 0]}>
      <cylinder />
      <Program />
    </mesh>
    <Controls />
  </Canvas>
)
