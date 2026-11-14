import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { JUEGO, TEXTOS } from './config.js';
import { crearEscena, ROLES, ASIENTOS } from './escena.js';
import { crearCentroDeControl } from './inicio.js';
import { conectar, selfId } from './red.js';

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

// ---------- Estado ----------
let pantalla = 'inicio'; // 'inicio' | 'lobby' | 'sala'
const yo = { nick: leer('nick', ''), rol: null, yaw: 0, pitch: -0.25 };
const pares = new Map(); // peerId -> { nick, rol, yaw, pitch }
const mesaInicial = () => ({ v: 0, autor: '', datos: { fase: 'lobby', objetivos: true, tareas: false, riesgos: false, carpetas: {} } });
let mesa = mesaInicial();
let red = null;
let codigo = '';

const indiceRol = (id) => ROLES.findIndex((r) => r.id === id);
const quienTiene = (id) => [...pares.values()].find((p) => p.rol === id);

function codigoAleatorio() {
  return Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
}

// ---------- Inicio y diálogos ----------
const dlgUnirse = $('dlg-unirse');
const dlgAjustes = $('dlg-ajustes');

$('btn-unirse').addEventListener('click', () => {
  $('in-nick').value = yo.nick;
  const deUrl = location.hash.slice(1).toUpperCase();
  $('in-sala').value = /^[A-Z0-9]{4,8}$/.test(deUrl) ? deUrl : codigoAleatorio();
  dlgUnirse.showModal();
  (yo.nick ? $('in-sala') : $('in-nick')).focus();
});
$('cancelar-unirse').addEventListener('click', () => dlgUnirse.close());
$('form-unirse').addEventListener('submit', (e) => {
  const nick = $('in-nick').value.trim().slice(0, 16);
  if (!nick) { e.preventDefault(); return; }
  yo.nick = nick;
  guardar('nick', nick);
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

// ---------- Red ----------
function entrarEnSala(cod) {
  codigo = cod;
  history.replaceState(null, '', '#' + codigo);
  $('codigo-sala').textContent = codigo;
  yo.rol = null;
  lobbyForzado = false;
  pares.clear();
  mesa = mesaInicial();
  pintarMesa();
  red = conectar(JUEGO.APP_ID, codigo, {
    alEntrar(peerId) {
      pares.set(peerId, { nick: '…', rol: null, yaw: 0, pitch: 0 });
      red.enviarEstado(yo, peerId);
      red.enviarMesa(mesa, peerId);
      actualizarTodo();
    },
    alSalir(peerId) { pares.delete(peerId); actualizarTodo(); },
    alEstado(peerId, datos) {
      pares.set(peerId, datos);
      // Dos personas con el mismo rol: se queda la de id menor.
      if (yo.rol && datos.rol === yo.rol && peerId < selfId) {
        yo.rol = null;
        red.enviarEstado(yo);
        avisar(`${datos.nick} tomó ese rol a la vez que tú. Elige otro.`);
      }
      actualizarTodo();
    },
    alMesa(peerId, recibida) {
      const gana = recibida.v > mesa.v || (recibida.v === mesa.v && recibida.autor > mesa.autor);
      if (gana) { mesa = recibida; pintarMesa(); actualizarTodo(); }
    },
  });
  pantalla = 'lobby';
  avisar('');
  actualizarTodo();
}

function salirDeSala() {
  red?.salir();
  red = null;
  pares.clear();
  yo.rol = null;
  pantalla = 'inicio';
  history.replaceState(null, '', location.pathname + location.search);
  actualizarTodo();
}

let ultimoEnvio = 0, envioPendiente = null;
function difundirEstado() {
  const ahora = performance.now();
  clearTimeout(envioPendiente);
  if (ahora - ultimoEnvio > 66) { ultimoEnvio = ahora; red?.enviarEstado(yo); }
  else envioPendiente = setTimeout(difundirEstado, 70);
}

function cambiarMesa(fn) {
  fn(mesa.datos);
  mesa = { v: mesa.v + 1, autor: selfId, datos: mesa.datos };
  red?.enviarMesa(mesa);
  pintarMesa();
  actualizarTodo();
}

// ---------- Lobby ----------
const listaRoles = $('roles');
ROLES.forEach((r) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.rol = r.id;
  const punto = document.createElement('span');
  punto.className = 'punto';
  punto.style.background = '#' + r.color.toString(16).padStart(6, '0');
  const texto = document.createElement('span');
  texto.innerHTML = '<span class="nombre"></span><small></small>';
  texto.querySelector('.nombre').textContent = r.nombre;
  b.append(punto, texto);
  b.addEventListener('click', () => elegirRol(r.id));
  listaRoles.appendChild(b);
});

function elegirRol(id) {
  if (quienTiene(id)) return;
  yo.rol = yo.rol === id ? null : id; // segundo clic = soltar el rol
  yo.yaw = 0; yo.pitch = -0.25;
  avisar('');
  red?.enviarEstado(yo);
  actualizarTodo();
}

$('copiar').addEventListener('click', async (e) => {
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Copiado'; }
  catch { e.target.textContent = location.href; }
  setTimeout(() => { e.target.textContent = 'Copiar enlace'; }, 2000);
});
$('salir-lobby').addEventListener('click', salirDeSala);
// "Lobby" desde el HUD: quedarse en el lobby aunque la misión esté en marcha.
let lobbyForzado = false;
$('volver-lobby').addEventListener('click', () => { lobbyForzado = true; pantalla = 'lobby'; actualizarTodo(); });
$('iniciar').addEventListener('click', () => {
  lobbyForzado = false;
  if (mesa.datos.fase === 'briefing') { if (yo.rol) { pantalla = 'sala'; actualizarTodo(); } }
  else cambiarMesa((d) => { d.fase = 'briefing'; });
});

function avisar(t) { $('aviso').textContent = t; }

function actualizarTodo() {
  const total = pares.size + 1;
  const sinRol = [...pares.values()].filter((p) => !p.rol).length + (yo.rol ? 0 : 1);
  const enBriefing = mesa.datos.fase === 'briefing';

  // Al empezar la misión, quien ya tiene rol entra a la sala de briefing.
  if (pantalla === 'lobby' && enBriefing && yo.rol && !lobbyForzado) pantalla = 'sala';
  if (pantalla === 'sala' && !yo.rol) pantalla = 'lobby';

  $('inicio').classList.toggle('oculto', pantalla !== 'inicio');
  $('lobby').classList.toggle('oculto', pantalla !== 'lobby');
  $('hud').classList.toggle('oculto', pantalla !== 'sala');
  document.body.classList.toggle('en-sala', pantalla === 'sala');
  renderEtiquetas.domElement.style.display = pantalla === 'sala' ? '' : 'none';

  // Contador y tripulación
  $('contador').textContent = `${total}/${JUEGO.MAX_JUGADORES} EN LA SALA`;
  const ul = $('tripulacion');
  ul.replaceChildren();
  const miembros = [{ nick: yo.nick, rol: yo.rol, yo: true }, ...[...pares.values()]];
  for (const m of miembros) {
    const li = document.createElement('li');
    const rol = ROLES[indiceRol(m.rol)];
    const punto = document.createElement('span');
    punto.className = 'punto';
    punto.style.background = rol ? '#' + rol.color.toString(16).padStart(6, '0') : '#3a4250';
    const nick = document.createElement('span');
    nick.className = 'nick';
    nick.textContent = m.nick + (m.yo ? ' (tú)' : '');
    const r = document.createElement('span');
    r.className = 'rol';
    r.textContent = rol ? rol.nombre : 'eligiendo rol…';
    li.append(punto, nick, r);
    ul.appendChild(li);
  }

  // Botones de rol
  for (const b of listaRoles.children) {
    const otro = quienTiene(b.dataset.rol);
    b.disabled = !!otro;
    b.classList.toggle('mio', yo.rol === b.dataset.rol);
    b.querySelector('small').textContent = otro ? `Ocupado por ${otro.nick}` : yo.rol === b.dataset.rol ? 'Tu rol · clic para soltarlo' : 'Libre';
  }

  // Botón de inicio
  const btn = $('iniciar');
  if (enBriefing) {
    btn.disabled = !yo.rol;
    btn.textContent = 'Entrar a la misión';
    if (!yo.rol) avisarSiVacio('La misión ya empezó. Elige un rol libre para entrar.');
  } else {
    btn.textContent = 'Iniciar misión';
    btn.disabled = sinRol > 0 || total > JUEGO.MAX_JUGADORES;
    if (total > JUEGO.MAX_JUGADORES) avisarSiVacio(`La sala está llena (${JUEGO.MAX_JUGADORES} máximo).`);
  }
  btn.title = btn.disabled && !enBriefing ? 'Todos los jugadores tienen que elegir rol' : '';

  // HUD
  if (yo.rol) $('mi-rol').textContent = `${yo.nick} · ${ROLES[indiceRol(yo.rol)].nombre}`;
  $('hud-red').textContent = pares.size === 0 ? 'Solo tú en la sala' : `${total} en la sala`;

  // Avatares de los demás
  ROLES.forEach((r, i) => {
    const par = quienTiene(r.id);
    const av = sala.avatares[i];
    av.grupo.visible = !!par;
    av.nombre.visible = !!par;
    if (par) {
      av.nombre.element.textContent = `${par.nick} · ${r.nombre}`;
      av.cabeza.rotation.y = par.yaw;
      av.cabeza.rotation.x = -par.pitch;
    }
  });
}
function avisarSiVacio(t) { if (!$('aviso').textContent) avisar(t); }

function pintarMesa() {
  for (const [id, c] of Object.entries(sala.casillas)) c.material.color.set(mesa.datos[id] ? 0x2f8f4f : 0xffffff);
  sala.carpetas.forEach((c) => {
    const abierta = !!mesa.datos.carpetas[c.userData.id];
    c.material.color.set(abierta ? 0xf6dc8a : 0xe8b84a);
    c.scale.x = abierta ? 1.9 : 1;
  });
}
pintarMesa();
actualizarTodo();
window.__depurar = { yo, pares, selfId, mesa: () => mesa, camara: camaraSala, clicables: sala.clicables, THREE };

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
  yo.yaw = THREE.MathUtils.clamp(yo.yaw - (e.clientX - arrastre.x) * s, -1.9, 1.9);
  yo.pitch = THREE.MathUtils.clamp(yo.pitch - (e.clientY - arrastre.y) * s, -1.1, 1.0);
  arrastre.x = e.clientX; arrastre.y = e.clientY;
  difundirEstado();
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
  if (tipo === 'casilla') cambiarMesa((d) => { d[id] = !d[id]; });
  if (tipo === 'carpeta') cambiarMesa((d) => { d.carpetas[id] = !d.carpetas[id]; });
}

// ---------- Bucle ----------
const posCabeza = new THREE.Vector3();
const reloj = new THREE.Clock();
let tFondo = 0;
function bucle() {
  const dt = reloj.getDelta();
  if (pantalla === 'sala') {
    sala.paredFrontal.forEach((m) => { m.visible = true; });
    const i = indiceRol(yo.rol);
    sala.avatares[i].cabeza.getWorldPosition(posCabeza);
    camaraSala.position.copy(posCabeza);
    camaraSala.rotation.set(yo.pitch, ASIENTOS[i].ry + Math.PI + yo.yaw, 0);
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
