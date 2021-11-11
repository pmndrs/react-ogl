#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const package = require('./package.json')

// Base package.json keys
const PACKAGE_TEMPLATE = {
  types: './index.d.ts',
  module: './index.js',
}

// Add package.json with updated resolution fields
fs.writeFileSync(
  path.resolve(process.cwd(), 'dist/package.json'),
  JSON.stringify(
    {
      ...package,
      ...PACKAGE_TEMPLATE,
    },
    null,
    2,
  ),
)

// Traverse targets and create a package.json for each target with resolution fields
fs.readdirSync(path.resolve(process.cwd(), 'src')).forEach((name) => {
  const isFolder = !name.includes('.')

  if (isFolder) {
    const target = path.resolve(`dist/${name}/package.json`)
    fs.writeFileSync(target, JSON.stringify(PACKAGE_TEMPLATE, null, 2))
  }
})

// Copy files
;['LICENSE', 'README.md'].forEach((file) => {
  fs.copyFileSync(path.resolve(process.cwd(), file), path.resolve(process.cwd(), `dist/${file}`))
})
