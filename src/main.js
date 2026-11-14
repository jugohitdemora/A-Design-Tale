import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { crearEscena, ROLES, ASIENTOS } from './escena.js';
import { conectar, selfId } from './red.js';

// ---------- Render ----------
const contenedor = document.getElementById('lienzo');
const render = new THREE.WebGLRenderer({ antialias: true });
render.setPixelRatio(Math.min(devicePixelRatio, 2));
contenedor.appendChild(render.domElement);
const renderEtiquetas = new CSS2DRenderer();
renderEtiquetas.domElement.style.cssText = 'position:absolute;inset:0;pointer-events:none';
contenedor.appendChild(renderEtiquetas.domElement);

const camara = new THREE.PerspectiveCamera(70, 1, 0.05, 50);
camara.rotation.order = 'YXZ';
const { escena, avatares, casillas, carpetas, paredFrontal, clicables } = crearEscena();

function ajustarTamano() {
  const w = innerWidth, h = innerHeight;
  render.setSize(w, h);
  renderEtiquetas.setSize(w, h);
  camara.aspect = w / h;
  camara.updateProjectionMatrix();
}
addEventListener('resize', ajustarTamano);
ajustarTamano();

// ---------- Estado ----------
const yo = { rol: null, yaw: 0, pitch: -0.25 };
const pares = new Map(); // peerId -> { rol, yaw, pitch }
let mesa = { v: 0, autor: '', datos: { objetivos: true, tareas: false, riesgos: false, carpetas: {} } };

const indiceRol = (id) => ROLES.findIndex((r) => r.id === id);
const rolOcupadoPorOtro = (id) => [...pares.values()].some((p) => p.rol === id);

// ---------- Red ----------
let codigo = location.hash.slice(1);
if (!/^[A-Z0-9]{4,8}$/.test(codigo)) {
  codigo = Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  history.replaceState(null, '', '#' + codigo);
}
document.getElementById('codigo-sala').textContent = codigo;

const red = conectar(codigo, {
  alEntrar(peerId) {
    pares.set(peerId, { rol: null, yaw: 0, pitch: 0 });
    red.enviarEstado(yo, peerId);
    red.enviarMesa(mesa, peerId);
    actualizarTodo();
  },
  alSalir(peerId) {
    pares.delete(peerId);
    actualizarTodo();
  },
  alEstado(peerId, datos) {
    pares.set(peerId, datos);
    // Dos personas con el mismo rol: se queda el de id menor.
    if (yo.rol && datos.rol === yo.rol && peerId < selfId) {
      soltarRol('Otra persona tomó ese rol a la vez que tú. Elige otro.');
    }
    actualizarTodo();
  },
  alMesa(peerId, recibida) {
    const gana = recibida.v > mesa.v || (recibida.v === mesa.v && recibida.autor > mesa.autor);
    if (gana) { mesa = recibida; pintarMesa(); }
  },
});

let ultimoEnvio = 0, envioPendiente = null;
function difundirEstado() {
  const ahora = performance.now();
  clearTimeout(envioPendiente);
  if (ahora - ultimoEnvio > 66) { ultimoEnvio = ahora; red.enviarEstado(yo); }
  else envioPendiente = setTimeout(difundirEstado, 70);
}

function cambiarMesa(fn) {
  fn(mesa.datos);
  mesa = { v: mesa.v + 1, autor: selfId, datos: mesa.datos };
  red.enviarMesa(mesa);
  pintarMesa();
}

// ---------- Interfaz ----------
const lobby = document.getElementById('lobby');
const hud = document.getElementById('hud');
const listaRoles = document.getElementById('roles');
const aviso = document.getElementById('aviso');

ROLES.forEach((r) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.rol = r.id;
  b.innerHTML = `<span class="punto" style="background:#${r.color.toString(16).padStart(6, '0')}"></span><span>${r.nombre}</span>`;
  b.addEventListener('click', () => tomarRol(r.id));
  listaRoles.appendChild(b);
});

document.getElementById('copiar').addEventListener('click', async (e) => {
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Copiado'; }
  catch { e.target.textContent = location.href; }
});
document.getElementById('salir').addEventListener('click', () => soltarRol(''));

function tomarRol(id) {
  if (rolOcupadoPorOtro(id)) return;
  yo.rol = id;
  yo.yaw = 0;
  yo.pitch = -0.25;
  aviso.textContent = '';
  red.enviarEstado(yo);
  actualizarTodo();
}

function soltarRol(motivo) {
  yo.rol = null;
  aviso.textContent = motivo;
  red.enviarEstado(yo);
  actualizarTodo();
}

function actualizarTodo() {
  // Botones del lobby
  for (const b of listaRoles.children) {
    const ocupado = rolOcupadoPorOtro(b.dataset.rol);
    b.disabled = ocupado;
    b.title = ocupado ? 'Ocupado' : '';
  }
  const n = pares.size;
  const textoRed = n === 0 ? 'Esperando a otros jugadores…' : `${n} jugador${n === 1 ? '' : 'es'} más en la sala`;
  document.getElementById('estado-red').textContent = textoRed;
  document.getElementById('hud-red').textContent = textoRed;

  lobby.classList.toggle('oculto', !!yo.rol);
  hud.classList.toggle('oculto', !yo.rol);
  if (yo.rol) document.getElementById('mi-rol').textContent = ROLES[indiceRol(yo.rol)].nombre;

  // Avatares: visibles si alguien (que no soy yo) ocupa el asiento.
  ROLES.forEach((r, i) => {
    const par = [...pares.values()].find((p) => p.rol === r.id);
    const av = avatares[i];
    const visible = !!par;
    av.grupo.visible = visible;
    av.nombre.visible = visible;
    if (par) {
      av.cabeza.rotation.y = par.yaw;
      av.cabeza.rotation.x = -par.pitch;
    }
  });
}

function pintarMesa() {
  for (const [id, c] of Object.entries(casillas)) {
    c.material.color.set(mesa.datos[id] ? 0x2f8f4f : 0xffffff);
  }
  carpetas.forEach((c) => {
    const abierta = !!mesa.datos.carpetas[c.userData.id];
    c.material.color.set(abierta ? 0xf6dc8a : 0xe8b84a);
    c.scale.x = abierta ? 1.9 : 1; // "abierta" = el doble de ancha
  });
}
pintarMesa();
actualizarTodo();
window.__depurar = { yo, pares, selfId, mesa: () => mesa, camara, clicables, THREE };

// ---------- Mirar (arrastrar con ratón o dedo) y clic ----------
let arrastre = null;
const raycaster = new THREE.Raycaster();
contenedor.addEventListener('pointerdown', (e) => {
  arrastre = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY };
  contenedor.setPointerCapture(e.pointerId);
});
contenedor.addEventListener('pointermove', (e) => {
  if (!arrastre || !yo.rol) return;
  yo.yaw = THREE.MathUtils.clamp(yo.yaw - (e.clientX - arrastre.x) * 0.005, -1.9, 1.9);
  yo.pitch = THREE.MathUtils.clamp(yo.pitch - (e.clientY - arrastre.y) * 0.005, -1.1, 1.0);
  arrastre.x = e.clientX; arrastre.y = e.clientY;
  difundirEstado();
});
contenedor.addEventListener('pointerup', (e) => {
  const fueClic = arrastre && Math.hypot(e.clientX - arrastre.x0, e.clientY - arrastre.y0) < 6;
  arrastre = null;
  if (fueClic && yo.rol) clic(e);
});

function clic(e) {
  const p = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(p, camara);
  const [hit] = raycaster.intersectObjects(clicables);
  if (!hit) return;
  const { tipo, id } = hit.object.userData;
  if (tipo === 'casilla') cambiarMesa((d) => { d[id] = !d[id]; });
  if (tipo === 'carpeta') cambiarMesa((d) => { d.carpetas[id] = !d.carpetas[id]; });
}

// ---------- Bucle ----------
const posCabeza = new THREE.Vector3();
function bucle() {
  paredFrontal.forEach((m) => { m.visible = !!yo.rol; });
  if (yo.rol) {
    const i = indiceRol(yo.rol);
    const a = ASIENTOS[i];
    avatares[i].cabeza.getWorldPosition(posCabeza);
    camara.position.copy(posCabeza);
    camara.rotation.set(yo.pitch, a.ry + Math.PI + yo.yaw, 0);
  } else {
    // Vista general, como el concept art.
    camara.position.set(0, 2.5, 4.4);
    camara.lookAt(0, 0.9, -0.8);
  }
  render.render(escena, camara);
  renderEtiquetas.render(escena, camara);
  requestAnimationFrame(bucle);
}
bucle();
