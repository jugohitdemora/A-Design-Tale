// Decorado de la sala de briefing: una oficina de diseño de misiones espaciales, inspirada en los estudios de diseño concurrente
// reales (moqueta modular, techo técnico, ventanal, carteles de misión, relojes de los centros de control, maquetas de cohete y satélite).
// Mismo estilo que el resto del juego: low poly con colores planos, y texturas pequeñas dibujadas en canvas (sin archivos de imagen).
// escena.js conserva la mesa, los asientos, el proyector, las carpetas, la puerta y los avatares; aquí solo está el escenario.
import * as THREE from 'three';
import { JUEGO } from './config.js';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...extra });
const luz = (color, intensidad = 1) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensidad });
const caja = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'number' ? mat(c) : c);
const cil = (r1, r2, h, c, seg = 8) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), typeof c === 'number' ? mat(c) : c);
function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Textura dibujada en un canvas. nitida: sin suavizar al acercarse (pixelada, como el resto del juego). repetir: [x, y] veces.
function lienzo(w, h, dibujar, { nitida = false, repetir = null } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (nitida) t.magFilter = THREE.NearestFilter;
  if (repetir) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repetir[0], repetir[1]); }
  return t;
}
const planoTex = (w, h, tex, basico = false) => new THREE.Mesh(new THREE.PlaneGeometry(w, h),
  basico ? new THREE.MeshBasicMaterial({ map: tex }) : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));

// ---------- Texturas ----------
const texMadera = () => lienzo(128, 64, (g, w, h) => {
  g.fillStyle = '#8a5a34'; g.fillRect(0, 0, w, h);
  const r = mulberry(11);
  for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(${r() > 0.5 ? '60,34,16' : '170,116,70'},${0.1 + r() * 0.16})`; g.fillRect(0, y, w, 1 + (r() > 0.7 ? 1 : 0)); }
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(50,28,12,0.35)'; g.fillRect(r() * w, r() * h, 8 + r() * 14, 1); }
}, { nitida: true });

const texMoqueta = () => lienzo(64, 64, (g, w, h) => {
  g.fillStyle = '#3b4656'; g.fillRect(0, 0, w, h);
  const r = mulberry(5);
  for (let i = 0; i < 260; i++) { g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)'; g.fillRect((r() * w) | 0, (r() * h) | 0, 2, 2); }
  g.fillStyle = '#2b3442'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h);   // junta entre losetas de 0,5 m
  g.fillStyle = '#4a566a'; g.fillRect(0, 1, w, 1); g.fillRect(1, 0, 1, h);
}, { nitida: true, repetir: [16, 12] });

const texTecho = () => lienzo(64, 64, (g, w, h) => {
  g.fillStyle = '#d7dadc'; g.fillRect(0, 0, w, h);
  const r = mulberry(9);
  for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(90,96,104,0.35)'; g.fillRect((r() * w) | 0, (r() * h) | 0, 1, 1); }
  g.fillStyle = '#9aa0a6'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);   // perfilería del techo técnico (600 mm)
}, { nitida: true, repetir: [13, 10] });

// Pared de 1 m de ancho y 3 de alto: friso azul, moldura con filete naranja y juntas de panel.
const texPared = (anchoM) => lienzo(128, 384, (g, w, h) => {
  g.fillStyle = '#dcd8cc'; g.fillRect(0, 0, w, 256);
  const r = mulberry(3);
  for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(120,114,100,0.14)'; g.fillRect((r() * w) | 0, (r() * 256) | 0, 2, 2); }
  g.fillStyle = '#bdb9ac'; g.fillRect(0, 0, w, 5);                       // cornisa
  g.fillStyle = '#c4c0b3'; g.fillRect(0, 0, 2, 256); g.fillRect(w - 1, 0, 1, 256); // junta vertical
  g.fillStyle = '#e0823a'; g.fillRect(0, 244, w, 4);                     // filete de la agencia
  g.fillStyle = '#eee9dc'; g.fillRect(0, 256, w, 6);                     // moldura
  g.fillStyle = '#9b978b'; g.fillRect(0, 262, w, 2);
  g.fillStyle = '#2f4560'; g.fillRect(0, 264, w, 108);                   // friso
  g.fillStyle = '#27394f'; for (let x = 0; x < w; x += 32) g.fillRect(x, 264, 2, 108);
  g.fillStyle = '#3a5373'; for (let x = 2; x < w; x += 32) g.fillRect(x, 264, 1, 108);
  g.fillStyle = '#1b2736'; g.fillRect(0, 372, w, 12);                    // zócalo
}, { nitida: true, repetir: [anchoM, 1] });

const texAlfombra = () => lienzo(512, 360, (g, w, h) => {
  g.fillStyle = '#1d2c4a'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#e8dcc0'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28);
  g.lineWidth = 2; g.strokeRect(28, 28, w - 56, h - 56);
  g.strokeStyle = 'rgba(120,170,230,0.55)'; g.lineWidth = 2;
  for (const [rx, ry] of [[110, 70], [170, 108], [230, 146]]) { g.beginPath(); g.ellipse(w / 2, h / 2, rx, ry, -0.18, 0, Math.PI * 2); g.stroke(); }
  g.fillStyle = '#f2b844'; for (const [x, y] of [[150, 118], [360, 224], [300, 80]]) { g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); }
}, { nitida: true });

// Cielo nocturno del ventanal: estrellas, luna, montañas, luces lejanas y la estela de un lanzamiento.
const texVentana = () => lienzo(1024, 320, (g, w, h) => {
  const f = g.createLinearGradient(0, 0, 0, h);
  f.addColorStop(0, '#060a1d'); f.addColorStop(0.55, '#1d2a58'); f.addColorStop(0.85, '#5a3f78'); f.addColorStop(1, '#d98a5a');
  g.fillStyle = f; g.fillRect(0, 0, w, h);
  const r = mulberry(21);
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`; g.fillRect((r() * w) | 0, (r() * h * 0.7) | 0, r() > 0.9 ? 3 : 2, r() > 0.9 ? 3 : 2); }
  g.fillStyle = '#f3ecd2'; g.beginPath(); g.arc(780, 70, 30, 0, Math.PI * 2); g.fill();      // luna creciente
  g.fillStyle = '#1b2650'; g.beginPath(); g.arc(794, 62, 28, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(330, 230); g.lineTo(430, 70); g.stroke(); // estela
  g.strokeStyle = 'rgba(255,170,90,0.5)'; g.lineWidth = 8; g.beginPath(); g.moveTo(330, 230); g.lineTo(384, 144); g.stroke();
  g.fillStyle = '#ffd9a0'; g.beginPath(); g.arc(432, 66, 5, 0, Math.PI * 2); g.fill();
  const monte = (color, base, amp, semilla) => {
    const q = mulberry(semilla); g.fillStyle = color; g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 32) g.lineTo(x, base - q() * amp);
    g.lineTo(w, h); g.fill();
  };
  monte('#2a2d4a', 250, 60, 4); monte('#14172e', 285, 38, 8);
  for (let i = 0; i < 70; i++) { g.fillStyle = r() > 0.5 ? '#ffd27a' : '#ffffff'; g.fillRect((r() * w) | 0, 292 + ((r() * 26) | 0), 2, 2); }
}, { nitida: true });

// Cartel de mapa del sistema solar: planetas en fila sobre órbitas.
const texSistema = () => lienzo(380, 230, (g, w, h) => {
  g.fillStyle = '#0c1a33'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(120,170,230,0.18)'; g.lineWidth = 1;
  for (let x = 0; x < w; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 0; y < h; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.fillStyle = '#f2b844'; g.beginPath(); g.arc(-30, h / 2 + 20, 70, 0, Math.PI * 2); g.fill();
  const planetas = [['#b5b0a6', 3, 80], ['#d9a85a', 5, 112], ['#3f7fd8', 6, 146], ['#c4552f', 5, 186], ['#d8b27a', 14, 250], ['#e0cf9a', 12, 312], ['#7fd0e8', 8, 352]];
  g.lineWidth = 1;
  for (const [col, rad, x] of planetas) {
    g.strokeStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.arc(-30, h / 2 + 20, x + 30, -0.5, 0.5); g.stroke();
    const y = h / 2 + 20 + Math.sin((x - 80) * 0.013 - 0.3) * 38 - (x > 150 ? 14 : 0);
    g.fillStyle = col; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#e8dcc0'; g.font = 'bold 15px monospace'; g.fillText('SOLAR SYSTEM · TRANSFER MAP', 14, 24);
  g.fillStyle = '#7fa6d6'; g.font = '11px monospace'; g.fillText('Δv BUDGET · LAUNCH WINDOWS', 14, 40);
}, { nitida: true });

// Parche de misión, circular.
const texParche = () => lienzo(256, 256, (g, w) => {
  const c = w / 2;
  g.fillStyle = '#e8b84a'; g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1c2f57'; g.beginPath(); g.arc(c, c, c - 12, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3f7fd8'; g.beginPath(); g.arc(c, c + 56, 64, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#4f9a52'; g.beginPath(); g.ellipse(c - 20, c + 50, 22, 14, 0.5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#dfe8f2'; g.lineWidth = 3; g.beginPath(); g.ellipse(c, c + 10, 92, 30, -0.35, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#f2b844'; g.beginPath(); g.moveTo(c + 62, c - 38); g.lineTo(c + 68, c - 22); g.lineTo(c + 84, c - 16); g.lineTo(c + 68, c - 10); g.lineTo(c + 62, c + 6); g.lineTo(c + 56, c - 10); g.lineTo(c + 40, c - 16); g.lineTo(c + 56, c - 22); g.fill();
  g.fillStyle = '#f1e9d6'; g.font = 'bold 24px monospace'; g.textAlign = 'center';
  g.fillText(String(JUEGO?.NOMBRE ?? 'ORBIT').toUpperCase().slice(0, 14), c, 56);
}, { nitida: true });

// Cartel retro de destino: cielo degradado, astro grande y título.
function texCartel(titulo, colorCielo, colorAstro, detalle) {
  return lienzo(160, 224, (g, w, h) => {
    const f = g.createLinearGradient(0, 0, 0, h); f.addColorStop(0, colorCielo[0]); f.addColorStop(1, colorCielo[1]);
    g.fillStyle = f; g.fillRect(0, 0, w, h);
    const r = mulberry(titulo.length * 31);
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect((r() * w) | 0, (r() * 120) | 0, 2, 2); }
    g.fillStyle = colorAstro; g.beginPath(); g.arc(w / 2, 110, 56, 0, Math.PI * 2); g.fill();
    detalle(g, w, h);
    g.fillStyle = '#0d1424'; g.fillRect(0, 172, w, 52);
    g.fillStyle = '#f1e9d6'; g.font = 'bold 26px monospace'; g.textAlign = 'center'; g.fillText(titulo, w / 2, 207);
    g.strokeStyle = '#e0823a'; g.lineWidth = 3; g.strokeRect(5, 5, w - 10, h - 10);
  }, { nitida: true });
}
const texMarte = () => texCartel('MARS', ['#3a1d33', '#c4552f'], '#d9703a', (g) => { g.fillStyle = '#8a3e22'; for (const [x, y, r] of [[60, 90, 12], [98, 120, 9], [84, 70, 7]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } });
const texLuna = () => texCartel('MOON', ['#0b1022', '#394a78'], '#cfcfd2', (g) => { g.fillStyle = '#9a9aa2'; for (const [x, y, r] of [[62, 92, 13], [98, 124, 10], [90, 78, 6], [70, 128, 5]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } });
const texOrbita = () => texCartel('ORBIT', ['#07142e', '#2a5aa8'], '#3f8fe0', (g, w) => { g.strokeStyle = '#dfe8f2'; g.lineWidth = 3; g.beginPath(); g.ellipse(w / 2, 110, 74, 22, -0.35, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#4f9a52'; g.beginPath(); g.ellipse(w / 2 - 14, 100, 20, 12, 0.4, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.fillRect(w / 2 + 52, 96, 8, 8); });

// Vitrina de parches de misiones pasadas (rejilla de círculos de colores).
const texVitrina = () => lienzo(340, 210, (g, w, h) => {
  g.fillStyle = '#1a2233'; g.fillRect(0, 0, w, h);
  const cols = ['#e8b84a', '#3f7fd8', '#c4552f', '#4f9a52', '#dfe8f2', '#e0823a', '#8a6ad0', '#2fa6a0'];
  for (let i = 0; i < 8; i++) {
    const x = 42 + (i % 4) * 82, y = 54 + Math.floor(i / 4) * 92;
    g.fillStyle = cols[i]; g.beginPath(); g.arc(x, y, 32, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#10182a'; g.beginPath(); g.arc(x, y, 25, 0, Math.PI * 2); g.fill();
    g.fillStyle = cols[(i + 3) % 8]; g.beginPath(); g.arc(x + 3, y + 5, 11, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f1e9d6'; g.fillRect(x - 14, y - 16, 28, 3);
  }
}, { nitida: true });

// Pantalla de telemetría de la pared (estática).
const texTelemetria = () => lienzo(240, 140, (g, w, h) => {
  g.fillStyle = '#06101c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(95,224,138,0.18)'; for (let x = 0; x < w; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  g.strokeStyle = '#5fe08a'; g.lineWidth = 2; g.beginPath();
  for (let x = 0; x <= w; x += 6) { const y = 70 - Math.sin(x * 0.06) * 26 - x * 0.12; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  g.strokeStyle = '#62c6ff'; g.beginPath();
  for (let x = 0; x <= w; x += 6) { const y = 100 + Math.sin(x * 0.11) * 12; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  g.fillStyle = '#5fe08a'; g.font = 'bold 12px monospace'; g.fillText('TELEMETRY', 8, 14);
  g.fillStyle = '#f2b844'; for (let i = 0; i < 6; i++) g.fillRect(150 + i * 14, 120 - (i % 3) * 9 - i * 2, 9, 9 + (i % 3) * 9 + i * 2);
}, { nitida: true });

// Reloj de pared con el nombre de un centro de control; hora fija (h, m).
const texReloj = (nombre, hora, minuto) => lienzo(128, 128, (g, w) => {
  const c = w / 2;
  g.fillStyle = '#1b1d21'; g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f1ede2'; g.beginPath(); g.arc(c, c, c - 8, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1b1d21';
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillRect(c + Math.sin(a) * 48 - 2, c - Math.cos(a) * 48 - 2, 4, 4); }
  g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.fillText(nombre, c, c + 30);
  const mano = (ang, largo, grosor) => { g.lineWidth = grosor; g.strokeStyle = '#1b1d21'; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(ang) * largo, c - Math.cos(ang) * largo); g.stroke(); };
  mano(((hora % 12) + minuto / 60) / 12 * Math.PI * 2, 28, 5); mano(minuto / 60 * Math.PI * 2, 40, 3);
  g.fillStyle = '#e0584a'; g.beginPath(); g.arc(c, c, 4, 0, Math.PI * 2); g.fill();
}, { nitida: true });

// ---------- Piezas ----------
// Cuadro con marco: la imagen mira a +z del grupo (se orienta con rotation.y según la pared).
function cuadro(ancho, alto, tex, color = 0x2a2623, basico = false) {
  const g = new THREE.Group();
  g.add(caja(ancho + 0.07, alto + 0.07, 0.03, color));
  const img = planoTex(ancho, alto, tex, basico); img.position.z = 0.0165; g.add(img);
  return g;
}
const colocar = (obj, x, y, z, ry = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; return obj; };

function cohete() {
  const g = new THREE.Group();
  const peana = cil(0.3, 0.34, 0.1, 0x3a3f46, 10); peana.position.y = 0.05; g.add(peana);
  const poste = cil(0.05, 0.05, 0.3, 0x5a5f66); poste.position.y = 0.25; g.add(poste);
  const cuerpo = cil(0.1, 0.1, 0.8, 0xf1ede2, 10); cuerpo.position.y = 0.88; g.add(cuerpo);
  const banda = cil(0.103, 0.103, 0.12, 0xe0823a, 10); banda.position.y = 0.66; g.add(banda);
  const banda2 = cil(0.103, 0.103, 0.06, 0x1b1d21, 10); banda2.position.y = 1.05; g.add(banda2);
  const ojiva = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 10), mat(0xd9402f)); ojiva.position.y = 1.42; g.add(ojiva);
  const tobera = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.1, 10), mat(0x2b2f35)); tobera.rotation.x = Math.PI; tobera.position.y = 0.43; g.add(tobera);
  for (let k = 0; k < 4; k++) {
    const aleta = caja(0.1, 0.24, 0.02, 0xd9402f); const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    aleta.position.set(Math.sin(a) * 0.14, 0.56, Math.cos(a) * 0.14); aleta.rotation.y = a; g.add(aleta);
  }
  for (const s of [-1, 1]) { const b = cil(0.04, 0.04, 0.5, 0xe8e4d8, 8); b.position.set(s * 0.15, 0.7, 0); g.add(b); const p = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 8), mat(0xd9402f)); p.position.set(s * 0.15, 1.0, 0); g.add(p); }
  const placa = caja(0.14, 0.05, 0.01, 0xc9b27a); placa.position.set(0, 0.07, 0.31); g.add(placa);
  return g;
}

function satelite() {
  const g = new THREE.Group();
  const base = cil(0.1, 0.12, 0.03, 0x3a3f46, 10); base.position.y = 0.015; g.add(base);
  const poste = cil(0.014, 0.014, 0.1, 0x5a5f66, 6); poste.position.y = 0.08; g.add(poste);
  const cuerpo = caja(0.13, 0.13, 0.13, 0xd9a83a); cuerpo.position.y = 0.19; g.add(cuerpo);
  for (const s of [-1, 1]) {
    const panel = caja(0.2, 0.004, 0.12, luz(0x4b8fe0, 0.6)); panel.position.set(s * 0.19, 0.19, 0); g.add(panel);
    const brazo = caja(0.06, 0.008, 0.008, 0x9aa0a6); brazo.position.set(s * 0.095, 0.19, 0); g.add(brazo);
  }
  const antena = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.04, 10, 1, true), mat(0xe8e4d8, { side: THREE.DoubleSide }));
  antena.rotation.x = -Math.PI / 2 + 0.4; antena.position.set(0, 0.2, 0.1); g.add(antena);
  return g;
}

function globo() {
  const g = new THREE.Group();
  const base = cil(0.09, 0.1, 0.02, 0x3a3f46, 10); base.position.y = 0.01; g.add(base);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.008, 4, 20), mat(0xb8bcc0)); aro.position.y = 0.17; aro.rotation.y = Math.PI / 2; aro.rotation.z = 0.4; g.add(aro);
  const geo = new THREE.IcosahedronGeometry(0.11, 2).toNonIndexed();
  const pos = geo.attributes.position, cols = [], v = new THREE.Vector3();
  const mar = new THREE.Color(0x1f5fb0), tierra = new THREE.Color(0x4f9a52), hielo = new THREE.Color(0xe8eef4);
  for (let i = 0; i < pos.count; i += 3) {
    v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(pos, i + k)); v.normalize();
    const n = Math.sin(v.x * 4.1 + 1.3) * Math.cos(v.y * 3.3) + Math.sin(v.z * 5.2 + v.x * 2.0) * 0.6;
    const c = Math.abs(v.y) > 0.9 ? hielo : n > 0.2 ? tierra : mar;
    for (let k = 0; k < 3; k++) cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const bola = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 }));
  bola.position.y = 0.17; g.add(bola);
  return g;
}

function planta(altura = 1, semilla = 1) {
  const g = new THREE.Group(), r = mulberry(semilla);
  const maceta = cil(0.2, 0.15, 0.32, 0xc4693f, 7); maceta.position.y = 0.16; g.add(maceta);
  const tierra = cil(0.18, 0.18, 0.02, 0x3a2a1c, 7); tierra.position.y = 0.32; g.add(tierra);
  const verdes = [0x2f7a45, 0x3f9a55, 0x256a3b];
  for (let i = 0; i < 9; i++) {
    const hoja = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.45 * altura, 4), mat(verdes[i % 3]));
    const a = (i / 9) * Math.PI * 2 + r(), incl = 0.25 + r() * 0.5;
    hoja.position.set(Math.sin(a) * 0.08, 0.32 + 0.2 * altura, Math.cos(a) * 0.08);
    hoja.rotation.set(Math.cos(a) * incl, 0, -Math.sin(a) * incl);
    g.add(hoja);
  }
  return g;
}

// Estantería con carpetas de anillas y algún objeto. Mira a +z del grupo.
function estanteria(ancho, alto, semilla) {
  const g = new THREE.Group(), r = mulberry(semilla), prof = 0.34;
  const madera = 0x6b4a2e;
  for (const s of [-1, 1]) { const l = caja(0.04, alto, prof, madera); l.position.set(s * (ancho / 2 - 0.02), alto / 2, 0); g.add(l); }
  const fondo = caja(ancho, alto, 0.02, 0x4d3520); fondo.position.set(0, alto / 2, -prof / 2 + 0.01); g.add(fondo);
  const baldas = 5, paso = (alto - 0.06) / baldas, colores = [0x24324a, 0xb3261e, 0xe8b84a, 0x3fa66b, 0x4a7fd0, 0xf1e9d6, 0x6d7278];
  for (let k = 0; k <= baldas; k++) {
    const y = 0.03 + k * paso;
    const b = caja(ancho - 0.04, 0.03, prof, madera); b.position.set(0, y, 0); g.add(b);
    if (k === baldas) break;
    let x = -ancho / 2 + 0.07;
    while (x < ancho / 2 - 0.12) {
      if (r() > 0.88) { x += 0.1 + r() * 0.12; continue; }                      // hueco
      if (r() > 0.9) {                                                          // maqueta o caja
        const w = 0.1 + r() * 0.06, h = 0.12 + r() * 0.08;
        const m = caja(w, h, 0.16, colores[(r() * 7) | 0]); m.position.set(x + w / 2, y + 0.015 + h / 2, 0.01); g.add(m); x += w + 0.02; continue;
      }
      const w = 0.03 + r() * 0.03, h = paso * (0.62 + r() * 0.28);
      const c = caja(w, h, prof - 0.1, colores[(r() * 7) | 0]); c.position.set(x + w / 2, y + 0.015 + h / 2, 0.01); g.add(c);
      const et = caja(w * 0.8, h * 0.3, 0.004, 0xf6f0e0); et.position.set(x + w / 2, y + 0.015 + h * 0.6, 0.01 + (prof - 0.1) / 2); g.add(et);
      x += w + 0.004;
    }
  }
  return g;
}

function lampara() { // colgante sobre la mesa
  const g = new THREE.Group();
  const cable = cil(0.006, 0.006, 0.55, 0x15171b, 4); cable.position.y = 0.275; g.add(cable);
  const pantalla = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.17, 10, 1, true), mat(0x4a4f56, { side: THREE.DoubleSide })); pantalla.position.y = -0.04; g.add(pantalla);
  const bombilla = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), luz(0xffe7a0, 1.6)); bombilla.position.y = -0.06; g.add(bombilla);
  return g;
}

// ---------- Sala ----------
// Rellena la escena: carcasa de la sala (suelo, techo, paredes, ventanal), carteles, maquetas y mobiliario.
// Habitación de 8 × 6 × 3 m centrada en el origen; las cajas de escena.js (suelo, techo y paredes) quedan de respaldo debajo.
export function decorarSala(escena, { tablero } = {}) {
  const poner = (...o) => o.forEach((x) => escena.add(x));

  // Suelo y alfombra bajo la mesa.
  const suelo = planoTex(8, 6, texMoqueta()); suelo.rotation.x = -Math.PI / 2; suelo.position.y = 0.002;
  const alfombra = planoTex(5.6, 4.0, texAlfombra()); alfombra.rotation.x = -Math.PI / 2; alfombra.position.y = 0.006;
  poner(suelo, alfombra);

  // Techo técnico con paneles de luz y un conducto visto.
  const techo = planoTex(8, 6, texTecho()); techo.rotation.x = Math.PI / 2; techo.position.y = 2.998;
  poner(techo);
  for (const x of [-1.6, 1.6]) for (const z of [-1.1, 1.1]) { const p = caja(1.2, 0.03, 0.6, luz(0xfff3d0, 0.9)); p.position.set(x, 2.98, z); poner(p); }
  const conducto = cil(0.13, 0.13, 7.9, 0x8a9096, 10); conducto.rotation.z = Math.PI / 2; conducto.position.set(0, 2.82, -2.6); poner(conducto);
  for (const x of [-3, -1, 1, 3]) { const abrazadera = caja(0.05, 0.3, 0.05, 0x5a5f66); abrazadera.position.set(x, 2.88, -2.6); poner(abrazadera); }
  const bandeja = caja(7.9, 0.05, 0.3, 0x3a3f46); bandeja.position.set(0, 2.9, -2.2); poner(bandeja);
  for (const x of [-1.3, 1.3]) { const l = lampara(); l.position.set(x, 2.43, 0); poner(l); }   // colgantes sobre la mesa, por encima de la línea de visión

  // Paredes (paneles interiores sobre las cajas de escena.js).
  const pared = (ancho, x, z, ry) => { const p = planoTex(ancho, 3, texPared(ancho)); p.position.set(x, 1.5, z); p.rotation.y = ry; poner(p); };
  pared(8, 0, -2.947, 0); pared(8, 0, 2.947, Math.PI); pared(6, -3.947, 0, Math.PI / 2); pared(6, 3.947, 0, -Math.PI / 2);

  // Mesa de madera (misma geometría que antes).
  if (tablero) { tablero.material.color.set(0xffffff); tablero.material.map = texMadera(); tablero.material.needsUpdate = true; }

  // ----- Pared del ventanal (z = +3): la ven los dos asientos de z = -1,25 -----
  const cielo = planoTex(3.6, 1.12, texVentana(), true); cielo.position.set(0, 1.78, 2.935); cielo.rotation.y = Math.PI; poner(cielo);
  const marcoV = [[3.76, 0.08, 0, 2.38], [3.76, 0.08, 0, 1.18], [0.08, 1.28, -1.84, 1.78], [0.08, 1.28, 1.84, 1.78], [0.05, 1.2, -0.6, 1.78], [0.05, 1.2, 0.6, 1.78]];
  for (const [w, h, x, y] of marcoV) { const m = caja(w, h, 0.1, 0x2b2f36); m.position.set(x, y, 2.9); poner(m); }
  const alfeizar = caja(3.9, 0.05, 0.22, 0xd0cbbd); alfeizar.position.set(0, 1.14, 2.84); poner(alfeizar);
  for (let k = 0; k < 6; k++) { const l = caja(3.6, 0.028, 0.03, 0xcfd2d4); l.position.set(0, 2.32 - k * 0.048, 2.86); poner(l); }   // persiana recogida
  const hilo = caja(0.012, 0.3, 0.012, 0x9aa0a6); hilo.position.set(1.6, 2.28, 2.84); poner(hilo);
  const luzV = new THREE.PointLight(0x6f95e0, 4, 6, 1.6); luzV.position.set(0, 1.9, 2.4); poner(luzV);

  const libreria = estanteria(1.5, 2.0, 7); colocar(libreria, -3.05, 0, 2.74, Math.PI); poner(libreria);
  // Sobre la librería: globo terráqueo y una maqueta pequeña de cohete.
  const globoM = globo(); globoM.position.set(-3.45, 2.0, 2.74); poner(globoM);
  const cohetinM = cohete(); cohetinM.scale.setScalar(0.2); cohetinM.position.set(-2.75, 2.0, 2.74); poner(cohetinM);

  // Rincón del café.
  const mostrador = caja(1.5, 0.88, 0.52, 0x3f4650); mostrador.position.set(3.05, 0.44, 2.7); poner(mostrador);
  const encimera = caja(1.56, 0.04, 0.58, 0xd8d3c4); encimera.position.set(3.05, 0.9, 2.7); poner(encimera);
  for (const x of [2.65, 3.45]) { const p = caja(0.7, 0.7, 0.02, 0x4a525d); p.position.set(x, 0.42, 2.43); poner(p); const t = caja(0.1, 0.02, 0.02, 0xb8bcc0); t.position.set(x - 0.28, 0.6, 2.42); poner(t); }
  const cafetera = caja(0.3, 0.4, 0.3, 0x24272c); cafetera.position.set(2.7, 1.12, 2.75); poner(cafetera);
  const piloto = caja(0.05, 0.04, 0.02, luz(0xe0584a, 1.6)); piloto.position.set(2.7, 1.25, 2.59); poner(piloto);
  const jarra = cil(0.07, 0.07, 0.14, 0xdfe8f2, 8); jarra.position.set(2.7, 0.99, 2.7); jarra.material = mat(0xdfe8f2, { transparent: true, opacity: 0.55 }); poner(jarra);
  const dispensador = caja(0.28, 0.45, 0.28, 0xdfe3e8); dispensador.position.set(3.2, 1.14, 2.75); poner(dispensador);
  const garrafa = cil(0.12, 0.12, 0.34, mat(0x62b6e8, { transparent: true, opacity: 0.7 }), 10); garrafa.position.set(3.2, 1.54, 2.75); poner(garrafa);
  [[3.55, 0xf1e9d6], [3.66, 0xd9402f], [3.77, 0x3f7fd8]].forEach(([x, c]) => { const t = cil(0.04, 0.035, 0.09, c, 8); t.position.set(x, 0.97, 2.62); poner(t); });
  const cMarte = cuadro(0.6, 0.84, texMarte()); colocar(cMarte, 3.1, 1.95, 2.93, Math.PI); poner(cMarte);
  for (const [x, s] of [[-2.1, 1], [2.1, 2]]) { const p = planta(1.2, s); p.position.set(x, 0, 2.68); poner(p); }

  // ----- Pared de la puerta (z = −3): la ven los dos asientos de z = +1,25 -----
  const cSistema = cuadro(1.9, 1.15, texSistema()); colocar(cSistema, -1.7, 1.75, -2.93, 0); poner(cSistema);
  [['UTC', 14, 5], ['PASADENA', 6, 5], ['HOUSTON', 8, 5]].forEach(([n, h, m], k) => {
    const r = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), new THREE.MeshStandardMaterial({ map: texReloj(n, h, m * 7 + k * 11), roughness: 0.9 }));
    r.position.set(-2.4 + k * 0.7, 2.58, -2.935); poner(r);
  });
  const parche = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), new THREE.MeshStandardMaterial({ map: texParche(), roughness: 0.95 }));
  parche.position.set(0.35, 1.8, -2.935); poner(parche);
  const aroParche = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.015, 4, 24), mat(0x2a2623)); aroParche.position.set(0.35, 1.8, -2.93); poner(aroParche);
  const tele = cuadro(1.2, 0.7, texTelemetria(), 0x15171b, true); colocar(tele, 1.55, 1.7, -2.93, 0); poner(tele);
  // Puerta de control: marco y piloto de "en emisión" (la hoja, el pomo y el rótulo están en escena.js).
  for (const [w, h, x, y] of [[0.08, 2.2, 2.66, 1.1], [0.08, 2.2, 3.74, 1.1], [1.16, 0.08, 3.2, 2.2]]) { const m = caja(w, h, 0.1, 0x15171b); m.position.set(x, y, -2.92); poner(m); }
  const piloto2 = caja(0.34, 0.07, 0.04, luz(0xe0584a, 1.4)); piloto2.position.set(3.2, 2.36, -2.92); poner(piloto2);
  const moldeCohete = cohete(); moldeCohete.position.set(-3.5, 0, -2.48); poner(moldeCohete);
  const papelera = cil(0.14, 0.12, 0.3, 0x3a3f46, 8); papelera.position.set(2.45, 0.15, -2.7); poner(papelera);

  // ----- Pared izquierda (x = −4): credenza con maquetas y carteles -----
  const credenza = caja(0.42, 0.78, 2.0, 0x4a525d); credenza.position.set(-3.72, 0.39, 1.65); poner(credenza);
  const tapaC = caja(0.46, 0.04, 2.04, 0xd8d3c4); tapaC.position.set(-3.72, 0.8, 1.65); poner(tapaC);
  for (const z of [1.0, 1.65, 2.3]) { const p = caja(0.02, 0.62, 0.58, 0x57606c); p.position.set(-3.505, 0.4, z); poner(p); const t = caja(0.02, 0.1, 0.02, 0xb8bcc0); t.position.set(-3.49, 0.52, z + 0.2); poner(t); }
  const sat = satelite(); sat.position.set(-3.72, 0.82, 1.15); sat.scale.setScalar(1.15); poner(sat);
  const glb = globo(); glb.position.set(-3.72, 0.82, 1.95); poner(glb);
  const luna = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 1), mat(0xbfc0c4)); luna.position.set(-3.7, 0.93, 2.35); poner(luna);
  const soporteL = cil(0.05, 0.06, 0.03, 0x3a3f46, 8); soporteL.position.set(-3.7, 0.835, 2.35); poner(soporteL);
  [[-0.5, texLuna()], [1.15, texOrbita()], [2.15, texMarte()]].forEach(([z, tex]) => { const c = cuadro(0.6, 0.84, tex); colocar(c, -3.93, 1.75, z, Math.PI / 2); poner(c); });

  // ----- Pared derecha (x = +4): vitrina de parches y plantas -----
  const vitrina = cuadro(1.7, 1.05, texVitrina(), 0x6b4a2e); colocar(vitrina, 3.93, 1.75, 0.1, -Math.PI / 2); poner(vitrina);
  const baldaV = caja(1.76, 0.03, 0.12, 0x6b4a2e); baldaV.position.set(3.88, 1.17, 0.1); poner(baldaV);
  const plantaD = planta(1.5, 5); plantaD.position.set(3.6, 0, -1.55); poner(plantaD);
  const cOrbita = cuadro(0.6, 0.84, texOrbita()); colocar(cOrbita, 3.93, 1.75, 1.7, -Math.PI / 2); poner(cOrbita);
  const cLuna = cuadro(0.6, 0.84, texLuna()); colocar(cLuna, 3.93, 1.75, -1.5, -Math.PI / 2); poner(cLuna);
}

// Piezas y texturas que reutiliza el decorado de la sala de control (decorado-control.js), para que las dos salas compartan estilo.
export { mat, luz, caja, cil, mulberry, lienzo, planoTex, cuadro, colocar, cohete, satelite, globo, planta,
  texParche, texVitrina, texTelemetria, texReloj, texSistema, texMarte, texLuna, texOrbita };
