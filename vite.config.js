import path from 'path'
import { defineConfig } from 'vite'
import includeAll from 'rollup-include-all'

const root = path.resolve('/').replace(/\\+/g, '/')
const external = (id) => !id.startsWith('.') && !id.startsWith(root)

export default defineConfig({
  plugins: [includeAll()],
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
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
    target: 'esnext',
    lib: {
      formats: ['es', 'cjs'],
      entry: path.resolve(process.cwd(), 'src/index.ts'),
      fileName: (format) => (format === 'es' ? '[name].mjs' : '[name].js'),
    },
    rollupOptions: {
      external,
      output: {
        preserveModules: true,
        preserveModulesRoot: path.resolve(process.cwd(), 'src'),
      },
    },
  },
})
