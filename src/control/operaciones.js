// Sala de control · consola de operaciones (fase de misión): secuencia de misión, vista orbital, ventana de mensajes y
// telemetría (pared del concepto "Misión"). La trayectoria la calcula src/control/propagador.js (RK4 de dos cuerpos).
// Las reglas del vuelo (pasos, eventos, contingencias) son las del anfitrión: aquí solo se muestran y se envían
// 'activarContingencia' y 'avanzar'.
import { h, lista, redondear, puedoPor, resumenSeguro } from '../pantallas/ui.js';
import { textos, tx, depto, idioma } from '../i18n.js';
import { unaVez } from '../pantallas/panel-global.js';
import { trayectoria } from './propagador.js';
import { paleta, conAlfa } from './paleta.js';
import { lanzamiento, lanzamientoFallido } from '../laptop/camara-lanzamiento.js';

const T = textos({
  es: {
    titulo: 'OPERACIONES', secuencia: 'SECUENCIA DE MISIÓN', vista: 'VISTA ORBITAL', mensajes: 'VENTANA DE MENSAJES', energia: 'ENERGÍA', comms: 'COMUNICACIONES',
    orientacion: 'ORIENTACIÓN', datos: 'DATOS RECIBIDOS', estado: 'ESTADO', enlace: 'ENLACE', estable: 'ESTABLE', degradado: 'DEGRADADO', perdido: 'PERDIDO',
    siguiente: 'SIGUIENTE PASO ▶', informe: 'VER INFORME ▶', alerta: '⚠ EVENTO EN CURSO', activar: 'ACTIVAR', activada: 'CONTINGENCIA ACTIVADA',
    responsable: 'Responsable', esperaDepto: (d) => `Esperando a ${d}. Solo ese departamento puede activarla.`, sinEvento: 'Sin eventos en este paso.',
    bueno: 'Buenas noticias', noMitigado: 'Sin contingencia que lo cubra: el equipo no compró la adecuada.', mitigado: 'Cubierto por el plan de contingencia.',
    pendiente: 'pendiente', ok: 'OK', falla: 'FALLO', omitida: 'no llegó', rover: 'ROVER', roverTxt: 'Ninguna misión actual lleva rover. El control queda listo por si alguna lo lleva.',
    paso: 'Paso', sinResultado: 'Esperando el lanzamiento…', fase: 'FASE', exito: 'prob.', sol: 'Sol', tierra: 'Tierra',
    nota: 'Propagador RK4 de dos cuerpos para el juego, con interfaz estilo GMAT (NASA). Órbitas aproximadas.',
  },
  en: {
    titulo: 'OPERATIONS', secuencia: 'MISSION SEQUENCE', vista: 'ORBIT VIEW', mensajes: 'MESSAGE WINDOW', energia: 'POWER', comms: 'COMMUNICATIONS',
    orientacion: 'ATTITUDE', datos: 'DATA RECEIVED', estado: 'STATUS', enlace: 'LINK', estable: 'STABLE', degradado: 'DEGRADED', perdido: 'LOST',
    siguiente: 'NEXT STEP ▶', informe: 'VIEW REPORT ▶', alerta: '⚠ EVENT IN PROGRESS', activar: 'ACTIVATE', activada: 'CONTINGENCY ACTIVATED',
    responsable: 'Owner', esperaDepto: (d) => `Waiting for ${d}. Only that department can activate it.`, sinEvento: 'No events in this step.',
    bueno: 'Good news', noMitigado: 'No contingency covers it: the team did not buy the right one.', mitigado: 'Covered by the contingency plan.',
    pendiente: 'pending', ok: 'OK', falla: 'FAIL', omitida: 'not reached', rover: 'ROVER', roverTxt: 'No current mission has a rover. The control is ready if one does.',
    paso: 'Step', sinResultado: 'Waiting for launch…', fase: 'PHASE', exito: 'prob.', sol: 'Sun', tierra: 'Earth',
    nota: 'Two-body RK4 propagator for the game, with a GMAT-style (NASA) interface. Approximate orbits.',
  },
});

// ---------- Vista orbital (canvas de módulo, se re-anexa en cada repintado) ----------
let V = null;
function vistaOrbital() {
  if (!V) {
    const canvas = document.createElement('canvas');
    canvas.className = 'op-canvas';
    V = { canvas, g: canvas.getContext('2d'), tray: null, clave: '', frac: 0, objetivo: 0, orbitando: false, corriendo: false, t: 0, nombreDestino: '' };
  }
  return V;
}
function bucle(t) {
  if (!V || !V.canvas.isConnected) { if (V) V.corriendo = false; return; }
  requestAnimationFrame(bucle);
  V.t = t / 1000;
  V.frac += (V.objetivo - V.frac) * 0.03;
  dibujarOrbita();
}
// Colocador de etiquetas sin solapes: cada etiqueta prueba varias anclas y desplazamientos alrededor; la primera posición libre gana
// (con línea guía si queda lejos del ancla). Si no cabe en ningún sitio, la de menor prioridad se omite.
function colocador(g, w, hh, pal) {
  const ocupados = [], pend = [];
  const choca = (a) => ocupados.some((b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
  return {
    reservar(x, y, ww, alto) { ocupados.push({ x, y, w: ww, h: alto }); },
    poner(txt, anclas, color, prio) { pend.push({ txt, anclas, color, prio }); },
    dibujar() {
      pend.sort((a, b) => b.prio - a.prio);
      for (const e of pend) {
        const tw = g.measureText(e.txt).width + 4, th = 16;
        const cand = [[8, -8 - th], [8, 8], [-8 - tw, -8 - th], [-8 - tw, 8], [-tw / 2, -12 - th], [-tw / 2, 12], [22, -22 - th], [-22 - tw, 22], [22, 22], [-22 - tw, -22 - th]];
        let hecho = false;
        for (const [ax, ay] of e.anclas) {
          for (let i = 0; i < cand.length && !hecho; i++) {
            const r = { x: ax + cand[i][0], y: ay + cand[i][1], w: tw, h: th };
            if (r.x < 3 || r.y < 3 || r.x + r.w > w - 3 || r.y + r.h > hh - 3 || choca(r)) continue;
            if (i >= 6) {   // lejos del ancla: línea guía hasta el borde más cercano de la caja
              g.strokeStyle = e.color; g.globalAlpha = 0.5; g.lineWidth = 1; g.beginPath(); g.moveTo(ax, ay);
              g.lineTo(Math.max(r.x, Math.min(ax, r.x + r.w)), Math.max(r.y, Math.min(ay, r.y + r.h))); g.stroke(); g.globalAlpha = 1;
            }
            g.fillStyle = conAlfa(pal.hundido, 0.8); g.fillRect(r.x, r.y, r.w, r.h);
            g.fillStyle = e.color; g.fillText(e.txt, r.x + 2, r.y + th - 4);
            ocupados.push(r); hecho = true;
          }
          if (hecho) break;
        }
      }
    },
  };
}
function dibujarOrbita() {
  const { canvas, g, tray } = V;
  const w = canvas.clientWidth, hh = canvas.clientHeight;
  if (!w || !hh) return;
  if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; }
  const P0 = paleta(canvas);
  g.fillStyle = P0.hundido; g.fillRect(0, 0, w, hh);
  g.strokeStyle = conAlfa(P0.borde, 0.35); g.lineWidth = 1;
  for (let x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, hh); g.stroke(); }
  for (let y = 0; y < hh; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  if (!tray) return;
  const k = Math.min(w, hh) / 2 / tray.escala, cx = w / 2, cy = hh / 2;
  const P = ([x, y]) => [cx + x * k, cy - y * k];
  const linea = (pts, color, ancho = 1.2, discontinua = false) => {
    g.strokeStyle = color; g.lineWidth = ancho; g.setLineDash(discontinua ? [4, 4] : []);
    g.beginPath(); pts.forEach((p, i) => { const [x, y] = P(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.setLineDash([]);
  };
  // Cuerpo central
  g.fillStyle = tray.central === 'sol' ? P0['ambar-claro'] : P0.cian;
  g.beginPath(); g.arc(cx, cy, tray.central === 'sol' ? 7 : 9, 0, Math.PI * 2); g.fill();
  g.font = '14px monospace';
  const etq = colocador(g, w, hh, P0);
  // Zonas que ninguna etiqueta debe tapar: ejes (esquinas) y el cuerpo central
  const ejeX = `${tray.unidad === 'UA' ? 'X (UA)' : 'X (km)'} →`;
  const wEje = g.measureText(ejeX).width;
  etq.reservar(w - wEje - 10, hh - 22, wEje + 6, 18); etq.reservar(2, 2, 36, 18);
  etq.reservar(cx - 10, cy - 10, 20, 20);
  const iDestino = tray.central === 'sol' ? 1 : 0;
  tray.orbitas.forEach((o) => linea(o.puntos, o.color, 1, true));
  // Etiquetas por prioridad (se colocan de mayor a menor): cuerpo central, destino, y las demás órbitas probando varios puntos de su trazo
  etq.poner(tray.central === 'sol' ? T.sol : T.tierra, [[cx, cy]], P0['tinta-2'], 11);
  const [dx, dy] = P(tray.llegada);
  etq.poner(tx(tray.orbitas[iDestino].nombre), [[dx, dy]], tray.orbitas[iDestino].color, 8);
  tray.orbitas.forEach((o, i) => {
    if (i === iDestino) return;
    etq.poner(tx(o.nombre), [0.12, 0.3, 0.5, 0.7, 0.88].map((f) => P(o.puntos[Math.floor((o.puntos.length - 1) * f)])), o.color, 3);
  });
  // Transferencia: recorrida (brillante) y por recorrer (tenue)
  const n = tray.transferencia.length;
  const hecho = Math.max(1, Math.floor(Math.min(1, V.frac) * (n - 1)));
  linea(tray.transferencia, conAlfa(P0.ok, 0.3), 1);
  linea(tray.transferencia.slice(0, hecho + 1), P0.ok, 2);
  // Destino en su punto de llegada
  g.fillStyle = P0.tinta; g.beginPath(); g.arc(dx, dy, 5, 0, Math.PI * 2); g.fill();
  // Nave
  let pos = tray.transferencia[hecho];
  if (V.orbitando) {
    const a = V.t * 1.6, r = 14 / k;
    pos = [tray.llegada[0] + Math.cos(a) * r, tray.llegada[1] + Math.sin(a) * r * 0.6];
    g.strokeStyle = conAlfa(P0.ambar, 0.6); g.beginPath(); g.ellipse(dx, dy, 14, 8.4, 0, 0, Math.PI * 2); g.stroke();
  }
  const [sx, sy] = P(pos);
  g.fillStyle = P0.ambar; g.fillRect(sx - 3, sy - 3, 6, 6);
  g.strokeStyle = P0.ambar; g.beginPath(); g.moveTo(sx - 9, sy); g.lineTo(sx + 9, sy); g.stroke();
  // Ejes
  etq.dibujar();
  g.fillStyle = P0.tenue; g.fillText(ejeX, w - wEje - 6, hh - 8);
  g.fillText(`↑ Y`, 6, 14);
}

// ---------- Utilidades ----------
const pct = (x) => `${redondear((x ?? 0) * 100, 0)} %`;
function eventoDe(c, ev) {
  if (!ev) return null;
  const id = typeof ev === 'string' ? ev : ev.id;
  return { id, ...(c.D?.EVENTOS_MISION?.[id] ?? {}), ...(typeof ev === 'object' ? ev : {}) };
}
function barrasLed(n, total, clase = '') {
  return h('div', { class: 'op-led ' + clase }, Array.from({ length: total }, (_, i) => h('i', { class: i < n ? 'on' : '' })));
}

// ---------- Fallo de lanzamiento → informe: se avanza paso a paso hasta el último (el anfitrión solo avanza de uno en uno) ----------
let haciaInforme = false, ultimoEnviado = -1;
function empujarInforme(c) {
  const paso = c.e?.vista?.paso ?? 0;
  if (c.e?.fase !== 'mision' || ultimoEnviado === paso) return;
  ultimoEnviado = paso;
  c.enviar('avanzar', { paso });
}
export { lanzamientoFallido };

// ---------- Pantalla ----------
export function pantallaOperaciones(c) {
  const r = c.e?.resultado;
  const res = resumenSeguro(c);
  if (!r || !Array.isArray(r.pasos)) return h('div', { class: 'mc-vacio' }, h('p', {}, T.sinResultado));
  const paso = Number.isFinite(c.e?.vista?.paso) ? c.e.vista.paso : 0;
  const total = r.pasos.length;
  // ---- despegue: lo ven todos antes de la simulación. Si el lanzamiento falla, la misión termina aquí (nada de órbitas) ----
  if (c.e.fase === 'mision') {
    const falla = lanzamientoFallido(r);
    const nombre0 = tx(lista(c.mision?.fases).find((f) => f.id === r.pasos[0]?.fase)?.nombre) || '';
    const clave = `${c.mision?.id}|${JSON.stringify(r.pasos.map((p) => [p.fase, p.ok, p.p]))}`;
    const seq = lanzamiento(c, {
      clave, falla, reproducir: paso === 0, coheteId: c.e?.porRol?.vuelo?.cohete,
      fase: { nombre: nombre0, p: r.pasos[0]?.p },
      onInforme: () => { haciaInforme = true; ultimoEnviado = -1; empujarInforme(c); },
    });
    if (seq) {
      if (falla && haciaInforme && paso < total - 1) setTimeout(() => empujarInforme(c), 60);
      return h('div', { class: 'lz-host' }, seq);
    }
  }
  haciaInforme = false;
  const final = c.e.fase === 'informe' || paso >= total - 1;
  const actual = r.pasos[paso] ?? {};
  const fasesM = lista(c.mision?.fases);
  const nombreFase = (id) => tx(fasesM.find((f) => f.id === id)?.nombre) || id;

  // Trayectoria (se recalcula si cambia la misión o el día)
  const plan = res?.plan;
  const ov = vistaOrbital();
  const mesLz = plan?.mes ?? plan?.dia ?? null;
  const clave = `${c.mision?.id}|${mesLz}|${idioma()}`;
  if (ov.clave !== clave) {
    ov.tray = trayectoria(c.mision?.destino, { dia: mesLz, optimo: 0, factor: plan?.factor ?? 1 });
    ov.clave = clave; ov.frac = 0;
  }
  const perdido = r.pasos.some((p) => p.omitida);
  ov.objetivo = total > 1 ? Math.min(1, paso / Math.max(1, total - 2)) : 1;
  ov.orbitando = !perdido && paso >= total - 2;
  if (!ov.corriendo) { ov.corriendo = true; requestAnimationFrame(bucle); }

  // ---- izquierda: secuencia de misión ----
  const secuencia = h('ol', { class: 'op-secuencia' }, r.pasos.map((p, i) => {
    const estado = i > paso ? 'pendiente' : p.omitida ? 'omitida' : p.ok ? 'ok' : 'falla';
    const icono = { pendiente: '⧗', omitida: '—', ok: '✔', falla: '✖' }[estado];
    return h('li', { class: `${estado}${i === paso ? ' actual' : ''}` }, h('span', { class: 'op-ico' }, icono), h('span', {}, nombreFase(p.fase)), h('em', { title: T.exito, class: 'op-num' }, i > paso ? '' : pct(p.p)));
  }));
  const izq = h('section', { class: 'mc-panel op-izq' }, h('h3', {}, T.secuencia), secuencia);

  // ---- centro: vista orbital + mensajes ----
  const log = [];
  r.pasos.slice(0, paso + 1).forEach((p, i) => {
    log.push({ c: '', t: `[${String(i + 1).padStart(2, '0')}] Propagate → ${nombreFase(p.fase)} · p=${pct(p.p)} · ${p.omitida ? T.omitida : p.ok ? T.ok : T.falla}` });
    const ev = eventoDe(c, p.evento);
    if (ev) {
      log.push({ c: ev.signo === '+' ? 'ok' : 'mal', t: `     ${ev.signo ?? ''} ${tx(ev.nombre) || ev.id}` });
      if (p.mitigador) {
        const act = lista(c.e?.vista?.activadas).includes(p.mitigador);
        log.push({ c: act ? 'ok' : 'aviso', t: `     ↳ ${tx(c.D?.CONTINGENCIAS?.[p.mitigador]?.nombre) || p.mitigador}: ${act ? T.activada : T.pendiente}` });
      }
    }
  });
  const centro = h('section', { class: 'mc-panel op-centro' },
    h('h3', {}, T.vista, h('small', {}, ' · ', T.fase, ' ', paso + 1, '/', total, ': ', nombreFase(actual.fase))),
    h('div', { class: 'op-vista', title: T.nota }, ov.canvas),
    h('h3', {}, T.mensajes),
    h('pre', { class: 'op-log', 'data-scroll': 'op-log' }, log.map((l) => h('span', { class: l.c }, l.t + '\n'))));
  requestAnimationFrame(() => { const el = document.querySelector('.op-log'); if (el) el.scrollTop = el.scrollHeight; });

  // ---- derecha: telemetría, alerta de contingencia, rover y avance ----
  const reveladas = r.pasos.slice(0, paso + 1);
  const fallos = reveladas.filter((p) => !p.ok).length;
  const pot = res?.barras?.potencia, dat = res?.barras?.datos;
  const energia = pot?.limite > 0 ? Math.max(0, Math.min(1, 1 - Math.max(0, pot.usado - pot.limite) / pot.limite)) * (1 - 0.15 * fallos) : 0.3;
  const enlace = dat?.limite > 0 ? Math.min(1, dat.limite / Math.max(1e-6, dat.usado || dat.limite)) * (perdido ? 0 : 1) : 0.2;
  const recibidos = (Number(r.datos?.bajadosMB) || 0) * ((paso + 1) / total);
  const estadoEnlace = perdido ? T.perdido : fallos ? T.degradado : T.estable;

  const ev = eventoDe(c, actual.evento);
  let alerta = null;
  if (ev && !final) {
    const ct = actual.mitigador;
    const k = ct ? c.D?.CONTINGENCIAS?.[ct] : null;
    const rolCt = k?.rol ?? 'comms';
    const activada = ct && lista(c.e?.vista?.activadas).includes(ct);
    const puedo = ct && puedoPor(c, rolCt);
    alerta = h('div', { class: 'op-alerta ' + (ev.signo === '+' ? 'buena' : activada ? 'resuelta' : ct ? 'roja' : 'gris') },
      h('b', {}, ev.signo === '+' ? `★ ${T.bueno}` : T.alerta),
      h('p', { class: 'op-ev' }, tx(ev.nombre) || ev.id), tx(ev.texto) ? h('p', {}, tx(ev.texto)) : null,
      ct ? [h('p', {}, h('b', {}, tx(k?.nombre) || ct), ` · ${T.responsable}: `, h('span', { style: `color:var(--lp-rol-${rolCt})` }, depto(rolCt))),
        activada ? h('p', { class: 'ok' }, '✔ ', T.activada)
          : h('button', { class: 'boton peligro grande ancho op-latido', type: 'button', disabled: !puedo, onclick: () => c.enviar('activarContingencia', { id: ct }) }, T.activar),
        !activada && !puedo ? h('small', {}, T.esperaDepto(depto(rolCt))) : null]
        : ev.signo === '+' ? null : h('p', { class: 'tenue' }, actual.mitigado ? T.mitigado : T.noMitigado));
  }
  const pendiente = actual.mitigador && !lista(c.e?.vista?.activadas).includes(actual.mitigador);
  const tele = (titulo, ...cuerpo) => h('div', { class: 'op-tele' }, h('h4', {}, titulo), ...cuerpo);
  const der = h('section', { class: 'mc-panel op-der' },
    alerta,
    h('div', { class: 'op-teles' },
      tele(T.energia, barrasLed(Math.round(energia * 8), 8, energia < 0.5 ? 'aviso' : '')),
      tele(T.comms, h('div', { class: 'op-senal' }, [1, 2, 3, 4, 5].map((i) => h('i', { class: i <= Math.round(enlace * 5) ? 'on' : '', style: `height:${i * 20}%` })))),
      tele(T.orientacion, h('p', { class: fallos ? 'aviso' : 'ok' }, fallos ? T.degradado : T.estable)),
      tele(T.enlace, h('p', { class: perdido ? 'mal' : fallos ? 'aviso' : 'ok' }, estadoEnlace)),
      tele(T.datos, barrasLed(Math.round(((paso + 1) / total) * 12), 12), h('span', { class: 'op-mb op-num' }, `${String(redondear(recibidos, 0)).padStart(5, ' ')} MB`))),
    alerta ? null : h('p', { class: 'mc-nota tenue' }, T.sinEvento),
    h('details', { class: 'op-rover' }, h('summary', {}, T.rover), h('p', {}, T.roverTxt),
      h('div', { class: 'op-dpad' }, ['▲', '◀', '■', '▶', '▼'].map((x) => h('button', { class: 'boton op-flecha', type: 'button', disabled: true }, x)))),
    c.e.fase === 'mision' ? h('button', {
      class: 'boton primario grande ancho op-avanzar', type: 'button', disabled: !!pendiente,
      onclick: () => { if (unaVez('paso', 700)) c.enviar('avanzar', { paso }); },
    }, final ? T.informe : T.siguiente) : null);

  return h('div', { class: 'op' }, izq, centro, der);
}
