# hito.uno — Fuente única de diseño y alcance

- Estado: vigente. Reemplaza como referencia a los documentos parciales listados al final.
- Última revisión: 2026-09-14
- Para quién: socios de Hito y cualquier modelo de IA o colaborador que genere
  bocetos, copy, código o imágenes para el sitio.

> **Regla cero.** Antes de generar cualquier cosa para hito.uno, leer este archivo
> completo. Si algo que se va a generar contradice lo que dice acá, gana este archivo.
> Si este archivo está desactualizado, se corrige acá primero y después se genera.

---

## 1. Qué es Hito (la promesa)

Hito convierte objetos físicos en puntos de interacción digital. Una persona acerca
el celular a un objeto y pasa algo útil: guarda un contacto, abre un menú, se conecta
al Wi-Fi, deja una reseña, ve una ficha. Sin instalar nada.

La idea comercial que explica el valor: **Hito reduce pasos entre una persona y una
acción.** Sin Hito: buscar → navegar → encontrar → abrir → actuar. Con Hito:
objeto → tocar → actuar.

**La tecnología es un medio, no el producto.** NFC y QR se mencionan como "cómo",
nunca como titular. El visitante no necesita saber qué es NFC para entender Hito.

### Frases de marca (usar tal cual)

| Uso | Frase |
| --- | --- |
| Frase madre de marca | Un objeto. Un gesto. Una experiencia. |
| Hero actual en producción | Tu tarjeta. A un toque de distancia. |
| Bajada aceptada (viene de los bocetos de septiembre) | Menos pasos entre el mundo físico y la acción digital. |
| Cierre | ¿Dónde ponemos el próximo hito? |
| Firma de pie | Tecnología para la vida real. |

"Tecnología útil. Hecha simple." puede usarse como bajada o claim secundario. No
reemplaza a la frase madre como título.

---

## 2. Qué ofrecemos hoy (capacidad real, confirmada 2026-09-14)

Esto es lo que se puede prometer en el sitio porque se puede cumplir.

**Sí, hoy:**

- Soportes físicos con chip NFC **y** código QR: tarjeta, llavero, apoyavasos,
  placa, recibidor. Se producen con **impresión 3D propia**; diseño y color a medida.
- Página destino por cliente en `hito.uno/p/<slug>`: perfil de persona o de comercio
  con acciones directas (WhatsApp, llamar, email, Instagram, Facebook, mapa, Wi-Fi,
  horarios, reseñas). **La configura el equipo de Hito**, no el cliente.
- **Software a medida en servidores propios:** páginas web, bases de datos,
  catálogos. Es la capa que permite que un Hito abra algo más que un perfil.
- Asesoramiento y configuración incluidos. El cliente cuenta qué quiere que pase al
  tocar; Hito lo arma.

**Todavía no (no prometer en el sitio):**

- Dashboard o panel de estadísticas para el cliente. **Se quiere tener.** Puede
  aparecer en la sección "Qué incluye Hito" marcado como próximamente, no como
  disponible. Decidido 2026-09-14.
- Autoservicio: "creá tu Hito en minutos", "editá tu foto", cuentas de usuario,
  pagos online.
- Reservas propias. Un Hito puede abrir el sistema de reservas que el cliente ya
  usa; Hito no es un motor de reservas.
- Integración en packaging. **Descartada** 2026-09-14.
- Casos de éxito con cifras. Se publican cuando existan casos reales medidos.
  Hasta entonces, la página /casos no sale. Decidido 2026-09-14.

### Cómo bajar el copy a la capacidad real

| Si el boceto dice | Escribir |
| --- | --- |
| Panel básico / estadísticas de uso | Próximamente: panel con métricas de uso |
| Creá tu Hito en minutos | Te lo configuramos nosotros |
| Editar foto / Compartir (en /p/) | (quitar; no hay autoservicio) |
| Reservas online / reservas directas | Link directo a tu sistema de reservas |
| +60% más reservas, testimonios con estrellas | (quitar hasta tener casos reales) |
| Integración en packaging | (quitar) |
| Tap o escaneá | Acercá el celular o escaneá el código |

---

## 3. Identidad visual (la que está en producción)

Cualquier boceto se implementa con esta identidad. Un wireframe puede venir en gris,
navy o naranja: es estructural, no define color.

**Paleta** (valores tomados de `src/landing/landing.css` y `src/styles.css`):

| Rol | Hex |
| --- | --- |
| Tinta principal, títulos, fondo oscuro | `#17383a` |
| Acento de marca (coral) | `#ed8068` |
| Verde medio, texto secundario | `#587d78` |
| Verde profundo, botones secundarios | `#315f63` |
| Fondo claro | `#eef1e8` |
| Gris verdoso, bordes y pies | `#66817e` / `#466868` |

**Tipografía:** DM Sans (Google Fonts) para todo. Fallback `ui-sans-serif, system-ui`.

**Logo:** siempre `Hito.uno` completo, con `.uno` en coral. Nunca `Hito` solo ni
`HITO` en mayúsculas como marca. Vale el lockup horizontal y el vertical.

**Firma visual:** el mapa isométrico real de Cariló (37.1611° S · 56.8998° O).
Es el eje visual de la landing y no se reemplaza por mockups genéricos de celular.

**Dirección de arte** (del SDD, sigue vigente): estética editorial y cartográfica,
fondos marfil o gris niebla, líneas grafito con acentos coral, movimiento lento y
deliberado. Evitar: landing SaaS genérica, gradientes tecnológicos, glassmorphism,
estética crypto, iconografía NFC/QR como protagonista, bloques que parezcan de otra
marca pegados encima.

**Fotografía:** reglas y prompts en `docs/fotografia-soportes.md`. Resumen: logo
completo, tercio izquierdo vacío, gesto lejos del borde derecho, formato 3:2.

---

## 4. Arquitectura del sitio

### 4.1 Lo que existe en producción (2026-09-14)

- `hito.uno/` — una sola landing (`src/landing/`): hero de tarjeta personal,
  configurador de 3 pasos que termina en formulario, sección "reducimos pasos",
  carrusel de soportes con foto de contexto y foto de resultado, 6 casos de uso,
  maqueta de plataforma, mapa de Cariló.
- `hito.uno/p/<slug>/` — perfiles partner (`src/partner/`), uno por cliente,
  `noindex`. Primer partner real: Dana Arcella (`/p/danaarx`).
- `dev.hito.uno` — mismo sitio, rama `dev`, para probar sin exponer.

### 4.2 Exploraciones de IA: qué son y cómo se usan

Stephano genera periódicamente bocetos con otros modelos de IA para imaginar hasta
dónde podría llegar Hito. **Son fuente de inspiración, no pasos del proceso ni
especificaciones.** No reemplazan la landing actual, no definen roadmap y no se
implementan tal cual. De cada exploración se toma lo que sirve y el resto se descarta
sin culpa.

Exploración vigente: paquete de 9 bocetos (`Downloads/hito_uno_wireframes_ui_pack/`,
2026-09-10) y su prototipo HTML (`SANDBOX/hito-wireframes-prototipo/`). Lo que se
rescató de ahí el 2026-09-14, para sumar a la landing actual sin rediseñarla:

| Pieza del boceto | Decisión |
| --- | --- |
| Tres puertas de entrada Personal / Local / Objeto | **Adoptar.** Ordena las verticales actuales. |
| Navegación de 7 páginas | **Reducir a 4:** Home, Soluciones (con Personal / Local / Objeto adentro), Cómo funciona, Contacto. |
| Bento "¿Qué querés simplificar?" (Wi-Fi, contacto, reseñas, información, catálogo) | **Adoptar.** Explica por necesidad, no por tecnología. |
| "Cómo funciona" en 4 pasos | **Adoptar.** |
| "Qué incluye Hito" | **Adoptar**, con el dashboard marcado como próximamente. |
| Plantilla `/p/` con variantes persona y comercio, módulos opcionales | **Adoptar.** Es la evolución del perfil actual. Sin botones de autoedición. |
| CTA sticky al hacer scroll | **Adoptar.** |
| Formulario de contacto | **Adoptar con 4 campos:** tipo de uso, nombre, contacto, mensaje. Mismo destino que hoy (Apps Script → Sheet "Hito Leads"). |
| Hero "Tecnología útil. Hecha simple." con mockup de celular | **No.** Título = frase madre; visual = mapa o foto real de soporte. |
| Página /casos con cifras y testimonios | **Posponer** hasta tener casos reales. |
| Soportes "grabado láser" e "integración en packaging" | Grabado: a confirmar. Packaging: **descartado.** |
| Paleta navy/naranja, tipografía de sistema | **No.** Se implementa con la identidad de la sección 3. |
| Clave Wi-Fi en texto plano en `/p/comercio` | **Cambiar** por botón de conexión; la página es pública. |

### 4.3 Reglas de estructura del repo

- Una sola landing en `src/landing/`. **No crear páginas escondidas** tipo
  `/v03.html` para probar: para eso está `dev.hito.uno`. Esa práctica ya rompió
  producción una vez.
- Dar de alta un perfil partner es **una entrada en `src/partner/partners.json`**.
  No se crea HTML por cliente ni se toca `vite.config.ts`: el Worker
  (`worker/index.ts`) sirve cualquier `/p/<slug>` del registro. (Cambiado el
  2026-09-14; antes eran tres pasos y era el cuello de botella para vender.)
- Los objetos físicos llevan impreso `hito.uno/o/<id>`, nunca la URL del perfil.
  La tabla `worker/objects.json` dice a dónde lleva cada id y se puede cambiar sin
  reimprimir.
- Toda foto declarada en `landing-data.ts` tiene que existir en `public/`.
  `npm run check` lo verifica y falla si no.

---

## 5. Formulario de demo

- Campos que hoy llegan al Sheet: uso, acción al tocar, forma, tamaño, terminación,
  nombre, empresa, contacto, URL de origen, fecha.
- Pendiente de wiring: `quantity`, `notes` y el honeypot `hp` (el backend los
  espera, el front no los manda).
- Destino: Google Apps Script "Hito Leads" → Sheet
  `1CVePiko8krifGK8LfJ-s6mJOCqASUDHqxnL2sdobQ_k`. El `fetch` va con `mode: 'no-cors'`;
  la respuesta es opaca por diseño.

---

## 6. Reglas para generar con IA (checklist)

Antes de aceptar un boceto, copy, imagen o código generado, verificar:

1. Usa la frase madre o el hero de producción como título, no un claim nuevo.
2. No promete nada de la lista "Todavía no" de la sección 2.
3. Logo `Hito.uno` completo; paleta y tipografía de la sección 3.
4. No reemplaza el mapa de Cariló por mockups genéricos.
5. Presenta NFC/QR como medio, no como protagonista.
6. Si es una foto, cumple `docs/fotografia-soportes.md`.
7. Si es código, respeta la sección 4.3 y pasa `npm run check`.
8. Si es una nueva página, está en la lista de 4 de la sección 4.2 o se discutió antes.

Prompt de contexto mínimo para pegar en cualquier modelo:

```
Estás generando material para hito.uno. Leé primero docs/DISENO.md del repo
monotributistar/hito.uno y respetalo. Hito convierte objetos físicos (tarjetas,
llaveros, apoyavasos, placas, recibidores con NFC y QR, impresos en 3D) en acciones
digitales. Frase madre: "Un objeto. Un gesto. Una experiencia." Paleta: tinta
#17383a, coral #ed8068, fondo #eef1e8. Tipografía DM Sans. Logo siempre "Hito.uno".
No prometas dashboard, autoservicio, reservas propias, packaging ni casos con
cifras. El equipo configura todo por el cliente.
```

---

## 7. Decisiones registradas

| Fecha | Decisión |
| --- | --- |
| 2026-08-25 | Mapa isométrico de Cariló como eje visual (SDD). |
| 2026-08-30 | Formulario a Google Sheet vía Apps Script, sin backend propio. |
| 2026-09-06 | Unificación en una sola landing; entornos `dev` y `main`. |
| 2026-09-14 | Casos con cifras: pospuestos a tener casos reales. |
| 2026-09-14 | Dashboard: se quiere; aparece como próximamente en "Qué incluye". |
| 2026-09-14 | Entran NFC y QR, impresión 3D propia, software a medida en servidores propios. Packaging descartado. |
| 2026-09-14 | Los bocetos generados por IA son inspiración, no spec. La landing actual va por donde queremos; se le suman ideas rescatadas (tres puertas, plantilla /p/ comercio), no se reemplaza. |
| 2026-09-15 | **Perfil de Dana en hold:** no se trabaja más sobre él por ahora. Su página sigue publicada y sin cambios, porque ya puede estar en uso. |
| 2026-09-15 | **`/p/stephano` es la muestra visual para clientes:** cofundador de Hito, catálogo con los objetos reales de Hito (sin precios hasta definirlos) y "Quiero uno" a WhatsApp. Se demuestra en vivo cambiando el destino desde el panel. |

### Pendientes de decisión

- Grabado láser como soporte: sí o no.
- Copy definitivo de las 4 páginas.
- Si el hero de producción ("Tu tarjeta...") convive con la frase madre o la reemplaza.
- Modo claro únicamente o claro/oscuro (D5 del SDD).

---

## 8. Documentos que este archivo consolida

- `Downloads/Hito Uno Wireframes.dc.html` (2026-08-23): primer wireframe.
- `docs/SDD-portfolio-mapa-isometrico.md` (2026-08-25): arquitectura técnica del
  mapa y dirección de arte. Sigue siendo la referencia técnica del 3D.
- Brief `docs/BRIEF-landing-v02-aditiva.md` en la rama `proposal/landing-v02-aditiva`
  (sin mergear): regla "sumar, no reemplazar" y lista de no-objetivos.
- `docs/fotografia-soportes.md` (2026-09-06): reglas de foto. Sigue vigente.
- `docs/brief-formulario-sheet-gemini.md`: obsoleto, describe `src/v01/` que ya no
  existe. Borrar.
- `Downloads/hito_uno_wireframes_ui_pack/` + `SANDBOX/hito-wireframes-prototipo/`
  (2026-09-10/11): exploración generada por otro modelo. Inspiración, ver 4.2.
