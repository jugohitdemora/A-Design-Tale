// App del portátil "Cohete": selección de cohete como imagen de una CÁMARA DE SEGURIDAD de una plataforma de lanzamiento genérica.
// Cámara ortográfica isométrica sobre una plataforma low-poly (losa, foso de llamas, torre de servicio, pararrayos, vallas, camino, hierba)
// con el cohete candidato en pie. A la derecha, la "carpeta" con la ficha. Solo Vuelo y Mecánica elige (o cualquiera si el rol está vacante).
//
// Contrato del host: appCohete(c) devuelve el nodo raíz (100 % de su contenedor). El host reconstruye el DOM en cada cambio de estado, así que
// el WebGLRenderer y su canvas viven a nivel de módulo y se re-anexan en cada llamada. El bucle RAF se detiene cuando el canvas se desconecta.
// c.ui.cohetes = { i, foco }   (i = índice del cohete mostrado en c.mision.cohetes)
import * as THREE from 'three';
import { textos, tx, idioma, depto } from '../i18n.js';
import { T as TU } from '../textos.js';
import { h, dinero, puedoPor, lista } from '../pantallas/ui.js';

const T = textos({
  es: {
    cam: 'CAM 02 · PLATAFORMA 1', camId: 'CAM-02 / ISO', sim: 'IMAGEN SIMULADA', rec: 'REC',
    prev: 'Cohete anterior', next: 'Cohete siguiente', cambiando: 'CAMBIANDO CARGA…',
    sinCohetes: 'Sin cohetes disponibles.', sinWebgl: 'No se pudo iniciar el visor 3D.',
    carpeta: 'FICHA TÉCNICA', operador: 'Operador', capacidadA: (d) => `Capacidad a ${d}`, precio: 'Precio de lanzamiento',
    usoNasa: 'Uso en NASA', ninguno: 'ninguno', nota: 'Nota', elegir: 'SELECCIONAR', elegido: 'SELECCIONADO',
    soloRol: (r) => `Solo ${r} elige el cohete.`,
    margen: 'Margen de masa', masaNave: 'Masa de la nave', capacidad: 'Capacidad del cohete',
    libres: (n) => `Quedan ${n} kg libres.`, tolerancia: (n) => `Excede ${n} kg (tolerancia del 20 %). Habrá que recortar.`,
    exceso: (n) => `Excede ${n} kg. No pasa la revisión.`, sinCapacidad: 'Sin capacidad hacia este destino.',
    presupuesto: 'Presupuesto', sinCohete: 'sin cohete', conEste: 'con este cohete',
    presOk: (n) => `Quedan ${n}.`, presTol: (n) => `Excede ${n} (tolerancia). Habrá que recortar.`, presExc: (n) => `Excede ${n}. No pasa la revisión.`,
    config: 'Configuración', motoresF: 'Motores', materialesF: 'Materiales', registroF: 'Registro',
    teclas: 'Flechas ← → para cambiar de cohete', juego: '≈ valor de juego',
    cohetes: 'COHETES',
  },
  en: {
    cam: 'CAM 02 · PAD 1', camId: 'CAM-02 / ISO', sim: 'SIMULATED IMAGE', rec: 'REC',
    prev: 'Previous rocket', next: 'Next rocket', cambiando: 'SWAPPING PAYLOAD…',
    sinCohetes: 'No rockets available.', sinWebgl: 'The 3D viewer could not start.',
    carpeta: 'SPEC SHEET', operador: 'Operator', capacidadA: (d) => `Capacity to ${d}`, precio: 'Launch price',
    usoNasa: 'NASA use', ninguno: 'none', nota: 'Note', elegir: 'SELECT', elegido: 'SELECTED',
    soloRol: (r) => `Only ${r} chooses the rocket.`,
    margen: 'Mass margin', masaNave: 'Spacecraft mass', capacidad: 'Rocket capacity',
    libres: (n) => `${n} kg left.`, tolerancia: (n) => `Over by ${n} kg (20 % tolerance). Cut mass.`,
    exceso: (n) => `Over by ${n} kg. Review fails.`, sinCapacidad: 'No capacity to this destination.',
    presupuesto: 'Budget', sinCohete: 'no rocket', conEste: 'with this rocket',
    presOk: (n) => `${n} left.`, presTol: (n) => `Over by ${n} (tolerance). Cut cost.`, presExc: (n) => `Over by ${n}. Review fails.`,
    config: 'Configuration', motoresF: 'Engines', materialesF: 'Materials', registroF: 'Record',
    teclas: 'Arrow keys ← → switch rocket', juego: '≈ game value',
    cohetes: 'ROCKETS',
  },
});

// ---------------------------------------------------------------------------------------------------------------------
// Modelos de los cohetes REALES. Dimensiones en metros, aproximadas (fichas públicas de cada fabricante y Wikipedia), SOLO COMO
// PROPORCIÓN VISUAL: los números del juego salen de D.COHETES. Los colores son aproximados (foto típica de cada vehículo).
// Mismo estilo de siempre: cilindros de 10 caras y sombreado plano; los detalles pequeños son cajas y barras.
//
// nucleo: { seg, carena | punta, motores, acc }
//   seg: tramos de abajo arriba { h, r (radio inferior), r2 (radio superior, opcional), c (color) }.
//   carena: { r, hc (parte cilíndrica), hn (ojiva), c, tr (cono de transición si la cofia es más ancha que la última etapa) }.
//   motores: { n, centro, r, h } toberas bajo la base.   acc: { patas, rejillas: { y }, cinta: { y, h } } (accesorios del propulsor).
// lateral: propulsores { n, dist, ang0 | angs, r, seg, punta:{tipo,h,c}, acc }.
// ala: ala delta en el plano del cohete { env, cuerda, y }.   aletas: { n, ang0, y, c }.
// ---------------------------------------------------------------------------------------------------------------------
const BLANCO = '#ecebe6', NEGRO = '#2b2d31', GRIS = '#a9adb3', NARANJA = '#d9792f', PLATA = '#c9ccd1';
const GRAFITO = '#3c4048', CREMA = '#ddd9cc', COBRE = '#b9803f', ROJIZO = '#d1692b', GRIS_OSC = '#5b6066', CINTA = '#c3c6cb';
const ANG_CAM = Math.PI / 4;   // dirección (en el plano XZ) de la que mira la cámara isométrica

export const MODELOS = {
  // Falcon 9 Block 5: 70 m, Ø 3,66 m. Primera etapa blanca con entreetapa negra, 4 aletas de rejilla y 4 patas plegadas; cofia de 5,2 m.
  falcon9: { nombre: 'Falcon 9', ESC: 1,
    nucleo: {
      seg: [{ h: 0.9, r: 1.83, c: NEGRO }, { h: 35.5, r: 1.83, c: BLANCO }, { h: 4.8, r: 1.83, c: NEGRO }, { h: 12.6, r: 1.83, c: BLANCO }],
      carena: { r: 2.6, tr: 1.5, hc: 6.5, hn: 8, c: BLANCO }, motores: { n: 9, h: 1.2 },
      acc: { patas: 9, rejillas: { y: 34.5 }, cinta: { y: 3, h: 30 } } } },
  // Falcon Heavy: núcleo central como el Falcon 9 y dos propulsores laterales con ojiva en lugar de entreetapa (también con rejillas y patas).
  falconheavy: { nombre: 'Falcon Heavy', ESC: 1,
    nucleo: {
      seg: [{ h: 0.9, r: 1.83, c: NEGRO }, { h: 35.5, r: 1.83, c: BLANCO }, { h: 4.8, r: 1.83, c: NEGRO }, { h: 12.6, r: 1.83, c: BLANCO }],
      carena: { r: 2.6, tr: 1.5, hc: 6.5, hn: 8, c: BLANCO }, motores: { n: 9, h: 1.2 },
      acc: { patas: 9, rejillas: { y: 34.5 } } },
    lateral: { n: 2, dist: 3.95, ang0: ANG_CAM + Math.PI / 2, r: 1.83, seg: [{ h: 0.9, r: 1.83, c: NEGRO }, { h: 38, r: 1.83, c: BLANCO }], punta: { tipo: 'ojiva', h: 6.5, c: BLANCO },
      acc: { patas: 9, rejillas: { y: 36 } } } },
  // Vulcan Centaur VC4S: 61,6 m, Ø 5,4 m en toda la altura. Etapa de cobre, Centaur V plateado, cofia blanca de 15,5 m, 4 GEM 63XL (Ø 1,6 × 22 m).
  vulcan: { nombre: 'Vulcan Centaur', ESC: 1,
    nucleo: {
      seg: [{ h: 33.3, r: 2.7, c: COBRE }, { h: 1, r: 2.7, c: NEGRO }, { h: 9.7, r: 2.7, c: PLATA }],
      carena: { r: 2.7, hc: 9.5, hn: 8, c: BLANCO }, motores: { n: 2, centro: false, r: 0.7, h: 2.2 } },
    lateral: { n: 4, dist: 3.56, ang0: ANG_CAM, r: 0.81, seg: [{ h: 1, r: 0.81, c: NEGRO }, { h: 17.5, r: 0.81, c: CREMA }], punta: { tipo: 'ojiva', h: 3.5, c: CREMA } } },
  // Atlas V 541: 58 m. Primera etapa común (Ø 3,8 m) naranja, cofia de 5 m (Ø 5,4) con base cónica, 4 AJ-60A blancos (Ø 1,6 × 20 m) en dos pares.
  atlasv: { nombre: 'Atlas V', ESC: 1,
    nucleo: {
      seg: [{ h: 32.5, r: 1.9, c: ROJIZO }, { h: 0.8, r: 1.9, c: NEGRO }],
      carena: { r: 2.7, tr: 2.8, hc: 15, hn: 7, c: BLANCO }, motores: { n: 1, r: 1.1, h: 2.4 } },
    lateral: { angs: [-30, 30, 150, 210].map((d) => ANG_CAM + d * Math.PI / 180), dist: 2.73, r: 0.78, seg: [{ h: 0.8, r: 0.78, c: NEGRO }, { h: 16.6, r: 0.78, c: BLANCO }], punta: { tipo: 'cono', h: 3, c: BLANCO } } },
  // Electron: 18 m, Ø 1,2 m, todo en fibra de carbono negra con una banda plateada en la entreetapa.
  electron: { nombre: 'Electron', ESC: 2.2,
    nucleo: {
      seg: [{ h: 12.1, r: 0.6, c: NEGRO }, { h: 0.7, r: 0.6, c: GRIS }, { h: 2.5, r: 0.6, c: GRAFITO }],
      carena: { r: 0.6, hc: 0.9, hn: 1.7, c: NEGRO }, motores: { n: 9, h: 0.5 } } },
  // Pegasus XL: 17,6 m, Ø 1,28 m. Tres etapas blancas, ala delta de 6,7 m de envergadura y tres aletas de cola.
  pegasus: { nombre: 'Pegasus XL', ESC: 2.2,
    nucleo: {
      seg: [{ h: 10.3, r: 0.64, c: BLANCO }, { h: 0.4, r: 0.64, c: NEGRO }, { h: 2.9, r: 0.64, c: BLANCO }],
      carena: { r: 0.64, hc: 1.3, hn: 2.8, c: BLANCO }, motores: { n: 1, r: 0.4, h: 0.9 } },
    ala: { env: 6.7, cuerda: 3.7, y: 3.6, c: GRIS_OSC }, aletas: { n: 3, ang0: Math.PI / 2, y: 0.2, c: NEGRO } },
  // Minotaur IV: 23,9 m, Ø 2,34 m. Tres motores sólidos de Peacekeeper (el último más estrecho), cuarta etapa Orion 38 dentro de la cofia.
  minotaur4: { nombre: 'Minotaur IV', ESC: 1.6,
    nucleo: {
      seg: [{ h: 8.6, r: 1.17, c: CREMA }, { h: 0.5, r: 1.17, c: NEGRO }, { h: 5.6, r: 1.17, c: CREMA }, { h: 0.5, r: 1.17, c: NEGRO }, { h: 3.6, r: 0.9, c: CREMA }],
      carena: { r: 1.17, tr: 1.0, hc: 1.6, hn: 2.6, c: BLANCO }, motores: { n: 1, r: 0.7, h: 1.4 } } },
  // SLS Block 1: 98 m. Etapa central naranja (Ø 8,4 m, 4 RS-25), dos SRB de 5 segmentos (Ø 3,7 × 54 m), adaptador cónico, ICPS, Orion con torre de aborto.
  sls: { nombre: 'SLS', ESC: 1,
    nucleo: {
      seg: [{ h: 64.6, r: 4.2, c: NARANJA }, { h: 8.4, r: 4.2, r2: 2.55, c: NARANJA }, { h: 9, r: 2.55, c: BLANCO }, { h: 1.3, r: 2.55, r2: 2.5, c: GRIS }, { h: 4, r: 2.5, c: PLATA },
        { h: 3.5, r: 2.5, r2: 0.9, c: BLANCO }, { h: 5, r: 0.55, c: PLATA }],
      carena: null, punta: { tipo: 'cono', h: 2.2, r: 0.55, c: NEGRO }, motores: { n: 4, centro: false, r: 0.9, h: 3 } },
    lateral: { n: 2, dist: 6.35, ang0: ANG_CAM + Math.PI / 2, r: 1.85, seg: [{ h: 3, r: 1.85, c: GRIS_OSC }, { h: 46.5, r: 1.85, c: BLANCO }], punta: { tipo: 'ojiva', h: 4.5, c: CREMA } } },
};

const ESC_MUNDO = 0.16;        // metros → unidades de escena (cohete de 70 m ≈ 11 u)
const ALTURA_MONTAJE = 1.4;    // cota de la base del cohete sobre el suelo

// ---------------------------------------------------------------------------------------------------------------------
// Utilidades 3D
// ---------------------------------------------------------------------------------------------------------------------
const mats = new Map();
const mat = (hex) => {
  if (!mats.has(hex)) mats.set(hex, new THREE.MeshLambertMaterial({ color: hex, flatShading: true }));
  return mats.get(hex);
};
const SEG = 10;

function cil(rb, rt, alto, color, y, seg = SEG) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, alto, seg), mat(color));
  m.position.y = y + alto / 2;
  return m;
}
function ojiva(r, alto, color, y, rBase = r) {
  const pts = [];
  const n = 8;
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector2(Math.max(0.001, rBase * Math.pow(Math.cos(t * Math.PI / 2), 0.7)), t * alto)); }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, SEG), mat(color));
  m.position.y = y;
  return m;
}
const caja = (w, a, p, color, x, y, z) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, a, p), mat(color));
  m.position.set(x, y + a / 2, z);
  return m;
};
// Barra entre dos puntos (para el enrejado)
function barra(p1, p2, g, color) {
  const a = new THREE.Vector3(...p1), b = new THREE.Vector3(...p2);
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.BoxGeometry(g, g, len), mat(color));
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.lookAt(b);
  return m;
}
// Caja pegada al costado de un cilindro: esp = grosor radial, ancho = tangencial, a la dirección `ang` (plano XZ).
function bloqueRadial(ang, rad, y, ancho, alto, esp, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(esp, alto, ancho), mat(color));
  m.position.set(Math.cos(ang) * rad, y + alto / 2, Math.sin(ang) * rad);
  m.rotation.y = -ang;
  return m;
}
// Plancha plana (ala, aletas) a partir de un contorno 2D, centrada en su grosor.
function placa(pts, grosor, color) {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth: grosor, bevelEnabled: false });
  geo.translate(0, 0, -grosor / 2);
  return new THREE.Mesh(geo, mat(color));
}

// Toberas bajo la base: una, o un anillo (con o sin tobera central).
function toberas(m, r0) {
  const g = new THREE.Group();
  const n = m?.n ?? 1, h = m?.h ?? 1.4;
  const pos = m?.centro === false ? [] : [[0, 0]];
  const k = n - pos.length;
  const rb = m?.r ?? (n > 1 ? r0 * 0.22 : r0 * 0.5);
  const d = n > 2 ? r0 * (m?.centro === false ? 0.5 : 0.62) : r0 * 0.5;
  for (let i = 0; i < k; i++) { const a = (i / k) * Math.PI * 2 + Math.PI / 4; pos.push([Math.cos(a) * d, Math.sin(a) * d]); }
  for (const [x, z] of pos) {
    const t = cil(rb, rb * 0.4, h, NEGRO, -h + 0.1, 8);
    t.position.x = x; t.position.z = z;
    g.add(t);
  }
  return g;
}

// Accesorios de un propulsor de Falcon: patas plegadas (negras, pegadas al costado), aletas de rejilla en lo alto y la canaleta lateral.
function accesorios(g, r, a) {
  if (a.patas) {
    for (let i = 0; i < 4; i++) {
      const ang = Math.PI / 4 + i * Math.PI / 2, c = Math.cos(ang), s = Math.sin(ang);
      g.add(barra([c * (r + 0.9), 0.5, s * (r + 0.9)], [c * (r + 0.3), a.patas, s * (r + 0.3)], 0.55, NEGRO));
      g.add(bloqueRadial(ang, r + 0.95, 0, 1, 0.8, 1, NEGRO));   // pie
    }
  }
  if (a.rejillas) {
    for (let i = 0; i < 4; i++) g.add(bloqueRadial(i * Math.PI / 2, r + 0.2, a.rejillas.y, 1.9, 1.6, 0.35, GRAFITO));
  }
  if (a.cinta) g.add(bloqueRadial(ANG_CAM + 0.45, r + 0.08, a.cinta.y, 0.55, a.cinta.h, 0.18, CINTA));
}

function nucleo(cfg) {
  const n = new THREE.Group();
  let y = 0;
  const r0 = cfg.seg[0].r;
  n.add(toberas(cfg.motores, r0));
  for (const s of cfg.seg) { n.add(cil(s.r, s.r2 ?? s.r, s.h, s.c, y)); y += s.h; }
  const ult = cfg.seg[cfg.seg.length - 1];
  if (cfg.carena) {
    const k = cfg.carena, rUlt = ult.r2 ?? ult.r;
    if (k.r > rUlt + 0.01) { const tr = k.tr ?? 1.5; n.add(cil(rUlt, k.r, tr, k.c, y)); y += tr; }
    n.add(cil(k.r, k.r, k.hc, k.c, y)); y += k.hc;
    n.add(ojiva(k.r, k.hn, k.c, y)); y += k.hn;
  } else if (cfg.punta) {
    n.add(cil(cfg.punta.r ?? 0.3, 0.02, cfg.punta.h, cfg.punta.c, y)); y += cfg.punta.h;
  }
  if (cfg.acc) accesorios(n, r0, cfg.acc);
  return { grupo: n, alto: y };
}

export function construirCohete(id) {
  const spec = MODELOS[id] ?? MODELOS.falcon9;
  const g = new THREE.Group();
  const { grupo, alto } = nucleo(spec.nucleo);
  g.add(grupo);
  let ancho = spec.nucleo.seg[0].r;
  if (spec.lateral) {
    const l = spec.lateral;
    const angs = l.angs ?? Array.from({ length: l.n }, (_, i) => l.ang0 + (i / l.n) * Math.PI * 2);
    for (const a of angs) {
      const b = new THREE.Group();
      let y = 0;
      b.add(toberas({ n: 1, r: l.r * 0.5, h: 1 }, l.r));
      for (const s of l.seg) { b.add(cil(s.r, s.r2 ?? s.r, s.h, s.c, y)); y += s.h; }
      if (l.punta.tipo === 'ojiva') b.add(ojiva(l.r, l.punta.h, l.punta.c, y));
      else b.add(cil(l.r, 0.05, l.punta.h, l.punta.c, y));
      if (l.acc) accesorios(b, l.r, l.acc);
      b.position.set(Math.cos(a) * l.dist, 0, Math.sin(a) * l.dist);
      g.add(b);
    }
    ancho = l.dist + l.r;
  }
  if (spec.ala) {
    // Ala delta de 45° en el plano que contiene el eje del cohete (la envergadura va en X, el grosor en Z).
    const w = spec.ala, r = spec.nucleo.seg[0].r, mit = w.env / 2, yb = w.y, yt = yb + w.cuerda, yl = yt - (mit - r);
    const ala = placa([[-r * 0.7, yt], [-mit, yl], [-mit, yb], [mit, yb], [mit, yl], [r * 0.7, yt]], 0.2, w.c ?? GRAFITO);
    g.add(ala);
    ancho = Math.max(ancho, mit);
  }
  if (spec.aletas) {
    const f = spec.aletas, r = spec.nucleo.seg[0].r;
    for (let i = 0; i < f.n; i++) {
      const a = f.ang0 + (i / f.n) * Math.PI * 2;
      const p = placa([[r - 0.1, f.y], [r + 1.6, f.y + 0.6], [r + 1.6, f.y + 1.8], [r - 0.1, f.y + 2.5]], 0.14, f.c);
      p.rotation.y = -a;
      g.add(p);
    }
  }
  g.scale.setScalar(ESC_MUNDO * (spec.ESC ?? 1));
  const sop = new THREE.Group();
  sop.add(g);
  sop.userData = { alto: alto * ESC_MUNDO * (spec.ESC ?? 1), ancho: ancho * ESC_MUNDO * (spec.ESC ?? 1) };
  return sop;
}

// ---------------------------------------------------------------------------------------------------------------------
// Escenario: plataforma genérica (no es ninguna instalación real)
// ---------------------------------------------------------------------------------------------------------------------
function prng(semilla) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function construirEscenario(escena) {
  const CONC = '#b9b6ac', CONC2 = '#9d9a90', OSC = '#3a3d42', HIERBA = '#6b8f4e', HIERBA2 = '#587a3e', CAMINO = '#4a4c50', TORRE = '#b4543a', VALLA = '#7a7e83';
  const e = new THREE.Group();
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), mat(HIERBA));
  suelo.rotation.x = -Math.PI / 2;
  e.add(suelo);
  // Losas con foso de llamas entre ambas (a lo largo de Z)
  e.add(caja(7.4, 0.5, 20, CONC, -5.3, 0, 0), caja(7.4, 0.5, 20, CONC, 5.3, 0, 0));
  e.add(caja(3.2, 0.05, 20.2, OSC, 0, 0, 0));
  for (const z of [-9.9, 9.9]) e.add(caja(3.2, 0.9, 0.3, CONC2, 0, 0, z));       // cabeceras del foso
  // Mesa de lanzamiento sobre el foso
  e.add(caja(5.6, 0.4, 5.6, CONC2, 0, ALTURA_MONTAJE - 0.4, 0));
  for (const [x, z] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) e.add(caja(0.6, ALTURA_MONTAJE - 0.9, 0.6, CONC2, x, 0.5, z));
  // Torre de servicio (enrejado)
  const torre = new THREE.Group();
  const TH = 16, TW = 1.1, px = -5.2, pz = 0;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) torre.add(caja(0.2, TH, 0.2, TORRE, px + sx * TW, 0.5, pz + sz * TW));
  const nivel = 2;
  for (let y = 0; y <= TH; y += nivel) {
    const yy = 0.5 + y;
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let i = 0; i < 4; i++) {
      const a = c[i], b = c[(i + 1) % 4];
      torre.add(barra([px + a[0] * TW, yy, pz + a[1] * TW], [px + b[0] * TW, yy, pz + b[1] * TW], 0.1, TORRE));
      if (y < TH) {
        const flip = ((y / nivel) % 2) ? 1 : 0;
        torre.add(barra([px + a[0] * TW, yy + (flip ? nivel : 0), pz + a[1] * TW], [px + b[0] * TW, yy + (flip ? 0 : nivel), pz + b[1] * TW], 0.08, TORRE));
      }
    }
  }
  torre.add(caja(2.9, 0.3, 2.9, CONC2, px, TH + 0.5, pz));
  for (const ay of [5.5, 9.5, 13]) torre.add(caja(3.6, 0.35, 0.8, GRIS_ARM, px + 2.6, ay, pz));
  e.add(torre);
  // Pararrayos con cable
  const puntas = [];
  for (const [x, z] of [[-13, -12], [13, -12], [-13, 12], [13, 12]]) {
    const m = cil(0.25, 0.1, 22, '#cfd2d6', 0, 6); m.position.set(x, 11.5, z);
    e.add(m);
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), mat('#e0443a')); b.position.set(x, 23, z);
    e.add(b); puntas.push(new THREE.Vector3(x, 22.9, z));
  }
  const pts = [];
  for (let i = 0; i < puntas.length; i++) { pts.push(puntas[i], puntas[(i + 1) % puntas.length]); }
  e.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#555a60' })));
  // Valla perimetral con una puerta hacia el camino (+X)
  const L = 17;
  for (let i = -L; i <= L; i += 2) {
    for (const [x, z] of [[i, -L], [i, L], [-L, i], [L, i]]) {
      if (x === L && Math.abs(z) < 3) continue;
      e.add(caja(0.15, 1.5, 0.15, VALLA, x, 0, z));
    }
  }
  for (const y of [0.5, 1.2]) {
    e.add(caja(2 * L, 0.06, 0.06, VALLA, 0, y, -L), caja(2 * L, 0.06, 0.06, VALLA, 0, y, L), caja(0.06, 0.06, 2 * L, VALLA, -L, y, 0));
    e.add(caja(0.06, 0.06, L - 3, VALLA, L, y, -(L + 3) / 2), caja(0.06, 0.06, L - 3, VALLA, L, y, (L + 3) / 2));
  }
  // Camino con rayas
  e.add(caja(60, 0.04, 5, CAMINO, 40, 0, 0));
  e.add(caja(11, 0.04, 3, CAMINO, 14, 0, 0));
  for (let x = 16; x < 70; x += 4) e.add(caja(1.8, 0.05, 0.18, '#d8d27a', x, 0, 0));
  // Edificio de control, depósitos y un coche
  e.add(caja(5, 2.6, 3.4, '#d6d0c3', 10, 0, -9), caja(5.2, 0.25, 3.6, CONC2, 10, 2.6, -9));
  for (const [x, z] of [[-12, 8], [-9, 10]]) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 1), mat('#e4e4e0')); s.position.set(x, 1.8, z); e.add(s); }
  e.add(caja(1.6, 0.7, 0.8, '#c9453a', 24, 0.2, 1.2), caja(0.8, 0.5, 0.78, '#2a2e33', 24.2, 0.9, 1.2));
  // Hierba
  const rnd = prng(7);
  for (let i = 0; i < 90; i++) {
    const x = (rnd() - 0.5) * 90, z = (rnd() - 0.5) * 90;
    if (Math.abs(x) < 19 && Math.abs(z) < 19) continue;
    if (x > 0 && Math.abs(z) < 4) continue;
    const r = 0.5 + rnd() * 1.4;
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat(rnd() < 0.5 ? HIERBA2 : '#4c6d37'));
    m.scale.y = 0.55; m.position.set(x, r * 0.3, z); m.rotation.y = rnd() * 6;
    e.add(m);
  }
  escena.add(e);
}
const GRIS_ARM = '#8a8f96';

// ---------------------------------------------------------------------------------------------------------------------
// Contexto 3D de módulo: un solo renderer y un solo canvas para toda la vida de la página
// ---------------------------------------------------------------------------------------------------------------------
let R = null;
const PIX = 1.6;               // el canvas se renderiza a menor resolución y se amplía (aspecto de cámara)
const MEDIA_ALTURA = 11.5;     // semialtura visible de la cámara ortográfica

function contexto() {
  if (R) return R;
  try {
    const canvas = document.createElement('canvas');
    canvas.className = 'cam-canvas';
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    renderer.setPixelRatio(1);
    renderer.setClearColor('#a9d0e0');
    const escena = new THREE.Scene();
    escena.add(new THREE.HemisphereLight('#fff4de', '#5f7a4a', 1.15));
    const sol = new THREE.DirectionalLight('#fff0d0', 1.6);
    sol.position.set(-20, 40, 14);
    escena.add(sol);
    construirEscenario(escena);
    const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 300);
    const objetivo = new THREE.Vector3(0, 6.2, 0);
    const soporte = new THREE.Group();
    soporte.position.y = ALTURA_MONTAJE;
    escena.add(soporte);
    // Gancho de grúa (solo visible mientras cambia el cohete)
    const gancho = new THREE.Group();
    gancho.add(caja(0.05, 40, 0.05, '#222', 0, 0, 0), caja(0.5, 0.3, 0.5, '#d9a42b', 0, -0.1, 0));
    gancho.visible = false;
    soporte.add(gancho);
    R = { canvas, renderer, escena, camara, objetivo, soporte, gancho, actual: null, objetivoId: null, anim: null, ro: null, corriendo: false, reloj: null, relojTxt: '', rec: null, feed: null, ancho: 0, alto: 0 };
    ajustarCamara(1.6);
  } catch (err) {
    console.error('camara-lanzamiento: sin WebGL', err);
    R = { error: true };
  }
  return R;
}

function ajustarCamara(aspecto) {
  const { camara, objetivo } = R;
  camara.left = -MEDIA_ALTURA * aspecto; camara.right = MEDIA_ALTURA * aspecto;
  camara.top = MEDIA_ALTURA; camara.bottom = -MEDIA_ALTURA;
  camara.updateProjectionMatrix();
  camara.position.set(objetivo.x + 40, objetivo.y + 40, objetivo.z + 40);
  camara.lookAt(objetivo);
}

function ajustarTamano() {
  if (!R || R.error || !R.feed) return;
  const w = R.feed.clientWidth, hh = R.feed.clientHeight;
  if (!w || !hh || (w === R.ancho && hh === R.alto)) return;
  R.ancho = w; R.alto = hh;
  R.renderer.setSize(Math.max(2, Math.round(w / PIX)), Math.max(2, Math.round(hh / PIX)), false);
  ajustarCamara(w / hh);
}

const ease = (t) => 1 - Math.pow(1 - t, 3);
const SALIDA = 0.55, ENTRADA = 0.75, ALTURA_GRUA = 20;

function ponerCohete(id) {
  if (R.actual) { R.soporte.remove(R.actual.grupo); R.actual.grupo.traverse((o) => o.geometry?.dispose?.()); }
  const g = construirCohete(id);
  R.soporte.add(g);
  R.actual = { id, grupo: g };
}

function fijarObjetivo(id) {
  R.objetivoId = id;
  if (!R.actual) ponerCohete(id);
  else if (R.actual.id !== id && !R.anim) iniciarCambio();
}

function iniciarCambio() {
  R.anim = { fase: 'sale', t: 0 };
  R.gancho.visible = true;
  if (R.feed) { R.feed.classList.remove('cambio'); void R.feed.offsetWidth; R.feed.classList.add('cambio'); }
}

const pad = (n) => String(n).padStart(2, '0');
function marcaTiempo() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

let ultimo = 0;
function bucle(t) {
  if (!R || R.error) return;
  if (!R.canvas.isConnected) { R.corriendo = false; return; }
  requestAnimationFrame(bucle);
  const dt = Math.min(0.1, (t - ultimo) / 1000 || 0);
  ultimo = t;
  ajustarTamano();
  if (R.anim) {
    const a = R.anim;
    a.t += dt;
    if (a.fase === 'sale') {
      const k = Math.min(1, a.t / SALIDA);
      R.actual.grupo.position.y = ease(k) * ALTURA_GRUA * k;
      R.gancho.position.y = R.actual.grupo.position.y + R.actual.grupo.userData.alto + 0.6;
      if (k >= 1) { ponerCohete(R.objetivoId); a.fase = 'entra'; a.t = 0; R.actual.grupo.position.y = ALTURA_GRUA; }
    } else {
      const k = Math.min(1, a.t / ENTRADA);
      R.actual.grupo.position.y = (1 - ease(k)) * ALTURA_GRUA;
      R.gancho.position.y = R.actual.grupo.position.y + R.actual.grupo.userData.alto + 0.6;
      if (k >= 1) {
        R.anim = null; R.gancho.visible = false;
        if (R.actual.id !== R.objetivoId) iniciarCambio();
      }
    }
  }
  // Balanceo mínimo de la cámara (como un soporte de pared)
  const s = t / 1000;
  R.camara.position.set(R.objetivo.x + 40 + Math.sin(s * 0.5) * 0.12, R.objetivo.y + 40 + Math.sin(s * 0.37) * 0.08, R.objetivo.z + 40);
  R.camara.lookAt(R.objetivo);
  R.renderer.render(R.escena, R.camara);
  if (R.reloj) {
    const m = marcaTiempo();
    if (m !== R.relojTxt) { R.relojTxt = m; R.reloj.textContent = m; }
  }
}

function arrancar() {
  if (!R || R.error || R.corriendo) return;
  R.corriendo = true;
  ultimo = performance.now();
  requestAnimationFrame(bucle);
}

// ---------------------------------------------------------------------------------------------------------------------
// Interfaz
// ---------------------------------------------------------------------------------------------------------------------
const fmt = (n, d = 0) => (Number.isFinite(n) ? n.toLocaleString(idioma() === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: d }) : '-');
// Valor {v, conf, ec}: sin código de fuente; "≈" en estimados con la explicación como ayuda; dinero con `dinero`.
function val(c, x, unidad, dineroSi = false) {
  if (x == null) return h('span', { class: 'val tenue' }, '-');
  const n = numero(c, x);
  const est = typeof x === 'object' && (x.conf === 'EST' || x.conf === 'JUEGO' || x.v == null);
  return h('span', { class: 'val' + (est ? ' juego' : ''), title: est ? (tx(x.ec) || (TU.estimateValue ?? TU.gameValue)) : null },
    (est ? '≈ ' : '') + (dineroSi ? dinero(n) : fmt(n, 1) + (unidad ? ' ' + unidad : '')));
}
const numero = (c, x) => (c.motor?.num ? c.motor.num(x) : typeof x === 'number' ? x : x?.v ?? x?.juego ?? 0);
const estadoRatio = (c, r) => (c.motor?.estadoDeRatio ? c.motor.estadoDeRatio(r) : r <= 1 ? 'ok' : r <= 1.2 ? 'tolerancia' : 'exceso');

function medidor(ratio, estado) {
  const pct = Math.min(1.4, Math.max(0, Number.isFinite(ratio) ? ratio : 1.4)) / 1.4 * 100;
  return h('div', { class: 'cam-medidor', role: 'img', 'aria-label': `${fmt(ratio * 100)} %` },
    h('div', { class: 'zona ok' }), h('div', { class: 'zona tol' }), h('div', { class: 'zona exc' }),
    h('div', { class: 'relleno ' + estado, style: `width:${pct}%` }), h('i', { class: 'marca m100' }), h('i', { class: 'marca m120' }));
}

function panelMargen(c, k, cap) {
  const res = c.motor?.resumen ? (() => { try { return c.motor.resumen(c.e, c.D); } catch { return null; } })() : null;
  const usada = res?.barras?.masa?.usado ?? 0;
  const ratio = cap > 0 ? usada / cap : Infinity;
  const est = estadoRatio(c, ratio);
  const dif = cap - usada;
  const msg = cap <= 0 ? T.sinCapacidad : est === 'ok' ? T.libres(fmt(dif)) : est === 'tolerancia' ? T.tolerancia(fmt(-dif)) : T.exceso(fmt(-dif));

  const pb = res?.barras?.presupuesto;
  const elegido = c.e?.porRol?.vuelo?.cohete;
  const precioElegido = elegido ? numero(c, c.D?.COHETES?.[elegido]?.precio) : 0;
  const sin = (pb?.usado ?? 0) - precioElegido;
  const pk = numero(c, k.precio);
  const con = sin + pk, lim = pb?.limite ?? 0;
  const rp = lim > 0 ? con / lim : Infinity;
  const ep = estadoRatio(c, rp);
  const mp = ep === 'ok' ? T.presOk(dinero(lim - con)) : ep === 'tolerancia' ? T.presTol(dinero(con - lim)) : T.presExc(dinero(con - lim));

  return h('div', { class: 'cam-panel' },
    h('div', { class: 'cam-bloque' },
      h('h4', {}, T.margen),
      medidor(ratio, est),
      h('p', { class: 'cifras' }, `${fmt(usada)} kg / ${fmt(cap)} kg`, h('b', { class: est }, Number.isFinite(ratio) ? ` ${fmt(ratio * 100)} %` : '')),
      h('p', { class: 'msg ' + est }, msg)),
    h('div', { class: 'cam-bloque' },
      h('h4', {}, T.presupuesto),
      medidor(rp, ep),
      h('p', { class: 'cifras', title: `${T.sinCohete}: ${dinero(sin)} · ${T.conEste}: ${dinero(con)}` }, `${dinero(con)} / ${dinero(lim)}`, h('b', { class: ep }, Number.isFinite(rp) ? ` ${fmt(rp * 100)} %` : '')),
      h('p', { class: 'msg ' + ep }, mp)));
}

export function appCohete(c) {
  const m = c.mision;
  const lst = lista(m?.cohetes).map((id) => c.D?.COHETES?.[id]).filter(Boolean);
  const raiz = h('div', { class: 'cam-app', tabindex: '0' });
  if (!lst.length) { raiz.append(h('p', { class: 'cam-vacio' }, T.sinCohetes)); return raiz; }

  const elegido = c.e?.porRol?.vuelo?.cohete;
  const u = (c.ui.cohetes ??= { i: Math.max(0, lst.findIndex((x) => x.id === elegido)), foco: false });
  const i = ((u.i % lst.length) + lst.length) % lst.length;
  const k = lst[i];
  const puedo = puedoPor(c, 'vuelo');
  const esElegido = k.id === elegido;
  const mover = (d) => { u.i = (i + d + lst.length) % lst.length; c.repintar(); };
  const cap = numero(c, k.capacidad?.[m.destino]);
  const destino = tx(m.cuerpo, m.destino ?? '?');

  const ctx = contexto();
  const feed = h('div', { class: 'cam-feed', title: T.sim });
  if (ctx.error) feed.append(h('p', { class: 'cam-vacio' }, T.sinWebgl));
  else {
    feed.append(ctx.canvas);
    ctx.feed = feed;
    ctx.reloj = null;
    ctx.relojTxt = '';
    if (ctx.ro) ctx.ro.disconnect();
    ctx.ro = new ResizeObserver(() => ajustarTamano());
    ctx.ro.observe(feed);
    ctx.ancho = 0;
    fijarObjetivo(k.id);
    if (ctx.anim && ctx.anim.fase) feed.classList.add('cambio');
    arrancar();
  }
  feed.append(
    h('div', { class: 'cam-ruido', 'aria-hidden': 'true' }), h('div', { class: 'cam-lineas', 'aria-hidden': 'true' }), h('div', { class: 'cam-vineta', 'aria-hidden': 'true' }),
    h('div', { class: 'cam-sup izq' }, T.cam),
    h('div', { class: 'cam-sup der' }, h('i', { class: 'rec-punto' }), T.rec),
    h('div', { class: 'cam-cambio' }, T.cambiando),
    h('button', { class: 'boton cam-flecha izq', type: 'button', 'aria-label': T.prev, onclick: () => mover(-1) }, '◀'),
    h('button', { class: 'boton cam-flecha der', type: 'button', 'aria-label': T.next, onclick: () => mover(1) }, '▶'));

  const ficha = h('div', { class: 'cam-carpeta' },
    h('div', { class: 'solapa' }, `${T.cohetes} ${i + 1}/${lst.length}`),
    h('div', { class: 'hoja' },
      h('h3', {}, tx(k.nombre) || k.id),
      esElegido ? h('span', { class: 'sello' }, T.elegido) : null,
      h('dl', {},
        h('dt', {}, T.operador), h('dd', {}, k.operador ?? '-'),
        h('dt', {}, T.capacidadA(destino)), h('dd', {}, val(c, k.capacidad?.[m.destino], 'kg')),
        h('dt', {}, T.precio), h('dd', {}, val(c, k.precio, '', true)),
        h('dt', {}, T.usoNasa), h('dd', {}, tx(k.usoNasaT) || k.usoNasa || T.ninguno),
        [['configuracion', T.config], ['motores', T.motoresF], ['materiales', T.materialesF], ['registro', T.registroF]]
          .filter(([f]) => tx(k[f])).map(([f, et]) => [h('dt', {}, et), h('dd', { class: 'dato' }, tx(k[f]))])),
      k.nota ? h('p', { class: 'nota' }, tx(k.nota)) : null),
    h('div', { class: 'acciones' },
      h('button', {
        class: 'boton primario grande ancho', type: 'button', disabled: !puedo || esElegido, title: T.teclas,
        onclick: () => c.enviar('elegirCohete', { id: k.id }),
      }, esElegido ? T.elegido : T.elegir),
      puedo ? null : h('p', { class: 'aviso' }, T.soloRol(depto('vuelo')))));

  raiz.append(feed, panelMargen(c, k, cap), ficha);
  raiz.addEventListener('focus', () => { u.foco = true; });
  raiz.addEventListener('blur', () => { if (raiz.isConnected) u.foco = false; });
  raiz.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); mover(-1); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); mover(1); }
  });
  if (u.foco) requestAnimationFrame(() => { if (raiz.isConnected) raiz.focus({ preventScroll: true }); });
  return raiz;
}

export default appCohete;
