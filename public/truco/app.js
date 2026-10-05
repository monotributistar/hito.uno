// Cliente del truco para el celular. Todo texto que viene de otros jugadores (alias) se escribe
// con textContent, nunca con innerHTML. El servidor es el que decide: aca solo se muestra y se pide.

const $ = (id) => document.getElementById(id);
const CLAVE_TOKEN = "truco_token";
const CLAVE_ALIAS = "truco_alias";

// ---------- almacenamiento local (puede fallar en ventanas privadas) ----------

function leerLocal(clave) {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}
function guardarLocal(clave, valor) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* sin almacenamiento: se sigue sin recordar */
  }
}

// El token identifica a este celular en la sala (retoma el asiento si se corta la conexion).
function obtenerToken() {
  let t = leerLocal(CLAVE_TOKEN);
  if (!t || !/^[A-Za-z0-9_-]{16,64}$/.test(t)) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    t = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    guardarLocal(CLAVE_TOKEN, t);
  }
  return t;
}
const token = obtenerToken();

// ---------- estado de la pantalla ----------

let ws = null;
let codigoActual = null;
let ultimo = null; // ultimo mensaje de estado
let recibidoEn = 0; // cuando llego, para descontar el tiempo transcurrido de la cuenta regresiva
let registro = []; // lineas del registro de la partida
let salioAProposito = false;
let intentos = 0;
let config = { jugadores: 2, puntos: 15 };

const vistas = ["inicio", "sala", "juego", "fin"];
function mostrar(nombre) {
  for (const v of vistas) $(`vista-${v}`).hidden = v !== nombre;
}

function avisar(texto, tipo = "error") {
  const el = $("aviso");
  if (!texto) {
    el.hidden = true;
    return;
  }
  el.textContent = texto;
  el.className = tipo === "info" ? "aviso info" : "aviso";
  el.hidden = false;
}

// ---------- inicio ----------

$("alias").value = leerLocal(CLAVE_ALIAS) ?? "";

for (const b of document.querySelectorAll(".opcion")) {
  b.addEventListener("click", () => {
    const grupo = b.parentElement;
    for (const otro of grupo.querySelectorAll(".opcion")) otro.classList.remove("activa");
    b.classList.add("activa");
    if (b.dataset.jugadores) config.jugadores = Number(b.dataset.jugadores);
    if (b.dataset.puntos) config.puntos = Number(b.dataset.puntos);
  });
}

function aliasIngresado() {
  const alias = $("alias").value.trim();
  if (!alias) {
    avisar("Poné un alias para jugar.");
    $("alias").focus();
    return null;
  }
  guardarLocal(CLAVE_ALIAS, alias);
  return alias;
}

$("crear").addEventListener("click", async () => {
  const alias = aliasIngresado();
  if (!alias) return;
  avisar("");
  $("crear").disabled = true;
  try {
    const r = await fetch("/api/truco/salas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(config),
    });
    const datos = await r.json();
    if (!r.ok) throw new Error(datos.error ?? "no se pudo crear la sala");
    conectar(datos.codigo, alias);
  } catch (e) {
    avisar(e.message);
  } finally {
    $("crear").disabled = false;
  }
});

$("entrar").addEventListener("click", () => {
  const alias = aliasIngresado();
  if (!alias) return;
  const codigo = $("codigo").value.trim().toUpperCase();
  if (!/^[A-Z2-9]{5}$/.test(codigo)) {
    avisar("El codigo tiene 5 letras o numeros.");
    return;
  }
  avisar("");
  conectar(codigo, alias);
});

$("salir-sala").addEventListener("click", salir);
$("otra").addEventListener("click", salir);
$("empezar").addEventListener("click", () => enviar({ t: "iniciar" }));
$("copiar").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(`${location.origin}/truco/?sala=${codigoActual}`);
    avisar("Link copiado.", "info");
    setTimeout(() => avisar(""), 1800);
  } catch {
    avisar(`${location.origin}/truco/?sala=${codigoActual}`, "info");
  }
});

function salir() {
  salioAProposito = true;
  if (ws) ws.close(1000);
  ws = null;
  codigoActual = null;
  ultimo = null;
  registro = [];
  history.replaceState(null, "", "/truco/");
  avisar("");
  mostrar("inicio");
}

// ---------- conexion ----------

function conectar(codigo, alias) {
  salioAProposito = false;
  codigoActual = codigo;
  registro = [];
  history.replaceState(null, "", `/truco/?sala=${codigo}`);
  abrirSocket(alias);
}

function abrirSocket(alias) {
  const esquema = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${esquema}://${location.host}/api/truco/sala/${codigoActual}/ws`);
  ws = socket;

  socket.addEventListener("open", () => {
    intentos = 0;
    avisar("");
    socket.send(JSON.stringify({ t: "unirse", token, alias: alias ?? leerLocal(CLAVE_ALIAS) ?? "" }));
  });

  socket.addEventListener("message", (ev) => {
    let m;
    try {
      m = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (m.t === "estado") recibirEstado(m);
    else if (m.t === "error") manejarError(m.mensaje);
  });

  socket.addEventListener("close", () => {
    if (salioAProposito || ws !== socket) return;
    // Si el servidor cerro la sala (404 al conectar), no tiene sentido reintentar para siempre.
    intentos += 1;
    if (intentos > 6) {
      avisar("Se perdio la conexion con la sala.");
      salir();
      return;
    }
    avisar("Reconectando...", "info");
    setTimeout(() => {
      if (!salioAProposito && ws === socket) abrirSocket();
    }, Math.min(500 * intentos, 3000));
  });
}

function enviar(mensaje) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(mensaje));
  else avisar("Sin conexion, reintentando...", "info");
}

function manejarError(mensaje) {
  // Si el alias fallo al entrar, se vuelve al inicio para corregirlo.
  if (!ultimo) {
    salioAProposito = true;
    if (ws) ws.close(1000);
    ws = null;
    mostrar("inicio");
    history.replaceState(null, "", "/truco/");
  }
  avisar(mensaje);
}

// ---------- estado recibido ----------

const NOMBRES_TRUCO = ["Truco", "Retruco", "Vale cuatro"];
const NOMBRES_ENVIDO = { envido: "Envido", real_envido: "Real envido", falta_envido: "Falta envido" };

function recibirEstado(m) {
  avisar("");
  const anterior = ultimo;
  ultimo = m;
  recibidoEn = Date.now();
  // Al empezar la partida el registro arranca limpio (antes de sumar los eventos de este mensaje).
  if (anterior && anterior.fase !== m.fase && m.fase === "jugando") registro = [];
  if (m.eventos) for (const ev of m.eventos) agregarRegistro(ev, m);
  if (m.aviso && m.aviso.tipo === "autojugada") {
    registro.push(
      m.aviso.seat === m.yo ? "Se te acabó el tiempo: jugó el bot por vos" : `A ${alias(m, m.aviso.seat)} se le acabó el tiempo: jugó el bot`,
    );
    if (registro.length > 8) registro.shift();
  }

  if (m.fase === "espera") dibujarSala(m);
  else if (m.fase === "jugando") dibujarJuego(m);
  else dibujarFin(m);
}

function alias(m, seat) {
  return m.asientos[seat]?.alias ?? "?";
}

function nombreEquipo(m, equipo) {
  return equipo === m.yo % 2 ? "Nosotros" : "Ellos";
}

function agregarRegistro(ev, m) {
  let texto = null;
  switch (ev.tipo) {
    case "canto_truco":
      texto = `${alias(m, ev.seat)}: ${NOMBRES_TRUCO[ev.nivel - 1]}`;
      break;
    case "canto_envido":
      texto = `${alias(m, ev.seat)}: ${NOMBRES_ENVIDO[ev.canto]}`;
      break;
    case "quiero":
      texto = `${alias(m, ev.seat)}: Quiero`;
      break;
    case "no_quiero":
      texto = `${alias(m, ev.seat)}: No quiero`;
      break;
    case "mazo":
      texto = `${alias(m, ev.seat)} se fue al mazo`;
      break;
    case "envido_resuelto":
      texto = `Envido: ganó ${nombreEquipo(m, ev.ganador)} (${ev.tantos.join(" a ")})`;
      break;
    case "puntos":
      texto = `${nombreEquipo(m, ev.equipo)} suma ${ev.puntos} (${ev.motivo})`;
      break;
    default:
      return;
  }
  registro.push(texto);
  if (registro.length > 8) registro.shift();
}

// ---------- sala de espera ----------

function dibujarSala(m) {
  mostrar("sala");
  $("sala-codigo").textContent = m.codigo;
  $("sala-config").textContent = `${m.config.jugadores === 2 ? "1 contra 1" : "Parejas"} · a ${m.config.puntos} puntos`;
  const lista = $("sala-asientos");
  lista.replaceChildren();
  m.asientos.forEach((a, i) => {
    const li = document.createElement("li");
    const nombre = document.createElement("span");
    const etiqueta = document.createElement("span");
    etiqueta.className = "etiqueta";
    if (a) {
      nombre.textContent = a.alias + (i === m.yo ? " (vos)" : "");
      etiqueta.textContent = m.config.jugadores === 4 ? `Equipo ${(i % 2) + 1}` : "";
    } else {
      li.className = "libre";
      nombre.textContent = "Lugar libre";
    }
    li.append(nombre, etiqueta);
    lista.append(li);
  });
  const libres = m.asientos.filter((a) => a === null).length;
  $("sala-ayuda").textContent =
    libres > 0 ? `Falta${libres > 1 ? "n" : ""} ${libres}. Compartí el código ${m.codigo} o el link.` : "Arrancando...";
  $("empezar").hidden = !m.esAnfitrion || libres === 0;
}

// ---------- partida ----------

function iconoPalo(palo) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 40 40");
  svg.setAttribute("aria-hidden", "true");
  const ns = "http://www.w3.org/2000/svg";
  const el = (tag, attrs) => {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    svg.append(e);
  };
  if (palo === "oro") {
    el("circle", { cx: 20, cy: 20, r: 15, fill: "#e0b030", stroke: "#8a6a10", "stroke-width": 2 });
    el("circle", { cx: 20, cy: 20, r: 7, fill: "none", stroke: "#8a6a10", "stroke-width": 2 });
  } else if (palo === "copa") {
    el("path", { d: "M8 6 H32 C32 20 25 25 20 25 C15 25 8 20 8 6 Z", fill: "#c44a4a", stroke: "#7a1f1f", "stroke-width": 2 });
    el("path", { d: "M20 25 V33 M12 34 H28", fill: "none", stroke: "#7a1f1f", "stroke-width": 3, "stroke-linecap": "round" });
  } else if (palo === "espada") {
    el("path", { d: "M20 3 L25 25 H15 Z", fill: "#cfd8e0", stroke: "#26455f", "stroke-width": 2, "stroke-linejoin": "round" });
    el("rect", { x: 9, y: 25, width: 22, height: 4, rx: 2, fill: "#3f6f95" });
    el("rect", { x: 18, y: 29, width: 4, height: 9, rx: 2, fill: "#26455f" });
  } else {
    el("rect", { x: 17, y: 12, width: 6, height: 26, rx: 3, fill: "#7a5320" });
    el("circle", { cx: 20, cy: 10, r: 7, fill: "#4e8f33", stroke: "#2f5a1e", "stroke-width": 2 });
    el("circle", { cx: 13, cy: 18, r: 4, fill: "#4e8f33", stroke: "#2f5a1e", "stroke-width": 2 });
    el("circle", { cx: 27, cy: 18, r: 4, fill: "#4e8f33", stroke: "#2f5a1e", "stroke-width": 2 });
  }
  return svg;
}

function cartaVista(carta) {
  const d = document.createElement("div");
  d.className = `carta-vista carta-${carta.palo}`;
  d.setAttribute("role", "img");
  d.setAttribute("aria-label", `${carta.numero} de ${carta.palo}`);
  const n = document.createElement("span");
  n.className = "numero";
  n.textContent = String(carta.numero);
  d.append(n, iconoPalo(carta.palo));
  return d;
}

function dibujarJuego(m) {
  mostrar("juego");
  const v = m.vista;
  const miEquipo = m.yo % 2;
  const nombresEquipo = (equipo) =>
    m.asientos
      .map((a, i) => (i % 2 === equipo ? a?.alias : null))
      .filter(Boolean)
      .join(" y ");

  $("p-nos-nombre").textContent = nombresEquipo(miEquipo);
  $("p-ellos-nombre").textContent = nombresEquipo(1 - miEquipo);
  $("p-nos").textContent = String(v.puntos[miEquipo]);
  $("p-ellos").textContent = String(v.puntos[1 - miEquipo]);
  $("j-sala").textContent = `Sala ${m.codigo}`;
  $("j-objetivo").textContent = `a ${m.config.puntos}`;

  // Mesa: las bazas ya jugadas (chicas) y la que esta en curso.
  const mesa = $("mesa");
  mesa.replaceChildren();
  v.bazas.forEach((baza, i) => {
    const enCurso = i === v.bazas.length - 1;
    if (!enCurso && baza.jugadas.length === 0) return;
    const fila = document.createElement("div");
    fila.className = enCurso ? "baza" : "baza anterior";
    if (baza.jugadas.length === 0) {
      // Solo se avisa que la mesa esta vacia si todavia no se jugo ninguna carta en la mano.
      if (v.bazas.length === 1) {
        const vacio = document.createElement("p");
        vacio.className = "baza-vacia";
        vacio.textContent = "La mesa esta vacia";
        mesa.append(vacio);
      }
      return;
    }
    for (const j of baza.jugadas) {
      const col = document.createElement("div");
      col.className = "jugada";
      const quien = document.createElement("span");
      quien.textContent = alias(m, j.seat);
      col.append(cartaVista(j.carta), quien);
      fila.append(col);
    }
    mesa.append(fila);
  });

  // Mensaje de estado.
  let estado;
  if (v.responde === m.yo) estado = `${descripcionPendiente(v)}: ¿qué respondés?`;
  else if (v.responde !== null) estado = `Esperando a ${alias(m, v.responde)}...`;
  else if (v.turno === m.yo) estado = "Tu turno";
  else estado = `Juega ${alias(m, v.turno)}...`;
  $("estado").textContent = estado;

  const reg = $("registro");
  reg.replaceChildren();
  for (const linea of registro.slice(-4)) {
    const li = document.createElement("li");
    li.textContent = linea;
    reg.append(li);
  }

  // Mis cartas: se pueden tocar solo las que el servidor dice que son jugables ahora.
  const jugables = v.acciones.filter((a) => a.tipo === "jugar_carta").map((a) => `${a.carta.palo}${a.carta.numero}`);
  const mano = $("mano");
  mano.replaceChildren();
  for (const c of v.misCartas) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "carta";
    b.disabled = !jugables.includes(`${c.palo}${c.numero}`);
    b.append(cartaVista(c));
    b.addEventListener("click", () => enviar({ t: "accion", accion: { tipo: "jugar_carta", carta: c } }));
    mano.append(b);
  }

  // Botones de cantos y respuestas.
  const acciones = $("acciones");
  acciones.replaceChildren();
  for (const a of v.acciones) {
    if (a.tipo === "jugar_carta") continue;
    const b = document.createElement("button");
    b.type = "button";
    if (a.tipo === "quiero") {
      b.textContent = "Quiero";
      b.className = "si";
    } else if (a.tipo === "no_quiero") {
      b.textContent = "No quiero";
      b.className = "no";
    } else if (a.tipo === "cantar_truco") {
      b.textContent = NOMBRES_TRUCO[v.truco.nivel] ?? "Truco";
      b.className = "canto";
    } else if (a.tipo === "cantar_envido") {
      b.textContent = NOMBRES_ENVIDO[a.canto];
      b.className = "canto";
    } else if (a.tipo === "mazo") {
      b.textContent = "Irme al mazo";
    } else {
      continue;
    }
    b.addEventListener("click", () => enviar({ t: "accion", accion: a }));
    acciones.append(b);
  }
}

function descripcionPendiente(v) {
  if (v.envido.estado === "pendiente") {
    return NOMBRES_ENVIDO[v.envido.cantos[v.envido.cantos.length - 1]] ?? "Envido";
  }
  return NOMBRES_TRUCO[v.truco.nivel - 1] ?? "Truco";
}

// ---------- fin ----------

function dibujarFin(m) {
  mostrar("fin");
  const v = m.vista;
  const miEquipo = m.yo % 2;
  const gane = v.ganadorPartida === miEquipo;
  if (m.motivoFin === "abandono") {
    // Quien abandono se vio dos veces sin jugar a tiempo.
    const yoAbandone = m.abandono === m.yo;
    $("fin-titulo").textContent = yoAbandone ? "Abandonaste" : gane ? "Ganaron por abandono" : "Perdieron por abandono";
    $("fin-puntos").textContent = yoAbandone
      ? "Se te acabó el tiempo dos veces seguidas."
      : `${alias(m, m.abandono)} dejó de jugar. Iban ${v.puntos[miEquipo]} a ${v.puntos[1 - miEquipo]}.`;
  } else {
    $("fin-titulo").textContent = gane ? "Ganaron" : "Perdieron";
    $("fin-puntos").textContent = `${v.puntos[miEquipo]} a ${v.puntos[1 - miEquipo]}`;
  }
  $("fin-ranking").textContent = m.pvp
    ? "Partida entre personas: cuenta para el ranking."
    : "Hubo bots en la mesa: esta partida no cuenta para el ranking.";
}

// ---------- reloj de la jugada ----------

// El servidor manda cuanto le queda a quien mueve; aca solo se cuenta hacia atras desde que llego el mensaje.
function actualizarReloj() {
  const el = $("reloj");
  const m = ultimo;
  if (!m || m.fase !== "jugando" || m.restanteMs === null || m.restanteMs === undefined) {
    el.textContent = "";
    el.className = "reloj";
    return;
  }
  const segundos = Math.max(0, Math.ceil((m.restanteMs - (Date.now() - recibidoEn)) / 1000));
  const esMio = m.mueve === m.yo;
  if (esMio) {
    el.textContent =
      m.ausencias >= 1
        ? `Te quedan ${segundos} s. Si se acaba otra vez, perdés por abandono.`
        : `Te quedan ${segundos} s para jugar`;
  } else {
    el.textContent = `A ${alias(m, m.mueve)} le quedan ${segundos} s`;
  }
  el.className = esMio && segundos <= 10 ? "reloj urgente" : "reloj";
}
setInterval(actualizarReloj, 500);

// ---------- arranque: si el link trae una sala, se reconecta o se une ----------

const codigoURL = new URLSearchParams(location.search).get("sala");
if (codigoURL && /^[A-Z2-9]{5}$/.test(codigoURL.toUpperCase())) {
  $("codigo").value = codigoURL.toUpperCase();
  const guardado = leerLocal(CLAVE_ALIAS);
  if (guardado) conectar(codigoURL.toUpperCase(), guardado);
  else avisar("Poné tu alias y tocá Entrar.", "info");
} else if (codigoURL) {
  history.replaceState(null, "", "/truco/");
}
