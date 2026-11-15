// Risks tab: left the event deck (probability, mitigated, real case); right the contingencies (cost resources, max 3).
import { T } from '../textos.js';
import { h, en, lista, valor, redondear, panelVacio, puedoPor, nombreRol, MAX_CONTINGENCIAS } from './ui.js';

export function pestanaRiesgos(c, res) {
  const m = c.mision;
  const izq = h('section', { class: 'caja', 'data-scroll': 'riesgos' }, h('h3', {}, T.risksTitle));
  const riesgos = lista(res?.riesgos);
  if (!riesgos.length) izq.append(panelVacio(T.noRisks));
  for (const r of riesgos) {
    const ev = c.D?.EVENTOS_MISION?.[r.id] ?? {};
    const fase = lista(m.fases).find((f) => f.id === (r.fase ?? ev.fase));
    izq.append(h('div', { class: 'riesgo ' + (r.mitigado ? 'mitigado' : 'abierto') },
      h('div', { class: 'riesgo-cab' },
        h('span', { class: 'signo s' + (ev.signo === '+' ? 'p' : ev.signo === '-' ? 'n' : 'x') }, ev.signo ?? '?'),
        h('b', {}, en(ev.nombre) || r.id),
        h('span', { class: 'prob' }, `${T.probability} ${redondear((r.p ?? 0) * 100, 0)}%`)),
      h('div', { class: 'pequeno tenue' }, `${T.phase}: ${en(fase?.nombre) || r.fase || '-'}`),
      en(ev.texto) ? h('div', { class: 'pequeno' }, en(ev.texto)) : null,
      ev.signo === '+' ? null : h('span', { class: 'etq ' + (r.mitigado ? 'ok' : 'mal') }, r.mitigado ? T.mitigated : T.notMitigated),
      en(ev.casoReal) ? h('div', { class: 'caso' }, h('b', {}, T.realCase + ': '), en(ev.casoReal), ev.src ? h('sup', { class: 'src' }, ev.src) : null) : null));
  }

  const der = h('section', { class: 'caja contingencias', 'data-scroll': 'conting' }, h('h3', {}, T.contingenciesTitle));
  const tomadas = lista(c.e?.porRol?.comms?.contingencias);
  der.append(h('p', { class: 'tenue pequeno' }, T.contingenciesHint(tomadas.length, MAX_CONTINGENCIAS)));
  const puedo = puedoPor(c, 'comms');
  const ids = lista(m.contingencias);
  if (!ids.length) der.append(panelVacio(T.noContingencies));
  for (const id of ids) {
    const k = c.D?.CONTINGENCIAS?.[id] ?? { id };
    const on = tomadas.includes(id);
    const nombres = lista(k.mitiga).map((e) => en(c.D?.EVENTOS_MISION?.[e]?.nombre) || e).join(', ');
    der.append(h('div', { class: 'tarjeta' + (on ? ' elegida' : '') },
      h('h4', {}, en(k.nombre) || id, on ? h('span', { class: 'etq ok' }, T.taken) : null),
      en(k.texto) ? h('p', { class: 'pequeno' }, en(k.texto)) : null,
      h('dl', {},
        h('dt', {}, T.mass), h('dd', {}, valor(c, k.masa, 'kg')),
        h('dt', {}, T.price), h('dd', {}, valor(c, k.precio, 'M USD')),
        h('dt', {}, T.mitigates), h('dd', {}, nombres || '-')),
      h('button', {
        class: 'btn-plano' + (on ? '' : ' primario'), type: 'button',
        disabled: !puedo || (!on && tomadas.length >= MAX_CONTINGENCIAS),
        title: puedo ? undefined : T.onlyRole(nombreRol('comms')),
        onclick: () => c.enviar('contingencia', { id, on: !on }),
      }, on ? T.drop : T.buy)));
  }
  return h('div', { class: 'dos-col igual' }, izq, der);
}
