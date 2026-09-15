/* Helpers de links, sin dependencias de React.
   Viven aparte de partners.ts porque el Worker (worker/index.ts) los usa para
   armar las sugerencias del panel, y no puede importar nada que arrastre React. */

export type PartnerLinkKind = 'whatsapp' | 'instagram' | 'facebook' | 'web' | 'email'

/** wa.me exige el numero en formato internacional y SOLO digitos: sin `+`,
    sin espacios, sin guiones. Normalizamos aca para que quien cargue un
    partner pueda escribirlo como quiera y el link salga siempre bien. */
export function whatsappHref(phone: string, presetMessage?: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) {
    throw new Error(`Numero de WhatsApp invalido: "${phone}"`)
  }
  const query = presetMessage ? `?text=${encodeURIComponent(presetMessage)}` : ''
  return `https://wa.me/${digits}${query}`
}

/** Acepta el handle con o sin `@`. */
export function instagramHref(handle: string): string {
  const user = handle.replace(/^@/, '').trim()
  return `https://instagram.com/${encodeURIComponent(user)}`
}
