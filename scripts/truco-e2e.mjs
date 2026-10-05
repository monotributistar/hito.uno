// Prueba de punta a punta contra el servidor local (npm run dev debe estar corriendo).
// Verifica el protocolo real por WebSocket: salas, alias, PvP entre dos "celulares",
// bots, privacidad de las cartas y rechazo de acciones ilegales.
//
// Uso: node scripts/e2e.mjs [http://localhost:8787] [--api=truco] [--reloj]

import assert from "node:assert/strict";

const BASE = process.argv[2] ?? "http://localhost:8787";
const WS_BASE = BASE.replace(/^http/, "ws");
// Prefijo de la API: "/api" en el lab, "/api/truco" dentro del Worker de hito.uno (--api=truco).
// Sin barra inicial (--api=truco): Git Bash en Windows convierte los argumentos que empiezan con "/" en rutas de disco.
const sufijoApi = process.argv.find((a) => a.startsWith("--api="))?.slice(6);
const API = sufijoApi ? `/api/${sufijoApi}` : "/api";

const token = () => "e2e-" + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);

async function crearSala(config) {
  const r = await fetch(`${BASE}${API}/salas`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(config),
  });
  return { status: r.status, datos: await r.json() };
}

// Un "celular": guarda el ultimo estado y los errores recibidos.
function cliente(codigo, miToken) {
  const ws = new WebSocket(`${WS_BASE}${API}/sala/${codigo}/ws`);
  const c = { ws, token: miToken, estado: null, errores: [], mensajes: 0 };
  c.abierto = new Promise((res, rej) => {
    ws.addEventListener("open", res);
    ws.addEventListener("error", () => rej(new Error("no se pudo abrir el WebSocket")));
  });
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    c.mensajes += 1;
    if (m.t === "estado") c.estado = m;
    if (m.t === "error") c.errores.push(m.mensaje);
  });
  c.enviar = (m) => ws.send(JSON.stringify(m));
  return c;
}

async function esperar(condicion, descripcion, ms = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (condicion()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`timeout esperando: ${descripcion}`);
}

let pasos = 0;
const ok = (texto) => console.log(`  ok ${++pasos}. ${texto}`);

// ---------- configuracion invalida ----------
for (const cfg of [{ jugadores: 3, puntos: 15 }, { jugadores: 2, puntos: 99 }, {}, null]) {
  const r = await crearSala(cfg);
  assert.equal(r.status, 400, `config ${JSON.stringify(cfg)} deberia dar 400`);
}
ok("configuraciones invalidas rechazadas (400)");

const gigante = await fetch(`${BASE}${API}/salas`, { method: "POST", body: "x".repeat(5000) });
assert.equal(gigante.status, 413);
ok("cuerpo gigante rechazado (413)");

const origenAjeno = await fetch(`${BASE}${API}/salas`, {
  method: "POST",
  headers: { origin: "https://sitio-malicioso.example", "content-type": "application/json" },
  body: JSON.stringify({ jugadores: 2, puntos: 15 }),
});
assert.equal(origenAjeno.status, 403);
ok("origen ajeno rechazado (403)");

const codigoMalo = await fetch(`${BASE}${API}/sala/../ws`);
assert.ok([400, 404].includes(codigoMalo.status));
const codigoInvalido = await fetch(`${BASE}${API}/sala/abcde/ws`);
assert.equal(codigoInvalido.status, 400);
ok("codigos de sala invalidos rechazados");

// ---------- dos personas (PvP) ----------
const { status, datos } = await crearSala({ jugadores: 2, puntos: 15 });
assert.equal(status, 201);
const codigo = datos.codigo;
assert.match(codigo, /^[A-Z2-9]{5}$/);
ok(`sala creada (${codigo})`);

const tA = token();
const tB = token();
const a = cliente(codigo, tA);
await a.abierto;
a.enviar({ t: "unirse", token: tA, alias: "Ana" });
await esperar(() => a.estado, "estado de Ana");
assert.equal(a.estado.fase, "espera");
assert.equal(a.estado.esAnfitrion, true);
ok("Ana entra y queda en espera como anfitriona");

// Sin unirse no se puede hacer nada.
const intruso = cliente(codigo, token());
await intruso.abierto;
intruso.enviar({ t: "accion", accion: { tipo: "mazo" } });
intruso.enviar({ t: "iniciar" });
await esperar(() => intruso.errores.length >= 2, "errores del intruso");
assert.equal(intruso.estado, null, "un desconocido no recibe estado");
ok("quien no se unio no puede actuar ni recibe estado");
intruso.ws.close();

// Mensajes rotos no tumban la sala.
a.ws.send("esto no es json");
a.ws.send(JSON.stringify([1, 2, 3]));
a.enviar({ t: "inventado" });
await esperar(() => a.errores.length >= 3, "errores por mensajes invalidos");
ok("mensajes invalidos reciben error y la sala sigue viva");

// Alias repetido.
const repetido = cliente(codigo, token());
await repetido.abierto;
repetido.enviar({ t: "unirse", token: repetido.token, alias: "ana" });
await esperar(() => repetido.errores.length > 0, "error por alias repetido");
assert.match(repetido.errores[0], /alias/);
repetido.ws.close();
ok("alias repetido rechazado");

const b = cliente(codigo, tB);
await b.abierto;
b.enviar({ t: "unirse", token: tB, alias: "Beto" });
await esperar(() => a.estado?.fase === "jugando" && b.estado?.fase === "jugando", "inicio automatico");
assert.equal(a.estado.pvp, true);
assert.equal(b.estado.pvp, true);
ok("con dos personas la partida arranca sola y es PvP");

// Privacidad por el cable: nadie ve las cartas ni el token del otro.
const textoA = JSON.stringify(a.estado);
const textoB = JSON.stringify(b.estado);
assert.ok(!textoA.includes(tA) && !textoA.includes(tB) && !textoB.includes(tA) && !textoB.includes(tB), "se filtro un token");
for (const carta of b.estado.vista.misCartas) assert.ok(!textoA.includes(JSON.stringify(carta)), "Ana ve cartas de Beto");
for (const carta of a.estado.vista.misCartas) assert.ok(!textoB.includes(JSON.stringify(carta)), "Beto ve cartas de Ana");
assert.equal(a.estado.vista.misCartas.length, 3);
ok("cada celular recibe solo sus cartas y ningun token");

// Fuera de turno y cartas ajenas.
const turno = a.estado.vista.turno;
const [quienJuega, quienEspera] = turno === 0 ? [a, b] : [b, a];
const cartaDelRival = quienEspera.estado.vista.misCartas[0];
const erroresEsperaAntes = quienEspera.errores.length;
quienEspera.enviar({ t: "accion", accion: { tipo: "jugar_carta", carta: cartaDelRival } });
await esperar(() => quienEspera.errores.length > erroresEsperaAntes, "error por jugar fuera de turno");
const erroresJuegaAntes = quienJuega.errores.length;
quienJuega.enviar({ t: "accion", accion: { tipo: "jugar_carta", carta: cartaDelRival } });
await esperar(() => quienJuega.errores.length > erroresJuegaAntes, "error por carta ajena");
ok("jugar fuera de turno o con una carta ajena da error");

// Una jugada legal llega a los dos.
const carta = quienJuega.estado.vista.misCartas[0];
quienJuega.enviar({ t: "accion", accion: { tipo: "jugar_carta", carta } });
await esperar(() => a.estado.vista.bazas[0].jugadas.length === 1 && b.estado.vista.bazas[0].jugadas.length === 1, "jugada visible para ambos");
ok("una jugada legal se ve en los dos celulares");

// Reconexion: Beto cierra y vuelve con el mismo token, retoma su asiento.
const asientoB = b.estado.yo;
b.ws.close();
await esperar(() => a.estado.conectados?.[asientoB] === false, "Ana ve a Beto desconectado");
const b2 = cliente(codigo, tB);
await b2.abierto;
b2.enviar({ t: "unirse", token: tB, alias: "otro-nombre" });
await esperar(() => b2.estado, "estado tras reconectar");
assert.equal(b2.estado.yo, asientoB);
assert.equal(b2.estado.asientos[asientoB].alias, "Beto");
assert.ok(b2.estado.vista.misCartas.length >= 1, "Beto recupera sus cartas");
ok("reconexion con el mismo token retoma el asiento y el alias");

a.ws.close();
b2.ws.close();

// ---------- una persona contra bot ----------
const sala2 = await crearSala({ jugadores: 2, puntos: 15 });
const tC = token();
const c = cliente(sala2.datos.codigo, tC);
await c.abierto;
c.enviar({ t: "unirse", token: tC, alias: "Carla" });
await esperar(() => c.estado, "estado de Carla");
c.enviar({ t: "iniciar" });
await esperar(() => c.estado.fase === "jugando", "inicio con bot");
assert.equal(c.estado.pvp, false);
assert.equal(c.estado.asientos[1].bot, true);
assert.equal(c.estado.asientos[1].alias, "Bot 1");
ok("con bot en la mesa la partida no es PvP y el bot figura como Bot");

// Juega varias manos (carta legal al azar) y verifica que el bot responde solo.
let jugadasDeCarla = 0;
const t0 = Date.now();
while (jugadasDeCarla < 6 && Date.now() - t0 < 60000) {
  const v = c.estado.vista;
  const miTurno = v.responde === c.estado.yo || (v.responde === null && v.turno === c.estado.yo);
  if (miTurno && v.acciones.length > 0) {
    const cartas = v.acciones.filter((x) => x.tipo === "jugar_carta");
    const eleccion = cartas.length > 0 ? cartas[0] : v.acciones.find((x) => x.tipo === "quiero") ?? v.acciones[0];
    const antes = c.mensajes;
    c.enviar({ t: "accion", accion: eleccion });
    jugadasDeCarla++;
    await esperar(() => c.mensajes > antes, "respuesta del servidor");
  }
  await new Promise((r) => setTimeout(r, 100));
}
assert.ok(jugadasDeCarla >= 6, "no se pudieron hacer 6 jugadas contra el bot");
assert.equal(c.errores.length, 0, `errores inesperados: ${c.errores.join(", ")}`);
ok(`Carla jugo ${jugadasDeCarla} acciones contra el bot sin errores`);
c.ws.close();

// ---------- reloj por jugada (solo con el servidor de limite corto) ----------
// Uso: node scripts/e2e.mjs http://localhost:8788 --reloj   (servidor con LIMITE_MS:3000)
if (process.argv.includes("--reloj")) {
  const sr = await crearSala({ jugadores: 2, puntos: 15 });
  const tD = token();
  const d = cliente(sr.datos.codigo, tD);
  await d.abierto;
  d.enviar({ t: "unirse", token: tD, alias: "Dora" });
  await esperar(() => d.estado, "estado de Dora");
  d.enviar({ t: "iniciar" });
  await esperar(() => d.estado.fase === "jugando", "inicio contra bot");

  // El reloj de una persona se informa y es menor o igual al limite.
  await esperar(() => d.estado.mueve === d.estado.yo && d.estado.restanteMs !== null, "reloj de Dora");
  assert.ok(d.estado.restanteMs > 0 && d.estado.restanteMs <= 3000, `restanteMs fuera de rango: ${d.estado.restanteMs}`);
  ok("el servidor informa el tiempo restante de quien mueve");

  // Dora no juega: a los 3 segundos juega el bot por ella.
  let avisos = [];
  d.ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.aviso) avisos.push(m.aviso);
  });
  await esperar(() => avisos.some((a) => a.tipo === "autojugada"), "autojugada por vencimiento", 10000);
  ok("al vencerse el tiempo, el bot juega por la persona");

  // Sigue sin jugar: al segundo vencimiento seguido, abandono.
  await esperar(() => d.estado.fase === "fin", "abandono por segundo vencimiento", 30000);
  assert.equal(d.estado.motivoFin, "abandono");
  assert.equal(d.estado.abandono, d.estado.yo);
  assert.equal(d.estado.vista.ganadorPartida, 1 - (d.estado.yo % 2));
  ok("dos vencimientos seguidos terminan la partida por abandono y gana el rival");

  // Despues del abandono no se puede jugar.
  const antes = d.errores.length;
  d.enviar({ t: "accion", accion: { tipo: "mazo" } });
  await esperar(() => d.errores.length > antes, "error al jugar tras el abandono");
  ok("tras el abandono la sala rechaza nuevas jugadas");

  // Si juega a tiempo, el contador se reinicia: Eva juega siempre y nunca abandona.
  const sr2 = await crearSala({ jugadores: 2, puntos: 15 });
  const tE = token();
  const e = cliente(sr2.datos.codigo, tE);
  await e.abierto;
  e.enviar({ t: "unirse", token: tE, alias: "Eva" });
  await esperar(() => e.estado, "estado de Eva");
  e.enviar({ t: "iniciar" });
  const t1 = Date.now();
  let jugadas = 0;
  while (jugadas < 8 && Date.now() - t1 < 60000) {
    const v = e.estado.vista;
    if (e.estado.fase === "jugando" && v.acciones.length > 0) {
      const cartas = v.acciones.filter((x) => x.tipo === "jugar_carta");
      const eleccion = cartas[0] ?? v.acciones.find((x) => x.tipo === "quiero") ?? v.acciones[0];
      const antes2 = e.mensajes;
      e.enviar({ t: "accion", accion: eleccion });
      jugadas++;
      await esperar(() => e.mensajes > antes2, "respuesta");
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  assert.notEqual(e.estado.motivoFin, "abandono");
  assert.equal(e.estado.ausencias, 0);
  ok(`jugando a tiempo (${jugadas} acciones) no hay vencimientos ni abandono`);
  d.ws.close();
  e.ws.close();
}

// ---------- pantalla del local ----------
const lista = await (await fetch(`${BASE}${API}/salas`)).json();
assert.ok(lista.salas.some((s) => s.codigo === codigo), "la sala PvP deberia figurar");
const textoLista = JSON.stringify(lista);
assert.ok(!textoLista.includes(tA) && !textoLista.includes(tB) && !textoLista.includes(tC), "el listado expone tokens");
assert.ok(!textoLista.includes('"palo"'), "el listado expone cartas");
ok("el listado del local muestra las salas sin tokens ni cartas");

console.log(`\nE2E completo: ${pasos} verificaciones OK`);
process.exit(0);
