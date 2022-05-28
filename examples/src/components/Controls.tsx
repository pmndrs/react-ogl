import * as React from 'react'
import * as OGL from 'ogl'
import { useFrame, useOGL } from 'react-ogl'

function Controls() {
  const controls = React.useRef<OGL.Orbit>()
  const { gl, camera } = useOGL()

  React.useEffect(() => {
    gl.canvas.classList.add('controls')
    return () => void gl.canvas.classList.remove('controls')
  }, [])

  useFrame(() => controls.current.update())

  // @ts-ignore
  return <orbit ref={controls} args={[camera, { element: gl.canvas, enableZoom: false }]} />
}

export default Controls
