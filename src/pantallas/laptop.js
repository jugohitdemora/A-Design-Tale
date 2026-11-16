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
import { pasosFase, lineaGuia } from './index.js';

const T = textos({
  es: {
    so: 'AGENCIA·OS', apps: { constructor: 'Constructor', cohete: 'Cámara de lanzamiento', contingencias: 'Contingencias', ruta: 'Sala de control',
      expediente: 'Expediente', manual: 'Manual SOP', juego: 'Manual de juego', estado: 'Estado', revision: 'Revisión', verificacion: 'Verificación', informe: 'Informe' },
    planRuta: 'Planificar ruta', pasoN: (n) => `Paso ${n}`,
    levantarse: 'Sala (Esc)',
    bloqueada: 'Disponible cuando empiece el diseño', ruta: 'La ruta se planifica en la SALA DE CONTROL DE MISIÓN.',
    rutaTxt: 'Ventana de lanzamiento, trayectoria y sitio de descenso u órbita con capas de datos satelitales.', irControl: 'Ir a la sala de control',
    esperandoBriefing: 'Briefing en curso', esperandoTxt: 'Marca los objetivos en el expediente y pulsa Listo.',
    cargando: 'Cargando…', enControl: 'La misión se sigue desde la sala de control.',
  },
  en: {
    so: 'AGENCY·OS', apps: { constructor: 'Builder', cohete: 'Launch camera', contingencias: 'Contingencies', ruta: 'Control room',
      expediente: 'Dossier', manual: 'SOP manual', juego: 'Game manual', estado: 'Status', revision: 'Review', verificacion: 'Verification', informe: 'Report' },
    planRuta: 'Plan route', pasoN: (n) => `Step ${n}`,
    levantarse: 'Room (Esc)',
    bloqueada: 'Available once design starts', ruta: 'The route is planned in the MISSION CONTROL ROOM.',
    rutaTxt: 'Launch window, trajectory and landing site or orbit with satellite data layers.', irControl: 'Go to the control room',
    esperandoBriefing: 'Briefing in progress', esperandoTxt: 'Tick the goals in the dossier and press Ready.',
    cargando: 'Loading…', enControl: 'The mission is followed from the control room.',
  },
});

const ICONOS = { constructor: '🛰', cohete: '📹', contingencias: '⚠', ruta: '🗺', revision: '✅', expediente: '📁', manual: '📘', juego: '📖', estado: '📊', verificacion: '✔', informe: '📄' };

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
        h('button', { class: 'boton primario grande', type: 'button', onclick: () => irA('control') }, T.irControl));
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
  const ir = (a) => (a === 'ruta' ? c.irA?.('control') : (c.ui.app = a, c.repintar()));
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
    lineaGuia(c.guia, 'lp-guia'),
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
      onclick: esRuta ? () => irA('control') : () => { c.ui.app = a; if (a === 'manual') c.ui.manualRol = c.rol; c.repintar(); },
    },
    k != null ? h('span', { class: 'lp-icono-paso', 'aria-label': T.pasoN(k) }, String(k)) : null,
    h('span', { class: 'lp-icono-dib', 'aria-hidden': 'true' }, ICONOS[a]), h('span', { class: 'lp-icono-txt' }, nombre));
  };
  const dock = h('nav', { class: 'lp-dock', role: 'tablist' },
    d.bloqueadas.map((a) => icono(a, null, true)),
    d.flujo.map((a, k) => icono(a, numerar ? k + 1 : null, false)),
    h('hr', { class: 'lp-dock-sep', 'aria-hidden': 'true' }),
    d.consulta.map((a) => icono(a, null, false)));
  const ventana = h('section', { class: 'lp-ventana', 'data-app': app },
    h('div', { class: 'lp-ventana-titulo' }, h('span', {}, `${ICONOS[app]} ${T.apps[app]}`), h('span', { class: 'lp-ventana-botones', 'aria-hidden': 'true' }, '▁ ▢ ✕')),
    h('div', { class: 'lp-ventana-cuerpo', 'data-scroll': 'app-' + app }, contenidoApp(c, app, fase, irA)));
  return h('div', { class: 'laptop-so' }, barra, h('div', { class: 'lp-cuerpo' }, dock, ventana));
}
export { lista };
