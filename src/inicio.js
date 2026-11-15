// Fondo de la pantalla de inicio: sala de control low poly inspirada en los centros de control reales
// (gradas de consolas mirando a una pared de pantallas). Solo geometría y colores planos.
import * as THREE from 'three';
import { crearAvatar, etiqueta, ROLES } from './escena.js';
import { textos } from './i18n.js';

const VERDE = 0x5fe08a, CIAN = 0x62c6ff, AMBAR = 0xf2b844, ROJO = 0xe0584a;

const TC = textos({
  es: { briefing: 'SALA DE BRIEFING' },
  en: { briefing: 'BRIEFING ROOM' },
});

// Sala de control de misión con jugadores: un puesto por rol en la primera fila de consolas, mirando a la pared de pantallas.
// ry = hacia dónde mira el cuerpo (π = hacia -z, la pared). El avatar queda 0,3 m detrás de (x, z): justo sobre la silla de la consola.
const X_CONSOLAS = [-3.075, -1.025, 1.025, 3.075];
const Z_FILA = -4.2, Z_SILLA = Z_FILA + 0.95;
export const ASIENTOS_CONTROL = X_CONSOLAS.map((x) => ({ x, z: Z_SILLA - 0.3, ry: Math.PI }));
// Pared principal (pantalla central): centro, normal hacia el espectador, arriba y tamaño en metros.
export const PARED = { centro: new THREE.Vector3(0, 3.3, -7.24), normal: new THREE.Vector3(0, 0, 1), arriba: new THREE.Vector3(0, 1, 0), ancho: 7.2, alto: 3.6 };

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });
const brillo = (color, intensidad = 1) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensidad });
const caja = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'number' ? mat(m) : m);
const linea = (puntos, color, cerrada = false) => {
  const g = new THREE.BufferGeometry().setFromPoints(puntos);
  const m = new THREE.LineBasicMaterial({ color });
  return cerrada ? new THREE.LineLoop(g, m) : new THREE.Line(g, m);
};

// holograma: false quita la Tierra, la órbita y el indicador de la pantalla central. La sala de control de misión
// proyecta su interfaz encima de esa pantalla y la Tierra (que sobresale de la pared) asomaba por debajo.
// jugadores: true monta la sala de control jugable: cuatro puestos con avatar, consolas con la lámpara GO de cada departamento,
// zonas de clic (pared, consolas, puerta al briefing) y una baliza de guía. Sin jugadores es solo el fondo del inicio.
export function crearCentroDeControl({ holograma = true, jugadores = false } = {}) {
  const escena = new THREE.Scene();
  const clicables = [];
  const zona = (w, h, d, datos) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
    m.userData = { ...datos, activo: true };
    return m;
  };
  escena.background = new THREE.Color(0x0b0e13);
  escena.fog = new THREE.Fog(0x0b0e13, 14, 30);
  const animados = []; // funciones (t) => void
  const lamparas = []; // material de la lámpara GO de cada puesto (una por rol)

  // ---------- Luz: tenue y fría, con las pantallas como fuente principal ----------
  escena.add(new THREE.HemisphereLight(0x8aa4c8, 0x1a1712, 0.55));
  const luzPantallas = new THREE.PointLight(0x5aa0ff, 30, 16, 1.4);
  luzPantallas.position.set(0, 3.2, -4.5);
  escena.add(luzPantallas);
  for (const x of [-4, 4]) {
    const l = new THREE.PointLight(0xffc98a, 12, 10, 1.6);
    l.position.set(x, 5.3, 1.5);
    escena.add(l);
  }

  // ---------- Sala 20 × 15 × 6 m ----------
  const suelo = caja(20, 0.1, 15, 0x2a2e35); suelo.position.set(0, -0.05, 0); escena.add(suelo);
  const techo = caja(20, 0.1, 15, 0x1b1d21); techo.position.set(0, 6.05, 0); escena.add(techo);
  const paredFondo = caja(20, 6, 0.2, 0x23272e); paredFondo.position.set(0, 3, -7.5); escena.add(paredFondo);
  const paredIzq = caja(0.2, 6, 15, 0x2b2a28); paredIzq.position.set(-10, 3, 0); escena.add(paredIzq);
  const paredDer = caja(0.2, 6, 15, 0x2b2a28); paredDer.position.set(10, 3, 0); escena.add(paredDer);
  // Paneles acústicos en las paredes laterales.
  for (let z = -6; z <= 5; z += 2.2) {
    for (const x of [-9.88, 9.88]) {
      const p = caja(0.05, 2.2, 2.0, 0x34383f); p.position.set(x, 3.4, z); escena.add(p);
    }
  }
  // Vigas y luminarias del techo.
  for (let z = -5; z <= 5; z += 3.3) {
    const viga = caja(20, 0.35, 0.3, 0x2e2b27); viga.position.set(0, 5.8, z); escena.add(viga);
  }
  for (const [x, z] of [[-4, -1.5], [4, -1.5], [-4, 2.5], [4, 2.5]]) {
    const carcasa = caja(2.4, 0.15, 0.6, 0x50545a); carcasa.position.set(x, 5.45, z); escena.add(carcasa);
    const tubo = caja(2.2, 0.05, 0.45, brillo(0xffd59a, 1.4)); tubo.position.set(x, 5.36, z); escena.add(tubo);
    const cable = caja(0.03, 0.4, 0.03, 0x111111); cable.position.set(x, 5.7, z); escena.add(cable);
  }

  // ---------- Pared de pantallas ----------
  const zPared = -7.35;
  const pantalla = (w, h, x, y) => {
    const marco = caja(w + 0.16, h + 0.16, 0.12, 0x15171b); marco.position.set(x, y, zPared); escena.add(marco);
    const fondo = caja(w, h, 0.02, brillo(0x0b2440, 1)); fondo.position.set(x, y, zPared + 0.07); escena.add(fondo);
    // Rejilla tenue
    const pts = [];
    for (let gx = -w / 2; gx <= w / 2 + 1e-6; gx += w / 12) pts.push(new THREE.Vector3(gx, -h / 2, 0), new THREE.Vector3(gx, h / 2, 0));
    for (let gy = -h / 2; gy <= h / 2 + 1e-6; gy += h / 6) pts.push(new THREE.Vector3(-w / 2, gy, 0), new THREE.Vector3(w / 2, gy, 0));
    const rejilla = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x1d4a70 }));
    rejilla.position.set(x, y, zPared + 0.085);
    escena.add(rejilla);
    return new THREE.Vector3(x, y, zPared + 0.1);
  };
  // Soporte y consola larga bajo la pared
  const zocalo = caja(18, 1.1, 0.6, 0x2f3338); zocalo.position.set(0, 0.55, -7.1); escena.add(zocalo);

  // Pantalla central: Tierra + órbita + satélite
  const c = pantalla(7.2, 3.6, 0, 3.3);
  const yBorde = c.y - 1.8;
  const tierra = crearTierra(2.8, [new THREE.Plane(new THREE.Vector3(0, 1, 0), -yBorde)]);
  tierra.rotation.x = 0.5; // inclinada para que se vean los continentes y no solo el polo
  const plano = new THREE.Group(); // aplasta la Tierra en profundidad sin deformar la inclinación
  plano.position.set(c.x + 0.4, yBorde - 1.5, c.z + 0.05);
  plano.scale.z = 0.2;
  plano.add(tierra);
  plano.visible = holograma;
  escena.add(plano);
  animados.push((t) => { tierra.rotation.y = t * 0.06; });
  const orbita = [];
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    orbita.push(new THREE.Vector3(Math.cos(a) * 2.7, Math.sin(a) * 0.95, 0));
  }
  const grupoOrbita = new THREE.Group();
  grupoOrbita.position.set(c.x + 0.3, c.y - 0.15, c.z + 0.12);
  grupoOrbita.rotation.z = 0.22;
  grupoOrbita.add(linea(orbita, 0xdfe8f2, true));
  const satelite = new THREE.Group();
  satelite.add(caja(0.18, 0.18, 0.05, brillo(0xdfe8f2, 1.2)));
  for (const s of [-1, 1]) {
    const panel = caja(0.3, 0.12, 0.02, brillo(0x4b8fe0, 1.3)); panel.position.x = s * 0.27; satelite.add(panel);
  }
  grupoOrbita.add(satelite);
  grupoOrbita.visible = holograma;
  escena.add(grupoOrbita);
  animados.push((t) => {
    const a = t * 0.25;
    satelite.position.set(Math.cos(a) * 2.7, Math.sin(a) * 0.95, 0.02);
  });
  // Indicador "sistemas en línea"
  const pastilla = caja(1.5, 0.28, 0.02, brillo(0x0f3b22, 1)); pastilla.position.set(c.x + 2.5, c.y + 1.45, c.z + 0.02); escena.add(pastilla);
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.07, 8), brillo(VERDE, 2)); led.position.set(c.x + 1.9, c.y + 1.45, c.z + 0.04); escena.add(led);
  for (let i = 0; i < 5; i++) {
    const tx = caja(0.14, 0.07, 0.01, brillo(VERDE, 1.2)); tx.position.set(c.x + 2.15 + i * 0.2, c.y + 1.45, c.z + 0.04); escena.add(tx);
  }
  animados.push((t) => { led.visible = Math.sin(t * 3) > -0.6; });

  // Columna izquierda: vuelo, telemetría, comunicaciones
  const vuelo = pantalla(2.6, 1.05, -5.4, 4.45);
  const curva = [];
  for (let i = 0; i <= 30; i++) { const u = i / 30; curva.push(new THREE.Vector3(-1.1 + u * 2.2, -0.4 + Math.pow(u, 0.6) * 0.75, 0)); }
  const lv = linea(curva, VERDE); lv.position.copy(vuelo); escena.add(lv);
  const punto = caja(0.07, 0.07, 0.02, brillo(VERDE, 2)); punto.position.set(vuelo.x + 1.1, vuelo.y + 0.35, vuelo.z + 0.01); escena.add(punto);

  const tele = pantalla(2.6, 1.05, -5.4, 3.25);
  const barras = [];
  for (let i = 0; i < 10; i++) {
    const b = caja(0.13, 1, 0.02, brillo(VERDE, 1.3));
    b.position.set(tele.x - 1.0 + i * 0.22, tele.y - 0.42, tele.z + 0.01);
    b.geometry.translate(0, 0.5, 0);
    escena.add(b); barras.push(b);
  }
  animados.push((t) => barras.forEach((b, i) => { b.scale.y = 0.2 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 0.7)) * (0.4 + i / 14); }));

  const comms = pantalla(2.6, 1.05, -5.4, 2.05);
  const onda = linea(Array.from({ length: 60 }, () => new THREE.Vector3()), VERDE);
  onda.position.copy(comms); escena.add(onda);
  animados.push((t) => {
    const pos = onda.geometry.attributes.position;
    for (let i = 0; i < 60; i++) {
      const x = -1.1 + (i / 59) * 2.2;
      pos.setXYZ(i, x, Math.sin(x * 6 + t * 3) * 0.22 * Math.cos(x * 0.8), 0);
    }
    pos.needsUpdate = true;
  });

  // Derecha: nave en alámbrico + barras de estado
  const nave = pantalla(2.6, 3.4, 5.4, 3.3);
  const capsula = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.3, 0.62, 0.9, 8)),
    new THREE.LineBasicMaterial({ color: AMBAR }));
  capsula.position.set(nave.x - 0.45, nave.y + 0.55, nave.z + 0.1);
  escena.add(capsula);
  animados.push((t) => { capsula.rotation.y = t * 0.4; });
  for (let i = 0; i < 4; i++) {
    const b = caja(0.45, 0.1, 0.02, brillo(VERDE, 1.2)); b.position.set(nave.x + 0.85, nave.y + 1.05 - i * 0.35, nave.z + 0.01); escena.add(b);
    const l = linea([new THREE.Vector3(nave.x - 0.1, nave.y + 0.8 - i * 0.15, nave.z + 0.01), new THREE.Vector3(nave.x + 0.6, nave.y + 1.05 - i * 0.35, nave.z + 0.01)], AMBAR);
    escena.add(l);
  }
  for (let i = 0; i < 3; i++) {
    const fondoBarra = caja(2.0, 0.12, 0.02, brillo(0x173a2a, 1)); fondoBarra.position.set(nave.x, nave.y - 0.9 - i * 0.3, nave.z + 0.01); escena.add(fondoBarra);
    const llena = caja(2.0 * (0.9 - i * 0.25), 0.12, 0.02, brillo(i === 0 ? AMBAR : VERDE, 1.3));
    llena.position.set(nave.x - 1.0 + 1.0 * (0.9 - i * 0.25), nave.y - 0.9 - i * 0.3, nave.z + 0.015); escena.add(llena);
  }

  // Reloj de misión (barra de dígitos sobre la pantalla central)
  const reloj = caja(3.2, 0.42, 0.1, 0x111317); reloj.position.set(0, 5.45, zPared); escena.add(reloj);
  const digitos = [];
  for (let i = 0; i < 8; i++) {
    const d = caja(0.22, 0.26, 0.02, brillo(ROJO, 1.6)); d.position.set(-1.3 + i * 0.37, 5.45, zPared + 0.07); escena.add(d); digitos.push(d);
  }
  animados.push((t) => digitos.forEach((d, i) => { d.material.emissiveIntensity = 0.9 + 0.8 * ((Math.floor(t * (i + 1) * 0.7) % 2)); }));

  // ---------- Gradas de consolas ----------
  const filas = [
    { z: -4.2, base: 0 },
    { z: -1.3, base: 0.35 },
    { z: 1.6, base: 0.7 },
  ];
  filas.forEach((f, fi) => {
    if (f.base > 0) {
      const tarima = caja(14, f.base, 2.9, 0x2d3036); tarima.position.set(0, f.base / 2, f.z + 0.5); escena.add(tarima);
      const borde = caja(14, 0.04, 0.05, brillo(0x3a5a7a, 0.8)); borde.position.set(0, f.base + 0.01, f.z - 0.95); escena.add(borde);
    }
    const n = fi === 0 ? 4 : 5;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 2.05;
      const puesto = jugadores && fi === 0; // primera fila: un puesto por rol
      const c = crearConsola(fi * 10 + i, animados, puesto ? ROLES[i].color : null);
      c.position.set(x, f.base, f.z);
      escena.add(c);
      if (puesto) {
        lamparas.push(c.userData.lampara);
        const z = zona(1.95, 1.0, 1.0, { tipo: 'consola', asiento: i });
        z.position.set(x, 0.9, f.z - 0.3);
        escena.add(z); clicables.push(z);
      }
    }
  });
  // Operador sentado en la primera fila, de espaldas a la cámara (solo en el fondo del inicio)
  if (!jugadores) {
    const op = crearOperador();
    op.position.set(3.1, 0, -3.35);
    escena.add(op);
  }

  // ---------- Jugadores: avatares, pared y puerta ----------
  const avatares = [];
  let encima = null;
  const contorno = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(PARED.ancho + 0.3, PARED.alto + 0.3, 0.05)),
    new THREE.LineBasicMaterial({ color: 0xffd76a }));
  contorno.position.set(0, PARED.centro.y, zPared + 0.14);
  contorno.visible = false;
  const baliza = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 4),
    new THREE.MeshStandardMaterial({ color: 0xf2c14e, emissive: 0xf2c14e, emissiveIntensity: 0.9, flatShading: true }));
  baliza.rotation.x = Math.PI; // punta hacia abajo
  baliza.scale.setScalar(6);
  baliza.position.set(0, 5.1, zPared + 0.7);
  baliza.visible = false;
  let puerta = null;
  if (jugadores) {
    ASIENTOS_CONTROL.forEach((a, i) => { const av = crearAvatar(ROLES[i], a); escena.add(av.grupo); avatares.push(av); });
    // Clic en la pantalla central: encuadrarla y usar la interfaz de la fase.
    const zPared3 = zona(PARED.ancho, PARED.alto, 0.2, { tipo: 'pared' });
    zPared3.position.copy(PARED.centro);
    escena.add(zPared3, contorno, baliza); clicables.push(zPared3);
    // Luz cálida sobre los puestos: sin ella los avatares se pierden en la penumbra azul de las pantallas.
    for (const x of [-2.1, 2.1]) {
      const l = new THREE.PointLight(0xffd9a8, 9, 7, 1.5);
      l.position.set(x, 3.0, -2.6);
      escena.add(l);
    }
    // Puerta de vuelta a la sala de briefing (pared izquierda).
    const zPuerta = -5.2;
    const marcoP = caja(0.06, 2.24, 1.14, 0x15171b); marcoP.position.set(-9.86, 1.12, zPuerta); escena.add(marcoP);
    const hoja = caja(0.06, 2.1, 1.0, 0x6d7278); hoja.position.set(-9.82, 1.05, zPuerta); escena.add(hoja);
    const pomo = caja(0.06, 0.04, 0.12, 0xb8bcc0); pomo.position.set(-9.77, 1.0, zPuerta + 0.38); escena.add(pomo);
    const placa = etiqueta(() => TC.briefing, 'etiqueta puerta-etq'); placa.position.set(-9.7, 2.4, zPuerta); escena.add(placa);
    puerta = zona(0.3, 2.1, 1.0, { tipo: 'puerta' });
    puerta.position.set(-9.75, 1.05, zPuerta); escena.add(puerta); clicables.push(puerta);
  }
  const estadoGo = ['reposo', 'reposo', 'reposo', 'reposo']; // 'reposo' | 'espera' | 'go'

  // ---------- Racks de servidores (pared derecha) ----------
  for (let i = 0; i < 4; i++) {
    const rack = caja(0.9, 2.3, 1.0, 0x3b3f45); rack.position.set(9.3, 1.15, -5 + i * 1.1); escena.add(rack);
    for (let j = 0; j < 9; j++) {
      const color = [VERDE, AMBAR, VERDE, CIAN][(i + j) % 4];
      const l = caja(0.02, 0.05, 0.08, brillo(color, 2)); l.position.set(8.84, 0.4 + j * 0.2, -5.3 + i * 1.1 + (j % 3) * 0.2); escena.add(l);
      const fase = Math.random() * 10;
      animados.push((t) => { l.visible = Math.sin(t * (1.5 + (j % 4)) + fase) > -0.3; });
    }
  }

  // ---------- Cámara ----------
  const camara = new THREE.PerspectiveCamera(48, 1, 0.1, 60);
  const objetivo = new THREE.Vector3(-1.2, 2.4, -6);
  animados.push((t) => {
    camara.position.set(5.6 + Math.sin(t * 0.07) * 0.6, 3.9 + Math.sin(t * 0.11) * 0.12, 7.2);
    camara.lookAt(objetivo);
  });

  return {
    escena,
    camara,
    avatares,
    clicables,
    asientos: ASIENTOS_CONTROL,
    pared: PARED,
    actualizar(t) {
      animados.forEach((f) => f(t));
      contorno.visible = !!encima && encima.userData.tipo === 'pared';
      if (baliza.visible) {
        baliza.position.y = 5.1 + Math.sin(t * 3) * 0.12;
        baliza.rotation.y = t * 1.5;
        baliza.material.emissiveIntensity = 0.7 + Math.sin(t * 4) * 0.3;
      }
      // Lámpara de cada puesto: parpadea en ámbar mientras falta el GO del departamento.
      lamparas.forEach((l, i) => {
        const e = estadoGo[i];
        if (e === 'go') l.emissiveIntensity = 2.2;
        else if (e === 'espera') l.emissiveIntensity = 0.6 + 0.9 * (0.5 + 0.5 * Math.sin(t * 4 + i));
      });
    },
    // La Tierra y la órbita de la pantalla central: se quitan cuando la interfaz de la fase se proyecta encima.
    ponerHolograma(v) { plano.visible = v; grupoOrbita.visible = v; },
    resaltar(obj) { encima = obj ?? null; },
    // Baliza sobre la pantalla central cuando toca ir allí.
    guiar(tipo) { baliza.visible = jugadores && tipo === 'control'; },
    // firmas: { rol: bool }; activo: solo hay votación en la fase de verificación (fuera de ella las lámparas lucen el color del rol).
    marcarFirmas(firmas, activo) {
      lamparas.forEach((l, i) => {
        const id = ROLES[i].id;
        estadoGo[i] = activo ? (firmas?.[id] ? 'go' : 'espera') : 'reposo';
        l.emissive.setHex(!activo ? ROLES[i].color : firmas?.[id] ? VERDE : AMBAR);
        if (!activo) l.emissiveIntensity = 0.8;
      });
    },
  };
}

// Tierra low poly: icosaedro con cada cara de mar o tierra según una función de ruido sencilla.
function crearTierra(radio, recorte) {
  const g = new THREE.IcosahedronGeometry(radio, 3).toNonIndexed();
  const pos = g.attributes.position;
  const colores = [];
  const mar = new THREE.Color(0x1f5fb0), tierra = new THREE.Color(0x4f9a52), hielo = new THREE.Color(0xe8eef4);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    v.set(0, 0, 0);
    for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(pos, i + k));
    v.normalize();
    const n = Math.sin(v.x * 4.1 + 1.3) * Math.cos(v.y * 3.3) + Math.sin(v.z * 5.2 + v.x * 2.0) * 0.6;
    const col = Math.abs(v.y) > 0.9 ? hielo : n > 0.2 ? tierra : mar;
    for (let k = 0; k < 3; k++) colores.push(col.r, col.g, col.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true, flatShading: true, roughness: 1,
    emissive: 0x0a2a55, emissiveIntensity: 0.35, clippingPlanes: recorte,
  });
  return new THREE.Mesh(g, m);
}

// Consola: escritorio, panel inclinado con dos monitores, botonera, teclado y silla.
// colorRol: puesto de un jugador (silla fija frente a la consola, franja del color del departamento y lámpara GO en g.userData.lampara).
function crearConsola(semilla, animados, colorRol = null) {
  const rnd = mulberry(semilla + 7);
  const g = new THREE.Group();
  const cuerpo = caja(1.95, 0.78, 0.95, 0x6b6e70); cuerpo.position.set(0, 0.39, 0); g.add(cuerpo);
  const tapa = caja(1.95, 0.05, 0.98, 0x7c7f80); tapa.position.set(0, 0.8, 0); g.add(tapa);
  for (const x of [-0.6, 0.6]) {
    const cajon = caja(0.5, 0.1, 0.02, 0x55585a); cajon.position.set(x, 0.55, 0.49); g.add(cajon);
  }
  // Módulo superior inclinado hacia el operador (+z)
  const modulo = new THREE.Group();
  modulo.position.set(0, 0.83, -0.25);
  modulo.rotation.x = -0.45;
  const placa = caja(1.95, 0.7, 0.32, 0x5e6163); placa.position.set(0, 0.35, 0); modulo.add(placa);
  for (const x of [-0.48, 0.48]) {
    const bisel = caja(0.78, 0.5, 0.02, 0x1c1f22); bisel.position.set(x, 0.38, 0.165); modulo.add(bisel);
    const pant = caja(0.7, 0.42, 0.01, brillo(0x0b2a1a, 1)); pant.position.set(x, 0.38, 0.178); modulo.add(pant);
    const tipo = Math.floor(rnd() * 3);
    if (tipo === 0) {
      const pts = Array.from({ length: 16 }, (_, i) => new THREE.Vector3(-0.3 + i * 0.04, -0.15 + rnd() * 0.08 + i * 0.016, 0));
      const l = linea(pts, VERDE); l.position.set(x, 0.38, 0.185); modulo.add(l);
    } else if (tipo === 1) {
      for (let i = 0; i < 6; i++) {
        const h = 0.06 + rnd() * 0.26;
        const b = caja(0.07, h, 0.005, brillo(VERDE, 1.3)); b.position.set(x - 0.25 + i * 0.1, 0.2 + h / 2, 0.185); modulo.add(b);
      }
    } else {
      const pts = Array.from({ length: 30 }, (_, i) => new THREE.Vector3(-0.3 + i * 0.0207, Math.sin(i * 0.6) * 0.1, 0));
      const l = linea(pts, CIAN); l.position.set(x, 0.38, 0.185); modulo.add(l);
    }
  }
  // Botonera
  for (let i = 0; i < 8; i++) {
    const color = [VERDE, AMBAR, ROJO, VERDE, CIAN][Math.floor(rnd() * 5)];
    const b = caja(0.07, 0.05, 0.03, brillo(color, 1.5));
    b.position.set(-0.85 + (i % 2) * 0.09 + (i > 3 ? 1.6 : 0), 0.62 - Math.floor((i % 4) / 2) * 0.09, 0.17);
    modulo.add(b);
    if (rnd() > 0.7) { const f = rnd() * 10; animados.push((t) => { b.visible = Math.sin(t * 2.2 + f) > -0.5; }); }
  }
  if (colorRol != null) {
    const banda = caja(1.95, 0.05, 0.34, colorRol); banda.position.set(0, 0.72, 0); modulo.add(banda);
    const lampara = brillo(colorRol, 0.8);
    const luz = caja(0.5, 0.06, 0.06, lampara); luz.position.set(0, 0.77, 0.12); modulo.add(luz);
    g.userData.lampara = lampara;
  }
  g.add(modulo);
  const teclado = caja(0.6, 0.03, 0.2, 0xb9b4a8); teclado.position.set(0, 0.84, 0.25); g.add(teclado);
  if (rnd() > 0.45) { // cascos sobre la mesa
    const cascos = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 4, 8, Math.PI), mat(0x1a1a1a));
    cascos.position.set(0.65, 0.84, 0.2); cascos.rotation.x = -Math.PI / 2; g.add(cascos);
  }
  // Silla
  const silla = new THREE.Group();
  const asiento = caja(0.5, 0.08, 0.48, 0x45484c); asiento.position.y = 0.48; silla.add(asiento);
  const respaldo = caja(0.48, 0.55, 0.07, 0x45484c); respaldo.position.set(0, 0.82, 0.24); respaldo.rotation.x = 0.12; silla.add(respaldo);
  const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 6), mat(0x222222)); poste.position.y = 0.24; silla.add(poste);
  for (let k = 0; k < 5; k++) {
    const pata = caja(0.04, 0.03, 0.3, 0x222222);
    pata.rotation.y = (k / 5) * Math.PI * 2;
    pata.position.set(Math.sin(pata.rotation.y) * 0.13, 0.03, Math.cos(pata.rotation.y) * 0.13);
    silla.add(pata);
  }
  if (colorRol != null) silla.position.set(0, 0, 0.95); // puesto de jugador: justo detrás del teclado, de frente a la pared
  else {
    silla.position.set((rnd() - 0.5) * 0.4, 0, 0.85 + rnd() * 0.2);
    silla.rotation.y = (rnd() - 0.5) * 0.6;
  }
  g.add(silla);
  return g;
}

function crearOperador() {
  const g = new THREE.Group();
  const torso = caja(0.48, 0.6, 0.3, 0x3a4a62); torso.position.y = 0.85; g.add(torso);
  const cabeza = caja(0.32, 0.34, 0.32, 0xd9b08c); cabeza.position.y = 1.35; g.add(cabeza);
  const pelo = caja(0.34, 0.14, 0.34, 0x4a3222); pelo.position.set(0, 1.47, 0.01); g.add(pelo);
  const diadema = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 4, 10, Math.PI), mat(0x1a1a1a));
  diadema.position.y = 1.36; g.add(diadema);
  for (const s of [-1, 1]) {
    const auricular = caja(0.06, 0.13, 0.13, 0x1a1a1a); auricular.position.set(s * 0.19, 1.34, 0); g.add(auricular);
    const brazo = caja(0.12, 0.42, 0.12, 0x3a4a62); brazo.position.set(s * 0.26, 0.82, -0.12); brazo.rotation.x = 0.9; g.add(brazo);
  }
  return g;
}

function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
