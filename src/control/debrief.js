// Mission control wall: post-flight debrief (verdict, step timeline, science, real mission; findings and sources collapsed).
import { T as TG } from '../textos.js';
import { textos, idioma, tx } from '../i18n.js';
import { h, en, lista, redondear, fuenteLink } from '../pantallas/ui.js';
import { eventoDe } from '../pantallas/mision.js';

const T = textos({
  es: { pts: 'puntos', sinResultado: 'Aún no hay resultado.', pasos: 'Pasos', ciencia: 'Ciencia', real: 'Misión real',
    ref: 'Referencia', agencia: 'Agencia', cohete: 'Cohete real', encontro: 'Qué encontró', ok: 'Logrado', no: 'No logrado', prio: 'prioritario',
    hallazgos: 'Hallazgos ocultos', causas: 'Causas', fuentes: 'Fuentes', ninguno: 'Ninguno', visto: 'detectado', perdido: 'se escapó', ausente: 'no estaba',
    otra: 'Volver a volar', nueva: 'Nueva misión', sinMision: 'Sin datos de misión.' },
  en: { pts: 'points', sinResultado: 'No result yet.', pasos: 'Steps', ciencia: 'Science', real: 'Real mission',
    ref: 'Reference', agencia: 'Agency', cohete: 'Real rocket', encontro: 'What it found', ok: 'Achieved', no: 'Not achieved', prio: 'priority',
    hallazgos: 'Hidden findings', causas: 'Causes', fuentes: 'Sources', ninguno: 'None', visto: 'detected', perdido: 'missed', ausente: 'not there',
    otra: 'Fly again', nueva: 'New mission', sinMision: 'No mission data.' },
});

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

export function pantallaDebrief(c) {
  const r = c.e?.resultado;
  const m = c.mision;
  const botones = h('div', { class: 'dbf-botones' },
    h('button', { class: 'boton', type: 'button', onclick: () => c.enviar('cambiarFase', { fase: 'lobby' }) }, T.nueva),
    h('button', { class: 'boton primario grande', type: 'button', onclick: () => c.enviar('cambiarFase', { fase: 'diseno' }) }, T.otra));
  if (!r) return h('div', { class: 'dbf' }, h('p', { class: 'dbf-vacio' }, T.sinResultado), botones);

  const vd = r.veredicto;
  const banner = h('section', { class: 'dbf-veredicto v-' + vd },
    h('b', { class: 'dbf-vd' }, TG.verdicts[vd] ?? String(vd ?? '-')), h('span', {}, TG.verdictText[vd] ?? ''),
    r.puntos != null ? h('em', {}, `${redondear(Number(r.puntos), 0)} ${T.pts}`) : null);

  const fases = lista(m?.fases);
  const pasos = lista(r.pasos);
  const linea = h('ol', { class: 'dbf-pasos', 'data-scroll': 'dbf-pasos' }, pasos.map((p, i) => {
    const nombre = en(fases.find((f) => f.id === p.fase)?.nombre) || p.fase || `#${i + 1}`;
    const ev = eventoDe(c, p.evento);
    return h('li', { class: p.omitida ? 'omitida' : p.ok ? 'ok' : 'mal' }, h('i', {}), h('b', {}, nombre), ev ? h('small', {}, en(ev.nombre) || ev.id) : null);
  }));
  const tiempo = h('section', { class: 'dbf-grupo' }, h('h3', {}, T.pasos), linea);

  const causas = lista(r.causas);
  const cs = h('ul', { class: 'dbf-objetivos' });
  for (const x of lista(r.ciencia)) {
    const o = lista(m?.objetivos).find((q) => q.id === x.id);
    const c0 = x.conseguido;
    const txt = typeof c0 === 'boolean' ? (c0 ? T.ok : T.no) : typeof c0 === 'number' ? (c0 <= 1 ? `${redondear(c0 * 100, 0)}%` : redondear(c0, 1)) : '-';
    const bien = c0 === true || (typeof c0 === 'number' && c0 >= 1);
    cs.append(h('li', { class: bien ? 'ok' : '' }, h('span', {}, en(o?.nombre) || x.id, (x.prioridad ?? o?.prioridad) ? h('small', {}, ` · ${T.prio}`) : null), h('b', {}, txt)));
  }
  const hall = lista(r.hallazgos);
  const detHall = h('details', { class: 'dbf-det' }, h('summary', {}, `${T.hallazgos} (${hall.length})`),
    hall.length ? h('ul', { class: 'dbf-objetivos', 'data-scroll': 'dbf-hall' }, hall.map((x) => {
      const id = typeof x === 'string' ? x : x?.id;
      const o = lista(m?.oculto).find((q) => q.id === id) ?? {};
      const marca = typeof x === 'object' && x ? (x.capturado ? T.visto : x.presente ? T.perdido : T.ausente) : '';
      return h('li', {}, h('span', {}, en(o.nombre) || en(x?.nombre) || id, en(o.casoReal) ? h('small', { class: 'dbf-bloque' }, en(o.casoReal)) : null), h('b', {}, marca));
    })) : h('p', { class: 'dbf-nota' }, T.ninguno));
  const detCausas = causas.length ? h('details', { class: 'dbf-det' }, h('summary', {}, T.causas), h('ol', { class: 'dbf-causas' }, causas.map((x) => h('li', {}, tx(x))))) : null;
  const ciencia = h('section', { class: 'dbf-grupo' }, h('h3', {}, T.ciencia), cs, detHall, detCausas);

  const ref = m?.referencia;
  const real = h('section', { class: 'dbf-grupo' }, h('h3', {}, T.real));
  if (ref) {
    real.append(h('dl', { class: 'dbf-datos' },
      h('dt', {}, T.ref), h('dd', {}, ref.mision ?? '-'),
      h('dt', {}, T.agencia), h('dd', {}, (idioma() === 'es' && ref.agenciaEs) || ref.agencia || '-'),
      h('dt', {}, T.cohete), h('dd', {}, ref.coheteReal ?? '-')));
    const datos = lista(m.objetivos).filter((o) => en(o.datoReal));
    if (datos.length) real.append(h('h4', {}, T.encontro), h('ul', { class: 'dbf-reales', 'data-scroll': 'dbf-real' }, datos.map((o) => h('li', {}, en(o.datoReal)))));
  } else real.append(h('p', { class: 'dbf-nota' }, T.sinMision));
  const set = new Set();
  try { recogerFuentes(c, set); } catch (err) { console.error('fuentes', err); }
  real.append(h('details', { class: 'dbf-det' }, h('summary', {}, `${T.fuentes} (${set.size})`),
    set.size ? h('ul', { class: 'dbf-fuentes', 'data-scroll': 'dbf-fuentes' }, [...set].map((id) => {
      const f = fuenteLink(c, id);
      return h('li', {}, f.url ? h('a', { href: f.url, target: '_blank', rel: 'noopener noreferrer' }, f.titulo) : f.titulo, f.agencia ? h('small', {}, ` (${f.agencia})`) : null);
    })) : h('p', { class: 'dbf-nota' }, T.ninguno)));

  return h('div', { class: 'dbf' }, banner, tiempo, h('div', { class: 'dbf-cols' }, ciencia, real), botones);
}
