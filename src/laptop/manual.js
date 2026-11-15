// App del portátil "Manual SOP": carpeta de procedimientos operativos, uno por departamento (Vuelo, Ciencia, Energía, Comunicaciones).
// Contrato del host: appManual(c, { rol }) devuelve el nodo raíz (100 % de su contenedor, scroll interno en la página con data-scroll="sop-<rol>").
// También se muestra dentro del modal de la carpeta física de la mesa 3D.
// appManualJuego(c) es la segunda app: el Manual de juego (tutorial general en capítulos). Los SOP solo llevan lo propio de cada rol
// y enlazan a los capítulos del Manual de juego; el SOP también tiene una pestaña "Manual de juego".
// Estado local: c.ui.manual = { rol, seccion, base, vista, cap }   (rol = departamento que se lee; base = rol con el que se abrió; vista 'rol' | 'juego'; cap = capítulo).
// Los números y fórmulas salen de reglas/motor.js y reglas/despliegue.js; el anexo de misión sale de c.mision / c.D.
import { textos, tx, idioma, depto } from '../i18n.js';
import { h, valor, dinero, lista, redondear, resumenSeguro, ROL_COLOR } from '../pantallas/ui.js';

import { T as TU } from '../textos.js';

const ROLES = ['vuelo', 'ciencia', 'potencia', 'comms'];

const val = (c, x, u) => valor(c, x, u);
const valorDinero = (c, x) => valor(c, x, 'M USD');

// Matemáticas: KaTeX se carga bajo demanda (importmap). Si no carga, se queda el código TeX en monoespaciada.
let katexP = null;
const cargarKatex = () => (katexP ??= import('katex').then((m) => m.default ?? m).catch(() => null));
// El TeX se escribe en español; en inglés se traducen las palabras dentro de \text{...} y la coma decimal.
const PAL = { usada: 'used', usado: 'used', ruta: 'route', cohete: 'rocket', tope: 'cap', sombra: 'shadow', enlace: 'link', baj: 'dl', días: 'days', día: 'day', lím: 'lim', antena: 'antenna', objetivo: 'goal', montados: 'mounted', pedidos: 'asked', perdidos: 'lost', cob: 'cov', eventos: 'events', margen: 'margin' };
const trad = (tex) => (idioma() === 'es' ? tex : tex.replace(/\\text\{([^}]*)\}/g, (_, t) => '\\text{' + t.replace(/[A-Za-zÀ-ÿ]+/g, (w) => PAL[w] ?? w) + '}').replace(/\{,\}/g, '.'));
function mate(tex0, bloque) {
  const tex = trad(Array.isArray(tex0) ? L(tex0) : tex0);
  const el = h(bloque ? 'div' : 'span', { class: 'sop-tex' + (bloque ? ' blq' : '') }, h('code', {}, tex));
  cargarKatex().then((k) => {
    if (!k) return;
    try { el.innerHTML = k.renderToString(tex, { displayMode: !!bloque, throwOnError: true, strict: 'ignore' }); } catch { /* se queda el TeX */ }
  });
  return el;
}

// Ecuaciones del manual. tex: texto TeX (o [es, en] si lleva \text{} en el idioma activo). leg: [símbolo TeX, es, en].
const LEG_MASA = [
  ['m_i', 'masa de la pieza i (con la opción elegida)', 'mass of part i (with the chosen option)'],
  ['m_{\\text{ruta}}', 'masa de la ruta', 'route mass'],
  ['m_{\\text{cont},j}', 'masa de cada contingencia comprada', 'mass of each bought contingency'],
];
const LEG_DATOS = [
  ['D_{\\text{gen}}', 'datos generados por día (MB/día)', 'data generated per day (MB/day)'],
  ['r_i', 'tasa de la pieza i (kbps)', 'rate of part i (kbps)'],
  ['u_i', 'horas de uso al día de la pieza i (24 si no tiene control de uso)', 'usage hours per day of part i (24 if it has no usage control)'],
  ['0{,}45', 'MB por cada kbps durante una hora', 'MB per kbps over one hour'],
];
const COV = {
  tex: [String.raw`\text{cob}_i = \dfrac{n_{\text{montados}}}{n_{\text{pedidos}}} \cdot \min\!\Big(1,\ \dfrac{\bar{u}}{u_{\text{objetivo}}}\Big)`, String.raw`\text{cov}_i = \dfrac{n_{\text{mounted}}}{n_{\text{asked}}} \cdot \min\!\Big(1,\ \dfrac{\bar{u}}{u_{\text{goal}}}\Big)`],
  leg: [['\\text{cob}_i', 'cobertura del objetivo i (de 0 a 1)', 'coverage of goal i (0 to 1)'], ['n_{\\text{montados}}', 'instrumentos del objetivo que están a bordo', 'instruments of the goal that are on board'],
    ['n_{\\text{pedidos}}', 'instrumentos que necesita el objetivo', 'instruments the goal needs'], ['\\bar{u}', 'media de horas/día de los instrumentos montados', 'average hours/day of the mounted instruments'],
    ['u_{\\text{objetivo}}', 'horas/día que pide el objetivo', 'hours/day the goal asks for']],
};
const DATOS = { tex: String.raw`D_{\text{gen}}\,[\text{MB/día}] = \sum_i r_i\,[\text{kbps}] \cdot u_i\,[\text{h/día}] \cdot 0{,}45`, leg: LEG_DATOS };
const CAPBAJ = { tex: String.raw`C_{\text{baj}}\,[\text{MB/día}] = \sum_j b_j\,[\text{kbps}] \cdot t_{\text{enlace}}\,[\text{h/día}] \cdot 0{,}45`,
  leg: [['C_{\\text{baj}}', 'capacidad de bajada por día', 'downlink capacity per day'], ['b_j', 'kbps de bajada de la antena j', 'downlink kbps of antenna j'], ['t_{\\text{enlace}}', 'horas de enlace con la Tierra al día', 'link hours with Earth per day']] };
const EQ = {
  ratio: { tex: String.raw`r = \dfrac{U}{L}`, leg: [['r', 'razón de la barra (1,00 = justo en el límite)', 'bar ratio (1.00 = exactly at the limit)'], ['U', 'lo que usa el diseño', 'what the design uses'], ['L', 'el límite de esa barra', 'the limit of that bar']] },
  tol: { tex: [String.raw`1 < r \le r_{\text{tol}} = 1{,}2`, String.raw`1 < r \le r_{\text{tol}} = 1.2`], leg: [['r_{\\text{tol}}', 'tolerancia: hasta un 20 % por encima del límite; por encima, la revisión falla', 'tolerance: up to 20 % above the limit; above it, the review fails']] },
  tolProb: { tex: [String.raw`\Delta p_{\text{fallo}} = 0{,}5\ \text{pp} \times 100\,(r - 1) \;\le\; 10\ \text{pp}`, String.raw`\Delta p_{\text{fail}} = 0.5\ \text{pp} \times 100\,(r - 1) \;\le\; 10\ \text{pp}`],
    leg: [['r', 'razón de la barra (entre 1,00 y 1,20)', 'bar ratio (between 1.00 and 1.20)'], ['\\Delta p_{\\text{fallo}}', 'puntos porcentuales que se suman a la probabilidad de fallo de la etapa relacionada', 'percentage points added to the failure probability of the related stage'], ['\\text{pp}', 'punto porcentual', 'percentage point']] },
  retraso: { tex: [String.raw`B' = B\,\big(1 - 0{,}04\,\max(0,\ \ell - 1)\big) \qquad \ell > 12 \Rightarrow \text{sin inversores}`, String.raw`B' = B\,\big(1 - 0.04\,\max(0,\ \ell - 1)\big) \qquad \ell > 12 \Rightarrow \text{investors pull out}`],
    leg: [['B,\\ B\'', 'presupuesto original y presupuesto tras el retraso', 'original budget and budget after the delay'], ['\\ell', 'meses de retraso sobre el plazo de los inversores', 'months late past the investor deadline'], ['0{,}04', 'recorte del 4 % por mes (pasado el primer mes de gracia)', '4 % cut per month (after the first month of grace)']] },
  propRetraso: { tex: [String.raw`m_{\text{prop}}(k) = m_{\text{prop}}(k_{\text{ópt}}) + \delta m \cdot |k - k_{\text{ópt}}|`, String.raw`m_{\text{prop}}(k) = m_{\text{prop}}(k_{\text{opt}}) + \delta m \cdot |k - k_{\text{opt}}|`],
    leg: [['k,\\ k_{\\text{ópt}}', 'mes elegido y mes de la ventana óptima', 'chosen month and month of the optimal window'], ['m_{\\text{prop}}', 'propelente (kg) que cuenta en la barra de masa', 'propellant (kg) counted in the mass bar'], ['\\delta m', 'kg extra por mes de desvío (depende del destino y del mes)', 'extra kg per month of deviation (depends on the destination and month)']] },
  dif: { tex: [String.raw`\text{eventos} = \begin{cases} 1 & N = 0 \\ 2 & N = 1 \\ 3 & N \ge 2 \end{cases}`, String.raw`\text{events} = \begin{cases} 1 & N = 0 \\ 2 & N = 1 \\ 3 & N \ge 2 \end{cases}`],
    leg: [['N', 'objetivos secundarios marcados', 'secondary goals ticked']] },
  pfase: { tex: String.raw`p_f = \min\!\Big(1,\ \max\!\big(0,\ p_{0,f} + \textstyle\sum_k \Delta p_k\big)\Big)`,
    leg: [['p_f', 'probabilidad de éxito de la fase f', 'success probability of phase f'], ['p_{0,f}', 'probabilidad base de la fase', 'base probability of the phase'], ['\\Delta p_k', 'mejora de cada pieza, contingencia o ruta a bordo', 'improvement from each part, contingency or route on board']] },
  kbps: { tex: [String.raw`1\ \text{kbps} \times 1\ \text{h} = \dfrac{1000 \times 3600}{8 \times 10^{6}}\ \text{MB} = 0{,}45\ \text{MB}`, String.raw`1\ \text{kbps} \times 1\ \text{h} = \dfrac{1000 \times 3600}{8 \times 10^{6}}\ \text{MB} = 0.45\ \text{MB}`],
    leg: [['\\text{kbps}', 'kilobits por segundo', 'kilobits per second'], ['\\text{h}', 'hora', 'hour'], ['\\text{MB}', 'megabytes (8 000 000 bits)', 'megabytes (8,000,000 bits)']] },
  h24: { tex: [String.raw`u_i = 24\ \text{h/día}`, String.raw`u_i = 24\ \text{h/day}`], leg: [['u_i', 'horas de uso al día de una pieza sin control de uso', 'usage hours per day of a part with no usage control']] },
  masaProc: { tex: [String.raw`m_{\text{usada}} = \sum_i m_i + m_{\text{ruta}} + \sum_j m_{\text{cont},j} \;\le\; C_{\text{cohete}}`, String.raw`m_{\text{used}} = \sum_i m_i + m_{\text{route}} + \sum_j m_{\text{cont},j} \;\le\; C_{\text{rocket}}`],
    leg: [['m_{\\text{usada}}', 'masa total que usa el diseño', 'total mass the design uses'], ...LEG_MASA, ['C_{\\text{cohete}}', 'capacidad del cohete hasta el destino', 'rocket capacity to the destination']] },
  masa: { tex: [String.raw`m_{\text{usada}}\,[\text{kg}] = \sum_i m_i + m_{\text{ruta}} + \sum_j m_{\text{cont},j}`, String.raw`m_{\text{used}}\,[\text{kg}] = \sum_i m_i + m_{\text{route}} + \sum_j m_{\text{cont},j}`],
    leg: [['m_{\\text{usada}}', 'masa total que usa el diseño', 'total mass the design uses'], ...LEG_MASA] },
  limMasa: { tex: [String.raw`L_m = \min\!\big(C_{\text{cohete}},\ M_{\text{tope}}\big)`, String.raw`L_m = \min\!\big(C_{\text{rocket}},\ M_{\text{cap}}\big)`],
    leg: [['L_m', 'límite de la barra de masa', 'limit of the mass bar'], ['C_{\\text{cohete}}', 'capacidad del cohete hasta el destino', 'rocket capacity to the destination'], ['M_{\\text{tope}}', 'tope de masa de la misión, si lo hay', 'mission mass cap, if there is one']] },
  margen: { tex: [String.raw`\text{margen} = L - U \qquad r = \dfrac{U}{L}`, String.raw`\text{margin} = L - U \qquad r = \dfrac{U}{L}`],
    leg: [['L', 'límite de la barra', 'limit of the bar'], ['U', 'lo usado', 'what is used'], ['r', 'razón de la barra', 'bar ratio']] },
  pres: { tex: [String.raw`B_{\text{usado}} = \sum_i c_i + c_{\text{cohete}} + c_{\text{ruta}} + \sum_j c_{\text{cont},j}`, String.raw`B_{\text{used}} = \sum_i c_i + c_{\text{rocket}} + c_{\text{route}} + \sum_j c_{\text{cont},j}`],
    leg: [['B_{\\text{usado}}', 'dinero que gasta el diseño', 'money the design spends'], ['c_i', 'precio de la pieza i', 'price of part i'], ['c_{\\text{cohete}},\\ c_{\\text{ruta}}', 'precio del cohete y de la ruta', 'price of the rocket and of the route'], ['c_{\\text{cont},j}', 'precio de cada contingencia comprada', 'price of each bought contingency']] },
  dv: { tex: String.raw`\Delta v = v_e \ln\dfrac{m_0}{m_f}`,
    leg: [['\\Delta v', 'cambio de velocidad de la maniobra', 'velocity change of the manoeuvre'], ['v_e', 'velocidad de salida del gas', 'exhaust velocity of the gas'], ['m_0', 'masa con propelente', 'mass with propellant'], ['m_f', 'masa seca (sin propelente)', 'dry mass (no propellant)']] },
  pfaseVuelo: { tex: [String.raw`p_f = p_{0,f} + \sum_k \Delta p_k + \Delta p_{\text{ruta}}`, String.raw`p_f = p_{0,f} + \sum_k \Delta p_k + \Delta p_{\text{route}}`],
    leg: [['p_f', 'probabilidad de éxito de la fase f (entre 0 y 1)', 'success probability of phase f (between 0 and 1)'], ['p_{0,f}', 'probabilidad base', 'base probability'], ['\\Delta p_k', 'mejora de cada pieza o contingencia a bordo', 'improvement from each part or contingency on board'], ['\\Delta p_{\\text{ruta}}', 'efecto de la ruta en esa fase, si lo hay', 'effect of the route on that phase, if any']] },
  covProc: COV,
  cov: COV,
  cienTot: { tex: String.raw`S = \dfrac{\sum_i v_i\,\text{cob}_i}{\sum_i v_i}`, leg: [['S', 'ciencia cubierta (de 0 a 1)', 'science covered (0 to 1)'], ['v_i', 'valor del objetivo i', 'value of goal i'], ['\\text{cob}_i', 'cobertura del objetivo i', 'coverage of goal i']] },
  datosGen: DATOS,
  cienFin: { tex: [String.raw`S_i^{\text{final}} = \text{cob}_i \cdot f_S \cdot \min\!\Big(1,\ \dfrac{C_{\text{baj}}}{D_{\text{gen}}}\Big)`, String.raw`S_i^{\text{final}} = \text{cov}_i \cdot f_S \cdot \min\!\Big(1,\ \dfrac{C_{\text{dl}}}{D_{\text{gen}}}\Big)`],
    leg: [['S_i^{\\text{final}}', 'ciencia que llega a casa del objetivo i', 'science of goal i that reaches home'], ['f_S', 'factor de ciencia del vuelo', 'science factor of the flight'], ['C_{\\text{baj}}', 'capacidad de bajada por día', 'downlink capacity per day'], ['D_{\\text{gen}}', 'datos generados por día', 'data generated per day']] },
  pPan: { tex: String.raw`P_{\text{gen}} \ge \sum_{i:\,u_i > 0} P_i`, leg: [['P_{\\text{gen}}', 'potencia que dan los paneles', 'power the panels give'], ['P_i', 'potencia nominal de la pieza i', 'rated power of part i'], ['u_i > 0', 'solo cuentan las piezas encendidas', 'only switched-on parts count']] },
  eBatProc: { tex: [String.raw`E_{\text{bat}} \ge \sum_{i \in \text{sombra}} P_i \cdot t_{\text{sombra}} \qquad [\text{Wh} = \text{W} \cdot \text{h}]`, String.raw`E_{\text{bat}} \ge \sum_{i \in \text{shadow}} P_i \cdot t_{\text{shadow}} \qquad [\text{Wh} = \text{W} \cdot \text{h}]`],
    leg: [['E_{\\text{bat}}', 'energía que guardan las baterías (Wh)', 'energy the batteries store (Wh)'], ['P_i', 'potencia de la pieza i', 'power of part i'], ['i \\in \\text{sombra}', 'piezas marcadas ☾ y encendidas', 'parts marked ☾ and switched on'], ['t_{\\text{sombra}}', 'horas de sombra por ciclo', 'shadow hours per cycle']] },
  pUsada: { tex: [String.raw`P_{\text{usada}}\,[\text{W}] = \sum_{i:\,u_i > 0} P_i`, String.raw`P_{\text{used}}\,[\text{W}] = \sum_{i:\,u_i > 0} P_i`], leg: [['P_i', 'potencia nominal de la pieza i', 'rated power of part i'], ['u_i > 0', 'solo cuentan las piezas encendidas', 'only switched-on parts count']] },
  pLim: { tex: [String.raw`P_{\text{lím}}\,[\text{W}] = \min\!\Big(\sum_k P_{\text{pan},k},\ P_{\text{tope}}\Big)`, String.raw`P_{\text{lim}}\,[\text{W}] = \min\!\Big(\sum_k P_{\text{pan},k},\ P_{\text{cap}}\Big)`],
    leg: [['P_{\\text{pan},k}', 'potencia que aporta cada panel k', 'power each panel k provides'], ['P_{\\text{tope}}', 'tope de potencia de la misión, si lo hay', 'mission power cap, if there is one']] },
  eUsada: { tex: [String.raw`E_{\text{usada}}\,[\text{Wh}] = \sum_{i \in \text{sombra}} P_i \cdot t_{\text{sombra}}`, String.raw`E_{\text{used}}\,[\text{Wh}] = \sum_{i \in \text{shadow}} P_i \cdot t_{\text{shadow}}`],
    leg: [['i \\in \\text{sombra}', 'piezas marcadas ☾ y encendidas', 'parts marked ☾ and switched on'], ['t_{\\text{sombra}}', 'horas de sombra por ciclo', 'shadow hours per cycle']] },
  eLim: { tex: [String.raw`E_{\text{lím}}\,[\text{Wh}] = \min\!\Big(\sum_k E_{\text{bat},k},\ E_{\text{tope}}\Big)`, String.raw`E_{\text{lim}}\,[\text{Wh}] = \min\!\Big(\sum_k E_{\text{bat},k},\ E_{\text{cap}}\Big)`],
    leg: [['E_{\\text{bat},k}', 'energía que guarda cada batería k', 'energy each battery k stores'], ['E_{\\text{tope}}', 'tope de batería de la misión, si lo hay', 'mission battery cap, if there is one']] },
  eDia: { tex: [String.raw`E_{\text{día}}\,[\text{Wh}] = \sum_i P_i\, u_i \qquad \dfrac{E_{\text{día}}}{1000}\ [\text{kWh/día}]`, String.raw`E_{\text{day}}\,[\text{Wh}] = \sum_i P_i\, u_i \qquad \dfrac{E_{\text{day}}}{1000}\ [\text{kWh/day}]`],
    leg: [['P_i', 'potencia de la pieza i (W)', 'power of part i (W)'], ['u_i', 'horas de uso al día', 'usage hours per day']] },
  inverso: { tex: String.raw`I \propto \dfrac{1}{d^{2}}`, leg: [['I', 'luz del Sol que recibe la nave', 'sunlight the spacecraft receives'], ['d', 'distancia al Sol', 'distance to the Sun']] },
  genCap: { tex: [String.raw`D_{\text{gen}} = \sum_i r_i u_i \cdot 0{,}45 \qquad C_{\text{baj}} = \sum_j b_j\, t_{\text{enlace}} \cdot 0{,}45`, String.raw`D_{\text{gen}} = \sum_i r_i u_i \cdot 0.45 \qquad C_{\text{dl}} = \sum_j b_j\, t_{\text{link}} \cdot 0.45`],
    leg: [['D_{\\text{gen}}', 'datos generados por día (MB/día)', 'data generated per day (MB/day)'], ['C', 'capacidad de bajada por día (MB/día)', 'downlink capacity per day (MB/day)'], ['r_i,\\ u_i', 'tasa (kbps) y horas de uso de la pieza i', 'rate (kbps) and usage hours of part i'], ['b_j', 'kbps de bajada de la antena j', 'downlink kbps of antenna j'], ['t', 'horas de enlace con la Tierra al día', 'link hours with Earth per day']] },
  datosGen2: DATOS,
  capBaj: CAPBAJ,
  frac: { tex: [String.raw`\varphi = \min\!\Big(1,\ \dfrac{C_{\text{baj}}}{D_{\text{gen}}}\Big)`, String.raw`\varphi = \min\!\Big(1,\ \dfrac{C_{\text{dl}}}{D_{\text{gen}}}\Big)`],
    leg: [['\\varphi', 'fracción de los datos que cabe en el enlace', 'fraction of the data that fits in the link'], ['C', 'capacidad de bajada por día', 'downlink capacity per day'], ['D_{\\text{gen}}', 'datos generados por día', 'data generated per day']] },
  mbPerd: { tex: [String.raw`\text{MB}_{\text{perdidos}} = D_{\text{tot}} - \min\!\big(D_{\text{tot}},\ C_{\text{baj}} \cdot n_{\text{días}}\big)`, String.raw`\text{MB}_{\text{lost}} = D_{\text{tot}} - \min\!\big(D_{\text{tot}},\ C_{\text{dl}} \cdot n_{\text{days}}\big)`],
    leg: [['D_{\\text{tot}}', 'datos generados en total durante la misión', 'data generated in total during the mission'], ['C', 'capacidad de bajada por día', 'downlink capacity per day'], ['n', 'días de misión conseguidos', 'mission days achieved']] },
  eAnt: { tex: [String.raw`E_{\text{antena}}\,[\text{Wh}] = P_{\text{antena}} \cdot t_{\text{sombra}}`, String.raw`E_{\text{antenna}}\,[\text{Wh}] = P_{\text{antenna}} \cdot t_{\text{shadow}}`],
    leg: [['P', 'potencia de la antena (W)', 'antenna power (W)'], ['t', 'horas de sombra por ciclo', 'shadow hours per cycle']] },
  velDatos: { tex: String.raw`R \propto \dfrac{P_{\text{tx}}\, G}{d^{2}}`, leg: [['R', 'velocidad de datos (kbps)', 'data rate (kbps)'], ['P_{\\text{tx}}', 'potencia del emisor', 'transmitter power'], ['G', 'ganancia de la antena', 'antenna gain'], ['d', 'distancia a la Tierra', 'distance to Earth']] },
};

// ---------------------------------------------------------------------------------------------------------------------
// Textos de la interfaz
// ---------------------------------------------------------------------------------------------------------------------
const T = textos({
  es: {
    titulo: 'MANUAL DE PROCEDIMIENTOS (SOP)', indice: 'ÍNDICE', doc: 'Documento', rev: 'Rev.', depto: 'Departamento',
    clasif: 'CLASIFICACIÓN: USO INTERNO DE LA MISIÓN · COPIA CONTROLADA', tuDepto: 'tu departamento',
    anexo: 'Anexo de misión', sinMision: 'Sin misión asignada todavía', abrDias: 'd',
    sinMisionTxt: 'El anexo de la misión (contingencias, piezas, cohetes, rutas y fases) aparece aquí cuando se elige una misión en el briefing.',
    anterior: 'Anterior', siguiente: 'Siguiente', pag: 'Sección', de: 'de',
    sin: 'Sin datos', ninguna: 'Este departamento no tiene contingencias en esta misión.',
    comprada: 'COMPRADA', activada: 'ACTIVADA', noComprada: 'sin comprar', mitiga: 'Mitiga', masa: 'Masa', precio: 'Precio', prob: 'Probabilidad', fase: 'Fase',
    efecto: 'Efecto si no se mitiga', leccion: 'Lección', otras: 'Contingencias de los demás departamentos',
    estado: 'ESTADO ACTUAL DEL DISEÑO', parametros: 'PARÁMETROS DE LA MISIÓN', piezas: 'PIEZAS DE TU TALLER EN ESTA MISIÓN', fasesVuelo: 'FASES DEL VUELO',
    sombra: 'Horas de sombra por día/ciclo', enlace: 'Horas de enlace con la Tierra por día', dias: 'Días de misión previstos', presupuesto: 'Presupuesto', puntuacion: 'Regla de puntuación',
    limites: 'Topes de la misión', ninguno: 'ninguno', destino: 'Destino',
    cabPieza: ['Pieza', 'Opción', 'Masa', 'Potencia', 'Volumen', 'Tasa', 'Precio', 'Aporta', 'Uso h/día'],
    fija: '24 h (siempre encendida)', eclipse: 'Se mantiene encendida en la sombra: cuenta para la batería', sinPiezas: 'No hay piezas de este departamento en esta misión.',
    cohetes: 'COHETES DISPONIBLES', rutas: 'RUTAS DISPONIBLES', objetivos: 'OBJETIVOS DE LA MISIÓN', capacidad: 'Capacidad al destino', operador: 'Operador',
    cabRuta: ['Ruta', 'Días', 'Masa (propelente/módulo)', 'Precio', 'Efecto en la probabilidad'], cabCohete: ['Cohete', 'Operador', 'Capacidad al destino', 'Precio'],
    cabObj: ['Objetivo', 'Prioritario', 'Valor'], si: 'sí', no: 'no',
    cabFase: ['Fase', 'Crítica', 'p base'],
    ocultos: 'Algunos hallazgos solo aparecen si llevas el sensor adecuado.',
    cab: 'MANUAL', param: 'Parámetro', val: 'Valor', contingencia: 'Contingencia',
    punt: { datos: 'Órbita: ciencia por vida útil conseguida', cadena: 'Aterrizaje: ciencia por días en superficie', oculto: 'Exploración: ciencia y hallazgos por energía gastada' },
    unidadBarra: { masa: 'kg', potencia: 'W', bateria: 'Wh', datos: 'MB/día', presupuesto: 'M USD', volumen: 'vol.' },
    nombreBarra: { masa: 'Masa', potencia: 'Potencia', bateria: 'Batería', datos: 'Enlace de datos', presupuesto: 'Presupuesto', volumen: 'Volumen' },
    cienciaTotal: 'Ciencia cubierta', ok: 'dentro', tolerancia: 'tolerancia (100–120 %: pasa, más riesgo)', exceso: 'fuera de límite',
    ciencia: 'ciencia', diasEf: 'días', falla: 'fallo crítico', critica: 'crítica', noCritica: 'no crítica',
    glosario: 'Término', etiq: { check: 'COMPROBAR', cuidado: 'CUIDADO', nota: 'NOTA' },
    juego: 'MANUAL DE JUEGO', juegoTab: 'Manual de juego', juegoCab: 'MANUAL DE JUEGO', capitulo: 'Capítulo', verCap: 'Ver Manual de juego ›', glosGen: 'Términos generales del juego.',
    contSop: 'Las reglas generales de compra y activación de contingencias están en el Manual de juego › capítulo 9. Aquí, las de tu departamento.', abrirCap: 'Abrir capítulo',
    glosSop: 'Términos de tu departamento. Los términos generales del juego (fase crítica, tolerancia, contingencia, margen) están en el Manual de juego › capítulo 13.',
  },
  en: {
    titulo: 'STANDARD OPERATING PROCEDURES (SOP)', indice: 'CONTENTS', doc: 'Document', rev: 'Rev.', depto: 'Department',
    clasif: 'CLASSIFICATION: MISSION INTERNAL USE · CONTROLLED COPY', tuDepto: 'your department',
    anexo: 'Mission annex', sinMision: 'No mission assigned yet', abrDias: 'd',
    sinMisionTxt: 'The mission annex (contingencies, parts, rockets, routes and phases) appears here when a mission is chosen in the briefing.',
    anterior: 'Previous', siguiente: 'Next', pag: 'Section', de: 'of',
    sin: 'No data', ninguna: 'This department has no contingencies in this mission.',
    comprada: 'BOUGHT', activada: 'ACTIVATED', noComprada: 'not bought', mitiga: 'Mitigates', masa: 'Mass', precio: 'Price', prob: 'Probability', fase: 'Phase',
    efecto: 'Effect if not mitigated', leccion: 'Lesson', otras: 'Contingencies of the other departments',
    estado: 'CURRENT DESIGN STATUS', parametros: 'MISSION PARAMETERS', piezas: 'PARTS OF YOUR WORKSHOP IN THIS MISSION', fasesVuelo: 'FLIGHT PHASES',
    sombra: 'Shadow hours per day/cycle', enlace: 'Link hours with Earth per day', dias: 'Planned mission days', presupuesto: 'Budget', puntuacion: 'Scoring rule',
    limites: 'Mission caps', ninguno: 'none', destino: 'Destination',
    cabPieza: ['Part', 'Option', 'Mass', 'Power', 'Volume', 'Rate', 'Price', 'Provides', 'Use h/day'],
    fija: '24 h (always on)', eclipse: 'Stays on in the shadow: counts for the battery', sinPiezas: 'There are no parts for this department in this mission.',
    cohetes: 'AVAILABLE ROCKETS', rutas: 'AVAILABLE ROUTES', objetivos: 'MISSION GOALS', capacidad: 'Capacity to destination', operador: 'Operator',
    cabRuta: ['Route', 'Days', 'Mass (propellant/module)', 'Price', 'Effect on probability'], cabCohete: ['Rocket', 'Operator', 'Capacity to destination', 'Price'],
    cabObj: ['Goal', 'Priority', 'Value'], si: 'yes', no: 'no',
    cabFase: ['Phase', 'Critical', 'base p'],
    ocultos: 'Some findings only show up if you carry the right sensor.',
    cab: 'MANUAL', param: 'Parameter', val: 'Value', contingencia: 'Contingency',
    punt: { datos: 'Orbit: science by useful life achieved', cadena: 'Landing: science by surface days', oculto: 'Exploration: science and findings per energy spent' },
    unidadBarra: { masa: 'kg', potencia: 'W', bateria: 'Wh', datos: 'MB/day', presupuesto: 'M USD', volumen: 'vol.' },
    nombreBarra: { masa: 'Mass', potencia: 'Power', bateria: 'Battery', datos: 'Data link', presupuesto: 'Budget', volumen: 'Volume' },
    cienciaTotal: 'Science covered', ok: 'within limits', tolerancia: 'tolerance (100–120 %: passes, more risk)', exceso: 'over the limit',
    ciencia: 'science', diasEf: 'days', falla: 'critical failure', critica: 'critical', noCritica: 'not critical',
    glosario: 'Term', etiq: { check: 'CHECK', cuidado: 'CAUTION', nota: 'NOTE' },
    juego: 'GAME MANUAL', juegoTab: 'Game manual', juegoCab: 'GAME MANUAL', capitulo: 'Chapter', verCap: 'See Game manual ›', glosGen: 'General game terms.',
    contSop: 'The general rules for buying and activating contingencies are in the Game manual › chapter 9. Here, those of your department.', abrirCap: 'Open chapter',
    glosSop: 'Terms of your department. General game terms (critical phase, tolerance, contingency, margin) are in the Game manual › chapter 13.',
  },
});

// Secciones del manual (mismo índice para los cuatro departamentos).
const SECCIONES = [
  { id: 'proposito', t: ['1. Propósito y responsabilidades', '1. Purpose and responsibilities'] },
  { id: 'procedimiento', t: ['2. Procedimientos paso a paso', '2. Step-by-step procedures'] },
  { id: 'formulas', t: ['3. Fórmulas y unidades', '3. Formulas and units'] },
  { id: 'contingencias', t: ['4. Contingencias', '4. Contingencies'] },
  { id: 'ficha', t: ['5. Ficha técnica de la misión', '5. Mission datasheet'] },
  { id: 'glosario', t: ['6. Glosario', '6. Glossary'] },
];

// ---------------------------------------------------------------------------------------------------------------------
// Contenido estático. Bloques: ['p', es, en] · ['h', es, en] · ['paso', es, en] · ['check'|'cuidado'|'nota', es, en]
//   ['f', fórmula, es, en] · ['tabla', cabecera[], filas[][]] (celda = texto o [es, en]) · ['lista', [[es, en], ...]]
//   ['ver', capítulo, es, en] = enlace "ver Manual de juego › capítulo" (abre ese capítulo del Manual de juego).
// ---------------------------------------------------------------------------------------------------------------------
// MANUAL DE JUEGO: todo lo general (cómo se juega) vive aquí; los SOP de departamento solo llevan lo propio de cada rol.
// ---------------------------------------------------------------------------------------------------------------------
const CAPITULOS = [
  { id: 'objetivo', t: ['1. Objetivo del juego', '1. Goal of the game'] },
  { id: 'roles', t: ['2. Los cuatro departamentos', '2. The four departments'] },
  { id: 'flujo', t: ['3. El recorrido, fase a fase', '3. The path, phase by phase'] },
  { id: 'reloj', t: ['4. Reloj de misión y plazo', '4. Mission clock and deadline'] },
  { id: 'barras', t: ['5. Barras, ratio y tolerancia', '5. Bars, ratio and tolerance'] },
  { id: 'revisiones', t: ['6. Revisiones y GO / NO-GO', '6. Reviews and GO / NO-GO'] },
  { id: 'eventos', t: ['7. Eventos', '7. Events'] },
  { id: 'lanzamiento', t: ['8. Ventana de lanzamiento y propelente', '8. Launch window and propellant'] },
  { id: 'contingencias', t: ['9. Contingencias', '9. Contingencies'] },
  { id: 'vuelo', t: ['10. El vuelo y la sala de control', '10. The flight and the control room'] },
  { id: 'puntuacion', t: ['11. Puntuación e informe', '11. Scoring and report'] },
  { id: 'controles', t: ['12. Controles y navegación 3D', '12. Controls and 3D navigation'] },
  { id: 'glosario', t: ['13. Glosario general', '13. General glossary'] },
];

const JUEGO = {
  objetivo: [
    ['p', 'Tu equipo tiene hasta cuatro personas. Juntos diseñan una misión espacial real: una órbita, un aterrizaje o una exploración. La misión tiene un presupuesto, un cohete y un plazo. Cada persona lleva un departamento. Ganan si la nave despega, llega a su destino y manda a la Tierra la ciencia que prometieron.', 'Your team has up to four players. Together you design a real space mission: an orbit, a landing or an exploration. The mission has a budget, a rocket and a deadline. Each player runs one department. You win if the spacecraft launches, arrives, and sends the promised science to Earth.'],
    ['h', 'Qué haces en una partida', 'What you do in a game'],
    ['lista', [
      ['Diseñar: el equipo construye una nave que cabe en las seis barras de recursos (masa, volumen, potencia, batería, datos y presupuesto).', 'Design: build a spacecraft that fits in the six resource bars (mass, volume, power, battery, data and budget). Work as a team.'],
      ['Decidir: el equipo elige los objetivos de ciencia, el cohete, la ruta, el mes de lanzamiento y las contingencias (seguros) que va a comprar.', 'Decide: choose the science goals, the rocket, the route, the launch month and the contingencies (insurance) to buy.'],
      ['Aprobar: el diseño pasa la revisión y los cuatro departamentos dan su GO (permiso para lanzar).', 'Approve: pass the design review. All four departments must say GO (permission to launch).'],
      ['Volar: ves cada fase del vuelo, activas las contingencias a tiempo y lees el informe.', 'Fly: watch each flight phase, activate contingencies in time and read the report.'],
      ['Aprender: el informe explica qué falló y por qué. Puedes rediseñar y lanzar otra vez.', 'Learn: the report explains what failed and why. You can redesign and launch again.'],
    ]],
    ['nota', 'El juego es cooperativo: todo el equipo gana o pierde junto. Los números y las misiones usan datos reales de la NASA. Una cifra estimada lleva el símbolo (≈).', 'The game is cooperative: the whole team wins or loses together. Numbers and missions use real NASA data. An estimated figure has the symbol (≈).'],
  ],

  roles: [
    ['p', 'Cada asiento de la mesa es un departamento. Si falta un jugador, su departamento queda vacante. Cualquiera puede manejarlo y firmar por él. Si el departamento cambia de persona, hay que firmar otra vez.', 'Each seat at the table is one department. If a player is missing, the department is vacant. Anyone can operate it and sign for it. If the department changes hands, sign again.'],
    ['tabla', [['Departamento', 'Department'], ['Responsable de', 'Responsible for'], ['Barras que más mueve', 'Bars it moves most']], [
      [['Vuelo y Mecánica', 'Flight & Mechanics'], ['El cuerpo de la nave, el cohete, la ruta, el mes de lanzamiento y el sitio de aterrizaje o la órbita.', 'The spacecraft body, the rocket, the route, the launch month, and the landing site or orbit.'], ['Masa, volumen, presupuesto', 'Mass, volume, budget']],
      [['Ciencia', 'Science'], ['Los instrumentos, sus horas de uso y qué objetivos se cubren. También propone el sitio o la órbita.', 'The instruments, their usage hours and which goals are covered. It also proposes the site or orbit.'], ['Datos, potencia, presupuesto', 'Data, power, budget']],
      [['Energía', 'Power'], ['Paneles, baterías, control de temperatura (térmica) y polvo. Debe haber energía en todo el ciclo, también en la sombra.', 'Panels, batteries, thermal control and dust. Power must last through the whole cycle, including the shadow.'], ['Potencia, batería, masa', 'Power, battery, mass']],
      [['Comunicaciones y Operaciones', 'Communications & Operations'], ['Antenas, computador, navegación y segmento de tierra (los equipos en la Tierra). Su trabajo es que la ciencia llegue a casa.', 'Antennas, computer, navigation and ground segment (the teams and equipment on Earth). Their job is to get the science home.'], ['Datos, potencia, presupuesto', 'Data, power, budget']],
    ]],
    ['nota', 'Los departamentos dependen unos de otros. Ciencia es el "cliente": gasta vatios, datos y masa. Energía y Comunicaciones sostienen lo que Ciencia monta. Vuelo fija el límite de masa con el cohete. Habla con tu equipo antes de montar piezas.', 'The departments depend on each other. Science is the "customer": it uses watts, data and mass. Power and Comms support what Science mounts. Flight sets the mass limit with the rocket. Talk to your team before you mount parts.'],
    ['p', 'Cada puesto tiene su propio Manual SOP con las piezas, las fórmulas, las decisiones y las contingencias de ese departamento. Está en la carpeta de anillas de la mesa y en la app "Manual SOP" del portátil.', 'Each post has its own SOP manual with the parts, formulas, decisions and contingencies of that department. It is in the ring binder on the table and in the "SOP manual" app on the laptop.'],
  ],

  flujo: [
    ['h', 'De la sala de espera al informe', 'From the waiting room to the report'],
    ['tabla', [['Fase', 'Phase'], ['Qué ocurre', 'What happens'], ['Quién actúa', 'Who acts']], [
      [['1. Lobby', '1. Lobby'], ['Escribe tu nick (apodo) y el código de sala (hasta 4 jugadores). Cada persona elige un rol libre. "Iniciar misión" lleva a todos al briefing.', 'Enter a nick (nickname) and the room code (up to 4 players). Each player picks a free role. "Start mission" takes everyone to the briefing.'], ['Todos', 'Everyone']],
      [['2. Briefing / Expediente', '2. Briefing / Dossier'], ['En la sala de briefing eliges el escenario y una misión (carpeta). En el expediente lees el destino, el presupuesto y el plazo. Luego marcas los objetivos. El objetivo prioritario es obligatorio. Cada objetivo secundario hace la misión más difícil. Todos pulsan "Listo".', 'In the briefing room, choose the scenario and one mission (folder). In the dossier, read the destination, the budget and the deadline. Then tick the goals. The priority goal is mandatory. Each secondary goal makes the mission harder. Everyone presses "Ready".'], ['Todos', 'Everyone']],
      [['3. Diseño en el portátil', '3. Design on the laptop'], ['Cada jugador usa su portátil. Sus apps son: Constructor (taller con las piezas de tu rol, plano común y panel con las seis barras), Cámara de lanzamiento (cohete), Contingencias, Estado y Expediente. El reloj de misión corre en tiempo real.', 'Each player uses their laptop. The apps are: Builder (workshop with the parts of your role, shared blueprint and panel with the six bars), Launch camera (rocket), Contingencies, Status and Dossier. The mission clock runs in real time.'], ['Cada departamento', 'Each department']],
      [['4. Revisión del diseño', '4. Design review'], ['Cuando el diseño parece listo, pide una revisión. La revisión compara cada barra con su límite (capítulos 5 y 6). No cuesta meses.', 'When the design looks ready, request a review. The review compares each bar with its limit (chapters 5 and 6). It costs no months.'], ['Cualquiera', 'Anyone']],
      [['5. Restricciones y verificación', '5. Constraints and verification'], ['Si una barra se pasa, recorta piezas. Si todo está bien, verifica con la lista de comprobaciones. El reloj sigue corriendo. Cada departamento firma su GO en la sala de control.', 'If a bar is over its limit, trim parts. If everything is fine, verify with the checklist. The clock keeps running. Each department signs its GO in the control room.'], ['Todos firman', 'Everyone signs']],
      [['6. GO / NO-GO y lanzamiento', '6. GO / NO-GO and launch'], ['Con las cuatro firmas, pulsa "Lanzar". Si cambias el diseño, el mes o el sitio, se borran las firmas. Si el lanzamiento falla, la misión termina.', 'With all four signatures, press "Launch". If you change the design, month or site, the signatures clear. If the launch fails, the mission ends.'], ['Todos', 'Everyone']],
      [['7. Sala de control', '7. Mission control'], ['El vuelo se muestra fase a fase y todos ven lo mismo. Si sale un evento que una contingencia comprada anula, su departamento la activa. Después pulsa "Next".', 'The flight is shown phase by phase and everyone sees the same. If an event happens that a bought contingency cancels, its department activates the contingency. Then press "Next".'], ['Todos', 'Everyone']],
      [['8. Informe de vuelo', '8. Flight report'], ['El informe muestra el veredicto (total, parcial o fallida), los pasos, la ciencia conseguida, los datos perdidos, los hallazgos, las causas y la misión real.', 'The report shows the verdict (full, partial or failed), the steps, the science achieved, the lost data, the findings, the causes and the real mission.'], ['Todos', 'Everyone']],
      [['9. Rediseño', '9. Redesign'], ['"Volver a volar" abre el diseño otra vez con lo que aprendiste. "Nueva misión" empieza otra misión.', '"Fly again" opens the design again with what you learned. "New mission" starts another mission.'], ['Todos', 'Everyone']],
    ]],
    ['nota', 'El diseño no va en línea recta. Si una revisión falla o un cambio borra las firmas, vuelves a diseñar. El reloj no se detiene (capítulo 4).', 'Design is not a straight line. If a review fails or a change clears the signatures, you go back to design. The clock does not stop (chapter 4).'],
    ['h', 'Qué app usar en cada fase (portátil)', 'Which app to use in each phase (laptop)'],
    ['lista', [
      ['Briefing: Expediente y manuales. Diseño y restricciones: Constructor, Cámara de lanzamiento, Contingencias, Expediente y manuales.', 'Briefing: Dossier and manuals. Design and constraints: Builder, Launch camera, Contingencies, Dossier and manuals.'],
      ['El icono "Sala de control" del dock lleva a la sala de control. Ahí están la ventana de lanzamiento, el sitio, la votación GO / NO-GO, la misión y el informe.', 'The "Control room" icon in the dock takes you to the control room. The launch window, the site, the GO / NO-GO poll, the mission and the report are there.'],
    ]],
  ],

  reloj: [
    ['p', 'La misión tiene un reloj en meses. Corre en TIEMPO REAL mientras diseñas, recortas y verificas. Si hay menos jugadores, cada mes dura más, porque cada persona hace más trabajo.', 'The mission has a clock in months. It runs in REAL TIME while you design, trim and verify. If there are fewer players, each month lasts longer, because each player does more work.'],
    ['tabla', [['Jugadores', 'Players'], ['Duración de 1 mes de misión', 'Length of 1 mission month']], [
      ['4', ['1 minuto (60 s)', '1 minute (60 s)']],
      ['3', '75 s'],
      ['2', '90 s'],
      ['1', '105 s'],
    ]],
    ['lista', [
      ['Pedir una revisión no mueve el reloj.', 'Requesting a review does not move the clock.'],
      ['Los eventos de diseño aparecen mientras el reloj corre (capítulo 7).', 'Design events appear while the clock runs (chapter 7).'],
      ['Cambiar el cohete, la ruta o el mes de lanzamiento tampoco detiene el reloj. Decide rápido y con tu equipo.', 'Changing the rocket, route or launch month does not stop the clock. Decide quickly with your team.'],
    ]],
    ['h', 'El plazo de los inversores', 'The investor deadline'],
    ['p', 'Cada misión tiene un plazo acordado con los inversores. Si el reloj pasa ese plazo, los inversores recortan la financiación.', 'Each mission has a deadline agreed with the investors. If the clock passes the deadline, the investors cut the funding.'],
    ['f', 'retraso', 'Hay un mes de gracia sin castigo. Después, el presupuesto baja 4 % por cada mes de retraso. Si el retraso pasa de 12 meses, los inversores se retiran.', 'You have one month of grace with no penalty. After that, the budget drops 4 % for each month late. If you are more than 12 months late, the investors pull out.'],
    ['cuidado', 'El recorte baja el límite de la barra de presupuesto. Un diseño que cabía puede pasar a tolerancia o fallar la revisión. Si el plazo se acerca, recorta antes de añadir más piezas.', 'The cut lowers the limit of the budget bar. A design that fitted can go into tolerance or fail the review. If the deadline is near, trim before you add more parts.'],
    ['nota', 'Lanzar después de la ventana óptima también cuesta propelente y puede llevarte más allá del plazo (capítulo 8).', 'Launching after the optimal window also costs propellant and can take you past the deadline (chapter 8).'],
  ],

  barras: [
    ['p', 'El panel global del Constructor y la app Estado muestran seis barras. Cada barra compara lo que usa el diseño con un límite.', 'The global panel of the Builder and the Status app show six bars. Each bar compares what the design uses with a limit.'],
    ['tabla', [['Barra', 'Bar'], ['Qué usa el diseño', 'What the design uses'], ['Límite', 'Limit']], [
      [['Masa (kg)', 'Mass (kg)'], ['Piezas + ruta + contingencias + propelente', 'Parts + route + contingencies + propellant'], ['Capacidad del cohete al destino (y tope de la misión)', 'Rocket capacity to the destination (and mission cap)']],
      [['Volumen', 'Volume'], ['Lo que ocupan las piezas', 'The space the parts take up'], ['El que da la estructura', 'The space the structure provides']],
      [['Potencia (W)', 'Power (W)'], ['Vatios de todo lo que está encendido', 'Watts of everything switched on'], ['Lo que dan los paneles (y el tope)', 'What the panels give (and the cap)']],
      [['Batería (Wh)', 'Battery (Wh)'], ['Energía que gasta en la sombra lo que sigue encendido', 'Energy that the parts still on use in the shadow'], ['Lo que guardan las baterías', 'What the batteries store']],
      [['Enlace de datos (MB/día)', 'Data link (MB/day)'], ['Datos que generan las piezas por día', 'Data the parts generate per day'], ['Lo que cabe en la bajada por día', 'What fits in the downlink per day']],
      [['Presupuesto (M USD)', 'Budget (M USD)'], ['Precio de las piezas, el cohete, la ruta y las contingencias', 'Price of the parts, rocket, route and contingencies'], ['El de la misión (menos los recortes por retraso)', 'The mission budget (minus delay cuts)']],
    ]],
    ['f', 'ratio', 'La razón (ratio) es lo usado dividido por el límite. Si es 1,00 o menos, estás dentro del límite. Entre 1,00 y 1,20 estás en tolerancia. Si pasa de 1,20, estás fuera.', 'The ratio is what you use divided by the limit. If it is 1.00 or less, you are within the limit. Between 1.00 and 1.20, you are in tolerance. Above 1.20, you are out.'],
    ['f', 'margen', 'El margen es el espacio que queda hasta el límite. Los ingenieros reales dejan margen para lo que todavía no saben.', 'Margin is the room left up to the limit. Real engineers keep margin for what they do not yet know.'],
    ['h', 'Tolerancia: la revisión pasa, pero con riesgo', 'Tolerance: the review passes, with more risk'],
    ['f', 'tol', 'Si una barra está entre 100 % y 120 %, no tienes que recortar: la revisión pasa. Si una barra pasa de 120 %, la revisión falla.', 'If a bar is between 100 % and 120 %, you do not have to trim. The review passes. If a bar is above 120 %, the review fails.'],
    ['f', 'tolProb', 'Pasarte del límite tiene un costo en el vuelo. La probabilidad de fallo de una etapa relacionada sube unos 0,5 puntos porcentuales por cada 1 % de exceso, hasta +10 puntos con 120 %.', 'Going over the limit has a cost in flight. The failure probability of a related stage goes up by about 0.5 percentage points for each 1 % over, up to +10 points at 120 %.'],
    ['tabla', [['Barra pasada', 'Bar over'], ['Etapa que se resiente', 'Stage that suffers']], [
      [['Masa / Volumen', 'Mass / Volume'], ['Lanzamiento', 'Launch']],
      [['Potencia / Batería', 'Power / Battery'], ['Crucero y operaciones', 'Cruise and operations']],
      [['Datos', 'Data'], ['Bajada de datos y ciencia', 'Downlink and science']],
      [['Presupuesto', 'Budget'], ['Pequeña penalización en todas las etapas', 'Small penalty on all stages']],
    ]],
    ['cuidado', 'Con 20 % de exceso en masa, el lanzamiento suma +10 puntos de probabilidad de fallo. Si el lanzamiento falla, la misión termina.', 'With a 20 % excess in mass, launch gets +10 points of failure probability. If the launch fails, the mission ends.'],
    ['nota', 'En la sección 3 de cada SOP están las fórmulas de las barras que mueve ese departamento.', 'Section 3 of each SOP has the formulas for the bars that department moves.'],
  ],

  revisiones: [
    ['h', 'La revisión del diseño', 'The design review'],
    ['lista', [
      ['Todas las barras en 100 % o menos: el diseño está limpio. Puedes pasar a verificar.', 'All bars at 100 % or less: the design is clean. You can go to verification.'],
      ['Alguna barra entre 100 % y 120 %: la revisión pasa, pero sube la probabilidad de fallo (capítulo 5). Si hay tiempo, recorta.', 'Any bar between 100 % and 120 %: the review passes, but the failure probability goes up (chapter 5). If there is time, trim.'],
      ['Alguna barra sobre 120 %: la revisión falla. Debes rediseñar.', 'Any bar above 120 %: the review fails. You must redesign.'],
    ]],
    ['p', 'La revisión no cuesta meses, pero el reloj sigue corriendo mientras rediseñas (capítulo 4).', 'The review costs no months, but the clock keeps running while you redesign (chapter 4).'],
    ['h', 'Restricciones (recortes)', 'Constraints (trimming)'],
    ['p', 'En el modo Restricciones usas el mismo taller, pero no puedes añadir piezas ni comprar contingencias. Solo puedes quitar piezas, bajar las horas de uso o cambiar a una opción que no suba ninguna barra. Usa este modo para recortar excesos antes de verificar.', 'In Constraints mode, you use the same workshop. You cannot add parts or buy contingencies. You can only remove parts, lower usage hours, or swap to an option that does not raise any bar. Use this mode to trim overruns before you verify.'],
    ['h', 'Verificación y votación GO / NO-GO', 'Verification and GO / NO-GO poll'],
    ['paso', 'Revisa la lista de comprobaciones. Debe haber un cohete y una ruta. El objetivo prioritario debe tener instrumentos encendidos. Algo debe generar energía y algo debe enviar datos a casa. También deben cumplirse las comprobaciones propias de la misión.', 'Go through the checklist. There must be a rocket and a route. The priority goal must have instruments switched on. Something must generate power. Something must send data home. The mission-specific checks must also pass.'],
    ['paso', 'En la sala de control, cada departamento da su GO: haz clic en tu consola o en el botón de la pared. Un NO-GO es un veto. Si un departamento dice NO-GO, hablen y corrijan el problema.', 'In the control room, each department gives its GO. Click your console or the button on the wall. A NO-GO is a veto. If a department says NO-GO, talk and fix the problem.'],
    ['paso', 'Con las cuatro firmas aparece "Lanzar". Si cambias el diseño, el mes de lanzamiento o el sitio, se borran las firmas. Entonces debes firmar otra vez.', 'With all four signatures, "Launch" appears. If you change the design, the launch month or the site, the signatures clear. Then you must sign again.'],
    ['nota', 'Si un departamento está vacante, cualquiera firma por él. Si cambia de persona, hay que firmar otra vez.', 'If a department is vacant, anyone signs for it. If it changes hands, sign again.'],
  ],

  eventos: [
    ['h', 'Eventos de diseño (en tiempo real)', 'Design events (in real time)'],
    ['p', 'Mientras corre el reloj de misión, saltan eventos al azar. No tienes que pedirlos. Aparecen en una tarjeta y afectan a todo el equipo.', 'While the mission clock runs, random events happen. You do not need to ask for them. They appear on a card and affect the whole team.'],
    ['tabla', [['Tipo', 'Type'], ['Ejemplos', 'Examples'], ['Efecto', 'Effect']], [
      [['Inversores', 'Investors'], ['Entra un inversor nuevo o se retira uno.', 'A new investor joins or one pulls out.'], ['Sube o baja el presupuesto', 'Raises or lowers the budget']],
      [['Contratiempos y tragedias', 'Setbacks and tragedies'], ['Un recorte de potencia, el fallo de un proveedor o un cambio de prioridad del objetivo.', 'A power cut, a supplier failure or a change of goal priority.'], ['Bajan un límite (por ejemplo, × 0,9 a la potencia) o cambian el objetivo prioritario', 'Lower a limit (for example × 0.9 to power) or change the priority goal']],
      [['Golpes de suerte', 'Windfalls'], ['Un patrocinador o una pieza donada.', 'A sponsor or a donated part.'], ['Dinero o margen extra', 'Extra money or margin']],
    ]],
    ['f', 'dif', 'Más objetivos secundarios hacen la misión más difícil y traen más eventos.', 'More secondary goals make the mission harder and bring more events.'],
    ['cuidado', 'Un evento puede cambiar un límite cuando estás justo en 100 %. Deja margen. Si no, un recorte te deja en tolerancia o fuera del límite.', 'An event can change a limit when you are exactly at 100 %. Keep some margin. If you do not, a cut can put you in tolerance or over the limit.'],
    ['h', 'Eventos de vuelo', 'Flight events'],
    ['p', 'Durante el vuelo (capítulo 10), cada fase puede traer un evento del mazo de la misión. Una contingencia comprada anula los eventos negativos. Los eventos buenos (+) son suerte y ninguna contingencia los anula.', 'During the flight (chapter 10), each phase can bring an event from the mission deck. A bought contingency cancels negative events. Good events (+) are luck. No contingency cancels them.'],
  ],

  lanzamiento: [
    ['p', 'El mes de lanzamiento se elige en la sala de control. Vuelo y Mecánica lidera esta decisión con el resto del equipo. Cada mes tiene sus condiciones, con datos de la NASA: el clima del sitio, el clima espacial, la posición del destino y el ΔV. El ΔV es cuánto tiene que cambiar la velocidad de la nave. Más ΔV significa más propelente (combustible).', 'You choose the launch month in the control room. Flight & Mechanics leads this decision with the rest of the team. Each month has its own conditions, from NASA data: launch-site weather, space weather, the position of the target, and ΔV. ΔV is how much the spacecraft must change its speed. More ΔV needs more propellant (fuel).'],
    ['lista', [
      ['La ventana óptima es el mes con menos ΔV. En ese mes, la nave necesita menos propelente.', 'The optimal window is the month with the lowest ΔV. In that month, the spacecraft needs the least propellant.'],
      ['Si lanzas después de esa ventana, necesitas más propelente (kg). Esos kg suben la barra de masa. Puedes quedar en tolerancia o fuera del límite.', 'If you launch after that window, you need more propellant (kg). Those kg raise the mass bar. You can end up in tolerance or over the limit.'],
      ['Además, el reloj sigue corriendo. Un mes tardío puede llevarte más allá del plazo de los inversores (capítulo 4).', 'Also, the clock keeps running. A late month can take you past the investor deadline (chapter 4).'],
    ]],
    ['f', 'propRetraso', 'El propelente extra es el costo de no lanzar en la mejor ventana. Cada mes de desvío añade kg.', 'The extra propellant is the cost of not launching in the best window. Each month of deviation adds kg.'],
    ['cuidado', 'Si el lanzamiento falla, la misión termina. No hay crucero, ni ciencia, ni segunda oportunidad en esa partida. Por eso, en el lanzamiento es muy importante no pasarte de masa ni de volumen.', 'If the launch fails, the mission ends. There is no cruise, no science and no second chance in that game. For this reason, going over mass or volume matters most at launch.'],
    ['ver', 'vuelo', 'Ver también: capítulo 10 (fases del vuelo).', 'See also: chapter 10 (flight phases).'],
  ],

  contingencias: [
    ['h', 'Reglas de las contingencias', 'Contingency rules'],
    ['lista', [
      ['Una contingencia es un seguro. Cuesta masa (kg) y dinero en el diseño. Si ocurre el evento que cubre, lo anula por completo.', 'A contingency is insurance. It costs mass (kg) and money in the design. If the event it covers happens, the contingency cancels the event completely.'],
      ['Cada departamento compra y activa sus contingencias. El equipo completo puede tener máximo 3.', 'Each department buys and activates its own contingencies. The whole team can hold at most 3.'],
      ['Las contingencias se compran en la app "Contingencias" durante el Diseño. En Restricciones solo se pueden quitar.', 'You buy contingencies in the "Contingencies" app during Design. In Constraints, you can only remove them.'],
      ['Los eventos buenos (+) no se anulan: son suerte. Un evento con signo ± pierde su lado malo y conserva el bueno.', 'Good events (+) are not cancelled. They are luck. An event with the sign ± loses its bad side and keeps the good side.'],
    ]],
    ['h', 'Cómo comprar (fase de Diseño)', 'How to buy (Design phase)'],
    ['paso', 'Abre "Contingencias" y mira el mazo de riesgos. Cada evento muestra su fase, su probabilidad p y su efecto.', 'Open "Contingencies" and look at the risk deck. Each event shows its phase, its probability p and its effect.'],
    ['paso', 'Calcula el valor de cada seguro: daño esperado ≈ p × (ciencia o días que se pierden). Compáralo con los kg y el dinero que cuesta.', 'Estimate the value of each insurance: expected damage ≈ p × (science or days lost). Compare it with its cost in kg and money.'],
    ['paso', 'Acuerda con el equipo las 3 compras. Pulsa Comprar en la que sea de tu departamento.', 'Agree with the team on the 3 purchases. Press Buy on the one that belongs to your department.'],
    ['cuidado', 'Si un evento trae "falla" (fallo crítico) en una fase crítica, su seguro vale mucho más que el de un evento que solo quita 15 % de ciencia.', 'If an event has "failure" (critical failure) in a critical phase, its insurance is worth much more than the insurance for an event that only removes 15 % of science.'],
    ['h', 'Cómo activar (fase de Misión, sala de control)', 'How to activate (Mission phase, control room)'],
    ['paso', 'El vuelo se muestra paso a paso. Si el paso visible trae un evento que una contingencia comprada anula, la sala de control te pide activarla.', 'The flight is shown step by step. If the visible step has an event that a bought contingency cancels, the control room asks you to activate it.'],
    ['paso', 'El departamento dueño pulsa Activar. Hasta que lo haga, el equipo no puede pasar al paso siguiente.', 'The owning department presses Activate. Until it does, the team cannot go to the next step.'],
    ['paso', 'Lee el resultado. "Mitigado" significa que el evento quedó anulado. Si no compraste la contingencia, se aplican los factores del evento (nunca por debajo de × 0,25).', 'Read the result. "Mitigated" means the event was cancelled. If you did not buy the contingency, the factors of the event apply (never below × 0.25).'],
    ['check', 'Si tu departamento está vacante, cualquier jugador puede activar por él. Si tiene jugador, solo esa persona puede activar. Las contingencias de tu rol y sus tarjetas están en la sección 4 de tu SOP.', 'If your department is vacant, any player can activate for it. If it has a player, only that player can activate. The contingencies of your role and their cards are in section 4 of your SOP.'],
  ],

  vuelo: [
    ['p', 'Después del GO y del lanzamiento, el vuelo se juega en la sala de control. Las fases se muestran una por una y todos ven lo mismo. Pulsa "Next" para avanzar. Si un evento tiene una contingencia pendiente, no puedes avanzar hasta activarla.', 'After GO and launch, you play the flight in the control room. The phases are shown one at a time and everyone sees the same. Press "Next" to advance. If an event has a pending contingency, you cannot advance until you activate it.'],
    ['f', 'pfase', 'Cada fase tiene una probabilidad base de éxito. Se suma Δp por cada pieza, contingencia o ruta a bordo que la mejora. Cuentan las piezas con uso > 0 o sin control de uso. La tolerancia (capítulo 5) resta probabilidad a la etapa relacionada.', 'Each phase has a base success probability. Add Δp for each part, contingency or route on board that improves it. Parts count if their usage is above 0 or if they have no usage control. Tolerance (chapter 5) subtracts probability from the related stage.'],
    ['h', 'Castigos y premios en cada fase', 'Penalties and rewards in each phase'],
    ['tabla', [['Situación', 'Situation'], ['Efecto', 'Effect'], ['Significa', 'Meaning']], [
      [['Lanzamiento fallado', 'Failed launch'], ['Fin', 'End'], ['La misión termina. No se juega nada más.', 'The mission ends. Nothing else is played.']],
      [['Fase no crítica fallada', 'Failed non-critical phase'], ['× 0,75', '× 0.75'], ['La tirada al azar falla. La ciencia baja a 75 %.', 'The random roll fails. Science drops to 75 %.']],
      [['Primer fallo crítico', 'First critical failure'], ['× 0,5', '× 0.5'], ['La ciencia y los días bajan a la mitad. La misión sigue.', 'Science and days drop to half. The mission continues.']],
      [['Fallos críticos para perder la nave', 'Critical failures to lose the spacecraft'], '2', ['El segundo fallo crítico pierde la nave. Las fases siguientes no se juegan.', 'The second critical failure loses the spacecraft. The later phases are not played.']],
      [['Evento negativo sin mitigar', 'Unmitigated negative event'], ['≥ × 0,25', '≥ × 0.25'], ['Un factor nunca baja de 0,25.', 'A factor never goes below 0.25.']],
      [['Evento positivo', 'Positive event'], '≤ × 2', ['La ciencia o los días suben, como máximo, al doble.', 'Science or days go up to double at most.']],
    ]],
    ['nota', 'Las fases críticas son las que pueden terminar la misión. El semáforo de cada fase del vuelo muestra su probabilidad actual.', 'Critical phases are the phases that can end the mission. The light of each flight phase shows its current probability.'],
  ],

  puntuacion: [
    ['p', 'El informe da un veredicto y una puntuación. La puntuación usa la regla de la misión, que aparece en la ficha técnica de tu SOP.', 'The report gives a verdict and a score. The score uses the mission rule, which is in the datasheet of your SOP.'],
    ['tabla', [['Regla de puntuación', 'Scoring rule'], ['Cómo cuenta la ciencia', 'How science counts']], [
      [['Retorno de datos (órbita)', 'Data return (orbit)'], ['Ciencia × fracción de vida útil conseguida. Cuenta cuánto dura la misión.', 'Science × fraction of useful life achieved. The length of the mission counts.']],
      [['Cadena de supervivencia (aterrizaje)', 'Survival chain (landing)'], ['Si la nave se pierde, la puntuación es cero. Si no, es ciencia × fracción de días en la superficie.', 'If the spacecraft is lost, the score is zero. If not, it is science × fraction of surface days.']],
      [['Descubrimiento (exploración)', 'Discovery (exploration)'], ['(Σ valor × conseguido + valor de hallazgos) / kWh por día gastados. Σ significa "suma de".', '(Σ value × achieved + value of findings) / kWh per day spent. Σ means "sum of".']],
    ]],
    ['tabla', [['Veredicto', 'Verdict'], ['Condición', 'Condition']], [
      [['Éxito total', 'Full success'], ['Consigues el objetivo prioritario y al menos 80 % de la ciencia.', 'You achieve the priority goal and at least 80 % of the science.']],
      [['Éxito parcial', 'Partial success'], ['Consigues el objetivo prioritario, pero con menos de 80 % de la ciencia.', 'You achieve the priority goal, but with less than 80 % of the science.']],
      [['Fallida', 'Failed'], ['Falla el objetivo prioritario, se pierde la nave o falla el lanzamiento.', 'The priority goal fails, the spacecraft is lost or the launch fails.']],
    ]],
    ['lista', [
      ['Restan: datos que no caben en el enlace, fases fallidas, eventos sin mitigar, retrasos sobre el plazo (recortan el presupuesto) y excesos de tolerancia (suben la probabilidad de fallo).', 'These subtract: data that does not fit in the link, failed phases, unmitigated events, delays past the deadline (they cut the budget) and tolerance overruns (they raise failure probability).'],
      ['Suman: más objetivos secundarios cubiertos, hallazgos ocultos capturados y eventos positivos.', 'These add: more secondary goals covered, hidden findings captured and positive events.'],
    ]],
    ['p', 'El informe explica las causas, los hallazgos y los datos perdidos. También compara tu misión con la misión real. Después, "Volver a volar" te deja rediseñar con lo que aprendiste.', 'The report explains the causes, the findings and the lost data. It also compares your mission with the real mission. After that, "Fly again" lets you redesign with what you learned.'],
  ],

  controles: [
    ['h', 'Moverse por la sala', 'Moving around the room'],
    ['lista', [
      ['Arrastra con el ratón (o con el dedo) para mirar alrededor. Cambia la sensibilidad, la calidad gráfica y la animación del fondo en Ajustes.', 'Drag with the mouse (or your finger) to look around. Change the sensitivity, the graphics quality and the background animation in Settings.'],
      ['Haz clic en un objeto interactivo para usarlo: el holograma del proyector (escenario), la carpeta de misión (expediente), tu portátil, la carpeta de anillas (SOP), la pantalla central de la sala de control, tu consola (tu GO) y la puerta (volver al briefing).', 'Click an interactive object to use it: the projector hologram (scenario), the mission folder (dossier), your laptop, the ring binder (SOP), the main screen of the control room, your console (your GO) and the door (back to the briefing).'],
      ['Esc: te levanta del portátil o te saca de la pantalla ampliada. Vuelves a ver la sala.', 'Esc: stand up from the laptop or leave the zoomed screen. You see the room again.'],
    ]],
    ['h', 'El portátil', 'The laptop'],
    ['lista', [
      ['Haz clic en el portátil o en el botón "Portátil" para sentarte. La barra de arriba muestra la fase y la guía de lo siguiente. El dock tiene las apps de la fase.', 'Click the laptop or the "Laptop" button to sit down. The top bar shows the phase and a guide to what comes next. The dock has the apps of the phase.'],
      ['"Sala (Esc)" te levanta. El icono "Sala de control" del dock te lleva directo a esa sala.', '"Room (Esc)" stands you up. The "Control room" icon in the dock takes you directly to that room.'],
      ['Con "Manual de juego" (este manual) y "Manual SOP" lees las reglas sin salir del portátil.', 'With "Game manual" (this manual) and "SOP manual", you read the rules without leaving the laptop.'],
    ]],
    ['h', 'Multijugador', 'Multiplayer'],
    ['lista', [
      ['Abre la misma URL en cada dispositivo. El código de sala va después de #. Ves a los demás con su nick y hacia dónde miran.', 'Open the same URL on each device. The room code goes after #. You see the other players with their nick and where they look.'],
      ['Todos ven al instante cualquier cambio de diseño.', 'Everyone sees any design change instantly.'],
    ]],
  ],
};

// Contenido propio de cada departamento.
const MAN = {
  // =====================================================================================================================
  vuelo: {
    num: '001', rev: 'C',
    mision: ['Estructura, propulsión, actitud y guiado; elegir el cohete; planificar ruta, mes de lanzamiento y sitio de descenso u órbita.', 'Structure, propulsion, attitude and guidance. Choose the rocket. Plan route, launch month and landing site or orbit.'],
    proposito: [
      ['ver', 'flujo', 'Cómo se juega (fases, reloj, revisiones, barras, puntuación, controles): Manual de juego.', 'How the game works (phases, clock, reviews, bars, scoring, controls): Game manual.'],
      ['p', 'El Departamento de Vuelo y Mecánica construye el "cuerpo" de la nave y decide cómo llega al destino. Tus piezas son las que más pesan en la barra de masa.', 'The Flight & Mechanics Department builds the "body" of the spacecraft and decides how it reaches its destination. Your parts weigh the most on the mass bar.'],
      ['h', 'Barras que mueves tú', 'Bars you drive'],
      ['tabla', [['Barra', 'Bar'], ['Qué mide', 'What it measures'], ['Tu palanca', 'Your lever']], [
        [['Masa (kg)', 'Mass (kg)'], ['Masa de todas las piezas + masa de la ruta + masa de las contingencias, contra la capacidad del cohete al destino.', 'Mass of all parts + route mass + contingency mass, against the rocket capacity to the destination.'], ['Cohete, ruta, estructura, propulsión', 'Rocket, route, structure, propulsion']],
        [['Volumen', 'Volume'], ['Lo que ocupan las piezas contra el volumen que da la estructura.', 'What the parts take up against the volume the structure provides.'], ['Estructura', 'Structure']],
        [['Presupuesto', 'Budget'], ['El cohete y la ruta son de los gastos más grandes de la misión.', 'The rocket and the route are among the biggest expenses of the mission.'], ['Cohete, ruta', 'Rocket, route']],
      ]],
      ['h', 'Tu papel en cada fase', 'Your role in each phase'],
      ['tabla', [['Fase', 'Phase'], ['Qué haces', 'What you do']], [
        [['Briefing', 'Briefing'], ['Lees el destino y los días previstos; ayudas a decidir cuántos objetivos secundarios aceptar.', 'You read the destination and planned days. You help decide how many secondary goals to accept.']],
        [['Diseño', 'Design'], ['Montas estructura, propulsión y actitud. Eliges cohete (cámara de lanzamiento) y ruta. Planificas el mes de lanzamiento y el sitio en la sala de control.', 'You mount structure, propulsion and attitude. You choose the rocket (launch camera) and route. You plan the launch month and the site in the control room.']],
        [['Recortes', 'Trimming'], ['Recortas masa o dinero: cambiar a un cohete más barato solo vale si no sube ninguna barra.', 'You cut mass or money: swapping to a cheaper rocket only works if it raises no bar.']],
        [['Verificación', 'Verification'], ['Compruebas que hay cohete y ruta, y firmas en la sala de control.', 'You check there is a rocket and a route, and sign in the control room.']],
        [['Misión', 'Mission'], ['Vigilas las fases críticas (despegue, crucero, inserción o aterrizaje) y activas tus contingencias.', 'You watch the critical phases (launch, cruise, insertion or landing) and activate your contingencies.']],
      ]],
    ],
    procedimiento: [
      ['h', 'A. Briefing', 'A. Briefing'],
      ['paso', 'Abre el Expediente. Anota el destino, los días previstos y el objetivo prioritario.', 'Open the Dossier. Note the destination, the planned days and the priority goal.'],
      ['ver', 'flujo', 'Marcar objetivos y pulsar "Listo": Manual de juego › capítulo 3.', 'Ticking goals and pressing "Ready": Game manual › chapter 3.'],
      ['h', 'B. Diseño del cuerpo de la nave', 'B. Designing the spacecraft body'],
      ['paso', 'Monta primero la estructura. Da el volumen donde cabrá todo lo demás y tiene masa propia.', 'Mount the structure first. It gives the volume where everything else must fit and has its own mass.'],
      ['paso', 'Monta propulsión y control de actitud. Mira las opciones de cada pieza: más ágil o más potente suele pesar y gastar más.', 'Mount propulsion and attitude control. Look at the options of each part: more agile or more powerful usually weighs and uses more.'],
      ['check', 'El control de actitud se mantiene encendido en la sombra: avisa a Energía de sus vatios, porque cuenta para la batería.', 'Attitude control stays on in the shadow: tell Power its watts, because they count for the battery.'],
      ['h', 'C. Elegir el cohete (app "Cámara de lanzamiento")', 'C. Choosing the rocket ("Launch camera" app)'],
      ['paso', 'Con las flechas ◀ ▶ recorre los cohetes. Cada ficha da operador, capacidad hasta tu destino y precio.', 'Use the ◀ ▶ arrows to browse the rockets. Each card gives operator, capacity to your destination and price.'],
      ['paso', 'Mira el medidor de margen de masa: masa actual de la nave contra capacidad del cohete. Verde ≤ 100 %, ámbar hasta 120 % (pasa, pero sube el riesgo de fallo en el lanzamiento), rojo más (falla la revisión).', 'Look at the mass margin meter: current spacecraft mass against rocket capacity. Green ≤ 100 %, amber up to 120 % (passes, but raises launch failure risk), red above (fails the review).'],
      ['paso', 'Mira también el impacto en el presupuesto "sin cohete / con este cohete". Pulsa SELECCIONAR.', 'Also look at the budget impact "no rocket / with this rocket". Press SELECT.'],
      ['f', 'masaProc', 'El cohete aporta el límite de masa; tu diseño lo consume. Si el cohete no tiene capacidad a ese destino (0), no sirve.', 'The rocket provides the mass limit. Your design consumes it. If the rocket has no capacity to that destination (0), it is useless.'],
      ['cuidado', 'Solo se ofrecen cohetes en servicio que ya hayan lanzado cargas de NASA. Un cohete barato con poca capacidad te obliga a recortar ciencia; uno enorme se come el presupuesto.', 'Only in-service rockets that have already launched NASA payloads are offered. A cheap rocket with low capacity forces you to cut science. A very large one uses most of the budget.'],
      ['h', 'D. Elegir la ruta (días ↔ propelente ↔ precio ↔ riesgo)', 'D. Choosing the route (days ↔ propellant ↔ price ↔ risk)'],
      ['paso', 'En el anexo (sección 5) tienes la tabla de rutas de tu misión. Cada ruta trae días de viaje, masa de propelente o módulo, precio y un efecto en la probabilidad de una fase (Δp).', 'In the annex (section 5) you have the route table of your mission. Each route brings travel days, propellant or module mass, price and an effect on a phase probability (Δp).'],
      ['paso', 'Regla de bolsillo: un viaje directo y rápido gasta más propelente (más ΔV), así que pesa más y necesita un cohete mayor. Un viaje largo con sobrevuelos usa la gravedad de los planetas, gasta menos, pero expone la nave más tiempo.', 'Rule of thumb: a fast direct trip spends more propellant (more ΔV), so it weighs more and needs a bigger rocket. A long trip with flybys uses the gravity of planets, spends less, but exposes the spacecraft for longer.'],
      ['check', 'Pregúntate: ¿qué kg me ahorro? ¿cuánto dinero? ¿sube o baja la probabilidad de la fase afectada? Si el Δp es negativo en una fase crítica, piensa en comprar la contingencia correspondiente.', 'Ask yourself: how many kg do I save? How much money? Does the probability of the affected phase go up or down? If Δp is negative in a critical phase, think about buying the matching contingency.'],
      ['h', 'E. Sala de control: mes de lanzamiento y sitio', 'E. Control room: launch month and site'],
      ['paso', 'Ve a la sala de control. Elige el mes de lanzamiento: lo ideal es la ventana óptima (menos ΔV). Cada mes de retraso sobre ella cuesta propelente extra (kg), que sube tu barra de masa y puede empujarte más allá del plazo (ver Manual de juego › capítulo 8).', 'Go to the control room. Pick the launch month: the optimal window (lowest ΔV) is ideal. Every month of delay past it costs extra propellant (kg), which raises your mass bar and can push you past the deadline (see Game manual › chapter 8).'],
      ['paso', 'Elige el sitio de descenso o la órbita usando las capas de datos satelitales (color, elevación, composición). Ciencia te propone sitios; tú compruebas que son alcanzables y seguros.', 'Pick the landing site or orbit using the satellite data layers (colour, elevation, composition). Science proposes sites. You check that they are reachable and safe.'],
      ['cuidado', 'Un sitio en una pendiente o con rocas es un riesgo para el aterrizaje (por ejemplo, una nave real se volcó en 2024 por aterrizar en una ladera). Cada cambio de mes o de sitio borra las firmas.', 'A site on a slope or with boulders is a landing risk (for example, a real lander tipped over in 2024 after landing on a slope). Every change of month or site clears the signatures.'],
      ['h', 'F. Recortes y verificación', 'F. Trimming and verification'],
      ['paso', 'Si tu masa o tu dinero se pasan, recorta: quita piezas o cambia a algo que no suba ninguna barra. Una barra de masa pasada de 100 % sube el riesgo de fallo en el lanzamiento, y si falla, la misión termina ahí.', 'If your mass or money is over, trim: remove parts or swap to something that raises no bar. A mass bar over 100 % raises the launch failure risk, and if it fails, the mission ends there.'],
      ['check', 'Tu parte de la verificación: cohete elegido, ruta elegida y masa dentro de lo razonable. Luego firma en la sala de control (ver Manual de juego › capítulo 6).', 'Your part of verification: rocket chosen, route chosen and mass within reason. Then sign in the control room (see Game manual › chapter 6).'],
      ['h', 'G. Durante la misión', 'G. During the mission'],
      ['paso', 'Mira el semáforo de las fases críticas de tu vuelo (despegue, crucero, inserción o aterrizaje). Cómo se castigan los fallos: Manual de juego › capítulo 10.', 'Watch the light of the critical phases of your flight (launch, cruise, insertion or landing). How failures are penalised: Game manual › chapter 10.'],
      ['paso', 'Cuando la sala de control pida una contingencia tuya, pulsa Activar (ver sección 4).', 'When the control room asks for one of your contingencies, press Activate (see section 4).'],
    ],
    formulas: [
      ['h', 'Fórmulas de Vuelo y Mecánica', 'Flight & Mechanics formulas'],
      ['f', 'masa', 'El motor suma la masa de todas las piezas montadas (con la opción elegida), de la ruta y de cada contingencia comprada.', 'The engine adds up the mass of every mounted part (with the chosen option), of the route and of every bought contingency.'],
      ['f', 'limMasa', 'Sin cohete elegido, la barra de masa no tiene límite y sale roja.', 'With no rocket chosen, the mass bar has no limit and shows red.'],
      ['f', 'margen', 'Margen positivo: sobran kg. Ratio entre 1,00 y 1,20: tolerancia (pasa, pero sube el fallo en el lanzamiento: Manual de juego › capítulo 5).', 'Positive margin: kg to spare. Ratio between 1.00 and 1.20: tolerance (passes, but raises launch failure: Game manual › chapter 5).'],
      ['f', 'pres', 'Los eventos de diseño suman o restan presupuesto o multiplican un límite (por ejemplo × 0,9 a la potencia).', 'Design events add or subtract budget or multiply a limit (for example × 0.9 to power).'],
      ['f', 'dv', 'Por qué un poco más de ΔV cuesta mucho más propelente: crece de forma exponencial. La leyenda explica cada símbolo.', 'Why a bit more ΔV costs much more propellant: it grows exponentially. The legend explains each symbol.'],
      ['f', 'pfaseVuelo', 'Tu ruta puede subir o bajar la probabilidad de una fase concreta. El motor recorta el resultado a [0, 1].', 'Your route can raise or lower the probability of one specific phase. The engine clamps the result to [0, 1].'],
    ],
  },

  // =====================================================================================================================
  ciencia: {
    num: '002', rev: 'B',
    mision: ['Instrumentos, qué objetivos se cubren y propuesta de sitio u órbita con capas de datos satelitales.', 'Instruments, which goals are covered, and the site or orbit proposal using satellite data layers.'],
    proposito: [
      ['ver', 'flujo', 'Cómo se juega (fases, reloj, revisiones, barras, puntuación, controles): Manual de juego.', 'How the game works (phases, clock, reviews, bars, scoring, controls): Game manual.'],
      ['p', 'El Departamento de Ciencia decide por qué vamos: qué instrumentos viajan, cuántas horas trabajan y qué objetivos quedan cubiertos. Al final, la nota depende de cuánta ciencia vuelve a casa.', 'The Science Department decides why we go: which instruments fly, how many hours they work and which goals are covered. In the end, the score depends on how much science comes home.'],
      ['h', 'Barras que mueves tú', 'Bars you drive'],
      ['tabla', [['Barra', 'Bar'], ['Qué mide', 'What it measures'], ['Tu palanca', 'Your lever']], [
        [['Ciencia cubierta', 'Science covered'], ['Fracción ponderada de objetivos cubiertos (fórmula en la sección 3).', 'Weighted fraction of covered goals (formula in section 3).'], ['Instrumentos y sus horas de uso', 'Instruments and their usage hours']],
        [['Datos (MB/día)', 'Data (MB/day)'], ['Cada instrumento genera datos: tasa × horas de uso × 0,45.', 'Each instrument generates data: rate × usage hours × 0.45.'], ['Horas de uso', 'Usage hours']],
        [['Potencia, masa, volumen, precio', 'Power, mass, volume, price'], ['Cada instrumento cuesta de todo; es el "cliente" de los otros tres departamentos.', 'Every instrument costs a bit of everything. You are the "customer" of the other three departments.'], ['Qué instrumentos montas', 'Which instruments you mount']],
      ]],
      ['h', 'Tu papel en cada fase', 'Your role in each phase'],
      ['tabla', [['Fase', 'Phase'], ['Qué haces', 'What you do']], [
        [['Briefing', 'Briefing'], ['Propones qué objetivos secundarios merecen la pena y cuáles encarecen demasiado.', 'You propose which secondary goals are worth it and which make things too expensive.']],
        [['Diseño', 'Design'], ['Montas instrumentos, ajustas sus horas, propones el sitio u órbita con las capas de datos y negocias con Energía y Comunicaciones.', 'You mount instruments, adjust their hours, propose the site or orbit with the data layers and negotiate with Power and Communications.']],
        [['Recortes', 'Trimming'], ['Bajas horas de uso o quitas instrumentos de menor valor.', 'You lower usage hours or remove lower-value instruments.']],
        [['Verificación', 'Verification'], ['Compruebas que el objetivo prioritario tiene sus instrumentos encendidos, y firmas en la sala de control.', 'You check that the priority goal has its instruments switched on, and sign in the control room.']],
        [['Misión', 'Mission'], ['Esperas hallazgos y activas tus contingencias (por ejemplo, la protección de los instrumentos).', 'You wait for findings and activate your contingencies (for example, protection of the instruments).']],
      ]],
    ],
    procedimiento: [
      ['h', 'A. Briefing: leer los objetivos', 'A. Briefing: reading the goals'],
      ['paso', 'Abre el Expediente y la tabla de objetivos (sección 5): cada objetivo tiene una pregunta y un valor. Léelos para deducir qué hay que medir.', 'Open the Dossier and the goals table (section 5): each goal has a question and a value. Read them to work out what has to be measured.'],
      ['paso', 'El objetivo prioritario no se puede quitar y cuenta siempre. Tu consejo al equipo: qué secundarios merecen la pena (cada uno sube la dificultad y la nota posible; ver Manual de juego › capítulo 3).', 'The priority goal cannot be dropped and always counts. Your advice to the team: which secondary goals are worth it (each raises difficulty and the possible score; see Game manual › chapter 3).'],
      ['h', 'B. Diseño: cubrir objetivos', 'B. Design: covering goals'],
      ['paso', 'Monta primero los instrumentos que respondan a la pregunta del objetivo prioritario. Un instrumento puede servir a varios objetivos a la vez: son los más rentables.', 'Mount first the instruments that answer the priority goal question. One instrument can serve several goals at once: those are the most profitable.'],
      ['paso', 'Ajusta las horas de uso de cada instrumento mirando la ciencia cubierta en el estado de la sección 5. Menos horas que las que pide el objetivo = menos cobertura (proporcional). Más horas no dan nada extra y cuestan vatios y datos.', 'Set each instrument usage hours while watching the science covered in the status of section 5. Fewer hours than the goal asks for = less coverage (proportional). More hours give nothing extra and cost watts and data.'],
      ['f', 'covProc', 'Los instrumentos del objetivo que están a bordo, entre los que necesita; y la media de horas/día de los montados frente a lo que pide. Si falta alguno, pierdes esa fracción aunque los demás trabajen a tope.', 'The goal instruments that are on board, out of the ones it needs; and the average hours/day of the mounted ones against what it asks for. If one is missing, you lose that fraction even if the others work flat out.'],
      ['check', 'Ejemplo: un objetivo necesita 3 instrumentos y pide 10 h de uso. Montas 2 y los usas 10 h → cobertura = 2/3 × 1 = 0,67. Si los usas 5 h → 2/3 × 0,5 = 0,33.', 'Example: a goal needs 3 instruments and asks for 10 h of use. You mount 2 and use them 10 h → coverage = 2/3 × 1 = 0.67. If you use them 5 h → 2/3 × 0.5 = 0.33.'],
      ['paso', 'Comparte con los demás el coste de lo que montas: tu consumo en vatios (Energía), tu tasa de datos (Comunicaciones) y tu masa y volumen (Vuelo). Un instrumento "hambriento" de datos puede obligar a una antena mayor.', 'Share with the others the cost of what you mount: your power draw (Power), your data rate (Comms) and your mass and volume (Flight). A data-hungry instrument may force a bigger antenna.'],
      ['cuidado', 'En una misión de exploración la nota se divide por la energía gastada (kWh/día): encender instrumentos "por si acaso" te baja la puntuación.', 'In an exploration mission the score is divided by the energy spent (kWh/day): switching instruments on "just in case" lowers your score.'],
      ['h', 'C. Hallazgos ocultos', 'C. Hidden findings'],
      ['paso', 'Algunas misiones esconden descubrimientos. Se tiran aparte de las fases y no sabes cuáles hay. Se capturan solo si uno de los instrumentos que pueden detectarlo está montado y con uso > 0, y la nave no se ha perdido.', 'Some missions hide discoveries. They are rolled apart from the phases and you do not know which ones exist. They are captured only if one of the instruments able to detect it is mounted with usage > 0, and the spacecraft was not lost.'],
      ['check', 'Variedad de instrumentos = más oportunidades. Si el informe dice "estaba ahí pero nada a bordo podía detectarlo", lee qué faltaba y úsalo en el siguiente diseño.', 'A variety of instruments = more chances. If the report says "it was there but nothing on board could detect it", read what was missing and use it in the next design.'],
      ['h', 'D. Elegir el sitio u órbita con capas de datos', 'D. Choosing the site or orbit with data layers'],
      ['paso', 'En la sala de control abre las capas de datos satelitales de tu cuerpo (color, elevación, composición química...). Cada capa viene de una misión real y su ficha indica la fuente.', 'In the control room, open the satellite data layers of your body (colour, elevation, chemical composition...). Each layer comes from a real mission and its card names the source.'],
      ['paso', 'Busca donde está lo que tus objetivos quieren (hielo en cráteres polares, una región con cierta composición, un terreno llano). Propón el sitio a Vuelo y Mecánica, que lo registra y comprueba que se puede llegar.', 'Look for where your goals want to be (ice in polar craters, a region with a given composition, flat terrain). Propose the site to Flight & Mechanics, who records it and checks it is reachable.'],
      ['h', 'E. Cambios de prioridad y recortes', 'E. Priority changes and trimming'],
      ['paso', 'Un evento (aparece en tiempo real, ver Manual de juego › capítulo 7) puede cambiar qué objetivo es el prioritario. Vuelve a revisar qué instrumentos necesita ahora.', 'An event (it appears in real time, see Game manual › chapter 7) can change which goal is the priority. Re-check which instruments it needs now.'],
      ['paso', 'Para recortar solo puedes bajar horas o quitar instrumentos. Quita primero lo de menos valor por vatio o por MB.', 'To trim you can only lower hours or remove instruments. Remove first what has the least value per watt or per MB.'],
      ['check', 'Verificación: el objetivo prioritario tiene instrumentos a bordo y encendidos (cobertura > 0) y, si la misión lo pide, una cobertura mínima (por ejemplo 50 %).', 'Verification: the priority goal has instruments on board and switched on (coverage > 0) and, if the mission asks for it, a minimum coverage (for example 50 %).'],
    ],
    formulas: [
      ['h', 'Fórmulas de Ciencia', 'Science formulas'],
      ['f', 'cov', 'Se calcula por objetivo. Si el objetivo no necesita instrumentos, vale 1.', 'Computed per goal. If the goal needs no instruments, it is 1.'],
      ['f', 'cienTot', 'Es la media ponderada por el valor de cada objetivo (los marcados en el expediente más el prioritario).', 'It is the average weighted by the value of each goal (those ticked in the dossier plus the priority one).'],
      ['f', 'datosGen', 'Mismo cálculo que hace Comunicaciones: tu tasa es su problema.', 'Same calculation Comms makes: your rate is their problem.'],
      ['f', 'cienFin', 'f_S viene del vuelo (fallos de fase y eventos: Manual de juego › capítulo 10). La fracción de datos significa que la ciencia que no cabe en el enlace se pierde.', 'f_S comes from the flight (phase failures and events: Game manual › chapter 10). The data fraction means science that does not fit in the link is lost.'],
      ['ver', 'puntuacion', 'La regla de puntuación de cada tipo de misión (órbita, aterrizaje, exploración): Manual de juego › capítulo 11.', 'The scoring rule of each mission type (orbit, landing, exploration): Game manual › chapter 11.'],
    ],
  },

  // =====================================================================================================================
  potencia: {
    num: '003', rev: 'D',
    mision: ['Paneles solares, baterías, control térmico y polvo: que la nave tenga energía durante todo el ciclo, incluida la sombra.', 'Solar panels, batteries, thermal control and dust: keep the spacecraft powered through the whole cycle, including the shadow.'],
    proposito: [
      ['ver', 'flujo', 'Cómo se juega (fases, reloj, revisiones, barras, puntuación, controles): Manual de juego.', 'How the game works (phases, clock, reviews, bars, scoring, controls): Game manual.'],
      ['p', 'El Departamento de Energía mantiene encendida la nave. Todo lo que montan los demás consume vatios: tú generas, almacenas y enfrías.', 'The Power Department keeps the spacecraft switched on. Everything the other departments mount draws watts: you generate, store and cool.'],
      ['h', 'Barras que mueves tú', 'Bars you drive'],
      ['tabla', [['Barra', 'Bar'], ['Qué mide', 'What it measures'], ['Tu palanca', 'Your lever']], [
        [['Potencia (W)', 'Power (W)'], ['Suma de los vatios de todo lo encendido (uso > 0) contra lo que generan los paneles.', 'Sum of the watts of everything switched on (usage > 0) against what the panels generate.'], ['Paneles', 'Panels']],
        [['Batería (Wh)', 'Battery (Wh)'], ['Energía que gasta en la sombra lo que sigue encendido, contra lo que guardan las baterías.', 'Energy used in the shadow by what stays on, against what the batteries store.'], ['Baterías', 'Batteries']],
        [['Masa, volumen, precio', 'Mass, volume, price'], ['Paneles, baterías y térmica son pesados y caros.', 'Panels, batteries and thermal are heavy and expensive.'], ['Opciones de cada pieza', 'Options of each part']],
      ]],
      ['h', 'Tu papel en cada fase', 'Your role in each phase'],
      ['tabla', [['Fase', 'Phase'], ['Qué haces', 'What you do']], [
        [['Briefing', 'Briefing'], ['Lees las horas de sombra y la distancia al Sol (menos luz = paneles más grandes).', 'You read the shadow hours and the distance to the Sun (less light = bigger panels).']],
        [['Diseño', 'Design'], ['Esperas a que los demás elijan (o les pides su consumo), dimensionas paneles y batería con margen, añades térmica.', 'You wait for the others to choose (or ask for their draw), size panels and battery with margin, add thermal.']],
        [['Recortes', 'Trimming'], ['Si la potencia o la batería se pasan: quita carga (no basta bajar horas: ver cuidado en la sección 2). Pasarse de 100 % sube el fallo en crucero y operaciones.', 'If power or battery are over: remove load (lowering hours is not enough: see the caution in section 2). Going over 100 % raises failure in cruise and operations.']],
        [['Verificación', 'Verification'], ['Compruebas que algo genera energía y firmas en la sala de control.', 'You check that something generates power and sign in the control room.']],
        [['Misión', 'Mission'], ['Activas tus contingencias (por ejemplo calefactores o inclinar los paneles).', 'You activate your contingencies (for example heaters or tilting the panels).']],
      ]],
    ],
    procedimiento: [
      ['h', 'A. Leer la misión', 'A. Reading the mission'],
      ['paso', 'Anota dos datos de la misión (sección 5): las horas de sombra por ciclo y si la misión pone un tope a la potencia. El límite real es el menor entre lo que dan tus paneles y ese tope.', 'Note two pieces of mission data (section 5): the shadow hours per cycle and whether the mission caps power. The real limit is the lower of what your panels give and that cap.'],
      ['h', 'B. Dimensionar los paneles contra la carga', 'B. Sizing the solar array against the load'],
      ['paso', 'Suma la carga: los vatios de todas las piezas encendidas (uso > 0) de los cuatro departamentos. Pide a cada uno su cifra y mira la barra de potencia en Estado.', 'Calculate the load: the watts of all switched-on parts (usage > 0) of the four departments. Ask each one for their figure and look at the power bar in Status.'],
      ['f', 'pPan', 'La barra de potencia cuenta los vatios nominales de cada pieza encendida, sin importar cuántas horas al día.', 'The power bar counts the rated watts of each switched-on part, regardless of how many hours a day.'],
      ['paso', 'Elige la opción de panel. Una opción con más vatios pesa y cuesta más. Deja un margen de un 10-15 % de seguridad.', 'Choose the panel option. An option with more watts weighs and costs more. Leave a 10-15 % safety margin.'],
      ['cuidado', 'Un evento de diseño puede recortar el tope de potencia (× 0,9 o × 0,85). Si vas al 100 % justo, un evento te deja en tolerancia (más riesgo en crucero) o fuera de límite (la revisión falla).', 'A design event can cut the power cap (× 0.9 or × 0.85). If you sit at exactly 100 %, an event leaves you in tolerance (more cruise risk) or out of limits (the review fails).'],
      ['h', 'C. Batería para la sombra (eclipse)', 'C. Battery for the shadow (eclipse)'],
      ['paso', 'En la sombra los paneles no generan. Las piezas marcadas ☾ siguen encendidas y tiran de la batería. Suma sus vatios y multiplícalos por las horas de sombra.', 'In the shadow the panels generate nothing. Parts marked ☾ stay on and draw from the battery. Add their watts and multiply by the shadow hours.'],
      ['f', 'eBatProc', 'Solo cuentan las piezas con ☾ y con uso > 0 (por ejemplo antena, control de actitud y magnetómetro). La capacidad de baterías es la suma de lo que aporta cada una.', 'Only parts with ☾ and usage > 0 count (for example antenna, attitude control and magnetometer). Battery capacity is the sum of what each one provides.'],
      ['check', 'Ejemplo genérico (no son cifras de ninguna pieza): tres equipos con ☾ de 200 W, 100 W y 5 W suman 305 W. Con 2 h de sombra: 305 × 2 = 610 Wh de batería.', 'Generic example (not the figures of any part): three ☾ units of 200 W, 100 W and 5 W add up to 305 W. With 2 h of shadow: 305 × 2 = 610 Wh of battery.'],
      ['nota', 'Más horas de sombra = más batería. Una misión lunar con 5 h de sombra necesita mucha más batería que una órbita de 1,5 h.', 'More shadow hours = more battery. A lunar mission with 5 h of shadow needs much more battery than a 1.5 h orbit.'],
      ['h', 'D. Térmica y polvo', 'D. Thermal and dust'],
      ['paso', 'Radiadores y aislamiento multicapa (MLI) consumen masa y a veces vatios, pero algunos suben la probabilidad de alguna fase.', 'Radiators and multi-layer insulation (MLI) use mass and sometimes watts, but some raise the probability of a phase.'],
      ['paso', 'Mira los eventos de la misión: calor en paneles, frío en la noche lunar, luz que se debilita lejos del Sol, polvo en las lentes. Compra la contingencia que cubra el que más te asuste (sección 4).', 'Look at the mission events: hot panels, lunar night cold, light fading far from the Sun, dust on lenses. Buy the contingency covering the one that scares you most (section 4).'],
      ['h', 'E. Recortes y verificación', 'E. Trimming and verification'],
      ['cuidado', 'Bajar las horas de uso de una pieza no baja la barra de potencia (cuenta los vatios mientras uso > 0), aunque sí baja la energía diaria y los datos. Para bajar vatios hay que quitar la pieza o dejarla en 0 h.', 'Lowering the usage hours of a part does not lower the power bar (it counts the watts while usage > 0), although it does lower daily energy and data. To lower watts you must remove the part or leave it at 0 h.'],
      ['check', 'Verificación: la comprobación "algo a bordo genera energía" depende de que montes al menos un panel. Luego firma en la sala de control (Manual de juego › capítulo 6).', 'Verification: the check "something on board generates power" depends on you mounting at least one panel. Then sign in the control room (Game manual › chapter 6).'],
    ],
    formulas: [
      ['h', 'Fórmulas de Energía', 'Power formulas'],
      ['f', 'pUsada', 'Es la carga que ven los paneles.', 'It is the load the panels see.'],
      ['f', 'pLim', 'Si hay paneles y la misión tiene tope, vale el menor. Un evento de diseño puede multiplicarlo por 0,9 o 0,85.', 'If there are panels and the mission has a cap, the lower applies. A design event can multiply it by 0.9 or 0.85.'],
      ['f', 'eUsada', 'Es la energía que se gasta en la sombra.', 'It is the energy used in the shadow.'],
      ['f', 'eLim', 'Capacidad de baterías.', 'Battery capacity.'],
      ['f', 'eDia', 'No es una barra, pero en misiones de exploración divide la puntuación: ahorrar energía sube nota.', 'It is not a bar, but in exploration missions it divides the score: saving energy raises the score.'],
      ['f', 'inverso', 'A doble distancia del Sol llega la cuarta parte de luz. Por eso un panel real dio 850 W a 3,4 UA pero solo 395 W a 5,25 UA.', 'At double the distance from the Sun a quarter of the light arrives. That is why a real panel gave 850 W at 3.4 AU but only 395 W at 5.25 AU.'],
    ],
  },

  // =====================================================================================================================
  comms: {
    num: '004', rev: 'C',
    mision: ['Antenas, computador, almacenamiento de datos, navegación y segmento de tierra; presupuesto de datos y enlace.', 'Antennas, computer, data storage, navigation and ground segment. Data budget and link.'],
    proposito: [
      ['ver', 'flujo', 'Cómo se juega (fases, reloj, revisiones, barras, puntuación, controles): Manual de juego.', 'How the game works (phases, clock, reviews, bars, scoring, controls): Game manual.'],
      ['p', 'El Departamento de Comunicaciones y Operaciones conecta la nave con la Tierra: solo cuenta la ciencia que llega a casa. También cuidas el computador de a bordo, el almacenamiento y la navegación.', 'The Communications & Operations Department connects the spacecraft to Earth: only the science that reaches home counts. You also maintain the onboard computer, storage and navigation.'],
      ['h', 'Barras que mueves tú', 'Bars you drive'],
      ['tabla', [['Barra', 'Bar'], ['Qué mide', 'What it measures'], ['Tu palanca', 'Your lever']], [
        [['Enlace de datos (MB/día)', 'Data link (MB/day)'], ['Datos que generan las piezas encendidas contra lo que cabe en la bajada.', 'Data generated by switched-on parts against what fits in the downlink.'], ['Antenas, horas de enlace', 'Antennas, link hours']],
        [['Potencia y batería', 'Power and battery'], ['La antena consume muchos vatios y se queda encendida en la sombra.', 'The antenna draws many watts and stays on in the shadow.'], ['Tamaño de la antena', 'Antenna size']],
        [['Masa, volumen, precio', 'Mass, volume, price'], ['Una antena grande da más kbps, pero pesa y cuesta más.', 'A big antenna gives more kbps, but weighs and costs more.'], ['Opciones de cada pieza', 'Options of each part']],
      ]],
      ['h', 'Tu papel en cada fase', 'Your role in each phase'],
      ['tabla', [['Fase', 'Phase'], ['Qué haces', 'What you do']], [
        [['Briefing', 'Briefing'], ['Lees las horas de enlace por día y los días de misión.', 'You read the link hours per day and the mission days.']],
        [['Diseño', 'Design'], ['Pides a Ciencia su tasa de datos, eliges antena y computador, y equilibras el presupuesto de datos.', 'You ask Science for their data rate, choose the antenna and computer, and balance the data budget.']],
        [['Recortes', 'Trimming'], ['Si los datos se pasan: o recortas horas de instrumentos con Ciencia, o cambias a una antena más grande si cabe en el resto de barras.', 'If data is over: either cut instrument hours with Science, or swap to a bigger antenna if it fits in the other bars.']],
        [['Verificación', 'Verification'], ['Compruebas que algo puede enviar datos a casa y firmas en la sala de control.', 'You check that something can send data home and sign in the control room.']],
        [['Misión', 'Mission'], ['Activas tus contingencias y miras cuántos MB se perdieron.', 'You activate your contingencies and see how many MB were lost.']],
      ]],
    ],
    procedimiento: [
      ['h', 'A. Leer la misión', 'A. Reading the mission'],
      ['paso', 'Anota las horas de enlace al día y los días previstos de la misión (sección 5). El enlace solo está abierto esas horas.', 'Note the link hours per day and the planned mission days (section 5). The link is only open for those hours.'],
      ['h', 'B. Presupuesto de datos: generado contra bajada', 'B. Data budget: generated against downlink'],
      ['paso', 'Calcula los datos generados cada día. Cada instrumento (y cada pieza con tasa) genera tasa × horas de uso × 0,45 MB.', 'Calculate the data generated each day. Each instrument (and every part with a rate) generates rate × usage hours × 0.45 MB.'],
      ['paso', 'Calcula la capacidad de bajada: la suma de los kbps de tus antenas × horas de enlace × 0,45.', 'Compute the downlink capacity: the sum of your antennas kbps × link hours × 0.45.'],
      ['f', 'genCap', 'Las dos están en MB por día. La barra "Enlace de datos" es generado / capacidad.', 'Both are in MB per day. The "Data link" bar is generated / capacity.'],
      ['check', 'Ejemplo genérico (no son cifras de ninguna pieza): una antena de 400 kbps y 8 h de enlace → 400 × 8 × 0,45 = 1 440 MB/día. Un instrumento de 300 kbps usado 6 h genera 300 × 6 × 0,45 = 810 MB/día: solo con él ya usas el 56 % del enlace.', 'Generic example (not the figures of any part): a 400 kbps antenna and 8 h of link → 400 × 8 × 0.45 = 1,440 MB/day. A 300 kbps instrument used 6 h generates 300 × 6 × 0.45 = 810 MB/day: on its own it already uses 56 % of the link.'],
      ['h', 'C. Qué pasa con los datos que no caben', 'C. What happens to data that does not fit'],
      ['paso', 'En el diseño: si generado > capacidad, la barra pasa de 100 %. Hasta 120 % pasa la revisión (con más riesgo en la bajada de datos y la ciencia); por encima, la revisión falla (Manual de juego › capítulo 5).', 'In design: if generated > capacity, the bar goes above 100 %. Up to 120 % passes the review (with more risk in downlink and science); above that, the review fails (Game manual › chapter 5).'],
      ['paso', 'En el vuelo: la ciencia se multiplica por min(1, capacidad / generado). Lo que no cabe en el enlace se pierde y el informe lo cuenta en MB.', 'In flight: science is multiplied by min(1, capacity / generated). What does not fit in the link is lost and the report counts it in MB.'],
      ['cuidado', 'Aunque la tolerancia (hasta 120 %) te deje pasar la revisión, con ratio 1,2 solo bajarías el 83 % de los datos (1 / 1,2): perderías el 17 % de la ciencia, y además suma hasta +10 puntos de fallo en la bajada de datos y la ciencia.', 'Even if tolerance (up to 120 %) lets you pass the review, with ratio 1.2 you would only send 83 % of the data (1 / 1.2): you would lose 17 % of the science, plus up to +10 failure points on downlink and science.'],
      ['h', 'D. Elegir la antena, el computador y el resto', 'D. Choosing the antenna, computer and the rest'],
      ['paso', 'Compara las opciones de antena: kbps de bajada contra masa, vatios y precio. La antena tiene ☾: sus vatios entran en el cálculo de batería de Energía.', 'Compare antenna options: downlink kbps against mass, watts and price. The antenna has ☾: its watts enter the battery calculation of Power.'],
      ['paso', 'El computador de a bordo y el almacenamiento, la navegación y el segmento de tierra aparecen en la ficha técnica si tu misión los ofrece.', 'The onboard computer and storage, navigation and the ground segment appear in the datasheet if your mission offers them.'],
      ['paso', 'Negocia con Ciencia: sus horas por encima de lo que pide el objetivo no suman ciencia pero sí datos. Pídeles que las bajen antes de comprar una antena mayor.', 'Negotiate with Science: their hours above what the goal asks for add no science but do add data. Ask them to lower those before buying a bigger antenna.'],
      ['h', 'E. Contingencias y verificación', 'E. Contingencies and verification'],
      ['nota', 'Las contingencias compradas de todo el equipo (máx. 3) quedan guardadas en un único registro, el tuyo. Cada departamento compra y activa las suyas; tú coordinas que el equipo no pase de 3.', 'The contingencies bought by the whole team (max. 3) are stored in one single record, yours. Each department buys and activates its own. You make sure the team does not exceed 3.'],
      ['check', 'Verificación: "algo a bordo puede enviar datos a casa" exige al menos una antena montada. Luego firma en la sala de control (Manual de juego › capítulo 6).', 'Verification: "something on board can send data home" requires at least one antenna mounted. Then sign in the control room (Game manual › chapter 6).'],
    ],
    formulas: [
      ['h', 'Fórmulas de Comunicaciones y Operaciones', 'Communications & Operations formulas'],
      ['f', 'kbps', '1 000 bits/s × 3 600 s = 3,6 Mbit = 0,45 MB. Es la conversión que usa todo el juego para los datos.', '1,000 bits/s × 3,600 s = 3.6 Mbit = 0.45 MB. It is the conversion the whole game uses for data.'],
      ['f', 'h24', 'Estructura, paneles, baterías, antena... están "siempre encendidas". Las que tienen control de uso (instrumentos) se ajustan entre un mínimo y un máximo de h/día.', 'Structure, panels, batteries, antenna... are "always on". Parts with a usage control (instruments) are adjusted between a minimum and a maximum of h/day.'],
      ['f', 'datosGen2', 'Las piezas sin control de uso cuentan 24 h. Si uso = 0, no generan.', 'Parts with no usage control count 24 h. If usage = 0, they generate nothing.'],
      ['f', 'capBaj', 'Se suma la bajada de todas las antenas montadas.', 'The downlink of all mounted antennas is added.'],
      ['f', 'frac', 'Es el factor que multiplica la ciencia de cada objetivo en el vuelo.', 'It is the factor multiplying the science of every goal in flight.'],
      ['f', 'mbPerd', 'Total acumulado durante los días de misión que se consiguen (menos si la nave falla).', 'Total accumulated over the mission days achieved (fewer if the spacecraft fails).'],
      ['f', 'eAnt', 'La antena está marcada ☾: parte de la batería es tuya.', 'The antenna is marked ☾: part of the battery is yours.'],
      ['f', 'velDatos', 'En la vida real una antena más grande o un emisor más potente suben los kbps; alejarse de la Tierra los baja con el cuadrado de la distancia.', 'In real life a bigger antenna or a stronger transmitter raise the kbps. Distance from Earth lowers them with the square of the distance.'],
    ],
  },
};

// Glosario: [término es, término en, definición es, definición en, roles (opcional: solo esos)]
const GLOSARIO = [
  ['ΔV (delta-v)', 'ΔV (delta-v)', 'Cuánto tiene que cambiar la velocidad de la nave en una maniobra. Más ΔV significa más propelente (combustible).', 'How much the spacecraft must change its speed in a manoeuvre. More ΔV needs more propellant (fuel).', ['vuelo']],
  ['C3', 'C3', 'Energía que necesita la nave para escapar de la Tierra (km²/s²). Si C3 es mayor, el mismo cohete lanza menos masa. Por eso cada destino tiene una capacidad distinta.', 'Energy the spacecraft needs to escape Earth (km²/s²). If C3 is higher, the same rocket launches less mass. For this reason, each destination has a different capacity.', ['vuelo']],
  ['Mes de lanzamiento', 'Launch month', 'El mes en que despega la nave. Cada mes tiene sus condiciones (clima, clima espacial, posición del destino) y su ΔV. Si lanzas después de la ventana óptima, necesitas más propelente (kg). También puedes pasar el plazo de los inversores (−4 % de presupuesto por mes de retraso).', 'The month the spacecraft launches. Each month has its own conditions (weather, space weather, target position) and its own ΔV. If you launch after the optimal window, you need more propellant (kg). You can also pass the investor deadline (−4 % budget per month late).', ['vuelo']],
  ['Sobrevuelo (flyby)', 'Flyby', 'Pasar cerca de un planeta para usar su gravedad. La gravedad cambia la velocidad de la nave sin gastar propelente. El viaje dura más.', 'Passing close to a planet to use its gravity. The gravity changes the speed of the spacecraft without spending propellant. The trip takes longer.', ['vuelo']],
  ['Periapsis / apoapsis', 'Periapsis / apoapsis', 'El punto de la órbita más cercano al cuerpo (periapsis) y el más lejano (apoapsis). En una órbita muy alargada, la nave pasa poco tiempo cerca y mucho tiempo lejos.', 'The point of an orbit closest to the body (periapsis) and the point farthest from it (apoapsis). In a very stretched (elliptical) orbit, the spacecraft spends little time close and a lot of time far.', ['vuelo', 'ciencia']],
  ['Inserción orbital', 'Orbit insertion', 'Frenada que deja la nave atrapada en la órbita del planeta. Es una fase crítica. Si falla, la nave pasa de largo.', 'A braking burn that puts the spacecraft into orbit around the planet. It is a critical phase. If it fails, the spacecraft flies past.', ['vuelo']],
  ['LEO / GTO', 'LEO / GTO', 'LEO es una órbita baja alrededor de la Tierra. GTO es una órbita de transferencia que lleva a la órbita geoestacionaria. Se usan para comparar cohetes.', 'LEO is a low orbit around Earth. GTO is a transfer orbit that leads to geostationary orbit. People use them to compare rockets.', ['vuelo']],
  ['Actitud (GNC)', 'Attitude (GNC)', 'Hacia dónde apunta la nave. Unas ruedas de reacción y unos propulsores pequeños la controlan. GNC significa guiado, navegación y control.', 'Where the spacecraft points. Reaction wheels and small thrusters control it. GNC means guidance, navigation and control.', ['vuelo', 'potencia']],
  ['Capacidad del cohete', 'Rocket capacity', 'La masa máxima que el cohete puede llevar a un destino. Es el límite de la barra de masa.', 'The maximum mass the rocket can carry to a destination. It is the limit of the mass bar.', ['vuelo']],
  ['Cobertura', 'Coverage', 'Qué parte de un objetivo científico consigues. Depende de los instrumentos montados y de sus horas de uso, comparadas con lo que pide el objetivo.', 'How much of a science goal you achieve. It depends on the mounted instruments and their usage hours, compared with what the goal asks for.', ['ciencia']],
  ['Uso objetivo', 'Target usage', 'Horas por día que un objetivo pide a sus instrumentos. Con esas horas, el objetivo queda cubierto por completo.', 'Hours per day that a goal asks of its instruments. With those hours, the goal is fully covered.', ['ciencia']],
  ['Hallazgo oculto', 'Hidden finding', 'Un descubrimiento que puede existir. Solo lo captura un instrumento capaz de detectarlo.', 'A discovery that may exist. Only an instrument that can detect it captures it.', ['ciencia']],
  ['Capa de datos', 'Data layer', 'Mapa de un cuerpo hecho con satélites (color, altura, composición). Sirve para elegir el sitio de aterrizaje o la órbita.', 'A satellite map of a body (colour, height, composition). Use it to pick a landing site or an orbit.', ['ciencia', 'vuelo']],
  ['Eclipse / sombra', 'Eclipse / shadow', 'Periodo en que un cuerpo o la Tierra tapan el Sol. Los paneles no generan energía y la batería alimenta la nave.', 'A period when a body or Earth hides the Sun. The panels generate no power and the battery supplies the spacecraft.', ['potencia', 'comms']],
  ['W / Wh', 'W / Wh', 'W es el vatio: la potencia en un instante. Wh es el vatio-hora: la energía. W × h = Wh. La batería se mide en Wh.', 'W is the watt: power at one instant. Wh is the watt-hour: energy. W × h = Wh. Batteries are measured in Wh.', ['potencia', 'comms']],
  ['MLI', 'MLI', 'Aislamiento multicapa: mantas delgadas que frenan el paso del calor.', 'Multi-layer insulation: thin blankets that slow down heat flow.', ['potencia']],
  ['UA (AU)', 'AU', 'Unidad astronómica: distancia media entre la Tierra y el Sol (≈ 150 millones de km).', 'Astronomical unit: the mean distance between Earth and the Sun (≈ 150 million km).', ['potencia']],
  ['Bajada (downlink)', 'Downlink', 'Enlace de la nave hacia la Tierra. Su velocidad se mide en kbps. Solo está abierto algunas horas al día.', 'The link from the spacecraft to Earth. Its speed is measured in kbps. It is open only some hours a day.', ['comms', 'ciencia']],
  ['kbps / MB', 'kbps / MB', 'kbps son kilobits por segundo. MB son megabytes. 1 kbps durante 1 hora = 0,45 MB.', 'kbps means kilobits per second. MB means megabytes. 1 kbps for 1 hour = 0.45 MB.', ['comms', 'ciencia']],
  ['Banda X / Ka', 'X / Ka band', 'Frecuencias de radio para el espacio profundo. Ka lleva más datos que X, pero necesita apuntar mejor la antena.', 'Radio frequencies for deep space. Ka carries more data than X, but it needs more accurate antenna pointing.', ['comms']],
  ['Fase crítica', 'Critical phase', 'Fase del vuelo en la que un fallo es un "golpe crítico". Con dos golpes críticos se pierde la nave.', 'A flight phase where a failure is a "critical hit". After two critical hits, the spacecraft is lost.', null],
  ['Tolerancia', 'Tolerance', 'Entre 100 % y 120 % del límite. La revisión pasa, pero sube la probabilidad de fallo de una etapa del vuelo (≈ +0,5 pp por cada 1 %, hasta +10 pp). Con más de 120 %, la revisión falla. pp significa punto porcentual.', 'Between 100 % and 120 % of the limit. The review passes, but the failure probability of a flight stage goes up (≈ +0.5 pp for each 1 %, up to +10 pp). Above 120 %, the review fails. pp means percentage point.', null],
  ['Contingencia', 'Contingency', 'Seguro que compras en el diseño. Anula un evento negativo concreto durante la misión.', 'Insurance you buy in design. It cancels one specific negative event during the mission.', null],
  ['Margen', 'Margin', 'Diferencia entre el límite y lo usado. Los ingenieros reales dejan margen para lo que todavía no saben.', 'The difference between the limit and what you use. Real engineers keep margin for what they do not yet know.', null],
  ['Valor de juego (≈)', 'Game value (≈)', 'Cifra estimada, porque no hay dato público. Si viene de una ecuación, pasa el cursor sobre ella para ver el cálculo. Los datos reales muestran su fuente.', 'A figure estimated because there is no public data. If it comes from an equation, hover over it to see the calculation. Real data shows its source.', null],
];

// ---------------------------------------------------------------------------------------------------------------------
// Utilidades de render
// ---------------------------------------------------------------------------------------------------------------------
const L = (x) => (Array.isArray(x) ? (idioma() === 'es' ? x[0] : x[1] ?? x[0]) : x ?? '');
const numero = (c, x) => {
  try { if (c.motor?.num) return c.motor.num(x); } catch { /* sigue */ }
  return typeof x === 'number' ? x : Number.isFinite(x?.v) ? x.v : Number.isFinite(x?.juego) ? x.juego : 0;
};
const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
const pct = (x) => `${Math.round((Number(x) || 0) * 100)} %`;

function ecuacion(clave, texto) {
  const e = EQ[clave] ?? { tex: String(clave), leg: [] };
  return h('div', { class: 'sop-f' }, mate(e.tex, true), h('span', { class: 'sop-f-t' }, texto),
    e.leg.length ? h('dl', { class: 'sop-leg' }, e.leg.map(([sim, es, en]) => [h('dt', {}, mate(sim, false)), h('dd', {}, L([es, en]))])) : null);
}

let irCapitulo = () => {};   // lo fija appManual en cada pintado: abre un capítulo del Manual de juego

function celda(x) { return typeof x === 'string' ? x : L(x); }

function renderBloques(bs) {
  let n = 0;
  return bs.map((b) => {
    const k = b[0];
    switch (k) {
      case 'p': return h('p', { class: 'sop-p' }, L([b[1], b[2]]));
      case 'h': return h('h3', { class: 'sop-h2' }, L([b[1], b[2]]));
      case 'paso': n++; return h('div', { class: 'sop-paso' }, h('span', { class: 'sop-n' }, String(n).padStart(2, '0')), h('div', { class: 'sop-paso-t' }, L([b[1], b[2]])));
      case 'check': case 'cuidado': case 'nota':
        return h('div', { class: 'sop-call ' + k }, h('span', { class: 'sop-call-etq' }, T.etiq[k]), h('span', { class: 'sop-call-t' }, L([b[1], b[2]])));
      case 'ver': return h('div', { class: 'sop-call ver' }, h('span', { class: 'sop-call-etq' }, '📖'), h('span', { class: 'sop-call-t' }, L([b[2], b[3]]), ' ',
        h('button', { class: 'boton texto sop-ver', type: 'button', onclick: () => irCapitulo(b[1]) }, `${T.abrirCap} ›`)));
      case 'f': return ecuacion(b[1], L([b[2], b[3]]));
      case 'lista': return h('ul', { class: 'sop-ul' }, b[1].map((it) => h('li', {}, L(it))));
      case 'tabla': return tabla(b[1].map(celda), b[2].map((f) => f.map((x, i) => h('span', {}, celda(x)))));
      default: return null;
    }
  });
}

function tabla(cab, filas, clase = '') {
  return h('div', { class: 'sop-tabla-w' }, h('table', { class: 'sop-tabla ' + clase },
    h('thead', {}, h('tr', {}, cab.map((x) => h('th', {}, x)))),
    h('tbody', {}, filas.map((f) => h('tr', {}, f.map((x) => h('td', {}, x)))))));
}

const nombreDe = (c, x, id) => tx(x?.nombre) || id || '';

// ---------------------------------------------------------------------------------------------------------------------
// Anexo de la misión
// ---------------------------------------------------------------------------------------------------------------------
function sinMision() {
  return h('div', { class: 'sop-call nota' }, h('span', { class: 'sop-call-etq' }, T.etiq.nota),
    h('span', { class: 'sop-call-t' }, h('b', {}, T.sinMision + '. '), T.sinMisionTxt));
}

function efectoTxt(ef) {
  const e = obj(ef), p = [];
  if (e.ciencia != null) p.push(`${T.ciencia} × ${redondear(Number(e.ciencia), 2)}`);
  if (e.dias != null) p.push(`${T.diasEf} × ${redondear(Number(e.dias), 2)}`);
  if (e.falla) p.push(T.falla);
  return p.join(' · ') || '-';
}

function nombreFase(m, id) {
  const f = lista(m?.fases).find((x) => x?.id === id);
  return f ? tx(f.nombre) : '-';
}

function tarjetaContingencia(c, m, ct, rol) {
  const E = obj(c.D?.EVENTOS_MISION);
  const compradas = lista(c.e?.porRol?.comms?.contingencias);
  const activadas = lista(c.e?.vista?.activadas);
  const comprada = compradas.includes(ct.id), activada = activadas.includes(ct.id);
  const eventos = lista(ct.mitiga).map((id) => E[id]).filter(Boolean);
  return h('div', { class: 'sop-ct' + (comprada ? ' comprada' : '') },
    h('div', { class: 'sop-ct-cab' },
      h('b', { class: 'sop-ct-n' }, tx(ct.nombre)),
      comprada ? h('span', { class: 'sop-sello ok' }, T.comprada) : h('span', { class: 'sop-sello' }, T.noComprada),
      activada ? h('span', { class: 'sop-sello act' }, T.activada) : null),
    h('p', { class: 'sop-ct-t' }, tx(ct.texto)),
    h('p', { class: 'sop-ct-c' }, `${T.masa}: `, val(c, ct.masa, 'kg'), `  ·  ${T.precio}: `, valorDinero(c, ct.precio)),
    h('div', { class: 'sop-ct-ev' }, h('span', { class: 'sop-mini' }, T.mitiga),
      eventos.length ? eventos.map((ev) => h('div', { class: 'sop-ev' },
        h('b', {}, tx(ev.nombre)),
        h('div', { class: 'sop-ev-d' }, `${T.fase}: ${nombreFase(m, ev.fase)} · ${T.prob}: ${pct(numero(c, ev.p))} · ${T.efecto}: ${efectoTxt(ev.efecto)}`),
        h('div', { class: 'sop-ev-d' }, tx(ev.texto)),
        ev.leccion ? h('div', { class: 'sop-ev-d lec' }, `${T.leccion}: ${tx(ev.leccion)}`) : null)) : h('span', { class: 'sop-cero' }, '-')));
}

function seccionContingencias(c, rol) {
  const out = renderBloques([['ver', 'contingencias', T.contSop, T.contSop]]);
  out.push(h('h3', { class: 'sop-h2' }, `${T.anexo}: ${depto(rol, 'corto')}`));
  const m = c.mision;
  if (!m) { out.push(sinMision()); return out; }
  const C = obj(c.D?.CONTINGENCIAS);
  const todas = lista(m.contingencias).map((id) => C[id]).filter(Boolean);
  const mias = todas.filter((x) => (x.rol ?? 'comms') === rol);
  if (!mias.length) out.push(h('p', { class: 'sop-p tenue' }, T.ninguna));
  mias.forEach((ct) => out.push(tarjetaContingencia(c, m, ct, rol)));
  const otras = todas.filter((x) => (x.rol ?? 'comms') !== rol);
  if (otras.length) {
    out.push(h('h3', { class: 'sop-h2' }, T.otras));
    out.push(tabla([ROL_TXT(), T.contingencia, `${T.masa} / ${T.precio}`],
      otras.map((ct) => [depto(ct.rol ?? 'comms', 'corto'), tx(ct.nombre), h('span', {}, val(c, ct.masa, 'kg'), ' / ', valorDinero(c, ct.precio))])));
  }
  return out;
}
const ROL_TXT = () => T.depto;

// ---------------------------------------------------------------------------------------------------------------------
// Ficha técnica en vivo
// ---------------------------------------------------------------------------------------------------------------------
const BARRAS_DE = { vuelo: ['masa', 'volumen', 'presupuesto'], ciencia: ['datos', 'potencia', 'presupuesto'], potencia: ['potencia', 'bateria', 'masa'], comms: ['datos', 'potencia', 'presupuesto'] };

function estadoVivo(c, rol) {
  const res = resumenSeguro(c);
  if (!res) return null;
  const fmt = (n) => (Number.isFinite(n) ? redondear(n, n >= 100 ? 0 : 1) : '∞');
  const medidores = BARRAS_DE[rol].map((b) => {
    const x = obj(res.barras?.[b]);
    const r = Number.isFinite(x.ratio) ? x.ratio : 1.4;
    const ancho = Math.min(1.4, Math.max(0, r)) / 1.4 * 100;
    return h('div', { class: 'sop-bar' },
      h('div', { class: 'sop-bar-t' }, h('b', {}, T.nombreBarra[b]), h('span', {}, b === 'presupuesto' ? `${dinero(x.usado)} / ${Number.isFinite(x.limite) ? dinero(x.limite) : '∞'}` : `${fmt(x.usado)} / ${fmt(x.limite)} ${T.unidadBarra[b]}`)),
      h('div', { class: 'sop-bar-m', role: 'img', 'aria-label': pct(x.ratio) },
        h('i', { class: 'sop-bar-r ' + (x.estado ?? 'ok'), style: `width:${ancho}%` }), h('i', { class: 'sop-bar-100' }), h('i', { class: 'sop-bar-120' })),
      h('div', { class: 'sop-bar-p ' + (x.estado ?? 'ok') }, `${Number.isFinite(x.ratio) ? pct(x.ratio) : '∞'} · ${T[x.estado ?? 'ok']}`));
  });
  if (rol === 'ciencia') {
    const t = obj(res.ciencia).total ?? 0;
    medidores.unshift(h('div', { class: 'sop-bar' },
      h('div', { class: 'sop-bar-t' }, h('b', {}, T.cienciaTotal), h('span', {}, pct(t))),
      h('div', { class: 'sop-bar-m' }, h('i', { class: 'sop-bar-r ' + (t >= 0.8 ? 'ok' : 'tolerancia'), style: `width:${Math.min(100, t * 100)}%` }), h('i', { class: 'sop-bar-80' }))));
  }
  return h('div', { class: 'sop-bars' }, medidores);
}

function parametros(c, m) {
  const lim = obj(m.limites), claves = Object.keys(lim);
  const filas = [
    [T.destino, tx(m.cuerpo, m.destino ?? '-')],
    [T.sombra, h('span', {}, `${redondear(numero(c, m.horasSombra), 2)} h`)],
    [T.enlace, h('span', {}, `${redondear(numero(c, m.horasEnlace), 2)} h`)],
    [T.dias, h('span', {}, `${redondear(numero(c, m.diasPrevistos), 0)}`)],
    [T.presupuesto, valorDinero(c, m.presupuesto)],
    [T.puntuacion, T.punt[m.puntuacion] ?? '-'],
    [T.limites, claves.length ? claves.map((k) => `${T.nombreBarra[k] ?? k}: ${k === 'presupuesto' ? dinero(numero(c, lim[k])) : `${redondear(numero(c, lim[k]), 1)} ${T.unidadBarra[k] ?? ''}`.trim()}`).join(' · ') : T.ninguno],
  ];
  return tabla([T.param, T.val], filas, 'sop-t-par');
}

function piezasDe(c, m, rol) {
  const P = obj(c.D?.PIEZAS);
  return Object.values(P).filter((p) => p && p.rol === rol && ((Array.isArray(m.piezas) && m.piezas.includes(p.id)) || lista(p.misiones).includes(m.id)));
}

function aportaTxt(c, a) {
  const o = obj(a), partes = [];
  for (const [k, u, et] of [['potencia', 'W', 'P'], ['bateria', 'Wh', 'Bat'], ['bajada', 'kbps', '↓'], ['volumen', '', 'Vol']]) {
    if (numero(c, o[k]) > 0) partes.push(h('span', { class: 'sop-ap' }, `${et} +`, val(c, o[k], u)));
  }
  return partes.length ? partes : h('span', { class: 'sop-cero' }, '–');
}

function tablaPiezas(c, m, rol) {
  const ps = piezasDe(c, m, rol);
  if (!ps.length) return h('p', { class: 'sop-p tenue' }, T.sinPiezas);
  const v0 = (x, u) => (numero(c, x) > 0 ? val(c, x, u) : h('span', { class: 'sop-cero' }, '–'));
  const filas = [];
  for (const p of ps) {
    const ops = lista(p.opciones);
    const uso = p.uso && typeof p.uso === 'object' ? `${redondear(numero(c, p.uso.min), 0)}–${redondear(p.uso.max == null ? 24 : numero(c, p.uso.max), 0)} (${redondear(p.uso.def == null ? numero(c, p.uso.max ?? 24) : numero(c, p.uso.def), 0)})` : T.fija;
    ops.forEach((o, i) => {
      filas.push([
        i === 0 ? h('span', {}, tx(p.nombre), p.enSombra ? h('span', { class: 'sop-luna', title: T.eclipse }, ' ☾') : null, h('div', { class: 'sop-cat' }, TU.categories?.[p.categoria] ?? '')) : '',
        h('span', {}, tx(o.nombre) || '-'),
        v0(o.masa, 'kg'), v0(o.potencia, 'W'), v0(o.volumen, ''), v0(o.tasa, 'kbps'), (numero(c, o.precio) > 0 ? valorDinero(c, o.precio) : h('span', { class: 'sop-cero' }, '–')),
        aportaTxt(c, o.aporta), i === 0 ? uso : '',
      ]);
    });
  }
  return tabla(T.cabPieza, filas, 'sop-t-piezas');
}

function tablaFases(c, m) {
  const fases = lista(m.fases);
  if (!fases.length) return null;
  const filas = fases.filter((f) => f?.id != null).map((f) => [h('b', {}, tx(f.nombre)), f.critica ? T.critica : T.noCritica, pct(numero(c, f.pBase))]);
  return tabla(T.cabFase, filas, 'sop-t-fases');
}

function extrasVuelo(c, m) {
  const out = [];
  const K = obj(c.D?.COHETES);
  const cohetes = lista(m.cohetes).map((id) => K[id]).filter(Boolean);
  if (cohetes.length) {
    out.push(h('h3', { class: 'sop-h2' }, T.cohetes));
    out.push(tabla(T.cabCohete, cohetes.map((k) => [h('b', {}, tx(k.nombre)), k.operador ?? '-', val(c, obj(k.capacidad)[m.destino], 'kg'), valorDinero(c, k.precio)])));
  }
  const rutas = lista(m.rutas).filter(Boolean);
  if (rutas.length) {
    out.push(h('h3', { class: 'sop-h2' }, T.rutas));
    out.push(tabla(T.cabRuta, rutas.map((r) => [
      h('b', {}, tx(r.nombre)), val(c, r.dias, T.abrDias), val(c, r.masa, 'kg'), valorDinero(c, r.precio),
      r.efecto ? `${nombreFase(m, r.efecto.fase)} ${numero(c, r.efecto.dp) >= 0 ? '+' : ''}${redondear(numero(c, r.efecto.dp) * 100, 0)} %` : '-',
    ])));
  }
  return out;
}

function extrasCiencia(c, m) {
  const out = [];
  const objs = lista(m.objetivos).filter((o) => o && o.id != null);
  const sel = Array.isArray(c.e?.mision?.objetivos) ? c.e.mision.objetivos : null;
  if (objs.length) {
    out.push(h('h3', { class: 'sop-h2' }, T.objetivos));
    out.push(tabla(T.cabObj, objs.map((o) => [
      h('span', {}, h('b', {}, tx(o.nombre)), sel && !o.prioridad && !sel.includes(o.id) ? h('span', { class: 'sop-cero' }, ' (✕)') : null),
      o.prioridad ? T.si : T.no, redondear(numero(c, o.valor ?? 1), 0),
    ])));
  }
  const n = lista(m.oculto).filter(Boolean).length;
  if (n) out.push(h('p', { class: 'sop-p' }, T.ocultos));
  return out;
}

function seccionFicha(c, rol) {
  const m = c.mision;
  if (!m) return [sinMision()];
  const out = [];
  const viva = estadoVivo(c, rol);
  if (viva) { out.push(h('h3', { class: 'sop-h2' }, T.estado), viva); }
  out.push(h('h3', { class: 'sop-h2' }, T.parametros), parametros(c, m));
  if (rol === 'vuelo') out.push(...extrasVuelo(c, m));
  if (rol === 'ciencia') out.push(...extrasCiencia(c, m));
  out.push(h('h3', { class: 'sop-h2' }, T.piezas), tablaPiezas(c, m, rol));
  const fases = tablaFases(c, m);
  if (fases) out.push(h('h3', { class: 'sop-h2' }, T.fasesVuelo), fases);
  return out;
}

const dl = (ent) => h('dl', { class: 'sop-dl' }, ent.map((g) => [h('dt', {}, L([g[0], g[1]])), h('dd', {}, L([g[2], g[3]]))]));

function seccionGlosario(rol) {
  return [
    ...renderBloques([['ver', 'glosario', T.glosSop, T.glosSop]]),
    dl(GLOSARIO.filter((g) => g[4]?.includes(rol))),
  ];
}

function contenido(c, rol, sec) {
  const M = MAN[rol];
  switch (sec) {
    case 'proposito': return renderBloques(M.proposito);
    case 'procedimiento': return renderBloques(M.procedimiento);
    case 'formulas': return renderBloques(M.formulas);
    case 'contingencias': return seccionContingencias(c, rol);
    case 'ficha': return seccionFicha(c, rol);
    case 'glosario': return seccionGlosario(rol);
    default: return [];
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------------------------------------------------

// Estado: c.ui.manual = { rol, seccion, base, vista: 'rol' | 'juego', cap }
function estado(c, rol) {
  const inicial = ROLES.includes(rol) ? rol : ROLES.includes(c?.rol) ? c.rol : 'vuelo';
  const u = (c.ui.manual ??= { rol: inicial, seccion: SECCIONES[0].id, base: inicial, vista: 'rol', cap: CAPITULOS[0].id });
  if (u.base !== inicial) { u.base = inicial; u.rol = inicial; u.seccion = SECCIONES[0].id; u.vista = 'rol'; }   // se reabre con otro rol: vuelve a empezar
  if (!ROLES.includes(u.rol)) u.rol = inicial;
  if (!SECCIONES.some((s) => s.id === u.seccion)) u.seccion = SECCIONES[0].id;
  if (!CAPITULOS.some((s) => s.id === u.cap)) u.cap = CAPITULOS[0].id;
  if (u.vista !== 'juego') u.vista = 'rol';
  return u;
}

const arribaDe = (clave) => requestAnimationFrame(() => requestAnimationFrame(() => {
  const el = document.querySelector(`[data-scroll="sop-${clave}"]`);
  if (el) el.scrollTop = 0;
}));

function contenidoJuego(c, cap) {
  if (cap === 'glosario') return [h('p', { class: 'sop-p' }, T.glosGen), dl(GLOSARIO.filter((g) => !g[4]))];
  return renderBloques(JUEGO[cap] ?? []);
}

// Pestañas: una por departamento + "Manual de juego". onRol(r) / onJuego() deciden qué hacer en cada app.
function pestanas(c, u, enJuego, onRol, onJuego) {
  const color = (r) => `--rc:var(--lp-rol-${r}, ${ROL_COLOR[r]})`;
  return h('nav', { class: 'sop-tabs', role: 'tablist', 'aria-label': T.depto },
    h('button', { class: 'boton sop-tab sop-tab-juego' + (enJuego ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': String(enJuego), onclick: onJuego, title: T.juegoTab },
      h('span', { class: 'sop-tab-t' }, '📖 ' + T.juegoTab)),
    ROLES.map((r) => h('button', {
      class: 'boton sop-tab' + (!enJuego && r === u.rol ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': String(!enJuego && r === u.rol), style: color(r),
      title: depto(r, 'largo'), onclick: () => onRol(r),
    }, h('span', { class: 'sop-tab-t' }, depto(r, 'sigla')), r === c.rol ? h('i', { class: 'sop-tab-yo', title: T.tuDepto }, '★') : null)));
}

function libro(rc, portada, pagina) {
  return h('div', { class: 'sop-libro' }, h('div', { class: 'sop-anillas', 'aria-hidden': 'true' }), portada, pagina);
}

function pie(lista, idx, ir) {
  return h('div', { class: 'sop-pie' },
    h('button', { class: 'boton texto sop-nav', type: 'button', disabled: idx <= 0, onclick: () => ir(idx - 1) }, '◀ ' + (idx > 0 ? L(lista[idx - 1].t) : T.anterior)),
    h('span', { class: 'sop-pag' }, `${T.pag} ${idx + 1} ${T.de} ${lista.length}`),
    h('button', { class: 'boton texto sop-nav', type: 'button', disabled: idx >= lista.length - 1, onclick: () => ir(idx + 1) }, (idx < lista.length - 1 ? L(lista[idx + 1].t) : T.siguiente) + ' ▶'));
}

function vistaJuego(c, u, tabs) {
  const idx = CAPITULOS.findIndex((s) => s.id === u.cap);
  const ir = (i) => { u.cap = CAPITULOS[Math.min(CAPITULOS.length - 1, Math.max(0, i))].id; c.repintar(); arribaDe('juego'); };
  let cuerpo;
  try { cuerpo = contenidoJuego(c, u.cap); } catch (err) { console.error('manual', err); cuerpo = [h('p', { class: 'sop-call cuidado' }, String(err?.message ?? err))]; }
  const portada = h('aside', { class: 'sop-lado' },
    h('div', { class: 'sop-portada' },
      h('div', { class: 'sop-depto' }, T.juego),
      h('div', { class: 'sop-mision-r' }, L(['Cómo se juega, de principio a fin. Las reglas generales están aquí; en cada SOP solo lo propio de tu departamento.', 'How the game works, start to finish. General rules are here; each SOP only holds what is specific to your department.']))),
    h('div', { class: 'sop-indice-t' }, T.indice),
    h('ol', { class: 'sop-indice' }, CAPITULOS.map((s, i) => h('li', {}, h('button', {
      class: 'sop-ind' + (s.id === u.cap ? ' activa' : ''), type: 'button', onclick: () => ir(i), 'aria-current': s.id === u.cap ? 'page' : null,
    }, L(s.t))))));
  const pagina = h('article', { class: 'sop-pagina', 'data-scroll': 'sop-juego', tabindex: '-1' },
    h('header', { class: 'sop-cab' }, h('span', { class: 'sop-cab-d' }, `${T.juegoCab} · ${T.capitulo} ${idx + 1} ${T.de} ${CAPITULOS.length}`), h('h2', { class: 'sop-h1' }, L(CAPITULOS[idx].t))),
    h('div', { class: 'sop-cuerpo' }, cuerpo), pie(CAPITULOS, idx, ir));
  return h('div', { class: 'sop sop-juego', style: '--rc:var(--lp-acento)' }, tabs, libro(null, portada, pagina));
}

function vistaRol(c, u, tabs) {
  const rolVer = u.rol, M = MAN[rolVer];
  const idx = SECCIONES.findIndex((s) => s.id === u.seccion);
  const color = `--rc:var(--lp-rol-${rolVer}, ${ROL_COLOR[rolVer]})`;
  const ir = (i) => { u.seccion = SECCIONES[Math.min(SECCIONES.length - 1, Math.max(0, i))].id; c.repintar(); arribaDe(u.rol); };

  let cuerpo;
  try { cuerpo = contenido(c, rolVer, u.seccion); } catch (err) { console.error('manual', err); cuerpo = [h('p', { class: 'sop-call cuidado' }, String(err?.message ?? err))]; }

  const portada = h('aside', { class: 'sop-lado' },
    h('div', { class: 'sop-portada' },
      h('div', { class: 'sop-depto' }, depto(rolVer, 'largo')),
      h('div', { class: 'sop-mision-r' }, L(M.mision)),
      h('div', { class: 'sop-anexo' }, c.mision ? `${T.anexo}: ${tx(c.mision.nombre)}` : `${T.anexo}: ${T.sinMision}`)),
    h('div', { class: 'sop-indice-t' }, T.indice),
    h('ol', { class: 'sop-indice' }, SECCIONES.map((s, i) => h('li', {}, h('button', {
      class: 'sop-ind' + (s.id === u.seccion ? ' activa' : ''), type: 'button', onclick: () => ir(i), 'aria-current': s.id === u.seccion ? 'page' : null,
    }, L(s.t))))));

  const pagina = h('article', { class: 'sop-pagina', 'data-scroll': `sop-${rolVer}`, tabindex: '-1' },
    h('header', { class: 'sop-cab' }, h('span', { class: 'sop-cab-d' }, `${T.cab} · ${depto(rolVer, 'corto')}`), h('h2', { class: 'sop-h1' }, L(SECCIONES[idx].t))),
    h('div', { class: 'sop-cuerpo' }, cuerpo), pie(SECCIONES, idx, ir));

  return h('div', { class: 'sop', style: color }, tabs, libro(null, portada, pagina));
}

// App "Manual SOP": un manual por departamento (+ pestaña al Manual de juego).
export function appManual(c, { rol } = {}) {
  const u = estado(c, rol);
  irCapitulo = (cap) => { u.cap = cap; u.vista = 'juego'; c.repintar(); arribaDe('juego'); };
  const tabs = pestanas(c, u, u.vista === 'juego',
    (r) => { u.rol = r; u.seccion = SECCIONES[0].id; u.vista = 'rol'; c.repintar(); arribaDe(r); },
    () => { u.vista = 'juego'; c.repintar(); arribaDe('juego'); });
  return u.vista === 'juego' ? vistaJuego(c, u, tabs) : vistaRol(c, u, tabs);
}

// App "Manual de juego" (icono propio del dock del portátil): siempre abre en el Manual de juego.
// Las pestañas de departamento llevan a la app "Manual SOP" de ese rol.
export function appManualJuego(c, { rol } = {}) {
  const u = estado(c, rol);
  irCapitulo = (cap) => { u.cap = cap; c.repintar(); arribaDe('juego'); };
  const tabs = pestanas(c, u, true,
    (r) => { u.rol = r; u.seccion = SECCIONES[0].id; u.vista = 'rol'; c.ui.manualRol = r; c.ui.app = 'manual'; c.repintar(); arribaDe(r); },
    () => { c.repintar(); });
  return vistaJuego(c, u, tabs);
}

export default appManual;
