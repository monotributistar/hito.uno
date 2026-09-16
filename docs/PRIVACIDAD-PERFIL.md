# Privacidad del perfil (`/p/<slug>`)

- Fecha: 2026-09-15
- Decisión de Stephano: **el perfil se diseña con la privacidad primero.** Lo
  comercial vive en la landing, no adentro de la página de un cliente.

---

## 1. Dos reglas de diseño

### 1.1 El perfil de un cliente no lleva contenido comercial de Hito

Un visitante que ve el perfil de una persona no tiene que preguntarse si, cuando él
contrate, su propia página va a tener publicidad ajena. Esa duda mata la venta.

Por eso, dentro de `/p/<slug>` solo va lo del cliente: su foto, su nombre, sus
canales, su contenido. Lo único de Hito es **una línea al pie** ("Activado con
hito.uno"), del tamaño de una firma, que es lo que hace crecer el negocio sin
apropiarse de la página.

Aplicado el 2026-09-15: se sacó el catálogo de productos Hito del perfil de Stephano,
aunque él sea cofundador. Si su propio perfil vende Hitos, cualquiera que lo mire va a
suponer que el suyo también va a vender algo.

**Dónde va entonces la muestra comercial:** en la landing, que ya tiene el carrusel
de soportes y la sección "Qué incluye". El perfil sirve como muestra justamente por
lo contrario: es limpio, y lo que el cliente ve es *cómo va a quedar el suyo*.

### 1.2 Lo que la página pide a terceros se mantiene al mínimo

Cada recurso que la página carga de otro dominio le entrega a ese tercero la IP del
visitante. En una página que abre un objeto físico, el visitante no eligió nada: solo
acercó el celular. La vara tiene que ser más alta que en un sitio común.

---

## 2. Auditoría del 2026-09-15

Medido con un navegador limpio contra `dev.hito.uno/p/<slug>`.

| | Resultado |
| --- | --- |
| Cookies | **Ninguna** |
| `localStorage` | Vacío. Solo escribe una clave el módulo catálogo, para mostrar la última lectura buena si la planilla falla. |
| `sessionStorage` | Vacío |
| Service worker | No |
| Indexación | `noindex, nofollow` |
| Peticiones al propio dominio | HTML, JS, CSS, fotos |

**Terceros que hoy sí aparecen:**

| Host | Qué es | Qué ve |
| --- | --- | --- |
| `fonts.googleapis.com` y `fonts.gstatic.com` | Las tipografías DM Sans y Space Mono, cargadas desde Google | IP del visitante, agente de usuario, referente |
| `static.cloudflareinsights.com` | Analítica de navegador que Cloudflare inyecta sola en el sitio | Métricas de carga; sin cookies, pero es un tercero |
| `docs.google.com` | **Solo en perfiles con catálogo en planilla.** El navegador del visitante baja el CSV | IP del visitante |

**Resuelto el 2026-09-15 en la landing:** el formulario ya no le pega a Google desde
el navegador. Manda la consulta a nuestro Worker y el reenvío a la planilla lo hace
el servidor. Falta hacer lo mismo con el catálogo (punto 3 de la lista de abajo).

---

## 3. Qué falta para poder decir "esta página no te rastrea"

No se escribe la frase en la página hasta que sea cierta. En orden:

1. **Alojar las tipografías en nuestro dominio.** DM Sans y Space Mono tienen licencia
   SIL Open Font License, que permite servirlas uno mismo. Saca a Google del recorrido
   y además la página carga más rápido. Cambia `src/styles.css` y afecta a todo el
   sitio, no solo al perfil.
2. **Apagar la analítica de navegador de Cloudflare** para el dominio. Es un
   interruptor en el panel de Cloudflare; no se puede desde el repo. Nuestro conteo de
   toques no depende de eso: lo hace el Worker del lado del servidor, sin cookies.
3. **Catálogo desde planilla:** cuando un cliente lo use, su visitante le pega a
   Google. Alternativa: que el Worker traiga el CSV y lo sirva desde nuestro dominio,
   con caché corta. Así el visitante no habla con Google.
4. Recién ahí, una línea discreta al pie: *sin cookies, sin rastreo*.

---

## 4. Lo que ya está bien y conviene no perder

- La página pesa poco y no carga el mapa 3D.
- No hay cuentas, ni login, ni sesión: nada que guardar de quien visita.
- `noindex`: el perfil no aparece en buscadores, se llega por el objeto o por el link.
- El conteo de toques es del lado del servidor y agregado: objeto, país y tipo de
  dispositivo. No hay identificador por persona.
- El archivo de contacto se arma en el momento y no deja rastro del que lo descarga.
