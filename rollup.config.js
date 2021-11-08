const fs = require('fs')
const path = require('path')
const babel = require('@rollup/plugin-babel').default
const commonjs = require('@rollup/plugin-commonjs')
const resolve = require('@rollup/plugin-node-resolve').default

// Filter external dependencies
const root = process.platform === 'win32' ? path.resolve('/') : '/'
const external = (id) => !id.startsWith('.') && !id.startsWith(root)

// Configure plugins
const plugins = [
  commonjs(),
  babel({ babelHelpers: 'bundled' }),
  resolve({ extensions: ['.js', '.jsx'] }),
  {
    name: 'patch-targets',
    generateBundle({ file }) {
      // Create target folders
      const target = file.replace(/\/index.c?js$/, '')
      const outputDir = path.resolve(process.cwd(), target)
      fs.mkdirSync(outputDir, { recursive: true })

      switch (target) {
        case 'dist': {
          // Copy files
          ;['LICENSE', 'README.md', 'package.json'].forEach((file) => {
            fs.copyFileSync(
              path.resolve(process.cwd(), file),
              path.resolve(process.cwd(), 'dist', file),
            )
          })
        }
        default: {
          // Create a package.json for each target with main and module resolutions
          fs.writeFileSync(
            path.resolve(outputDir, 'package.json'),
            JSON.stringify(
              {
                sideEffects: 'false',
                main: './index.cjs',
                module: './index.js',
              },
              null,
              2,
            ),
          )
        }
      }
    },
  },
]

// Traverse targets
const targets = fs.readdirSync(path.resolve(process.cwd(), 'src')).reduce(
  (acc, fileName) => {
    const isFolder = !fileName.includes('.')
    if (isFolder) acc.push(`${fileName}/index`)

    return acc
  },
  ['index'],
)

// Export targets
module.exports = targets.flatMap((target) => [
  {
    input: `./src/${target}.js`,
    output: { file: `dist/${target}.js`, format: 'esm' },
    external,
    plugins,
  },
  {
    input: `./src/${target}.js`,
    output: { file: `dist/${target}.cjs`, format: 'cjs' },
    external,
    plugins,
  },
])
