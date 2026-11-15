// Pared principal de la sala de control de misión (pantalla proyectada de 1600×800 px lógicos).
// Diseño → planificación de ruta; misión → consola de operaciones; informe → informe final y resumen de operaciones.
import { h } from '../pantallas/ui.js';
import { textos, depto } from '../i18n.js';
import { pantallaPlanificador } from './planificador.js';
import { pantallaOperaciones } from './operaciones.js';
import { pantallaGoNoGo } from './gonogo.js';
import { pantallaDebrief } from './debrief.js';
import { pasosFase, lineaGuia } from '../pantallas/index.js';

const T = textos({
  es: { cabecera: 'CONTROL DE MISIÓN', plan: 'PLANIFICACIÓN DE RUTA', ops: 'OPERACIONES', informe: 'INFORME FINAL', espera: 'EN ESPERA',
    esperaTxt: 'La misión se prepara en la sala de briefing.',
    verif: 'GO / NO-GO', portatil: 'Portátil', sala: 'Sala (Esc)' },
  en: { cabecera: 'MISSION CONTROL', plan: 'ROUTE PLANNING', ops: 'OPERATIONS', informe: 'FINAL REPORT', espera: 'STANDING BY',
    esperaTxt: 'The crew prepares the mission in the briefing room.',
    verif: 'GO / NO-GO', portatil: 'Laptop', sala: 'Room (Esc)' },
});

function reloj() {
  const d = new Date();
  return [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].map((x) => String(x).padStart(2, '0')).join(':') + ' UTC';
}

export function pantallaControl(c, fase) {
  let modo, cuerpo;
  if (fase === 'diseno' || fase === 'restricciones') { modo = T.plan; cuerpo = pantallaPlanificador(c); }
  else if (fase === 'mision') { modo = T.ops; cuerpo = pantallaOperaciones(c); }
  else if (fase === 'informe') { modo = T.informe; cuerpo = pantallaDebrief(c); }
  else if (fase === 'verificacion') { modo = T.verif; cuerpo = pantallaGoNoGo(c); } else { modo = T.espera; cuerpo = h('div', { class: 'mc-vacio' }, h('p', {}, T.esperaTxt)); }
  return h('div', { class: 'mc fase-' + fase },
    h('header', { class: 'mc-cab' },
      h('span', { class: 'mc-logo' }, '◉ ', T.cabecera), h('span', { class: 'mc-modo' }, modo),
      pasosFase(c.guia), lineaGuia(c.guia, 'mc-guia'),
      h('span', { class: 'mc-yo' }, c.nick, ' · ', depto(c.rol)),
      h('nav', { class: 'mc-nav' },
        h('button', { class: 'mc-ir' + (c.guia?.objetivo === 'laptop' ? ' guia' : ''), type: 'button', onclick: () => c.irA('laptop') }, '💻 ', T.portatil),
        h('button', { class: 'mc-ir', type: 'button', onclick: () => c.irA('sala') }, '⏏ ', T.sala)),
      h('span', { class: 'mc-reloj' }, reloj())),
    h('div', { class: 'mc-cuerpo' }, cuerpo));
}
