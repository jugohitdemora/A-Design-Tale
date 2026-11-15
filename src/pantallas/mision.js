// Mission control: phases revealed up to estado.vista.paso, data tally, "Next". Same for everyone.
import { T } from '../textos.js';
import { h, en, lista, redondear, resumenSeguro } from './ui.js';
import { panelGlobal, unaVez } from './panel-global.js';

// `evento` in a step may be an id or an object; `mitigado` a boolean.
export function eventoDe(c, ev) {
  if (!ev) return null;
  if (typeof ev === 'string') return { id: ev, ...(c.D?.EVENTOS_MISION?.[ev] ?? {}) };
  return { ...(c.D?.EVENTOS_MISION?.[ev.id] ?? {}), ...ev };
}

export function pantallaMision(c) {
  const res = resumenSeguro(c);
  const r = c.e?.resultado;
  const raiz = h('section', { class: 'caja control' }, h('h3', {}, T.missionTitle));
  if (!r || !Array.isArray(r.pasos)) {
    raiz.append(h('p', { class: 'tenue vacio' }, T.noResult));
    return h('div', { class: 'taller' }, h('div', { class: 'cuerpo-taller una' }, raiz, panelGlobal(c, res)));
  }
  const paso = Number.isFinite(c.e?.vista?.paso) ? c.e.vista.paso : 0;
  const total = r.pasos.length;
  const ultimo = paso >= total - 1;
  raiz.append(h('h4', {}, T.steps));
  const ol = h('ol', { class: 'pasos' });
  r.pasos.forEach((p, i) => {
    const fase = lista(c.mision?.fases).find((f) => f.id === p.fase);
    const nombre = en(fase?.nombre) || p.fase || `#${i + 1}`;
    if (i > paso) { ol.append(h('li', { class: 'paso pendiente' }, h('b', {}, nombre), ' ', h('span', { class: 'tenue' }, T.stepPending))); return; }
    const ev = eventoDe(c, p.evento);
    ol.append(h('li', { class: 'paso ' + (p.ok ? 'ok' : 'mal') + (i === paso ? ' actual' : '') },
      h('div', { class: 'paso-cab' }, h('b', {}, nombre), h('span', {}, `${redondear((p.p ?? 0) * 100, 0)}%`), h('b', { class: 'etq ' + (p.ok ? 'ok' : 'mal') }, p.ok ? T.success : T.failure)),
      ev ? h('div', { class: 'pequeno' }, `${T.eventFired}: `, h('b', {}, `${ev.signo ?? ''} ${en(ev.nombre) || ev.id}`),
        ev.signo === '+' ? null : ` · ${p.mitigado ? T.mitigatedBy : T.notMitigatedShort}`,
        en(ev.texto) ? h('div', { class: 'tenue' }, en(ev.texto)) : null) : null));
  });
  raiz.append(ol);

  if (ultimo) {
    const d = r.datos ?? {};
    const gen = Number(d.generadosMB) || 0, baj = Number(d.bajadosMB) || 0;
    raiz.append(h('h4', {}, T.dataReceived),
      h('div', { class: 'pista' }, h('div', { class: 'relleno-ciencia', style: `width:${gen > 0 ? Math.min(100, baj / gen * 100) : 0}%` })),
      h('p', {}, `${redondear(gen, 0)} MB ${T.generated} · ${redondear(baj, 0)} MB ${T.downlinked} · ${redondear(Math.max(0, gen - baj), 0)} MB ${T.lost}`),
      h('p', { class: 'tenue' }, T.endOfFlight));
  }
  raiz.append(h('div', { class: 'acciones' },
    h('button', { class: 'btn-plano primario', type: 'button', onclick: () => { if (unaVez('paso', 700)) c.enviar('avanzar', { paso: c.e?.vista?.paso ?? 0 }); } }, ultimo ? T.toReport : T.nextStep)));
  return h('div', { class: 'taller' }, h('div', { class: 'cuerpo-taller una' }, raiz, panelGlobal(c, res)));
}
