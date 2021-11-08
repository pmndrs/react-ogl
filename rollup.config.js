const fs = require('fs')
const path = require('path')
const babel = require('@rollup/plugin-babel').default
const commonjs = require('@rollup/plugin-commonjs')
const resolve = require('@rollup/plugin-node-resolve').default
const { devDependencies, dependencies, peerDependencies } = require('./package.json')

const external = Object.keys({ ...devDependencies, ...dependencies, ...peerDependencies })
const plugins = [
  commonjs(),
  babel({ babelHelpers: 'bundled' }),
  resolve({ extensions: ['.js', '.jsx'] }),
]

// Traverse targets
const targets = fs
  .readdirSync(path.resolve(process.cwd(), 'src'))
  .reduce((acc, fileName) => {
    const isFolder = !fileName.includes('.')
    if (isFolder) acc.push(fileName)

    return acc
  }, [])

// Export targets
module.exports = ['index', ...targets.map((target) => `${target}/index`)].flatMap(
  (target) => [
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
  ],
)
module.exports.targets = targets
