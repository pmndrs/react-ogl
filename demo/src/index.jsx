import * as OGL from 'ogl'
import { useRef, useState } from 'react'
import { render } from 'react-dom'
import { useFrame, Canvas } from 'react-ogl/web'
import vertex from './shaders/vertex.glsl'
import fragment from './shaders/fragment.glsl'

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
        vertex={vertex}
        fragment={fragment}
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
