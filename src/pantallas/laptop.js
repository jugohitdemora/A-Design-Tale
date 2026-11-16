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
import { panelGlobal, bloqueRevision } from './panel-global.js';
import { pasosFase } from './index.js';

const T = textos({
  es: {
    so: 'AGENCIA·OS', apps: { constructor: 'Constructor', cohete: 'Selector de cohete', contingencias: 'Contingencias', ruta: 'Sala de control',
      expediente: 'Expediente', manual: 'Manual SOP', juego: 'Manual de juego', estado: 'Estado', revision: 'Revisión', verificacion: 'Verificación', informe: 'Informe' },
    planRuta: 'Planificar ruta', pasoN: (n) => `Paso ${n}`,
    levantarse: 'Sala (Esc)',
    bloqueada: 'Disponible cuando empiece el diseño', ruta: 'La ruta se planifica en la SALA DE CONTROL DE MISIÓN.',
    rutaTxt: 'Ventana de lanzamiento, trayectoria y sitio de descenso u órbita con capas de datos satelitales.', irControl: 'Ir a la sala de control',
    esperandoBriefing: 'Briefing en curso', esperandoTxt: 'Marca los objetivos en el expediente y pulsa Listo.',
    cargando: 'Cargando…', enControl: 'La misión se sigue desde la sala de control.',
  },
  en: {
    so: 'AGENCY·OS', apps: { constructor: 'Builder', cohete: 'Rocket selector', contingencias: 'Contingencies', ruta: 'Control room',
      expediente: 'Dossier', manual: 'SOP manual', juego: 'Game manual', estado: 'Status', revision: 'Review', verificacion: 'Verification', informe: 'Report' },
    planRuta: 'Plan route', pasoN: (n) => `Step ${n}`,
    levantarse: 'Room (Esc)',
    bloqueada: 'Available once design starts', ruta: 'The route is planned in the MISSION CONTROL ROOM.',
    rutaTxt: 'Launch window, trajectory and landing site or orbit with satellite data layers.', irControl: 'Go to the control room',
    esperandoBriefing: 'Briefing in progress', esperandoTxt: 'Tick the goals in the dossier and press Ready.',
    cargando: 'Loading…', enControl: 'The mission is followed from the control room.',
  },
});

// Iconos del dock en pixel art 16×16, mismo estilo y paleta que los iconos de piezas del Constructor.
// [x, y, ancho, alto, tono]; tonos de la paleta --lp-* del portátil.
const TONO = { k: 'var(--lp-tinta)', l: 'var(--lp-panel)', f: 'var(--lp-panel-2)', p: 'var(--lp-plano)', s: 'var(--lp-acento)',
  a: 'var(--lp-aviso)', o: 'var(--lp-ok)', m: 'var(--lp-mal)', w: '#ffffff' };
const PIXELES = {
  cohete: [[7, 0, 2, 1, 'k'], [6, 1, 4, 2, 'k'], [7, 1, 2, 2, 'm'], [5, 3, 6, 9, 'k'], [6, 3, 4, 8, 'l'], [6, 3, 1, 8, 'w'], [7, 5, 2, 2, 'p'],
    [6, 9, 4, 1, 'm'], [3, 8, 2, 4, 'k'], [4, 9, 1, 2, 'm'], [11, 8, 2, 4, 'k'], [11, 9, 1, 2, 'm'], [6, 12, 4, 1, 'k'],
    [6, 13, 4, 1, 'a'], [7, 13, 2, 1, 'm'], [7, 14, 2, 2, 'a']],
  constructor: [[0, 5, 5, 6, 'k'], [1, 6, 3, 4, 'p'], [2, 6, 1, 4, 'k'], [11, 5, 5, 6, 'k'], [12, 6, 3, 4, 'p'], [13, 6, 1, 4, 'k'],
    [5, 7, 1, 2, 'k'], [10, 7, 1, 2, 'k'], [6, 5, 4, 6, 'k'], [7, 6, 2, 4, 's'], [7, 6, 1, 1, 'l'], [7, 2, 2, 3, 'k'], [6, 1, 4, 1, 'k'],
    [7, 0, 2, 1, 'a'], [7, 11, 2, 2, 'k'], [6, 13, 4, 1, 'k']],
  ruta: [[1, 2, 14, 12, 'k'], [2, 3, 12, 10, 'l'], [6, 3, 1, 10, 'f'], [10, 3, 1, 10, 'f'], [3, 10, 2, 2, 'o'],
    [5, 9, 1, 1, 'a'], [6, 8, 1, 1, 'a'], [8, 8, 1, 1, 'a'], [9, 7, 1, 1, 'a'],
    [11, 4, 1, 1, 'm'], [13, 4, 1, 1, 'm'], [12, 5, 1, 1, 'm'], [11, 6, 1, 1, 'm'], [13, 6, 1, 1, 'm']],
  contingencias: [[7, 1, 2, 1, 'k'], [6, 2, 4, 2, 'k'], [5, 4, 6, 2, 'k'], [4, 6, 8, 2, 'k'], [3, 8, 10, 2, 'k'], [2, 10, 12, 2, 'k'], [1, 12, 14, 2, 'k'],
    [7, 3, 2, 1, 'a'], [6, 4, 4, 2, 'a'], [5, 6, 6, 2, 'a'], [4, 8, 8, 2, 'a'], [3, 10, 10, 2, 'a'], [2, 12, 12, 1, 'a'],
    [7, 5, 2, 4, 'k'], [7, 10, 2, 2, 'k']],
  revision: [[2, 2, 12, 14, 'k'], [3, 3, 10, 12, 'l'], [5, 1, 6, 3, 'k'], [6, 2, 4, 1, 'f'], [4, 5, 5, 1, 'f'],
    [4, 9, 1, 2, 'o'], [5, 10, 1, 2, 'o'], [6, 11, 2, 2, 'o'], [8, 10, 1, 2, 'o'], [9, 9, 1, 2, 'o'], [10, 8, 1, 2, 'o'], [11, 7, 1, 2, 'o']],
  expediente: [[1, 2, 6, 2, 'k'], [2, 3, 4, 1, 'a'], [1, 4, 14, 11, 'k'], [2, 5, 12, 3, 'a'], [3, 3, 10, 5, 'k'], [4, 4, 8, 4, 'l'], [5, 5, 5, 1, 'f'],
    [1, 8, 14, 7, 'k'], [2, 9, 12, 5, 'a'], [2, 9, 12, 1, 'l'], [6, 11, 4, 1, 'k']],
  manual: [[3, 1, 11, 14, 'k'], [4, 2, 8, 12, 'p'], [12, 2, 1, 12, 'l'], [5, 2, 1, 12, 'k'], [7, 4, 4, 3, 'l'], [8, 5, 2, 1, 'k'], [4, 14, 9, 1, 'l']],
  juego: [[1, 4, 7, 9, 'k'], [2, 5, 5, 7, 'l'], [8, 4, 7, 9, 'k'], [9, 5, 5, 7, 'l'], [7, 4, 2, 9, 'k'],
    [3, 6, 3, 1, 'f'], [3, 8, 3, 1, 'f'], [3, 10, 2, 1, 'f'], [10, 6, 3, 1, 'f'], [10, 8, 3, 1, 'f'], [10, 10, 2, 1, 'f'], [0, 12, 16, 2, 'k'], [1, 12, 14, 1, 's']],
  estado: [[1, 1, 14, 14, 'k'], [2, 2, 12, 12, 'l'], [3, 9, 2, 4, 'o'], [6, 6, 2, 7, 'a'], [9, 4, 2, 9, 'p'], [12, 8, 1, 5, 'm'], [2, 13, 12, 1, 'k']],
};
function iconoDock(app, tamano = 32) {
  const rects = (PIXELES[app] ?? []).map(([x, y, w, hh, k]) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="${TONO[k]}"/>`).join('');
  const t = document.createElement('template');
  t.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${tamano}" height="${tamano}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
  return t.content.firstChild;
}

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
cargar('juego', '../laptop/manual.js', 'appManualJuego');
export function alCargarApps(f) { avisarCarga = f; }

// La verificación (votación GO / NO-GO) y el informe ya no van en el portátil: están en la sala de control.
// 'ruta' no abre una ventana: el icono lleva directamente a la sala de control.
// En diseño el dock sigue el orden de trabajo (numerado): cohete → constructor → ruta → contingencias → revisión;
// después, separadas, las apps de consulta (expediente y manuales).
const FLUJO_DISENO = ['cohete', 'constructor', 'ruta', 'contingencias', 'revision'];
const CONSULTA = ['expediente', 'manual', 'juego'];
function dockDeFase(fase) {
  if (fase === 'briefing') return { flujo: [], consulta: CONSULTA, bloqueadas: ['cohete', 'constructor', 'ruta'] };
  if (fase === 'diseno' || fase === 'restricciones') return { flujo: FLUJO_DISENO, consulta: CONSULTA, bloqueadas: [] };
  // Verificación, misión e informe: lo importante pasa en la sala de control, así que va primero.
  return { flujo: ['ruta', 'estado'], consulta: CONSULTA, bloqueadas: [] };
}
// Apps que abren ventana en el portátil (todas menos 'ruta').
function appsDeFase(fase) {
  const d = dockDeFase(fase);
  return [...d.flujo, ...d.consulta].filter((a) => a !== 'ruta');
}

function contenidoApp(c, app, fase, irA) {
  const restr = fase === 'restricciones';
  try {
    switch (app) {
      case 'constructor': return externas.constructor ? externas.constructor(c, { restr }) : pantallaTaller(c, restr);
      case 'cohete': return externas.cohete ? externas.cohete(c) : pestanaCohete(c);
      case 'contingencias': return externas.contingencias ? externas.contingencias(c) : pestanaRiesgos(c, resumenSeguro(c));
      case 'manual': return externas.manual ? externas.manual(c, { rol: c.ui.manualRol ?? c.rol }) : h('p', { class: 'lp-vacio' }, T.cargando);
      case 'juego': return externas.juego ? externas.juego(c, { rol: c.rol }) : h('p', { class: 'lp-vacio' }, T.cargando);
      case 'verificacion': return pantallaVerificacion(c);
      case 'informe': return pantallaInforme(c);
      case 'estado': return h('div', { class: 'lp-estado' }, panelGlobal(c, resumenSeguro(c), { revision: fase === 'diseno' || fase === 'restricciones' }));
      case 'revision': return h('div', { class: 'lp-estado' }, listaRevision(c, fase), panelGlobal(c, resumenSeguro(c)));
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
        h('button', { class: 'boton primario grande', type: 'button', onclick: () => irA('pared') }, T.irControl));
      default: return h('div', { class: 'lp-vacio' });
    }
  } catch (err) {
    console.error('app', app, err);
    return h('p', { class: 'lp-vacio mal' }, String(err?.message ?? err));
  }
}

// Lista previa a la revisión: qué falta antes de pulsar Pedir revisión (orden del dock).
const TR = textos({
  es: { titulo: 'Antes de pedir revisión', cohete: 'Cohete elegido', piezas: 'Tus piezas montadas', ruta: 'Ruta planificada', limites: 'Dentro de los límites', ir: 'Ir' },
  en: { titulo: 'Before requesting review', cohete: 'Rocket chosen', piezas: 'Your parts added', ruta: 'Route planned', limites: 'Within limits', ir: 'Go' },
});
function listaRevision(c, fase) {
  const e = c.e ?? {};
  let dentro = null;
  try { const res = resumenSeguro(c); const k = res && c.motor?.cumple ? c.motor.cumple(res) : null; dentro = k ? k.nivel !== 'fuera' : null; } catch { dentro = null; }
  const filas = [
    ['cohete', T.apps.cohete, TR.cohete, !!e.porRol?.vuelo?.cohete],
    ['constructor', T.apps.constructor, TR.piezas, Object.keys(e.porRol?.[c.rol]?.piezas ?? {}).length > 0],
    ['ruta', T.planRuta, TR.ruta, !!e.porRol?.vuelo?.ruta],
    ['constructor', T.apps.constructor, TR.limites, dentro],
  ];
  if (fase === 'restricciones') filas.splice(0, 3);
  const ir = (a) => (a === 'ruta' ? c.irA?.('pared') : (c.ui.app = a, c.repintar()));
  return h('section', { class: 'caja lp-checklist' }, h('h3', {}, TR.titulo),
    h('ul', {}, filas.map(([a, , txt, ok]) => h('li', { class: ok ? 'ok' : ok === false ? 'falta' : '' },
      h('span', { class: 'lp-check', 'aria-hidden': 'true' }, ok ? '✔' : ok === false ? '○' : '–'), ' ', txt,
      ok === false ? h('button', { class: 'btn-plano', type: 'button', onclick: () => ir(a) }, TR.ir, ' ›') : null))),
    ...bloqueRevision(c));
}

export function pantallaLaptop(c, fase, { irA }) {
  const apps = appsDeFase(fase);
  // Al cambiar de fase se abre la app principal de esa fase (constructor en diseño, verificación, informe…).
  if (c.ui.appFase !== fase || !apps.includes(c.ui.app)) { c.ui.app = apps[0]; c.ui.appFase = fase; }
  const app = c.ui.app;
  if (fase === 'briefing' && app === 'expediente' && !c.e?.mision?.id) { /* espera */ }
  const barra = h('header', { class: 'lp-barra' },
    h('span', { class: 'lp-logo' }, T.so),
    pasosFase(c.guia),
    h('span', { class: 'lp-usuario', style: `--rol: var(--lp-rol-${c.rol})` }, c.nick, ' · ', depto(c.rol)),
    h('button', { class: 'boton lp-salir', type: 'button', title: T.levantarse, onclick: () => irA('sala') }, '⏏ ', T.levantarse));
  const d = dockDeFase(fase);
  const numerar = fase === 'diseno' || fase === 'restricciones';
  const icono = (a, k, bloqueada) => {
    const esRuta = a === 'ruta';
    const nombre = esRuta ? (numerar ? T.planRuta : T.apps.ruta) : T.apps[a];
    const guia = !bloqueada && (c.guia?.app === a || (esRuta && c.guia?.objetivo === 'control'));
    return h('button', {
      class: 'lp-icono' + (a === app ? ' activa' : '') + (esRuta ? ' lp-ir-control' : '') + (guia ? ' guia' : ''),
      type: 'button', role: esRuta ? undefined : 'tab', 'aria-selected': esRuta ? undefined : String(a === app),
      disabled: bloqueada, title: bloqueada ? T.bloqueada : esRuta ? T.irControl : T.apps[a],
      onclick: esRuta ? () => irA('pared') : () => { c.ui.app = a; if (a === 'manual') c.ui.manualRol = c.rol; c.repintar(); },
    },
    k != null ? h('span', { class: 'lp-icono-paso', 'aria-label': T.pasoN(k) }, String(k)) : null,
    h('span', { class: 'lp-icono-dib', 'aria-hidden': 'true' }, iconoDock(a)), h('span', { class: 'lp-icono-txt' }, nombre));
  };
  const dock = h('nav', { class: 'lp-dock', role: 'tablist' },
    d.bloqueadas.map((a) => icono(a, null, true)),
    d.flujo.map((a, k) => icono(a, numerar ? k + 1 : null, false)),
    h('hr', { class: 'lp-dock-sep', 'aria-hidden': 'true' }),
    d.consulta.map((a) => icono(a, null, false)));
  const ventana = h('section', { class: 'lp-ventana', 'data-app': app },
    h('div', { class: 'lp-ventana-titulo' }, h('span', { class: 'lp-ventana-nombre' }, iconoDock(app, 16), ' ', T.apps[app]), h('span', { class: 'lp-ventana-botones', 'aria-hidden': 'true' }, '▁ ▢ ✕')),
    h('div', { class: 'lp-ventana-cuerpo', 'data-scroll': 'app-' + app }, contenidoApp(c, app, fase, irA)));
  return h('div', { class: 'laptop-so' }, barra, h('div', { class: 'lp-cuerpo' }, dock, ventana));
}
export { lista };
