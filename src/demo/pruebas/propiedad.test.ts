/* Pruebas de los datos de la propiedad de la demo.

   Las fotos pendientes se muestran como un placeholder con su descripcion, y
   esa descripcion es tambien la indicacion para generarlas. Una foto pendiente
   sin descripcion seria un recuadro vacio que no dice nada, delante de un
   propietario que esta evaluando si comprar. */

import { test, expect } from 'vitest'
import { PROPIEDAD } from '../propiedad'

test('la demo tiene una o dos fotos, ni cero ni mas', () => {
  // El diseño reserva lugar para una o dos; una tercera no se mostraria.
  expect(PROPIEDAD.fotos.length).toBeGreaterThanOrEqual(1)
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
