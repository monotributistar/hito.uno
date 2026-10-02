#!/usr/bin/env node
/**
 * Frena el pase a produccion si queda algun PLACEHOLDER.
 *
 * - En un PR hacia main (GitHub deja GITHUB_BASE_REF=main): si hay marcas,
 *   FALLA y lista archivo y linea de cada una.
 * - En cualquier otro caso (PRs a dev, npm run check en una maquina): solo
 *   AVISA. Un placeholder en dev es lo esperado: es justamente donde se queda
 *   mientras se resuelve, y no puede frenar el trabajo de todos los dias.
 *
 * Probar a mano como si fuera el pase: node scripts/check-placeholders.mjs --destino=main
 *
 * Ojo: main no tiene proteccion de rama en GitHub, asi que una validacion en
 * rojo no impide mergear. Esto avisa; respetarlo sigue siendo un acuerdo.
 */

import { marcasEn, vaAMain } from './placeholders.mjs'

const marcas = marcasEn('.')
const aMain = vaAMain(process.env, process.argv.slice(2))

const lista = () => {
  for (const m of marcas) console.log(`  · ${m.archivo}:${m.linea} — ${m.texto.slice(0, 100)}`)
}

if (!marcas.length) {
  console.log('\n✓ Placeholders — ninguno en el codigo que se despliega.\n')
} else if (aMain) {
  console.error(`\nFallo: ${marcas.length} PLACEHOLDER en un pase a produccion. Un placeholder no va a main:`)
  console.error('se resuelve o se saca antes de mergear (regla del 2026-09-21).\n')
  for (const m of marcas) console.error(`  ✗ ${m.archivo}:${m.linea} — ${m.texto.slice(0, 100)}`)
  console.error('')
  process.exit(1)
} else {
  console.log(`\nAvisos — ${marcas.length} PLACEHOLDER en el codigo. En dev esta bien; en el pase a main frenan:`)
  lista()
  console.log('')
}
