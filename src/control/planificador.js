// Sala de control · planificación de ruta (fases de diseño): ruta, mes de lanzamiento y sitio/órbita sobre mapas con capas de datos
// satelitales. Vuelo y Mecánica elige ruta y mes; el sitio lo eligen Vuelo y Mecánica o Ciencia.
// Mes de lanzamiento: una línea de tiempo a todo el ancho (la ven los cuatro roles; solo Vuelo y Mecánica fija el mes) con un deslizador,
// la curva de propelente extra (ΔV) y de riesgo de aplazar por clima debajo, el reloj ("ahora"), el plazo de los inversores, los meses pasados
// en gris y las mejores ventanas en verde (botón "Ir a la mejor ventana"). Al pasar el ratón o mover el deslizador se leen fecha, propelente
// extra (kg y % sobre el mejor mes), riesgo por clima, retraso y recorte; y, si ya había un mes fijado, lo que cuesta cambiarlo.
// Las CONDICIONES completas del mes (con su fuente) salen en la columna derecha. El reloj corre: un mes fijado puede quedar atrás.
// Estado local: c.ui.plan = { capas: [ids activas], foco: id de capa de la leyenda, verSitio: id, mesVer: mes candidato sin fijar }.
import { h, lista, valor, redondear, dinero, puedoPor, resumenSeguro, nombreRol } from '../pantallas/ui.js';
import { avisoBloqueo } from './bloqueo.js';
import { textos, tx, depto, idioma } from '../i18n.js';
import { lienzoCapa, valorEn, color } from './capas.js';
import { relojDe, mesMaxDe, condicionesMes, misionDe, coheteDe, rutaDe, num, diaDeMes, MESES_REVISION, RETRASO_CANCELA, GRACIA_RETRASO, RECORTE_MES, RECORTE_MAX } from '../reglas/motor.js';
import { NOMBRE_MES, ANIO0 } from '../datos/calendario.js';

const T = textos({
  es: {
    titulo: 'PLANIFICACIÓN DE RUTA', ruta: 'RUTA', mesTit: 'MES DE LANZAMIENTO', cond: 'CONDICIONES', mapa: 'SITIO / ÓRBITA', efectos: 'EFECTOS EN EL DISEÑO', sitio: 'SITIO', cambiarSitio: 'Cambiar sitio',
    dias: 'días',
    soloMes: () => `Solo ${depto('vuelo')} puede cambiar el mes de lanzamiento (o cualquiera si ese puesto está vacante). Tú puedes explorar el calendario.`,
    soloRuta: () => `Solo ${depto('vuelo')} puede cambiar la ruta (o cualquiera si ese puesto está vacante).`,
    soloSitio: () => `Solo ${depto('vuelo')} o ${depto('ciencia')} pueden elegir el sitio.`,
    capas: 'CAPAS DE DATOS', real: 'dato real', juego: '≈ juego', calculada: 'calculada', elegir: 'ELEGIR SITIO', elegido: 'ELEGIDO',
    sinSitio: 'Pasa el ratón para leer las capas. Haz clic en un sitio u órbita.',
    fasesTit: 'Probabilidad por fase', ciencia: 'Cobertura de objetivos', masa: 'Masa', sombra: 'Horas de sombra por ciclo',
    sinRuta: 'Elige primero una ruta: la geometría del mes cambia el propelente.', propelente: 'Propelente', precio: 'Precio',
    efecto: 'Efecto', sinEfectos: 'Sin efectos especiales.', factor: (f) => `× ${f}`, fuente: 'Fuente',
    noPlan: 'Esta misión no tiene planificación de ruta.', bajo: 'bajo', alto: 'alto', leyenda: 'Leyenda',
    inc: (i) => `inclinación ${i}°`, quien: 'Decide', ok: 'Listo para verificación', falta: 'Falta: mes y sitio', faltaMes: 'Falta: mes de lanzamiento', faltaSitio: 'Falta: sitio',
    // Selector de mes
    ahora: 'ahora', plazo: 'plazo', elegidoMes: 'elegido', hoy: 'Ahora', plazoComp: 'Plazo', sinPlazo: 'sin plazo',
    perdida: (m, s) => `El mes fijado (${m}) ya pasó: el reloj avanza.${s ? ` Siguiente buena opción: ${s}.` : ''} Elige un mes nuevo.`,
    pronto: (n, m) => `El reloj corre en tiempo real: hay que dejar al menos ${n} mes de margen, no se puede lanzar antes de ${m}.`,
    tarde: (m) => `Pasado ${m} los inversores se retiran.`,
    recorte: (p, max) => `Desde el segundo mes de retraso, cada mes recorta un ${p} % la financiación (hasta un ${max} %).`,
    sinMeses: 'No quedan meses para planificar.',
    // Condiciones
    sitioLanz: 'Sitio de lanzamiento', clima: 'Clima del mes', lluvia: 'lluvia', viento: 'viento a 50 m', nubes: 'nubes', mmDia: 'mm/día', ms: 'm/s',
    sinCohete: 'Sin cohete elegido: se muestra Cabo Cañaveral. Cada cohete lanza desde su sitio.',
    espacio: 'Clima espacial', kp: 'Tormenta geomagnética Kp ≥ 7', sep: 'Protones solares >10 MeV', enElMes: 'en el mes',
    geometria: 'Geometría del destino', elong: 'Ángulo Sol–Tierra–destino mínimo', diasConj: (d) => (d > 0 ? `${d} ${d === 1 ? 'día' : 'días'} por debajo de 5°` : 'ningún día por debajo de 5°'),
    dv: 'ΔV necesario', dvFuente: 'modelo de juego', extra: 'Propelente extra', km: 'km/s',
    cometa: 'Cometa 67P', llegada: 'Llegada con la ruta elegida', perihelio: 'Perihelio más cercano', sinRutaCometa: 'Elige una ruta para estimar la llegada.',
    antes: (n) => `${n} ${n === 1 ? 'mes' : 'meses'} antes del perihelio`, despues: (n) => `${n} ${n === 1 ? 'mes' : 'meses'} después del perihelio`,
    plazoFila: 'Respecto al plazo', aTiempo: 'dentro del plazo', retraso: (n, r) => `${n} ${n === 1 ? 'mes' : 'meses'} de retraso${r > 0 ? `, financiación −${r} %` : ''}`,
    sinCond: 'Esta misión no tiene calendario de condiciones.',
    fijado: (m) => `Mes fijado: ${m}`, sinFijar: 'Mes aún sin fijar', saltar: '★ Ir a la mejor ventana', sinVentana: 'No hay ventana libre',
    saltarTip: 'Mueve el selector al primer mes de la mejor ventana: poco propelente extra y poco riesgo de aplazar por clima (franjas verdes).',
    leyCurva: 'Curva: propelente extra (ΔV)', leyScrub: 'Puntos: riesgo de aplazar por clima', leyVentana: 'Mejor ventana', leyPasado: 'Pasado', leyRevision: 'Revisión de diseño', leyDemora: 'Retraso: recorte de financiación',
    fecha: 'Fecha', riesgo: 'Riesgo por clima', plazoChip: 'Plazo y retraso', recorteChip: 'Recorte de presupuesto', sinRecorte: 'sin recorte',
    mejorMes: 'es el mejor mes (0 kg extra)', mejorMesPct: 'es el mejor mes (ΔV mínimo)',
    extraKg: (kg, p) => `+${kg} kg de propelente · +${p} % sobre el mejor mes`, extraPct: (f, p) => `ΔV × ${f} · +${p} % sobre el mejor mes (elige ruta para ver los kg)`,
    scrubTxt: (p, s) => `${p} % de aplazar el intento${s ? ` (${s})` : ''}`,
    mPasado: 'Ese mes ya pasó.', mFase: 'Ahora no se puede fijar el mes.',
    fijarMes: (m) => `Fijar ${m}`, yaFijado: '✓ Mes fijado', soloPrevio: 'vista previa',
    cambio: 'Cambio respecto al mes fijado',
    delta: (dm, kg, pres) => `${dm > 0 ? '+' : '−'}${Math.abs(dm)} ${Math.abs(dm) === 1 ? 'mes' : 'meses'} ${dm > 0 ? 'de retraso' : 'antes'} → ${kg}, ${pres}`,
    deltaKg: (s) => `${s} kg de propelente`, deltaPct: (s) => `ΔV ${s} %`, deltaPres: (s) => `presupuesto ${s}`, mismoMes: 'Es el mes ya fijado.',
    notaRetraso: 'Retrasar no es gratis: cada mes cambia la geometría (ΔV y propelente extra) y, pasado el plazo, los inversores recortan la financiación.',
    marcaAhora: 'ahora', marcaPlazo: 'plazo', marcaFijado: 'fijado', ayuda: '¿Cómo se lee?', kgExtra: (kg) => `${kg} kg extra`, dvExtra: (p) => `ΔV +${p} %`, pctAplazar: (p) => `${p} % de aplazar`, condBoton: (m) => `Condiciones de ${m}`, exitoFase: 'ÉXITO POR FASE', retrasoChip: 'Retraso',
  },
  en: {
    titulo: 'ROUTE PLANNING', ruta: 'ROUTE', mesTit: 'LAUNCH MONTH', cond: 'CONDITIONS', mapa: 'SITE / ORBIT', efectos: 'EFFECTS ON THE DESIGN', sitio: 'SITE', cambiarSitio: 'Change site',
    dias: 'days',
    soloMes: () => `Only ${depto('vuelo')} can change the launch month (or anyone if that seat is vacant). You can still explore the calendar.`,
    soloRuta: () => `Only ${depto('vuelo')} can change the route (or anyone if that seat is vacant).`,
    soloSitio: () => `Only ${depto('vuelo')} or ${depto('ciencia')} can choose the site.`,
    capas: 'DATA LAYERS', real: 'real data', juego: '≈ game', calculada: 'computed', elegir: 'CHOOSE SITE', elegido: 'CHOSEN',
    sinSitio: 'Hover over the map to read layers. Click a site or orbit.',
    fasesTit: 'Probability per phase', ciencia: 'Goal coverage', masa: 'Mass', sombra: 'Shadow hours per cycle',
    sinRuta: 'Choose a route first: the geometry of the month changes the propellant.', propelente: 'Propellant', precio: 'Price',
    efecto: 'Effect', sinEfectos: 'No special effects.', factor: (f) => `× ${f}`, fuente: 'Source',
    noPlan: 'This mission has no route planning.', bajo: 'low', alto: 'high', leyenda: 'Legend',
    inc: (i) => `inclination ${i}°`, quien: 'Decides', ok: 'Ready for verification', falta: 'Missing: month and site', faltaMes: 'Missing: launch month', faltaSitio: 'Missing: site',
    ahora: 'now', plazo: 'deadline', elegidoMes: 'chosen', hoy: 'Now', plazoComp: 'Deadline', sinPlazo: 'no deadline',
    perdida: (m, s) => `The set month (${m}) has already passed: the clock keeps running.${s ? ` Next good option: ${s}.` : ''} Choose a new month.`,
    pronto: (n, m) => `The clock runs in real time: leave at least ${n} month of margin, you cannot launch before ${m}.`,
    tarde: (m) => `After ${m} the investors pull out.`,
    recorte: (p, max) => `From the second month of delay, each month cuts funding by ${p} % (up to ${max} %).`,
    sinMeses: 'No months left to plan.',
    sitioLanz: 'Launch site', clima: 'Weather of the month', lluvia: 'rain', viento: 'wind at 50 m', nubes: 'cloud', mmDia: 'mm/day', ms: 'm/s',
    sinCohete: 'No rocket chosen: Cape Canaveral is shown. Each rocket launches from its own site.',
    espacio: 'Space weather', kp: 'Geomagnetic storm Kp ≥ 7', sep: 'Solar protons >10 MeV', enElMes: 'in the month',
    geometria: 'Target geometry', elong: 'Minimum Sun–Earth–target angle', diasConj: (d) => (d > 0 ? `${d} ${d === 1 ? 'day' : 'days'} under 5°` : 'no days under 5°'),
    dv: 'Required ΔV', dvFuente: 'game model', extra: 'Extra propellant', km: 'km/s',
    cometa: 'Comet 67P', llegada: 'Arrival with the chosen route', perihelio: 'Nearest perihelion', sinRutaCometa: 'Choose a route to estimate the arrival.',
    antes: (n) => `${n} ${n === 1 ? 'month' : 'months'} before perihelion`, despues: (n) => `${n} ${n === 1 ? 'month' : 'months'} after perihelion`,
    plazoFila: 'Against the deadline', aTiempo: 'within the deadline', retraso: (n, r) => `${n} ${n === 1 ? 'month' : 'months'} late${r > 0 ? `, funding −${r} %` : ''}`,
    sinCond: 'This mission has no conditions calendar.',
    fijado: (m) => `Launch month set: ${m}`, sinFijar: 'Launch month not set yet', saltar: '★ Jump to best window', sinVentana: 'No free window',
    saltarTip: 'Moves the selector to the first month of the best window: little extra propellant and low weather scrub risk (green bands).',
    leyCurva: 'Curve: extra propellant (ΔV)', leyScrub: 'Dots: weather scrub risk', leyVentana: 'Best window', leyPasado: 'Past', leyRevision: 'Design review', leyDemora: 'Delay: funding cut',
    fecha: 'Date', riesgo: 'Weather scrub risk', plazoChip: 'Deadline and delay', recorteChip: 'Budget cut', sinRecorte: 'no cut',
    mejorMes: 'is the best month (0 kg extra)', mejorMesPct: 'is the best month (lowest ΔV)',
    extraKg: (kg, p) => `+${kg} kg of propellant · +${p} % over the best month`, extraPct: (f, p) => `ΔV × ${f} · +${p} % over the best month (choose a route to see kg)`,
    scrubTxt: (p, s) => `${p} % chance the attempt slips${s ? ` (${s})` : ''}`,
    mPasado: 'That month has already passed.', mFase: 'The month cannot be set right now.',
    fijarMes: (m) => `Set ${m}`, yaFijado: '✓ Month set', soloPrevio: 'preview',
    cambio: 'Change versus the set month',
    delta: (dm, kg, pres) => `${dm > 0 ? '+' : '−'}${Math.abs(dm)} ${Math.abs(dm) === 1 ? 'month' : 'months'} ${dm > 0 ? 'delay' : 'earlier'} → ${kg}, ${pres}`,
    deltaKg: (s) => `${s} kg propellant`, deltaPct: (s) => `ΔV ${s} %`, deltaPres: (s) => `budget ${s}`, mismoMes: 'This is the month already set.',
    notaRetraso: 'Delay is not free: every month changes the geometry (ΔV and extra propellant) and, past the deadline, investors cut funding.',
    marcaAhora: 'now', marcaPlazo: 'deadline', marcaFijado: 'set', ayuda: 'How to read it', kgExtra: (kg) => `${kg} kg extra`, dvExtra: (p) => `ΔV +${p} %`, pctAplazar: (p) => `${p} % chance to slip`, condBoton: (m) => `${m} conditions`, exitoFase: 'SUCCESS BY PHASE', retrasoChip: 'Delay',
  },
});

const ruta = (archivo) => archivo;
const pct = (x) => `${redondear((x ?? 0) * 100, 0)} %`;
// Número con coma decimal en español.
const n1 = (x, d = 1) => (idioma() === 'es' ? redondear(x, d).replace('.', ',') : redondear(x, d));
// Con los decimales fijos (ΔV y su factor: 1,00).
const nf = (x, d = 2) => (idioma() === 'es' ? x.toFixed(d).replace('.', ',') : x.toFixed(d));
const DIA_MES = 30.4375;
const FASES_PLAN = ['diseno', 'restricciones', 'verificacion'];

// ---------- Mes de lanzamiento: lógica pura (se prueba en pruebas/pruebas-reglas.js) ----------
// Nombre de un mes absoluto (0 = enero de 2027): corto "jun 2028" / "Jun 2028", largo "junio 2028" / "June 2028".
export function etiquetaMes(D, mesAbs, { larga = false, lang = idioma() } = {}) {
  const C = D?.CALENDARIO ?? {};
  const k = Math.max(0, Math.floor(Number(mesAbs) || 0));
  const nombres = (C.NOMBRE_MES ?? NOMBRE_MES)[lang] ?? NOMBRE_MES.en;
  const n = nombres[k % 12];
  return `${larga ? n : n.slice(0, 3)} ${(C.ANIO0 ?? ANIO0) + Math.floor(k / 12)}`;
}

// → null sin planificación; si no { reloj, max, minimo, limite, elegido, perdida, meses: [...] }.
// meses: de reloj.mes a mesMax, cada uno { mes, mesAbs, anio, esAhora, esPlazo, esElegido, motivo: null | 'pronto' | 'tarde' | 'fase' }.
//   pronto: antes de reloj + MESES_REVISION (en diseño y restricciones; la revisión que falta consume esos meses);
//   tarde: más de RETRASO_CANCELA meses tras el plazo (los inversores no esperan). Lo mismo que valida planificarRuta.
export function mesesPlanificables(e, D) {
  const m = misionDe(e, D);
  const P = m ? D?.PLANIFICACION?.[m.id] : null;
  if (!m || !P) return null;
  const rl = relojDe(e, D), max = mesMaxDe(P, m, D);
  const elegido = Number.isInteger(e?.ruta?.mes) ? e.ruta.mes : null;
  const minimo = rl.mes + (e?.fase === 'verificacion' ? 0 : MESES_REVISION);
  const limite = rl.activo ? Math.min(max, rl.plazo + RETRASO_CANCELA) : max;
  const faseOk = FASES_PLAN.includes(e?.fase);
  const meses = [];
  for (let mes = rl.mes; mes <= max; mes++) {
    const mesAbs = rl.inicio + mes;
    meses.push({ mes, mesAbs, anio: (D?.CALENDARIO?.ANIO0 ?? ANIO0) + Math.floor(mesAbs / 12), esAhora: mes === rl.mes, esPlazo: rl.activo && mes === rl.plazo, esElegido: mes === elegido,
      motivo: mes > limite ? 'tarde' : mes < minimo ? 'pronto' : !faseOk ? 'fase' : null });
  }
  return { reloj: rl, max, minimo, limite, elegido, perdida: elegido != null && rl.mes > elegido, meses };
}

// Condiciones de un mes (meses desde el inicio del diseño) como datos: lo que la interfaz enseña al pasar el ratón.
// → null sin planificación; si no { mes, mesAbs, cond (condicionesMes; null sin calendario), sitioLanz, hayCohete, dv (km/s), factor, extraKg,
//   retraso, recorte, cometa: null | { llegadaMesAbs, perihelioMesAbs, meses } } (meses > 0: llega ese tiempo antes del perihelio).
export function condicionesDeMes(e, D, mes) {
  const m = misionDe(e, D);
  const P = m ? D?.PLANIFICACION?.[m.id] : null;
  if (!m || !P) return null;
  const rl = relojDe(e, D), cohete = coheteDe(e, D), laRuta = rutaDe(e, D);
  const mesAbs = rl.inicio + mes;
  const cond = m.reloj ? condicionesMes(m, D, mesAbs, cohete?.id) : null;
  const factor = cond?.factorDv ?? 1;
  const dvMin = num(P.lanzamiento?.dvMin);
  const retraso = rl.activo ? Math.max(0, Math.max(rl.mes, mes) - rl.plazo) : 0;
  const recorte = Math.min(RECORTE_MAX, RECORTE_MES * Math.max(0, retraso - GRACIA_RETRASO));
  let cometa = null;
  const K = D?.CALENDARIO?.COMETA_67P;
  if (m.destino === 'cometa' && K && cond) {
    const periodo = num(K.periodoAnios) * 365.25;
    const llegadaDia = laRuta && num(laRuta.dias) > 0 ? diaDeMes(mesAbs) + num(laRuta.dias) : null;
    const ref = llegadaDia ?? diaDeMes(mesAbs);
    const periDia = num(K.perihelioDia) + Math.round((ref - num(K.perihelioDia)) / periodo) * periodo;
    cometa = { llegadaMesAbs: llegadaDia == null ? null : Math.floor(llegadaDia / DIA_MES), perihelioMesAbs: Math.floor(periDia / DIA_MES), meses: llegadaDia == null ? null : (periDia - llegadaDia) / DIA_MES };
  }
  return { mes, mesAbs, cond, sitioLanz: cond ? D?.CALENDARIO?.SITIOS_LANZAMIENTO?.[cond.sitioLanz] ?? null : null, hayCohete: !!cohete,
    dv: dvMin > 0 && cond ? dvMin * factor : null, factor, extraKg: laRuta && cond ? num(laRuta.masa) * (factor - 1) : null, retraso, recorte, cometa };
}

// ---------- Análisis de la línea de tiempo (lógica pura: se puede probar sin DOM) ----------
const TOL_DV = 0.03;      // un mes está en la mejor ventana si su ΔV está a menos de 0,03 del mínimo…
const TOL_SCRUB = 0.04;   // …y su riesgo de aplazar por clima a menos de 4 puntos del mejor de esos meses.

// → null sin planificación; si no { info (mesesPlanificables), filas: [0..limite], masa (kg de propelente de la ruta o null), fMin, mejor, optimos: Set, grupos: [[mes..]] }.
// fila = { mes, mesAbs, libre, motivo ('pasado' | 'pronto' | 'tarde' | 'fase' | null), factor, extraKg, scrub, retraso, recorte, recorteM, kgSobreMejor, pctSobreMejor }.
// Mejor ventana: entre los meses fijables, los de ΔV mínimo (±TOL_DV) y, de esos, los de menor riesgo de aplazar por clima (±TOL_SCRUB).
export function analisisMeses(e, D) {
  const info = mesesPlanificables(e, D);
  if (!info) return null;
  const rl = info.reloj, m = misionDe(e, D), laRuta = rutaDe(e, D);
  const masa = laRuta ? num(laRuta.masa) : null;
  const base = num(m?.presupuesto?.v ?? m?.presupuesto?.juego ?? m?.presupuesto) * (1 + (rl.bono ?? 0));
  const filas = [];
  for (let mes = 0; mes <= info.limite; mes++) {
    const k = condicionesDeMes(e, D, mes);
    const x = info.meses.find((y) => y.mes === mes);
    filas.push({ mes, mesAbs: rl.inicio + mes, libre: !!x && !x.motivo, motivo: mes < rl.mes ? 'pasado' : x?.motivo ?? null,
      factor: k?.factor ?? 1, extraKg: k?.extraKg ?? null, scrub: k?.cond?.pScrub ?? null, retraso: k?.retraso ?? 0, recorte: k?.recorte ?? 0, recorteM: base * (k?.recorte ?? 0) });
  }
  const libres = filas.filter((f) => f.libre);
  const fMin = libres.length ? Math.min(...libres.map((f) => f.factor)) : 1;
  for (const f of filas) {
    f.pctSobreMejor = fMin > 0 ? (f.factor / fMin - 1) * 100 : 0;
    f.kgSobreMejor = masa != null ? masa * (f.factor - fMin) : null;
  }
  const a = libres.filter((f) => f.factor <= fMin + TOL_DV);
  const sMin = a.length ? Math.min(...a.map((f) => f.scrub ?? 0)) : 0;
  const optimas = a.filter((f) => (f.scrub ?? 0) <= sMin + TOL_SCRUB);
  const grupos = [];
  for (const f of optimas) {
    const g = grupos[grupos.length - 1];
    if (g && g[g.length - 1] === f.mes - 1) g.push(f.mes); else grupos.push([f.mes]);
  }
  return { info, filas, masa, fMin, mejor: optimas[0] ?? null, optimos: new Set(optimas.map((f) => f.mes)), grupos };
}

// Lo que cuesta pasar del mes `a` (fijado) al mes `b` (candidato). kg es null si aún no hay ruta.
export function deltaMes(a, b) {
  if (!a || !b) return null;
  return { meses: b.mes - a.mes, kg: a.extraKg != null && b.extraKg != null ? b.extraKg - a.extraKg : null, pct: (b.factor / (a.factor || 1) - 1) * 100, recorteM: b.recorteM - a.recorteM };
}

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, a) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a ?? {})) el.setAttribute(k, v); return el; };
const signo = (x, d = 0) => { const r = Math.round(x * 10 ** d) / 10 ** d; return r === 0 ? '0' : `${r > 0 ? '+' : '−'}${n1(Math.abs(r), d)}`; };

// ---------- Línea de tiempo del mes de lanzamiento e interfaz de condiciones ----------
function marcas(info, x) {
  return [x.esAhora ? T.ahora : null, x.esPlazo ? T.plazo : null, x.esElegido ? T.elegidoMes : null].filter(Boolean);
}

function condicionesNodos(c, info, x) {
  const D = c.D, k = condicionesDeMes(c.e, D, x.mes);
  const nombre = (abs) => etiquetaMes(D, abs);
  const cab = h('summary', { class: 'boton texto' }, T.condBoton(etiquetaMes(D, x.mesAbs)));
  const cuerpo = (...n) => [cab, h('div', { class: 'pl-cond-pop' }, h('h3', { class: 'pl-cond-cab' }, T.cond, ' · ', h('b', {}, etiquetaMes(D, x.mesAbs, { larga: true }))), ...n)];
  if (!k?.cond) return cuerpo(h('p', { class: 'mc-nota tenue' }, T.sinCond));
  const q = k.cond;
  const fila = (etq, fuente, ...cuerpo) => h('div', { class: 'pl-fila' }, h('dt', {}, etq, fuente ? h('small', {}, fuente) : null), h('dd', {}, ...cuerpo));
  const filas = [];
  if (q.lluvia != null) {
    filas.push(fila(T.clima, 'NASA POWER', h('b', {}, k.sitioLanz ? tx(k.sitioLanz.nombre) : '—'),
      h('span', {}, `${T.lluvia} ${n1(q.lluvia)} ${T.mmDia} · ${T.viento} ${n1(q.viento50)} ${T.ms} · ${T.nubes} ${n1(q.nubes, 0)} %`)));
  }
  filas.push(fila(T.espacio, 'NASA OMNI2', h('span', {}, `${T.kp}: ${pct(q.pKp7)} ${T.enElMes}`), h('span', {}, `${T.sep}: ${pct(q.pSep)} ${T.enElMes}`)));
  if (q.elong != null) filas.push(fila(T.geometria, 'JPL Horizons', h('span', {}, `${T.elong}: ${n1(q.elong)}°`), h('span', {}, T.diasConj(q.diasConj))));
  if (k.dv != null) {
    filas.push(fila(T.dv, T.dvFuente, h('span', {}, `${nf(k.dv)} ${T.km} (${T.factor(nf(k.factor))})`),
      k.extraKg != null ? h('span', {}, `${T.extra}: ${redondear(k.extraKg, 0)} kg`) : null));
  }
  if (k.cometa) {
    filas.push(fila(T.cometa, 'JPL Horizons', h('span', {}, `${T.perihelio}: ${nombre(k.cometa.perihelioMesAbs)}`),
      k.cometa.meses == null ? h('span', { class: 'tenue' }, T.sinRutaCometa)
        : h('span', {}, `${T.llegada}: ${nombre(k.cometa.llegadaMesAbs)} (${(k.cometa.meses >= 0 ? T.antes : T.despues)(n1(Math.abs(k.cometa.meses)))})`)));
  }
  if (info.reloj.activo) filas.push(fila(T.plazoFila, null, h('span', {}, k.retraso > 0 ? T.retraso(k.retraso, Math.round(k.recorte * 100)) : T.aTiempo)));
  return cuerpo(h('dl', { class: 'pl-datos' }, filas), k.hayCohete ? null : h('p', { class: 'mc-nota tenue' }, T.sinCohete));
}

// Un <details> se vuelve a crear en cada repintado: guarda en el estado local si el jugador lo dejó abierto.
function recordarAbierto(el, u, clave) {
  el.open = !!u[clave];
  el.addEventListener('toggle', () => { u[clave] = el.open; });
  return el;
}

// Devuelve las dos tarjetas: la línea de tiempo (a todo el ancho, arriba) y las condiciones del mes visto (columna derecha).
function panelMeses(c, u) {
  const D = c.D, A = analisisMeses(c.e, D);
  const puedo = puedoPor(c, 'vuelo');
  const tiempo = h('section', { class: 'mc-panel pl-tiempo' });
  // Las condiciones completas del mes son consulta (sus cifras clave ya salen en la lectura de la línea de tiempo): plegadas.
  const cond = recordarAbierto(h('details', { class: 'pl-cond' }), u, 'condAbierta'); // ficha flotante junto a la línea de tiempo
  if (!A) { tiempo.append(h('h3', {}, T.mesTit), h('p', { class: 'mc-nota tenue' }, T.sinCond)); return { tiempo, cond: null }; }
  const { info, filas } = A, rl = info.reloj;
  const N = Math.max(1, info.limite);
  const nombre = (mes, larga = false) => etiquetaMes(D, rl.inicio + mes, { larga });
  const pos = (mes) => `${(mes / N) * 100}%`;
  const libres = filas.filter((f) => f.libre);
  const elegidoOk = info.elegido != null && !info.perdida && filas[info.elegido]?.libre;
  const cercano = (mes) => libres.reduce((b, f) => (b == null || Math.abs(f.mes - mes) < Math.abs(b.mes - mes) ? f : b), null)?.mes ?? rl.mes;
  let cand = Number.isInteger(u.mesVer) && filas[u.mesVer]?.libre ? u.mesVer : elegidoOk ? info.elegido : A.mejor?.mes ?? libres[0]?.mes ?? rl.mes;
  u.mesVer = cand;
  let hover = null;

  // --- cabecera: título, mes fijado (lo ven todos), condiciones, ayuda y fijar ---
  const fijado = h('span', { class: 'pl-lt-fijado' + (info.elegido != null && !info.perdida ? ' ok' : info.perdida ? ' mal' : '') },
    info.elegido != null ? T.fijado(nombre(info.elegido, true)) : T.sinFijar);
  const fijar = puedo ? h('button', { class: 'boton primario pl-lt-fijar', type: 'button', onclick: () => c.enviar('planificarRuta', { mes: cand }) }) : null;
  const leyenda = h('div', { class: 'pl-lt-ley' },
    h('span', { class: 'cur' }, T.leyCurva), h('span', { class: 'scr' }, T.leyScrub), h('span', { class: 'ven' }, T.leyVentana),
    h('span', { class: 'pas' }, T.leyPasado), h('span', { class: 'rev' }, T.leyRevision), rl.activo ? h('span', { class: 'dem' }, T.leyDemora) : null,
    h('span', { class: 'nota' }, T.notaRetraso, info.limite < info.max ? ` ${T.tarde(nombre(info.limite, true))}` : ''));
  const delta = h('div', { class: 'pl-lt-delta' });
  // Leyenda y nota de retraso: consulta, plegadas tras "¿Cómo se lee?" (cada franja también lo dice al pasar el ratón).
  const ayuda = recordarAbierto(h('details', { class: 'pl-lt-ayuda' }, h('summary', { class: 'boton texto' }, T.ayuda), leyenda), u, 'ayudaAbierta');
  tiempo.append(h('div', { class: 'pl-lt-cab' }, h('h3', {}, T.mesTit), fijado, delta, h('span', { class: 'pl-lt-esp' }), cond, ayuda, fijar));

  // --- marcas (ahora, plazo, fijado) en dos carriles para que no se pisen ---
  const lista_ = [{ mes: rl.mes, txt: `▸ ${T.marcaAhora}`, cls: 'ahora' }];
  if (rl.activo && rl.plazo <= info.limite) lista_.push({ mes: rl.plazo, txt: `⚑ ${T.marcaPlazo}`, cls: 'plazo' });
  if (info.elegido != null && info.elegido <= info.limite) lista_.push({ mes: info.elegido, txt: `● ${T.marcaFijado}`, cls: 'fijado' + (info.perdida ? ' perdido' : '') });
  lista_.sort((a, b) => a.mes - b.mes);
  const carril = [];
  const marcasNodos = lista_.map((mk, i) => {
    const lane = i > 0 && mk.mes - lista_[i - 1].mes < Math.max(4, N / 10) && !(carril[i - 1]) ? 1 : 0;
    carril[i] = lane;
    return h('span', { class: `pl-lt-marca ${mk.cls} l${lane}`, style: `left:${pos(mk.mes)}` }, mk.txt);
  });
  const fila_marcas = h('div', { class: 'pl-lt-marcas' + (carril.includes(1) ? ' dos' : '') }, marcasNodos);

  // --- deslizador ---
  const input = h('input', { type: 'range', class: 'pl-lt-rango', min: 0, max: N, step: 1, value: cand, 'aria-label': T.mesTit });
  input.addEventListener('input', () => { cand = cercano(Number(input.value)); u.mesVer = cand; act(); });

  // --- gráfico: franjas, curvas y líneas verticales ---
  const graf = h('div', { class: 'pl-lt-graf' });
  const banda = (a, b, cls, title) => {
    const l = Math.max(0, (a - 0.5) / N), r = Math.min(1, (b + 0.5) / N);
    return r > l ? h('i', { class: 'pl-lt-banda ' + cls, style: `left:${l * 100}%;width:${(r - l) * 100}%`, title: title ?? '' }) : null;
  };
  if (rl.activo && rl.plazo < info.limite) graf.append(banda(rl.plazo + 1, info.limite, 'demora', T.recorte(Math.round(RECORTE_MES * 100), Math.round(RECORTE_MAX * 100))));
  if (rl.mes > 0) graf.append(banda(0, rl.mes - 1, 'pasado', T.mPasado));
  if (info.minimo > rl.mes) graf.append(banda(rl.mes, Math.min(info.minimo - 1, N), 'pronto', T.pronto(MESES_REVISION, nombre(info.minimo, true))));
  for (const g of A.grupos) graf.append(banda(g[0], g[g.length - 1], 'ventana', `${T.leyVentana}: ${nombre(g[0])}${g.length > 1 ? ` – ${nombre(g[g.length - 1])}` : ''}`));
  const svg = svgEl('svg', { viewBox: `0 0 ${N} 100`, preserveAspectRatio: 'none', class: 'pl-lt-svg' });
  for (let i = 0; i <= N; i++) svg.append(svgEl('line', { x1: i, x2: i, y1: 0, y2: 100, class: 'pl-lt-rej' + ((rl.inicio + i) % 12 === 0 ? ' anio' : '') }));
  const fs = filas.map((f) => f.factor), fLo = Math.min(...fs), fHi = Math.max(...fs);
  const yDv = (f) => (fHi - fLo > 1e-9 ? 92 - ((f - fLo) / (fHi - fLo)) * 78 : 86);
  const ss = filas.map((f) => f.scrub ?? 0), sLo = Math.min(...ss), sHi = Math.max(...ss);
  const yScr = (s) => (sHi - sLo > 1e-9 ? 92 - ((s - sLo) / (sHi - sLo)) * 78 : 86);
  const trazo = filas.map((f, i) => `${i ? 'L' : 'M'}${f.mes} ${yDv(f.factor)}`).join(' ');
  svg.append(svgEl('path', { d: `${trazo} L${filas[filas.length - 1].mes} 100 L0 100 Z`, class: 'pl-lt-area' }), svgEl('path', { d: trazo, class: 'pl-lt-curva' }));
  if (sHi - sLo > 1e-9) svg.append(svgEl('path', { d: filas.map((f, i) => `${i ? 'L' : 'M'}${f.mes} ${yScr(f.scrub ?? 0)}`).join(' '), class: 'pl-lt-scrub' }));
  graf.append(svg);
  graf.append(h('i', { class: 'pl-lt-linea ahora', style: `left:${pos(rl.mes)}` }));
  if (rl.activo && rl.plazo <= info.limite) graf.append(h('i', { class: 'pl-lt-linea plazo', style: `left:${pos(rl.plazo)}` }));
  if (info.elegido != null && info.elegido <= info.limite) graf.append(h('i', { class: 'pl-lt-linea fijado' + (info.perdida ? ' perdido' : ''), style: `left:${pos(info.elegido)}` }));
  const lCand = h('i', { class: 'pl-lt-linea cand' }), lHover = h('i', { class: 'pl-lt-linea hover' });
  graf.append(lHover, lCand);

  // --- eje: año en enero, mes cada trimestre ---
  const eje = h('div', { class: 'pl-lt-eje' });
  for (let i = 0; i <= N; i++) {
    const abs = rl.inicio + i, mm = abs % 12;
    if (mm % 3 !== 0) continue;
    const e0 = etiquetaMes(D, abs);
    eje.append(h('span', { class: mm === 0 ? 'anio' : '', style: `left:${pos(i)}` }, mm === 0 ? e0.split(' ')[1] : e0.split(' ')[0]));
  }

  const zona = h('div', { class: 'pl-lt-zona' }, fila_marcas, input, graf, eje);
  const mesBajoRaton = (ev) => { const r = graf.getBoundingClientRect(); return Math.min(N, Math.max(0, Math.round(((ev.clientX - r.left) / r.width) * N))); };
  zona.addEventListener('pointermove', (ev) => {
    const mes = mesBajoRaton(ev);
    if (ev.buttons & 1) { if (ev.target !== input) { cand = cercano(mes); u.mesVer = cand; } hover = null; } else hover = mes;
    act();
  });
  zona.addEventListener('pointerleave', () => { hover = null; act(); });
  graf.addEventListener('click', (ev) => { cand = cercano(mesBajoRaton(ev)); u.mesVer = cand; act(); });

  const lectura = h('div', { class: 'pl-lt-lectura', 'aria-live': 'polite' });
  tiempo.append(zona, lectura);
  if (info.perdida) {
    const sug = A.mejor ?? libres[0];
    tiempo.append(h('p', { class: 'mc-nota aviso pl-perdida', role: 'alert' }, T.perdida(nombre(info.elegido, true), sug ? nombre(sug.mes, true) : null)));
  }
  if (!c.e?.porRol?.vuelo?.ruta) tiempo.append(h('p', { class: 'mc-nota aviso' }, T.sinRuta));
  if (!puedo) tiempo.append(avisoBloqueo(T.soloMes()));

  const chip = (etq, ...cuerpo) => h('div', { class: 'pl-lt-chip' }, h('small', {}, etq), h('span', {}, ...cuerpo));
  const xDe = (mes) => info.meses.find((y) => y.mes === mes) ?? { mes, mesAbs: rl.inicio + mes, esAhora: false, esPlazo: rl.activo && mes === rl.plazo, esElegido: mes === info.elegido };
  const leer = (mes) => {
    const f = filas[mes], x = xDe(mes);
    const m = marcas(info, x);
    const fecha = chip(T.fecha, h('b', {}, nombre(mes, true)), m.map((t) => h('em', {}, t)));
    if (!f.libre) {
      const por = f.motivo === 'pasado' ? T.mPasado : f.motivo === 'pronto' ? T.pronto(MESES_REVISION, nombre(info.minimo, true)) : f.motivo === 'tarde' ? T.tarde(nombre(info.limite, true)) : T.mFase;
      return [fecha, h('div', { class: 'pl-lt-chip ancho mal' }, h('span', {}, por))];
    }
    // Solo el dato, sin juicio ("mejor mes", "mejor ventana"): el jugador compara y decide.
    const dv = A.masa != null ? T.kgExtra(n1(f.kgSobreMejor, 0)) : T.dvExtra(n1(f.pctSobreMejor, 0));
    const riesgo = f.scrub == null ? '—' : T.pctAplazar(n1(f.scrub * 100, 0));
    const plazoTxt = !rl.activo ? T.sinPlazo : f.retraso > 0 ? T.retraso(f.retraso, 0) : T.aTiempo;
    const recTxt = f.recorte > 0 ? `−${Math.round(f.recorte * 100)} % · ${dinero(f.recorteM)}` : T.sinRecorte;
    // Plazo y recorte solo cuando ese mes llega tarde: "dentro del plazo / sin recorte" no pide nada al jugador.
    const tarde = rl.activo && f.retraso > 0;
    return [fecha, chip(T.propelente, dv), chip(T.riesgo, riesgo), tarde ? chip(T.retrasoChip, h('span', { class: 'mal' }, plazoTxt, f.recorte > 0 ? ` · ${recTxt}` : '')) : null].filter(Boolean);
  };
  const deltaNodos = () => {
    if (!elegidoOk || cand === info.elegido) return []; // el mes ya fijado: la cabecera ya lo dice
    const d = deltaMes(filas[info.elegido], filas[cand]);
    if (!d) return [];
    const kg = d.kg != null ? T.deltaKg(signo(d.kg)) : T.deltaPct(signo(d.pct));
    const pres = T.deltaPres(`${signo(-d.recorteM, 1)} M USD`);
    const peor = (d.kg ?? d.pct) > 0.5 || d.recorteM > 0.05, mejor = (d.kg ?? d.pct) < -0.5 || d.recorteM < -0.05;
    return [h('b', {}, T.cambio, ': '), h('span', { class: peor && !mejor ? 'mal' : mejor && !peor ? 'bien' : '' }, T.delta(d.meses, kg, pres))];
  };
  const act = () => {
    const v = hover ?? cand;
    input.value = String(cand);
    lectura.replaceChildren(...leer(v));
    delta.replaceChildren(...deltaNodos());
    delta.hidden = !delta.childNodes.length;
    lCand.style.left = pos(cand);
    lHover.style.left = pos(v);
    lHover.hidden = hover == null || hover === cand;
    if (fijar) {
      const ya = elegidoOk && cand === info.elegido;
      fijar.disabled = !filas[cand]?.libre;
      fijar.style.display = ya ? 'none' : ''; // ya fijado: "Mes fijado: …" en la cabecera; un botón apagado no aporta
      fijar.textContent = T.fijarMes(nombre(cand));
    }
    cond.replaceChildren(...condicionesNodos(c, info, xDe(v)).filter(Boolean));
  };
  act();
  return { tiempo, cond };
}

function panelRutas(c) {
  const rutas = lista(c.mision?.rutas);
  const elegida = c.e?.porRol?.vuelo?.ruta;
  const puedo = puedoPor(c, 'vuelo');
  return h('section', { class: 'mc-panel', title: puedo ? null : T.soloRuta() }, h('h3', {}, T.ruta),
    puedo ? null : avisoBloqueo(T.soloRuta()),
    h('div', { class: 'pl-rutas' }, rutas.map((r) => {
      const fase = lista(c.mision.fases).find((f) => f.id === r.efecto?.fase);
      const es = r.id === elegida;
      const tip = [tx(r.nombre) || r.id, puedo ? '' : `🔒 ${T.soloRuta()}`, r.efecto && fase ? `${tx(fase.nombre)}: ${r.efecto.dp > 0 ? '+' : ''}${Math.round(r.efecto.dp * 100)} %` : '', `${T.precio}: ${valor(c, r.precio, 'M USD').textContent}`].filter(Boolean).join(' · ');
      return h('button', {
        class: 'pl-ruta' + (es ? ' elegida' : ''), type: 'button', disabled: !puedo || es, title: tip,
        onclick: () => c.enviar('elegirRuta', { id: r.id }),
      }, h('b', {}, tx(r.nombre) || '—'),
      h('span', {}, valor(c, r.dias, T.dias), ' · ', T.propelente, ' ', valor(c, r.masa, 'kg')));
    })));
}

// ---------- Mapa ----------
const proyectar = (s, figura) => (figura ? { x: s.x, y: s.y } : { x: (s.lon + 180) / 360, y: (90 - s.lat) / 180 });

// Traza en tierra de una órbita de inclinación i (varias vueltas, desplazadas por la rotación del planeta).
function trazaOrbita(inc) {
  const tramos = [];
  for (let v = 0; v < 5; v++) {
    let tramo = [];
    let lonPrev = null;
    for (let k = 0; k <= 120; k++) {
      const u = (k / 120) * Math.PI * 2;
      const i = inc * Math.PI / 180;
      const lat = Math.asin(Math.sin(i) * Math.sin(u)) * 180 / Math.PI;
      let lon = Math.atan2(Math.cos(i) * Math.sin(u), Math.cos(u)) * 180 / Math.PI - 150 + v * 72;
      lon = ((lon + 180) % 360 + 360) % 360 - 180;
      if (lonPrev != null && Math.abs(lon - lonPrev) > 180) { tramos.push(tramo); tramo = []; }
      tramo.push([(lon + 180) / 360, (90 - lat) / 180]);
      lonPrev = lon;
    }
    tramos.push(tramo);
  }
  return tramos;
}

function mapa(c, P, u) {
  const MAPAS = c.D?.MAPAS ?? {};
  const base = MAPAS[P.mapa.base];
  const figura = P.mapa.proyeccion === 'figura';
  const elegido = c.e?.ruta?.sitio ?? null;
  const puedoSitio = puedoPor(c, 'vuelo') || puedoPor(c, 'ciencia');
  const escenario = h('div', { class: 'pl-mapa' + (figura ? ' figura' : ''), style: figura ? `aspect-ratio:${base?.ancho ?? 625}/${base?.alto ?? 450}` : 'aspect-ratio:2/1' });
  if (base) escenario.append(h('img', { src: ruta(base.archivo), alt: tx(base.nombre), draggable: 'false' }));
  for (const capa of lista(P.capas)) {
    if (!u.capas.includes(capa.id) || capa.id === 'color') continue;
    if (capa.real && MAPAS[capa.mapa]) escenario.append(h('img', { class: 'pl-capa', src: ruta(MAPAS[capa.mapa].archivo), alt: '', draggable: 'false' }));
    else if (capa.calculo) {
      const l = lienzoCapa(capa, { archivoBase: base?.archivo, proyeccion: P.mapa.proyeccion, rutaMapa: (id) => MAPAS[id]?.archivo });
      l.canvas.className = 'pl-capa';
      escenario.append(l.canvas);
    }
  }
  // Superposición SVG: sitios, trazas y retícula.
  const NS = 'http://www.w3.org/2000/svg';
  const s = (tag, a) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) el.setAttribute(k, v); return el; };
  const svg = s('svg', { viewBox: '0 0 1000 1000', preserveAspectRatio: 'none', class: 'pl-svg' });
  if (!figura) for (let k = 1; k < 6; k++) { svg.append(s('line', { x1: 0, x2: 1000, y1: k * 1000 / 6, y2: k * 1000 / 6, class: 'pl-reticula' })); }
  if (!figura) for (let k = 1; k < 12; k++) { svg.append(s('line', { y1: 0, y2: 1000, x1: k * 1000 / 12, x2: k * 1000 / 12, class: 'pl-reticula' })); }
  for (const sitio of lista(P.sitios)) {
    const sel = sitio.id === elegido, ver = sitio.id === u.verSitio;
    const g = s('g', { class: 'pl-sitio' + (sel ? ' elegido' : '') + (ver ? ' visto' : ''), 'data-id': sitio.id });
    if (sitio.inc != null) {
      for (const tramo of trazaOrbita(sitio.inc)) {
        g.append(s('polyline', { points: tramo.map(([x, y]) => `${x * 1000},${y * 1000}`).join(' '), class: 'pl-traza' }));
      }
    } else {
      const p = proyectar(sitio, figura);
      g.append(s('circle', { cx: p.x * 1000, cy: p.y * 1000, r: 16, class: 'pl-marca' }));
      g.append(s('circle', { cx: p.x * 1000, cy: p.y * 1000, r: 4, class: 'pl-centro' }));
    }
    const ttl = s('title', {}); ttl.textContent = tx(sitio.nombre); g.append(ttl);
    g.addEventListener('mouseenter', () => escenario.querySelector(`.pl-etq[data-id="${sitio.id}"]`)?.classList.add('hover'));
    g.addEventListener('mouseleave', () => escenario.querySelector(`.pl-etq[data-id="${sitio.id}"]`)?.classList.remove('hover'));
    g.addEventListener('click', (ev) => { ev.stopPropagation(); u.verSitio = sitio.id; c.repintar(); });
    svg.append(g);
  }
  escenario.append(svg);
  // Etiquetas HTML de los sitios (no se deforman con el SVG estirado).
  for (const sitio of lista(P.sitios)) {
    if (sitio.inc != null) continue;
    const p = proyectar(sitio, figura);
    escenario.append(h('span', { class: 'pl-etq' + (sitio.id === elegido ? ' elegido' : '') + (sitio.id === u.verSitio ? ' visto' : '') + (p.x > 0.55 ? ' izq' : ''), 'data-id': sitio.id, style: `left:${p.x * 100}%;top:${p.y * 100}%` }, tx(sitio.nombre)));
  }
  // Lectura de capas bajo el ratón (sin repintar: se escribe directamente en la ficha).
  const ficha = h('div', { class: 'pl-lectura' });
  escenario.addEventListener('mousemove', (ev) => {
    const r = escenario.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
    const punto = figura ? { x, y } : { lat: 90 - y * 180, lon: x * 360 - 180 };
    const filas = [figura ? `x ${redondear(x, 2)} · y ${redondear(y, 2)}` : `${redondear(Math.abs(punto.lat), 1)}°${punto.lat >= 0 ? 'N' : 'S'} · ${redondear(Math.abs(punto.lon), 1)}°${punto.lon >= 0 ? 'E' : 'W'}`];
    for (const capa of lista(P.capas)) {
      if (!capa.calculo || !u.capas.includes(capa.id)) continue;
      const v = valorEn(capa, punto);
      if (v != null) filas.push(`${tx(capa.nombre)}: ${capa.calculo === 'azufre' ? (v * 4).toFixed(1) + ' % S' : pct(v)}`);
    }
    ficha.textContent = filas.join('  ·  ');
  });
  escenario.addEventListener('click', () => { u.verSitio = null; c.repintar(); });

  const botones = h('div', { class: 'pl-capas' }, lista(P.capas).map((capa) => {
    const on = u.capas.includes(capa.id);
    return h('button', {
      class: 'boton texto' + (on ? ' on' : ''), type: 'button', title: [tx(capa.nombre), capa.real ? T.real : /juego|game/i.test(tx(capa.nombre)) ? T.juego : T.calculada, tx(capa.nota)].filter(Boolean).join(' · '),
      onclick: () => {
        if (capa.id === 'color') return;
        u.capas = on ? u.capas.filter((x) => x !== capa.id) : [...u.capas.filter((x) => x === 'color'), capa.id];
        u.foco = on ? null : capa.id;
        c.repintar();
      },
    }, tx(capa.nombre).replace(/\s*\(.*?\)/g, '').replace(/ (de la|en|of|in) .*$/, ''));
  }));
  const foco = lista(P.capas).find((x) => x.id === u.foco && x.calculo);
  const leyenda = foco ? h('div', { class: 'pl-leyenda' }, h('span', {}, T.bajo),
    h('i', { style: `background:linear-gradient(90deg,${[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => `rgb(${color(t).join(',')})`).join(',')})` }),
    h('span', {}, T.alto), h('small', {}, tx(foco.nota))) : null;
  return h('section', { class: 'mc-panel pl-centro-col' }, h('h3', {}, T.mapa),
    botones, escenario, ficha, leyenda, puedoSitio ? null : avisoBloqueo(T.soloSitio()));
}

function fichaSitio(c, P, u, res) {
  const id = u.verSitio ?? c.e?.ruta?.sitio;
  const sitio = lista(P.sitios).find((s) => s.id === id);
  const caja = h('section', { class: 'mc-panel pl-ficha' }, h('h3', {}, T.sitio));
  const tarjeta = [];
  if (sitio) {
    const ef = sitio.efectos ?? {};
    const elegido = sitio.id === c.e?.ruta?.sitio;
    const puedo = puedoPor(c, 'vuelo') || puedoPor(c, 'ciencia');
    const filas = [];
    for (const x of lista(ef.fases)) {
      const f = lista(c.mision.fases).find((y) => y.id === x.fase);
      filas.push(h('li', { class: x.dp >= 0 ? 'ok' : 'mal' }, `${tx(f?.nombre) || '—'}: ${x.dp > 0 ? '+' : ''}${Math.round(x.dp * 100)} %`));
    }
    for (const [oid, k] of Object.entries(ef.ciencia ?? {})) {
      const o = lista(c.mision.objetivos).find((y) => y.id === oid);
      filas.push(h('li', { class: k >= 1 ? 'ok' : 'mal' }, `${tx(o?.nombre) || '—'}: ${T.factor(k)}`));
    }
    if (ef.horasSombra != null) filas.push(h('li', {}, `${T.sombra}: ${ef.horasSombra} h`));
    tarjeta.push(h('div', { class: 'pl-sitio-card' + (elegido ? ' elegido' : ''), title: tx(sitio.nota) || null }, // la descripción, al pasar el ratón
      h('b', {}, tx(sitio.nombre)), sitio.inc != null ? h('small', {}, T.inc(sitio.inc)) : sitio.lat != null ? h('small', {}, `${sitio.lat}°, ${sitio.lon}°`) : null,
      filas.length ? h('ul', { class: 'mc-lista' }, filas) : h('p', { class: 'tenue' }, T.sinEfectos),
      // Elegido: el borde verde de la tarjeta ya lo dice; no hace falta un botón apagado.
      elegido ? null : h('button', { class: 'boton primario ancho', type: 'button', disabled: !puedo, title: puedo ? null : `🔒 ${T.soloSitio()}`, onclick: () => c.enviar('planificarRuta', { sitio: sitio.id }) }, T.elegir),
      elegido || puedo ? null : avisoBloqueo(T.soloSitio())));
  }
  const chips = h('div', { class: 'pl-lista-sitios' }, lista(P.sitios).map((s) => h('button', {
    class: 'boton texto' + (s.id === id ? ' on' : ''), type: 'button',
    onclick: () => { u.verSitio = s.id; c.repintar(); },
  }, tx(s.nombre))));
  // Con un sitio ya elegido (y sin previsualizar otro), la lista se pliega: deja sitio a la tarjeta y a los efectos.
  const elegidoYa = c.e?.ruta?.sitio && id === c.e.ruta.sitio;
  if (elegidoYa) caja.append(...tarjeta, recordarAbierto(h('details', { class: 'pl-cambiar' }, h('summary', { class: 'boton texto' }, T.cambiarSitio), chips), u, 'cambiarAbierto'));
  else caja.append(...tarjeta, chips); // al previsualizar, la tarjeta y su botón ELEGIR SITIO arriba: nunca quedan bajo el pliegue
  // Probabilidad por fase: en panelEfectos (columna izquierda). La cobertura de objetivos ya se ve en el Constructor (CIENCIA).
  const sinMes = res?.plan?.mes == null || res.plan.perdida, sinSitio = !res?.plan?.sitio;
  const listo = !sinMes && !sinSitio;
  caja.append(h('p', { class: 'mc-nota ' + (listo ? 'ok' : 'aviso') }, listo ? T.ok : sinMes && sinSitio ? T.falta : sinMes ? T.faltaMes : T.faltaSitio));
  return caja;
}

// Probabilidad por fase con el diseño actual: solo con sitio elegido (al previsualizar un sitio, su tarjeta ya muestra el cambio).
// Va bajo la ruta, en la columna izquierda, que tiene sitio libre; la derecha queda para elegir sitio.
function panelEfectos(c, res) {
  if (!c.e?.ruta?.sitio || !lista(res?.fases).length) return null;
  return h('section', { class: 'mc-panel' }, h('h3', { title: T.efectos }, T.exitoFase), h('ul', { class: 'mc-barras' }, lista(res?.fases).map((f) => h('li', {},
    h('span', {}, tx(f.nombre) || '—'), h('i', {}, h('b', { style: `width:${Math.round(f.p * 100)}%` })), h('em', {}, pct(f.p))))));
}

export function pantallaPlanificador(c) {
  const P = c.D?.PLANIFICACION?.[c.mision?.id];
  if (!P) return h('div', { class: 'mc-vacio' }, h('p', {}, T.noPlan), h('div', { class: 'pl-sola' }, panelRutas(c)));
  const u = (c.ui.plan ??= { capas: ['color'], foco: null, verSitio: null, mesVer: null });
  const res = resumenSeguro(c);
  const { tiempo, cond } = panelMeses(c, u);
  return h('div', { class: 'pl' },
    tiempo,
    h('div', { class: 'pl-izq', 'data-scroll': 'pl-izq' }, panelRutas(c), panelEfectos(c, res)),
    mapa(c, P, u),
    h('div', { class: 'pl-der', 'data-scroll': 'pl-der' }, fichaSitio(c, P, u, res)));
}
export { nombreRol };
