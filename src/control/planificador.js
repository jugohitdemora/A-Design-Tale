// Sala de control · planificación de ruta (fases de diseño): ruta, ventana de lanzamiento y sitio/órbita sobre mapas
// con capas de datos satelitales. Vuelo y Mecánica elige ruta y día; el sitio lo eligen Vuelo y Mecánica o Ciencia.
// Estado local: c.ui.plan = { capas: [ids activas], foco: id de capa de la leyenda, verSitio: id }.
import { h, lista, valor, redondear, puedoPor, resumenSeguro, nombreRol } from '../pantallas/ui.js';
import { textos, tx, depto } from '../i18n.js';
import { lienzoCapa, valorEn, color } from './capas.js';

const T = textos({
  es: {
    titulo: 'PLANIFICACIÓN DE RUTA', ruta: 'RUTA', ventana: 'VENTANA DE LANZAMIENTO', mapa: 'SITIO / ÓRBITA', efectos: 'EFECTOS EN EL DISEÑO',
    dias: 'días', dia: (d, n) => `Día ${d} de ${n}`, sinDia: 'Sin día elegido', dv: 'ΔV necesario', optimo: 'ÓPTIMO', extra: 'Propelente extra',
    bono: (p) => `Día óptimo: +${p} % de éxito en la fase`, fuera: 'Fuera del óptimo: más ΔV, más propelente.',
    elegirDia: 'Fijar este día', soloVuelo: `Solo ${depto('vuelo')} puede elegir la ruta y el día.`,
    soloSitio: `Solo ${depto('vuelo')} o ${depto('ciencia')} pueden elegir el sitio.`,
    capas: 'CAPAS DE DATOS', real: 'dato real', juego: '≈ juego', calculada: 'calculada', elegir: 'ELEGIR ESTE SITIO', elegido: 'ELEGIDO',
    sinSitio: 'Pasa el ratón por el mapa para leer las capas. Haz clic en un sitio u órbita para ver su ficha.',
    fasesTit: 'Probabilidad por fase', ciencia: 'Cobertura de objetivos', masa: 'Masa', sombra: 'Horas de sombra por ciclo',
    sinRuta: 'Elige primero una ruta: el día de lanzamiento cambia su propelente.', propelente: 'Propelente', precio: 'Precio',
    efecto: 'Efecto', sinEfectos: 'Sin efectos especiales.', factor: (f) => `× ${f}`, fuente: 'Fuente',
    noPlan: 'Esta misión no tiene planificación de ruta.', bajo: 'bajo', alto: 'alto', leyenda: 'Leyenda',
    inc: (i) => `inclinación ${i}°`, quien: 'Decide', ok: 'Listo para verificación', falta: 'Falta: día y sitio',
  },
  en: {
    titulo: 'ROUTE PLANNING', ruta: 'ROUTE', ventana: 'LAUNCH WINDOW', mapa: 'SITE / ORBIT', efectos: 'EFFECTS ON THE DESIGN',
    dias: 'days', dia: (d, n) => `Day ${d} of ${n}`, sinDia: 'No day chosen', dv: 'Required ΔV', optimo: 'OPTIMUM', extra: 'Extra propellant',
    bono: (p) => `Optimum day: +${p} % success in that phase`, fuera: 'Off the optimum: more ΔV, more propellant.',
    elegirDia: 'Set this day', soloVuelo: `Only ${depto('vuelo')} can choose the route and day.`,
    soloSitio: `Only ${depto('vuelo')} or ${depto('ciencia')} can choose the site.`,
    capas: 'DATA LAYERS', real: 'real data', juego: '≈ game', calculada: 'computed', elegir: 'CHOOSE THIS SITE', elegido: 'CHOSEN',
    sinSitio: 'Hover the map to read the layers. Click a site or orbit to see its sheet.',
    fasesTit: 'Probability per phase', ciencia: 'Goal coverage', masa: 'Mass', sombra: 'Shadow hours per cycle',
    sinRuta: 'Choose a route first: the launch day changes its propellant.', propelente: 'Propellant', precio: 'Price',
    efecto: 'Effect', sinEfectos: 'No special effects.', factor: (f) => `× ${f}`, fuente: 'Source',
    noPlan: 'This mission has no route planning.', bajo: 'low', alto: 'high', leyenda: 'Legend',
    inc: (i) => `inclination ${i}°`, quien: 'Decides', ok: 'Ready for verification', falta: 'Missing: day and site',
  },
});

const ruta = (archivo) => archivo;
const pct = (x) => `${redondear((x ?? 0) * 100, 0)} %`;

// ---------- Ventana de lanzamiento: curva ΔV(día) ----------
function curvaVentana(c, P, dia, puedo) {
  const V = P.ventana, W = 380, H = 170, m = { l: 34, r: 8, t: 10, b: 22 };
  const f = (d) => c.motor.factorVentana ? c.motor.factorVentana(V, d) : 1;
  const maxF = V.maxFactor ?? 1.6;
  const X = (d) => m.l + (d / V.dias) * (W - m.l - m.r);
  const Y = (k) => m.t + (1 - (k - 1) / (maxF - 1)) * (H - m.t - m.b);
  let d = '';
  for (let i = 0; i <= V.dias; i++) d += `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(f(i)).toFixed(1)}`;
  const banda = 0.35 * V.anchura;
  const NS = 'http://www.w3.org/2000/svg';
  const s = (tag, a, ...hijos) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) el.setAttribute(k, v); hijos.forEach((x) => el.append(x)); return el; };
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pl-curva', role: 'img' });
  svg.append(s('rect', { x: X(V.optimo - banda), y: m.t, width: X(V.optimo + banda) - X(V.optimo - banda), height: H - m.t - m.b, class: 'pl-banda' }));
  for (let k = 0; k <= 4; k++) {
    const y = m.t + k * (H - m.t - m.b) / 4;
    svg.append(s('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, class: 'pl-rejilla' }));
    const val = (V.dvMin ?? 1) * (maxF - k * (maxF - 1) / 4);
    svg.append(s('text', { x: m.l - 4, y: y + 3, class: 'pl-eje', 'text-anchor': 'end' }, document.createTextNode(val.toFixed(1))));
  }
  for (let k = 0; k <= V.dias; k += Math.max(5, Math.round(V.dias / 6 / 5) * 5)) {
    svg.append(s('text', { x: X(k), y: H - 6, class: 'pl-eje', 'text-anchor': 'middle' }, document.createTextNode(String(k))));
  }
  svg.append(s('path', { d, class: 'pl-linea' }));
  svg.append(s('text', { x: X(V.optimo), y: m.t + 10, class: 'pl-opt', 'text-anchor': 'middle' }, document.createTextNode(T.optimo)));
  if (dia != null) {
    svg.append(s('line', { x1: X(dia), x2: X(dia), y1: m.t, y2: H - m.b, class: 'pl-dia' }));
    svg.append(s('circle', { cx: X(dia), cy: Y(f(dia)), r: 5, class: 'pl-punto' }));
  }
  if (puedo) {
    svg.classList.add('editable');
    svg.addEventListener('click', (ev) => {
      const r = svg.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width * W;
      const nuevo = Math.round(Math.min(V.dias, Math.max(0, (x - m.l) / (W - m.l - m.r) * V.dias)));
      c.enviar('planificarRuta', { ventana: nuevo });
    });
  }
  return svg;
}

function panelVentana(c, P, res) {
  const V = P.ventana;
  const dia = Number.isInteger(c.e?.ruta?.ventana) ? c.e.ruta.ventana : null;
  const puedo = puedoPor(c, 'vuelo');
  const f = dia == null ? null : c.motor.factorVentana(V, dia);
  const rng = h('input', {
    type: 'range', min: 0, max: V.dias, step: 1, value: dia ?? V.optimo, disabled: !puedo, 'aria-label': T.ventana,
    oninput: (ev) => { const l = ev.target.parentNode.querySelector('.pl-rng-val'); if (l) l.textContent = T.dia(ev.target.value, V.dias); },
    onchange: (ev) => c.enviar('planificarRuta', { ventana: Number(ev.target.value) }),
  });
  const tieneRuta = !!c.e?.porRol?.vuelo?.ruta;
  return h('section', { class: 'mc-panel' },
    h('h3', {}, T.ventana),
    curvaVentana(c, P, dia, puedo),
    h('div', { class: 'pl-rng' }, rng, h('span', { class: 'pl-rng-val' }, dia == null ? T.sinDia : T.dia(dia, V.dias))),
    h('dl', { class: 'mc-datos' },
      h('dt', {}, T.dv), h('dd', {}, f == null ? '-' : `${((V.dvMin ?? 1) * f).toFixed(2)} km/s (${T.factor(f.toFixed(2))})`),
      h('dt', {}, T.extra), h('dd', { class: (res?.plan?.extraKg ?? 0) > 1 ? 'mal' : 'ok' }, tieneRuta ? `${redondear(res?.plan?.extraKg ?? 0, 0)} kg` : '-')),
    !tieneRuta ? h('p', { class: 'mc-nota aviso' }, T.sinRuta) : null,
    res?.plan?.optimo ? h('p', { class: 'mc-nota ok' }, T.bono(2)) : dia != null ? h('p', { class: 'mc-nota' }, T.fuera) : null,
    h('p', { class: 'mc-nota tenue' }, tx(V.nota)),
    puedo ? null : h('p', { class: 'mc-nota tenue' }, T.soloVuelo));
}

function panelRutas(c) {
  const rutas = lista(c.mision?.rutas);
  const elegida = c.e?.porRol?.vuelo?.ruta;
  const puedo = puedoPor(c, 'vuelo');
  return h('section', { class: 'mc-panel' }, h('h3', {}, T.ruta),
    h('div', { class: 'pl-rutas' }, rutas.map((r) => {
      const fase = lista(c.mision.fases).find((f) => f.id === r.efecto?.fase);
      const es = r.id === elegida;
      return h('button', {
        class: 'pl-ruta' + (es ? ' elegida' : ''), type: 'button', disabled: !puedo || es,
        onclick: () => c.enviar('elegirRuta', { id: r.id }),
      }, h('b', {}, tx(r.nombre) || r.id),
      h('span', {}, valor(c, r.dias, T.dias), ' · ', T.propelente, ' ', valor(c, r.masa, 'kg'), ' · ', valor(c, r.precio, 'M USD')),
      r.efecto ? h('small', {}, `${tx(fase?.nombre) || r.efecto.fase}: ${r.efecto.dp > 0 ? '+' : ''}${Math.round(r.efecto.dp * 100)} %`) : null);
    })));
}

// ---------- Mapa ----------
const proyectar = (s, figura) => (figura ? { x: s.x, y: s.y } : { x: (s.lon + 180) / 360, y: (90 - s.lat) / 180 });

// Traza en tierra de una órbita de inclinación i (varias vueltas, desplazadas por la rotación del planeta).
function trazaOrbita(inc) {
  const tramos = [];
  for (let v = 0; v < 5; v++) {
    let tramo = [];
    let lonPrev = null;
    for (let k = 0; k <= 120; k++) {
      const u = (k / 120) * Math.PI * 2;
      const i = inc * Math.PI / 180;
      const lat = Math.asin(Math.sin(i) * Math.sin(u)) * 180 / Math.PI;
      let lon = Math.atan2(Math.cos(i) * Math.sin(u), Math.cos(u)) * 180 / Math.PI - 150 + v * 72;
      lon = ((lon + 180) % 360 + 360) % 360 - 180;
      if (lonPrev != null && Math.abs(lon - lonPrev) > 180) { tramos.push(tramo); tramo = []; }
      tramo.push([(lon + 180) / 360, (90 - lat) / 180]);
      lonPrev = lon;
    }
    tramos.push(tramo);
  }
  return tramos;
}

function mapa(c, P, u) {
  const MAPAS = c.D?.MAPAS ?? {};
  const base = MAPAS[P.mapa.base];
  const figura = P.mapa.proyeccion === 'figura';
  const elegido = c.e?.ruta?.sitio ?? null;
  const puedoSitio = puedoPor(c, 'vuelo') || puedoPor(c, 'ciencia');
  const escenario = h('div', { class: 'pl-mapa' + (figura ? ' figura' : ''), style: figura ? `aspect-ratio:${base?.ancho ?? 625}/${base?.alto ?? 450}` : 'aspect-ratio:2/1' });
  if (base) escenario.append(h('img', { src: ruta(base.archivo), alt: tx(base.nombre), draggable: 'false' }));
  for (const capa of lista(P.capas)) {
    if (!u.capas.includes(capa.id) || capa.id === 'color') continue;
    if (capa.real && MAPAS[capa.mapa]) escenario.append(h('img', { class: 'pl-capa', src: ruta(MAPAS[capa.mapa].archivo), alt: '', draggable: 'false' }));
    else if (capa.calculo) {
      const l = lienzoCapa(capa, { archivoBase: base?.archivo, proyeccion: P.mapa.proyeccion, rutaMapa: (id) => MAPAS[id]?.archivo });
      l.canvas.className = 'pl-capa';
      escenario.append(l.canvas);
    }
  }
  // Superposición SVG: sitios, trazas y retícula.
  const NS = 'http://www.w3.org/2000/svg';
  const s = (tag, a) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) el.setAttribute(k, v); return el; };
  const svg = s('svg', { viewBox: '0 0 1000 1000', preserveAspectRatio: 'none', class: 'pl-svg' });
  if (!figura) for (let k = 1; k < 6; k++) { svg.append(s('line', { x1: 0, x2: 1000, y1: k * 1000 / 6, y2: k * 1000 / 6, class: 'pl-reticula' })); }
  if (!figura) for (let k = 1; k < 12; k++) { svg.append(s('line', { y1: 0, y2: 1000, x1: k * 1000 / 12, x2: k * 1000 / 12, class: 'pl-reticula' })); }
  for (const sitio of lista(P.sitios)) {
    const sel = sitio.id === elegido, ver = sitio.id === u.verSitio;
    const g = s('g', { class: 'pl-sitio' + (sel ? ' elegido' : '') + (ver ? ' visto' : ''), 'data-id': sitio.id });
    if (sitio.inc != null) {
      for (const tramo of trazaOrbita(sitio.inc)) {
        g.append(s('polyline', { points: tramo.map(([x, y]) => `${x * 1000},${y * 1000}`).join(' '), class: 'pl-traza' }));
      }
    } else {
      const p = proyectar(sitio, figura);
      g.append(s('circle', { cx: p.x * 1000, cy: p.y * 1000, r: 16, class: 'pl-marca' }));
      g.append(s('circle', { cx: p.x * 1000, cy: p.y * 1000, r: 4, class: 'pl-centro' }));
    }
    g.addEventListener('click', (ev) => { ev.stopPropagation(); u.verSitio = sitio.id; c.repintar(); });
    svg.append(g);
  }
  escenario.append(svg);
  // Etiquetas HTML de los sitios (no se deforman con el SVG estirado).
  for (const sitio of lista(P.sitios)) {
    if (sitio.inc != null) continue;
    const p = proyectar(sitio, figura);
    escenario.append(h('span', { class: 'pl-etq' + (sitio.id === elegido ? ' elegido' : ''), style: `left:${p.x * 100}%;top:${p.y * 100}%` }, tx(sitio.nombre)));
  }
  // Lectura de capas bajo el ratón (sin repintar: se escribe directamente en la ficha).
  const ficha = h('div', { class: 'pl-lectura' }, T.sinSitio);
  escenario.addEventListener('mousemove', (ev) => {
    const r = escenario.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
    const punto = figura ? { x, y } : { lat: 90 - y * 180, lon: x * 360 - 180 };
    const filas = [figura ? `x ${redondear(x, 2)} · y ${redondear(y, 2)}` : `${redondear(Math.abs(punto.lat), 1)}°${punto.lat >= 0 ? 'N' : 'S'} · ${redondear(Math.abs(punto.lon), 1)}°${punto.lon >= 0 ? 'E' : 'W'}`];
    for (const capa of lista(P.capas)) {
      if (!capa.calculo || !u.capas.includes(capa.id)) continue;
      const v = valorEn(capa, punto);
      if (v != null) filas.push(`${tx(capa.nombre)}: ${capa.calculo === 'azufre' ? (v * 4).toFixed(1) + ' % S' : pct(v)}`);
    }
    ficha.textContent = filas.join('  ·  ');
  });
  escenario.addEventListener('click', () => { u.verSitio = null; c.repintar(); });

  const botones = h('div', { class: 'pl-capas' }, h('span', { class: 'mc-etq' }, T.capas), lista(P.capas).map((capa) => {
    const on = u.capas.includes(capa.id);
    return h('button', {
      class: 'pl-capa-btn' + (on ? ' on' : ''), type: 'button', title: tx(capa.nota),
      onclick: () => {
        if (capa.id === 'color') return;
        u.capas = on ? u.capas.filter((x) => x !== capa.id) : [...u.capas.filter((x) => x === 'color'), capa.id];
        u.foco = on ? null : capa.id;
        c.repintar();
      },
    }, tx(capa.nombre), h('small', {}, capa.real ? T.real : /juego|game/i.test(tx(capa.nombre)) ? T.juego : T.calculada));
  }));
  const foco = lista(P.capas).find((x) => x.id === u.foco && x.calculo);
  const leyenda = foco ? h('div', { class: 'pl-leyenda' }, h('span', {}, T.bajo),
    h('i', { style: `background:linear-gradient(90deg,${[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => `rgb(${color(t).join(',')})`).join(',')})` }),
    h('span', {}, T.alto), h('small', {}, tx(foco.nota))) : null;
  return h('section', { class: 'mc-panel pl-centro-col' }, h('h3', {}, T.mapa, base ? h('small', {}, ' · ', tx(base.nombre)) : null),
    botones, escenario, ficha, leyenda, puedoSitio ? null : h('p', { class: 'mc-nota tenue' }, T.soloSitio));
}

function fichaSitio(c, P, u, res) {
  const id = u.verSitio ?? c.e?.ruta?.sitio;
  const sitio = lista(P.sitios).find((s) => s.id === id);
  const caja = h('section', { class: 'mc-panel pl-ficha' }, h('h3', {}, T.efectos));
  if (sitio) {
    const ef = sitio.efectos ?? {};
    const elegido = sitio.id === c.e?.ruta?.sitio;
    const puedo = puedoPor(c, 'vuelo') || puedoPor(c, 'ciencia');
    const filas = [];
    for (const x of lista(ef.fases)) {
      const f = lista(c.mision.fases).find((y) => y.id === x.fase);
      filas.push(h('li', { class: x.dp >= 0 ? 'ok' : 'mal' }, `${tx(f?.nombre) || x.fase}: ${x.dp > 0 ? '+' : ''}${Math.round(x.dp * 100)} %`));
    }
    for (const [oid, k] of Object.entries(ef.ciencia ?? {})) {
      const o = lista(c.mision.objetivos).find((y) => y.id === oid);
      filas.push(h('li', { class: k >= 1 ? 'ok' : 'mal' }, `${tx(o?.nombre) || oid}: ${T.factor(k)}`));
    }
    if (ef.horasSombra != null) filas.push(h('li', {}, `${T.sombra}: ${ef.horasSombra} h`));
    caja.append(h('div', { class: 'pl-sitio-card' + (elegido ? ' elegido' : '') },
      h('b', {}, tx(sitio.nombre)), sitio.inc != null ? h('small', {}, T.inc(sitio.inc)) : sitio.lat != null ? h('small', {}, `${sitio.lat}°, ${sitio.lon}°`) : null,
      h('p', {}, tx(sitio.nota)), filas.length ? h('ul', { class: 'mc-lista' }, filas) : h('p', { class: 'tenue' }, T.sinEfectos),
      sitio.src ? h('small', { class: 'tenue' }, `${T.fuente}: ${sitio.src}`) : null,
      h('button', { class: 'mc-btn primario', type: 'button', disabled: !puedo || elegido, onclick: () => c.enviar('planificarRuta', { sitio: sitio.id }) }, elegido ? T.elegido : T.elegir)));
  } else caja.append(h('p', { class: 'mc-nota tenue' }, T.sinSitio));
  // Lista rápida de sitios.
  caja.append(h('div', { class: 'pl-lista-sitios' }, lista(P.sitios).map((s) => h('button', {
    class: 'pl-mini' + (s.id === c.e?.ruta?.sitio ? ' elegido' : '') + (s.id === id ? ' visto' : ''), type: 'button',
    onclick: () => { u.verSitio = s.id; c.repintar(); },
  }, tx(s.nombre)))));
  // Probabilidades y cobertura con el diseño actual.
  caja.append(h('h4', {}, T.fasesTit), h('ul', { class: 'mc-barras' }, lista(res?.fases).map((f) => h('li', {},
    h('span', {}, tx(f.nombre) || f.id), h('i', {}, h('b', { style: `width:${Math.round(f.p * 100)}%` })), h('em', {}, pct(f.p))))));
  caja.append(h('h4', {}, T.ciencia), h('ul', { class: 'mc-barras' }, lista(res?.ciencia?.objetivos).map((o) => h('li', {},
    h('span', {}, tx(o.nombre) || o.id), h('i', {}, h('b', { class: 'cien', style: `width:${Math.round(o.cobertura * 100)}%` })), h('em', {}, pct(o.cobertura))))));
  const listo = res?.plan && res.plan.dia != null && res.plan.sitio;
  caja.append(h('p', { class: 'mc-nota ' + (listo ? 'ok' : 'aviso') }, listo ? T.ok : T.falta));
  return caja;
}

export function pantallaPlanificador(c) {
  const P = c.D?.PLANIFICACION?.[c.mision?.id];
  if (!P) return h('div', { class: 'mc-vacio' }, h('p', {}, T.noPlan), h('div', { class: 'pl-sola' }, panelRutas(c)));
  const u = (c.ui.plan ??= { capas: ['color'], foco: null, verSitio: null });
  const res = resumenSeguro(c);
  return h('div', { class: 'pl' },
    h('div', { class: 'pl-izq', 'data-scroll': 'pl-izq' }, panelRutas(c), panelVentana(c, P, res)),
    mapa(c, P, u),
    h('div', { class: 'pl-der', 'data-scroll': 'pl-der' }, fichaSitio(c, P, u, res)));
}
export { nombreRol };
