// Pruebas del motor de reglas (src/reglas/*) y de las acciones de juego del protocolo (src/red/protocolo.js).
// Son puras y síncronas: no usan red ni reloj. Se ejecutan desde pruebas/index.html, después de las otras dos suites.
// Todas empiezan por "Reglas ·" (?solo=reglas las ejecuta solas).
//
// DATOS DE PRUEBA: el fixture de abajo es inventado para probar las reglas. No son cifras reales de ninguna
// misión ni de ninguna pieza, y no dependen de src/datos/ (se inyectan con usarDatos y ctx.datos).
import { estadoInicial, reducir, usarDatos, tallerInicial, tallerVacio, FASES, VERSION_PROTOCOLO } from '../src/red/protocolo.js';
import { num, resumen, cumple, verificar, puedeEnRestricciones, motivoRestriccion, estadoDeRatio, relojDe, planDe, siguienteEventoDiseno, msPorMes, riesgoTolerancia } from '../src/reglas/motor.js';
import { simular } from '../src/reglas/despliegue.js';
import { explicarCausas, explicarPuntos } from '../src/reglas/explicar.js';
import { prng, derivar, barajar } from '../src/reglas/azar.js';
import { mesesPlanificables, condicionesDeMes, etiquetaMes } from '../src/control/planificador.js';
import { PLANIFICACION as PLAN_REAL } from '../src/datos/planificacion.js';

const afirmar = (c, msg) => { if (!c) throw new Error(msg); };
const casi = (a, b, msg) => afirmar(Math.abs(a - b) < 1e-6, `${msg}: ${a} ≠ ${b}`);

// ---------- Fixture (DATOS DE PRUEBA, no reales) ----------
const J = (x) => ({ v: null, conf: 'JUEGO', src: 'TEST', juego: x });  // valor [JUEGO]
const V = (x) => ({ v: x, conf: 'INF', src: 'TEST' });                  // valor "real" de prueba
const op = (id, c) => ({ id, nombre: { en: id }, ...c });
const PIEZAS = {
  'T-panel': { id: 'T-panel', rol: 'potencia', uso: null, opciones: [op('A', { masa: V(10), precio: V(5), volumen: V(5), aporta: { potencia: V(100) } }), op('B', { masa: V(20), precio: V(8), volumen: V(5), aporta: { potencia: V(200) } })] },
  'T-bat': { id: 'T-bat', rol: 'potencia', uso: null, opciones: [op('A', { masa: J(5), precio: J(1), aporta: { bateria: J(500) } })] },
  'T-estr': { id: 'T-estr', rol: 'vuelo', uso: null, opciones: [op('A', { masa: V(20), precio: V(2), aporta: { volumen: V(100) } })] },
  'T-lastre': { id: 'T-lastre', rol: 'vuelo', uso: null, opciones: [op('A', { masa: V(120) }), op('B', { masa: V(121) }), op('C', { masa: V(30) }), op('D', { masa: V(60) })] },
  'T-ant': { id: 'T-ant', rol: 'comms', uso: null, opciones: [op('A', { masa: V(4), potencia: V(10), precio: V(2), volumen: V(4), aporta: { bajada: V(10) } })] },
  'T-inst1': { id: 'T-inst1', rol: 'ciencia', enSombra: true, uso: { min: 0, max: 24, def: 8 }, opciones: [op('A', { masa: V(10), potencia: V(20), tasa: V(2), precio: V(10), volumen: V(10) })] },
  'T-inst2': { id: 'T-inst2', rol: 'ciencia', uso: { min: 0, max: 24, def: 8 }, opciones: [op('A', { masa: V(15), potencia: J(30), tasa: J(3), precio: V(10), volumen: V(10) })] },
  'T-otra': { id: 'T-otra', rol: 'ciencia', uso: null, opciones: [op('A', { masa: V(1) })] }, // no es de ninguna misión
};
const COHETES = {
  'T-cs': { id: 'T-cs', nombre: 'Small', cumpleDEC09: true, capacidad: { luna: V(100) }, precio: V(20) },
  'T-cl': { id: 'T-cl', nombre: 'Large', cumpleDEC09: true, capacidad: { luna: V(300) }, precio: V(40) },
  'T-viejo': { id: 'T-viejo', nombre: 'Old', cumpleDEC09: false, capacidad: { luna: V(999) }, precio: V(1) },
};
const CONTINGENCIAS = {
  'T-c1': { id: 'T-c1', nombre: { en: 'Spare thruster' }, masa: V(2), precio: V(3), mitiga: ['EM-1'] },
  'T-c2': { id: 'T-c2', nombre: { en: 'Shielding' }, masa: V(1), precio: V(1), mitiga: [] },
  'T-c3': { id: 'T-c3', nombre: { en: 'Backup radio' }, masa: V(1), precio: V(1), mitiga: [] },
  'T-c4': { id: 'T-c4', nombre: { en: 'Safe mode software' }, masa: V(0), precio: V(1), mitiga: ['EM-falla', 'EM-falla2'] },
};
const EVENTOS_DISENO = {
  'ED-mas': { id: 'ED-mas', signo: '+', nombre: { en: 'Extra funding' }, efecto: { presupuesto: 20 } },
  'ED-menos': { id: 'ED-menos', signo: '-', nombre: { en: 'Budget cut' }, efecto: { presupuesto: -10 } },
  'ED-lim': { id: 'ED-lim', signo: '-', nombre: { en: 'Smaller fairing' }, efecto: { limite: { recurso: 'volumen', factor: 0.9 }, meses: 3 } },
  'ED-prio': { id: 'ED-prio', signo: '±', nombre: { en: 'New priority' }, efecto: { prioridad: 'O2' } },
  'ED-fac': { id: 'ED-fac', signo: '-', nombre: { en: 'Half budget' }, efecto: { limite: { recurso: 'presupuesto', factor: 0.5 } } },
};
// Calendario y planificación de prueba (forma de src/datos/calendario.js y planificacion.js, números inventados).
// Mes del año → puntuación de clima 0..1; el mes absoluto 6 tiene 10 días de conjunción y ΔV × 1,2.
const PUNT = [0, 0.2, 0.4, 0.6, 0.8, 1, 1, 0.8, 0.6, 0.4, 0.2, 0];
const cada60 = (f) => Array.from({ length: 60 }, (_, k) => f(k));
const CALENDARIO = {
  MESES: 60, ANIO0: 2027,
  SITIOS_LANZAMIENTO: { cabo: { id: 'cabo', nombre: { en: 'Test Cape', es: 'Cabo de prueba' },
    lluvia: PUNT.map((x) => 1 + 5 * x), viento50: PUNT.map((x) => 5 + 2 * x), nubes: PUNT.map((x) => 40 + 20 * x), pScrub: PUNT.map((x) => 0.1 + 0.2 * x), puntuacion: PUNT } },
  SITIO_COHETE: { 'T-cl': 'cabo', 'T-cs': 'cabo' },
  ESPACIO: { pKp7: cada60((k) => 0.3 - k * 0.004), pSep: cada60(() => 0.1) },
  DESTINOS: { luna: { elongMin: cada60((k) => (k === 6 ? 1.5 : 30)), diasConj: cada60((k) => (k === 6 ? 10 : 0)), factorDv: cada60((k) => (k === 6 ? 1.2 : 1)) } },
  EFECTOS: { climaDp: 0.04, espacioDp: 0.06, conjDpDia: 0.002, conjDpMax: 0.04, enlaceConj: 0.5, tormentaCiencia: 0.95 },
};
const PLANIFICACION = {
  'T-CAL': { lanzamiento: { mesMax: 30, dvMin: 3, fase: 'F2', faseEspacio: 'F2' },
    sitios: [{ id: 'S1', nombre: { en: 'Site one' }, efectos: { fases: [{ fase: 'F3', dp: -0.02 }], ciencia: {} } }, { id: 'S2', efectos: { fases: [] } }] },
};
const EVENTOS_MISION = {
  'EM-1': { id: 'EM-1', signo: '-', fase: 'F3', p: 0.3, nombre: { en: 'Thruster glitch' }, efecto: { ciencia: 0.8 }, mitigadoPor: ['T-c1'], leccion: { en: 'Carry spares.' } },
  'EM-falla': { id: 'EM-falla', signo: '-', fase: 'F1', p: 1, nombre: { en: 'Launch anomaly' }, efecto: { falla: true, ciencia: 0.01, dias: 0.01 }, mitigadoPor: ['T-c4'] },
  'EM-falla2': { id: 'EM-falla2', signo: '-', fase: 'F3', p: 1, nombre: { en: 'Arrival anomaly' }, efecto: { falla: true }, mitigadoPor: ['T-c4'] },
  'EM-bien': { id: 'EM-bien', signo: '+', fase: 'F4', p: 1, nombre: { en: 'Quiet sun' }, efecto: { ciencia: 1.5 } },
};

function mision(id, escenario, puntuacion, cambios = {}) {
  return {
    id, escenario, puntuacion, jugable: true, nombre: { en: id }, cuerpo: { en: 'Test body' }, destino: 'luna',
    presupuesto: V(100), horasSombra: 2, horasEnlace: 24, diasPrevistos: 10, limites: {},
    objetivos: [
      { id: 'O1', prioridad: true, nombre: { en: 'Priority' }, valor: 60, requiere: ['T-inst1'], usoObjetivo: 8 },
      { id: 'O2', nombre: { en: 'Secondary' }, valor: 40, requiere: ['T-inst2'], usoObjetivo: 8 },
    ],
    piezas: ['T-panel', 'T-bat', 'T-estr', 'T-lastre', 'T-ant', 'T-inst1', 'T-inst2'],
    cohetes: ['T-cs', 'T-cl', 'T-viejo'],
    rutas: [{ id: 'T-r1', nombre: { en: 'Direct' }, dias: 5, masa: V(10), precio: V(5), efecto: { fase: 'F2', dp: 0.05 } }],
    fases: [
      { id: 'F1', nombre: { en: 'Launch' }, critica: true, pBase: 0.95, mejoras: [] },
      { id: 'F2', nombre: { en: 'Cruise' }, critica: false, pBase: 0.9, mejoras: [] },
      { id: 'F3', nombre: { en: 'Arrival' }, critica: true, pBase: 0.9, mejoras: [{ por: 'T-c1', dp: 0.05 }] },
      { id: 'F4', nombre: { en: 'Operations' }, critica: false, pBase: 0.95, mejoras: [{ por: 'T-inst1', dp: 0.01 }] },
    ],
    eventosDiseno: ['ED-mas', 'ED-menos', 'ED-lim', 'ED-prio'],
    eventosMision: ['EM-1'],
    contingencias: ['T-c1', 'T-c2', 'T-c3', 'T-c4'],
    verificacion: [],
    oculto: [],
    ...cambios,
  };
}
function crearFixture() {
  const MISIONES = {
    'T-ORB': mision('T-ORB', 'orbita', 'datos'),
    'T-LND': mision('T-LND', 'landing', 'cadena'),
    'T-EXP': mision('T-EXP', 'exploracion', 'oculto', {
      oculto: [{ id: 'H1', nombre: { en: 'Unexpected gas' }, p: 1, detecta: ['T-inst2'], valor: 25 }],
    }),
    'T-POT': mision('T-POT', 'orbita', 'datos', { limites: { potencia: V(150) } }),
    'T-NOJ': mision('T-NOJ', 'orbita', 'datos', { jugable: false }),
    'T-CAL': mision('T-CAL', 'orbita', 'datos', { reloj: { inicio: 0, plazos: [4, 8, 12] } }), // con reloj y calendario
  };
  return {
    PIEZAS, COHETES, CONTINGENCIAS, EVENTOS_DISENO, EVENTOS_MISION, MISIONES,
    ESCENARIOS: { orbita: { id: 'orbita' }, landing: { id: 'landing' }, exploracion: { id: 'exploracion' } }, FUENTES: {},
    CALENDARIO: JSON.parse(JSON.stringify(CALENDARIO)), PLANIFICACION: JSON.parse(JSON.stringify(PLANIFICACION)),
  };
}
let D = crearFixture();

// ---------- Ayudas ----------
const ROLES = ['vuelo', 'ciencia', 'potencia', 'comms'];
const CTX = () => ({ ahora: 1_000_000, aleatorio: () => 0.5, datos: D });
let idInt = 0;
const hacer = (e, quien, tipo, payload = {}) => reducir(e, quien, { id: ++idInt, tipo, payload }, tipo === 'tic' ? { ...CTX(), reloj: true } : CTX());
function ok(e, quien, tipo, payload) {
  const m = hacer(e, quien, tipo, payload);
  afirmar(m === null, `${tipo} ${JSON.stringify(payload ?? {})} rechazado: ${m}`);
}
function rechaza(e, quien, tipo, payload, patron) {
  const m = hacer(e, quien, tipo, payload);
  afirmar(typeof m === 'string', `${tipo} ${JSON.stringify(payload ?? {})} debería rechazarse`);
  if (patron) afirmar(patron.test(m), `motivo inesperado: ${m}`);
  return m;
}
// Estado en briefing con los roles dados conectados (jugador "j<rol>").
function partida({ roles = ROLES, semilla = 12345 } = {}) {
  const e = estadoInicial();
  e.fase = 'briefing';
  e.semilla = semilla;
  roles.forEach((rol, i) => { e.jugadores['j' + rol] = { nick: rol, rol, orden: i + 1, conectado: true, desconectadoEn: 0, ultimaIntencion: 0 }; });
  e.siguienteOrden = roles.length + 1;
  return e;
}
function enDiseno(misionId = 'T-ORB', dificultad = 'facil', opciones) {
  const e = partida(opciones);
  const quien = Object.keys(e.jugadores)[0];
  ok(e, quien, 'elegirMision', { id: misionId, dificultad });
  todosListos(e);
  return e;
}
// Todos los conectados pulsan "listo": el último lleva la partida a diseño.
function todosListos(e) {
  for (const [id, j] of Object.entries(e.jugadores)) if (j.conectado && j.rol && e.fase === 'briefing') ok(e, id, 'listo', { on: true });
}
// Diseño con todas las barras en verde (masa 76/100, potencia 60/100, presupuesto 58/100…).
function montarBueno(e) {
  const quien = (rol) => (e.jugadores['j' + rol]?.conectado ? 'j' + rol : Object.keys(e.jugadores)[0]);
  const como = (rol) => (quien(rol) === 'j' + rol ? {} : { rol });
  ok(e, quien('potencia'), 'montar', { ...como('potencia'), pieza: 'T-panel', op: 'A' });
  ok(e, quien('potencia'), 'montar', { ...como('potencia'), pieza: 'T-bat' });
  ok(e, quien('vuelo'), 'montar', { ...como('vuelo'), pieza: 'T-estr' });
  ok(e, quien('comms'), 'montar', { ...como('comms'), pieza: 'T-ant' });
  ok(e, quien('ciencia'), 'montar', { ...como('ciencia'), pieza: 'T-inst1', uso: 8 });
  ok(e, quien('ciencia'), 'montar', { ...como('ciencia'), pieza: 'T-inst2', uso: 4 });
  ok(e, quien('vuelo'), 'elegirCohete', { id: 'T-cs' });
  ok(e, quien('vuelo'), 'elegirRuta', { id: 'T-r1' });
  ok(e, quien('comms'), 'contingencia', { id: 'T-c1', on: true });
  return e;
}
// Un tic del reloj en tiempo real (lo manda el anfitrión; aquí con ctx.reloj). Devuelve el id del evento que salió, o null.
function ticar(e) {
  const antes = e.diseno.eventos.length;
  ok(e, Object.keys(e.jugadores)[0], 'tic', { mes: e.reloj.mes });
  return e.diseno.eventos.length > antes ? e.diseno.eventos[antes].id : null;
}
function rechazaTicRepetido(e) { rechaza(e, Object.keys(e.jugadores)[0], 'tic', { mes: e.reloj.mes - 1 }, /already advanced/); }
// Deja pasar meses hasta agotar los eventos de diseño de la misión y pide una revisión (que evalúa). Devuelve cuántos eventos salieron.
function agotarEventos(e, quien = 'jvuelo') {
  let n = 0;
  for (let k = 0; k < 60 && e.fase === 'diseno' && siguienteEventoDiseno(e, D) !== null; k++) if (ticar(e)) n++;
  if (e.fase === 'diseno') ok(e, quien, 'pedirRevision', {});
  return n;
}
function firmarTodo(e) { for (const r of ROLES) ok(e, 'j' + r, 'firmar', { on: true }); }
// Estado mínimo para simular directamente (sin pasar por el protocolo).
function estadoVuelo(misionId, { semilla = 7, piezas = {}, cohete = 'T-cl', ruta = 'T-r1', contingencias = [] } = {}) {
  const e = estadoInicial();
  e.semilla = semilla;
  e.mision = { escenario: D.MISIONES[misionId].escenario, id: misionId, dificultad: 'facil' };
  e.porRol.potencia.piezas = { 'T-panel': { op: 'B', uso: null }, 'T-bat': { op: 'A', uso: null } };
  e.porRol.vuelo.piezas = { 'T-estr': { op: 'A', uso: null } };
  e.porRol.comms.piezas = { 'T-ant': { op: 'A', uso: null } };
  e.porRol.ciencia.piezas = { 'T-inst1': { op: 'A', uso: 8 }, 'T-inst2': { op: 'A', uso: 8 }, ...piezas };
  e.porRol.vuelo.cohete = cohete;
  e.porRol.vuelo.ruta = ruta;
  e.porRol.comms.contingencias = contingencias;
  return e;
}
// Cambia campos de una misión del fixture solo durante f().
function conMision(id, cambios, f) {
  const previa = D.MISIONES[id];
  D.MISIONES[id] = { ...previa, ...cambios };
  try { return f(); } finally { D.MISIONES[id] = previa; }
}

// ---------- Pruebas ----------
const pruebas = {
  'Reglas · azar: mulberry32 determinista y barajado sin repetir'() {
    const a = prng(42), b = prng(42), c = prng(43);
    const sa = [a(), a(), a()], sb = [b(), b(), b()];
    afirmar(JSON.stringify(sa) === JSON.stringify(sb), 'misma semilla, distinta secuencia');
    afirmar(sa.every((x) => x >= 0 && x < 1), 'fuera de [0,1)');
    afirmar(c() !== sa[0], 'semillas distintas dan lo mismo');
    afirmar(derivar(1, 'x') !== derivar(1, 'y'), 'derivar no separa etiquetas');
    const lista = ['a', 'b', 'c', 'd', 'e'];
    const m = barajar(prng(9), lista);
    afirmar(m.length === 5 && new Set(m).size === 5 && lista.join('') === 'abcde', 'barajar pierde o repite, o toca el original');
  },

  'Reglas · num: v, luego juego, luego 0'() {
    afirmar(num(V(3)) === 3 && num(J(4)) === 4 && num({ v: null }) === 0 && num(null) === 0 && num(7) === 7 && num(NaN) === 0, 'num');
    afirmar(num({ v: 0, juego: 9 }) === 0, 'un 0 real no se sustituye por el de juego');
  },

  'Reglas · DEC-10: límite 100 → 120 es tolerancia, 121 es exceso'() {
    afirmar(estadoDeRatio(100 / 100) === 'ok' && estadoDeRatio(120 / 100) === 'tolerancia' && estadoDeRatio(121 / 100) === 'exceso', 'umbrales');
    const e = enDiseno();
    ok(e, 'jvuelo', 'elegirCohete', { id: 'T-cs' });
    ok(e, 'jvuelo', 'montar', { pieza: 'T-lastre', op: 'A' });
    let b = resumen(e, D).barras.masa;
    afirmar(b.usado === 120 && b.limite === 100 && b.estado === 'tolerancia', `120/100 → ${b.estado}`);
    ok(e, 'jvuelo', 'montar', { pieza: 'T-lastre', op: 'B' });
    b = resumen(e, D).barras.masa;
    afirmar(b.usado === 121 && b.estado === 'exceso', `121/100 → ${b.estado}`);
    afirmar(cumple(resumen(e, D)).nivel === 'fuera' && cumple(resumen(e, D)).barras.includes('masa'), 'cumple no ve el exceso');
  },

  'Reglas · el límite es el menor entre aporte de piezas y tope de la misión'() {
    const e = enDiseno('T-POT'); // tope de potencia 150
    ok(e, 'jpotencia', 'montar', { pieza: 'T-panel', op: 'B' }); // aporta 200
    afirmar(resumen(e, D).barras.potencia.limite === 150, 'con aporte 200 y tope 150 tendría que ser 150');
    ok(e, 'jpotencia', 'montar', { pieza: 'T-panel', op: 'A' }); // aporta 100
    afirmar(resumen(e, D).barras.potencia.limite === 100, 'con aporte 100 y tope 150 tendría que ser 100');
    ok(e, 'jpotencia', 'quitar', { pieza: 'T-panel' });
    afirmar(resumen(e, D).barras.potencia.limite === 150, 'sin aporte vale el tope');
    const e2 = enDiseno('T-ORB');
    ok(e2, 'jciencia', 'montar', { pieza: 'T-inst1' });
    const p = resumen(e2, D).barras.potencia;
    afirmar(p.limite === 0 && p.estado === 'exceso', 'sin aporte ni tope, cualquier consumo es exceso');
    afirmar(resumen(e2, D).barras.masa.limite === 0, 'sin cohete ni tope de masa, límite 0');
  },

  'Reglas · las seis barras suman lo que deben'() {
    const e = montarBueno(enDiseno());
    const b = resumen(e, D).barras;
    const esperado = {
      masa: [76, 100], potencia: [60, 100], bateria: [40, 500], datos: [12.6, 108], presupuesto: [58, 100], volumen: [29, 100],
    };
    for (const [id, [u, l]] of Object.entries(esperado)) {
      casi(b[id].usado, u, `${id} usado`);
      casi(b[id].limite, l, `${id} límite`);
      afirmar(b[id].estado === 'ok', `${id} no está ok`);
      casi(b[id].partes.reduce((s, x) => s + x.v, 0), u, `${id}: las partes no suman el usado`);
    }
    afirmar(b.masa.partes.some((x) => x.id === 'T-r1') && b.presupuesto.partes.some((x) => x.id === 'T-cs'), 'faltan ruta o cohete en partes');
    ok(e, 'jciencia', 'montar', { pieza: 'T-inst1', uso: 0 });
    const b2 = resumen(e, D).barras;
    casi(b2.potencia.usado, 40, 'una pieza con uso 0 no consume potencia');
    casi(b2.bateria.usado, 0, 'ni batería');
    const c = resumen(e, D).ciencia;
    afirmar(c.objetivos.find((o) => o.id === 'O1').cobertura === 0, 'cobertura con uso 0');
    casi(c.objetivos.find((o) => o.id === 'O2').cobertura, 0.5, 'cobertura O2 = 1 × min(1, 4/8)');
  },

  'Reglas · eventos de diseño: en tiempo real, 1/2/3 según dificultad, una vez cada uno, nunca por una revisión'() {
    for (const [dificultad, n] of [['facil', 1], ['normal', 2], ['dificil', 3]]) {
      const e = montarBueno(enDiseno('T-ORB', dificultad));
      const vistos = [];
      // Una revisión no saca eventos ni suma meses.
      ok(e, 'jciencia', 'pedirRevision', {});
      afirmar(e.diseno.eventos.length === 0 && e.reloj.mes === 0 && e.fase === 'verificacion', `${dificultad}: la revisión no debe sacar eventos ni sumar meses`);
      ok(e, 'jciencia', 'cambiarFase', { fase: 'diseno' });
      for (let k = 0, t = 0; k < n; k++) {
        while (e.diseno.eventos.length === k && t++ < 40) ticar(e);
        afirmar(e.diseno.eventos.length === k + 1 && e.diseno.ultima.tipo === 'evento' && e.diseno.ultima.id === e.diseno.eventos[k].id && e.diseno.ultima.mes >= 1, `${dificultad}: no salió el evento ${k + 1}`);
        vistos.push(e.diseno.eventos[k].id);
      }
      afirmar(new Set(vistos).size === n, `${dificultad}: evento repetido ${vistos}`);
      for (let t = 0; t < 30 && e.fase === 'diseno'; t++) ticar(e);
      afirmar(e.diseno.eventos.length === n, `${dificultad}: salió un evento de más`);
      ok(e, 'jciencia', 'pedirRevision', {});
      afirmar(e.diseno.eventos.length === n && e.diseno.ultima.tipo === 'revision', `${dificultad}: salió un evento de más`);
      afirmar(e.fase === 'verificacion', `${dificultad}: un diseño bueno tendría que ir a verificación (${e.fase})`);
      // Mismo orden con la misma semilla.
      const e2 = montarBueno(enDiseno('T-ORB', dificultad));
      agotarEventos(e2);
      afirmar(JSON.stringify(e2.diseno.eventos) === JSON.stringify(e.diseno.eventos), 'los eventos no salen de la semilla');
    }
    // Efectos derivados de la lista, no guardados: presupuesto y prioridad.
    const e = montarBueno(enDiseno('T-ORB', 'dificil'));
    e.diseno.eventos = [{ id: 'ED-mas' }, { id: 'ED-menos' }, { id: 'ED-prio' }];
    const r = resumen(e, D);
    afirmar(r.barras.presupuesto.limite === 110, `presupuesto 100 + 20 − 10 = ${r.barras.presupuesto.limite}`);
    afirmar(r.ciencia.objetivos.find((o) => o.prioridad).id === 'O2', 'ED-prio no cambió el prioritario');
    e.diseno.eventos = [{ id: 'ED-lim' }];
    casi(resumen(e, D).barras.volumen.limite, 90, 'ED-lim: volumen × 0,9');
    // Misión con menos eventos que la dificultad: salen los que hay y luego se evalúa.
    conMision('T-ORB', { eventosDiseno: ['ED-mas'] }, () => {
      const e3 = montarBueno(enDiseno('T-ORB', 'dificil'));
      afirmar(agotarEventos(e3) === 1 && e3.fase === 'verificacion', 'con un solo evento disponible');
    });
  },

  'Reglas · la revisión lleva a diseño, restricciones o verificación'() {
    const mk = () => { const e = montarBueno(enDiseno()); agotarEventos(e); return e; };
    // Exceso → se queda en diseño con la lista.
    let e = montarBueno(enDiseno());
    ok(e, 'jvuelo', 'montar', { pieza: 'T-lastre', op: 'D' }); // masa 136/100
    agotarEventos(e);
    afirmar(e.fase === 'diseno' && e.diseno.ultima.nivel === 'fuera' && e.diseno.ultima.barras.includes('masa'), `exceso → ${e.fase}`);
    // Tolerancia → verificación (ya no obliga a recortar; solo sube el riesgo de una fase).
    e = montarBueno(enDiseno());
    ok(e, 'jvuelo', 'montar', { pieza: 'T-lastre', op: 'C' }); // masa 106/100
    agotarEventos(e);
    afirmar(e.fase === 'verificacion' && e.diseno.ultima.nivel === 'tolerancia' && verificar(e, D).pasa, `tolerancia → ${e.fase}`);
    const rt = riesgoTolerancia(e, D);
    afirmar(rt.length === 1 && rt[0].barra === 'masa' && rt[0].fase === 'F1' && Math.abs(rt[0].dp - 0.03) < 1e-9, `riesgo: ${JSON.stringify(rt)}`);
    const f1 = resumen(e, D).fases[0];
    afirmar(f1.desglose.some((x) => x.fuente === 'tolerancia' && x.ref === 'masa' && Math.abs(x.dp + 0.03) < 1e-9), 'la fase de lanzamiento resta 3 pp');
    // Todo ok → verificación.
    e = mk();
    afirmar(e.fase === 'verificacion' && e.diseno.ultima.nivel === 'dentro', `ok → ${e.fase}`);
    // cambiarFase no se salta la revisión, el lanzamiento ni el avance.
    e = montarBueno(enDiseno());
    rechaza(e, 'jvuelo', 'cambiarFase', { fase: 'verificacion' }, /review/i);
    rechaza(e, 'jvuelo', 'cambiarFase', { fase: 'restricciones' });
    afirmar(/host clock/.test(reducir(e, 'jvuelo', { id: ++idInt, tipo: 'tic', payload: { mes: 0 } }, CTX())), 'un cliente no puede mover el reloj'); // sin ctx.reloj
    ticar(e); rechazaTicRepetido(e);
    e = mk();
    rechaza(e, 'jvuelo', 'cambiarFase', { fase: 'mision' }, /launch/i);
    // Doble clic: la revisión con número viejo se rechaza.
    e = montarBueno(enDiseno());
    ok(e, 'jvuelo', 'montar', { pieza: 'T-lastre', op: 'D' }); // fuera de límites: la revisión se queda en diseño
    const n = e.diseno.revisiones;
    ok(e, 'jvuelo', 'pedirRevision', { revision: n });
    rechaza(e, 'jciencia', 'pedirRevision', { revision: n }, /already/i);
  },

  'Reglas · MEC-12: en restricciones se quita o se baja, no se añade'() {
    const e = montarBueno(enDiseno());
    ok(e, 'jvuelo', 'montar', { pieza: 'T-lastre', op: 'C' });
    agotarEventos(e);
    e.fase = 'restricciones'; // ya no se llega por una revisión en tolerancia: la fase sigue existiendo (partidas antiguas)
    rechaza(e, 'jvuelo', 'montar', { pieza: 'T-lastre', op: 'D' }, /raise|over/i);       // sube masa
    rechaza(e, 'jpotencia', 'montar', { pieza: 'T-panel', op: 'B' });                    // panel B pesa más
    rechaza(e, 'jcomms', 'contingencia', { id: 'T-c2', on: true }, /cannot buy/i);
    rechaza(e, 'jciencia', 'montar', { pieza: 'T-inst2', uso: 6 }, /lower/i);           // subir uso
    ok(e, 'jciencia', 'montar', { pieza: 'T-inst2', uso: 2 });                           // bajar uso
    ok(e, 'jcomms', 'contingencia', { id: 'T-c1', on: false });                          // quitar contingencia
    afirmar(!puedeEnRestricciones(e, { tipo: 'montar', rol: 'ciencia', pieza: 'T-otra', op: 'A' }, D), 'añadir pieza nueva');
    afirmar(motivoRestriccion(e, { tipo: 'quitar', rol: 'vuelo', pieza: 'T-lastre' }, D) === null, 'quitar tendría que valer');
    rechaza(e, 'jvuelo', 'montar', { pieza: 'T-inst1' }); // de otro rol, de paso
    rechaza(e, 'jpotencia', 'quitar', { pieza: 'T-panel' }, /Power/); // sin panel la potencia se dispara
    ok(e, 'jvuelo', 'quitar', { pieza: 'T-lastre' });
    ok(e, 'jvuelo', 'pedirRevision', {});
    afirmar(e.fase === 'verificacion', `todo ok tras recortar → ${e.fase}`);
  },

  'Reglas · firmas: hacen falta las cuatro y editar las borra'() {
    const e = montarBueno(enDiseno());
    agotarEventos(e);
    afirmar(e.fase === 'verificacion' && verificar(e, D).pasa, 'preparación: verificación que pasa');
    rechaza(e, 'jvuelo', 'lanzar', {}, /signatures/i);
    for (const r of ['vuelo', 'ciencia', 'potencia']) ok(e, 'j' + r, 'firmar', { on: true });
    const m = rechaza(e, 'jvuelo', 'lanzar', {}, /signatures/i);
    afirmar(/Comms/.test(m) && !/Flight/.test(m), `motivo: ${m}`);
    rechaza(e, 'jvuelo', 'firmar', { rol: 'comms', on: true }, /player/); // comms tiene dueño conectado
    ok(e, 'jcomms', 'firmar', { on: true });
    afirmar(ROLES.every((r) => e.firmas[r]), 'faltan firmas');
    ok(e, 'jvuelo', 'cambiarFase', { fase: 'diseno' });
    ok(e, 'jciencia', 'montar', { pieza: 'T-inst2', uso: 5 });
    afirmar(ROLES.every((r) => !e.firmas[r]), 'editar no borró las firmas');
    agotarEventos(e);
    firmarTodo(e);
    ok(e, 'jvuelo', 'lanzar', {});
    afirmar(e.fase === 'mision' && e.resultado && e.vista.paso === 0, 'no se lanzó');
    // Con una comprobación fallando no se firma ni se lanza.
    const e2 = montarBueno(enDiseno());
    agotarEventos(e2);
    e2.porRol.vuelo.ruta = null; // a mano, para probar la comprobación
    afirmar(!verificar(e2, D).pasa && verificar(e2, D).comprobaciones.find((c) => c.id === 'ruta').ok === false, 'falta la ruta');
    rechaza(e2, 'jvuelo', 'firmar', { on: true }, /checks/i);
  },

  'Reglas · rol vacante: cualquiera lo edita y lo firma (MEC-03)'() {
    const e = enDiseno('T-ORB', 'facil', { roles: ['vuelo', 'ciencia'] });
    ok(e, 'jciencia', 'montar', { rol: 'potencia', pieza: 'T-panel', op: 'A' });
    ok(e, 'jciencia', 'montar', { rol: 'potencia', pieza: 'T-bat' });
    ok(e, 'jvuelo', 'montar', { rol: 'comms', pieza: 'T-ant' });
    ok(e, 'jvuelo', 'contingencia', { id: 'T-c1', on: true });
    rechaza(e, 'jciencia', 'montar', { rol: 'vuelo', pieza: 'T-estr' }, /Flight/);
    rechaza(e, 'jciencia', 'elegirCohete', { id: 'T-cs' }, /Flight/);
    rechaza(e, 'jciencia', 'montar', { rol: 'potencia', pieza: 'T-inst1' }, /belongs/);
    afirmar(e.porRol.potencia.piezas['T-panel'] && e.porRol.comms.contingencias.includes('T-c1'), 'no se escribió en el rol vacante');
    // Un dueño desconectado deja el rol vacante.
    e.jugadores.jvuelo.conectado = false;
    ok(e, 'jciencia', 'montar', { rol: 'vuelo', pieza: 'T-estr' });
    ok(e, 'jciencia', 'elegirCohete', { id: 'T-cs' });
    ok(e, 'jciencia', 'elegirRuta', { id: 'T-r1' });
    ok(e, 'jciencia', 'montar', { pieza: 'T-inst1', uso: 8 });
    ok(e, 'jciencia', 'montar', { pieza: 'T-inst2', uso: 4 });
    agotarEventos2(e, 'jciencia');
    afirmar(e.fase === 'verificacion', `→ ${e.fase}`);
    for (const r of ROLES) ok(e, 'jciencia', 'firmar', { rol: r === 'ciencia' ? undefined : r, on: true });
    ok(e, 'jciencia', 'lanzar', {});
    afirmar(e.fase === 'mision', 'no se lanzó con dos jugadores');
  },

  'Reglas · validación de montar, cohete, ruta y contingencias'() {
    const e = enDiseno();
    rechaza(e, 'jciencia', 'montar', { pieza: 'nope' }, /Unknown part/);
    rechaza(e, 'jciencia', 'montar', { pieza: 'T-otra' }, /not available/);
    rechaza(e, 'jciencia', 'montar', { pieza: 'T-inst1', op: 'Z' }, /option/);
    rechaza(e, 'jciencia', 'montar', { pieza: 'T-inst1', uso: 25 }, /between/);
    rechaza(e, 'jvuelo', 'elegirCohete', { id: 'T-viejo' }, /DEC-09/);
    rechaza(e, 'jvuelo', 'elegirCohete', { id: 'nope' });
    rechaza(e, 'jvuelo', 'elegirRuta', { id: 'nope' });
    rechaza(e, 'jcomms', 'contingencia', { id: 'nope', on: true });
    for (const c of ['T-c1', 'T-c2', 'T-c3']) ok(e, 'jcomms', 'contingencia', { id: c, on: true });
    rechaza(e, 'jcomms', 'contingencia', { id: 'T-c4', on: true }, /at most 3/);
    ok(e, 'jcomms', 'contingencia', { id: 'T-c1', on: true }); // ya comprada: no cuenta doble
    afirmar(e.porRol.comms.contingencias.length === 3, 'contingencia duplicada');
    ok(e, 'jciencia', 'montar', { pieza: 'T-inst1' });
    afirmar(e.porRol.ciencia.piezas['T-inst1'].uso === 8 && e.porRol.ciencia.piezas['T-inst1'].op === 'A', 'opción y uso por defecto');
    const guardado = JSON.stringify(e.porRol);
    afirmar(!/usado|limite|ratio/.test(guardado), 'se guardaron totales en el estado');
    rechaza(e, 'jciencia', 'editarPropio', { clave: 'piezas', valor: {} }, /Reserved/);
    ok(e, 'jciencia', 'editarPropio', { clave: 'nota', valor: 'hola' });
    afirmar(e.porRol.ciencia.nota === 'hola' && e.porRol.ciencia.piezas['T-inst1'], 'las notas libres conviven con las piezas');
  },

  'Reglas · briefing: elegir misión, jugable y vaciar talleres'() {
    const e = partida();
    rechaza(e, 'jvuelo', 'cambiarFase', { fase: 'diseno' }, /mission/i);
    rechaza(e, 'jvuelo', 'elegirMision', { escenario: 'marte' }, /scenario/);
    rechaza(e, 'jvuelo', 'elegirMision', { escenario: 'landing', id: 'T-ORB' }, /another scenario/);
    rechaza(e, 'jvuelo', 'elegirMision', { id: 'T-ORB', dificultad: 'imposible' }, /difficulty/);
    ok(e, 'jvuelo', 'elegirMision', { escenario: 'orbita' });
    afirmar(e.mision.escenario === 'orbita' && e.mision.id === null && e.mision.dificultad === 'normal', JSON.stringify(e.mision));
    ok(e, 'jvuelo', 'elegirMision', { id: 'T-NOJ' });
    rechaza(e, 'jvuelo', 'cambiarFase', { fase: 'diseno' }, /playable/);
    ok(e, 'jvuelo', 'elegirMision', { id: 'T-ORB', dificultad: 'dificil' });
    e.porRol.ciencia.piezas['T-inst1'] = { op: 'A', uso: 8 }; // como si viniera de antes
    e.porRol.ciencia.nota = 'x';
    ok(e, 'jvuelo', 'elegirMision', { dificultad: 'facil' });
    afirmar(e.porRol.ciencia.piezas['T-inst1'], 'cambiar solo la dificultad no vacía los talleres');
    ok(e, 'jvuelo', 'elegirMision', { escenario: 'landing', id: 'T-LND' });
    afirmar(Object.keys(e.porRol.ciencia.piezas).length === 0 && e.porRol.ciencia.nota === 'x', 'cambiar de misión vacía las piezas y conserva notas');
    rechaza(e, 'jvuelo', 'cambiarFase', { fase: 'diseno' }, /Ready/);
    todosListos(e);
    afirmar(e.fase === 'diseno', 'no pasó a diseño');
  },

  'Reglas · briefing: reparto de carpetas con la semilla, jugable incluida'() {
    const e = partida({ semilla: 4242 });
    for (let i = 0; i < 6; i++) D.MISIONES['T-X' + i] = { ...D.MISIONES['T-NOJ'], id: 'T-X' + i };
    ok(e, 'jvuelo', 'elegirMision', { escenario: 'orbita' });
    const r1 = e.briefing.reparto;
    afirmar(Array.isArray(r1) && r1.length === 3 && new Set(r1).size === 3, `reparto: ${JSON.stringify(r1)}`);
    afirmar(r1.includes('T-ORB') && r1.every((id) => D.MISIONES[id].escenario === 'orbita'), 'falta la jugable o hay de otro escenario');
    const e2 = partida({ semilla: 4242 });
    ok(e2, 'jciencia', 'elegirMision', { escenario: 'orbita' });
    afirmar(JSON.stringify(e2.briefing.reparto) === JSON.stringify(r1), 'misma semilla, distinto reparto');
    ok(e, 'jvuelo', 'elegirMision', { escenario: 'orbita' });
    afirmar(e.briefing.repartos === 1, 'repetir el mismo escenario no reparte otra vez');
    ok(e, 'jvuelo', 'elegirMision', { escenario: 'landing' });
    afirmar(e.briefing.repartos === 2 && e.briefing.reparto.includes('T-LND'), 'otro escenario reparte');
  },

  'Reglas · expediente: objetivos marcados, prioridad fija y dificultad por ambición'() {
    const e = partida();
    rechaza(e, 'jvuelo', 'objetivo', { id: 'x', on: true }, /mission/i);
    ok(e, 'jvuelo', 'elegirMision', { id: 'T-ORB' });
    const ids = D.MISIONES['T-ORB'].objetivos.map((o) => o.id);
    afirmar(JSON.stringify(e.mision.objetivos) === JSON.stringify(ids), 'al elegir vienen todos marcados');
    const prio = D.MISIONES['T-ORB'].objetivos.find((o) => o.prioridad);
    const otros = D.MISIONES['T-ORB'].objetivos.filter((o) => !o.prioridad);
    rechaza(e, 'jciencia', 'objetivo', { id: prio.id, on: false }, /priority/);
    for (const o of otros) ok(e, 'jciencia', 'objetivo', { id: o.id, on: false });
    afirmar(e.mision.objetivos.join() === prio.id && e.mision.dificultad === 'facil', `solo prioritario: ${JSON.stringify(e.mision)}`);
    const res = resumen(e, D);
    afirmar(res.ciencia.objetivos.length === 1 && res.ciencia.objetivos[0].id === prio.id, 'el resumen cuenta objetivos no marcados');
    if (otros.length) { ok(e, 'jciencia', 'objetivo', { id: otros[0].id, on: true }); afirmar(e.mision.dificultad === 'normal', 'un secundario: normal'); }
  },

  'Reglas · listo: todos los conectados, y cambiar el expediente lo anula'() {
    const e = partida();
    rechaza(e, 'jvuelo', 'listo', { on: true }, /mission/i);
    ok(e, 'jvuelo', 'elegirMision', { id: 'T-NOJ' });
    rechaza(e, 'jvuelo', 'listo', { on: true }, /playable/);
    ok(e, 'jvuelo', 'elegirMision', { id: 'T-ORB' });
    for (const r of ['vuelo', 'ciencia', 'potencia']) ok(e, 'j' + r, 'listo', { on: true });
    afirmar(e.fase === 'briefing', 'empezó sin el cuarto');
    const otro = D.MISIONES['T-ORB'].objetivos.find((o) => !o.prioridad);
    if (otro) { ok(e, 'jcomms', 'objetivo', { id: otro.id, on: false }); afirmar(!Object.values(e.briefing.listos).some(Boolean), 'cambiar el expediente no anuló los listos'); }
    e.jugadores.jcomms.conectado = false; // un desconectado no bloquea
    for (const r of ['vuelo', 'ciencia', 'potencia']) ok(e, 'j' + r, 'listo', { on: true });
    afirmar(e.fase === 'diseno', `no pasó a diseño: ${e.fase}`);
  },

  'Reglas · contingencias por departamento y activación en la sala de control'() {
    const e = montarBueno(enDiseno());
    D.CONTINGENCIAS['T-c1'].rol = 'vuelo'; // el fixture es compartido: se restaura al final
    try {
      rechaza(e, 'jcomms', 'contingencia', { id: 'T-c1', on: false }, /Flight/);
      ok(e, 'jvuelo', 'contingencia', { id: 'T-c1', on: false });
      ok(e, 'jvuelo', 'contingencia', { id: 'T-c1', on: true });
      afirmar(e.porRol.comms.contingencias.includes('T-c1'), 'se guarda donde siempre');
    } finally { delete D.CONTINGENCIAS['T-c1'].rol; }
    // Vuelo con un paso mitigado: hay que activarla antes de avanzar.
    const v = estadoVuelo('T-ORB', { contingencias: ['T-c4'] });
    Object.assign(v.jugadores, partida().jugadores);
    v.resultado = conMision('T-ORB', { eventosMision: ['EM-falla'] }, () => simular(v, D)); // EM-falla sale seguro en F1
    v.fase = 'mision'; v.vista = { paso: 0, activadas: [] };
    afirmar(v.resultado.pasos[0].mitigador === 'T-c4', `paso 0: ${JSON.stringify(v.resultado.pasos[0])}`);
    rechaza(v, 'jvuelo', 'avanzar', { paso: 0 }, /Activate/);
    rechaza(v, 'jvuelo', 'activarContingencia', { id: 'T-c1' }, /not needed/);
    rechaza(v, 'jvuelo', 'activarContingencia', { id: 'T-c4' }, /Comms/); // T-c4 sin rol: comms
    ok(v, 'jcomms', 'activarContingencia', { id: 'T-c4' });
    ok(v, 'jvuelo', 'avanzar', { paso: 0 });
    afirmar(v.vista.paso === 1 && v.vista.activadas.includes('T-c4'), 'no avanzó tras activar');
  },

  'Reglas · simular es determinista con la semilla'() {
    const e = estadoVuelo('T-ORB', { semilla: 99 });
    const a = JSON.stringify(simular(e, D)), b = JSON.stringify(simular(JSON.parse(JSON.stringify(e)), D));
    afirmar(a === b, 'mismo estado, distinto resultado');
    afirmar(!/null|Infinity|NaN/.test(JSON.stringify(simular(e, D).datos)), 'números no finitos en el resultado');
    const distintos = new Set();
    for (let s = 0; s < 200; s++) distintos.add(JSON.stringify(simular(estadoVuelo('T-ORB', { semilla: s }), D).pasos.map((p) => [p.ok, p.evento])));
    afirmar(distintos.size > 1, 'todas las semillas dan el mismo vuelo');
    const r = simular(e, D);
    afirmar(r.pasos.length === 4 && r.pasos.every((p) => typeof p.p === 'number' && 'ok' in p), 'forma de pasos');
    afirmar(['total', 'parcial', 'fallida'].includes(r.veredicto) && Array.isArray(r.causas) && r.causas.every((c) => typeof c.en === 'string'), 'forma de veredicto y causas');
  },

  'Reglas · G-12: un solo negativo sin mitigar nunca da fallida; dos críticos, sí'() {
    const fasesSeguras = D.MISIONES['T-ORB'].fases.map((f) => ({ ...f, pBase: 1 }));
    for (const id of ['T-ORB', 'T-LND', 'T-EXP']) {
      // Un evento negativo con falla en fase crítica, siempre, sin mitigar.
      conMision(id, { fases: fasesSeguras, eventosMision: ['EM-falla'] }, () => {
        for (let s = 0; s < 300; s++) {
          const r = simular(estadoVuelo(id, { semilla: s }), D);
          afirmar(r.veredicto !== 'fallida', `${id} semilla ${s}: un solo evento dio fallida`);
          afirmar(r.golpes === 1 && r.pasos[0].evento === 'EM-falla' && r.pasos[0].mitigado === false, `${id}: el evento no salió`);
        }
        const r = simular(estadoVuelo(id, { contingencias: ['T-c4'] }), D);
        afirmar(r.pasos[0].mitigado === true && r.golpes === 0, `${id}: la contingencia no mitigó`);
        afirmar(r.causas.some((c) => /Safe mode software/.test(c.en)), 'la causa no nombra la contingencia');
      });
      // Una fase crítica que siempre falla, sin eventos.
      conMision(id, { fases: fasesSeguras.map((f) => (f.id === 'F3' ? { ...f, pBase: 0 } : f)), eventosMision: [] }, () => {
        for (let s = 0; s < 300; s++) afirmar(simular(estadoVuelo(id, { semilla: s }), D).veredicto !== 'fallida', `${id} semilla ${s}: un fallo de fase dio fallida`);
      });
      // Dos sin mitigar en fases críticas: la nave se pierde.
      conMision(id, { fases: fasesSeguras, eventosMision: ['EM-falla', 'EM-falla2'] }, () => {
        for (let s = 0; s < 50; s++) {
          const r = simular(estadoVuelo(id, { semilla: s }), D);
          afirmar(r.veredicto === 'fallida' && r.perdida, `${id} semilla ${s}: dos golpes críticos no destruyen`);
          afirmar(r.pasos[3].omitida === true, 'las fases tras la pérdida no se marcan como omitidas');
        }
      });
    }
  },

  "Reglas · puntuación 'datos': lo que no cabe en el enlace se pierde"() {
    const fasesSeguras = D.MISIONES['T-ORB'].fases.map((f) => ({ ...f, pBase: 1 }));
    conMision('T-ORB', { fases: fasesSeguras, eventosMision: [] }, () => {
      const e = estadoVuelo('T-ORB');
      const r = simular(e, D);
      afirmar(r.veredicto === 'total' && r.datos.bajadosMB === r.datos.generadosMB, `enlace grande: ${r.veredicto}`);
      casi(r.datos.generadosMB, (2 * 8 + 3 * 8) * 0.45 * 10, 'MB generados en 10 días');
    });
    conMision('T-ORB', { fases: fasesSeguras, eventosMision: [], horasEnlace: 1 }, () => {
      const r = simular(estadoVuelo('T-ORB'), D);
      // capacidad 10 kbps × 1 h × 0,45 = 4,5 MB/día frente a 18 MB/día generados → fracción 0,25
      afirmar(r.datos.bajadosMB < r.datos.generadosMB && r.datos.perdidosMB > 0, 'no se perdieron datos');
      casi(r.ciencia.find((o) => o.id === 'O1').conseguido, 0.25, 'ciencia × fracción de datos');
      afirmar(r.veredicto === 'parcial', `enlace pequeño: ${r.veredicto}`);
      afirmar(r.causas.some((c) => c.tipo === 'datos'), 'falta la causa de datos perdidos');
    });
  },

  "Reglas · puntuación 'cadena': días de superficie y corte"() {
    const fasesSeguras = D.MISIONES['T-LND'].fases.map((f) => ({ ...f, pBase: 1 }));
    conMision('T-LND', { fases: fasesSeguras, eventosMision: [] }, () => {
      const r = simular(estadoVuelo('T-LND'), D);
      afirmar(r.veredicto === 'total' && r.diasConseguidos === 10, `sin incidentes: ${r.veredicto}, ${r.diasConseguidos} días`);
    });
    conMision('T-LND', { fases: fasesSeguras.map((f) => (f.id === 'F3' ? { ...f, pBase: 0 } : f)), eventosMision: [] }, () => {
      const r = simular(estadoVuelo('T-LND'), D);
      afirmar(r.veredicto === 'parcial' && r.diasConseguidos === 5, `un golpe crítico: ${r.veredicto}, ${r.diasConseguidos} días`);
      casi(r.ciencia.find((o) => o.id === 'O1').conseguido, 0.25, 'ciencia × 0,5 × días 5/10');
    });
    conMision('T-LND', { fases: fasesSeguras.map((f) => (f.critica ? { ...f, pBase: 0 } : f)), eventosMision: [] }, () => {
      const r = simular(estadoVuelo('T-LND'), D);
      afirmar(r.veredicto === 'fallida' && r.ciencia.every((o) => o.conseguido === 0), 'la cadena no se cortó');
    });
  },

  "Reglas · puntuación 'oculto': hallazgos por instrumento y por kWh"() {
    const fasesSeguras = D.MISIONES['T-EXP'].fases.map((f) => ({ ...f, pBase: 1 }));
    conMision('T-EXP', { fases: fasesSeguras, eventosMision: [] }, () => {
      const e = estadoVuelo('T-EXP');
      const r = simular(e, D);
      const h = r.hallazgos[0];
      afirmar(h.presente && h.capturado && h.detector === 'T-inst2', 'con T-inst2 encendido tendría que capturarse');
      const wh = resumen(e, D).energiaWh; // 10×24 + 20×8 + 30×8 = 640
      casi(wh, 640, 'energía diaria');
      casi(r.puntos, Math.round(((60 + 40) + 25) / (wh / 1000) * 10) / 10, 'puntos por kWh/día');
      const e2 = estadoVuelo('T-EXP', { piezas: { 'T-inst2': { op: 'A', uso: 0 } } });
      const r2 = simular(e2, D);
      afirmar(r2.hallazgos[0].presente && !r2.hallazgos[0].capturado, 'sin detector no se captura');
      afirmar(r2.causas.some((c) => c.tipo === 'hallazgo' && /could not detect|nothing on board/.test(c.en)), 'falta la causa del hallazgo perdido');
    });
  },

  'Reglas · vuelo completo, informe y rediseño sin repetir eventos'() {
    const e = montarBueno(enDiseno('T-ORB', 'normal'));
    agotarEventos(e);
    const eventos = JSON.stringify(e.diseno.eventos);
    firmarTodo(e);
    ok(e, 'jvuelo', 'lanzar', {});
    const total = e.resultado.pasos.length;
    // vista.paso = índice del último paso revelado: al lanzar ya se ve el 0.
    for (let k = 0; k < total - 1; k++) { ok(e, 'jciencia', 'avanzar', { paso: k }); afirmar(e.vista.paso === k + 1 && e.fase === 'mision', `paso ${k + 1}`); }
    rechaza(e, 'jvuelo', 'avanzar', { paso: total - 2 }, /Already/);
    rechaza(e, 'jvuelo', 'cambiarFase', { fase: 'informe' }, /Next/);
    afirmar(e.vista.paso === total - 1 && e.fase === 'mision', 'antes del informe se ven todos los pasos');
    ok(e, 'jvuelo', 'avanzar', {});
    afirmar(e.fase === 'informe', 'no pasó al informe');
    const piezas = JSON.stringify(e.porRol), semilla = e.semilla;
    ok(e, 'jvuelo', 'cambiarFase', { fase: 'diseno' });
    afirmar(e.fase === 'diseno' && JSON.stringify(e.porRol) === piezas && e.semilla === semilla, 'el rediseño no conserva diseño y semilla');
    afirmar(e.resultado === null && ROLES.every((r) => !e.firmas[r]), 'el rediseño no limpia resultado y firmas');
    ok(e, 'jvuelo', 'pedirRevision', {});
    afirmar(JSON.stringify(e.diseno.eventos) === eventos && e.fase === 'verificacion', 'volvieron a salir eventos de diseño');
    // Nueva partida: todo lo de la misión se vacía.
    firmarTodo(e); ok(e, 'jvuelo', 'lanzar', {});
    while (e.fase === 'mision') ok(e, 'jvuelo', 'avanzar', {});
    ok(e, 'jvuelo', 'cambiarFase', { fase: 'lobby' });
    afirmar(e.fase === 'lobby' && e.mision === null && tallerVacio(e.porRol.vuelo) && e.diseno.eventos.length === 0, 'nueva partida sin vaciar');
  },

  'Reglas · resumen, cumple, verificar y simular aguantan estado vacío o roto'() {
    const casos = [
      [estadoInicial(), D], [{}, D], [null, null], [undefined, undefined], [{ mision: { id: 'nope' } }, D],
      [{ mision: { id: 'T-ORB' }, porRol: null }, D],
      [{ mision: { id: 'T-ORB' }, porRol: { vuelo: null, ciencia: { piezas: null }, potencia: { piezas: [] }, comms: { contingencias: 'x' } } }, D],
      [{ mision: { id: 'T-ORB' }, porRol: { ciencia: { piezas: { nope: { op: 'A' }, 'T-inst1': null, 'T-panel': { op: 'A' } } }, vuelo: { cohete: 'nope', ruta: 'nope' } } }, D],
      [{ mision: { id: 'T-ORB' }, diseno: { eventos: [null, { id: 'nope' }] } }, D],
      [{ mision: { id: 'T-ORB' } }, { MISIONES: { 'T-ORB': { id: 'T-ORB', objetivos: null, fases: [{ id: 'F', pBase: null }] } } }],
    ];
    for (const [e, d] of casos) {
      const r = resumen(e, d);
      for (const b of ['masa', 'potencia', 'bateria', 'datos', 'presupuesto', 'volumen']) {
        afirmar(r.barras[b] && Array.isArray(r.barras[b].partes) && typeof r.barras[b].limite === 'number', `barra ${b} con ${JSON.stringify(e)}`);
      }
      afirmar(Array.isArray(r.ciencia.objetivos) && Array.isArray(r.riesgos), 'forma de ciencia y riesgos');
      afirmar(['dentro', 'tolerancia', 'fuera'].includes(cumple(r).nivel), 'cumple');
      afirmar(typeof verificar(e, d).pasa === 'boolean', 'verificar');
      afirmar(['total', 'parcial', 'fallida'].includes(simular(e, d).veredicto), 'simular');
    }
    const vacio = resumen(estadoInicial(), D);
    afirmar(Object.values(vacio.barras).every((b) => b.usado === 0 && b.limite === 0 && b.estado === 'ok'), 'sin misión: barras vacías con límite 0');
    afirmar(cumple(null).nivel === 'dentro', 'cumple(null)');
  },

  'Reglas · estado inicial y fusión de talleres (unirse)'() {
    afirmar(VERSION_PROTOCOLO === 5, 'versión del protocolo (5: reloj en tiempo real)');
    afirmar(FASES.join() === 'lobby,briefing,diseno,restricciones,verificacion,mision,informe', 'FASES');
    const e = estadoInicial();
    afirmar(e.mision === null && e.resultado === null && e.vista.paso === 0 && e.diseno.eventos.length === 0, 'campos nuevos');
    afirmar(ROLES.every((r) => tallerVacio(e.porRol[r]) && e.firmas[r] === false), 'talleres vacíos y firmas en falso');
    afirmar(e.porRol.vuelo.cohete === null && Array.isArray(e.porRol.comms.contingencias), 'forma de talleres');
    afirmar(!tallerVacio({ ...tallerInicial('ciencia'), nota: 1 }) && !tallerVacio({ piezas: { a: {} } }), 'tallerVacio');
    // Un jugador que vuelve trae su taller: entra normalizado.
    const ctx = { ahora: 1, aleatorio: () => 0.5, datos: D };
    reducir(e, 'jA', { id: 1, tipo: 'unirse', payload: { nick: 'A', rol: 'comms', propio: { piezas: { 'T-ant': { op: 'A', uso: 'x' } }, contingencias: ['T-c1', 'T-c1', 5, 'T-c2', 'T-c3', 'T-c4'], cohete: 'T-cs', nota: 'n' } } }, ctx);
    const t = e.porRol.comms;
    afirmar(t.piezas['T-ant'].op === 'A' && t.piezas['T-ant'].uso === null, 'piezas normalizadas');
    afirmar(t.contingencias.join() === 'T-c1,T-c2,T-c3' && t.cohete === undefined && t.nota === 'n', `normalizado: ${JSON.stringify(t)}`);
    // Un taller con contenido no se pisa.
    reducir(e, 'jA', { id: 2, tipo: 'unirse', payload: { nick: 'A', rol: 'comms', propio: { piezas: {} } } }, ctx);
    afirmar(e.porRol.comms.piezas['T-ant'], 'se pisó un taller con contenido');
  },

  'Reglas · datos: ctx.datos, usarDatos y datos que no casan'() {
    const sinCtx = { ahora: 1, aleatorio: () => 0.5 };
    // Sin ctx.datos se usa lo inyectado con usarDatos (el fixture).
    const e = partida();
    afirmar(reducir(e, 'jvuelo', { id: ++idInt, tipo: 'elegirMision', payload: { id: 'T-ORB' } }, sinCtx) === null, 'usarDatos no se usó');
    // ctx.datos manda sobre usarDatos: con otros datos, T-ORB no existe.
    const otros = { ...D, MISIONES: {} };
    const m = reducir(partida(), 'jvuelo', { id: ++idInt, tipo: 'elegirMision', payload: { id: 'T-ORB' } }, { ...sinCtx, datos: otros });
    afirmar(/Unknown mission/.test(m ?? ''), `ctx.datos no manda: ${m}`);
    // Sin nada inyectado se usan los datos del juego (si existen): T-ORB no es de ellos.
    usarDatos(null);
    const m2 = reducir(partida(), 'jvuelo', { id: ++idInt, tipo: 'elegirMision', payload: { id: 'T-ORB' } }, sinCtx);
    usarDatos(D);
    afirmar(/data not loaded|Unknown mission/i.test(m2 ?? ''), `sin datos inyectados: ${m2}`);
    // uso como cadena (viene de un <input>) se acepta; un evento con prioridad ajena no cambia el prioritario.
    const e3 = enDiseno();
    ok(e3, 'jciencia', 'montar', { pieza: 'T-inst1', uso: '6' });
    afirmar(e3.porRol.ciencia.piezas['T-inst1'].uso === 6, 'uso en cadena');
    D.EVENTOS_DISENO['ED-prio'].efecto.prioridad = 'NO-ES-DE-ESTA-MISION';
    e3.diseno.eventos = [{ id: 'ED-prio' }];
    afirmar(resumen(e3, D).ciencia.objetivos.find((o) => o.prioridad)?.id === 'O1', 'prioridad ajena aplicada');
    afirmar(motivoRestriccion(e3, { tipo: 'raro' }, D) === 'Unknown change', 'un cambio desconocido no se permite');
  },

  // ---------- Reloj de misión (contrato-reloj.md §8) ----------
  'Reglas · reloj: plazo por defecto y comprometerPlazo en el expediente'() {
    const e = partida();
    ok(e, 'jvuelo', 'elegirMision', { id: 'T-CAL' });
    afirmar(e.mision.plazo === 8, `plazo por defecto (el del medio): ${e.mision.plazo}`);
    ok(e, 'jciencia', 'comprometerPlazo', { plazo: 4 });
    afirmar(e.mision.plazo === 4, 'no se comprometió');
    rechaza(e, 'jciencia', 'comprometerPlazo', { plazo: 5 }, /Unknown commitment/);
    rechaza(e, 'jciencia', 'comprometerPlazo', { plazo: '4' }, /Unknown commitment/);
    ok(e, 'jvuelo', 'elegirMision', { dificultad: 'facil' });
    afirmar(e.mision.plazo === 4, 'cambiar la dificultad no cambia el plazo');
    ok(e, 'jvuelo', 'elegirMision', { id: 'T-ORB' });
    afirmar(e.mision.plazo === null, 'una misión sin reloj no tiene plazo');
    rechaza(e, 'jvuelo', 'comprometerPlazo', { plazo: 4 }, /no launch commitment/);
    todosListos(e);
    rechaza(e, 'jvuelo', 'comprometerPlazo', { plazo: 4 }); // fuera del briefing
  },

  'Reglas · reloj: cada tic suma 1 mes, la revisión ninguno, los eventos con meses suman y rediseñar 6'() {
    const e = montarBueno(enDiseno('T-CAL', 'dificil'));
    afirmar(e.reloj.mes === 0 && e.reloj.corriendo === true && e.reloj.msPorMes === 60_000 && Number.isFinite(e.reloj.inicioMes), `reloj al empezar: ${JSON.stringify(e.reloj)}`);
    let esperado = 0;
    while (e.fase === 'diseno' && siguienteEventoDiseno(e, D) !== null) {
      const salio = ticar(e);
      esperado += 1 + (salio ? num(D.EVENTOS_DISENO[salio].efecto.meses ?? 0) : 0);
      afirmar(e.reloj.mes === esperado, `tras ${salio ?? 'el tic'}: ${e.reloj.mes} ≠ ${esperado}`);
    }
    ok(e, 'jvuelo', 'pedirRevision', {});
    afirmar(e.reloj.mes === esperado, 'la revisión no suma meses');
    rechazaTicRepetido(e); // doble tic con el mes viejo
    // Velocidad según los jugadores con rol: 4 → 60 s, 3 → 75, 2 → 90, 1 → 105.
    afirmar([4, 3, 2, 1].map(msPorMes).join() === '60000,75000,90000,105000', 'velocidades');
    const e2 = montarBueno(enDiseno('T-CAL', 'facil', { roles: ['vuelo', 'ciencia'] }));
    afirmar(e2.reloj.msPorMes === 90_000, `2 jugadores: ${e2.reloj.msPorMes}`);
    // Parado fuera de diseño, restricciones y verificación; vuelve a correr al volver.
    e.fase = 'informe'; ok(e, 'jvuelo', 'elegirRol', { rol: 'vuelo' }); afirmar(e.reloj.corriendo === false, 'parado en el informe');
    e.fase = 'diseno'; ok(e, 'jvuelo', 'elegirRol', { rol: 'vuelo' }); afirmar(e.reloj.corriendo === true, 'vuelve a correr');
    // Estado v4 (solo { mes }): se completa sin perder el mes.
    const e4 = montarBueno(enDiseno('T-CAL', 'facil')); e4.reloj = { mes: 5 }; ok(e4, 'jvuelo', 'editarPropio', { clave: 'nota', valor: 'x' });
    afirmar(e4.reloj.mes === 5 && e4.reloj.msPorMes > 0 && 'inicioMes' in e4.reloj, `v4: ${JSON.stringify(e4.reloj)}`);
    // Rediseño: +6 meses, y nueva misión: vuelta a 0.
    e.fase = 'informe';
    const antes = e.reloj.mes;
    ok(e, 'jvuelo', 'cambiarFase', { fase: 'diseno' });
    afirmar(e.reloj.mes === antes + 6, `rediseño: ${e.reloj.mes}`);
    e.fase = 'informe';
    ok(e, 'jvuelo', 'cambiarFase', { fase: 'lobby' });
    afirmar(e.reloj.mes === 0 && e.ruta.mes === null, 'la partida nueva no reinicia el reloj');
  },

  'Reglas · reloj: ventana perdida, mes demasiado pronto y replanificar en verificación'() {
    const e = montarBueno(enDiseno('T-CAL', 'facil'));
    rechaza(e, 'jvuelo', 'planificarRuta', { mes: 0 }, /Too soon/);
    rechaza(e, 'jvuelo', 'planificarRuta', { mes: 31 }, /Unknown launch month/);
    rechaza(e, 'jvuelo', 'planificarRuta', { mes: 2.5 }, /Unknown launch month/);
    ok(e, 'jvuelo', 'planificarRuta', { mes: 2, sitio: 'S1' });
    afirmar(e.ruta.mes === 2 && planDe(e, D).perdida === false && verificar(e, D).comprobaciones.find((c) => c.id === 'mesLanzamiento').ok, 'plan inicial');
    while (e.reloj.mes < 3 && e.fase === 'diseno') ticar(e); // el mes 2 se pierde con el tiempo real
    ok(e, 'jvuelo', 'pedirRevision', {});
    afirmar(e.fase === 'verificacion' && e.reloj.mes >= 3, `preparación: ${e.fase}, mes ${e.reloj.mes}`);
    afirmar(planDe(e, D).perdida === true && resumen(e, D).plan.perdida === true, 'el mes 2 ya pasó: plan perdido');
    const v = verificar(e, D);
    afirmar(!v.pasa && v.comprobaciones.find((c) => c.id === 'mesLanzamiento').ok === false, 'la verificación no ve la ventana perdida');
    afirmar(/already passed/.test(v.comprobaciones.find((c) => c.id === 'mesLanzamiento').texto.en), 'texto de la ventana perdida');
    rechaza(e, 'jvuelo', 'firmar', { on: true }, /checks/);
    rechaza(e, 'jvuelo', 'planificarRuta', { mes: e.reloj.mes - 1 }, /already passed/);
    ok(e, 'jvuelo', 'planificarRuta', { mes: e.reloj.mes }); // en verificación ya no falta ninguna revisión
    afirmar(verificar(e, D).pasa, `replanificado: ${JSON.stringify(verificar(e, D).comprobaciones.filter((c) => !c.ok))}`);
    // `ventana` (nombre antiguo) solo se acepta en mensajes entrantes: vale como mes y ya no deja copia en la ruta.
    ok(e, 'jvuelo', 'planificarRuta', { ventana: e.reloj.mes + 1 });
    afirmar(e.ruta.mes === e.reloj.mes + 1 && !('ventana' in e.ruta), 'alias ventana sin copia para la interfaz antigua');
  },

  'Reglas · reloj: recorte de los inversores por umbrales, bono por plazo y orden de los eventos'() {
    const e = montarBueno(enDiseno('T-CAL', 'facil')); // plazo 8, presupuesto 100
    const caso = (mes, rutaMes = null) => { e.reloj = { mes }; e.ruta = { mes: rutaMes, sitio: null }; return relojDe(e, D); };
    const tabla = [[8, 0, 0], [9, 1, 0], [10, 2, 0.04], [14, 6, 0.2], [19, 11, 0.4], [20, 12, 0.4]];
    for (const [mes, retraso, recorte] of tabla) {
      const r = caso(mes);
      afirmar(r.activo && r.retraso === retraso && !r.cancelada, `mes ${mes}: retraso ${r.retraso}`);
      casi(r.recorte, recorte, `recorte con ${retraso} meses de retraso`);
      casi(resumen(e, D).barras.presupuesto.limite, 100 * (1 - recorte), `límite de presupuesto con retraso ${retraso}`);
    }
    afirmar(caso(21).cancelada && !caso(20).cancelada, 'cancelación con más de 12 meses');
    afirmar(caso(3, 11).retraso === 3, 'un lanzamiento planificado tarde también cuenta como retraso');
    caso(0);
    e.mision.plazo = 4; casi(resumen(e, D).barras.presupuesto.limite, 110, 'plazo corto: +10 %');
    e.mision.plazo = 12; casi(resumen(e, D).barras.presupuesto.limite, 90, 'plazo largo: −10 %');
    e.mision.plazo = 8;
    // Sumas primero, factores después: el orden en que salieron no importa.
    e.diseno.eventos = [{ id: 'ED-fac' }, { id: 'ED-mas' }];
    casi(resumen(e, D).barras.presupuesto.limite, 60, '(100 + 20) × 0,5');
    e.diseno.eventos = [{ id: 'ED-mas' }, { id: 'ED-fac' }];
    casi(resumen(e, D).barras.presupuesto.limite, 60, 'mismo resultado en el otro orden');
    // Sin plazo (partida anterior) no hay regla de inversores.
    e.mision.plazo = null; e.diseno.eventos = []; caso(30);
    afirmar(!relojDe(e, D).activo && resumen(e, D).barras.presupuesto.limite === 100, 'sin plazo no hay recorte');
    // Planificar más de 12 meses tras el plazo no se deja.
    e.mision.plazo = 8; caso(0);
    rechaza(e, 'jvuelo', 'planificarRuta', { mes: 21 }, /will not wait/);
  },

  'Reglas · reloj: los inversores se retiran y la misión se cancela'() {
    const e = montarBueno(enDiseno('T-CAL', 'facil'));
    agotarEventos(e);
    ok(e, 'jvuelo', 'cambiarFase', { fase: 'diseno' });
    e.reloj.mes = 19; // plazo 8: retraso 11
    ok(e, 'jvuelo', 'tic', { mes: 19 }); ok(e, 'jvuelo', 'tic', { mes: 20 }); // +2 → retraso 13 (un evento con meses puede cancelar antes)
    afirmar(e.fase === 'informe' && e.resultado?.cancelada === true && e.resultado.veredicto === 'fallida', `no se canceló: ${e.fase}`);
    afirmar(e.resultado.causas.some((c) => c.tipo === 'cancelada' && c.es && c.en), 'falta la causa de la cancelación');
    const lineas = explicarCausas(e.resultado, D, 'en');
    afirmar(lineas.some((l) => /Investors pulled out/.test(l)) && lineas.some((l) => /Clock/.test(l)), `explicación: ${lineas.join(' | ')}`);
    // Rediseñar con un retraso que lo cancelaría se rechaza (se puede volver al lobby).
    const e2 = montarBueno(enDiseno('T-CAL', 'facil'));
    e2.fase = 'informe'; e2.reloj.mes = 15;
    rechaza(e2, 'jvuelo', 'cambiarFase', { fase: 'diseno' }, /Investors/);
    ok(e2, 'jvuelo', 'cambiarFase', { fase: 'lobby' });
  },

  'Reglas · reloj: el desglose de cada fase suma p − pBase'() {
    const e = estadoVuelo('T-CAL', { contingencias: ['T-c1'] });
    e.mision.plazo = 8; e.reloj = { mes: 0 }; e.ruta = { mes: 6, sitio: 'S1' }; // mes 6: julio, conjunción, ΔV × 1,2
    const r = resumen(e, D);
    afirmar(r.plan.cond && r.plan.cond.diasConj === 10 && r.plan.factor === 1.2, `condiciones: ${JSON.stringify(r.plan.cond)}`);
    casi(r.plan.extraKg, 2, 'propelente extra por ΔV × 1,2 (ruta de 10 kg)');
    casi(r.plan.horasEnlace, 12, 'enlace a la mitad los 10 días de conjunción (vida 10 días): 24 × 0,5');
    for (const f of r.fases) {
      const suma = f.desglose.reduce((s, x) => s + x.dp, 0);
      casi(suma, f.pCruda - f.pBase, `${f.id}: Σ desglose`);
      if (f.pCruda > 0 && f.pCruda < 1) casi(f.p, f.pCruda, `${f.id}: p sin recortar`);
      afirmar(f.desglose.every((x) => ['base', 'pieza', 'contingencia', 'ruta', 'sitio', 'mes', 'clima', 'espacio', 'conjuncion', 'tolerancia'].includes(x.fuente)), 'fuente desconocida');
    }
    const fuentes = (id) => r.fases.find((f) => f.id === id).desglose.map((x) => x.fuente).join();
    afirmar(fuentes('F1') === 'clima', `F1: ${fuentes('F1')}`);
    afirmar(['ruta', 'espacio', 'conjuncion'].every((x) => fuentes('F2').includes(x)), `F2: ${fuentes('F2')}`);
    afirmar(fuentes('F3').includes('contingencia') && fuentes('F3').includes('sitio'), `F3: ${fuentes('F3')}`);
    casi(r.fases[0].desglose[0].dp, -0.04, 'julio en el sitio de prueba: puntuación 1 → −4 %');
    casi(r.fases[1].desglose.find((x) => x.fuente === 'conjuncion').dp, -0.02, 'conjunción de 10 días: −2 %');
    // Sin plan no hay condiciones del mes: las fases son las de siempre.
    e.ruta = { mes: null, sitio: null };
    afirmar(resumen(e, D).fases.every((f) => !f.desglose.some((x) => ['clima', 'espacio', 'conjuncion'].includes(x.fuente))), 'condiciones sin mes');
  },

  'Reglas · reloj: determinista entre clientes y sorteos por mes aparte'() {
    const mk = (semilla) => { const e = estadoVuelo('T-CAL', { semilla }); e.mision.plazo = 8; e.ruta = { mes: 5, sitio: 'S1' }; return e; };
    const e = mk(31);
    const otro = JSON.parse(JSON.stringify(e));
    afirmar(JSON.stringify(simular(e, D)) === JSON.stringify(simular(otro, D)), 'simular difiere entre clientes');
    afirmar(JSON.stringify(resumen(e, D)) === JSON.stringify(resumen(otro, D)), 'resumen difiere entre clientes');
    // Las tiradas de las fases son las del azar 'mision' de siempre (sin eventos: una por fase).
    conMision('T-CAL', { fases: D.MISIONES['T-CAL'].fases.map((f) => ({ ...f, pBase: 0, mejoras: [] })), eventosMision: [] }, () => {
      const r = simular(mk(77), D);
      const azar = prng(derivar(77, 'mision', 'T-CAL'));
      const fallidas = r.pasos.filter((p) => !p.omitida);
      afirmar(fallidas.length >= 1, 'ninguna fase jugada');
      for (const p of fallidas) casi(p.tirada, Math.round(azar() * 1000) / 1000, `tirada de ${p.fase}`);
      afirmar(r.fallos.filter((f) => f.codigo === 'fase').length === fallidas.length, 'un fallo por fase fallida');
    });
    // Lluvia y tormentas: salen de los sorteos 'clima' y 'reloj' del mes, en todas las semillas con la misma frecuencia aproximada.
    let scrubs = 0, tormentas = 0;
    for (let s = 0; s < 300; s++) { const l = simular(mk(s), D).lanzamiento; scrubs += l.scrub > 0; tormentas += l.tormenta; }
    const c = condicionesMesDe(mk(0));
    afirmar(Math.abs(scrubs / 300 - c.pScrub) < 0.1 && Math.abs(tormentas / 300 - c.pKp7) < 0.1, `frecuencias: ${scrubs}, ${tormentas} vs ${c.pScrub}, ${c.pKp7}`);
  },

  'Reglas · reloj: explicarCausas da causa → decisión → qué lo evitaba'() {
    const fases = D.MISIONES['T-CAL'].fases.map((f) => (f.id === 'F1' ? { ...f, pBase: 0.3 } : { ...f, pBase: 1 }));
    conMision('T-CAL', { fases, eventosMision: ['EM-1'] }, () => {
      // F1: pBase 0,30 − 0,04 de julio = 0,26. Con tirada en [0,26, 0,30) la culpa es del mes; con ≥ 0,30, mala suerte.
      let r = null, rSuerte = null;
      for (let s = 0; s < 2000 && !(r && rSuerte); s++) {
        const e = estadoVuelo('T-CAL', { semilla: s }); e.mision.plazo = 8; e.reloj = { mes: 3 }; e.ruta = { mes: 6, sitio: 'S1' };
        const x = simular(e, D);
        if (x.pasos[0].ok) continue;
        if (x.pasos[0].tirada < 0.3) r ??= x; else rSuerte ??= x;
      }
      afirmar(r && rSuerte, 'no salieron los dos casos de fallo del lanzamiento');
      const f = r.fallos.find((x) => x.codigo === 'fase' && x.fase === 'F1');
      afirmar(f && f.desglose[0][0] === 'clima' && f.evitar === 'mesSeco' && f.decision.mes === 6, `fallo: ${JSON.stringify(f)}`);
      const fs = rSuerte.fallos.find((x) => x.codigo === 'fase' && x.fase === 'F1');
      afirmar(fs.evitar === 'suerte' && fs.desglose[0][0] === 'clima', `la culpa no es del mes si la tirada fallaba igual: ${JSON.stringify(fs)}`);
      const ls = explicarCausas(rSuerte, D, 'en')[0];
      afirmar(/bad luck.*July 2027.*−4 %.*nothing/.test(ls), `mala suerte con sus factores: ${ls}`);
      afirmar(JSON.stringify(r.fallos).length < 2000, 'los fallos no son compactos');
      for (const l of ['en', 'es']) {
        const lineas = explicarCausas(r, D, l);
        afirmar(lineas.length >= 2 && lineas.length <= 6, `${l}: ${lineas.length} viñetas`);
        afirmar(lineas[0].split('→').length === 3, `${l}: formato causa → decisión → evitar: ${lineas[0]}`);
        afirmar(l === 'en' ? /Launch failed.*July 2027.*Test Cape.*rain 6 mm\/day.*−4 %.*less rain/.test(lineas[0])
          : /julio 2027.*Cabo de prueba.*lluvia 6 mm\/día.*−4 %.*menos lluvia/.test(lineas[0]), `${l}: ${lineas[0]}`);
        afirmar(/Clock|Reloj/.test(lineas[lineas.length - 1]), `${l}: falta el reloj`);
      }
    });
    // Un fallo sin mala decisión detrás es mala suerte.
    const suerte = explicarCausas({ mision: 'T-ORB', fallos: [{ codigo: 'fase', fase: 'F1', critica: true, p: 0.95, tirada: 0.97, desglose: [], decision: null, evitar: 'suerte' }] }, D, 'en');
    afirmar(/bad luck: the phase had a 5 % chance/.test(suerte[0]), suerte[0]);
    afirmar(explicarCausas(null, D, 'en').length === 1, 'resultado vacío');
  },

  'Reglas · planificador: el selector de mes sigue el reloj, el plazo y lo que valida el protocolo'() {
    const e = montarBueno(enDiseno('T-CAL', 'facil')); // plazo 8, mesMax 30, reloj 0
    const info = mesesPlanificables(e, D);
    afirmar(info.meses.length === 31 && info.meses[0].mes === 0 && info.meses[30].mes === 30, `meses ${info.meses.length}`);
    afirmar(info.meses[0].esAhora && info.meses[0].motivo === 'pronto' && info.meses[1].motivo === null, 'solo el mes actual es demasiado pronto');
    afirmar(info.meses.filter((x) => x.esPlazo).map((x) => x.mes).join() === '8', 'marca del plazo');
    afirmar(info.limite === 20 && info.meses[20].motivo === null && info.meses[21].motivo === 'tarde', `límite ${info.limite}: los inversores no esperan más de 12 meses`);
    // Lo mismo que valida planificarRuta.
    rechaza(e, 'jvuelo', 'planificarRuta', { mes: 0 }, /Too soon/);
    rechaza(e, 'jvuelo', 'planificarRuta', { mes: 21 }, /will not wait/);
    ok(e, 'jvuelo', 'planificarRuta', { mes: 20 });
    afirmar(mesesPlanificables(e, D).meses.find((x) => x.mes === 20).esElegido && !mesesPlanificables(e, D).perdida, 'mes elegido');
    // El reloj avanza: ya no se ofrecen los meses pasados y el elegido se pierde.
    e.reloj.mes = 21;
    e.ruta.mes = 5;
    const despues = mesesPlanificables(e, D);
    afirmar(despues.perdida === true && despues.meses[0].mes === 21 && despues.meses.every((x) => !x.esElegido), 'plan perdido: hay que elegir otro mes');
    e.reloj.mes = 3; e.fase = 'verificacion';
    afirmar(mesesPlanificables(e, D).minimo === 3 && mesesPlanificables(e, D).meses[0].motivo === null, 'en verificación no falta ninguna revisión');
    afirmar(mesesPlanificables(estadoInicial(), D) === null, 'sin misión no hay selector');
  },

  'Reglas · planificador: condiciones del mes como datos (clima, conjunción, ΔV, retraso) y nombres de mes'() {
    const e = montarBueno(enDiseno('T-CAL', 'facil'));
    const k = condicionesDeMes(e, D, 6); // mes 6: 10 días de conjunción y ΔV × 1,2 en el fixture
    afirmar(k.cond.diasConj === 10 && Math.abs(k.factor - 1.2) < 1e-9 && Math.abs(k.dv - 3.6) < 1e-9, `mes 6: ${JSON.stringify(k.cond)}`);
    afirmar(k.sitioLanz.nombre.en === 'Test Cape' && typeof k.hayCohete === 'boolean' && k.retraso === 0 && k.recorte === 0, 'sitio y plazo');
    const tarde = condicionesDeMes(e, D, 11); // plazo 8: 3 meses de retraso, −4 % × (3 − 1)
    afirmar(tarde.retraso === 3 && Math.abs(tarde.recorte - 0.08) < 1e-9, `retraso ${tarde.retraso}, recorte ${tarde.recorte}`);
    afirmar(Object.keys(k).every((x) => !/optim|mejor|best/i.test(x)), 'ninguna condición se califica como la mejor');
    afirmar(etiquetaMes(D, 0, { lang: 'en' }) === 'Jan 2027' && etiquetaMes(D, 17, { lang: 'es' }) === 'jun 2028' && etiquetaMes(D, 17, { lang: 'es', larga: true }) === 'junio 2028'
      && etiquetaMes(D, 12, { lang: 'en', larga: true }) === 'January 2028', 'nombres de mes');
  },

  'Reglas · planificación: sin la ventana antigua y sin nombres de misiones reales en sitios y órbitas'() {
    for (const [id, P] of Object.entries(PLAN_REAL)) {
      afirmar(P.lanzamiento && !('ventana' in P), `${id}: lanzamiento sí, ventana no`);
      for (const s of P.sitios) {
        const t = [s.nombre?.es, s.nombre?.en, s.nota?.es, s.nota?.en].join(' ');
        afirmar(!/como MPO|like MPO|MESSENGER\)|Blue Ghost|Philae|Agilkia|BepiColombo|Rosetta|Apolo 11|Apollo 11/.test(t), `${s.id} nombra la misión real: ${t}`);
      }
    }
  },

  'Reglas · explicarPuntos separa la mala suerte de las decisiones'() {
    const fallos = [
      { codigo: 'fase', fase: 'F1', critica: true, p: 0.95, tirada: 0.97, desglose: [], decision: null, evitar: 'suerte' },
      { codigo: 'datos', fase: null, mb: 12, evitar: 'enlace' },
    ];
    const pts = explicarPuntos({ mision: 'T-ORB', fallos }, D, 'en');
    afirmar(pts[0].tipo === 'suerte' && pts[1].tipo === 'decision', `tipos ${pts.map((p) => p.tipo)}`);
    afirmar(pts.every((p) => p.texto === [p.causa, p.decision, p.evitar].filter((x) => x != null).join(' → ')), 'texto = causa → decisión → evitar');
    afirmar(explicarCausas({ mision: 'T-ORB', fallos }, D, 'es').length === 2 && explicarPuntos(null, D, 'es')[0].tipo === 'info', 'es / vacío');
  },

  'Reglas · reloj: un estado v3 se completa (ruta.ventana → ruta.mes, reloj)'() {
    const e = partida();
    e.ruta = { ventana: 12, sitio: 'S1' };
    delete e.reloj;
    e.mision = { escenario: 'orbita', id: 'T-CAL', dificultad: 'facil', objetivos: ['O1', 'O2'] };
    ok(e, 'jvuelo', 'marcarPizarra', { id: 'tareas' });
    afirmar(e.ruta.mes === null && !('ventana' in e.ruta) && e.ruta.sitio === 'S1', `ruta: ${JSON.stringify(e.ruta)}`);
    afirmar(e.reloj.mes === 0 && e.mision.plazo === null, `reloj ${JSON.stringify(e.reloj)}, plazo ${e.mision.plazo}`);
    afirmar(estadoInicial().reloj.mes === 0 && estadoInicial().reloj.corriendo === false && estadoInicial().ruta.mes === null, 'estado inicial v5');
  },
};

function condicionesMesDe(e) { return resumen(e, D).plan.cond; }

const agotarEventos2 = agotarEventos;

// ---------- Ejecutor ----------
const lista = document.getElementById('resultados-reglas');
const resumenEl = document.getElementById('resumen');
const params = new URLSearchParams(location.search);
const solo = params.get('solo')?.toLowerCase();
const veces = Number(params.get('veces')) || 1;
const elegidas = Object.entries(pruebas).filter(([n]) => !solo || n.toLowerCase().includes(solo));
const previo = window.__resultadoTotal ?? { ok: 0, fallos: 0 };
let ok_ = 0, fallos = 0;
usarDatos(D);
for (const [nombre, f] of Array.from({ length: veces }, () => elegidas).flat()) {
  const li = document.createElement('li');
  const t0 = performance.now();
  D = crearFixture();
  usarDatos(D);
  try {
    f();
    ok_++;
    li.className = 'ok';
    li.textContent = `✔ ${nombre} (${Math.round(performance.now() - t0)} ms)`;
  } catch (e) {
    fallos++;
    li.className = 'fallo';
    li.textContent = `✘ ${nombre}: ${e.message}`;
    console.error(nombre, e);
  }
  lista.appendChild(li);
}
usarDatos(null);
const total = { ok: previo.ok + ok_, fallos: previo.fallos + fallos };
resumenEl.textContent = `${total.ok} correctas, ${total.fallos} con fallo (protocolo y transporte: ${previo.ok + previo.fallos}; reglas: ${ok_ + fallos})`;
window.__resultadoReglas = { ok: ok_, fallos, detalle: [...lista.children].map((li) => li.textContent) };
window.__resultadoTotal = total;
window.__pruebasReglasTerminadas = true;
