// Expediente de misión (carpeta de papel) y HUD que lo deja siempre a la vista.
//  - expedienteCompleto(c, id, acciones): la carpeta abierta. En briefing se marcan objetivos, se elige la misión y se pulsa "Listo".
//  - expedienteMini(c, abrir): pestaña fija con los objetivos marcados y su cobertura, en todas las fases de juego.
import { h, lista, redondear, resumenSeguro } from './ui.js';
import { textos, tx, depto } from '../i18n.js';

const T = textos({
  es: {
    clasificado: 'EXPEDIENTE DE MISIÓN', cerrar: 'Cerrar', destino: 'Destino', escenario: 'Escenario', presupuesto: 'Presupuesto',
    referencia: 'Misión real de referencia', coheteReal: 'Cohete real', objetivos: 'Objetivos (marca los que el equipo se compromete a cumplir)',
    objetivosLect: 'Objetivos comprometidos', prioritario: 'PRIORITARIO', puntos: (n) => `${n} pts`, instrumentos: 'Necesita',
    ambicion: 'Ambición', eventos: (n) => `${n} evento${n === 1 ? '' : 's'} de diseño`, niveles: { facil: 'BAJA', normal: 'MEDIA', dificil: 'ALTA' },
    regla: 'Cómo se puntúa', elegir: 'Asignar esta misión al equipo', elegida: 'MISIÓN ASIGNADA', preparacion: 'EN PREPARACIÓN',
    preparacionTxt: 'Esta misión todavía no se puede jugar. Elige otra carpeta.', listo: 'Listo para diseñar', noListo: 'Ya no estoy listo',
    listos: (a, b) => `${a}/${b} de la tripulación listos`, espera: 'El diseño empieza cuando toda la tripulación está lista.',
    cobertura: 'cobertura', noMarcado: 'no comprometido', miniTitulo: 'EXPEDIENTE', abrir: 'Abrir expediente',
    sinMision: 'Aún no hay misión asignada', escenarios: { orbita: 'Órbita', landing: 'Aterrizaje', exploracion: 'Exploración' },
    apertura: 'Situación',
  },
  en: {
    clasificado: 'MISSION DOSSIER', cerrar: 'Close', destino: 'Target', escenario: 'Scenario', presupuesto: 'Budget',
    referencia: 'Real reference mission', coheteReal: 'Real rocket', objetivos: 'Goals (tick the ones the team commits to)',
    objetivosLect: 'Committed goals', prioritario: 'PRIORITY', puntos: (n) => `${n} pts`, instrumentos: 'Needs',
    ambicion: 'Ambition', eventos: (n) => `${n} design event${n === 1 ? '' : 's'}`, niveles: { facil: 'LOW', normal: 'MEDIUM', dificil: 'HIGH' },
    regla: 'How it is scored', elegir: 'Assign this mission to the team', elegida: 'MISSION ASSIGNED', preparacion: 'IN PREPARATION',
    preparacionTxt: 'This mission is not playable yet. Pick another folder.', listo: 'Ready to design', noListo: 'Not ready anymore',
    listos: (a, b) => `${a}/${b} crew ready`, espera: 'Design starts when the whole crew is ready.',
    cobertura: 'coverage', noMarcado: 'not committed', miniTitulo: 'DOSSIER', abrir: 'Open dossier',
    sinMision: 'No mission assigned yet', escenarios: { orbita: 'Orbit', landing: 'Landing', exploracion: 'Exploration' },
    apertura: 'Situation',
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
  const nombrePieza = (pid) => tx(c.D?.PIEZAS?.[pid]?.nombre) || pid;
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
      h('label', {}, caja, h('span', { class: 'exp-obj-nombre' }, tx(o.nombre) || o.id),
        o.prioridad ? h('b', { class: 'exp-sello-mini' }, T.prioritario) : null,
        h('small', { class: 'exp-pts' }, T.puntos(o.valor ?? 0))),
      h('div', { class: 'exp-obj-sub' }, `${T.instrumentos}: `, lista(o.requiere).map(nombrePieza).join(', ') || '-',
        k != null ? h('span', { class: 'exp-cob' }, ` · ${redondear(k * 100, 0)}% ${T.cobertura}`) : !marcado && !enBriefing ? ` · ${T.noMarcado}` : null));
  }));

  const dif = asignada ? e.mision.dificultad : null;
  const listos = Object.entries(e.jugadores ?? {}).filter(([, j]) => j.conectado && j.rol);
  const nListos = listos.filter(([jid]) => e.briefing?.listos?.[jid]).length;
  const yoListo = !!e.briefing?.listos?.[c.id];

  const acciones = h('div', { class: 'exp-acciones' });
  if (enBriefing && !m.jugable) acciones.append(h('p', { class: 'exp-aviso' }, T.preparacionTxt));
  else if (enBriefing && !asignada) acciones.append(h('button', { class: 'btn-exp primario', type: 'button', onclick: () => c.enviar('elegirMision', { id }) }, T.elegir));
  else if (enBriefing && asignada) {
    acciones.append(
      h('button', { class: 'btn-exp ' + (yoListo ? '' : 'primario'), type: 'button', onclick: () => c.enviar('listo', { on: !yoListo }) }, yoListo ? T.noListo : T.listo),
      h('span', { class: 'exp-listos' }, T.listos(nListos, listos.length)),
      h('small', { class: 'exp-espera' }, T.espera));
  }

  return h('div', { class: 'expediente-fondo', onclick: (ev) => { if (ev.target === ev.currentTarget) cerrar(); } },
    h('article', { class: 'expediente', role: 'dialog', 'aria-modal': 'true', 'aria-label': T.clasificado },
      h('div', { class: 'exp-pestana' }, m.id),
      h('div', { class: 'exp-clip', 'aria-hidden': 'true' }),
      h('button', { class: 'exp-cerrar', type: 'button', onclick: cerrar, 'aria-label': T.cerrar }, '✕'),
      h('header', {},
        h('small', { class: 'exp-kicker' }, T.clasificado),
        h('h2', {}, tx(m.nombre) || m.id),
        h('p', { class: 'exp-sub' }, `${tx(m.cuerpo)} · ${T.escenarios[m.escenario] ?? m.escenario}`)),
      !m.jugable ? h('div', { class: 'exp-sello gris' }, T.preparacion) : asignada ? h('div', { class: 'exp-sello' }, T.elegida) : null,
      tx(m.apertura) ? h('p', { class: 'exp-apertura' }, h('b', {}, `${T.apertura}: `), tx(m.apertura)) : null,
      tx(m.brief) ? h('p', { class: 'exp-brief' }, tx(m.brief)) : null,
      h('dl', { class: 'exp-datos' },
        h('dt', {}, T.destino), h('dd', {}, tx(m.cuerpo) || '-'),
        h('dt', {}, T.presupuesto), h('dd', {}, valorNum(m.presupuesto) != null ? `${valorNum(m.presupuesto)} M USD` : '-'),
        h('dt', {}, T.referencia), h('dd', {}, [m.referencia?.mision, m.referencia?.agencia && `(${m.referencia.agencia})`].filter(Boolean).join(' ') || '-'),
        m.referencia?.coheteReal ? [h('dt', {}, T.coheteReal), h('dd', {}, m.referencia.coheteReal)] : null,
        esc ? [h('dt', {}, T.regla), h('dd', {}, tx(esc.regla))] : null),
      h('h3', {}, enBriefing ? T.objetivos : T.objetivosLect),
      objs,
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
      h('span', { class: 'exp-mini-check' }, '☑'), h('span', { class: 'exp-mini-txt' }, tx(o.nombre) || o.id),
      k != null ? h('span', { class: 'exp-mini-barra', title: `${redondear(k * 100, 0)}%` }, h('i', { style: `width:${Math.round(k * 100)}%` })) : null);
  });
  return h('button', { class: 'exp-mini', type: 'button', title: T.abrir, 'data-n': String(items.length), onclick: () => abrir(m.id) },
    h('span', { class: 'exp-mini-cab' }, h('b', {}, T.miniTitulo), h('span', {}, m.id)),
    h('span', { class: 'exp-mini-nombre' }, tx(m.nombre)),
    h('ul', {}, items));
}

export { depto };
