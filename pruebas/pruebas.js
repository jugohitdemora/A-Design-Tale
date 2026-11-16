// Pruebas del protocolo con la red simulada. Abrir pruebas/index.html con el servidor local.
import { crearRed } from '../src/red/transporte-memoria.js';
import { crearSesion } from '../src/red/sesion.js';
import { conectados } from '../src/red/protocolo.js';

const TIEMPOS = { esperaHost: 300, reintento: 150, esperaRelevo: 400 };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
async function esperarHasta(cond, ms = 4000, desc = 'condición') {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) { if (cond()) return; await dormir(20); }
  throw new Error(`Tiempo agotado esperando: ${desc}`);
}
const afirmar = (c, msg) => { if (!c) throw new Error(msg); };

function jugador(red, id, nick, extra = {}) {
  const transporte = red.unir(extra.red);
  const s = crearSesion({ transporte, jugadorId: id, nick, tiempos: { ...TIEMPOS, ...extra.tiempos }, version: extra.version });
  s.transporte = transporte;
  s.avisos = [];
  s.versiones = [];
  s.on('aviso', (m) => s.avisos.push(m));
  s.on('version', (v) => s.versiones.push(v));
  return s;
}
// Todos los vivos ven el mismo anfitrión y la misma etiqueta.
const deAcuerdo = (ss) => {
  const e = ss[0].etiqueta;
  return ss.every((s) => s.sincronizado && s.etiqueta.host === e.host && s.etiqueta.term === e.term && s.etiqueta.seq === e.seq);
};
const hosts = (ss) => ss.filter((s) => s.soyHost()).length;

const pruebas = {
  async 'Chat: el mensaje llega a los demás con el nick, recortado y sin eco'() {
    const red = crearRed();
    const ss = ['A', 'B', 'C'].map((n) => jugador(red, 'j' + n, n));
    await esperarHasta(() => deAcuerdo(ss) && conectados(ss[0].estado).length === 3, 5000, 'acuerdo entre 3');
    const recibidos = ss.map(() => []);
    ss.forEach((s, i) => s.on('chat', (id, nick, texto) => recibidos[i].push({ id, nick, texto })));
    ss[0].chat('hola ' + 'x'.repeat(500));
    await esperarHasta(() => recibidos[1].length === 1 && recibidos[2].length === 1, 3000, 'chat en B y C');
    afirmar(recibidos[0].length === 0, 'el emisor no debe recibir su propio mensaje');
    afirmar(recibidos[1][0].nick === 'A' && recibidos[1][0].id === 'jA', 'nick o id incorrectos');
    afirmar(recibidos[1][0].texto.length === 200, 'el texto debe recortarse a 200 caracteres');
    ss.forEach((s) => s.salir());
  },

  async 'Arranque simultáneo: un solo anfitrión y todos dentro'() {
    const red = crearRed();
    const ss = ['A', 'B', 'C'].map((n) => jugador(red, 'j' + n, n));
    await esperarHasta(() => deAcuerdo(ss) && hosts(ss) === 1 && conectados(ss[0].estado).length === 3, 5000, 'acuerdo entre 3');
    ss.forEach((s) => s.salir());
  },

  async 'Dos piden el mismo rol a la vez: solo uno lo consigue'() {
    const red = crearRed();
    const ss = [jugador(red, 'jA', 'A'), jugador(red, 'jB', 'B')];
    await esperarHasta(() => deAcuerdo(ss) && conectados(ss[0].estado).length === 2);
    ss.forEach((s) => s.intentar('elegirRol', { rol: 'ciencia' }));
    await esperarHasta(() => deAcuerdo(ss) && ss.every((s) => s.pendientes() === 0));
    const conRol = Object.values(ss[0].estado.jugadores).filter((j) => j.rol === 'ciencia');
    afirmar(conRol.length === 1, `ciencia la tienen ${conRol.length}`);
    afirmar(ss.some((s) => s.avisos.length > 0), 'el perdedor no recibió aviso');
    ss.forEach((s) => s.salir());
  },

  async 'El anfitrión se va con una intención en vuelo'() {
    const red = crearRed({ descubrimiento: [20, 80] }); // más rápido que esperaHost: A sigue siendo el anfitrión
    const a = jugador(red, 'jA', 'A');
    await esperarHasta(() => a.soyHost());
    const b = jugador(red, 'jB', 'B'), c = jugador(red, 'jC', 'C');
    await esperarHasta(() => deAcuerdo([a, b, c]) && conectados(a.estado).length === 3);
    afirmar(a.soyHost(), 'preparación: A tendría que ser el anfitrión');
    b.intentar('elegirRol', { rol: 'vuelo' });
    a.salir();
    const vivos = [b, c];
    await esperarHasta(() => deAcuerdo(vivos) && hosts(vivos) === 1 && b.yo()?.rol === 'vuelo', 5000, 'relevo y rol aplicado');
    afirmar(b.etiqueta.term >= 2, 'el term no subió');
    afirmar(!b.estado.jugadores.jA?.conectado, 'A sigue marcado como conectado');
    vivos.forEach((s) => s.salir());
  },

  async 'Recargar la página conserva el rol'() {
    const red = crearRed();
    const a = jugador(red, 'jA', 'A');
    await esperarHasta(() => a.soyHost());
    let b = jugador(red, 'jB', 'B');
    await esperarHasta(() => deAcuerdo([a, b]) && b.yo());
    a.intentar('elegirRol', { rol: 'ciencia' });
    b.intentar('elegirRol', { rol: 'potencia' });
    await esperarHasta(() => a.yo()?.rol && b.yo()?.rol);
    a.intentar('iniciarMision');
    await esperarHasta(() => b.estado.fase === 'briefing');
    b.salir();
    await esperarHasta(() => a.estado.jugadores.jB && !a.estado.jugadores.jB.conectado, 3000, 'B desconectado');
    b = jugador(red, 'jB', 'B'); // misma identidad, conexión nueva
    await esperarHasta(() => deAcuerdo([a, b]) && b.yo()?.conectado && b.yo()?.rol === 'potencia', 4000, 'B recupera su rol');
    [a, b].forEach((s) => s.salir());
  },

  async 'Recargar el anfitrión: el otro toma el relevo y el anfitrión vuelve con su rol'() {
    const red = crearRed();
    let a = jugador(red, 'jA', 'A');
    await esperarHasta(() => a.soyHost());
    const b = jugador(red, 'jB', 'B');
    await esperarHasta(() => deAcuerdo([a, b]) && b.yo());
    a.intentar('elegirRol', { rol: 'ciencia' });
    await esperarHasta(() => b.estado.jugadores.jA?.rol === 'ciencia');
    a.salir();
    await esperarHasta(() => b.soyHost(), 3000, 'B anfitrión');
    a = jugador(red, 'jA', 'A');
    await esperarHasta(() => deAcuerdo([a, b]) && a.yo()?.rol === 'ciencia' && a.yo()?.conectado, 4000, 'A vuelve con ciencia');
    afirmar(b.soyHost() && !a.soyHost(), 'el anfitrión debería seguir siendo B');
    [a, b].forEach((s) => s.salir());
  },

  async 'Quinto jugador: la sala está llena'() {
    const red = crearRed();
    const ss = ['A', 'B', 'C', 'D'].map((n) => jugador(red, 'j' + n, n));
    await esperarHasta(() => deAcuerdo(ss) && conectados(ss[0].estado).length === 4, 5000);
    const e = jugador(red, 'jE', 'E');
    await esperarHasta(() => e.avisos.some((m) => /llena/.test(m)), 4000, 'aviso de sala llena');
    afirmar(!ss[0].estado.jugadores.jE, 'E entró igualmente');
    [...ss, e].forEach((s) => s.salir());
  },

  async 'Versión distinta: se avisa y no se mezcla'() {
    const red = crearRed();
    const a = jugador(red, 'jA', 'A');
    await esperarHasta(() => a.soyHost());
    const viejo = jugador(red, 'jV', 'V', { version: 999 });
    await esperarHasta(() => a.versiones.length > 0 && viejo.versiones.length > 0, 3000, 'aviso de versión');
    afirmar(!a.estado.jugadores.jV, 'el de otra versión entró en la sala');
    [a, viejo].forEach((s) => s.salir());
  },

  async 'Iniciar misión exige que todos tengan rol'() {
    const red = crearRed();
    const ss = [jugador(red, 'jA', 'A'), jugador(red, 'jB', 'B')];
    await esperarHasta(() => deAcuerdo(ss) && conectados(ss[0].estado).length === 2);
    ss[0].intentar('elegirRol', { rol: 'vuelo' });
    await esperarHasta(() => ss[0].yo()?.rol === 'vuelo');
    ss[0].intentar('iniciarMision');
    await esperarHasta(() => ss[0].avisos.length > 0, 3000, 'rechazo');
    afirmar(ss[0].estado.fase === 'lobby', 'empezó sin todos los roles');
    ss[1].intentar('elegirRol', { rol: 'comms' });
    await esperarHasta(() => ss[1].yo()?.rol === 'comms');
    ss[0].intentar('iniciarMision');
    await esperarHasta(() => ss.every((s) => s.estado.fase === 'briefing') && Number.isInteger(ss[1].estado.semilla));
    ss.forEach((s) => s.salir());
  },

  async 'Cada rol solo escribe en su propio taller'() {
    const red = crearRed();
    const ss = [jugador(red, 'jA', 'A'), jugador(red, 'jB', 'B')];
    await esperarHasta(() => deAcuerdo(ss) && conectados(ss[0].estado).length === 2);
    ss[0].intentar('elegirRol', { rol: 'ciencia' });
    ss[1].intentar('elegirRol', { rol: 'potencia' });
    await esperarHasta(() => ss.every((s) => s.yo()?.rol));
    ss[0].intentar('iniciarMision');
    await esperarHasta(() => ss[1].estado.fase === 'briefing');
    ss[1].intentar('editarPropio', { clave: 'bateria', valor: { wh: 120 } });
    await esperarHasta(() => ss[0].estado.porRol.potencia.bateria?.wh === 120);
    afirmar(!('bateria' in ss[0].estado.porRol.ciencia), 'se escribió en el taller de otro rol');
    ss.forEach((s) => s.salir());
  },

  async 'Dos anfitriones que se descubren tarde se fusionan sin perder roles'() {
    const red = crearRed();
    const a = jugador(red, 'jA', 'A', { red: { descubrimiento: [900, 1000] } });
    const b = jugador(red, 'jB', 'B', { red: { descubrimiento: [900, 1000] } });
    await esperarHasta(() => a.soyHost() && b.soyHost(), 2000, 'cada uno anfitrión de sí mismo');
    a.intentar('elegirRol', { rol: 'ciencia' });
    b.intentar('elegirRol', { rol: 'vuelo' });
    await esperarHasta(() => deAcuerdo([a, b]) && hosts([a, b]) === 1 && conectados(a.estado).length === 2, 5000, 'fusión');
    await esperarHasta(() => a.yo()?.rol === 'ciencia' && b.yo()?.rol === 'vuelo', 3000, 'roles conservados');
    [a, b].forEach((s) => s.salir());
  },

  async 'Un recién llegado con id menor no reinicia una partida en curso'() {
    const red = crearRed({ descubrimiento: [20, 80] });
    const z = jugador(red, 'jZ', 'Z');
    await esperarHasta(() => z.soyHost());
    const y = jugador(red, 'jY', 'Y');
    await esperarHasta(() => deAcuerdo([z, y]) && y.yo());
    z.intentar('elegirRol', { rol: 'vuelo' });
    y.intentar('elegirRol', { rol: 'comms' });
    await esperarHasta(() => z.yo()?.rol && y.yo()?.rol);
    z.intentar('iniciarMision');
    await esperarHasta(() => y.estado.fase === 'briefing');
    z.intentar('marcarPizarra', { id: 'tareas' });
    await esperarHasta(() => y.estado.briefing.tareas === true);
    const semilla = z.estado.semilla;
    afirmar(z.soyHost(), 'preparación: Z tendría que ser el anfitrión');
    // jA tiene un id menor que jZ y tarda en descubrir a los demás: se nombra anfitrión con el estado vacío.
    const a = jugador(red, 'jA', 'A', { red: { descubrimiento: [900, 1000] } });
    await esperarHasta(() => a.soyHost(), 2000, 'A anfitrión de sí mismo');
    await esperarHasta(() => deAcuerdo([z, y, a]) && a.yo(), 5000, 'fusión');
    for (const s of [z, y, a]) {
      afirmar(s.estado.fase === 'briefing', 'se perdió la fase');
      afirmar(s.estado.semilla === semilla, 'se perdió la semilla');
      afirmar(s.estado.briefing.tareas === true, 'se perdió la pizarra');
    }
    afirmar(z.soyHost(), 'el anfitrión debería seguir siendo Z');
    [z, y, a].forEach((s) => s.salir());
  },

  async 'El anfitrión vuelve antes de que se note su salida'() {
    const red = crearRed({ retrasoSalida: [1500, 1600], descubrimiento: [20, 80] });
    let z = jugador(red, 'jZ', 'Z');
    await esperarHasta(() => z.soyHost());
    const y = jugador(red, 'jY', 'Y');
    await esperarHasta(() => deAcuerdo([z, y]) && y.yo());
    z.intentar('elegirRol', { rol: 'vuelo' });
    y.intentar('elegirRol', { rol: 'comms' });
    await esperarHasta(() => z.yo()?.rol && y.yo()?.rol);
    z.intentar('iniciarMision');
    await esperarHasta(() => y.estado.fase === 'briefing');
    afirmar(z.soyHost(), 'preparación: Z tendría que ser el anfitrión');
    z.salir();
    z = jugador(red, 'jZ', 'Z', { red: { descubrimiento: [50, 100] } }); // recarga rápida
    await esperarHasta(() => deAcuerdo([z, y]) && z.yo()?.conectado && z.yo()?.rol === 'vuelo', 5000, 'Z vuelve con su rol');
    afirmar(z.estado.fase === 'briefing', 'se perdió la fase');
    afirmar(y.soyHost() && y.etiqueta.term >= 2, 'Y debería haber tomado el relevo');
    [z, y].forEach((s) => s.salir());
  },

  // Tras un corte largo, los demás lo dieron por perdido pero él los sigue teniendo en `pares`:
  // tiene que responder a su saludo aunque no sea "nuevo" para él, o nunca lo vuelven a registrar.
  async 'Vuelve tras un corte largo: los demás lo registran otra vez'() {
    const red = crearRed({ descubrimiento: [20, 80] });
    const rapido = { tiempos: { sinSaludo: 1000 } }; // para cazar el aviso falso de "otra versión"
    const a = jugador(red, 'jA', 'A', rapido);
    await esperarHasta(() => a.soyHost());
    const b = jugador(red, 'jB', 'B', rapido);
    await esperarHasta(() => deAcuerdo([a, b]) && b.yo());
    b.transporte.aislar();
    await esperarHasta(() => a.estado.jugadores.jB && !a.estado.jugadores.jB.conectado, 3000, 'A da a B por desconectado');
    b.transporte.reconectar();
    await esperarHasta(() => deAcuerdo([a, b]) && a.estado.jugadores.jB?.conectado, 3000, 'A vuelve a registrar a B');
    b.intentar('elegirRol', { rol: 'comms' });
    await esperarHasta(() => a.estado.jugadores.jB?.rol === 'comms', 3000, 'A acepta las intenciones de B');
    await dormir(1500);
    afirmar(!a.versiones.length && !b.versiones.length, 'aviso falso de otra versión');
    [a, b].forEach((s) => s.salir());
  },

  async 'El anfitrión vuelve tras un corte largo: se une a la sala nueva'() {
    const red = crearRed({ descubrimiento: [20, 80] });
    const rapido = { tiempos: { sinSaludo: 1000 } };
    const a = jugador(red, 'jA', 'A', rapido);
    await esperarHasta(() => a.soyHost());
    const b = jugador(red, 'jB', 'B', rapido);
    await esperarHasta(() => deAcuerdo([a, b]) && b.yo());
    a.intentar('elegirRol', { rol: 'vuelo' });
    await esperarHasta(() => b.estado.jugadores.jA?.rol === 'vuelo');
    a.transporte.aislar();
    await esperarHasta(() => b.soyHost(), 3000, 'B toma el relevo');
    a.transporte.reconectar();
    await esperarHasta(() => deAcuerdo([a, b]) && hosts([a, b]) === 1 && a.yo()?.conectado && a.yo()?.rol === 'vuelo', 4000, 'A vuelve con su rol');
    afirmar(b.soyHost(), 'el anfitrión debería seguir siendo B');
    await dormir(1500);
    afirmar(!a.versiones.length && !b.versiones.length, 'aviso falso de otra versión');
    [a, b].forEach((s) => s.salir());
  },

  async 'Intención malformada: el anfitrión la ignora sin romperse'() {
    const red = crearRed();
    const a = jugador(red, 'jA', 'A');
    await esperarHasta(() => a.soyHost());
    const t = red.unir();
    t.alRecibir(() => {}); t.alSalir(() => {});
    t.alEntrar((p) => {
      t.enviar('hola', { v: 2, jugadorId: 'jM', nick: 'M', etiqueta: { term: 0, host: null, seq: 0 } }, p);
      setTimeout(() => {
        t.enviar('intent', { v: 2, jugadorId: 'jM' }, p);
        t.enviar('intent', { v: 2, jugadorId: 'jM', intencion: { id: 'x', tipo: 'unirse', payload: { nick: 'M' } } }, p);
        t.enviar('intent', { v: 2, jugadorId: 'jM', intencion: { id: 5, tipo: 'unirse', payload: 'texto' } }, p);
      }, 100);
    });
    await dormir(800);
    afirmar(a.soyHost() && !a.estado.jugadores.jM, 'el anfitrión aceptó basura');
    const b = jugador(red, 'jB', 'B');
    await esperarHasta(() => deAcuerdo([a, b]) && b.yo(), 3000, 'el anfitrión sigue funcionando');
    [a, b].forEach((s) => s.salir()); t.salir();
  },

  async 'Intenciones repetidas por red lenta se aplican una sola vez'() {
    const red = crearRed({ retrasoMin: 200, retrasoMax: 300 }); // más lento que el reintento (150 ms)
    const ss = [jugador(red, 'jA', 'A'), jugador(red, 'jB', 'B')];
    await esperarHasta(() => deAcuerdo(ss) && conectados(ss[0].estado).length === 2, 8000);
    ss[0].intentar('elegirRol', { rol: 'ciencia' });
    ss[1].intentar('elegirRol', { rol: 'potencia' });
    await esperarHasta(() => ss.every((s) => s.yo()?.rol), 8000);
    const cliente = ss.find((s) => !s.soyHost());
    (ss.find((s) => s.soyHost())).intentar('iniciarMision');
    await esperarHasta(() => cliente.estado.fase === 'briefing', 8000);
    cliente.intentar('marcarPizarra', { id: 'tareas' });
    await esperarHasta(() => cliente.pendientes() === 0 && deAcuerdo(ss), 8000);
    await dormir(800);
    afirmar(cliente.estado.briefing.tareas === true, 'la casilla cambió dos veces (se aplicó repetida)');
    ss.forEach((s) => s.salir());
  },
};

// ---------- Ejecutor ----------
const lista = document.getElementById('resultados');
let ok = 0, fallos = 0;
// ?solo=texto ejecuta solo las pruebas cuyo nombre lo contiene; ?veces=N las repite (para cazar fallos intermitentes).
const params = new URLSearchParams(location.search);
const solo = params.get('solo')?.toLowerCase();
const veces = Number(params.get('veces')) || 1;
const elegidas = Object.entries(pruebas).filter(([n]) => !solo || n.toLowerCase().includes(solo));
for (const [nombre, f] of Array.from({ length: veces }, () => elegidas).flat()) {
  const li = document.createElement('li');
  li.textContent = `… ${nombre}`;
  lista.appendChild(li);
  const t0 = performance.now();
  try {
    await f();
    ok++;
    li.textContent = `✔ ${nombre} (${Math.round(performance.now() - t0)} ms)`;
    li.className = 'ok';
  } catch (e) {
    fallos++;
    li.textContent = `✘ ${nombre}: ${e.message}`;
    li.className = 'fallo';
    console.error(nombre, e);
  }
  await dormir(100);
}
document.getElementById('resumen').textContent = `${ok} correctas, ${fallos} con fallo`;
window.__resultado = { ok, fallos, detalle: [...lista.children].map((li) => li.textContent) };
