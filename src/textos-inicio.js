// Textos del inicio, el lobby y los diálogos de index.html, en español e inglés. Se leen con TI.clave (siempre la lengua activa).
//
// Claves de TI:
//   Lobby (los pinta main.js):
//     conectando            contador mientras no hay estado ('CONECTANDO…')
//     buscando              fila de la tripulación mientras no hay estado
//     sinConexion           contador sin conexión a los brokers
//     enLaSala(n, max)      contador 'n/max EN LA SALA'
//     tu                    marca tras tu nick ('(tú)')
//     anfitrion             title de la estrella del anfitrión
//     eligiendoRol          rol de quien aún no eligió
//     desconectado          sufijo del rol de un jugador desconectado (incluye ' · ')
//     ocupadoPor(nick)      rol tomado por alguien conectado
//     reservadoPor(nick)    rol reservado por alguien desconectado
//     rolPropio             rol que es mío ('Tu rol · clic para soltarlo')
//     libre                 rol libre
//     entrarMision          botón cuando la misión ya empezó
//     yaEmpezo              aviso cuando la misión ya empezó y no tengo rol
//     iniciarMision         botón de iniciar
//     todosRol              title del botón de iniciar deshabilitado
//     entrandoSala          aviso mientras se entra en la sala
//     versionAjena          aviso de que otro jugador tiene otra versión del juego
//     copiarEnlace          botón de copiar ('Copiar enlace')
//     copiado               confirmación tras copiar
//   Estáticos de index.html (los rellena traducirIndex() por data-t / data-t-ph):
//     unirseTitulo, nick, nickEj (placeholder), codigoSala, comparte, cancelar, entrar,
//     ajustesTitulo, sensibilidad, calidad, calidadAlta, calidadBaja, animar, idioma, listo,
//     sala, copiar, tripulacionTitulo, tuRolTitulo, salir
//   Además traducirIndex() rellena #lema, #jugadores, #txt-unirse y #btn-ajustes (desde config.js) y <title>, y deja
//   el select #in-idioma con el idioma activo. Se ejecuta al cargar y en cada evento 'idioma'.
import { textos, idioma } from './i18n.js';
import { JUEGO, TEXTOS } from './config.js';

export const TI = textos({
  es: {
    conectando: 'CONECTANDO…',
    buscando: 'Buscando a la tripulación…',
    sinConexion: 'SIN CONEXIÓN · REINTENTANDO…',
    enLaSala: (n, max) => `${n}/${max} EN LA SALA`,
    tu: '(tú)',
    anfitrion: 'Anfitrión de la sala',
    eligiendoRol: 'eligiendo rol…',
    desconectado: ' · desconectado',
    ocupadoPor: (nick) => `Ocupado por ${nick}`,
    reservadoPor: (nick) => `Reservado por ${nick}`,
    rolPropio: 'Tu rol · clic para soltarlo',
    libre: 'Libre',
    entrarMision: 'Entrar a la misión',
    yaEmpezo: 'La misión ya empezó. Elige un rol libre.',
    iniciarMision: 'Iniciar misión',
    todosRol: 'Todos deben elegir rol',
    entrandoSala: 'Entrando en la sala…',
    versionAjena: 'Alguien tiene otra versión del juego. Recarga la página (Ctrl+F5).',
    copiarEnlace: 'Copiar enlace',
    copiado: 'Copiado',
    proyectorElige: 'Elige un escenario. Todos ven tu voto.',
    proyectorConfirma: 'Confirma para recibir las carpetas de misión.',
    elegirEscenario: (n) => `Elegir ${n}`,
    clasificado: 'CLASIFICADO',
    unirseTitulo: 'Unirse a la tripulación',
    nick: 'Nick',
    nickEj: 'Ej.: Astro',
    codigoSala: 'Código de sala',
    comparte: 'Usa el mismo código que tu equipo.',
    cancelar: 'Cancelar',
    entrar: 'Entrar',
    ajustesTitulo: 'Ajustes',
    sensibilidad: 'Sensibilidad de la cámara',
    calidad: 'Calidad gráfica',
    calidadAlta: 'Alta',
    calidadBaja: 'Baja (equipos lentos)',
    animar: 'Animar el fondo',
    idioma: 'Idioma / Language',
    listo: 'Listo',
    sala: 'SALA',
    copiar: 'Copiar enlace',
    tripulacionTitulo: 'Tripulación',
    tuRolTitulo: 'Tu rol',
    salir: 'Salir',
  },
  en: {
    conectando: 'CONNECTING…',
    buscando: 'Looking for the crew…',
    sinConexion: 'OFFLINE · RETRYING…',
    enLaSala: (n, max) => `${n}/${max} IN THE ROOM`,
    tu: '(you)',
    anfitrion: 'Room host',
    eligiendoRol: 'choosing role…',
    desconectado: ' · disconnected',
    ocupadoPor: (nick) => `Taken by ${nick}`,
    reservadoPor: (nick) => `Reserved by ${nick}`,
    rolPropio: 'Your role · click to release it',
    libre: 'Free',
    entrarMision: 'Join the mission',
    yaEmpezo: 'The mission started. Choose a free role.',
    iniciarMision: 'Start mission',
    todosRol: 'Every player must choose a role',
    entrandoSala: 'Joining the room…',
    versionAjena: 'Someone has a different game version. Reload the page (Ctrl+F5).',
    copiarEnlace: 'Copy link',
    copiado: 'Copied',
    proyectorElige: 'Choose a scenario. Everyone sees your vote.',
    proyectorConfirma: 'Confirm to receive the mission folders.',
    elegirEscenario: (n) => `Choose ${n}`,
    clasificado: 'CLASSIFIED',
    unirseTitulo: 'Join the crew',
    nick: 'Nickname',
    nickEj: 'E.g.: Astro',
    codigoSala: 'Room code',
    comparte: 'Use the same code as your team.',
    cancelar: 'Cancel',
    entrar: 'Join',
    ajustesTitulo: 'Settings',
    sensibilidad: 'Camera sensitivity',
    calidad: 'Graphics quality',
    calidadAlta: 'High',
    calidadBaja: 'Low (slow computers)',
    animar: 'Animate the background',
    idioma: 'Idioma / Language',
    listo: 'Done',
    sala: 'ROOM',
    copiar: 'Copy link',
    tripulacionTitulo: 'Crew',
    tuRolTitulo: 'Your role',
    salir: 'Leave',
  },
});

const $ = (id) => document.getElementById(id);

// Rellena index.html con la lengua activa. Idempotente.
export function traducirIndex() {
  document.querySelectorAll('[data-t]').forEach((el) => { const v = TI[el.dataset.t]; if (typeof v === 'string') el.textContent = v; });
  document.querySelectorAll('[data-t-ph]').forEach((el) => { const v = TI[el.dataset.tPh]; if (typeof v === 'string') el.placeholder = v; });
  const poner = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  poner('lema', JUEGO.LEMA);
  poner('jugadores', JUEGO.JUGADORES);
  poner('txt-unirse', TEXTOS.unirse);
  poner('btn-ajustes', TEXTOS.ajustes);
  const sel = $('in-idioma');
  if (sel) sel.value = idioma();
  document.title = JUEGO.NOMBRE.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

traducirIndex();
addEventListener('idioma', traducirIndex);
