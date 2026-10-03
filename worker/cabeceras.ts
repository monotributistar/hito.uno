/* Cabeceras de seguridad.

   El paso de HTTP a HTTPS NO se hace aca, y la razon importa: la landing, el
   CSS y las fotos no pasan por el Worker (solo /p/, /o/, /panel/ y /api/ lo
   ejecutan), asi que una redireccion nuestra dejaria justamente a la pagina
   principal contestando por HTTP. Ademas, en `wrangler dev` el Worker ve los
   pedidos como `http://dev.hito.uno`, asi que una redireccion por protocolo se
   dispara siempre en local y rompe `npm run dev:worker`. Eso lo resuelve
   Cloudflare con "Always Use HTTPS", que cubre todo el dominio. Ver
   docs/SEGURIDAD.md.

   Son las cuatro reglas baratas: cuestan una linea cada una, no cambian lo que
   se ve y no pueden romper la pagina. La quinta, una CSP completa que diga de
   donde se puede cargar cada cosa, NO esta aca a proposito: el sitio carga
   tipografias de Google, la analitica que Cloudflare inyecta sola y, en los
   perfiles con catalogo, una planilla. Una CSP mal escrita las corta en
   silencio y la pagina queda rota sin un solo error visible. Va aparte, primero
   en dev y mirando que se rompe.

   `frame-ancestors` si esta: es la unica directiva de CSP que no puede romper
   nada propio, porque solo decide quien nos puede meter adentro de un iframe. */

/** Las cabeceras que lleva toda respuesta del Worker. La misma lista esta en
    `public/_headers`, para los archivos que Cloudflare sirve sin pasar por
    aca: si se cambia una, hay que cambiar la otra. */
const CABECERAS: Record<string, string> = {
  /* Que el navegador no adivine el tipo de un archivo. Sin esto, algo subido
     como texto puede terminar ejecutandose como script. */
  'X-Content-Type-Options': 'nosniff',
  /* Al salir del sitio se manda el dominio, nunca la direccion completa. El
     link del panel va en la URL (`/panel/<token>`): sin esto, un clic desde el
     panel hacia afuera le regala el token al otro sitio. */
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  /* Que nadie nos muestre adentro de su pagina haciendose pasar por nosotros.
     Las dos formas de decirlo: la vieja que entienden todos y la nueva. */
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
}

/* HSTS: el navegador recuerda que este dominio es solo HTTPS y no vuelve a
   intentar por HTTP, ni aunque alguien le cambie el link. Seis meses, sin
   `includeSubDomains` ni `preload`: los dos son dificiles de dar marcha atras
   —preload hay que pedir que lo saquen de una lista de los navegadores— y acá
   no hacen falta todavia. */
const HSTS = 'max-age=15552000'

/** Una respuesta igual a la de entrada, con las cabeceras agregadas.
    No pisa lo que la respuesta ya traiga: `Cache-Control`, `Content-Type` y
    `Content-Disposition` (el vCard) quedan como estaban. */
export function conCabeceras(response: Response, esHttps: boolean): Response {
  const salida = new Response(response.body, response)
  for (const [nombre, valor] of Object.entries(CABECERAS)) {
    if (!salida.headers.has(nombre)) salida.headers.set(nombre, valor)
  }
  /* HSTS por HTTP no significa nada y el navegador lo ignora: se manda solo
     cuando la conexion ya es segura. */
  if (esHttps && !salida.headers.has('Strict-Transport-Security')) {
    salida.headers.set('Strict-Transport-Security', HSTS)
  }
  return salida
}
