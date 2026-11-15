// Motivos de rechazo del anfitrión (src/red/protocolo.js, src/reglas/motor.js) → texto en el idioma activo.
// El servidor manda cadenas fijas en inglés (y algunas en español). traducirMotivo() las reconoce en cualquiera de las dos
// lenguas y devuelve la del idioma activo. Lo desconocido se devuelve tal cual.
import { idioma, depto, tx } from './i18n.js';
import { T } from './textos.js';
import { CONTINGENCIAS } from './datos/eventos.js';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ROLES = ['vuelo', 'ciencia', 'potencia', 'comms'];
const BARRAS_EN = { Mass: 'masa', Power: 'potencia', Battery: 'bateria', 'Data link': 'datos', Budget: 'presupuesto', Volume: 'volumen' };

// Nombre de rol (en cualquiera de sus formas conocidas) → id de rol.
function rolId(nombre) {
  const n = String(nombre ?? '').trim().toLowerCase();
  const extra = { 'flight & mechanics': 'vuelo', science: 'ciencia', power: 'potencia', 'comms & ops': 'comms', 'communications & operations': 'comms' };
  if (extra[n]) return extra[n];
  // depto() usa el idioma activo; la otra lengua se cubre con las tablas de arriba y de abajo.
  for (const r of ROLES) {
    if (depto(r, 'corto').toLowerCase() === n || depto(r, 'largo').toLowerCase() === n) return r;
  }
  const es = { 'vuelo y mecánica': 'vuelo', ciencia: 'ciencia', energía: 'potencia', 'comunicaciones y operaciones': 'comms' };
  return es[n] ?? null;
}
const rol = (nombre) => { const id = rolId(nombre); return id ? depto(id) : nombre; };
const roles = (lista) => String(lista).split(', ').map(rol).join(', ');
// El anfitrión escribe el nombre de la contingencia en inglés (o con su id si no lo tiene): se busca en los datos y se da en el idioma activo.
function nombreContingencia(nombre) {
  const n = String(nombre ?? '').trim();
  for (const [id, k] of Object.entries(CONTINGENCIAS)) {
    if (id === n || k?.nombre?.en === n || k?.nombre?.es === n) return tx(k.nombre, n);
  }
  return n;
}
const barra = (nombre) => { const k = BARRAS_EN[nombre] ?? Object.keys(T.bars).find((x) => T.bars[x] === nombre); return k && T.bars[k] ? T.bars[k] : nombre; };

// Cada entrada: [regex inglés, regex español, (…grupos) => inglés, (…grupos) => español].
// Para las cadenas fijas se usa fijo(en, es).
const TABLA = [];
const fijo = (en, es) => TABLA.push([new RegExp(`^${esc(en)}$`), new RegExp(`^${esc(es)}$`), () => en, () => es]);
const plantilla = (reEn, reEs, en, es) => TABLA.push([reEn, reEs, en, es]);

// --- Frases con datos ---
plantilla(/^Only (.+) can do that$/, /^Solo (.+) puede hacerlo$/,
  (r) => `Only ${rol(r)} can do that`, (r) => `Solo ${rol(r)} puede hacerlo`);
plantilla(/^(.+) has a player: only they can do that$/, /^(.+) tiene un jugador: solo esa persona puede hacerlo$/,
  (r) => `Only the ${rol(r)} player can do that`, (r) => `Solo el jugador de ${rol(r)} puede hacerlo`);
plantilla(/^That part belongs to (.+)$/, /^Esa pieza pertenece a (.+)$/,
  (r) => `That part belongs to ${rol(r)}`, (r) => `Esa pieza pertenece a ${r === 'another role' ? 'otro departamento' : rol(r)}`);
plantilla(/^Usage must be between (.+) and (.+) h\/day$/, /^El uso debe estar entre (.+) y (.+) h\/día$/,
  (a, b) => `Usage must be between ${a} and ${b} h/day`, (a, b) => `El uso debe estar entre ${a} y ${b} h/día`);
plantilla(/^You can buy at most (\d+) contingencies$/, /^Puedes tomar como máximo (\d+) contingencias$/,
  (n) => `You can take at most ${n} contingencies`, (n) => `Puedes tomar como máximo ${n} contingencias`);
plantilla(/^Waiting for (.+) to press Ready$/, /^Esperando a que (.+) pulse "Listo"$/,
  (n) => `Waiting for ${n} to press Ready`, (n) => `Esperando a que ${n} pulse "Listo"`);
plantilla(/^Missing signatures: (.+)$/, /^Faltan firmas: (.+)$/,
  (l) => `Missing signatures: ${roles(l)}`, (l) => `Faltan firmas: ${roles(l)}`);
plantilla(/^Activate the contingency first: (.+) \((.+)\)$/, /^Primero activa la contingencia: (.+) \((.+)\)$/,
  (c, r) => `Activate the contingency first: ${nombreContingencia(c)} (${rol(r)})`, (c, r) => `Primero activa la contingencia: ${nombreContingencia(c)} (${rol(r)})`);
plantilla(/^That would raise (.+), which is over its limit$/, /^Eso subiría (.+), que ya pasa su límite$/,
  (b) => `You cannot raise ${barra(b)}: it is over its limit`, (b) => `No puedes subir ${barra(b)}: ya pasa su límite`);
plantilla(/^That would push (.+) over its limit$/, /^Eso haría que (.+) pase su límite$/,
  (b) => `That would push ${barra(b)} over its limit`, (b) => `Eso haría que ${barra(b)} pase su límite`);

// Motivos que el anfitrión escribe en español.
plantilla(/^La sala está llena \((\d+) máximo\)$/, /^La sala está llena \((\d+) máximo\)$/,
  (n) => `The room is full (${n} maximum)`, (n) => `La sala está llena (${n} máximo)`);
plantilla(/^Ese rol ya lo tiene (.+)$/, /^Ese rol ya lo tiene (.+)$/,
  (n) => `${n} already has that role`, (n) => `Ese rol ya lo tiene ${n}`);
plantilla(/^Falta que (.+) elija rol$/, /^Falta que (.+) elija rol$/,
  (n) => `${n} still has to choose a role`, (n) => `Falta que ${n} elija rol`);
const FASES = { briefing: 'briefing', diseno: 'diseno', restricciones: 'restricciones', verificacion: 'verificacion', mision: 'mision', informe: 'informe', lobby: 'lobby' };
const fase = (f) => (T.phases?.[FASES[f]] ?? (f === 'lobby' ? T.toLobby : f));
plantilla(/^No se puede pasar de (\S+) a (\S+)$/, /^No se puede pasar de (\S+) a (\S+)$/,
  (a, b) => `You cannot move from ${fase(a)} to ${fase(b)}`, (a, b) => `No se puede pasar de ${fase(a)} a ${fase(b)}`);

// --- Cadenas fijas ---
fijo('You need a role', 'Necesitas un rol');
fijo('Unknown role', 'Rol desconocido');
fijo('Choose a mission first', 'Primero elige una misión');
fijo('Choose a difficulty', 'Elige una dificultad');
fijo('Say yes or no', 'Di sí o no');
fijo('Unknown goal for this mission', 'Objetivo desconocido para esta misión');
fijo('The priority goal cannot be dropped', 'La meta prioritaria no se puede quitar');
fijo('That mission is not playable yet', 'Esa misión todavía no se puede jugar');
fijo('Unknown scenario', 'Escenario desconocido');
fijo('Unknown mission', 'Misión desconocida');
fijo('That mission belongs to another scenario', 'Esa misión pertenece a otro escenario');
fijo('Unknown difficulty', 'Dificultad desconocida');
fijo('Reserved key: use the workshop actions', 'Clave reservada: usa las acciones del taller');
fijo('Unknown part', 'Pieza desconocida');
fijo('That part is not available for this mission', 'Esa pieza no está disponible en esta misión');
fijo('Workshop is full', 'El taller está lleno');
fijo('That part is not mounted', 'Esa pieza no está montada');
fijo('Unknown option for that part', 'Opción desconocida para esa pieza');
fijo('Usage must be a number of hours per day', 'El uso debe ser un número de horas por día');
fijo('That launch vehicle is not offered for this mission', 'Ese cohete no se ofrece en esta misión');
fijo('That launch vehicle is not allowed (DEC-09)', 'Ese cohete no está permitido (DEC-09)');
fijo('Unknown route for this mission', 'Ruta desconocida para esta misión');
fijo('Unknown contingency for this mission', 'Contingencia desconocida para esta misión');
fijo('A review was already requested', 'Ya se pidió una revisión');
plantilla(/^Some checks fail: go back to design$/, /^Algunas comprobaciones fallan: vuelve al diseño$/,
  () => 'Some checks fail: return to design', () => 'Algunas comprobaciones fallan: vuelve a diseño');
fijo('Already advanced', 'Ya se avanzó');
fijo('That contingency is not needed now', 'Esa contingencia no hace falta ahora');
fijo('Unknown launch day', 'Día de lanzamiento desconocido');
// Reloj de misión (contrato-reloj.md).
fijo('Unknown launch month', 'Mes de lanzamiento desconocido');
fijo('Launch month already passed', 'El mes de lanzamiento ya pasó');
plantilla(/^Too soon: the design review takes (\d+) months$/, /^Demasiado pronto: la revisión de diseño lleva (\d+) meses$/,
  (n) => `Too soon: the design review takes ${n} months`, (n) => `Demasiado pronto: la revisión de diseño lleva ${n} meses`);
fijo('Investors will not wait that long', 'Los inversores no esperarán tanto');
fijo('Investors pulled out', 'Los inversores se retiraron');
fijo('Unknown commitment', 'Plazo de compromiso desconocido');
fijo('This mission has no launch commitment', 'Esta misión no tiene plazo de compromiso');
fijo('Nothing to plan', 'No hay nada que planificar');
fijo('Only Flight & Mechanics or Science can choose the site', 'Solo Vuelo y Mecánica o Ciencia pueden elegir el sitio');
fijo('In Constraints that change would raise a bar over its limit', 'En Restricciones ese cambio subiría una barra por encima de su límite');
fijo('Unknown site', 'Sitio desconocido');
fijo('Game data not loaded', 'Los datos del juego no se han cargado');
fijo('Unknown change', 'Cambio desconocido');
fijo('In Constraints you can only remove or reduce, not add new parts', 'En Restricciones solo puedes quitar o reducir, no añadir piezas nuevas');
fijo('In Constraints you can only lower usage', 'En Restricciones solo puedes bajar el uso');
fijo('In Constraints you cannot buy new contingencies', 'En Restricciones no puedes tomar contingencias nuevas');
// Motivos que el anfitrión escribe en español.
fijo('The nickname is missing', 'Falta el nick');
fijo('You are not in the room', 'No estás en la sala');
fijo('Choose a role first', 'Elige un rol primero');
fijo('Invalid key', 'Clave inválida');
fijo('Data too large', 'Dato demasiado grande');
fijo('Your workshop is full', 'Tu taller está lleno');
fijo('Unknown action', 'Acción desconocida');
fijo('That cannot be done in this phase', 'No se puede hacer en esta fase');

// 'Choose a role first' y 'Elige un rol primero' son pares; las entradas "es → es" de arriba (sala llena, etc.) también cubren
// el caso de que el texto llegue ya en español. El orden no importa: cada regex está anclada.
export function traducirMotivo(texto) {
  if (typeof texto !== 'string' || !texto) return texto;
  const activo = idioma() === 'es' ? 3 : 2;
  const t = texto.trim();
  for (const fila of TABLA) {
    for (const re of [fila[0], fila[1]]) {
      const m = re.exec(t);
      if (m) {
        try { return fila[activo](...m.slice(1)); } catch { return texto; }
      }
    }
  }
  return texto;
}

export default traducirMotivo;
