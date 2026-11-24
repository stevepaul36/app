// Remove build output. Cross-platform replacement for `rm -rf`, which fails on Windows.
import {readdirSync, rmSync} from 'node:fs'

rmSync('dist', {recursive: true, force: true})
for (const name of readdirSync('public'))
  if (/^(splash|bridge)\.js/.test(name)) rmSync(`public/${name}`, {force: true})
