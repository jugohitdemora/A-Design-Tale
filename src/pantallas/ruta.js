// Route tab: the mission's routes as cards. Flight (or anyone if vacant) selects.
import { T } from '../textos.js';
import { h, en, lista, valor, panelVacio, puedoPor, nombreRol } from './ui.js';
import { textos } from '../i18n.js';
import { avisoBloqueo } from '../control/bloqueo.js';

const L = textos({
  es: { solo: (r) => `Solo ${r} puede cambiar la ruta (o cualquiera si ese puesto está vacante).` },
  en: { solo: (r) => `Only ${r} can change the route (or anyone if that seat is vacant).` },
});

export function pestanaRuta(c) {
  const rutas = lista(c.mision?.rutas);
  const raiz = h('section', { class: 'caja pestana-ruta' }, h('h3', {}, T.routeTitle));
  if (!rutas.length) { raiz.append(panelVacio(T.noRoutes)); return raiz; }
  const elegida = c.e?.porRol?.vuelo?.ruta;
  const puedo = puedoPor(c, 'vuelo');
  const tarjetas = h('div', { class: 'tarjetas' });
  for (const r of rutas) {
    const es = r.id === elegida;
    tarjetas.append(h('div', { class: 'tarjeta' + (es ? ' elegida' : '') },
      h('h4', {}, en(r.nombre) || '—', es ? h('span', { class: 'etq ok' }, T.selected) : null),
      h('dl', {},
        h('dt', {}, T.days), h('dd', {}, valor(c, r.dias, T.days_unit)),
        h('dt', {}, T.propellant), h('dd', {}, valor(c, r.masa, 'kg')),
        h('dt', {}, T.price), h('dd', {}, valor(c, r.precio, 'M USD'))),
      h('button', {
        class: 'btn-plano primario', type: 'button', disabled: !puedo || es,
        title: puedo ? undefined : `🔒 ${L.solo(nombreRol('vuelo'))}`,
        onclick: () => c.enviar('elegirRuta', { id: r.id }),
      }, es ? T.selected : T.select)));
  }
  if (!puedo) raiz.append(avisoBloqueo(L.solo(nombreRol('vuelo'))));
  raiz.append(tarjetas);
  return raiz;
}
