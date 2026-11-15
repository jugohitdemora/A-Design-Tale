// Escritorio del portátil: barra superior, apps según la fase y la ventana de la app activa.
// Las apps de otros módulos se cargan aparte; si una no carga, se usa la pantalla antigua equivalente.
import { h, lista } from './ui.js';
import { textos, depto } from '../i18n.js';
import { pantallaTaller } from './taller.js';
import { pestanaCohete } from './cohete.js';
import { pestanaRiesgos } from './riesgos.js';
import { pantallaVerificacion } from './verificacion.js';
import { pantallaInforme } from './informe.js';
import { expedienteCompleto } from './expediente.js';
import { resumenSeguro } from './ui.js';
import { panelGlobal } from './panel-global.js';

const T = textos({
  es: {
    so: 'AGENCIA·OS', apps: { constructor: 'Constructor', cohete: 'Cámara de lanzamiento', contingencias: 'Contingencias', ruta: 'Ruta',
      expediente: 'Expediente', manual: 'Manual SOP', estado: 'Estado', verificacion: 'Verificación', informe: 'Informe' },
    bloqueada: 'Disponible cuando empiece el diseño', ruta: 'La ruta se planifica en la SALA DE CONTROL DE MISIÓN.',
    rutaTxt: 'Ventana de lanzamiento, trayectoria y sitio de descenso u órbita con capas de datos satelitales.', irControl: 'Ir a la sala de control',
    esperandoBriefing: 'Briefing en curso', esperandoTxt: 'Lee el expediente, marca los objetivos y pulsa "Listo". El constructor se abre cuando toda la tripulación esté lista.',
    cargando: 'Cargando…', enControl: 'La misión se sigue desde la sala de control.',
  },
  en: {
    so: 'AGENCY·OS', apps: { constructor: 'Builder', cohete: 'Launch camera', contingencias: 'Contingencies', ruta: 'Route',
      expediente: 'Dossier', manual: 'SOP manual', estado: 'Status', verificacion: 'Verification', informe: 'Report' },
    bloqueada: 'Available once design starts', ruta: 'The route is planned in the MISSION CONTROL ROOM.',
    rutaTxt: 'Launch window, trajectory and landing site or orbit with satellite data layers.', irControl: 'Go to the control room',
    esperandoBriefing: 'Briefing in progress', esperandoTxt: 'Read the dossier, tick the goals and press "Ready". The builder opens when the whole crew is ready.',
    cargando: 'Loading…', enControl: 'The mission is followed from the control room.',
  },
});

const ICONOS = { constructor: '🛰', cohete: '📹', contingencias: '⚠', ruta: '🗺', expediente: '📁', manual: '📘', estado: '📊', verificacion: '✔', informe: '📄' };

// Apps externas (las escriben otros módulos). Se rellenan al cargar.
const externas = {};
let avisarCarga = () => {};
function cargar(clave, ruta, nombre) {
  import(ruta).then((m) => { if (typeof m[nombre] === 'function') { externas[clave] = m[nombre]; avisarCarga(); } })
    .catch((err) => console.warn(`app ${clave} no disponible (${ruta})`, err?.message ?? err));
}
cargar('constructor', '../laptop/constructor.js', 'appConstructor');
cargar('contingencias', '../laptop/contingencias.js', 'appContingencias');
cargar('cohete', '../laptop/camara-lanzamiento.js', 'appCohete');
cargar('manual', '../laptop/manual.js', 'appManual');
export function alCargarApps(f) { avisarCarga = f; }

function appsDeFase(fase) {
  if (fase === 'briefing') return ['expediente', 'manual'];
  if (fase === 'diseno' || fase === 'restricciones') return ['constructor', 'cohete', 'contingencias', 'ruta', 'estado', 'expediente', 'manual'];
  if (fase === 'verificacion') return ['verificacion', 'estado', 'expediente', 'manual'];
  if (fase === 'informe') return ['informe', 'ruta', 'expediente', 'manual'];
  if (fase === 'mision') return ['ruta', 'estado', 'expediente', 'manual'];
  return ['expediente', 'manual'];
}
const TODAS = ['constructor', 'cohete', 'contingencias', 'ruta', 'verificacion', 'informe', 'estado', 'expediente', 'manual'];

function reloj() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function contenidoApp(c, app, fase, irA) {
  const restr = fase === 'restricciones';
  try {
    switch (app) {
      case 'constructor': return externas.constructor ? externas.constructor(c, { restr }) : pantallaTaller(c, restr);
      case 'cohete': return externas.cohete ? externas.cohete(c) : pestanaCohete(c);
      case 'contingencias': return externas.contingencias ? externas.contingencias(c) : pestanaRiesgos(c, resumenSeguro(c));
      case 'manual': return externas.manual ? externas.manual(c, { rol: c.ui.manualRol ?? c.rol }) : h('p', { class: 'lp-vacio' }, T.cargando);
      case 'verificacion': return pantallaVerificacion(c);
      case 'informe': return pantallaInforme(c);
      case 'estado': return h('div', { class: 'lp-estado' }, panelGlobal(c, resumenSeguro(c), { revision: fase === 'diseno' || fase === 'restricciones' }));
      case 'expediente': {
        const id = c.e?.mision?.id;
        if (!id) return h('div', { class: 'lp-vacio' }, h('h3', {}, T.esperandoBriefing), h('p', {}, T.esperandoTxt));
        const el = expedienteCompleto(c, id, { cerrar: () => {} });
        el?.classList.add('en-laptop');
        return el;
      }
      case 'ruta': return h('div', { class: 'lp-vacio lp-ruta' },
        h('div', { class: 'lp-ruta-icono', 'aria-hidden': 'true' }, fase === 'mision' || fase === 'informe' ? '🛰' : '🗺'),
        h('h3', {}, fase === 'mision' || fase === 'informe' ? T.enControl : T.ruta),
        fase === 'mision' || fase === 'informe' ? null : h('p', {}, T.rutaTxt),
        h('button', { class: 'lp-btn primario', type: 'button', onclick: () => irA('control') }, T.irControl));
      default: return h('div', { class: 'lp-vacio' });
    }
  } catch (err) {
    console.error('app', app, err);
    return h('p', { class: 'lp-vacio mal' }, String(err?.message ?? err));
  }
}

export function pantallaLaptop(c, fase, { irA }) {
  const apps = appsDeFase(fase);
  // Al cambiar de fase se abre la app principal de esa fase (constructor en diseño, verificación, informe…).
  if (c.ui.appFase !== fase || !apps.includes(c.ui.app)) { c.ui.app = apps[0]; c.ui.appFase = fase; }
  const app = c.ui.app;
  if (fase === 'briefing' && app === 'expediente' && !c.e?.mision?.id) { /* espera */ }
  const barra = h('header', { class: 'lp-barra' },
    h('span', { class: 'lp-logo' }, T.so),
    h('span', { class: 'lp-mision' }, c.mision ? `${c.mision.id}` : ''),
    h('span', { class: 'lp-usuario', style: `--rol: var(--lp-rol-${c.rol})` }, c.nick, ' · ', depto(c.rol)),
    h('span', { class: 'lp-reloj' }, reloj()));
  const dock = h('nav', { class: 'lp-dock', role: 'tablist' }, TODAS.filter((a) => apps.includes(a) || a === 'constructor').map((a) => {
    const ok = apps.includes(a);
    return h('button', {
      class: 'lp-icono' + (a === app ? ' activa' : ''), type: 'button', role: 'tab', 'aria-selected': String(a === app),
      disabled: !ok, title: ok ? T.apps[a] : T.bloqueada,
      onclick: () => { c.ui.app = a; if (a === 'manual') c.ui.manualRol = c.rol; c.repintar(); },
    }, h('span', { class: 'lp-icono-dib', 'aria-hidden': 'true' }, ICONOS[a]), h('span', { class: 'lp-icono-txt' }, T.apps[a]));
  }));
  const ventana = h('section', { class: 'lp-ventana', 'data-app': app },
    h('div', { class: 'lp-ventana-titulo' }, h('span', {}, `${ICONOS[app]} ${T.apps[app]}`), h('span', { class: 'lp-ventana-botones', 'aria-hidden': 'true' }, '▁ ▢ ✕')),
    h('div', { class: 'lp-ventana-cuerpo', 'data-scroll': 'app-' + app }, contenidoApp(c, app, fase, irA)));
  return h('div', { class: 'laptop-so' }, barra, h('div', { class: 'lp-cuerpo' }, dock, ventana));
}
export { lista };
