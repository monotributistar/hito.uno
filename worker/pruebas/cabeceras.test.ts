/* Pruebas de las cabeceras de seguridad y del paso a HTTPS.

   Cada una cuida una decision, no una regla de manual:

   - que las cabeceras salgan en TODAS las respuestas, incluidas las que no son
     HTML (el vCard, las redirecciones de los objetos, los errores de la API),
     porque la gracia de ponerlas en un solo lugar es esa;
   - que NO pisen lo que la respuesta ya traia, que es como se romperia el
     vCard o el `no-store` de un puerto reapuntado;
   - que no se cuele una CSP completa sin querer: aca solo va `frame-ancestors`,
     el resto rompe la pagina en silencio (ver worker/cabeceras.ts). */

import { test, expect } from 'vitest'
import { conCabeceras } from '../cabeceras'

test('una respuesta normal sale con las cuatro cabeceras', () => {
  const r = conCabeceras(new Response('hola'), true)
  expect(r.headers.get('X-Content-Type-Options')).toBe('nosniff')
  expect(r.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
  expect(r.headers.get('X-Frame-Options')).toBe('DENY')
  expect(r.headers.get('Content-Security-Policy')).toBe("frame-ancestors 'none'")
  expect(r.headers.get('Strict-Transport-Security')).toBe('max-age=15552000')
})

test('el cuerpo y el estado no cambian', async () => {
  const r = conCabeceras(new Response('contenido', { status: 404 }), true)
  expect(r.status).toBe(404)
  expect(await r.text()).toBe('contenido')
})

test('no pisa lo que la respuesta ya traia (vCard)', () => {
  const vcard = new Response('BEGIN:VCARD', {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': 'inline; filename="ana.vcf"',
      'Cache-Control': 'no-store',
    },
  })
  const r = conCabeceras(vcard, true)
  expect(r.headers.get('Content-Type')).toBe('text/vcard; charset=utf-8')
  expect(r.headers.get('Content-Disposition')).toBe('inline; filename="ana.vcf"')
  expect(r.headers.get('Cache-Control')).toBe('no-store')
  expect(r.headers.get('X-Content-Type-Options')).toBe('nosniff')
})

test('una redireccion de puerto conserva su destino y su no-store', () => {
  const puerto = new Response(null, {
    status: 302,
    headers: { Location: 'https://instagram.com/x', 'Cache-Control': 'no-store' },
  })
  const r = conCabeceras(puerto, true)
  expect(r.status).toBe(302)
  expect(r.headers.get('Location')).toBe('https://instagram.com/x')
  expect(r.headers.get('Cache-Control')).toBe('no-store')
  expect(r.headers.get('X-Frame-Options')).toBe('DENY')
})

test('por HTTP no se manda HSTS, porque no significa nada', () => {
  const r = conCabeceras(new Response('hola'), false)
  expect(r.headers.get('Strict-Transport-Security')).toBe(null)
  expect(r.headers.get('X-Content-Type-Options')).toBe('nosniff')
})

test('HSTS no lleva includeSubDomains ni preload: los dos son dificiles de deshacer', () => {
  const hsts = conCabeceras(new Response('hola'), true).headers.get('Strict-Transport-Security') ?? ''
  expect(hsts).not.toContain('includeSubDomains')
  expect(hsts).not.toContain('preload')
})

test('la CSP es SOLO frame-ancestors: una completa rompe la pagina en silencio', () => {
  const csp = conCabeceras(new Response('hola'), true).headers.get('Content-Security-Policy') ?? ''
  expect(csp).not.toContain('default-src')
  expect(csp).not.toContain('script-src')
})
