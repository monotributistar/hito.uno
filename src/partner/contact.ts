/* Guardar el contacto, según el teléfono que lo pide.

   La web no puede escribir en la agenda. Con un `.vcf`, iOS abre la ficha de
   contacto y queda a un toque de "Crear contacto"; Android, en cambio, lo
   descarga: la persona tiene que ir a Descargas, abrir el archivo y elegir
   con qué app, donde Contactos no siempre es la primera opción. Ese recorrido
   se pierde gente, que es justo lo que el objeto vino a evitar.

   Chrome en Android entiende `intent://`, que abre directamente la pantalla
   "Crear contacto" del teléfono con los datos ya cargados: queda un toque,
   Guardar. `browser_fallback_url` cubre a los navegadores que no entienden el
   esquema (Firefox en Android, algunos WebView): ahí vuelve al archivo de
   siempre, que es el comportamiento de hoy. */

import type { Partner } from './partners'

export type ContactPlatform = 'ios' | 'android' | 'otro'

/** Qué teléfono está pidiendo el contacto. Solo se puede saber en el cliente. */
export function detectPlatform(userAgent: string): ContactPlatform {
  if (/Android/i.test(userAgent)) return 'android'
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios'
  /* Un iPad moderno se presenta como Mac y cae acá; no es un problema,
     porque en macOS el archivo también abre Contactos. */
  return 'otro'
}

/** "https://wa.me/5492254590762" -> "+5492254590762" */
function phoneOf(partner: Partner): string | undefined {
  const link = partner.links.find((l) => l.kind === 'whatsapp')
  const digits = link?.href.match(/wa\.me\/(\d+)/)?.[1]
  return digits ? `+${digits}` : undefined
}

function emailOf(partner: Partner): string | undefined {
  const link = partner.links.find((l) => l.kind === 'email')
  return link?.href.replace(/^mailto:/, '')
}

/* La pantalla de "Crear contacto" de Android guarda nombre, teléfono, email,
   cargo y notas, pero no tiene un campo para sitios web. Por eso la página del
   perfil viaja dentro de las notas: es el dato que se mantiene al día y el que
   permite volver a todo lo demás (Instagram, catálogo, lo que haya). */
function notesOf(partner: Partner, origin: string): string {
  return [partner.bio, `${origin.replace(/^https?:\/\//, '')}/p/${partner.slug}`]
    .filter(Boolean)
    .join(' · ')
}

/** Link `intent://` que abre la agenda de Android con el contacto cargado. */
export function androidContactHref(partner: Partner, origin: string): string {
  const extras: Record<string, string | undefined> = {
    name: partner.name,
    phone: phoneOf(partner),
    email: emailOf(partner),
    job_title: partner.tagline,
    notes: notesOf(partner, origin),
  }

  /* Los `;` separan los campos del intent, así que cada valor va
     percent-encoded: un nombre con punto y coma no puede partir la URL. */
  const fields = Object.entries(extras)
    .filter(([, value]) => value)
    .map(([key, value]) => `S.${key}=${encodeURIComponent(value as string)}`)

  return [
    'intent://contacto/#Intent',
    'action=android.intent.action.INSERT',
    'type=vnd.android.cursor.dir/contact',
    ...fields,
    // El fallback tiene que ser una URL completa: Chrome descarta una ruta.
    `S.browser_fallback_url=${encodeURIComponent(origin + vcardUrl(partner))}`,
    'end',
  ].join(';')
}

/** El archivo de contacto que sirve el Worker. */
export function vcardUrl(partner: Partner): string {
  return `/p/${partner.slug}/contacto.vcf`
}
