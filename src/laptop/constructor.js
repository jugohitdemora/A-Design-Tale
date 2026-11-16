// App del portátil "Constructor": montaje de la nave al estilo del editor de Kerbal (VAB), mucho más simple.
// Izquierda: paleta de piezas del departamento activo (pestañas de categoría con iconos pixel). Centro: PLANO azul con la nave
// que montan los cuatro departamentos (cada pieza es un grupo SVG clicable) y nodos libres punteados. Encima del plano, la FICHA
// de la pieza seleccionada. Derecha: recursos del equipo (seis barras), cobertura de ciencia y "Pedir revisión".
//
// Contrato del host: appConstructor(c, { restr }) devuelve el nodo raíz. El host reconstruye el DOM en cada cambio, así que todo
// sale de (c.e, c.ui.constructor). c.ui.constructor = { rol, cat, sel, op: {pieza: opId}, uso: {pieza: h} }.
import { textos, tx, depto, idioma } from '../i18n.js';
import { T as TU } from '../textos.js';
import { h, lista, dinero, puedoPor, rolesQuePuedo, conRol, piezasMontadas, resumenSeguro, ROLES_IDS } from '../pantallas/ui.js';

const T = textos({
  es: {
    piezas: 'PIEZAS', todas: 'Todas', actuarComo: 'Actúas como', vacante: 'vacante', soloLectura: 'solo lectura',
    sinPiezas: 'Sin piezas para este departamento.', montada: 'MONTADA', apagada: 'APAGADA', montadasN: (n, t) => `${n}/${t}`,
    plano: 'PLANO', planoVacio: 'Monta piezas. Los nodos punteados esperan una pieza.',
    nodoLibre: 'Nodo libre', cajetin: { mision: 'MISIÓN', rev: 'REV', escala: 'ESCALA', esc: 'S/E', dib: 'DIBUJÓ' },
    montadasTit: 'MONTADO POR DEPARTAMENTO', ninguna: 'nada montado',
    ficha: 'FICHA DE LA PIEZA', cerrar: 'Cerrar ficha', categoria: 'Categoría', departamento: 'Departamento',
    sirve: 'PARA QUÉ SIRVE', pros: 'A favor', contras: 'En contra', opciones: 'OPCIONES', opcion: 'Opción', enUso: 'EN USO',
    num: { masa: 'Masa', potencia: 'Potencia', volumen: 'Volumen', tasa: 'Datos', precio: 'Precio' },
    aporta: 'APORTA', ap: { potencia: 'W de potencia', bateria: 'Wh de batería', bajada: 'kbps de bajada', volumen: 'L de volumen' },
    uso: 'USO', siempre: 'Siempre encendida (24 h/día)', hDia: 'h/día', montar: 'MONTAR', quitar: 'QUITAR',
    soloDe: (d) => `Solo ${d} puede cambiarla.`,
    restrNo: 'No se añaden piezas. Quita, baja el uso o cambia de opción.',
    recursos: 'RECURSOS', mesReloj: (m, p) => (p != null ? `Mes ${m} · comprometido ${p}` : `Mes ${m}`), retrasoN: (n) => `retraso ${n} m`, cancelada: 'Los inversores se retiraron',
    presu: { mision: 'Misión', bono: 'Inversores (plazo)', recorte: 'Recorte por retraso', eventos: 'Eventos' }, presuTit: 'PRESUPUESTO',
    barras: { masa: 'Masa', potencia: 'Potencia', bateria: 'Batería', datos: 'Datos', presupuesto: 'Presupuesto', volumen: 'Volumen' },
    sinLimite: { masa: 'Sin cohete: elígelo en la cámara de lanzamiento', potencia: 'Sin paneles', bateria: 'Sin batería',
      datos: 'Sin antena', presupuesto: 'Sin presupuesto', volumen: 'Sin estructura' },
    est: { ok: 'OK', tolerancia: 'TOL', exceso: 'EXC' }, marcas: '▮ 100 %   ▯ 120 % (tolerancia: pasa, con más riesgo de fallo)', otros: 'Otros',
    ciencia: 'CIENCIA', sinObjetivos: 'Sin objetivos marcados.',
    pedir: 'PEDIR REVISIÓN', irRevision: '✅ Ir a Revisión (paso 5) ›', revisiones: (n) => `Revisiones: ${n}`, revHint: 'Una revisión puede sacar un evento.',
    ultima: { dentro: 'Última revisión: todo dentro.', tolerancia: (b) => `Última revisión: en tolerancia en ${b}. Pasa la revisión, pero sube el riesgo de fallo de una fase de la misión.`, fuera: (b) => `Última revisión: fuera en ${b}.`, evento: (n) => `Salió un evento de diseño: ${n}.` },
    nivel: { dentro: 'DENTRO DE LÍMITES', tolerancia: 'EN TOLERANCIA: PASA, MÁS RIESGO', fuera: 'FUERA DE LÍMITES' },
    restrTit: 'RESTRICCIONES', restrTxt: 'Recorta hasta cumplir todos los límites. No se añaden piezas.', restrOk: 'Todo dentro: pide revisión en Revisión.',
    porDepto: 'Por departamento',
    cats: { estructura: 'Estructura', propulsion: 'Propulsión', actitud: 'Actitud', guiado: 'Guiado', camara: 'Cámara', proteccion: 'Protección', sondas: 'Sondas',
      instrumento: 'Instrumentos', paneles: 'Paneles solares', bateria: 'Batería', termica: 'Térmica', polvo: 'Polvo', antena: 'Antena', computador: 'Computador',
      memoria: 'Memoria', navegacion: 'Navegación', tierra: 'Estaciones de tierra', extra: 'Otras' },
  },
  en: {
    piezas: 'PARTS', todas: 'All', actuarComo: 'Acting as', vacante: 'vacant', soloLectura: 'read only',
    sinPiezas: 'No parts for this department.', montada: 'MOUNTED', apagada: 'OFF', montadasN: (n, t) => `${n}/${t}`,
    plano: 'BLUEPRINT', planoVacio: 'Mount parts. Dashed nodes wait for a part.',
    nodoLibre: 'Free node', cajetin: { mision: 'MISSION', rev: 'REV', escala: 'SCALE', esc: 'NTS', dib: 'DRAWN' },
    montadasTit: 'MOUNTED BY DEPARTMENT', ninguna: 'nothing mounted',
    ficha: 'PART SHEET', cerrar: 'Close sheet', categoria: 'Category', departamento: 'Department',
    sirve: 'USED FOR', pros: 'Pros', contras: 'Cons', opciones: 'OPTIONS', opcion: 'Option', enUso: 'IN USE',
    num: { masa: 'Mass', potencia: 'Power', volumen: 'Volume', tasa: 'Data', precio: 'Price' },
    aporta: 'PROVIDES', ap: { potencia: 'W of power', bateria: 'Wh of battery', bajada: 'kbps downlink', volumen: 'L of volume' },
    uso: 'USAGE', siempre: 'Always on (24 h/day)', hDia: 'h/day', montar: 'MOUNT', quitar: 'REMOVE',
    soloDe: (d) => `Only ${d} can change it.`,
    restrNo: 'Do not add parts. Remove, lower usage or change option.',
    recursos: 'RESOURCES', mesReloj: (m, p) => (p != null ? `Month ${m} · committed ${p}` : `Month ${m}`), retrasoN: (n) => `${n} mo late`, cancelada: 'Investors pulled out',
    presu: { mision: 'Mission', bono: 'Investors (term)', recorte: 'Late funding cut', eventos: 'Events' }, presuTit: 'BUDGET',
    barras: { masa: 'Mass', potencia: 'Power', bateria: 'Battery', datos: 'Data', presupuesto: 'Budget', volumen: 'Volume' },
    sinLimite: { masa: 'No rocket: choose one in the launch camera', potencia: 'No panels', bateria: 'No battery',
      datos: 'No antenna', presupuesto: 'No budget', volumen: 'No structure' },
    est: { ok: 'OK', tolerancia: 'TOL', exceso: 'OVER' }, marcas: '▮ 100 %   ▯ 120 % (tolerance: passes, higher failure risk)', otros: 'Other',
    ciencia: 'SCIENCE', sinObjetivos: 'No goals ticked.',
    pedir: 'REQUEST REVIEW', irRevision: '✅ Go to Review (step 5) ›', revisiones: (n) => `Reviews: ${n}`, revHint: 'A review can draw an event.',
    ultima: { dentro: 'Last review: all within limits.', tolerancia: (b) => `Last review: in tolerance on ${b}. It passes the review, but a related mission stage has a higher failure risk.`, fuera: (b) => `Last review: over on ${b}.`, evento: (n) => `A design event came up: ${n}.` },
    nivel: { dentro: 'WITHIN LIMITS', tolerancia: 'IN TOLERANCE — passes, higher failure risk', fuera: 'OVER LIMITS' },
    restrTit: 'CONSTRAINTS', restrTxt: 'Cut until all limits are met. Do not add parts.', restrOk: 'All within limits: request it in Review.',
    porDepto: 'By department',
    cats: { estructura: 'Structure', propulsion: 'Propulsion', actitud: 'Attitude', guiado: 'Guidance', camara: 'Camera', proteccion: 'Protection', sondas: 'Probes',
      instrumento: 'Instruments', paneles: 'Solar panels', bateria: 'Battery', termica: 'Thermal', polvo: 'Dust', antena: 'Antenna', computador: 'Computer',
      memoria: 'Memory', navegacion: 'Navigation', tierra: 'Ground stations', extra: 'Other' },
  },
});

const BARRAS = ['masa', 'potencia', 'bateria', 'datos', 'presupuesto', 'volumen'];
const UNIDAD = { masa: 'kg', potencia: 'W', bateria: 'Wh', datos: 'MB', presupuesto: '', volumen: 'L' };
const CATS = ['estructura', 'propulsion', 'actitud', 'guiado', 'camara', 'proteccion', 'sondas', 'instrumento', 'paneles', 'bateria', 'termica', 'polvo',
  'antena', 'computador', 'memoria', 'navegacion', 'tierra'];
const colorRol = (r) => `var(--lp-rol-${ROLES_IDS.includes(r) ? r : 'comms'})`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const fmt = (n, d = 1) => (Number.isFinite(n) ? n.toLocaleString(idioma() === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: d }) : '∞');
// Valor de datos {v, conf, src, juego}: sin códigos de fuente; "≈" en los estimados con la explicación como ayuda.
function val(c, x, unidad = '', dinero_ = false) {
  if (x == null) return h('span', { class: 'val tenue' }, '-');
  const num = typeof x === 'number' ? x : (c.motor?.num ?? ((q) => q?.v ?? q?.juego ?? 0))(x);
  const est = typeof x === 'object' && (x.conf === 'EST' || x.conf === 'JUEGO' || x.v == null);
  const txt = dinero_ ? dinero(num) : fmt(num, 2) + (unidad ? ' ' + unidad : '');
  return h('span', { class: 'val' + (est ? ' juego' : ''), title: est ? (tx(x.ec) || (TU.estimateValue ?? TU.gameValue)) : null }, (est ? '≈ ' : '') + txt);
}
const numUso = (x, d) => (typeof x === 'number' ? x : typeof x?.v === 'number' ? x.v : typeof x?.juego === 'number' ? x.juego : d);
function nodoSVG(str) {
  const t = document.createElement('template');
  t.innerHTML = str.trim();
  return t.content.firstElementChild;
}

// ---------------------------------------------------------------------------------------------------------------------
// Iconos pixel (16×16). Tonos: k tinta, c color del departamento, l brillo, p azul plano, a aviso.
// ---------------------------------------------------------------------------------------------------------------------
const ICONOS = {
  estructura: [[2, 3, 12, 10, 'k'], [3, 4, 10, 8, 'c'], [3, 7, 10, 1, 'k'], [7, 4, 1, 8, 'k'], [4, 5, 2, 1, 'l'], [1, 2, 2, 2, 'k'], [13, 2, 2, 2, 'k'], [1, 12, 2, 2, 'k'], [13, 12, 2, 2, 'k']],
  propulsion: [[5, 1, 6, 7, 'k'], [6, 2, 4, 5, 'c'], [7, 2, 1, 3, 'l'], [6, 8, 4, 2, 'k'], [5, 10, 6, 2, 'k'], [4, 12, 8, 2, 'k'], [6, 10, 4, 1, 'c'], [5, 12, 6, 1, 'c'], [6, 14, 4, 1, 'a'], [7, 15, 2, 1, 'a']],
  actitud: [[5, 2, 6, 12, 'c'], [3, 4, 10, 8, 'c'], [5, 1, 6, 1, 'k'], [3, 2, 2, 2, 'k'], [11, 2, 2, 2, 'k'], [2, 4, 1, 8, 'k'], [13, 4, 1, 8, 'k'], [3, 12, 2, 2, 'k'], [11, 12, 2, 2, 'k'], [5, 14, 6, 1, 'k'], [7, 7, 2, 2, 'k'], [7, 3, 1, 4, 'k'], [9, 8, 4, 1, 'k'], [5, 4, 1, 1, 'l']],
  guiado: [[3, 2, 10, 7, 'k'], [4, 3, 8, 5, 'c'], [6, 4, 4, 3, 'k'], [7, 5, 1, 1, 'l'], [5, 9, 1, 2, 'k'], [10, 9, 1, 2, 'k'], [3, 11, 10, 1, 'k'], [2, 13, 1, 1, 'a'], [13, 13, 1, 1, 'a'], [1, 14, 1, 2, 'a'], [14, 14, 1, 2, 'a'], [7, 13, 2, 1, 'a']],
  camara: [[2, 5, 12, 8, 'k'], [3, 6, 10, 6, 'c'], [4, 3, 4, 2, 'k'], [6, 7, 4, 4, 'k'], [7, 8, 2, 2, 'p'], [7, 8, 1, 1, 'l'], [11, 7, 1, 1, 'l']],
  proteccion: [[3, 2, 10, 1, 'k'], [2, 3, 1, 6, 'k'], [13, 3, 1, 6, 'k'], [3, 3, 10, 6, 'c'], [3, 9, 10, 2, 'k'], [4, 9, 8, 2, 'c'], [4, 11, 8, 2, 'k'], [6, 11, 4, 2, 'c'], [6, 13, 4, 1, 'k'], [5, 4, 2, 4, 'l']],
  sondas: [[2, 2, 6, 6, 'k'], [3, 3, 4, 4, 'c'], [3, 3, 1, 1, 'l'], [4, 8, 2, 2, 'k'], [8, 8, 6, 6, 'k'], [9, 9, 4, 4, 'c'], [9, 9, 1, 1, 'l'], [10, 14, 2, 2, 'k'], [7, 6, 1, 1, 'a'], [8, 5, 1, 1, 'a']],
  instrumento: [[2, 5, 9, 7, 'k'], [3, 6, 7, 5, 'c'], [11, 4, 3, 9, 'k'], [12, 5, 1, 7, 'p'], [4, 7, 2, 1, 'l'], [4, 12, 1, 2, 'k'], [8, 12, 1, 2, 'k'], [3, 14, 7, 1, 'k']],
  paneles: [[1, 3, 14, 9, 'k'], [2, 4, 12, 7, 'p'], [5, 4, 1, 7, 'k'], [8, 4, 1, 7, 'k'], [11, 4, 1, 7, 'k'], [2, 7, 12, 1, 'k'], [2, 4, 3, 1, 'l'], [7, 12, 2, 3, 'c'], [5, 15, 6, 1, 'k']],
  bateria: [[3, 4, 10, 11, 'k'], [4, 5, 8, 9, 'c'], [5, 2, 2, 2, 'k'], [9, 2, 2, 2, 'k'], [5, 7, 3, 1, 'l'], [6, 6, 1, 3, 'l'], [8, 11, 3, 1, 'k'], [4, 5, 1, 9, 'l']],
  termica: [[2, 2, 12, 12, 'k'], [3, 3, 10, 10, 'c'], [5, 3, 1, 10, 'k'], [8, 3, 1, 10, 'k'], [11, 3, 1, 10, 'k'], [3, 3, 1, 10, 'l'], [6, 0, 1, 1, 'a'], [9, 1, 1, 1, 'a']],
  polvo: [[2, 7, 12, 7, 'k'], [3, 8, 10, 5, 'c'], [3, 10, 10, 1, 'k'], [3, 2, 1, 1, 'a'], [6, 3, 1, 1, 'a'], [9, 1, 1, 1, 'a'], [12, 3, 1, 1, 'a'], [5, 5, 1, 1, 'k'], [10, 5, 1, 1, 'k'], [7, 4, 1, 1, 'k']],
  antena: [[2, 4, 1, 3, 'k'], [3, 7, 1, 2, 'k'], [4, 9, 2, 1, 'k'], [6, 10, 4, 1, 'k'], [10, 9, 2, 1, 'k'], [12, 7, 1, 2, 'k'], [13, 4, 1, 3, 'k'], [3, 4, 10, 3, 'c'], [4, 7, 8, 2, 'c'], [6, 9, 4, 1, 'c'], [3, 4, 3, 1, 'l'],
    [7, 1, 2, 1, 'k'], [7, 2, 1, 3, 'k'], [7, 11, 2, 2, 'k'], [5, 13, 6, 2, 'k']],
  computador: [[4, 4, 8, 8, 'k'], [5, 5, 6, 6, 'c'], [7, 7, 2, 2, 'k'], [5, 5, 2, 1, 'l'], [5, 2, 1, 2, 'k'], [8, 2, 1, 2, 'k'], [10, 2, 1, 2, 'k'], [5, 12, 1, 2, 'k'], [8, 12, 1, 2, 'k'], [10, 12, 1, 2, 'k'],
    [2, 5, 2, 1, 'k'], [2, 8, 2, 1, 'k'], [2, 10, 2, 1, 'k'], [12, 5, 2, 1, 'k'], [12, 8, 2, 1, 'k'], [12, 10, 2, 1, 'k']],
  memoria: [[2, 4, 12, 8, 'k'], [3, 5, 10, 6, 'c'], [4, 6, 2, 3, 'k'], [7, 6, 2, 3, 'k'], [10, 6, 2, 3, 'k'], [3, 5, 1, 1, 'l'], [3, 12, 1, 2, 'k'], [5, 12, 1, 2, 'k'], [7, 12, 1, 2, 'k'], [9, 12, 1, 2, 'k'], [11, 12, 1, 2, 'k']],
  navegacion: [[6, 6, 4, 4, 'k'], [7, 7, 2, 2, 'c'], [1, 6, 5, 4, 'k'], [2, 7, 3, 2, 'p'], [10, 6, 5, 4, 'k'], [11, 7, 3, 2, 'p'], [7, 10, 2, 1, 'k'], [7, 11, 1, 3, 'k'], [6, 2, 1, 1, 'a'], [8, 1, 1, 1, 'a'], [10, 2, 1, 1, 'a'], [7, 4, 2, 1, 'c']],
  tierra: [[2, 9, 12, 6, 'k'], [3, 10, 10, 4, 'c'], [5, 11, 2, 2, 'p'], [9, 11, 2, 2, 'p'], [4, 3, 1, 1, 'k'], [11, 3, 1, 1, 'k'], [5, 4, 6, 1, 'k'], [6, 5, 4, 1, 'k'], [5, 3, 6, 1, 'c'], [7, 6, 2, 3, 'k'], [12, 1, 1, 1, 'a'], [13, 2, 1, 1, 'a'], [0, 15, 16, 1, 'k']],
  _: [[3, 3, 10, 10, 'k'], [4, 4, 8, 8, 'c'], [6, 5, 4, 1, 'k'], [9, 6, 1, 2, 'k'], [7, 8, 2, 1, 'k'], [7, 10, 2, 1, 'k']],
};
const TONO = { k: 'var(--lp-tinta)', l: 'var(--lp-panel)', p: 'var(--lp-plano)', a: 'var(--lp-aviso)' };

// Icono como texto SVG (para quien lo meta en innerHTML).
export function iconoPiezaSVG(categoria, colorRolPieza = 'var(--lp-acento)', tamano = 16) {
  const col = String(colorRolPieza ?? 'var(--lp-acento)').replace(/[<>"';]/g, '');
  const px = ICONOS[categoria] ?? ICONOS._;
  const n = Number(tamano) > 0 ? Number(tamano) : 16;
  const rects = px.map(([x, y, w, hh, k]) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" style="fill:${k === 'c' ? col : TONO[k]}"/>`).join('');
  return `<svg class="kb-ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${n}" height="${n}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
}
// Icono como nodo SVG listo para h(). colorRol: cualquier color CSS (p. ej. 'var(--lp-rol-vuelo)' o ROL_COLOR.vuelo).
export function iconoPieza(categoria, colorRolPieza, tamano = 16) {
  return nodoSVG(iconoPiezaSVG(categoria, colorRolPieza, tamano));
}

// ---------------------------------------------------------------------------------------------------------------------
// Plano (viewBox 400×300). Cada categoría usa una "bahía" con huecos [x, y, w, h]; el dibujo de la pieza cabe en su hueco.
// ---------------------------------------------------------------------------------------------------------------------
const BUS = [140, 90, 120, 110];
const BAHIA = { estructura: 'bus', paneles: 'alas', antena: 'antena', navegacion: 'nav', tierra: 'tierra', instrumento: 'carga', bateria: 'interno',
  computador: 'interno', memoria: 'interno', termica: 'termica', polvo: 'polvo', propulsion: 'motor', actitud: 'actitud', guiado: 'guiado', camara: 'camara',
  proteccion: 'escudo', sondas: 'sondas' };
const HUECOS = {
  bus: [BUS],
  alas: [[30, 128, 340, 28], [30, 162, 340, 24]],
  antena: [[172, 28, 56, 40], [104, 40, 40, 30]],
  nav: [[244, 54, 14, 36], [146, 54, 14, 36]],
  tierra: [[20, 246, 60, 38]],
  carga: [0, 1].flatMap((f) => [0, 1, 2, 3].map((k) => [147 + k * 27, 97 + f * 25, 24, 20])).concat([[100, 172, 30, 20], [100, 196, 30, 20]]),
  interno: [[146, 154, 32, 18], [184, 154, 32, 18], [222, 154, 32, 18], [146, 176, 32, 18], [184, 176, 32, 18], [222, 176, 32, 18]],
  termica: [[300, 176, 36, 40], [64, 176, 36, 40], [300, 224, 36, 30]],
  polvo: [[144, 68, 34, 9], [222, 68, 34, 9]],
  motor: [[174, 200, 52, 36], [116, 204, 26, 22]],
  actitud: [[132, 82, 136, 126]],
  guiado: [[232, 202, 24, 14]],
  camara: [[150, 202, 22, 14]],
  escudo: [[136, 78, 128, 9]],
  sondas: [[76, 204, 50, 44]],
  extra: [[340, 30, 30, 20], [340, 56, 30, 20], [340, 82, 30, 20]],
};
const ORDEN_DIBUJO = ['tierra', 'sondas', 'alas', 'termica', 'actitud', 'bus', 'escudo', 'polvo', 'antena', 'nav', 'motor', 'guiado', 'camara', 'carga', 'interno', 'extra'];

const R = (x, y, w, hh, k = 'f') => `<rect class="${k}" x="${x}" y="${y}" width="${w}" height="${hh}"/>`;
const L = (x1, y1, x2, y2, k = 'd') => `<line class="${k}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const P = (d, k = 'f') => `<path class="${k}" d="${d}"/>`;
const C = (cx, cy, r, k = 'd') => `<circle class="${k}" cx="${cx}" cy="${cy}" r="${r}"/>`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function plato(cx, y, w, hh, mastil = true) {
  const x = cx - w / 2;
  return (mastil ? L(cx, y + hh * 0.55, clamp(cx, BUS[0] + 6, BUS[0] + BUS[2] - 6), BUS[1], 'l') : '')
    + P(`M${x} ${y + 10} Q${cx} ${y + hh + 4} ${x + w} ${y + 10} Z`) + L(cx, y + 10, cx, y, 'l') + R(cx - 3, y - 4, 6, 4);
}

const DIBUJO = {
  bus([x, y, w, hh], { aterriza }) {
    let s = R(x, y, w, hh) + L(x, y + 58, x + w, y + 58) + L(x + 4, y + 4, x + 10, y + 4) + L(x + w - 10, y + hh - 4, x + w - 4, y + hh - 4);
    if (aterriza) {
      s += L(x + 10, y + hh, x - 18, y + hh + 40, 'l') + L(x - 28, y + hh + 40, x - 8, y + hh + 40, 'l')
        + L(x + w - 10, y + hh, x + w + 18, y + hh + 40, 'l') + L(x + w + 8, y + hh + 40, x + w + 28, y + hh + 40, 'l')
        + L(x + 30, y + hh, x + 24, y + hh + 30, 'l');
    }
    return s;
  },
  alas([x, y, w, hh]) {
    const ala = (ax) => R(ax, y, 100, hh) + [20, 40, 60, 80].map((k) => L(ax + k, y, ax + k, y + hh)).join('') + L(ax, y + hh / 2, ax + 100, y + hh / 2);
    const m = y + hh / 2;
    return L(x + 100, m, BUS[0], m, 'l') + L(x + w - 100, m, BUS[0] + BUS[2], m, 'l') + ala(x) + ala(x + w - 100);
  },
  antena([x, y, w, hh]) { return plato(x + w / 2, y, w, hh); },
  nav([x, y, w, hh]) {
    const cx = x + w / 2;
    return L(cx, y + hh, cx, y + 2, 'l') + L(x, y + 8, x + w, y + 8) + L(x + 2, y + 15, x + w - 2, y + 15) + C(cx, y + 2, 2.5, 'f');
  },
  tierra([x, y, w, hh]) {
    const cx = x + w / 2;
    return L(cx, y + 6, 200, 34, 'haz') + L(x - 6, y + hh, x + w + 6, y + hh, 'l')
      + [0, 1, 2, 3, 4, 5].map((k) => L(x - 4 + k * 12, y + hh, x - 10 + k * 12, y + hh + 6)).join('')
      + R(x + 8, y + hh - 16, w - 16, 16) + R(x + 14, y + hh - 11, 6, 6, 'd') + R(x + w - 20, y + hh - 11, 6, 6, 'd')
      + L(cx, y + hh - 16, cx, y + 14, 'l') + P(`M${cx - 14} ${y + 6} Q${cx} ${y + 26} ${cx + 14} ${y + 6} Z`);
  },
  carga([x, y, w, hh]) { return R(x, y, w, hh) + C(x + w / 2, y + hh / 2, Math.min(w, hh) / 4) + L(x + 2, y + 3, x + 6, y + 3); },
  interno([x, y, w, hh], { cat }) {
    let s = R(x, y, w, hh);
    if (cat === 'bateria') s += R(x + 5, y - 3, 5, 3, 'd') + R(x + w - 10, y - 3, 5, 3, 'd') + L(x + 6, y + hh / 2, x + 12, y + hh / 2) + L(x + 9, y + hh / 2 - 3, x + 9, y + hh / 2 + 3) + L(x + w - 12, y + hh / 2, x + w - 6, y + hh / 2);
    else if (cat === 'computador') s += R(x + w / 2 - 5, y + hh / 2 - 5, 10, 10, 'd') + [4, 10, 16, 22, 28].filter((k) => k < w).map((k) => L(x + k, y + 1, x + k, y + 3)).join('');
    else s += [5, 11, 17, 23].filter((k) => k < w - 2).map((k) => R(x + k, y + 4, 4, hh - 8, 'd')).join('');
    return s;
  },
  termica([x, y, w, hh]) {
    const lado = x > 200 ? BUS[0] + BUS[2] : BUS[0];
    return L(x > 200 ? x : x + w, y + 10, lado, y + 10, 'l') + R(x, y, w, hh) + [6, 12, 18, 24, 30].filter((k) => k < w).map((k) => L(x + k, y + 2, x + k, y + hh - 2)).join('');
  },
  polvo([x, y, w, hh]) {
    let z = `M${x + 2} ${y + hh / 2}`;
    for (let k = 4; k < w - 1; k += 4) z += ` L${x + k} ${(k / 4) % 2 ? y + 2 : y + hh - 2}`;
    return R(x, y, w, hh) + P(z, 'd');
  },
  motor([x, y, w, hh]) {
    return P(`M${x + w * 0.25} ${y} L${x + w * 0.75} ${y} L${x + w} ${y + hh} L${x} ${y + hh} Z`) + L(x + w * 0.18, y + hh * 0.45, x + w * 0.82, y + hh * 0.45) + L(x + w * 0.1, y + hh * 0.75, x + w * 0.9, y + hh * 0.75);
  },
  actitud([x, y, w, hh]) {
    const b = (bx, by, dx, dy) => R(bx, by, 10, 10) + P(`M${bx + 5} ${by + 5} L${bx + 5 + dx * 9} ${by + 5 + dy * 4} L${bx + 5 + dx * 4} ${by + 5 + dy * 9} Z`, 'd');
    return b(x, y, -1, -1) + b(x + w - 10, y, 1, -1) + b(x, y + hh - 10, -1, 1) + b(x + w - 10, y + hh - 10, 1, 1);
  },
  guiado([x, y, w, hh]) { return L(x + w / 2, y + hh, x - 8, y + hh + 30, 'haz') + L(x + w / 2, y + hh, x + w + 8, y + hh + 30, 'haz') + R(x, y, w, hh) + C(x + w / 2, y + hh / 2, 3); },
  camara([x, y, w, hh]) { return L(x + w / 2, y + hh, x - 6, y + hh + 26, 'haz') + L(x + w / 2, y + hh, x + w + 6, y + hh + 26, 'haz') + R(x, y, w, hh) + C(x + w / 2, y + hh / 2, 4); },
  escudo([x, y, w, hh]) { return R(x, y, w, hh) + Array.from({ length: Math.floor(w / 8) }, (_, k) => L(x + 4 + k * 8, y + hh, x + 10 + k * 8, y)).join(''); },
  sondas([x, y]) {
    const rombo = (cx, cy, r) => P(`M${cx} ${cy - r} L${cx + r} ${cy} L${cx} ${cy + r} L${cx - r} ${cy} Z`) + C(cx, cy, 2);
    return L(x + 12, y + 12, BUS[0], BUS[1] + BUS[3], 'haz') + L(x + 36, y + 32, BUS[0], BUS[1] + BUS[3], 'haz') + rombo(x + 12, y + 12, 10) + rombo(x + 36, y + 32, 9);
  },
  extra([x, y, w, hh]) { return R(x, y, w, hh) + L(x, y, x + w, y + hh) + L(x + w, y, x, y + hh); },
};

function svgPlano(c, u, piezasMision) {
  const D = c.D ?? {};
  const ctx0 = { aterriza: c.mision?.escenario === 'landing' };
  const usados = {};
  const hueco = (bahia) => {
    const lst = HUECOS[bahia] ?? HUECOS.extra;
    const i = usados[bahia] = (usados[bahia] ?? -1) + 1;
    if (i < lst.length) return lst[i];
    const [x, y, w, hh] = lst[lst.length - 1];
    const k = i - lst.length + 1;
    return [x + 6 * k, y + 6 * k, w, hh];
  };
  const capas = {};
  const poner = (bahia, s) => { (capas[bahia] ??= []).push(s); };
  const conCat = new Set();
  let hay = 0;
  for (const rol of ROLES_IDS) {
    for (const [id, m] of Object.entries(piezasMontadas(c, rol))) {
      const p = D.PIEZAS?.[id];
      const cat = CATS.includes(p?.categoria) ? p.categoria : 'extra';
      const bahia = BAHIA[cat] ?? 'extra';
      conCat.add(cat);
      hay++;
      const nombre = tx(p?.nombre) || id;
      const apagada = p?.uso && Number(m?.uso) === 0;
      poner(bahia, `<g class="kb-p${u.sel === id ? ' sel' : ''}${apagada ? ' off' : ''}" data-pieza="${esc(id)}" tabindex="0" role="button" aria-label="${esc(nombre)}" style="color:${colorRol(rol)}">`
        + `<title>${esc(nombre)} · ${esc(depto(rol))}</title>${DIBUJO[bahia](hueco(bahia), { ...ctx0, cat })}</g>`);
    }
  }
  // Nodos libres: categorías de la misión que aún no tienen pieza (un fantasma punteado de la pieza).
  const fantasmas = [];
  for (const cat of CATS) {
    if (conCat.has(cat) || !piezasMision.some((p) => p.categoria === cat)) continue;
    const bahia = BAHIA[cat];
    const b = hueco(bahia);
    fantasmas.push([bahia, `<g class="kb-nodo" data-cat="${cat}" tabindex="0" role="button" aria-label="${esc(T.nodoLibre)}: ${esc(T.cats[cat])}">`
      + `<title>${esc(T.nodoLibre)}: ${esc(T.cats[cat])}</title>${DIBUJO[bahia](b, { ...ctx0, cat })}`
      + `<text class="mas" x="${b[0] + b[2] / 2}" y="${b[1] + b[3] / 2 + 3}">+</text></g>`]);
  }
  let cuerpo = '';
  for (const bahia of ORDEN_DIBUJO) {
    cuerpo += fantasmas.filter(([b]) => b === bahia).map(([, s]) => s).join('');
    cuerpo += (capas[bahia] ?? []).join('');
  }
  const ejes = L(200, 10, 200, 290, 'eje') + L(10, 145, 390, 145, 'eje');
  const svg = nodoSVG(`<svg class="kb-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">${ejes}${cuerpo}</svg>`);
  return { svg, hay };
}

// ---------------------------------------------------------------------------------------------------------------------
// Datos auxiliares
// ---------------------------------------------------------------------------------------------------------------------
function piezasDeMision(c) {
  const mid = c.mision?.id;
  const ids = lista(c.mision?.piezas);
  return lista(c.D?.PIEZAS).filter((p) => p && p.id && (lista(p.misiones).includes(mid) || ids.includes(p.id)));
}
const opcionDe = (p, id) => lista(p?.opciones).find((o) => o?.id === id) ?? lista(p?.opciones)[0] ?? null;


// ---------------------------------------------------------------------------------------------------------------------
// Columna izquierda: paleta
// ---------------------------------------------------------------------------------------------------------------------
function paleta(c, u, rol, todas) {
  const puedo = rolesQuePuedo(c);
  const editable = puedoPor(c, rol);
  const delRol = todas.filter((p) => p.rol === rol);
  const cats = CATS.filter((k) => delRol.some((p) => p.categoria === k));
  if (delRol.some((p) => !CATS.includes(p.categoria))) cats.push('extra');
  if (u.cat && !cats.includes(u.cat)) u.cat = null;
  const visibles = delRol.filter((p) => !u.cat || (u.cat === 'extra' ? !CATS.includes(p.categoria) : p.categoria === u.cat));
  const montadas = piezasMontadas(c, rol);

  const selector = puedo.length > 1
    ? h('div', { class: 'kb-deptos', role: 'tablist', 'aria-label': T.actuarComo }, puedo.map((r) => h('button', {
      class: 'boton kb-depto' + (r === rol ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': String(r === rol),
      title: depto(r, 'largo') + (r !== c.rol ? ` (${T.vacante})` : ''), onclick: () => { u.rol = r; u.cat = null; c.repintar(); },
    }, depto(r))))
    : h('div', { class: 'kb-deptos solo' }, h('span', { class: 'kb-depto-solo', style: `--rol:${colorRol(rol)}` }, h('i', { class: 'kb-cuadro' }), depto(rol)),
      editable ? null : h('small', { class: 'kb-tenue' }, T.soloLectura));

  const pestanas = h('nav', { class: 'kb-cats', role: 'tablist', 'data-scroll': 'kb-cats' },
    h('button', { class: 'boton kb-cat' + (!u.cat ? ' on' : ''), type: 'button', role: 'tab', title: T.todas, 'aria-label': T.todas, onclick: () => { u.cat = null; c.repintar(); } },
      '∗'),
    cats.map((k) => h('button', {
      class: 'boton kb-cat' + (u.cat === k ? ' on' : ''), type: 'button', role: 'tab', title: T.cats[k] ?? k, 'aria-label': T.cats[k] ?? k,
      onclick: () => { u.cat = k; c.repintar(); },
    }, iconoPieza(k, colorRol(rol), 22))));

  const rejilla = h('div', { class: 'kb-rejilla', 'data-scroll': 'kb-piezas-' + rol });
  if (!visibles.length) rejilla.append(h('p', { class: 'kb-vacio' }, T.sinPiezas));
  for (const p of visibles) {
    const m = montadas[p.id];
    const off = m && p.uso && Number(m.uso) === 0;
    rejilla.append(h('button', {
      class: 'kb-tile' + (m ? ' montada' : '') + (u.sel === p.id ? ' sel' : ''), type: 'button', title: tx(p.desc) || tx(p.nombre),
      style: `--rol:${colorRol(rol)}`, 'aria-pressed': String(u.sel === p.id),
      onclick: () => { u.sel = u.sel === p.id ? null : p.id; c.repintar(); },
    }, h('span', { class: 'kb-tile-ico' }, iconoPieza(p.categoria, colorRol(rol), 28)),
    h('span', { class: 'kb-tile-nom' }, tx(p.nombre) || p.id),
    m ? h('span', { class: 'kb-tile-marca' + (off ? ' off' : ''), title: off ? T.apagada : T.montada }, off ? '○' : '✓') : null));
  }
  const n = delRol.filter((p) => montadas[p.id]).length;
  return h('section', { class: 'kb-col kb-izq' },
    h('header', { class: 'kb-cab' }, h('h3', {}, T.piezas), h('span', { class: 'kb-cuenta' }, T.montadasN(n, delRol.length))),
    selector,
    h('div', { class: 'kb-paleta' }, pestanas, h('div', { class: 'kb-rejilla-marco' }, rejilla)));
}

// ---------------------------------------------------------------------------------------------------------------------
// Ficha de la pieza
// ---------------------------------------------------------------------------------------------------------------------
function ficha(c, u, p, restr) {
  const rol = p.rol;
  const editable = puedoPor(c, rol);
  const m = piezasMontadas(c, rol)[p.id];
  const ops = lista(p.opciones);
  const opSel = m ? opcionDe(p, m.op) : opcionDe(p, u.op[p.id]);
  const lst = (xs) => lista(xs).slice(0, 3).map((x) => h('li', {}, tx(x)));
  const usoPara = tx(p.usoPara);

  const tarjetas = ops.map((o) => {
    const activa = opSel?.id === o.id;
    const ap = Object.entries(o.aporta && typeof o.aporta === 'object' ? o.aporta : {})
      .filter(([, x]) => x != null && (c.motor?.num ? c.motor.num(x) : 1) !== 0);
    return h('button', {
      class: 'kb-op' + (activa ? ' activa' : ''), type: 'button', disabled: !!m && !editable, 'aria-pressed': String(activa),
      onclick: () => {
        if (activa) return;
        u.op[p.id] = o.id;
        if (m && editable) c.enviar('montar', conRol(c, rol, { pieza: p.id, op: o.id, ...(p.uso ? { uso: m.uso } : {}) }));
        else c.repintar();
      },
    }, h('span', { class: 'kb-op-cab' }, tx(o.nombre) || '—', m?.op === o.id ? h('span', { class: 'kb-etq ok' }, T.enUso) : null),
    h('span', { class: 'kb-nums' },
      ['masa', 'potencia', 'volumen', 'tasa', 'precio'].map((k) => h('span', { class: 'kb-num' }, h('small', {}, T.num[k]),
        val(c, o[k], { masa: 'kg', potencia: 'W', volumen: 'L', tasa: 'kbps' }[k] ?? '', k === 'precio')))),
    ap.length ? h('span', { class: 'kb-aporta' }, h('small', {}, T.aporta), ap.map(([k, x]) => h('span', {}, '+', val(c, x, ''), ' ', T.ap[k] ?? k))) : null,
    lista(o.pros).length || lista(o.contras).length ? h('span', { class: 'kb-pc' },
      h('span', { class: 'kb-pro' }, h('small', {}, T.pros), h('ul', {}, lst(o.pros))),
      h('span', { class: 'kb-contra' }, h('small', {}, T.contras), h('ul', {}, lst(o.contras)))) : null);
  });

  let uso;
  if (p.uso && typeof p.uso === 'object') {
    const min = numUso(p.uso.min, 0), max = numUso(p.uso.max, 24), def = numUso(p.uso.def, max);
    const actual = m ? numUso(m.uso, def) : numUso(u.uso[p.id], def);
    const lbl = h('b', { class: 'kb-uso-val' }, `${actual} ${T.hDia}`);
    uso = h('label', { class: 'kb-uso' },
      h('input', {
        type: 'range', min, max, step: 1, value: actual, 'aria-label': T.uso, disabled: !!m && !editable,
        oninput: (ev) => { lbl.textContent = `${ev.target.value} ${T.hDia}`; },
        onchange: (ev) => {
          const v = Number(ev.target.value);
          if (m && editable) c.enviar('montar', conRol(c, rol, { pieza: p.id, op: m.op, uso: v }));
          else { u.uso[p.id] = v; c.repintar(); }
        },
      }), lbl);
  } else uso = h('p', { class: 'kb-tenue' }, T.siempre);

  const acciones = h('div', { class: 'kb-acciones' },
    m
      ? h('button', { class: 'boton peligro ancho', type: 'button', disabled: !editable, onclick: () => c.enviar('quitar', conRol(c, rol, { pieza: p.id })) }, T.quitar)
      : h('button', {
        class: 'boton primario ancho', type: 'button', disabled: !editable || restr || !opSel, title: restr ? T.restrNo : undefined,
        onclick: () => {
          const payload = { pieza: p.id, op: opSel.id };
          if (p.uso && typeof p.uso === 'object') payload.uso = numUso(u.uso[p.id], numUso(p.uso.def, numUso(p.uso.max, 24)));
          c.enviar('montar', conRol(c, rol, payload));
        },
      }, T.montar));

  return h('aside', { class: 'kb-ficha', style: `--rol:${colorRol(rol)}`, 'data-scroll': 'kb-ficha-' + p.id, 'aria-label': T.ficha },
    h('header', { class: 'kb-ficha-cab' }, h('span', {}, T.ficha),
      h('button', { class: 'boton kb-x', type: 'button', 'aria-label': T.cerrar, title: T.cerrar, onclick: () => { u.sel = null; c.repintar(); } }, '✕')),
    h('div', { class: 'kb-ficha-id' },
      h('div', { class: 'kb-ficha-dib' }, iconoPieza(p.categoria, colorRol(rol), 48)),
      h('div', {},
        h('h4', {}, tx(p.nombre) || p.id),
        h('p', { class: 'kb-meta' }, `${T.cats[p.categoria] ?? '—'} · `, h('b', { class: 'kb-rol' }, depto(rol))),
        m ? h('span', { class: 'kb-sello' }, T.montada) : null)),
    tx(p.desc) ? h('p', { class: 'kb-desc' }, tx(p.desc)) : null,
    usoPara ? [h('h5', {}, T.sirve), h('p', { class: 'kb-uso-para' }, usoPara)] : null,
    h('h5', {}, T.opciones), h('div', { class: 'kb-ops' }, tarjetas),
    h('h5', {}, T.uso), uso,
    acciones,
    !editable ? h('p', { class: 'kb-aviso' }, T.soloDe(depto(rol))) : restr && !m ? h('p', { class: 'kb-aviso' }, T.restrNo) : null);
}

// ---------------------------------------------------------------------------------------------------------------------
// Centro: plano + lista de montadas
// ---------------------------------------------------------------------------------------------------------------------
function centro(c, u, todas, restr) {
  const elegir = (id) => {
    const p = c.D?.PIEZAS?.[id];
    u.sel = id;
    if (p && rolesQuePuedo(c).includes(p.rol)) { if (u.rol !== p.rol) u.cat = null; u.rol = p.rol; }
    c.repintar();
  };
  const { svg, hay } = svgPlano(c, u, todas);
  const actuar = (ev) => {
    const t = ev.target?.closest?.('[data-pieza],[data-cat]');
    if (!t) return;
    if (t.dataset.pieza) { elegir(t.dataset.pieza); return; }
    const cat = t.dataset.cat;
    const p = todas.find((x) => x.categoria === cat && rolesQuePuedo(c).includes(x.rol)) ?? todas.find((x) => x.categoria === cat);
    if (!p) return;
    if (rolesQuePuedo(c).includes(p.rol)) { u.rol = p.rol; u.cat = cat; }
    u.sel = p.id;
    c.repintar();
  };
  const lienzo = h('div', { class: 'kb-plano-svg', onclick: actuar, onkeydown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); actuar(ev); } } }, svg);
  // Qué hay montado por departamento: solo como ayuda al pasar el ratón por la leyenda (el plano ya lo muestra).
  const resumenDepto = (r) => {
    const nombres = Object.keys(piezasMontadas(c, r)).map((id) => tx(c.D?.PIEZAS?.[id]?.nombre) || id);
    return `${depto(r)}: ${nombres.length ? nombres.join(', ') : T.ninguna}`;
  };
  const plano = h('div', { class: 'kb-plano' },
    h('div', { class: 'kb-plano-cab' }, T.plano),
    lienzo,
    hay ? null : h('p', { class: 'kb-plano-vacio' }, T.planoVacio),
    h('div', { class: 'kb-leyenda' }, ROLES_IDS.map((r) => h('span', { style: `--rol:${colorRol(r)}`, title: resumenDepto(r) }, h('i', {}), depto(r)))));

  const p = u.sel ? c.D?.PIEZAS?.[u.sel] : null;
  return h('section', { class: 'kb-col kb-centro' + (p ? ' con-ficha' : '') }, plano, p ? ficha(c, u, p, restr) : null);
}

// ---------------------------------------------------------------------------------------------------------------------
// Derecha: recursos del equipo
// ---------------------------------------------------------------------------------------------------------------------
const cantidad = (id, n) => (id === 'presupuesto' ? dinero(n) : `${fmt(n)} ${UNIDAD[id]}`);
const COLOR_OTROS = '#7d8590'; // gris neutro: parte del uso sin departamento
function barra(c, id, b, restr, extra = null) {
  const usado = Number(b?.usado) || 0, limite = Number(b?.limite) || 0;
  const ratio = limite > 0 ? usado / limite : usado > 0 ? Infinity : 0;
  const est = b?.estado ?? 'ok';
  // La pista va de 0 a 150 % del límite (100 % en 66,7 % y 120 % en 80 %). Cada tramo mide su parte del límite.
  const escala = limite > 0 ? limite * 1.5 : usado > 0 ? usado : 1;
  const porRol = Object.fromEntries(ROLES_IDS.map((r) => [r, 0]));
  for (const x of lista(b?.partes)) if (ROLES_IDS.includes(x.rol)) porRol[x.rol] += Number(x.v) || 0;
  const otros = Math.max(0, usado - Object.values(porRol).reduce((s, v) => s + v, 0));
  const tramo = (v, nombre, color, clase = '') => {
    const porLimite = limite > 0 ? ` (${fmt((v / limite) * 100, 0)} %)` : '';
    return h('i', { class: 'kb-seg' + clase, style: `width:${(v / escala) * 100}%;background:${color}`, title: `${nombre}: ${cantidad(id, v)}${porLimite}` });
  };
  const segs = ROLES_IDS.filter((r) => porRol[r] > 0).map((r) => tramo(porRol[r], depto(r), colorRol(r)));
  if (otros > 1e-9) segs.push(tramo(otros, T.otros, COLOR_OTROS, ' otros'));
  const detalle = ROLES_IDS.filter((r) => porRol[r] > 0).map((r) => `${depto(r)}: ${cantidad(id, porRol[r])}`).join('\n');
  const pct = limite > 0 ? ` · ${fmt(ratio * 100, 0)} %` : '';
  const tit = [`${T.barras[id]}${pct}`, detalle ? `${T.porDepto}\n${detalle}` : '', T.marcas].filter(Boolean).join('\n');
  return h('div', { class: `kb-barra ${est}` + (id === 'presupuesto' ? ' presu' : '') + (restr && est !== 'ok' ? ' alerta' : ''), title: tit },
    h('div', { class: 'kb-barra-cab' },
      h('span', { class: 'kb-barra-nom' }, T.barras[id]),
      h('span', { class: 'kb-barra-num' }, id === 'presupuesto' ? `${dinero(usado)} / ${limite > 0 ? dinero(limite) : '—'}` : `${fmt(usado)} / ${limite > 0 ? fmt(limite) : '—'} ${UNIDAD[id]}`)),
    h('div', { class: 'kb-pista' }, segs, limite > 0 ? [h('i', { class: 'kb-marca m100' }), h('i', { class: 'kb-marca m120' })] : null),
    limite <= 0 && (usado > 0 || id !== 'presupuesto') ? h('small', { class: 'kb-sinlim' }, T.sinLimite[id]) : null,
    extra);
}

// Dinero del inversor: misión, bono por plazo, recorte por retraso y eventos (solo lo que no es cero).
function desglosePresupuesto(pr) {
  if (!pr) return null;
  const pct = (x) => `${x > 0 ? '+' : '−'}${fmt(Math.abs(x) * 100, 0)} %`;
  const f = [[T.presu.mision, dinero(pr.mision)]];
  if (pr.bono) f.push([T.presu.bono, pct(pr.bono)]);
  if (pr.recorte) f.push([T.presu.recorte, pct(-pr.recorte)]);
  if (pr.eventos) f.push([T.presu.eventos, (pr.eventos > 0 ? '+' : '−') + dinero(Math.abs(pr.eventos))]);
  if (f.length < 2) return null;
  return h('small', { class: 'kb-presu-det' }, f.map(([k, v]) => h('span', {}, `${k} `, h('b', {}, v))));
}

function recursos(c, res, restr) {
  const rl = res?.reloj;
  const reloj = rl ? h('div', { class: 'kb-reloj' + (rl.cancelada ? ' cancelada' : rl.retraso > 0 ? ' retraso' : '') },
    h('b', {}, T.mesReloj(rl.mes, rl.activo ? rl.plazo : null)),
    rl.retraso > 0 ? h('span', {}, ` · ${T.retrasoN(rl.retraso)}`) : null,
    rl.cancelada ? h('span', {}, ` · ${T.cancelada}`) : null) : null;
  const caja = h('aside', { class: 'kb-col kb-der' }, h('header', { class: 'kb-cab' }, h('h3', {}, T.recursos), reloj));
  const cuerpo = h('div', { class: 'kb-der-cuerpo', 'data-scroll': 'kb-recursos' });
  let nivel = null;
  try { nivel = res && c.motor?.cumple ? c.motor.cumple(res)?.nivel : null; } catch { nivel = null; }
  if (nivel && nivel !== 'dentro') cuerpo.append(h('div', { class: 'kb-nivel ' + nivel }, T.nivel[nivel] ?? nivel));
  cuerpo.append(h('div', { class: 'kb-barras' }, ['presupuesto', ...BARRAS.filter((k) => k !== 'presupuesto')].map((id) => barra(c, id, res?.barras?.[id], restr, id === 'presupuesto' ? desglosePresupuesto(rl?.presupuesto) : null))));
  cuerpo.append(h('div', { class: 'kb-leyenda-barras', title: T.porDepto },
    ROLES_IDS.map((r) => h('span', { style: `--rol:${colorRol(r)}` }, h('i', {}), depto(r))),
    h('span', { style: `--rol:${COLOR_OTROS}` }, h('i', {}), T.otros)));

  cuerpo.append(h('h4', {}, T.ciencia));
  const objs = lista(res?.ciencia?.objetivos);
  if (!objs.length) cuerpo.append(h('p', { class: 'kb-tenue' }, T.sinObjetivos));
  for (const o of objs) {
    const mo = lista(c.mision?.objetivos).find((x) => x?.id === o.id);
    const v = Math.max(0, Math.min(1, Number(o.cobertura) || 0));
    const clase = v >= 0.999 ? 'ok' : v >= 0.5 ? 'tolerancia' : 'exceso';
    cuerpo.append(h('div', { class: 'kb-obj' + (o.prioridad ? ' prio' : '') },
      h('div', { class: 'kb-obj-cab' }, o.prioridad ? h('b', { class: 'kb-etq prio' }, '★') : null, h('span', {}, tx(mo?.nombre ?? o.nombre) || o.id), h('b', {}, `${fmt(v * 100, 0)} %`)),
      h('div', { class: 'kb-pista fina' }, h('i', { class: 'kb-seg ' + clase, style: `width:${v * 100}%` }))));
  }

  const ul = c.e?.diseno?.ultima;
  if (ul?.tipo === 'revision') {
    const nombres = lista(ul.barras).map((b) => T.barras[b] ?? b).join(', ');
    const f = T.ultima[ul.nivel];
    cuerpo.append(h('p', { class: 'kb-ultima ' + (ul.nivel ?? '') }, typeof f === 'function' ? f(nombres) : f ?? ''));
  } else if (ul?.tipo === 'evento') {
    cuerpo.append(h('p', { class: 'kb-ultima evento' }, T.ultima.evento(tx(c.D?.EVENTOS_DISENO?.[ul.id]?.nombre) || ul.id || '?')));
  }

  const rev = c.e?.diseno?.revisiones ?? 0;
  caja.append(cuerpo, h('footer', { class: 'kb-der-pie' },
    // La revisión se pide en la app Revisión (último paso del dock); aquí solo se lleva hasta ella.
    h('button', { class: 'boton ancho', type: 'button', title: T.revHint, onclick: () => { c.ui.app = 'revision'; c.repintar(); } }, T.irRevision),
    h('p', { class: 'kb-tenue' }, T.revisiones(rev))));
  return caja;
}

function bannerRestr(res) {
  const mal = BARRAS.filter((id) => res?.barras?.[id] && res.barras[id].estado !== 'ok');
  return h('div', { class: 'kb-banner', role: 'status', title: T.restrTxt },
    h('b', { class: 'kb-banner-tit' }, '⚠ ', T.restrTit),
    h('span', { class: 'kb-banner-chips' }, mal.length ? mal.map((id) => {
      const b = res.barras[id];
      const pct = b.limite > 0 ? `+${fmt((b.usado / b.limite - 1) * 100, 0)} %` : '∞';
      return h('span', { class: 'kb-chip-mal ' + b.estado }, `${T.barras[id]} ${pct}`);
    }) : h('span', { class: 'kb-chip-ok' }, T.restrOk)));
}

// ---------------------------------------------------------------------------------------------------------------------
export function appConstructor(c, { restr = false } = {}) {
  // Ojo: un objeto normal ya "tiene" .constructor (heredado de Object), así que se comprueba la propiedad propia.
  if (!Object.prototype.hasOwnProperty.call(c.ui, 'constructor') || !c.ui.constructor || typeof c.ui.constructor !== 'object') {
    c.ui.constructor = { rol: null, cat: null, sel: null, op: {}, uso: {} };
  }
  const u = c.ui.constructor;
  u.op ??= {}; u.uso ??= {};
  if (!c.mision) return h('div', { class: 'kb-app' }, h('p', { class: 'kb-vacio' }, T.sinPiezas));
  const puedo = rolesQuePuedo(c);
  const rol = puedo.includes(u.rol) ? u.rol : (ROLES_IDS.includes(c.rol) ? c.rol : 'vuelo');
  u.rol = rol;
  u.rolActivo = rol;
  if (u.sel && !c.D?.PIEZAS?.[u.sel]) u.sel = null;
  const todas = piezasDeMision(c);
  const res = resumenSeguro(c);
  return h('div', { class: 'kb-app' + (restr ? ' restr' : '') },
    restr ? bannerRestr(res) : null,
    h('div', { class: 'kb-cols' }, paleta(c, u, rol, todas), centro(c, u, todas, restr), recursos(c, res, restr)));
}

export default appConstructor;
