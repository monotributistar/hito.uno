/* Pruebas de los datos de la propiedad de la demo.

   Las fotos pendientes se muestran como un placeholder con su descripcion, y
   esa descripcion es tambien la indicacion para generarlas. Una foto pendiente
   sin descripcion seria un recuadro vacio que no dice nada, delante de un
   propietario que esta evaluando si comprar. */

import { test, expect } from 'vitest'
import { PROPIEDAD } from '../propiedad'

test('la demo no muestra mas de dos fotos', () => {
  /* El diseño reserva lugar para una o dos; una tercera no se mostraria.
     Cero esta permitido desde el 2026-10-02: la demo salio a produccion sin
     fotos de la casa inventada, porque lo que vende es el formulario y lo que
     le llega al propietario, no la casa. */
  expect(PROPIEDAD.fotos.length).toBeLessThanOrEqual(2)
})

test('cada foto dice que muestra, este o no la imagen', () => {
  for (const foto of PROPIEDAD.fotos) {
    expect(foto.descripcion.trim().length, 'una foto sin descripcion').toBeGreaterThan(10)
    expect(foto.alt.trim(), 'una foto sin texto alternativo').not.toBe('')
  }
})

test('una foto con imagen apunta a un archivo del sitio', () => {
  for (const foto of PROPIEDAD.fotos.filter((f) => f.src)) {
    expect(foto.src, 'la ruta tiene que empezar con /images/').toMatch(/^\/images\//)
  }
})
