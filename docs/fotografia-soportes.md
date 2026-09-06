# Fotografía de soportes — reglas y prompts

Para generar las fotos que faltan del carrusel de la sección Soportes.

## Las cuatro reglas

1. **Logo: siempre `Hito.uno`.** Nunca `Hito.` solo. Vale tanto el lockup horizontal
   (`Hito` + `.uno` coral) como el vertical (`hito` con `uno` naranja arriba). Una foto
   con el logo incompleto se descarta aunque la escena sea buena.
2. **El tercio izquierdo va vacío.** Ni el objeto, ni la mano, ni el teléfono, ni un
   elemento de contexto con peso visual. Ahí se apoya la veladura con el texto. El
   sujeto tiene que arrancar recién pasado el 30 % del ancho.
3. **El gesto nunca contra el borde derecho.** En mobile la foto se recorta a 4:5 por
   el centro y lo que esté muy a la derecha se pierde.
4. **Formato 3:2 horizontal.** Es el de la stage del carrusel; cualquier otra relación
   se recorta arriba y abajo.

## Estado actual

| Soporte | Contexto | Resultado |
| --- | --- | --- |
| Tarjeta | 4 ✅ | falta |
| Llavero | 4 ✅ | 1 ✅ |
| Apoyavasos | 1 (faltan 3) | falta |
| Recibidor | 1 (faltan 3) | falta |
| Placa | 0 (faltan 4) | falta |

También conviene reemplazar `tarjeta-04` (la de la mano): la mano ocupa todo el tercio
izquierdo.

## La foto de resultado

Es la que se muestra al tocar «Un toque». **Tiene que ser la misma escena que una de
las de contexto** — mismo encuadre, misma luz, misma paleta — y lo único que cambia es
que aparece un teléfono con la pantalla ya resuelta. Si la escena cambia, el cruce se
lee como «cambió la foto» en vez de «pasó algo».

## Prompts

### Base (pegar al final de cualquier prompt)

```
Formato 3:2 horizontal. El tercio izquierdo de la imagen tiene que quedar
completamente vacío: solo superficie o fondo, sin objetos ni elementos con peso
visual. El objeto principal arranca pasado el 35% del ancho y no toca el borde
derecho. Luz cálida, cinematográfica, fondo desenfocado. Fotografía de producto
realista, no ilustración. El logo dice exactamente "Hito.uno".
```

### Llave de auto (regenerar — la escena aprobada, con el logo corregido)

```
Una llave de auto moderna negra apoyada sobre una mesa de madera clara, con un
llavero cuadrado Hito.uno colgando del aro metálico. El llavero es azul petróleo
con el logo "Hito.uno" en crema y coral. Al fondo, desenfocados, un cuenco de
cerámica gris y una taza oscura.
```
+ base

### Llave de auto — resultado

```
[misma descripción de arriba] Junto a la llave, un teléfono apoyado que muestra en
pantalla un menú abierto con las opciones Contacto, Ubicación, Instrucciones,
Documentación y WhatsApp. Mismo encuadre, misma luz y misma mesa de madera que la
foto anterior.
```
+ base

### Placa (faltan las 4)

Pieza fija en pared o mostrador. Contextos sugeridos, uno por foto: entrada de un
alojamiento, pared de un local, mostrador de un consultorio, hall de un edificio.

```
Una placa rectangular Hito.uno montada en la pared junto a la entrada de [CONTEXTO].
La placa es color crema con el logo "Hito.uno" y el ícono de NFC.
```
+ base

### Apoyavasos (faltan 3) y Recibidor (faltan 3)

Mismo patrón: variar el contexto manteniendo el objeto. Apoyavasos: mesa de bar,
café de especialidad, restaurante, terraza. Recibidor: mostrador de hotel, recepción
de oficina, entrada de spa, coworking.

## Después de generar

Las fotos se convierten a `.webp` antes de entrar al repo (un PNG de ChatGPT pesa
~2 MB, el webp equivalente ~60 KB):

```bash
ffmpeg -y -i entrada.png -c:v libwebp -quality 82 salida.webp
```

Van a `public/images/products/<soporte>/<soporte>-NN.webp`, y la de resultado a
`<soporte>-resultado.webp`. Después se declaran en `src/landing/landing-data.ts`, cada una
con su `alt` (describe la escena, es el texto que reemplaza a la foto) y su
`caption` (el pie corto del riel).
