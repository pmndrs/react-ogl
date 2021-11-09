const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

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

  // Generate ts files / commonjs entrypoint
  await run('tsc')

  // Copy files
  ;['LICENSE', 'README.md', 'package.json'].forEach((file) => {
    fs.copyFileSync(path.resolve(process.cwd(), file), path.resolve(process.cwd(), 'dist', file))
  })

  // Traverse targets
  const targets = fs
    .readdirSync(path.resolve(process.cwd(), 'src'))
    .filter((fileName) => !fileName.includes('.'))
    .map((folder) => path.resolve(`dist/${folder}`))

  // Create a package.json for each target with resolution fields
  targets.forEach((target) => {
    fs.writeFileSync(
      path.resolve(target, 'package.json'),
      JSON.stringify(
        {
          types: './index.d.ts',
          main: './index.cjs',
          module: './index.js',
        },
        null,
        2,
      ),
    )
  })

  // Rename commonjs .js => .cjs
  ;['dist', ...targets].forEach((target) => {
    fs.readdirSync(target).forEach((file) => {
      if (!file.endsWith('.js')) return

      const filePath = path.resolve(target, file)
      fs.renameSync(filePath, filePath.replace('.js', '.cjs'))
    })
  })

  // Generate module build
  await run('babel src -d dist --extensions .ts,.tsx')
})()
