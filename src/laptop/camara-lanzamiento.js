// App del portátil "Cohete": selección de cohete como imagen de una CÁMARA DE SEGURIDAD de una plataforma de lanzamiento genérica.
// Cámara ortográfica isométrica sobre una plataforma low-poly (losa, foso de llamas, torre de servicio, pararrayos, vallas, camino, hierba)
// con el cohete candidato en pie. A la derecha, la "carpeta" con la ficha. Solo Vuelo y Mecánica elige (o cualquiera si el rol está vacante).
//
// Contrato del host: appCohete(c) devuelve el nodo raíz (100 % de su contenedor). El host reconstruye el DOM en cada cambio de estado, así que
// el WebGLRenderer y su canvas viven a nivel de módulo y se re-anexan en cada llamada. El bucle RAF se detiene cuando el canvas se desconecta.
// c.ui.cohetes = { i, foco }   (i = índice del cohete mostrado en c.mision.cohetes)
import * as THREE from 'three';
import { textos, tx, idioma, depto } from '../i18n.js';
import { h, valor, puedoPor, lista } from '../pantallas/ui.js';

const T = textos({
  es: {
    cam: 'CAM 02 · PLATAFORMA 1', camId: 'CAM-02 / ISO', sim: 'IMAGEN SIMULADA', rec: 'REC',
    prev: 'Cohete anterior', next: 'Cohete siguiente', cambiando: 'CAMBIANDO CARGA…',
    sinCohetes: 'Esta misión no tiene cohetes disponibles.', sinWebgl: 'No se pudo iniciar el visor 3D en este navegador.',
    carpeta: 'FICHA TÉCNICA', operador: 'Operador', capacidadA: (d) => `Capacidad a ${d}`, precio: 'Precio de lanzamiento',
    usoNasa: 'Uso en NASA', ninguno: 'ninguno', nota: 'Nota', elegir: 'SELECCIONAR', elegido: 'SELECCIONADO',
    soloRol: (r) => `Solo ${r} puede elegir el cohete. Tú puedes mirar.`,
    margen: 'Margen de masa', masaNave: 'Masa actual de la nave (piezas + ruta + contingencias)', capacidad: 'Capacidad del cohete',
    libres: (n) => `Quedan ${n} kg libres.`, tolerancia: (n) => `Excede ${n} kg: pasa la revisión con aviso (tolerancia del 20 %) pero habrá que recortar.`,
    exceso: (n) => `Excede ${n} kg: no pasaría la revisión.`, sinCapacidad: 'Este cohete no tiene capacidad hacia este destino.',
    presupuesto: 'Impacto en el presupuesto', musd: 'M USD', sinCohete: 'sin cohete', conEste: 'con este cohete',
    presOk: (n) => `Quedan ${n} M USD.`, presTol: (n) => `Se pasa ${n} M USD: tolerancia, habrá que recortar.`, presExc: (n) => `Se pasa ${n} M USD: no pasaría la revisión.`,
    teclas: 'Flechas ← → para cambiar de cohete', juego: '≈ valor de juego',
    cohetes: 'COHETES',
  },
  en: {
    cam: 'CAM 02 · PAD 1', camId: 'CAM-02 / ISO', sim: 'SIMULATED IMAGE', rec: 'REC',
    prev: 'Previous rocket', next: 'Next rocket', cambiando: 'SWAPPING PAYLOAD…',
    sinCohetes: 'This mission has no rockets available.', sinWebgl: 'The 3D viewer could not start in this browser.',
    carpeta: 'SPEC SHEET', operador: 'Operator', capacidadA: (d) => `Capacity to ${d}`, precio: 'Launch price',
    usoNasa: 'NASA use', ninguno: 'none', nota: 'Note', elegir: 'SELECT', elegido: 'SELECTED',
    soloRol: (r) => `Only ${r} can choose the rocket. You can look.`,
    margen: 'Mass margin', masaNave: 'Current spacecraft mass (parts + route + contingencies)', capacidad: 'Rocket capacity',
    libres: (n) => `${n} kg left.`, tolerancia: (n) => `Over by ${n} kg: passes review with a warning (20 % tolerance) but you will have to cut.`,
    exceso: (n) => `Over by ${n} kg: would not pass review.`, sinCapacidad: 'This rocket has no capacity to this destination.',
    presupuesto: 'Budget impact', musd: 'M USD', sinCohete: 'no rocket', conEste: 'with this rocket',
    presOk: (n) => `${n} M USD left.`, presTol: (n) => `Over by ${n} M USD: tolerance, you will have to cut.`, presExc: (n) => `Over by ${n} M USD: would not pass review.`,
    teclas: 'Arrow keys ← → switch rocket', juego: '≈ game value',
    cohetes: 'ROCKETS',
  },
});

// ---------------------------------------------------------------------------------------------------------------------
// Modelos. Dimensiones en metros SOLO COMO PROPORCIÓN VISUAL (aproximadas, de memoria); los números del juego salen de D.COHETES.
// seg: tramos de abajo arriba { h, r (radio inferior), r2 (radio superior, opcional), c (color) }.
// carena: { r, hc (parte cilíndrica), hn (ojiva), c }.  lateral: propulsores { n, dist, ang0, r, seg, punta:{tipo,h,c} }.
// ---------------------------------------------------------------------------------------------------------------------
const BLANCO = '#ecebe6', NEGRO = '#2b2d31', GRIS = '#a9adb3', NARANJA = '#d9792f', PLATA = '#c9ccd1', AZUL = '#3b5a8a', MARRON = '#b46a3c';

export const MODELOS = {
  falcon9: { nombre: 'Falcon 9', ESC: 1,
    nucleo: { seg: [{ h: 41, r: 1.85, c: BLANCO }, { h: 2, r: 1.85, c: NEGRO }, { h: 14, r: 1.85, c: BLANCO }], carena: { r: 2.6, hc: 5, hn: 7, c: BLANCO } }, patas: true },
  falconheavy: { nombre: 'Falcon Heavy', ESC: 1,
    nucleo: { seg: [{ h: 41, r: 1.85, c: BLANCO }, { h: 2, r: 1.85, c: NEGRO }, { h: 14, r: 1.85, c: BLANCO }], carena: { r: 2.6, hc: 5, hn: 7, c: BLANCO } },
    lateral: { n: 2, dist: 3.75, ang0: 0, r: 1.85, seg: [{ h: 41, r: 1.85, c: BLANCO }], punta: { tipo: 'ojiva', h: 7, c: NEGRO } }, patas: true },
  vulcan: { nombre: 'Vulcan Centaur', ESC: 1,
    nucleo: { seg: [{ h: 33, r: 2.7, c: AZUL }, { h: 1.5, r: 2.7, c: NEGRO }, { h: 12, r: 2.7, c: PLATA }], carena: { r: 2.7, hc: 8, hn: 7, c: BLANCO } },
    lateral: { n: 4, dist: 3.55, ang0: Math.PI / 4, r: 0.8, seg: [{ h: 21, r: 0.8, c: GRIS }], punta: { tipo: 'cono', h: 3, c: GRIS } } },
  atlasv: { nombre: 'Atlas V', ESC: 1,
    nucleo: { seg: [{ h: 32, r: 1.9, c: NARANJA }, { h: 1, r: 1.9, c: NEGRO }, { h: 12, r: 1.5, c: PLATA }], carena: { r: 2.5, hc: 7, hn: 6, c: BLANCO } },
    lateral: { n: 2, dist: 2.75, ang0: Math.PI / 2, r: 0.8, seg: [{ h: 17, r: 0.8, c: BLANCO }], punta: { tipo: 'cono', h: 2.5, c: BLANCO } } },
  electron: { nombre: 'Electron', ESC: 2.2,
    nucleo: { seg: [{ h: 12, r: 0.6, c: NEGRO }, { h: 0.5, r: 0.6, c: GRIS }, { h: 3.5, r: 0.6, c: NEGRO }], carena: { r: 0.6, hc: 0.8, hn: 1.4, c: NEGRO } } },
  pegasus: { nombre: 'Pegasus XL', ESC: 2.2,
    nucleo: { seg: [{ h: 10.3, r: 0.64, c: BLANCO }, { h: 1, r: 0.64, c: NEGRO }, { h: 3, r: 0.64, c: BLANCO }], carena: { r: 0.64, hc: 1, hn: 1.7, c: BLANCO } },
    ala: { env: 6.7, cuerda: 7.5, y: 1.2 } },
  minotaur4: { nombre: 'Minotaur IV', ESC: 1.6,
    nucleo: { seg: [{ h: 9.5, r: 1.15, c: GRIS }, { h: 0.6, r: 1.15, c: NEGRO }, { h: 5.5, r: 1.0, c: BLANCO }, { h: 0.5, r: 1.0, c: NEGRO }, { h: 3.5, r: 0.75, c: GRIS }], carena: { r: 1.0, hc: 1.5, hn: 2.5, c: BLANCO } } },
  sls: { nombre: 'SLS', ESC: 1,
    nucleo: { seg: [{ h: 64, r: 4.2, c: NARANJA }, { h: 3, r: 4.2, r2: 2.5, c: BLANCO }, { h: 14, r: 2.5, c: BLANCO }, { h: 3.5, r: 2.5, r2: 1.5, c: BLANCO }, { h: 8, r: 0.3, c: NEGRO }], carena: null, punta: { tipo: 'cono', h: 1.5, r: 0.3, c: NEGRO } },
    lateral: { n: 2, dist: 6.4, ang0: 0, r: 1.85, seg: [{ h: 54, r: 1.85, c: BLANCO }], punta: { tipo: 'ojiva', h: 5, c: BLANCO } } },
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

function nucleo(cfg) {
  const n = new THREE.Group();
  let y = 0;
  const r0 = cfg.seg[0].r;
  n.add(cil(r0 * 0.35, r0 * 0.55, 1.6, NEGRO, -0.9, 8)); // tobera
  for (const s of cfg.seg) { n.add(cil(s.r, s.r2 ?? s.r, s.h, s.c, y)); y += s.h; }
  const ult = cfg.seg[cfg.seg.length - 1];
  if (cfg.carena) {
    const k = cfg.carena, rUlt = ult.r2 ?? ult.r;
    if (k.r > rUlt + 0.01) { n.add(cil(rUlt, k.r, 1.5, k.c, y)); y += 1.5; }
    n.add(cil(k.r, k.r, k.hc, k.c, y)); y += k.hc;
    n.add(ojiva(k.r, k.hn, k.c, y)); y += k.hn;
  } else if (cfg.punta) {
    n.add(cil(cfg.punta.r ?? 0.3, 0.02, cfg.punta.h, cfg.punta.c, y)); y += cfg.punta.h;
  }
  return { grupo: n, alto: y };
}

function construirCohete(id) {
  const spec = MODELOS[id] ?? MODELOS.falcon9;
  const g = new THREE.Group();
  const { grupo, alto } = nucleo(spec.nucleo);
  g.add(grupo);
  let ancho = spec.nucleo.seg[0].r;
  if (spec.lateral) {
    const l = spec.lateral;
    for (let i = 0; i < l.n; i++) {
      const a = l.ang0 + (i / l.n) * Math.PI * 2;
      const b = new THREE.Group();
      let y = 0;
      b.add(cil(l.r * 0.4, l.r * 0.6, 1, NEGRO, -0.7, 8));
      for (const s of l.seg) { b.add(cil(s.r, s.r2 ?? s.r, s.h, s.c, y)); y += s.h; }
      if (l.punta.tipo === 'ojiva') b.add(ojiva(l.r, l.punta.h, l.punta.c, y));
      else b.add(cil(l.r, 0.05, l.punta.h, l.punta.c, y));
      b.position.set(Math.cos(a) * l.dist, 0, Math.sin(a) * l.dist);
      g.add(b);
    }
    ancho = l.dist + l.r;
  }
  if (spec.patas) {
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      const p = barra([Math.cos(a) * 1.8, 8, Math.sin(a) * 1.8], [Math.cos(a) * 4.6, -0.6, Math.sin(a) * 4.6], 0.3, NEGRO);
      g.add(p);
    }
  }
  if (spec.ala) {
    // Silueta del ala delta (el avión portador es opcional; aquí solo el ala del cohete)
    const w = spec.ala, sh = new THREE.Shape();
    sh.moveTo(-w.env / 2, w.cuerda); sh.lineTo(0, 0); sh.lineTo(w.env / 2, w.cuerda); sh.lineTo(-w.env / 2, w.cuerda);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.15, bevelEnabled: false }), mat(NEGRO));
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, w.y, w.cuerda * 0.3);
    g.add(m);
    ancho = Math.max(ancho, w.env / 2);
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
  const mp = ep === 'ok' ? T.presOk(fmt(lim - con, 1)) : ep === 'tolerancia' ? T.presTol(fmt(con - lim, 1)) : T.presExc(fmt(con - lim, 1));

  return h('div', { class: 'cam-panel' },
    h('div', { class: 'cam-bloque' },
      h('h4', {}, T.margen),
      medidor(ratio, est),
      h('p', { class: 'cifras' }, `${fmt(usada)} kg / ${fmt(cap)} kg`, h('b', { class: est }, Number.isFinite(ratio) ? ` ${fmt(ratio * 100)} %` : '')),
      h('p', { class: 'msg ' + est }, msg),
      h('p', { class: 'pie' }, T.masaNave)),
    h('div', { class: 'cam-bloque' },
      h('h4', {}, T.presupuesto),
      medidor(rp, ep),
      h('p', { class: 'cifras' }, `${fmt(sin, 1)} + ${fmt(pk, 1)} = ${fmt(con, 1)} / ${fmt(lim, 1)} ${T.musd}`, h('b', { class: ep }, Number.isFinite(rp) ? ` ${fmt(rp * 100)} %` : '')),
      h('p', { class: 'msg ' + ep }, mp),
      h('p', { class: 'pie' }, `${T.sinCohete}: ${fmt(sin, 1)} · ${T.conEste}: ${fmt(con, 1)} ${T.musd}`)));
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
  const feed = h('div', { class: 'cam-feed' });
  if (ctx.error) feed.append(h('p', { class: 'cam-vacio' }, T.sinWebgl));
  else {
    feed.append(ctx.canvas);
    ctx.feed = feed;
    ctx.reloj = h('span', { class: 'cam-reloj' }, marcaTiempo());
    ctx.relojTxt = ctx.reloj.textContent;
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
    h('div', { class: 'cam-inf izq' }, ctx.reloj ?? ''),
    h('div', { class: 'cam-inf der' }, T.camId),
    h('div', { class: 'cam-sim' }, T.sim),
    h('div', { class: 'cam-cambio' }, T.cambiando),
    h('button', { class: 'cam-flecha izq', type: 'button', 'aria-label': T.prev, onclick: () => mover(-1) }, '◀'),
    h('button', { class: 'cam-flecha der', type: 'button', 'aria-label': T.next, onclick: () => mover(1) }, '▶'));

  const ficha = h('div', { class: 'cam-carpeta' },
    h('div', { class: 'solapa' }, `${T.cohetes} ${i + 1}/${lst.length}`),
    h('div', { class: 'hoja' },
      h('p', { class: 'etq' }, T.carpeta),
      h('h3', {}, tx(k.nombre) || k.id),
      esElegido ? h('span', { class: 'sello' }, T.elegido) : null,
      h('dl', {},
        h('dt', {}, T.operador), h('dd', {}, k.operador ?? '-'),
        h('dt', {}, T.capacidadA(destino)), h('dd', {}, valor(c, k.capacidad?.[m.destino], 'kg')),
        h('dt', {}, T.precio), h('dd', {}, valor(c, k.precio, T.musd)),
        h('dt', {}, T.usoNasa), h('dd', {}, k.usoNasa ?? T.ninguno)),
      k.nota ? h('p', { class: 'nota' }, h('b', {}, T.nota + ': '), tx(k.nota)) : null,
      h('div', { class: 'acciones' },
        h('button', {
          class: 'btn-elegir', type: 'button', disabled: !puedo || esElegido,
          onclick: () => c.enviar('elegirCohete', { id: k.id }),
        }, esElegido ? T.elegido : T.elegir),
        puedo ? null : h('p', { class: 'aviso' }, T.soloRol(depto('vuelo')))),
      h('p', { class: 'teclas' }, T.teclas)),
    h('div', { class: 'nav' },
      h('button', { type: 'button', 'aria-label': T.prev, onclick: () => mover(-1) }, '◀'),
      h('span', {}, tx(k.nombre) || k.id),
      h('button', { type: 'button', 'aria-label': T.next, onclick: () => mover(1) }, '▶')));

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
