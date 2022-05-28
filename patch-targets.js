#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const package = require('./package.json')

// Add package.json with updated resolution fields
delete package.files
fs.writeFileSync(
  path.resolve(process.cwd(), 'dist/package.json'),
  JSON.stringify(
    {
      ...package,
      types: './index.d.ts',
      module: './index.mjs',
      type: 'module',
    },
    null,
    2,
  ),
)

// .js => .mjs
const crawl = (dirPath) =>
  fs.readdirSync(dirPath).flatMap((fileName) => {
    const filePath = path.resolve(dirPath, fileName)
    return fs.lstatSync(filePath).isDirectory() ? crawl(filePath) : filePath
  })

crawl(path.resolve(process.cwd(), 'dist')).forEach((file) => {
  if (file.endsWith('.js')) {
    fs.writeFileSync(file.replace(/\.js$/, '.mjs'), fs.readFileSync(file))
    fs.unlinkSync(file)
  }
})

// Copy files
;['LICENSE', 'README.md'].forEach((file) => {
  fs.copyFileSync(path.resolve(process.cwd(), file), path.resolve(process.cwd(), `dist/${file}`))
})
