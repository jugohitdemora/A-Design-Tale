// Decorado de la sala de control de misión: mismo estilo que la sala de briefing (low poly, colores planos y texturas
// pequeñas en canvas), pero en penumbra. inicio.js conserva la pared de pantallas, las consolas, los racks y la puerta;
// aquí solo va el escenario: moqueta, techo técnico, paneles de pared, relojes, carteles, maquetas y plantas.
// Sala de 20 × 15 × 6 m centrada en el origen; la pared de pantallas está en z = −7,5 y los jugadores miran hacia ella.
import * as THREE from 'three';
import { mat, luz, caja, cil, mulberry, lienzo, planoTex, cuadro, colocar, cohete, satelite, planta,
  texParche, texVitrina, texTelemetria, texReloj, texSistema, texMarte, texLuna, texOrbita } from './decorado-briefing.js';

// ---------- Texturas ----------
const texMoqueta = () => lienzo(64, 64, (g, w, h) => {
  g.fillStyle = '#262c36'; g.fillRect(0, 0, w, h);
  const r = mulberry(15);
  for (let i = 0; i < 220; i++) { g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.14)'; g.fillRect((r() * w) | 0, (r() * h) | 0, 2, 2); }
  g.fillStyle = '#1c2129'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h);   // juntas de loseta de 0,5 m
  g.fillStyle = '#323a47'; g.fillRect(0, 1, w, 1); g.fillRect(1, 0, 1, h);
}, { nitida: true, repetir: [40, 30] });

const texTecho = () => lienzo(64, 64, (g, w, h) => {
  g.fillStyle = '#1e2126'; g.fillRect(0, 0, w, h);
  const r = mulberry(19);
  for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect((r() * w) | 0, (r() * h) | 0, 1, 1); }
  g.fillStyle = '#2c3037'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);   // perfilería del techo técnico
}, { nitida: true, repetir: [20, 15] });

// Panel acústico oscuro (2 m de ancho por repetición, 6 m de alto): juntas, friso y filete azul a la altura de las mesas.
const texPanel = (anchoM) => lienzo(128, 384, (g, w) => {
  g.fillStyle = '#262a31'; g.fillRect(0, 0, w, 384);
  const r = mulberry(23);
  for (let i = 0; i < 140; i++) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect((r() * w) | 0, (r() * 384) | 0, 2, 2); }
  g.fillStyle = '#1d2026'; g.fillRect(0, 0, 2, 384); g.fillRect(w / 2, 0, 1, 300);   // juntas
  g.fillStyle = '#2f4560'; g.fillRect(0, 300, w, 64);                                   // friso
  g.fillStyle = '#27394f'; for (let x = 0; x < w; x += 32) g.fillRect(x, 300, 2, 64);
  g.fillStyle = '#62c6ff'; g.fillRect(0, 296, w, 3);                                    // filete azul
  g.fillStyle = '#15181d'; g.fillRect(0, 364, w, 20);                                   // zócalo
}, { nitida: true, repetir: [anchoM / 2, 1] });

// Rótulo de la sala sobre la puerta.
const texRotulo = (texto) => lienzo(512, 64, (g, w, h) => {
  g.fillStyle = '#0d1118'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#f2b844'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
  g.fillStyle = '#f1e9d6'; g.font = 'bold 30px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texto, w / 2, h / 2 + 2);
}, { nitida: true });

// Cuadro legible en la penumbra: imagen con material básico, algo atenuada para que no parezca una pantalla.
function cartel(ancho, alto, tex, color = 0x15171b, brillo = 0.8) {
  const c = cuadro(ancho, alto, tex, color, true);
  c.children[1].material.color.setScalar(brillo);
  return c;
}

// ---------- Sala ----------
export function decorarControl(escena) {
  const poner = (...o) => o.forEach((x) => escena.add(x));

  // Suelo y techo.
  const suelo = planoTex(20, 15, texMoqueta()); suelo.rotation.x = -Math.PI / 2; suelo.position.y = 0.003; poner(suelo);
  const techo = planoTex(20, 15, texTecho()); techo.rotation.x = Math.PI / 2; techo.position.y = 5.995; poner(techo);
  // Bandejas de cables a lo largo de la sala y un conducto de ventilación al fondo.
  for (const x of [-7.2, 7.2]) {
    const bandeja = caja(0.5, 0.06, 14.6, 0x3a3f46); bandeja.position.set(x, 5.25, 0); poner(bandeja);
    [0x1b1d21, 0xb3261e, 0x2a6f97, 0xd9a83a].forEach((color, k) => {
      const cable = cil(0.025, 0.025, 14.6, color, 5); cable.rotation.x = Math.PI / 2; cable.position.set(x - 0.18 + k * 0.12, 5.3, 0); poner(cable);
    });
    for (let z = -6; z <= 6; z += 3) { const colgador = caja(0.03, 0.7, 0.03, 0x15171b); colgador.position.set(x, 5.62, z); poner(colgador); }
  }
  const conducto = cil(0.22, 0.22, 19.6, 0x5a5f66, 10); conducto.rotation.z = Math.PI / 2; conducto.position.set(0, 5.55, 4.8); poner(conducto);

  // Paredes laterales: paneles con friso (delante de los paneles acústicos de inicio.js).
  for (const [x, ry] of [[-9.88, Math.PI / 2], [9.88, -Math.PI / 2]]) {
    const p = planoTex(15, 6, texPanel(15)); p.position.set(x, 3, 0); p.rotation.y = ry; poner(p);
  }
  // Pared de pantallas: paneles a los lados (las pantallas y sus marcos quedan delante).
  for (const x of [-8.6, 8.6]) { const p = planoTex(2.8, 6, texPanel(2.8)); p.position.set(x, 3, -7.395); poner(p); }

  // ----- Pared de pantallas (z = −7,4) -----
  // Relojes de los centros de control sobre las columnas de pantallas.
  [['UTC', 14], ['HOUSTON', 8], ['PASADENA', 6], ['DARMSTADT', 15], ['TSUKUBA', 23], ['BENGALURU', 19]].forEach(([n, h], k) => {
    const x = (k < 3 ? -6.3 : 4.5) + (k % 3) * 0.9;
    const r = new THREE.Mesh(new THREE.CircleGeometry(0.3, 18), new THREE.MeshBasicMaterial({ map: texReloj(n, h, 5 + k * 9) }));
    r.material.color.setScalar(0.85);
    r.position.set(x, 5.5, -7.38); poner(r);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 4, 18), mat(0x111317)); aro.position.set(x, 5.5, -7.37); poner(aro);
  });
  // Rincón izquierdo: parche de la misión y maqueta de cohete con un foco.
  const parche = new THREE.Mesh(new THREE.CircleGeometry(0.75, 28), new THREE.MeshBasicMaterial({ map: texParche() }));
  parche.material.color.setScalar(0.9); parche.position.set(-8.5, 4.2, -7.38); poner(parche);
  const aroP = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.04, 4, 28), mat(0xc9b27a)); aroP.position.set(-8.5, 4.2, -7.37); poner(aroP);
  const maqueta = cohete(); maqueta.scale.setScalar(1.7); maqueta.position.set(-8.4, 0, -6.6); poner(maqueta);
  const foco = new THREE.SpotLight(0xffe2b0, 18, 7, 0.45, 0.6, 1.4); foco.position.set(-8.4, 5.2, -5.6); foco.target = maqueta; poner(foco);
  // Rincón derecho: vitrina de parches de misiones pasadas y una telemetría pequeña.
  const vitrina = cartel(2.2, 1.36, texVitrina(), 0x6b4a2e, 0.85); colocar(vitrina, 8.5, 4.0, -7.36, 0); poner(vitrina);
  const tele = cartel(1.6, 0.94, texTelemetria(), 0x15171b, 1); colocar(tele, 8.5, 2.4, -7.36, 0); poner(tele);

  // ----- Pared izquierda (x = −10): rótulo sobre la puerta, carteles de destino y plantas -----
  [[-2.6, texLuna()], [-0.6, texOrbita()], [1.4, texMarte()]].forEach(([z, tex]) => {
    const c = cartel(1.15, 1.6, tex, 0x2a2623, 0.75); colocar(c, -9.82, 2.7, z, Math.PI / 2); poner(c);
  });
  const rotulo = planoTex(2.6, 0.32, texRotulo('MISSION CONTROL'), true); rotulo.material.color.setScalar(0.9);
  rotulo.position.set(-9.83, 4.6, -5.2); rotulo.rotation.y = Math.PI / 2; poner(rotulo);
  const plantaPuerta = planta(1.6, 3); plantaPuerta.scale.setScalar(1.3); plantaPuerta.position.set(-9.3, 0, -6.6); poner(plantaPuerta);
  const plantaIzq = planta(1.4, 8); plantaIzq.scale.setScalar(1.3); plantaIzq.position.set(-9.3, 0, -3.9); poner(plantaIzq);

  // ----- Pared derecha (x = +10): mapa del sistema solar sobre los racks, satélite y planta -----
  const mapa = cartel(3.4, 2.06, texSistema(), 0x15171b, 0.85); colocar(mapa, 9.82, 3.9, -3.3, -Math.PI / 2); poner(mapa);
  const cOrbita = cartel(1.15, 1.6, texOrbita(), 0x2a2623, 0.75); colocar(cOrbita, 9.82, 2.7, 0.6, -Math.PI / 2); poner(cOrbita);
  const peana = caja(0.7, 1.0, 0.7, 0x3a3f46); peana.position.set(9.2, 0.5, -6.6); poner(peana);
  const sat = satelite(); sat.scale.setScalar(3); sat.position.set(9.2, 1.0, -6.6); sat.rotation.y = -0.6; poner(sat);
  const plantaDer = planta(1.5, 6); plantaDer.scale.setScalar(1.3); plantaDer.position.set(9.3, 0, 2.2); poner(plantaDer);

  // Tiras de luz en el suelo a los lados de las gradas: llevan la vista hacia la pared de pantallas.
  for (const x of [-7.4, 7.4]) {
    const tira = caja(0.06, 0.02, 12, luz(0x3a8ad0, 1.1)); tira.position.set(x, 0.015, 0.5); poner(tira);
  }
}
