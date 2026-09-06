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

## Perfiles partner (`/p/<slug>`)

Cada objeto NFC de un cliente apunta a `hito.uno/p/<slug>`: una página estática
y liviana con sus canales de contacto (WhatsApp, Instagram, Facebook). No carga
el mapa 3D, porque el visitante llega desde el celular y buscando resolver algo
en un gesto.

Para dar de alta un partner nuevo:

1. Agregar su objeto `Partner` en `src/partner/partners.ts`. Los links de
   WhatsApp e Instagram se arman con los helpers `whatsappHref()` e
   `instagramHref()`, que normalizan el número y el `@usuario`.
2. Crear `p/<slug>/index.html` copiando el de un partner existente y cambiando
   el `data-partner`, el `<title>` y los `og:*`.
3. Sumar esa entrada a `build.rollupOptions.input` en `vite.config.ts`.

El paso 3 no es opcional: sin la entrada de build la URL no existe como asset y
Cloudflare devuelve la landing principal por el `not_found_handling` del Worker.

Los perfiles llevan `noindex, nofollow` — se llega por el objeto o por el link
directo, no por buscadores.
