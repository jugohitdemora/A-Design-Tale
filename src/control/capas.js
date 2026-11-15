// Capas de datos de los mapas del planificador. Las "reales" son imágenes de src/datos/mapas.js; las calculadas se
// generan aquí en un canvas (una vez por capa) y se reutilizan. Cada capa calculada también da su valor en un punto
// (para la ficha al pasar el ratón). Mapa equirectangular: u = (lon + 180) / 360, v = (90 − lat) / 180.
const cache = new Map();      // clave → { canvas, listo: Promise }
const imagenes = new Map();   // archivo → Promise<ImageData|null>

const ANCHO = 512, ALTO = 256;

export function cargarImagen(archivo) {
  if (!imagenes.has(archivo)) {
    imagenes.set(archivo, new Promise((ok) => {
      const img = new Image();
      img.onload = () => {
        try {
          const cv = document.createElement('canvas'); cv.width = ANCHO; cv.height = ALTO;
          const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, ANCHO, ALTO);
          ok(g.getImageData(0, 0, ANCHO, ALTO));
        } catch { ok(null); }
      };
      img.onerror = () => ok(null);
      img.src = archivo;
    }));
  }
  return imagenes.get(archivo);
}

// Paleta continua (0..1) tipo "turbo" reducida: azul → cian → verde → amarillo → rojo.
const PALETA = [[48, 18, 59], [40, 118, 220], [27, 207, 212], [97, 252, 108], [210, 233, 53], [254, 155, 45], [217, 56, 6]];
export function color(t) {
  const x = Math.min(1, Math.max(0, t)) * (PALETA.length - 1);
  const i = Math.min(PALETA.length - 2, Math.floor(x)), f = x - i;
  return PALETA[i].map((c, k) => Math.round(c + (PALETA[i + 1][k] - c) * f));
}

const gauss = (dx, dy, s) => Math.exp(-(dx * dx + dy * dy) / (2 * s * s));
const rad = Math.PI / 180;
// Distancia angular (grados) entre dos puntos lat/lon.
function distancia(lat1, lon1, lat2, lon2) {
  const c = Math.sin(lat1 * rad) * Math.sin(lat2 * rad) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos((lon1 - lon2) * rad);
  return Math.acos(Math.min(1, Math.max(-1, c))) / rad;
}

// Funciones de valor por capa. (lat, lon) para mapas, (x, y) en 0..1 para figuras. Devuelven 0..1 (o null fuera).
const FUNCIONES = {
  // Altura de la Tierra sobre el horizonte vista desde la Luna (cara visible centrada en 0°, 0°): geometría real (sin libración).
  tierra: (lat, lon) => Math.max(0, Math.cos(distancia(lat, lon, 0, 0) * rad)),
  // Índice de azufre (JUEGO): manchas amplias más un gradiente suave; máximo ~4 % en peso.
  azufre: (lat, lon) => {
    const a = gauss(lon - 60, lat - 45, 28) * 0.9 + gauss(lon + 100, lat - 10, 22) * 0.7 + gauss(lon - 150, lat + 30, 25) * 0.6 + gauss(lon + 20, lat + 55, 20) * 0.5;
    return Math.min(1, 0.15 + a * 0.85 + 0.05 * Math.sin(lon * 0.13) * Math.cos(lat * 0.11));
  },
  // Hielo en cráteres polares (JUEGO): solo por encima de ~80° de latitud, en manchas.
  hielo: (lat, lon) => {
    const p = Math.max(0, (Math.abs(lat) - 78) / 12);
    return p > 0 ? Math.min(1, p * (0.6 + 0.4 * Math.abs(Math.sin(lon * 0.09 + lat)))) : 0;
  },
  // Actividad de gas del cometa (JUEGO): concentrada en el cuello (Hapi).
  gas: (x, y) => Math.min(1, gauss(x - 0.52, y - 0.33, 0.09) * 1.0 + gauss(x - 0.6, y - 0.22, 0.07) * 0.5 + 0.08),
  polvo: (x, y) => Math.min(1, gauss(x - 0.52, y - 0.36, 0.12) * 0.8 + gauss(x - 0.45, y - 0.5, 0.15) * 0.3 + 0.05),
};

// Valor de una capa calculada en un punto (para la ficha). `pendiente` necesita la imagen de elevación ya cargada.
const datosPendiente = new Map();
export function valorEn(capa, { lat, lon, x, y }) {
  if (capa.calculo === 'pendiente') {
    const d = datosPendiente.get(capa.base);
    if (!d) return null;
    const px = Math.floor(((lon + 180) / 360) * ANCHO) % ANCHO, py = Math.floor(((90 - lat) / 180) * (ALTO - 1));
    return d[py * ANCHO + px] ?? null;
  }
  const f = FUNCIONES[capa.calculo];
  if (!f) return null;
  return lat != null ? f(lat, lon) : f(x, y);
}

// Canvas RGBA de una capa calculada. `mascara`: ImageData de la figura para recortar (cometa).
export function lienzoCapa(capa, { archivoBase, proyeccion, rutaMapa }) {
  const clave = `${capa.calculo}|${archivoBase}`;
  if (cache.has(clave)) return cache.get(clave);
  const canvas = document.createElement('canvas'); canvas.width = ANCHO; canvas.height = ALTO;
  const g = canvas.getContext('2d');
  const entrada = { canvas, listo: null };
  entrada.listo = (async () => {
    const img = g.createImageData(ANCHO, ALTO);
    let fuente = null, mascara = null;
    if (capa.calculo === 'pendiente') fuente = await cargarImagen(rutaMapa(capa.base));
    if (proyeccion === 'figura') mascara = await cargarImagen(archivoBase);
    let pend = null;
    if (fuente) {
      // Rugosidad: diferencia de gris con los vecinos, normalizada al percentil alto.
      pend = new Float32Array(ANCHO * ALTO);
      const gris = (i) => fuente.data[i * 4];
      let max = 1e-6;
      for (let y = 1; y < ALTO - 1; y++) for (let x = 0; x < ANCHO; x++) {
        const i = y * ANCHO + x;
        const dx = gris(y * ANCHO + ((x + 1) % ANCHO)) - gris(y * ANCHO + ((x - 1 + ANCHO) % ANCHO));
        const dy = gris(i + ANCHO) - gris(i - ANCHO);
        pend[i] = Math.hypot(dx, dy); if (pend[i] > max) max = pend[i];
      }
      const tope = max * 0.35;
      for (let i = 0; i < pend.length; i++) pend[i] = Math.min(1, pend[i] / tope);
      datosPendiente.set(capa.base, pend);
    }
    for (let y = 0; y < ALTO; y++) for (let x = 0; x < ANCHO; x++) {
      const i = y * ANCHO + x;
      let v;
      if (pend) v = pend[i];
      else if (proyeccion === 'figura') {
        const brillo = mascara ? mascara.data[i * 4] : 255;
        v = brillo > 28 ? FUNCIONES[capa.calculo]?.(x / ANCHO, y / ALTO) ?? 0 : null;
      } else v = FUNCIONES[capa.calculo]?.(90 - (y + 0.5) / ALTO * 180, (x + 0.5) / ANCHO * 360 - 180) ?? 0;
      if (v == null) { img.data[i * 4 + 3] = 0; continue; }
      const [r, gg, b] = color(v);
      img.data.set([r, gg, b, 200], i * 4);
    }
    g.putImageData(img, 0, 0);
    return canvas;
  })();
  cache.set(clave, entrada);
  return entrada;
}
