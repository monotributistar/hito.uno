# Seguridad

Registro del área SEC. Acá se anota qué capa de protección se levantó, cómo se
atacó y qué aguantó. Lo que no está escrito acá, para el próximo chat no existe.

El trabajo va en ciclos cortos: levantar una capa, atacarla en `dev.hito.uno`,
anotar el resultado, corregir lo que falló.

---

## Reglas para atacar

Sin excepciones:

- Solo contra `dev.hito.uno`. Nunca contra `hito.uno`.
- Solo contra lo nuestro. Nada de golpear Google, el Apps Script, Cloudflare
  como servicio ni dominios ajenos.
- La meta se escribe **antes** de arrancar, con números. Por ejemplo: "200
  envíos por minuto desde 5 IPs no llenan la planilla ni tiran el formulario".
- Se sube de a escalones, no se arranca por el techo.
- Antes de una prueba de carga fuerte, revisar qué dice Cloudflare sobre
  hacerlas en la propia zona, para no terminar con la cuenta o la IP
  bloqueadas.
- **Mientras la dirección real del Apps Script esté en el código, ninguna
  consulta válida a un Worker local.** Un Worker local tiene Internet y la
  planilla es una sola. Para probar que algo no reenvía: test con `fetch`
  simulado, sin red. A un servidor solo se le mandan pedidos que cualquier
  versión del código rechaza antes de guardar, como un cuerpo que no es JSON.
  Ver incidente 4.1.
- **Una prueba contra un servidor cuenta solo si contestó el propio**: puerto
  propio, log propio, y una respuesta o línea de log que solo el código nuevo
  produce. Si esa señal falta, la prueba falló; no se descarta. En esta carpeta
  hay varios chats con su propio `wrangler dev`.

---

## 1. Capas levantadas

### 1.1 Solo producción le reenvía las consultas a la planilla (2026-09-17)

**El problema.** La dirección del Apps Script está fija en `worker/leads.ts` y
no cambia según el entorno, así que `dev.hito.uno` y `hito.uno` le escriben a
la misma planilla. Cualquier prueba de carga contra `/api/lead` en dev le
metería renglones de mentira al lugar donde miramos los pedidos reales. Esto
bloqueaba toda la ronda de ataque sobre el formulario.

**Qué se hizo.** Una variable de entorno, `REENVIO_CONSULTAS`. **Reenvía solo
el entorno que la declara en `"on"`, y hoy ese es producción y nadie más.** Un
entorno que no la declara —dev, uno nuevo, el Worker local— guarda la consulta
y no le habla a Google; la consulta queda anotada con el motivo, para no
confundirla en `pendingLeads` con una que Google rechazó y hay que recuperar a
mano. `handleLead` recibe la decisión como parámetro obligatorio, sin valor por
omisión, para que nadie herede el que reenvía por descuido.

**Por qué el valor por omisión no reenvía.** La primera versión de este cambio
era al revés: reenviaba salvo que el entorno dijera `"off"`. PLAT 1 lo marcó en
la revisión del PR y tiene razón. Con aquel esquema, el día que alguien edite
`env.dev` y se lleve la línea puesta, o que aparezca un entorno nuevo, ese
entorno escribe en la planilla real y nadie se entera. Así, la falla posible es
la contraria: que un entorno deje de reenviar cuando debía.

**La contra de esta decisión, escrita para no olvidarla.** Ahora producción
depende de una línea de configuración para cumplir su función normal. El
argumento de que "si falla, la consulta queda guardada y se nota" **hoy es
falso**: `pendingLeads()` existe en `store.ts` pero no lo lee nadie, no hay ruta
en el Worker ni script que lo consulte. Si producción dejara de reenviar, las
consultas quedarían a salvo pero invisibles, que es la misma situación que ya
se vivió una vez —semanas sin una sola consulta y sin enterarse—, con la única
diferencia de que esta vez se recuperan. Por eso el pendiente 1 de la lista de
abajo no es opcional.

**Por qué una variable y no un secreto.** Un secreto se carga a mano en el
panel de Cloudflare, para cada entorno, y si alguien redeploya sin cargarlo el
comportamiento cambia en silencio. Qué entorno reenvía es una decisión que
queremos a la vista y revisada en el PR, no escondida.

### 1.2 Tope de tamaño en los cuerpos de `/api/lead` y `/api/panel/*` (2026-09-18)

**El problema.** Los dos leían el cuerpo con `request.json()`, que carga el
pedido entero en memoria antes de mirar nada, y Cloudflare deja entrar cuerpos
de hasta 100 MB. Además, un cuerpo que era JSON válido pero no un objeto
(`null`, `42`, `[1,2]`) hacía reventar el Worker con un 500 en vez de un 400: en
el formulario por `raw.hp`, y en el panel por `.trim()` sobre un `to` que no era
texto. Y el destino que guarda el panel no tenía largo máximo.

**Qué se hizo.** `worker/body.ts` lee el cuerpo con tope: mira `Content-Length`
primero y además cuenta mientras lee, porque ese encabezado puede no venir o
mentir; apenas se pasa, corta sin descargar el resto y contesta 413. Topes:

| Ruta | Tope | Por qué ese número |
| --- | --- | --- |
| `POST /api/lead` | 16 KB | Una consulta completa con los recortes de `leads.ts` no llega a 14 KB ni con todo en caracteres de 3 bytes |
| `PATCH /api/panel/objects/<id>` | 4 KB | Solo trae `{ "to": "<url>" }` |
| Destino del panel | 2048 caracteres | Un destino real no pasa de unos cientos, y se guarda en el almacén |

Lo que no es un objeto o no trae un `to` de texto recibe un 400 claro.

**Cómo se probó.** Sin red, con `node --test` y la llamada a Google simulada:
el lector con 9 casos (tope exacto, un byte más, bytes y no caracteres,
`Content-Length` que miente, envío por partes que se corta antes de leer el
resto) y `handleLead` con 10 (con el reenvío apagado Google no recibe nada;
cuerpo gigante y cuerpos que no son objeto no tocan ni el almacén ni Google;
una consulta real completa con acentos y emojis entra). Después, contra un
Worker local propio, confirmando que era el propio. Los tests no quedaron en el
repositorio: PLAT 1 va a sumar los del Worker y no conviene que haya dos
formas de correrlos.

---

## 2. Pendientes anotados

En orden, con el riesgo escrito:

1. **Que borrar `REENVIO_CONSULTAS: "on"` de producción no llegue a
   producción.** Es la contra de la decisión 1.1 y hace falta una red. Dos
   caminos, no excluyentes: que `npm run check` falle si el entorno de
   producción no declara la variable en `"on"` (es un cambio en `scripts/`,
   área de PLAT, y hoy PLAT 1 está tocando el check para agregarle el dry-run
   de `--env dev`); y hacer visible `pendingLeads`, que hoy no lo lee nadie, de
   modo que una consulta que no llegó a la planilla se note sin que alguien
   sospeche primero.

2. **La dirección del Apps Script está en el repositorio** (`worker/leads.ts`).
   Quien la tenga puede escribir en la planilla sin pasar por nuestro Worker, y
   por lo tanto sin el freno de intentos, sin la trampa anti-spam y sin el
   recorte de campos. Moverla a un secreto no alcanza: ya está en el historial
   de Git, así que para que la vieja deje de servir hay que **republicar el
   Apps Script**, que le da una dirección nueva. Eso es trabajo de Stephano en
   Google. Riesgo hoy: bajo, el repositorio es privado. Hacerlo el día que se
   abra el repositorio o que se toque el Apps Script por otro motivo.

3. **El freno de `/api/lead` falla abierto.** En `worker/leads.ts`, si el
   almacén no contesta, la consulta pasa igual. El momento en que el almacén no
   contesta es, justamente, cuando lo están saturando: el freno se apaga solo
   cuando más falta hace. Para las redirecciones de objetos fallar abierto está
   bien (el toque nunca termina en error); para un freno de seguridad, no.

4. **`/api/panel/*` no tiene freno de intentos**, así que los tokens del panel
   se pueden probar de a miles. (El tope de tamaño del cuerpo, que iba en este
   mismo punto, ya está: ver 1.2.)

5. **Un solo almacén para todo.** El mismo Durable Object guarda los destinos
   de los objetos, los tokens, las consultas y el conteo del freno, y atiende
   de a un pedido por vez. En teoría, golpear el formulario puede hacer que los
   toques de las tarjetas caigan al respaldo de `objects.json`, o sea al
   destino viejo y no al que el cliente eligió en su panel. Falta medir cuánto
   aguanta: es lo primero de la ronda de ataque.

6. **La tabla de consultas crece sin límite.** Se guarda antes de intentar el
   reenvío, así que un ataque distribuido la llena y ensucia `pendingLeads`.
   No se puede limpiar por antigüedad sin más: ahí hay pedidos de clientes.

7. **Cabeceras de seguridad**: CSP, HSTS, X-Content-Type-Options,
   Referrer-Policy y protección contra que otro sitio embeba nuestras páginas.

8. **Plan de Workers en Cloudflare.** El gratuito tiene tope diario de pedidos:
   saturarlo deja el sitio sin servicio hasta el día siguiente. Confirmar en
   qué plan estamos y activar alertas de consumo.

---

## 3. Ataques hechos

Todavía ninguno. El primero es el punto 5 de la lista de arriba, ahora que dev
dejó de tocar la planilla.

---

## 4. Incidentes

### 4.1 Una prueba local escribió en la planilla real (2026-09-17)

**Qué pasó.** Para verificar el cambio 1.1, SEC 1 mandó una consulta de prueba
("Prueba SEC 1 entorno nuevo", `sec@prueba.local`) a un Worker local que
supuestamente no reenviaba. La consulta llegó a la planilla real. Se informó
como prueba superada, en el PR #13 y a PLAT 1. Stephano encontró la fila el
2026-09-18.

**Por qué.** El log del servidor de prueba quedó vacío y los rastros que se
usaron como prueba incluían pedidos que no se habían hecho: lo más probable es
que contestara el servidor local de otro chat, con código anterior al cambio.
Había una señal y se descartó: faltaba la línea de log que el código nuevo
escribe cuando no reenvía.

**Qué no pasó.** El código del cambio 1.1 estaba bien, y lo sigue estando: el
paquete de dev tiene `=== "on"`, y producción reenvía, como muestra una
consulta de Stephano del 2026-09-18.

**Qué cambió.** Dos reglas, sumadas arriba a las reglas para atacar.
