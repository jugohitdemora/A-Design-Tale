// Tutorial de la pantalla de inicio: el jefe de misión (Chief) explica el juego con un cuadro de diálogo y hace jugar una
// misión de práctica de un solo jugador (briefing → diseño → GO/NO-GO → lanzamiento → vuelo → informe). Al final regala el
// Manual de juego (se lee aquí). No usa red ni el estado de la partida: todo es local a este módulo.
// Contrato: abrirTutorial() abre el diálogo; textoBotonTutorial() es el texto del botón del inicio.
// Los números de la práctica siguen las reglas reales: porcentaje = usado / límite; ≤ 100 % dentro; ≤ 120 % tolerancia; > 120 % la revisión falla.
import { textos, tx, idioma } from './i18n.js';
import { efecto } from './audio.js';
import { MANUAL } from './tutorial-manual.js?v=4';

const T = textos({
  es: {
    dias: 'días', propelente: 'Propelente', precio: 'Precio', rutas: 'Rutas', riesgoCr: 'Riesgo en crucero', pts: 'puntos', mejor: 'MEJOR', plazoMes: 'PLAZO',
    mejorVentana: 'Ir a la mejor ventana', ahoraPlazo: 'Ahora: febrero. Plazo de los inversores: junio.', extraKg: 'Propelente extra por mes',
    capaRelieve: 'Elevación', capaPend: 'Pendiente', capas: 'Capas de datos', sitios: 'Sitios candidatos', pendiente: 'Pendiente', rocas: 'Rocas', interes: 'Interés científico', pAter: 'Éxito del aterrizaje',
    leyenda: 'Leyenda: verde llano, ámbar inclinado, rojo muy inclinado.', sitioAlto: 'Mucha ciencia, pero la pendiente sube el riesgo de aterrizaje.', sitioLlano: 'Terreno llano: aterrizaje seguro.',
    secuencia: 'Secuencia de misión', mensajes: 'Mensajes', telemetria: 'Telemetría', energia: 'Energía', enlace: 'Enlace', datosRec: 'Datos', estable: 'estable', responsable: 'Responsable',
    esperaDepto: 'Esperando al departamento. Solo él puede activarla.', activarComo: 'ACTIVAR · Comunicaciones y Ops.', sinCobertura: 'Ninguna contingencia cubre este evento.',
    tabPlan: 'PLANIFICACIÓN', tabGo: 'GO / NO-GO', tabOps: 'OPERACIONES', tabInf: 'INFORME', pared: 'Pared de la sala de control', verTodas: 'Pulsa las cuatro pestañas para seguir.',
    boton: 'TUTORIAL', titulo: 'Tutorial · Simulacro', ventana: 'Misión de práctica · Luna-0', jefe: 'JEFE DE MISIÓN', saltar: 'Cerrar tutorial', siguiente: 'Siguiente', atras: 'Atrás',
    paso: (a, b) => `Paso ${a} de ${b}`, cerrar: 'Cerrar', terminar: 'Terminar y a la misión',
    barras: 'Barras de recursos', masa: 'Masa', potencia: 'Potencia', presupuesto: 'Presupuesto', ratio: 'razón',
    dentro: 'Dentro del límite', tolerancia: 'En tolerancia. La revisión pasa, pero el riesgo es mayor.', fuera: 'Fuera del límite. La revisión falla.',
    piezas: 'Piezas', objetivos: 'Objetivos de la misión', prioritario: 'PRIORITARIO', opcional: 'OPCIONAL', marcado: 'Marcado', marcar: 'Marcar',
    seguro: 'Contingencia', seguroDesc: 'Seguro «Modo seguro». Anula una tormenta solar en el vuelo.',
    riesgoLanz: 'Riesgo de fallo en el lanzamiento',
    faltan: 'Faltan piezas obligatorias', listoDiseno: 'Diseño completo. Puedes pedir la revisión.',
    firmar: 'Firmar GO', firmado: 'GO', pendiente: 'Pendiente',
    lanzar: 'LANZAR', cuenta: 'Cuenta atrás', despegue: '¡Despegue!',
    fases: ['Lanzamiento', 'Crucero', 'Aterrizaje', 'Operaciones'], faseTit: 'Fases del vuelo', next: 'NEXT',
    eventoTit: 'EVENTO', tormenta: 'Tormenta solar. Las partículas dañan la electrónica.',
    activar: 'Activar contingencia', aceptar: 'Aceptar el daño', anulado: 'Anulada por tu contingencia',
    dano: 'Daño: −15 % de ciencia',
    informe: 'Informe de vuelo', veredicto: 'Veredicto', total: 'MISIÓN TOTAL', parcial: 'MISIÓN PARCIAL',
    ciencia: 'Ciencia lograda', gastado: 'Presupuesto gastado', puntos: 'Puntuación',
    regalo: '¡Un regalo!', regaloT: 'Manual de juego', abrir: 'Abrir el manual', leer: 'Leer',
    indice: 'Capítulos', manualHecho: 'Manual guardado', ya: 'Ya tienes el manual', otraVez: 'Repetir tutorial',
    manualPie: 'Encuentra la versión completa, con fórmulas y datos de tu misión, en la app «Manual de juego» del portátil.',
  },
  en: {
    dias: 'days', propelente: 'Propellant', precio: 'Price', rutas: 'Routes', riesgoCr: 'Cruise risk', pts: 'points', mejor: 'BEST', plazoMes: 'DEADLINE',
    mejorVentana: 'Go to the best window', ahoraPlazo: 'Now: February. Investor deadline: June.', extraKg: 'Extra propellant per month',
    capaRelieve: 'Elevation', capaPend: 'Slope', capas: 'Data layers', sitios: 'Candidate sites', pendiente: 'Slope', rocas: 'Rocks', interes: 'Science interest', pAter: 'Landing success',
    leyenda: 'Legend: green is flat, amber is steep, red is very steep.', sitioAlto: 'High science, but the slope raises the landing risk.', sitioLlano: 'Flat terrain: safe landing.',
    secuencia: 'Mission sequence', mensajes: 'Messages', telemetria: 'Telemetry', energia: 'Power', enlace: 'Link', datosRec: 'Data', estable: 'stable', responsable: 'Owner',
    esperaDepto: 'Waiting for the department. Only it can activate it.', activarComo: 'ACTIVATE · Comms & Ops', sinCobertura: 'No contingency covers this event.',
    tabPlan: 'PLANNING', tabGo: 'GO / NO-GO', tabOps: 'OPERATIONS', tabInf: 'REPORT', pared: 'Control room wall', verTodas: 'Click the four tabs to continue.',
    boton: 'TUTORIAL', titulo: 'Tutorial · Drill', ventana: 'Practice mission · Luna-0', jefe: 'MISSION CHIEF', saltar: 'Close tutorial', siguiente: 'Next', atras: 'Back',
    paso: (a, b) => `Step ${a} of ${b}`, cerrar: 'Close', terminar: 'Finish and go to the mission',
    barras: 'Resource bars', masa: 'Mass', potencia: 'Power', presupuesto: 'Budget', ratio: 'ratio',
    dentro: 'Within the limit', tolerancia: 'In tolerance. The review passes, but the risk is higher.', fuera: 'Over the limit. The review fails.',
    piezas: 'Parts', objetivos: 'Mission goals', prioritario: 'PRIORITY', opcional: 'OPTIONAL', marcado: 'Marked', marcar: 'Mark',
    seguro: 'Contingency', seguroDesc: 'Insurance "Safe mode". It cancels a solar storm in flight.',
    riesgoLanz: 'Launch failure risk',
    faltan: 'Required parts are missing', listoDiseno: 'Design complete. You can request the review.',
    firmar: 'Sign GO', firmado: 'GO', pendiente: 'Pending',
    lanzar: 'LAUNCH', cuenta: 'Countdown', despegue: 'Liftoff!',
    fases: ['Launch', 'Cruise', 'Landing', 'Operations'], faseTit: 'Flight phases', next: 'NEXT',
    eventoTit: 'EVENT', tormenta: 'Solar storm. Particles damage the electronics.',
    activar: 'Activate contingency', aceptar: 'Accept the damage', anulado: 'Cancelled by your contingency',
    dano: 'Damage: −15 % science',
    informe: 'Flight report', veredicto: 'Verdict', total: 'FULL MISSION', parcial: 'PARTIAL MISSION',
    ciencia: 'Science achieved', gastado: 'Budget spent', puntos: 'Score',
    regalo: 'A gift!', regaloT: 'Game manual', abrir: 'Open the manual', leer: 'Read',
    indice: 'Chapters', manualHecho: 'Manual saved', ya: 'You already have the manual', otraVez: 'Repeat tutorial',
    manualPie: 'Find the full version, with formulas and your mission data, in the "Game manual" app on the laptop.',
  },
});

// ---------- Datos de la misión de práctica ----------
const DEPS = {
  vuelo: { color: '#d9822b', n: { es: 'Vuelo y Mecánica', en: 'Flight & Mechanics' }, d: { es: 'Cuerpo de la nave, cohete, ruta y mes de lanzamiento.', en: 'Spacecraft body, rocket, route and launch month.' } },
  ciencia: { color: '#3fa66b', n: { es: 'Ciencia', en: 'Science' }, d: { es: 'Instrumentos y objetivos científicos.', en: 'Instruments and science goals.' } },
  potencia: { color: '#e0c040', n: { es: 'Energía', en: 'Power' }, d: { es: 'Paneles, baterías y temperatura.', en: 'Panels, batteries and temperature.' } },
  comms: { color: '#4a7fd0', n: { es: 'Comunicaciones y Operaciones', en: 'Communications & Operations' }, d: { es: 'Antenas, computador y que los datos lleguen a casa.', en: 'Antennas, computer, and getting the data home.' } },
};
const LIM = { masa: 100, presupuesto: 40 };
const PIEZAS = [
  { id: 'chasis', dep: 'vuelo', n: { es: 'Chasis ligero', en: 'Light frame' }, m: 40, w: 0, c: 8, req: true },
  { id: 'camara', dep: 'ciencia', n: { es: 'Cámara de cráteres', en: 'Crater camera' }, m: 12, w: 20, c: 6, req: true },
  { id: 'espectro', dep: 'ciencia', n: { es: 'Espectrómetro', en: 'Spectrometer' }, m: 25, w: 35, c: 10 },
  { id: 'panelP', dep: 'potencia', n: { es: 'Panel solar pequeño', en: 'Small solar panel' }, m: 10, w: -50, c: 4, panel: true },
  { id: 'panelG', dep: 'potencia', n: { es: 'Panel solar grande', en: 'Large solar panel' }, m: 22, w: -100, c: 8, panel: true },
  { id: 'antena', dep: 'comms', n: { es: 'Antena de bajada', en: 'Downlink antenna' }, m: 8, w: 10, c: 4, req: true },
];
const SEGURO = { id: 'seguro', dep: 'comms', c: 2 };
// Planificación (sala de control): la ruta, el mes y el sitio suman masa y precio, y mueven la probabilidad de una fase.
const RUTAS = [
  { id: 'directa', n: { es: 'Directa rápida', en: 'Fast direct' }, dias: 3, prop: 30, c: 6, dp: 0 },
  { id: 'equil', n: { es: 'Equilibrada', en: 'Balanced' }, dias: 5, prop: 18, c: 4, dp: 3 },
  { id: 'larga', n: { es: 'Larga con sobrevuelo', en: 'Long with flyby' }, dias: 9, prop: 8, c: 3, dp: 6 },
];
const MESES = [
  { n: { es: 'Feb', en: 'Feb' }, extra: 8 }, { n: { es: 'Mar', en: 'Mar' }, extra: 0, mejor: true }, { n: { es: 'Abr', en: 'Apr' }, extra: 8 },
  { n: { es: 'May', en: 'May' }, extra: 16 }, { n: { es: 'Jun', en: 'Jun' }, extra: 24 },
];
const SITIOS = [
  { id: 'A', n: { es: 'Fondo del cráter', en: 'Crater floor' }, pend: 3, rocas: { es: 'pocas', en: 'few' }, interes: { es: 'medio', en: 'medium' }, p: 95, bonus: 40, x: 95, y: 150 },
  { id: 'B', n: { es: 'Pared del cráter', en: 'Crater wall' }, pend: 18, rocas: { es: 'muchas', en: 'many' }, interes: { es: 'alto', en: 'high' }, p: 78, bonus: 90, x: 205, y: 70 },
  { id: 'C', n: { es: 'Llanura norte', en: 'North plain' }, pend: 2, rocas: { es: 'pocas', en: 'few' }, interes: { es: 'bajo', en: 'low' }, p: 95, bonus: 10, x: 290, y: 165 },
];
const rutaSel = (s = S) => RUTAS.find((r) => r.id === s.ruta) ?? null;
const sitioSel = (s = S) => SITIOS.find((x) => x.id === s.sitio) ?? null;

// Estado del simulacro (se reinicia al abrir el tutorial).
const nuevo = () => ({ paso: 0, obj: false, extra: false, piezas: new Set(), seguro: false, ruta: null, mes: null, sitio: null, capa: 'relieve', tab: 0, vistos: new Set(), firmas: new Set(), lanzado: false, fase: 0, fin: false, evento: null, nuevoEv: false, resultado: null });
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
  const ru = rutaSel(s), me = s.mes != null ? MESES[s.mes] : null;
  m += (ru?.prop ?? 0) + (me?.extra ?? 0); c += ru?.c ?? 0;
  const r = (u, l) => (l > 0 ? u / l : (u > 0 ? Infinity : 0));
  return { m, uso, sum, c, rm: r(m, LIM.masa), rp: r(uso, sum), rc: r(c, LIM.presupuesto) };
}
const estadoRazon = (r) => (r <= 1 ? 'ok' : r <= 1.2 ? 'tol' : 'mal');
const fmtP = (r) => (Number.isFinite(r) ? `${Math.round(r * 100)} %` : '∞');
function disenoValido(s = S) {
  const m = medidas(s);
  const req = PIEZAS.filter((p) => p.req).every((p) => s.piezas.has(p.id)) && PIEZAS.some((p) => p.panel && s.piezas.has(p.id)) && (!s.extra || s.piezas.has('espectro'));
  return { req, ok: req && m.rm <= 1.2 && m.rp <= 1.2 && m.rc <= 1.2, m };
}
const probFases = () => [Math.round((100 - riesgoLanz()) * 10) / 10, 94 - (rutaSel()?.dp ?? 0), sitioSel()?.p ?? 95, 96];
const semaforo = (p) => (p >= 90 ? 'ok' : p >= 80 ? 'tol' : 'mal');
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
  { id: 'hola', chief: { es: '¡Bienvenido a bordo! Soy el Jefe de Misión. Aprenderás a jugar con una misión de práctica. Es un simulacro. No arriesgas nada.', en: 'Welcome aboard! I am the Mission Chief. You will learn to play with a practice mission. It is a drill. Nothing is at risk.' }, escena: escHola },
  { id: 'juego', chief: { es: 'Project Orbit es un juego en equipo. Hasta cuatro personas diseñan una misión espacial real. Cada persona lleva un departamento. Todo el equipo gana o pierde junto. Si falta un jugador, su departamento queda vacante. Cualquiera puede manejarlo.', en: 'Project Orbit is a team game. Up to four people design a real space mission. Each person runs one department. The whole team wins or loses together. If a player is absent, that department stays vacant. Anyone can run it.' }, escena: escDeptos },
  { id: 'fases', chief: { es: 'Este es el camino de cada partida. Primero viene el briefing. Después diseñas, revisas, votas GO o NO-GO, lanzas, vuelas y lees el informe. Hoy lo haremos todo en un simulacro corto, con la sala de control incluida.', en: 'This is the path of each game. First comes the briefing. Then you design, review, vote GO or NO-GO, launch, fly, and read the report. Today you will play all of it in a short drill, control room included.' }, escena: escFases },
  { id: 'briefing', chief: { es: 'Briefing. Lee tu expediente. Indica el destino, el presupuesto y los objetivos de ciencia. El objetivo PRIORITARIO es obligatorio. Un objetivo opcional da más ciencia, pero pide más instrumentos. Haz clic en un objetivo para marcarlo.', en: 'Briefing. Read your dossier. It gives the destination, the budget, and the science goals. The PRIORITY goal is mandatory. An optional goal gives more science, but it needs more instruments. Click a goal to mark it.' }, escena: escBriefing, gate: () => S.obj },
  { id: 'diseno', chief: { es: 'Diseño. Monta un chasis, una cámara, una antena y un panel solar (●). Cada barra muestra qué porcentaje del límite usas. Hasta el 100 %, estás dentro del límite. Del 100 % al 120 %, estás en tolerancia. La revisión pasa, pero sube el riesgo. Por encima del 120 %, la revisión falla. Compra también el seguro. Lo necesitarás en el vuelo.', en: 'Design. Mount a frame, a camera, an antenna, and a solar panel (●). Each bar shows the percentage of the limit you use. Up to 100 %, you are within the limit. From 100 % to 120 %, you are in tolerance. The review passes, but the risk grows. Above 120 %, the review fails. Buy the insurance too. You will need it in flight.' }, escena: escDiseno, gate: () => disenoValido().ok },
  { id: 'control', chief: { es: 'Sala de control. Es la pared grande de la sala. Cambia con la fase: planificación, GO / NO-GO, operaciones e informe. Pulsa cada pestaña para ver qué hace.', en: 'Control room. It is the big wall of the room. It changes with the phase: planning, GO / NO-GO, operations, and report. Click each tab to see what it does.' }, escena: escControl, gate: () => S.vistos.size === 4 },
  { id: 'ruta', chief: { es: 'Ruta. Elige cómo viaja la nave. Un viaje directo es rápido, pero gasta más propelente. Ese propelente pesa y sube la barra de masa. Un viaje largo con sobrevuelo gasta menos, pero la nave queda expuesta más tiempo. Eso sube el riesgo en el crucero. Elige una ruta que quepa en las barras.', en: 'Route. Choose how the spacecraft travels. A direct trip is fast, but it burns more propellant. That propellant weighs on the mass bar. A long trip with a flyby burns less, but the spacecraft stays exposed for longer. That raises the risk in cruise. Choose a route that fits the bars.' }, escena: escRuta, gate: () => !!S.ruta && disenoValido().ok },
  { id: 'mes', chief: { es: 'Mes de lanzamiento. El mejor mes gasta menos propelente. Cada mes lejos de él suma propelente extra, y pesa en la barra de masa. El reloj corre en tiempo real, así que no puedes lanzar en un mes que ya pasó. El plazo de los inversores es junio. Elige un mes o pulsa «Ir a la mejor ventana».', en: 'Launch month. The best month burns the least propellant. Each month away from it adds extra propellant, and it weighs on the mass bar. The clock runs in real time, so you cannot launch in a month that has passed. The investor deadline is June. Choose a month or press "Go to the best window".' }, escena: escMes, gate: () => S.mes != null && disenoValido().ok },
  { id: 'sitio', chief: { es: 'Sitio de aterrizaje. Ciencia propone sitios y Vuelo comprueba que son seguros. Usa las capas de datos del mapa. Activa la capa Pendiente. Un sitio inclinado es un riesgo: una nave real se volcó en 2024 al aterrizar en una ladera. Elige un sitio.', en: 'Landing site. Science proposes sites and Flight checks that they are safe. Use the data layers on the map. Turn on the Slope layer. A steep site is a risk: a real lander tipped over in 2024 after it landed on a slope. Choose a site.' }, escena: escSitio, gate: () => !!S.sitio },
  { id: 'go', chief: { es: 'Revisión y GO / NO-GO. Cada departamento revisa su parte. Después firma GO en su consola. Hacen falta las cuatro firmas. Si cambias el diseño, la ruta, el mes o el sitio, las firmas se borran. Entonces firmas otra vez. Pulsa cada lámpara.', en: 'Review and GO / NO-GO. Each department checks its part. Then it signs GO at its console. You need all four signatures. If you change the design, the route, the month, or the site, the signatures clear. Then you sign again. Press each lamp.' }, escena: escGo, gate: () => S.firmas.size === 4 && disenoValido().ok },
  { id: 'lanzar', chief: { es: 'Lanzamiento. Todo está listo. Mira el riesgo de fallo. Sube cuando la masa pasa el límite. Si el lanzamiento falla, la misión termina. ¡Inicia la cuenta atrás!', en: 'Launch. Everything is ready. Look at the failure risk. It grows when the mass is over the limit. If the launch fails, the mission ends. Start the countdown!' }, escena: escLanzar, gate: () => S.lanzado },
  { id: 'vuelo', chief: { es: 'Operaciones. Esta consola muestra la secuencia, los mensajes y la telemetría. Cada fase tiene un semáforo con su probabilidad. Pulsa NEXT para avanzar. Si sale un evento malo, solo el departamento dueño de la contingencia puede activarla. Antes de eso, no puedes avanzar.', en: 'Operations. This console shows the sequence, the messages, and the telemetry. Each phase has a light with its probability. Press NEXT to advance. If a bad event appears, only the department that owns the contingency can activate it. You cannot advance before that.' }, escena: escVuelo, gate: () => S.fin },
  { id: 'informe', chief: () => (S.resultado?.total
    ? { es: '¡Misión total! Tu seguro anuló la tormenta. Toda la ciencia llegó a casa. Así se juega: diseña con margen, asegura lo que puede fallar y firma con tu equipo. Vuela otra vez para mejorar la puntuación.', en: 'Full mission! Your insurance cancelled the storm. All the science came home. This is the game: design with margin, insure what can fail, and sign together. Fly again to get a better score.' }
    : { es: 'Misión parcial. No tenías seguro, así que la tormenta quitó el 15 % de la ciencia. En el juego real, el informe explica cada causa. Después pulsas «Volver a volar» y rediseñas. Inténtalo otra vez y compra el seguro.', en: 'Partial mission. You had no insurance, so the storm removed 15 % of the science. In the real game, the report explains each cause. Then you press "Fly again" and redesign. Try again and buy the insurance.' }), escena: escInforme },
  { id: 'regalo', chief: { es: '¡Entrenamiento completo! Toma este Manual de juego. Reúne las reglas, los números y los controles en capítulos. Léelo aquí. El manual completo, con fórmulas, está en el portátil de tu asiento. ¡Buena suerte, astronauta!', en: 'Training complete! Take this Game manual. It lists the rules, the numbers, and the controls in chapters. Read it here. The full manual, with formulas, is on the laptop at your seat. Good luck, astronaut!' }, escena: escRegalo },
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
    h('p', { class: 'tt-tenue' }, idioma() === 'es' ? 'Tiempo estimado: 3 minutos. Puedes cerrar el tutorial cuando quieras.' : 'Estimated time: 3 minutes. You can close the tutorial any time.')));
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
    h('p', { class: 'tt-tenue' }, idioma() === 'es' ? 'El reloj de misión corre en tiempo real mientras diseñas. Un mes dura 1 minuto con 4 jugadores. Dura más con menos jugadores.' : 'The mission clock runs in real time while you design. One month lasts 1 minute with 4 players. It lasts longer with fewer players.'));
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
      marca('extra', idioma() === 'es' ? 'Analizar el suelo' : 'Analyse the soil', idioma() === 'es' ? 'Pide: espectrómetro. Da más ciencia. Suma masa y consumo.' : 'Needs: a spectrometer. It gives more science. It adds mass and power use.', T.opcional, false)));
  if (!S.obj) el.append(h('p', { class: 'tt-tenue' }, idioma() === 'es' ? 'Marca el objetivo prioritario para continuar.' : 'Mark the priority goal to continue.'));
}

function barra(nombre, usado, limite, razon, unidad) {
  const e = estadoRazon(razon);
  const pct = Math.min(100, (Number.isFinite(razon) ? razon : 2) / 1.4 * 100);
  return h('div', { class: 'tt-barra ' + e },
    h('div', { class: 'tt-barra-cab' }, h('span', {}, nombre), h('span', {}, `${usado} / ${limite} ${unidad}`), h('strong', {}, fmtP(razon))),
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
  if (!v.req) { msg = s.extra && !s.piezas.has('espectro') ? (idioma() === 'es' ? 'Marcaste «Analizar el suelo». Necesitas el espectrómetro.' : 'You marked "Analyse the soil". You need the spectrometer.') : T.faltan + ' (●)'; cls += ' aviso'; }
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


// Barras de recursos con el estado de la revisión (para los pasos de ruta y mes, que suman masa y precio).
function bloqueBarras() {
  const v = disenoValido(), m = v.m;
  const mx = Math.max(m.rm, m.rp, m.rc);
  let txt = T.dentro, cls = 'tt-ayuda';
  if (!v.ok) { txt = T.fuera + (idioma() === 'es' ? ' Elige una opción más ligera o vuelve al diseño.' : ' Choose a lighter option or go back to the design.'); cls += ' mal'; }
  else if (mx > 1) { txt = T.tolerancia; cls += ' aviso'; }
  return [barra(T.masa, m.m, LIM.masa, m.rm, 'kg'), barra(T.potencia, m.uso, m.sum, m.rp, 'W'), barra(T.presupuesto, m.c, LIM.presupuesto, m.rc, 'M'),
    h('p', { class: 'tt-riesgo' }, `${T.riesgoLanz}: ${riesgoLanz().toString().replace('.', idioma() === 'es' ? ',' : '.')} %`), h('p', { class: cls }, txt)];
}
const cambiar = (f) => () => { f(); S.firmas.clear(); efecto('confirmar'); pintarPaso({ decirTexto: false }); };

// Pared de la sala de control: cuatro pestañas. Las cajas son un esquema de lo que muestra cada modo.
const PARED = [
  { id: 'plan', t: () => T.tabPlan, cajas: { es: ['RUTA', 'MES DE LANZAMIENTO', 'SITIO / ÓRBITA'], en: ['ROUTE', 'LAUNCH MONTH', 'SITE / ORBIT'] },
    d: { es: ['Aquí eliges la ruta, el mes de lanzamiento y el sitio.', 'Solo Vuelo y Mecánica fija la ruta y el mes.', 'Vuelo y Mecánica o Ciencia pueden elegir el sitio.', 'Los cuatro departamentos ven esta pantalla.'],
      en: ['Here you choose the route, the launch month, and the site.', 'Only Flight & Mechanics sets the route and the month.', 'Flight & Mechanics or Science can choose the site.', 'All four departments see this screen.'] } },
  { id: 'go', t: () => T.tabGo, cajas: { es: ['VUELO', 'CIENCIA', 'ENERGÍA', 'COMUNICACIONES'], en: ['FLIGHT', 'SCIENCE', 'POWER', 'COMMS'] },
    d: { es: ['Cada departamento firma GO en su consola.', 'Con las cuatro firmas, pulsas Lanzar.', 'Si algo cambia, las firmas se borran.'],
      en: ['Each department signs GO at its console.', 'With all four signatures, you press Launch.', 'If anything changes, the signatures clear.'] } },
  { id: 'ops', t: () => T.tabOps, cajas: { es: ['SECUENCIA', 'VISTA ORBITAL', 'MENSAJES', 'TELEMETRÍA'], en: ['SEQUENCE', 'ORBIT VIEW', 'MESSAGES', 'TELEMETRY'] },
    d: { es: ['Ves la secuencia de la misión, la órbita, los mensajes y la telemetría.', 'Pulsa «Siguiente paso» para avanzar.', 'Si sale un evento, el departamento dueño activa la contingencia.'],
      en: ['You see the mission sequence, the orbit, the messages, and the telemetry.', 'Press "Next step" to advance.', 'If an event appears, the owning department activates the contingency.'] } },
  { id: 'inf', t: () => T.tabInf, cajas: { es: ['VEREDICTO', 'CIENCIA', 'CAUSAS', 'MISIÓN REAL'], en: ['VERDICT', 'SCIENCE', 'CAUSES', 'REAL MISSION'] },
    d: { es: ['Ves el veredicto, la ciencia lograda y las causas.', 'También ves la misión real, para comparar.', 'Desde aquí vuelves a volar o empiezas otra misión.'],
      en: ['You see the verdict, the science achieved, and the causes.', 'You also see the real mission, to compare.', 'From here you fly again or start another mission.'] } },
];
function escControl(el) {
  const sel = PARED[S.tab];
  S.vistos.add(sel.id);
  const tabs = h('div', { class: 'tt-tabs', role: 'tablist' }, PARED.map((x, i) => h('button', { class: 'tt-tab' + (i === S.tab ? ' on' : '') + (S.vistos.has(x.id) && i !== S.tab ? ' visto' : ''), type: 'button', role: 'tab',
    onclick: () => { S.tab = i; efecto('clic'); pintarPaso({ decirTexto: false }); } }, x.t())));
  const pared = h('div', { class: 'tt-pared', 'aria-label': T.pared }, h('div', { class: 'tt-pared-cab' }, '◉ CONTROL · ', sel.t()),
    h('div', { class: 'tt-pared-cajas c' + sel.cajas.es.length }, L(sel.cajas).map((c) => h('div', { class: 'tt-pared-caja' }, h('span', {}, c)))));
  const consolas = h('div', { class: 'tt-pared-consolas', 'aria-hidden': 'true' }, Object.values(DEPS).map((d) => h('i', { style: `--c:${d.color}` })));
  el.append(h('div', { class: 'tt-control' }, h('div', {}, tabs, pared, consolas), h('div', { class: 'tt-control-txt' }, h('h3', { class: 'tt-h' }, sel.t()), h('ul', {}, L(sel.d).map((x) => h('li', {}, x))),
    S.vistos.size < 4 ? h('p', { class: 'tt-tenue' }, T.verTodas) : null)));
}

function escRuta(el) {
  const tarjetas = RUTAS.map((r) => h('button', { class: 'tt-pieza tt-ruta' + (S.ruta === r.id ? ' on' : ''), type: 'button', style: `--c:${DEPS.vuelo.color}`, 'aria-pressed': S.ruta === r.id, onclick: cambiar(() => { S.ruta = r.id; }) },
    h('span', { class: 'tt-lampara' }), h('strong', {}, L(r.n)), h('span', { class: 'tt-dep' }, `${T.riesgoCr}: +${r.dp} ${T.pts}`),
    h('span', { class: 'tt-num' }, `${r.dias} ${T.dias} · +${r.prop} kg · ${r.c} M`)));
  el.append(h('div', { class: 'tt-diseno' }, h('div', {}, h('h3', { class: 'tt-h' }, T.rutas), h('div', { class: 'tt-piezas' }, tarjetas),
    h('p', { class: 'tt-tenue' }, idioma() === 'es' ? '«+kg» es el propelente de la ruta. Pesa como una pieza más.' : '"+kg" is the propellant of the route. It weighs like one more part.')),
    h('div', {}, h('h3', { class: 'tt-h' }, T.barras), bloqueBarras())));
}

function escMes(el) {
  const mejor = MESES.findIndex((x) => x.mejor), maxE = Math.max(...MESES.map((x) => x.extra));
  const cols = MESES.map((x, i) => h('button', { class: 'tt-mes' + (S.mes === i ? ' on' : '') + (i === mejor ? ' mejor' : ''), type: 'button', 'aria-pressed': S.mes === i, onclick: cambiar(() => { S.mes = i; }) },
    h('span', { class: 'tt-mes-kg' }, `+${x.extra} kg`), h('i', { style: `height:${12 + (x.extra / maxE) * 48}px` }), h('strong', {}, L(x.n)),
    h('em', {}, i === mejor ? T.mejor : i === MESES.length - 1 ? T.plazoMes : '\u00a0')));
  el.append(h('div', { class: 'tt-diseno' }, h('div', {}, h('h3', { class: 'tt-h' }, T.extraKg), h('button', { class: 'boton tt-mejor', type: 'button', onclick: cambiar(() => { S.mes = mejor; }) }, '★ ' + T.mejorVentana), h('div', { class: 'tt-meses' }, cols),
    h('p', { class: 'tt-tenue' }, T.ahoraPlazo)),
    h('div', {}, h('h3', { class: 'tt-h' }, T.barras), bloqueBarras())));
}

function escSitio(el) {
  const pend = S.capa === 'pendiente';
  const crateres = [[60, 60, 34], [150, 110, 48], [250, 55, 28], [330, 120, 38], [120, 190, 30], [235, 190, 26]];
  const mapa = h('div', { class: 'tt-mapa-wrap' });
  mapa.innerHTML = `<svg class="tt-mapa" viewBox="0 0 380 230" role="img" aria-label="${T.capas}"><rect width="380" height="230" fill="${pend ? '#2d3340' : '#8e9296'}"/>
    ${crateres.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${pend ? '#262b36' : '#7b7f84'}" stroke="${pend ? '#39404f' : '#a9adb1'}" stroke-width="3"/>`).join('')}
    ${pend ? `<circle cx="95" cy="150" r="46" fill="#3fa66b" opacity=".55"/><circle cx="290" cy="165" r="50" fill="#3fa66b" opacity=".55"/><circle cx="205" cy="70" r="58" fill="#e0b040" opacity=".5"/><circle cx="205" cy="70" r="32" fill="#d05050" opacity=".65"/>` : ''}
    ${SITIOS.map((x) => `<g class="tt-marca-sitio${S.sitio === x.id ? ' on' : ''}" data-s="${x.id}" tabindex="0" role="button" aria-label="${L(x.n)}"><circle cx="${x.x}" cy="${x.y}" r="13" fill="#f3ead6" stroke="#1d2a3a" stroke-width="3"/><text x="${x.x}" y="${x.y + 5}" text-anchor="middle" font-family="Press Start 2P, monospace" font-size="12" fill="#1d2a3a">${x.id}</text></g>`).join('')}</svg>`;
  const elegir = (id) => cambiar(() => { S.sitio = id; })();
  mapa.querySelectorAll('[data-s]').forEach((g) => { g.addEventListener('click', () => elegir(g.dataset.s)); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(g.dataset.s); } }); });
  const capa = (id, txt) => h('button', { class: 'boton chico' + (S.capa === id ? ' on' : ''), type: 'button', 'aria-pressed': S.capa === id, onclick: () => { S.capa = id; efecto('clic'); pintarPaso({ decirTexto: false }); } }, txt);
  const fichas = SITIOS.map((x) => h('button', { class: 'tt-pieza tt-sitio' + (S.sitio === x.id ? ' on' : ''), type: 'button', style: `--c:${x.pend > 12 ? 'var(--lp-mal)' : 'var(--lp-ok)'}`, 'aria-pressed': S.sitio === x.id, onclick: () => elegir(x.id) },
    h('span', { class: 'tt-lampara' }), h('strong', {}, `${x.id} · ${L(x.n)}`), h('span', { class: 'tt-dep' }, `${T.rocas}: ${L(x.rocas)} · ${T.interes}: ${L(x.interes)}`),
    h('span', { class: 'tt-num' }, `${x.pend}° · ${x.p} %`)));
  const sel = sitioSel();
  el.append(h('div', { class: 'tt-diseno' }, h('div', {}, h('h3', { class: 'tt-h' }, T.capas), h('div', { class: 'tt-capas' }, capa('relieve', T.capaRelieve), capa('pendiente', T.capaPend)), mapa,
    h('p', { class: 'tt-tenue' }, T.leyenda)),
    h('div', {}, h('h3', { class: 'tt-h' }, T.sitios), h('div', { class: 'tt-piezas' }, fichas),
      h('p', { class: 'tt-tenue' }, `${T.pendiente} · ${T.pAter}`),
      sel ? h('p', { class: 'tt-ayuda ' + (sel.p < 90 ? 'aviso' : ''), }, sel.p < 90 ? T.sitioAlto : T.sitioLlano) : null)));
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
  const cohete = h('div', { class: 'tt-cohete' + (S.lanzado ? ' sube' : '') });
  cohete.innerHTML = '<svg viewBox="0 0 40 90" width="56" height="120" aria-hidden="true"><polygon points="20,2 30,26 30,66 10,66 10,26" fill="#e9e4da"/><polygon points="20,2 30,26 10,26" fill="#d9822b"/><circle cx="20" cy="40" r="5" fill="#62c6ff"/><polygon points="10,66 2,80 10,76" fill="#d9822b"/><polygon points="30,66 38,80 30,76" fill="#d9822b"/><polygon class="llama" points="14,68 20,88 26,68" fill="#f2b844"/></svg>';
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
    h('p', { class: 'tt-tenue' }, idioma() === 'es' ? 'Es un simulacro. Los dados son amistosos. El lanzamiento saldrá bien.' : 'This is a drill. The dice are friendly. The launch will succeed.'),
    cuenta, btn)));
}

const MENSAJES = [
  { es: 'Motores encendidos. El ascenso es nominal.', en: 'Engines lit. The ascent is nominal.' }, { es: 'Crucero hacia la Luna. El enlace es estable.', en: 'Cruise to the Moon. The link is stable.' },
  { es: 'Descenso al sitio de aterrizaje.', en: 'Descent to the landing site.' }, { es: 'Aterrizaje confirmado. La cámara envía datos.', en: 'Landing confirmed. The camera sends data.' },
];
const TELEMETRIA = [{ pot: 100, datos: 0 }, { pot: 92, datos: 0 }, { pot: 88, datos: 0 }, { pot: 90, datos: 120 }];
function escVuelo(el) {
  const fases = T.fases, pr = probFases();
  const idx = S.fin ? 3 : S.fase;
  const lista = h('ol', { class: 'tt-fases' }, fases.map((f, i) => h('li', { class: S.fin || i < S.fase ? 'hecha' : i === S.fase ? 'ahora' : '' }, h('span', { class: 'tt-n' }, i + 1), h('span', {}, f),
    h('b', { class: 'tt-chip ' + semaforo(pr[i]), title: T.exito }, `${Math.round(pr[i])} %`))));
  const tele = TELEMETRIA[idx];
  const consola = h('div', { class: 'tt-ops' },
    h('div', { class: 'tt-ops-caja' }, h('h4', {}, T.mensajes), h('p', {}, L(MENSAJES[idx]))),
    h('div', { class: 'tt-ops-caja' }, h('h4', {}, T.telemetria), h('p', {}, `${T.energia}: ${tele.pot} %`), h('p', {}, `${T.enlace}: ${T.estable}`), h('p', {}, `${T.datosRec}: ${tele.datos} MB`)));
  const cuerpo = h('div', { class: 'tt-evento-zona' });
  const ev = S.evento;
  const nuevo = S.nuevoEv ? ' nuevo' : '';
  S.nuevoEv = false; // la animación de entrada solo corre al cambiar el evento, no en cada fase
  if (ev === 'pendiente') {
    cuerpo.append(h('div', { class: 'tt-evento' + nuevo },
      h('strong', {}, '⚠ ' + T.eventoTit), h('p', {}, T.tormenta),
      h('p', { class: 'tt-tenue' }, S.seguro ? `${T.responsable}: ${L(DEPS.comms.n)}. ${T.esperaDepto}` : T.sinCobertura),
      S.seguro
        ? h('button', { class: 'boton primario', type: 'button', onclick: () => { S.evento = 'anulado'; S.nuevoEv = true; efecto('contingencia'); pintarPaso({ decirTexto: false }); } }, T.activarComo)
        : h('button', { class: 'boton peligro', type: 'button', onclick: () => { S.evento = 'dano'; S.nuevoEv = true; efecto('aviso'); pintarPaso({ decirTexto: false }); } }, T.aceptar)));
  } else if (ev === 'anulado') cuerpo.append(h('div', { class: 'tt-evento ok' + nuevo }, h('strong', {}, '✔ ' + T.anulado)));
  else if (ev === 'dano') cuerpo.append(h('div', { class: 'tt-evento mal' + nuevo }, h('strong', {}, '✖ ' + T.dano)));
  const next = h('button', { class: 'boton primario', type: 'button', disabled: S.fin || ev === 'pendiente', onclick: () => {
    efecto('fase');
    if (S.fase < 3) {
      S.fase += 1;
      if (S.fase === 1 && !S.evento) { S.evento = 'pendiente'; S.nuevoEv = true; efecto('evento'); }
    } else {
      S.fin = true;
      S.resultado = { total: !!S.seguro, ciencia: 100 * (S.seguro ? 1 : 0.85) };
    }
    pintarPaso({ decirTexto: false });
  } }, S.fin ? '✔' : T.next + ' ▶');
  el.append(h('h3', { class: 'tt-h' }, T.secuencia), lista, consola, cuerpo, h('div', { class: 'tt-vuelo-acc' }, next));
}

function escInforme(el) {
  const m = medidas();
  const r = S.resultado ?? { total: !!S.seguro, ciencia: 85 };
  const ciencia = Math.round(r.ciencia);
  const si = sitioSel(), ru = rutaSel(), me = S.mes != null ? MESES[S.mes] : null, es = idioma() === 'es';
  const puntos = Math.round(ciencia * (S.extra ? 12 : 8) + (si?.bonus ?? 0) - Math.max(0, m.c - LIM.presupuesto) * 10);
  el.append(h('div', { class: 'tt-informe' },
    h('h3', { class: 'tt-h' }, T.informe),
    h('div', { class: 'tt-veredicto ' + (r.total ? 'ok' : 'aviso') }, T.veredicto + ': ', h('strong', {}, r.total ? T.total : T.parcial)),
    h('div', { class: 'tt-stats' },
      h('div', {}, h('span', {}, T.ciencia), h('strong', {}, ciencia + ' %')),
      h('div', {}, h('span', {}, T.gastado), h('strong', {}, `${m.c} / ${LIM.presupuesto} M`)),
      h('div', {}, h('span', {}, T.puntos), h('strong', {}, puntos))),
    h('ul', { class: 'tt-causas' },
      h('li', {}, idioma() === 'es' ? (S.seguro ? 'La contingencia «Modo seguro» anuló la tormenta solar.' : 'No compraste contingencia. La tormenta solar quitó el 15 % de la ciencia.') : (S.seguro ? 'The "Safe mode" contingency cancelled the solar storm.' : 'You bought no contingency. The solar storm removed 15 % of the science.')),
      h('li', {}, idioma() === 'es' ? (S.extra ? 'Cubriste el objetivo opcional. Conseguiste más ciencia.' : 'Elegiste solo el objetivo prioritario. El riesgo es menor y la ciencia también.') : (S.extra ? 'You covered the optional goal. You got more science.' : 'You chose the priority goal only. The risk is lower, and the science is lower.')),
      ru ? h('li', {}, es ? `Ruta «${L(ru.n)}»: ${ru.dias} días y +${ru.prop} kg de propelente. Riesgo en crucero: +${ru.dp} puntos.` : `Route "${L(ru.n)}": ${ru.dias} days and +${ru.prop} kg of propellant. Cruise risk: +${ru.dp} points.`) : null,
      me ? h('li', {}, me.extra === 0 ? (es ? 'Lanzaste en el mejor mes: sin propelente extra.' : 'You launched in the best month: no extra propellant.') : (es ? `Lanzaste lejos del mejor mes: +${me.extra} kg de propelente.` : `You launched away from the best month: +${me.extra} kg of propellant.`)) : null,
      si ? h('li', {}, si.p < 90
        ? (es ? `El sitio «${L(si.n)}» es inclinado (${si.pend}°) y daba solo un ${si.p} % de éxito. En el juego real, ese riesgo puede terminar la misión. A cambio, la ciencia fue mayor.` : `The site "${L(si.n)}" is steep (${si.pend}°) and gave only ${si.p} % success. In the real game, that risk can end the mission. In return, the science was higher.`)
        : (es ? `El sitio «${L(si.n)}» es llano (${si.pend}°) y dio un ${si.p} % de éxito en el aterrizaje.` : `The site "${L(si.n)}" is flat (${si.pend}°) and gave ${si.p} % landing success.`)) : null,
      h('li', {}, idioma() === 'es' ? 'El informe real también cuenta los datos perdidos y compara tu misión con la misión real.' : 'The real report also counts the lost data and compares your mission with the real mission.'))));
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
  if (!m) { m = h('dialog', { id: 'dlg-manual-regalo', class: 'dialogo dialogo-ancho tt-manual laptop-so' }); document.body.append(m); }
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
  m.replaceChildren(h('div', { class: 'lp-ventana-titulo tt-m-titulo' }, h('span', {}, T.regaloT), h('span', { class: 'lp-ventana-botones', 'aria-hidden': 'true' }, '▁ ▢ ✕')), h('div', { class: 'tt-m-marco' }, h('nav', {}, h('p', { class: 'tt-tenue' }, T.indice), indice), cuerpo), h('div', { class: 'acciones' }, cerrarB));
  m.showModal();
}

// ---------- Apertura y cierre ----------
function cerrar() { dlg?.close(); }

function crearDialogo() {
  // Misma piel que el portátil (AGENCIA·OS): barra de tareas, escritorio azul y dos ventanas crema (estilos/escritorio.css + tutorial.css).
  dlg = h('dialog', { id: 'dlg-tutorial', class: 'tt laptop-so', 'aria-label': T.titulo });
  const puntos = PASOS.map(() => h('i', {}));
  const pasoTxt = h('span', { class: 'tt-paso' });
  const barra = h('header', { class: 'lp-barra tt-taskbar' }, h('span', { class: 'lp-logo' }, 'AGENCY·OS'), h('span', { class: 'tt-tit' }, T.titulo),
    h('div', { class: 'tt-puntos' }, puntos), pasoTxt,
    h('button', { class: 'boton peligro tt-saltar', type: 'button', onclick: () => { efecto('clic'); cerrar(); } }, '✕ ' + T.saltar));
  const botonesVentana = () => h('span', { class: 'lp-ventana-botones', 'aria-hidden': 'true' }, '▁ ▢ ✕');
  const escena = h('div', { class: 'lp-ventana-cuerpo tt-escena' });
  const ret = retrato();
  const texto = h('p', { class: 'tt-texto', 'aria-live': 'polite' });
  const atras = h('button', { class: 'boton', type: 'button', onclick: () => ir(-1) });
  const sig = h('button', { class: 'boton primario', type: 'button', onclick: () => ir(1) });
  const dialogo = h('div', { class: 'tt-dialogo', onclick: (e) => { if (!e.target.closest('button')) ui.completo?.(); } }, texto, h('div', { class: 'tt-acc' }, atras, sig));
  const ventEscena = h('section', { class: 'lp-ventana tt-vent-escena' }, h('div', { class: 'lp-ventana-titulo' }, h('span', { class: 'tt-vt' }, T.ventana), botonesVentana()), escena);
  const ventChief = h('section', { class: 'lp-ventana tt-vent-chief' }, h('div', { class: 'lp-ventana-titulo' }, h('span', { class: 'tt-nombre' }, T.jefe), botonesVentana()),
    h('div', { class: 'lp-ventana-cuerpo tt-chief' }, ret, dialogo));
  dlg.append(h('div', { class: 'tt-marco' }, barra, h('div', { class: 'tt-cuerpo' }, ventEscena, ventChief)));
  document.body.append(dlg);
  ui = { escena, texto, retrato: ret, sig, atras, puntos, pasoTxt, completo: null };
  dlg.addEventListener('close', () => { limpiarTemporizadores(); S = nuevo(); });
  dlg.addEventListener('cancel', () => efecto('clic'));
  addEventListener('idioma', () => {
    if (!dlg?.open) return;
    barra.querySelector('.tt-tit').textContent = T.titulo; barra.querySelector('.tt-saltar').textContent = '✕ ' + T.saltar;
    ventEscena.querySelector('.tt-vt').textContent = T.ventana; ventChief.querySelector('.tt-nombre').textContent = T.jefe; pintarPaso();
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
