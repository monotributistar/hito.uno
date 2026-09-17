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

---

## 1. Capas levantadas

### 1.1 dev no le reenvía las consultas a la planilla (2026-09-17)

**El problema.** La dirección del Apps Script está fija en `worker/leads.ts` y
no cambia según el entorno, así que `dev.hito.uno` y `hito.uno` le escriben a
la misma planilla. Cualquier prueba de carga contra `/api/lead` en dev le
metería renglones de mentira al lugar donde miramos los pedidos reales. Esto
bloqueaba toda la ronda de ataque sobre el formulario.

**Qué se hizo.** Una variable de entorno, `REENVIO_CONSULTAS`, declarada solo
en `env.dev` de `wrangler.jsonc` con el valor `"off"`. Con el reenvío apagado
la consulta se guarda igual en el almacén de dev y el viaje a Google no se
hace; la consulta queda anotada con el motivo, para no confundirla en
`pendingLeads` con una que Google rechazó y hay que recuperar a mano.
Producción no declara la variable, así que reenvía como siempre.

**Por qué una variable y no un secreto.** Un secreto se carga a mano en el
panel de Cloudflare, para cada entorno, y si alguien redeploya sin cargarlo el
comportamiento cambia en silencio. "dev no reenvía" es una decisión que
queremos a la vista y revisada en el PR, no escondida.

---

## 2. Pendientes anotados

En orden, con el riesgo escrito:

1. **La dirección del Apps Script está en el repositorio** (`worker/leads.ts`).
   Quien la tenga puede escribir en la planilla sin pasar por nuestro Worker, y
   por lo tanto sin el freno de intentos, sin la trampa anti-spam y sin el
   recorte de campos. Moverla a un secreto no alcanza: ya está en el historial
   de Git, así que para que la vieja deje de servir hay que **republicar el
   Apps Script**, que le da una dirección nueva. Eso es trabajo de Stephano en
   Google. Riesgo hoy: bajo, el repositorio es privado. Hacerlo el día que se
   abra el repositorio o que se toque el Apps Script por otro motivo.

2. **El freno de `/api/lead` falla abierto.** En `worker/leads.ts`, si el
   almacén no contesta, la consulta pasa igual. El momento en que el almacén no
   contesta es, justamente, cuando lo están saturando: el freno se apaga solo
   cuando más falta hace. Para las redirecciones de objetos fallar abierto está
   bien (el toque nunca termina en error); para un freno de seguridad, no.

3. **`/api/panel/*` no tiene freno de intentos**, así que los tokens del panel
   se pueden probar de a miles. Y el cuerpo de `/api/lead` y `/api/panel/*` se
   lee sin tope de tamaño.

4. **Un solo almacén para todo.** El mismo Durable Object guarda los destinos
   de los objetos, los tokens, las consultas y el conteo del freno, y atiende
   de a un pedido por vez. En teoría, golpear el formulario puede hacer que los
   toques de las tarjetas caigan al respaldo de `objects.json`, o sea al
   destino viejo y no al que el cliente eligió en su panel. Falta medir cuánto
   aguanta: es lo primero de la ronda de ataque.

5. **La tabla de consultas crece sin límite.** Se guarda antes de intentar el
   reenvío, así que un ataque distribuido la llena y ensucia `pendingLeads`.
   No se puede limpiar por antigüedad sin más: ahí hay pedidos de clientes.

6. **Cabeceras de seguridad**: CSP, HSTS, X-Content-Type-Options,
   Referrer-Policy y protección contra que otro sitio embeba nuestras páginas.

7. **Plan de Workers en Cloudflare.** El gratuito tiene tope diario de pedidos:
   saturarlo deja el sitio sin servicio hasta el día siguiente. Confirmar en
   qué plan estamos y activar alertas de consumo.

---

## 3. Ataques hechos

Todavía ninguno. El primero es el punto 4 de la lista de arriba, ahora que dev
dejó de tocar la planilla.
