// Expediente de misión (carpeta de papel) y HUD que lo deja siempre a la vista.
//  - expedienteCompleto(c, id, acciones): la carpeta abierta. En briefing se marcan objetivos, se elige la misión y se pulsa "Listo".
//  - expedienteMini(c, abrir): pestaña fija con los objetivos marcados y su cobertura, en todas las fases de juego.
import { h, lista, redondear, resumenSeguro, dinero } from './ui.js';
import { textos, tx, depto } from '../i18n.js';

const T = textos({
  es: {
    clasificado: 'EXPEDIENTE DE MISIÓN', cerrar: 'Cerrar', destino: 'Destino', escenario: 'Escenario', presupuesto: 'Presupuesto',
    referencia: 'Misión real de referencia', objetivos: 'Objetivos (marca los que cumplirán)',
    objetivosLect: 'Objetivos comprometidos', prioritario: 'PRIORITARIO', puntos: (n) => `${n} pts`,
    ambicion: 'Ambición', eventos: (n) => `${n} evento${n === 1 ? '' : 's'} de diseño`, niveles: { facil: 'BAJA', normal: 'MEDIA', dificil: 'ALTA' },
    regla: 'Puntuación', elegir: 'Elegir esta misión', elegida: 'MISIÓN ASIGNADA', preparacion: 'EN PREPARACIÓN',
    preparacionTxt: 'Misión aún no jugable. Elige otra.', listo: 'Listo', noListo: 'No estoy listo',
    listos: (a, b) => `${a}/${b} listos`, espera: 'El diseño empieza cuando todos están listos.',
    cobertura: 'cobertura', noMarcado: 'no comprometido', miniTitulo: 'EXPEDIENTE', abrir: 'Abrir expediente',
    sinMision: 'Sin misión', escenarios: { orbita: 'Órbita', landing: 'Aterrizaje', exploracion: 'Exploración' },
    apertura: 'Situación', compromiso: 'Plazo comprometido con los inversores', meses: (n) => `${n} meses`,
    bono: (pct) => (pct > 0 ? ` · +${pct} % de financiación` : pct < 0 ? ` · −${-pct} % de financiación` : ''),
    compromisoAyuda: 'Los inversores pagan la rapidez: cada mes de retraso sobre el plazo recorta la financiación.',
  },
  en: {
    clasificado: 'MISSION DOSSIER', cerrar: 'Close', destino: 'Target', escenario: 'Scenario', presupuesto: 'Budget',
    referencia: 'Real reference mission', objetivos: 'Goals (tick the ones to complete)',
    objetivosLect: 'Committed goals', prioritario: 'PRIORITY', puntos: (n) => `${n} pts`,
    ambicion: 'Ambition', eventos: (n) => `${n} design event${n === 1 ? '' : 's'}`, niveles: { facil: 'LOW', normal: 'MEDIUM', dificil: 'HIGH' },
    regla: 'Scoring', elegir: 'Choose this mission', elegida: 'MISSION ASSIGNED', preparacion: 'IN PREPARATION',
    preparacionTxt: 'Mission not playable yet. Choose another.', listo: 'Ready', noListo: 'Not ready',
    listos: (a, b) => `${a}/${b} ready`, espera: 'Design starts when all crew members are ready.',
    cobertura: 'coverage', noMarcado: 'not committed', miniTitulo: 'DOSSIER', abrir: 'Open dossier',
    sinMision: 'No mission', escenarios: { orbita: 'Orbit', landing: 'Landing', exploracion: 'Exploration' },
    apertura: 'Situation', compromiso: 'Deadline promised to investors', meses: (n) => `${n} months`,
    bono: (pct) => (pct > 0 ? ` · +${pct} % funding` : pct < 0 ? ` · −${-pct} % funding` : ''),
    compromisoAyuda: 'Investors pay for speed: every month of delay past the deadline cuts funding.',
  },
});
const EVENTOS = { facil: 1, normal: 2, dificil: 3 };

function valorNum(x) { return typeof x === 'number' ? x : x?.v ?? x?.juego ?? null; }

export function expedienteCompleto(c, id, { cerrar }) {
  const m = c.D?.MISIONES?.[id];
  if (!m) return null;
  const e = c.e ?? {};
  const asignada = e.mision?.id === id;
  const enBriefing = e.fase === 'briefing';
  const sel = asignada && Array.isArray(e.mision?.objetivos) ? e.mision.objetivos : lista(m.objetivos).map((o) => o.id);
  const res = asignada && !enBriefing ? resumenSeguro(c) : null;
  const cob = (oid) => res?.ciencia?.objetivos?.find((o) => o.id === oid)?.cobertura;
  const esc = lista(c.D?.ESCENARIOS).find((s) => s.id === m.escenario);

  const objs = h('ul', { class: 'exp-objetivos' }, lista(m.objetivos).map((o) => {
    const marcado = o.prioridad || sel.includes(o.id);
    const editable = asignada && enBriefing && !o.prioridad;
    const caja = h('input', {
      type: 'checkbox', checked: marcado, disabled: !editable, 'aria-label': tx(o.nombre),
      onchange: (ev) => c.enviar('objetivo', { id: o.id, on: ev.target.checked }),
    });
    const k = cob(o.id);
    return h('li', { class: (marcado ? 'marcado' : 'desmarcado') + (o.prioridad ? ' prio' : '') },
      h('label', {}, caja, h('span', { class: 'exp-obj-nombre' }, tx(o.nombre) || '—'),
        o.prioridad ? h('b', { class: 'exp-sello-mini' }, T.prioritario) : null,
        h('small', { class: 'exp-pts' }, T.puntos(o.valor ?? 0))),
      (k != null || (!marcado && !enBriefing)) ? h('div', { class: 'exp-obj-sub' },
        k != null ? h('span', { class: 'exp-cob' }, `${redondear(k * 100, 0)}% ${T.cobertura}`) : T.noMarcado) : null);
  }));

  const dif = asignada ? e.mision.dificultad : null;
  const listos = Object.entries(e.jugadores ?? {}).filter(([, j]) => j.conectado && j.rol);
  const nListos = listos.filter(([jid]) => e.briefing?.listos?.[jid]).length;
  const yoListo = !!e.briefing?.listos?.[c.id];

  // Compromiso de plazo: el primero paga +10 %, el último −10 % (contrato-reloj.md §3). Solo se cambia en briefing.
  const plazos = Array.isArray(m.reloj?.plazos) ? m.reloj.plazos : [];
  const plazoSel = asignada ? (res?.reloj?.plazo ?? e.mision?.plazo) : null;
  const bonoDe = (i) => (plazos.length < 2 ? 0 : i === 0 ? 10 : i === plazos.length - 1 ? -10 : 0);
  const compromiso = plazos.length ? h('div', { class: 'exp-plazos', title: T.compromisoAyuda },
    h('small', { class: 'exp-kicker' }, T.compromiso),
    h('div', { class: 'exp-plazos-fila' }, plazos.map((p, i) => h('button', {
      class: 'boton' + (plazoSel === p ? ' primario' : ''), type: 'button', 'aria-pressed': plazoSel === p ? 'true' : 'false',
      disabled: !(asignada && enBriefing), onclick: () => c.enviar('comprometerPlazo', { plazo: p }),
    }, T.meses(p) + T.bono(bonoDe(i)))))) : null;

  const acciones = h('div', { class: 'exp-acciones' });
  if (enBriefing && !m.jugable) acciones.append(h('p', { class: 'exp-aviso' }, T.preparacionTxt));
  else if (enBriefing && !asignada) acciones.append(h('button', { class: 'boton primario', type: 'button', onclick: () => c.enviar('elegirMision', { id }) }, T.elegir));
  else if (enBriefing && asignada) {
    acciones.append(
      h('button', { class: 'boton ' + (yoListo ? '' : 'primario'), type: 'button', onclick: () => c.enviar('listo', { on: !yoListo }) }, yoListo ? T.noListo : T.listo),
      h('span', { class: 'exp-listos' }, T.listos(nListos, listos.length)),
      h('small', { class: 'exp-espera' }, T.espera));
  }

  return h('div', { class: 'expediente-fondo', onclick: (ev) => { if (ev.target === ev.currentTarget) cerrar(); } },
    h('article', { class: 'expediente', role: 'dialog', 'aria-modal': 'true', 'aria-label': T.clasificado },
      h('div', { class: 'exp-pestana' }, tx(m.nombre) || '—'),
      h('div', { class: 'exp-clip', 'aria-hidden': 'true' }),
      h('button', { class: 'boton exp-cerrar', type: 'button', onclick: cerrar, 'aria-label': T.cerrar }, '✕'),
      h('header', {},
        h('small', { class: 'exp-kicker' }, T.clasificado),
        h('h2', {}, tx(m.nombre) || '—'),
        h('p', { class: 'exp-sub' }, `${tx(m.cuerpo)} · ${T.escenarios[m.escenario] ?? m.escenario}`)),
      !m.jugable ? h('div', { class: 'exp-sello gris' }, T.preparacion) : asignada ? h('div', { class: 'exp-sello' }, T.elegida) : null,
      (tx(m.brief) || tx(m.apertura)) ? h('p', { class: 'exp-brief' }, tx(m.brief) || tx(m.apertura)) : null,
      h('dl', { class: 'exp-datos' },
        h('dt', {}, T.presupuesto), h('dd', {}, dinero(valorNum(m.presupuesto))),
        h('dt', {}, T.referencia), h('dd', {}, [m.referencia?.mision, m.referencia?.agencia && `(${m.referencia.agencia})`].filter(Boolean).join(' ') || '-'),
        esc && tx(esc.regla) ? [h('dt', {}, T.regla), h('dd', {}, tx(esc.regla))] : null),
      h('h3', {}, enBriefing ? T.objetivos : T.objetivosLect),
      objs,
      compromiso,
      dif ? h('p', { class: 'exp-ambicion' }, `${T.ambicion}: `, h('b', {}, T.niveles[dif] ?? dif), ` (${T.eventos(EVENTOS[dif] ?? 2)})`) : null,
      acciones));
}

// Pestaña fija del expediente: siempre visible en las fases de juego.
export function expedienteMini(c, abrir) {
  const e = c.e ?? {};
  const m = c.mision;
  if (!m) {
    return h('button', { class: 'exp-mini vacio', type: 'button', disabled: true }, h('b', {}, T.miniTitulo), h('small', {}, T.sinMision));
  }
  const res = e.fase !== 'briefing' ? resumenSeguro(c) : null;
  const sel = Array.isArray(e.mision?.objetivos) ? e.mision.objetivos : lista(m.objetivos).map((o) => o.id);
  const items = lista(m.objetivos).filter((o) => o.prioridad || sel.includes(o.id)).map((o) => {
    const k = res?.ciencia?.objetivos?.find((x) => x.id === o.id)?.cobertura;
    return h('li', { class: o.prioridad ? 'prio' : '' },
      h('span', { class: 'exp-mini-check' }, '☑'), h('span', { class: 'exp-mini-txt' }, tx(o.nombre) || '—'),
      k != null ? h('span', { class: 'exp-mini-barra', title: `${redondear(k * 100, 0)}%` }, h('i', { style: `width:${Math.round(k * 100)}%` })) : null);
  });
  return h('button', { class: 'exp-mini', type: 'button', title: T.abrir, 'data-n': String(items.length), onclick: () => abrir(m.id) },
    h('span', { class: 'exp-mini-cab' }, h('b', {}, T.miniTitulo)),
    h('span', { class: 'exp-mini-nombre' }, tx(m.nombre)),
    h('ul', {}, items));
}

export { depto };
