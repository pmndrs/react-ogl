#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const package = require('./package.json')

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

// Traverse targets
const targets = fs.readdirSync(path.resolve(process.cwd(), 'src')).reduce((acc, name) => {
  if (!name.includes('.')) {
    acc.push(path.resolve(`dist/${name}`))
  }

  return acc
}, [])

// Create a package.json for each target with resolution fields
targets.forEach((target) => {
  fs.writeFileSync(path.resolve(target, 'package.json'), JSON.stringify(PACKAGE_TEMPLATE, null, 2))
})

// Copy files
;['LICENSE', 'README.md'].forEach((file) => {
  fs.copyFileSync(path.resolve(process.cwd(), file), path.resolve(process.cwd(), 'dist', file))
})
