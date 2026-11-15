// Briefing panel over the 3D room (MEC-02): scenario -> 3 mission folders -> difficulty -> mission sheet.
import { T } from '../textos.js';
import { h, en, lista, valor, DIFICULTADES } from './ui.js';

function escenarios(c) {
  const ids = [];
  const raw = c.D?.ESCENARIOS;
  const arr = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.entries(raw).map(([k, v]) => ({ id: k, ...v })) : [];
  for (const s of arr) if (s?.id) ids.push({ id: s.id, nombre: en(s.nombre) || T.scenarios[s.id] || s.id });
  for (const m of lista(c.D?.MISIONES)) if (m?.escenario && !ids.some((x) => x.id === m.escenario)) ids.push({ id: m.escenario, nombre: T.scenarios[m.escenario] ?? m.escenario });
  return ids;
}

function ficha(c, m) {
  const ref = m.referencia ?? {};
  return h('div', { class: 'ficha' },
    h('h4', {}, T.missionSheet, ': ', en(m.nombre) || m.id),
    en(m.apertura) ? h('p', { class: 'apertura' }, en(m.apertura)) : null,
    h('dl', {},
      h('dt', {}, T.target), h('dd', {}, en(m.cuerpo) || '-'),
      h('dt', {}, T.budget), h('dd', {}, valor(c, m.presupuesto, 'M USD')),
      h('dt', {}, T.realMissionRef), h('dd', {}, [ref.mision, ref.agencia && `(${ref.agencia})`].filter(Boolean).join(' ') || '-')),
    h('h5', {}, T.goals),
    h('ul', { class: 'objetivos' }, lista(m.objetivos).map((o) => h('li', { class: o.prioridad ? 'prio' : '' }, en(o.nombre) || o.id, o.prioridad ? h('b', { class: 'etq' }, T.priorityGoal) : null))),
    en(m.brief) ? h('p', { class: 'tenue pequeno' }, en(m.brief)) : null);
}

export function pantallaBriefing(c) {
  const sel = c.e?.mision ?? {};
  const raiz = h('section', { class: 'caja panel-briefing', 'data-scroll': 'briefing' }, h('h3', {}, T.briefingTitle));
  const escs = escenarios(c);
  raiz.append(h('h4', {}, T.pickScenario));
  if (!escs.length) raiz.append(h('p', { class: 'tenue' }, T.noScenarios));
  raiz.append(h('div', { class: 'fila-botones' }, escs.map((s) => h('button', {
    class: 'btn-plano' + (sel.escenario === s.id ? ' primario' : ''), type: 'button',
    onclick: () => c.enviar('elegirMision', { escenario: s.id }),
  }, s.nombre))));

  if (sel.escenario) {
    raiz.append(h('h4', {}, T.pickMission));
    const ms = lista(c.D?.MISIONES).filter((m) => m?.escenario === sel.escenario);
    raiz.append(h('div', { class: 'carpetas' }, ms.map((m) => h('button', {
      class: 'carpeta-mision' + (sel.id === m.id ? ' elegida' : '') + (m.jugable ? '' : ' bloqueada'), type: 'button',
      disabled: !m.jugable, onclick: () => c.enviar('elegirMision', { id: m.id }),
    }, h('b', {}, en(m.nombre) || m.id), h('small', {}, en(m.cuerpo)), h('span', { class: 'etq ' + (m.jugable ? 'ok' : '') }, m.jugable ? T.playable : T.comingNext)))));
  }

  raiz.append(h('h4', {}, T.pickDifficulty));
  raiz.append(h('div', { class: 'fila-botones' }, DIFICULTADES.map((d) => h('button', {
    class: 'btn-plano' + (sel.dificultad === d ? ' primario' : ''), type: 'button',
    onclick: () => c.enviar('elegirMision', { dificultad: d }),
  }, T.difficulty[d] ?? d))));

  if (c.mision) raiz.append(ficha(c, c.mision));
  const listo = !!c.mision?.jugable;
  raiz.append(h('div', { class: 'acciones' },
    h('button', {
      class: 'btn-plano primario', type: 'button', disabled: !listo, title: listo ? undefined : T.startHint,
      onclick: () => c.enviar('cambiarFase', { fase: 'diseno' }),
    }, T.startDesign)),
    h('p', { class: 'tenue pequeno' }, T.dragHint));
  return raiz;
}
