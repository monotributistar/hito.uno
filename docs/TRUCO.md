# Truco para el QR de "mientras esperás" (`/truco/`)

Truco argentino jugado entero en el celular, para la tarjeta de **Local**: el QR lleva a una sala, se pone un alias (sin registro) y se juega. Si nadie se une, juega un bot. Es del segmento Local: **no tiene enlace desde la home** y las dos páginas llevan `noindex`. Se entra por el QR.

Nació como laboratorio aparte (`SANDBOX/lab-truco`) y se mudó acá para publicarlo sin depender del acceso a la cuenta de Cloudflare: el deploy ya sale de GitHub Actions.

## Qué hay y dónde

| Pieza | Dónde |
|---|---|
| Reglas del juego (puras, sin red) | `worker/truco/cartas.ts`, `motor.ts` |
| Bot básico (sin faroleo) | `worker/truco/bot.ts` |
| Lógica de la sala: asientos, alias, reloj, mensajes | `worker/truco/sala.ts` |
| Durable Objects `TrucoSala` y `TrucoRegistro` | `worker/truco/salas.ts` |
| Rutas `/api/truco/*` | `worker/truco/rutas.ts` |
| Tipos mínimos de la plataforma | `worker/truco/plataforma.ts` |
| Pantalla del celular | `public/truco/` (`index.html`, `app.js`, `styles.css`) |
| Pantalla del local (QR + mesas) | `public/truco/tv/` |
| Política de contenido | `public/_headers`, solo para `/truco/*` |
| Pruebas | `worker/pruebas/truco-*.test.ts` |
| Prueba de punta a punta por WebSocket | `scripts/truco-e2e.mjs` |

## Probar en local

```bash
npm run build
npx wrangler dev --env dev --port 8787
```

- Celular: `http://<IP-de-la-compu>:8787/truco/`. Pantalla del local: `/truco/tv/` (abrirla con la IP, no con `localhost`, o el QR no sirve en los celulares).
- Prueba de punta a punta contra el servidor: `node scripts/truco-e2e.mjs http://localhost:8787 --api=truco`. Con `--reloj` prueba también el límite de tiempo y necesita el servidor levantado con `--var TRUCO_LIMITE_MS:3000`.
- El parámetro `--api=truco` va **sin barra inicial**: Git Bash en Windows convierte los argumentos que empiezan con `/` en rutas de disco.

## Reglas de juego

Truco argentino **sin flor**, 1 contra 1 o parejas, a 15 o 30 puntos (se elige al crear la sala). Truco, retruco y vale cuatro; envido, real envido y falta envido; "el envido está primero"; irse al mazo.

Simplificaciones de la v1:

1. El envido se revela solo al aceptarse (no hay "tengo X" ni "son buenas").
2. No se puede irse al mazo con un canto sin responder.
3. Falta envido vale lo que le falta al que va ganando para terminar. Hay otras variantes: **confirmar con jugadores reales antes del piloto**.
4. En parejas responde el rival a la izquierda de quien cantó, el tanto del equipo es el mejor de sus integrantes y no hay señas.

## Cómo funciona la sala

- `POST /api/truco/salas` crea una sala (código de 5 caracteres). `GET /api/truco/salas` lista las mesas para la pantalla del local. `GET /api/truco/sala/<código>/ws` conecta un celular por WebSocket.
- Cada celular genera un token al azar (en `localStorage`) que lo identifica. **El asiento sale del token en el servidor, nunca de lo que mande el cliente.** Con el mismo token se retoma el asiento si se recarga la página o se corta la señal.
- Con todos los asientos ocupados por personas la partida arranca sola. El anfitrión puede empezar antes; los lugares libres los ocupan bots, que figuran siempre como "Bot N" (el alias "Bot" está reservado).
- **Servidor autoritativo:** solo el servidor ve todas las cartas. Cada celular recibe únicamente su vista: nunca cartas ajenas sin jugar, tantos de envido ni tokens.
- **Límite de 45 segundos por jugada** para las personas. Si se vence, juega el bot por esa persona. Si se vence dos veces seguidas es abandono: la partida termina y gana el rival (en parejas, pierde el equipo entero). Jugar a tiempo reinicia la cuenta. El tiempo corre aunque el celular esté apagado.
- Una sala sin actividad se borra a las 6 horas; una partida terminada, a los 10 minutos. Máximo 100 salas abiertas.
- **Ranking:** solo cuentan las partidas entre personas. Cada sala marca `pvp: true` solo si todos los asientos eran personas al empezar. Todavía no hay ranking: está pendiente.

## Seguridad

- Entradas validadas: código de sala, token, alias (sin caracteres de control ni `<>&"'`, máximo 16, sin repetidos), configuración, tamaño de cuerpo (1 KB) y de mensaje (2 KB), JSON roto.
- Límite de 40 mensajes cada 10 segundos por conexión.
- Se rechaza un `Origin` ajeno al crear sala y al abrir el WebSocket.
- Todo texto de otros jugadores se escribe con `textContent`, nunca con `innerHTML`.
- Política de contenido estricta solo en `/truco/*` (`public/_headers`): sin scripts ni estilos en línea, conexiones solo al mismo origen.
- Un error dentro de las rutas del truco contesta 500 solo en `/api/truco/*`; el resto del sitio no se ve afectado.
- Sin secretos: el truco no usa ninguno.

## Entornos y apagado

- Los bindings `TRUCO_SALA` y `TRUCO_REGISTRO` están declarados en `wrangler.jsonc` en producción y en `dev` (no se heredan entre entornos). La migración `v2` crea las dos clases con SQLite.
- Sin los bindings, las rutas del truco contestan **503** y el resto del sitio sigue igual. Para apagar el truco sin tocar el código, quitar esos dos bindings.
- `TRUCO_LIMITE_MS` acorta el tiempo por jugada **solo para pruebas** (entre 1 y 300 segundos; cualquier otro valor usa los 45 normales). No definirla en producción.

## Pendiente

- Probar en iPhone y Android reales (Safari: verificar que `connect-src 'self'` deje pasar el WebSocket).
- Revisar las reglas con jugadores de truco.
- Ranking entre personas, por local, con tope de partidas contra el mismo rival por día.
- Protección contra alias ofensivos (hoy solo se limpia el texto) y un botón de reportar.
- Identificar el local en el QR (`?local=...`) para el ranking por local.
- Apuntar el QR impreso a un puerto `/o/<id>` para poder cambiar el destino sin reimprimir (requiere sumar el objeto a `worker/objects.json`).
- Pantalla del local en vivo (hoy consulta cada 3 segundos).
- Arte propio definitivo del mazo (el actual es geométrico y provisorio).
