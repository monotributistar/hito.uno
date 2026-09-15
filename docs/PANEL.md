# hito.uno — Panel (cliente) y Administración (equipo)

- Estado: diseño aprobado en conversación el 2026-09-15, pendiente de revisión de Javier.
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
- Link de su página (`hito.uno/p/<slug>`) con botón copiar, y **QR descargable** en
  PNG y SVG. Es lo que usa como link en bio o para imprimir por su cuenta.
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

### Panel Lite (etapa 0)

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
- Valida que sea una URL (http/https) o una ruta interna (`/p/...`). Nunca vacío: si
  borra el campo, vuelve a su página.
- Acceso por link secreto (sección 7). Sin login.

### Capas siguientes, en orden

| Capa | Qué agrega | Por qué en ese orden |
| --- | --- | --- |
| 0.1 · Sugerencias | Debajo del campo: "Mi página", "Mi WhatsApp", "Mi Instagram", "Mi catálogo", "Dejar reseña". Un toque rellena la URL. | La mayoría no quiere tipear una URL; quiere elegir. |
| 0.2 · Toques | "Tocado 12 veces esta semana" debajo del objeto. | Es la razón para seguir pagando (OFERTA.md, regla de retención). Necesita Analytics Engine. |
| 0.3 · Varios objetos | La misma tarjeta repetida por objeto: tarjeta, llavero, porta tarjetas. | Aparece con Hito 1 y Hito 2 (puertos adicionales). |
| 0.4 · Link y QR | Copiar el link de la página y descargar su QR. | Lo pide quien lo usa como link en bio o imprime por su cuenta. |
| 1 · Contenido | Editar nombre, bio, foto y links de la página. | Recién cuando haya clientes que lo pidan; hoy lo hace el equipo por WhatsApp. |
| 2 · Activaciones | Toques por día y por objeto. | Solo con volumen. |

El panel de administración (sección 3) arranca en paralelo con la capa 0: sin él no
hay forma de crear el token del cliente ni de dar de alta el objeto.

### Dónde se guarda la URL

El Panel Lite necesita **un lugar donde escribir** que el Worker lea en cada toque.
Dos opciones, en orden de preferencia:

1. **Durable Object con SQLite.** Se crea solo en el deploy con una migración en
   `wrangler.jsonc`: no hay que crear nada en el panel de Cloudflare ni autenticar
   Wrangler en la máquina de nadie. Escrituras consistentes. Se prueba primero en
   `dev`: si el token de CI tiene permiso, queda; si el deploy lo rechaza, opción 2.
2. **KV `PUERTOS`.** Ya está previsto en `worker/index.ts` y en el README. Necesita
   `wrangler login` y crear el namespace (pendiente de Stephano).

En ambos casos `worker/objects.json` sigue como semilla y como respaldo: si el
almacén no responde, el toque cae al JSON y nunca a un error.

## 5. Modelo de datos

Todo en KV, con claves con prefijo. Los valores son JSON.

```
partner:<slug>        { name, tagline, location, bio, photo, links[], modules[],
                        plan, status: "active" | "inactive", createdAt }
object:<id>           { owner: <slug>, kind: "tarjeta" | "llavero" | "porta" |
                        "apoyavasos" | "placa" | "recibidor", label, to, createdAt }
token:<token>         { owner: <slug>, createdAt }        // link secreto del panel
index:objects:<slug>  [ <id>, ... ]                        // objetos de un cliente
```

- `worker/objects.json` y `src/partner/partners.json` quedan como **semilla**: el
  primer deploy con KV los carga si la clave no existe. Después manda KV.
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

| Ruta | Método | Quién | Hace |
| --- | --- | --- | --- |
| `/panel/<token>` | GET | Cliente | Sirve la app del panel (entrada estática `panel/index.html`) |
| `/api/panel/me` | GET | Cliente (token en header) | Perfil, objetos, resumen de toques |
| `/api/panel/toques?dias=30` | GET | Cliente | Toques por día y objeto (consulta a Analytics) |
| `/api/panel/objects/<id>` | PATCH | Cliente (etapa 1) | Cambia `to`. Valida que el objeto sea suyo |
| `/api/panel/partner` | PATCH | Cliente (etapa 2) | Edita su perfil |
| `/admin/*` | GET | Equipo (Access) | Sirve la app de admin |
| `/api/admin/*` | varios | Equipo (Access) | Alta y edición de perfiles, objetos, tokens, membresías |

Reglas:

- El token nunca va en la URL de las llamadas a la API: viaja en un header. La URL
  `/panel/<token>` solo carga la app y la app se queda con el token en memoria.
- `/api/admin/*` verifica el header que inyecta Cloudflare Access (`Cf-Access-Jwt-Assertion`)
  contra la clave pública del equipo de Access. Sin eso, 401. No hay login propio.
- Las escrituras validan dueño: un cliente solo toca sus objetos y su perfil.
- Ninguna ruta del panel se indexa (`noindex`) y ninguna se cachea.

---

## 7. Seguridad mínima

- Token del cliente: 32 bytes aleatorios en base64url, generado en admin. Regenerable.
  Si se filtra, se regenera y el viejo deja de servir.
- Access para el equipo: lista de emails permitidos, sesión de 24 h.
- El token de API de Analytics vive como secreto del Worker (`wrangler secret put`),
  nunca en el repo ni en el cliente.
- Rate limit simple en las escrituras (por token, por minuto) para que un link filtrado
  no sirva para inundar.

---

## 8. Lo que NO entra (por ahora)

Gráficos con librería, exportación a CSV, comparativas entre períodos, alertas por
email, cuentas con contraseña, pagos, edición del catálogo fuera de la planilla,
multiusuario por cliente.

---

## 9. Pendiente de Stephano para arrancar Panel 0

1. Habilitar Analytics Engine en Cloudflare y descomentar los dos bloques en `wrangler.jsonc`.
2. Crear un token de API con permiso **Account Analytics: Read** y cargarlo como secreto:
   `npx wrangler secret put CF_ANALYTICS_TOKEN` (y `--env dev`).
3. `npx wrangler login` y crear el KV `PUERTOS` (prod y dev), pegar los ids.

Con 1 y 2 sale Panel 0. Con 3 sale Panel 1 y Admin 0.
