import * as OGL from 'ogl'
import { useRef } from 'react'
import { render } from 'react-dom'
import { useFrame, Canvas } from 'react-ogl/web'
import vertex from './shaders/vertex.glsl'
import fragment from './shaders/fragment.glsl'

const Box = (props) => {
  const mesh = useRef()

  useFrame(() => (mesh.current.rotation.x += 0.01))

  return (
    <mesh {...props} ref={mesh}>
      <box />
      <program
        vertex={vertex}
        fragment={fragment}
        uniforms={{
          uColor: { value: new OGL.Color(0xf5ce54) },
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
