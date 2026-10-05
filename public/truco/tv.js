// Pantalla del local: QR para entrar y mesas activas. Se actualiza sola cada 3 segundos.
// Los alias son texto de terceros: se escriben siempre con textContent.

const $ = (id) => document.getElementById(id);
const REFRESCO_MS = 3000;

// Un QR que apunte a "localhost" no sirve en los celulares: tiene que usarse la IP de la compu.
function advertirSiEsLocalhost() {
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
    const a = $("advertencia");
    a.textContent = "Abri esta pantalla con la IP de la compu (por ejemplo http://192.168.0.10:8787/truco/tv/). Con localhost, el QR no funciona en los celulares.";
    a.hidden = false;
  }
}

function dibujarQR(url) {
  const qr = window.qrcode(0, "M");
  qr.addData(url);
  qr.make();
  // createSvgTag arma el SVG a partir de la matriz de QR (sin entrada de usuarios).
  $("qr").innerHTML = qr.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
  $("direccion").textContent = url;
}

function tarjeta(sala) {
  const li = document.createElement("li");
  li.className = sala.fase === "espera" ? "mesa espera" : "mesa";
  const codigo = document.createElement("div");
  codigo.className = "codigo";
  codigo.textContent = sala.codigo;
  const jugadores = document.createElement("div");
  jugadores.className = "jugadores";
  jugadores.textContent = sala.jugadores.join(" · ") || "Sin jugadores";
  const estado = document.createElement("div");
  estado.className = "estado";
  const modalidad = sala.config.jugadores === 2 ? "1 contra 1" : "Parejas";
  if (sala.fase === "espera") estado.textContent = `${modalidad} a ${sala.config.puntos} · espera ${sala.libres} más`;
  else if (sala.fase === "jugando") estado.textContent = `${modalidad} a ${sala.config.puntos} · en juego${sala.pvp ? "" : " (con bots)"}`;
  else estado.textContent = "Terminó";
  li.append(codigo, jugadores, estado);
  if (sala.puntos) {
    const puntos = document.createElement("div");
    puntos.className = "puntos";
    puntos.textContent = `${sala.puntos[0]} - ${sala.puntos[1]}`;
    li.append(puntos);
  }
  return li;
}

async function refrescar() {
  try {
    const r = await fetch("/api/truco/salas", { cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    const { salas } = await r.json();
    const lista = $("lista");
    lista.replaceChildren(...salas.map(tarjeta));
    $("vacio").hidden = salas.length > 0;
  } catch (e) {
    console.warn("no se pudieron leer las mesas", e);
  }
}

advertirSiEsLocalhost();
dibujarQR(`${location.origin}/truco/`);
refrescar();
setInterval(refrescar, REFRESCO_MS);
