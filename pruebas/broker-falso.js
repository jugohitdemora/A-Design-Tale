// Brokers MQTT falsos, en memoria, para probar src/red/transporte-mqtt.js sin red.
// Implementan solo el subconjunto de mqtt.js que documenta el transporte (ver su cabecera):
//   conectar(url, opciones) → cliente con .connected, .on('connect' | 'close' | 'error' | 'message'),
//   .subscribe([temas], { qos }, cb), .publish(tema, texto, { qos }) y .end(false).
// Cada prueba crea su propia red (crearRedMqtt) y le pasa `red.conectar` al transporte.
//
// Qué simulan:
//   - Conexión asíncrona; mqtt.js reconecta solo y tras cada reconexión vuelve a emitirse 'connect'.
//   - Las suscripciones se borran en cada desconexión (clean: true) y el SUBACK es asíncrono.
//   - Entrega a los suscriptores del tema exacto, incluido el propio emisor (el eco del que depende el transporte).
//   - Orden FIFO por (broker, receptor), con retraso aleatorio distinto en cada broker.
//   - Last Will: se publica al cortar un cliente sin DISCONNECT; `end(false)` es un cierre limpio y no lo dispara.
//   - Un mensaje publicado justo antes de `end(false)` todavía se entrega (el cierre limpio vacía lo pendiente).
// No simulan (queda fuera del subconjunto): toma de sesión por clientId repetido ni keepalive del broker.

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// opciones: { semilla, reconexion: ms entre intentos de reconexión, retraso: [min, max] ms por entrega (por defecto de cada broker) }
export function crearRedMqtt({ semilla = (Math.random() * 2 ** 31) | 0, reconexion = 60, retraso = [1, 6] } = {}) {
  const azar = mulberry32(semilla);
  const entre = ([a, b]) => a + azar() * (b - a);
  const codificador = new TextEncoder();
  const brokers = new Map();   // url -> broker
  const clientes = new Set();  // todos los clientes creados y no terminados
  const bloqueos = new Set();  // 'clientId|url' o 'clientId|*': no pueden (re)conectar hasta restaurar()
  let descartar = null;        // ({ url, tema, texto, para, de }) → true = esa entrega se pierde

  function broker(url) {
    let b = brokers.get(url);
    if (!b) brokers.set(url, (b = { url, caido: false, perdida: 0, retraso: [...retraso], clientes: new Set(), publicaciones: [] }));
    return b;
  }
  const bloqueado = (id, url) => bloqueos.has(`${id}|*`) || bloqueos.has(`${id}|${url}`);

  // Entrega a cada suscriptor del tema. La pérdida y el retraso se deciden al publicar (de forma síncrona),
  // para que una prueba pueda activarlos justo alrededor de un solo `enviar`.
  function repartir(b, deId, tema, texto) {
    for (const r of b.clientes) {
      if (!r.subs.has(tema) || r.zombi) continue;
      if (descartar?.({ url: b.url, tema, texto, para: r.opc.clientId, de: deId })) continue;
      if (azar() < b.perdida) continue;
      const sesion = r.sesion;
      const cuando = Math.max(Date.now() + entre(b.retraso), r.ultimaEntrega);
      r.ultimaEntrega = cuando;
      setTimeout(() => {
        if (r.sesion === sesion && r.connected && !r.zombi && b.clientes.has(r) && r.subs.has(tema)) {
          r.emitir('message', tema, codificador.encode(texto));
        }
      }, Math.max(0, cuando - Date.now()));
    }
  }

  function crearCliente(url, opc) {
    const b = broker(url);
    const oyentes = {};
    const c = {
      url, opc, connected: false, zombi: false, terminado: false,
      subs: new Set(), sesion: 0, ultimaEntrega: 0, timer: null,
      emitir(ev, ...a) {
        for (const f of oyentes[ev] || []) {
          try { f(...a); } catch (e) { console.error('broker-falso: fallo en un oyente de', ev, e); }
        }
      },
      on(ev, f) { (oyentes[ev] ||= []).push(f); return c; },
      subscribe(temas, o, cb) {
        const s = c.sesion;
        if (!c.connected) { setTimeout(() => cb?.(new Error('sin conexión')), 0); return; }
        if (c.zombi) return; // un socket zombi nunca contesta con SUBACK
        setTimeout(() => {
          if (c.sesion !== s || !c.connected || c.zombi) return;
          for (const t of [].concat(temas)) c.subs.add(t);
          cb?.(null);
        }, entre(b.retraso));
      },
      publish(tema, texto, o) {
        if (!c.connected || c.zombi || c.terminado) return; // sin cola: mqtt.js la descarta con queueQoSZero: false
        b.publicaciones.push({ de: opc.clientId, tema, texto, qos: o?.qos ?? 0 });
        repartir(b, opc.clientId, tema, String(texto));
      },
      end() {
        c.terminado = true;
        clearTimeout(c.timer);
        clientes.delete(c);
        if (c.connected) cerrar(c, false); // cierre limpio: sin Last Will
      },
    };
    clientes.add(c);
    intentar(c);
    return c;
  }

  // Corta el socket: connected pasa a false antes de que se ejecuten los oyentes de 'close'.
  function cerrar(c, conWill) {
    const b = broker(c.url);
    c.connected = false; c.zombi = false; c.sesion++;
    c.subs.clear();
    b.clientes.delete(c);
    if (conWill && c.opc.will) {
      const w = c.opc.will;
      b.publicaciones.push({ de: c.opc.clientId, tema: w.topic, texto: w.payload, will: true });
      repartir(b, c.opc.clientId, w.topic, w.payload);
    }
    c.emitir('close');
  }

  function reintentar(c) {
    if (c.terminado) return;
    clearTimeout(c.timer);
    c.timer = setTimeout(() => intentar(c), Math.min(c.opc.reconnectPeriod ?? reconexion, reconexion));
  }

  function intentar(c) {
    clearTimeout(c.timer);
    const b = broker(c.url);
    c.timer = setTimeout(() => {
      c.timer = null;
      if (c.terminado) return;
      if (b.caido || bloqueado(c.opc.clientId, c.url)) {
        c.emitir('error', new Error('conexión rechazada'));
        c.emitir('close');
        reintentar(c);
        return;
      }
      c.connected = true; c.sesion++; c.ultimaEntrega = 0;
      b.clientes.add(c);
      c.emitir('connect');
    }, entre(b.retraso));
  }

  const de = (id, url) => [...clientes].filter((c) => c.opc.clientId === id && (!url || c.url === url));
  const cortarEn = (c, conWill) => { if (c.connected) { cerrar(c, conWill); reintentar(c); } };

  return {
    semilla,
    conectar: (url, opc) => crearCliente(url, opc),

    // ----- Controles de prueba (por broker) -----
    retraso(url, [min, max]) { broker(url).retraso = [min, max]; },
    perdida(url, p) { broker(url).perdida = p; },           // fracción de entregas que se pierden
    caer(url) {                                             // el broker entero cae: sin Last Will, rechaza conexiones
      const b = broker(url); b.caido = true;
      for (const c of [...b.clientes]) cortarEn(c, false);
    },
    levantar(url) { broker(url).caido = false; },

    // ----- Controles de prueba (por cliente: clientId = selfId del par; url opcional = solo ese broker) -----
    // Corta el socket sin despedida (el broker publica el Last Will) y no lo deja reconectar hasta restaurar().
    cortar(id, url) {
      bloqueos.add(`${id}|${url ?? '*'}`);
      for (const c of de(id, url)) cortarEn(c, true);
    },
    // Corte puntual: el cliente reconecta solo a los pocos ms.
    cortarYVolver(id, url) { for (const c of de(id, url)) cortarEn(c, true); },
    restaurar(id, url) { bloqueos.delete(`${id}|${url ?? '*'}`); },
    // Socket zombi: sigue `connected`, pero ni entra ni sale nada (ni SUBACK).
    zombi(id, url) { for (const c of de(id, url)) c.zombi = true; },
    // Sale del zombi retomando el mismo socket (sigue suscrito).
    revivir(id, url) { for (const c of de(id, url)) c.zombi = false; },
    // Sale del zombi como lo haría mqtt.js al detectar el silencio: cierra y reconecta.
    revivirReconectando(id, url) { for (const c of de(id, url)) { c.zombi = false; cortarEn(c, false); } },

    // Predicado de pérdida dirigida: ({ url, tema, texto, para, de }) → true descarta esa entrega. null lo quita.
    descartar(f) { descartar = f; },

    // ----- Inspección -----
    publicaciones: (url) => broker(url).publicaciones,
    // Mensajes de sesión/transporte publicados en un broker, ya decodificados.
    sobres: (url) => broker(url).publicaciones.map((p) => { try { return { ...JSON.parse(p.texto), tema: p.tema, will: !!p.will }; } catch { return null; } }).filter(Boolean),
    conectados: (url) => broker(url).clientes.size,

    // Cierra todo (al acabar cada prueba, haya pasado o no).
    cerrarTodo() { for (const c of [...clientes]) { try { c.end(); } catch { /* ya cerrado */ } } },
  };
}
