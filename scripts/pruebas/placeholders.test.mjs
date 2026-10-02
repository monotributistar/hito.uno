/* Pruebas del buscador de PLACEHOLDER.

   Lo que importa es que no frene de mas (una palabra en minuscula, un
   documento que explica la regla, esta misma prueba) ni de menos (una marca en
   un HTML de entrada, que no vive en src/). Se arma un proyecto de mentira en
   una carpeta temporal para probar el alcance de verdad. */

import { test, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { archivosDelAlcance, buscarMarcas, esPrueba, marcasEn, vaAMain } from '../placeholders.mjs'

let raiz

function escribir(ruta, contenido) {
  const completa = join(raiz, ruta)
  mkdirSync(dirname(completa), { recursive: true })
  writeFileSync(completa, contenido)
}

beforeAll(() => {
  raiz = mkdtempSync(join(tmpdir(), 'hito-placeholders-'))
  escribir('vite.config.ts', "input: { demo: resolve(__dirname, 'demo/x/index.html') }")
  escribir('demo/x/index.html', '<title>Demo</title>\n<!-- PLACEHOLDER: titulo sin definir -->')
  escribir('src/a.ts', "const nombre = 'Casa' // PLACEHOLDER: sin confirmar\nconst ok = 1")
  escribir('src/b.ts', '// esto no es un placeholder, es una aclaracion\n// Placeholder tampoco')
  escribir('src/pruebas/c.test.ts', "expect(texto).toContain('PLACEHOLDER')")
  escribir('src/d.test.ts', "// PLACEHOLDER dentro de una prueba")
  escribir('worker/e.ts', 'const x = 1\nconst y = 2\n/* PLACEHOLDER */')
  escribir('public/f.css', '.x { color: red }')
  escribir('docs/REGLA.md', 'Marcá cada placeholder con PLACEHOLDER.')
  escribir('scripts/g.mjs', '// PLACEHOLDER en una herramienta, no se despliega')
})

afterAll(() => rmSync(raiz, { recursive: true, force: true }))

test('solo cuenta la palabra exacta, en mayusculas', () => {
  expect(buscarMarcas('// PLACEHOLDER: algo')).toHaveLength(1)
  expect(buscarMarcas('// no es un placeholder')).toHaveLength(0)
  expect(buscarMarcas('// Placeholder')).toHaveLength(0)
  // Palabra entera: un identificador que la contiene no es la marca.
  expect(buscarMarcas('const PLACEHOLDERS_VIEJOS = []')).toHaveLength(0)
})

test('dice la linea exacta de cada marca', () => {
  expect(buscarMarcas('a\nb\r\n// PLACEHOLDER\nc')).toEqual([{ linea: 3, texto: '// PLACEHOLDER' }])
})

test('reconoce los archivos de prueba', () => {
  expect(esPrueba('src/demo/pruebas/validar.test.ts')).toBe(true)
  expect(esPrueba('src/demo/algo.test.ts')).toBe(true)
  expect(esPrueba('src/demo/validar.ts')).toBe(false)
})

test('el alcance es src, public, worker y los HTML de entrada; sin docs, scripts ni pruebas', () => {
  expect(archivosDelAlcance(raiz)).toEqual([
    'demo/x/index.html',
    'public/f.css',
    'src/a.ts',
    'src/b.ts',
    'worker/e.ts',
  ])
})

test('encuentra cada marca con archivo y linea', () => {
  expect(marcasEn(raiz).map((m) => `${m.archivo}:${m.linea}`)).toEqual([
    'demo/x/index.html:2',
    'src/a.ts:1',
    'worker/e.ts:3',
  ])
})

test('frena solo cuando el PR va a main', () => {
  expect(vaAMain({ GITHUB_BASE_REF: 'main' }, [])).toBe(true)
  expect(vaAMain({ GITHUB_BASE_REF: 'dev' }, [])).toBe(false)
  expect(vaAMain({}, [])).toBe(false)
  expect(vaAMain({}, ['--destino=main'])).toBe(true)
})
