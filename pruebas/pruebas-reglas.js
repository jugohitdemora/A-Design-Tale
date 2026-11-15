// Pruebas del motor de reglas (src/reglas/*) y de las acciones de juego del protocolo (src/red/protocolo.js).
// Son puras y síncronas: no usan red ni reloj. Se ejecutan desde pruebas/index.html, después de las otras dos suites.
// Todas empiezan por "Reglas ·" (?solo=reglas las ejecuta solas).
//
// DATOS DE PRUEBA: el fixture de abajo es inventado para probar las reglas. No son cifras reales de ninguna
// misión ni de ninguna pieza, y no dependen de src/datos/ (se inyectan con usarDatos y ctx.datos).
import { estadoInicial, reducir, usarDatos, tallerInicial, tallerVacio, FASES, VERSION_PROTOCOLO } from '../src/red/protocolo.js';
import { num, resumen, cumple, verificar, puedeEnRestricciones, motivoRestriccion, estadoDeRatio } from '../src/reglas/motor.js';
import { simular } from '../src/reglas/despliegue.js';
import { prng, derivar, barajar } from '../src/reglas/azar.js';

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
  'ED-lim': { id: 'ED-lim', signo: '-', nombre: { en: 'Smaller fairing' }, efecto: { limite: { recurso: 'volumen', factor: 0.9 } } },
  'ED-prio': { id: 'ED-prio', signo: '±', nombre: { en: 'New priority' }, efecto: { prioridad: 'O2' } },
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
  };
  return {
    PIEZAS, COHETES, CONTINGENCIAS, EVENTOS_DISENO, EVENTOS_MISION, MISIONES,
    ESCENARIOS: { orbita: { id: 'orbita' }, landing: { id: 'landing' }, exploracion: { id: 'exploracion' } }, FUENTES: {},
  };
}
let D = crearFixture();

// ---------- Ayudas ----------
const ROLES = ['vuelo', 'ciencia', 'potencia', 'comms'];
const CTX = () => ({ ahora: 1_000_000, aleatorio: () => 0.5, datos: D });
let idInt = 0;
const hacer = (e, quien, tipo, payload = {}) => reducir(e, quien, { id: ++idInt, tipo, payload }, CTX());
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
  ok(e, quien, 'cambiarFase', { fase: 'diseno' });
  return e;
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
// Pide revisiones hasta agotar los eventos de diseño. Devuelve cuántos salieron.
function agotarEventos(e) {
  let n = 0;
  while (e.fase === 'diseno') {
    const antes = e.diseno.eventos.length;
    ok(e, 'jvuelo', 'pedirRevision', {});
    if (e.diseno.eventos.length === antes) break;
    n++;
  }
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

  'Reglas · eventos de diseño: 1/2/3 según dificultad, una vez cada uno, antes de evaluar'() {
    for (const [dificultad, n] of [['facil', 1], ['normal', 2], ['dificil', 3]]) {
      const e = montarBueno(enDiseno('T-ORB', dificultad));
      const vistos = [];
      for (let k = 0; k < n; k++) {
        ok(e, 'jciencia', 'pedirRevision', {});
        afirmar(e.fase === 'diseno', `${dificultad}: la revisión ${k + 1} no debería evaluarse`);
        afirmar(e.diseno.eventos.length === k + 1 && e.diseno.ultima.tipo === 'evento', `${dificultad}: no salió el evento ${k + 1}`);
        vistos.push(e.diseno.eventos[k].id);
      }
      afirmar(new Set(vistos).size === n, `${dificultad}: evento repetido ${vistos}`);
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
    // Tolerancia → restricciones.
    e = montarBueno(enDiseno());
    ok(e, 'jvuelo', 'montar', { pieza: 'T-lastre', op: 'C' }); // masa 106/100
    agotarEventos(e);
    afirmar(e.fase === 'restricciones' && e.diseno.ultima.nivel === 'tolerancia', `tolerancia → ${e.fase}`);
    // Todo ok → verificación.
    e = mk();
    afirmar(e.fase === 'verificacion' && e.diseno.ultima.nivel === 'dentro', `ok → ${e.fase}`);
    // cambiarFase no se salta la revisión, el lanzamiento ni el avance.
    e = montarBueno(enDiseno());
    rechaza(e, 'jvuelo', 'cambiarFase', { fase: 'verificacion' }, /review/i);
    rechaza(e, 'jvuelo', 'cambiarFase', { fase: 'restricciones' });
    e = mk();
    rechaza(e, 'jvuelo', 'cambiarFase', { fase: 'mision' }, /launch/i);
    // Doble clic: la revisión con número viejo se rechaza.
    e = montarBueno(enDiseno());
    const n = e.diseno.revisiones;
    ok(e, 'jvuelo', 'pedirRevision', { revision: n });
    rechaza(e, 'jciencia', 'pedirRevision', { revision: n }, /already/i);
  },

  'Reglas · MEC-12: en restricciones se quita o se baja, no se añade'() {
    const e = montarBueno(enDiseno());
    ok(e, 'jvuelo', 'montar', { pieza: 'T-lastre', op: 'C' });
    agotarEventos(e);
    afirmar(e.fase === 'restricciones', 'preparación: tendría que estar en restricciones');
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
    ok(e, 'jvuelo', 'cambiarFase', { fase: 'diseno' });
    afirmar(e.fase === 'diseno', 'no pasó a diseño');
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
    afirmar(VERSION_PROTOCOLO === 2, 'versión del protocolo');
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
};

function agotarEventos2(e, quien) {
  while (e.fase === 'diseno') {
    const antes = e.diseno.eventos.length;
    ok(e, quien, 'pedirRevision', {});
    if (e.diseno.eventos.length === antes) break;
  }
}

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
