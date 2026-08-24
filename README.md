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
