import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  resolve: {
    alias: {
      react: path.resolve('../node_modules/react'),
      'react-dom': path.resolve('../node_modules/react-dom'),
      ogl: path.resolve('../node_modules/ogl'),
      'react-ogl': path.resolve('../src'),
    },
  },
  plugins: [react()],
})
