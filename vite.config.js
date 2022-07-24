import path from 'path'
import fs from 'fs'
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'examples',
  resolve: {
    alias: {
      'react-ogl': path.resolve(process.cwd(), 'src'),
    },
  },
  build: {
    minify: false,
    outDir: path.resolve(process.cwd(), 'dist'),
    emptyOutDir: true,
    target: 'es2018',
    lib: {
      formats: ['es'],
      entry: fs.existsSync(path.resolve(process.cwd(), 'dist'))
        ? path.resolve(process.cwd(), 'src/index.native.ts')
        : path.resolve(process.cwd(), 'src/index.ts'),
      fileName: '[name]',
    },
    rollupOptions: {
      external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
    },
  },
})
