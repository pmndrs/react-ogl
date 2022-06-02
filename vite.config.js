import path from 'path'
import { defineConfig } from 'vite'
import includeAll from 'rollup-include-all'

const LIBRARY_MODE = process.env.NODE_ENV === 'production'

export default defineConfig({
  plugins: [LIBRARY_MODE && includeAll()].filter(Boolean),
  logLevel: LIBRARY_MODE ? 'warn' : 'info',
  root: 'examples',
  resolve: {
    alias: {
      'react-ogl': path.resolve(process.cwd(), 'src'),
    },
  },
  test: {
    dir: path.resolve(process.cwd(), 'tests'),
    environment: 'jsdom',
    setupFiles: path.resolve(process.cwd(), 'tests/utils/setupTests.ts'),
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
      external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
      output: {
        preserveModules: true,
        preserveModulesRoot: path.resolve(process.cwd(), 'src'),
      },
    },
  },
})
