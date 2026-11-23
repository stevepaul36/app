// Rebuild client and server on change. Cross-platform replacement for the old
// `sh -c 'trap ... &'` watcher, which needed a POSIX shell and failed on Windows.
import {spawn} from 'node:child_process'

// One fixed command string with shell: true finds npm on every OS (npm.cmd on
// Windows) without Node's DEP0190 warning about unescaped args.
const children = ['build:client', 'build:server'].map(script =>
  spawn(`npm run ${script} -- --watch=forever`, {
    stdio: 'inherit',
    shell: true,
  }),
)

const stopAll = () => {
  for (const child of children) child.kill()
}
for (const child of children) {
  child.on('exit', code => {
    stopAll()
    process.exit(code ?? 0)
  })
}
process.on('SIGINT', stopAll)
process.on('SIGTERM', stopAll)
