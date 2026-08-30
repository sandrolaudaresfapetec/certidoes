#!/usr/bin/env node

const { spawn } = require('node:child_process')

const env = { ...process.env }

// Migrations NAO rodam mais aqui — sao executadas pelo release_command do
// fly.toml (VM de release descartavel, antes do deploy entrar no ar).
// Para comandos pontuais (ex.: db push), use scripts/fly-db-push.sh.
;(async () => {
  await exec(process.argv.slice(2).join(' '))
})()

function exec(command) {
  const child = spawn(command, { shell: true, stdio: 'inherit', env })
  return new Promise((resolve, reject) => {
    child.on('exit', code => {
      if (code === 0) { resolve() } else { reject(new Error(`${command} failed rc=${code}`)) }
    })
  })
}
