// Protocolo de juego: estado replicado y acciones validadas por el anfitrión.
// Este archivo es puro (sin red, sin Three.js) para poder probarlo con un transporte simulado.
// Ver PROTOCOLO.md para el diseño completo.

export const VERSION_PROTOCOLO = 1;
export const MAX_JUGADORES = 4;
export const ROLES_IDS = ['vuelo', 'ciencia', 'potencia', 'comms'];
// Si su dueño se desconecta, un rol queda reservado este tiempo (así una recarga no lo pierde).
export const GRACIA_DESCONEXION_MS = { lobby: 20_000, partida: 90_000 };
const gracia = (e) => (e.fase === 'lobby' ? GRACIA_DESCONEXION_MS.lobby : GRACIA_DESCONEXION_MS.partida);

// Fases de la partida (flujo-del-juego.md). Solo lobby → briefing tiene contenido por ahora.
export const FASES = ['lobby', 'briefing', 'diseno', 'verificacion', 'mision', 'informe'];
export const TRANSICIONES = {
  lobby: ['briefing'],
  briefing: ['diseno'],
  diseno: ['verificacion'],
  verificacion: ['diseno', 'mision'],   // si no pasa, se vuelve a diseño
  mision: ['informe'],
  informe: ['diseno', 'lobby'],         // rediseñar (R-06) o nueva partida
};

export function estadoInicial() {
  return {
    fase: 'lobby',
    jugadores: {},          // jugadorId -> { nick, rol, orden, conectado, desconectadoEn, ultimaIntencion }
    siguienteOrden: 1,
    semilla: null,          // la sortea el anfitrión al empezar; los eventos aleatorios salen de aquí
    briefing: { objetivos: true, tareas: false, riesgos: false, carpetas: {} },
    porRol: Object.fromEntries(ROLES_IDS.map((r) => [r, {}])), // datos privados de cada rol: solo su dueño los escribe
    registro: [],           // eventos que el anfitrión ya resolvió (fases futuras)
  };
}

// ---------- Utilidades de lectura (también las usa la interfaz) ----------
export const conectados = (e) => Object.entries(e.jugadores).filter(([, j]) => j.conectado);
export const duenoDeRol = (e, rol) => Object.entries(e.jugadores).find(([, j]) => j.rol === rol);
export function rolLibre(e, rol, ahora, para) {
  const d = duenoDeRol(e, rol);
  if (!d || d[0] === para) return true;
  const [, j] = d;
  return !j.conectado && ahora - j.desconectadoEn > gracia(e);
}

// ---------- Validación de entrada ----------
const esTexto = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;
const limpiarNick = (v) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16);
const tamano = (v) => { try { return JSON.stringify(v).length; } catch { return Infinity; } };

// ---------- Acciones ----------
// Cada acción: fases en las que vale (null = todas), validar → motivo de rechazo o null, aplicar → muta el estado.
// ctx = { ahora, aleatorio } lo pone el anfitrión: los clientes nunca ejecutan esto.
export const ACCIONES = {
  // Entrar o volver a entrar (recarga, cambio de anfitrión). Idempotente.
  unirse: {
    fases: null,
    validar(e, id, p, ctx) {
      if (!limpiarNick(p.nick)) return 'Falta el nick';
      const j = e.jugadores[id];
      if (!j && conectados(e).length >= MAX_JUGADORES) return `La sala está llena (${MAX_JUGADORES} máximo)`;
      if (j && !j.conectado && conectados(e).length >= MAX_JUGADORES) return `La sala está llena (${MAX_JUGADORES} máximo)`;
      return null;
    },
    aplicar(e, id, p, ctx) {
      let j = e.jugadores[id];
      if (!j) j = e.jugadores[id] = { nick: '', rol: null, orden: e.siguienteOrden++, conectado: true, desconectadoEn: 0, ultimaIntencion: 0 };
      j.nick = limpiarNick(p.nick);
      j.conectado = true;
      j.desconectadoEn = 0;
      // Al fusionar dos anfitriones, el jugador trae su rol y sus datos de rol: se recuperan si no chocan.
      if (!j.rol && ROLES_IDS.includes(p.rol) && rolLibre(e, p.rol, ctx.ahora, id)) asignarRol(e, id, p.rol);
      if (j.rol && p.propio && j.rol === p.rol && Object.keys(e.porRol[j.rol]).length === 0 && tamano(p.propio) <= 16_000) {
        e.porRol[j.rol] = p.propio;
      }
    },
  },

  elegirRol: {
    fases: ['lobby', 'briefing'],
    validar(e, id, p, ctx) {
      if (!e.jugadores[id]) return 'No estás en la sala';
      if (p.rol === null) return null;
      if (!ROLES_IDS.includes(p.rol)) return 'Rol desconocido';
      if (!rolLibre(e, p.rol, ctx.ahora, id)) return `Ese rol ya lo tiene ${duenoDeRol(e, p.rol)[1].nick}`;
      return null;
    },
    aplicar(e, id, p) { asignarRol(e, id, p.rol); },
  },

  iniciarMision: {
    fases: ['lobby'],
    validar(e, id) {
      if (!e.jugadores[id]?.rol) return 'Elige un rol primero';
      const sinRol = conectados(e).filter(([, j]) => !j.rol);
      if (sinRol.length) return `Falta que ${sinRol.map(([, j]) => j.nick).join(', ')} elija rol`;
      return null;
    },
    aplicar(e, id, p, ctx) {
      e.fase = 'briefing';
      e.semilla = Math.floor(ctx.aleatorio() * 2 ** 31);
    },
  },

  marcarPizarra: {
    fases: ['briefing'],
    validar: (e, id, p) => (['objetivos', 'tareas', 'riesgos'].includes(p.id) ? null : 'Casilla desconocida'),
    aplicar(e, id, p) { e.briefing[p.id] = !e.briefing[p.id]; },
  },

  abrirCarpeta: {
    fases: ['briefing'],
    validar: (e, id, p) => (ROLES_IDS.includes(p.rol) ? null : 'Carpeta desconocida'),
    aplicar(e, id, p) { e.briefing.carpetas[p.rol] = !e.briefing.carpetas[p.rol]; },
  },

  // Genérica para la fase de Diseño: cada rol solo escribe en su propia parte (su taller).
  editarPropio: {
    fases: ['briefing', 'diseno'],
    validar(e, id, p) {
      const rol = e.jugadores[id]?.rol;
      if (!rol) return 'Necesitas un rol';
      if (!esTexto(p.clave, 32)) return 'Clave inválida';
      if (tamano(p.valor) > 8_000) return 'Dato demasiado grande';
      if (tamano(e.porRol[rol]) + tamano(p.valor) > 32_000) return 'Tu taller está lleno';
      return null;
    },
    aplicar(e, id, p) {
      const rol = e.jugadores[id].rol;
      if (p.valor === null) delete e.porRol[rol][p.clave];
      else e.porRol[rol][p.clave] = p.valor;
    },
  },

  // Cambio de fase genérico, limitado a TRANSICIONES. Las fases futuras añadirán sus propias condiciones.
  cambiarFase: {
    fases: null,
    validar(e, id, p) {
      if (!e.jugadores[id]?.rol) return 'Necesitas un rol';
      if (!(TRANSICIONES[e.fase] || []).includes(p.fase)) return `No se puede pasar de ${e.fase} a ${p.fase}`;
      return null;
    },
    aplicar(e, id, p) { e.fase = p.fase; },
  },
};

function asignarRol(e, id, rol) {
  // Si el rol estaba reservado por alguien desconectado (gracia vencida), se le quita.
  if (rol) {
    const d = duenoDeRol(e, rol);
    if (d && d[0] !== id) { d[1].rol = null; }
  }
  e.jugadores[id].rol = rol;
}

// Aplica una intención. Devuelve el motivo de rechazo o null. Solo lo llama el anfitrión.
export function reducir(e, jugadorId, intencion, ctx) {
  // En el lobby, quien lleva desconectado más que la gracia desaparece de la lista.
  if (e.fase === 'lobby') {
    for (const [id, j] of Object.entries(e.jugadores)) {
      if (!j.conectado && ctx.ahora - j.desconectadoEn > gracia(e)) delete e.jugadores[id];
    }
  }
  const accion = ACCIONES[intencion?.tipo];
  const j = e.jugadores[jugadorId];
  if (j && intencion.id <= j.ultimaIntencion) return null; // repetida: ya se aplicó (idempotencia)
  let motivo = null;
  if (!accion) motivo = 'Acción desconocida';
  else if (accion.fases && !accion.fases.includes(e.fase)) motivo = 'No se puede hacer en esta fase';
  else if (intencion.tipo !== 'unirse' && !j) motivo = 'No estás en la sala';
  else motivo = accion.validar(e, jugadorId, intencion.payload || {}, ctx);
  if (!motivo) accion.aplicar(e, jugadorId, intencion.payload || {}, ctx);
  if (e.jugadores[jugadorId]) e.jugadores[jugadorId].ultimaIntencion = Math.max(e.jugadores[jugadorId].ultimaIntencion, intencion.id);
  return motivo;
}

// Marca la salida de un jugador (lo llama el anfitrión al perder su conexión).
export function marcarDesconectado(e, jugadorId, ahora) {
  const j = e.jugadores[jugadorId];
  if (!j || !j.conectado) return false;
  j.conectado = false;
  j.desconectadoEn = ahora;
  return true;
}

// "Peso" de una sala: cuánto ha avanzado (fase) y cuántos jugadores han pasado por ella.
// Sirve para que una sala con historia nunca pierda contra un recién llegado con el estado vacío.
export const pesoDe = (e) => (e ? [FASES.indexOf(e.fase), e.siguienteOrden] : [-1, 0]);

// ¿Gana la etiqueta a sobre b? Etiqueta = { term, host, seq, peso }.
// 1) mayor term; 2) a igual term, mayor peso; 3) a igual peso, anfitrión de id menor; 4) mismo anfitrión, mayor seq.
export function ganaEtiqueta(a, b) {
  if (!b) return true;
  if (a.term !== b.term) return a.term > b.term;
  if (a.host !== b.host) {
    const [fa, na] = a.peso || [-1, 0], [fb, nb] = b.peso || [-1, 0];
    if (fa !== fb) return fa > fb;
    if (na !== nb) return na > nb;
    return a.host < b.host;
  }
  return a.seq > b.seq;
}
