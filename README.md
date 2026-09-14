# hito.uno

Una aplicación React mínima publicada como Cloudflare Worker en
[hito.uno](https://hito.uno).

## Desarrollo local

```bash
npm install
npm run dev
```

## Validación y despliegue

```bash
npm run check
npm run deploy
```

`wrangler.jsonc` enlaza el Worker `hito-uno` con el dominio personalizado
`hito.uno`. Para desplegar se necesita una sesión de Wrangler autenticada con
acceso a la cuenta de Cloudflare que administra el dominio.

`npm run check` corre, en este orden: el verificador de rutas, `tsc`, el build y
un `wrangler deploy --dry-run`.

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

## Verificación de rutas

`scripts/check-paths.mjs` (`npm run check:paths`) falla si:

- quedan restos del versionado viejo (`v01`, `v02`, `LandingV0x`) en código o config;
- el `src` de un `<script>` o una entrada de `vite.config.ts` apunta a un archivo
  que no existe;
- **una foto declarada en `landing-data.ts` no está en `public/`**.

Ese último es el que más rinde: una ruta mal escrita compila, buildea y se
despliega sin una sola queja, y solo deja un hueco en el carrusel. También avisa
—sin frenar el build— de fotos que están en `public/` y nadie usa.

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

## Puertos: redirecciones de objetos (`/o/<id>`)

Los objetos físicos no llevan impresa la URL del perfil sino `hito.uno/o/<id>`.
El Worker la redirige (302, sin cache) al destino que diga `worker/objects.json`.
Así un QR ya impreso se puede reapuntar cambiando una línea de esa tabla: la
tarjeta del paquete puede llevar este mes a "lo nuevo" y el mes que viene a las
reseñas. Un id que no está en la tabla va a la landing con `?o=<id>`, nunca a un
error.

Para probar Worker y perfiles juntos en local: `npm run dev:worker` (buildea y
levanta wrangler en `localhost:8787`). El `npm run dev` de Vite no ejecuta el
Worker: ahí los perfiles se prueban con `localhost:5173/p/?p=<slug>`.

Los perfiles llevan `noindex, nofollow` — se llega por el objeto o por el link
directo, no por buscadores.
