// The global panel: six status bars, science coverage, four role lights. Always computed with resumen().
import { T } from '../textos.js';
import { h, en, lista, redondear, dinero, panelVacio, ROLES_IDS, ROL_COLOR, nombreRol } from './ui.js';

// Un doble clic no debe contar dos veces: en el anfitrión el estado cambia al instante y la guarda del protocolo no basta.
const ultimoClic = {};
export function unaVez(clave, ms = 1200) { const t = Date.now(); if (t - (ultimoClic[clave] ?? 0) < ms) return false; ultimoClic[clave] = t; return true; }

const ORDEN = ['masa', 'potencia', 'bateria', 'datos', 'volumen']; // el presupuesto va aparte, en la cabecera con el reloj
const ESCALA = 1.5; // the track shows 0..150 %, so the 100 % and 120 % markers sit at 66.7 % and 80 %

function barra(c, id, b) {
  const ratio = Number.isFinite(b?.ratio) ? b.ratio : (b?.limite > 0 ? b.usado / b.limite : (b?.usado > 0 ? 9 : 0));
  const est = b?.estado ?? 'ok';
  const pct = Math.min(ratio, ESCALA) / ESCALA * 100;
  const porRol = {};
  for (const p of lista(b?.partes)) porRol[p.rol ?? '?'] = (porRol[p.rol ?? '?'] ?? 0) + (Number(p.v) || 0);
  const detalle = Object.entries(porRol).map(([r, v]) => `${T.roles[r] ?? r}: ${redondear(v, 1)}`).join(' | ');
  return h('div', { class: 'barra ' + est + (id === 'presupuesto' ? ' barra-dinero' : ''), title: detalle || undefined },
    h('div', { class: 'barra-cab' },
      h('span', { class: 'barra-nombre' }, T.bars[id]),
      h('span', { class: 'barra-num' }, id === 'presupuesto' ? `${dinero(b?.usado)} / ${dinero(b?.limite)}` : `${redondear(b?.usado, 1)} / ${redondear(b?.limite, 1)} ${T.units[id]}`),
      h('span', { class: 'barra-estado' }, `${redondear(ratio * 100, 0)}%`)),
    h('div', { class: 'pista' },
      h('div', { class: 'relleno-barra', style: `width:${pct}%` }),
      h('i', { class: 'marca m100', title: T.marker100 }),
      h('i', { class: 'marca m120', title: T.marker120 })),
    h('span', { class: 'sr', }, T.barState[est] ?? est));
}

const pct = (x) => `${redondear(Math.abs(x) * 100, 0)} %`;
// Cabecera: presupuesto usado / límite (con el recorte de los inversores y el bono) y reloj (mes, plazo comprometido, lanzamiento previsto).
export function cabeceraRecursos(c, res, compacta = false) {
  const rl = res?.reloj, pr = rl?.presupuesto;
  const b = res?.barras?.presupuesto;
  const perdida = !!res?.plan?.perdida;
  const aviso = !!rl && (rl.retraso > 0 || perdida || rl.cancelada);
  const caja = h('div', { class: 'cabecera-recursos' + (compacta ? ' compacta' : '') + (aviso ? ' aviso' : '') });
  if (b) {
    const bono = rl?.bono ?? pr?.bono ?? 0, recorte = rl?.recorte ?? pr?.recorte ?? 0;
    caja.append(h('div', { class: 'cab-presupuesto', title: T.budgetHint },
      h('small', { class: 'cab-etq' }, T.bars.presupuesto),
      h('b', { class: 'cab-cifra' }, `${dinero(b.usado)} / ${dinero(b.limite)}`),
      bono ? h('span', { class: 'cab-chip ok' }, `${bono > 0 ? '+' : '−'}${pct(bono)} ${T.bonusTag}`) : null,
      recorte ? h('span', { class: 'cab-chip mal' }, `−${pct(recorte)} ${T.investorCut}`) : null),
      barra(c, 'presupuesto', b));
  }
  if (rl?.activo) {
    caja.append(h('div', { class: 'cab-reloj' + (aviso ? ' aviso' : '') },
      h('small', { class: 'cab-etq' }, T.clock),
      h('b', { class: 'cab-cifra' }, T.monthLine(rl.mes, rl.plazo)),
      rl.lanzamiento != null ? h('span', { class: 'cab-chip' }, T.plannedLaunch(rl.lanzamiento)) : null,
      rl.cancelada ? h('span', { class: 'cab-chip mal' }, T.cancelled)
        : perdida ? h('span', { class: 'cab-chip mal' }, T.windowLost)
        : rl.retraso > 0 ? h('span', { class: 'cab-chip mal' }, T.delay(rl.retraso)) : null));
  }
  return caja.children.length ? caja : null;
}

// opts.revision: show the "request review" button (design / constraints)
export function panelGlobal(c, res, opts = {}) {
  const raiz = h('aside', { class: 'caja panel-global' }, h('h3', {}, T.globalPanel));
  if (!res) { raiz.append(panelVacio(c.mision ? T.noData : T.noMission)); return raiz; }

  const cab = cabeceraRecursos(c, res);
  if (cab) raiz.append(cab);
  const barras = h('div', { class: 'barras' });
  for (const id of ORDEN) barras.append(barra(c, id, res.barras?.[id]));
  raiz.append(barras, h('div', { class: 'leyenda tenue' }, '| ', T.marker100, '  | ', T.marker120));

  raiz.append(h('h4', {}, T.science));
  const objs = lista(c.mision?.objetivos);
  const cob = lista(res.ciencia?.objetivos);
  const fila = h('div', { class: 'ciencia' });
  for (const o of objs.length ? objs : cob) {
    const r = cob.find((x) => x.id === o.id) ?? {};
    const v = Math.max(0, Math.min(1, Number(r.cobertura) || 0));
    fila.append(h('div', { class: 'cob' + ((r.prioridad ?? o.prioridad) ? ' prio' : '') },
      h('div', { class: 'cob-cab' }, h('span', {}, en(o.nombre) || '—'), ((r.prioridad ?? o.prioridad)) && h('b', { class: 'etq' }, T.priorityGoal), h('span', {}, `${redondear(v * 100, 0)}%`)),
      h('div', { class: 'pista fina' }, h('div', { class: 'relleno-ciencia', style: `width:${v * 100}%` }))));
  }
  raiz.append(fila.children.length ? fila : panelVacio(T.noData));

  raiz.append(h('h4', {}, T.crew));
  const luces = h('div', { class: 'luces' });
  for (const r of ROLES_IDS) {
    const j = Object.values(c.e?.jugadores ?? {}).find((x) => x.rol === r && x.conectado);
    const firmado = !!c.e?.firmas?.[r];
    luces.append(h('div', { class: 'luz-rol' },
      h('span', { class: 'luz' + (firmado ? ' on' : ''), style: `border-color:${ROL_COLOR[r]}`, title: firmado ? T.signed : T.notSigned }),
      h('span', {}, nombreRol(r), j ? ` (${j.nick})` : ' ', !j && h('em', { class: 'tenue' }, T.vacant))));
  }
  raiz.append(luces);

  if (opts.revision) {
    raiz.append(
      h('button', { class: 'boton primario grande ancho', type: 'button', onclick: () => { if (unaVez('rev')) c.enviar('pedirRevision', { revision: c.e?.diseno?.revisiones ?? 0 }); } }, T.requestReview), // el número evita que un doble clic pida dos revisiones
      h('p', { class: 'tenue pequeno' }, T.reviewsDone(c.e?.diseno?.revisiones ?? 0)));
    // Resultado de la última revisión (lo guarda el anfitrión en diseno.ultima): lo ve todo el equipo.
    const u = c.e?.diseno?.ultima;
    if (u?.tipo === 'revision') {
      const nombres = (u.barras ?? []).map((id) => T.bars?.[id] ?? id).join(', ');
      raiz.append(h('p', { class: 'pequeno ' + (u.nivel === 'fuera' ? 'aviso' : 'tenue') }, T.lastReview(u.nivel, nombres)));
    } else if (u?.tipo === 'evento') {
      raiz.append(h('p', { class: 'pequeno tenue' }, T.lastReview('evento', '')));
    }
  }
  return raiz;
}
