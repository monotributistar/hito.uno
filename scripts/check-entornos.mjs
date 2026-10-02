#!/usr/bin/env node
/**
 * Valida la configuracion de LOS DOS entornos del Worker.
 *
 * Antes, `npm run check` corria un solo `wrangler deploy --dry-run --env=""`:
 * validaba produccion y nada mas. Un error en el bloque `env.dev` de
 * wrangler.jsonc (un nombre mal escrito, una variable que falta) pasaba la
 * validacion de GitHub sin una queja y explotaba recien en el deploy, despues
 * del merge, cuando ya estaba en dev.hito.uno.
 *
 * Y hay una variable que no puede fallar en silencio: REENVIO_CONSULTAS.
 * Produccion la declara en "on" y es lo unico que hace que una consulta del
 * formulario llegue a la planilla; dev la declara en "off" para que las
 * pruebas no ensucien la planilla real. Si alguien borra la de produccion, las
 * consultas se siguen guardando en el almacen pero no las ve nadie —hoy no hay
 * ninguna ruta que lea `pendingLeads`—, o sea que volvemos a las semanas sin
 * una sola consulta y sin enterarnos. Si alguien pone dev en "on", una prueba
 * de carga escribe en la planilla donde miramos los pedidos de verdad.
 * Ninguna de las dos cosas se nota mirando: por eso se verifican aca.
 *
 * Se valida sobre la salida de wrangler y no leyendo wrangler.jsonc a mano
 * porque el archivo tiene comentarios y herencia entre entornos: lo que
 * importa no es lo que dice el archivo sino con que variables queda cada
 * entorno, y eso lo resuelve wrangler.
 *
 * Uso: node scripts/check-entornos.mjs   (necesita `dist/`: corre el build antes)
 */

import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

/** Lo que cada entorno tiene que declarar. */
const ENTORNOS = [
  {
    nombre: 'produccion',
    args: ['--env='],
    env: undefined,
    variables: { REENVIO_CONSULTAS: 'on' },
    porque:
      'sin REENVIO_CONSULTAS="on" el formulario guarda la consulta pero no la manda a la planilla, y hoy nadie lee las guardadas',
    /* Secretos que el entorno tiene que declarar como requeridos. Declararlo
       hace que Cloudflare rechace el deploy si el secreto no esta cargado, que
       es la unica verificacion que sabe si esta de verdad: este script no tiene
       acceso a la cuenta. Lo que se cuida aca es que nadie borre la declaracion. */
    secretos: ['APPS_SCRIPT_URL'],
    porqueSecretos:
      'sin declararlo, Cloudflare despliega aunque el secreto no este cargado, y las consultas dejan de llegar a la planilla sin que nadie lo note',
  },
  {
    nombre: 'dev',
    args: ['--env', 'dev'],
    env: 'dev',
    variables: { REENVIO_CONSULTAS: 'off' },
    porque:
      'con REENVIO_CONSULTAS distinto de "off", una prueba en dev.hito.uno escribe en la planilla real',
    secretos: [],
    porqueSecretos: '',
  },
]

const errores = []

/* Se llama al wrangler instalado, con node, y no a `npx`: en Windows npx es un
   .cmd y desde Node 20 spawnSync se niega a ejecutarlo sin shell (EINVAL). Con
   la ruta del paquete anda igual en Windows, Linux y en la validacion de
   GitHub, y encima usa la version del lockfile y no la que baje npx. */
const require = createRequire(import.meta.url)
const wrangler = join(dirname(require.resolve('wrangler/package.json')), 'bin', 'wrangler.js')

/* Los secretos requeridos no aparecen en la salida del dry-run, asi que se
   leen con el lector de configuracion de wrangler, que resuelve cada entorno
   igual que el deploy (herencia incluida). Es una API "unstable": si una
   version nueva la cambia, este check falla con un mensaje claro en vez de
   pasar en silencio. */
const { unstable_readConfig } = require('wrangler')
function secretosRequeridos(env) {
  if (typeof unstable_readConfig !== 'function') {
    throw new Error('wrangler ya no exporta unstable_readConfig: hay que actualizar scripts/check-entornos.mjs')
  }
  const config = unstable_readConfig({ config: 'wrangler.jsonc', env }, { hideWarnings: true })
  return config.secrets?.required ?? []
}

for (const entorno of ENTORNOS) {
  const proceso = spawnSync(
    process.execPath,
    [wrangler, 'deploy', '--dry-run', ...entorno.args],
    { encoding: 'utf8' },
  )

  if (proceso.error) {
    errores.push(`no se pudo correr wrangler para ${entorno.nombre}: ${proceso.error.message}`)
    continue
  }

  // wrangler escribe la tabla de bindings en stdout y los avisos en stderr.
  const salida = `${proceso.stdout ?? ''}${proceso.stderr ?? ''}`

  if (proceso.status !== 0) {
    errores.push(
      `la configuracion de ${entorno.nombre} no valida (wrangler salio con ${proceso.status}):\n${salida.trim()}`,
    )
    continue
  }

  /* La tabla de wrangler imprime cada variable como:
       env.REENVIO_CONSULTAS ("on")        Environment Variable
     Buscamos ese renglon, que es el valor con el que el entorno queda
     desplegado, herencia incluida. */
  for (const [variable, esperado] of Object.entries(entorno.variables)) {
    const renglon = salida.match(new RegExp(`env\\.${variable} \\("([^"]*)"\\)`))
    if (!renglon) {
      errores.push(
        `${entorno.nombre} no declara ${variable}: ${entorno.porque}. Se arregla en el bloque de ese entorno en wrangler.jsonc.`,
      )
    } else if (renglon[1] !== esperado) {
      errores.push(
        `${entorno.nombre} tiene ${variable}="${renglon[1]}" y tiene que ser "${esperado}": ${entorno.porque}.`,
      )
    }
  }

  try {
    const declarados = secretosRequeridos(entorno.env)
    for (const secreto of entorno.secretos) {
      if (!declarados.includes(secreto)) {
        errores.push(
          `${entorno.nombre} no declara ${secreto} en "secrets.required": ${entorno.porqueSecretos}. Se arregla en wrangler.jsonc.`,
        )
      }
    }
  } catch (err) {
    errores.push(`no se pudieron leer los secretos de ${entorno.nombre}: ${err.message}`)
  }

  console.log(`  · ${entorno.nombre}: configuracion valida`)
}

if (errores.length) {
  console.error(`\nFallo: ${errores.length} problema(s) de configuracion de entornos\n`)
  for (const e of errores) console.error(`  ✗ ${e}`)
  console.error('')
  process.exit(1)
}

console.log(`\n✓ Entornos OK — ${ENTORNOS.length} entornos validados con sus variables.\n`)
