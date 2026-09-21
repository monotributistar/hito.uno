# hito.uno

Una aplicación React mínima publicada como Cloudflare Worker en
[hito.uno](https://hito.uno).

Cómo se reparte el trabajo entre chats de Claude Code (ORQ, UX, PLAT, SEC) y el
flujo de PRs: [`docs/EQUIPO.md`](docs/EQUIPO.md).

## Desarrollo local

```bash
npm install
npm run dev
```

**Las dependencias van con versión, no con `latest`.** Hasta el 2026-09-20
`package.json` decía `"latest"` en casi todas: con `npm ci` el lockfile las
sujetaba, pero cualquier `npm install` podía traerse una versión mayor nueva de
React, de Vite o de Wrangler y romper el build sin que nadie hubiera tocado una
línea del proyecto. Ahora cada una lleva `^` sobre la versión instalada, que deja
entrar correcciones pero no versiones mayores.

Dos van clavadas sin `^`: `three` y `@types/three`. Ese paquete está en `0.x` y
rompe en cada versión menor, así que ahí `^` no protege de nada (para npm,
`^0.185.1` solo acepta `0.185.x`, pero el proyecto publica cambios incompatibles
en `0.186`). Actualizarlas es una decisión, no un arrastre.

Para subir algo a propósito: `npm install <paquete>@latest`, y que el cambio
entre por un PR con `npm run check` en verde.

## Validación y despliegue

```bash
npm run check
npm run deploy
```

`wrangler.jsonc` enlaza el Worker `hito-uno` con el dominio personalizado
`hito.uno`. Para desplegar se necesita una sesión de Wrangler autenticada con
acceso a la cuenta de Cloudflare que administra el dominio.

`npm run check` corre, en este orden: el verificador de rutas, el de
placeholders, `tsc`, el build, las pruebas y el verificador de entornos.

**Placeholders** (`npm run check:placeholders`). Regla de Stephano del
2026-09-21: lo que todavía no se sabe va como placeholder, marcado en el código con
la palabra `PLACEHOLDER` (exacta, en mayúsculas), y **un placeholder no va a
producción**. El verificador busca la marca en `src/`, `public/`, `worker/` y los
HTML de entrada (deducidos de `vite.config.ts`), sin `docs/` ni archivos de prueba:

- en un PR hacia `main` **falla** y lista archivo y línea de cada marca;
- en cualquier otro caso (PRs a `dev`, una corrida local) **solo avisa**, porque
  un placeholder en dev es lo esperado.

Sabe a dónde va el PR por `GITHUB_BASE_REF`, que GitHub completa solo. Para
probarlo a mano como si fuera el pase: `node scripts/check-placeholders.mjs
--destino=main`. `main` no tiene protección de rama: una validación en rojo avisa,
pero no impide mergear.

`scripts/check-entornos.mjs` (`npm run check:entornos`) hace un
`wrangler deploy --dry-run` de **los dos entornos**, no solo de producción, y
verifica que cada uno quede con las variables que le corresponden:
`REENVIO_CONSULTAS` en `"on"` en producción y en `"off"` en dev. Falla si una
falta o tiene otro valor.

Por qué se verifica eso y no alcanza con mirar el archivo: si alguien borra la de
producción, el formulario sigue guardando la consulta pero deja de mandarla a la
planilla y **no se nota**, porque hoy ninguna ruta lee las guardadas
(`pendingLeads` en `worker/store.ts`); y si alguien pone dev en `"on"`, una
prueba de carga escribe en la planilla donde miramos los pedidos reales. Las dos
fallas son silenciosas. Además, antes el `--dry-run` era solo de producción: un
error en el bloque `env.dev` de `wrangler.jsonc` pasaba la validación de GitHub y
aparecía recién en el deploy, con el cambio ya en `dev.hito.uno`.

## Los dos entornos

| Rama | Se despliega en | Qué es |
| --- | --- | --- |
| `dev` | [dev.hito.uno](https://dev.hito.uno) | Donde se prueba. Cada push despliega solo. |
| `main` | [hito.uno](https://hito.uno) | Producción. Solo entra por PR. |

Son **dos Workers distintos** (`hito-uno-dev` y `hito-uno`): lo que pasa en uno
no toca al otro. El flujo para trabajar sin exponer nada a medio hacer:

```bash
git checkout dev
git pull                     # dev tiene que arrancar igualada con main
# ...trabajar, commitear...
git push                     # se despliega en dev.hito.uno
```

Cuando está listo, PR de `dev` a `main`.

**No agregar páginas “escondidas” tipo `/v03.html` para probar.** Eso ya se hizo
con `v01.html` y `v02.html` y terminó en carpetas duplicadas que divergieron en
silencio: `v02` mandaba el formulario al Apps Script mientras `v01` seguía con un
`mailto:` que nadie leía. Un `noindex` no oculta nada: el archivo se buildea, se
publica y entra cualquiera que sepa la URL. Para eso está `dev.hito.uno`.

`dev.hito.uno` es público para quien conozca el subdominio. Si hace falta que sea
privado de verdad, hay que ponerle Cloudflare Access por delante.

## Formulario de la landing

El formulario **no le habla a Google desde el navegador**. Manda la consulta a
`POST /api/lead` de nuestro Worker, que:

1. descarta el envío si viene con la trampa anti-spam (`hp`) completa;
2. valida y recorta los campos, y frena más de 5 envíos por minuto desde la misma
   IP (guarda un hash corto, nunca la IP);
3. **guarda la consulta en el almacén antes de intentar nada más**;
4. contesta al navegador enseguida y reenvía a la planilla en segundo plano,
   **pero solo en producción**.

**En `dev.hito.uno` la consulta no llega a la planilla.** Se guarda en el almacén
de dev y queda marcada con el motivo. Reenvía únicamente el entorno que declara
`REENVIO_CONSULTAS: "on"` en `wrangler.jsonc`, y ese es producción: la planilla es
una sola, así que un entorno de prueba que reenvíe ensucia el lugar donde miramos
los pedidos reales. Ver `docs/SEGURIDAD.md`.

Por qué así:

- Antes el navegador posteaba con `mode: 'no-cors'`, que impide leer la respuesta:
  la página decía "enviado" aunque hubiera fallado. Pasó de verdad, semanas sin una
  sola consulta y sin enterarse.
- Si Google falla, la consulta ya está guardada y queda marcada con su error
  (`pendingLeads()` en `worker/store.ts`).
- El ida y vuelta a Apps Script tarda varios segundos: por eso va en segundo plano
  con `ctx.waitUntil` y la persona ve la confirmación al instante.
- El cuerpo se manda con los caracteres no ASCII escapados. Sin eso, en el salto de
  redirección de Apps Script se pierde el charset y a la planilla llegan
  "85 ? 54 mm" o "Identificaci?n". Verificado contra la planilla real.
- La URL del Apps Script vive en `worker/leads.ts`. Antes viajaba en el código de la
  página y la veía cualquiera.

## Guardar contacto y compartir

Cada perfil ofrece dos acciones de utilidad debajo de sus canales:

- **Guardar contacto** apunta a `/p/<slug>/contacto.vcf`, que arma el Worker desde
  `partners.json` (`worker/vcard.ts`). Se sirve `inline` con `text/vcard` para que
  el celular abra la ficha y ofrezca agregarla a la agenda. **No se escribe el vCard
  en el chip**: ahí los datos quedan congelados y iOS no lo lee bien sin una app
  abierta; desde la URL anda en todos y se puede cambiar sin reimprimir.
  Formato vCard 3.0, sin foto. Ver `docs/REFERENCIAS-PERFIL.md`.
- **Compartir** usa el menú del sistema cuando existe y, si no, copia el link al
  portapapeles. Comparte `/p/<slug>`, nunca el puerto `/o/<id>`.

## Panel del cliente (`/panel/<token>`)

El cliente abre un link secreto y ve **su Hito y a dónde apunta**. Cambia la URL,
guarda, y el próximo toque ya va al destino nuevo. Sin cuenta, sin contraseña.

- Los destinos y los tokens viven en un **Durable Object con SQLite**
  (`worker/store.ts`, binding `STORE`). Se crea solo con la migración de
  `wrangler.jsonc`: no hay que crear nada a mano en Cloudflare.
- `worker/objects.json` es la **semilla**: se carga la primera vez y después manda
  la base. Si el almacén no responde, el toque cae al JSON y nunca a un error.
- `worker/tokens.json` tiene los links secretos. **Solo de perfiles sandbox del
  equipo**: un token de cliente real no se commitea. `npm run check` falla si
  aparece uno que no sea sandbox.
- El token viaja por header (`X-Hito-Token`), nunca en la URL de la API: la URL
  `/panel/<token>` solo carga la app.
- Las sugerencias debajo del campo (Mi página, Mi WhatsApp, Mi Instagram, Mi
  catálogo) se arman en el Worker desde `partners.json`.

Probar en local: `npm run dev:worker` y abrir `localhost:8787/panel/<token>`.
El `npm run dev` de Vite no ejecuta el Worker, así que ahí no hay API.

## Pruebas

```bash
npm test          # una corrida
npx vitest        # se queda mirando los archivos, para trabajar
```

Viven en `worker/pruebas/` (el servidor) y `src/demo/pruebas/` (la demo de
reservas), y entran en `npm run check`, así que las corre la validación de GitHub
en cada PR. Tardan alrededor de un segundo.

**No están para tener cobertura, sino para que no vuelva a pasar lo que ya
pasó.** Cada una cuida una decisión que costó un celular en la mano o una
planilla con datos rotos, y el mensaje de error dice por qué la cosa estaba así:

- **`vcard.test.ts`** — que ninguna línea se corte (Contactos de Google en
  Android no une la continuación y mezcla los campos), que el archivo use CRLF,
  que el teléfono quede solo con dígitos, que las comas y los punto y coma se
  escapen, y que un perfil sin datos opcionales igual arme un archivo válido.
- **`body.test.ts`** — el tope de tamaño de los cuerpos: que lo grande se
  rechace con 413 y lo roto con 400, que un envío del tamaño exacto del tope
  entre, y sobre todo **que sin `Content-Length` corte igual y deje de
  descargar** apenas se pasa. Ese encabezado puede faltar o mentir, así que si
  solo se mirara eso, un cuerpo enorme entraría entero en memoria.
- **`leads.test.ts`** — **que con el reenvío apagado no salga nada hacia
  Google** (lo pidió SEC 1 antes de atacar el formulario en dev), que con el
  reenvío prendido el cuerpo viaje en ASCII puro (si no, a la planilla llegan
  "85 ? 54 mm" y "Identificaci?n"), que la trampa anti-spam no guarde ni
  reenvíe, que el freno corte el envío y que solo entren los campos declarados.

Se corren con **Vitest**. La primera opción fue `node --test`, que no suma
dependencias, pero el código del Worker importa sin extensión (`./body`,
`./store`), como espera un empaquetador, y Node no resuelve eso sin escribirle
un cargador a mano. Vitest reutiliza el Vite que el proyecto ya usa, entiende
TypeScript sin configuración y no necesita nada más.

`handleLead` recibe el almacén y el `waitUntil` como parámetros, así que se
prueba entero sin Cloudflare: se le pasa un almacén de mentira y se vigila
`fetch` para ver si alguien sale a la red.

## Verificación de rutas

`scripts/check-paths.mjs` (`npm run check:paths`) falla si:

- quedan restos del versionado viejo (`v01`, `v02`, `LandingV0x`) en código o config;
- el `src` de un `<script>` o una entrada de `vite.config.ts` apunta a un archivo
  que no existe;
- **una foto declarada en `landing-data.ts` no está en `public/`**;
- un puerto de `objects.json` apunta a una ruta interna que no existe como página;
- una página comercial lleva `noindex`, o una demo (`/demo/...`) no lo lleva (ver
  más abajo).

El de las fotos es el que más rinde: una ruta mal escrita compila, buildea y se
despliega sin una sola queja, y solo deja un hueco en el carrusel. También avisa
—sin frenar el build— de fotos que están en `public/` y nadie usa, y de páginas
sin `og:image`.

Las rutas que el sitio sirve no están escritas a mano en el verificador: se
deducen de las entradas de `vite.config.ts`, así que agregar una página las
actualiza solas.

## Páginas comerciales (`/software`, `/comercios`, `/personal`, `/objetos`)

Una página por conversación: cuando le escribís a alguien, le mandás el link que
habla de lo suyo y no la landing, que habla de todo.

Cada página es **una entrada estática propia** (`software/index.html` y
compañía), no una ruta resuelta por el Worker. El motivo es la vista previa: esos
links se mandan por WhatsApp, y **WhatsApp no ejecuta React**, así que el título y
la descripción tienen que estar en el HTML desde el build. Por lo mismo no llevan
`noindex`: estas páginas sí se buscan y sí se comparten, al revés que los perfiles
y el panel.

El contenido de las cuatro vive en `src/paginas/paginas-data.ts` y lo dibuja un
solo componente (`src/paginas/Pagina.tsx`), con una sola entrada de código
(`main-pagina.tsx`) que elige la página por la ruta, como `/p/<slug>` hace con el
perfil.

**Agregar una página** son tres pasos y ninguno es tocar el Worker:

1. una entrada en `PAGINAS` (`src/paginas/paginas-data.ts`), con su `ruta`;
2. el HTML de entrada (`<ruta>/index.html`), copiando uno existente y cambiando
   título, descripción y `og:url`;
3. la línea en `vite.config.ts`.

Cada página tiene además su **puerto** (`/o/pg-<nombre>` en `worker/objects.json`)
para poder mandarla impresa o por QR y contar cuánta gente entró por ahí. Esos
puertos van con dueño `hito`: no son objetos de un cliente y no aparecen en
ningún panel.

## Demo de reservas (`/demo/reservas`)

La prueba que acompaña a la página de Software a medida: la página de una
**propiedad inventada** (Casa Viento Norte) con su formulario de consulta. Un
propietario de alquiler temporario la abre en el celular, hace una consulta de
prueba y ve cómo le quedaría su propia página.

**No guarda ni manda nada.** Ni a una planilla, ni al almacén del Worker, ni a
Google: al enviar, la misma página muestra lo que quedó cargado. Es pública y la
gente va a probar con sus datos reales, así que no hay que retenerlos; tampoco
abre una puerta al spam ni carga el almacén. La franja de arriba lo dice siempre
y el resumen dice "no se envió", nunca "enviado".

- La propiedad vive en `src/demo/propiedad.ts`: nombre, capacidad, ambientes y
  servicios. Sin dirección, sin precio y sin teléfono, para que nunca parezca un
  alojamiento real. Las fotos van en `fotos` cuando existan, marcadas como
  ilustrativas.
- La validación está en `src/demo/validar.ts`, en funciones puras, con sus pruebas
  en `src/demo/pruebas/`. El día de hoy se calcula con la hora **local** del
  celular: con la hora universal, en Argentina después de las 21 ya sería mañana y
  se rechazaría una llegada para hoy.
- Lleva `noindex`, al revés que las páginas comerciales: una casa que no existe no
  tiene que aparecer en Google. `check-paths` exige esa meta en todo lo que viva
  bajo `/demo/`.

## Perfiles partner (`/p/<slug>`)

Cada objeto de un cliente (tarjeta, llavero, porta tarjetas) abre
`hito.uno/p/<slug>`: una página estática y liviana con sus canales de contacto
(WhatsApp, Instagram, Facebook). No carga el mapa 3D, porque el visitante llega
desde el celular y buscando resolver algo en un gesto.

Para dar de alta un partner nuevo hay **un solo paso**: agregar su entrada en
`src/partner/partners.json`. Los links de WhatsApp llevan `phone` y los de
Instagram `handle`; el módulo `partners.ts` arma los `href` y falla el build con
un mensaje claro si falta un dato. No hace falta crear HTML ni tocar
`vite.config.ts`: hay una sola entrada (`p/index.html`) y el Worker
(`worker/index.ts`) la sirve para cualquier `/p/<slug>` que no exista como
archivo. El slug se lee de la URL en el cliente.

Los perfiles con `"sandbox": true` son del equipo (Stephano, Javier) y sirven para
probar cambios sin tocar el de un cliente.

## Módulos del perfil

Un perfil puede declarar `modules` en `partners.json`: secciones debajo de los
links. Son lo que diferencia un escalón de otro en la oferta.

### Catálogo (`type: "catalogo"`)

Lista de productos leída de una planilla de Google que edita el cliente. No hay
backend: la página descarga la planilla como CSV desde el navegador.

```json
{ "type": "catalogo", "title": "Catálogo", "sheetId": "<id de la planilla>", "whatsapp": "+54 9 ..." }
```

- La planilla tiene que estar compartida como **"cualquiera con el enlace: lector"**.
  Si no, Google devuelve un login y la página muestra "no disponible".
- Primera fila = cabecera. Columnas: `nombre` (obligatoria), `precio`,
  `descripcion`, `foto`, `disponible`. Orden, mayúsculas y acentos no importan.
  Plantilla en `public/catalogos/ejemplo.csv`.
- `precio` vacío muestra "Consultar"; `disponible` = `no` muestra "Sin stock" y
  oculta el botón. Un número se formatea como `$ 12.500`.
- `foto` acepta cualquier URL de imagen o un link de Drive compartido con enlace.
- "Lo quiero" abre WhatsApp al número del módulo con el producto ya escrito. Sin
  `whatsapp`, usa el link destacado del perfil.
- Si la planilla falla, la página muestra la última lectura buena guardada en el
  dispositivo. Google cachea la exportación unos minutos: un cambio tarda eso en verse.
- `csvUrl` en vez de `sheetId` sirve para pruebas o un catálogo servido desde el sitio.

## Puertos: redirecciones de objetos (`/o/<id>`)

Los objetos físicos no llevan impresa la URL del perfil sino `hito.uno/o/<id>`.
El Worker la redirige (302, sin cache) al destino que diga `worker/objects.json`.
Así un QR ya impreso se puede reapuntar cambiando una línea de esa tabla: la
tarjeta del paquete puede llevar este mes a "lo nuevo" y el mes que viene a las
reseñas. Un id que no está en la tabla va a la landing con `?o=<id>`, nunca a un
error.

Cada redirección se cuenta en Analytics Engine (binding `TOQUES`, dataset
`hito_toques` en producción y `hito_toques_dev` en dev) **cuando el binding está
activo**. Hay que habilitar Analytics Engine una vez en el panel de Cloudflare
(Workers & Pages → Analytics Engine → Enable) y descomentar los dos bloques
`analytics_engine_datasets` en `wrangler.jsonc`; sin eso el deploy falla con el
error 10089. El dataset aparece con el primer toque. Se consulta con SQL desde la API de
Cloudflare cuando haya que mostrar métricas por objeto.

**Destinos editables sin deploy (dashboard mínimo):** el Worker mira primero la
clave `to:<id>` en el KV `PUERTOS` y, si no existe, usa `objects.json`. El
binding está comentado en `wrangler.jsonc` hasta que se cree el namespace:

```bash
npx wrangler login
npx wrangler kv namespace create PUERTOS
npx wrangler kv namespace create PUERTOS --env dev
```

Pegar los ids en los dos bloques `kv_namespaces` (raíz y `env.dev`). Reapuntar
un objeto es entonces `npx wrangler kv key put --binding PUERTOS "to:t-dana-01" "/p/danaarx"`
(con `--env dev` para dev), sin tocar el repo.

Para probar Worker y perfiles juntos en local: `npm run dev:worker` (buildea y
levanta wrangler en `localhost:8787`). El `npm run dev` de Vite no ejecuta el
Worker: ahí los perfiles se prueban con `localhost:5173/p/?p=<slug>`.

Los perfiles llevan `noindex, nofollow` — se llega por el objeto o por el link
directo, no por buscadores.
