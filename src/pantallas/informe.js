// Report: verdict, causes, science, hidden findings, final bars, real mission, sources, replay buttons.
import { T } from '../textos.js';
import { idioma, tx } from '../i18n.js';
import { h, en, lista, redondear, resumenSeguro, fuenteLink } from './ui.js';
import { panelGlobal } from './panel-global.js';

function recogerFuentes(c, set) {
  const m = c.mision; if (!m) return;
  const add = (s) => { if (typeof s === 'string' && s) set.add(s); };
  const valores = (o) => { if (o && typeof o === 'object') { add(o.src); } };
  add(m.referencia?.src);
  lista(m.objetivos).forEach((o) => add(o.src));
  lista(m.oculto).forEach((o) => add(o.src));
  lista(m.eventosMision).forEach((id) => add(c.D?.EVENTOS_MISION?.[id]?.src));
  lista(m.eventosDiseno).forEach((id) => add(c.D?.EVENTOS_DISENO?.[id]?.src));
  for (const rol of Object.keys(c.e?.porRol ?? {})) {
    for (const [id, mont] of Object.entries(c.e.porRol[rol]?.piezas ?? {})) {
      const op = lista(c.D?.PIEZAS?.[id]?.opciones).find((o) => o.id === mont?.op);
      if (op) { Object.values(op).forEach(valores); Object.values(op.aporta ?? {}).forEach(valores); }
    }
  }
  const k = c.D?.COHETES?.[c.e?.porRol?.vuelo?.cohete];
  if (k) { valores(k.precio); Object.values(k.capacidad ?? {}).forEach(valores); }
}

export function pantallaInforme(c) {
  const res = resumenSeguro(c);
  const r = c.e?.resultado;
  const m = c.mision;
  const raiz = h('section', { class: 'caja informe' }, h('h3', {}, T.reportTitle));
  if (!r) raiz.append(h('p', { class: 'tenue vacio' }, T.noResult));
  else {
    const vd = r.veredicto;
    raiz.append(h('div', { class: 'veredicto v-' + vd }, h('b', {}, T.verdicts[vd] ?? String(vd ?? '-')), h('span', {}, T.verdictText[vd] ?? ''),
      r.puntos != null ? h('small', {}, `${T.points}: ${redondear(Number(r.puntos), 0)}`) : null));
    raiz.append(h('h4', {}, T.causes));
    const causas = lista(r.causas);
    raiz.append(causas.length ? h('ol', { class: 'causas' }, causas.map((x) => h('li', {}, tx(x)))) : h('p', { class: 'tenue' }, T.none));

    raiz.append(h('h4', {}, T.scienceAchieved));
    const cs = h('ul', { class: 'objetivos' });
    for (const x of lista(r.ciencia)) {
      const o = lista(m?.objetivos).find((q) => q.id === x.id);
      const c0 = x.conseguido;
      const txt = typeof c0 === 'boolean' ? (c0 ? T.achieved : T.notAchieved) : typeof c0 === 'number' ? (c0 <= 1 ? `${redondear(c0 * 100, 0)}%` : redondear(c0, 1)) : '-';
      cs.append(h('li', { class: (x.prioridad ?? o?.prioridad) ? 'prio' : '' }, `${en(o?.nombre) || x.id}: `, h('b', {}, txt), (x.prioridad ?? o?.prioridad) ? h('b', { class: 'etq' }, T.priorityGoal) : null));
    }
    raiz.append(cs);

    const hall = lista(r.hallazgos);
    if (hall.length) {
      raiz.append(h('h4', {}, T.hidden), h('ul', { class: 'objetivos' }, hall.map((x) => {
        const id = typeof x === 'string' ? x : x?.id;
        const o = lista(m?.oculto).find((q) => q.id === id) ?? {};
        // El motor dice de cada hallazgo si estaba (presente) y si lo captó un instrumento a bordo (capturado).
        const marca = typeof x === 'object' && x ? (x.capturado ? T.sep + T.found : x.presente ? T.sep + T.missed : T.sep + T.notThere) : '';
        return h('li', {}, h('b', {}, en(o.nombre) || en(x?.nombre) || id), marca, en(o.casoReal) ? h('div', { class: 'tenue pequeno' }, en(o.casoReal)) : null);
      })));
    }
  }

  const real = h('section', { class: 'caja' }, h('h3', {}, T.realMission));
  const ref = m?.referencia;
  if (ref) {
    real.append(h('dl', {},
      h('dt', {}, T.realMissionRef), h('dd', {}, ref.mision ?? '-'),
      h('dt', {}, T.agency), h('dd', {}, (idioma() === 'es' && ref.agenciaEs) || ref.agencia || '-'),
      h('dt', {}, T.realRocket), h('dd', {}, ref.coheteReal ?? '-')));
    const datos = lista(m.objetivos).filter((o) => en(o.datoReal));
    if (datos.length) real.append(h('h4', {}, T.foundReally), h('ul', { class: 'objetivos' }, datos.map((o) => h('li', {}, en(o.datoReal)))));
  } else real.append(h('p', { class: 'tenue vacio' }, T.noMission));

  const set = new Set();
  try { recogerFuentes(c, set); } catch (err) { console.error('fuentes', err); }
  const fu = h('section', { class: 'caja' }, h('h3', {}, T.sources));
  if (set.size) {
    fu.append(h('ul', { class: 'fuentes' }, [...set].map((id) => {
      const f = fuenteLink(c, id);
      return h('li', {}, h('code', {}, f.id), ' ', f.url ? h('a', { href: f.url, target: '_blank', rel: 'noopener noreferrer' }, f.titulo) : f.titulo, f.agencia ? h('small', { class: 'tenue' }, ` (${f.agencia})`) : null);
    })));
  } else fu.append(h('p', { class: 'tenue vacio' }, T.noSources));

  const botones = h('div', { class: 'acciones' },
    h('button', { class: 'btn-plano', type: 'button', onclick: () => c.enviar('cambiarFase', { fase: 'lobby' }) }, T.newMission),
    h('button', { class: 'btn-plano primario', type: 'button', onclick: () => c.enviar('cambiarFase', { fase: 'diseno' }) }, T.redesign));

  return h('div', { class: 'taller' },
    h('div', { class: 'cuerpo-taller una' }, h('div', { class: 'pila' }, raiz, real, fu, botones), h('div', { class: 'pila' }, h('h4', {}, T.finalBars), panelGlobal(c, res))));
}
