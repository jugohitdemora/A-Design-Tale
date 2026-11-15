// Desistir de la misión (voto unánime de los conectados con rol). El botón vive en pasosFase (guía de la sala, barra del portátil
// y cabecera de la sala de control); el aviso y la confirmación van en la capa (#capa), visibles desde cualquier vista.
import { textos } from '../i18n.js';
import { h } from './ui.js';
import { resumenDesistir } from '../red/protocolo.js';

const TD = textos({
  es: {
    boton: 'Desistir', titulo: '¿Desistir de la misión?', cuerpo: 'Se abandona el diseño y se vuelve al briefing para elegir otra misión. Hace falta que toda la tripulación esté de acuerdo.',
    confirmar: 'Sí, desistir', cancelar: 'Cancelar', retirar: 'Retirar mi voto', acepto: 'Estoy de acuerdo',
    estado: (a, n, falta) => `Desistir: ${a}/${n} de acuerdo${falta.length ? ` — falta ${falta.join(', ')}` : ''}`,
    pide: (quien) => `${quien.join(', ')} ${quien.length > 1 ? 'proponen' : 'propone'} desistir de la misión.`,
    nota: (m) => `La tripulación desistió de ${m}. Elegid otra misión.`, notaSin: 'La tripulación desistió de la misión anterior. Elegid otra.',
  },
  en: {
    boton: 'Give up', titulo: 'Give up the mission?', cuerpo: 'The design is dropped and you return to the briefing to choose another mission. The whole crew has to agree.',
    confirmar: 'Yes, give up', cancelar: 'Cancel', retirar: 'Withdraw my vote', acepto: 'I agree',
    estado: (a, n, falta) => `Give up: ${a}/${n} agree${falta.length ? ` — waiting for ${falta.join(', ')}` : ''}`,
    pide: (quien) => `${quien.join(', ')} ${quien.length > 1 ? 'want' : 'wants'} to give up the mission.`,
    nota: (m) => `The crew gave up ${m}. Choose another mission.`, notaSin: 'The crew gave up the previous mission. Choose another one.',
  },
});

const resumen = (c) => (c?.e && c.rol ? resumenDesistir(c.e, c.id) : null);

// Botón compacto (peligro). Abre la confirmación; si ya votaste, muestra el estado y retira el voto.
export function botonDesistir(c) {
  const r = resumen(c);
  if (!r?.activo) return null;
  const txt = r.abierto ? `${TD.boton} ${r.si.length}/${r.total}` : TD.boton;
  return h('button', {
    class: 'boton peligro chico desistir-btn' + (r.yo ? ' votado' : ''), type: 'button', title: TD.estado(r.si.length, r.total, r.faltan),
    onclick: () => { c.ui.overlay = { tipo: 'desistir' }; c.repintar(); },
  }, h('span', { 'aria-hidden': 'true' }, '✕'), h('span', { class: 'desistir-txt' }, ' ', txt),
  r.abierto ? h('span', { class: 'desistir-cuenta' }, ` ${r.si.length}/${r.total}`) : null);
}

// Aviso para todos mientras haya algún voto, y diálogo de confirmación si este jugador lo abrió.
export function capaDesistir(c, cerrar) {
  const r = resumen(c), nodos = [];
  if (!r?.activo) return nodos;
  if (r.abierto) {
    nodos.push(h('aside', { class: 'desistir-aviso', role: 'alert' },
      h('p', { class: 'desistir-pide' }, TD.pide(r.si)),
      h('p', { class: 'desistir-estado' }, TD.estado(r.si.length, r.total, r.faltan)),
      h('button', {
        class: 'boton chico ' + (r.yo ? '' : 'peligro'), type: 'button',
        onclick: () => c.enviar('votarDesistir', { on: !r.yo }),
      }, r.yo ? TD.retirar : TD.acepto)));
  }
  if (c.ui.overlay?.tipo === 'desistir') {
    nodos.push(h('div', { class: 'capa-fondo', onclick: (ev) => { if (ev.target === ev.currentTarget) cerrar(); } },
      h('article', { class: 'desistir-dialogo', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': TD.titulo },
        h('h3', {}, TD.titulo),
        h('p', {}, TD.cuerpo),
        h('p', { class: 'desistir-estado' }, TD.estado(r.si.length, r.total, r.faltan)),
        h('div', { class: 'acciones' },
          r.yo
            ? h('button', { class: 'boton', type: 'button', onclick: () => { c.enviar('votarDesistir', { on: false }); cerrar(); } }, TD.retirar)
            : h('button', { class: 'boton peligro', type: 'button', onclick: () => { c.enviar('votarDesistir', { on: true }); cerrar(); } }, TD.confirmar),
          h('button', { class: 'boton', type: 'button', onclick: cerrar }, TD.cancelar)))));
  }
  return nodos;
}

// Nota para el briefing: la misión que se abandonó (hasta elegir otra).
export function notaDesistida(c, nombre) {
  const d = c?.e?.desistida;
  if (!d || c.e.mision?.id) return null;
  return h('p', { class: 'desistir-nota', role: 'status' }, nombre ? TD.nota(nombre) : TD.notaSin);
}
