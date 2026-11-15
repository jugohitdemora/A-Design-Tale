// App del portátil "Contingencias": plan de contingencia POR DEPARTAMENTO (concept art "Etapa de contingencias").
// Izquierda: el mazo de riesgos del diseño (eventos de misión con fase, probabilidad, si están mitigados y el caso real).
// Derecha: las contingencias de la misión agrupadas por el departamento que las compra (el mío primero). Máximo 3 en total.
//
// Contrato del host: appContingencias(c) devuelve el nodo raíz. El host reconstruye el DOM en cada cambio: todo sale de c.e.
// c.ui.contingencias = { abierto: { [eventoId]: bool } } (casos reales desplegados).
import { textos, tx, depto, idioma } from '../i18n.js';
import { h, lista, valor, puedoPor, resumenSeguro, ROLES_IDS, MAX_CONTINGENCIAS } from '../pantallas/ui.js';

const T = textos({
  es: {
    riesgos: 'RIESGOS DEL DISEÑO', riesgosLead: 'Lo que puede pasar en vuelo.',
    nEventos: (n) => `${n} eventos`, sinRiesgos: 'Sin eventos de vuelo.',
    fase: 'Fase', critica: 'crítica', prob: 'Probabilidad', mitigado: 'MITIGADO', abierto: 'SIN MITIGAR', oportunidad: 'OPORTUNIDAD',
    mitigaCon: 'Se mitiga con', nadaMitiga: 'Ninguna contingencia lo cubre.', casoReal: 'Caso real', verCaso: 'Ver caso real', ocultarCaso: 'Ocultar caso real',
    leccion: 'Lección',
    plan: 'PLAN DE CONTINGENCIA', usadas: (n, m) => `${n}/${m} usadas`, cupoLleno: (m) => `Máximo ${m} para todo el equipo. Quita otra primero.`,
    tuDepto: 'TU DEPARTAMENTO', vacante: 'VACANTE · puedes operarlo', soloLectura: 'SOLO LECTURA',
    soloPuede: (d) => `Solo ${d} puede cambiar esto.`, sinMias: 'Tu departamento no tiene contingencias.',
    sinContingencias: 'Sin contingencias.',
    masa: 'Masa', coste: 'Coste', creditos: 'créditos', mitiga: 'Mitiga', comprar: 'Comprar', quitar: 'Quitar',
    comprada: 'COMPRADA', impacto: 'Coste del plan', recursoMasa: 'Masa', recursoPres: 'Presupuesto',
    restr: 'Restricciones: no se acepta un cambio que suba una barra.',
    nota: 'Cuando salga el evento, su departamento debe activar la contingencia en la sala de control. El vuelo espera hasta entonces.',
    notaTit: 'IMPORTANTE',
  },
  en: {
    riesgos: 'DESIGN RISKS', riesgosLead: 'What can happen in flight.',
    nEventos: (n) => `${n} events`, sinRiesgos: 'No flight events.',
    fase: 'Phase', critica: 'critical', prob: 'Probability', mitigado: 'MITIGATED', abierto: 'NOT MITIGATED', oportunidad: 'OPPORTUNITY',
    mitigaCon: 'Mitigated by', nadaMitiga: 'No contingency covers it.', casoReal: 'Real case', verCaso: 'Show real case', ocultarCaso: 'Hide real case',
    leccion: 'Lesson',
    plan: 'CONTINGENCY PLAN', usadas: (n, m) => `${n}/${m} used`, cupoLleno: (m) => `Maximum ${m} for the whole team. Drop another first.`,
    tuDepto: 'YOUR DEPARTMENT', vacante: 'VACANT · you can operate it', soloLectura: 'READ ONLY',
    soloPuede: (d) => `Only ${d} can change this.`, sinMias: 'Your department has no contingencies.',
    sinContingencias: 'No contingencies.',
    masa: 'Mass', coste: 'Cost', creditos: 'credits', mitiga: 'Mitigates', comprar: 'Buy', quitar: 'Drop',
    comprada: 'BOUGHT', impacto: 'Plan cost', recursoMasa: 'Mass', recursoPres: 'Budget',
    restr: 'Constraints: do not raise any bar.',
    nota: 'When the event occurs, its department must activate the contingency in the control room. The flight waits until then.',
    notaTit: 'IMPORTANT',
  },
});

const colorRol = (r) => `var(--lp-rol-${ROLES_IDS.includes(r) ? r : 'comms'})`;
const fmt = (n, d = 1) => (Number.isFinite(n) ? n.toLocaleString(idioma() === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: d }) : '∞');
const num = (c, x) => (c.motor?.num ? c.motor.num(x) : typeof x === 'number' ? x : x?.v ?? x?.juego ?? 0);
const rolDe = (c, id) => (ROLES_IDS.includes(c.D?.CONTINGENCIAS?.[id]?.rol) ? c.D.CONTINGENCIAS[id].rol : 'comms');

// Iconos pixel 16×16 (k tinta, c color, l brillo, a aviso).
const PX = {
  aviso: [[7, 1, 2, 2, 'k'], [6, 3, 4, 2, 'k'], [5, 5, 6, 2, 'k'], [4, 7, 8, 2, 'k'], [3, 9, 10, 2, 'k'], [2, 11, 12, 2, 'k'], [1, 13, 14, 2, 'k'],
    [7, 4, 2, 1, 'c'], [6, 5, 4, 2, 'c'], [5, 7, 6, 2, 'c'], [4, 9, 8, 2, 'c'], [3, 11, 10, 2, 'c'], [7, 6, 2, 4, 'k'], [7, 11, 2, 1, 'k']],
  estrella: [[6, 0, 4, 16, 'k'], [0, 6, 16, 4, 'k'], [4, 4, 8, 8, 'k'], [7, 1, 2, 14, 'c'], [1, 7, 14, 2, 'c'], [5, 5, 6, 6, 'c'], [6, 6, 2, 2, 'l']],
  moneda: [[5, 2, 6, 12, 'a'], [3, 3, 10, 10, 'a'], [2, 5, 12, 6, 'a'], [5, 1, 6, 1, 'k'], [3, 2, 2, 1, 'k'], [11, 2, 2, 1, 'k'], [2, 3, 1, 2, 'k'], [13, 3, 1, 2, 'k'],
    [1, 5, 1, 6, 'k'], [14, 5, 1, 6, 'k'], [2, 11, 1, 2, 'k'], [13, 11, 1, 2, 'k'], [3, 13, 2, 1, 'k'], [11, 13, 2, 1, 'k'], [5, 14, 6, 1, 'k'], [7, 4, 2, 8, 'k'], [4, 4, 2, 2, 'l']],
  kit: [[1, 3, 14, 12, 'k'], [2, 4, 12, 10, 'c'], [5, 1, 6, 2, 'k'], [6, 2, 4, 1, 'c'], [7, 6, 2, 6, 'l'], [5, 8, 6, 2, 'l'], [2, 4, 12, 1, 'l']],
  check: [[2, 7, 2, 2, 'k'], [4, 9, 2, 2, 'k'], [6, 11, 2, 2, 'k'], [8, 9, 2, 2, 'k'], [10, 7, 2, 2, 'k'], [12, 5, 2, 2, 'k'], [14, 3, 1, 2, 'k']],
};
const TONO = { k: 'var(--lp-tinta)', l: 'var(--lp-panel)', a: 'var(--lp-aviso)' };
function pixel(nombre, color = 'var(--lp-aviso)', tam = 16) {
  const rects = (PX[nombre] ?? PX.kit).map(([x, y, w, hh, k]) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" style="fill:${k === 'c' ? color : TONO[k]}"/>`).join('');
  const t = document.createElement('template');
  t.innerHTML = `<svg class="ct-ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${tam}" height="${tam}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
  return t.content.firstElementChild;
}

const ultimoClic = {};
function unaVez(id) { const t = Date.now(); if (t - (ultimoClic[id] ?? 0) < 900) return false; ultimoClic[id] = t; return true; }

// ---------------------------------------------------------------------------------------------------------------------
// Riesgos
// ---------------------------------------------------------------------------------------------------------------------
function columnaRiesgos(c, u, res) {
  const m = c.mision;
  const EV = c.D?.EVENTOS_MISION ?? {};
  const fases = lista(m?.fases);
  let riesgos = lista(res?.riesgos);
  if (!riesgos.length) {
    // Sin motor: el mazo de la misión tal cual, sin saber qué está mitigado.
    riesgos = lista(m?.eventosMision).filter((id) => EV[id]).map((id) => ({ id, fase: EV[id].fase, p: EV[id].p, mitigado: false, signo: EV[id].signo ?? '-' }));
  }
  const idx = (r) => { const i = fases.findIndex((f) => f?.id === r.fase); return i < 0 ? 99 : i; };
  riesgos = [...riesgos].sort((a, b) => idx(a) - idx(b));

  const cuerpo = h('div', { class: 'ct-lista', 'data-scroll': 'ct-riesgos' });
  if (!riesgos.length) cuerpo.append(h('p', { class: 'ct-vacio' }, T.sinRiesgos));
  for (const r of riesgos) {
    const ev = EV[r.id] ?? {};
    const signo = r.signo ?? ev.signo ?? '-';
    const positivo = signo === '+';
    const f = fases.find((x) => x?.id === (r.fase ?? ev.fase));
    const p = Math.max(0, Math.min(1, Number(r.p ?? ev.p) || 0));
    const mit = lista(ev.mitigadoPor);
    const abiertoCaso = !!u.abierto[r.id];
    const estado = positivo ? 'oportunidad' : r.mitigado ? 'mitigado' : 'abierto';
    cuerpo.append(h('article', { class: `ct-riesgo ${estado}` },
      h('div', { class: 'ct-r-cab' },
        h('span', { class: 'ct-r-ico' }, positivo ? pixel('estrella', 'var(--lp-ok)', 22) : pixel('aviso', signo === '±' ? 'var(--lp-aviso)' : 'var(--lp-mal)', 22)),
        h('div', { class: 'ct-r-tit' },
          h('b', {}, tx(ev.nombre) || r.id),
          h('small', {}, `${T.fase}: ${tx(f?.nombre) || r.fase || '-'}`, f?.critica ? h('em', { class: 'ct-critica' }, ` · ${T.critica}`) : null)),
        h('span', { class: 'ct-badge ' + estado }, positivo ? T.oportunidad : r.mitigado ? T.mitigado : T.abierto)),
      h('div', { class: 'ct-prob', title: T.prob },
        h('span', {}, T.prob), h('span', { class: 'ct-prob-pista' }, h('i', { style: `width:${p * 100}%` })), h('b', {}, `${fmt(p * 100, 0)} %`)),
      tx(ev.texto) ? h('p', { class: 'ct-r-txt' }, tx(ev.texto)) : null,
      positivo ? null : h('p', { class: 'ct-r-mit' }, mit.length
        ? [h('span', {}, T.mitigaCon + ': '), mit.map((id) => h('span', { class: 'ct-tag', style: `--rol:${colorRol(rolDe(c, id))}` },
          tx(c.D?.CONTINGENCIAS?.[id]?.nombre) || id, h('small', {}, ` · ${depto(rolDe(c, id), 'sigla')}`)))]
        : h('em', {}, T.nadaMitiga)),
      tx(ev.casoReal) ? h('button', {
        class: 'ct-caso-btn', type: 'button', 'aria-expanded': String(abiertoCaso),
        onclick: () => { u.abierto[r.id] = !abiertoCaso; c.repintar(); },
      }, abiertoCaso ? '▾ ' + T.ocultarCaso : '▸ ' + T.verCaso) : null,
      abiertoCaso && tx(ev.casoReal) ? h('div', { class: 'ct-caso' },
        h('p', {}, h('b', {}, T.casoReal + ': '), tx(ev.casoReal), ev.src ? h('sup', { class: 'src' }, ev.src) : null),
        tx(ev.leccion) ? h('p', { class: 'ct-leccion' }, h('b', {}, T.leccion + ': '), tx(ev.leccion)) : null) : null));
  }
  return h('section', { class: 'ct-col ct-riesgos' },
    h('header', { class: 'ct-cab' }, h('h3', {}, T.riesgos), h('span', { class: 'ct-cuenta' }, T.nEventos(riesgos.length))),
    cuerpo);
}

// ---------------------------------------------------------------------------------------------------------------------
// Plan de contingencia
// ---------------------------------------------------------------------------------------------------------------------
function fila(c, id, tomadas, res) {
  const k = c.D?.CONTINGENCIAS?.[id] ?? { id };
  const rol = rolDe(c, id);
  const on = tomadas.includes(id);
  const puedo = puedoPor(c, rol);
  const lleno = !on && tomadas.length >= MAX_CONTINGENCIAS;
  const bloqueada = !puedo || lleno;
  const motivo = !puedo ? T.soloPuede(depto(rol)) : lleno ? T.cupoLleno(MAX_CONTINGENCIAS) : null;
  const precio = num(c, k.precio);
  const riesgo = (e) => lista(res?.riesgos).find((r) => r.id === e);
  const alternar = () => { if (!bloqueada && unaVez(id)) c.enviar('contingencia', { id, on: !on }); };
  return h('div', { class: 'ct-fila' + (on ? ' on' : '') + (bloqueada ? ' bloqueada' : ''), style: `--rol:${colorRol(rol)}` },
    h('button', {
      class: 'ct-check', type: 'button', role: 'checkbox', 'aria-checked': String(on), disabled: bloqueada,
      'aria-label': `${on ? T.quitar : T.comprar}: ${tx(k.nombre) || id}`, title: motivo ?? (on ? T.quitar : T.comprar), onclick: alternar,
    }, on ? pixel('check', 'var(--lp-tinta)', 16) : null),
    h('span', { class: 'ct-f-ico' }, pixel('kit', colorRol(rol), 28)),
    h('div', { class: 'ct-f-info' },
      h('b', {}, tx(k.nombre) || id, on ? h('span', { class: 'ct-badge comprada' }, T.comprada) : null),
      tx(k.texto) ? h('p', {}, tx(k.texto)) : null,
      lista(k.mitiga).length ? h('p', { class: 'ct-f-mit' }, h('span', {}, T.mitiga + ': '), lista(k.mitiga).map((e) => {
        const r = riesgo(e);
        const ev = c.D?.EVENTOS_MISION?.[e];
        const p = Number(r?.p ?? ev?.p);
        return h('span', { class: 'ct-tag ev' }, tx(ev?.nombre) || e, Number.isFinite(p) ? h('small', {}, ` · ${fmt(p * 100, 0)} %`) : null);
      })) : null,
      motivo ? h('p', { class: 'ct-solo' }, motivo) : null),
    h('div', { class: 'ct-f-coste' },
      h('span', { class: 'ct-masa' }, h('small', {}, T.masa), valor(c, k.masa, 'kg')),
      h('span', { class: 'ct-monedas', title: `${fmt(precio)} M USD` }, pixel('moneda', 'var(--lp-aviso)', 14), h('b', {}, fmt(precio)), h('small', {}, ` ${T.creditos}`)),
      h('span', { class: 'ct-musd' }, valor(c, k.precio, 'M USD'))));
}

function miniBarra(nombre, b, unidad) {
  const usado = Number(b?.usado) || 0, limite = Number(b?.limite) || 0;
  const est = b?.estado ?? 'ok';
  const pct = limite > 0 ? Math.min(150, (usado / limite) * 100) / 1.5 : usado > 0 ? 100 : 0;
  return h('div', { class: 'ct-mini ' + est },
    h('span', { class: 'ct-mini-nom' }, nombre),
    h('span', { class: 'ct-mini-pista' }, h('i', { class: 'ct-mini-relleno', style: `width:${pct}%` }), limite > 0 ? h('i', { class: 'ct-mini-marca' }) : null),
    h('span', { class: 'ct-mini-num' }, `${fmt(usado, 0)} / ${limite > 0 ? fmt(limite, 0) : '—'} ${unidad}`));
}

function columnaPlan(c, res, restr) {
  const m = c.mision;
  const tomadas = lista(c.e?.porRol?.comms?.contingencias);
  const ids = lista(m?.contingencias).filter((id) => c.D?.CONTINGENCIAS?.[id]);
  const orden = [...ROLES_IDS].sort((a, b) => (a === c.rol ? -1 : b === c.rol ? 1 : 0));
  const cupo = h('span', { class: 'ct-cupo', title: T.usadas(tomadas.length, MAX_CONTINGENCIAS) },
    Array.from({ length: MAX_CONTINGENCIAS }, (_, i) => h('i', { class: i < tomadas.length ? 'lleno' : '' })), h('b', {}, T.usadas(tomadas.length, MAX_CONTINGENCIAS)));

  let masa = 0, precio = 0;
  for (const id of tomadas) { const k = c.D?.CONTINGENCIAS?.[id]; masa += num(c, k?.masa); precio += num(c, k?.precio); }

  const cuerpo = h('div', { class: 'ct-lista', 'data-scroll': 'ct-plan' });
  if (!ids.length) cuerpo.append(h('p', { class: 'ct-vacio' }, T.sinContingencias));
  else if (c.rol && !ids.some((id) => rolDe(c, id) === c.rol)) cuerpo.append(h('p', { class: 'ct-vacio mio' }, T.sinMias));
  for (const r of orden) {
    const suyas = ids.filter((id) => rolDe(c, id) === r);
    if (!suyas.length) continue;
    const mio = r === c.rol;
    const etiqueta = mio ? T.tuDepto : puedoPor(c, r) ? T.vacante : T.soloLectura;
    cuerpo.append(h('div', { class: 'ct-grupo' + (mio ? ' mio' : puedoPor(c, r) ? ' vacante' : ' ajeno'), style: `--rol:${colorRol(r)}` },
      h('header', { class: 'ct-g-cab' }, h('i', { class: 'ct-cuadro' }), h('b', {}, depto(r)), h('span', { class: 'ct-g-etq' }, etiqueta)),
      suyas.map((id) => fila(c, id, tomadas, res))));
  }

  return h('section', { class: 'ct-col ct-plan' },
    h('header', { class: 'ct-cab' }, h('h3', {}, T.plan), cupo),
    h('div', { class: 'ct-impacto' },
      h('span', { class: 'ct-impacto-tit' }, `${T.impacto}: +${fmt(masa)} kg · +${fmt(precio)} M USD`),
      res ? miniBarra(T.recursoMasa, res.barras?.masa, 'kg') : null,
      res ? miniBarra(T.recursoPres, res.barras?.presupuesto, 'M USD') : null),
    restr ? h('p', { class: 'ct-restr' }, '⚠ ', T.restr) : null,
    cuerpo);
}

export function appContingencias(c) {
  const u = (c.ui.contingencias && typeof c.ui.contingencias === 'object') ? c.ui.contingencias : (c.ui.contingencias = {});
  u.abierto ??= {};
  const res = resumenSeguro(c);
  const restr = c.e?.fase === 'restricciones';
  return h('div', { class: 'ct-app' },
    h('div', { class: 'ct-cols' }, columnaRiesgos(c, u, res), columnaPlan(c, res, restr)),
    h('footer', { class: 'ct-nota' }, h('b', {}, T.notaTit), h('span', {}, T.nota)));
}

export default appContingencias;
