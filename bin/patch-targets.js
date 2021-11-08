const path = require('path')
const fs = require('fs')
const { targets } = require('../rollup.config')

// Create a package.json for each target with main and module resolutions
targets.forEach((target) => {
  fs.writeFileSync(
    path.resolve(process.cwd(), 'dist', target.replace('/index', ''), 'package.json'),
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
})

// Copy files
;['LICENSE', 'README.md', 'package.json'].forEach((file) => {
  fs.copyFileSync(
    path.resolve(process.cwd(), file),
    path.resolve(process.cwd(), 'dist', file),
  )
})
