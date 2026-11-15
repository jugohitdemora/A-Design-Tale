// Gestor de pantallas: franja superior (HUD), pantalla proyectada sobre el 3D (portátil o pared de la sala de control),
// capa de HUD (pestaña del expediente) y modales (expediente, manual SOP, eventos de diseño).
// Se pinta por estado (main.js llama a pintar() en cada cambio), nunca desde el bucle de animación.
//
// p.vista (lo decide main.js): 'sala' (mirando la sala 3D, sin pantalla), 'laptop' (sentado frente al portátil)
// o 'control' (frente a la pared de pantallas de la sala de control de misión).
import { T } from '../textos.js';
import { textos, tx } from '../i18n.js';
import { traducirMotivo } from '../motivos.js';
import { h, en, lista, nombreRol } from './ui.js';
import { pantallaLaptop, alCargarApps } from './laptop.js';
import { expedienteCompleto, expedienteMini } from './expediente.js';
import { pantallaControl } from '../control/index.js';

export const FASES_JUEGO = ['briefing', 'diseno', 'restricciones', 'verificacion', 'mision', 'informe'];
// Tamaño lógico de cada pantalla (px CSS antes de escalar sobre el 3D).
export const LOGICO = { laptop: { w: 1280, h: 800 }, control: { w: 1600, h: 800 } };

const TV = textos({
  es: { laptop: 'Portátil', sala: 'Mirar la sala', control: 'Sala de control', briefing: 'Sala de briefing', manualTitulo: 'MANUAL DE PROCEDIMIENTOS', cerrar: 'Cerrar',
    cargando: 'Cargando…', esc: 'Esc: levantar la vista' },
  en: { laptop: 'Laptop', sala: 'Look around', control: 'Control room', briefing: 'Briefing room', manualTitulo: 'STANDARD OPERATING PROCEDURES', cerrar: 'Close',
    cargando: 'Loading…', esc: 'Esc: look up' },
});

async function cargarModulos(simulado) {
  if (simulado) {
    const s = await import('./_simulado.js');
    return { motor: { resumen: s.resumen, cumple: s.cumple, verificar: s.verificar, num: s.num }, D: s.DATOS };
  }
  const [motor, datos] = await Promise.all([import('../reglas/motor.js'), import('../datos/index.js')]);
  return { motor: { resumen: motor.resumen, cumple: motor.cumple, verificar: motor.verificar, num: motor.num, estadoDeRatio: motor.estadoDeRatio, factorVentana: motor.factorVentana }, D: datos.DATOS };
}

let appManual = null;
import('../laptop/manual.js').then((m) => { appManual = m.appManual ?? null; }).catch((err) => console.warn('manual no disponible', err?.message ?? err));

export function crearPantallas({ raiz, franja, modal, capa, simulado = false }) {
  const c = {
    e: null, rol: null, id: null, nick: '', motor: null, D: null, mision: null, vista: 'sala',
    ui: { tab: 'taller', rolActivo: null, op: {}, cohete: null, app: null, overlay: null },
    enviar: (tipo, payload) => { limpiarAviso(); ultimo?.intentar?.(tipo, payload ?? {}); },
    repintar: () => dibujar(true),
    irA: (v) => ultimo?.irA?.(v),
  };
  let ultimo = null, errorCarga = null, firma = '', avisoTxt = '', avisoTimer = null;
  let arrastrando = false;
  const vistos = new Set(); let lineaBase = false; const cola = [];

  cargarModulos(simulado).then(({ motor, D }) => { c.motor = motor; c.D = D; dibujar(true); })
    .catch((err) => { console.error('No se pudo cargar reglas/datos', err); errorCarga = String(err?.message ?? err); dibujar(true); });
  alCargarApps(() => dibujar(true));
  addEventListener('idioma', () => dibujar(true));

  // ---- el DOM no se toca mientras se arrastra un deslizador ----
  for (const zona of [raiz, capa]) zona.addEventListener('pointerdown', (ev) => { if (ev.target?.type === 'range') arrastrando = true; });
  addEventListener('pointerup', () => { if (arrastrando) { arrastrando = false; setTimeout(() => dibujar(true), 1500); } });

  function limpiarAviso() { avisar(''); }
  function avisar(t) {
    avisoTxt = t ? traducirMotivo(t) : '';
    const el = franja.querySelector('.f-aviso'); if (el) el.textContent = avisoTxt;
    clearTimeout(avisoTimer);
    if (avisoTxt) avisoTimer = setTimeout(() => avisar(''), 8000);
  }

  function pintarFranja(fase) {
    const i = FASES_JUEGO.indexOf(fase);
    const vista = ultimo?.vista ?? 'sala';
    const boton = (v, icono, txt) => h('button', { class: 'f-vista' + (vista === v ? ' activa' : ''), type: 'button', onclick: () => c.irA(v), title: txt }, icono, ' ', txt);
    franja.replaceChildren(
      h('ol', { class: 'f-pasos' }, FASES_JUEGO.map((f, k) => h('li', { class: k === i ? 'actual' : k < i ? 'hecho' : '', ...(k === i ? { 'aria-current': 'step' } : {}) }, T.phases[f]))),
      h('span', { class: 'f-yo' }, ultimo?.nick ?? '', ' · ', c.rol ? nombreRol(c.rol) : T.noRole),
      h('span', { class: 'f-red tenue' }, ultimo?.enLinea ?? ''),
      h('span', { class: 'f-aviso', role: 'status', 'aria-live': 'polite' }, avisoTxt),
      h('nav', { class: 'f-vistas' },
        vista !== 'control' ? boton('laptop', '💻', TV.laptop) : null,
        vista !== 'control' ? boton('sala', '👀', TV.sala) : boton('sala', '🚪', TV.briefing),
        vista !== 'control' ? boton('control', '🛰', TV.control) : null),
      h('button', { class: 'btn-plano', type: 'button', onclick: () => ultimo?.volverAlLobby?.() }, T.toLobby));
  }

  // ---- eventos de diseño (modal) ----
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

  // ---- capa: HUD del expediente + modales de expediente y manual ----
  function abrir(o) { c.ui.overlay = o; dibujar(true); }
  function cerrarOverlay() { c.ui.overlay = null; dibujar(true); }
  function construirCapa(fase) {
    const nodos = [];
    if (c.D && c.mision && fase !== 'briefing') nodos.push(expedienteMini(c, (id) => abrir({ tipo: 'expediente', id })));
    if (c.D && fase === 'briefing' && c.mision) nodos.push(expedienteMini(c, (id) => abrir({ tipo: 'expediente', id })));
    const o = c.ui.overlay;
    if (o?.tipo === 'expediente' && c.D) {
      const el = expedienteCompleto(c, o.id, { cerrar: cerrarOverlay });
      if (el) nodos.push(el);
    } else if (o?.tipo === 'manual') {
      const rol = o.rol ?? c.rol ?? 'vuelo';
      let cuerpo;
      try { cuerpo = appManual ? appManual(c, { rol }) : h('p', { class: 'lp-vacio' }, TV.cargando); } catch (err) { console.error('manual', err); cuerpo = h('p', { class: 'mal-txt' }, String(err?.message ?? err)); }
      nodos.push(h('div', { class: 'capa-fondo', onclick: (ev) => { if (ev.target === ev.currentTarget) cerrarOverlay(); } },
        h('article', { class: 'carpeta-manual', role: 'dialog', 'aria-modal': 'true', 'aria-label': TV.manualTitulo },
          h('button', { class: 'exp-cerrar', type: 'button', onclick: cerrarOverlay, 'aria-label': TV.cerrar }, '✕'),
          h('div', { class: 'carpeta-manual-cuerpo' }, cuerpo))));
    }
    return nodos;
  }

  // ---- pantalla proyectada ----
  function construir(fase, vista) {
    if (errorCarga) return h('section', { class: 'caja' }, h('p', { class: 'mal-txt' }, `${T.rulesFailed}: ${errorCarga}`));
    if (!c.D || !c.motor) return h('section', { class: 'caja' }, h('p', { class: 'tenue' }, T.loadingRules));
    if (vista === 'control') return pantallaControl(c, fase);
    return pantallaLaptop(c, fase, { irA: c.irA });
  }

  function dibujar(forzar = false) {
    const p = ultimo; if (!p) return;
    const e = p.estado;
    const activo = !!p.activo && !!e && FASES_JUEGO.includes(e.fase);
    const vista = p.vista ?? 'sala';
    const conPantalla = activo && (vista === 'laptop' || vista === 'control') && !!p.pantallaLista;
    raiz.classList.toggle('oculto', !conPantalla);
    franja.classList.toggle('oculto', !activo);
    capa.classList.toggle('oculto', !activo);
    if (!activo) { modal.classList.add('oculto'); c.ui.overlay = null; return; }

    if (c.e?.fase && c.e.fase !== e.fase) c.ui.overlay = null; // al cambiar de fase se cierran expediente y manual
    c.e = e; c.rol = p.rol; c.id = p.jugadorId; c.nick = p.nick; c.vista = vista;
    c.mision = c.D?.MISIONES?.[e.mision?.id] ?? null;
    revisarEventos();

    const nueva = JSON.stringify([e, p.rol, p.enLinea, !!c.D, errorCarga, c.ui, vista, conPantalla]);
    if (!forzar && nueva === firma) return;
    if (arrastrando) return;
    firma = nueva;

    pintarFranja(e.fase);
    const scroll = {};
    for (const zona of [raiz, capa]) zona.querySelectorAll('[data-scroll]').forEach((n) => { scroll[n.dataset.scroll] = n.scrollTop; });
    capa.replaceChildren(...construirCapa(e.fase));
    if (conPantalla) {
      raiz.className = `pantalla en-${vista} fase-${e.fase}`;
      let nodo;
      try { nodo = construir(e.fase, vista); } catch (err) { console.error('pantalla', e.fase, err); nodo = h('section', { class: 'caja' }, h('p', { class: 'mal-txt' }, 'Screen error: ' + (err?.message ?? err))); }
      raiz.replaceChildren(nodo);
    } else raiz.replaceChildren();
    for (const zona of [raiz, capa]) zona.querySelectorAll('[data-scroll]').forEach((n) => { if (scroll[n.dataset.scroll] != null) n.scrollTop = scroll[n.dataset.scroll]; });
  }

  return {
    pintar(p) { ultimo = p; dibujar(); },
    aviso: avisar,
    abrir,
    cerrar: cerrarOverlay,
    get overlay() { return c.ui.overlay; },
    contexto: c,
  };
}
export { tx };
