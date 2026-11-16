// Control del róver en la consola de operaciones. Se activa en misiones con una pieza de movilidad (MAR-1, VIP-1) cuando la
// misión llega a la última fase (superficie). El róver se mueve sobre un recorte del mapa REAL del destino (el mapa base de la
// planificación) alrededor del sitio elegido, y "medir" lee en ese punto la capa calculada de la misión (hielo, pendiente…).
// Es local de cada jugador y no cambia las reglas ni la puntuación (lo dice el panel).
import { h } from '../pantallas/ui.js';
import { textos, tx } from '../i18n.js';
import { CUERPOS } from './propagador.js';
import { valorEn, lienzoCapa } from './capas.js';

const T = textos({
  es: {
    titulo: 'RÓVER', sinRover: 'Esta misión no lleva róver.',
    espera: 'El control se activa cuando el róver llega a la superficie.', perdido: 'Sin enlace con el róver.',
    ayuda: 'Flechas: conducir un trayecto. ■: medir aquí. Es una exploración libre: no cambia la puntuación.',
    recorrido: (km) => `Recorrido ≈ ${km} km`, medidas: (n) => `${n} medidas`, aqui: 'Aquí', sinCapa: 'sin capa medible',
    sitio: 'Sitio',
  },
  en: {
    titulo: 'ROVER', sinRover: 'This mission has no rover.',
    espera: 'The control turns on when the rover reaches the surface.', perdido: 'No link with the rover.',
    ayuda: 'Arrows: drive one leg. ■: measure here. Free exploration: it does not change the score.',
    recorrido: (km) => `Driven ≈ ${km} km`, medidas: (n) => `${n} measurements`, aqui: 'Here', sinCapa: 'no measurable layer',
    sitio: 'Site',
  },
});

const VENTANA = 10;   // ± grados de longitud que muestra el recorte (± la mitad en latitud); los mapas globales tienen ~1024 px
const PASO = 0.5;     // grados por trayecto (una campaña de varios días de conducción)
const W = 240, H = 120;
const fotos = new Map(); // archivo → Promise<HTMLImageElement|null> (resolución completa)
const foto = (archivo) => {
  if (!fotos.has(archivo)) fotos.set(archivo, new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = archivo; }));
  return fotos.get(archivo);
};
let estado = null;    // { clave, lat, lon, km, medidas: [{lat, lon, txt}] }

export const tieneRover = (c) => (c.mision?.piezas ?? []).some((id) => c.D?.PIEZAS?.[id]?.categoria === 'movilidad');

// activo: la misión llegó viva a la superficie. plan: resultado de planDe (sitio con lat/lon).
export function panelRover(c, { activo, perdido, plan }) {
  if (!tieneRover(c)) return h('details', { class: 'op-rover' }, h('summary', {}, T.titulo), h('p', {}, T.sinRover));
  const P = c.D?.PLANIFICACION?.[c.mision.id];
  const base = c.D?.MAPAS?.[P?.mapa?.base];
  const sitio = plan?.sitio?.lat != null ? plan.sitio : (P?.sitios ?? []).find((s) => s.lat != null);
  const clave = `${c.e?.semilla}|${c.mision.id}|${sitio?.id}`;
  if (!estado || estado.clave !== clave) estado = { clave, lat: sitio?.lat ?? 0, lon: sitio?.lon ?? 0, km: 0, medidas: [], ruta: [[sitio?.lat ?? 0, sitio?.lon ?? 0]] };
  const radio = CUERPOS[c.mision.destino]?.radioKm ?? 1737.4;
  const capa = (P?.capas ?? []).find((x) => x.calculo && x.calculo !== 'tierra');

  const lienzo = h('canvas', { class: 'op-rover-mapa', width: W, height: H });
  const info = h('p', { class: 'op-num' });
  const dibujar = async () => {
    const g = lienzo.getContext('2d');
    g.fillStyle = '#05070c'; g.fillRect(0, 0, W, H);
    // Recorte del mapa real a resolución completa y, encima, la capa medible de la misión (semitransparente).
    const recorte = (img, alfa) => {
      if (!img) return;
      const iw = img.naturalWidth ?? img.width, ih = img.naturalHeight ?? img.height;
      const px = (lon) => ((lon + 180) / 360) * iw, py = (lat) => ((90 - lat) / 180) * ih;
      const y0 = Math.max(0, py(sitio.lat + VENTANA / 2)), y1 = Math.min(ih, py(sitio.lat - VENTANA / 2));
      g.globalAlpha = alfa; g.imageSmoothingEnabled = true;
      g.drawImage(img, px(sitio.lon - VENTANA), y0, px(sitio.lon + VENTANA) - px(sitio.lon - VENTANA), y1 - y0, 0, 0, W, H);
      g.globalAlpha = 1;
    };
    if (base?.proyeccion === 'equirectangular') {
      recorte(await foto(base.archivo), 1);
      if (capa) recorte(await lienzoCapa(capa, { archivoBase: base.archivo, proyeccion: base.proyeccion, rutaMapa: (id) => c.D?.MAPAS?.[id]?.archivo }).listo, 0.4);
    }
    const aPx = (lat, lon) => [((lon - sitio.lon + VENTANA) / (2 * VENTANA)) * W, ((sitio.lat + VENTANA / 2 - lat) / VENTANA) * H];
    g.strokeStyle = 'rgba(255,200,80,0.9)'; g.lineWidth = 1.5; g.beginPath(); g.arc(...aPx(sitio.lat, sitio.lon), 6, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#fff'; g.setLineDash([3, 3]); g.lineWidth = 1.2; g.beginPath(); estado.ruta.forEach(([la, lo], i) => g[i ? 'lineTo' : 'moveTo'](...aPx(la, lo))); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#7cf'; for (const m of estado.medidas) { const [x, y] = aPx(m.lat, m.lon); g.fillRect(x - 2, y - 2, 4, 4); }
    const [rx, ry] = aPx(estado.lat, estado.lon);
    g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.beginPath(); g.arc(rx, ry, 4, 0, Math.PI * 2); g.fill(); g.stroke();
    const ultima = estado.medidas.at(-1);
    info.textContent = [T.recorrido(estado.km.toFixed(1)), T.medidas(estado.medidas.length), ultima ? `${T.aqui}: ${ultima.txt}` : null].filter(Boolean).join(' · ');
  };
  const mover = (dlat, dlon) => {
    const lat = Math.max(sitio.lat - VENTANA / 2, Math.min(sitio.lat + VENTANA / 2, estado.lat + dlat));
    const lon = Math.max(sitio.lon - VENTANA, Math.min(sitio.lon + VENTANA, estado.lon + dlon));
    // Distancia sobre la esfera (aproximación local): Δs = R · √(Δφ² + (cos φ · Δλ)²).
    const r = Math.PI / 180;
    estado.km += radio * Math.hypot((lat - estado.lat) * r, Math.cos(lat * r) * (lon - estado.lon) * r);
    estado.lat = lat; estado.lon = lon; estado.ruta.push([lat, lon]); dibujar();
  };
  const medir = async () => {
    // La pendiente se deriva del mapa de elevación: hay que calcular la capa una vez antes de leerla.
    if (capa?.calculo === 'pendiente') await lienzoCapa(capa, { archivoBase: base?.archivo, proyeccion: base?.proyeccion, rutaMapa: (id) => c.D?.MAPAS?.[id]?.archivo }).listo;
    const v = capa ? valorEn(capa, { lat: estado.lat, lon: estado.lon }) : null;
    const txt = v == null ? T.sinCapa : `${tx(capa.nombre)} ${Math.round(v * 100)} %`;
    estado.medidas.push({ lat: estado.lat, lon: estado.lon, txt }); dibujar();
  };
  const usable = activo && !perdido && !!sitio;
  const boton = (x, f) => h('button', { class: 'boton op-flecha', type: 'button', disabled: !usable, onclick: f }, x);
  const pad = h('div', { class: 'op-dpad' },
    boton('▲', () => mover(PASO, 0)), boton('◀', () => mover(0, -PASO)), boton('■', medir), boton('▶', () => mover(0, PASO)), boton('▼', () => mover(-PASO, 0)));
  if (usable) dibujar();
  return h('details', { class: 'op-rover', open: usable ? '' : null },
    h('summary', {}, T.titulo, sitio ? ` · ${T.sitio}: ${tx(sitio.nombre)}` : ''),
    usable ? [lienzo, info, h('p', { class: 'tenue' }, T.ayuda)] : h('p', {}, perdido ? T.perdido : T.espera),
    pad);
}
