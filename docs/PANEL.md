# hito.uno — Panel (cliente) y Administración (equipo)

- Estado: capas 0, 0.1 y 0.3 **construidas y en producción** (`hito.uno`, desde el
  2026-09-17). El resto está diseñado; la revisión de Javier sigue pendiente.
- **Este documento se revisó contra el código el 2026-09-17** (PLAT 1): las secciones 5,
  6, 7 y 9 describían el diseño en KV previo al Durable Object y mandaban a hacer pasos
  que ya no hacen falta. Lo que dice ahora es lo que hace el código.
- Se apoya en `DISENO.md` (capacidad real), `OFERTA.md` (escalera y puertos) y en lo que
  ya existe en `worker/index.ts` (puertos `/o/<id>`, conteo de toques, KV opcional).
- Regla: el panel sirve si responde tres preguntas. **Qué objetos tengo, a dónde
  apuntan, cuánta gente los toca.** Todo lo demás es después de veinte membresías.

---

## 1. Son dos paneles

| | Mis Hitos (cliente) | Administración (equipo) |
| --- | --- | --- |
| Quién entra | Quien paga la membresía | Stephano y Javier |
| Ruta | `hito.uno/panel/<token>` | `hito.uno/admin` |
| Acceso | Link secreto por cliente, enviado por WhatsApp al activar | Cloudflare Access con cuenta de Google |
| Ve | Sus objetos, destinos, toques, link y QR de su página | Todo lo de todos los clientes |
| Hace | Cambiar destinos (etapa 1), editar su página (etapa 2) | Alta de perfiles y objetos, reasignar, activar/desactivar membresías, generar tokens |

Los perfiles `stephano` y `javier` son sandbox: sirven para probar el panel de cliente
sin tocar el de un cliente real.

La maqueta "Plataforma" de la landing muestra cuatro pestañas: **Mis hitos,
Destinos, Contenido, Activaciones**. El panel real usa exactamente esas cuatro, en ese
orden. Cuando exista, la maqueta se reemplaza por una captura real.

---

## 2. Pantallas del panel de cliente

### Mis hitos (inicio)

- Nombre del cliente, plan vigente, estado de la membresía (activa / inactiva).
- Link de su página (`hito.uno/p/<slug>`) con botón copiar. **Sin QR descargable**
  (decisión de Stephano, 2026-09-15): el QR descargable le permitiría imprimir sus
  propios objetos y eso canibaliza la venta de la pieza física, que es la mitad del
  negocio. El link no tiene ese problema: lo necesita para su bio y no reemplaza nada.
  El QR se genera en administración, para producir los objetos.
- Resumen: cantidad de objetos, toques últimos 7 días, toques últimos 30 días.

### Destinos

Tabla: un renglón por objeto (puerto).

| Objeto | Id impreso | Apunta a | Toques 7d | Toques 30d | |
| --- | --- | --- | --- | --- | --- |
| Tarjeta personal | `t-dana-01` | `/p/danaarx` | 12 | 41 | Cambiar |
| Tarjeta en el paquete | `t-dana-02` | `/p/danaarx#catalog` | 3 | 9 | Cambiar |

"Cambiar" (etapa 1) abre un campo con el destino y una lista de sugerencias: mi
página, mi catálogo, mi WhatsApp, mi Instagram, mi link de reseñas, otra URL. Guarda
con efecto inmediato en el próximo toque. Nunca borra: un objeto se reapunta, no se
elimina, porque está impreso.

### Contenido (etapa 2)

Los campos de `partners.json` como formulario: nombre, título, ubicación, bio, foto,
links (WhatsApp, Instagram, Facebook, web, email), orden y cuál es el principal. El
catálogo NO se edita acá: hay un link "Editar mi catálogo" que abre su planilla.

### Activaciones

Toques por día de los últimos 30 días, por objeto. Una lista o barras simples, sin
librería de gráficos. Columnas: fecha, objeto, toques, dispositivo (celular / otro),
país. Sin exportar, sin comparar períodos.

---

## 3. Pantallas de administración

- **Clientes**: lista de perfiles con plan, estado, cantidad de objetos, toques 30d,
  fecha de alta. Botón "Nuevo perfil" con los mismos campos que Contenido.
- **Objetos**: alta de un puerto (id, tipo de objeto, dueño, destino inicial) y
  descarga del QR para imprimir. Reasignar cualquier objeto. Ver todos los toques.
- **Membresías**: activar / desactivar. Al desactivar, la página del cliente muestra
  "Hito inactivo · escribinos para reactivarlo" y los objetos siguen apuntando ahí:
  el objeto impreso nunca muere, reactivar es un mensaje de WhatsApp.
- **Tokens**: generar o regenerar el link secreto de un cliente.

---

## 4. Etapas de construcción: alrededor del Panel Lite

**Decisión 2026-09-15 (Stephano):** lo inmediato es una sola pantalla. Muestra el Hito
que la persona tiene y un campo para poner la URL a la que quiere que apunte. Nada
más. Todo lo demás se agrega en capas alrededor de esa idea, y cada capa se usa antes
de empezar la siguiente.

### Panel Lite (etapa 0) — **hecho, en `dev`**

```
hito.uno/panel/<token>

  Tu Hito
  ┌─────────────────────────────────────────┐
  │ [foto del objeto]  Tarjeta Lite         │
  │                    id: t-dana-01         │
  │                                          │
  │ Cuando alguien la toca, se abre:         │
  │ [ https://hito.uno/p/danaarx        ]    │
  │                             [ Guardar ]  │
  │ Cambia en el próximo toque.              │
  └─────────────────────────────────────────┘
```

- Un objeto, un campo, un botón. Se guarda con efecto inmediato.
- Valida que sea una URL (http/https) o una ruta interna (`/p/...`). **El campo vacío
  no se guarda**: el Worker contesta "Poné un link que empiece con https:// o una ruta
  del sitio" y el destino anterior queda intacto (decisión 2026-09-17). Para volver a
  su página está la sugerencia "Mi página", que es un toque: guardar el vacío como
  `/p/<slug>` sería cambiarle el destino a quien borró el campo sin querer.
- **Pedido a UX:** un botón "Deshacer" al lado de Guardar, visible solo cuando el
  campo cambió, que devuelva el valor guardado. Es lo que falta hoy: quien borra o
  pega mal tiene que acordarse de memoria a dónde apuntaba. Es interfaz sola, no
  necesita nada del Worker. Deshacer **después** de guardar alcanza para esa visita
  con el valor anterior en memoria; que funcione días más tarde pide guardar el
  historial de destinos en el almacén y hoy no se justifica.
- Acceso por link secreto (sección 7). Sin login.

### Capas siguientes, en orden

| Capa | Qué agrega | Por qué en ese orden |
| --- | --- | --- |
| 0.1 · Sugerencias ✅ | **Hecho junto con la capa 0** (son datos que el Worker ya tenía). Debajo del campo: "Mi página", "Mi WhatsApp", "Mi Instagram", "Mi Facebook", "Mi email", "Mi catálogo". Un toque rellena la URL. Las arma `suggestionsFor()` en `worker/index.ts` desde `partners.json`. | La mayoría no quiere tipear una URL; quiere elegir. |
| 0.1.1 · Dejar reseña | Una sugerencia más, a la página de reseñas de Google del cliente. **Derivado al chat "Widgets Personal hito.uno" (2026-09-17).** No existe todavía: hace falta un dato nuevo por perfil en `partners.json` con el link de reseñas, que `suggestionsFor()` lo lea y que `check-paths.mjs` lo valide. | Es para clientes con local (apoyavasos, placas en el mostrador): hoy ninguno tiene el dato cargado, así que la sugerencia no tendría a quién servirle. |
| 0.2 · Toques | "Tocado 12 veces esta semana" debajo del objeto. | Es la razón para seguir pagando (OFERTA.md, regla de retención). Necesita Analytics Engine. |
| 0.3 · Varios objetos ✅ | **Hecho junto con la capa 0**: el panel ya dibuja una tarjeta por cada objeto del dueño (`src/panel/Panel.tsx`), con su foto, su id y su campo. Salió gratis porque `/api/panel/me` siempre devolvió la lista entera. | Aparece con Hito 1 y Hito 2 (puertos adicionales). |
| 0.4 · Link | Copiar el link de su página. **Sin QR descargable**: imprimir sus propios objetos canibaliza la venta de la pieza. El QR vive en administración. | Lo pide quien lo usa como link en bio. |
| 1 · Contenido | Editar nombre, bio, foto y links de la página. | Recién cuando haya clientes que lo pidan; hoy lo hace el equipo por WhatsApp. |
| 2 · Activaciones | Toques por día y por objeto, no solo el total. | El desglose diario no dice nada con 12 toques por semana: el número de la capa 0.2 ya responde \"¿sirve?\". Recién con cientos de toques aparecen patrones (qué día, qué objeto, qué campaña) que justifiquen una pantalla entera. |

El panel de administración (sección 3) arranca en paralelo con la capa 0: sin él no
hay forma de crear el token del cliente ni de dar de alta el objeto.

### Dónde se guarda la URL — resuelto

**Durable Object con SQLite** (`worker/store.ts`, binding `STORE`). Probado en `dev`
el 2026-09-15: la migración de `wrangler.jsonc` lo crea sola en el deploy y el token
de CI alcanzó. **No hizo falta ningún paso manual en Cloudflare ni `wrangler login`.**

`worker/objects.json` queda como semilla y como respaldo: si el almacén no responde,
el toque cae al JSON y nunca a un error. El KV `PUERTOS` sigue soportado en el código
como alternativa, pero ya no hace falta.

## 5. Modelo de datos

Tablas SQLite dentro del Durable Object `HitoStore` (`worker/store.ts`). **Este es el
esquema real, no el diseño en KV que tenía este documento hasta el 2026-09-17:** las
claves con prefijo (`partner:`, `object:`, `token:`, `index:objects:`) nunca se
construyeron, porque el Durable Object resolvió lo mismo sin un solo paso manual en
Cloudflare.

```
objects  id (PK), owner, kind, label, to_url, created_at, updated_at
tokens   token (PK), owner, created_at
leads    id (PK autoincremental), created_at, payload, forwarded, error
rate     bucket (PK), count, started_at
```

- `objects` es la tabla del panel: un renglón por puerto. `kind` sale del prefijo del
  id (`t-`, `pt-`, `ll-`, `ap-`, `pl-`, `re-`; ver `kindFromId`) y `to_url` es el
  destino que el cliente edita.
- `tokens` es el link secreto de cada cliente. Hoy se cargan a mano en
  `worker/tokens.json`, así que **solo sirve para los perfiles sandbox del equipo**:
  hasta que exista administración no hay forma de darle un panel a un cliente real sin
  commitear su token, que es un secreto filtrado (`npm run check` lo frena).
- `leads` son las consultas del formulario de la landing, guardadas antes de reenviarlas
  a la planilla. `forwarded` dice si la planilla las confirmó; `pendingLeads()` lista las
  que no. No es del panel, pero vive en el mismo almacén.
- `rate` es el freno de spam del formulario: cuenta intentos por ventana de tiempo
  guardando un hash corto de la IP, nunca la IP.
- **El perfil no está en la base.** Nombre, bio, foto, links y módulos siguen en
  `src/partner/partners.json` y se despliegan con el código. La capa 1 (Contenido) es la
  que va a necesitar una tabla de perfiles.
- `worker/objects.json` y `worker/tokens.json` son la **semilla**: se cargan con
  `INSERT OR IGNORE` en cada arranque del Durable Object, así que no pisan lo que el
  cliente ya cambió. Si el almacén no responde, `worker/index.ts` cae al JSON y el toque
  nunca termina en error.
- Toques: Analytics Engine, dataset `hito_toques`. Ya se escribe un punto por
  redirección con `indexes: [id]` y `blobs: [owner, destino, país, dispositivo]`.
  Consulta típica del panel:

```sql
SELECT index1 AS objeto, toStartOfDay(timestamp) AS dia, SUM(_sample_interval) AS toques
FROM hito_toques
WHERE blob1 = '<slug>' AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY objeto, dia
ORDER BY dia
```

---

## 6. Rutas del Worker

| Ruta | Método | Estado | Quién | Hace |
| --- | --- | --- | --- | --- |
| `/panel/<token>` | GET | ✅ hecho | Cliente | Sirve la app del panel (entrada estática `panel/index.html`) |
| `/api/panel/me` | GET | ✅ hecho | Cliente (token en header) | Nombre, link de su página, sus objetos y las sugerencias. **Todavía sin toques** |
| `/api/panel/objects/<id>` | PATCH | ✅ hecho | Cliente | Cambia `to`. Valida el destino y que el objeto sea suyo |
| `/api/panel/toques?dias=30` | GET | pendiente (capa 0.2) | Cliente | Toques por día y objeto (consulta a Analytics) |
| `/api/panel/partner` | PATCH | pendiente (capa 1) | Cliente | Edita su perfil |
| `/admin/*` | GET | pendiente | Equipo (Access) | Sirve la app de admin |
| `/api/admin/*` | varios | pendiente | Equipo (Access) | Alta y edición de perfiles, objetos, tokens, membresías |

Reglas:

- ✅ El token nunca va en la URL de las llamadas a la API: viaja en el header
  `X-Hito-Token`. La URL `/panel/<token>` solo carga la app y la app se queda con el
  token en memoria.
- ✅ Las escrituras validan dueño: `setDestination` no toca un objeto de otro.
- ✅ Ninguna ruta del panel se indexa (`noindex` en `panel/index.html`) y ninguna se
  cachea (`Cache-Control: no-store`).
- Pendiente: `/api/admin/*` va a verificar el header que inyecta Cloudflare Access
  (`Cf-Access-Jwt-Assertion`) contra la clave pública del equipo de Access. Sin eso,
  401. No hay login propio.

---

## 7. Seguridad mínima

Lo que ya está:

- El token viaja por header y las escrituras validan dueño (sección 6).
- Los tokens del repo son solo de perfiles sandbox; `npm run check` falla si aparece
  uno de un cliente real.

Lo que falta, y es de SEC (ver `docs/SEGURIDAD.md` y el backlog de `docs/EQUIPO.md`):

- **Freno de intentos en `/api/panel/*`: hoy no hay ninguno.** Ni en las escrituras ni
  en `/api/panel/me`, así que nada impide probar tokens al azar a toda velocidad. El
  formulario de la landing sí tiene freno (tabla `rate`), y esa misma pieza sirve acá.
- **Límite de tamaño del cuerpo:** `/api/panel/objects/<id>` lee el JSON sin tope.
- Token del cliente: la intención es 32 bytes aleatorios en base64url (43 caracteres),
  generados en admin y regenerables. Los sandbox de hoy tienen 32 caracteres, que no es
  lo mismo: cuando exista admin, que los genere con esa medida.
- Access para el equipo: lista de emails permitidos, sesión de 24 h.
- El token de API de Analytics tiene que vivir como secreto del Worker
  (`wrangler secret put`), nunca en el repo ni en el cliente.

---

## 8. Lo que NO entra (por ahora)

Gráficos con librería, exportación a CSV, comparativas entre períodos, alertas por
email, cuentas con contraseña, pagos, edición del catálogo fuera de la planilla,
multiusuario por cliente.

---

## 9. Pendiente de Stephano

El Panel Lite (capas 0, 0.1 y 0.3) **ya está desplegado y no necesita nada de esto**: el
Durable Object se creó solo en el deploy. Lo que quedaba de la lista vieja —
`wrangler login` y crear el KV `PUERTOS` — **ya no hace falta y se saca** (2026-09-17):
el KV sigue soportado en el código como alternativa, pero nadie lo usa.

Para la capa 0.2 (mostrar los toques):

1. Habilitar Analytics Engine en Cloudflare y descomentar los dos bloques en
   `wrangler.jsonc` (sin eso el deploy falla con el error 10089).
2. Crear un token de API con permiso **Account Analytics: Read** y cargarlo como secreto:
   `npx wrangler secret put CF_ANALYTICS_TOKEN` (y `--env dev`).

Para darle el panel a un cliente real hace falta administración (sección 3): hasta que
exista, el único lugar donde viven los tokens es `worker/tokens.json`, que es del repo y
solo admite sandbox.
