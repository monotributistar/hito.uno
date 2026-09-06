#!/usr/bin/env node
/**
 * Verifica que no queden restos del versionado viejo (v01/v02) y que todas
 * las rutas declaradas apunten a archivos que existen.
 *
 * Nace de la unificacion de las tres landings: el compilador valida los
 * imports de TypeScript, pero no ve las rutas que viven dentro de strings
 * (el src de un <script>, las fotos de landing-data.ts). Una foto declarada
 * que no existe compila y buildea sin una sola queja: simplemente no carga.
 *
 * Uso: node scripts/check-paths.mjs
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const errores = []
const avisos = []

/** Archivos de texto del proyecto, sin node_modules/dist/binarios. */
function archivosDeTexto(dir, acc = []) {
  const ignorar = new Set(['node_modules', 'dist', '.git', '.wrangler', 'public'])
  const extsTexto = new Set(['.ts', '.tsx', '.js', '.mjs', '.css', '.html', '.json', '.jsonc', '.yml', '.yaml', '.md'])

  for (const entrada of readdirSync(dir)) {
    if (ignorar.has(entrada)) continue
    const ruta = join(dir, entrada)
    if (statSync(ruta).isDirectory()) archivosDeTexto(ruta, acc)
    else if (extsTexto.has(extname(entrada))) acc.push(ruta)
  }
  return acc
}

// 1 · Fosiles del versionado -------------------------------------------------
// Las landings v01/v02 se unificaron en src/landing. Cualquier referencia que
// sobreviva apunta a algo que ya no existe.
const FOSILES = [/\bv0[12]\b/i, /LandingV0[12]/, /ExperienceStory/, /main-v0[12]/]

for (const archivo of archivosDeTexto('.')) {
  // package-lock tiene hashes que dan falsos positivos; docs/ es historico.
  if (archivo.includes('package-lock.json')) continue
  if (archivo.includes('check-paths.mjs')) continue

  const lineas = readFileSync(archivo, 'utf8').split('\n')
  lineas.forEach((linea, i) => {
    for (const patron of FOSILES) {
      if (!patron.test(linea)) continue
      const donde = `${archivo}:${i + 1}`
      // En markdown el versionado suele ser prosa que explica por que ya no
      // existe (el README cuenta la historia de v01/v02). Eso no es una ruta
      // que se ejecute: avisa nomas. En codigo y config, si es error.
      if (extname(archivo) === '.md') avisos.push(`${donde} — ${linea.trim().slice(0, 90)}`)
      else errores.push(`${donde} — resto de versionado: ${linea.trim().slice(0, 90)}`)
      break
    }
  })
}

// 2 · Los <script src> de cada HTML apuntan a un archivo real ----------------
function htmlsDelProyecto(dir, acc = []) {
  const ignorar = new Set(['node_modules', 'dist', '.git', '.wrangler'])
  for (const entrada of readdirSync(dir)) {
    if (ignorar.has(entrada)) continue
    const ruta = join(dir, entrada)
    if (statSync(ruta).isDirectory()) htmlsDelProyecto(ruta, acc)
    else if (entrada.endsWith('.html')) acc.push(ruta)
  }
  return acc
}

for (const html of htmlsDelProyecto('.')) {
  const contenido = readFileSync(html, 'utf8')
  for (const m of contenido.matchAll(/<script[^>]+src="(\/[^"]+)"/g)) {
    const destino = m[1].replace(/^\//, '')
    if (!existsSync(destino)) errores.push(`${html} — el script apunta a ${m[1]}, que no existe`)
  }
}

// 3 · Las entradas de vite.config apuntan a HTML que existen -----------------
const vite = readFileSync('vite.config.ts', 'utf8')
for (const m of vite.matchAll(/resolve\(__dirname,\s*'([^']+)'\)/g)) {
  if (!existsSync(m[1])) errores.push(`vite.config.ts — entrada de build inexistente: ${m[1]}`)
}

// 4 · Cada foto declarada existe en public/ ----------------------------------
// Este es el que mas rinde: una ruta mal escrita no rompe el build, solo deja
// un hueco en el carrusel que nadie nota hasta que lo ve un cliente.
const datos = readFileSync('src/landing/landing-data.ts', 'utf8')
let fotos = 0
for (const m of datos.matchAll(/src:\s*'(\/images\/[^']+)'/g)) {
  fotos++
  const destino = join('public', m[1])
  if (!existsSync(destino)) errores.push(`landing-data.ts — foto declarada que no existe: ${m[1]}`)
}

// 5 · Fotos huerfanas: estan en public/ pero nadie las declara ---------------
function fotosEnDisco(dir, acc = []) {
  if (!existsSync(dir)) return acc
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada)
    if (statSync(ruta).isDirectory()) fotosEnDisco(ruta, acc)
    else if (/\.(webp|jpg|jpeg|png)$/i.test(entrada)) acc.push(ruta)
  }
  return acc
}

for (const foto of fotosEnDisco(join('public', 'images', 'products'))) {
  const rutaWeb = '/' + foto.replace(/\\/g, '/').replace(/^public\//, '')
  if (!datos.includes(rutaWeb)) avisos.push(`foto sin usar en el carrusel: ${rutaWeb}`)
}

// Resultado ------------------------------------------------------------------
if (avisos.length) {
  console.log(`\nAvisos (${avisos.length}) — no frenan el build:`)
  for (const a of avisos) console.log(`  · ${a}`)
}

if (errores.length) {
  console.error(`\nFallo: ${errores.length} problema(s) de rutas\n`)
  for (const e of errores) console.error(`  ✗ ${e}`)
  console.error('')
  process.exit(1)
}

console.log(`\n✓ Rutas OK — ${fotos} fotos declaradas, todas existen. Sin restos de versionado.\n`)
