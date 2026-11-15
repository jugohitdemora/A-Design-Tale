// Protocolo de juego: estado replicado y acciones validadas por el anfitrión.
// Este archivo es puro (sin red, sin Three.js) para poder probarlo con un transporte simulado.
// Ver PROTOCOLO.md para el diseño completo y mecanicas-del-juego.md §9 para las acciones de juego.
import {
  resumen, cumple, verificar, motivoRestriccion, aplicarCambio, misionDe, piezaEnMision, siguienteEventoDiseno,
  DIFICULTADES, MAX_CONTINGENCIAS, relojDe, plazosDe, plazoPorDefecto, mesMaxDe, planDe,
  MESES_REVISION, MESES_REDISENO, RETRASO_CANCELA,
} from '../reglas/motor.js';
import { simular, resultadoCancelado } from '../reglas/despliegue.js';
import { prng, derivar, barajar } from '../reglas/azar.js';

export const VERSION_PROTOCOLO = 4; // 4: reloj de misión (estado.reloj, mision.plazo, ruta.mes)
export const MAX_JUGADORES = 4;
export const ROLES_IDS = ['vuelo', 'ciencia', 'potencia', 'comms'];
// Si su dueño se desconecta, un rol queda reservado este tiempo (así una recarga no lo pierde).
export const GRACIA_DESCONEXION_MS = { lobby: 20_000, partida: 90_000 };
const gracia = (e) => (e.fase === 'lobby' ? GRACIA_DESCONEXION_MS.lobby : GRACIA_DESCONEXION_MS.partida);

// ---------- Datos del juego ----------
// Por defecto, los de src/datos/index.js. Si ese archivo aún no existe (o falla), el protocolo carga igual:
// las acciones que necesitan datos se rechazan con 'Game data not loaded'. Las pruebas inyectan los suyos.
let datosPorDefecto = null;
try {
  ({ DATOS: datosPorDefecto = null } = await import('../datos/index.js'));
} catch (err) {
  console.warn('protocolo: no se pudieron cargar los datos (src/datos/index.js)', err?.message ?? err);
}
let datosInyectados = null;
export function usarDatos(d) { datosInyectados = d ?? null; }
export const datosActivos = () => datosInyectados ?? datosPorDefecto;
const datosDe = (ctx) => ctx?.datos ?? datosActivos();

// Fases de la partida (flujo-del-juego.md, mecanicas-del-juego.md §9). El orden importa: pesoDe usa el índice.
export const FASES = ['lobby', 'briefing', 'diseno', 'restricciones', 'verificacion', 'mision', 'informe'];
// Grafo completo de fases. Algunos pasos solo se dan con su acción (SOLO_POR_ACCION), no con cambiarFase.
export const TRANSICIONES = {
  lobby: ['briefing'],
  briefing: ['diseno'],                         // exige misión jugable y que todos estén listos (acción listo)
  diseno: ['restricciones', 'verificacion'],    // pedirRevision (MEC-11)
  restricciones: ['verificacion', 'diseno'],    // pedirRevision (MEC-12)
  verificacion: ['diseno', 'mision'],           // volver a diseño, o lanzar
  mision: ['informe'],                          // avanzar en el último paso
  informe: ['diseno', 'lobby'],                 // rediseñar (R-06, AN-15) o nueva partida
};
export const SOLO_POR_ACCION = {
  'diseno>restricciones': 'pedirRevision', 'diseno>verificacion': 'pedirRevision',
  'restricciones>verificacion': 'pedirRevision', 'restricciones>diseno': 'pedirRevision',
  'verificacion>mision': 'lanzar', 'mision>informe': 'avanzar',
};
const MOTIVO_SOLO_POR_ACCION = { pedirRevision: 'Request a design review instead', lanzar: 'Use Launch instead', avanzar: 'Use Next instead' };
const briefingInicial = () => ({ objetivos: true, tareas: false, riesgos: false, reparto: null, repartos: 0, listos: {} });
// Carpetas que el jefe pone sobre la mesa al elegir escenario. Siempre incluyen las jugables del escenario.
export const CARPETAS_POR_REPARTO = 3;
// Dificultad derivada de la ambición: objetivos secundarios marcados en el expediente (0 fácil, 1 normal, 2+ difícil).
export function dificultadPorObjetivos(m, sel) {
  const extra = (Array.isArray(m?.objetivos) ? m.objetivos : []).filter((o) => o && !o.prioridad && sel.includes(o.id)).length;
  return DIFICULTADES[Math.min(DIFICULTADES.length - 1, extra)];
}
// Jugadores conectados con rol que aún no han pulsado "listo".
export const faltanListos = (e) => conectados(e).filter(([id, j]) => j.rol && !e.briefing?.listos?.[id]);

// Talleres: solo ids, opción y uso; nunca totales (§6). Otras claves son notas libres de editarPropio.
const CLAVES_RESERVADAS = ['piezas', 'cohete', 'ruta', 'contingencias'];
export function tallerInicial(rol) {
  if (rol === 'vuelo') return { piezas: {}, cohete: null, ruta: null };
  if (rol === 'comms') return { piezas: {}, contingencias: [] };
  return { piezas: {} };
}
export function tallerVacio(t) {
  if (!t || typeof t !== 'object') return true;
  if (Object.keys(t).some((k) => !CLAVES_RESERVADAS.includes(k))) return false;
  const piezas = t.piezas && typeof t.piezas === 'object' ? Object.keys(t.piezas).length : 0;
  return !piezas && t.cohete == null && t.ruta == null && !(Array.isArray(t.contingencias) && t.contingencias.length);
}
// Limpia un taller que llega de fuera (fusión de anfitriones): forma correcta y nada raro dentro.
export function normalizarTaller(rol, t) {
  const r = tallerInicial(rol);
  if (!t || typeof t !== 'object' || Array.isArray(t)) return r;
  for (const [k, v] of Object.entries(t)) if (!CLAVES_RESERVADAS.includes(k)) r[k] = v;
  if (t.piezas && typeof t.piezas === 'object' && !Array.isArray(t.piezas)) {
    for (const [id, s] of Object.entries(t.piezas)) {
      if (!esTexto(id, 64)) continue;
      r.piezas[id] = { op: typeof s?.op === 'string' ? s.op.slice(0, 32) : null, uso: Number.isFinite(s?.uso) ? s.uso : null };
    }
  }
  if (rol === 'vuelo') {
    r.cohete = esTexto(t.cohete, 64) ? t.cohete : null;
    r.ruta = esTexto(t.ruta, 64) ? t.ruta : null;
  }
  if (rol === 'comms' && Array.isArray(t.contingencias)) {
    r.contingencias = [...new Set(t.contingencias.filter((x) => esTexto(x, 64)))].slice(0, MAX_CONTINGENCIAS);
  }
  return r;
}
const talleresIniciales = () => Object.fromEntries(ROLES_IDS.map((r) => [r, tallerInicial(r)]));
const disenoInicial = () => ({ revisiones: 0, eventos: [], ultima: null });
const firmasIniciales = () => Object.fromEntries(ROLES_IDS.map((r) => [r, false]));
const rutaInicial = () => ({ mes: null, sitio: null });
const relojInicial = () => ({ mes: 0 });

export function estadoInicial() {
  return {
    fase: 'lobby',
    jugadores: {},          // jugadorId -> { nick, rol, orden, conectado, desconectadoEn, ultimaIntencion }
    siguienteOrden: 1,
    semilla: null,          // la sortea el anfitrión al empezar; los eventos aleatorios salen de aquí
    briefing: briefingInicial(), // pizarra, carpetas repartidas (ids de misión) y quién está listo para diseñar
    mision: null,           // { escenario, id, dificultad, objetivos: [ids marcados] }: null hasta elegir
    porRol: talleresIniciales(), // talleres: solo su dueño (o cualquiera si el rol está vacante) los escribe
    diseno: disenoInicial(), // { revisiones, eventos: [{ id }], ultima }: eventos de diseño ya salidos
    firmas: firmasIniciales(),
    resultado: null,        // lo que devuelve simular() al lanzar
    vista: { paso: 0, activadas: [] }, // pasos del vuelo ya revelados y contingencias activadas en la sala de control
    ruta: rutaInicial(),    // planificación en la sala de control: { mes: meses desde el inicio de la misión, sitio }
    reloj: relojInicial(),  // { mes }: meses de diseño transcurridos desde el inicio de la misión (contrato-reloj.md)
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
// MEC-03: un rol sin dueño conectado lo puede editar y firmar cualquiera.
export const rolVacante = (e, rol) => !Object.values(e.jugadores).some((j) => j.rol === rol && j.conectado);

// ---------- Validación de entrada ----------
const esTexto = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;
const limpiarNick = (v) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16);
const tamano = (v) => { try { return JSON.stringify(v).length; } catch { return Infinity; } };
const NOMBRE_ROL = { vuelo: 'Flight & Mechanics', ciencia: 'Science', potencia: 'Power', comms: 'Comms & Ops' };
const rolDeContingencia = (D, id) => (ROLES_IDS.includes(D?.CONTINGENCIAS?.[id]?.rol) ? D.CONTINGENCIAS[id].rol : 'comms');
const sinDatos = 'Game data not loaded';

// ¿Puede el jugador actuar por `pedido` (o por su rol si no pide ninguno)? → [rol, motivo]
function rolParaActuar(e, id, pedido) {
  const mio = e.jugadores[id]?.rol;
  if (!mio) return [null, 'You need a role'];
  const rol = pedido ?? mio;
  if (!ROLES_IDS.includes(rol)) return [null, 'Unknown role'];
  if (rol !== mio && !rolVacante(e, rol)) return [null, `${NOMBRE_ROL[rol]} has a player: only they can do that`];
  return [rol, null];
}
// Acciones de un rol fijo (cohete y ruta: vuelo; contingencias: comms).
function puedeComoRol(e, id, rol) {
  const mio = e.jugadores[id]?.rol;
  if (!mio) return 'You need a role';
  if (mio !== rol && !rolVacante(e, rol)) return `Only ${NOMBRE_ROL[rol]} can do that`;
  return null;
}
const taller = (e, rol) => {
  if (!e.porRol[rol] || typeof e.porRol[rol] !== 'object') e.porRol[rol] = tallerInicial(rol);
  return e.porRol[rol];
};
const borrarFirmas = (e) => { e.firmas = firmasIniciales(); };
// En Restricciones (MEC-12) un cambio solo vale si no sube ninguna barra.
const enRestricciones = (e, cambio, D) => (e.fase === 'restricciones' ? motivoRestriccion(e, cambio, D) : null);
const tallerLleno = (e, rol, extra = 120) => tamano(e.porRol[rol]) + extra > 32_000;

// Opción y uso de una pieza, normalizados. → [{ op, uso }, motivo]
function seleccion(pieza, p) {
  const ops = Array.isArray(pieza.opciones) ? pieza.opciones : [];
  const op = p.op ?? ops[0]?.id ?? null;
  if (ops.length && !ops.some((o) => o?.id === op)) return [null, 'Unknown option for that part'];
  if (!pieza.uso || typeof pieza.uso !== 'object') return [{ op, uso: null }, null];
  const n = (x, d) => (typeof x === 'number' ? x : typeof x?.v === 'number' ? x.v : typeof x?.juego === 'number' ? x.juego : d);
  const min = n(pieza.uso.min, 0), max = n(pieza.uso.max, 24), def = n(pieza.uso.def, max);
  // Se acepta un número, una cadena numérica (de un <input>) o un dato {v, juego}.
  const crudo = p.uso == null || p.uso === '' ? def : n(p.uso, typeof p.uso === 'string' ? Number(p.uso) : NaN);
  const uso = typeof crudo === 'number' ? crudo : NaN;
  if (!Number.isFinite(uso)) return [null, 'Usage must be a number of hours per day'];
  if (uso < min || uso > max) return [null, `Usage must be between ${min} and ${max} h/day`];
  return [{ op, uso }, null];
}

// Calcula la misión que queda tras elegirMision. → [mision, motivo]
function nuevaMision(e, p, D) {
  const actual = e.mision ?? {};
  let escenario = p.escenario !== undefined ? p.escenario : actual.escenario ?? null;
  let id = p.id !== undefined ? p.id : actual.id ?? null;
  if (p.escenario !== undefined && p.escenario !== actual.escenario && p.id === undefined) id = null; // otro escenario
  const M = D.MISIONES && typeof D.MISIONES === 'object' ? D.MISIONES : {};
  if (escenario != null) {
    const E = D.ESCENARIOS;
    const existe = (Array.isArray(E) ? E.some((x) => x === escenario || x?.id === escenario) : !!(E && E[escenario]))
      || Object.values(M).some((m) => m?.escenario === escenario);
    if (!esTexto(escenario, 64) || !existe) return [null, 'Unknown scenario'];
  }
  if (id != null) {
    const m = M[id];
    if (!esTexto(id, 64) || !m) return [null, 'Unknown mission'];
    if (escenario != null && m.escenario !== escenario) return [null, 'That mission belongs to another scenario'];
    escenario = m.escenario ?? escenario;
  }
  if (p.dificultad !== undefined && !DIFICULTADES.includes(p.dificultad)) return [null, 'Unknown difficulty'];
  // Objetivos marcados: al cambiar de misión vienen todos marcados (el expediente completo).
  const m = id != null ? M[id] : null;
  const todos = m ? (Array.isArray(m.objetivos) ? m.objetivos : []).filter((o) => o?.id != null).map((o) => o.id) : [];
  const objetivos = id != null && id === actual.id && Array.isArray(actual.objetivos) ? actual.objetivos : todos;
  const nuevaSinDif = id != null && id !== actual.id && p.dificultad === undefined && m;
  const dificultad = p.dificultad !== undefined ? p.dificultad : nuevaSinDif ? dificultadPorObjetivos(m, objetivos) : actual.dificultad ?? 'normal';
  // Plazo comprometido (contrato-reloj.md §1): al cambiar de misión, el del medio; se cambia con comprometerPlazo.
  const plazo = id != null && id === actual.id && plazosDe(m).includes(actual.plazo) ? actual.plazo : plazoPorDefecto(m);
  return [{ escenario, id, dificultad, objetivos, plazo }, null];
}

// Vacía lo que depende de la misión. Las notas libres de cada taller se conservan.
function reiniciarDiseno(e) {
  const nuevo = talleresIniciales();
  for (const rol of ROLES_IDS) {
    for (const [k, v] of Object.entries(e.porRol?.[rol] ?? {})) if (!CLAVES_RESERVADAS.includes(k)) nuevo[rol][k] = v;
  }
  e.porRol = nuevo;
  e.diseno = disenoInicial();
  e.firmas = firmasIniciales();
  e.resultado = null;
  e.vista = { paso: 0, activadas: [] };
  e.ruta = rutaInicial();
  e.reloj = relojInicial();
}

// El reloj avanza (solo en acciones validadas del anfitrión). Si con eso los inversores se retiran (retraso > 12 meses),
// la misión se cancela: resultado de misión cancelada e informe. → true si se canceló.
function avanzarReloj(e, meses, D) {
  if (!e.reloj || typeof e.reloj !== 'object') e.reloj = relojInicial();
  e.reloj.mes = (Number.isInteger(e.reloj.mes) ? e.reloj.mes : 0) + Math.max(0, Math.floor(meses) || 0);
  if (!relojDe(e, D).cancelada) return false;
  e.resultado = resultadoCancelado(e, D);
  e.firmas = firmasIniciales();
  e.vista = { paso: 0, activadas: [] };
  e.fase = 'informe';
  return true;
}
// Mes de lanzamiento pedido en planificarRuta: `mes`, o `ventana` (nombre antiguo que aún manda la interfaz).
const mesPedido = (p) => (p.mes !== undefined ? p.mes : p.ventana);

// Reparto de carpetas (lo hace el anfitrión con la semilla: todos ven la misma mesa).
// Las jugables del escenario siempre están; el resto se rellena al azar con las demás del escenario.
function repartir(e, escenario, D) {
  const M = D.MISIONES && typeof D.MISIONES === 'object' ? D.MISIONES : {};
  const E = Array.isArray(D.ESCENARIOS) ? D.ESCENARIOS.find((x) => x?.id === escenario) : D.ESCENARIOS?.[escenario];
  let pool = Array.isArray(E?.misiones) ? E.misiones.filter((id) => M[id]) : [];
  if (!pool.length) pool = Object.values(M).filter((m) => m?.escenario === escenario).map((m) => m.id);
  const azar = prng(derivar(e.semilla ?? 0, 'reparto', escenario, String(e.briefing.repartos)));
  const jugables = barajar(azar, pool.filter((id) => M[id]?.jugable));
  const resto = barajar(azar, pool.filter((id) => !M[id]?.jugable));
  e.briefing.reparto = barajar(azar, [...jugables, ...resto].slice(0, CARPETAS_POR_REPARTO));
  e.briefing.repartos++;
}

// ---------- Acciones ----------
// Cada acción: fases en las que vale (null = todas), validar → motivo de rechazo o null, aplicar → muta el estado.
// ctx = { ahora, aleatorio, datos? } lo pone el anfitrión: los clientes nunca ejecutan esto.
// Los motivos nuevos (fases de juego) van en inglés porque se muestran al jugador tal cual.
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
      if (j.rol && p.propio && j.rol === p.rol && tallerVacio(e.porRol[j.rol]) && tamano(p.propio) <= 16_000) {
        e.porRol[j.rol] = normalizarTaller(j.rol, p.propio);
      }
    },
  },

  elegirRol: {
    // En cualquier fase: quien llega tarde a una partida en curso puede tomar un rol vacante (MEC-03).
    fases: null,
    validar(e, id, p, ctx) {
      if (!e.jugadores[id]) return 'No estás en la sala';
      if (p.rol === null) return null;
      if (!ROLES_IDS.includes(p.rol)) return 'Rol desconocido';
      if (!rolLibre(e, p.rol, ctx.ahora, id)) return `Ese rol ya lo tiene ${duenoDeRol(e, p.rol)[1].nick}`;
      return null;
    },
    aplicar(e, id, p) {
      // La firma es de quien lleva el rol: si el rol cambia de manos, hay que volver a firmar.
      const antes = e.jugadores[id]?.rol;
      asignarRol(e, id, p.rol);
      if (e.firmas) for (const r of [antes, p.rol]) if (r && r in e.firmas) e.firmas[r] = false;
    },
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

  // El expediente: marcar o desmarcar un objetivo de la misión. El prioritario no se puede quitar.
  // La dificultad (número de eventos de diseño) sale de cuántos objetivos secundarios se marcan.
  objetivo: {
    fases: ['briefing'],
    validar(e, id, p, ctx) {
      if (!e.jugadores[id]?.rol) return 'You need a role';
      const D = datosDe(ctx);
      if (!D) return sinDatos;
      const m = misionDe(e, D);
      if (!m) return 'Choose a mission first';
      const o = (m.objetivos || []).find((x) => x?.id === p.id);
      if (!o) return 'Unknown goal for this mission';
      if (o.prioridad && !p.on) return 'The priority goal cannot be dropped';
      return null;
    },
    aplicar(e, id, p, ctx) {
      const m = misionDe(e, datosDe(ctx));
      const sel = new Set(Array.isArray(e.mision.objetivos) ? e.mision.objetivos : []);
      if (p.on) sel.add(p.id); else sel.delete(p.id);
      e.mision.objetivos = (m.objetivos || []).map((o) => o.id).filter((x) => sel.has(x));
      e.mision.dificultad = dificultadPorObjetivos(m, e.mision.objetivos);
      e.briefing.listos = {};
    },
  },

  // Compromiso de plazo (contrato-reloj.md §1): en el expediente se elige el mes de lanzamiento prometido a los inversores,
  // de m.reloj.plazos. { plazo }. Corto: +10 % de presupuesto; largo: −10 %. Cambiarlo anula los "listo".
  comprometerPlazo: {
    fases: ['briefing'],
    validar(e, id, p, ctx) {
      if (!e.jugadores[id]?.rol) return 'You need a role';
      const D = datosDe(ctx);
      if (!D) return sinDatos;
      const m = misionDe(e, D);
      if (!m) return 'Choose a mission first';
      if (!plazosDe(m).length) return 'This mission has no launch commitment';
      if (!plazosDe(m).includes(p.plazo)) return 'Unknown commitment';
      return null;
    },
    aplicar(e, id, p) {
      e.mision.plazo = p.plazo;
      e.briefing.listos = {};
    },
  },

  // Listo para diseñar. Cuando todos los conectados con rol están listos, empieza el diseño.
  listo: {
    fases: ['briefing'],
    validar(e, id, p, ctx) {
      if (!e.jugadores[id]?.rol) return 'You need a role';
      if (!p.on) return null;
      const D = datosDe(ctx);
      if (!D) return sinDatos;
      const m = misionDe(e, D);
      if (!m) return 'Choose a mission first';
      if (!m.jugable) return 'That mission is not playable yet';
      return null;
    },
    aplicar(e, id, p) {
      e.briefing.listos[id] = !!p.on;
      if (!faltanListos(e).length) { e.fase = 'diseno'; e.briefing.listos = {}; }
    },
  },

  // Notas libres del taller propio. Las claves de las piezas, cohete, ruta y contingencias son del motor.
  editarPropio: {
    fases: ['briefing', 'diseno', 'restricciones'],
    validar(e, id, p) {
      const rol = e.jugadores[id]?.rol;
      if (!rol) return 'Necesitas un rol';
      if (!esTexto(p.clave, 32)) return 'Clave inválida';
      if (CLAVES_RESERVADAS.includes(p.clave)) return 'Reserved key: use the workshop actions';
      if (tamano(p.valor) > 8_000) return 'Dato demasiado grande';
      if (tamano(e.porRol[rol]) + tamano(p.valor) > 32_000) return 'Tu taller está lleno';
      return null;
    },
    aplicar(e, id, p) {
      const rol = e.jugadores[id].rol;
      if (p.valor === null) delete taller(e, rol)[p.clave];
      else taller(e, rol)[p.clave] = p.valor;
    },
  },

  // MEC-02. { escenario?, id?, dificultad? }. Cambiar de misión vacía talleres, eventos de diseño y firmas.
  elegirMision: {
    fases: ['briefing'],
    validar(e, id, p, ctx) {
      if (!e.jugadores[id]?.rol) return 'You need a role';
      const D = datosDe(ctx);
      if (!D) return sinDatos;
      return nuevaMision(e, p, D)[1];
    },
    aplicar(e, id, p, ctx) {
      const D = datosDe(ctx);
      const [m] = nuevaMision(e, p, D);
      const cambia = (e.mision?.id ?? null) !== m.id;
      const otroEscenario = m.escenario != null && m.escenario !== (e.mision?.escenario ?? null);
      e.mision = m;
      if (cambia) reiniciarDiseno(e);
      if (otroEscenario) repartir(e, m.escenario, D);
      e.briefing.listos = {};
    },
  },

  // MEC-04. { rol?, pieza, op?, uso? }
  montar: {
    fases: ['diseno', 'restricciones'],
    validar(e, id, p, ctx) {
      const D = datosDe(ctx);
      if (!D) return sinDatos;
      const [rol, motivo] = rolParaActuar(e, id, p.rol);
      if (motivo) return motivo;
      const m = misionDe(e, D);
      if (!m) return 'Choose a mission first';
      const pieza = esTexto(p.pieza, 64) ? D.PIEZAS?.[p.pieza] : null;
      if (!pieza) return 'Unknown part';
      if (pieza.rol !== rol) return `That part belongs to ${NOMBRE_ROL[pieza.rol] ?? 'another role'}`;
      if (!piezaEnMision(m, p.pieza, pieza)) return 'That part is not available for this mission';
      const [s, mal] = seleccion(pieza, p);
      if (mal) return mal;
      if (tallerLleno(e, rol)) return 'Workshop is full';
      return enRestricciones(e, { tipo: 'montar', rol, pieza: p.pieza, ...s }, D);
    },
    aplicar(e, id, p, ctx) {
      const D = datosDe(ctx);
      const [rol] = rolParaActuar(e, id, p.rol);
      const [s] = seleccion(D.PIEZAS[p.pieza], p);
      taller(e, rol);
      aplicarCambio(e.porRol, { tipo: 'montar', rol, pieza: p.pieza, ...s });
      borrarFirmas(e);
    },
  },

  // { rol?, pieza }
  quitar: {
    fases: ['diseno', 'restricciones'],
    validar(e, id, p, ctx) {
      const D = datosDe(ctx);
      if (!D) return sinDatos;
      const [rol, motivo] = rolParaActuar(e, id, p.rol);
      if (motivo) return motivo;
      if (!esTexto(p.pieza, 64) || !e.porRol[rol]?.piezas?.[p.pieza]) return 'That part is not mounted';
      return enRestricciones(e, { tipo: 'quitar', rol, pieza: p.pieza }, D);
    },
    aplicar(e, id, p) {
      const [rol] = rolParaActuar(e, id, p.rol);
      aplicarCambio(e.porRol, { tipo: 'quitar', rol, pieza: p.pieza });
      borrarFirmas(e);
    },
  },

  // MEC-05. { id } (null lo quita)
  elegirCohete: {
    fases: ['diseno', 'restricciones'],
    validar(e, id, p, ctx) {
      const D = datosDe(ctx);
      if (!D) return sinDatos;
      const motivo = puedeComoRol(e, id, 'vuelo');
      if (motivo) return motivo;
      const m = misionDe(e, D);
      if (!m) return 'Choose a mission first';
      if (p.id != null) {
        const c = esTexto(p.id, 64) ? D.COHETES?.[p.id] : null;
        if (!c || !(m.cohetes || []).includes(p.id)) return 'That launch vehicle is not offered for this mission';
        if (c.cumpleDEC09 === false) return 'That launch vehicle is not allowed (DEC-09)';
      }
      return enRestricciones(e, { tipo: 'cohete', id: p.id ?? null }, D);
    },
    aplicar(e, id, p) { taller(e, 'vuelo'); aplicarCambio(e.porRol, { tipo: 'cohete', id: p.id ?? null }); borrarFirmas(e); },
  },

  // MEC-06. { id } (null la quita)
  elegirRuta: {
    fases: ['diseno', 'restricciones'],
    validar(e, id, p, ctx) {
      const D = datosDe(ctx);
      if (!D) return sinDatos;
      const motivo = puedeComoRol(e, id, 'vuelo');
      if (motivo) return motivo;
      const m = misionDe(e, D);
      if (!m) return 'Choose a mission first';
      if (p.id != null && !(esTexto(p.id, 64) && (m.rutas || []).some((r) => r?.id === p.id))) return 'Unknown route for this mission';
      return enRestricciones(e, { tipo: 'ruta', id: p.id ?? null }, D);
    },
    aplicar(e, id, p) { taller(e, 'vuelo'); aplicarCambio(e.porRol, { tipo: 'ruta', id: p.id ?? null }); borrarFirmas(e); },
  },

  // MEC-08. { id, on }
  contingencia: {
    fases: ['diseno', 'restricciones'],
    validar(e, id, p, ctx) {
      const D = datosDe(ctx);
      if (!D) return sinDatos;
      const m = misionDe(e, D);
      if (!m) return 'Choose a mission first';
      if (!esTexto(p.id, 64) || !D.CONTINGENCIAS?.[p.id] || !(m.contingencias || []).includes(p.id)) return 'Unknown contingency for this mission';
      const motivo = puedeComoRol(e, id, rolDeContingencia(D, p.id)); // cada departamento compra las suyas
      if (motivo) return motivo;
      const lista = Array.isArray(e.porRol.comms?.contingencias) ? e.porRol.comms.contingencias : [];
      if (p.on && !lista.includes(p.id) && lista.length >= MAX_CONTINGENCIAS) return `You can buy at most ${MAX_CONTINGENCIAS} contingencies`;
      return enRestricciones(e, { tipo: 'contingencia', id: p.id, on: !!p.on }, D);
    },
    aplicar(e, id, p) { taller(e, 'comms'); aplicarCambio(e.porRol, { tipo: 'contingencia', id: p.id, on: !!p.on }); borrarFirmas(e); },
  },

  // MEC-10, MEC-11, MEC-12. { revision? }: si viene, tiene que ser estado.diseno.revisiones (evita dobles clics).
  // Mientras queden eventos de diseño, sale uno en vez de la revisión. Después se evalúa y se va a la fase que toque.
  // El resultado queda en estado.diseno.ultima = { tipo: 'evento', id } | { tipo: 'revision', nivel, barras }.
  pedirRevision: {
    fases: ['diseno', 'restricciones'],
    validar(e, id, p, ctx) {
      if (!e.jugadores[id]?.rol) return 'You need a role';
      const D = datosDe(ctx);
      if (!D) return sinDatos;
      if (!misionDe(e, D)) return 'Choose a mission first';
      if (p.revision != null && p.revision !== e.diseno.revisiones) return 'A review was already requested';
      return null;
    },
    aplicar(e, id, p, ctx) {
      const D = datosDe(ctx);
      const n = ++e.diseno.revisiones;
      // Cada revisión cuesta MESES_REVISION; un evento con `meses` (p. ej. un proveedor que se retrasa) suma los suyos.
      if (e.fase === 'diseno') {
        const sig = siguienteEventoDiseno(e, D);
        if (sig) {
          e.diseno.eventos.push({ id: sig });
          e.diseno.ultima = { tipo: 'evento', id: sig, revision: n };
          const extra = Number(D.EVENTOS_DISENO?.[sig]?.efecto?.meses);
          avanzarReloj(e, MESES_REVISION + (Number.isFinite(extra) ? extra : 0), D);
          return;
        }
      }
      if (avanzarReloj(e, MESES_REVISION, D)) return;
      const c = cumple(resumen(e, D));
      e.diseno.ultima = { tipo: 'revision', nivel: c.nivel, barras: c.barras, revision: n };
      if (c.nivel === 'dentro') e.fase = 'verificacion';
      else if (c.nivel === 'tolerancia') e.fase = 'restricciones';
      else e.fase = 'diseno';
    },
  },

  // MEC-13. { rol?, on }
  firmar: {
    fases: ['verificacion'],
    validar(e, id, p, ctx) {
      const [, motivo] = rolParaActuar(e, id, p.rol);
      if (motivo) return motivo;
      if (!p.on) return null;
      const D = datosDe(ctx);
      if (!D) return sinDatos;
      if (!verificar(e, D).pasa) return 'Some checks fail: go back to design';
      return null;
    },
    aplicar(e, id, p) {
      const [rol] = rolParaActuar(e, id, p.rol);
      e.firmas[rol] = !!p.on;
    },
  },

  // MEC-13, MEC-14: comprobaciones y 4 firmas; el anfitrión simula el vuelo y lo guarda.
  lanzar: {
    fases: ['verificacion'],
    validar(e, id, p, ctx) {
      if (!e.jugadores[id]?.rol) return 'You need a role';
      const D = datosDe(ctx);
      if (!D) return sinDatos;
      if (!verificar(e, D).pasa) return 'Some checks fail: go back to design';
      const faltan = ROLES_IDS.filter((r) => !e.firmas?.[r]);
      if (faltan.length) return `Missing signatures: ${faltan.map((r) => NOMBRE_ROL[r]).join(', ')}`;
      return null;
    },
    aplicar(e, id, p, ctx) {
      const r = simular(e, datosDe(ctx));
      if (tamano(r) > 24_000) { r.causas = r.causas.slice(0, 10).concat(r.causas.slice(-1)); r.fallos = (r.fallos || []).slice(0, 8); }
      e.resultado = r;
      e.vista = { paso: 0 };
      e.fase = 'mision';
    },
  },

  // vista.paso = índice del último paso revelado (al lanzar ya se ve el 0). Avanzar revela el siguiente;
  // desde el último pasa al informe. { paso? }: si viene, tiene que ser vista.paso (evita dobles clics).
  avanzar: {
    fases: ['mision'],
    validar(e, id, p, ctx) {
      if (!e.jugadores[id]?.rol) return 'You need a role';
      if (p.paso != null && p.paso !== (e.vista?.paso ?? 0)) return 'Already advanced';
      const falta = contingenciaPendiente(e);
      if (falta) {
        const D = datosDe(ctx);
        return `Activate the contingency first: ${D?.CONTINGENCIAS?.[falta]?.nombre?.en ?? falta} (${NOMBRE_ROL[rolDeContingencia(D, falta)]})`;
      }
      return null;
    },
    aplicar(e) {
      const total = e.resultado?.pasos?.length ?? 0;
      const paso = e.vista?.paso ?? 0;
      if (paso >= total - 1) e.fase = 'informe';
      else e.vista = { ...e.vista, paso: paso + 1 };
    },
  },

  // Sala de control: el departamento dueño activa la contingencia que el paso visible necesita. { id }
  activarContingencia: {
    fases: ['mision'],
    validar(e, id, p, ctx) {
      const D = datosDe(ctx);
      if (!D) return sinDatos;
      if (!esTexto(p.id, 64) || contingenciaPendiente(e) !== p.id) return 'That contingency is not needed now';
      return puedeComoRol(e, id, rolDeContingencia(D, p.id));
    },
    aplicar(e, id, p) {
      const a = Array.isArray(e.vista?.activadas) ? e.vista.activadas : [];
      e.vista = { ...e.vista, activadas: [...new Set([...a, p.id])] };
    },
  },

  // Sala de control, planificación de ruta: mes de lanzamiento y sitio de descenso u órbita (contrato-reloj.md §1).
  // { mes?: meses desde el inicio de la misión (entero), sitio?: id del sitio } (`ventana` se acepta como nombre antiguo de `mes`).
  // El mes lo fija Vuelo y Mecánica; el sitio, Vuelo y Mecánica o Ciencia (que lee las capas de datos).
  // Reglas del mes: dentro de 0..mesMax de la planificación; no antes del mes actual (ya pasó); en diseño y restricciones, no antes
  // de reloj.mes + MESES_REVISION (la revisión que falta consume esos meses); nunca más de RETRASO_CANCELA meses tras el plazo.
  // En Restricciones y Verificación no puede subir ninguna barra que acabe fuera de su límite, salvo para rehacer un plan perdido.
  planificarRuta: {
    fases: ['diseno', 'restricciones', 'verificacion'],
    validar(e, id, p, ctx) {
      const mes = mesPedido(p);
      if (mes !== undefined) { const motivo = puedeComoRol(e, id, 'vuelo'); if (motivo) return motivo; }
      if (p.sitio !== undefined && puedeComoRol(e, id, 'vuelo') && puedeComoRol(e, id, 'ciencia')) return 'Only Flight & Mechanics or Science can choose the site';
      if (mes === undefined && p.sitio === undefined) return 'Nothing to plan';
      if (mes != null && !(Number.isInteger(mes) && mes >= 0 && mes <= 1000)) return 'Unknown launch month';
      if (p.sitio != null && !esTexto(p.sitio, 64)) return 'Unknown site';
      const D = datosDe(ctx);
      const m = D ? misionDe(e, D) : null;
      const P = m ? D.PLANIFICACION?.[m.id] : null;
      if (P) {
        if (mes != null && mes > mesMaxDe(P, m, D)) return 'Unknown launch month';
        if (p.sitio != null && !(P.sitios || []).some((s) => s?.id === p.sitio)) return 'Unknown site';
      }
      if (mes != null && D && m) {
        const rl = relojDe(e, D);
        if (mes < rl.mes) return 'Launch month already passed';
        if (e.fase !== 'verificacion' && mes < rl.mes + MESES_REVISION) return `Too soon: the design review takes ${MESES_REVISION} months`;
        if (rl.activo && mes - rl.plazo > RETRASO_CANCELA) return 'Investors will not wait that long';
      }
      if ((e.fase === 'restricciones' || e.fase === 'verificacion') && D && !planDe(e, D)?.perdida) {
        const despues = { ...e, ruta: { ...(e.ruta ?? {}), ...(mes !== undefined ? { mes } : {}), ...(p.sitio !== undefined ? { sitio: p.sitio } : {}) } };
        const antes = resumen(e, D).barras, luego = resumen(despues, D).barras;
        for (const b of Object.keys(antes)) {
          if (luego[b].ratio > antes[b].ratio + 1e-9 && luego[b].estado !== 'ok') return 'In Constraints that change would raise a bar over its limit';
        }
      }
      return null;
    },
    aplicar(e, id, p) {
      if (!e.ruta || typeof e.ruta !== 'object') e.ruta = rutaInicial();
      const mes = mesPedido(p);
      if (mes !== undefined) e.ruta.mes = mes;
      if (p.sitio !== undefined) e.ruta.sitio = p.sitio;
      e.ruta.ventana = e.ruta.mes; // COMPATIBILIDAD: la interfaz del lote 1 lee ruta.ventana; se quita en el lote 2
      borrarFirmas(e);
    },
  },

  // Cambio de fase genérico, limitado a TRANSICIONES y sin saltarse revisión, lanzamiento ni avance.
  cambiarFase: {
    fases: null,
    validar(e, id, p, ctx) {
      if (!e.jugadores[id]?.rol) return 'Necesitas un rol';
      if (!(TRANSICIONES[e.fase] || []).includes(p.fase)) return `No se puede pasar de ${e.fase} a ${p.fase}`;
      const k = `${e.fase}>${p.fase}`;
      if (SOLO_POR_ACCION[k]) return MOTIVO_SOLO_POR_ACCION[SOLO_POR_ACCION[k]];
      if (k === 'informe>diseno') {
        const D = datosDe(ctx);
        // Rediseñar cuesta MESES_REDISENO: si con eso el retraso pasa de 12 meses, los inversores no lo aceptan.
        if (D && misionDe(e, D) && relojDe({ ...e, reloj: { mes: (e.reloj?.mes ?? 0) + MESES_REDISENO } }, D).cancelada) return 'Investors pulled out';
      }
      if (k === 'briefing>diseno') {
        const D = datosDe(ctx);
        if (!D) return sinDatos;
        const m = misionDe(e, D);
        if (!m) return 'Choose a mission first';
        if (!m.jugable) return 'That mission is not playable yet';
        if (!e.mision.dificultad) return 'Choose a difficulty';
        const faltan = faltanListos(e);
        if (faltan.length) return `Waiting for ${faltan.map(([, j]) => j.nick).join(', ')} to press Ready`;
      }
      return null;
    },
    aplicar(e, id, p, ctx) {
      const k = `${e.fase}>${p.fase}`;
      if (k === 'informe>diseno') {
        // Rediseñar (AN-15): se conservan diseño, semilla y eventos de diseño ya vistos. El reloj avanza MESES_REDISENO
        // (la validación ya comprobó que eso no cancela la misión).
        e.firmas = firmasIniciales();
        e.resultado = null;
        e.vista = { paso: 0, activadas: [] };
        e.diseno.ultima = null;
        if (!e.reloj || typeof e.reloj !== 'object') e.reloj = relojInicial();
        e.reloj.mes = (Number.isInteger(e.reloj.mes) ? e.reloj.mes : 0) + MESES_REDISENO;
      }
      if (p.fase === 'lobby') {
        e.mision = null;
        reiniciarDiseno(e);
        e.briefing = briefingInicial();
      }
      e.fase = p.fase;
    },
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
  completarEstado(e);
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

// Un estado que llega de fuera puede no traer los campos nuevos: se completan sin tocar lo que hay.
function completarEstado(e) {
  if (e.mision === undefined) e.mision = null;
  if (!e.porRol || typeof e.porRol !== 'object') e.porRol = {};
  for (const rol of ROLES_IDS) {
    const t = e.porRol[rol];
    if (!t || typeof t !== 'object') e.porRol[rol] = tallerInicial(rol);
    else if (!t.piezas || typeof t.piezas !== 'object' || Array.isArray(t.piezas)) t.piezas = {};
  }
  if (!e.diseno || typeof e.diseno !== 'object') e.diseno = disenoInicial();
  if (!Array.isArray(e.diseno.eventos)) e.diseno.eventos = [];
  if (!Number.isFinite(e.diseno.revisiones)) e.diseno.revisiones = 0;
  if (!e.firmas || typeof e.firmas !== 'object') e.firmas = firmasIniciales();
  if (e.resultado === undefined) e.resultado = null;
  if (!e.vista || typeof e.vista !== 'object') e.vista = { paso: 0, activadas: [] };
  if (!Array.isArray(e.vista.activadas)) e.vista.activadas = [];
  if (!e.briefing || typeof e.briefing !== 'object') e.briefing = briefingInicial();
  if (!e.briefing.listos || typeof e.briefing.listos !== 'object') e.briefing.listos = {};
  if (!Number.isFinite(e.briefing.repartos)) e.briefing.repartos = 0;
  if (e.briefing.reparto === undefined) e.briefing.reparto = null;
  // v4: ruta.ventana (día de una ventana) → ruta.mes (mes desde el inicio). Un día viejo no equivale a un mes: se vacía.
  if (!e.ruta || typeof e.ruta !== 'object') e.ruta = rutaInicial();
  // (v4 guarda ruta.ventana = ruta.mes como copia para la interfaz antigua.)
  if (!Number.isInteger(e.ruta.mes)) { e.ruta.mes = null; delete e.ruta.ventana; }
  if (e.ruta.sitio === undefined) e.ruta.sitio = null;
  if (!e.reloj || typeof e.reloj !== 'object' || !Number.isInteger(e.reloj.mes) || e.reloj.mes < 0) e.reloj = relojInicial();
  // Partida anterior sin plazo: queda sin compromiso (la regla de inversores no se aplica) hasta comprometerPlazo.
  if (e.mision && typeof e.mision === 'object' && e.mision.plazo === undefined) e.mision.plazo = null;
}

// Contingencia que el paso visible del vuelo necesita y que nadie ha activado aún (o null).
export function contingenciaPendiente(e) {
  const paso = e.resultado?.pasos?.[e.vista?.paso ?? 0];
  if (!paso?.mitigado || !paso.mitigador) return null;
  return (e.vista?.activadas ?? []).includes(paso.mitigador) ? null : paso.mitigador;
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
