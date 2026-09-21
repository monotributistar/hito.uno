/* Pruebas del archivo de contacto.

   Cada una cuida una decision que ya nos costo una vez con un celular real en
   la mano, no una regla del formato leida en un manual. Si alguien "arregla"
   alguna de estas cosas sin saber por que estaban asi, el test lo frena y le
   dice el motivo. */

import { test, expect } from 'vitest'
import { buildVCard, vcardFilename, type VCardPartner } from '../vcard'

const ORIGEN = 'https://hito.uno'

/** Perfil de prueba con todo lo que el generador sabe leer. */
function perfil(extra: Partial<VCardPartner> = {}): VCardPartner {
  return {
    slug: 'prueba',
    name: 'Ana Perez',
    tagline: 'Hace cosas',
    location: 'Cariló, Argentina',
    bio: 'Una bio corta.',
    links: [
      { kind: 'whatsapp', label: 'WhatsApp', phone: '+54 9 2254 59 0762' },
      { kind: 'instagram', label: 'Instagram', handle: '@ana.prueba' },
      { kind: 'email', label: 'Email', href: 'mailto:ana@ejemplo.com' },
    ],
    ...extra,
  }
}

/** Las lineas del vCard, sin la vacia del final. */
function lineas(vcf: string): string[] {
  return vcf.split('\r\n').filter(Boolean)
}

test('ninguna linea se corta, aunque sea larga', () => {
  /* Contactos de Google en Android (probado el 2026-09-17) no une bien la
     continuacion de una linea cortada: el final de la NOTE aparecia pegado en
     la direccion, dos veces. Por eso el generador NO corta a los 75 octetos
     como sugiere el formato. Una linea de continuacion empieza con espacio o
     tabulacion: si aparece una, alguien volvio a poner el corte. */
  const bioLarga = 'x'.repeat(400)
  const vcf = buildVCard(perfil({ bio: bioLarga }), ORIGEN)

  const cortada = lineas(vcf).find((l) => /^[ \t]/.test(l))
  expect(
    cortada,
    'hay una linea cortada: Contactos de Google no une la continuacion y mezcla los campos',
  ).toBeUndefined()
  expect(lineas(vcf).some((l) => l.startsWith('NOTE:') && l.includes(bioLarga))).toBe(true)
})

test('las lineas terminan en CRLF', () => {
  // Algunas agendas se plantan si el archivo usa solo saltos de linea.
  const vcf = buildVCard(perfil(), ORIGEN)
  expect(vcf.startsWith('BEGIN:VCARD\r\n')).toBe(true)
  expect(vcf.endsWith('END:VCARD\r\n')).toBe(true)
  expect(vcf.includes('\n\n')).toBe(false)
})

test('el telefono queda solo con digitos y +', () => {
  // Una agenda no quiere espacios ni guiones en el numero.
  expect(lineas(buildVCard(perfil(), ORIGEN))).toContain('TEL;TYPE=CELL,VOICE:+5492254590762')
})

test('lo que el formato reserva se escapa', () => {
  /* Una coma o un punto y coma sin escapar parten el campo en dos: en la
     agenda aparece un contacto con los datos mezclados. */
  const vcf = buildVCard(perfil({ bio: 'Vendo tortas, tartas; y pan' }), ORIGEN)
  const note = lineas(vcf).find((l) => l.startsWith('NOTE:'))
  expect(note).toContain('tortas\\, tartas\\; y pan')
})

test('la ciudad y el pais van en campos distintos', () => {
  expect(lineas(buildVCard(perfil(), ORIGEN))).toContain('ADR;TYPE=WORK:;;;Cariló;;;Argentina')
})

test('un perfil sin datos opcionales igual arma un vCard valido', () => {
  // Es el caso de un perfil recien dado de alta, que existe de verdad.
  const l = lineas(buildVCard({ slug: 'vacio', name: 'Juan' }, ORIGEN))
  expect(l[0]).toBe('BEGIN:VCARD')
  expect(l[l.length - 1]).toBe('END:VCARD')
  expect(l).toContain('FN:Juan')
  expect(l).toContain('URL:https://hito.uno/p/vacio')
})

test('el nombre del archivo pierde los acentos y los espacios', () => {
  expect(vcardFilename('Stephano Arcella')).toBe('stephano-arcella.vcf')
  expect(vcardFilename('José Pérez')).toBe('jose-perez.vcf')
  // Sin letras utilizables no puede quedar un archivo sin nombre.
  expect(vcardFilename('***')).toBe('contacto.vcf')
})
