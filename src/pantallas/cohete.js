// Rocket tab: one rocket at a time, arrows to cycle, a "folder" with its data. Flight (or anyone if vacant) selects.
import { T } from '../textos.js';
import { idioma } from '../i18n.js';
import { h, en, lista, valor, panelVacio, puedoPor, nombreRol } from './ui.js';

function dibujo(i) {
  return h('div', { class: 'cohete-dib c' + (i % 3), 'aria-hidden': 'true' },
    h('div', { class: 'nariz' }), h('div', { class: 'tubo' }, h('i', {}), h('i', {}), h('i', {})), h('div', { class: 'aletas' }, h('b', {}), h('b', {})));
}

export function pestanaCohete(c) {
  const m = c.mision;
  const ids = lista(m.cohetes);
  const lst = ids.map((id) => c.D?.COHETES?.[id]).filter(Boolean);
  const raiz = h('section', { class: 'caja pestana-cohete' }, h('h3', {}, T.rocketTitle));
  if (!lst.length) { raiz.append(panelVacio(T.noRockets)); return raiz; }
  const elegido = c.e?.porRol?.vuelo?.cohete;
  if (c.ui.cohete == null) c.ui.cohete = Math.max(0, lst.findIndex((x) => x.id === elegido));
  const i = ((c.ui.cohete % lst.length) + lst.length) % lst.length;
  const k = lst[i];
  const puedo = puedoPor(c, 'vuelo');
  const esElegido = k.id === elegido;
  const mover = (d) => { c.ui.cohete = (i + d + lst.length) % lst.length; c.repintar(); };
  const cap = k.capacidad?.[m.destino];

  raiz.append(h('div', { class: 'cohete-vista' },
    h('button', { class: 'flecha', type: 'button', 'aria-label': T.prev, onclick: () => mover(-1) }, '◀'),
    dibujo(i),
    h('button', { class: 'flecha', type: 'button', 'aria-label': T.next, onclick: () => mover(1) }, '▶'),
    h('div', { class: 'carpeta' },
      h('div', { class: 'carpeta-pestana' }, `${i + 1}/${lst.length}`),
      h('h4', {}, en(k.nombre) || k.id, esElegido ? h('span', { class: 'etq ok' }, T.selected) : null),
      h('dl', {},
        h('dt', {}, T.operator), h('dd', {}, k.operador ?? '-'),
        h('dt', {}, T.capacityTo(en(m.cuerpo) || m.destino || '?')), h('dd', {}, valor(c, cap, 'kg')),
        h('dt', {}, T.rocketPrice), h('dd', {}, valor(c, k.precio, 'M USD')),
        h('dt', {}, T.nasaUse), h('dd', {}, (idioma() === 'es' && k.usoNasaEs) || k.usoNasa || T.none)),
      h('div', { class: 'acciones izq' },
        h('button', {
          class: 'btn-plano primario', type: 'button', disabled: !puedo || esElegido,
          title: puedo ? undefined : T.onlyRole(nombreRol('vuelo')),
          onclick: () => c.enviar('elegirCohete', { id: k.id }),
        }, esElegido ? T.selected : T.select)),
      puedo ? null : h('p', { class: 'tenue pequeno' }, T.onlyRole(nombreRol('vuelo'))))));
  return raiz;
}
