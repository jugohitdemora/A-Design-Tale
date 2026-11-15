// Screen manager: top strip + one screen per protocol phase + design-event modal.
// Rendering is driven by state (pintar() is called from main.js on every state change), never by the animation loop.
import { T } from '../textos.js';
import { h, en, lista, nombreRol } from './ui.js';
import { pantallaBriefing } from './briefing.js';
import { pantallaTaller } from './taller.js';
import { pantallaVerificacion } from './verificacion.js';
import { pantallaMision } from './mision.js';
import { pantallaInforme } from './informe.js';

export const FASES_JUEGO = ['briefing', 'diseno', 'restricciones', 'verificacion', 'mision', 'informe'];

async function cargarModulos(simulado) {
  if (simulado) {
    const s = await import('./_simulado.js');
    return { motor: { resumen: s.resumen, cumple: s.cumple, verificar: s.verificar, num: s.num }, D: s.DATOS };
  }
  const [motor, datos] = await Promise.all([import('../reglas/motor.js'), import('../datos/index.js')]);
  return { motor: { resumen: motor.resumen, cumple: motor.cumple, verificar: motor.verificar, num: motor.num }, D: datos.DATOS };
}

export function crearPantallas({ raiz, franja, modal, simulado = false }) {
  const c = {
    e: null, rol: null, id: null, nick: '', motor: null, D: null, mision: null,
    ui: { tab: 'taller', rolActivo: null, op: {}, cohete: null },
    enviar: (tipo, payload) => { limpiarAviso(); ultimo?.intentar?.(tipo, payload ?? {}); },
    repintar: () => dibujar(true),
  };
  let ultimo = null, errorCarga = null, firma = '', avisoTxt = '', avisoTimer = null;
  let arrastrando = false, pendiente = false;
  const vistos = new Set(); let lineaBase = false; const cola = [];

  cargarModulos(simulado).then(({ motor, D }) => { c.motor = motor; c.D = D; dibujar(); })
    .catch((err) => { console.error('No se pudo cargar reglas/datos', err); errorCarga = String(err?.message ?? err); dibujar(); });

  // ---- keep the DOM still while the user drags a slider ----
  raiz.addEventListener('pointerdown', (ev) => { if (ev.target?.type === 'range') arrastrando = true; });
  addEventListener('pointerup', () => { if (arrastrando) { arrastrando = false; setTimeout(() => dibujar(true), 1500); } });
  raiz.addEventListener('change', (ev) => { if (ev.target?.type === 'range') setTimeout(() => dibujar(true), 1500); });

  function limpiarAviso() { avisar(''); }
  function avisar(t) {
    avisoTxt = t || '';
    const el = franja.querySelector('.f-aviso'); if (el) el.textContent = avisoTxt;
    clearTimeout(avisoTimer);
    if (avisoTxt) avisoTimer = setTimeout(() => avisar(''), 8000);
  }

  function pintarFranja(fase) {
    const i = FASES_JUEGO.indexOf(fase);
    franja.replaceChildren(
      h('ol', { class: 'f-pasos' }, FASES_JUEGO.map((f, k) => h('li', { class: k === i ? 'actual' : k < i ? 'hecho' : '', ...(k === i ? { 'aria-current': 'step' } : {}) }, T.phases[f]))),
      h('span', { class: 'f-yo' }, ultimo?.nick ?? '', ' · ', c.rol ? nombreRol(c.rol) : T.noRole),
      h('span', { class: 'f-red tenue' }, ultimo?.enLinea ?? ''),
      h('span', { class: 'f-aviso', role: 'status', 'aria-live': 'polite' }, avisoTxt),
      h('button', { class: 'btn-plano', type: 'button', onclick: () => ultimo?.volverAlLobby?.() }, T.toLobby));
  }

  // ---- design events (modal) ----
  function revisarEventos() {
    const ids = lista(c.e?.diseno?.eventos).map((x) => x?.id).filter(Boolean);
    if (c.e?.fase === 'lobby') { vistos.clear(); lineaBase = false; cola.length = 0; }
    if (!lineaBase) { ids.forEach((id) => vistos.add(id)); lineaBase = true; return; }
    let nuevo = false;
    for (const id of ids) if (!vistos.has(id)) { vistos.add(id); cola.push(id); nuevo = true; }
    if (nuevo) dibujarModal();
  }
  function dibujarModal() {
    modal.replaceChildren();
    if (!cola.length) { modal.classList.add('oculto'); return; }
    const id = cola[0];
    const ev = c.D?.EVENTOS_DISENO?.[id] ?? {};
    const ef = ev.efecto ?? {};
    const cambios = [];
    if (typeof ef.presupuesto === 'number') cambios.push(T.eff.presupuesto(ef.presupuesto));
    if (ef.limite) cambios.push(T.eff.limite(T.bars[ef.limite.recurso] ?? ef.limite.recurso, ef.limite.factor));
    if (ef.prioridad) cambios.push(T.eff.prioridad(en(lista(c.mision?.objetivos).find((o) => o.id === ef.prioridad)?.nombre) || ef.prioridad));
    modal.classList.remove('oculto');
    modal.append(h('div', { class: 'tarjeta-evento', role: 'dialog', 'aria-modal': 'true' },
      h('small', { class: 'tenue' }, T.designEvent, cola.length > 1 ? ` (+${cola.length - 1})` : ''),
      h('h3', {}, h('span', { class: 'signo s' + (ev.signo === '+' ? 'p' : ev.signo === '-' ? 'n' : 'x') }, ev.signo ?? '?'), ' ', en(ev.nombre) || id),
      en(ev.texto) ? h('p', {}, en(ev.texto)) : null,
      cambios.length ? h('p', {}, h('b', {}, T.changed + ': '), cambios.join(' · ')) : null,
      en(ev.casoReal) ? h('p', { class: 'caso' }, h('b', {}, T.realCase + ': '), en(ev.casoReal), ev.src ? h('sup', { class: 'src' }, ev.src) : null) : null,
      h('div', { class: 'acciones' }, h('button', { class: 'btn-plano primario', type: 'button', onclick: () => { cola.shift(); dibujarModal(); } }, T.close))));
  }

  // ---- main render ----
  function construir(fase) {
    if (errorCarga) return h('section', { class: 'caja' }, h('p', { class: 'mal-txt' }, `${T.rulesFailed}: ${errorCarga}`));
    if (!c.D || !c.motor) return h('section', { class: 'caja' }, h('p', { class: 'tenue' }, T.loadingRules));
    if (!c.mision && fase !== 'briefing') return h('section', { class: 'caja' }, h('p', { class: 'tenue' }, T.noMission));
    if (fase === 'briefing') return pantallaBriefing(c);
    if (fase === 'diseno') return pantallaTaller(c, false);
    if (fase === 'restricciones') return pantallaTaller(c, true);
    if (fase === 'verificacion') return pantallaVerificacion(c);
    if (fase === 'mision') return pantallaMision(c);
    if (fase === 'informe') return pantallaInforme(c);
    return h('section', { class: 'caja' });
  }

  function dibujar(forzar = false) {
    const p = ultimo; if (!p) return;
    const e = p.estado;
    const activo = !!p.activo && !!e && FASES_JUEGO.includes(e.fase);
    raiz.classList.toggle('oculto', !activo);
    franja.classList.toggle('oculto', !activo);
    if (!activo) { modal.classList.add('oculto'); return; }

    c.e = e; c.rol = p.rol; c.id = p.jugadorId; c.nick = p.nick;
    c.mision = c.D?.MISIONES?.[e.mision?.id] ?? null;
    revisarEventos();

    const nueva = JSON.stringify([e, p.rol, p.enLinea, !!c.D, errorCarga, c.ui]);
    if (!forzar && nueva === firma) return;
    if (arrastrando) { pendiente = true; return; }
    firma = nueva; pendiente = false;

    const scroll = {};
    raiz.querySelectorAll('[data-scroll]').forEach((n) => { scroll[n.dataset.scroll] = n.scrollTop; });
    const yTop = raiz.scrollTop;
    pintarFranja(e.fase);
    raiz.className = 'pantalla fase-' + e.fase;
    let nodo;
    try { nodo = construir(e.fase); } catch (err) { console.error('pantalla', e.fase, err); nodo = h('section', { class: 'caja' }, h('p', { class: 'mal-txt' }, 'Screen error: ' + (err?.message ?? err))); }
    raiz.replaceChildren(nodo);
    raiz.querySelectorAll('[data-scroll]').forEach((n) => { if (scroll[n.dataset.scroll] != null) n.scrollTop = scroll[n.dataset.scroll]; });
    raiz.scrollTop = yTop;
  }

  return {
    pintar(p) { ultimo = p; dibujar(); },
    aviso: avisar,
    contexto: c,
  };
}
