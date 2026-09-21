/**
 * Busqueda de la marca PLACEHOLDER en el codigo que se despliega.
 *
 * Regla de Stephano (2026-09-21): lo que todavia no se sabe va como
 * placeholder, marcado con la palabra PLACEHOLDER en mayusculas, y un
 * placeholder NO va a produccion: se queda en dev hasta que se resuelva. Esta
 * pieza hace que esa regla no dependa de que alguien se acuerde de un grep
 * antes del pase a main.
 *
 * Aca solo esta la logica, en funciones puras (probadas en
 * scripts/pruebas/placeholders.test.mjs). Quien decide si frena o solo avisa
 * es scripts/check-placeholders.mjs.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, extname, relative, sep } from 'node:path'

/** Sensible a mayusculas y palabra entera: "no es un placeholder" en un
    comentario no cuenta, ni tampoco un nombre como PLACEHOLDERS_X. */
const MARCA = /\bPLACEHOLDER\b/

/** Donde se busca: lo que se sirve o se ejecuta en produccion. docs/ queda
    afuera a proposito: ahi la marca aparece para documentar la regla. */
export const CARPETAS = ['src', 'public', 'worker']

const TEXTO = new Set(['.ts', '.tsx', '.js', '.mjs', '.jsx', '.css', '.html', '.json', '.svg', '.txt', '.webmanifest'])
const IGNORAR = new Set(['node_modules', 'dist', '.wrangler', '.git'])

/** Renglones con la marca: [{ linea, texto }], con numero de linea desde 1. */
export function buscarMarcas(contenido) {
  const hallazgos = []
  contenido.split(/\r?\n/).forEach((texto, i) => {
    if (MARCA.test(texto)) hallazgos.push({ linea: i + 1, texto: texto.trim() })
  })
  return hallazgos
}

/** Los archivos de prueba se saltean: una prueba de este mismo check tiene que
    poder nombrar la marca sin frenar el pase. */
export function esPrueba(ruta) {
  const partes = ruta.split(/[\\/]/)
  return partes.includes('pruebas') || /\.test\.[a-z]+$/.test(ruta)
}

function recorrer(dir, acc) {
  if (!existsSync(dir)) return acc
  for (const entrada of readdirSync(dir)) {
    if (IGNORAR.has(entrada)) continue
    const ruta = join(dir, entrada)
    if (statSync(ruta).isDirectory()) recorrer(ruta, acc)
    else if (TEXTO.has(extname(entrada))) acc.push(ruta)
  }
  return acc
}

/** Los HTML de entrada, deducidos de vite.config.ts como hace check-paths:
    cuando se agregue una pagina, entra sola. */
export function entradasHtml(raiz) {
  const vite = join(raiz, 'vite.config.ts')
  if (!existsSync(vite)) return []
  const texto = readFileSync(vite, 'utf8')
  return [...texto.matchAll(/resolve\(__dirname,\s*'([^']+\.html)'\)/g)]
    .map((m) => join(raiz, m[1]))
    .filter((ruta) => existsSync(ruta))
}

/** Todos los archivos del alcance, sin pruebas, con rutas relativas a la raiz. */
export function archivosDelAlcance(raiz) {
  const todos = [...CARPETAS.flatMap((c) => recorrer(join(raiz, c), [])), ...entradasHtml(raiz)]
  return [...new Set(todos)]
    .map((ruta) => relative(raiz, ruta).split(sep).join('/'))
    .filter((ruta) => !esPrueba(ruta))
    .sort()
}

/** Cada marca encontrada: [{ archivo, linea, texto }]. */
export function marcasEn(raiz) {
  return archivosDelAlcance(raiz).flatMap((archivo) =>
    buscarMarcas(readFileSync(join(raiz, archivo), 'utf8')).map((h) => ({ archivo, ...h })),
  )
}

/** El PR va a main? GitHub deja la rama destino en GITHUB_BASE_REF en los
    pull_request. `--destino=main` permite probarlo a mano. */
export function vaAMain(env, argv) {
  return env.GITHUB_BASE_REF === 'main' || argv.includes('--destino=main')
}
