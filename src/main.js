import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import mqtt from 'mqtt';
import { JUEGO, RED } from './config.js';
import { ponerIdioma, idioma, tx } from './i18n.js';
import { TI } from './textos-inicio.js';
import { crearEscena, ROLES, ASIENTOS, nombreEscenario } from './escena.js';
import { crearCentroDeControl, ASIENTOS_CONTROL, PARED } from './inicio.js';
import { crearSesion } from './red/sesion.js';
import { crearTransporteMqtt } from './red/transporte-mqtt.js';
import { MAX_JUGADORES, conectados, duenoDeRol } from './red/protocolo.js';
import { T } from './textos.js';
import { traducirMotivo } from './motivos.js';
import { crearPantallas, LOGICO } from './pantallas/index.js';

const $ = (id) => document.getElementById(id);

// ---------- Ajustes (guardados en este navegador) ----------
const leer = (k, def) => { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch { return def; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
const ajustes = leer('ajustes', { sensibilidad: 0.005, calidad: 'alta', animar: true });

// ---------- Marca ----------
$('titulo').textContent = JUEGO.NOMBRE;

// ---------- Render ----------
const contenedor = $('lienzo');
const render = new THREE.WebGLRenderer({ antialias: true });
render.localClippingEnabled = true;
contenedor.appendChild(render.domElement);
const renderEtiquetas = new CSS2DRenderer();
renderEtiquetas.domElement.style.cssText = 'position:absolute;inset:0;pointer-events:none';
contenedor.appendChild(renderEtiquetas.domElement);

const centro = crearCentroDeControl();   // fondo del inicio
const sala = crearEscena();              // sala de briefing
// Sala de control de misión: la misma sala del inicio, ahora con un puesto por rol (avatares, consolas con lámpara GO, puerta al briefing).
// La Tierra de la pantalla central se ve al mirar la sala y se quita cuando la interfaz de la fase se proyecta encima (ver bucle).
const control = crearCentroDeControl({ jugadores: true });
const camaraSala = new THREE.PerspectiveCamera(70, 1, 0.03, 60);
camaraSala.rotation.order = 'YXZ';
// Mirada inicial (cabeceo) al sentarse: en el briefing algo hacia la mesa; en la sala de control hacia la pared de pantallas.
const CABECEO = { briefing: -0.25, control: 0.28 };

function aplicarCalidad() {
  render.setPixelRatio(ajustes.calidad === 'baja' ? 1 : Math.min(devicePixelRatio, 2));
  ajustarTamano();
}
function ajustarTamano() {
  const w = innerWidth, h = innerHeight;
  render.setSize(w, h);
  renderEtiquetas.setSize(w, h);
  for (const cam of [camaraSala, centro.camara]) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
  if (w > 700) centro.camara.setViewOffset(w, h, -w * 0.17, 0, w, h);
  else centro.camara.clearViewOffset();
  rectoAnterior = '';
}
addEventListener('resize', ajustarTamano);

// ---------- Identidad ----------
function idDeJugador() {
  try {
    let id = sessionStorage.getItem('jugadorId');
    if (!id) { id = 'j' + crypto.randomUUID().replace(/-/g, '').slice(0, 16); sessionStorage.setItem('jugadorId', id); }
    return id;
  } catch { return 'j' + Math.random().toString(36).slice(2, 18); }
}
const jugadorId = idDeJugador();

// ---------- Estado local (lo que no se comparte) ----------
let pantalla = 'inicio';   // 'inicio' | 'lobby' | 'sala'
let lugar = 'briefing';    // 'briefing' | 'control': qué sala 3D se ve
let vista = 'sala';        // 'sala' (mirar) | 'laptop' (sentado al portátil) | 'control' (pared de la sala de control)
let pantallaLista = false; // la pantalla DOM solo aparece cuando la cámara terminó de encuadrar
let faseVista = null;      // última fase para la que se decidió la vista automática
let focoAntes = false;     // ¿la cámara estaba fija en el proyector?
let proyectorVisto = null; // último estado del proyector pintado (null: aún nada, sin animación)
let vestidoClave = '';     // reparto + idioma con el que se dibujaron las carpetas
const nickDePestana = () => { try { return sessionStorage.getItem('nick'); } catch { return null; } };
let nick = nickDePestana() ?? leer('nick', '');
const mirada = { yaw: 0, pitch: CABECEO.briefing };
const poses = new Map();
const reiniciarMirada = () => { mirada.yaw = 0; mirada.pitch = CABECEO[lugar] ?? CABECEO.briefing; difundirMirada(); };
let sesion = null;
let transporte = null;
let codigo = '';
let lobbyForzado = false;
let versionAjena = false;
const params = new URLSearchParams(location.search);
const SIMULADO = params.get('simulado') === '1';
let moduloSimulado = null;
const raizPantalla = $('pantalla');
const ui = crearPantallas({ raiz: raizPantalla, franja: $('franja'), modal: $('modal-evento'), capa: $('capa'), simulado: SIMULADO });

const indiceRol = (id) => ROLES.findIndex((r) => r.id === id);
const estado = () => sesion?.estado ?? null;
const miRol = () => sesion?.yo()?.rol ?? null;
const enJuego = () => pantalla === 'sala' && !!estado() && estado().fase !== 'lobby';
// Briefing sin escenario confirmado: el proyector está en la mesa y la cámara queda fija en él.
const proyectorEnMesa = (e = estado()) => !!e && e.fase === 'briefing' && !e.mision?.escenario;
const modoProyector = () => enJuego() && lugar === 'briefing' && !!miRol() && proyectorEnMesa();

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
// El idioma se aplica al momento (el resto de ajustes al cerrar el diálogo).
$('in-idioma').addEventListener('change', (e) => ponerIdioma(e.target.value));
dlgAjustes.addEventListener('close', () => {
  ajustes.sensibilidad = Number($('in-sensibilidad').value);
  ajustes.calidad = $('in-calidad').value;
  ajustes.animar = $('in-animar').checked;
  guardar('ajustes', ajustes);
  aplicarCalidad();
});
addEventListener('idioma', () => { sala.refrescarTextos(); pintarRoles(); actualizarTodo(); });

// ---------- Sesión ----------
function entrarEnSala(cod) {
  codigo = cod;
  history.replaceState(null, '', location.pathname + location.search + '#' + codigo);
  $('codigo-sala').textContent = codigo;
  lobbyForzado = false;
  versionAjena = false;
  poses.clear();
  if (moduloSimulado) {
    transporte = { enLinea: () => ({ listos: 1 }) };
    sesion = moduloSimulado.crearSesionSimulada({ jugadorId, nick, params });
  } else if (moduloLocal) {
    // ?local=1: reglas y datos reales, sin red (un solo jugador; los demás departamentos quedan vacantes).
    transporte = Object.assign(moduloLocal.crearRed().unir(), { enLinea: () => ({ listos: 1 }) });
    sesion = crearSesion({ transporte, jugadorId, nick });
  } else {
    transporte = crearTransporteMqtt(JUEGO.APP_ID, codigo, { brokers: RED.BROKERS, conectar: (url, o) => mqtt.connect(url, o) });
    sesion = crearSesion({ transporte, jugadorId, nick });
  }
  sesion.on('estado', () => { pintarMesa(); actualizarTodo(); });
  sesion.on('aviso', (motivo) => { avisar(motivo); actualizarTodo(); });
  sesion.on('version', () => { versionAjena = true; actualizarTodo(); });
  sesion.on('nuevoPar', () => sesion?.presencia(presencia()));
  sesion.on('presencia', (id, datos) => { if (datos) poses.set(id, datos); else poses.delete(id); actualizarAvatares(); pintarVotos(); });
  pantalla = 'lobby';
  faseVista = null;
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

// Presencia = mirada + voto de escenario + en qué sala estoy (para dibujar mi avatar solo allí). El voto es una pista visual: no pasa por las reglas.
let miVoto = null;
const presencia = () => ({ ...mirada, voto: miVoto, lugar });
let ultimoEnvio = 0, envioPendiente = null;
function difundirMirada() {
  const ahora = performance.now();
  clearTimeout(envioPendiente);
  if (ahora - ultimoEnvio > 66) { ultimoEnvio = ahora; sesion?.presencia(presencia()); }
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
  b.append(punto, texto);
  b.addEventListener('click', () => {
    avisar('');
    sesion?.intentar('elegirRol', { rol: miRol() === r.id ? null : r.id });
    mirada.yaw = 0; mirada.pitch = -0.25;
  });
  listaRoles.appendChild(b);
});
function pintarRoles() {
  for (const b of listaRoles.children) b.querySelector('.nombre').textContent = ROLES[indiceRol(b.dataset.rol)].nombre;
}
pintarRoles();

$('copiar').addEventListener('click', async (e) => {
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = TI.copiado; }
  catch { e.target.textContent = location.href; }
  setTimeout(() => { e.target.textContent = TI.copiarEnlace; }, 2000);
});
$('salir-lobby').addEventListener('click', salirDeSala);
$('iniciar').addEventListener('click', () => {
  lobbyForzado = false;
  avisar('');
  if (estado()?.fase === 'lobby') sesion?.intentar('iniciarMision');
  actualizarTodo();
});

function avisar(t) { t = t ? traducirMotivo(t) : ''; $('aviso').textContent = t; ui.aviso(t); }
function colorCss(c) { return '#' + c.toString(16).padStart(6, '0'); }

// ---------- Vistas: dónde está la cámara ----------
// Decide la vista al cambiar de fase: diseño → portátil; misión/informe → sala de control; briefing → mirar la sala.
function vistaAutomatica(fase) {
  if (fase === faseVista) return;
  const antes = faseVista;
  faseVista = fase;
  if (fase === 'briefing') irA('briefing', !antes);
  else if (['diseno', 'restricciones'].includes(fase)) { if (!(lugar === 'control' && antes && antes !== 'informe' && antes !== 'mision' && antes !== 'verificacion')) irA('laptop', !antes); }
  else if (['verificacion', 'mision', 'informe'].includes(fase)) irA('control', !antes); // GO / NO-GO, vuelo e informe: en la sala de control
}

let fundido = null;
// v: 'sala' (mirar la sala en la que estoy) | 'briefing' (mirar la sala de briefing) | 'laptop' (portátil, en el briefing) | 'control' (pared de la sala de control).
// Cambiar de sala se hace con un fundido. Desde la pared o la consola, 'sala' vuelve a mirar la sala de control; desde el portátil, la de briefing.
function irA(v, inmediato = false) {
  if (!enJuego()) return;
  if (v === 'laptop' && !miRol()) return;
  const nuevoLugar = v === 'control' || (v === 'sala' && lugar === 'control') ? 'control' : 'briefing';
  if (v === 'briefing') v = 'sala';
  if (proyectorEnMesa() && (v !== 'sala' || nuevoLugar !== 'briefing')) return; // hasta elegir escenario no se sale del proyector
  if (nuevoLugar !== lugar) {
    const cambiar = () => { lugar = nuevoLugar; vista = v; if (v === 'sala') reiniciarMirada(); empezarTransicion(true); sesion?.presencia(presencia()); actualizarTodo(); };
    if (inmediato) { cambiar(); return; }
    clearTimeout(fundido);
    $('fundido').classList.add('on');
    pantallaLista = false;
    actualizarTodo();
    fundido = setTimeout(() => { cambiar(); setTimeout(() => $('fundido').classList.remove('on'), 60); }, 320);
    return;
  }
  if (v === vista && pantallaLista) return;
  vista = v;
  if (v === 'sala') reiniciarMirada();
  empezarTransicion(inmediato);
  actualizarTodo();
}

function actualizarTodo() {
  const e = estado();
  const rol = miRol();

  if (pantalla === 'lobby' && e && e.fase !== 'lobby' && rol && !lobbyForzado) { pantalla = 'sala'; faseVista = null; }
  if (pantalla === 'sala' && !rol) pantalla = 'lobby';
  if (pantalla === 'sala' && e && e.fase === 'lobby') pantalla = 'lobby';
  if (enJuego()) vistaAutomatica(e.fase);
  else { faseVista = null; lugar = 'briefing'; vista = 'sala'; pantallaLista = false; }

  $('inicio').classList.toggle('oculto', pantalla !== 'inicio');
  $('lobby').classList.toggle('oculto', pantalla !== 'lobby');
  // Mirando una sala 3D (briefing o control): se puede arrastrar para mirar y se ven las etiquetas de los avatares.
  const mirando = pantalla === 'sala' && vista === 'sala';
  document.body.classList.toggle('en-sala', mirando);
  document.body.classList.toggle('en-juego', pantalla === 'sala');
  renderEtiquetas.domElement.style.display = mirando ? '' : 'none';
  const foco = modoProyector();
  document.body.classList.toggle('en-proyector', foco);
  if (foco !== focoAntes) {
    focoAntes = foco;
    if (!foco) { miVoto = null; sala.seleccionar(null); sesion?.presencia(presencia()); }
    if (vista === 'sala') empezarTransicion(false); // breve zoom hacia el proyector (o de vuelta al asiento)
  }
  pintarProyectorUI();
  vestirCarpetas();
  ui.pintar({
    estado: e, rol, jugadorId, nick, activo: pantalla === 'sala', vista: pantalla === 'sala' ? vista : 'sala', lugar, pantallaLista,
    enLinea: e ? T.online(conectados(e).length, MAX_JUGADORES) : '',
    intentar: (tipo, payload) => sesion?.intentar(tipo, payload),
    volverAlLobby: () => { lobbyForzado = true; pantalla = 'lobby'; actualizarTodo(); },
    irA: (v) => irA(v),
  });
  // Baliza 3D sobre el siguiente objeto (solo mirando la sala: el portátil o la puerta en el briefing, la pantalla central en el control).
  const g = ui.guia;
  sala.guiar(enJuego() && lugar === 'briefing' && vista === 'sala' && !sala.enCinematica ? g?.objetivo : null, Math.max(0, indiceRol(rol)));
  control.guiar(enJuego() && lugar === 'control' && vista === 'sala' ? g?.objetivo : null);
  // Lámparas GO de las consolas: reflejan las firmas de cada departamento durante la verificación.
  control.marcarFirmas(e?.firmas, e?.fase === 'verificacion');
  if (pantalla === 'inicio') return;

  const ul = $('tripulacion');
  ul.replaceChildren();
  if (!e) {
    $('contador').textContent = TI.conectando;
    const li = document.createElement('li');
    li.className = 'tenue';
    li.textContent = TI.buscando;
    ul.appendChild(li);
  } else {
    $('contador').textContent = transporte?.enLinea().listos ? TI.enLaSala(conectados(e).length, MAX_JUGADORES) : TI.sinConexion;
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
      n.textContent = j.nick + (id === jugadorId ? ' ' + TI.tu : '') + (id === sesion.etiqueta.host ? ' ★' : '');
      if (id === sesion.etiqueta.host) n.title = TI.anfitrion;
      const t = document.createElement('span');
      t.className = 'rol';
      t.textContent = (r ? r.nombre : TI.eligiendoRol) + (j.conectado ? '' : TI.desconectado);
      li.append(punto, n, t);
      ul.appendChild(li);
    }
  }

  for (const b of listaRoles.children) {
    const d = e ? duenoDeRol(e, b.dataset.rol) : null;
    const otro = d && d[0] !== jugadorId ? d[1] : null;
    b.disabled = !e || !!otro || !sesion?.yo();
    b.classList.toggle('mio', rol === b.dataset.rol);
    b.querySelector('small').textContent = otro
      ? (otro.conectado ? TI.ocupadoPor(otro.nick) : TI.reservadoPor(otro.nick))
      : rol === b.dataset.rol ? TI.rolPropio : TI.libre;
  }

  const btn = $('iniciar');
  if (e && e.fase !== 'lobby') {
    btn.textContent = TI.entrarMision;
    btn.disabled = !rol;
    if (!rol && !$('aviso').textContent) avisar(TI.yaEmpezo);
  } else {
    btn.textContent = TI.iniciarMision;
    const sinRol = e ? conectados(e).filter(([, j]) => !j.rol).length : 1;
    btn.disabled = !e || !rol || sinRol > 0;
    btn.title = btn.disabled ? TI.todosRol : '';
  }
  if (e && !sesion.yo() && !$('aviso').textContent) avisar(TI.entrandoSala);
  else if (sesion.yo() && $('aviso').textContent === TI.entrandoSala) avisar('');
  if (versionAjena) avisar(TI.versionAjena);

  actualizarAvatares();
}

// Avatares de los demás: los que tienen rol, con su nick y hacia dónde miran.
// Cada sala dibuja a los jugadores que están en ella (su presencia dice en cuál; si aún no hay datos, se asume que en la mía).
function actualizarAvatares() {
  const e = estado();
  ROLES.forEach((r, i) => {
    const d = e ? duenoDeRol(e, r.id) : null;
    const otro = !!d && d[0] !== jugadorId && d[1].conectado;
    const p = (d && poses.get(d[0])) ?? null;
    const donde = p?.lugar ?? lugar;
    for (const [sitio, hab] of [['briefing', sala], ['control', control]]) {
      const av = hab.avatares[i];
      const visible = otro && donde === sitio;
      av.grupo.visible = visible;
      av.nombre.visible = visible;
      if (!visible) continue;
      av.nombre.element.textContent = `${d[1].nick} · ${r.nombre}`;
      av.cabeza.rotation.y = p?.yaw ?? 0;
      av.cabeza.rotation.x = -(p?.pitch ?? CABECEO[sitio]);
    }
  });
}

let repartoVisto = null; // quien llega tarde ve las carpetas ya en la mesa, sin cinemática
function pintarMesa() {
  const e = estado();
  const b = e?.briefing;
  if (!b) return;
  for (const [id, c] of Object.entries(sala.casillas)) c.material.color.set(b[id] ? 0x2f8f4f : 0xffffff);
  // El jefe pone el proyector al empezar el briefing y lo retira al confirmarse el escenario.
  const enMesa = proyectorEnMesa(e);
  if (enMesa !== proyectorVisto) {
    sala.proyector(enMesa, proyectorVisto !== null && pantalla === 'sala');
    proyectorVisto = enMesa;
  }
  if (b.repartos !== repartoVisto) {
    const animar = repartoVisto !== null && pantalla === 'sala' && e.fase === 'briefing';
    sala.repartir(b.reparto, animar);
    repartoVisto = b.repartos;
    vestidoClave = '';
    if (animar && vista !== 'sala') irA('sala');
  }
  sala.marcarCarpeta(e.mision?.id ?? null);
}

// Foto, código y pista de cada carpeta repartida. Los datos cargan aparte: se reintenta hasta tenerlos.
function vestirCarpetas() {
  const D = ui.contexto.D, reparto = estado()?.briefing?.reparto;
  if (!D || !reparto?.length) return;
  const clave = `${estado().briefing.repartos}|${idioma()}|${reparto.join(',')}`;
  if (clave === vestidoClave) return;
  vestidoClave = clave;
  sala.vestirCarpetas((id) => {
    const m = D.MISIONES?.[id];
    if (!m) return null;
    return { cuerpo: m.cuerpo, cuerpoTexto: tx(m.cuerpo), nombre: tx(m.nombre), sello: TI.clasificado };
  });
}

// Votos de la tripulación sobre cada holograma (avatares pequeños sobre la tarjeta).
function pintarVotos() {
  const e = estado();
  const votos = {};
  if (e && modoProyector()) {
    for (const [id, j] of Object.entries(e.jugadores)) {
      if (!j.conectado || !j.rol) continue;
      const v = id === jugadorId ? miVoto : poses.get(id)?.voto;
      if (!v) continue;
      const r = ROLES[indiceRol(j.rol)];
      (votos[v] ??= []).push({ color: colorCss(r.color), letra: (j.nick || '?').slice(0, 1).toUpperCase(), nick: `${j.nick} · ${r.nombre}` });
    }
  }
  sala.mostrarVotos(votos);
}

// Barra inferior del proyector: indicación y botón "Elegir X".
const proyectorUI = $('proyector-ui');
const btnConfirmar = $('confirmar-escenario');
btnConfirmar.addEventListener('click', () => {
  if (!miVoto || !modoProyector()) return;
  avisar('');
  sesion?.intentar('elegirMision', { escenario: miVoto });
});
function pintarProyectorUI() {
  const foco = modoProyector();
  proyectorUI.classList.toggle('oculto', !foco);
  if (!foco) return;
  $('proyector-txt').textContent = miVoto ? TI.proyectorConfirma : TI.proyectorElige;
  btnConfirmar.disabled = !miVoto;
  btnConfirmar.textContent = miVoto ? TI.elegirEscenario(nombreEscenario(miVoto)) : TI.elegirEscenario('…');
  pintarVotos();
}
actualizarTodo();
let enLineaAntes = true;
setInterval(() => {
  const ok = !sesion || !transporte || transporte.enLinea().listos > 0;
  if (ok !== enLineaAntes && pantalla === 'lobby') actualizarTodo();
  enLineaAntes = ok;
  vestirCarpetas(); // los datos de misión pueden llegar después del reparto
}, 2000);
window.__depurar = { sesion: () => sesion, transporte: () => transporte, mirada, poses, control, camara: camaraSala, clicables: sala.clicables, THREE, irA: (v) => irA(v), estadoVista: () => ({ lugar, vista, pantallaLista }) };

let moduloLocal = null;
if (SIMULADO) {
  import('./pantallas/_simulado.js').then((m) => { moduloSimulado = m; nick = nick || 'Tester'; entrarEnSala('SIM01'); });
} else if (params.get('local') === '1') {
  import('./red/transporte-memoria.js').then((m) => { moduloLocal = m; nick = nick || 'Solo'; entrarEnSala('LOCAL1'); });
} else if (/^#[A-Za-z0-9]{4,8}$/.test(location.hash)) $('btn-unirse').click();

// ---------- Teclado ----------
addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape' || !enJuego()) return;
  if (document.querySelector('dialog[open]')) return;
  if (ui.overlay) { ui.cerrar(); return; }
  if (!$('modal-evento').classList.contains('oculto')) return;
  if (vista !== 'sala') irA('sala');
});

// ---------- Mirar (arrastrar) y clic, mirando la sala de briefing o la de control ----------
let arrastre = null;
const raycaster = new THREE.Raycaster();
const puedeMirar = () => enJuego() && vista === 'sala' && !ui.overlay;
const habitacion = () => (lugar === 'control' ? control : sala); // sala 3D en la que estoy
contenedor.addEventListener('pointerdown', (e) => {
  if (!puedeMirar()) return;
  if (modoProyector()) { arrastre = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, fijo: true }; return; } // cámara fija: solo clic
  arrastre = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY };
  contenedor.setPointerCapture(e.pointerId);
});
contenedor.addEventListener('pointermove', (e) => {
  if (!arrastre || arrastre.fijo) { if (puedeMirar()) resaltar(e); return; }
  const s = ajustes.sensibilidad;
  mirada.yaw = THREE.MathUtils.clamp(mirada.yaw - (e.clientX - arrastre.x) * s, -1.9, 1.9);
  mirada.pitch = THREE.MathUtils.clamp(mirada.pitch - (e.clientY - arrastre.y) * s, -1.1, 1.0);
  arrastre.x = e.clientX; arrastre.y = e.clientY;
  difundirMirada();
});
contenedor.addEventListener('pointerup', (e) => {
  const fueClic = arrastre && Math.hypot(e.clientX - arrastre.x0, e.clientY - arrastre.y0) < 6;
  arrastre = null;
  if (fueClic && puedeMirar()) clic(e);
});

function tocado(e) {
  const p = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(p, camaraSala);
  let hits = raycaster.intersectObjects(habitacion().clicables).filter((x) => x.object.userData.activo !== false);
  // Con el proyector en la mesa solo cuentan los hologramas.
  if (modoProyector()) hits = hits.filter((x) => x.object.userData.tipo === 'escenario');
  // Una carpeta se ve a través de lo que la tape (contorno), así que también gana el clic.
  return hits.find((x) => x.object.userData.tipo === 'carpeta') ?? hits[0] ?? null;
}
function resaltar(e) {
  const hit = tocado(e);
  // En la sala de control solo es pulsable la consola propia (la de otro puesto no hace nada).
  const util = hit && !(hit.object.userData.tipo === 'consola' && hit.object.userData.asiento !== indiceRol(miRol()));
  contenedor.style.cursor = util ? 'pointer' : '';
  habitacion().resaltar(util ? hit.object : null);
}

function clic(e) {
  const hit = tocado(e);
  if (!hit) return;
  const d = hit.object.userData;
  const fase = estado()?.fase;
  if (d.tipo === 'casilla') sesion?.intentar('marcarPizarra', { id: d.id });
  if (d.tipo === 'escenario' && modoProyector()) {
    // Primer clic: seleccionar (voto visible para todos). La confirmación va en el botón "Elegir X".
    miVoto = d.id;
    sala.seleccionar(d.id);
    sesion?.presencia(presencia());
    pintarProyectorUI();
  }
  if (d.tipo === 'carpeta' && d.id) ui.abrir({ tipo: 'expediente', id: d.id });
  if (d.tipo === 'laptop') irA('laptop');
  if (d.tipo === 'manual') ui.abrir({ tipo: 'manual', rol: d.rol });
  // Puerta del briefing → sala de control; puerta de la sala de control → briefing.
  if (d.tipo === 'puerta') irA(lugar === 'control' ? 'briefing' : 'control');
  // Sala de control: la pantalla central abre la interfaz de la fase (ruta, GO / NO-GO, operaciones, informe).
  if (d.tipo === 'pared') irA('control');
  // Mi consola: en la votación pone o quita el GO de mi departamento; fuera de ella lleva a la pantalla central.
  if (d.tipo === 'consola' && d.asiento === indiceRol(miRol())) {
    const r = miRol();
    if (fase === 'verificacion') sesion?.intentar('firmar', { on: !estado()?.firmas?.[r] });
    else irA('control');
  }
}

// ---------- Cámara: pose objetivo por vista y transición suave ----------
const posCabeza = new THREE.Vector3();
const objetivo = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const mLook = new THREE.Matrix4();
let transicion = null;
const suave = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

function empezarTransicion(inmediato) {
  pantallaLista = false;
  transicion = inmediato ? { t: 1, p0: camaraSala.position.clone(), q0: camaraSala.quaternion.clone() } : { t: 0, p0: camaraSala.position.clone(), q0: camaraSala.quaternion.clone() };
}

// Encuadra un rectángulo (centro, normal hacia el espectador, arriba, ancho, alto) llenando `llenado` de la vista.
function encuadrar(rect, llenado, out) {
  const tan = Math.tan(THREE.MathUtils.degToRad(camaraSala.fov / 2));
  const d = Math.max((rect.alto / 2) / tan, (rect.ancho / 2) / (tan * camaraSala.aspect)) / llenado;
  out.pos.copy(rect.centro).addScaledVector(rect.normal, d);
  mLook.lookAt(out.pos, rect.centro, rect.arriba);
  out.quat.setFromRotationMatrix(mLook);
}

const puntoMirar = new THREE.Vector3();
function poseObjetivo(out) {
  const i = Math.max(0, indiceRol(miRol()));
  if (lugar === 'control') {
    if (vista !== 'sala') { encuadrar(PARED, 0.97, out); return; }
    // Sentado en mi puesto de la sala de control, mirando a la pared de pantallas.
    control.avatares[i].cabeza.getWorldPosition(posCabeza);
    out.pos.copy(posCabeza);
    euler.set(mirada.pitch, ASIENTOS_CONTROL[i].ry + Math.PI + mirada.yaw, 0);
    out.quat.setFromEuler(euler);
    return;
  }
  if (vista === 'laptop') { encuadrar(sala.pantallaLaptop(i), 0.96, out); return; }
  sala.avatares[i].cabeza.getWorldPosition(posCabeza);
  out.pos.copy(posCabeza);
  if (sala.enCinematica && sala.puntoCinematica(puntoMirar)) {
    mLook.lookAt(posCabeza, puntoMirar, camaraSala.up);
    out.quat.setFromRotationMatrix(mLook);
    return;
  }
  if (modoProyector()) {
    // Cámara fija sobre la mesa, del lado del propio asiento, mirando los hologramas.
    // Distancia según el ancho de pantalla: los tres hologramas (≈1,8 m con sus tarjetas) siempre caben.
    const lado = ASIENTOS[i].z < 0 ? -1 : 1;
    const tanH = Math.tan(THREE.MathUtils.degToRad(camaraSala.fov / 2)) * camaraSala.aspect;
    const d = THREE.MathUtils.clamp(0.95 / tanH, 1.0, 2.2);
    out.pos.set(0, 1.25 + d * 0.22, lado * d);
    puntoMirar.copy(sala.focoProyector); puntoMirar.y += 0.3;
    mLook.lookAt(out.pos, puntoMirar, camaraSala.up);
    out.quat.setFromRotationMatrix(mLook);
    return;
  }
  euler.set(mirada.pitch, ASIENTOS[i].ry + Math.PI + mirada.yaw, 0);
  out.quat.setFromEuler(euler);
}

// Proyecta la pantalla (portátil o pared) a píxeles y coloca encima el DOM escalado.
const v3 = new THREE.Vector3();
let rectoAnterior = '';
function colocarPantalla() {
  if (!pantallaLista || pantalla !== 'sala') return;
  const rect = lugar === 'control' ? PARED : sala.pantallaLaptop(Math.max(0, indiceRol(miRol())));
  const L = LOGICO[lugar === 'control' ? 'control' : 'laptop'];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const esquinas = rect.esquinas ?? [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([sx, sy]) => new THREE.Vector3(rect.centro.x + sx * rect.ancho / 2, rect.centro.y + sy * rect.alto / 2, rect.centro.z));
  for (const p of esquinas) {
    v3.copy(p).project(camaraSala);
    const x = (v3.x + 1) / 2 * innerWidth, y = (1 - v3.y) / 2 * innerHeight;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const s = Math.min((x1 - x0) / L.w, (y1 - y0) / L.h);
  const clave = `${x0.toFixed(1)}|${y0.toFixed(1)}|${s.toFixed(4)}|${L.w}`;
  if (clave === rectoAnterior) return;
  rectoAnterior = clave;
  const cx = (x0 + x1) / 2 - (L.w * s) / 2, cy = (y0 + y1) / 2 - (L.h * s) / 2;
  Object.assign(raizPantalla.style, { width: L.w + 'px', height: L.h + 'px', transform: `translate(${cx}px, ${cy}px) scale(${s})` });
}

// ---------- Bucle (solo dibuja: la lógica de red no depende de él) ----------
const reloj = new THREE.Clock();
let tFondo = 0, tControl = 0, enCineAntes = false, salaDibujada = null;
function bucle() {
  const dt = Math.min(0.1, reloj.getDelta());
  sala.actualizar(dt);
  if (pantalla === 'sala' && miRol()) {
    // Al acabar el reparto la mirada se queda donde apuntaba la cinemática (las carpetas), no vuelve al frente.
    if (enCineAntes && !sala.enCinematica && lugar === 'briefing' && vista === 'sala') {
      euler.setFromQuaternion(camaraSala.quaternion, 'YXZ');
      const ry = ASIENTOS[Math.max(0, indiceRol(miRol()))].ry + Math.PI;
      mirada.yaw = THREE.MathUtils.clamp(Math.atan2(Math.sin(euler.y - ry), Math.cos(euler.y - ry)), -1.9, 1.9);
      mirada.pitch = THREE.MathUtils.clamp(euler.x, -1.1, 1.0);
      difundirMirada();
    }
    enCineAntes = sala.enCinematica;
    poseObjetivo(objetivo);
    if (transicion && transicion.t < 1) {
      transicion.t = Math.min(1, transicion.t + dt / 0.75);
      const u = suave(transicion.t);
      camaraSala.position.lerpVectors(transicion.p0, objetivo.pos, u);
      camaraSala.quaternion.slerpQuaternions(transicion.q0, objetivo.quat, u);
    } else {
      camaraSala.position.copy(objetivo.pos);
      if (vista === 'sala' && lugar === 'briefing' && sala.enCinematica) camaraSala.quaternion.slerp(objetivo.quat, Math.min(1, dt * 4));
      else camaraSala.quaternion.copy(objetivo.quat);
      if (transicion) {
        transicion = null;
        if (vista !== 'sala') { pantallaLista = true; rectoAnterior = ''; actualizarTodo(); }
      }
    }
    // El render de etiquetas HTML no retira las de la sala anterior al cambiar de escena: se vacía su capa en cada cambio de sala.
    if (lugar !== salaDibujada) { salaDibujada = lugar; renderEtiquetas.domElement.replaceChildren(); }
    if (lugar === 'control') {
      tControl += dt;
      control.actualizar(tControl);
      control.ponerHolograma(!pantallaLista); // la Tierra de la pantalla central se quita cuando la interfaz se proyecta encima
      render.render(control.escena, camaraSala);
      if (vista === 'sala') renderEtiquetas.render(control.escena, camaraSala);
    } else {
      render.render(sala.escena, camaraSala);
      if (vista === 'sala') { sala.escalonarPistas(camaraSala.position); renderEtiquetas.render(sala.escena, camaraSala); sala.desencimarPistas(); }
    }
    colocarPantalla();
  } else {
    if (ajustes.animar) tFondo += dt;
    centro.actualizar(tFondo);
    render.render(centro.escena, centro.camara);
  }
  requestAnimationFrame(bucle);
}
aplicarCalidad();
bucle();
