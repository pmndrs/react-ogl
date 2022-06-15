import path from 'path'
import { defineConfig } from 'vite'
import includeAll from 'rollup-include-all'

export default defineConfig({
  plugins: [includeAll()],
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
