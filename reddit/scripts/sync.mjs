// Copies the Willowvale game (one folder up) into this Reddit app's public/ folder, so the web game
// stays the single source. Run automatically by `npm run build`.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const here = dirname(dirname(fileURLToPath(import.meta.url)))
const src = join(here, '..', 'public')
const out = join(here, 'public')
if (!existsSync(join(src, 'app.js')))
  throw Error(`Willowvale game not found at ${src}`)

rmSync(join(out, 'js'), {recursive: true, force: true})
cpSync(join(src, 'js'), join(out, 'js'), {recursive: true})
cpSync(join(src, 'app.js'), join(out, 'app.js'))
cpSync(join(src, 'style.css'), join(out, 'style.css'))
cpSync(join(src, 'app-icon.svg'), join(out, 'app-icon.svg'))

// Fonts are bundled: Reddit posts can't load Google Fonts.
mkdirSync(join(out, 'fonts'), {recursive: true})
const faces = []
for (const [family, pkg] of [
  ['Baloo 2', 'baloo-2'],
  ['Nunito', 'nunito'],
]) {
  for (const w of [600, 700, 800]) {
    const file = `${pkg}-latin-${w}-normal.woff2`
    cpSync(
      join(here, 'node_modules', '@fontsource', pkg, 'files', file),
      join(out, 'fonts', file),
    )
    faces.push(
      `@font-face{font-family:"${family}";font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${file}) format("woff2")}`,
    )
  }
}
writeFileSync(join(out, 'fonts.css'), `${faces.join('\n')}\n`)

// The game page: Willowvale's index.html with local fonts and the Reddit bridge loaded first.
let html = readFileSync(join(src, 'index.html'), 'utf8')
html = html
  .replace(/<link rel="manifest"[^>]*>\n?/, '')
  .replace(/<link rel="preconnect"[^>]*>\n?/g, '')
  .replace(
    /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/,
    '<link rel="stylesheet" href="fonts.css">',
  )
  .replace(
    /<script type="module" src="app\.js[^"]*"><\/script>/,
    '<script type="module" src="bridge.js"></script>\n<script type="module" src="app.js"></script>',
  )
  .replace(/style\.css\?v=[^"]*/, 'style.css')
if (!html.includes('bridge.js'))
  throw Error('could not add the Reddit bridge to the game page')
writeFileSync(join(out, 'game.html'), html)
console.log('synced Willowvale into public/')
