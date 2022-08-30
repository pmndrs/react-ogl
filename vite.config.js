import path from 'path'
import fs from 'fs'
import { defineConfig } from 'vite'

const entry = fs.existsSync(path.resolve(process.cwd(), 'dist')) ? 'index.native' : 'index'

export default defineConfig(({ command }) => ({
  root: command === 'serve' ? 'examples' : undefined,
  resolve: {
    alias: {
      'react-ogl': path.resolve(process.cwd(), 'src'),
    },
  },
  build: {
    minify: false,
    emptyOutDir: false,
    sourcemap: true,
    target: 'es2018',
    lib: {
      formats: ['es'],
      entry: `src/${entry}.ts`,
      fileName: '[name]',
    },
    rollupOptions: {
      external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
      treeshake: false,
      output: {
        preserveModules: true,
        sourcemapExcludeSources: true,
      },
    },
  },
}))
