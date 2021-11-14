const fs = require('fs')
const path = require('path')
const { transformSync } = require('@swc/core')

/**
 * Returns true if filename ends with mjs, js/jsx, ts/jsx, etc.
 */
const isModule = (filename) => /\.m?[jt]sx?$/.test(filename)

module.exports = {
  process(src, filename) {
    // Don't transpile non-modules
    if (!isModule(filename)) return src

    // Get project config
    const swcrc = path.join(process.cwd(), '.swcrc')
    const options = JSON.parse(fs.readFileSync(swcrc, 'utf-8'))

    // Set Jest overrides
    options.module = { type: 'commonjs' }
    options.jsc.transform = { hidden: { jest: true } }

    return transformSync(src, { ...options, filename })
  },
}
