// Transporte real: relé sobre MQTT por WebSocket seguro, sin WebRTC (un socket TLS saliente atraviesa cualquier NAT).
// Varios brokers públicos a la vez y redundantes: cada mensaje fiable se publica en todos los conectados y se
// deduplica al recibir por (emisor, nº). Si un broker cae o descarta mensajes, el juego sigue con los demás.
//
// Temas:  <appId>/sala/<CODIGO>/todos       difusión: anuncios, latidos, despedidas, estado y presencia
//         <appId>/sala/<CODIGO>/a/<peerId>  mensajes dirigidos a un par (así un estado dirigido no lo baja todo el mundo)
// Envoltorio (JSON): { d: emisor, n: nº de mensaje del emisor, t: tipo, m?: datos, q?: 1 = "respóndeme" }
//   Tipos de control: '+' anuncio/latido, '-' despedida ({ d, t:'-', w:1 } sin nº es el Last Will de un broker).
//   El resto ('hola', 'estado', 'intent', 'aviso', 'pres') son de la sesión y se le entregan tal cual.
//
// Subconjunto de mqtt.js que se usa (para escribir un broker falso en las pruebas):
//   conectar(url, opciones) → cliente con  .connected (bool),
//     .on('connect' | 'close' | 'error', f)   y   .on('message', f(tema, payload Uint8Array|string)),
//     .subscribe([temas], { qos }, cb(err)),  .publish(tema, texto, { qos }),  .end(false).
//   opciones: { clientId, clean, keepalive, reconnectPeriod, connectTimeout, resubscribe, queueQoSZero,
//               will: { topic, payload, qos, retain } }. mqtt.js reconecta solo; tras reconectar volvemos a suscribir.

const TIEMPOS = {
  tic: 1000,        // reloj interno (en un Worker: no lo frena una pestaña oculta)
  latido: 4000,     // cada cuánto digo "sigo aquí" (por todos los brokers)
  eco: 10000,       // si no oigo mi propio latido en este tiempo, el que está sin conexión soy yo
  pres: 125,        // presencia: como mucho 8 por segundo (EMQX descarta por encima de ~10 msg/s)
};
// La espera de un par no se mide en segundos sino en ecos de MIS latidos: un par se va si oigo volver
// ESPERA_ECOS latidos míos (≈16 s) sin saber nada de él. Si el que se queda sin red soy yo, no vuelve
// ningún eco y nadie caduca: así un corte propio nunca se confunde con que se fueron los demás.
const ESPERA_ECOS = 4;
const ESPERA_ECOS_WILL = 2; // tras el Last Will de un broker: 2 ecos (≈8 s) para dar señales por otro broker
const KEEPALIVE_S = 10; // el broker detecta un socket congelado en ~1,5 × keepalive y publica el Last Will
const ID_VALIDO = /^[\w-]{1,64}$/;

function nuevoSelfId() {
  const b = crypto.getRandomValues(new Uint8Array(8));
  return 'm' + [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Los temporizadores de un Worker no sufren el frenado intensivo de las pestañas ocultas (1 por minuto tras 5 min).
function ticDeWorker(f, ms) {
  try {
    const url = URL.createObjectURL(new Blob([`setInterval(() => postMessage(0), ${ms});`], { type: 'text/javascript' }));
    const w = new Worker(url);
    w.onmessage = () => f();
    return () => { w.terminate(); URL.revokeObjectURL(url); };
  } catch {
    const id = setInterval(f, ms);
    return () => clearInterval(id);
  }
}

// opciones: { brokers: [url], conectar(url, opc) → cliente mqtt, ahora?, cadaTic?(f, ms) → detener, ventana?, tiempos?, selfId? }
export function crearTransporteMqtt(appId, codigoSala, {
  brokers, conectar, ahora = Date.now, cadaTic = ticDeWorker,
  ventana = typeof window === 'undefined' ? null : window, tiempos = {}, selfId = nuevoSelfId(),
} = {}) {
  const T = { ...TIEMPOS, ...tiempos };
  const limpio = (s) => String(s).replace(/[^\w-]/g, ''); // nada de '+', '#' ni '/' en los temas
  const base = `${limpio(appId)}/sala/${limpio(codigoSala)}`;
  const temaTodos = `${base}/todos`;
  const temaPara = (id) => `${base}/a/${id}`;
  let alRecibir = () => {}, alEntrar = () => {}, alSalir = () => {};

  const pares = new Map();  // peerId -> nº de ecos míos seguidos sin saber nada de él
  const vistos = new Map(); // peerId -> Set de nº ya entregados (se conserva tras su salida: un duplicado tardío no resucita a nadie)
  const finDe = new Map();  // peerId -> nº de su despedida: lo anterior que llegue tarde por otro broker se ignora
  let n = 0, cerrado = false;
  // "Sin conexión" = no oigo mi propio eco. Entonces no caduca nadie (ver oirEco).
  let sinConexion = true, yaEnLinea = false, ultimoEco = 0, ultimoEcoN = 0;
  let ultimoTic = ahora(), ultimoLatido = 0;
  let presPendiente = null, ultimaPres = 0, timerPres = null;

  const sobre = (t, m, q) => JSON.stringify({ d: selfId, n: ++n, t, ...(m !== undefined && { m }), ...(q && { q: 1 }) });
  const listos = () => enlaces.filter((e) => e.listo && e.cliente.connected);
  const publicarEn = (e, tema, texto, qos) => { try { e.cliente.publish(tema, texto, { qos }); } catch { /* broker caído: lo cubren los demás */ } };
  // Un mensaje fiable va por todos los brokers conectados con el mismo nº; el receptor se queda con el primero.
  function difundir(t, m, peerId, q) {
    const texto = sobre(t, m, q);
    const tema = peerId ? temaPara(peerId) : temaTodos;
    for (const e of listos()) publicarEn(e, tema, texto, 1);
  }

  const enlaces = brokers.map((url) => {
    const e = { url, listo: false };
    e.cliente = conectar(url, {
      clientId: selfId, // mismo id en cada reconexión: el broker cierra la sesión vieja si quedó colgada
      clean: true, keepalive: KEEPALIVE_S, reconnectPeriod: 2000, connectTimeout: 8000,
      resubscribe: false, queueQoSZero: false, // nada de ráfagas viejas al reconectar: la sesión ya reintenta
      will: { topic: temaTodos, payload: JSON.stringify({ d: selfId, t: '-', w: 1 }), qos: 0, retain: false },
    });
    e.cliente.on('error', () => {}); // sin oyente, mqtt.js lanza; los fallos de un broker no afectan a los demás
    e.cliente.on('close', () => { e.listo = false; });
    e.cliente.on('connect', () => {
      e.listo = false;
      e.cliente.subscribe([temaTodos, temaPara(selfId)], { qos: 1 }, (err) => {
        if (err || cerrado) return;
        e.listo = true;
        // Anuncio en cuanto este broker está listo (basta el primero): quien lo oiga responde enseguida.
        publicarEn(e, temaTodos, sobre('+', undefined, true), 1);
      });
    });
    e.cliente.on('message', (tema, payload) => {
      try { recibir(payload); } catch (err) { console.error('transporte-mqtt', err); } // que un fallo no tumbe el socket
    });
    return e;
  });

  const decodificador = new TextDecoder();
  function recibir(payload) {
    if (cerrado) return;
    let s;
    try { s = JSON.parse(typeof payload === 'string' ? payload : decodificador.decode(payload)); } catch { return; }
    if (!s || typeof s !== 'object' || typeof s.d !== 'string' || !ID_VALIDO.test(s.d) || typeof s.t !== 'string') return;
    const t = ahora();
    if (s.d === selfId) { if (s.t === '+' && Number.isInteger(s.n)) oirEco(t, s.n, s.q); return; } // mi propio eco: mi enlace funciona

    if (s.t === '-') {
      if (!pares.has(s.d)) return;
      if (s.w) {
        // Last Will: solo ese broker lo perdió. Le pregunto por los demás; si no contesta a tiempo, se fue.
        pares.set(s.d, Math.max(pares.get(s.d), ESPERA_ECOS - ESPERA_ECOS_WILL));
        difundir('+', undefined, s.d, true);
        return;
      }
      if (Number.isInteger(s.n)) finDe.set(s.d, s.n);
      quitar(s.d);
      return;
    }

    if (!Number.isInteger(s.n) || s.n <= (finDe.get(s.d) ?? 0)) return;
    let v = vistos.get(s.d);
    if (!v) vistos.set(s.d, (v = new Set()));
    if (v.has(s.n)) return;
    v.add(s.n);
    if (v.size > 600) [...v].slice(0, 300).forEach((x) => v.delete(x)); // el Set guarda el orden de llegada
    if (s.t !== '+' && (typeof s.m !== 'object' || s.m === null)) return;

    const nuevo = !pares.has(s.d);
    pares.set(s.d, 0);
    if (nuevo || s.q) difundir('+', undefined, s.d); // que el otro también me conozca, sin esperar a su latido
    if (nuevo) alEntrar(s.d);
    if (s.t !== '+') alRecibir(s.t, s.m, s.d);
  }

  function quitar(id) {
    if (!pares.delete(id)) return;
    alSalir(id);
  }

  // Cada latido mío que vuelve (una vez, aunque llegue por varios brokers) es una vuelta completa por la red:
  // quien siga callado tras ESPERA_ECOS vueltas se ha ido. Si no vuelve nada, el que está sin conexión soy yo.
  function oirEco(t, num, anuncio) {
    ultimoEco = t;
    if (sinConexion) {
      sinConexion = false;
      if (yaEnLinea) reanudar();
      yaEnLinea = true;
    }
    if (anuncio || num <= ultimoEcoN) return; // solo cuentan los latidos: un broker que reconecta en bucle no acelera nada
    ultimoEcoN = num;
    for (const [id, callado] of [...pares]) {
      if (callado + 1 >= ESPERA_ECOS) quitar(id);
      else pares.set(id, callado + 1);
    }
  }

  // Vuelvo tras un corte (o tras tener la pestaña congelada): la cuenta de silencios de los demás no vale.
  function reanudar() {
    for (const id of pares.keys()) pares.set(id, 0);
    difundir('+', undefined, undefined, true); // reanuncio: quien me dio por perdido me vuelve a ver como nuevo
    // Y la sesión vuelve a saludar a los que conozco: el anfitrión me reenvía el estado que me perdí.
    for (const id of [...pares.keys()]) alEntrar(id);
  }

  function tic() {
    if (cerrado) return;
    const t = ahora();
    // Un tic muy tardío = pestaña congelada o equipo dormido: lo trato como un corte mío.
    if (t - ultimoTic > 3 * T.tic) sinConexion = true;
    ultimoTic = t;
    if (t - ultimoLatido >= T.latido) { ultimoLatido = t; difundir('+'); }
    // Regla crítica: si el caído soy yo, no declaro salidos a los demás (la sesión se nombraría anfitriona
    // con term+1 y al volver pisaría la sala real). Sin ecos ya no caduca nadie (ver oirEco); esto solo
    // marca el corte para que, al volver, reanudar() reinicie las cuentas y vuelva a saludar.
    if (!listos().length || t - ultimoEco > T.eco) sinConexion = true;
  }
  const detenerTic = cadaTic(tic, T.tic);

  // Presencia: efímera. Se fusiona (solo vale la última), va con QoS 0 y por un solo broker: el primero
  // conectado según el orden de la lista. Con un único broker vivo, a la mitad de ritmo para no comerse su cupo.
  function enviarPres(datos, peerId) {
    presPendiente = { datos, peerId };
    if (timerPres) return;
    const falta = ultimaPres + T.pres * (listos().length > 1 ? 1 : 2) - ahora();
    if (falta <= 0) soltarPres();
    else timerPres = setTimeout(soltarPres, falta);
  }
  function soltarPres() {
    timerPres = null;
    if (!presPendiente || cerrado) return;
    const { datos, peerId } = presPendiente;
    presPendiente = null;
    ultimaPres = ahora();
    const [e] = listos();
    if (e) publicarEn(e, peerId ? temaPara(peerId) : temaTodos, sobre('pres', datos), 0);
  }

  // Despedida explícita: los demás me quitan al instante, sin esperar al tiempo de espera.
  const despedirse = () => { for (const e of listos()) publicarEn(e, temaTodos, sobre('-'), 0); };
  ventana?.addEventListener('pagehide', despedirse);

  return {
    selfId,
    // Sin peerId: difusión (una publicación por broker, la reciben todos los de la sala).
    enviar(tipo, datos, peerId) {
      if (cerrado) return;
      if (tipo === 'pres') enviarPres(datos, peerId);
      else difundir(tipo, datos, peerId);
    },
    alRecibir: (f) => { alRecibir = f; },
    alEntrar: (f) => { alEntrar = f; },
    alSalir: (f) => { alSalir = f; },
    pares: () => [...pares.keys()],
    // Cuántos brokers están en uso ahora mismo y cuántos hay (0 = sin conexión: la interfaz lo avisa).
    // Un socket puede seguir "conectado" un rato con la red ya caída: sin eco propio también cuenta como 0.
    enLinea: () => ({ listos: sinConexion ? 0 : listos().length, total: enlaces.length }),
    salir() {
      if (cerrado) return;
      despedirse();
      cerrado = true;
      detenerTic();
      clearTimeout(timerPres);
      ventana?.removeEventListener('pagehide', despedirse);
      // end(false) vacía lo pendiente y manda DISCONNECT: un cierre limpio no dispara el Last Will.
      for (const e of enlaces) { try { e.cliente.end(false); } catch { /* ya cerrado */ } }
    },
  };
}
