// Motor de reglas: barras, ciencia, riesgos, verificación y MEC-12. Ver mecanicas-del-juego.md §5–§7 y §11.
// Puro (sin red, sin DOM): todo se calcula a partir de (estado, DATOS). Nada de lo que sale de aquí se guarda
// en el estado (PROTOCOLO §6): cada cliente lo recalcula.
// Tolera estado parcial (sin misión, talleres vacíos, ids desconocidos, valores null) sin lanzar errores.
import { prng, derivar, barajar } from './azar.js';

export const ROLES = ['vuelo', 'ciencia', 'potencia', 'comms'];
export const BARRAS = ['masa', 'potencia', 'bateria', 'datos', 'presupuesto', 'volumen'];
export const NOMBRE_BARRA = { masa: 'Mass', potencia: 'Power', bateria: 'Battery', datos: 'Data link', presupuesto: 'Budget', volumen: 'Volume' };
export const MB_POR_KBPS_HORA = 0.45;      // Mateo §1.3: 1 kbps durante 1 h = 0,45 MB
export const TOLERANCIA = 1.2;              // DEC-10 (revisada): hasta +20 % pasa la revisión y NO obliga a recortar, pero cada barra
//   en tolerancia sube la probabilidad de fallo de una fase del vuelo (riesgoTolerancia). Más del 20 % no pasa la revisión.
export const DP_TOLERANCIA = 0.5;           // dp = 0,5 · (ratio − 1): hasta +10 puntos porcentuales con ratio 1,2
export const FACTOR_TOLERANCIA_PRESUPUESTO = 0.25; // el presupuesto pasado penaliza a todas las fases, pero 4 veces menos
export const DIFICULTADES = ['facil', 'normal', 'dificil'];
export const EVENTOS_POR_DIFICULTAD = { facil: 1, normal: 2, dificil: 3 }; // AN-09
export const MAX_CONTINGENCIAS = 3;         // G-11
const EPS = 1e-9;

// ---------- Utilidades ----------
const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
const arr = (x) => (Array.isArray(x) ? x : []);
const finito = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
export const clamp01 = (x) => Math.min(1, Math.max(0, finito(x)));

// Valor de un dato {v, conf, src, juego}: el real si lo hay, si no el [JUEGO]. Acepta también números sueltos.
export function num(x) {
  if (typeof x === 'number') return finito(x);
  if (x && typeof x === 'object') {
    const v = x.v ?? x.juego;
    return typeof v === 'number' ? finito(v) : 0;
  }
  return 0;
}
// ¿Trae el dato algún número (real o de juego)?
const tiene = (x) => typeof x === 'number' || (x != null && typeof x === 'object' && (typeof x.v === 'number' || typeof x.juego === 'number'));

// Texto en inglés de un campo {es, en} o de una cadena.
export const textoEn = (x, porDefecto = '') => (x == null ? porDefecto : typeof x === 'string' ? x : x.en ?? x.es ?? porDefecto);

// ---------- Lectura de la partida ----------
export function misionDe(estado, D) {
  const id = estado?.mision?.id;
  return (id != null && obj(D?.MISIONES)[id]) || null;
}

export function eventosPorDificultad(estado) {
  const d = estado?.mision?.dificultad;
  if (EVENTOS_POR_DIFICULTAD[d]) return EVENTOS_POR_DIFICULTAD[d];
  if ([1, 2, 3].includes(d)) return d;
  return EVENTOS_POR_DIFICULTAD.normal;
}

export function piezaEnMision(mision, id, pieza) {
  if (!mision) return false;
  return arr(mision.piezas).includes(id) || arr(pieza?.misiones).includes(mision.id);
}

// Uso efectivo (h/día). Una pieza sin decisión de uso (estructura, panel…) está siempre encendida: 24 h.
export function usoEfectivo(pieza, uso) {
  const u = pieza?.uso;
  if (!u || typeof u !== 'object') return 24;
  const min = finito(num(u.min)), max = tiene(u.max) ? num(u.max) : 24;
  const def = tiene(u.def) ? num(u.def) : max;
  const n = Number(uso);
  const x = uso == null || !Number.isFinite(n) ? def : n;
  return Math.min(max, Math.max(min, x));
}

// Piezas montadas válidas: existen, son del rol y de la misión. Las demás se ignoran (no rompen nada).
export function montadas(estado, D) {
  const m = misionDe(estado, D);
  if (!m) return [];
  const P = obj(D?.PIEZAS);
  const r = [];
  for (const rol of ROLES) {
    for (const [id, sel] of Object.entries(obj(estado?.porRol?.[rol]?.piezas))) {
      const pieza = P[id];
      if (!pieza || pieza.rol !== rol || !piezaEnMision(m, id, pieza)) continue;
      const ops = arr(pieza.opciones);
      const opcion = ops.find((o) => o?.id === sel?.op) ?? ops[0] ?? {};
      r.push({ rol, id, pieza, opcion: obj(opcion), uso: usoEfectivo(pieza, sel?.uso) });
    }
  }
  return r;
}

export function coheteDe(estado, D) {
  const m = misionDe(estado, D);
  const id = estado?.porRol?.vuelo?.cohete;
  if (!m || id == null || !arr(m.cohetes).includes(id)) return null;
  const c = obj(D?.COHETES)[id];
  return c ? { id, ...c } : null;
}

export function rutaDe(estado, D) {
  const m = misionDe(estado, D);
  const id = estado?.porRol?.vuelo?.ruta;
  if (!m || id == null) return null;
  return arr(m.rutas).find((r) => r?.id === id) ?? null;
}

export function contingenciasCompradas(estado, D) {
  const m = misionDe(estado, D);
  if (!m) return [];
  const C = obj(D?.CONTINGENCIAS);
  const ids = [...new Set(arr(estado?.porRol?.comms?.contingencias))];
  return ids.filter((id) => arr(m.contingencias).includes(id) && C[id]).map((id) => ({ id, ...C[id] }));
}

// Eventos de diseño ya salidos (MEC-10), con su ficha. Sus efectos se derivan aquí, no se guardan.
export function eventosDisenoSalidos(estado, D) {
  const E = obj(D?.EVENTOS_DISENO);
  return arr(estado?.diseno?.eventos).map((e) => e?.id).filter((id) => E[id]).map((id) => ({ id, ...E[id] }));
}

// Siguiente evento de la lista de la misión que toca (o null si ya salieron los de la dificultad, o no quedan).
// Sin estado: barajado fijo con la semilla y la misión, y se toma el primero que aún no salió. Los genéricos no cuentan.
export function siguienteEventoDiseno(estado, D) {
  const m = misionDe(estado, D);
  if (!m) return null;
  const E = obj(D?.EVENTOS_DISENO);
  const lista = arr(m.eventosDiseno).filter((id) => E[id]);
  const vistos = arr(estado?.diseno?.eventos).map((e) => e?.id);
  if (vistos.filter((id) => lista.includes(id)).length >= eventosPorDificultad(estado)) return null;
  const orden = barajar(prng(derivar(estado?.semilla ?? 0, 'diseno', m.id)), lista);
  return orden.find((id) => !vistos.includes(id)) ?? null;
}

// Eventos genéricos (EVENTOS_DISENO con `generico: true`, opcionalmente `misiones: [ids]`) que valen para esta misión.
export const EVENTOS_GENERICOS_MAX = 3;   // como mucho 3 eventos genéricos por partida
export const P_GENERICO_MES = 0.07;       // probabilidad de un genérico por mes (si no sale uno de la lista de la misión)
export function eventosGenericos(m, D) {
  const propios = arr(m?.eventosDiseno);
  return Object.values(obj(D?.EVENTOS_DISENO)).filter((e) => e?.generico && !propios.includes(e.id) && (!arr(e.misiones).length || arr(e.misiones).includes(m?.id))).map((e) => e.id);
}
export function siguienteEventoGenerico(estado, D) {
  const m = misionDe(estado, D);
  if (!m) return null;
  const pool = eventosGenericos(m, D);
  const vistos = arr(estado?.diseno?.eventos).map((e) => e?.id);
  if (vistos.filter((id) => pool.includes(id)).length >= EVENTOS_GENERICOS_MAX) return null;
  return barajar(prng(derivar(estado?.semilla ?? 0, 'generico', m.id)), pool).find((id) => !vistos.includes(id)) ?? null;
}

// Sorteo en tiempo real (lo hace el anfitrión en cada tic, con estado.reloj.mes ya avanzado). Determinista: semilla + misión + mes.
// Los eventos de la lista de la misión (nº según la dificultad) se reparten hasta el plazo (mín. 6 meses; sin plazo, 12):
// p = eventos que faltan / meses que quedan. Si no sale ninguno, un genérico con P_GENERICO_MES. → id o null.
export function sortearEventoDiseno(estado, D) {
  const m = misionDe(estado, D);
  if (!m) return null;
  const mes = Math.max(0, entero(estado?.reloj?.mes) ?? 0);
  const azar = prng(derivar(estado?.semilla ?? 0, 'evento', m.id, mes));
  const tirada = azar(), tirada2 = azar();
  const sig = siguienteEventoDiseno(estado, D);
  if (sig) {
    const lista = arr(m.eventosDiseno);
    const vistos = arr(estado?.diseno?.eventos).filter((e) => lista.includes(e?.id)).length;
    const horizonte = Math.max(6, entero(estado?.mision?.plazo) ?? 12);
    if (tirada < (eventosPorDificultad(estado) - vistos) / Math.max(1, horizonte - mes)) return sig;
  }
  const gen = siguienteEventoGenerico(estado, D);
  return gen && tirada2 < P_GENERICO_MES ? gen : null;
}

// ---------- Reloj de misión e inversores (contrato-reloj.md §1, §3) ----------
// Solo vale para misiones con `reloj` y un plazo comprometido (estado.mision.plazo): sin eso, nada de esto cambia el juego.
// El reloj corre en tiempo real mientras el equipo diseña (FASES_RELOJ); el anfitrión suma 1 mes con la acción `tic`.
// Las revisiones de diseño ya NO suman meses. Más jugadores con rol = más rápido: 4 → 60 s/mes, 3 → 75, 2 → 90, 1 → 105.
export const FASES_RELOJ = ['diseno', 'restricciones', 'verificacion'];
export const MS_MES_BASE = 60_000, MS_MES_POR_JUGADOR_MENOS = 15_000;
export const msPorMes = (n) => MS_MES_BASE + (4 - Math.min(4, Math.max(1, Math.floor(Number(n)) || 1))) * MS_MES_POR_JUGADOR_MENOS;
export const relojCorre = (estado) => FASES_RELOJ.includes(estado?.fase);
export const MARGEN_LANZAMIENTO = 1; // el mes de lanzamiento planificado (en diseño/restricciones) debe ser ≥ reloj.mes + 1
export const MESES_REVISION = MARGEN_LANZAMIENTO; // nombre antiguo (las revisiones ya no suman meses): solo lo usa el planificador
export const MESES_REDISENO = 6;   // volver a diseñar tras un vuelo (informe → diseño) cuesta 6 meses
export const GRACIA_RETRASO = 1;   // 1 mes de retraso sin recorte
export const RECORTE_MES = 0.04;   // después, −4 % del presupuesto por mes
export const RECORTE_MAX = 0.4;    // como mucho −40 %
export const RETRASO_CANCELA = 12; // con más de 12 meses de retraso, los inversores se retiran
export const BONO_PLAZO = { corto: 0.1, medio: 0, largo: -0.1 }; // los inversores pagan la rapidez
const entero = (x) => (Number.isInteger(x) ? x : null);

export const plazosDe = (m) => arr(m?.reloj?.plazos).filter((x) => Number.isInteger(x) && x >= 0);
// Plazo que se compromete por defecto al elegir la misión: el del medio.
export const plazoPorDefecto = (m) => { const p = plazosDe(m); return p.length ? p[Math.floor((p.length - 1) / 2)] : null; };
// Tipo de plazo por su posición en la lista: el primero es corto, el último largo, el resto medio.
export function tipoPlazo(m, plazo) {
  const p = plazosDe(m), i = p.indexOf(plazo);
  if (i < 0 || p.length < 2) return 'medio';
  return i === 0 ? 'corto' : i === p.length - 1 ? 'largo' : 'medio';
}

// → { activo, mes, plazo, inicio, lanzamiento (ruta.mes o null), retraso, recorte, bono, cancelada, corriendo, msPorMes, inicioMes }.
// `activo` = hay plazo válido. corriendo/msPorMes/inicioMes salen de estado.reloj (para animar el reloj en la interfaz).
// retraso = max(0, max(reloj.mes, ruta.mes ?? reloj.mes) − plazo); recorte = min(40 %, 4 % · max(0, retraso − 1)).
export function relojDe(estado, D) {
  const m = misionDe(estado, D);
  const mes = Math.max(0, entero(estado?.reloj?.mes) ?? 0);
  const inicio = Math.max(0, entero(m?.reloj?.inicio) ?? 0);
  const plazo = m?.reloj && plazosDe(m).includes(estado?.mision?.plazo) ? estado.mision.plazo : null;
  const rl = obj(estado?.reloj);
  const tiempo = { corriendo: !!rl.corriendo && relojCorre(estado), msPorMes: finito(rl.msPorMes) > 0 ? rl.msPorMes : msPorMes(4), inicioMes: finito(rl.inicioMes) };
  if (plazo == null) return { activo: false, mes, plazo: null, inicio, retraso: 0, recorte: 0, bono: 0, cancelada: false, ...tiempo };
  const rutaMes = entero(estado?.ruta?.mes);
  const retraso = Math.max(0, Math.max(mes, rutaMes ?? mes) - plazo);
  const recorte = Math.min(RECORTE_MAX, RECORTE_MES * Math.max(0, retraso - GRACIA_RETRASO));
  return { activo: true, mes, plazo, inicio, lanzamiento: rutaMes, retraso, recorte, bono: BONO_PLAZO[tipoPlazo(m, plazo)], cancelada: retraso > RETRASO_CANCELA, ...tiempo };
}

// ---------- Condiciones de un mes del calendario (D.CALENDARIO, src/datos/calendario.js) ----------
const DIA_POR_MES = 30.4375;
// Día (desde el 1/1/2027) del día 15 del mes mesAbs: el mismo que usa el cálculo del calendario.
export const diaDeMes = (mesAbs) => Math.floor(mesAbs / 12) * 365.25 + (mesAbs % 12) * DIA_POR_MES + 14;
// → null sin calendario; si no { mesAbs, sitioLanz, lluvia, viento50, nubes, pScrub, puntuacion, pKp7, pSep, elong, diasConj, factorDv }.
export function condicionesMes(m, D, mesAbs, coheteId) {
  const C = D?.CALENDARIO;
  if (!C || typeof C !== 'object') return null;
  const total = num(C.MESES) || 60;
  const k = Math.min(total - 1, Math.max(0, Math.floor(finito(Number(mesAbs)))));
  const idSitio = obj(C.SITIO_COHETE)[coheteId] ?? 'cabo';
  const S = obj(C.SITIOS_LANZAMIENTO)[idSitio] ?? null;
  const E = obj(C.ESPACIO), DE = obj(obj(C.DESTINOS)[m?.destino]);
  const en = (a, i, d = null) => (typeof arr(a)[i] === 'number' && Number.isFinite(a[i]) ? a[i] : d);
  const mc = k % 12;
  return {
    mesAbs: k, sitioLanz: S ? idSitio : null,
    lluvia: en(S?.lluvia, mc), viento50: en(S?.viento50, mc), nubes: en(S?.nubes, mc), pScrub: en(S?.pScrub, mc, 0), puntuacion: en(S?.puntuacion, mc, 0),
    pKp7: en(E.pKp7, k, 0), pSep: en(E.pSep, k, 0), elong: en(DE.elongMin, k), diasConj: en(DE.diasConj, k, 0), factorDv: Math.max(1, en(DE.factorDv, k, 1)),
  };
}

// Cometa (contrato §2): ¿llega la nave al menos `margenMeses` antes de un perihelio que caiga dentro de la vida de la misión?
// → null si no aplica; si no { llegadaDia, perihelioDia (el primero tras llegar), ok }.
function reglaCometa(m, D, cond, ruta) {
  const K = D?.CALENDARIO?.COMETA_67P;
  if (!K || m?.destino !== 'cometa' || !cond || !ruta || !(num(ruta.dias) > 0)) return null;
  const periodo = num(K.periodoAnios) * 365.25, margen = num(K.margenMeses) * DIA_POR_MES;
  if (!(periodo > 0)) return null;
  const llegadaDia = diaDeMes(cond.mesAbs) + num(ruta.dias);
  const n = Math.ceil((llegadaDia - num(K.perihelioDia)) / periodo);
  const perihelioDia = num(K.perihelioDia) + n * periodo;
  let ok = false;
  for (let j = n; j <= n + 3; j++) {
    const p = num(K.perihelioDia) + j * periodo;
    if (p >= llegadaDia + margen && p <= llegadaDia + (num(m.diasPrevistos) || 0)) ok = true;
  }
  return { llegadaDia: Math.round(llegadaDia), perihelioDia: Math.round(perihelioDia), ok };
}

// ---------- Planificación de ruta (sala de control) ----------
// Mes más alto que se puede planificar (meses desde el inicio del diseño).
export function mesMaxDe(P, m, D) {
  const L = obj(P?.lanzamiento);
  const max = Math.max(0, Math.floor(num(L.mesMax)));
  const total = num(D?.CALENDARIO?.MESES) || 60;
  return m?.reloj && D?.CALENDARIO ? Math.min(max, total - 1 - Math.max(0, entero(m.reloj.inicio) ?? 0)) : max;
}

// → null si la misión no tiene planificación; si no
//   { P, mes, dia (= mes, compatibilidad), sitio, factor, optimo: false, perdida, mesAbs, cond, cometa }.
//   perdida: el mes de lanzamiento ya pasó (reloj.mes > ruta.mes): el plan no vale y la verificación falla.
export function planDe(estado, D) {
  const m = misionDe(estado, D);
  const P = m ? obj(D?.PLANIFICACION)[m.id] : null;
  if (!P) return null;
  const r = obj(estado?.ruta);
  const mes = Number.isInteger(r.mes) && r.mes >= 0 && r.mes <= mesMaxDe(P, m, D) ? r.mes : null;
  const sitio = arr(P.sitios).find((s) => s?.id === r.sitio) ?? null;
  const reloj = relojDe(estado, D);
  const perdida = mes != null && reloj.mes > mes;
  const cond = mes != null && m.reloj ? condicionesMes(m, D, reloj.inicio + mes, coheteDe(estado, D)?.id) : null;
  const factor = cond?.factorDv ?? 1;
  const cometa = reglaCometa(m, D, cond, rutaDe(estado, D));
  return { P, mes, dia: mes, sitio, factor, optimo: false, perdida, mesAbs: cond?.mesAbs ?? null, cond, cometa };
}

// ---------- Barras ----------
export function estadoDeRatio(ratio) {
  if (ratio <= 1 + EPS) return 'ok';
  if (ratio <= TOLERANCIA + EPS) return 'tolerancia';
  return 'exceso';
}

function barraVacia() {
  return { usado: 0, limite: 0, ratio: 0, estado: 'ok', partes: [], aportes: [] };
}

// Límite: con aporte de piezas y tope de la misión vale el menor; con uno solo, ese; sin ninguno, 0.
function limiteDe(hayAporte, aporte, tope) {
  const hayTope = tiene(tope);
  if (hayAporte && hayTope) return Math.min(aporte, num(tope));
  if (hayAporte) return aporte;
  if (hayTope) return num(tope);
  return 0;
}

// → { barras: { masa, potencia, bateria, datos, presupuesto, volumen }, ciencia, riesgos, fases, energiaWh }
//   barra = { usado, limite, ratio, estado, partes: [{ rol, id, v }], aportes: [{ rol, id, v }] }
export function resumen(estado, D) {
  const barras = Object.fromEntries(BARRAS.map((b) => [b, barraVacia()]));
  const res = { barras, ciencia: { objetivos: [], total: 0 }, riesgos: [], fases: [], energiaWh: 0, plan: null, reloj: null, tolerancia: [] };
  const m = misionDe(estado, D);
  if (!m) return res;

  const sumar = (b, rol, id, v) => { if (!v) return; barras[b].usado += v; barras[b].partes.push({ rol, id, v }); };
  const aporte = { masa: 0, potencia: 0, bateria: 0, datos: 0, volumen: 0 };
  const aportar = (b, rol, id, v) => { if (!(v > 0)) return; aporte[b] += v; barras[b].aportes.push({ rol, id, v }); };
  const plan = planDe(estado, D);
  const efSitio = obj(plan?.sitio?.efectos);
  const horasSombra = tiene(efSitio.horasSombra) ? num(efSitio.horasSombra) : num(m.horasSombra);
  // Conjunción solar en el mes de lanzamiento: el enlace va a la mitad esos días (promediado sobre la vida de la misión).
  const conj = num(plan?.cond?.diasConj), efC = obj(D?.CALENDARIO?.EFECTOS);
  const factorEnlace = conj > 0 ? 1 - num(efC.enlaceConj) * Math.min(1, conj / (num(m.diasPrevistos) || 1)) : 1;
  const horasEnlace = num(m.horasEnlace) * factorEnlace;

  const ms = montadas(estado, D);
  for (const x of ms) {
    const o = x.opcion, activa = x.uso > 0;
    sumar('masa', x.rol, x.id, num(o.masa));
    if (activa) sumar('potencia', x.rol, x.id, num(o.potencia));
    if (activa && x.pieza.enSombra) sumar('bateria', x.rol, x.id, num(o.potencia) * horasSombra);
    sumar('datos', x.rol, x.id, num(o.tasa) * x.uso * MB_POR_KBPS_HORA);
    sumar('presupuesto', x.rol, x.id, num(o.precio));
    sumar('volumen', x.rol, x.id, num(o.volumen));
    if (activa) res.energiaWh += num(o.potencia) * x.uso;
    const a = obj(o.aporta);
    aportar('potencia', x.rol, x.id, num(a.potencia));
    aportar('bateria', x.rol, x.id, num(a.bateria));
    aportar('datos', x.rol, x.id, num(a.bajada) * horasEnlace * MB_POR_KBPS_HORA);
    aportar('volumen', x.rol, x.id, num(a.volumen));
  }

  const cohete = coheteDe(estado, D);
  if (cohete) {
    aportar('masa', 'vuelo', cohete.id, num(obj(cohete.capacidad)[m.destino]));
    sumar('presupuesto', 'vuelo', cohete.id, num(cohete.precio));
  }
  const ruta = rutaDe(estado, D);
  if (ruta) {
    sumar('masa', 'vuelo', ruta.id, num(ruta.masa));
    sumar('presupuesto', 'vuelo', ruta.id, num(ruta.precio));
    // Mes de lanzamiento con mala geometría: más ΔV = más propelente (la parte se llama 'geometria').
    if (plan && plan.factor > 1 + EPS) sumar('masa', 'vuelo', 'geometria', num(ruta.masa) * (plan.factor - 1));
  }
  const reloj = relojDe(estado, D);
  res.reloj = reloj;
  res.plan = plan ? { dia: plan.dia, mes: plan.mes, mesAbs: plan.mesAbs, sitio: plan.sitio?.id ?? null, factor: plan.factor, optimo: false,
    perdida: plan.perdida, extraKg: ruta ? num(ruta.masa) * (plan.factor - 1) : 0, horasSombra, horasEnlace, factorEnlace,
    dv: num(obj(plan.P.lanzamiento).dvMin) * plan.factor, cond: plan.cond, cometa: plan.cometa } : null;
  const compradas = contingenciasCompradas(estado, D);
  for (const c of compradas) {
    sumar('masa', 'comms', c.id, num(c.masa));
    sumar('presupuesto', 'comms', c.id, num(c.precio));
  }

  const tope = obj(m.limites);
  barras.masa.limite = limiteDe(!!cohete, aporte.masa, tope.masa);
  for (const b of ['potencia', 'bateria', 'datos', 'volumen']) barras[b].limite = limiteDe(aporte[b] > 0, aporte[b], tope[b]);

  // Presupuesto (contrato §3): misión · (1 + bono del plazo) · (1 − recorte por retraso); luego los eventos de diseño,
  // primero las sumas y después los factores (así el orden en que salieron no importa).
  // Eventos de diseño: presupuesto ±X, factor sobre un límite, cambio de objetivo prioritario.
  const eventos = eventosDisenoSalidos(estado, D);
  const base = num(m.presupuesto) * (1 + reloj.bono) * (1 - reloj.recorte);
  let sumaEventos = 0, factorPres = 1;
  let prioridad = null;
  for (const ev of eventos) {
    const ef = obj(ev.efecto);
    if (ef.presupuesto != null) sumaEventos += num(ef.presupuesto);
    for (const l of Array.isArray(ef.limite) ? ef.limite : ef.limite ? [ef.limite] : []) {
      if (barras[l?.recurso] && l.recurso !== 'presupuesto') barras[l.recurso].limite *= Math.max(0, num(l.factor));
      if (l?.recurso === 'presupuesto') factorPres *= Math.max(0, num(l.factor));
    }
    if (ef.prioridad) prioridad = ef.prioridad;
  }
  barras.presupuesto.limite = Math.max(0, (base + sumaEventos) * factorPres);
  reloj.presupuesto = { mision: num(m.presupuesto), bono: reloj.bono, recorte: reloj.recorte, eventos: sumaEventos, factor: factorPres, limite: barras.presupuesto.limite };

  for (const b of BARRAS) {
    const x = barras[b];
    x.ratio = x.limite > 0 ? x.usado / x.limite : x.usado > EPS ? Infinity : 0;
    x.estado = estadoDeRatio(x.ratio);
  }

  // Cometa: llegar tarde al perihelio recorta la cobertura del objetivo prioritario.
  const factorPrio = plan?.cometa && !plan.cometa.ok ? num(D?.CALENDARIO?.COMETA_67P?.factor) : 1;
  res.ciencia = ciencia(m, ms, prioridad, estado?.mision?.objetivos, obj(efSitio.ciencia), factorPrio);
  res.tolerancia = riesgoToleranciaDe(barras, m);
  res.fases = fases(m, ms, ruta, compradas, plan, obj(D?.CALENDARIO?.EFECTOS), res.tolerancia);
  res.riesgos = riesgos(m, D, compradas);
  return res;
}

// Indicador de ciencia (§6): cobertura = fracción de instrumentos montados × min(1, uso medio / uso objetivo).
// `seleccion`: ids marcados en el expediente (estado.mision.objetivos). Si no es una lista, cuentan todos.
// El prioritario cuenta siempre.
function ciencia(m, ms, prioridadPedida, seleccion, factores = {}, factorPrio = 1) {
  const uso = new Map(ms.map((x) => [x.id, x.uso]));
  const sel = Array.isArray(seleccion) ? new Set(seleccion) : null;
  const elegidos = arr(m.objetivos).filter((o) => o && o.id != null && (!sel || o.prioridad || sel.has(o.id)));
  // Un evento que nombra un objetivo que no es de esta misión (o no está marcado) no cambia nada.
  const prioridadEvento = elegidos.some((o) => o?.id === prioridadPedida) ? prioridadPedida : null;
  const objetivos = elegidos.map((o) => {
    const req = arr(o.requiere);
    let cobertura = 1;
    if (req.length) {
      const hechos = req.filter((id) => uso.has(id));
      const usoMedio = hechos.length ? hechos.reduce((s, id) => s + uso.get(id), 0) / hechos.length : 0;
      const uo = num(o.usoObjetivo);
      cobertura = hechos.length ? (hechos.length / req.length) * (uo > 0 ? Math.min(1, usoMedio / uo) : 1) : 0;
    }
    // El sitio u órbita elegidos en la sala de control pueden limitar un objetivo (p. ej. sin ver la Tierra).
    if (tiene(factores[o.id])) cobertura = clamp01(cobertura * num(factores[o.id]));
    const prioridad = prioridadEvento ? o.id === prioridadEvento : !!o.prioridad;
    if (prioridad && factorPrio !== 1) cobertura = clamp01(cobertura * factorPrio);
    return { id: o.id, prioridad, cobertura, valor: o.valor == null ? 1 : num(o.valor), nombre: o.nombre ?? null };
  });
  const suma = objetivos.reduce((s, o) => s + o.valor, 0);
  const total = suma > 0 ? objetivos.reduce((s, o) => s + o.valor * o.cobertura, 0) / suma : 0;
  return { objetivos, total };
}

// Fases del vuelo (G-01) con su probabilidad visible: base + mejoras por piezas, contingencias y ruta, sitio y condiciones del mes.
// desglose: [{ fuente, ref, dp }] con fuente ∈ base | pieza | contingencia | ruta | sitio | mes | clima | espacio | conjuncion
// ('base' y 'mes' no aparecen como entrada: la base es pBase y 'mes' queda reservada). Σ dp = pCruda − pBase (p es pCruda recortada a 0..1).
//   clima: fase de lanzamiento (la primera), dp = −puntuacion · climaDp, ref = sitio de lanzamiento.
//   espacio: fase `lanzamiento.faseEspacio` (o la segunda), dp = −pKp7 · espacioDp, ref = mesAbs.
//   conjuncion: fase que sigue al lanzamiento, dp = −min(conjDpMax, conjDpDia · diasConj), ref = mesAbs.
function fases(m, ms, ruta, compradas, plan = null, efectos = {}, tolerancia = []) {
  const ctg = new Set(compradas.map((c) => c.id));
  const hay = new Set([...ms.filter((x) => x.uso > 0 || !x.pieza.uso).map((x) => x.id), ...ctg]);
  if (ruta) hay.add(ruta.id);
  const lista = arr(m.fases).filter((f) => f && f.id != null);
  const cond = plan?.cond;
  const faseEspacio = plan?.P?.lanzamiento?.faseEspacio ?? lista[1]?.id;
  const fuenteDe = (id) => (ctg.has(id) ? 'contingencia' : ruta && id === ruta.id ? 'ruta' : 'pieza');
  return lista.map((f, i) => {
    let p = num(f.pBase);
    const desglose = [];
    const poner = (fuente, ref, dp) => { if (!dp) return; p += dp; desglose.push({ fuente, ref: ref == null ? null : String(ref), dp }); };
    for (const mj of arr(f.mejoras)) if (hay.has(mj?.por)) poner(fuenteDe(mj.por), mj.por, num(mj.dp));
    if (ruta?.efecto?.fase === f.id) poner('ruta', ruta.id, num(ruta.efecto.dp));
    for (const x of arr(plan?.sitio?.efectos?.fases)) if (x?.fase === f.id) poner('sitio', plan.sitio.id, num(x.dp));
    if (cond) {
      if (i === 0) poner('clima', cond.sitioLanz, -num(cond.puntuacion) * num(efectos.climaDp));
      if (f.id === faseEspacio) poner('espacio', cond.mesAbs, -num(cond.pKp7) * num(efectos.espacioDp));
      if (i === 1 && cond.diasConj > 0) poner('conjuncion', cond.mesAbs, -Math.min(num(efectos.conjDpMax), num(efectos.conjDpDia) * cond.diasConj));
    }
    for (const t of tolerancia) if (t.fase === f.id) poner('tolerancia', t.barra, -t.dp); // barra pasada de su límite (≤ +20 %)
    return { id: f.id, nombre: f.nombre ?? null, critica: !!f.critica, pBase: clamp01(num(f.pBase)), p: clamp01(p), pCruda: p, desglose };
  });
}

// Mazo visible de eventos de misión (G-09) con su probabilidad y si una contingencia comprada los mitiga.
function riesgos(m, D, compradas) {
  const E = obj(D?.EVENTOS_MISION);
  const ids = new Set(compradas.map((c) => c.id));
  return arr(m.eventosMision).filter((id) => E[id]).map((id) => {
    const ev = E[id];
    return { id, fase: ev.fase ?? null, p: clamp01(num(ev.p)), mitigado: arr(ev.mitigadoPor).some((c) => ids.has(c)), signo: ev.signo ?? '-' };
  });
}

// ---------- Riesgo por tolerancia (DEC-10 revisada) ----------
// Una barra con ratio en (1, 1,2] pasa la revisión, pero aumenta la probabilidad de fallo de una fase del vuelo.
// Fase por barra (por id de fase de la misión; si no existe, por posición): masa y volumen → lanzamiento (la 1.ª);
// potencia → crucero (launch→cruise/transit, la 2.ª); batería → insertion/arrival/surface (la penúltima);
// datos → science/surface/coma (la última); presupuesto → TODAS las fases con 1/4 del efecto.
const FASE_DE_BARRA = {
  masa: { ids: ['launch'], idx: 0 }, volumen: { ids: ['launch'], idx: 0 },
  potencia: { ids: ['cruise', 'transit'], idx: 1 }, bateria: { ids: ['insertion', 'arrival', 'surface'], idx: -2 },
  datos: { ids: ['science', 'surface', 'coma'], idx: -1 },
};
function riesgoToleranciaDe(barras, m) {
  const lista = arr(m?.fases).filter((f) => f && f.id != null);
  const r = [];
  if (!lista.length) return r;
  for (const b of BARRAS) {
    const x = barras?.[b];
    if (x?.estado !== 'tolerancia' || !Number.isFinite(x.ratio)) continue;
    const dp = DP_TOLERANCIA * (x.ratio - 1);
    if (b === 'presupuesto') {
      for (const f of lista) r.push({ barra: b, ratio: x.ratio, fase: f.id, faseNombre: f.nombre ?? null, dp: dp * FACTOR_TOLERANCIA_PRESUPUESTO, todas: true });
      continue;
    }
    const cfg = FASE_DE_BARRA[b];
    const f = lista.find((y) => cfg.ids.includes(y.id)) ?? lista[Math.min(lista.length - 1, Math.max(0, cfg.idx < 0 ? lista.length + cfg.idx : cfg.idx))];
    r.push({ barra: b, ratio: x.ratio, fase: f.id, faseNombre: f.nombre ?? null, dp });
  }
  return r;
}
// → [{ barra, ratio, fase, faseNombre ({es,en}|null), dp (fracción 0..0,1 que se suma a la prob. de fallo), todas? }]
// Una entrada por barra en tolerancia (el presupuesto: una por fase, con todas: true). Ya está aplicado en res.fases (desglose 'tolerancia').
export const riesgoTolerancia = (estado, D) => resumen(estado, D).tolerancia;

// ---------- MEC-11 ----------
// → { nivel: 'dentro'|'tolerancia'|'fuera', barras: [ids en falta] }. 'tolerancia' pasa la revisión (no obliga a recortar).
export function cumple(res) {
  const bs = obj(res?.barras);
  const exceso = BARRAS.filter((b) => bs[b]?.estado === 'exceso');
  if (exceso.length) return { nivel: 'fuera', barras: exceso };
  const tol = BARRAS.filter((b) => bs[b]?.estado === 'tolerancia');
  if (tol.length) return { nivel: 'tolerancia', barras: tol };
  return { nivel: 'dentro', barras: [] };
}

// ---------- MEC-13 ----------
// → { pasa, comprobaciones: [{ id, ok, texto: { en } }] }
export function verificar(estado, D) {
  const c = [];
  const poner = (id, ok, en, es) => c.push({ id, ok: !!ok, texto: es ? { en, es } : { en } });
  const m = misionDe(estado, D);
  if (!m) { poner('mision', false, 'A mission is chosen', 'Hay una misión elegida'); return { pasa: false, comprobaciones: c }; }
  const res = resumen(estado, D);
  const malas = BARRAS.filter((b) => res.barras[b].estado === 'exceso'); // la tolerancia (≤ +20 %) pasa: solo sube el riesgo
  const NOMBRE_BARRA_ES = { masa: 'Masa', potencia: 'Potencia', bateria: 'Batería', datos: 'Enlace de datos', presupuesto: 'Presupuesto', volumen: 'Volumen' };
  poner('barras', !malas.length,
    malas.length ? `All bars within limits (over: ${malas.map((b) => NOMBRE_BARRA[b]).join(', ')})` : 'All bars within limits',
    malas.length ? `Todas las barras dentro de su límite (se pasan: ${malas.map((b) => NOMBRE_BARRA_ES[b]).join(', ')})` : 'Todas las barras dentro de su límite');
  poner('cohete', !!coheteDe(estado, D), 'A launch vehicle is chosen', 'Hay un cohete elegido');
  poner('ruta', !!rutaDe(estado, D), 'A route is chosen', 'Hay una ruta elegida');
  const plan = planDe(estado, D);
  if (plan) {
    poner('plan', plan.mes != null && !!plan.sitio, 'Launch month and site/orbit planned in Mission Control',
      'Mes de lanzamiento y sitio/órbita planificados en la sala de control');
    if (plan.mes != null) {
      poner('mesLanzamiento', !plan.perdida, plan.perdida ? 'Launch month already passed: choose another one' : 'The launch month is still ahead',
        plan.perdida ? 'El mes de lanzamiento ya pasó: elige otro' : 'El mes de lanzamiento aún no ha pasado');
    }
  }
  if (res.reloj?.activo) {
    poner('inversores', !res.reloj.cancelada, res.reloj.cancelada ? 'Investors pulled out' : 'Investors still fund the mission',
      res.reloj.cancelada ? 'Los inversores se retiraron' : 'Los inversores siguen financiando la misión');
  }
  const prio = res.ciencia.objetivos.find((o) => o.prioridad);
  poner('prioritario', !prio || prio.cobertura > 0, 'The priority objective has its instruments on board and switched on',
    'El objetivo prioritario tiene sus instrumentos a bordo y encendidos');
  const ms = montadas(estado, D);
  poner('fuentePotencia', ms.some((x) => num(obj(x.opcion.aporta).potencia) > 0), 'Something on board generates power', 'Algo a bordo genera energía');
  poner('enlace', ms.some((x) => num(obj(x.opcion.aporta).bajada) > 0), 'Something on board can send data home', 'Algo a bordo puede enviar datos a casa');
  const ids = new Set(ms.map((x) => x.id));
  for (const v of arr(m.verificacion)) {
    if (!v) continue;
    let ok = true;
    if (v.tipo === 'pieza') {
      const piezas = arr(v.piezas).length ? arr(v.piezas) : v.pieza != null ? [v.pieza] : [];
      ok = piezas.some((id) => ids.has(id));
    } else if (v.tipo === 'coberturaMin') {
      const o = res.ciencia.objetivos.find((x) => x.id === v.objetivo);
      if (!o && arr(m.objetivos).some((x) => x?.id === v.objetivo)) continue; // objetivo no marcado en el expediente
      ok = (o?.cobertura ?? 0) + EPS >= num(v.min);
    }
    c.push({ id: v.id ?? `mision-${c.length}`, ok, texto: typeof v.texto === 'string' ? { en: v.texto } : v.texto ?? { en: String(v.id ?? '') } });
  }
  return { pasa: c.every((x) => x.ok), comprobaciones: c };
}

// ---------- Cambios sobre los talleres (los usa el protocolo y MEC-12) ----------
// cambio = { tipo: 'montar', rol, pieza, op, uso } | { tipo: 'quitar', rol, pieza } | { tipo: 'cohete', id }
//        | { tipo: 'ruta', id } | { tipo: 'contingencia', id, on }
export function aplicarCambio(porRol, c) {
  const taller = (rol) => {
    if (!porRol[rol] || typeof porRol[rol] !== 'object') porRol[rol] = {};
    if (!porRol[rol].piezas || typeof porRol[rol].piezas !== 'object' || Array.isArray(porRol[rol].piezas)) porRol[rol].piezas = {};
    return porRol[rol];
  };
  switch (c?.tipo) {
    case 'montar': taller(c.rol).piezas[c.pieza] = { op: c.op ?? null, uso: c.uso ?? null }; break;
    case 'quitar': delete taller(c.rol).piezas[c.pieza]; break;
    case 'cohete': taller('vuelo').cohete = c.id ?? null; break;
    case 'ruta': taller('vuelo').ruta = c.id ?? null; break;
    case 'contingencia': {
      const t = taller('comms');
      const lista = arr(t.contingencias).filter((x) => x !== c.id);
      if (c.on) lista.push(c.id);
      t.contingencias = lista;
      break;
    }
    default: break;
  }
  return porRol;
}

export function conCambio(estado, cambio) {
  const porRol = JSON.parse(JSON.stringify(estado?.porRol ?? {}));
  return { ...estado, porRol: aplicarCambio(porRol, cambio) };
}

// MEC-12: en Restricciones solo se quita, se baja el uso o se cambia a algo que no suba ninguna barra que no esté ok
// (ni saque de ok a ninguna). Devuelve el motivo en inglés, o null si se puede.
// También acepta el nombre de la acción como tipo ('elegirCohete', 'elegirRuta').
const ALIAS_CAMBIO = { elegirCohete: 'cohete', elegirRuta: 'ruta' };
export function motivoRestriccion(estado, cambio, D) {
  if (ALIAS_CAMBIO[cambio?.tipo]) cambio = { ...cambio, tipo: ALIAS_CAMBIO[cambio.tipo] };
  if (!['montar', 'quitar', 'cohete', 'ruta', 'contingencia'].includes(cambio?.tipo)) return 'Unknown change';
  if (cambio.tipo === 'montar') {
    const previo = obj(estado?.porRol?.[cambio.rol]?.piezas)[cambio.pieza];
    if (!previo) return 'In Constraints you can only remove or reduce, not add new parts';
    const pieza = obj(D?.PIEZAS)[cambio.pieza];
    if (pieza?.uso && usoEfectivo(pieza, cambio.uso) > usoEfectivo(pieza, previo.uso) + EPS) return 'In Constraints you can only lower usage';
  }
  if (cambio?.tipo === 'contingencia' && cambio.on) return 'In Constraints you cannot buy new contingencies';
  const antes = resumen(estado, D);
  const despues = resumen(conCambio(estado, cambio), D);
  for (const b of BARRAS) {
    const a = antes.barras[b], d = despues.barras[b];
    if (a.estado !== 'ok' && d.ratio > a.ratio + EPS) return `That would raise ${NOMBRE_BARRA[b]}, which is over its limit`;
    if (a.estado === 'ok' && d.estado !== 'ok') return `That would push ${NOMBRE_BARRA[b]} over its limit`;
  }
  return null;
}

export function puedeEnRestricciones(estado, cambio, D) {
  return motivoRestriccion(estado, cambio, D) === null;
}
