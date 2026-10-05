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

### 1.3 Cabeceras de seguridad en todas las respuestas (2026-10-03)

**El problema.** La auditoría del 2026-10-03 lo midió en producción: la
respuesta solo traía `Cache-Control`. Sin ninguna cabecera, el navegador adivina
el tipo de los archivos, manda la dirección completa al salir del sitio —y la
del panel lleva el token— y cualquiera puede mostrar el sitio dentro de un
iframe suyo haciéndose pasar por nosotros.

**Qué se hizo.** Cuatro cabeceras, en todas las respuestas:

| Cabecera | Qué evita |
| --- | --- |
| `X-Content-Type-Options: nosniff` | Que el navegador adivine el tipo y termine ejecutando algo |
| `Referrer-Policy: strict-origin-when-cross-origin` | Que al salir del panel se le regale el token al otro sitio |
| `X-Frame-Options: DENY` | Que otro sitio nos muestre adentro suyo |
| `Content-Security-Policy: frame-ancestors 'none'` | Lo mismo, en la forma nueva |

Más `Strict-Transport-Security: max-age=15552000` (seis meses), que hace que el
navegador no vuelva a intentar por HTTP. **Sin `includeSubDomains` ni
`preload`:** los dos son difíciles de dar marcha atrás, y `preload` hay que
pedir que lo saquen de una lista que traen los navegadores.

**Por qué están en dos lugares.** `worker/cabeceras.ts` las pone en una sola
puerta de salida, para que una ruta nueva las lleve sin que nadie se acuerde.
Pero **la landing no pasa por el Worker**: solo `/p/`, `/o/`, `/panel/` y
`/api/` lo ejecutan (`run_worker_first`), y el resto lo sirve Cloudflare
directo. Por eso la misma lista está en `public/_headers`, que es como se le
dan cabeceras a los archivos estáticos. Hacer pasar todo por el Worker sería la
otra salida, pero cuesta una ejecución por archivo y el plan tiene tope diario.

**Lo que NO entró, y por qué.** Una CSP completa (pendiente 8) y la redirección
a HTTPS (pendiente 7). La redirección se intentó en el Worker y se sacó por dos
razones que valen la pena anotar:

1. Como la landing no pasa por el Worker, `http://hito.uno` seguiría contestando
   200: no arreglaba el problema que reportó la auditoría.
2. En `wrangler dev` el Worker ve los pedidos como `http://dev.hito.uno`, así
   que la redirección se disparaba **siempre en local** y rompía
   `npm run dev:worker`.

**Una trampa nueva, para el próximo.** `url.protocol = 'https:'` **no hace nada
en el runtime del Worker**, aunque en Node funciona. La redirección salía al
mismo `http://`, o sea un bucle, y los tests en Node no lo veían. Si hay que
armar una URL cambiando el esquema, se arma con texto.

**Cómo se probó.** Siete casos en `worker/pruebas/cabeceras.test.ts` (que no se
pise `Content-Type`, `Content-Disposition` ni `Cache-Control`; que una
redirección conserve su destino; que por HTTP no se mande HSTS; que la CSP no
tenga nada más que `frame-ancestors`). Y contra un Worker local propio: las
cinco cabeceras salen en la landing, en el JS, en el perfil, en el vCard, en el
puerto `/o/`, en el panel, en el 401 de la API y en un 404.

### 1.4 El freno de `/api/lead` deja de fallar abierto (2026-10-03)

**El problema.** El freno cuenta los intentos en el Durable Object. Si el
almacén no contestaba, la consulta pasaba igual. Y el momento en que el almacén
no contesta es, justamente, cuando lo están golpeando: el freno se apagaba solo
cuando más falta hacía.

**Por qué no alcanzaba con rechazar.** Con el almacén caído la consulta tampoco
se guarda, pero **sí llega a la planilla**, porque el reenvío no depende del
almacén. O sea que rechazar significa perder el pedido de un cliente real.
Entre "no frena nada" y "pierde consultas", ninguna de las dos servía.

**Qué se hizo.** Un freno de respaldo en la memoria del isolate
(`worker/freno.ts`), que cuenta solo cuando el almacén no contesta. No
reemplaza al almacén ni pretende ser exacto: Cloudflare reparte los pedidos
entre varios isolates y los recicla cuando quiere, así que un atacante decidido
pasa más que el límite. Pero **una persona sola nunca se ve frenada**, y una
avalancha desde el mismo lugar deja de ser gratis. Tiene tope de entradas, para
que llenar la memoria del isolate no sea otra forma de voltearlo.

Se anota en el log cada vez que el respaldo entra en acción: que el almacén no
conteste es, por sí solo, una señal.

**Cómo se probó.** Cinco casos del respaldo
(`worker/pruebas/freno.test.ts`): una persona sola pasa; se corta pasando el
límite; frenar a uno no frena a otro; pasado el minuto se vuelve a empezar (con
el reloj movido a mano); muchas direcciones distintas no hacen crecer la
memoria sin fin. Y dos de punta a punta en `leads.test.ts`, que cuidan los dos
lados de la decisión: con el almacén caído, una consulta sola llega a la
planilla, y de siete seguidas pasan cinco y se cortan dos.

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

3. ~~**El freno de `/api/lead` falla abierto.**~~ Resuelto el 2026-10-03, ver
   1.4. Queda el límite de fondo: el respaldo cuenta por isolate, no por sitio,
   así que es un piso y no un techo. El techo real lo da el pendiente 9 (tope
   de gasto), que es lo que protege de una avalancha grande.

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

7. **Que `http://hito.uno` pase a HTTPS.** Hoy contesta 200 sin redirigir. No
   se puede resolver desde el Worker: la landing no pasa por él (ver 1.3). Es
   un interruptor en Cloudflare, **"Always Use HTTPS"** en SSL/TLS → Edge
   Certificates. **Lo tiene que prender Stephano**, y después se verifica con
   `curl -sI http://hito.uno`, que tiene que contestar 301 a `https://`.

8. **CSP completa.** Hoy va solo `frame-ancestors` (ver 1.3). Decir de dónde se
   puede cargar cada cosa es lo que frena un script inyectado, pero este sitio
   carga tipografías de Google, la analítica que Cloudflare inyecta sola y, en
   los perfiles con catálogo, una planilla. Mal escrita, las corta en silencio.
   Va primero en dev, con `Content-Security-Policy-Report-Only`, mirando qué se
   rompería antes de aplicarla.

9. **Plan de Workers en Cloudflare.** El gratuito tiene tope diario de pedidos:
   saturarlo deja el sitio sin servicio hasta el día siguiente. Confirmar en
   qué plan estamos y activar alertas de consumo.

10. **Segundo factor en GitHub y en Cloudflare.** Es la base más barata de
    todas y la única que no puedo verificar desde acá: quien entre a esas dos
    cuentas cambia el sitio, los destinos de los objetos ya impresos y el
    secreto de la planilla. **A confirmar por Stephano.**

11. **Las cabeceras están escritas en dos lugares** (`worker/cabeceras.ts` y
    `public/_headers`) y nada verifica que digan lo mismo. Intenté un test que
    leyera el archivo, pero `tsconfig.worker.json` va con `types: []` y no
    tiene `node:fs`; no toqué esa configuración porque es de PLAT. **Pedido a
    PLAT:** que `npm run check` compare las dos listas.

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
