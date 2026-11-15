// Shared helpers for all screens. No state here.
import { T } from '../textos.js';

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

// Text of a bilingual field ({es,en}) or a plain string.
export const en = (x) => (x == null ? '' : typeof x === 'string' ? x : x.en ?? x.es ?? '');

export const lista = (x) => (Array.isArray(x) ? x : x && typeof x === 'object' ? Object.values(x) : []);

export function redondear(n, d = 1) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '-';
  const f = 10 ** d;
  return String(Math.round(n * f) / f);
}

// A data value {v, conf, src, juego}. Returns a <span> with the number, the "≈" mark for game values and the source id.
export function valor(c, x, unidad = '') {
  if (x == null) return h('span', { class: 'val tenue' }, '-');
  if (typeof x === 'number') return h('span', { class: 'val' }, redondear(x, 2) + (unidad ? ' ' + unidad : ''));
  const num = (c.motor?.num ?? ((q) => q?.v ?? q?.juego ?? 0))(x);
  const juego = x.conf === 'JUEGO' || x.v == null;
  const el = h('span', { class: 'val' + (juego ? ' juego' : ''), title: juego ? T.gameValue : `${T.sourceLabel}: ${x.src ?? '?'}` },
    (juego ? '≈ ' : '') + redondear(num, 2) + (unidad ? ' ' + unidad : ''));
  if (!juego && x.src && x.src !== 'JUEGO') el.append(h('sup', { class: 'src' }, x.src));
  return el;
}

export const nombreRol = (r) => T.roles[r] ?? r;
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
