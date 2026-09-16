# Referencias: qué hacen los perfiles parecidos al nuestro

- Fecha: 2026-09-15
- Para qué: ver qué le falta a `hito.uno/p/<slug>` mirando las tres familias de
  producto que resuelven algo parecido.
- Se lee junto con `DISENO.md` (capacidad real) y `OFERTA.md` (escalera).

---

## 1. Las tres familias

| Familia | Ejemplos | Qué resuelven | Qué nos sirve |
| --- | --- | --- | --- |
| **Tarjeta digital / NFC** | Popl, Blinq, HiHello, Mobilo, V1CE, Wave | Objeto físico + perfil que se comparte en una reunión | Es nuestro competidor directo. De acá salen guardar contacto, intercambio de datos y métricas. |
| **Link-in-bio** | Linktree, Beacons | Una página con los destinos de un creador, desde Instagram | El público de la Lite y de Vitrina ya la conoce. De acá sale el orden y la disciplina de pocos botones. |
| **Página de contacto hospedada** | genéricas de NFC | Una URL que abre una ficha y ofrece descargar el contacto | De acá sale el detalle técnico del vCard. |

Dato de contexto: **Bento.me cerró el 13 de febrero de 2026** tras ser comprado por
Linktree. La categoría se está concentrando.

---

## 2. Qué tiene el perfil de un competidor y qué tenemos nosotros

| Función | Ellos | `hito.uno/p/` hoy | Comentario |
| --- | --- | --- | --- |
| Foto, nombre, cargo, bio | Sí | **Sí** | Parejo. |
| Acción principal destacada | Sí | **Sí** (WhatsApp) | Parejo. |
| Links secundarios con ícono | Sí | **Sí** | Parejo. |
| Carga rápida, sin app | Sí (varía) | **Sí** (6 kB de JS) | Ventaja nuestra: muchos cargan una app entera. |
| **Guardar contacto (vCard)** | **Sí, en todos** | **No** | **El hueco más grande.** Ver sección 3. |
| **Intercambio de datos** (el visitante deja el suyo) | Sí (Popl, V1CE, QRCodeChimp) | No | Ver sección 4. |
| Métricas por link | Sí | No (contamos el toque del objeto, no el clic del link) | Ver sección 5. |
| Compartir la propia página | Sí (QR en pantalla, share nativo) | No | Ver sección 6. |
| Pase para Apple/Google Wallet | Sí (V1CE, QR Tiger, SoCard) | No | Pesado: requiere certificado de Apple. Parkeado. |
| Catálogo de productos con precio | Casi ninguno | **Sí** | **Ventaja nuestra**, viene del mundo link-in-bio. |
| Video, PDF, galería | Sí (HiHello) | No | No urgente para la Lite. |
| Link de agenda / reservas | Sí | Se puede poner como link cualquiera | Alcanza con un link. |
| Firma de email generada | Sí (HiHello) | No | Para vender a profesionales, más adelante. |
| Sincronización con CRM | Sí | No | Es para empresas, no para nuestro segmento. |
| Panel para cambiar el destino del objeto | Raro | **Sí** (Panel Lite) | **Ventaja nuestra.** Casi nadie deja reapuntar el objeto. |

---

## 3. Guardar contacto (vCard): lo que más falta

Es la función que **todos** tienen y nosotros no. Y es rara nuestra ausencia, porque
la landing promete exactamente eso: el hero dice *"Contacto guardado, sin tipear"* y
"Guardar contacto" es una de las acciones del configurador. Hoy alguien toca la
tarjeta, ve el perfil, y para guardar el número tiene que copiarlo a mano.

Lo que dicen las guías del rubro:

- Conviene **servir el vCard desde la página** en vez de escribirlo en el chip: la
  página funciona igual en iPhone y Android, y los datos se pueden cambiar después
  sin reimprimir. Escribir el vCard en el chip lo congela.
- **iOS no lee bien un vCard escrito en el chip** salvo con una app de lectura
  abierta. Con una URL, anda siempre. Otro punto a favor de servirlo desde la página.
- **vCard 3.0** es lo más compatible; 4.0 es el estándar actual pero algunos Android
  viejos lo leen peor. Campos mínimos: nombre, teléfono, email, organización, web.
- La foto dentro del vCard pesa y no siempre hace falta.

**Cómo encaja con nosotros:** el Worker puede servir `/p/<slug>/contacto.vcf` armado
desde `partners.json`, y el perfil suma un botón "Guardar contacto". No hay que pedir
nada a nadie ni tocar el chip.

---

## 4. Intercambio de datos (el visitante deja el suyo)

En las tarjetas digitales es la función que más se promociona para ventas: cuando
alguien guarda tu contacto, aparece un formulario para que deje el suyo. Le llaman
intercambio de contacto o captura de lead, y el argumento es que el vendedor deja de
depender de que el otro escriba primero.

**Cómo encaja con nosotros:** ya tenemos el circuito armado para la landing, que
escribe en una planilla de Google vía Apps Script. El mismo destino sirve para un
"Dejame tu contacto" en el perfil. Para la Lite es opcional; para un vendedor es lo
que justifica un escalón más caro.

**Ojo:** son datos personales de terceros. Pedir solo lo necesario y decir para qué.

---

## 5. Métricas por link

Todas muestran vistas del perfil y clics por botón. La frase que se repite en las
guías de link-in-bio: *si no medís los clics, no podés mejorar*.

**Cómo encaja con nosotros:** hoy contamos el toque del objeto (`/o/<id>`), que es el
comienzo del recorrido. No contamos qué botón toca la persona una vez adentro. Con el
mismo Analytics Engine se puede contar el clic saliente del perfil. Es la capa 0.2 del
panel, ampliada.

---

## 6. Compartir la propia página

Dos formas distintas, y conviene no confundirlas:

- **Compartir nativo** (el menú de compartir del celular): el dueño manda su link por
  WhatsApp sin copiar nada. Es una línea de código y no tiene contraindicación.
- **QR en pantalla**: el dueño le muestra su QR a alguien que no tiene la tarjeta
  encima. Útil, pero **una captura de pantalla de ese QR se puede imprimir**, que es
  justo lo que se decidió evitar al sacar el QR descargable del panel. Si se hace,
  conviene que el QR en pantalla apunte a la página (`/p/<slug>`) y no al puerto
  (`/o/<id>`), así no reemplaza al objeto.

---

## 7. Lo que confirman las referencias de lo que ya hacemos bien

- **Pocos botones.** La regla que repiten las guías de link-in-bio: una página con
  quince botones convierte peor que una con tres prioridades claras. Nuestro perfil
  tiene tres. No agregarle más sin sacar otro.
- **Rápido y mobile-first, con la acción principal arriba del pliegue.** Es
  literalmente la recomendación del rubro y es lo que hace nuestra página.
- **Probar el recorrido completo**: tocar el objeto, que abra el perfil, guardar el
  contacto. Lo hacemos en cada cambio.

---

## 8. Prioridad sugerida

| # | Qué | Por qué ahora | Tamaño |
| --- | --- | --- | --- |
| 1 | **Guardar contacto (vCard)** | Es el hueco frente a todos los competidores y lo que la landing ya promete | Chico |
| 2 | **Compartir nativo** | Una línea; le sirve al dueño todos los días | Muy chico |
| 3 | **Clics por link** | Le da contenido al panel y razón a la membresía | Medio, con Analytics Engine |
| 4 | **Dejame tu contacto** | Diferencia un escalón comercial; reusa la planilla de leads | Medio |
| 5 | QR en pantalla | Útil, pero decidir antes lo del punto 6 | Chico |
| 6 | Pase de Wallet, video, firma de email | Nada de esto lo pide todavía nuestro segmento | Grande |

---

## Fuentes

- [Top Digital Business Cards Compared (2026) — Blinq](https://blinq.me/blog/top-digital-business-cards-compared)
- [The Best Digital Business Card Apps in 2026 (Popl, HiHello, Blinq, Uniqode)](https://www.streetinsider.com/Press+Releases/The+Best+Digital+Business+Card+Apps+in+2026:+A+Complete+Comparison+(Popl,+HiHello,+Blinq,+Uniqode+&+More)/26527004.html)
- [How to Build a Digital Business Card on an NFC Tag — vCard, Smart Poster, or URL (NFCore)](https://nfcore.app/uk/guides/nfc-business-card-vcard-smart-poster-url)
- [How Do NFC Business Cards Work — Mobilo](https://www.mobilocard.com/post/how-do-nfc-business-cards-work)
- [QR Code Business Cards: Complete Guide to vCard QR Codes (2026)](https://www.qr-insights.com/blog/2026-03-04-qr-code-business-cards-complete-guide)
- [Bento vs Linktree vs Beacons 2026 — Ceynk](https://ceynk.link/p/blog/bento-vs-linktree-vs-beacons-2026)
- [Best Link in Bio (2026) — own.page](https://own.page/blog/best-link-in-bio)
- [Digital Business Card Lead Capture Features — QRCodeChimp](https://www.qrcodechimp.com/digital-business-card-lead-capture-features/)
- [Lead Capture Forms Built Into Your Digital Business Card — V1CE](https://v1ce.co/feature/lead-capture)
- [How to Add a Digital Business Card to Apple Wallet — V1CE](https://v1ce.co/blog/digital-business-card-apple-wallet)
