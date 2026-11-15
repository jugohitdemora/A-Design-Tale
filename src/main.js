import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import mqtt from 'mqtt';
import { JUEGO, TEXTOS, RED } from './config.js';
import { crearEscena, ROLES, ASIENTOS } from './escena.js';
import { crearCentroDeControl } from './inicio.js';
import { crearSesion } from './red/sesion.js';
import { crearTransporteMqtt } from './red/transporte-mqtt.js';
import { MAX_JUGADORES, conectados, duenoDeRol } from './red/protocolo.js';

const $ = (id) => document.getElementById(id);

// ---------- Ajustes (guardados en este navegador) ----------
const leer = (k, def) => { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch { return def; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
const ajustes = leer('ajustes', { sensibilidad: 0.005, calidad: 'alta', animar: true });

// ---------- Marca ----------
document.title = JUEGO.NOMBRE.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
$('titulo').textContent = JUEGO.NOMBRE;
$('lema').textContent = JUEGO.LEMA;
$('jugadores').textContent = JUEGO.JUGADORES;
$('txt-unirse').textContent = TEXTOS.unirse;
$('btn-ajustes').textContent = TEXTOS.ajustes;

// ---------- Render ----------
const contenedor = $('lienzo');
const render = new THREE.WebGLRenderer({ antialias: true });
render.localClippingEnabled = true;
contenedor.appendChild(render.domElement);
const renderEtiquetas = new CSS2DRenderer();
renderEtiquetas.domElement.style.cssText = 'position:absolute;inset:0;pointer-events:none';
contenedor.appendChild(renderEtiquetas.domElement);

const centro = crearCentroDeControl();
const sala = crearEscena();
const camaraSala = new THREE.PerspectiveCamera(70, 1, 0.05, 50);
camaraSala.rotation.order = 'YXZ';

function aplicarCalidad() {
  render.setPixelRatio(ajustes.calidad === 'baja' ? 1 : Math.min(devicePixelRatio, 2));
  ajustarTamano();
}
function ajustarTamano() {
  const w = innerWidth, h = innerHeight;
  render.setSize(w, h);
  renderEtiquetas.setSize(w, h);
  for (const cam of [camaraSala, centro.camara]) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
  // En pantallas anchas el cartel tapa la izquierda: corremos la vista del centro de control a la derecha.
  if (w > 700) centro.camara.setViewOffset(w, h, -w * 0.17, 0, w, h);
  else centro.camara.clearViewOffset();
}
addEventListener('resize', ajustarTamano);
aplicarCalidad();

// ---------- Identidad ----------
// Sobrevive a recargar la pestaña (sessionStorage), así el jugador recupera su rol.
// No usamos localStorage: dos pestañas del mismo navegador tienen que ser dos jugadores distintos.
function idDeJugador() {
  try {
    let id = sessionStorage.getItem('jugadorId');
    if (!id) { id = 'j' + crypto.randomUUID().replace(/-/g, '').slice(0, 16); sessionStorage.setItem('jugadorId', id); }
    return id;
  } catch { return 'j' + Math.random().toString(36).slice(2, 18); }
}
const jugadorId = idDeJugador();

// ---------- Estado local (lo que no se comparte) ----------
let pantalla = 'inicio'; // 'inicio' | 'lobby' | 'sala'
// El nick de esta pestaña manda sobre el último usado en el navegador (dos pestañas = dos jugadores).
const nickDePestana = () => { try { return sessionStorage.getItem('nick'); } catch { return null; } };
let nick = nickDePestana() ?? leer('nick', '');
const mirada = { yaw: 0, pitch: -0.25 }; // hacia dónde mira mi cámara
const poses = new Map();                 // jugadorId -> { yaw, pitch } de los demás (presencia)
let sesion = null;
let transporte = null;
let codigo = '';
let lobbyForzado = false;
let versionAjena = false;

const indiceRol = (id) => ROLES.findIndex((r) => r.id === id);
const estado = () => sesion?.estado ?? null;
const miRol = () => sesion?.yo()?.rol ?? null;

function codigoAleatorio() {
  return Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
}

// ---------- Inicio y diálogos ----------
const dlgUnirse = $('dlg-unirse');
const dlgAjustes = $('dlg-ajustes');

$('btn-unirse').addEventListener('click', () => {
  $('in-nick').value = nick;
  const deUrl = location.hash.slice(1).toUpperCase();
  $('in-sala').value = /^[A-Z0-9]{4,8}$/.test(deUrl) ? deUrl : codigoAleatorio();
  dlgUnirse.showModal();
  (nick ? $('in-sala') : $('in-nick')).focus();
});
$('cancelar-unirse').addEventListener('click', () => dlgUnirse.close());
$('form-unirse').addEventListener('submit', (e) => {
  const n = $('in-nick').value.trim().slice(0, 16);
  if (!n) { e.preventDefault(); return; }
  nick = n;
  guardar('nick', nick);
  try { sessionStorage.setItem('nick', nick); } catch { /* sin almacenamiento */ }
  entrarEnSala($('in-sala').value.trim().toUpperCase());
});

$('btn-ajustes').addEventListener('click', () => {
  $('in-sensibilidad').value = ajustes.sensibilidad;
  $('in-calidad').value = ajustes.calidad;
  $('in-animar').checked = ajustes.animar;
  dlgAjustes.showModal();
});
dlgAjustes.addEventListener('close', () => {
  ajustes.sensibilidad = Number($('in-sensibilidad').value);
  ajustes.calidad = $('in-calidad').value;
  ajustes.animar = $('in-animar').checked;
  guardar('ajustes', ajustes);
  aplicarCalidad();
});

// ---------- Sesión ----------
function entrarEnSala(cod) {
  codigo = cod;
  history.replaceState(null, '', '#' + codigo);
  $('codigo-sala').textContent = codigo;
  lobbyForzado = false;
  versionAjena = false;
  poses.clear();
  transporte = crearTransporteMqtt(JUEGO.APP_ID, codigo, { brokers: RED.BROKERS, conectar: (url, o) => mqtt.connect(url, o) });
  sesion = crearSesion({ transporte, jugadorId, nick });
  sesion.on('estado', () => { pintarMesa(); actualizarTodo(); });
  sesion.on('aviso', (motivo) => { avisar(motivo); actualizarTodo(); });
  sesion.on('version', () => { versionAjena = true; actualizarTodo(); });
  sesion.on('nuevoPar', () => sesion?.presencia({ ...mirada })); // que el recién llegado vea hacia dónde miro
  sesion.on('presencia', (id, datos) => { if (datos) poses.set(id, datos); else poses.delete(id); actualizarAvatares(); });
  pantalla = 'lobby';
  avisar('');
  actualizarTodo();
}

function salirDeSala() {
  sesion?.salir();
  sesion = null;
  pantalla = 'inicio';
  history.replaceState(null, '', location.pathname + location.search);
  actualizarTodo();
}

let ultimoEnvio = 0, envioPendiente = null;
function difundirMirada() {
  const ahora = performance.now();
  clearTimeout(envioPendiente);
  if (ahora - ultimoEnvio > 66) { ultimoEnvio = ahora; sesion?.presencia({ ...mirada }); }
  else envioPendiente = setTimeout(difundirMirada, 70);
}

// ---------- Lobby ----------
const listaRoles = $('roles');
ROLES.forEach((r) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.rol = r.id;
  const punto = document.createElement('span');
  punto.className = 'punto';
  punto.style.background = colorCss(r.color);
  const texto = document.createElement('span');
  texto.innerHTML = '<span class="nombre"></span><small></small>';
  texto.querySelector('.nombre').textContent = r.nombre;
  b.append(punto, texto);
  b.addEventListener('click', () => {
    avisar('');
    sesion?.intentar('elegirRol', { rol: miRol() === r.id ? null : r.id }); // segundo clic = soltar el rol
    mirada.yaw = 0; mirada.pitch = -0.25;
  });
  listaRoles.appendChild(b);
});

$('copiar').addEventListener('click', async (e) => {
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Copiado'; }
  catch { e.target.textContent = location.href; }
  setTimeout(() => { e.target.textContent = 'Copiar enlace'; }, 2000);
});
$('salir-lobby').addEventListener('click', salirDeSala);
$('volver-lobby').addEventListener('click', () => { lobbyForzado = true; pantalla = 'lobby'; actualizarTodo(); });
$('iniciar').addEventListener('click', () => {
  lobbyForzado = false;
  avisar('');
  if (estado()?.fase === 'lobby') sesion?.intentar('iniciarMision');
  actualizarTodo();
});

function avisar(t) { $('aviso').textContent = t; }
function colorCss(c) { return '#' + c.toString(16).padStart(6, '0'); }

function actualizarTodo() {
  const e = estado();
  const rol = miRol();

  // Pantalla: con la misión en marcha y un rol, se entra a la sala de briefing.
  if (pantalla === 'lobby' && e && e.fase !== 'lobby' && rol && !lobbyForzado) pantalla = 'sala';
  if (pantalla === 'sala' && !rol) pantalla = 'lobby';

  $('inicio').classList.toggle('oculto', pantalla !== 'inicio');
  $('lobby').classList.toggle('oculto', pantalla !== 'lobby');
  $('hud').classList.toggle('oculto', pantalla !== 'sala');
  document.body.classList.toggle('en-sala', pantalla === 'sala');
  renderEtiquetas.domElement.style.display = pantalla === 'sala' ? '' : 'none';
  if (pantalla === 'inicio') return;

  const ul = $('tripulacion');
  ul.replaceChildren();
  if (!e) {
    $('contador').textContent = 'CONECTANDO…';
    const li = document.createElement('li');
    li.className = 'tenue';
    li.textContent = 'Buscando a la tripulación en la sala…';
    ul.appendChild(li);
  } else {
    // Sin ningún relé no hay sala compartida: mejor decirlo que enseñar un "1/4" que parece normal.
    $('contador').textContent = transporte?.enLinea().listos
      ? `${conectados(e).length}/${MAX_JUGADORES} EN LA SALA`
      : 'SIN CONEXIÓN · REINTENTANDO…';
    const miembros = Object.entries(e.jugadores).sort((a, b) => a[1].orden - b[1].orden);
    for (const [id, j] of miembros) {
      const r = ROLES[indiceRol(j.rol)];
      const li = document.createElement('li');
      if (!j.conectado) li.style.opacity = 0.5;
      const punto = document.createElement('span');
      punto.className = 'punto';
      punto.style.background = r ? colorCss(r.color) : '#3a4250';
      const n = document.createElement('span');
      n.className = 'nick';
      n.textContent = j.nick + (id === jugadorId ? ' (tú)' : '') + (id === sesion.etiqueta.host ? ' ★' : '');
      if (id === sesion.etiqueta.host) n.title = 'Anfitrión de la sala';
      const t = document.createElement('span');
      t.className = 'rol';
      t.textContent = (r ? r.nombre : 'eligiendo rol…') + (j.conectado ? '' : ' · desconectado');
      li.append(punto, n, t);
      ul.appendChild(li);
    }
  }

  // Botones de rol
  for (const b of listaRoles.children) {
    const d = e ? duenoDeRol(e, b.dataset.rol) : null;
    const otro = d && d[0] !== jugadorId ? d[1] : null;
    b.disabled = !e || !!otro || !sesion?.yo();
    b.classList.toggle('mio', rol === b.dataset.rol);
    b.querySelector('small').textContent = otro
      ? `${otro.conectado ? 'Ocupado' : 'Reservado'} por ${otro.nick}`
      : rol === b.dataset.rol ? 'Tu rol · clic para soltarlo' : 'Libre';
  }

  // Botón de inicio
  const btn = $('iniciar');
  if (e && e.fase !== 'lobby') {
    btn.textContent = 'Entrar a la misión';
    btn.disabled = !rol;
    if (!rol && !$('aviso').textContent) avisar('La misión ya empezó. Elige un rol libre para entrar.');
  } else {
    btn.textContent = 'Iniciar misión';
    const sinRol = e ? conectados(e).filter(([, j]) => !j.rol).length : 1;
    btn.disabled = !e || !rol || sinRol > 0;
    btn.title = btn.disabled ? 'Todos los jugadores tienen que elegir rol' : '';
  }
  if (e && !sesion.yo() && !$('aviso').textContent) avisar('Entrando en la sala…');
  else if (sesion.yo() && $('aviso').textContent === 'Entrando en la sala…') avisar('');
  if (versionAjena) avisar('Alguien en la sala tiene otra versión del juego. Recargad la página (Ctrl+F5) todos.');

  // HUD
  if (rol) $('mi-rol').textContent = `${nick} · ${ROLES[indiceRol(rol)].nombre}`;
  $('hud-red').textContent = e ? `${conectados(e).length} en la sala` : '';

  actualizarAvatares();
}

// Avatares de los demás: los que tienen rol, con su nick y hacia dónde miran.
function actualizarAvatares() {
  const e = estado();
  ROLES.forEach((r, i) => {
    const d = e ? duenoDeRol(e, r.id) : null;
    const av = sala.avatares[i];
    const visible = !!d && d[0] !== jugadorId && d[1].conectado;
    av.grupo.visible = visible;
    av.nombre.visible = visible;
    if (visible) {
      av.nombre.element.textContent = `${d[1].nick} · ${r.nombre}`;
      const p = poses.get(d[0]) ?? { yaw: 0, pitch: -0.25 };
      av.cabeza.rotation.y = p.yaw;
      av.cabeza.rotation.x = -p.pitch;
    }
  });
}

function pintarMesa() {
  const b = estado()?.briefing;
  if (!b) return;
  for (const [id, c] of Object.entries(sala.casillas)) c.material.color.set(b[id] ? 0x2f8f4f : 0xffffff);
  sala.carpetas.forEach((c) => {
    const abierta = !!b.carpetas[c.userData.id];
    c.material.color.set(abierta ? 0xf6dc8a : 0xe8b84a);
    c.scale.x = abierta ? 1.9 : 1;
  });
}
actualizarTodo();
// El aviso de "sin conexión" no depende de ningún mensaje: se repasa cada 2 s mientras se ve el lobby.
let enLineaAntes = true;
setInterval(() => {
  const ok = !sesion || transporte.enLinea().listos > 0;
  if (ok !== enLineaAntes && pantalla === 'lobby') actualizarTodo();
  enLineaAntes = ok;
}, 2000);
window.__depurar = { sesion: () => sesion, transporte: () => transporte, mirada, camara: camaraSala, clicables: sala.clicables, THREE };

// Si el enlace trae código de sala, abrimos directamente el diálogo de unirse.
if (/^#[A-Za-z0-9]{4,8}$/.test(location.hash)) $('btn-unirse').click();

// ---------- Mirar (arrastrar) y clic, solo en la sala ----------
let arrastre = null;
const raycaster = new THREE.Raycaster();
contenedor.addEventListener('pointerdown', (e) => {
  if (pantalla !== 'sala') return;
  arrastre = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY };
  contenedor.setPointerCapture(e.pointerId);
});
contenedor.addEventListener('pointermove', (e) => {
  if (!arrastre) return;
  const s = ajustes.sensibilidad;
  mirada.yaw = THREE.MathUtils.clamp(mirada.yaw - (e.clientX - arrastre.x) * s, -1.9, 1.9);
  mirada.pitch = THREE.MathUtils.clamp(mirada.pitch - (e.clientY - arrastre.y) * s, -1.1, 1.0);
  arrastre.x = e.clientX; arrastre.y = e.clientY;
  difundirMirada();
});
contenedor.addEventListener('pointerup', (e) => {
  const fueClic = arrastre && Math.hypot(e.clientX - arrastre.x0, e.clientY - arrastre.y0) < 6;
  arrastre = null;
  if (fueClic && pantalla === 'sala') clic(e);
});

function clic(e) {
  const p = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(p, camaraSala);
  const [hit] = raycaster.intersectObjects(sala.clicables);
  if (!hit) return;
  const { tipo, id } = hit.object.userData;
  if (tipo === 'casilla') sesion?.intentar('marcarPizarra', { id });
  if (tipo === 'carpeta') sesion?.intentar('abrirCarpeta', { rol: id });
}

// ---------- Bucle (solo dibuja: la lógica de red no depende de él) ----------
const posCabeza = new THREE.Vector3();
const reloj = new THREE.Clock();
let tFondo = 0;
function bucle() {
  const dt = reloj.getDelta();
  const rol = miRol();
  if (pantalla === 'sala' && rol) {
    const i = indiceRol(rol);
    sala.avatares[i].cabeza.getWorldPosition(posCabeza);
    camaraSala.position.copy(posCabeza);
    camaraSala.rotation.set(mirada.pitch, ASIENTOS[i].ry + Math.PI + mirada.yaw, 0);
    render.render(sala.escena, camaraSala);
    renderEtiquetas.render(sala.escena, camaraSala);
  } else {
    if (ajustes.animar) tFondo += dt;
    centro.actualizar(tFondo);
    render.render(centro.escena, centro.camara);
  }
  requestAnimationFrame(bucle);
}
bucle();
