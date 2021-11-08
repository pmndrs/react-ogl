import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'

export default defineConfig({
  resolve: {
    alias: {
      'react-ogl': path.resolve('../src'),
      'react-ogl/web': path.resolve('../src/web'),
    },
  },
  plugins: [react(), glsl()],
})
