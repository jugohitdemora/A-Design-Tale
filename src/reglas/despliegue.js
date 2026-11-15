// Despliegue (F-10, F-11): simula el vuelo con la semilla. MEC-14 a MEC-20.
// Puro y determinista: mismo estado (diseño + semilla) → mismo resultado en todos los clientes.
// Lo llama el anfitrión al lanzar y guarda lo que devuelve en estado.resultado (no lleva Infinity ni NaN).
//
// Modelo de daños [INF] (cumple G-12: un solo negativo sin mitigar nunca destruye la misión):
// - "Golpe crítico" = una fase crítica que falla su tirada, o un evento negativo sin mitigar con `falla: true`
//   en una fase crítica. El primero degrada (ciencia y días × FACTOR_GOLPE_CRITICO); el segundo pierde la nave
//   (en 'cadena' corta la misión: las fases siguientes no se juegan).
// - Una fase no crítica que falla, o un `falla` sin mitigar en fase no crítica, degrada la ciencia × FACTOR_DEGRADA.
// - Un evento negativo sin mitigar aplica sus factores, pero nunca por debajo de FACTOR_MIN_EVENTO.
// - Un evento mitigado por una contingencia comprada se anula.
// - Un evento positivo sube ciencia o días (como mucho × FACTOR_MAX_EVENTO).
import { prng, derivar } from './azar.js';
import { resumen, misionDe, montadas, contingenciasCompradas, num, clamp01, textoEn, NOMBRE_BARRA } from './motor.js';

const NOMBRE_BARRA_ES = { masa: 'La masa', potencia: 'La potencia', bateria: 'La batería', datos: 'El enlace de datos', presupuesto: 'El presupuesto', volumen: 'El volumen' };

export const FACTOR_DEGRADA = 0.75;
export const FACTOR_GOLPE_CRITICO = 0.5;
export const FACTOR_MIN_EVENTO = 0.25;
export const FACTOR_MAX_EVENTO = 2;
export const GOLPES_PARA_PERDER = 2;
export const UMBRAL_TOTAL = 0.8;   // MEC-20: 'total' pide ≥ 80 % de la ciencia

const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
const arr = (x) => (Array.isArray(x) ? x : []);
const r3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : 0);
const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : 0);
// Nombre en español de un campo {es, en} (cae al inglés si falta).
const textoEs = (x, porDefecto = '') => (x == null ? porDefecto : typeof x === 'string' ? x : x.es ?? x.en ?? porDefecto);

function esNegativo(ev) {
  const ef = obj(ev.efecto);
  if (ev.signo === '-') return true;
  if (ev.signo === '+') return false;
  return !!ef.falla || (ef.ciencia != null && num(ef.ciencia) < 1) || (ef.dias != null && num(ef.dias) < 1);
}

// → { pasos: [{ fase, nombre, critica, p, ok, evento?, signo?, mitigado?, omitida? }],
//     hallazgos: [{ id, nombre, presente, capturado, valor, detector }],
//     datos: { generadosMB, bajadosMB, perdidosMB },
//     ciencia: [{ id, prioridad, valor, conseguido }],
//     puntos, veredicto: 'total'|'parcial'|'fallida', causas: [{ en, es, tipo, fase? }],
//     puntuacion, cienciaTotal, diasPrevistos, diasConseguidos, perdida, golpes,
//     mision, fallos: [{ codigo, fase, p?, tirada?, desglose?, decision?, evitar }], lanzamiento: { mes, sitio, scrub, tormenta } | null,
//     reloj: { mes, plazo, retraso, recorte, bono, cancelada } | null, cometa,
//     tolerancia: [{ barra, ratio, fase|null, dp, todas? }] }  (barras que pasaron la revisión en tolerancia: ver motor.riesgoTolerancia)
//   pasos[i].tirada solo en las fases que fallan. `fallos` es lo que explicar.js convierte en "Causa → Decisión → Qué lo evitaba".
export function simular(estado, D) {
  const m = misionDe(estado, D);
  if (!m) {
    return {
      pasos: [], hallazgos: [], datos: { generadosMB: 0, bajadosMB: 0, perdidosMB: 0 }, ciencia: [], puntos: 0,
      veredicto: 'fallida', causas: [{ en: 'No mission was chosen.', es: 'No se eligió ninguna misión.', tipo: 'veredicto' }],
      puntuacion: null, cienciaTotal: 0, diasPrevistos: 0, diasConseguidos: 0, perdida: false, golpes: 0,
      mision: null, fallos: [], lanzamiento: null, reloj: null, cometa: null, tolerancia: [],
    };
  }
  const semilla = estado?.semilla ?? 0;
  const res = resumen(estado, D);
  const azar = prng(derivar(semilla, 'mision', m.id));
  const cond = res.plan?.cond ?? null;
  const fallos = [];
  const EV = obj(D?.EVENTOS_MISION), CO = obj(D?.CONTINGENCIAS);
  const compradas = new Set(contingenciasCompradas(estado, D).map((c) => c.id));
  const nombreConting = (id) => textoEn(CO[id]?.nombre, id);
  const nombreContingEs = (id) => textoEs(CO[id]?.nombre, id);
  const pasos = [], causas = [];
  let fCiencia = 1, fDias = 1, golpes = 0, perdida = false, idxCorte = -1;

  res.fases.forEach((f, i) => {
    const nombre = textoEn(f.nombre, f.id);
    const nombreEs = textoEs(f.nombre, f.id);
    if (perdida) {
      pasos.push({ fase: f.id, nombre: f.nombre, critica: f.critica, p: r3(f.p), ok: false, omitida: true });
      return;
    }
    // Tiradas siempre en el mismo orden (fase y luego cada evento de la fase), salga lo que salga.
    const tirada = azar();
    const ok = tirada < f.p;
    const candidatos = arr(m.eventosMision).filter((id) => EV[id] && EV[id].fase === f.id);
    let ev = null;
    for (const id of candidatos) { const sale = azar() < clamp01(num(EV[id].p)); if (sale && !ev) ev = { id, ...EV[id] }; }
    const paso = { fase: f.id, nombre: f.nombre, critica: f.critica, p: r3(f.p), ok };
    let golpesAqui = 0;

    if (!ok) {
      paso.tirada = r3(tirada);
      fallos.push(falloDeFase(f, i, tirada, m, cond));
      if (f.critica) { golpesAqui++; causas.push({ en: `${nombre} (critical phase) failed its ${Math.round(f.p * 100)} % check.`, es: `${nombreEs} (fase crítica) falló su prueba del ${Math.round(f.p * 100)} %.`, tipo: 'fase', fase: f.id }); }
      else { fCiencia *= FACTOR_DEGRADA; causas.push({ en: `${nombre} had problems (${Math.round(f.p * 100)} % check failed): science degraded.`, es: `${nombreEs} tuvo problemas (falló la prueba del ${Math.round(f.p * 100)} %): la ciencia se degrada.`, tipo: 'fase', fase: f.id }); }
    }

    if (ev) {
      const ef = obj(ev.efecto);
      const nombreEv = textoEn(ev.nombre, ev.id);
      const nombreEvEs = textoEs(ev.nombre, ev.id);
      paso.evento = ev.id;
      paso.signo = ev.signo ?? '-';
      if (esNegativo(ev)) {
        const mitigador = arr(ev.mitigadoPor).find((c) => compradas.has(c));
        paso.mitigado = !!mitigador;
        if (mitigador) paso.mitigador = mitigador; // la sala de control pide que su departamento la active
        if (mitigador) {
          causas.push({ en: `${nombre}: ${nombreEv}. The ${nombreConting(mitigador)} contingency cancelled it.`, es: `${nombreEs}: ${nombreEvEs}. La contingencia ${nombreContingEs(mitigador)} lo anuló.`, tipo: 'mitigado', fase: f.id, evento: ev.id });
        } else {
          if (ef.ciencia != null) fCiencia *= Math.max(FACTOR_MIN_EVENTO, Math.min(1, num(ef.ciencia)));
          if (ef.dias != null) fDias *= Math.max(FACTOR_MIN_EVENTO, Math.min(1, num(ef.dias)));
          if (ef.falla) { if (f.critica) golpesAqui++; else fCiencia *= FACTOR_DEGRADA; }
          fallos.push({ codigo: 'evento', fase: f.id, evento: ev.id, critica: !!f.critica, falla: !!ef.falla,
            evitar: arr(ev.mitigadoPor).length ? 'ct:' + arr(ev.mitigadoPor)[0] : 'suerte' });
          const faltan = arr(ev.mitigadoPor).map(nombreConting);
          const leccion = textoEn(ev.leccion, '');
          const faltanEs = arr(ev.mitigadoPor).map(nombreContingEs);
          const leccionEs = textoEs(ev.leccion, '');
          causas.push({
            en: `${nombre}: ${nombreEv}, not mitigated.` + (faltan.length ? ` Missing contingency: ${faltan.join(' or ')}.` : '') + (leccion ? ` ${leccion}` : ''),
            es: `${nombreEs}: ${nombreEvEs}, sin mitigar.` + (faltanEs.length ? ` Falta la contingencia: ${faltanEs.join(' o ')}.` : '') + (leccionEs ? ` ${leccionEs}` : ''),
            tipo: 'evento', fase: f.id, evento: ev.id,
          });
        }
      } else {
        if (ef.ciencia != null) fCiencia *= Math.min(FACTOR_MAX_EVENTO, Math.max(1, num(ef.ciencia)));
        if (ef.dias != null) fDias *= Math.min(FACTOR_MAX_EVENTO, Math.max(1, num(ef.dias)));
        causas.push({ en: `${nombre}: ${nombreEv} (good news).`, es: `${nombreEs}: ${nombreEvEs} (buenas noticias).`, tipo: 'positivo', fase: f.id, evento: ev.id });
      }
    }

    for (let k = 0; k < golpesAqui; k++) {
      golpes++;
      if (golpes === 1) {
        fCiencia *= FACTOR_GOLPE_CRITICO;
        fDias *= FACTOR_GOLPE_CRITICO;
        causas.push({ en: `First critical failure in ${nombre}: the mission goes on, degraded.`, es: `Primer fallo crítico en ${nombreEs}: la misión sigue, pero degradada.`, tipo: 'golpe', fase: f.id });
      } else if (golpes >= GOLPES_PARA_PERDER && !perdida) {
        perdida = true;
        idxCorte = i;
        causas.push({ en: `Second critical failure in ${nombre}: the spacecraft is lost.`, es: `Segundo fallo crítico en ${nombreEs}: se pierde la nave.`, tipo: 'perdida', fase: f.id });
      }
    }
    paso.golpe = golpesAqui > 0;
    pasos.push(paso);
  });

  // Barras en tolerancia (≤ +20 %): ya restaron probabilidad a su fase (res.fases, desglose 'tolerancia'); aquí se dejan dicho en el informe.
  const tolerancia = [];
  for (const t of arr(res.tolerancia)) {
    if (t.todas && tolerancia.some((x) => x.barra === t.barra)) continue; // el presupuesto va una sola vez (todas las fases)
    tolerancia.push({ barra: t.barra, ratio: r3(t.ratio), fase: t.todas ? null : t.fase, dp: r3(t.dp), ...(t.todas ? { todas: true } : {}) });
    const sobre = Math.round((t.ratio - 1) * 100), pp = r1(t.dp * 100);
    const fn = t.todas ? 'every phase' : textoEn(t.faseNombre, t.fase), fe = t.todas ? 'todas las fases' : textoEs(t.faseNombre, t.fase);
    causas.push({ en: `${NOMBRE_BARRA[t.barra]} was ${sobre} % over the limit (tolerated): failure chance +${pp} pp in ${fn}.`,
      es: `${NOMBRE_BARRA_ES[t.barra]} pasó un ${sobre} % del límite (tolerado): la probabilidad de fallo sube ${pp} pp en ${fe}.`, tipo: 'tolerancia', ...(t.todas ? {} : { fase: t.fase }) });
  }

  // Condiciones del mes (contrato-reloj.md §2, §4). Sorteos propios por mes ('clima', 'reloj'): no tocan la secuencia de 'mision'.
  let lanzamiento = null;
  if (cond) {
    const EF = obj(D?.CALENDARIO?.EFECTOS);
    const azarClima = prng(derivar(semilla, 'clima', m.id, cond.mesAbs));
    const scrub = azarClima() < clamp01(cond.pScrub) ? 1 + Math.floor(azarClima() * 4) : 0;
    const azarReloj = prng(derivar(semilla, 'reloj', m.id, cond.mesAbs));
    const tormenta = azarReloj() < clamp01(cond.pKp7);
    lanzamiento = { mes: cond.mesAbs, sitio: cond.sitioLanz, scrub, tormenta };
    if (scrub) {
      causas.push({ en: `Launch delayed ${scrub} day(s) by weather (${Math.round(cond.pScrub * 100)} % chance that month).`,
        es: `El lanzamiento se retrasó ${scrub} día(s) por el tiempo (${Math.round(cond.pScrub * 100)} % de probabilidad ese mes).`, tipo: 'clima' });
    }
    if (tormenta && !perdida) {
      fCiencia *= Math.max(FACTOR_MIN_EVENTO, Math.min(1, num(EF.tormentaCiencia) || 1));
      causas.push({ en: `A geomagnetic storm (Kp ≥ 7, ${Math.round(cond.pKp7 * 100)} % chance that month) disturbed the mission: science degraded a little.`,
        es: `Una tormenta geomagnética (Kp ≥ 7, ${Math.round(cond.pKp7 * 100)} % de probabilidad ese mes) perturbó la misión: la ciencia baja un poco.`, tipo: 'espacio' });
      fallos.push({ codigo: 'tormenta', fase: null, p: r3(cond.pKp7), decision: { mes: cond.mesAbs, pKp7: r3(cond.pKp7) }, evitar: 'mesSolCalmo' });
    }
  }

  // Vida útil y datos (MEC-19).
  const nFases = res.fases.length || 1;
  const diasPrevistos = num(m.diasPrevistos) || 1;
  const fracVida = perdida ? Math.max(0, idxCorte) / nFases : Math.min(1, fDias);
  const diasConseguidos = diasPrevistos * fracVida;
  const genDia = res.barras.datos.usado, capDia = res.barras.datos.limite;
  const generadosMB = genDia * diasConseguidos;
  const bajadosMB = Math.min(generadosMB, capDia * diasConseguidos);
  const fracDatos = genDia > 0 ? Math.min(1, capDia / genDia) : 1;
  if (generadosMB - bajadosMB > 0.05) {
    fallos.push({ codigo: 'datos', fase: null, mb: r1(generadosMB - bajadosMB), evitar: 'enlace' });
    causas.push({ en: `${r1(generadosMB - bajadosMB)} MB of data could not be sent home: the link was too small for what the instruments produced.`, es: `${r1(generadosMB - bajadosMB)} MB de datos no se pudieron enviar a casa: el enlace era demasiado pequeño para lo que producían los instrumentos.`, tipo: 'datos' });
  }

  // Hallazgos ocultos (MEC-18): sorteo propio, independiente de las fases.
  const azarOculto = prng(derivar(semilla, 'oculto', m.id));
  const activos = new Set(montadas(estado, D).filter((x) => x.uso > 0).map((x) => x.id));
  const P = obj(D?.PIEZAS);
  const hallazgos = arr(m.oculto).filter((h) => h && h.id != null).map((h) => {
    const presente = azarOculto() < clamp01(num(h.p));
    const detector = arr(h.detecta).find((id) => activos.has(id)) ?? null;
    const capturado = presente && !!detector && !perdida;
    const nombre = textoEn(h.nombre, h.id);
    const nombreHEs = textoEs(h.nombre, h.id);
    if (capturado) causas.push({ en: `Discovery: ${nombre}, detected by ${textoEn(P[detector]?.nombre, detector)}.`, es: `Hallazgo: ${nombreHEs}, detectado por ${textoEs(P[detector]?.nombre, detector)}.`, tipo: 'hallazgo' });
    else if (presente && !perdida) {
      const podian = arr(h.detecta).map((id) => textoEn(P[id]?.nombre, id));
      const podianEs = arr(h.detecta).map((id) => textoEs(P[id]?.nombre, id));
      causas.push({
        en: `${nombre} was there, but nothing on board could detect it` + (podian.length ? ` (needed: ${podian.join(' or ')}).` : '.'),
        es: `${nombreHEs} estaba allí, pero nada a bordo podía detectarlo` + (podianEs.length ? ` (se necesitaba: ${podianEs.join(' o ')}).` : '.'),
        tipo: 'hallazgo',
      });
    }
    return { id: h.id, nombre: h.nombre ?? null, presente, capturado, valor: num(h.valor), detector: capturado ? detector : null };
  });

  // Ciencia por objetivo según la regla de puntuación (MEC-16 a MEC-18).
  const regla = m.puntuacion;
  const cienciaObj = res.ciencia.objetivos.map((o) => {
    // MEC-19 vale para las tres: la ciencia que no cabe en el enlace se pierde.
    let c = o.cobertura * fCiencia * fracDatos;
    if (regla === 'datos') c *= fracVida;
    else if (regla === 'cadena') c = perdida ? 0 : c * fracVida;
    else c *= perdida ? fracVida : 1; // 'oculto' y por defecto
    return { id: o.id, prioridad: o.prioridad, valor: o.valor, conseguido: r3(clamp01(c)), crudo: clamp01(c) };
  });
  const prio = cienciaObj.find((o) => o.prioridad);
  const prioOk = !perdida && (!prio || prio.crudo > 0); // sin redondeo: un objetivo muy degradado sigue conseguido
  cienciaObj.forEach((o) => delete o.crudo);
  const sumaValor = cienciaObj.reduce((s, o) => s + o.valor, 0);
  const base = cienciaObj.reduce((s, o) => s + o.valor * o.conseguido, 0);
  const cienciaTotal = sumaValor > 0 ? base / sumaValor : 0;
  let puntos = base;
  if (regla === 'oculto') {
    const extra = hallazgos.filter((h) => h.capturado).reduce((s, h) => s + h.valor, 0);
    puntos = (base + extra) / Math.max(0.1, res.energiaWh / 1000); // puntos por kWh/día gastado
  }

  // Veredicto (MEC-20).
  const veredicto = !prioOk ? 'fallida' : cienciaTotal >= UMBRAL_TOTAL - 1e-9 ? 'total' : 'parcial';
  const pct = Math.round(cienciaTotal * 100);
  causas.push({
    en: veredicto === 'total' ? `Full success: priority objective achieved and ${pct} % of the science returned.`
      : veredicto === 'parcial' ? `Partial success: priority objective achieved, ${pct} % of the science returned (80 % needed for full success).`
        : perdida ? 'Mission failed: the spacecraft was lost before achieving the priority objective.'
          : 'Mission failed: the priority objective was not achieved.',
    es: veredicto === 'total' ? `Éxito total: se logró el objetivo prioritario y se devolvió el ${pct} % de la ciencia.`
      : veredicto === 'parcial' ? `Éxito parcial: se logró el objetivo prioritario y se devolvió el ${pct} % de la ciencia (se necesita el 80 % para el éxito total).`
        : perdida ? 'La misión fracasó: se perdió la nave antes de lograr el objetivo prioritario.'
          : 'La misión fracasó: no se logró el objetivo prioritario.',
    tipo: 'veredicto',
  });

  return {
    pasos, hallazgos,
    datos: { generadosMB: r1(generadosMB), bajadosMB: r1(bajadosMB), perdidosMB: r1(generadosMB - bajadosMB) },
    ciencia: cienciaObj, puntos: r1(puntos), veredicto, causas,
    puntuacion: regla ?? null, cienciaTotal: r3(cienciaTotal), diasPrevistos: r1(diasPrevistos), diasConseguidos: r1(diasConseguidos),
    perdida, golpes,
    // Explicación compacta (contrato §6): códigos que src/reglas/explicar.js traduce al pintar.
    mision: m.id, fallos, lanzamiento, reloj: relojCompacto(res.reloj), cometa: res.plan?.cometa ?? null,
    tolerancia, // [{ barra, ratio, fase (null = todas), dp, todas? }]: barras que pasaron en tolerancia y la probabilidad de fallo que sumaron
  };
}

const relojCompacto = (rl) => (rl?.activo ? { mes: rl.mes, plazo: rl.plazo, lanzamiento: rl.lanzamiento ?? null, retraso: rl.retraso, recorte: r3(rl.recorte), bono: rl.bono, cancelada: !!rl.cancelada } : null);
const DECISION_DE = { clima: 1, espacio: 1, conjuncion: 1, sitio: 1, ruta: 1, tolerancia: 1 }; // aportes que vienen de una decisión del equipo
const EVITAR_DE = { clima: 'mesSeco', espacio: 'mesSolCalmo', conjuncion: 'sinConjuncion', sitio: 'otroSitio', ruta: 'otraRuta', tolerancia: 'recortar' };

// Fallo de una fase: p, tirada y los 3 aportes más negativos, con la decisión que los causó y qué lo habría evitado.
// desglose: [[fuente, ref, dp]] (compacto). decision: datos de la decisión del aporte más negativo (mes, sitio, lluvia…).
// evitar: código ('mesSeco', 'mesSolCalmo', 'sinConjuncion', 'otroSitio', 'otraRuta', 'mejora:<id>', 'suerte').
function falloDeFase(f, i, tirada, m, cond) {
  const negativos = arr(f.desglose).filter((x) => x.dp < 0).sort((a, b) => a.dp - b.dp).slice(0, 3);
  const peor = negativos[0] ?? null;
  // La decisión: el mes y sus condiciones (si hay calendario) y, si pesa, el sitio o la ruta.
  const decision = cond ? { mes: cond.mesAbs, sitio: cond.sitioLanz, lluvia: cond.lluvia, viento50: cond.viento50, pKp7: r3(cond.pKp7), elong: cond.elong, dias: cond.diasConj } : {};
  // Solo se culpa a una decisión si sin ella la tirada habría pasado: tirada < p sin los aportes negativos de decisiones.
  // Lo mismo con una mejora sin montar: tirada < p + su dp. Si no, fue mala suerte (y se listan los factores).
  let evitar = 'suerte';
  const negDecision = arr(f.desglose).filter((x) => x.dp < 0 && DECISION_DE[x.fuente]).reduce((s, x) => s + x.dp, 0);
  const pCruda = Number.isFinite(f.pCruda) ? f.pCruda : f.p;
  if (peor && DECISION_DE[peor.fuente] && tirada < clamp01(pCruda - negDecision)) {
    evitar = EVITAR_DE[peor.fuente];
    if (peor.fuente === 'sitio' || peor.fuente === 'ruta') decision[peor.fuente] = peor.ref;
    if (peor.fuente === 'tolerancia') decision.barra = peor.ref;
  } else {
    const puestas = new Set(arr(f.desglose).map((x) => x.ref));
    const def = arr(m?.fases).find((x) => x?.id === f.id);
    const libre = arr(def?.mejoras).filter((x) => x?.por != null && !puestas.has(String(x.por)) && num(x.dp) > 0)
      .sort((a, b) => num(b.dp) - num(a.dp))[0];
    if (libre && tirada < clamp01(pCruda + num(libre.dp))) { evitar = 'mejora:' + libre.por; decision.dpMejora = r3(num(libre.dp)); }
    if (i !== 0) { delete decision.lluvia; delete decision.viento50; }
  }
  return { codigo: 'fase', fase: f.id, critica: !!f.critica, p: r3(f.p), tirada: r3(tirada),
    desglose: negativos.map((x) => [x.fuente, x.ref, r3(x.dp)]), decision: Object.keys(decision).length ? decision : null, evitar };
}

// Resultado de una misión cancelada por los inversores (retraso > 12 meses): no hay vuelo.
export function resultadoCancelado(estado, D) {
  const m = misionDe(estado, D);
  const rl = resumen(estado, D).reloj;
  return {
    pasos: [], hallazgos: [], datos: { generadosMB: 0, bajadosMB: 0, perdidosMB: 0 }, ciencia: [], puntos: 0, veredicto: 'fallida',
    causas: [{ en: `Investors pulled out: the launch slipped ${rl?.retraso ?? 0} months past the commitment (more than 12).`,
      es: `Los inversores se retiraron: el lanzamiento se retrasó ${rl?.retraso ?? 0} meses sobre el compromiso (más de 12).`, tipo: 'cancelada' }],
    puntuacion: m?.puntuacion ?? null, cienciaTotal: 0, diasPrevistos: r1(num(m?.diasPrevistos)), diasConseguidos: 0, perdida: false, golpes: 0,
    mision: m?.id ?? null, fallos: [{ codigo: 'cancelada', fase: null, retraso: rl?.retraso ?? 0, evitar: 'plazo' }], lanzamiento: null,
    reloj: relojCompacto(rl), cometa: null, cancelada: true,
  };
}
