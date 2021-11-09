import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  resolve: {
    alias: {
      'react-ogl': path.resolve('../dist'),
    },
  },
  plugins: [react()],
})
