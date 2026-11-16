// Gestor de pantallas: franja superior (HUD), pantalla proyectada sobre el 3D (portátil o pared de la sala de control),
// capa de HUD (pestaña del expediente) y modales (expediente, manual SOP, eventos de diseño).
// Se pinta por estado (main.js llama a pintar() en cada cambio), nunca desde el bucle de animación.
//
// p.vista (lo decide main.js): 'sala' (mirando la sala 3D, sin pantalla), 'laptop' (sentado frente al portátil)
// o 'control' (frente a la pared de pantallas de la sala de control de misión).
import { T } from '../textos.js';
import { esEventoInversor, inversorDe, titular, TI } from '../inversores.js';
import { textos, tx } from '../i18n.js';
import { traducirMotivo } from '../motivos.js';
import { h, en, lista, nombreRol, resumenSeguro, ROLES_IDS, relojMision, datosReloj, marcarTick, toastReloj, textosReloj, fechaTxt } from './ui.js';
import { pantallaLaptop, alCargarApps } from './laptop.js';
import { expedienteCompleto, expedienteMini } from './expediente.js';
import { pantallaControl } from '../control/index.js';
import { botonDesistir, capaDesistir } from './desistir.js';
import { efectoAccion } from '../audio.js';

export const FASES_JUEGO = ['briefing', 'diseno', 'restricciones', 'verificacion', 'mision', 'informe'];
// Tamaño lógico de cada pantalla (px CSS antes de escalar sobre el 3D).
export const LOGICO = { laptop: { w: 1024, h: 640 }, control: { w: 1280, h: 640 } };

const TV = textos({
  es: { laptop: 'Portátil', sala: 'Sala', control: 'Sala de control', pared: 'Pantalla principal', briefing: 'Sala de briefing', manualTitulo: 'MANUAL DE PROCEDIMIENTOS', cerrar: 'Cerrar',
    cargando: 'Cargando…', esc: 'Esc: levantar la vista', lobby: 'Salir al lobby', siguiente: 'Siguiente', y: 'y',
    g: {
      proyector: 'Elige un escenario en el proyector.',
      carpeta: 'Abre una carpeta de la mesa y elige la misión.',
      listo: 'Marca los objetivos en el expediente y pulsa Listo.',
      esperaListos: (a, b) => `Esperando a la tripulación (${a}/${b} listos).`,
      piezas: 'Monta tus piezas en el Constructor del portátil.',
      cohete: 'Elige un cohete en la Cámara de lanzamiento.',
      ruta: 'Planifica la ruta en la sala de control.',
      revision: 'Cuando el equipo esté listo, pulsa Pedir revisión.',
      exceso: (b) => `Reduce ${b}: hay exceso sobre el límite.`,
      recorta: (b) => `Recorta ${b} hasta quedar dentro del límite.`,
      gonogo: 'Da tu GO en la consola de tu departamento.',
      fallaCheck: 'Hay comprobaciones en rojo: vuelve al diseño.',
      esperaGo: (l) => `Esperando GO de: ${l}.`,
      lanzar: 'Todo en GO. Pulsa Lanzar.',
      mision: 'Sigue el vuelo y pulsa Siguiente paso.',
      informe: 'Revisa el informe y elige el siguiente vuelo.',
    } },
  en: { laptop: 'Laptop', sala: 'Room', control: 'Control room', pared: 'Main screen', briefing: 'Briefing room', manualTitulo: 'STANDARD OPERATING PROCEDURES', cerrar: 'Close',
    cargando: 'Loading…', esc: 'Esc: look up', lobby: 'Leave to lobby', siguiente: 'Next', y: 'and',
    g: {
      proyector: 'Choose a scenario on the projector.',
      carpeta: 'Open a folder on the table and choose the mission.',
      listo: 'Tick the goals in the dossier and press Ready.',
      esperaListos: (a, b) => `Waiting for the crew (${a}/${b} ready).`,
      piezas: 'Add your parts in the laptop Builder.',
      cohete: 'Choose a rocket in the Launch camera.',
      ruta: 'Plan the route in the control room.',
      revision: 'When the team is ready, press Request review.',
      exceso: (b) => `Reduce ${b}: over the limit.`,
      recorta: (b) => `Cut ${b} until it is within the limit.`,
      gonogo: 'Give your GO on your department console.',
      fallaCheck: 'Some checks are red: return to design.',
      esperaGo: (l) => `Waiting for GO from: ${l}.`,
      lanzar: 'All GO. Press Launch.',
      mision: 'Follow the flight and press Next step.',
      informe: 'Read the report and choose the next flight.',
    } },
});

// Siguiente paso para ESTE jugador, sacado del estado (nunca un texto fijo por fase).
// objetivo: qué objeto del mundo lleva ahí ('proyector', 'carpeta', 'laptop', 'control', null).
function calcularGuia(c, fase) {
  const e = c.e ?? {};
  const g = TV.g;
  const i = FASES_JUEGO.indexOf(fase);
  const base = { fase, i, total: FASES_JUEGO.length, nombre: T.phases[fase] ?? fase };
  const r = (texto, objetivo = null) => ({ ...base, texto, objetivo });
  try {
    if (fase === 'briefing') {
      if (!e.mision?.escenario) return r(g.proyector, 'proyector');
      if (!e.mision?.id) return r(g.carpeta, 'carpeta');
      const tripu = Object.entries(e.jugadores ?? {}).filter(([, j]) => j.conectado && j.rol);
      const listos = tripu.filter(([id]) => e.briefing?.listos?.[id]).length;
      if (!e.briefing?.listos?.[c.id]) return r(g.listo, 'carpeta');
      return r(g.esperaListos(listos, tripu.length));
    }
    if (fase === 'diseno' || fase === 'restricciones') {
      const res = resumenSeguro(c);
      const nombreBarra = (b) => (T.bars?.[b] ?? b).toLowerCase();
      const unir = (l) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} ${TV.y} ${l[l.length - 1]}` : l[0] ?? '');
      if (fase === 'restricciones') {
        const k = res && c.motor?.cumple ? c.motor.cumple(res) : null;
        if (k?.barras?.length) return r(g.recorta(unir(k.barras.map(nombreBarra))), 'laptop');
        return r(g.revision, 'laptop');
      }
      const mias = Object.keys(c.e?.porRol?.[c.rol]?.piezas ?? {}).length;
      if (!mias) return r(g.piezas, 'laptop');
      if (!e.porRol?.vuelo?.cohete) return r(g.cohete, 'laptop');
      if (!e.porRol?.vuelo?.ruta) return r(g.ruta, 'control');
      const k = res && c.motor?.cumple ? c.motor.cumple(res) : null;
      if (k?.nivel === 'fuera') return r(g.exceso(unir(k.barras.map(nombreBarra))), 'laptop');
      return r(g.revision, 'laptop');
    }
    if (fase === 'verificacion') {
      let v = null;
      try { v = c.motor?.verificar && c.mision ? c.motor.verificar(c.e, c.D) : null; } catch { v = null; }
      if (v && !v.pasa) return r(g.fallaCheck, 'control');
      const faltan = ROLES_IDS.filter((x) => !e.firmas?.[x]);
      if (!faltan.length) return r(g.lanzar, 'control');
      if (!e.firmas?.[c.rol]) return r(g.gonogo, 'control');
      return r(g.esperaGo(faltan.map(nombreRol).join(', ')), 'control');
    }
    if (fase === 'mision') return r(g.mision, 'control');
    if (fase === 'informe') return r(g.informe, 'control');
  } catch (err) { console.warn('guía', err); }
  return r('');
}

// Fases como puntos (hecho / actual / pendiente) con el nombre de la actual. Se usa en el portátil, la sala de control y el HUD.
export function pasosFase(guia) {
  if (!guia) return null;
  const pasos = h('div', { class: 'g-pasos', title: FASES_JUEGO.map((f) => T.phases[f]).join(' › ') },
    h('ol', { 'aria-label': guia.nombre }, FASES_JUEGO.map((f, k) => h('li', { class: k === guia.i ? 'actual' : k < guia.i ? 'hecho' : '', ...(k === guia.i ? { 'aria-current': 'step' } : {}) }))),
    h('span', { class: 'g-fase' }, `${guia.i + 1}/${guia.total} · ${guia.nombre}`));
  let reloj = null;
  try { reloj = cReloj ? relojMision(cReloj) : null; } catch (err) { console.warn('reloj', err); }
  let desistir = null;
  try { desistir = cReloj ? botonDesistir(cReloj) : null; } catch (err) { console.warn('desistir', err); }
  return reloj || desistir ? h('div', { class: 'g-bloque' }, pasos, reloj, desistir) : pasos; // .g-bloque es display: contents
}
let cReloj = null; // contexto de la pantalla que se está pintando (lo fija dibujar)
// Línea "Siguiente: …" que va dentro de cada pantalla.
export function lineaGuia(guia, extra = '') {
  if (!guia?.texto) return null;
  return h('p', { class: 'g-linea ' + extra, role: 'status' }, h('b', {}, TV.siguiente, ' ›'), ' ', guia.texto);
}
export const textosVista = TV;

async function cargarModulos(simulado) {
  if (simulado) {
    const s = await import('./_simulado.js');
    return { motor: { resumen: s.resumen, cumple: s.cumple, verificar: s.verificar, num: s.num }, D: s.DATOS };
  }
  const [motor, datos] = await Promise.all([import('../reglas/motor.js'), import('../datos/index.js')]);
  return { motor: { resumen: motor.resumen, cumple: motor.cumple, verificar: motor.verificar, num: motor.num, estadoDeRatio: motor.estadoDeRatio, relojDe: motor.relojDe }, D: datos.DATOS };
}

let appManual = null;
import('../laptop/manual.js').then((m) => { appManual = m.appManual ?? null; }).catch((err) => console.warn('manual no disponible', err?.message ?? err));

export function crearPantallas({ raiz, franja, modal, capa, simulado = false }) {
  const c = {
    e: null, rol: null, id: null, nick: '', motor: null, D: null, mision: null, vista: 'sala',
    ui: { tab: 'taller', rolActivo: null, op: {}, cohete: null, app: null, overlay: null },
    enviar: (tipo, payload) => { limpiarAviso(); efectoAccion(tipo); ultimo?.intentar?.(tipo, payload ?? {}); },
    repintar: () => dibujar(true),
    irA: (v) => ultimo?.irA?.(v),
  };
  let ultimo = null, errorCarga = null, firma = '', avisoTxt = '', avisoTimer = null;
  let arrastrando = false, faseVista = null;
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
    const el = franja.querySelector('.f-aviso'); if (el) { el.textContent = avisoTxt; el.classList.toggle('vacio', !avisoTxt); }
    clearTimeout(avisoTimer);
    if (avisoTxt) avisoTimer = setTimeout(() => avisar(''), 8000);
  }

  // Ya no hay franja superior. Quedan: el aviso (abajo al centro, solo cuando hay algo que decir) y,
  // mirando la sala, una tarjeta pequeña abajo a la izquierda con la fase, el siguiente paso y los atajos.
  // Dentro del portátil y de la sala de control esa misma guía va en su propia barra (laptop.js, control/index.js).
  function pintarFranja() {
    const vista = ultimo?.vista ?? 'sala';
    const nodos = [h('p', { class: 'f-aviso' + (avisoTxt ? '' : ' vacio'), role: 'status', 'aria-live': 'polite' }, avisoTxt)];
    if (vista === 'sala') {
      const boton = (v, icono, txt, destino = v) => h('button', { class: 'boton ancho f-vista' + (c.guia?.objetivo === v ? ' primario guia' : ''), type: 'button', onclick: () => c.irA(destino) }, h('span', { 'aria-hidden': 'true' }, icono), txt);
      // En la sala de control: la pantalla central (interfaz de la fase), el portátil (en el briefing) y la puerta al briefing.
      const enControl = ultimo?.lugar === 'control';
      nodos.push(h('aside', { class: 'f-hud' },
        pasosFase(c.guia),
        lineaGuia(c.guia),
        h('div', { class: 'f-vistas' },
          boton('laptop', '💻', TV.laptop),
          enControl ? boton('control', '🛰', TV.pared) : boton('control', '🛰', TV.control),
          enControl ? boton('briefing', '🚪', TV.briefing) : null),
        h('div', { class: 'f-pie' },
          h('span', {}, ultimo?.nick ?? '', ' · ', c.rol ? nombreRol(c.rol) : T.noRole, ' · ', ultimo?.enLinea ?? ''),
          h('button', { class: 'boton f-salir', type: 'button', onclick: () => ultimo?.volverAlLobby?.() }, TV.lobby))));
    }
    franja.replaceChildren(...nodos);
  }

  // ---- paso de los meses: pulso en el reloj y aviso; más fuerte al pasar el plazo o el mes de lanzamiento elegido ----
  let mesVisto = null;
  function revisarMes(e) {
    if (e.fase === 'lobby' || !e.reloj) { mesVisto = null; return; }
    const mes = Math.max(0, Math.floor(Number(e.reloj.mes) || 0));
    if (mesVisto == null || mes < mesVisto) { mesVisto = mes; return; }
    if (mes === mesVisto) return;
    mesVisto = mes;
    const d = datosReloj(c);
    if (!d || !['diseno', 'restricciones', 'verificacion', 'mision'].includes(e.fase)) return;
    const t = textosReloj(), f = fechaTxt(d.abs);
    marcarTick();
    if (d.plazo != null && d.left === -1) toastReloj(t.alPlazo(f, Math.round(d.recorte * 100)), 'mal');
    else if (d.lanzTarde && d.lanz === mes - 1) toastReloj(t.alLanz(fechaTxt(d.inicio + d.lanz)), 'mal');
    else toastReloj(t.tictac(f), d.nivel);
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
    if (esEventoInversor(id)) {
      const inv = inversorDe(id), bueno = ev.signo === '+';
      const razones = [en(ev.texto), TI.dinero(bueno ? 1 : -1) + (cambios.length ? ` (${cambios.join(' · ')})` : ''),
        ef.meses ? TI.meses(ef.meses) : null].filter(Boolean);
      modal.append(h('div', { class: 'tarjeta-inversor ' + (bueno ? 'bueno' : 'malo'), role: 'dialog', 'aria-modal': 'true' },
        // Los retratos se generaron con IA: las reglas de Space Apps piden una marca visible en la imagen.
        h('figure', { class: 'inv-marco' },
          h('img', { class: 'inv-foto', src: inv.foto, alt: `${inv.nombre} (${TI.ia})` }),
          h('figcaption', { class: 'inv-ia' }, TI.ia)),
        h('div', { class: 'inv-cuerpo' },
          h('small', {}, T.designEvent, cola.length > 1 ? ` (+${cola.length - 1})` : ''),
          h('h3', {}, titular(id, ev.signo, inv.nombre)),
          h('p', { class: 'inv-porque' }, TI.porque + ':'),
          h('ul', {}, ...razones.map((r) => h('li', {}, r))),
          h('button', { class: 'inv-aceptar', type: 'button', onclick: () => { cola.shift(); dibujarModal(); } }, '▶ ' + TI.aceptar))));
      return;
    }
    modal.append(h('div', { class: 'tarjeta-evento', role: 'dialog', 'aria-modal': 'true' },
      h('small', { class: 'tenue' }, T.designEvent, cola.length > 1 ? ` (+${cola.length - 1})` : ''),
      h('h3', {}, h('span', { class: 'signo s' + (ev.signo === '+' ? 'p' : ev.signo === '-' ? 'n' : 'x') }, ev.signo ?? '?'), ' ', en(ev.nombre) || id),
      en(ev.texto) ? h('p', {}, en(ev.texto)) : null,
      cambios.length ? h('p', {}, h('b', {}, T.changed + ': '), cambios.join(' · ')) : null,
      en(ev.casoReal) ? h('p', { class: 'caso' }, h('b', {}, T.realCase + ': '), en(ev.casoReal)) : null,
      h('div', { class: 'acciones' }, h('button', { class: 'boton primario', type: 'button', onclick: () => { cola.shift(); dibujarModal(); } }, T.close))));
  }

  // ---- capa: HUD del expediente + modales de expediente y manual ----
  function abrir(o) { c.ui.overlay = o; dibujar(true); }
  function cerrarOverlay() { c.ui.overlay = null; dibujar(true); }
  function construirCapa(fase) {
    const nodos = [];
    // La ficha del expediente solo se ve mirando la sala: en el portátil ya es una app y en la pared no hace falta.
    if (c.D && c.mision && c.vista === 'sala') nodos.push(expedienteMini(c, (id) => abrir({ tipo: 'expediente', id })));
    try { nodos.push(...capaDesistir(c, cerrarOverlay)); } catch (err) { console.warn('desistir', err); }
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

    // Al cambiar de fase se cierran expediente y manual. Se guarda la fase aparte: el estado puede llegar mutado en el mismo objeto.
    if (faseVista && faseVista !== e.fase) c.ui.overlay = null;
    faseVista = e.fase;
    c.e = e; c.rol = p.rol; c.id = p.jugadorId; c.nick = p.nick; c.vista = vista;
    c.mision = c.D?.MISIONES?.[e.mision?.id] ?? null;
    c.guia = c.D && c.motor ? calcularGuia(c, e.fase) : null;
    cReloj = c;
    revisarEventos();
    revisarMes(e);

    const nueva = JSON.stringify([e, p.rol, p.enLinea, !!c.D, errorCarga, c.ui, vista, conPantalla, p.lugar]);
    if (!forzar && nueva === firma) return;
    if (arrastrando) return;
    firma = nueva;

    pintarFranja();
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
    get guia() { return c.guia ?? null; },
    contexto: c,
  };
}
export { tx };
