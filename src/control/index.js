// Pared principal de la sala de control de misión (pantalla proyectada de 1600×800 px lógicos).
// Diseño → planificación de ruta; misión → consola de operaciones; informe → informe final y resumen de operaciones.
import { h } from '../pantallas/ui.js';
import { textos, depto } from '../i18n.js';
import { pantallaPlanificador } from './planificador.js';
import { pantallaOperaciones } from './operaciones.js';
import { pantallaInforme } from '../pantallas/informe.js';

const T = textos({
  es: { cabecera: 'CONTROL DE MISIÓN', plan: 'PLANIFICACIÓN DE RUTA', ops: 'OPERACIONES', informe: 'INFORME FINAL', espera: 'EN ESPERA',
    esperaTxt: 'La misión todavía se está preparando en la sala de briefing. Aquí se planifica la ruta durante el diseño y se sigue el vuelo.',
    verif: 'VERIFICACIÓN EN CURSO', verifTxt: 'La ruta queda congelada mientras se verifica el diseño. Firmad en el portátil y lanzad.' },
  en: { cabecera: 'MISSION CONTROL', plan: 'ROUTE PLANNING', ops: 'OPERATIONS', informe: 'FINAL REPORT', espera: 'STANDING BY',
    esperaTxt: 'The mission is still being prepared in the briefing room. The route is planned here during design and the flight is followed here.',
    verif: 'VERIFICATION IN PROGRESS', verifTxt: 'The route is frozen while the design is verified. Sign on the laptop and launch.' },
});

function reloj() {
  const d = new Date();
  return [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].map((x) => String(x).padStart(2, '0')).join(':') + ' UTC';
}

export function pantallaControl(c, fase) {
  let modo, cuerpo;
  if (fase === 'diseno' || fase === 'restricciones') { modo = T.plan; cuerpo = pantallaPlanificador(c); }
  else if (fase === 'mision') { modo = T.ops; cuerpo = pantallaOperaciones(c); }
  else if (fase === 'informe') {
    modo = T.informe;
    cuerpo = h('div', { class: 'mc-informe', 'data-scroll': 'mc-informe' }, pantallaInforme(c));
  } else if (fase === 'verificacion') {
    modo = T.verif;
    cuerpo = h('div', { class: 'mc-vacio' }, h('p', {}, T.verifTxt), pantallaPlanificador(c));
  } else { modo = T.espera; cuerpo = h('div', { class: 'mc-vacio' }, h('p', {}, T.esperaTxt)); }
  return h('div', { class: 'mc fase-' + fase },
    h('header', { class: 'mc-cab' },
      h('span', { class: 'mc-logo' }, '◉ ', T.cabecera), h('span', { class: 'mc-modo' }, modo),
      h('span', { class: 'mc-mision' }, c.mision?.id ?? ''), h('span', { class: 'mc-yo' }, c.nick, ' · ', depto(c.rol)),
      h('span', { class: 'mc-reloj' }, reloj())),
    h('div', { class: 'mc-cuerpo' }, cuerpo));
}
