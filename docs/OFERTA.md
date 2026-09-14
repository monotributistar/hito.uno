# hito.uno — Escalera de oferta (borrador local)

- Estado: **borrador de trabajo, solo local.** No commitear ni publicar hasta que los
  socios lo revisen. Los precios están vacíos a propósito: los completan ustedes.
- Fecha: 2026-09-14
- Se apoya en `docs/DISENO.md` (sección 2, capacidad real) y no lo contradice.

---

## 1. Principio: qué se cobra una vez y qué se cobra por mes

Hito tiene tres capas (ver `DISENO.md`): **Objeto**, **Destino** y **Servicio**.
Se cobran distinto porque son cosas distintas.

| Capa | Qué es | Cómo se cobra | Por qué |
| --- | --- | --- | --- |
| Objeto | La pieza física impresa en 3D con NFC y QR | **Una vez** | Tiene costo de material e impresión. Es la puerta de entrada y el margen inicial. |
| Destino | La página o software que se abre al tocar | **Membresía mensual** | La página vive mientras la membresía esté activa. |
| Servicio | Configuración, cambios, mantenimiento | **Incluido en la membresía** | Es la razón visible para seguir pagando. |

El ingreso mínimo asegurado sale de las membresías. Los objetos financian el arranque.

**Regla de retención:** cada escalón tiene que tener una razón concreta por la cual el
cliente sigue pagando el mes 4. Si no la tiene, no se ofrece todavía.

---

## 2. Escalera para personas (prioridad 1)

### 2.0 Escalón de entrada: Hito Lite (decisión 2026-09-14)

Objetivo: **base de clientes**. El primer Hito tiene que ser accesible y servir de
verdad. Modelo mental: como los proveedores de IA, un plan base barato y planes
superiores con las herramientas complejas, con upgrade en cualquier momento.

| | Hito Lite |
| --- | --- |
| **Objeto** | Tarjeta **plana, solo QR, sin NFC**, impresión simple. Se parece a una tarjeta normal. El QR apunta a `hito.uno/p/<slug>`. |
| **Destino** | Página simple, la misma interfaz que tiene hoy Dana: nombre, título, bio, foto, WhatsApp, redes. |
| **Servicio** | **Sin mantenimiento.** Regla propuesta para que "sin mantenimiento" no genere churn: un cambio de datos por trimestre incluido, pedido por WhatsApp. Más cambios, o módulos, es upgrade. |
| **Precio** | 10.000 ARS / mes (a confirmar). Tarjeta incluida al contratar. Opción: 12 meses prepagos con descuento, mejora caja y baja el churn. |
| **Upgrade natural** | Tarjeta NFC impresa en 3D (Hito 1), módulos (Hito 2), a medida (Hito 3). El upgrade implica enviar un objeto nuevo: es un momento de contacto, no un click. |

**Prerrequisito técnico, el único que importa:** hoy dar de alta un cliente es editar
código en tres lugares, buildear y desplegar. Para un plan Lite eso es el cuello de
botella, no el precio. Antes de vender Lite hay que poder dar de alta un cliente
**en diez minutos sin tocar código**: registro de partners como datos (un JSON o
una planilla) que genere las páginas, y una sola ruta `/p/` que las sirva. Ver
sección 5.

**Riesgo de marca:** una tarjeta con QR se parece a cualquier tarjeta con QR. Lo que
la distingue es la página y la frase "Activado con hito.uno" al pie. El objeto con
chip sigue siendo el objeto de marca y aparece como el siguiente escalón visible.

### 2.0b Dónde va el NFC: el porta tarjetas Hito (idea 2026-09-14)

Las tarjetas Lite se quedan planas y normales. **El chip NFC va en un porta tarjetas
impreso en 3D**, portable, que lleva adentro las tarjetas Lite para repartir. Es el
objeto del escalón siguiente (Hito 1).

- El gesto cambia de "te doy una tarjeta" a "acercá tu celular" al porta tarjetas,
  y además se puede dar la tarjeta plana. Las dos cosas abren la misma página.
- Resuelve el problema físico: meter NFC en una tarjeta plana obliga a un grosor o
  material distinto. En el porta tarjetas el chip tiene lugar y protección.
- Es un objeto que vive en el bolsillo o el escritorio, se ve, y muestra lo que
  Hito sabe hacer con impresión 3D. Es el objeto de marca.
- Riesgos de diseño: marcar dónde está el chip y la orientación, que aguante el
  bolsillo, y que el tamaño no lo vuelva incómodo. Prototipar antes de anunciar.

### 2.0c Dashboard mínimo: cambiar a dónde apunta cada objeto

Decisión de alcance: el primer dashboard **no es de estadísticas ni de edición de
página**. Es una lista de "mis objetos" y a dónde apunta cada uno. Para eso, cada
objeto físico necesita apuntar a una **dirección propia con redirección** en vez de
directo a la página:

```
tarjeta Lite  →  hito.uno/o/ab12  →  (hoy) hito.uno/p/marca
tarjeta paquete → hito.uno/o/cd34 →  (este mes) "lo nuevo"; (el mes que viene) reseñas
porta tarjetas → hito.uno/o/ef56  →  hito.uno/p/marca
```

Por qué conviene desde el primer objeto impreso:

- Un QR impreso no se puede cambiar. Con redirección, sí se cambia a dónde lleva.
- Cada redirección se puede contar: son las métricas de toques, gratis, sin
  construir nada más. El dashboard de estadísticas sale de acá cuando se quiera.
- Reasignar objetos es el primer "poder" que el cliente siente como propio.

Costo técnico: es el primer backend real, pero chico. Un Worker con almacenamiento
clave-valor de Cloudflare (mismo proveedor que ya usan), una tabla `objeto → destino`,
y un acceso por link secreto por cliente o por link mágico a su WhatsApp/email. Sin
contraseñas ni cuentas. **Actualiza la decisión "dashboard: próximamente" de
`DISENO.md`: entra este alcance mínimo, no el panel completo.**

### 2.0d Valor percibido: implementación rápida

El cliente tiene que sentir que Hito ya funciona antes de que llegue el objeto.

- **La página va primero.** Se contrata, se completa el formulario (el mismo
  configurador de la landing) y **la página queda viva ese mismo día**. Se manda el
  link por WhatsApp: ya lo puede poner como link en bio. El objeto llega después,
  con la página ya funcionando.
- **Promesa con número.** "Tu página en 24 horas. Tu tarjeta en X días." Elegir X
  según la capacidad real de impresión y cumplirlo siempre.
- **Vista previa instantánea.** El configurador de la landing ya muestra "Tu primer
  hito / preview". Extenderlo para que el visitante escriba su nombre y vea su página
  antes de contratar. Gratificación inmediata, cero costo de servicio.
- **Sin app, sin cuenta, sin instalar.** Ya es verdad; decirlo como beneficio de
  velocidad, no solo de simpleza.
- **Momento de entrega.** La tarjeta llega y el QR o el porta tarjetas ya abren la
  página. Ese es el "wow" que se cuenta a otros.

Todo esto depende del paso 0 de la sección 5: alta sin tocar código. Sin eso, "24
horas" es una promesa que depende de que alguien despliegue.

| | Hito 1 · Presentarse | Hito 2 · Mostrar | Hito 3 · A medida |
| --- | --- | --- | --- |
| **Objeto (una vez)** | Tarjeta personal | Tarjeta + llavero personal (o segunda tarjeta) | Piezas a medida, cantidad a definir |
| **Destino (mensual)** | Página `/p/<slug>`: nombre, título, bio, WhatsApp, llamar, email, redes | Todo lo anterior + **un módulo de contenido** (propiedades, portfolio, servicios, agenda) | Software a medida: catálogo, base de datos o web propia en servidores de Hito |
| **Servicio incluido** | Configuración inicial + cambios menores de datos | + carga y actualización del módulo (ej. alta/baja de propiedades) | + mantenimiento del sistema, cambios funcionales acordados |
| **Razón para seguir pagando** | La página existe y se actualiza cuando pide | El contenido cambia seguido y lo cargan ustedes | El sistema es parte de su operación |
| **Precio objeto** | $ ____ | $ ____ | cotización |
| **Membresía mensual** | $ ____ | $ ____ | $ ____ (retainer) |
| **Para quién** | Cualquier persona que se presenta. Caso real: Dana Arcella. | Profesionales con algo que mostrar. Caso candidato: Daniela, módulo propiedades. | Quien necesita que el toque abra un sistema, no una página |
| **Estado** | **Disponible hoy** | Falta el sistema de módulos (ver sección 5) | Se cotiza caso por caso |

Notas:

- El Hito 1 tiene que ser muy fácil de decir que sí: objeto barato, membresía baja.
  Si el primer escalón asusta, no hay escalera.
- El Hito 2 se vende solo: quien tiene tarjeta y le funciona pide el módulo.
- Cada página termina con "Activado con hito.uno" (ya está implementado). Cada
  cliente es distribución.

---

## 2b. Perfil: emprendedora que vende por Instagram (Hito Vitrina)

Caso tipo: vende ropa u objetos por Instagram. Publica en stories, contesta "precio?"
por DM, cobra por transferencia o MercadoPago, envía por correo o moto. Precio
objetivo de Stephano: **10.000 ARS por mes**.

### Qué significa ese precio

Es precio de suscripción, no de producto físico. A ese valor el modelo solo funciona
si el costo de servicio por clienta es casi cero: **ella actualiza su catálogo sin
que Hito toque nada**, y la página es una plantilla. No entra en la lógica "nosotros
te cargamos el contenido" de los otros escalones.

### Qué le duele hoy y qué le damos

| Hoy | Con Hito Vitrina |
| --- | --- |
| Catálogo disperso en stories que desaparecen | Catálogo permanente en `hito.uno/p/<marca>`: foto, nombre, precio, disponible sí/no |
| "Precio?" cincuenta veces por DM | Precio visible y botón "Lo quiero" que abre WhatsApp con el producto ya escrito |
| Link en bio de terceros (Linktree y similares) | Su propia página con su nombre, como link en bio |
| Desconfianza del comprador nuevo | Página con nombre, foto, zona, medios de pago y envíos, más "Activado con hito.uno" |
| El paquete que envía no dice nada | Una tarjeta Hito dentro del paquete: "gracias, tocá para ver lo nuevo / dejar reseña / seguir" |

### Cómo se actualiza sin dashboard ni cuentas

El catálogo se lee de una **planilla de Google que ella edita** (una fila por
producto: nombre, precio, foto, disponible). Es el mismo patrón que ya usa el
formulario de la landing con Apps Script, pero al revés: la página lee la planilla en
vez de escribirla. Las fotos van a una carpeta de Drive compartida o se pegan como
link. Cero backend nuevo, cero autoservicio que construir: la interfaz de edición es
la planilla, que ya sabe usar.

Cuando exista el dashboard, este perfil migra solo. Hasta entonces, la planilla es
el dashboard.

### Qué es objeto y qué es membresía acá

| | Qué | Cobro |
| --- | --- | --- |
| Membresía | Página vitrina + catálogo desde planilla + botón WhatsApp + link en bio | 10.000 ARS / mes (a confirmar) |
| Objeto | Pack de tarjetas Hito para meter en cada paquete (ej. 25 o 50 unidades) | Una vez, por pack |
| Gancho | La primera tarjeta personal va incluida al contratar | — |

Nota: la tarjeta va **dentro** del paquete, no integrada al packaging. La integración
en packaging está descartada; esto es un objeto suelto.

### Por qué es buen escalón de entrada

- Cierra la compra sola, sin visita ni cotización.
- Cada paquete enviado lleva un Hito a la casa de alguien: distribución gratis.
- Es el perfil con más volumen en Cariló y Pinamar en temporada.
- Prueba el módulo Catálogo, que después reutilizan los comercios (Local 2).

### Riesgos

- A 10.000 ARS, veinte clientas son 200.000 ARS por mes. Es ingreso base, no
  negocio: sirve para asegurar piso y generar casos, no para vivir de esto.
- Si la planilla se rompe (columna borrada, foto sin permiso), la página tiene que
  seguir mostrando lo último que leyó bien, no un error.
- Hay que decidir el ajuste de precio por inflación desde el día uno.

---

## 3. Escalera para comercios (prioridad 2, después de un caso real de personas)

Misma lógica, distinto objeto y distintos módulos.

| | Local 1 · Estar | Local 2 · Operar | Local 3 · A medida |
| --- | --- | --- | --- |
| **Objeto (una vez)** | 1 placa o recibidor | Placa + apoyavasos (cantidad según mesas) | Piezas a medida |
| **Destino (mensual)** | Página `/p/<comercio>`: nombre, rubro, ubicación, horarios, WhatsApp, Wi-Fi (botón, no clave visible), Instagram | + menú o catálogo, + link a reseñas de Google, + link a su sistema de reservas | Catálogo con base de datos, pedidos, web propia |
| **Servicio incluido** | Configuración + cambios de horarios/datos | + actualización de menú/catálogo cuando pide | + mantenimiento del sistema |
| **Razón para seguir pagando** | La página y el Wi-Fi funcionan | El menú cambia y lo cargan ustedes | El sistema es parte del negocio |
| **Precio objeto** | $ ____ | $ ____ | cotización |
| **Membresía mensual** | $ ____ | $ ____ | $ ____ |
| **Estado** | Falta la plantilla comercio en `/p/` | Falta módulos | Se cotiza |

Primer comercio: elegir uno en Cariló o Pinamar que ya conozcan, hacerlo a costo o
gratis 3 meses a cambio de fotos reales y de poder contarlo como caso. Eso destraba
la página /casos que hoy está pospuesta por falta de casos reales.

---

## 4. Catálogo de módulos del destino

Los módulos son lo que diferencia un escalón de otro. Cada uno tiene un estado.

| Módulo | Qué muestra | Estado | Escalón |
| --- | --- | --- | --- |
| Contacto básico | Nombre, título, bio, WhatsApp, llamar, email, redes | **Hoy** (Dana) | Hito 1 / Local 1 |
| Ubicación y horarios | Mapa, dirección, horarios | Chico, falta hacer | Local 1 |
| Wi-Fi | Botón de conexión; la clave no queda en texto visible | Chico, falta hacer | Local 1 |
| Propiedades | Lista de propiedades con foto, precio, link a ficha o WhatsApp | **Primer módulo a construir** (Daniela) | Hito 2 |
| Portfolio | Galería de trabajos | Falta | Hito 2 |
| Servicios | Lista de servicios con descripción | Falta | Hito 2 |
| Menú / catálogo simple | Lista de ítems con precio, sin pedidos | Falta | Local 2 |
| Catálogo desde planilla | Lista de productos leída de un Google Sheet que edita la clienta; botón "Lo quiero" a WhatsApp | **Candidato a primer módulo** (Hito Vitrina) | Vitrina / Local 2 |
| Reseñas | Link directo a dejar reseña en Google | Chico, falta hacer | Local 2 |
| Reservas | Link al sistema de reservas que el cliente ya usa | Chico, falta hacer | Local 2 |
| Guardar contacto (vCard) | Botón que guarda el contacto en el celular | Chico, falta hacer. Idea pendiente desde el perfil de Dana | Hito 1 (mejora) |
| Métricas de toques | Cuánta gente tocó el objeto | **Próximamente** (dashboard). Mientras no exista: reporte manual mensual a cada cliente | Todos |
| Catálogo con base de datos, pedidos, web propia | Software a medida | A medida | Hito 3 / Local 3 |

---

## 5. Qué hay que construir para que la escalera exista

Hoy cada partner es una entrada fija en `src/partner/partners.ts` con los mismos
campos para todos. No hay módulos. Cambio mínimo, en este orden:

0. **Alta de cliente sin tocar código** (prerrequisito del plan Lite). Mover el
   registro de partners de `partners.ts` a datos (JSON en el repo o planilla), y que
   una sola ruta `/p/<slug>` sirva cualquier perfil sin necesitar un `index.html`
   por cliente ni una entrada en `vite.config.ts`. Dar de alta = agregar una fila y
   desplegar. Dana sigue funcionando igual.
1. **Registro con módulos opcionales.** Que cada partner pueda declarar, además de
   los datos de contacto, una lista de módulos con su contenido. Sin módulos, la
   página se ve igual que hoy: nada se rompe para Dana.
2. **Módulo Propiedades** como primer módulo real, diseñado sobre el caso de Daniela.
   Lista de propiedades con foto, título, zona, precio o "consultar", y un botón de
   WhatsApp con el mensaje prellenado con el nombre de la propiedad.
3. **Plantilla comercio** en `/p/`: mismo componente, variante con ubicación,
   horarios y Wi-Fi.
4. **Sección "Qué incluye" en la landing**, con las tres capas y los escalones, sin
   precios hasta que estén definidos.

Lo que NO hace falta para arrancar: cuentas de usuario, panel de autoedición, cobro
online. Se cobra por transferencia o el medio que ya usen; se factura a mano.

---

## 6. Preguntas abiertas (para los socios)

- Precios de objeto y membresía por escalón. Moneda y ajuste por inflación.
- Cómo se cobra la membresía: transferencia mensual, débito automático, MercadoPago.
- Qué pasa al dar de baja: la página deja de existir, o queda con un aviso "Hito
  inactivo" y el objeto sigue apuntando ahí. Recomendación: aviso, para que el
  objeto no quede muerto y la reactivación sea un mensaje.
- Plazo de entrega del objeto desde que se confirma.
- Si el primer comercio se hace gratis o a costo, y por cuánto tiempo.
- Daniela: confirmar si es una clienta nueva o se refiere a Dana Arcella.

---

## 7. Puertos: llaveros y merchandise como hipervínculos adicionales

Cada objeto físico es un **puerto**: un hipervínculo con su propia dirección de
redirección (`hito.uno/o/<id>`) que el cliente puede reasignar desde el dashboard
mínimo. Los escalones superiores se diferencian, entre otras cosas, por **cuántos
puertos incluyen**.

| Escalón | Puertos incluidos | Ejemplo de uso |
| --- | --- | --- |
| Lite | 1 (tarjeta QR) | Link en bio, presentarse |
| Hito 1 | 2 (porta tarjetas NFC + tarjeta) | Presentarse con gesto |
| Hito 2 | 3 o más (+ llavero personal) | El llavero apunta a portfolio o propiedades; la tarjeta al contacto |
| Hito 3 / Local | Los que el caso pida (llaveros, apoyavasos, placa, merchandise) | Cada mesa, cada llave, cada envío es un puerto distinto con destino propio |

Reglas:

- Un puerto nuevo se compra como objeto (una vez) y se activa en la membresía vigente
  sin cambiar de escalón, salvo que el escalón tenga tope de puertos.
- Todo merchandise futuro (lo que se modele en 3D) entra al catálogo solo si es un
  puerto: si no hay gesto que abra algo, no es Hito.
- Los llaveros ya tienen fotos hechas (4 de contexto + resultado): son el primer
  puerto adicional que se puede vender sin producir imágenes nuevas.

---

## 8. Roadmap cronológico

Orden real de ejecución, del primer paso al último. Cada etapa deja algo usable.

### Etapa 0 — Estructura (ahora)

1. Registro de perfiles como datos, no como código. Alta de perfil = una entrada
   nueva, sin HTML por cliente ni cambios en la config de build.
2. Ruta única `/p/<slug>` servida por un Worker: cualquier slug del registro abre
   su perfil.
3. Capa de redirección `/o/<id>` → destino, con la tabla de objetos en el repo.
   Primero sin conteo; el conteo se suma cuando exista almacenamiento en Cloudflare.
4. Tres perfiles: **Dana** (comercial, real) y **Stephano** y **Javier** (sandbox
   administrativos para probar sin tocar el de Dana).
5. Publicar en `dev.hito.uno`, verificar, PR a `main`.

### Etapa 1 — Primer objeto (semanas siguientes)

6. Diseño de la tarjeta Lite (plana, QR a `/o/<id>`) y prototipo del porta tarjetas
   NFC en 3D. **La tarjeta queda pendiente hasta cerrar la etapa 0.**
7. Precios de Lite y Hito 1; regla de "un cambio por trimestre".
8. Promesa de tiempo: "tu página en 24 horas, tu objeto en X días".

### Etapa 2 — Base de clientes

9. Ofrecer Lite a personas conocidas. Objetivo: primeras 10 membresías.
10. Almacenamiento en Cloudflare para la tabla de objetos + conteo de redirecciones.
11. Dashboard mínimo: lista de mis objetos y a dónde apunta cada uno, acceso por
    link secreto.

### Etapa 3 — Escalones superiores

12. Módulo Catálogo desde planilla (perfil Vitrina) y módulo Propiedades (Daniela).
13. Llavero como puerto adicional (Hito 2).
14. Plantilla comercio en `/p/` + primer local real gratis o a costo.

### Etapa 4 — Landing y cierre

15. Sección "Qué incluye" y tres puertas en la landing, con precios definidos.
16. Página /casos con el primer caso real.
17. Dashboard de métricas a partir del conteo de redirecciones.

**La página se toca al final** (etapa 4), como pidió Stephano: primero la
estructura y el backend, después lo que se ve.
