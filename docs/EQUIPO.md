# Equipo de chats de hito.uno

Este archivo es la puerta de entrada para cualquier chat de Claude Code que trabaje
en hito.uno. Stephano lo pasa al arrancar una conversación y después dice
**"vos sos SEC 1"** (o el código que toque).

**Si sos un chat que acaba de leer esto y te asignaron un código:**

1. Leé la sección de tu rol más abajo y los documentos que indica.
2. Respondé en pocas líneas: quién sos, qué vas a hacer y qué no vas a tocar.
3. Antes de cambiar código, creá tu rama desde `dev` (ver "Flujo de trabajo").

Si todavía no te asignaron código, podés charlar en general sobre el proyecto o
sobre este esquema, pero no toques el repo.

---

## 1. Qué es hito.uno, en corto

Emprendimiento de Stephano Arcella y su socio Javier, con base en Cariló.

- **Objetos físicos** impresos en 3D por ellos (tarjetas, porta tarjetas, llaveros,
  apoyavasos, placas) con **NFC y QR** que abren una página en `hito.uno`.
- **Perfiles** en `hito.uno/p/<slug>`: la página de cada cliente.
- **Puertos** en `hito.uno/o/<id>`: la dirección que va impresa en el objeto y que se
  puede reapuntar sin reimprimir.
- **Panel Lite** en `hito.uno/panel/<token>`: el cliente cambia a dónde apunta su Hito.
- **Software a medida** en servidores propios: webs, bases de datos, catálogos.

No es una idea en cero: hay sitio en producción y un cliente real (Dana).

Stack: React + TypeScript + Vite, Cloudflare Worker con Durable Object (SQLite).
El detalle técnico está en el `README.md`.

---

## 2. Los chats

Cada chat tiene un **código de área** y un **número de sesión**.

| Código | Área | En una línea |
| --- | --- | --- |
| **ORQ** | Orquestador | Prioriza, revisa y mergea los PRs a `dev`, arma el pase a `main` |
| **UX** | UX/UI y contenido | Lo que se ve y lo que se lee |
| **PLAT** | Plataforma | Servidor, almacén, APIs, build y CI |
| **SEC** | Seguridad | Levanta capas de protección y las ataca en dev |
| **MOD** | Módulos del perfil | Explora plantillas de módulo y las documenta. No toca código |
| **OFE** | Oferta y clientes | Precios, tiers, altas y seguimiento de clientes |
| **FAB** | Producción física | Modelado 3D, NFC, medidas y costos por pieza |

**El número identifica la conversación, no la tarea.** SEC 1 es el primer chat de
seguridad. Cuando se llena o conviene arrancar limpio, se abre SEC 2. Así, si un PR
dice "SEC 1", se sabe qué conversación tiene el porqué completo.

OFE y FAB se abren cuando haya trabajo real para ellos.

**Para que dos chats no hagan lo mismo:**

- **El código va siempre en el título del chat.** Un chat sin código no sabe qué es.
- **Un solo chat activo por código.** Si se abre otro de la misma área, el anterior se
  archiva o se renumera.
- Los chats terminados se archivan. La lista de chats no es un archivo histórico.
- Si un chat encuentra trabajo de otra área, **no lo deriva por su cuenta**: se lo
  plantea a Stephano, que decide quién lo hace.

---

## 3. Flujo de trabajo

```
rama propia (desde dev) → PR a dev → ORQ revisa y mergea → dev.hito.uno
                                                             ↓ Stephano prueba
                                  PR dev → main (lo arma ORQ, OK de Stephano) → hito.uno
```

1. **Rama propia desde `dev`**, con el prefijo del área en minúsculas:
   `ux/perfil-cabecera`, `plat/reenvio-dev`, `sec/freno-panel`, `orq/equipo`.
   Si hay otro chat trabajando en el mismo repo, usar un worktree aparte para no
   pisarse los archivos.
2. **Un PR, un tema.** Nada de "perfil nuevo + formulario + panel" juntos. Un PR
   chico se revisa bien y queda documentado por sí solo.
3. **PR hacia `dev`, nunca hacia `main`.**
   - Título: `[SEC 1] freno de intentos en el panel`
   - Cuerpo: arranca con `Chat: SEC 1` y explica **qué cambia, por qué y cómo se
     probó**. Es lo único que va a leer quien lo revise.
4. **Antes de abrir el PR**, `npm run check` tiene que pasar. La validación de
   GitHub corre sola en cada PR a `dev`.
5. **Nadie mergea su propio PR.** ORQ revisa y mergea a `dev`. Si el PR es de ORQ,
   lo mergea Stephano.
6. **Los conflictos los resuelve quien abrió el PR**: actualiza su rama con `dev` y
   arregla. ORQ no reescribe trabajo ajeno.
7. **El pase a producción** es un PR de `dev` a `main` que arma ORQ y se mergea
   **solo con el OK explícito de Stephano**, después de probar en dev.hito.uno
   (idealmente en el celular).

**`main` y `dev` no tienen protección en GitHub.** "Solo entra por PR" es un acuerdo,
no algo que GitHub impida. Nunca pushear directo a `main` ni a `dev`.

### Pedidos entre áreas

Si un chat necesita algo de otra área (por ejemplo, UX necesita un campo nuevo en la
API), no lo hace por su cuenta: lo deja escrito en su PR o se lo dice a Stephano para
que llegue a ORQ, que decide el orden. Un solo lugar define las prioridades.

---

## 4. Reglas que valen para todos

- **Español, sin emojis.** Explicar el porqué, no solo el cómo.
- **Las decisiones se escriben en `docs/`**, no quedan en la charla. Lo que no está
  escrito, para el próximo chat no existe.
- **Sin secretos en el repo.** `worker/tokens.json` es solo para perfiles sandbox del
  equipo; un token de cliente real nunca se commitea (`npm run check` lo frena).
- **Validar todo input de usuario y manejar los errores de forma explícita.** Nada
  que falle en silencio.
- **El perfil de Dana (`danaarx`) está en hold**: sigue publicado y no se toca.
- **El perfil de un cliente no lleva contenido comercial de Hito**, solo la línea
  "Activado con hito.uno".
- **No escribir "sin rastreo" en ninguna página** hasta que sea cierto
  (ver `docs/PRIVACIDAD-PERFIL.md`).
- **No crear páginas escondidas** tipo `/v03.html` para probar: para eso está dev.
- **Memoria de Claude:** todos los chats de esta carpeta comparten la misma memoria.
  Solo ORQ actualiza el estado general del proyecto; los demás guardan únicamente
  feedback de su área.
- **Trampas conocidas** (Git Bash que se come barras invertidas, CRLF, charset del
  Apps Script, vCard sin cortar líneas): están en la memoria del proyecto y en el
  README. Leerlas antes de pelearse con algo raro.

---

## 5. Roles

### ORQ — Orquestador

- **Misión:** que el proyecto avance en el orden correcto y que a producción llegue
  solo lo probado.
- **Lee primero:** este archivo, `README.md`, `docs/DISENO.md`, `docs/OFERTA.md`,
  la lista de PRs abiertos (`gh pr list`).
- **Hace:** prioriza, reparte trabajo entre chats, revisa y mergea PRs a `dev`, arma
  el PR de `dev` a `main`, mantiene la memoria del proyecto al día.
- **No hace:** trabajo grande de un área (lo delega), merges a `main` sin OK de
  Stephano.

### UX — UX/UI y contenido

- **Misión:** que la landing, los perfiles y el panel se entiendan en un gesto desde
  el celular y suenen a Stephano, no a IA.
- **Lee primero:** `docs/DISENO.md` (fuente única de diseño),
  `docs/REFERENCIAS-PERFIL.md`, `docs/PRIVACIDAD-PERFIL.md`,
  `docs/fotografia-soportes.md`.
- **Toca:** `src/landing/`, `src/partner/` (componentes y estilos), `src/panel/`
  (interfaz), `public/images/`, textos.
- **No toca:** `worker/` (se lo pide a PLAT), datos de clientes reales sin OK.
- **Cómo prueba:** capturas en ancho de celular y feedback de Stephano sobre
  dev.hito.uno.
- **Ojo:** no mezclar segmentos. Las piezas para Lite y emprendedores no llevan
  objetos de local (apoyavasos, placas).

### PLAT — Plataforma

- **Misión:** que la base técnica sea simple, confiable y barata de operar.
- **Lee primero:** `README.md` completo, `docs/PANEL.md`, `wrangler.jsonc`,
  `worker/`.
- **Toca:** `worker/`, `wrangler.jsonc`, `scripts/`, `.github/workflows/`,
  `vite.config.ts`, tipos compartidos.
- **No toca:** diseño visual y textos (UX).
- **Cómo prueba:** `npm run dev:worker` en local (`localhost:8787`) y después
  dev.hito.uno. `wrangler dev` a veces sirve código viejo: confirmar la recarga
  antes de sacar conclusiones.

### SEC — Seguridad

- **Misión:** llevar el sitio al promedio del estándar web y que **no sea fácil
  tirar nuestros servidores**. Se trabaja con Stephano en ciclos cortos: levantar
  una capa, atacarla, anotar, corregir.
- **Lee primero:** `docs/PRIVACIDAD-PERFIL.md`, `worker/index.ts`,
  `worker/leads.ts`, `worker/store.ts`, `wrangler.jsonc`, y `docs/SEGURIDAD.md`
  (el registro de pruebas; si no existe, lo crea).
- **Toca:** cambios de protección en `worker/` y configuración, en PRs chicos.
  Si un cambio es grande, lo coordina con PLAT vía ORQ.

**El ciclo:**

1. Levantar una capa (PR a `dev`).
2. Atacarla en dev.hito.uno.
3. Anotar en `docs/SEGURIDAD.md`: qué se probó, con qué herramienta, a qué ritmo,
   qué aguantó y qué no.
4. Corregir lo que falló (otro PR).

**Reglas para atacar, sin excepciones:**

- **Solo contra dev.hito.uno.** Nunca contra `hito.uno`.
- **Solo contra lo nuestro.** Nada de golpear Google, el Apps Script, Cloudflare
  como servicio ni dominios ajenos.
- **Bloqueante antes de probar `/api/lead`:** hoy dev reenvía las consultas a la
  **misma planilla real** que producción. Primero dev tiene que dejar de reenviar o
  hacerlo a una planilla de prueba.
- **Subir de a escalones**, con la meta escrita antes de arrancar (por ejemplo:
  "200 envíos por minuto desde 5 IPs no llenan la planilla ni tiran el formulario").
- Antes de pruebas de carga fuertes, revisar qué dice Cloudflare sobre hacerlas en
  la propia zona, para no terminar con la cuenta o la IP bloqueadas.

**Backlog inicial, en orden:**

1. Separar el reenvío de consultas de dev para que no toque la planilla real.
2. Freno de intentos en `/api/panel/*` (hoy no tiene) y límite de tamaño del cuerpo
   en `/api/lead` y `/api/panel/*` (hoy se lee sin tope).
3. Cabeceras de seguridad: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
   protección contra que otro sitio embeba nuestras páginas.
4. Confirmar el plan de Workers en Cloudflare (el gratis tiene tope diario de
   pedidos: saturarlo deja el sitio sin servicio hasta el día siguiente) y activar
   alertas de consumo.
5. Primera ronda de ataque sobre dev, con registro en `docs/SEGURIDAD.md`.

### MOD — Módulos del perfil

- **Misión:** explorar qué secciones nuevas puede tener un perfil (lo que en la charla
  aparece como "widgets") y dejarlas documentadas para que otro las construya.
- **Nombre:** en el código ya existen y se llaman **módulos** (`modules` en
  `src/partner/partners.json`; el catálogo es el primero). Usar ese nombre, no
  "widget", para que los chats hablen el mismo idioma.
- **Lee primero:** `docs/DISENO.md`, `docs/OFERTA.md`, `docs/REFERENCIAS-PERFIL.md`,
  `src/partner/modules/` y la sección "Módulos del perfil" del README.
- **Entrega:** `docs/MODULOS.md`, un catálogo con una entrada por plantilla:
  qué resuelve, qué datos le pide al cliente, qué necesita del servidor, a qué escalón
  de la oferta pertenece y qué tan caro es construirla.
- **No toca código.** Explorar y construir se llevan mal en el mismo chat: uno necesita
  divagar y el otro necesita no cambiar de idea. La interfaz la hace UX, el servidor
  PLAT, el precio lo decide Stephano.
- **Ojo:** no mezclar segmentos (ver reglas comunes) y respetar que el perfil de un
  cliente no lleva contenido comercial de Hito.

### OFE — Oferta y clientes (a abrir)

- **Misión:** que la escalera de oferta sea clara y cada cliente tenga su alta y su
  seguimiento.
- **Lee primero:** `docs/OFERTA.md`, `docs/DISENO.md`, `src/partner/partners.json`.
- **Toca:** `docs/OFERTA.md`, altas de perfiles en `partners.json` y `objects.json`.
- **No toca:** tokens de clientes reales en el repo, código del servidor.

### FAB — Producción física (a abrir)

- **Misión:** que los objetos se puedan fabricar en serie con costo y calidad
  conocidos.
- **Lee primero:** `docs/DISENO.md`, `docs/OFERTA.md`, `docs/fotografia-soportes.md`.
- **Toca:** documentación de modelos, medidas, chips y costos; fotos de producto
  (coordinando con UX).

---

## 6. Plantilla de cuerpo de PR

```markdown
Chat: SEC 1

## Qué cambia
...

## Por qué
...

## Cómo se probó
- `npm run check` pasa
- ...

## Pendiente o pedidos a otras áreas
- ...
```
