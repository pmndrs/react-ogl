const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const package = require('./package.json')

/**
 * Runs a CLI script, returning a promise.
 */
const run = async (command) =>
  new Promise((resolve, reject) =>
    exec(command, (error, stdout, stderror) => {
      if (error) return reject(error.message)
      if (stderror) return reject(stderror)

      return resolve(stdout)
    }),
  )

;(async () => {
  // Purge prev build
  await run('rimraf dist')

  // Generate js files
  await run('babel src -d dist --extensions .ts,.tsx')

  // Generate ts files
  await run('tsc')

  // Copy files
  ;['LICENSE', 'README.md'].forEach((file) => {
    fs.copyFileSync(path.resolve(process.cwd(), file), path.resolve(process.cwd(), 'dist', file))
  })

  // Add package.json with updated resolution fields
  fs.writeFileSync(
    path.resolve(process.cwd(), 'dist/package.json'),
    JSON.stringify(
      {
        ...package,
        types: './index.d.ts',
        module: './index.js',
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
    fs.writeFileSync(
      path.resolve(target, 'package.json'),
      JSON.stringify(
        {
          types: './index.d.ts',
          module: './index.js',
        },
        null,
        2,
      ),
    )
  })
})()
