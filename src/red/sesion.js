// Sesión multijugador: elige anfitrión, replica el estado y gestiona relevos.
// No sabe nada de la red: recibe un "transporte" (ver transporte-mqtt.js y transporte-memoria.js).
// Sin peerId, transporte.enviar difunde a todos los pares.
import {
  VERSION_PROTOCOLO, MAX_JUGADORES, estadoInicial, reducir, marcarDesconectado, ganaEtiqueta, conectados, pesoDe,
} from './protocolo.js';

const TIEMPOS = {
  esperaHost: 5000,   // si nadie responde en este tiempo, me nombro anfitrión
  reintento: 2000,    // reenvío de saludos e intenciones sin confirmar
  esperaRelevo: 6000, // si el sucesor no aparece, se descarta y se elige al siguiente
  sinSaludo: 8000,    // un par que nunca saluda es de otra versión (o está roto)
};

export function crearSesion({ transporte, jugadorId, nick, tiempos = {}, ahora = Date.now, aleatorio = Math.random, version = VERSION_PROTOCOLO }) {
  const T = { ...TIEMPOS, ...tiempos };
  const oyentes = {};
  const emitir = (ev, ...a) => (oyentes[ev] || []).forEach((f) => f(...a));

  const pares = new Map();      // peerId -> { jugadorId, compatible }
  const peerDe = new Map();     // jugadorId -> peerId
  let term = 0, host = null, seq = 0;
  let estado = null;
  let sincronizado = false;
  let pendientes = [];
  let ultimoId = 0;
  let rechazadoPorLlena = false;
  let relevo = null;            // { candidato, excluidos:Set, timer }
  let cerrada = false;
  let vueltas = 0;
  const timers = [];

  const nuevoId = () => (ultimoId = Math.max(ahora(), ultimoId + 1));
  const soyHost = () => host === jugadorId;
  const etiqueta = () => ({ term, host, seq, peso: pesoDe(estado) });
  const ctx = () => ({ ahora: ahora(), aleatorio });

  // ---------- Envíos ----------
  const enviar = (tipo, datos, peerId) => { if (!cerrada) transporte.enviar(tipo, { v: version, ...datos }, peerId); };
  const compatibles = () => [...pares].filter(([, p]) => p.compatible).map(([id]) => id);
  // r: 1 marca la respuesta a un saludo (a una respuesta no se responde: evita el ping-pong).
  const saludar = (peerId, respuesta = false) => enviar('hola', { jugadorId, nick, etiqueta: etiqueta(), ...(respuesta && { r: 1 }) }, peerId);
  const difundirEstado = (peerId) => {
    if (!soyHost()) return;
    const datos = { etiqueta: etiqueta(), estado };
    if (peerId) enviar('estado', datos, peerId);
    else if (compatibles().length) enviar('estado', datos); // difusión: el transporte lo manda una sola vez a todos
  };

  // ---------- Anfitrión ----------
  function hacermeHost(nuevoTerm) {
    const anterior = host;
    term = nuevoTerm;
    host = jugadorId;
    seq = 0;
    sincronizado = true;
    if (!estado) estado = estadoInicial();
    if (anterior && anterior !== jugadorId) marcarDesconectado(estado, anterior, ahora());
    // Quien perdió la conexión mientras no había anfitrión también queda desconectado.
    for (const [id, j] of Object.entries(estado.jugadores)) {
      if (id !== jugadorId && j.conectado && !peerDe.has(id)) marcarDesconectado(estado, id, ahora());
    }
    cancelarRelevo();
    asegurarUnirse(true);
    procesarPropias();
    publicar();
  }

  function procesarPropias() {
    for (const it of pendientes) {
      const motivo = reducir(estado, jugadorId, it, ctx());
      if (motivo) emitir('aviso', motivo, it);
    }
    pendientes = [];
  }

  function publicar() {
    seq++;
    difundirEstado();
    emitir('estado', estado);
  }

  function recibirIntencion(peerId, m) {
    const par = pares.get(peerId);
    if (!par || par.jugadorId !== m.jugadorId) return; // nadie actúa en nombre de otro
    const it = m.intencion;
    if (!it || typeof it !== 'object' || !Number.isFinite(it.id) || typeof it.tipo !== 'string') return;
    if (it.payload !== undefined && (typeof it.payload !== 'object' || it.payload === null)) return;
    const motivo = reducir(estado, m.jugadorId, m.intencion, ctx());
    if (motivo) enviar('aviso', { id: m.intencion.id, motivo }, peerId);
    publicar();
  }

  // ---------- Cliente ----------
  function adoptar(etq, datos) {
    const cambioHost = etq.host !== host;
    const previo = estado?.jugadores?.[jugadorId];
    const propioPrevio = previo?.rol ? estado.porRol[previo.rol] : null;
    term = etq.term; host = etq.host; seq = etq.seq;
    estado = datos;
    sincronizado = true;
    cancelarRelevo();
    const yo = estado.jugadores[jugadorId];
    if (yo) pendientes = pendientes.filter((it) => it.id > yo.ultimaIntencion);
    if (cambioHost || (!yo && !rechazadoPorLlena) || (yo && !yo.conectado)) {
      asegurarUnirse(cambioHost, previo?.rol ?? null, propioPrevio);
    }
    if (rechazadoPorLlena && conectados(estado).length < MAX_JUGADORES) { rechazadoPorLlena = false; asegurarUnirse(true); }
    enviarPendientes();
    emitir('estado', estado);
  }

  function asegurarUnirse(forzar, rol = estado?.jugadores?.[jugadorId]?.rol ?? null, propio = null) {
    if (!forzar && pendientes.some((it) => it.tipo === 'unirse')) return;
    pendientes = pendientes.filter((it) => it.tipo !== 'unirse');
    const unirse = { id: 0, tipo: 'unirse', payload: { nick, rol, propio } };
    // Los ids tienen que crecer en el orden en que se aplican (el anfitrión descarta ids viejos como repetidos).
    if (estado?.jugadores?.[jugadorId]) {
      // Ya figuro en la sala: "unirse" puede ir al final.
      unirse.id = nuevoId();
      pendientes.push(unirse);
    } else {
      // No figuro: "unirse" va primero y renumero lo demás. Es seguro porque nada mío se aplicó en este estado.
      pendientes.unshift(unirse);
      for (const it of pendientes) it.id = nuevoId();
    }
  }

  function enviarPendientes() {
    if (!sincronizado || !pendientes.length) return;
    if (soyHost()) { procesarPropias(); publicar(); return; }
    const peer = peerDe.get(host);
    if (!peer) return;
    for (const it of pendientes) enviar('intent', { jugadorId, intencion: it }, peer);
  }

  // ---------- Relevo ----------
  function iniciarRelevo(hostCaido) {
    if (!estado) return;
    const excluidos = relevo?.excluidos ?? new Set();
    excluidos.add(hostCaido);
    cancelarRelevo();
    const candidatos = Object.entries(estado.jugadores)
      .filter(([id, j]) => j.conectado && !excluidos.has(id) && (id === jugadorId || peerDe.has(id)))
      .sort((a, b) => a[1].orden - b[1].orden);
    const candidato = candidatos[0]?.[0] ?? jugadorId;
    if (candidato === jugadorId) { hacermeHost(term + 1); return; }
    relevo = {
      candidato, excluidos,
      timer: setTimeout(() => { if (host === hostCaido || host === null) iniciarRelevo(candidato); }, T.esperaRelevo),
    };
  }
  function cancelarRelevo() { if (relevo) clearTimeout(relevo.timer); relevo = null; }

  // ---------- Mensajes ----------
  const vistos = new Map(); // peerId -> cuándo apareció (para detectar pares que nunca saludan)
  const avisadosSinSaludo = new Set();
  transporte.alEntrar((peerId) => { vistos.set(peerId, ahora()); saludar(peerId); });

  transporte.alSalir((peerId) => {
    const par = pares.get(peerId);
    pares.delete(peerId);
    if (!par) return;
    // Si el mismo jugador ya volvió con otra conexión (recargó la página), esta salida no cuenta.
    if (peerDe.get(par.jugadorId) !== peerId) return;
    peerDe.delete(par.jugadorId);
    emitir('presencia', par.jugadorId, null);
    if (!par.compatible) return;
    if (soyHost()) { if (marcarDesconectado(estado, par.jugadorId, ahora())) publicar(); }
    else if (par.jugadorId === host) { host = null; iniciarRelevo(par.jugadorId); }
    else if (relevo?.candidato === par.jugadorId) iniciarRelevo(par.jugadorId);
  });

  transporte.alRecibir((tipo, m, peerId) => {
    if (cerrada) return;
    if (tipo === 'hola') {
      const nuevo = !pares.has(peerId);
      const compatible = m.v === version;
      pares.set(peerId, { jugadorId: m.jugadorId, compatible });
      // Al saludo inicial se responde siempre (también a otra versión, para que ella lo sepa), aunque ya
      // conozcamos a quien saluda: tras un corte largo pudo darnos por perdidos mientras nosotros lo seguíamos
      // teniendo en `pares`, y sin respuesta nunca volvería a registrarnos.
      if (!m.r) saludar(peerId, true);
      if (!compatible) { emitir('version', m.v); return; }
      const anterior = peerDe.get(m.jugadorId);
      peerDe.set(m.jugadorId, peerId);
      if (nuevo) emitir('nuevoPar', m.jugadorId);
      // El anfitrión volvió con otra conexión (recargó) antes de que se notara su salida:
      // su sesión vieja está muerta y la nueva empieza en blanco, así que hay relevo sin él.
      if (anterior && anterior !== peerId && m.jugadorId === host && !soyHost()) {
        pares.delete(anterior);
        host = null;
        iniciarRelevo(m.jugadorId);
        return;
      }
      // Solo si le falta: los ya sincronizados saludan cada pocos segundos para comprobar que van al día.
      const e = m.etiqueta;
      if (soyHost() && !(e && e.host === jugadorId && e.term === term && e.seq === seq)) difundirEstado(peerId);
      // Si es un sucesor esperado, ya habló: el relevo sigue su curso.
      return;
    }
    if (!pares.get(peerId)?.compatible || m.v !== version) return;
    if (tipo === 'estado') {
      if (soyHost()) {
        if (m.etiqueta.host !== jugadorId && ganaEtiqueta(m.etiqueta, etiqueta()) && m.etiqueta.term >= term) {
          // Otro anfitrión con mejor derecho: me rindo y me uno al suyo.
          host = null;
          adoptar(m.etiqueta, m.estado);
        } else if (m.etiqueta.host !== jugadorId) {
          difundirEstado(peerId); // que vea el mío y se rinda él
        }
        return;
      }
      if (ganaEtiqueta(m.etiqueta, sincronizado ? etiqueta() : null)) adoptar(m.etiqueta, m.estado);
      return;
    }
    if (tipo === 'intent' && soyHost()) { recibirIntencion(peerId, m); return; }
    if (tipo === 'aviso') {
      pendientes = pendientes.filter((it) => it.id !== m.id);
      if (/llena/i.test(m.motivo)) rechazadoPorLlena = true;
      emitir('aviso', m.motivo);
      return;
    }
    if (tipo === 'pres') emitir('presencia', pares.get(peerId).jugadorId, m.datos);
  });

  // ---------- Arranque ----------
  asegurarUnirse(true, null, null);
  transporte.pares().forEach((p) => saludar(p));
  timers.push(setInterval(() => {
    if (!sincronizado) transporte.pares().forEach((p) => saludar(p));
    else if (!soyHost()) {
      enviarPendientes();
      // Un relé puede perder un `estado` sin avisar: cada 3 vueltas le enseño mi etiqueta al anfitrión
      // (como respuesta, para que no me salude de vuelta) y, si voy atrasado, me lo reenvía.
      if (++vueltas % 3 === 0 && peerDe.has(host)) saludar(peerDe.get(host), true);
    }
    // Pares conectados que nunca saludaron: otra versión del juego (anterior a este protocolo).
    for (const p of transporte.pares()) {
      if (!vistos.has(p)) vistos.set(p, ahora());
      if (!pares.has(p) && !avisadosSinSaludo.has(p) && ahora() - vistos.get(p) > T.sinSaludo) {
        avisadosSinSaludo.add(p);
        emitir('version', 'desconocida');
      }
    }
  }, T.reintento));
  timers.push(setTimeout(() => { if (!sincronizado) hacermeHost(1); }, T.esperaHost));

  // ---------- API pública ----------
  return {
    jugadorId,
    get estado() { return estado; },
    get sincronizado() { return sincronizado; },
    get etiqueta() { return etiqueta(); },
    soyHost,
    yo: () => estado?.jugadores?.[jugadorId] ?? null,
    pendientes: () => pendientes.length,
    on(ev, f) { (oyentes[ev] ||= []).push(f); },
    intentar(tipo, payload = {}) {
      const it = { id: nuevoId(), tipo, payload };
      pendientes.push(it);
      enviarPendientes();
      return it.id;
    },
    presencia(datos) { if (compatibles().length) enviar('pres', { datos }); }, // difusión, como el estado
    salir() {
      cerrada = true;
      timers.forEach((t) => { clearInterval(t); clearTimeout(t); });
      cancelarRelevo();
      transporte.salir();
    },
  };
}
