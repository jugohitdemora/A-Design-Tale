// Sala de control · planificación de ruta (fases de diseño): ruta, mes de lanzamiento y sitio/órbita sobre mapas con capas de datos
// satelitales. Vuelo y Mecánica elige ruta y mes; el sitio lo eligen Vuelo y Mecánica o Ciencia.
// El selector de mes enseña los meses entre el reloj y el límite de los inversores. Al pasar el ratón por un mes se leen sus CONDICIONES
// como datos con su fuente (clima del sitio de lanzamiento, tormentas geomagnéticas, conjunción solar, ΔV, llegada al cometa): ninguna
// etiqueta dice qué mes es bueno ni los colorea por calidad; el mejor mes cambia con el reloj y se puede perder.
// Estado local: c.ui.plan = { capas: [ids activas], foco: id de capa de la leyenda, verSitio: id, mesVer: mes visto sin elegir }.
import { h, lista, valor, redondear, puedoPor, resumenSeguro, nombreRol } from '../pantallas/ui.js';
import { textos, tx, depto, idioma } from '../i18n.js';
import { lienzoCapa, valorEn, color } from './capas.js';
import { relojDe, mesMaxDe, condicionesMes, misionDe, coheteDe, rutaDe, num, diaDeMes, MESES_REVISION, RETRASO_CANCELA, GRACIA_RETRASO, RECORTE_MES, RECORTE_MAX } from '../reglas/motor.js';
import { NOMBRE_MES, ANIO0 } from '../datos/calendario.js';

const T = textos({
  es: {
    titulo: 'PLANIFICACIÓN DE RUTA', ruta: 'RUTA', mesTit: 'MES DE LANZAMIENTO', cond: 'CONDICIONES', mapa: 'SITIO / ÓRBITA', efectos: 'EFECTOS EN EL DISEÑO', sitio: 'SITIO', cambiarSitio: 'Cambiar sitio',
    dias: 'días', soloVuelo: `Solo ${depto('vuelo')} elige la ruta y el mes.`,
    soloSitio: `Solo ${depto('vuelo')} o ${depto('ciencia')} eligen el sitio.`,
    capas: 'CAPAS DE DATOS', real: 'dato real', juego: '≈ juego', calculada: 'calculada', elegir: 'ELEGIR SITIO', elegido: 'ELEGIDO',
    sinSitio: 'Pasa el ratón para leer las capas. Haz clic en un sitio u órbita.',
    fasesTit: 'Probabilidad por fase', ciencia: 'Cobertura de objetivos', masa: 'Masa', sombra: 'Horas de sombra por ciclo',
    sinRuta: 'Elige primero una ruta: la geometría del mes cambia el propelente.', propelente: 'Propelente', precio: 'Precio',
    efecto: 'Efecto', sinEfectos: 'Sin efectos especiales.', factor: (f) => `× ${f}`, fuente: 'Fuente',
    noPlan: 'Esta misión no tiene planificación de ruta.', bajo: 'bajo', alto: 'alto', leyenda: 'Leyenda',
    inc: (i) => `inclinación ${i}°`, quien: 'Decide', ok: 'Listo para verificación', falta: 'Falta: mes y sitio', faltaMes: 'Falta: mes de lanzamiento', faltaSitio: 'Falta: sitio',
    // Selector de mes
    ahora: 'ahora', plazo: 'plazo', elegidoMes: 'elegido', hoy: 'Ahora', plazoComp: 'Plazo', sinPlazo: 'sin plazo',
    perdida: (m) => `El mes elegido (${m}) ya pasó. Elige un mes nuevo.`,
    pronto: (n, m) => `Cada revisión de diseño cuesta ${n} meses: no se puede lanzar antes de ${m}.`,
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
    sinCond: 'Esta misión no tiene calendario de condiciones.', soloVer: 'Solo lectura: elige el mes quien lleva la ruta.',
  },
  en: {
    titulo: 'ROUTE PLANNING', ruta: 'ROUTE', mesTit: 'LAUNCH MONTH', cond: 'CONDITIONS', mapa: 'SITE / ORBIT', efectos: 'EFFECTS ON THE DESIGN', sitio: 'SITE', cambiarSitio: 'Change site',
    dias: 'days', soloVuelo: `Only ${depto('vuelo')} can choose the route and month.`,
    soloSitio: `Only ${depto('vuelo')} or ${depto('ciencia')} can choose the site.`,
    capas: 'DATA LAYERS', real: 'real data', juego: '≈ game', calculada: 'computed', elegir: 'CHOOSE SITE', elegido: 'CHOSEN',
    sinSitio: 'Hover over the map to read layers. Click a site or orbit.',
    fasesTit: 'Probability per phase', ciencia: 'Goal coverage', masa: 'Mass', sombra: 'Shadow hours per cycle',
    sinRuta: 'Choose a route first: the geometry of the month changes the propellant.', propelente: 'Propellant', precio: 'Price',
    efecto: 'Effect', sinEfectos: 'No special effects.', factor: (f) => `× ${f}`, fuente: 'Source',
    noPlan: 'This mission has no route planning.', bajo: 'low', alto: 'high', leyenda: 'Legend',
    inc: (i) => `inclination ${i}°`, quien: 'Decides', ok: 'Ready for verification', falta: 'Missing: month and site', faltaMes: 'Missing: launch month', faltaSitio: 'Missing: site',
    ahora: 'now', plazo: 'deadline', elegidoMes: 'chosen', hoy: 'Now', plazoComp: 'Deadline', sinPlazo: 'no deadline',
    perdida: (m) => `The chosen month (${m}) has passed. Choose a new month.`,
    pronto: (n, m) => `Each design review takes ${n} months: you cannot launch before ${m}.`,
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
    sinCond: 'This mission has no conditions calendar.', soloVer: 'Read only: whoever holds the route chooses the month.',
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

// ---------- Selector de mes e interfaz de condiciones ----------
function marcas(info, x) {
  return [x.esAhora ? T.ahora : null, x.esPlazo ? T.plazo : null, x.esElegido ? T.elegidoMes : null].filter(Boolean);
}

function condicionesNodos(c, info, x) {
  const D = c.D, k = condicionesDeMes(c.e, D, x.mes);
  const nombre = (abs) => etiquetaMes(D, abs);
  const cab = h('h3', { class: 'pl-cond-cab' }, T.cond, ' · ', h('b', {}, etiquetaMes(D, x.mesAbs, { larga: true })), marcas(info, x).map((m) => h('em', {}, m)));
  if (!k?.cond) return [cab, h('p', { class: 'mc-nota tenue' }, T.sinCond)];
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
  return [cab, h('dl', { class: 'pl-datos' }, filas), k.hayCohete ? null : h('p', { class: 'mc-nota tenue' }, T.sinCohete)];
}

// Devuelve las dos tarjetas: el selector (columna izquierda) y las condiciones del mes visto (columna derecha).
function panelMeses(c, u) {
  const D = c.D, info = mesesPlanificables(c.e, D);
  const puedo = puedoPor(c, 'vuelo');
  const picker = h('section', { class: 'mc-panel pl-meses' }, h('h3', {}, T.mesTit));
  const cond = h('section', { class: 'mc-panel pl-cond' });
  if (!info) return { picker, cond: null };
  const rl = info.reloj;
  const libres = info.meses.filter((x) => !x.motivo);
  const porDefecto = () => (Number.isInteger(u.mesVer) && u.mesVer >= rl.mes ? u.mesVer : info.elegido != null && !info.perdida ? info.elegido : libres[0]?.mes ?? rl.mes);
  const pintar = (mes) => {
    const x = info.meses.find((y) => y.mes === mes) ?? info.meses[0];
    if (x) cond.replaceChildren(...condicionesNodos(c, info, x).filter(Boolean));
  };
  pintar(porDefecto());

  const nombre = (abs) => etiquetaMes(D, abs);
  picker.append(h('p', { class: 'pl-reloj', title: rl.activo ? T.recorte(Math.round(RECORTE_MES * 100), Math.round(RECORTE_MAX * 100)) : null },
    h('span', {}, `${T.hoy}: `, h('b', {}, nombre(rl.inicio + rl.mes))),
    h('span', {}, `${T.plazoComp}: `, h('b', {}, rl.activo ? nombre(rl.inicio + rl.plazo) : T.sinPlazo))));
  if (info.perdida) picker.append(h('p', { class: 'mc-nota aviso pl-perdida', role: 'alert' }, T.perdida(nombre(rl.inicio + info.elegido))));

  const porAnio = new Map();
  for (const x of info.meses) {
    if (x.motivo === 'tarde') continue;
    if (!porAnio.has(x.anio)) porAnio.set(x.anio, []);
    porAnio.get(x.anio).push(x);
  }
  const grid = h('div', { class: 'pl-anios', role: 'group', 'aria-label': T.mesTit });
  for (const [anio, xs] of porAnio) {
    grid.append(h('div', { class: 'pl-anio' }, h('b', {}, anio), h('div', { class: 'pl-meses-fila' }, xs.map((x) => {
      const m = marcas(info, x);
      const largo = [etiquetaMes(D, x.mesAbs, { larga: true }), ...m].join(' · ');
      return h('button', {
        type: 'button', class: 'pl-mes' + (x.esAhora ? ' ahora' : '') + (x.esPlazo ? ' plazo' : '') + (x.esElegido ? ' elegido' : '') + (puedo ? '' : ' ver'),
        disabled: !!x.motivo, 'aria-pressed': x.esElegido ? 'true' : 'false', 'aria-label': largo, title: largo,
        onmouseenter: () => pintar(x.mes), onfocus: () => pintar(x.mes),
        onmouseleave: () => pintar(porDefecto()), onblur: () => pintar(porDefecto()),
        onclick: () => { if (puedo) c.enviar('planificarRuta', { mes: x.mes }); else { u.mesVer = x.mes; c.repintar(); } },
      }, h('span', {}, nombre(x.mesAbs).split(' ')[0]), x.esAhora || x.esPlazo || x.esElegido ? h('i', { 'aria-hidden': 'true' }, [x.esAhora ? '▸' : '', x.esPlazo ? '⚑' : '', x.esElegido ? '●' : ''].join('')) : null);
    }))));
  }
  picker.append(porAnio.size ? grid : h('p', { class: 'mc-nota tenue' }, T.sinMeses));
  picker.append(h('p', { class: 'pl-leyenda-mes' }, h('span', {}, '▸ ', T.ahora), h('span', {}, '⚑ ', T.plazo), h('span', {}, '● ', T.elegidoMes)));
  if (info.limite < info.max) picker.append(h('p', { class: 'mc-nota tenue' }, T.tarde(nombre(rl.inicio + info.limite))));
  if (!puedo) picker.append(h('p', { class: 'mc-nota tenue' }, T.soloVuelo));
  if (!c.e?.porRol?.vuelo?.ruta) picker.append(h('p', { class: 'mc-nota aviso' }, T.sinRuta));
  return { picker, cond };
}

function panelRutas(c) {
  const rutas = lista(c.mision?.rutas);
  const elegida = c.e?.porRol?.vuelo?.ruta;
  const puedo = puedoPor(c, 'vuelo');
  return h('section', { class: 'mc-panel' }, h('h3', {}, T.ruta),
    h('div', { class: 'pl-rutas' }, rutas.map((r) => {
      const fase = lista(c.mision.fases).find((f) => f.id === r.efecto?.fase);
      const es = r.id === elegida;
      const tip = [r.efecto && fase ? `${tx(fase.nombre)}: ${r.efecto.dp > 0 ? '+' : ''}${Math.round(r.efecto.dp * 100)} %` : '', `${T.precio}: ${valor(c, r.precio, 'M USD').textContent}`].filter(Boolean).join(' · ');
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
    botones, escenario, ficha, leyenda, puedoSitio ? null : h('p', { class: 'mc-nota tenue' }, T.soloSitio));
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
    tarjeta.push(h('div', { class: 'pl-sitio-card' + (elegido ? ' elegido' : '') },
      h('b', {}, tx(sitio.nombre)), sitio.inc != null ? h('small', {}, T.inc(sitio.inc)) : sitio.lat != null ? h('small', {}, `${sitio.lat}°, ${sitio.lon}°`) : null,
      h('p', {}, tx(sitio.nota)), filas.length ? h('ul', { class: 'mc-lista' }, filas) : h('p', { class: 'tenue' }, T.sinEfectos),
      // Elegido: el borde verde de la tarjeta ya lo dice; no hace falta un botón apagado.
      elegido ? null : h('button', { class: 'boton primario ancho', type: 'button', disabled: !puedo, onclick: () => c.enviar('planificarRuta', { sitio: sitio.id }) }, T.elegir)));
  }
  const chips = h('div', { class: 'pl-lista-sitios' }, lista(P.sitios).map((s) => h('button', {
    class: 'boton texto' + (s.id === id ? ' on' : ''), type: 'button',
    onclick: () => { u.verSitio = s.id; c.repintar(); },
  }, tx(s.nombre))));
  // Con un sitio ya elegido (y sin previsualizar otro), la lista se pliega: deja sitio a la tarjeta y a los efectos.
  const elegidoYa = c.e?.ruta?.sitio && id === c.e.ruta.sitio;
  if (elegidoYa) caja.append(...tarjeta, h('details', { class: 'pl-cambiar' }, h('summary', { class: 'boton texto' }, T.cambiarSitio), chips));
  else caja.append(chips, ...tarjeta);
  // Probabilidad por fase con el diseño actual: solo cuando ya hay sitio elegido (antes no responde a nada que hagas aquí;
  // al previsualizar un sitio, su tarjeta ya muestra cuánto cambia cada fase).
  if (c.e?.ruta?.sitio) caja.append(h('h3', { class: 'pl-sep' }, T.efectos), h('h4', {}, T.fasesTit), h('ul', { class: 'mc-barras' }, lista(res?.fases).map((f) => h('li', {},
    h('span', {}, tx(f.nombre) || '—'), h('i', {}, h('b', { style: `width:${Math.round(f.p * 100)}%` })), h('em', {}, pct(f.p))))));
  // La cobertura de objetivos ya se ve en el Constructor (CIENCIA): aquí solo lo que cambia el sitio.
  const sinMes = res?.plan?.mes == null || res.plan.perdida, sinSitio = !res?.plan?.sitio;
  const listo = !sinMes && !sinSitio;
  caja.append(h('p', { class: 'mc-nota ' + (listo ? 'ok' : 'aviso') }, listo ? T.ok : sinMes && sinSitio ? T.falta : sinMes ? T.faltaMes : T.faltaSitio));
  return caja;
}

export function pantallaPlanificador(c) {
  const P = c.D?.PLANIFICACION?.[c.mision?.id];
  if (!P) return h('div', { class: 'mc-vacio' }, h('p', {}, T.noPlan), h('div', { class: 'pl-sola' }, panelRutas(c)));
  const u = (c.ui.plan ??= { capas: ['color'], foco: null, verSitio: null, mesVer: null });
  const res = resumenSeguro(c);
  const { picker, cond } = panelMeses(c, u);
  return h('div', { class: 'pl' },
    h('div', { class: 'pl-izq', 'data-scroll': 'pl-izq' }, panelRutas(c), picker),
    mapa(c, P, u),
    h('div', { class: 'pl-der', 'data-scroll': 'pl-der' }, cond, fichaSitio(c, P, u, res)));
}
export { nombreRol };
