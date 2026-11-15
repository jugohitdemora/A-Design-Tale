// Pruebas del transporte MQTT (src/red/transporte-mqtt.js) sobre brokers falsos en memoria (broker-falso.js),
// solas y con la sesión real encima. Se ejecutan desde pruebas/index.html, después de las del protocolo.
// ?solo=texto filtra por nombre (todas empiezan por "MQTT ·"), ?veces=N las repite y ?lento=K multiplica todos
// los tiempos por K (si una prueba falla con 1 y pasa con 3, era un artefacto de la aceleración, no un fallo real).
import { crearTransporteMqtt } from '../src/red/transporte-mqtt.js';
import { crearSesion } from '../src/red/sesion.js';
import { conectados } from '../src/red/protocolo.js';
import { crearRedMqtt } from './broker-falso.js';

const params = new URLSearchParams(location.search);
const F = Math.max(1, Number(params.get('lento')) || 1);
const esc = (ms) => ms * F;

// Tiempos acelerados con las mismas proporciones que producción (tic:latido:eco = 1:4:10; ver TIEMPOS en el transporte).
const TT = { tic: 50 * F, latido: 200 * F, eco: 500 * F, pres: 40 * F };
const ESPERA = 4 * TT.latido; // un par callado caduca tras 4 ecos de mis latidos
const TS = { esperaHost: 300 * F, reintento: 150 * F, esperaRelevo: 400 * F, sinSaludo: 1000 * F };
const URLS = ['wss://a.test/mqtt', 'wss://b.test/mqtt', 'wss://c.test/mqtt'];

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
async function esperarHasta(cond, ms = esc(4000), desc = 'condición') {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) { if (cond()) return; await dormir(20); }
  throw new Error(`Tiempo agotado esperando: ${desc}`);
}
const afirmar = (c, msg) => { if (!c) throw new Error(msg); };
const cuantos = (lista, f) => lista.filter(f).length;

// ---------- Contexto de cada prueba: su propia red de brokers y limpieza garantizada ----------
function contexto() {
  const red = crearRedMqtt();
  const abiertos = [];
  let ultimo = performance.now(), deriva = 0;
  // Si el hilo se atasca más de ~2 tics, el transporte puede tomarlo por un corte propio y falsear la prueba.
  const vigia = setInterval(() => { const t = performance.now(); deriva = Math.max(deriva, t - ultimo - 25); ultimo = t; }, 25);

  const nuevoTransporte = (id, { brokers = URLS, tiempos } = {}) => crearTransporteMqtt('juego', 'SALA1', {
    brokers, conectar: red.conectar, ventana: null, selfId: 'p' + id, tiempos: { ...TT, ...tiempos },
    cadaTic: (f, ms) => { const i = setInterval(f, ms); return () => clearInterval(i); },
  });
  // Anota entradas y salidas del transporte aunque la sesión registre sus propios oyentes después.
  function anotar(t, p) {
    const alEntrar = t.alEntrar, alSalir = t.alSalir;
    t.alEntrar = (f) => alEntrar((x) => { p.entradas.push(x); f(x); });
    t.alSalir = (f) => alSalir((x) => { p.salidas.push(x); f(x); });
  }

  const c = {
    red,
    deriva: () => deriva,
    // Solo transporte. `recibidos` guarda { tipo, datos, de } de cada mensaje de sesión entregado.
    par(id, opciones) {
      const t = nuevoTransporte(id, opciones);
      const p = { id, selfId: 'p' + id, t, entradas: [], salidas: [], recibidos: [] };
      anotar(t, p);
      t.alEntrar(() => {}); t.alSalir(() => {});
      t.alRecibir((tipo, datos, de) => p.recibidos.push({ tipo, datos, de }));
      abiertos.push(() => t.salir());
      return p;
    },
    // Sesión real sobre el transporte.
    sesion(id, nick, { brokers, tiempos } = {}) {
      const t = nuevoTransporte(id, { brokers });
      const p = { entradas: [], salidas: [] };
      anotar(t, p);
      const s = crearSesion({ transporte: t, jugadorId: 'j' + id, nick, tiempos: { ...TS, ...tiempos } });
      Object.assign(s, { id, selfId: 'p' + id, t, entradas: p.entradas, salidas: p.salidas, avisos: [], versiones: [] });
      s.on('aviso', (m) => s.avisos.push(m));
      s.on('version', (v) => s.versiones.push(v));
      abiertos.push(() => s.salir());
      return s;
    },
    cerrar() {
      clearInterval(vigia);
      for (const f of abiertos) { try { f(); } catch { /* ya cerrado */ } }
      red.cerrarTodo();
    },
  };
  return c;
}

// Todos los vivos ven el mismo anfitrión y la misma etiqueta.
const deAcuerdo = (ss) => {
  const e = ss[0].etiqueta;
  return ss.every((s) => s.sincronizado && s.etiqueta.host === e.host && s.etiqueta.term === e.term && s.etiqueta.seq === e.seq);
};
const hosts = (ss) => ss.filter((s) => s.soyHost()).length;
const sinVersiones = (ss) => ss.every((s) => !s.versiones.length);
const todosSeVen = (ps) => ps.every((p) => p.t.pares().length === ps.length - 1);

// Cada uno difunde `n` mensajes con la clave `k`; devuelve cuántos mensajes de otros debe ver cada par.
const difundirTodos = (ps, n) => { for (const p of ps) for (let k = 0; k < n; k++) p.t.enviar('intent', { k }); };
const entregaUnica = (ps, n) => {
  for (const p of ps) {
    for (const q of ps) {
      if (p === q) continue;
      for (let k = 0; k < n; k++) {
        const veces = cuantos(p.recibidos, (r) => r.tipo === 'intent' && r.de === q.selfId && r.datos.k === k);
        if (veces !== 1) return `${p.id} recibió ${veces} veces el mensaje ${k} de ${q.id}`;
      }
    }
    if (cuantos(p.recibidos, (r) => r.de === p.selfId)) return `${p.id} recibió eco de sí mismo`;
  }
  return null;
};
async function repartoCompleto(ps, n) {
  difundirTodos(ps, n);
  await esperarHasta(() => ps.every((p) => cuantos(p.recibidos, (r) => r.tipo === 'intent') === n * (ps.length - 1)), esc(5000), 'todos los mensajes entregados');
  await dormir(esc(400)); // margen para que lleguen los duplicados por los otros brokers
  const fallo = entregaUnica(ps, n);
  afirmar(!fallo, fallo);
}

const pruebas = {
  async 'MQTT · tres brokers, cuatro pares: descubrimiento, entrega única, dirigido y sin eco'(c) {
    const ps = ['A', 'B', 'C', 'D'].map((i) => c.par(i));
    await esperarHasta(() => todosSeVen(ps), esc(4000), 'descubrimiento mutuo');
    afirmar(ps.every((p) => p.t.enLinea().listos === 3), 'no están los tres brokers en uso');
    for (const p of ps) for (const q of ps) if (p !== q) afirmar(p.entradas.includes(q.selfId), `${p.id} no vio entrar a ${q.id}`);
    await repartoCompleto(ps, 10);
    // Dirigido: solo lo recibe el destinatario, una vez, aunque se publique en los tres brokers.
    ps[0].t.enviar('aviso', { solo: 'B' }, ps[1].selfId);
    await esperarHasta(() => cuantos(ps[1].recibidos, (r) => r.tipo === 'aviso') > 0, esc(2000), 'mensaje dirigido');
    await dormir(esc(300));
    afirmar(cuantos(ps[1].recibidos, (r) => r.tipo === 'aviso') === 1, 'el dirigido llegó repetido');
    afirmar([0, 2, 3].every((i) => !cuantos(ps[i].recibidos, (r) => r.tipo === 'aviso')), 'el dirigido llegó a quien no era');
    afirmar(ps.every((p) => !p.salidas.length), 'alguien dio a otro por salido sin motivo');
  },

  async 'MQTT · un broker caído desde el principio: descubrimiento y mensajes igual'(c) {
    c.red.caer(URLS[2]);
    const ps = ['A', 'B', 'C', 'D'].map((i) => c.par(i));
    await esperarHasta(() => todosSeVen(ps), esc(4000), 'descubrimiento con un broker caído');
    afirmar(ps.every((p) => p.t.enLinea().listos === 2 && p.t.enLinea().total === 3), 'enLinea debería ser 2 de 3');
    await repartoCompleto(ps, 10);
    // Cuando el broker vuelve, se incorpora solo y nada se rompe.
    c.red.levantar(URLS[2]);
    await esperarHasta(() => ps.every((p) => p.t.enLinea().listos === 3), esc(3000), 'el broker caído se incorpora');
    ps[0].t.enviar('intent', { k: 99 });
    await esperarHasta(() => ps.slice(1).every((p) => cuantos(p.recibidos, (r) => r.datos.k === 99) === 1), esc(2000), 'mensaje tras la vuelta');
    afirmar(ps.every((p) => !p.salidas.length), 'alguien dio a otro por salido sin motivo');
  },

  async 'MQTT · un broker pierde el 40 % de los mensajes: llega todo por los otros'(c) {
    c.red.perdida(URLS[1], 0.4);
    const ps = ['A', 'B', 'C', 'D'].map((i) => c.par(i));
    await esperarHasta(() => todosSeVen(ps), esc(4000), 'descubrimiento');
    await repartoCompleto(ps, 40);
    afirmar(c.red.publicaciones(URLS[1]).length > 100, 'preparación: el broker con pérdidas casi no se usó');
    afirmar(ps.every((p) => !p.salidas.length), 'alguien dio a otro por salido sin motivo');
  },

  async 'MQTT · Last Will de un solo broker: el par sigue vivo por los demás, sin alSalir'(c) {
    const [A, B, C] = ['A', 'B', 'C'].map((i) => c.par(i));
    await esperarHasta(() => todosSeVen([A, B, C]), esc(4000), 'descubrimiento');
    c.red.cortar(A.selfId, URLS[0]); // solo el primer broker pierde a A: publica su Last Will
    afirmar(c.red.sobres(URLS[0]).some((s) => s.will && s.d === A.selfId), 'preparación: el broker no publicó el Last Will');
    // Prueba de que B lo oyó: pregunta a A (dirigido, con q) para comprobar que sigue vivo por los otros brokers.
    await esperarHasta(() => c.red.sobres(URLS[1]).some((s) => s.d === B.selfId && s.q === 1 && s.tema.endsWith('/a/' + A.selfId)),
      esc(2000), 'B reacciona al Last Will preguntando a A');
    await dormir(ESPERA + esc(1000)); // bastante más que 4 latidos
    afirmar(!B.salidas.length && !C.salidas.length, 'se dio por salido a un par que seguía vivo por otros brokers');
    afirmar(B.t.pares().includes(A.selfId) && C.t.pares().includes(A.selfId), 'A desapareció de los pares');
    afirmar(A.t.enLinea().listos === 2, 'A debería usar solo 2 brokers');
    A.t.enviar('intent', { k: 7 });
    await esperarHasta(() => cuantos(B.recibidos, (r) => r.datos.k === 7) === 1 && cuantos(C.recibidos, (r) => r.datos.k === 7) === 1, esc(2000), 'A sigue enviando');
    c.red.restaurar(A.selfId, URLS[0]);
    await esperarHasta(() => A.t.enLinea().listos === 3, esc(3000), 'A recupera el broker');
  },

  async 'MQTT · corte sin despedida: alSalir llega; con salir() llega al instante'(c) {
    const ps = ['A', 'B', 'C', 'D'].map((i) => c.par(i));
    const [A, B, C, D] = ps;
    await esperarHasta(() => todosSeVen(ps), esc(4000), 'descubrimiento');
    c.red.cortar(A.selfId); // todos sus sockets, sin DISCONNECT
    afirmar(c.red.sobres(URLS[0]).some((s) => s.will && s.d === A.selfId), 'preparación: no hubo Last Will');
    await esperarHasta(() => [B, C, D].every((p) => p.salidas.includes(A.selfId)), esc(8000), 'alSalir de A en los demás');
    await dormir(esc(300));
    afirmar([B, C, D].every((p) => cuantos(p.salidas, (x) => x === A.selfId) === 1), 'alSalir de A llegó más de una vez');
    afirmar([B, C, D].every((p) => !p.t.pares().includes(A.selfId)), 'A sigue en pares');
    // Despedida explícita: no espera a ningún tiempo de espera (bastante menos que un latido).
    const t0 = performance.now();
    D.t.salir();
    await esperarHasta(() => B.salidas.includes(D.selfId) && C.salidas.includes(D.selfId), TT.latido, 'alSalir inmediato tras salir()');
    afirmar(performance.now() - t0 < TT.latido, 'la despedida explícita tardó demasiado');
    afirmar(!c.red.sobres(URLS[0]).some((s) => s.will && s.d === D.selfId), 'salir() no debería disparar el Last Will');
  },

  async 'MQTT · duplicado tardío tras una despedida no resucita al par'(c) {
    const brokers = [URLS[0], URLS[1]];
    const [A, B] = ['A', 'B'].map((i) => c.par(i, { brokers }));
    await esperarHasta(() => todosSeVen([A, B]), esc(4000), 'descubrimiento');
    await dormir(esc(100));
    // Un mensaje que B no ve por el broker rápido (se pierde) y le llega tarde por el lento, con nº anterior a la despedida.
    c.red.retraso(URLS[1], [esc(600), esc(600)]);
    c.red.perdida(URLS[0], 1);
    A.t.enviar('intent', { k: 1 });
    c.red.perdida(URLS[0], 0);
    A.t.salir(); // despedida por el broker rápido: llega ya
    await esperarHasta(() => B.salidas.includes(A.selfId), esc(400), 'B ve la despedida de A');
    const entradas = cuantos(B.entradas, (x) => x === A.selfId);
    await dormir(esc(1000)); // el broker lento entrega ahora el mensaje viejo y la despedida duplicada
    afirmar(!B.t.pares().includes(A.selfId), 'el duplicado tardío resucitó a A');
    afirmar(cuantos(B.entradas, (x) => x === A.selfId) === entradas, 'alEntrar volvió a saltar para A');
    afirmar(!cuantos(B.recibidos, (r) => r.datos?.k === 1), 'se entregó un mensaje anterior a la despedida');
    afirmar(cuantos(B.salidas, (x) => x === A.selfId) === 1, 'alSalir de A llegó más de una vez');
  },

  async 'MQTT · presencia: se fusiona, respeta el límite y va por un solo broker'(c) {
    const [A, B] = ['A', 'B'].map((i) => c.par(i));
    await esperarHasta(() => todosSeVen([A, B]), esc(4000), 'descubrimiento');
    const pres = (url) => c.red.sobres(url).filter((s) => s.t === 'pres' && s.d === A.selfId).length;
    const recibidas = () => cuantos(B.recibidos, (r) => r.tipo === 'pres');
    // Ráfaga: 100 envíos en unos 500 ms con los tres brokers.
    async function rafaga(n, cada) {
      const t0 = performance.now();
      for (let i = 0; i < n; i++) { A.t.enviar('pres', { i }); await dormir(cada); }
      return performance.now() - t0;
    }
    let antes = recibidas();
    let ms = await rafaga(100, 5);
    await esperarHasta(() => B.recibidos.filter((r) => r.tipo === 'pres').at(-1)?.datos.i === 99, esc(1000), 'llega la última presencia');
    let n = recibidas() - antes;
    afirmar(n >= 2 && n <= ms / TT.pres + 2, `con 3 brokers llegaron ${n} presencias en ${Math.round(ms)} ms (máx. ${Math.floor(ms / TT.pres + 2)})`);
    afirmar(pres(URLS[0]) === n && !pres(URLS[1]) && !pres(URLS[2]), 'la presencia no va solo por el primer broker de la lista');
    // Cae el primero: pasa al siguiente listo, y solo a ese.
    c.red.caer(URLS[0]);
    const en0 = pres(URLS[0]);
    antes = recibidas();
    await rafaga(20, 10);
    await esperarHasta(() => B.recibidos.filter((r) => r.tipo === 'pres').at(-1)?.datos.i === 19, esc(1000), 'la presencia sigue por el segundo broker');
    afirmar(pres(URLS[0]) === en0 && pres(URLS[1]) >= 2 && !pres(URLS[2]), 'con el primero caído no va por el segundo y solo por el segundo');
    // Con un único broker vivo, a la mitad de ritmo.
    c.red.caer(URLS[1]);
    const en2 = pres(URLS[2]);
    ms = await rafaga(100, 5);
    await esperarHasta(() => B.recibidos.filter((r) => r.tipo === 'pres').at(-1)?.datos.i === 99, esc(1000), 'la última presencia llega por el único broker');
    n = pres(URLS[2]) - en2;
    afirmar(n >= 2 && n <= ms / (2 * TT.pres) + 2, `con un solo broker salieron ${n} presencias en ${Math.round(ms)} ms (máx. ${Math.floor(ms / (2 * TT.pres) + 2)})`);
  },

  async 'MQTT · enLinea refleja los brokers listos (0 cuando todos caen)'(c) {
    const A = c.par('A');
    await esperarHasta(() => A.t.enLinea().listos === 3, esc(3000), 'tres brokers listos');
    afirmar(A.t.enLinea().total === 3, 'total debería ser 3');
    c.red.caer(URLS[0]);
    await esperarHasta(() => A.t.enLinea().listos === 2, esc(1000), 'dos listos');
    c.red.caer(URLS[1]); c.red.caer(URLS[2]);
    await esperarHasta(() => A.t.enLinea().listos === 0, esc(1000), 'ninguno listo');
    afirmar(A.t.enLinea().total === 3, 'total debería seguir en 3');
    A.t.enviar('intent', { k: 1 }); A.t.enviar('pres', { i: 1 }); // sin brokers no lanza ni bloquea
    await dormir(esc(200));
    afirmar(!A.salidas.length && !A.t.pares().length, 'estado raro sin brokers');
    for (const u of URLS) c.red.levantar(u);
    await esperarHasta(() => A.t.enLinea().listos === 3, esc(3000), 'los tres vuelven');
  },
};

// ---------- Mi propio corte: variantes sobre el transporte y con la sesión encima ----------
// Modos: 'corte' (sockets cortados, el broker publica el Last Will), 'zombi' (siguen connected pero mudos; vuelven
// retomando el socket) y 'zombi + reconexión' (mqtt.js detecta el silencio, cierra y reconecta).
const MODOS = ['corte', 'zombi', 'zombi + reconexión'];
const aislar = (c, modo, id) => (modo === 'corte' ? c.red.cortar(id) : c.red.zombi(id));
const volver = (c, modo, id) => {
  if (modo === 'corte') c.red.restaurar(id);
  else if (modo === 'zombi') c.red.revivir(id);
  else c.red.revivirReconectando(id);
};

for (const modo of MODOS) {
  pruebas[`MQTT · mi propio corte (${modo}), transporte: no doy a nadie por salido y reconvergo`] = async (c) => {
    const [A, B, C] = ['A', 'B', 'C'].map((i) => c.par(i));
    await esperarHasta(() => todosSeVen([A, B, C]), esc(4000), 'descubrimiento');
    const entradasA = A.entradas.length;
    aislar(c, modo, A.selfId);
    // Los demás sí dan a A por salido (para que la prueba pruebe algo), tarde o temprano.
    await esperarHasta(() => B.salidas.includes(A.selfId) && C.salidas.includes(A.selfId), esc(8000), 'los demás dan a A por salido');
    await dormir(ESPERA + esc(600)); // A sigue sin red bastante más que la espera
    afirmar(!A.salidas.length, `A dio por salidos a ${A.salidas.join(', ')} durante su propio corte`);
    afirmar(A.t.pares().length === 2, 'A perdió pares durante su propio corte');
    if (modo === 'corte') afirmar(A.t.enLinea().listos === 0, 'en un corte total enLinea debería dar 0');
    volver(c, modo, A.selfId);
    await esperarHasta(() => B.t.pares().includes(A.selfId) && C.t.pares().includes(A.selfId), esc(5000), 'los demás vuelven a ver a A');
    await esperarHasta(() => A.entradas.length >= entradasA + 2, esc(5000), 'A vuelve a saludar a los que conoce');
    await dormir(esc(800));
    afirmar(!A.salidas.length, `A dio por salidos a ${A.salidas.join(', ')} al volver`);
    afirmar(A.t.pares().length === 2 && B.t.pares().length === 2 && C.t.pares().length === 2, 'no reconvergieron los pares');
    afirmar(cuantos(B.salidas, (x) => x === A.selfId) === 1 && cuantos(C.salidas, (x) => x === A.selfId) === 1, 'los demás dieron a A por salido más de una vez');
    A.t.enviar('intent', { k: 5 });
    await esperarHasta(() => [B, C].every((p) => cuantos(p.recibidos, (r) => r.datos.k === 5) === 1), esc(2000), 'A vuelve a enviar');
  };

  pruebas[`MQTT · mi propio corte (${modo}), con sesión: sin anfitrión nuevo ni term+1, reconverge y recupera su rol`] = async (c) => {
    const ss = ['A', 'B', 'C'].map((i) => c.sesion(i, i));
    await esperarHasta(() => deAcuerdo(ss) && hosts(ss) === 1 && conectados(ss[0].estado).length === 3, esc(6000), 'acuerdo entre 3');
    const host = ss.find((s) => s.soyHost()), A = ss.find((s) => !s.soyHost());
    const resto = ss.filter((s) => s !== A);
    A.intentar('elegirRol', { rol: 'ciencia' });
    host.intentar('elegirRol', { rol: 'vuelo' });
    await esperarHasta(() => deAcuerdo(ss) && A.yo()?.rol === 'ciencia' && host.yo()?.rol === 'vuelo', esc(4000), 'roles elegidos');
    const { term, host: idHost } = host.etiqueta;
    const faltas = [];
    const vigia = setInterval(() => {
      if (A.soyHost()) faltas.push('A se nombró anfitrión');
      if (A.etiqueta.term !== term) faltas.push(`A subió term a ${A.etiqueta.term}`);
    }, 20);
    try {
      aislar(c, modo, A.selfId);
      await esperarHasta(() => host.estado.jugadores[A.jugadorId]?.conectado === false, esc(8000), 'el anfitrión da a A por desconectado');
      await esperarHasta(() => resto.every((s) => !s.t.pares().includes(A.selfId)), esc(8000), 'los demás dejan de ver a A');
      await dormir(ESPERA + esc(800)); // A, sin red, mucho más que la espera
      afirmar(!faltas.length, faltas[0]);
      afirmar(!A.salidas.length, `A dio por salidos a ${A.salidas.join(', ')}`);
      afirmar(conectados(A.estado).length === 3, 'A marcó a alguien como desconectado durante su propio corte');
      volver(c, modo, A.selfId);
      await esperarHasta(() => deAcuerdo(ss) && hosts(ss) === 1 && A.yo()?.conectado && host.estado.jugadores[A.jugadorId]?.conectado, esc(8000), 'A reconverge con la sala');
      await dormir(TS.sinSaludo + esc(500)); // más que sinSaludo: un aviso falso de versión ya habría saltado
    } finally { clearInterval(vigia); }
    afirmar(!faltas.length, faltas[0]);
    afirmar(host.soyHost() && host.etiqueta.host === idHost && ss.every((s) => s.etiqueta.term === term), 'cambió el anfitrión o subió term');
    afirmar(A.yo().rol === 'ciencia' && host.yo().rol === 'vuelo', 'se perdió algún rol');
    afirmar(sinVersiones(ss), 'saltó el evento version');
  };
}

pruebas['MQTT · corte del anfitrión: los demás hacen relevo y al volver se rinde conservando su rol'] = async (c) => {
  const A = c.sesion('A', 'A');
  await esperarHasta(() => A.soyHost(), esc(3000), 'A anfitrión');
  const [B, C] = ['B', 'C'].map((i) => c.sesion(i, i));
  const ss = [A, B, C];
  await esperarHasta(() => deAcuerdo(ss) && conectados(A.estado).length === 3, esc(5000), 'acuerdo entre 3');
  afirmar(A.soyHost(), 'preparación: A tendría que ser el anfitrión');
  A.intentar('elegirRol', { rol: 'vuelo' });
  B.intentar('elegirRol', { rol: 'ciencia' });
  await esperarHasta(() => deAcuerdo(ss) && A.yo()?.rol === 'vuelo' && B.yo()?.rol === 'ciencia', esc(4000), 'roles elegidos');
  c.red.cortar(A.selfId);
  await esperarHasta(() => hosts([B, C]) === 1 && deAcuerdo([B, C]) && B.etiqueta.term >= 2, esc(8000), 'relevo entre B y C');
  afirmar(!B.estado.jugadores.jA.conectado, 'A sigue conectado en el estado nuevo');
  // A, sin red, no se entera: sigue creyéndose anfitrión del term 1 y con todos conectados.
  await dormir(esc(500));
  afirmar(A.soyHost() && A.etiqueta.term === 1 && conectados(A.estado).length === 3 && !A.salidas.length, 'A reaccionó a su propio corte');
  c.red.restaurar(A.selfId);
  await esperarHasta(() => deAcuerdo(ss) && hosts(ss) === 1 && !A.soyHost() && A.yo()?.conectado && A.yo()?.rol === 'vuelo', esc(8000), 'A se rinde y recupera su rol');
  afirmar(B.estado.jugadores.jA.conectado && B.yo().rol === 'ciencia', 'el estado final perdió algo');
  await dormir(TS.sinSaludo + esc(500));
  afirmar(sinVersiones(ss), 'saltó el evento version');
};

pruebas['MQTT · cuatro sesiones sobre brokers falsos: un anfitrión, cuatro conectados, rol y misión replicados'] = async (c) => {
  const ss = ['A', 'B', 'C', 'D'].map((i) => c.sesion(i, i));
  await esperarHasta(() => deAcuerdo(ss) && hosts(ss) === 1 && conectados(ss[0].estado).length === 4, esc(8000), 'acuerdo entre 4');
  afirmar(ss.every((s) => conectados(s.estado).length === 4), 'alguien no ve a los 4 conectados');
  const roles = ['vuelo', 'ciencia', 'potencia', 'comms'];
  ss.forEach((s, i) => s.intentar('elegirRol', { rol: roles[i] }));
  await esperarHasta(() => deAcuerdo(ss) && ss.every((s, i) => s.yo()?.rol === roles[i] && s.pendientes() === 0), esc(6000), 'roles replicados');
  for (const s of ss) afirmar(roles.every((r, i) => s.estado.jugadores['j' + 'ABCD'[i]].rol === r), 'un cliente ve roles distintos');
  ss[2].intentar('iniciarMision');
  await esperarHasta(() => deAcuerdo(ss) && ss.every((s) => s.estado.fase === 'briefing' && Number.isInteger(s.estado.semilla)), esc(6000), 'misión iniciada en los cuatro');
  afirmar(new Set(ss.map((s) => s.estado.semilla)).size === 1, 'semillas distintas');
  afirmar(hosts(ss) === 1 && sinVersiones(ss), 'varios anfitriones o evento version');
};

pruebas['MQTT · cuatro sesiones con un broker caído y otro que pierde el 40 %: igual de sólido'] = async (c) => {
  c.red.caer(URLS[0]);
  c.red.perdida(URLS[1], 0.4);
  c.red.retraso(URLS[1], [5, 40]);
  const ss = ['A', 'B', 'C', 'D'].map((i) => c.sesion(i, i));
  await esperarHasta(() => deAcuerdo(ss) && hosts(ss) === 1 && conectados(ss[0].estado).length === 4, esc(10000), 'acuerdo entre 4');
  const roles = ['vuelo', 'ciencia', 'potencia', 'comms'];
  ss.forEach((s, i) => s.intentar('elegirRol', { rol: roles[i] }));
  await esperarHasta(() => deAcuerdo(ss) && ss.every((s, i) => s.yo()?.rol === roles[i] && s.pendientes() === 0), esc(8000), 'roles replicados');
  ss[0].intentar('iniciarMision');
  await esperarHasta(() => deAcuerdo(ss) && ss.every((s) => s.estado.fase === 'briefing'), esc(8000), 'misión iniciada en los cuatro');
  afirmar(sinVersiones(ss), 'saltó el evento version');
};

pruebas['MQTT · resincronización: un estado perdido en todos los brokers se recupera solo'] = async (c) => {
  const A = c.sesion('A', 'A');
  await esperarHasta(() => A.soyHost(), esc(3000), 'A anfitrión');
  const B = c.sesion('B', 'B');
  const ss = [A, B];
  await esperarHasta(() => deAcuerdo(ss) && B.yo(), esc(5000), 'acuerdo');
  await dormir(esc(300));
  // Solo a B se le pierde el `estado` de A, por los tres brokers.
  c.red.descartar(({ texto, para }) => para === B.selfId && JSON.parse(texto).t === 'estado');
  const holasAntes = c.red.sobres(URLS[0]).filter((s) => s.t === 'hola' && s.d === B.selfId).length;
  A.intentar('elegirRol', { rol: 'vuelo' });
  c.red.descartar(null); // la pérdida es de ese único estado
  afirmar(A.yo()?.rol === 'vuelo', 'preparación: A no aplicó su cambio');
  afirmar(B.estado.jugadores.jA.rol !== 'vuelo' && B.etiqueta.seq < A.etiqueta.seq, 'preparación: B no se quedó atrasado');
  // Nadie hace nada más: B se pone al día con su saludo periódico (cada 3 reintentos), sin ser un `hola` de arranque.
  await esperarHasta(() => deAcuerdo(ss) && B.estado.jugadores.jA.rol === 'vuelo', 8 * TS.reintento + esc(500), 'B se pone al día solo');
  const holas = c.red.sobres(URLS[0]).filter((s) => s.t === 'hola' && s.d === B.selfId).slice(holasAntes);
  afirmar(holas.some((s) => s.m.r === 1 && s.tema.endsWith('/a/' + A.selfId)), 'no consta el hola con r:1 de B al anfitrión');
  afirmar(holas.every((s) => s.m.r === 1), 'B saludó sin r (¿reanudar?): la recuperación no fue por la resincronización');
  afirmar(sinVersiones(ss), 'saltó el evento version');
};

// ---------- Ejecutor ----------
// Espera a que termine pruebas.js (comparten la página): las dos suites usan el reloj real y no deben solaparse.
const lista = document.getElementById('resultados-transporte');
const resumen = document.getElementById('resumen');
let ok = 0, fallos = 0;
const solo = params.get('solo')?.toLowerCase();
const veces = Number(params.get('veces')) || 1;
const elegidas = Object.entries(pruebas).filter(([n]) => !solo || n.toLowerCase().includes(solo));
const previo = window.__resultado ?? { ok: 0, fallos: 0, detalle: [] };

if (F > 1) { const aviso = document.createElement('li'); aviso.textContent = `Tiempos multiplicados por ${F} (?lento=${F})`; lista.appendChild(aviso); }
for (const [nombre, f] of Array.from({ length: veces }, () => elegidas).flat()) {
  const li = document.createElement('li');
  li.textContent = `… ${nombre}`;
  lista.appendChild(li);
  const t0 = performance.now();
  const c = contexto();
  let nota = '';
  try {
    await f(c);
    ok++;
    li.className = 'ok';
    li.textContent = `✔ ${nombre} (${Math.round(performance.now() - t0)} ms)`;
  } catch (e) {
    fallos++;
    li.className = 'fallo';
    li.textContent = `✘ ${nombre}: ${e.message} [semilla ${c.red.semilla}]`;
    console.error(nombre, e);
  } finally {
    c.cerrar();
    if (c.deriva() > 2 * TT.tic) { nota = ` ⚠ el hilo se atascó ${Math.round(c.deriva())} ms: el resultado puede estar falseado`; li.textContent += nota; }
  }
  await dormir(100);
}
const total = { ok: previo.ok + ok, fallos: previo.fallos + fallos };
resumen.textContent = `${total.ok} correctas, ${total.fallos} con fallo (protocolo: ${previo.ok + previo.fallos}; transporte MQTT: ${ok + fallos})`;
window.__resultadoTransporte = { ok, fallos, detalle: [...lista.children].map((li) => li.textContent) };
window.__resultadoTotal = total;
window.__pruebasTerminadas = true;
