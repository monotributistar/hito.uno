# Hito Uno — Brief de evolución aditiva de la landing (V0.2)

- Estado: propuesta de contribución
- Rama: `proposal/landing-v02-aditiva`
- Objetivo: sumar claridad comercial y una oferta concreta sin reemplazar la identidad ni la experiencia actual
- Base: landing actual de `hito.uno`, con mapa 3D de Cariló, recorrido por casos de uso y narrativa editorial

## 1. Principio rector

La landing actual tiene una identidad que queremos conservar.

No queremos rediseñarla desde cero.
No queremos reemplazar el mapa de Cariló.
No queremos borrar el Hero actual.
No queremos transformar Hito Uno en una landing SaaS genérica.

La estrategia para la V0.2 es **sumar capas de claridad y producto**, respetando la dirección visual y narrativa existente.

La consigna para cualquier IA o colaborador que trabaje sobre esta rama es:

> **Sumar, no reemplazar.**

Toda propuesta debe partir del sitio actual y mantener su personalidad.

## 2. Qué funciona hoy y debe preservarse

### Hero actual

El mensaje:

> Un objeto. Un gesto. Una experiencia.

funciona como lenguaje de marca y debe conservarse salvo que exista una razón de UX muy fuerte para tocarlo.

El Hero actual comunica la idea general de Hito y convive con la cartografía 3D. No debe convertirse en una pantalla de venta agresiva.

### Mapa 3D de Cariló

El mapa es uno de los elementos más diferenciales del sitio.

No es decorativo: conecta territorio, objetos, puntos físicos y casos de uso. También ayuda a que Hito Uno se perciba como algo que vive en el mundo real.

Debe conservarse como eje visual de la landing.

### ExperienceStory

El recorrido por industrias y objetos ya expresa correctamente que Hito Uno puede vivir en distintos contextos.

Debe preservarse y evolucionarse, no sustituirse.

## 3. Problema actual

La landing actual muestra muy bien **qué puede llegar a ser Hito Uno**, pero todavía no muestra con la misma claridad:

1. qué problema concreto resolvemos;
2. qué producto puede pedir hoy un cliente;
3. cómo se solicita una demo concreta;
4. por qué Hito reduce fricción en procesos reales.

La V0.2 debe resolver estas cuatro cosas sin debilitar la identidad existente.

## 4. Nueva idea comercial: reducir pasos

Queremos introducir una idea simple:

> **Hito Uno reduce pasos entre una persona y una acción importante.**

No queremos presentar NFC o QR como producto.

La tecnología es un medio.

La propuesta de valor se explica mejor como una reducción de fricción:

### Sin Hito

buscar → navegar → encontrar → abrir → actuar

### Con Hito

objeto → tocar → actuar

No es necesario usar literalmente “5 pasos → 1 toque”, pero sí explorar visualmente la reducción del recorrido.

Esta idea debe integrarse al lenguaje visual existente y no parecer una infografía corporativa genérica.

## 5. Primer producto concreto: Tarjeta Personal Hito

Para la V0.2 queremos sumar una oferta concreta y fácil de entender:

> **Tarjeta Personal Hito**

Una tarjeta física personalizada con NFC y QR que puede abrir una experiencia digital diseñada para el usuario.

Ejemplos de acciones:

- guardar un contacto;
- abrir un perfil o portfolio;
- iniciar WhatsApp;
- abrir una reserva;
- mostrar información profesional;
- dirigir a una landing o acción específica.

La tarjeta no reemplaza el universo Hito.

Debe presentarse como:

> **el primer Hito que una persona puede pedir hoy.**

Y luego ampliar la idea:

> Una tarjeta es solamente el primer Hito.

## 6. Arquitectura propuesta V0.2

La estructura debe conservar la landing actual y sumar nuevas secciones.

### 01 — Header actual

Mantener navegación y tono visual.

### 02 — Hero actual

Mantener como pieza principal:

> Un objeto. Un gesto. Una experiencia.

No reemplazar por una landing de producto tradicional.

### 03 — Nueva sección: Reducimos pasos

Objetivo: explicar de manera muy rápida el problema que Hito resuelve.

Contenido conceptual:

> Menos pasos. Más cerca de la acción.

Visual sugerido:

**Sin Hito**

buscar → navegar → encontrar → actuar

**Con Hito**

tocar → actuar

La sección debe ser corta, visual y coherente con la estética cartográfica/editorial existente.

### 04 — ExperienceStory + mapa actual

Mantener la estructura existente.

Se puede ajustar mínimamente el copy introductorio para reforzar:

> Distintos objetos. Un mismo principio.

pero sin perder la lógica de “Un mapa. Distintos hitos.” si sigue funcionando mejor en contexto.

### 05 — Nueva sección: Producto destacado / Tarjeta Personal Hito

Debe aparecer después de que el visitante ya entiende el universo general.

Objetivo:

mostrar algo concreto que hoy puede fabricar/comprar.

Contenido conceptual:

> Empezá por una tarjeta.

La sección debería mostrar:

- la tarjeta física;
- un teléfono;
- la activación;
- la acción digital posterior.

Idealmente debe existir una microdemo:

**tarjeta → acercar teléfono → activación → perfil/contacto → acción**

No debe sentirse como un catálogo de tarjetas corporativas.

Debe seguir hablando el lenguaje Hito Uno.

### 06 — Nueva sección: Pedí tu demo

La demo no debe ser sólo un formulario de contacto.

La promesa es:

> **Diseñamos conceptualmente tu primer Hito.**

Formulario/configurador inicial sugerido:

1. ¿Qué querés que pase al activar tu Hito?
2. ¿Qué tipo de objeto imaginás?
3. ¿Para qué persona o proceso lo querés?
4. Forma/tamaño/material si aplica.
5. Nombre + empresa + contacto.

Debe sentirse como el comienzo del producto, no como una ficha comercial administrativa.

### 07 — CTA final actual

Mantener:

> ¿Dónde ponemos el próximo hito?

Es un buen cierre porque vuelve a conectar producto, territorio y mapa.

El CTA debe dirigir al nuevo flujo de demo en lugar de depender únicamente de `mailto:`.

## 7. Qué NO queremos hacer en esta iteración

No implementar todavía:

- dashboard real;
- autenticación;
- cuentas de usuario;
- CMS;
- backend complejo;
- Hito Pass;
- pagos;
- red comercial entre negocios;
- analytics de producto completos;
- catálogo de decenas de productos;
- rediseño total de marca;
- reemplazo del mapa 3D.

Una representación conceptual de software puede aparecer más adelante, pero no es prioridad de esta contribución.

## 8. Cambios mínimos preferidos

La implementación debe favorecer cambios pequeños y aislados.

Componentes nuevos sugeridos:

- `StepReductionSection`
- `PersonalCardSection`
- `PersonalCardDemo`
- `DemoRequestSection`

Evitar reescribir `ExperienceStory` o `CariloMap` salvo que sea estrictamente necesario.

La prioridad es insertar nuevas capas alrededor del sistema actual.

## 9. Criterios UX

Una persona que entra por primera vez debería poder comprender:

1. Hito conecta objetos físicos con acciones digitales.
2. Hito reduce pasos y fricción.
3. Existen múltiples aplicaciones posibles.
4. Puede empezar con una tarjeta personal.
5. Puede pedir una demo personalizada.

La persona no debería necesitar conocer qué es NFC para entender el producto.

## 10. Criterios de diseño

Mantener:

- estética editorial/cartográfica;
- identidad territorial de Cariló;
- tono sobrio y contemporáneo;
- relación entre mundo físico y digital;
- mapa como infraestructura visual;
- movimiento deliberado, no decorativo.

Evitar:

- landing SaaS genérica;
- gradientes tecnológicos gratuitos;
- glassmorphism;
- estética crypto/Web3;
- iconografía NFC/QR como protagonista;
- bloques comerciales que parezcan de otra marca pegados encima de la landing.

Las nuevas secciones deben sentirse como si siempre hubieran pertenecido al sitio.

## 11. Reglas para IA que implemente esta propuesta

Antes de modificar código:

1. Leer `README.md`.
2. Leer `docs/SDD-portfolio-mapa-isometrico.md`.
3. Leer `src/main.tsx`.
4. Leer `src/ExperienceStory.tsx`.
5. Leer `src/experience-data.ts`.
6. Revisar `src/scene/CariloMap.tsx` antes de tocar cualquier comportamiento de mapa.
7. Mantener compatibilidad con el stack actual: React + TypeScript + Vite + Cloudflare Workers.

### Restricción principal

> No reemplazar la landing actual por una implementación nueva desde cero.

### Estrategia esperada

- Crear componentes nuevos.
- Insertarlos en el recorrido actual.
- Reutilizar tipografía, color, espaciado y patrones existentes.
- Modificar los componentes actuales sólo cuando sea necesario para integrar las nuevas secciones.
- Mantener la experiencia actual funcional en cada commit.

## 12. Primer entregable esperado

Antes de escribir una gran cantidad de código, producir una propuesta técnica breve que indique:

1. dónde se insertará cada nueva sección;
2. qué componentes nuevos se crearán;
3. qué archivos existentes necesitarán cambios;
4. si el mapa necesita cambios o puede quedar intacto;
5. cómo se resolverá mobile;
6. cómo funcionará el formulario de demo inicialmente sin backend complejo.

Luego implementar en cambios pequeños y revisables.

## 13. Definición de éxito de esta rama

La V0.2 es exitosa si conserva la sensación actual de `hito.uno` y, al mismo tiempo, hace más fácil responder estas preguntas:

> ¿Qué hace Hito?

> ¿Qué problema resuelve?

> ¿Qué puedo pedir hoy?

> ¿Cómo pido una demo?

La intención no es terminar el producto.

La intención es conseguir una landing más clara, vendible y demostrable sin sacrificar la identidad que ya existe.
