import fs from 'fs'
import path from 'path'
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import { devDependencies, dependencies, peerDependencies } from './package.json'

const external = Object.keys({ ...devDependencies, ...dependencies, ...peerDependencies })
const plugins = [
  commonjs(),
  babel({ babelHelpers: 'bundled' }),
  resolve({ extensions: ['.js', '.jsx'] }),
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
export default targets.flatMap((target) => [
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
