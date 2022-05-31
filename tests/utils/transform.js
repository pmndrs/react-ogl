const SWC = require('@swc/core')

/**
 * Returns true if filename ends with mjs, js/jsx, ts/jsx, etc.
 */
const isModule = (filename) => /\.(mjs|cjs|jsx?|tsx?)$/.test(filename)

module.exports = {
  process(src, filename) {
    // Don't transpile non-modules
    if (!isModule(filename)) return src

    return SWC.transformSync(src, {
      filename,
      module: {
        type: 'commonjs',
      },
      jsc: {
        transform: {
          hidden: {
            jest: true,
          },
        },
        parser: {
          syntax: 'typescript',
          tsx: true,
          dynamicImport: true,
        },
        target: 'es2016',
      },
      env: {
        targets: '> 1%, not dead, not ie 11, not op_mini all',
      },
    })
  },
}
