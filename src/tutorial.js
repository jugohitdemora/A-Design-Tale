// Tutorial de la pantalla de inicio: el jefe de misión (Chief) explica el juego con un cuadro de diálogo y hace jugar una
// misión de práctica de un solo jugador (briefing → diseño → GO/NO-GO → lanzamiento → vuelo → informe). Al final regala el
// Manual de juego (se lee aquí). No usa red ni el estado de la partida: todo es local a este módulo.
// Contrato: abrirTutorial() abre el diálogo; textoBotonTutorial() es el texto del botón del inicio.
// Los números de la práctica siguen las reglas reales: razón = usado / límite; ≤ 1,00 dentro; ≤ 1,20 tolerancia; > 1,20 la revisión falla.
import { textos, tx, idioma } from './i18n.js';
import { efecto } from './audio.js';
import { MANUAL } from './tutorial-manual.js';

const T = textos({
  es: {
    boton: 'TUTORIAL', titulo: 'Tutorial · Simulacro', jefe: 'JEFE DE MISIÓN', saltar: 'Saltar', siguiente: 'Siguiente', atras: 'Atrás',
    paso: (a, b) => `Paso ${a} de ${b}`, cerrar: 'Cerrar', terminar: 'Terminar y a la misión',
    barras: 'Barras de recursos', masa: 'Masa', potencia: 'Potencia', presupuesto: 'Presupuesto', ratio: 'razón',
    dentro: 'Dentro del límite', tolerancia: 'En tolerancia: pasa, pero con más riesgo', fuera: 'Fuera: la revisión falla',
    piezas: 'Piezas', objetivos: 'Objetivos de la misión', prioritario: 'PRIORITARIO', opcional: 'OPCIONAL', marcado: 'Marcado', marcar: 'Marcar',
    seguro: 'Contingencia', seguroDesc: 'Seguro «Modo seguro»: anula una tormenta solar en el vuelo.',
    riesgoLanz: 'Riesgo de fallo en el lanzamiento',
    faltan: 'Faltan piezas obligatorias', listoDiseno: 'Diseño completo: puedes pedir la revisión',
    firmar: 'Firmar GO', firmado: 'GO', pendiente: 'Pendiente',
    lanzar: 'LANZAR', cuenta: 'Cuenta atrás', despegue: '¡Despegue!',
    fases: ['Lanzamiento', 'Crucero', 'Órbita lunar', 'Operaciones'], faseTit: 'Fases del vuelo', next: 'NEXT',
    eventoTit: 'EVENTO', tormenta: 'Tormenta solar: las partículas dañan la electrónica.',
    activar: 'Activar contingencia', aceptar: 'Aceptar el daño', anulado: 'Anulada por tu contingencia',
    dano: 'Daño: −15 % de ciencia',
    informe: 'Informe de vuelo', veredicto: 'Veredicto', total: 'MISIÓN TOTAL', parcial: 'MISIÓN PARCIAL',
    ciencia: 'Ciencia lograda', gastado: 'Presupuesto gastado', puntos: 'Puntuación',
    regalo: '¡Un regalo!', regaloT: 'Manual de juego', abrir: 'Abrir el manual', leer: 'Leer',
    indice: 'Capítulos', manualHecho: 'Manual guardado', ya: 'Ya tienes el manual', otraVez: 'Repetir tutorial',
    manualPie: 'La versión completa, con fórmulas y datos de tu misión, está en la app «Manual de juego» del portátil.',
  },
  en: {
    boton: 'TUTORIAL', titulo: 'Tutorial · Drill', jefe: 'MISSION CHIEF', saltar: 'Skip', siguiente: 'Next', atras: 'Back',
    paso: (a, b) => `Step ${a} of ${b}`, cerrar: 'Close', terminar: 'Finish and go to the mission',
    barras: 'Resource bars', masa: 'Mass', potencia: 'Power', presupuesto: 'Budget', ratio: 'ratio',
    dentro: 'Within the limit', tolerancia: 'In tolerance: it passes, with more risk', fuera: 'Over: the review fails',
    piezas: 'Parts', objetivos: 'Mission goals', prioritario: 'PRIORITY', opcional: 'OPTIONAL', marcado: 'Marked', marcar: 'Mark',
    seguro: 'Contingency', seguroDesc: '"Safe mode" insurance: cancels a solar storm in flight.',
    riesgoLanz: 'Launch failure risk',
    faltan: 'Required parts are missing', listoDiseno: 'Design complete: you can request the review',
    firmar: 'Sign GO', firmado: 'GO', pendiente: 'Pending',
    lanzar: 'LAUNCH', cuenta: 'Countdown', despegue: 'Liftoff!',
    fases: ['Launch', 'Cruise', 'Lunar orbit', 'Operations'], faseTit: 'Flight phases', next: 'NEXT',
    eventoTit: 'EVENT', tormenta: 'Solar storm: particles damage the electronics.',
    activar: 'Activate contingency', aceptar: 'Accept the damage', anulado: 'Cancelled by your contingency',
    dano: 'Damage: −15 % science',
    informe: 'Flight report', veredicto: 'Verdict', total: 'FULL MISSION', parcial: 'PARTIAL MISSION',
    ciencia: 'Science achieved', gastado: 'Budget spent', puntos: 'Score',
    regalo: 'A gift!', regaloT: 'Game manual', abrir: 'Open the manual', leer: 'Read',
    indice: 'Chapters', manualHecho: 'Manual saved', ya: 'You already have the manual', otraVez: 'Repeat tutorial',
    manualPie: 'The full version, with formulas and your mission data, is in the "Game manual" app on the laptop.',
  },
});

// ---------- Datos de la misión de práctica ----------
const DEPS = {
  vuelo: { color: '#d9822b', n: { es: 'Vuelo y Mecánica', en: 'Flight & Mechanics' }, d: { es: 'Cuerpo de la nave, cohete, ruta y mes de lanzamiento.', en: 'Spacecraft body, rocket, route and launch month.' } },
  ciencia: { color: '#3fa66b', n: { es: 'Ciencia', en: 'Science' }, d: { es: 'Instrumentos y objetivos científicos.', en: 'Instruments and science goals.' } },
  potencia: { color: '#e0c040', n: { es: 'Energía', en: 'Power' }, d: { es: 'Paneles, baterías y temperatura.', en: 'Panels, batteries and temperature.' } },
  comms: { color: '#4a7fd0', n: { es: 'Comunicaciones y Operaciones', en: 'Communications & Operations' }, d: { es: 'Antenas, computador y que los datos lleguen a casa.', en: 'Antennas, computer, and getting the data home.' } },
};
const LIM = { masa: 100, presupuesto: 30 };
const PIEZAS = [
  { id: 'chasis', dep: 'vuelo', n: { es: 'Chasis ligero', en: 'Light frame' }, m: 40, w: 0, c: 8, req: true },
  { id: 'camara', dep: 'ciencia', n: { es: 'Cámara de cráteres', en: 'Crater camera' }, m: 12, w: 20, c: 6, req: true },
  { id: 'espectro', dep: 'ciencia', n: { es: 'Espectrómetro', en: 'Spectrometer' }, m: 25, w: 35, c: 10 },
  { id: 'panelP', dep: 'potencia', n: { es: 'Panel solar pequeño', en: 'Small solar panel' }, m: 10, w: -50, c: 4, panel: true },
  { id: 'panelG', dep: 'potencia', n: { es: 'Panel solar grande', en: 'Large solar panel' }, m: 22, w: -100, c: 8, panel: true },
  { id: 'antena', dep: 'comms', n: { es: 'Antena de bajada', en: 'Downlink antenna' }, m: 8, w: 10, c: 4, req: true },
];
const SEGURO = { id: 'seguro', dep: 'comms', c: 2 };

// Estado del simulacro (se reinicia al abrir el tutorial).
const nuevo = () => ({ paso: 0, obj: false, extra: false, piezas: new Set(), seguro: false, firmas: new Set(), lanzado: false, fase: 0, fin: false, evento: null, resultado: null });
let S = nuevo();

const L = (o) => tx(o);
function medidas(s = S) {
  let m = 0, uso = 0, sum = 0, c = 0;
  for (const p of PIEZAS) {
    if (!s.piezas.has(p.id)) continue;
    m += p.m; c += p.c;
    if (p.w > 0) uso += p.w; else sum -= p.w;
  }
  if (s.seguro) c += SEGURO.c;
  const r = (u, l) => (l > 0 ? u / l : (u > 0 ? Infinity : 0));
  return { m, uso, sum, c, rm: r(m, LIM.masa), rp: r(uso, sum), rc: r(c, LIM.presupuesto) };
}
const estadoRazon = (r) => (r <= 1 ? 'ok' : r <= 1.2 ? 'tol' : 'mal');
const fmtR = (r) => (Number.isFinite(r) ? r.toFixed(2).replace('.', idioma() === 'es' ? ',' : '.') : '∞');
function disenoValido(s = S) {
  const m = medidas(s);
  const req = PIEZAS.filter((p) => p.req).every((p) => s.piezas.has(p.id)) && PIEZAS.some((p) => p.panel && s.piezas.has(p.id)) && (!s.extra || s.piezas.has('espectro'));
  return { req, ok: req && m.rm <= 1.2 && m.rp <= 1.2 && m.rc <= 1.2, m };
}
const riesgoLanz = () => Math.round((5 + Math.max(0, medidas().rm - 1) * 100 * 0.5) * 10) / 10;

// ---------- DOM ----------
const h = (tag, attrs = {}, ...hijos) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const x of hijos.flat()) if (x != null && x !== false) el.append(x instanceof Node ? x : document.createTextNode(String(x)));
  return el;
};
const svgNS = 'http://www.w3.org/2000/svg';

// Retrato del jefe (mismo look que el NPC de la sala: pelo gris corto, americana azul marino, credencial y tableta).
function retrato() {
  const wrap = h('div', { class: 'tt-retrato', 'aria-hidden': 'true' });
  wrap.innerHTML = `
  <svg viewBox="0 0 160 190" xmlns="${svgNS}" shape-rendering="crispEdges">
    <polygon points="6,190 24,148 136,148 154,190" fill="#34405a"/>
    <polygon points="62,148 98,148 80,184" fill="#e9e4da"/>
    <polygon points="62,148 80,184 56,190 40,150" fill="#2b3550"/><polygon points="98,148 80,184 104,190 120,150" fill="#2b3550"/>
    <rect x="68" y="126" width="24" height="26" fill="#d4a47f"/>
    <rect x="104" y="160" width="17" height="22" fill="#f2f2ee"/><rect x="104" y="160" width="17" height="6" fill="#f2b844"/>
    <path d="M82 148 L112 160" stroke="#9aa0a6" stroke-width="2" fill="none"/>
    <g transform="rotate(-8 28 172)"><rect x="12" y="156" width="36" height="28" rx="3" fill="#161c28" stroke="#62c6ff" stroke-width="2"/><rect x="17" y="161" width="26" height="4" fill="#62c6ff" opacity=".7"/><rect x="17" y="168" width="18" height="3" fill="#62c6ff" opacity=".4"/></g>
    <circle cx="43" cy="94" r="6" fill="#dcae8a"/><circle cx="117" cy="94" r="6" fill="#dcae8a"/>
    <ellipse cx="80" cy="90" rx="37" ry="43" fill="#e9bf9c"/>
    <path d="M42 86 Q42 42 80 42 Q118 42 118 86 Q110 62 80 62 Q50 62 42 86Z" fill="#9c9a96"/>
    <rect x="42" y="76" width="7" height="16" fill="#9c9a96"/><rect x="111" y="76" width="7" height="16" fill="#9c9a96"/>
    <rect x="56" y="76" width="18" height="4" fill="#7a7774" transform="rotate(-4 65 78)"/><rect x="86" y="76" width="18" height="4" fill="#7a7774" transform="rotate(4 95 78)"/>
    <g class="tt-ojos"><ellipse cx="65" cy="90" rx="4" ry="5" fill="#1a1412"/><ellipse cx="95" cy="90" rx="4" ry="5" fill="#1a1412"/><circle cx="66.5" cy="88" r="1.4" fill="#fff"/><circle cx="96.5" cy="88" r="1.4" fill="#fff"/></g>
    <polygon points="80,92 75,108 85,108" fill="#d6a283"/>
    <g class="tt-boca"><rect x="68" y="119" width="24" height="5" rx="1" fill="#7a3a32"/></g>
  </svg>`;
  return wrap;
}

// ---------- Estructura del diálogo ----------
let dlg = null, ui = null, escribir = null;

function limpiarTemporizadores() {
  clearInterval(escribir); escribir = null;
  (S.temporizadores ?? []).forEach(clearTimeout);
  S.temporizadores = [];
}
const tarda = (ms, f) => { const t = setTimeout(f, ms); (S.temporizadores ??= []).push(t); return t; };

const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function decir(texto) {
  clearInterval(escribir);
  const el = ui.texto;
  ui.retrato.classList.add('habla');
  if (reducido()) { el.textContent = texto; ui.retrato.classList.remove('habla'); return; }
  el.textContent = '';
  let i = 0;
  escribir = setInterval(() => {
    i += 2;
    el.textContent = texto.slice(0, i);
    if (i >= texto.length) { clearInterval(escribir); escribir = null; ui.retrato.classList.remove('habla'); }
  }, 22);
  ui.completo = () => { clearInterval(escribir); escribir = null; el.textContent = texto; ui.retrato.classList.remove('habla'); };
}

// Cada paso: { id, chief: {es,en} (o función → texto), escena(ctx) pinta el escenario, gate: true si hay que hacer algo antes de seguir }.
const PASOS = [
  { id: 'hola', chief: { es: '¡Bienvenido a bordo! Soy el Jefe de Misión. En unos minutos aprenderás a jugar haciendo una misión de práctica. Nadie se juega nada: es un simulacro.', en: 'Welcome aboard! I am the Mission Chief. In a few minutes you will learn to play by running a practice mission. Nothing is at stake: it is a drill.' }, escena: escHola },
  { id: 'juego', chief: { es: 'Project Orbit es cooperativo. Hasta cuatro personas diseñan una misión espacial real, cada una en un departamento. Todos ganan o pierden juntos. Si faltan jugadores, su departamento queda vacante y cualquiera lo maneja.', en: 'Project Orbit is cooperative. Up to four people design a real space mission, each in one department. Everyone wins or loses together. If players are missing, their department stays vacant and anyone can run it.' }, escena: escDeptos },
  { id: 'fases', chief: { es: 'Este es el camino de cada partida. Primero el briefing, después el diseño, la revisión, la votación GO / NO-GO, el lanzamiento, el vuelo y el informe. Hoy haremos todo el recorrido en pequeño.', en: 'This is the path of every game: briefing, design, review, the GO / NO-GO vote, launch, flight and report. Today we will do the whole path in miniature.' }, escena: escFases },
  { id: 'briefing', chief: { es: 'Briefing. Abre tu expediente: destino, presupuesto y objetivos de ciencia. El objetivo PRIORITARIO es obligatorio; los opcionales dan más ciencia, pero piden más instrumentos. Márcalos con un clic.', en: 'Briefing. Open your dossier: destination, budget and science goals. The PRIORITY goal is mandatory; optional ones give more science but need more instruments. Mark them with a click.' }, escena: escBriefing, gate: () => S.obj },
  { id: 'diseno', chief: { es: 'Diseño. Monta chasis, cámara, antena y un panel solar (●). Las barras miden razón = usado ÷ límite: hasta 1,00 bien; hasta 1,20 tolerancia, con más riesgo; más de 1,20 la revisión falla. Compra también el seguro: lo verás útil en el vuelo.', en: 'Design. Mount the frame, camera, antenna and a solar panel (●). Bars show ratio = used ÷ limit: up to 1.00 fine; up to 1.20 tolerance, with more risk; above 1.20 the review fails. Also buy the insurance: it will pay off in flight.' }, escena: escDiseno, gate: () => disenoValido().ok },
  { id: 'go', chief: { es: 'Revisión y GO / NO-GO. Cada departamento revisa su parte y firma GO en su consola. Hacen falta las cuatro firmas. Si cambias el diseño después, las firmas se borran y hay que firmar otra vez. Pulsa cada lámpara.', en: 'Review and GO / NO-GO. Each department checks its part and signs GO at its console. All four signatures are needed. If you change the design afterwards, the signatures are cleared and you sign again. Press each lamp.' }, escena: escGo, gate: () => S.firmas.size === 4 },
  { id: 'lanzar', chief: { es: 'Lanzamiento. En el juego real eliges el mes de la ventana: fuera del mes óptimo gastas más propelente. Mira el riesgo de fallo: se suma cuando te pasas de masa. Si el lanzamiento falla, la misión termina. ¡Cuenta atrás!', en: 'Launch. In the real game you pick the month of the window: outside the best month you burn more propellant. Look at the failure risk: it grows when you exceed the mass limit. If the launch fails, the mission ends. Countdown!' }, escena: escLanzar, gate: () => S.lanzado },
  { id: 'vuelo', chief: { es: 'Vuelo. Las fases se muestran una a una y todos ven lo mismo. Pulsa NEXT para avanzar. Cuando salga un evento malo, el departamento dueño de la contingencia puede activarla; sin avanzar no sigues.', en: 'Flight. Phases are shown one by one and everyone sees the same. Press NEXT to advance. When a bad event appears, the department that owns the contingency can activate it; you cannot advance until it is resolved.' }, escena: escVuelo, gate: () => S.fin },
  { id: 'informe', chief: () => (S.resultado?.total
    ? { es: 'Misión total. Tu seguro anuló la tormenta y toda la ciencia llegó a casa. Así se juega: diseñar con margen, asegurar lo que puede fallar y firmar entre todos. Vuelve a volar para mejorar la puntuación.', en: 'Full mission. Your insurance cancelled the storm and all the science came home. That is the game: design with margin, insure what can fail and sign together. Fly again to improve the score.' }
    : { es: 'Misión parcial. Sin el seguro, la tormenta te quitó el 15 % de la ciencia. En el juego real el informe explica cada causa y, con «Volver a volar», rediseñas con lo aprendido. Prueba otra vez comprando el seguro.', en: 'Partial mission. Without the insurance, the storm cost you 15 % of the science. In the real game the report explains every cause and, with "Fly again", you redesign with what you learned. Try again with the insurance.' }), escena: escInforme },
  { id: 'regalo', chief: { es: 'Has terminado el entrenamiento. Toma: el Manual de juego. Tiene las reglas, los números y los controles en capítulos. Léelo aquí; el manual completo, con fórmulas, también está en el portátil de tu asiento. ¡Buena misión, astronauta!', en: 'Training complete. Here, take the Game manual. It has the rules, numbers and controls in chapters. Read it here; the full manual, with formulas, is also on your seat laptop. Good luck out there, astronaut!' }, escena: escRegalo },
];

function ctxPaso() { return PASOS[S.paso]; }

function pintarPaso({ decirTexto = true } = {}) {
  const p = ctxPaso();
  limpiarTemporizadores();
  ui.escena.replaceChildren();
  ui.escena.dataset.paso = p.id;
  ui.pasoTxt.textContent = T.paso(S.paso + 1, PASOS.length);
  ui.puntos.forEach((el, i) => { el.classList.toggle('on', i === S.paso); el.classList.toggle('hecho', i < S.paso); });
  p.escena(ui.escena);
  if (decirTexto) decir(typeof p.chief === 'function' ? L(p.chief()) : L(p.chief));
  actualizarPuerta();
}

function actualizarPuerta() {
  const p = ctxPaso();
  const abierta = !p.gate || p.gate();
  ui.sig.disabled = !abierta;
  ui.sig.classList.toggle('pulsa', abierta);
  ui.atras.disabled = S.paso === 0;
  const ultimo = S.paso === PASOS.length - 1;
  ui.sig.textContent = ultimo ? T.terminar : T.siguiente + ' ▶';
  ui.atras.textContent = '◀ ' + T.atras;
}

function ir(d) {
  const n = S.paso + d;
  if (n < 0) return;
  if (n >= PASOS.length) { cerrar(); return; }
  S.paso = n;
  efecto('clic');
  // Volver atrás desde el informe o el vuelo reinicia lo posterior al diseño.
  if (d < 0 && ['lanzar', 'vuelo', 'informe'].includes(PASOS[n].id)) { S.lanzado = false; S.fase = 0; S.fin = false; S.evento = null; S.resultado = null; }
  pintarPaso();
}
function avisarCambio() { actualizarPuerta(); }

// ---------- Escenas ----------
function escHola(el) {
  el.append(h('div', { class: 'tt-hero' },
    h('div', { class: 'tt-hero-t' }, 'PROJECT ORBIT'),
    h('p', {}, idioma() === 'es' ? 'Simulacro de entrenamiento · Misión de práctica «Luna-0»' : 'Training drill · Practice mission "Luna-0"'),
    h('p', { class: 'tt-tenue' }, idioma() === 'es' ? 'Tiempo estimado: 3 minutos. Puedes saltar el tutorial cuando quieras.' : 'Estimated time: 3 minutes. You can skip the tutorial any time.')));
}

function escDeptos(el) {
  el.append(h('h3', { class: 'tt-h' }, idioma() === 'es' ? 'Los cuatro departamentos' : 'The four departments'),
    h('div', { class: 'tt-deptos' }, Object.entries(DEPS).map(([id, d]) => h('div', { class: 'tt-depto', style: `--c:${d.color}` },
      h('span', { class: 'tt-lampara' }), h('strong', {}, L(d.n)), h('span', {}, L(d.d))))));
}

function escFases(el) {
  const fs = [
    ['briefing', 'Briefing', 'Briefing'], ['diseno', 'Diseño', 'Design'], ['revision', 'Revisión', 'Review'], ['go', 'GO / NO-GO', 'GO / NO-GO'],
    ['lanza', 'Lanzamiento', 'Launch'], ['vuelo', 'Vuelo', 'Flight'], ['informe', 'Informe', 'Report'],
  ];
  const lista = h('ol', { class: 'tt-camino' }, fs.map((f, i) => h('li', { style: `--i:${i}` }, h('span', { class: 'tt-n' }, i + 1), h('span', {}, idioma() === 'es' ? f[1] : f[2]))));
  el.append(h('h3', { class: 'tt-h' }, idioma() === 'es' ? 'El camino de una partida' : 'The path of a game'), lista,
    h('p', { class: 'tt-tenue' }, idioma() === 'es' ? 'El reloj de misión corre en tiempo real mientras diseñas: cada mes dura 1 minuto con 4 jugadores (más con menos jugadores).' : 'The mission clock runs in real time while you design: a month lasts 1 minute with 4 players (longer with fewer players).'));
}

function escBriefing(el) {
  const marca = (clave, nombre, desc, etiqueta, oblig) => {
    const b = h('button', { class: 'tt-obj' + (S[clave] ? ' on' : ''), type: 'button', onclick: () => { S[clave] = !S[clave] || oblig; efecto(S[clave] ? 'confirmar' : 'quitar'); pintarPaso({ decirTexto: false }); } },
      h('span', { class: 'tt-etq ' + (oblig ? 'pri' : 'opc') }, etiqueta), h('strong', {}, nombre), h('span', {}, desc),
      h('span', { class: 'tt-marca' }, S[clave] ? '✔ ' + T.marcado : T.marcar));
    return b;
  };
  el.append(
    h('div', { class: 'tt-carpeta' },
      h('div', { class: 'tt-carp-cab' }, h('strong', {}, 'LUNA-0'), h('span', {}, idioma() === 'es' ? 'Sonda de práctica · destino: la Luna' : 'Practice probe · destination: the Moon')),
      h('div', { class: 'tt-datos' },
        h('span', {}, `${T.masa}: ${LIM.masa} kg`), h('span', {}, `${T.presupuesto}: ${LIM.presupuesto} M USD`),
        h('span', {}, idioma() === 'es' ? 'Plazo: 6 meses' : 'Deadline: 6 months'))),
    h('h3', { class: 'tt-h' }, T.objetivos),
    h('div', { class: 'tt-objs' },
      marca('obj', idioma() === 'es' ? 'Fotografiar un cráter' : 'Photograph a crater', idioma() === 'es' ? 'Pide: cámara a bordo.' : 'Needs: a camera on board.', T.prioritario, true),
      marca('extra', idioma() === 'es' ? 'Analizar el suelo' : 'Analyse the soil', idioma() === 'es' ? 'Pide: espectrómetro. Más ciencia, más masa y vatios.' : 'Needs: spectrometer. More science, more mass and watts.', T.opcional, false)));
  if (!S.obj) el.append(h('p', { class: 'tt-tenue' }, idioma() === 'es' ? 'Marca el objetivo prioritario para continuar.' : 'Mark the priority goal to continue.'));
}

function barra(nombre, usado, limite, razon, unidad) {
  const e = estadoRazon(razon);
  const pct = Math.min(100, (Number.isFinite(razon) ? razon : 2) / 1.4 * 100);
  return h('div', { class: 'tt-barra ' + e },
    h('div', { class: 'tt-barra-cab' }, h('span', {}, nombre), h('span', {}, `${usado} / ${limite} ${unidad}`), h('strong', {}, `${T.ratio} ${fmtR(razon)}`)),
    h('div', { class: 'tt-pista' }, h('i', { style: `width:${pct}%` }), h('b', { class: 'l100' }), h('b', { class: 'l120' })));
}

function escDiseno(el) {
  const s = S;
  const m = medidas();
  const v = disenoValido();
  const fila = (p) => {
    const on = s.piezas.has(p.id);
    const d = DEPS[p.dep];
    const dif = p.w < 0 ? `+${-p.w} W` : `${p.w} W`;
    return h('button', { class: 'tt-pieza' + (on ? ' on' : ''), type: 'button', style: `--c:${d.color}`, 'aria-pressed': on,
      onclick: () => {
        if (on) s.piezas.delete(p.id);
        else { if (p.panel) PIEZAS.filter((q) => q.panel).forEach((q) => s.piezas.delete(q.id)); s.piezas.add(p.id); }
        s.firmas.clear();
        efecto(on ? 'quitar' : 'pieza'); pintarPaso({ decirTexto: false });
      } },
      h('span', { class: 'tt-lampara' }), h('strong', {}, L(p.n)), h('span', { class: 'tt-dep' }, L(d.n)),
      h('span', { class: 'tt-num' }, `${p.m} kg · ${dif} · ${p.c} M`), p.req ? h('span', { class: 'tt-req' }, '●') : null);
  };
  const seguro = h('button', { class: 'tt-pieza seg' + (s.seguro ? ' on' : ''), type: 'button', style: `--c:${DEPS.comms.color}`, 'aria-pressed': s.seguro,
    onclick: () => { s.seguro = !s.seguro; s.firmas.clear(); efecto(s.seguro ? 'contingencia' : 'quitar'); pintarPaso({ decirTexto: false }); } },
    h('span', { class: 'tt-lampara' }), h('strong', {}, T.seguro), h('span', { class: 'tt-dep' }, T.seguroDesc), h('span', { class: 'tt-num' }, `0 kg · 0 W · ${SEGURO.c} M`));
  let msg, cls = 'tt-ayuda';
  if (!v.req) { msg = s.extra && !s.piezas.has('espectro') ? (idioma() === 'es' ? 'Marcaste «Analizar el suelo»: necesitas el espectrómetro.' : 'You marked "Analyse the soil": you need the spectrometer.') : T.faltan + ' (●)'; cls += ' aviso'; }
  else if (!v.ok) { msg = T.fuera; cls += ' mal'; }
  else if (Math.max(m.rm, m.rp, m.rc) > 1) { msg = T.tolerancia; cls += ' aviso'; }
  else msg = T.listoDiseno;
  el.append(
    h('div', { class: 'tt-diseno' },
      h('div', {}, h('h3', { class: 'tt-h' }, T.piezas), h('div', { class: 'tt-piezas' }, PIEZAS.map(fila), seguro)),
      h('div', {}, h('h3', { class: 'tt-h' }, T.barras),
        barra(T.masa, m.m, LIM.masa, m.rm, 'kg'), barra(T.potencia, m.uso, m.sum, m.rp, 'W'), barra(T.presupuesto, m.c, LIM.presupuesto, m.rc, 'M'),
        h('p', { class: 'tt-riesgo' }, `${T.riesgoLanz}: ${riesgoLanz().toString().replace('.', idioma() === 'es' ? ',' : '.')} %`),
        h('p', { class: cls }, msg))));
}

function escGo(el) {
  el.append(h('h3', { class: 'tt-h' }, idioma() === 'es' ? 'Consolas de la sala de control' : 'Control-room consoles'),
    h('div', { class: 'tt-consolas' }, Object.entries(DEPS).map(([id, d]) => {
      const f = S.firmas.has(id);
      return h('button', { class: 'tt-consola' + (f ? ' go' : ''), type: 'button', style: `--c:${d.color}`, disabled: f,
        onclick: () => { S.firmas.add(id); efecto('confirmar'); pintarPaso({ decirTexto: false }); } },
        h('span', { class: 'tt-lamp-go' }), h('strong', {}, L(d.n)), h('span', {}, f ? T.firmado : T.firmar));
    })),
    h('p', { class: 'tt-tenue' }, `${S.firmas.size} / 4 GO`));
}

function escLanzar(el) {
  const cohete = h('div', { class: 'tt-cohete' + (S.lanzado ? ' sube' : '') },
    h('svg', { viewBox: '0 0 40 90', width: '56', height: '120', 'aria-hidden': 'true' }));
  cohete.firstChild.innerHTML = '<polygon points="20,2 30,26 30,66 10,66 10,26" fill="#e9e4da"/><polygon points="20,2 30,26 10,26" fill="#d9822b"/><circle cx="20" cy="40" r="5" fill="#62c6ff"/><polygon points="10,66 2,80 10,76" fill="#d9822b"/><polygon points="30,66 38,80 30,76" fill="#d9822b"/><polygon class="llama" points="14,68 20,88 26,68" fill="#f2b844"/>';
  const cuenta = h('div', { class: 'tt-cuenta', 'aria-live': 'polite' }, S.lanzado ? T.despegue : '');
  const btn = h('button', { class: 'boton primario grande tt-lanzar', type: 'button', disabled: S.lanzado, onclick: () => {
    btn.disabled = true; efecto('confirmar');
    let n = 3; cuenta.textContent = n;
    const tick = () => {
      n -= 1;
      if (n > 0) { cuenta.textContent = n; efecto('clic'); tarda(800, tick); }
      else { cuenta.textContent = T.despegue; cohete.classList.add('sube'); efecto('fase'); tarda(1400, () => { S.lanzado = true; actualizarPuerta(); }); }
    };
    tarda(800, tick);
  } }, T.lanzar);
  el.append(h('div', { class: 'tt-pad' }, cohete, h('div', { class: 'tt-pad-info' },
    h('p', { class: 'tt-riesgo' }, `${T.riesgoLanz}: ${riesgoLanz().toString().replace('.', idioma() === 'es' ? ',' : '.')} %`),
    h('p', { class: 'tt-tenue' }, idioma() === 'es' ? 'Simulacro: los dados son amistosos y el lanzamiento saldrá bien.' : 'Drill: the dice are friendly and the launch will succeed.'),
    cuenta, btn)));
}

function escVuelo(el) {
  const fases = T.fases;
  const lista = h('ol', { class: 'tt-fases' }, fases.map((f, i) => h('li', { class: S.fin || i < S.fase ? 'hecha' : i === S.fase ? 'ahora' : '' }, h('span', { class: 'tt-n' }, i + 1), h('span', {}, f))));
  const cuerpo = h('div', { class: 'tt-evento-zona' });
  const ev = S.evento;
  if (ev === 'pendiente') {
    cuerpo.append(h('div', { class: 'tt-evento' },
      h('strong', {}, '⚠ ' + T.eventoTit), h('p', {}, T.tormenta),
      S.seguro
        ? h('button', { class: 'boton primario', type: 'button', onclick: () => { S.evento = 'anulado'; efecto('contingencia'); pintarPaso({ decirTexto: false }); } }, T.activar)
        : h('button', { class: 'boton peligro', type: 'button', onclick: () => { S.evento = 'dano'; efecto('aviso'); pintarPaso({ decirTexto: false }); } }, T.aceptar)));
  } else if (ev === 'anulado') cuerpo.append(h('div', { class: 'tt-evento ok' }, h('strong', {}, '✔ ' + T.anulado)));
  else if (ev === 'dano') cuerpo.append(h('div', { class: 'tt-evento mal' }, h('strong', {}, '✖ ' + T.dano)));
  const next = h('button', { class: 'boton primario', type: 'button', disabled: S.fin || ev === 'pendiente', onclick: () => {
    efecto('fase');
    if (S.fase < 3) {
      S.fase += 1;
      if (S.fase === 1 && !S.evento) { S.evento = 'pendiente'; efecto('evento'); }
    } else {
      S.fin = true;
      S.resultado = { total: !!S.seguro, ciencia: 100 * (S.seguro ? 1 : 0.85) };
    }
    pintarPaso({ decirTexto: false });
  } }, S.fin ? '✔' : T.next + ' ▶');
  el.append(h('h3', { class: 'tt-h' }, T.faseTit), lista, cuerpo, h('div', { class: 'tt-vuelo-acc' }, next));
}

function escInforme(el) {
  const m = medidas();
  const r = S.resultado ?? { total: !!S.seguro, ciencia: 85 };
  const ciencia = Math.round(r.ciencia);
  const puntos = Math.round(ciencia * (S.extra ? 12 : 8) - Math.max(0, m.c - LIM.presupuesto) * 10);
  el.append(h('div', { class: 'tt-informe' },
    h('h3', { class: 'tt-h' }, T.informe),
    h('div', { class: 'tt-veredicto ' + (r.total ? 'ok' : 'aviso') }, T.veredicto + ': ', h('strong', {}, r.total ? T.total : T.parcial)),
    h('div', { class: 'tt-stats' },
      h('div', {}, h('span', {}, T.ciencia), h('strong', {}, ciencia + ' %')),
      h('div', {}, h('span', {}, T.gastado), h('strong', {}, `${m.c} / ${LIM.presupuesto} M`)),
      h('div', {}, h('span', {}, T.puntos), h('strong', {}, puntos))),
    h('ul', { class: 'tt-causas' },
      h('li', {}, idioma() === 'es' ? (S.seguro ? 'La contingencia «Modo seguro» anuló la tormenta solar.' : 'No compraste contingencia: la tormenta solar quitó el 15 % de la ciencia.') : (S.seguro ? 'The "Safe mode" contingency cancelled the solar storm.' : 'You bought no contingency: the solar storm removed 15 % of the science.')),
      h('li', {}, idioma() === 'es' ? (S.extra ? 'Cubriste el objetivo opcional: más ciencia.' : 'Solo el objetivo prioritario: menos riesgo, menos ciencia.') : (S.extra ? 'You covered the optional goal: more science.' : 'Priority goal only: less risk, less science.')),
      h('li', {}, idioma() === 'es' ? 'El informe real también cuenta datos perdidos y compara con la misión de verdad.' : 'The real report also counts lost data and compares with the real mission.'))));
}

// ---------- Manual de regalo ----------
function escRegalo(el) {
  try { localStorage.setItem('manualRegalado', '1'); } catch { /* sin almacenamiento */ }
  el.append(h('div', { class: 'tt-regalo' },
    h('div', { class: 'tt-chispas', 'aria-hidden': 'true' }, '✦ ✧ ✦'),
    h('div', { class: 'tt-libro' }, h('span', { class: 'tt-cinta' }), h('strong', {}, 'PROJECT ORBIT'), h('span', {}, T.regaloT)),
    h('h3', { class: 'tt-h' }, T.regalo),
    h('div', { class: 'tt-acc-regalo' },
      h('button', { class: 'boton primario grande', type: 'button', onclick: () => abrirManual() }, T.abrir)),
    h('p', { class: 'tt-tenue' }, T.manualPie)));
}

function contenidoManual(bloque) {
  const nodo = (b) => {
    const [tipo, a, c] = b;
    if (tipo === 'p') return h('p', {}, L(a));
    if (tipo === 'h') return h('h4', {}, L(a));
    if (tipo === 'nota') return h('p', { class: 'tt-m-nota' }, L(a));
    if (tipo === 'lista') return h('ul', {}, a.map((x) => h('li', {}, L(x))));
    if (tipo === 'tabla') return h('table', {}, h('thead', {}, h('tr', {}, a.map((x) => h('th', {}, L(x))))), h('tbody', {}, c.map((f) => h('tr', {}, f.map((x) => h('td', {}, L(x)))))));
    return null;
  };
  return bloque.map(nodo);
}

function abrirManual() {
  efecto('abrir');
  let m = document.getElementById('dlg-manual-regalo');
  if (!m) { m = h('dialog', { id: 'dlg-manual-regalo', class: 'dialogo dialogo-ancho tt-manual' }); document.body.append(m); }
  let cap = 0;
  const cuerpo = h('div', { class: 'tt-m-cuerpo' });
  const indice = h('ol', { class: 'tt-m-indice' });
  const pintar = () => {
    indice.replaceChildren(...MANUAL.map((c, i) => h('li', {}, h('button', { type: 'button', class: i === cap ? 'on' : '', onclick: () => { cap = i; pintar(); cuerpo.scrollTop = 0; } }, L(c.t)))));
    cuerpo.replaceChildren(h('h3', {}, L(MANUAL[cap].t)), ...contenidoManual(MANUAL[cap].b),
      h('div', { class: 'tt-m-pie' },
        h('button', { class: 'boton', type: 'button', disabled: cap === 0, onclick: () => { cap -= 1; pintar(); cuerpo.scrollTop = 0; } }, '◀'),
        h('button', { class: 'boton', type: 'button', disabled: cap === MANUAL.length - 1, onclick: () => { cap += 1; pintar(); cuerpo.scrollTop = 0; } }, '▶')));
  };
  pintar();
  const cerrarB = h('button', { class: 'boton primario', type: 'button', onclick: () => m.close() }, T.cerrar);
  m.replaceChildren(h('h2', {}, T.regaloT), h('div', { class: 'tt-m-marco' }, h('nav', {}, h('p', { class: 'tt-tenue' }, T.indice), indice), cuerpo), h('div', { class: 'acciones' }, cerrarB));
  m.showModal();
}

// ---------- Apertura y cierre ----------
function cerrar() { dlg?.close(); }

function crearDialogo() {
  dlg = h('dialog', { id: 'dlg-tutorial', class: 'tt', 'aria-label': T.titulo });
  const puntos = PASOS.map(() => h('i', {}));
  const pasoTxt = h('span', { class: 'tt-paso' });
  const cab = h('header', { class: 'tt-cab' }, h('span', { class: 'tt-tit' }, T.titulo), h('div', { class: 'tt-puntos' }, puntos), pasoTxt,
    h('button', { class: 'boton chico tt-saltar', type: 'button', onclick: cerrar }, T.saltar + ' ✕'));
  const escena = h('div', { class: 'tt-escena' });
  const ret = retrato();
  const texto = h('p', { class: 'tt-texto', 'aria-live': 'polite' });
  const atras = h('button', { class: 'boton', type: 'button', onclick: () => ir(-1) });
  const sig = h('button', { class: 'boton primario', type: 'button', onclick: () => ir(1) });
  const dialogo = h('div', { class: 'tt-dialogo', onclick: (e) => { if (!e.target.closest('button')) ui.completo?.(); } }, h('div', { class: 'tt-nombre' }, T.jefe), texto, h('div', { class: 'tt-acc' }, atras, sig));
  dlg.append(h('div', { class: 'tt-marco' }, cab, escena, h('footer', { class: 'tt-chief' }, ret, dialogo)));
  document.body.append(dlg);
  ui = { escena, texto, retrato: ret, sig, atras, puntos, pasoTxt, completo: null };
  dlg.addEventListener('close', () => { limpiarTemporizadores(); S = nuevo(); });
  dlg.addEventListener('cancel', () => efecto('clic'));
  addEventListener('idioma', () => {
    if (!dlg?.open) return;
    cab.querySelector('.tt-tit').textContent = T.titulo; cab.querySelector('.tt-saltar').textContent = T.saltar + ' ✕';
    dialogo.querySelector('.tt-nombre').textContent = T.jefe; pintarPaso();
  });
}

export function abrirTutorial() {
  if (!dlg) crearDialogo();
  S = nuevo();
  efecto('abrir');
  dlg.showModal();
  pintarPaso();
  ui.sig.focus({ preventScroll: true });
}

export const textoBotonTutorial = () => T.boton;
