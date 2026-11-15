// Stand-in for the rules and data modules, so the screens can be reviewed offline: ?simulado=1
// Not the real thing: tiny fake DATOS and fake resumen/verificar/simular in the shapes of mecanicas-del-juego.md §11.
// URL flags: ?simulado=1&fase=diseno|briefing|restricciones|verificacion|mision|informe&rol=vuelo|ciencia|potencia|comms&jugadores=1..4&tab=taller|cohete|ruta|riesgos
// None of the numbers here are real data.

const V = (v, conf = 'V', src = 'SIM-01') => ({ v, conf, src });
const J = (juego) => ({ v: null, conf: 'JUEGO', src: 'SIM-02', juego });
const N = (en) => ({ es: en, en });

export const num = (x) => (typeof x === 'number' ? x : x?.v ?? x?.juego ?? 0);

const opc = (id, masa, potencia, volumen, tasa, precio, aporta) => ({ id, nombre: N(id === 'A' ? 'Standard' : id === 'B' ? 'Light' : 'Heavy'), masa, potencia, volumen, tasa, precio, aporta });
const PIEZAS = {
  'CS-1': { id: 'CS-1', rol: 'ciencia', categoria: 'instrumento', nombre: N('Spectrometer'), desc: N('Measures surface composition'), misiones: ['SIM-1'], enSombra: false, uso: { min: 0, max: 24, def: 8 },
    opciones: [opc('A', V(12), V(20), V(20), V(200), J(15)), opc('B', V(9), V(14), V(15), V(120), J(12))] },
  'CS-2': { id: 'CS-2', rol: 'ciencia', categoria: 'instrumento', nombre: N('Camera'), desc: N('Wide-angle imager'), misiones: ['SIM-1'], enSombra: false, uso: { min: 0, max: 24, def: 6 },
    opciones: [opc('A', J(15), J(15), J(18), J(400), J(10))] },
  'PW-1': { id: 'PW-1', rol: 'potencia', categoria: 'paneles', nombre: N('Solar array'), desc: N('Deployable panels'), misiones: ['SIM-1'], enSombra: false, uso: null,
    opciones: [opc('A', V(40), V(0), V(30), V(0), V(8), { potencia: V(150) }), opc('B', V(60), V(0), V(40), V(0), V(11), { potencia: V(230) })] },
  'PW-2': { id: 'PW-2', rol: 'potencia', categoria: 'bateria', nombre: N('Battery pack'), desc: N('Lithium-ion'), misiones: ['SIM-1'], enSombra: false, uso: null,
    opciones: [opc('A', V(20), V(0), V(10), V(0), V(5), { bateria: J(400) })] },
  'CM-1': { id: 'CM-1', rol: 'comms', categoria: 'antena', nombre: N('High-gain antenna'), desc: N('Direct link to Earth'), misiones: ['SIM-1'], enSombra: false, uso: { min: 0, max: 24, def: 12 },
    opciones: [opc('A', V(10), V(30), V(8), V(0), V(6), { bajada: V(500) })] },
  'FL-1': { id: 'FL-1', rol: 'vuelo', categoria: 'estructura', nombre: N('Bus structure'), desc: N('Frame and avionics'), misiones: ['SIM-1'], enSombra: false, uso: null,
    opciones: [opc('A', V(150), V(40), V(0), V(0), V(30), { volumen: J(300) })] },
};
const COHETES = {
  'R-A': { id: 'R-A', nombre: N('Falcon 9'), operador: 'SpaceX', cumpleDEC09: true, capacidad: { luna: V(400, 'A', 'SIM-03') }, precio: J(70), usoNasa: 'Crew and science missions' },
  'R-B': { id: 'R-B', nombre: N('Vulcan Centaur'), operador: 'ULA', cumpleDEC09: true, capacidad: { luna: J(600) }, precio: J(110), usoNasa: 'Planned science missions' },
  'R-C': { id: 'R-C', nombre: N('Small launcher'), operador: 'Test', cumpleDEC09: true, capacidad: { luna: J(250) }, precio: J(20), usoNasa: null },
};
const FASES = [
  { id: 'F1', nombre: N('Launch'), critica: true, pBase: 0.95, mejoras: [] },
  { id: 'F2', nombre: N('Landing'), critica: true, pBase: 0.8, mejoras: [{ por: 'CT-1', dp: 0.1 }] },
  { id: 'F3', nombre: N('Surface operations'), critica: false, pBase: 0.85, mejoras: [] },
];
const MISIONES = {
  'SIM-1': { id: 'SIM-1', escenario: 'orbita', cuerpo: N('Simulated Moon'), nombre: N('SIMULATED MISSION'), jugable: true, nivel: 'media', apertura: N('This is a fake mission to review the screens.'), brief: N('Offline stand-in data. None of it is real.'),
    referencia: { mision: 'Blue Ghost M1', agencia: 'Firefly / NASA CLPS', coheteReal: 'Falcon 9', src: 'SIM-03' },
    destino: 'luna', presupuesto: J(300), horasSombra: 5, horasEnlace: 10, diasPrevistos: 14, limites: {},
    objetivos: [
      { id: 'O1', prioridad: true, nombre: N('Map the surface composition'), valor: 60, requiere: ['CS-1'], usoObjetivo: 8, datoReal: N('Real instruments found water-bearing minerals.'), src: 'SIM-03' },
      { id: 'O2', prioridad: false, nombre: N('Take wide images'), valor: 40, requiere: ['CS-2'], usoObjetivo: 6, datoReal: N('Imagery showed boulder fields.'), src: 'SIM-03' }],
    piezas: Object.keys(PIEZAS), cohetes: Object.keys(COHETES),
    rutas: [
      { id: 'RT-1', nombre: N('Direct transfer'), dias: V(5), masa: J(30), precio: J(5), efecto: { fase: 'F2', dp: -0.05 } },
      { id: 'RT-2', nombre: N('Slow low-energy transfer'), dias: V(90), masa: J(15), precio: J(8), efecto: { fase: 'F2', dp: 0.05 } }],
    fases: FASES, eventosDiseno: ['ED-1', 'ED-2', 'ED-3'], eventosMision: ['EM-1', 'EM-2'], contingencias: ['CT-1', 'CT-2', 'CT-3', 'CT-4'],
    puntuacion: 'oculto', oculto: [{ id: 'H-1', nombre: N('Unexpected ice deposit'), p: 0.5, detecta: ['CS-1'], valor: 20, casoReal: N('Fictional finding.'), src: 'SIM-03' }],
    verificacion: [], fusion3: ['potencia', 'comms'] },
};
// Two other missions per scenario, "coming next".
for (const [esc, pre, cuerpo] of [['orbita', 'SIM-O', 'Simulated Planet'], ['landing', 'SIM-L', 'Simulated Moon'], ['exploracion', 'SIM-E', 'Simulated Comet']]) {
  for (let i = 2; i <= 3; i++) MISIONES[pre + i] = { id: pre + i, escenario: esc, cuerpo: N(cuerpo), nombre: N('NOT PLAYABLE YET ' + i), jugable: false };
}
const EVENTOS_DISENO = {
  'ED-1': { id: 'ED-1', signo: '-', nombre: N('Budget cut'), texto: N('The agency trims your funding.'), efecto: { presupuesto: -20 }, casoReal: N('Fictional case.'), src: 'SIM-03' },
  'ED-2': { id: 'ED-2', signo: '+', nombre: N('Donated instrument time'), texto: N('A partner pays part of the bill.'), efecto: { presupuesto: 15 }, casoReal: N('Fictional case.'), src: 'SIM-03' },
  'ED-3': { id: 'ED-3', signo: '±', nombre: N('New priority'), texto: N('The science board changes its mind.'), efecto: { prioridad: 'O2' }, casoReal: N('Fictional case.'), src: 'SIM-03' },
};
const EVENTOS_MISION = {
  'EM-1': { id: 'EM-1', signo: '-', fase: 'F2', p: 0.4, nombre: N('Dust on landing'), texto: N('Dust blinds the sensors.'), efecto: { falla: true }, mitigadoPor: ['CT-1'], casoReal: N('Fictional case.'), src: 'SIM-03' },
  'EM-2': { id: 'EM-2', signo: '+', fase: 'F3', p: 0.3, nombre: N('Good solar conditions'), texto: N('Extra power for science.'), efecto: { ciencia: 1.1 }, mitigadoPor: [], casoReal: N('Fictional case.'), src: 'SIM-03' },
};
const CONTINGENCIAS = {
  'CT-1': { id: 'CT-1', nombre: N('Backup sensor'), texto: N('A second sensor for landing.'), masa: J(8), precio: J(6), mitiga: ['EM-1'] },
  'CT-2': { id: 'CT-2', nombre: N('Extra shielding'), texto: N('More radiation shielding.'), masa: J(12), precio: J(4), mitiga: [] },
  'CT-3': { id: 'CT-3', nombre: N('Spare computer'), texto: N('Redundant flight computer.'), masa: J(5), precio: J(9), mitiga: [] },
  'CT-4': { id: 'CT-4', nombre: N('Extra fuel'), texto: N('Margin for corrections.'), masa: J(20), precio: J(3), mitiga: [] },
};
const FUENTES = {
  'SIM-01': { titulo: 'Simulated real source', url: 'https://www.nasa.gov/', agencia: 'NASA', conf: 'V' },
  'SIM-02': { titulo: 'Game value (placeholder)', url: '', agencia: '', conf: 'JUEGO' },
  'SIM-03': { titulo: 'Simulated reference document', url: 'https://www.esa.int/', agencia: 'ESA', conf: 'A' },
};
export const DATOS = {
  PIEZAS, COHETES, MISIONES, EVENTOS_DISENO, EVENTOS_MISION, CONTINGENCIAS, FUENTES,
  ESCENARIOS: [{ id: 'orbita', nombre: N('Orbit') }, { id: 'landing', nombre: N('Landing') }, { id: 'exploracion', nombre: N('Exploration') }],
};

// ---------- fake engine (same shapes as reglas/motor.js, much simpler) ----------
const estadoDe = (ratio) => (ratio <= 1 ? 'ok' : ratio <= 1.2 ? 'tolerancia' : 'exceso');
function opDe(D, id, op) { const p = D.PIEZAS[id]; return p?.opciones?.find((o) => o.id === op) ?? p?.opciones?.[0]; }

export function resumen(e, D = DATOS) {
  const m = D.MISIONES[e?.mision?.id];
  const B = { masa: [0, 0], potencia: [0, 0], bateria: [0, 0], datos: [0, 0], presupuesto: [0, 0], volumen: [0, 0] };
  const partes = { masa: [], potencia: [], bateria: [], datos: [], presupuesto: [], volumen: [] };
  const sum = (k, rol, id, v, lim = false) => { B[k][lim ? 1 : 0] += v; if (!lim) partes[k].push({ rol, id, v }); };
  for (const rol of Object.keys(e.porRol ?? {})) {
    for (const [id, mt] of Object.entries(e.porRol[rol]?.piezas ?? {})) {
      const o = opDe(D, id, mt.op); if (!o) continue;
      sum('masa', rol, id, num(o.masa)); sum('volumen', rol, id, num(o.volumen)); sum('presupuesto', rol, id, num(o.precio));
      if (mt.uso > 0) sum('potencia', rol, id, num(o.potencia));
      if (D.PIEZAS[id].enSombra) sum('bateria', rol, id, num(o.potencia) * (m?.horasSombra ?? 0));
      sum('datos', rol, id, num(o.tasa) * mt.uso * 0.45);
      const a = o.aporta ?? {};
      sum('potencia', rol, id, num(a.potencia), true); sum('bateria', rol, id, num(a.bateria), true);
      sum('datos', rol, id, num(a.bajada) * (m?.horasEnlace ?? 0) * 0.45, true); sum('volumen', rol, id, num(a.volumen), true);
    }
  }
  const v = e.porRol?.vuelo ?? {};
  const cohete = D.COHETES[v.cohete]; const ruta = m?.rutas?.find((r) => r.id === v.ruta);
  if (ruta) { sum('masa', 'vuelo', ruta.id, num(ruta.masa)); sum('presupuesto', 'vuelo', ruta.id, num(ruta.precio)); }
  if (cohete) sum('presupuesto', 'vuelo', cohete.id, num(cohete.precio));
  for (const cid of e.porRol?.comms?.contingencias ?? []) { sum('masa', 'comms', cid, num(D.CONTINGENCIAS[cid]?.masa)); sum('presupuesto', 'comms', cid, num(D.CONTINGENCIAS[cid]?.precio)); }
  B.masa[1] = cohete ? num(cohete.capacidad?.[m?.destino]) : (m?.limites?.masa ?? 0);
  let extra = 0; for (const ev of e.diseno?.eventos ?? []) extra += num(D.EVENTOS_DISENO[ev.id]?.efecto?.presupuesto);
  B.presupuesto[1] = num(m?.presupuesto) + extra;
  const barras = {};
  for (const k of Object.keys(B)) { const [u, l] = B[k]; const ratio = l > 0 ? u / l : (u > 0 ? 9 : 0); barras[k] = { usado: u, limite: l, ratio, estado: estadoDe(ratio), partes: partes[k] }; }
  const montadas = Object.values(e.porRol ?? {}).flatMap((r) => Object.entries(r?.piezas ?? {}));
  const objetivos = (m?.objetivos ?? []).map((o) => {
    const q = o.requiere ?? []; if (!q.length) return { id: o.id, prioridad: !!o.prioridad, cobertura: 0 };
    const f = q.reduce((a, pid) => { const mt = montadas.find(([id]) => id === pid)?.[1]; return a + (mt ? Math.min(1, mt.uso / (o.usoObjetivo || 1)) : 0); }, 0) / q.length;
    return { id: o.id, prioridad: !!o.prioridad, cobertura: f };
  });
  const tomadas = e.porRol?.comms?.contingencias ?? [];
  const riesgos = (m?.eventosMision ?? []).map((id) => { const ev = D.EVENTOS_MISION[id]; return { id, fase: ev.fase, p: ev.p, mitigado: (ev.mitigadoPor ?? []).some((c) => tomadas.includes(c)) }; });
  return { barras, ciencia: { objetivos, total: objetivos.reduce((a, o) => a + o.cobertura, 0) / (objetivos.length || 1) }, riesgos };
}
export function cumple(res) {
  const est = Object.entries(res.barras).filter(([, b]) => b.estado !== 'ok');
  const nivel = est.some(([, b]) => b.estado === 'exceso') ? 'fuera' : est.length ? 'tolerancia' : 'dentro';
  return { nivel, barras: est.map(([k]) => k) };
}
export function verificar(e, D = DATOS) {
  const res = resumen(e, D);
  const v = e.porRol?.vuelo ?? {};
  const prio = res.ciencia.objetivos.find((o) => o.prioridad);
  const c = [
    { id: 'bars', ok: cumple(res).nivel === 'dentro', texto: N('All six bars are within their limits') },
    { id: 'rocket', ok: !!(v.cohete && v.ruta), texto: N('A rocket and a route are chosen') },
    { id: 'prio', ok: (prio?.cobertura ?? 0) > 0, texto: N('The priority goal has some coverage') },
    { id: 'pw', ok: res.barras.potencia.limite > 0 && res.barras.datos.limite > 0, texto: N('There is a power source and a downlink') },
  ];
  return { pasa: c.every((x) => x.ok), comprobaciones: c };
}
export function simular(e, D = DATOS) {
  const m = D.MISIONES[e.mision?.id]; const res = resumen(e, D);
  const pasos = m.fases.map((f, i) => {
    const ev = i === 1 ? D.EVENTOS_MISION['EM-1'] : i === 2 ? D.EVENTOS_MISION['EM-2'] : null;
    const mit = !!ev && res.riesgos.find((r) => r.id === ev.id)?.mitigado;
    return { fase: f.id, p: f.pBase, ok: !(ev?.efecto?.falla && !mit), evento: ev ? ev.id : undefined, mitigado: ev ? mit : undefined };
  });
  const okAll = pasos.every((p) => p.ok);
  return {
    pasos, hallazgos: ['H-1'], datos: { generadosMB: 900, bajadosMB: Math.round(Math.min(900, res.barras.datos.limite)) },
    ciencia: res.ciencia.objetivos.map((o) => ({ id: o.id, conseguido: okAll ? o.cobertura : 0 })), puntos: okAll ? 82 : 20,
    veredicto: okAll ? 'total' : 'parcial', causas: pasos.map((p) => ({ en: `${p.fase}: ${p.ok ? 'went as planned' : 'failed (no contingency)'}` })),
  };
}

// ---------- fake session ----------
const DISENO_BASE = {
  vuelo: { piezas: { 'FL-1': { op: 'A', uso: 24 } }, cohete: 'R-A', ruta: 'RT-1' },
  ciencia: { piezas: { 'CS-1': { op: 'A', uso: 8 }, 'CS-2': { op: 'A', uso: 6 } } },
  potencia: { piezas: { 'PW-1': { op: 'A', uso: 24 }, 'PW-2': { op: 'A', uso: 24 } } },
  comms: { piezas: { 'CM-1': { op: 'A', uso: 12 } }, contingencias: [] },
};
const clon = (x) => JSON.parse(JSON.stringify(x));

function preparar(e) {
  const fase = e.fase;
  if (fase === 'briefing') return;
  if (!e.mision?.id) e.mision = { escenario: 'orbita', id: 'SIM-1', dificultad: 'normal', objetivos: ['O1', 'O2'] };
  if (fase === 'restricciones' && e.porRol.vuelo.cohete === 'R-A') e.porRol.vuelo.cohete = 'R-C';
  if (fase === 'verificacion' && Object.keys(e.firmas).length === 0) e.firmas = { vuelo: false, ciencia: false, potencia: false, comms: false };
  if ((fase === 'mision' || fase === 'informe') && !e.resultado) e.resultado = simular(e);
  if (fase === 'mision' && e.vista.paso == null) e.vista.paso = 0;
  if (fase === 'informe') e.vista.paso = (e.resultado?.pasos.length ?? 1) - 1;
}

export function crearSesionSimulada({ jugadorId, nick, params }) {
  const rol = ['vuelo', 'ciencia', 'potencia', 'comms'].includes(params.get('rol')) ? params.get('rol') : 'ciencia';
  const n = Math.max(1, Math.min(4, Number(params.get('jugadores')) || 2));
  const e = {
    fase: params.get('fase') || 'diseno', jugadores: { [jugadorId]: { nick, rol, orden: 1, conectado: true, desconectadoEn: 0, ultimaIntencion: 0 } }, siguienteOrden: 2, semilla: 12345,
    briefing: { objetivos: true, tareas: false, riesgos: false, reparto: null, repartos: 0, listos: {} }, registro: [],
    mision: null, porRol: clon(DISENO_BASE), diseno: { revisiones: 0, eventos: [] }, firmas: {}, resultado: null, vista: { paso: 0 },
  };
  const otros = ['ciencia', 'comms', 'potencia', 'vuelo'].filter((r) => r !== rol).slice(0, n - 1);
  otros.forEach((r, i) => { e.jugadores['bot' + i] = { nick: ['Ana', 'Luis', 'Mara'][i], rol: r, orden: i + 2, conectado: true, desconectadoEn: 0, ultimaIntencion: 0 }; });
  if (e.fase === 'briefing') e.mision = null; else preparar(e);

  const oyentes = {};
  const emitir = (ev, ...a) => (oyentes[ev] || []).forEach((f) => f(...a));
  const yo = () => e.jugadores[jugadorId];
  const montadas = () => e.porRol;

  const acciones = {
    elegirMision(p) {
      const m = e.mision ?? { escenario: null, id: null, dificultad: 'normal' };
      if (p.escenario !== undefined) {
        if (p.escenario !== m.escenario) {
          e.briefing.reparto = Object.values(DATOS.MISIONES).filter((x) => x.escenario === p.escenario).map((x) => x.id).slice(0, 3);
          e.briefing.repartos = (e.briefing.repartos ?? 0) + 1;
        }
        m.escenario = p.escenario; if (DATOS.MISIONES[m.id]?.escenario !== p.escenario) m.id = null;
      }
      if (p.id) { m.id = p.id; m.escenario = DATOS.MISIONES[p.id].escenario; e.porRol = clon(DISENO_BASE); for (const r of Object.keys(e.porRol)) e.porRol[r].piezas = {}; e.porRol.vuelo.cohete = null; e.porRol.vuelo.ruta = null; m.objetivos = (DATOS.MISIONES[p.id].objetivos || []).map((x) => x.id); e.briefing.listos = {}; }
      if (p.dificultad) m.dificultad = p.dificultad;
      e.mision = m;
    },
    cambiarFase(p) { e.fase = p.fase; if (p.fase === 'lobby') { e.mision = null; e.resultado = null; } if (p.fase === 'diseno') { e.firmas = {}; } preparar(e); },
    montar(p) { const r = p.rol ?? yo().rol; e.porRol[r].piezas[p.pieza] = { op: p.op, uso: p.uso }; e.firmas = {}; },
    quitar(p) { delete e.porRol[p.rol ?? yo().rol].piezas[p.pieza]; e.firmas = {}; },
    elegirCohete(p) { e.porRol.vuelo.cohete = p.id; e.firmas = {}; },
    elegirRuta(p) { e.porRol.vuelo.ruta = p.id; e.firmas = {}; },
    contingencia(p) {
      const l = e.porRol.comms.contingencias ??= [];
      if (p.on && l.length >= 3) return 'Maximum 3 contingencies';
      const i = l.indexOf(p.id); if (p.on && i < 0) l.push(p.id); if (!p.on && i >= 0) l.splice(i, 1); e.firmas = {};
    },
    pedirRevision() {
      e.diseno.revisiones++;
      const libres = ['ED-1', 'ED-2', 'ED-3'].filter((id) => !e.diseno.eventos.some((x) => x.id === id));
      const maxEv = { facil: 1, normal: 2, dificil: 3 }[e.mision?.dificultad] ?? 2;
      if (libres.length && e.diseno.eventos.length < maxEv) { e.diseno.eventos.push({ id: libres[0] }); return null; }
      const c = cumple(resumen(e)).nivel;
      if (c === 'fuera') return 'Simulated: some bars are more than 20% over';
      e.fase = c === 'tolerancia' ? 'restricciones' : 'verificacion';
    },
    firmar(p) { e.firmas[p.rol ?? yo().rol] = !!p.on; },
    lanzar() {
      if (!verificar(e).pasa || !['vuelo', 'ciencia', 'potencia', 'comms'].every((r) => e.firmas[r])) return 'Simulated: checks or signatures missing';
      e.resultado = simular(e); e.vista = { paso: 0 }; e.fase = 'mision';
    },
    avanzar() { if (e.vista.paso >= e.resultado.pasos.length - 1) { e.fase = 'informe'; } else e.vista.paso++; },
    elegirRol(p) { yo().rol = p.rol; },
    iniciarMision() { e.fase = 'briefing'; },
    marcarPizarra(p) { e.briefing[p.id] = !e.briefing[p.id]; },
    // Marca o desmarca un objetivo del expediente (el prioritario no se puede quitar); la dificultad sale de los secundarios marcados.
    objetivo(p) {
      const m = DATOS.MISIONES[e.mision?.id];
      if (!m) return 'Choose a mission first';
      const o = (m.objetivos || []).find((x) => x.id === p.id);
      if (!o) return 'Unknown goal for this mission';
      if (o.prioridad && !p.on) return 'The priority goal cannot be dropped';
      const sel = new Set(e.mision.objetivos ?? (m.objetivos || []).map((x) => x.id));
      if (p.on) sel.add(p.id); else sel.delete(p.id);
      e.mision.objetivos = (m.objetivos || []).map((x) => x.id).filter((x) => sel.has(x));
      const extra = (m.objetivos || []).filter((x) => !x.prioridad && sel.has(x.id)).length;
      e.mision.dificultad = extra >= 2 ? 'dificil' : extra === 1 ? 'normal' : 'facil';
      e.briefing.listos = {};
    },
    // Listo para diseñar: cuando todos los conectados con rol lo están, empieza el diseño (los bots se dan por listos).
    listo(p) {
      if (!yo().rol) return 'You need a role';
      if (p.on) {
        const m = DATOS.MISIONES[e.mision?.id];
        if (!m) return 'Choose a mission first';
        if (!m.jugable) return 'That mission is not playable yet';
      }
      e.briefing.listos[jugadorId] = !!p.on;
      if (p.on) for (const id of Object.keys(e.jugadores)) if (id.startsWith('bot')) e.briefing.listos[id] = true;
      const faltan = Object.entries(e.jugadores).filter(([id, j]) => j.conectado && j.rol && !e.briefing.listos[id]);
      if (!faltan.length) { e.fase = 'diseno'; e.briefing.listos = {}; preparar(e); }
    },
    // Sala de control: el departamento dueño activa la contingencia que el paso necesita.
    activarContingencia(p) {
      if (!p.id) return 'That contingency is not needed now';
      const a = Array.isArray(e.vista.activadas) ? e.vista.activadas : [];
      e.vista = { ...e.vista, activadas: [...new Set([...a, p.id])] };
    },
    // Planificación de ruta: día de lanzamiento y sitio.
    planificarRuta(p) {
      if (p.ventana != null && !(Number.isInteger(p.ventana) && p.ventana >= 0 && p.ventana <= 1000)) return 'Unknown launch day';
      if (p.sitio != null && typeof p.sitio !== 'string') return 'Unknown site';
      if (!e.ruta || typeof e.ruta !== 'object') e.ruta = { ventana: null, sitio: null };
      if (p.ventana !== undefined) e.ruta.ventana = p.ventana;
      if (p.sitio !== undefined) e.ruta.sitio = p.sitio;
      e.firmas = {};
    },
  };

  const sesion = {
    get estado() { return e; },
    etiqueta: { host: jugadorId },
    yo,
    on(ev, f) { (oyentes[ev] ||= []).push(f); },
    intentar(tipo, p = {}) {
      const f = acciones[tipo];
      const motivo = f ? f(p) : 'Unknown action: ' + tipo;
      if (motivo) emitir('aviso', motivo);
      setTimeout(() => emitir('estado', e), 0);
    },
    presencia() {}, salir() {},
    _montadas: montadas,
  };

  // Floating review bar: jump to any phase or role.
  const barra = document.createElement('div');
  barra.id = 'barra-simulada';
  barra.append('SIMULATED · phase ');
  const sf = document.createElement('select');
  for (const f of ['briefing', 'diseno', 'restricciones', 'verificacion', 'mision', 'informe']) sf.add(new Option(f, f));
  sf.value = e.fase;
  sf.onchange = () => { e.fase = sf.value; if (e.fase === 'briefing') e.mision = null; if (e.fase === 'diseno') e.firmas = {}; preparar(e); emitir('estado', e); };
  const sr = document.createElement('select');
  for (const r of ['vuelo', 'ciencia', 'potencia', 'comms']) sr.add(new Option(r, r));
  sr.value = rol;
  sr.onchange = () => { yo().rol = sr.value; emitir('estado', e); };
  barra.append(sf, ' role ', sr);
  document.body.append(barra);
  oyentes.estado = [() => { sf.value = e.fase; sr.value = yo().rol; }, ...(oyentes.estado || [])];

  return sesion;
}
