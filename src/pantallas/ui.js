// Shared helpers for all screens. No state here.
import { T } from '../textos.js';
import { tx, depto, idioma } from '../i18n.js';
import { fechaDeMes, NOMBRE_MES } from '../datos/calendario.js';

export const ROLES_IDS = ['vuelo', 'ciencia', 'potencia', 'comms'];
export const ROL_COLOR = { vuelo: '#d9822b', ciencia: '#3fa66b', potencia: '#e0c040', comms: '#4a7fd0' };
// Difficulty ids sent in elegirMision. Change here if the rules module uses other ids.
export const DIFICULTADES = ['facil', 'normal', 'dificil'];
export const MAX_CONTINGENCIAS = 3;

// h('div', { class: 'x', onclick: fn, title: '...' }, child, 'text', [children])
export function h(tag, attrs, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'disabled') el.disabled = !!v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  const poner = (x) => {
    if (x == null || x === false) return;
    if (Array.isArray(x)) x.forEach(poner);
    else el.append(x.nodeType ? x : document.createTextNode(String(x)));
  };
  hijos.forEach(poner);
  return el;
}

// Texto de un campo bilingüe ({es,en}) o de un texto plano, en la lengua activa. `en` se conserva como alias.
export { tx };
export const en = (x) => tx(x);

export const lista = (x) => (Array.isArray(x) ? x : x && typeof x === 'object' ? Object.values(x) : []);

export function redondear(n, d = 1) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '-';
  const f = 10 ** d;
  return String(Math.round(n * f) / f);
}

// Dinero: importes del juego en millones de dólares. Un solo formato: "US$ 1,100 M" (en) · "US$ 1.100 M" (es).
export function dinero(n) {
  const x = typeof n === 'number' ? n : (n == null || n === '' ? NaN : Number(n));
  if (!Number.isFinite(x)) return '—';
  let t;
  try { t = new Intl.NumberFormat(idioma() === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 1, useGrouping: 'always' }).format(x); } catch { t = String(Math.round(x * 10) / 10); }
  return `US$ ${t} M`;
}
const esDinero = (u) => u === true || u === 'M USD' || u === 'money' || u === T.musd;

// A data value {v, conf, src, juego}. Returns a <span> with the number and the "≈" mark for estimates (the tooltip says how).
// Unit 'M USD' (or true) formats as money. Never shows the source code.
export function valor(c, x, unidad = '') {
  const din = esDinero(unidad);
  const fmt = (n) => (din ? dinero(n) : redondear(n, 2) + (unidad ? ' ' + unidad : ''));
  if (x == null) return h('span', { class: 'val tenue' }, '—');
  if (typeof x === 'number') return h('span', { class: 'val' }, fmt(x));
  const num = (c.motor?.num ?? ((q) => q?.v ?? q?.juego ?? 0))(x);
  const juego = x.conf === 'JUEGO' || x.v == null;
  const est = x.conf === 'EST';
  const titulo = est ? (tx(x.ec) || T.estimateValue) : juego ? T.gameValue : (c.D?.FUENTES?.[x.src]?.titulo ? tx(c.D.FUENTES[x.src].titulo) : null);
  return h('span', { class: 'val' + (juego || est ? ' juego' : ''), title: titulo }, (juego || est ? '≈ ' : '') + fmt(num));
}

export const nombreRol = (r) => depto(r);
export const sinCero = (n) => (n == null ? 0 : n);

// Is a role vacant (nobody connected owns it)?
export function vacante(e, rol) {
  return !Object.values(e?.jugadores ?? {}).some((j) => j.rol === rol && j.conectado);
}
// Can I act for this role? Mine, or vacant (MEC-03).
export function puedoPor(c, rol) {
  return !!c.rol && (rol === c.rol || vacante(c.e, rol));
}
// Roles I can act for, mine first.
export function rolesQuePuedo(c) {
  return ROLES_IDS.filter((r) => puedoPor(c, r)).sort((a, b) => (a === c.rol ? -1 : b === c.rol ? 1 : 0));
}
// payload with `rol` only when it is not mine
export const conRol = (c, rol, p) => (rol && rol !== c.rol ? { rol, ...p } : p);

export function piezasMontadas(c, rol) {
  const p = c.e?.porRol?.[rol]?.piezas;
  return p && typeof p === 'object' ? p : {};
}

export function resumenSeguro(c) {
  try { return c.motor?.resumen && c.mision ? c.motor.resumen(c.e, c.D) : null; } catch (err) { console.error('resumen', err); return null; }
}

export function panelVacio(texto) { return h('p', { class: 'tenue vacio' }, texto); }

export function fuenteLink(c, id) {
  const f = c.D?.FUENTES?.[id];
  const url = typeof f?.url === 'string' && /^https?:\/\//.test(f.url) ? f.url : null;
  return { id, titulo: f?.titulo ?? id, url, agencia: f?.agencia ?? '' };
}

// ---------- Reloj de misión (estado.reloj = { mes, msPorMes, inicioMes, corriendo }) ----------
// Un solo widget (.rm) en el portátil, la sala de control y la tarjeta de la sala. Un temporizador de 250 ms rellena la barra del mes.
const TR = {
  es: { vel: (s, n) => `1 mes ≈ ${s} s · ${n} ${n === 1 ? 'tripulante' : 'tripulantes'}`, velC: (s) => `≈ ${s} s/mes`, pausa: '⏸ en pausa',
    plazo: 'Plazo inversores', plazoC: 'Plazo', quedan: (n) => (n === 1 ? 'queda 1 mes' : `quedan ${n} meses`), quedanC: (n) => `${n} m`, ultimo: 'último mes',
    pasado: (n) => `pasado ${n} ${n === 1 ? 'mes' : 'meses'}`, pasadoC: (n) => `+${n} m tarde`,
    recorte: (p) => `recorte −${p} %`, lanz: 'Lanzamiento', lanzNo: 'Mes de lanzamiento sin fijar: lo elige el Director de Vuelo en la sala de control', lanzNoC: 'sin fijar',
    perdido: 'ya pasó: elige otro', cancel: 'los inversores se retiran',
    tictac: (f) => `Pasó un mes: ${f}`, alPlazo: (f, p) => `¡Plazo de los inversores superado (${f})! Recorte del presupuesto: −${p} %`,
    alLanz: (f) => `El mes de lanzamiento (${f}) ya pasó: elige otro en la sala de control` },
  en: { vel: (s, n) => `1 month ≈ ${s} s · ${n} crew`, velC: (s) => `≈ ${s} s/mo`, pausa: '⏸ paused',
    plazo: 'Investor deadline', plazoC: 'Deadline', quedan: (n) => `${n} ${n === 1 ? 'month' : 'months'} left`, quedanC: (n) => `${n} mo left`, ultimo: 'last month',
    pasado: (n) => `${n} ${n === 1 ? 'month' : 'months'} late`, pasadoC: (n) => `${n} mo late`,
    recorte: (p) => `budget cut −${p} %`, lanz: 'Launch', lanzNo: 'Launch month not set — Flight Director picks it in the control room', lanzNoC: 'not set',
    perdido: 'missed: pick another', cancel: 'investors withdraw',
    tictac: (f) => `A month passed — ${f}`, alPlazo: (f, p) => `Investor deadline passed (${f})! Budget cut: −${p} %`,
    alLanz: (f) => `The launch month (${f}) has passed — pick another in the control room` },
};
const tr = () => TR[idioma() === 'es' ? 'es' : 'en'];
const ent = (x) => (x !== null && x !== '' && x !== undefined && Number.isFinite(Number(x)) ? Math.floor(Number(x)) : null);
export const fechaTxt = (abs) => {
  const f = fechaDeMes(abs), n = (NOMBRE_MES[idioma() === 'es' ? 'es' : 'en'] ?? NOMBRE_MES.en)[f.mes - 1] ?? '';
  return `${n.charAt(0).toUpperCase()}${n.slice(1)} ${f.anio}`;
};

// → null si no hay reloj; si no { mes, inicio, abs, plazo, lanz, left, retraso, recorte, cancelada, lanzTarde, ms, ini, corriendo, crew, nivel, fase }.
// Los meses de plazo y de lanzamiento cuentan desde el inicio del diseño (misión.reloj.inicio), como en motor.relojDe.
export function datosReloj(c) {
  const e = c?.e, r = e?.reloj;
  if (!r || typeof r !== 'object') return null;
  const mes = Math.max(0, ent(r.mes) ?? 0);
  const inicio = Math.max(0, ent(c.mision?.reloj?.inicio ?? r.inicio) ?? 0);
  const plazo = ent(e.mision?.plazo), lanz = ent(e.ruta?.mes);
  let rl = null; try { rl = c.motor?.relojDe ? c.motor.relojDe(e, c.D) : null; } catch { rl = null; }
  const retraso = rl?.retraso ?? (plazo == null ? 0 : Math.max(0, Math.max(mes, lanz ?? mes) - plazo));
  const recorte = rl?.recorte ?? Math.min(0.4, 0.04 * Math.max(0, retraso - 1));
  const ms = Number(r.msPorMes) > 0 ? Number(r.msPorMes) : 60000;
  const crew = Math.min(4, Math.max(1, Math.round(4 - (ms - 60000) / 15000)));
  const left = plazo == null ? null : plazo - mes;
  const lanzTarde = lanz != null && lanz < mes && e.fase !== 'mision' && e.fase !== 'informe';
  let nivel = 'ok';
  if ((left != null && left <= 3) || lanzTarde) nivel = 'aviso';
  if ((left != null && left < 0) || rl?.cancelada) nivel = 'mal';
  return { mes, inicio, abs: inicio + mes, plazo, lanz, left, retraso, recorte, cancelada: !!rl?.cancelada, lanzTarde, ms, ini: Number(r.inicioMes), corriendo: r.corriendo === true, crew, nivel, fase: e.fase };
}

const relojVivo = { ms: 60000, ini: NaN, corriendo: false, mes: -1, frac: 0 };
let relojTimer = null, tickEn = 0;
function pintarBarras() {
  const v = relojVivo;
  if (v.corriendo && Number.isFinite(v.ini)) v.frac = Math.min(1, Math.max(0, (Date.now() - v.ini) / v.ms));
  const pc = Math.round(v.frac * 100);
  document.querySelectorAll('.rm-barra').forEach((b) => { if (b.firstChild) b.firstChild.style.width = pc + '%'; b.setAttribute('aria-valuenow', String(pc)); });
}
export function marcarTick() {
  tickEn = Date.now();
  document.querySelectorAll('.rm').forEach((n) => { n.classList.remove('tick'); void n.offsetWidth; n.classList.add('tick'); });
}
export function relojMision(c) {
  const d = datosReloj(c); if (!d) return null;
  const t = tr();
  if (d.mes !== relojVivo.mes) relojVivo.frac = 0;
  Object.assign(relojVivo, { ms: d.ms, ini: d.ini, corriendo: d.corriendo, mes: d.mes });
  if (!relojTimer) relojTimer = setInterval(pintarBarras, 250);
  const par = (largo, corto) => [h('span', { class: 'rm-l' }, largo), h('span', { class: 'rm-c' }, corto)];
  const pct = Math.round(d.recorte * 100);
  let plazoL = null, plazoC = null;
  if (d.plazo != null) {
    const f = fechaTxt(d.inicio + d.plazo);
    const est = d.left > 1 ? [t.quedan(d.left), t.quedanC(d.left)] : d.left === 1 ? [t.quedan(1), t.quedanC(1)] : d.left === 0 ? [t.ultimo, t.ultimo] : [t.pasado(-d.left), t.pasadoC(-d.left)];
    plazoL = `${t.plazo}: ${f} · ${est[0]}${pct > 0 ? ` · ${t.recorte(pct)}` : ''}${d.cancelada ? ` · ${t.cancel}` : ''}`;
    plazoC = `${t.plazoC} ${f} · ${est[1]}${pct > 0 ? ` · −${pct} %` : ''}`;
  }
  let lanzL = null, lanzC = null;
  if (d.lanz != null) { const f = fechaTxt(d.inicio + d.lanz); lanzL = `${t.lanz}: ${f}${d.lanzTarde ? ` (${t.perdido})` : ''}`; lanzC = `${t.lanz} ${f}${d.lanzTarde ? ' ⚠' : ''}`; }
  else if (d.fase === 'diseno' || d.fase === 'restricciones' || d.fase === 'verificacion') { lanzL = t.lanzNo; lanzC = `${t.lanz}: ${t.lanzNoC}`; }
  const vel = t.vel(Math.round(d.ms / 1000), d.crew);
  const el = h('div', { class: `rm ${d.nivel}${d.corriendo ? '' : ' pausa'}${Date.now() - tickEn < 1400 ? ' tick' : ''}`, role: 'group', 'aria-label': fechaTxt(d.abs), title: [vel, plazoL, lanzL].filter(Boolean).join('\n') },
    h('div', { class: 'rm-fecha' }, h('b', { class: 'rm-mes' }, fechaTxt(d.abs)), d.corriendo ? null : h('span', { class: 'rm-pausa' }, t.pausa),
      h('span', { class: 'rm-vel' }, ...par(vel, t.velC(Math.round(d.ms / 1000))))),
    h('div', { class: 'rm-barra', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, h('i')),
    h('div', { class: 'rm-linea' },
      plazoL ? h('span', { class: 'rm-plazo' }, ...par(plazoL, plazoC)) : null,
      lanzL ? h('span', { class: 'rm-lanz' + (d.lanz == null || d.lanzTarde ? ' falta' : '') }, ...par(lanzL, lanzC)) : null));
  pintarBarras();
  return el;
}

// Aviso breve arriba al centro (vive en <body>: no depende de la guía, que se repinta).
let toastTimer = null;
export function toastReloj(txt, nivel = 'ok') {
  let n = document.getElementById('rm-toast');
  if (!n) { n = h('div', { id: 'rm-toast', class: 'rm-toast', role: 'status', 'aria-live': 'polite' }); document.body.append(n); }
  n.textContent = txt; n.className = 'rm-toast ' + nivel; void n.offsetWidth; n.classList.add('ver');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => n.classList.remove('ver'), nivel === 'ok' ? 3500 : 7000);
}
export const textosReloj = () => tr();
