// Mission control wall: post-flight debrief (verdict, step timeline, why it happened split into bad luck and decisions, science,
// real mission; findings and sources collapsed).
import { T as TG } from '../textos.js';
import { textos, idioma, tx } from '../i18n.js';
import { h, en, lista, redondear, fuenteLink } from '../pantallas/ui.js';
import { eventoDe } from '../pantallas/mision.js';
import { explicarPuntos } from '../reglas/explicar.js';
import { lanzamientoFallido, olvidarLanzamiento } from '../laptop/camara-lanzamiento.js';

const T = textos({
  es: { sinLanz: 'El cohete nunca llegó al espacio: el lanzamiento falló y las fases siguientes no se volaron.', pts: 'puntos', sinResultado: 'Aún no hay resultado.', pasos: 'Pasos', ciencia: 'Ciencia', real: 'Misión real',
    ref: 'Referencia', agencia: 'Agencia', cohete: 'Cohete real', encontro: 'Qué encontró', ok: 'Logrado', no: 'No logrado', prio: 'prioritario',
    hallazgos: 'Hallazgos ocultos', porque: 'Por qué ha pasado', suerte: 'Mala suerte', decision: 'Decisión', fuentes: 'Fuentes', ninguno: 'Ninguno',
    visto: 'detectado', perdido: 'se escapó', ausente: 'no estaba', otra: 'Volver a volar', nueva: 'Nueva misión', sinMision: 'Sin datos de misión.',
    leyenda: 'Mala suerte: el fallo no dependía de tus decisiones. Decisión: había algo que cambiar.', estimaciones: 'Estimaciones del equipo de diseño' },
  en: { sinLanz: 'The rocket never reached space: the launch failed and the following phases were not flown.', pts: 'points', sinResultado: 'No result yet.', pasos: 'Steps', ciencia: 'Science', real: 'Real mission',
    ref: 'Reference', agencia: 'Agency', cohete: 'Real rocket', encontro: 'What it found', ok: 'Achieved', no: 'Not achieved', prio: 'priority',
    hallazgos: 'Hidden findings', porque: 'Why it happened', suerte: 'Bad luck', decision: 'Decision', fuentes: 'Sources', ninguno: 'None',
    visto: 'detected', perdido: 'missed', ausente: 'not there', otra: 'Fly again', nueva: 'New mission', sinMision: 'No mission data.',
    leyenda: 'Bad luck: the failure did not depend on your decisions. Decision: there was something to change.', estimaciones: 'Design team estimates' },
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

// Puntos "causa → decisión → qué lo evitaba", con la etiqueta de mala suerte o decisión. Si la explicación falla, las causas antiguas.
function puntosDe(c, r) {
  try {
    const p = explicarPuntos(r, c.D, idioma());
    if (p.length) return p;
  } catch (err) { console.error('explicarPuntos', err); }
  return lista(r.causas).map((x) => tx(x)).filter(Boolean).map((causa) => ({ tipo: 'info', causa, decision: null, evitar: null }));
}

function bloquePuntos(c, r) {
  const puntos = puntosDe(c, r);
  return h('section', { class: 'dbf-grupo dbf-porque' }, h('h3', {}, T.porque),
    h('ul', { class: 'dbf-puntos', 'data-scroll': 'dbf-puntos' }, puntos.map((p) => h('li', { class: 'dbf-punto ' + p.tipo },
      p.tipo === 'info' ? null : h('b', { class: 'dbf-etq' }, p.tipo === 'suerte' ? T.suerte : T.decision),
      h('span', { class: 'dbf-causa' }, p.causa),
      p.decision || p.evitar ? h('small', {}, [p.decision, p.evitar].filter(Boolean).join(' → ')) : null))),
    puntos.some((p) => p.tipo === 'suerte') && puntos.some((p) => p.tipo === 'decision') ? h('p', { class: 'dbf-nota' }, T.leyenda) : null);
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
    h('b', { class: 'dbf-vd' }, r.cancelada ? TG.cancelledTitle : (TG.verdicts[vd] ?? '-')), h('span', {}, r.cancelada ? TG.cancelledText : (TG.verdictText[vd] ?? '')),
    r.puntos != null ? h('em', {}, `${redondear(Number(r.puntos), 0)} ${T.pts}`) : null,
    lanzamientoFallido(r) ? h('p', { class: 'dbf-sin-vuelo' }, '✖ ', T.sinLanz) : null);
  olvidarLanzamiento();   // el próximo vuelo vuelve a mostrar el despegue

  const fases = lista(m?.fases);
  const pasos = lista(r.pasos);
  const linea = h('ol', { class: 'dbf-pasos', 'data-scroll': 'dbf-pasos' }, pasos.map((p, i) => {
    const nombre = en(fases.find((f) => f.id === p.fase)?.nombre) || `#${i + 1}`;
    const ev = eventoDe(c, p.evento);
    return h('li', { class: p.omitida ? 'omitida' : p.ok ? 'ok' : 'mal' }, h('i', {}), h('b', {}, nombre), ev ? h('small', {}, en(ev.nombre) || '') : null);
  }));
  const tiempo = h('section', { class: 'dbf-grupo dbf-tiempo' }, h('h3', {}, T.pasos), linea);

  const cs = h('ul', { class: 'dbf-objetivos' });
  for (const x of lista(r.ciencia)) {
    const o = lista(m?.objetivos).find((q) => q.id === x.id);
    const c0 = x.conseguido;
    const txt = typeof c0 === 'boolean' ? (c0 ? T.ok : T.no) : typeof c0 === 'number' ? (c0 <= 1 ? `${redondear(c0 * 100, 0)}%` : redondear(c0, 1)) : '-';
    const bien = c0 === true || (typeof c0 === 'number' && c0 >= 1);
    cs.append(h('li', { class: bien ? 'ok' : '' }, h('span', {}, en(o?.nombre) || '—', (x.prioridad ?? o?.prioridad) ? h('small', {}, ` · ${T.prio}`) : null), h('b', {}, txt)));
  }
  const hall = lista(r.hallazgos);
  const detHall = h('details', { class: 'dbf-det' }, h('summary', {}, `${T.hallazgos} (${hall.length})`),
    hall.length ? h('ul', { class: 'dbf-objetivos', 'data-scroll': 'dbf-hall' }, hall.map((x) => {
      const id = typeof x === 'string' ? x : x?.id;
      const o = lista(m?.oculto).find((q) => q.id === id) ?? {};
      const marca = typeof x === 'object' && x ? (x.capturado ? T.visto : x.presente ? T.perdido : T.ausente) : '';
      return h('li', {}, h('span', {}, en(o.nombre) || en(x?.nombre) || '—', en(o.casoReal) ? h('small', { class: 'dbf-bloque' }, en(o.casoReal)) : null), h('b', {}, marca));
    })) : h('p', { class: 'dbf-nota' }, T.ninguno));
  const ciencia = h('section', { class: 'dbf-grupo' }, h('h3', {}, T.ciencia), cs, detHall);

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
  // Solo las fuentes con ficha propia (título); los códigos internos (huecos, JUEGO, PRECIO...) se resumen en una línea.
  const publicas = [...set].filter((id) => c.D?.FUENTES?.[id]?.titulo && !/^GAP-/.test(id));
  const hayInternas = set.size > publicas.length;
  real.append(h('details', { class: 'dbf-det' }, h('summary', {}, `${T.fuentes} (${publicas.length})`),
    publicas.length || hayInternas ? h('ul', { class: 'dbf-fuentes', 'data-scroll': 'dbf-fuentes' }, publicas.map((id) => {
      const f = fuenteLink(c, id);
      const titulo = tx(f.titulo), agencia = tx(f.agencia);
      return h('li', {}, f.url ? h('a', { href: f.url, target: '_blank', rel: 'noopener noreferrer' }, titulo) : titulo, agencia ? h('small', {}, ` (${agencia})`) : null);
    }), hayInternas ? h('li', {}, h('small', {}, T.estimaciones)) : null) : h('p', { class: 'dbf-nota' }, T.ninguno)));

  return h('div', { class: 'dbf' }, banner, tiempo,
    h('div', { class: 'dbf-cols' }, bloquePuntos(c, r), h('div', { class: 'dbf-col' }, ciencia, real)), botones);
}
