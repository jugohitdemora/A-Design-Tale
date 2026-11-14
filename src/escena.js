// Sala de briefing low poly: solo geometría y colores planos, sin texturas.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export const ROLES = [
  { id: 'vuelo',    nombre: 'Director/a de vuelo',           color: 0xd9822b },
  { id: 'ciencia',  nombre: 'Científico/a',                  color: 0x3fa66b },
  { id: 'potencia', nombre: 'Ingeniero/a de potencia',       color: 0xe0c040 },
  { id: 'comms',    nombre: 'Comunicaciones y operaciones',  color: 0x4a7fd0 },
];

// Un asiento por rol. ry = hacia dónde mira el cuerpo (0 = hacia +z).
export const ASIENTOS = [
  { x: -1.1, z: -1.25, ry: 0 },
  { x:  1.1, z: -1.25, ry: 0 },
  { x: -1.1, z:  1.25, ry: Math.PI },
  { x:  1.1, z:  1.25, ry: Math.PI },
];
export const ALTURA_OJOS = 1.18;

const mat = (color) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 });
const caja = (w, h, d, color) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));

function etiqueta(texto, clase = 'etiqueta') {
  const div = document.createElement('div');
  div.className = clase;
  div.textContent = texto;
  return new CSS2DObject(div);
}

export function crearEscena() {
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x1c1f24);

  // Luz: ambiente cálido + lámpara de techo.
  escena.add(new THREE.HemisphereLight(0xfff1d6, 0x3a3328, 1.1));
  const lampara = new THREE.PointLight(0xffd9a0, 18, 12, 1.6);
  lampara.position.set(0, 2.7, 0);
  escena.add(lampara);
  const sol = new THREE.DirectionalLight(0xffffff, 0.6);
  sol.position.set(2, 4, 3);
  escena.add(sol);

  // Habitación 8 × 6 × 3 m.
  const suelo = caja(8, 0.1, 6, 0x6e6e6e); suelo.position.y = -0.05; escena.add(suelo);
  const techo = caja(8, 0.1, 6, 0x4a3a2a); techo.position.y = 3.05; escena.add(techo);
  const pared = (w, x, z, ry) => {
    const p = caja(w, 3, 0.1, 0xd8cdb0); p.position.set(x, 1.5, z); p.rotation.y = ry; escena.add(p);
    const z2 = caja(w, 0.9, 0.12, 0x7a5232); z2.position.set(x, 0.45, z); z2.rotation.y = ry; escena.add(z2); // zócalo de madera
    return [p, z2];
  };
  pared(8, 0, -3, 0);
  const paredFrontal = pared(8, 0, 3, 0); // se oculta en la vista general
  pared(6, -4, 0, Math.PI / 2);
  pared(6, 4, 0, Math.PI / 2);
  const tuboLuz = caja(1.4, 0.08, 0.3, 0xfff3c4);
  tuboLuz.material.emissive = new THREE.Color(0xffe7a0); tuboLuz.material.emissiveIntensity = 0.9;
  tuboLuz.position.set(0, 2.95, 0); escena.add(tuboLuz);

  // Mesa.
  const tablero = caja(4.4, 0.08, 1.9, 0x8a5a34); tablero.position.y = 0.76; escena.add(tablero);
  const pie = caja(1.2, 0.72, 0.6, 0x5e3d23); pie.position.y = 0.36; escena.add(pie);

  // Póster (círculo azul liso) en la pared del fondo.
  const poster = caja(1.3, 1.5, 0.02, 0x5577a0); poster.position.set(0.3, 1.9, -2.94); escena.add(poster);
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.02, 10), mat(0x1f3f8a));
  disco.rotation.x = Math.PI / 2; disco.position.set(0.3, 1.9, -2.92); escena.add(disco);

  // Puerta a la sala de ingeniería (pared derecha del fondo).
  const puerta = caja(1.0, 2.1, 0.06, 0x6d7278); puerta.position.set(3.2, 1.05, -2.93); escena.add(puerta);
  const placa = etiqueta('SALA DE INGENIERÍA');
  placa.position.set(3.2, 1.75, -2.88); escena.add(placa);

  // Archivador y cajas a la izquierda.
  const archivador = caja(0.8, 1.6, 0.5, 0x666b70); archivador.position.set(-3.5, 0.8, -2.6); escena.add(archivador);
  const cajaCarton = caja(0.6, 0.35, 0.45, 0xa47a48); cajaCarton.position.set(-3.5, 1.78, -2.6); escena.add(cajaCarton);

  // Pizarra de briefing con tres casillas clicables.
  const pizarra = caja(1.6, 1.2, 0.05, 0xece6d6); pizarra.position.set(-2.0, 1.8, -2.93); escena.add(pizarra);
  const marco = caja(1.7, 1.3, 0.03, 0x7a7a7a); marco.position.set(-2.0, 1.8, -2.955); escena.add(marco);
  const titulo = etiqueta('BRIEFING DE MISIÓN', 'etiqueta pizarra');
  titulo.position.set(-2.0, 2.25, -2.89); escena.add(titulo);
  const casillas = {};
  ['objetivos', 'tareas', 'riesgos'].forEach((id, i) => {
    const y = 1.95 - i * 0.3;
    const c = caja(0.14, 0.14, 0.04, 0xffffff);
    c.position.set(-2.55, y, -2.88);
    c.userData = { tipo: 'casilla', id };
    escena.add(c);
    const e = etiqueta(id[0].toUpperCase() + id.slice(1), 'etiqueta pizarra');
    e.position.set(-2.0, y, -2.88);
    escena.add(e);
    casillas[id] = c;
  });

  // Sillas, carpetas y avatares por asiento.
  const avatares = [];
  const carpetas = [];
  ASIENTOS.forEach((a, i) => {
    const silla = new THREE.Group();
    const asiento = caja(0.5, 0.08, 0.5, 0x5b5f66); asiento.position.y = 0.48;
    const respaldo = caja(0.5, 0.6, 0.08, 0x5b5f66); respaldo.position.set(0, 0.8, -0.25);
    const pata = caja(0.08, 0.46, 0.08, 0x3c3f44); pata.position.y = 0.23;
    silla.add(asiento, respaldo, pata);
    silla.position.set(a.x, 0, a.z + (a.ry === 0 ? -0.35 : 0.35));
    silla.rotation.y = a.ry;
    escena.add(silla);

    const carpeta = caja(0.45, 0.03, 0.32, 0xe8b84a);
    carpeta.position.set(a.x, 0.815, a.z + (a.ry === 0 ? 0.35 : -0.35));
    carpeta.userData = { tipo: 'carpeta', id: ROLES[i].id };
    escena.add(carpeta);
    carpetas.push(carpeta);

    avatares.push(crearAvatar(ROLES[i], a));
    escena.add(avatares[i].grupo);
  });

  // Jefe de misión (NPC) de pie junto a la pizarra.
  const npc = crearAvatar({ nombre: 'Jefe de misión', color: 0x2b2b30 }, { x: -3.2, z: -1.2, ry: Math.PI / 3 }, true);
  npc.grupo.visible = true;
  escena.add(npc.grupo);

  return { escena, avatares, casillas, carpetas, paredFrontal, clicables: [...Object.values(casillas), ...carpetas] };
}

// Avatar en bloques: cuerpo con el color del rol y cabeza con ojos para ver hacia dónde mira.
function crearAvatar(rol, asiento, dePie = false) {
  const grupo = new THREE.Group();
  const base = dePie ? 0.0 : 0.5;
  if (dePie) {
    const piernas = caja(0.4, 0.85, 0.24, 0x26262a); piernas.position.y = 0.43; grupo.add(piernas);
  }
  const torso = caja(0.5, 0.6, 0.3, dePie ? 0x2b2b30 : 0x6f7a87);
  torso.position.y = base + (dePie ? 0.85 : 0.33) + 0.0;
  grupo.add(torso);
  const parche = caja(0.14, 0.14, 0.02, rol.color);
  parche.position.set(0.12, torso.position.y + 0.12, 0.16);
  grupo.add(parche);

  const cabeza = new THREE.Group();
  cabeza.position.y = torso.position.y + 0.3 + 0.2;
  const craneo = caja(0.34, 0.36, 0.34, 0xe8c4a0); cabeza.add(craneo);
  const pelo = caja(0.36, 0.1, 0.36, dePie ? 0xbfbfbf : 0x4a3222); pelo.position.y = 0.18; cabeza.add(pelo);
  for (const x of [-0.07, 0.07]) {
    const ojo = caja(0.05, 0.06, 0.02, 0x1a1a1a); ojo.position.set(x, 0.03, 0.175); cabeza.add(ojo);
  }
  grupo.add(cabeza);

  const nombre = etiqueta(rol.nombre);
  nombre.position.y = cabeza.position.y + 0.38;
  grupo.add(nombre);

  grupo.position.set(asiento.x, 0, asiento.z + (dePie ? 0 : (asiento.ry === 0 ? -0.3 : 0.3)));
  grupo.rotation.y = asiento.ry;
  grupo.visible = false;
  return { grupo, cabeza, nombre };
}
