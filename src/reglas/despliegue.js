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
import { resumen, misionDe, montadas, contingenciasCompradas, num, clamp01, textoEn } from './motor.js';

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
//     puntos, veredicto: 'total'|'parcial'|'fallida', causas: [{ en, tipo, fase? }],
//     puntuacion, cienciaTotal, diasPrevistos, diasConseguidos, perdida, golpes }
export function simular(estado, D) {
  const m = misionDe(estado, D);
  if (!m) {
    return {
      pasos: [], hallazgos: [], datos: { generadosMB: 0, bajadosMB: 0, perdidosMB: 0 }, ciencia: [], puntos: 0,
      veredicto: 'fallida', causas: [{ en: 'No mission was chosen.', tipo: 'veredicto' }],
      puntuacion: null, cienciaTotal: 0, diasPrevistos: 0, diasConseguidos: 0, perdida: false, golpes: 0,
    };
  }
  const semilla = estado?.semilla ?? 0;
  const res = resumen(estado, D);
  const azar = prng(derivar(semilla, 'mision', m.id));
  const EV = obj(D?.EVENTOS_MISION), CO = obj(D?.CONTINGENCIAS);
  const compradas = new Set(contingenciasCompradas(estado, D).map((c) => c.id));
  const nombreConting = (id) => textoEn(CO[id]?.nombre, id);
  const pasos = [], causas = [];
  let fCiencia = 1, fDias = 1, golpes = 0, perdida = false, idxCorte = -1;

  res.fases.forEach((f, i) => {
    const nombre = textoEn(f.nombre, f.id);
    if (perdida) {
      pasos.push({ fase: f.id, nombre: f.nombre, critica: f.critica, p: r3(f.p), ok: false, omitida: true });
      return;
    }
    // Tiradas siempre en el mismo orden (fase y luego cada evento de la fase), salga lo que salga.
    const ok = azar() < f.p;
    const candidatos = arr(m.eventosMision).filter((id) => EV[id] && EV[id].fase === f.id);
    let ev = null;
    for (const id of candidatos) { const sale = azar() < clamp01(num(EV[id].p)); if (sale && !ev) ev = { id, ...EV[id] }; }
    const paso = { fase: f.id, nombre: f.nombre, critica: f.critica, p: r3(f.p), ok };
    let golpesAqui = 0;

    if (!ok) {
      if (f.critica) { golpesAqui++; causas.push({ en: `${nombre} (critical phase) failed its ${Math.round(f.p * 100)} % check.`, tipo: 'fase', fase: f.id }); }
      else { fCiencia *= FACTOR_DEGRADA; causas.push({ en: `${nombre} had problems (${Math.round(f.p * 100)} % check failed): science degraded.`, tipo: 'fase', fase: f.id }); }
    }

    if (ev) {
      const ef = obj(ev.efecto);
      const nombreEv = textoEn(ev.nombre, ev.id);
      paso.evento = ev.id;
      paso.signo = ev.signo ?? '-';
      if (esNegativo(ev)) {
        const mitigador = arr(ev.mitigadoPor).find((c) => compradas.has(c));
        paso.mitigado = !!mitigador;
        if (mitigador) {
          causas.push({ en: `${nombre}: ${nombreEv}. The ${nombreConting(mitigador)} contingency cancelled it.`, tipo: 'mitigado', fase: f.id, evento: ev.id });
        } else {
          if (ef.ciencia != null) fCiencia *= Math.max(FACTOR_MIN_EVENTO, Math.min(1, num(ef.ciencia)));
          if (ef.dias != null) fDias *= Math.max(FACTOR_MIN_EVENTO, Math.min(1, num(ef.dias)));
          if (ef.falla) { if (f.critica) golpesAqui++; else fCiencia *= FACTOR_DEGRADA; }
          const faltan = arr(ev.mitigadoPor).map(nombreConting);
          const leccion = textoEn(ev.leccion, '');
          causas.push({
            en: `${nombre}: ${nombreEv}, not mitigated.` + (faltan.length ? ` Missing contingency: ${faltan.join(' or ')}.` : '') + (leccion ? ` ${leccion}` : ''),
            tipo: 'evento', fase: f.id, evento: ev.id,
          });
        }
      } else {
        if (ef.ciencia != null) fCiencia *= Math.min(FACTOR_MAX_EVENTO, Math.max(1, num(ef.ciencia)));
        if (ef.dias != null) fDias *= Math.min(FACTOR_MAX_EVENTO, Math.max(1, num(ef.dias)));
        causas.push({ en: `${nombre}: ${nombreEv} (good news).`, tipo: 'positivo', fase: f.id, evento: ev.id });
      }
    }

    for (let k = 0; k < golpesAqui; k++) {
      golpes++;
      if (golpes === 1) {
        fCiencia *= FACTOR_GOLPE_CRITICO;
        fDias *= FACTOR_GOLPE_CRITICO;
        causas.push({ en: `First critical failure in ${nombre}: the mission goes on, degraded.`, tipo: 'golpe', fase: f.id });
      } else if (golpes >= GOLPES_PARA_PERDER && !perdida) {
        perdida = true;
        idxCorte = i;
        causas.push({ en: `Second critical failure in ${nombre}: the spacecraft is lost.`, tipo: 'perdida', fase: f.id });
      }
    }
    paso.golpe = golpesAqui > 0;
    pasos.push(paso);
  });

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
    causas.push({ en: `${r1(generadosMB - bajadosMB)} MB of data could not be sent home: the link was too small for what the instruments produced.`, tipo: 'datos' });
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
    if (capturado) causas.push({ en: `Discovery: ${nombre}, detected by ${textoEn(P[detector]?.nombre, detector)}.`, tipo: 'hallazgo' });
    else if (presente && !perdida) {
      const podian = arr(h.detecta).map((id) => textoEn(P[id]?.nombre, id));
      causas.push({ en: `${nombre} was there, but nothing on board could detect it` + (podian.length ? ` (needed: ${podian.join(' or ')}).` : '.'), tipo: 'hallazgo' });
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
    tipo: 'veredicto',
  });

  return {
    pasos, hallazgos,
    datos: { generadosMB: r1(generadosMB), bajadosMB: r1(bajadosMB), perdidosMB: r1(generadosMB - bajadosMB) },
    ciencia: cienciaObj, puntos: r1(puntos), veredicto, causas,
    puntuacion: regla ?? null, cienciaTotal: r3(cienciaTotal), diasPrevistos: r1(diasPrevistos), diasConseguidos: r1(diasConseguidos),
    perdida, golpes,
  };
}
