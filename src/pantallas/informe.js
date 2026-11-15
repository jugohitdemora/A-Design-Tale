// Report: verdict, causes, science, hidden findings, final bars, real mission, sources, replay buttons.
import { T } from '../textos.js';
import { idioma, tx } from '../i18n.js';
import { h, en, lista, redondear, resumenSeguro } from './ui.js';
import { explicarCausas } from '../reglas/explicar.js';
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
    raiz.append(h('div', { class: 'veredicto v-' + vd }, h('b', {}, r.cancelada ? T.cancelledTitle : (T.verdicts[vd] ?? '—')), h('span', {}, r.cancelada ? T.cancelledText : (T.verdictText[vd] ?? '')),
      r.puntos != null ? h('small', {}, `${T.points}: ${redondear(Number(r.puntos), 0)}`) : null));
    raiz.append(h('h4', {}, T.causes));
    let causas = [];
    try { causas = explicarCausas(r, c.D, idioma()); } catch (err) { console.error('explicarCausas', err); }
    if (!causas.length) causas = lista(r.causas).map((x) => tx(x)).filter(Boolean);
    raiz.append(causas.length ? h('ol', { class: 'causas' }, causas.map((x) => h('li', {}, x))) : h('p', { class: 'tenue' }, T.none));

    raiz.append(h('h4', {}, T.scienceAchieved));
    const cs = h('ul', { class: 'objetivos' });
    for (const x of lista(r.ciencia)) {
      const o = lista(m?.objetivos).find((q) => q.id === x.id);
      const c0 = x.conseguido;
      const txt = typeof c0 === 'boolean' ? (c0 ? T.achieved : T.notAchieved) : typeof c0 === 'number' ? (c0 <= 1 ? `${redondear(c0 * 100, 0)}%` : redondear(c0, 1)) : '-';
      cs.append(h('li', { class: (x.prioridad ?? o?.prioridad) ? 'prio' : '' }, `${en(o?.nombre) || '—'}: `, h('b', {}, txt), (x.prioridad ?? o?.prioridad) ? h('b', { class: 'etq' }, T.priorityGoal) : null));
    }
    raiz.append(cs);

    const hall = lista(r.hallazgos);
    if (hall.length) {
      raiz.append(h('h4', {}, T.hidden), h('ul', { class: 'objetivos' }, hall.map((x) => {
        const id = typeof x === 'string' ? x : x?.id;
        const o = lista(m?.oculto).find((q) => q.id === id) ?? {};
        // El motor dice de cada hallazgo si estaba (presente) y si lo captó un instrumento a bordo (capturado).
        const marca = typeof x === 'object' && x ? (x.capturado ? T.sep + T.found : x.presente ? T.sep + T.missed : T.sep + T.notThere) : '';
        return h('li', {}, h('b', {}, en(o.nombre) || en(x?.nombre) || '—'), marca, en(o.casoReal) ? h('div', { class: 'tenue pequeno' }, en(o.casoReal)) : null);
      })));
    }
  }

  const real = h('section', { class: 'caja' }, h('h3', {}, T.realMission));
  const ref = m?.referencia;
  if (ref) {
    real.append(h('dl', {},
      h('dt', {}, T.realMissionRef), h('dd', {}, en(ref.mision) || '—'),
      h('dt', {}, T.agency), h('dd', {}, (idioma() === 'es' && ref.agenciaEs) || en(ref.agencia) || '—'),
      h('dt', {}, T.realRocket), h('dd', {}, en(ref.coheteReal) || '—')));
    const datos = lista(m.objetivos).filter((o) => en(o.datoReal));
    if (datos.length) real.append(h('h4', {}, T.foundReally), h('ul', { class: 'objetivos' }, datos.map((o) => h('li', {}, en(o.datoReal)))));
  } else real.append(h('p', { class: 'tenue vacio' }, T.noMission));

  const set = new Set();
  try { recogerFuentes(c, set); } catch (err) { console.error('fuentes', err); }
  const fu = h('section', { class: 'caja' }, h('h3', {}, T.sources));
  // Solo se muestran las fuentes con título propio. Las internas (huecos GAP-, JUEGO, PRECIO...) se resumen en una línea.
  const interna = (id) => /^GAP-/.test(id) || ['JUEGO', 'PRECIO', 'CG', 'F-06b'].includes(id);
  const publicas = [...set].filter((id) => !interna(id) && c.D?.FUENTES?.[id]);
  const hayInternas = [...set].some(interna);
  if (publicas.length || hayInternas) {
    fu.append(h('ul', { class: 'fuentes' },
      publicas.map((id) => {
        const f = c.D.FUENTES[id];
        const url = typeof f.url === 'string' && /^https?:\/\//.test(f.url) ? f.url : null;
        const ag = en(f.agencia);
        return h('li', {}, url ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, en(f.titulo) || '—') : (en(f.titulo) || '—'), ag ? h('small', { class: 'tenue' }, ` (${ag})`) : null);
      }),
      hayInternas ? h('li', { class: 'tenue' }, T.designersEstimate) : null));
  } else fu.append(h('p', { class: 'tenue vacio' }, T.noSources));

  const botones = h('div', { class: 'acciones' },
    h('button', { class: 'boton', type: 'button', onclick: () => c.enviar('cambiarFase', { fase: 'lobby' }) }, T.newMission),
    h('button', { class: 'boton primario', type: 'button', onclick: () => c.enviar('cambiarFase', { fase: 'diseno' }) }, T.redesign));

  return h('div', { class: 'taller' },
    h('div', { class: 'cuerpo-taller una' }, h('div', { class: 'pila' }, raiz, real, fu, botones), h('div', { class: 'pila' }, h('h4', {}, T.finalBars), panelGlobal(c, res))));
}
