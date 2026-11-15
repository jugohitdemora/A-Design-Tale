// Motor de reglas: barras, ciencia, riesgos, verificación y MEC-12. Ver mecanicas-del-juego.md §5–§7 y §11.
// Puro (sin red, sin DOM): todo se calcula a partir de (estado, DATOS). Nada de lo que sale de aquí se guarda
// en el estado (PROTOCOLO §6): cada cliente lo recalcula.
// Tolera estado parcial (sin misión, talleres vacíos, ids desconocidos, valores null) sin lanzar errores.
import { prng, derivar, barajar } from './azar.js';

export const ROLES = ['vuelo', 'ciencia', 'potencia', 'comms'];
export const BARRAS = ['masa', 'potencia', 'bateria', 'datos', 'presupuesto', 'volumen'];
export const NOMBRE_BARRA = { masa: 'Mass', potencia: 'Power', bateria: 'Battery', datos: 'Data link', presupuesto: 'Budget', volumen: 'Volume' };
export const MB_POR_KBPS_HORA = 0.45;      // Mateo §1.3: 1 kbps durante 1 h = 0,45 MB
export const TOLERANCIA = 1.2;              // DEC-10: hasta +20 % pasa la revisión, pero obliga a recortar
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

// Siguiente evento de diseño que toca (o null si ya salieron los de la dificultad, o no quedan).
// Sin estado: barajado fijo con la semilla y la misión, y se toma el primero que aún no salió.
export function siguienteEventoDiseno(estado, D) {
  const m = misionDe(estado, D);
  if (!m) return null;
  const vistos = arr(estado?.diseno?.eventos).map((e) => e?.id);
  if (vistos.length >= eventosPorDificultad(estado)) return null;
  const E = obj(D?.EVENTOS_DISENO);
  const orden = barajar(prng(derivar(estado?.semilla ?? 0, 'diseno', m.id)), arr(m.eventosDiseno).filter((id) => E[id]));
  return orden.find((id) => !vistos.includes(id)) ?? null;
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
  const res = { barras, ciencia: { objetivos: [], total: 0 }, riesgos: [], fases: [], energiaWh: 0 };
  const m = misionDe(estado, D);
  if (!m) return res;

  const sumar = (b, rol, id, v) => { if (!v) return; barras[b].usado += v; barras[b].partes.push({ rol, id, v }); };
  const aporte = { masa: 0, potencia: 0, bateria: 0, datos: 0, volumen: 0 };
  const aportar = (b, rol, id, v) => { if (!(v > 0)) return; aporte[b] += v; barras[b].aportes.push({ rol, id, v }); };
  const horasSombra = num(m.horasSombra), horasEnlace = num(m.horasEnlace);

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
  }
  const compradas = contingenciasCompradas(estado, D);
  for (const c of compradas) {
    sumar('masa', 'comms', c.id, num(c.masa));
    sumar('presupuesto', 'comms', c.id, num(c.precio));
  }

  const tope = obj(m.limites);
  barras.masa.limite = limiteDe(!!cohete, aporte.masa, tope.masa);
  for (const b of ['potencia', 'bateria', 'datos', 'volumen']) barras[b].limite = limiteDe(aporte[b] > 0, aporte[b], tope[b]);

  // Eventos de diseño: presupuesto ±X, factor sobre un límite, cambio de objetivo prioritario.
  const eventos = eventosDisenoSalidos(estado, D);
  let presupuesto = num(m.presupuesto);
  let prioridad = null;
  for (const ev of eventos) {
    const ef = obj(ev.efecto);
    if (ef.presupuesto != null) presupuesto += num(ef.presupuesto);
    for (const l of Array.isArray(ef.limite) ? ef.limite : ef.limite ? [ef.limite] : []) {
      if (barras[l?.recurso] && l.recurso !== 'presupuesto') barras[l.recurso].limite *= Math.max(0, num(l.factor));
      if (l?.recurso === 'presupuesto') presupuesto *= Math.max(0, num(l.factor));
    }
    if (ef.prioridad) prioridad = ef.prioridad;
  }
  barras.presupuesto.limite = Math.max(0, presupuesto);

  for (const b of BARRAS) {
    const x = barras[b];
    x.ratio = x.limite > 0 ? x.usado / x.limite : x.usado > EPS ? Infinity : 0;
    x.estado = estadoDeRatio(x.ratio);
  }

  res.ciencia = ciencia(m, ms, prioridad);
  res.fases = fases(m, ms, ruta, compradas);
  res.riesgos = riesgos(m, D, compradas);
  return res;
}

// Indicador de ciencia (§6): cobertura = fracción de instrumentos montados × min(1, uso medio / uso objetivo).
function ciencia(m, ms, prioridadPedida) {
  const uso = new Map(ms.map((x) => [x.id, x.uso]));
  // Un evento que nombra un objetivo que no es de esta misión no cambia nada.
  const prioridadEvento = arr(m.objetivos).some((o) => o?.id === prioridadPedida) ? prioridadPedida : null;
  const objetivos = arr(m.objetivos).filter((o) => o && o.id != null).map((o) => {
    const req = arr(o.requiere);
    let cobertura = 1;
    if (req.length) {
      const hechos = req.filter((id) => uso.has(id));
      const usoMedio = hechos.length ? hechos.reduce((s, id) => s + uso.get(id), 0) / hechos.length : 0;
      const uo = num(o.usoObjetivo);
      cobertura = hechos.length ? (hechos.length / req.length) * (uo > 0 ? Math.min(1, usoMedio / uo) : 1) : 0;
    }
    const prioridad = prioridadEvento ? o.id === prioridadEvento : !!o.prioridad;
    return { id: o.id, prioridad, cobertura, valor: o.valor == null ? 1 : num(o.valor), nombre: o.nombre ?? null };
  });
  const suma = objetivos.reduce((s, o) => s + o.valor, 0);
  const total = suma > 0 ? objetivos.reduce((s, o) => s + o.valor * o.cobertura, 0) / suma : 0;
  return { objetivos, total };
}

// Fases del vuelo (G-01) con su probabilidad visible: base + mejoras por piezas, contingencias y ruta.
function fases(m, ms, ruta, compradas) {
  const hay = new Set([...ms.filter((x) => x.uso > 0 || !x.pieza.uso).map((x) => x.id), ...compradas.map((c) => c.id)]);
  if (ruta) hay.add(ruta.id);
  return arr(m.fases).filter((f) => f && f.id != null).map((f) => {
    let p = num(f.pBase);
    for (const mj of arr(f.mejoras)) if (hay.has(mj?.por)) p += num(mj.dp);
    if (ruta?.efecto?.fase === f.id) p += num(ruta.efecto.dp);
    return { id: f.id, nombre: f.nombre ?? null, critica: !!f.critica, pBase: clamp01(num(f.pBase)), p: clamp01(p) };
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

// ---------- MEC-11 ----------
// → { nivel: 'dentro'|'tolerancia'|'fuera', barras: [ids en falta] }
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
  const poner = (id, ok, en) => c.push({ id, ok: !!ok, texto: { en } });
  const m = misionDe(estado, D);
  if (!m) { poner('mision', false, 'A mission is chosen'); return { pasa: false, comprobaciones: c }; }
  const res = resumen(estado, D);
  const malas = BARRAS.filter((b) => res.barras[b].estado !== 'ok');
  poner('barras', !malas.length, malas.length ? `All bars within limits (over: ${malas.map((b) => NOMBRE_BARRA[b]).join(', ')})` : 'All bars within limits');
  poner('cohete', !!coheteDe(estado, D), 'A launch vehicle is chosen');
  poner('ruta', !!rutaDe(estado, D), 'A route is chosen');
  const prio = res.ciencia.objetivos.find((o) => o.prioridad);
  poner('prioritario', !prio || prio.cobertura > 0, 'The priority objective has its instruments on board and switched on');
  const ms = montadas(estado, D);
  poner('fuentePotencia', ms.some((x) => num(obj(x.opcion.aporta).potencia) > 0), 'Something on board generates power');
  poner('enlace', ms.some((x) => num(obj(x.opcion.aporta).bajada) > 0), 'Something on board can send data home');
  const ids = new Set(ms.map((x) => x.id));
  for (const v of arr(m.verificacion)) {
    if (!v) continue;
    let ok = true;
    if (v.tipo === 'pieza') {
      const piezas = arr(v.piezas).length ? arr(v.piezas) : v.pieza != null ? [v.pieza] : [];
      ok = piezas.some((id) => ids.has(id));
    } else if (v.tipo === 'coberturaMin') {
      const o = res.ciencia.objetivos.find((x) => x.id === v.objetivo);
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
