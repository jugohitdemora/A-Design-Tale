// Sala de briefing low poly: solo geometría y colores planos, sin texturas.
// Contiene: mesa con un portátil y un manual (SOP) por asiento, proyector de escenarios (3 hologramas),
// las 3 carpetas de misión que reparte el jefe (cinemática local) y la puerta a la sala de control.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { textos, depto } from './i18n.js';

const T = textos({
  es: { pizarra: 'BRIEFING DE MISIÓN', objetivos: 'Objetivos', tareas: 'Tareas', riesgos: 'Riesgos', puerta: 'CONTROL DE MISIÓN', jefe: 'Jefe de misión',
    escenarios: { orbita: 'ÓRBITA', landing: 'ATERRIZAJE', exploracion: 'EXPLORACIÓN' }, elegir: 'Elige el escenario de la misión', manual: 'MANUAL SOP', clasificado: 'CLASIFICADO' },
  en: { pizarra: 'MISSION BRIEFING', objetivos: 'Objectives', tareas: 'Tasks', riesgos: 'Risks', puerta: 'MISSION CONTROL', jefe: 'Mission chief',
    escenarios: { orbita: 'ORBIT', landing: 'LANDING', exploracion: 'EXPLORATION' }, elegir: 'Choose the mission scenario', manual: 'SOP MANUAL', clasificado: 'CLASSIFIED' },
});

export const ROLES = [
  { id: 'vuelo', color: 0xd9822b },
  { id: 'ciencia', color: 0x3fa66b },
  { id: 'potencia', color: 0xe0c040 },
  { id: 'comms', color: 0x4a7fd0 },
].map((r) => ({ ...r, get nombre() { return depto(r.id); } }));

// Un asiento por rol. ry = hacia dónde mira el cuerpo (0 = hacia +z).
export const ASIENTOS = [
  { x: -1.1, z: -1.25, ry: 0 },
  { x: 1.1, z: -1.25, ry: 0 },
  { x: -1.1, z: 1.25, ry: Math.PI },
  { x: 1.1, z: 1.25, ry: Math.PI },
];
export const ALTURA_OJOS = 1.18;
export const ESCENARIOS_IDS = ['orbita', 'landing', 'exploracion'];
export const nombreEscenario = (id) => T.escenarios[id] ?? id;

const Y_MESA = 0.8;
const POS_CARPETAS = [-0.5, 0, 0.5];          // juntas en el centro de la mesa (x sobre el eje largo, z ≈ 0)
const GIRO_CARPETAS = [0.07, -0.04, 0.05];     // un poco torcidas, como lanzadas a mano
const POS_PROYECTOR = new THREE.Vector3(0, Y_MESA, 0);
const SEP_HOLOS = 0.62, ALTO_HOLOS = 0.52;
const JEFE_REPOSO = { x: -3.2, z: -1.2, ry: Math.PI / 3 };
const JEFE_MESA = { x: -2.6, z: 0.0, ry: Math.PI / 2 };
const PANTALLA_W = 0.5, PANTALLA_H = 0.3125; // 16:10

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...extra });
const caja = (w, h, d, color) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'number' ? mat(color) : color);
// Zona de clic invisible (el raycaster la encuentra aunque no se dibuje).
function zona(w, h, d, datos) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
  m.userData = { ...datos, activo: true };
  return m;
}

const etiquetas = []; // { div, f } para repintar al cambiar de idioma
export function etiqueta(texto, clase = 'etiqueta') {
  const div = document.createElement('div');
  div.className = clase;
  if (typeof texto === 'function') { etiquetas.push({ div, f: texto }); div.textContent = texto(); } else div.textContent = texto;
  return new CSS2DObject(div);
}

const suave = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

export function crearEscena() {
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x1c1f24);
  const clicables = [];

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
    const z2 = caja(w, 0.9, 0.12, 0x7a5232); z2.position.set(x, 0.45, z); z2.rotation.y = ry; escena.add(z2);
  };
  pared(8, 0, -3, 0); pared(8, 0, 3, 0); pared(6, -4, 0, Math.PI / 2); pared(6, 4, 0, Math.PI / 2);
  const tuboLuz = caja(1.4, 0.08, 0.3, 0xfff3c4);
  tuboLuz.material.emissive = new THREE.Color(0xffe7a0); tuboLuz.material.emissiveIntensity = 0.9;
  tuboLuz.position.set(0, 2.95, 0); escena.add(tuboLuz);

  // Mesa.
  const tablero = caja(4.4, 0.08, 1.9, 0x8a5a34); tablero.position.y = 0.76; escena.add(tablero);
  const pie = caja(1.2, 0.72, 0.6, 0x5e3d23); pie.position.y = 0.36; escena.add(pie);

  // Póster en la pared del fondo.
  const poster = caja(1.3, 1.5, 0.02, 0x5577a0); poster.position.set(0.3, 1.9, -2.94); escena.add(poster);
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.02, 10), mat(0x1f3f8a));
  disco.rotation.x = Math.PI / 2; disco.position.set(0.3, 1.9, -2.92); escena.add(disco);

  // Puerta a la sala de control de misión (clic: ir a planificar la ruta).
  const puerta = caja(1.0, 2.1, 0.06, 0x6d7278); puerta.position.set(3.2, 1.05, -2.93); escena.add(puerta);
  const pomo = caja(0.12, 0.04, 0.06, 0xb8bcc0); pomo.position.set(2.85, 1.0, -2.88); escena.add(pomo);
  const placa = etiqueta(() => T.puerta, 'etiqueta puerta-etq'); placa.position.set(3.2, 1.75, -2.88); escena.add(placa);
  const zPuerta = zona(1.0, 2.1, 0.2, { tipo: 'puerta' }); zPuerta.position.copy(puerta.position); escena.add(zPuerta); clicables.push(zPuerta);

  // Archivador y cajas a la izquierda.
  const archivador = caja(0.8, 1.6, 0.5, 0x666b70); archivador.position.set(-3.5, 0.8, -2.6); escena.add(archivador);
  const cajaCarton = caja(0.6, 0.35, 0.45, 0xa47a48); cajaCarton.position.set(-3.5, 1.78, -2.6); escena.add(cajaCarton);

  // Pizarra de briefing con tres casillas clicables.
  const pizarra = caja(1.6, 1.2, 0.05, 0xece6d6); pizarra.position.set(-2.0, 1.8, -2.93); escena.add(pizarra);
  const marco = caja(1.7, 1.3, 0.03, 0x7a7a7a); marco.position.set(-2.0, 1.8, -2.955); escena.add(marco);
  const titulo = etiqueta(() => T.pizarra, 'etiqueta pizarra'); titulo.position.set(-2.0, 2.25, -2.89); escena.add(titulo);
  const casillas = {};
  ['objetivos', 'tareas', 'riesgos'].forEach((id, i) => {
    const y = 1.95 - i * 0.3;
    const c = caja(0.14, 0.14, 0.04, 0xffffff);
    c.position.set(-2.55, y, -2.88);
    c.userData = { tipo: 'casilla', id, activo: true };
    escena.add(c); clicables.push(c);
    const e = etiqueta(() => T[id], 'etiqueta pizarra'); e.position.set(-2.0, y, -2.88); escena.add(e);
    casillas[id] = c;
  });

  // Sillas, portátiles, manuales y avatares por asiento.
  const avatares = [], laptops = [], manuales = [];
  ASIENTOS.forEach((a, i) => {
    const dir = a.ry === 0 ? 1 : -1; // hacia el centro de la mesa
    const silla = new THREE.Group();
    const asiento = caja(0.5, 0.08, 0.5, 0x5b5f66); asiento.position.y = 0.48;
    const respaldo = caja(0.5, 0.6, 0.08, 0x5b5f66); respaldo.position.set(0, 0.8, -0.25);
    const pata = caja(0.08, 0.46, 0.08, 0x3c3f44); pata.position.y = 0.23;
    silla.add(asiento, respaldo, pata);
    silla.position.set(a.x, 0, a.z - dir * 0.35);
    silla.rotation.y = a.ry;
    escena.add(silla);

    const lap = crearLaptop(ROLES[i].color);
    lap.grupo.position.set(a.x, Y_MESA, a.z + dir * 0.52);
    lap.grupo.rotation.y = a.ry;
    lap.zona.userData = { tipo: 'laptop', asiento: i, activo: true };
    escena.add(lap.grupo); clicables.push(lap.zona);
    laptops.push(lap);

    const man = crearManual(ROLES[i]);
    // A la derecha del jugador: su derecha es -x local cuando mira a +z.
    man.grupo.position.set(a.x - dir * 0.46, Y_MESA, a.z + dir * 0.48);
    man.grupo.rotation.y = a.ry + 0.15;
    man.zona.userData = { tipo: 'manual', rol: ROLES[i].id, activo: true };
    escena.add(man.grupo); clicables.push(man.zona);
    manuales.push(man);

    avatares.push(crearAvatar(ROLES[i], a));
    escena.add(avatares[i].grupo);
  });

  // Proyector de escenarios en el centro de la mesa. El jefe lo pone al empezar el briefing y lo retira
  // cuando la tripulación confirma un escenario. Los tres hologramas se reparten a lo largo de la mesa (eje x).
  const grupoProy = new THREE.Group();
  grupoProy.position.copy(POS_PROYECTOR);
  escena.add(grupoProy);
  const proyector = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.07, 10), mat(0x3a3f46));
  base.position.y = 0.035; proyector.add(base);
  const lente = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 10), new THREE.MeshBasicMaterial({ color: 0x7fe3ff }));
  lente.position.y = 0.076; proyector.add(lente);
  const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.15, 0.4, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
  haz.position.y = 0.28; proyector.add(haz);
  grupoProy.add(proyector);
  const holos = {};
  ESCENARIOS_IDS.forEach((id, k) => {
    const g = crearHolograma(id);
    g.position.set((k - 1) * SEP_HOLOS, ALTO_HOLOS, 0);
    // La zona de clic cubre el holograma y su tarjeta (debajo), para que la tarjeta también se pueda pulsar.
    const z = zona(0.42, 0.62, 0.42, { tipo: 'escenario', id }); z.position.y = -0.08; g.add(z); clicables.push(z);
    const div = document.createElement('div');
    div.className = 'holo-tarjeta';
    const votos = document.createElement('div'); votos.className = 'holo-votos';
    const nombre = document.createElement('div'); nombre.className = 'holo-nombre';
    etiquetas.push({ div: nombre, f: () => T.escenarios[id] }); nombre.textContent = T.escenarios[id];
    div.append(votos, nombre);
    const et = new CSS2DObject(div); et.position.y = -0.27; g.add(et);
    grupoProy.add(g);
    holos[id] = { grupo: g, zona: z, etiqueta: et, votos, fase: k * 2.1, escala: 1 };
  });
  const pista = etiqueta(() => T.elegir, 'etiqueta holo-pista');
  pista.position.set(0, ALTO_HOLOS + 0.36, 0); grupoProy.add(pista);

  // Carpetas de misión: ocultas hasta que el jefe las reparte. Juntas en el centro, donde estaba el proyector,
  // para que ningún portátil las tape. Cada una lleva foto, código y una pista en HTML.
  const carpetas = POS_CARPETAS.map((x, k) => {
    const c = crearCarpeta();
    c.destino = new THREE.Vector3(x, Y_MESA + 0.012, GIRO_CARPETAS[k] * 0.4);
    c.giro = GIRO_CARPETAS[k];
    c.grupo.position.copy(c.destino);
    c.grupo.visible = false;
    c.zona.userData = { tipo: 'carpeta', indice: k, activo: false };
    escena.add(c.grupo); clicables.push(c.zona);
    return c;
  });

  // Jefe de misión (NPC) de pie junto a la pizarra.
  const jefe = crearAvatar({ nombre: '', color: 0x2b2b30 }, JEFE_REPOSO, true);
  jefe.grupo.visible = true;
  jefe.nombre.element.textContent = T.jefe;
  etiquetas.push({ div: jefe.nombre.element, f: () => T.jefe });
  escena.add(jefe.grupo);

  // ---------- Animación ----------
  let t = 0;
  let cine = null; // { t0 }: reparto de carpetas en curso
  let carpetaElegida = null;
  let voto = null;           // escenario que este jugador ha seleccionado (aún sin confirmar)
  let encima = null;         // objeto clicable bajo el puntero
  const proy = { activo: false, u: 0 }; // u: 0 guardado … 1 desplegado
  const jefePose = { ...JEFE_REPOSO };
  const mano = new THREE.Vector3(-2.3, 1.05, 0);
  const DUR = { ir: 1.0, carpeta: 0.55, paso: 0.32 };
  const finCine = () => DUR.ir + DUR.paso * 2 + DUR.carpeta + 0.3;

  // El jefe camina hacia su objetivo: la mesa mientras hay proyector o reparto, si no, la pizarra.
  function moverJefe(dt) {
    const meta = proy.activo || cine ? JEFE_MESA : JEFE_REPOSO;
    const dx = meta.x - jefePose.x, dz = meta.z - jefePose.z, d = Math.hypot(dx, dz);
    const paso = Math.min(d, dt * 1.6);
    if (d > 1e-3) { jefePose.x += (dx / d) * paso; jefePose.z += (dz / d) * paso; }
    jefePose.ry += (meta.ry - jefePose.ry) * Math.min(1, dt * 5);
    jefe.grupo.position.set(jefePose.x, d > 0.01 ? Math.abs(Math.sin(t * 9)) * 0.03 : 0, jefePose.z);
    jefe.grupo.rotation.y = jefePose.ry;
  }

  function colocarCarpetas(ids, enMesa) {
    carpetas.forEach((c, k) => {
      const id = ids?.[k] ?? null;
      c.id = id;
      c.grupo.visible = !!id && enMesa;
      c.zona.userData.activo = !!id && enMesa;
      c.zona.userData.id = id;
      c.grupo.position.copy(c.destino);
      c.grupo.rotation.set(0, c.giro, 0);
    });
    marcarCarpeta(carpetaElegida);
  }

  function marcarCarpeta(id) {
    carpetaElegida = id;
    carpetas.forEach((c) => {
      const si = !!id && c.id === id;
      c.tapa.rotation.z = si ? -2.6 : 0;           // abierta
      c.brillo.visible = si;
    });
  }

  // Baliza de guía: flecha ámbar que flota sobre el siguiente objeto que toca usar (portátil propio o puerta).
  const baliza = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 4),
    new THREE.MeshStandardMaterial({ color: 0xf2c14e, emissive: 0xf2c14e, emissiveIntensity: 0.9, flatShading: true }));
  baliza.rotation.x = Math.PI; // punta hacia abajo
  baliza.visible = false;
  escena.add(baliza);
  const posBaliza = new THREE.Vector3();
  function guiar(tipo, asiento = 0) {
    if (tipo === 'laptop' && laptops[asiento]) { laptops[asiento].grupo.getWorldPosition(posBaliza); posBaliza.y += 0.32; baliza.scale.setScalar(1); baliza.visible = true; }
    else if (tipo === 'control') { posBaliza.set(3.2, 2.4, -2.75); baliza.scale.setScalar(3); baliza.visible = true; }
    else baliza.visible = false;
  }

  function actualizar(dt) {
    t += dt;
    if (baliza.visible) {
      baliza.position.set(posBaliza.x, posBaliza.y + Math.sin(t * 3) * 0.02, posBaliza.z);
      baliza.rotation.y = t * 1.5;
      baliza.material.emissiveIntensity = 0.7 + Math.sin(t * 4) * 0.3;
    }
    // Proyector: sube o se guarda (escala y altura), con los hologramas girando encima.
    const metaU = proy.activo ? 1 : 0;
    proy.u = proy.u + Math.sign(metaU - proy.u) * Math.min(Math.abs(metaU - proy.u), dt / 0.6);
    const uS = suave(proy.u);
    grupoProy.visible = proy.u > 0.001;
    proyector.scale.setScalar(Math.max(0.001, Math.min(1, uS * 1.6)));
    for (const [id, h] of Object.entries(holos)) {
      const mio = voto === id, sobre = encima === h.zona;
      h.grupo.rotation.y = t * 0.6 + h.fase;
      h.grupo.position.y = 0.08 + (ALTO_HOLOS - 0.08) * uS + Math.sin(t * 1.4 + h.fase) * 0.025;
      const s = (mio ? 1.7 : sobre ? 1.55 : voto ? 1.2 : 1.4) * uS;
      h.escala += (s - h.escala) * Math.min(1, dt * 8);
      h.grupo.scale.setScalar(Math.max(0.001, h.escala));
      h.grupo.traverse((o) => { if (o.material?.userData?.holo) o.material.opacity = mio || sobre || !voto ? 0.92 : 0.45; });
      h.etiqueta.visible = proy.u > 0.7;
      h.etiqueta.element.classList.toggle('elegido', mio);
      h.etiqueta.element.classList.toggle('encima', sobre && !mio);
    }
    pista.visible = proy.u > 0.7;
    haz.material.opacity = (0.07 + Math.sin(t * 3) * 0.02) * uS;
    moverJefe(dt);

    // Carpetas: contorno que se ve a través de todo (más intenso con el puntero encima).
    const pulso = 0.55 + Math.sin(t * 3.2) * 0.25;
    for (const c of carpetas) {
      const activa = c.grupo.visible && c.zona.userData.activo;
      c.contorno.visible = activa;
      c.pista.visible = activa;
      if (activa) {
        const sobre = encima === c.zona;
        c.contorno.material.opacity = sobre ? 1 : pulso;
        c.relleno.material.opacity = sobre ? 0.28 : 0.1;
        c.pista.element.classList.toggle('encima', sobre);
      }
    }

    // Cinemática del reparto: el jefe retira el proyector (si lo había) y lanza las carpetas una a una.
    if (!cine) return;
    const u = t - cine.t0;
    carpetas.forEach((c, k) => {
      if (!c.id) return;
      const v = (u - DUR.ir - k * DUR.paso) / DUR.carpeta;
      if (v < 0) { c.grupo.visible = false; return; }
      c.grupo.visible = true;
      const w = suave(Math.min(1, v));
      c.grupo.position.lerpVectors(mano, c.destino, w);
      c.grupo.position.y += Math.sin(w * Math.PI) * 0.35;
      c.grupo.rotation.set(0, c.giro + (1 - w) * 1.2, (1 - w) * 0.6);
      if (v >= 1) { c.zona.userData.activo = true; c.grupo.rotation.set(0, c.giro, 0); }
    });
    if (u > finCine()) { cine = null; colocarCarpetas(carpetas.map((c) => c.id), true); }
  }

  // Punto al que mira la cámara durante la cinemática (null si no hay).
  function puntoCinematica(destino) {
    if (!cine) return null;
    const u = t - cine.t0;
    if (u < DUR.ir * 0.6) return destino.set(POS_PROYECTOR.x, Y_MESA + 0.2, POS_PROYECTOR.z);
    if (u < DUR.ir + 0.15) return destino.set(jefe.grupo.position.x, 1.3, jefe.grupo.position.z);
    return destino.set(0, Y_MESA, 0);
  }

  return {
    escena, avatares, casillas, carpetas, laptops, manuales, clicables, jefe,
    actualizar,
    guiar,
    puntoCinematica,
    get enCinematica() { return !!cine; },
    // Centro del proyector, para encuadrar la cámara en el modo de elección.
    focoProyector: POS_PROYECTOR,
    // activo: el proyector está sobre la mesa; animar: false lo pone o quita de golpe (quien llega tarde).
    proyector(activo, animar) {
      proy.activo = !!activo;
      if (!animar) proy.u = proy.activo ? 1 : 0;
      if (!proy.activo) voto = null;
    },
    // ids: lista de misiones repartidas; animar: false para quien llega tarde (se ven ya en la mesa).
    repartir(ids, animar) {
      colocarCarpetas(ids, !animar);
      if (animar && ids?.length) { cine = { t0: t }; carpetas.forEach((c) => { c.zona.userData.activo = false; }); }
      else cine = null;
    },
    // info(id) → { cuerpo, pista, codigo }: foto, código y pista de cada carpeta repartida.
    vestirCarpetas(info) {
      carpetas.forEach((c, k) => { if (c.id) vestirCarpeta(c, c.id, info(c.id) ?? {}, k); });
    },
    seleccionar(id) { voto = id ?? null; },
    // votos: { escenario: [{ color, letra, nick }] } de toda la tripulación.
    mostrarVotos(votos) {
      for (const [id, h] of Object.entries(holos)) {
        h.votos.replaceChildren(...(votos[id] ?? []).map((v) => {
          const b = document.createElement('span');
          b.className = 'holo-voto';
          b.style.background = v.color;
          b.textContent = v.letra;
          b.title = v.nick;
          return b;
        }));
      }
    },
    resaltar(obj) { encima = obj ?? null; },
    // Escalona las pistas según la cámara: la carpeta más cercana lleva la pista más baja, la más lejana la más alta,
    // así no se pisan aunque se miren de lado.
    escalonarPistas(posCamara) {
      const orden = carpetas.map((c) => ({ c, d: c.grupo.position.distanceToSquared(posCamara) })).sort((a, b) => a.d - b.d);
      orden.forEach(({ c }, k) => { c.pista.position.y = 0.12 + k * 0.15; });
    },
    // Después de pintar las etiquetas: si dos pistas se tocan en pantalla, sube la de arriba hasta que no se pisen.
    // La que está bajo el puntero (abierta) queda por encima de las demás.
    desencimarPistas() {
      const cajas = [];
      for (const c of carpetas) {
        const el = c.pista.element;
        if (!c.pista.visible || el.style.display === 'none') continue;
        el.style.translate = '';
        const r = el.getBoundingClientRect();
        if (!r.width) continue;
        cajas.push({ el, top: r.top, bottom: r.bottom, left: r.left, right: r.right, abierta: el.classList.contains('encima') });
      }
      cajas.sort((a, b) => b.bottom - a.bottom); // de abajo (más cerca) hacia arriba
      const puestas = [];
      for (const k of cajas) {
        let dy = 0;
        for (let vuelta = 0; vuelta < 4; vuelta++) {
          const choca = puestas.find((p) => k.left < p.right + 4 && k.right > p.left - 4 && k.top - dy < p.bottom + 4 && k.bottom - dy > p.top - 4);
          if (!choca) break;
          dy = k.bottom - choca.top + 4;
        }
        if (dy) k.el.style.translate = `0 ${-dy}px`;
        puestas.push({ ...k, top: k.top - dy, bottom: k.bottom - dy });
        if (k.abierta) k.el.style.zIndex = '1000';
      }
    },
    marcarCarpeta,
    // Pantalla del portátil de un asiento: esquinas en el mundo, centro, normal (hacia el jugador) y "arriba".
    pantallaLaptop(i) {
      const m = laptops[i].pantalla;
      m.updateWorldMatrix(true, false);
      const q = new THREE.Quaternion(); m.getWorldQuaternion(q);
      return {
        centro: m.getWorldPosition(new THREE.Vector3()),
        normal: new THREE.Vector3(0, 0, 1).applyQuaternion(q),
        arriba: new THREE.Vector3(0, 1, 0).applyQuaternion(q),
        esquinas: [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([sx, sy]) => new THREE.Vector3(sx * PANTALLA_W / 2, sy * PANTALLA_H / 2, 0).applyMatrix4(m.matrixWorld)),
        ancho: PANTALLA_W, alto: PANTALLA_H,
      };
    },
    refrescarTextos() { for (const { div, f } of etiquetas) div.textContent = f(); },
  };
}

// Portátil: base con teclado y pantalla abierta hacia el jugador. La pantalla (plano) es donde main.js pone el DOM.
function crearLaptop(colorRol) {
  const grupo = new THREE.Group();
  const base = caja(0.56, 0.022, 0.38, 0x5a5f66); base.position.y = 0.011; grupo.add(base);
  const teclado = caja(0.48, 0.006, 0.17, 0x2c3036); teclado.position.set(0, 0.024, -0.03); grupo.add(teclado);
  for (let f = 0; f < 4; f++) for (let k = 0; k < 12; k++) {
    const tecla = caja(0.032, 0.006, 0.03, 0xc9c4b6); tecla.position.set(-0.2 + k * 0.0365, 0.028, -0.095 + f * 0.04); grupo.add(tecla);
  }
  const tactil = caja(0.15, 0.004, 0.09, 0x3d4249); tactil.position.set(0, 0.024, -0.14); grupo.add(tactil);
  const tapa = new THREE.Group();
  tapa.position.set(0, 0.02, 0.18);
  tapa.rotation.x = 0.2; // se inclina hacia atrás, lejos del jugador
  const marco = caja(0.56, 0.36, 0.016, 0x4a4f56); marco.position.set(0, 0.185, 0.0); tapa.add(marco);
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(PANTALLA_W, PANTALLA_H), new THREE.MeshBasicMaterial({ color: 0x8fcbd9 }));
  pantalla.position.set(0, 0.19, -0.009);
  pantalla.rotation.y = Math.PI; // mira al jugador (-z local)
  tapa.add(pantalla);
  const pegatina = new THREE.Mesh(new THREE.CircleGeometry(0.045, 10), new THREE.MeshBasicMaterial({ color: colorRol }));
  pegatina.position.set(0, 0.2, 0.009); tapa.add(pegatina);
  grupo.add(tapa);
  const zonaClic = zona(0.58, 0.4, 0.42, {}); zonaClic.position.set(0, 0.2, 0.05); grupo.add(zonaClic);
  return { grupo, pantalla, zona: zonaClic };
}

// Manual SOP del departamento: archivador tumbado con el lomo del color del rol.
function crearManual(rol) {
  const grupo = new THREE.Group();
  const tapa = caja(0.24, 0.055, 0.31, 0x24324a); tapa.position.y = 0.028; grupo.add(tapa);
  const hojas = caja(0.22, 0.04, 0.29, 0xf1e9d6); hojas.position.set(0.008, 0.028, 0); grupo.add(hojas);
  const lomo = caja(0.03, 0.06, 0.31, rol.color); lomo.position.set(-0.12, 0.03, 0); grupo.add(lomo);
  const et = caja(0.1, 0.004, 0.06, 0xf6f0e0); et.position.set(0.02, 0.058, 0.07); grupo.add(et);
  const zonaClic = zona(0.28, 0.12, 0.34, {}); zonaClic.position.y = 0.04; grupo.add(zonaClic);
  return { grupo, zona: zonaClic };
}

// Carpeta de expediente: tapa (gira para abrirse) con portada dibujada, hojas, pestaña, contorno y pista.
function crearCarpeta() {
  const grupo = new THREE.Group();
  const trasera = caja(0.42, 0.012, 0.3, 0xd9a83a); grupo.add(trasera);
  const hojas = caja(0.39, 0.012, 0.27, 0xf4eedd); hojas.position.y = 0.01; grupo.add(hojas);
  for (let k = 0; k < 4; k++) { const l = caja(0.26, 0.002, 0.012, 0x8a8f96); l.position.set(-0.02, 0.017, -0.08 + k * 0.05); grupo.add(l); }
  const bisagra = new THREE.Group(); bisagra.position.set(-0.21, 0.018, 0); grupo.add(bisagra);
  const tapa = caja(0.42, 0.012, 0.3, 0xe8b84a); tapa.position.set(0.21, 0, 0); bisagra.add(tapa);
  const pestana = caja(0.12, 0.012, 0.05, 0xe8b84a); pestana.position.set(0.32, 0, -0.17); bisagra.add(pestana);
  // Portada: lienzo con código, sello y la foto del destino (ver vestirCarpeta).
  const lienzo = document.createElement('canvas'); lienzo.width = 512; lienzo.height = 360;
  const textura = new THREE.CanvasTexture(lienzo); textura.colorSpace = THREE.SRGBColorSpace; textura.anisotropy = 4;
  const portada = new THREE.Mesh(new THREE.PlaneGeometry(0.41, 0.29), new THREE.MeshStandardMaterial({ map: textura, roughness: 0.95 }));
  portada.rotation.x = -Math.PI / 2; portada.position.set(0.21, 0.0068, 0); bisagra.add(portada);
  const brillo = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.34, 20), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  brillo.rotation.x = -Math.PI / 2; brillo.position.y = -0.004; brillo.visible = false; grupo.add(brillo);
  // Contorno y velo que se dibujan por encima de todo: la carpeta se ve aunque algo la tape.
  const caj = new THREE.BoxGeometry(0.47, 0.05, 0.35);
  const contorno = new THREE.LineSegments(new THREE.EdgesGeometry(caj),
    new THREE.LineBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.8, depthTest: false, depthWrite: false }));
  contorno.position.y = 0.02; contorno.renderOrder = 20; contorno.visible = false;
  const relleno = new THREE.Mesh(caj, new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.1, depthTest: false, depthWrite: false }));
  relleno.renderOrder = 19; contorno.add(relleno);
  grupo.add(contorno);
  // Pista en HTML sobre la carpeta.
  const div = document.createElement('div'); div.className = 'carpeta-pista';
  const pista = new CSS2DObject(div); pista.position.y = 0.2; pista.visible = false; grupo.add(pista);
  const zonaClic = zona(0.46, 0.08, 0.34, {}); zonaClic.position.y = 0.03; grupo.add(zonaClic);
  // La tapa gira sobre su bisagra: el resto del código la abre con tapa.rotation.z (ver marcarCarpeta).
  return { grupo, tapa: Object.assign(bisagra, { material: tapa.material }), brillo, contorno, relleno, pista, lienzo, textura, zona: zonaClic, id: null };
}

// ---------- Portada de las carpetas ----------
// Fotos del destino: mapas reales donde los hay (assets/mapas) y dibujo procedural para Tierra y Marte.
const FOTOS = { mercurio: 'assets/mapas/mercurio-color.jpg', luna: 'assets/mapas/luna-color.jpg', cometa: 'assets/mapas/cometa-67p.jpg' };
const imagenes = {};
function imagen(clave, alCargar) {
  let r = imagenes[clave];
  if (!r) {
    r = imagenes[clave] = { img: new Image(), listo: false, esperan: [] };
    r.img.onload = () => { r.listo = true; r.esperan.splice(0).forEach((f) => f()); };
    r.img.src = FOTOS[clave];
  }
  if (r.listo) return r.img;
  r.esperan.push(alCargar);
  return null;
}
// Mapa procedural (equirectangular) para cuerpos sin foto.
function mapaProcedural(clave) {
  if (imagenes['proc-' + clave]) return imagenes['proc-' + clave];
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  let s = clave.length * 977;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const [fondo, manchas, polo] = clave === 'tierra' ? ['#2f6fb5', ['#3f8f4a', '#8a7a4a', '#4a9a52'], '#f4f7fb'] : ['#b5562f', ['#8a3e22', '#d07a48', '#6e3220'], '#efe6dc'];
  g.fillStyle = fondo; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = manchas[i % manchas.length];
    g.beginPath(); g.ellipse(rnd() * 512, 40 + rnd() * 176, 10 + rnd() * 50, 6 + rnd() * 28, rnd() * 3, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = polo; g.fillRect(0, 0, 512, 16); g.fillRect(0, 240, 512, 16); // casquetes polares
  if (clave === 'tierra') {
    g.globalAlpha = 0.5; g.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(rnd() * 512, rnd() * 256, 20 + rnd() * 40, 3 + rnd() * 6, 0, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
  }
  return (imagenes['proc-' + clave] = c);
}
function claveCuerpo(cuerpo) {
  const t = (typeof cuerpo === 'string' ? cuerpo : `${cuerpo?.en ?? ''} ${cuerpo?.es ?? ''}`).toLowerCase();
  if (t.includes('mercur')) return 'mercurio';
  if (t.includes('moon') || t.includes('luna')) return 'luna';
  if (t.includes('comet')) return 'cometa';
  if (t.includes('mars') || t.includes('marte')) return 'marte';
  return 'tierra';
}
const hash = (txt) => [...String(txt)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

// Foto dentro del rectángulo (x, y, w, h). variante: 0 disco entero, 1 primer plano de la superficie, 2 horizonte.
function dibujarFoto(g, x, y, w, h, fuente, figura, variante, desfase) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = '#05070c'; g.fillRect(x, y, w, h);
  for (let i = 0; i < 24; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + (i % 3) * 0.2})`; g.fillRect(x + ((i * 53 + desfase) % w), y + ((i * 37) % h), 1.5, 1.5); }
  if (fuente) {
    const fw = fuente.width, fh = fuente.height;
    if (figura) {
      // Foto de un objeto (el cometa): encuadres distintos de la misma imagen.
      const z = [1, 1.8, 1.35][variante], sw = fw / z, sh = fh / z;
      g.drawImage(fuente, (fw - sw) * [0.5, 0.35, 0.7][variante], (fh - sh) * [0.5, 0.45, 0.3][variante], sw, sh, x, y, w, h);
    } else if (variante === 1) {
      const sw = fw / 7, sh = sw * h / w;
      g.drawImage(fuente, (desfase * 7) % (fw - sw), fh * 0.3, sw, sh, x, y, w, h);
    } else {
      const r = variante === 0 ? Math.min(w, h) * 0.42 : w * 0.9;
      const cx = x + w / 2, cy = variante === 0 ? y + h / 2 : y + h + r * 0.62;
      g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
      g.drawImage(fuente, (desfase * 5) % (fw / 2), 0, fw / 2, fh, cx - r, cy - r, 2 * r, 2 * r);
      const sombra = g.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
      sombra.addColorStop(0, 'rgba(255,255,255,0.12)'); sombra.addColorStop(0.7, 'rgba(0,0,0,0)'); sombra.addColorStop(1, 'rgba(0,0,0,0.75)');
      g.fillStyle = sombra; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
      g.restore();
    }
  }
  g.restore();
}

// info: { cuerpo (dato bilingüe), cuerpoTexto, nombre, sello }.
function vestirCarpeta(c, id, info, indice) {
  const clave = claveCuerpo(info.cuerpo);
  const variante = hash(id) % 3, desfase = hash(id + 'x') % 997;
  const pintar = () => {
    const g = c.lienzo.getContext('2d'), W = c.lienzo.width, H = c.lienzo.height;
    g.fillStyle = '#e8b84a'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(120,80,20,0.12)'; for (let i = 0; i < 9; i++) g.fillRect(0, 30 + i * 38, W, 2);
    // Nombre, destino y sello.
    g.fillStyle = '#3a2a10';
    const nom = info.nombre ?? '—'; let tam = 44;
    g.font = `bold ${tam}px "Space Grotesk", sans-serif`;
    while (tam > 20 && g.measureText(nom).width > W * 0.55) { tam -= 2; g.font = `bold ${tam}px "Space Grotesk", sans-serif`; }
    g.fillText(nom, 26, 66);
    g.font = '22px "Space Grotesk", sans-serif'; g.fillText(info.cuerpoTexto ?? '', 28, 100);
    g.save(); g.translate(120, 270); g.rotate(-0.18);
    g.strokeStyle = '#b3261e'; g.lineWidth = 5; g.strokeRect(-100, -26, 200, 52);
    g.fillStyle = '#b3261e'; g.font = 'bold 26px "Space Grotesk", sans-serif'; g.textAlign = 'center'; g.fillText(info.sello ?? T.clasificado, 0, 9);
    g.restore();
    // Foto tipo polaroid sujeta con un clip.
    g.save(); g.translate(368, 182); g.rotate([-0.08, 0.06, -0.03][indice % 3]);
    g.fillStyle = '#f7f3ea'; g.fillRect(-112, -132, 224, 250);
    const fuente = FOTOS[clave] ? imagen(clave, pintar) : mapaProcedural(clave);
    dibujarFoto(g, -100, -120, 200, 190, fuente, clave === 'cometa', variante, desfase);
    g.fillStyle = '#555'; g.font = '18px "Space Grotesk", sans-serif'; g.textAlign = 'center'; g.fillText(info.cuerpoTexto ?? '', 0, 100);
    g.strokeStyle = '#9aa0a8'; g.lineWidth = 5; g.beginPath(); g.roundRect(-30, -146, 22, 54, 10); g.stroke();
    g.restore();
    c.textura.needsUpdate = true;
  };
  pintar();
  // Solo el nombre de la misión: la descripción está en el expediente (clic en la carpeta).
  const b = document.createElement('b'); b.textContent = info.nombre ?? id;
  c.pista.element.replaceChildren(b);
}

// Hologramas de los tres escenarios. Material semitransparente marcado como holo.
function holoMat(color) {
  const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, flatShading: true, transparent: true, opacity: 0.92 });
  m.userData.holo = true;
  return m;
}
function crearHolograma(id) {
  const g = new THREE.Group();
  if (id === 'orbita') {
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 1), holoMat(0x3f8fe0)));
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.006, 4, 32), holoMat(0xbfe8ff));
    anillo.rotation.x = Math.PI / 2 - 0.35; g.add(anillo);
    const sat = new THREE.Group();
    sat.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), holoMat(0xffffff)));
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.022), holoMat(0x7fd0ff)); p.position.x = s * 0.04; sat.add(p); }
    sat.position.set(0.15, 0.05, 0); g.add(sat);
  } else if (id === 'landing') {
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), holoMat(0xb8bcc4)));
    const lander = new THREE.Group();
    lander.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.05), holoMat(0xf2c14e)));
    for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const pata = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.04, 0.006), holoMat(0xe8e8e8));
      pata.position.set(x * 0.03, -0.025, z * 0.03); pata.rotation.set(z * 0.4, 0, -x * 0.4); lander.add(pata);
    }
    lander.position.y = 0.125; g.add(lander);
  } else {
    const geo = new THREE.DodecahedronGeometry(0.08, 0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * 1.35, pos.getY(i) * (0.8 + (i % 3) * 0.08), pos.getZ(i));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, holoMat(0x9a8a78)));
    const cola = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 8, 1, true), holoMat(0x8fe9ff));
    cola.material.opacity = 0.5; cola.rotation.z = Math.PI / 2; cola.position.x = -0.2; g.add(cola);
  }
  return g;
}

// Avatar en bloques: cuerpo con el color del rol y cabeza con ojos para ver hacia dónde mira.
export function crearAvatar(rol, asiento, dePie = false) {
  const grupo = new THREE.Group();
  const base = dePie ? 0.0 : 0.5;
  if (dePie) { const piernas = caja(0.4, 0.85, 0.24, 0x26262a); piernas.position.y = 0.43; grupo.add(piernas); }
  const torso = caja(0.5, 0.6, 0.3, dePie ? 0x2b2b30 : 0x6f7a87);
  torso.position.y = base + (dePie ? 0.85 : 0.33);
  grupo.add(torso);
  const parche = caja(0.14, 0.14, 0.02, rol.color);
  parche.position.set(0.12, torso.position.y + 0.12, 0.16);
  grupo.add(parche);
  if (dePie) { // gafete y corbata del jefe
    const corbata = caja(0.06, 0.32, 0.02, 0x1a1a1a); corbata.position.set(0, torso.position.y + 0.02, 0.16); grupo.add(corbata);
    const gafete = caja(0.1, 0.13, 0.01, 0xf2f2ee); gafete.position.set(-0.13, torso.position.y - 0.05, 0.16); grupo.add(gafete);
  }
  const cabeza = new THREE.Group();
  cabeza.position.y = torso.position.y + 0.3 + 0.2;
  const craneo = caja(0.34, 0.36, 0.34, 0xe8c4a0); cabeza.add(craneo);
  const pelo = caja(0.36, 0.1, 0.36, dePie ? 0xbfbfbf : 0x4a3222); pelo.position.y = 0.18; cabeza.add(pelo);
  for (const x of [-0.07, 0.07]) { const ojo = caja(0.05, 0.06, 0.02, 0x1a1a1a); ojo.position.set(x, 0.03, 0.175); cabeza.add(ojo); }
  if (dePie) {
    for (const x of [-0.075, 0.075]) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 4, 10), mat(0x111111)); l.position.set(x, 0.03, 0.18); cabeza.add(l); }
    const bigote = caja(0.16, 0.04, 0.02, 0x9a9a9a); bigote.position.set(0, -0.07, 0.178); cabeza.add(bigote);
  }
  grupo.add(cabeza);
  const nombre = etiqueta(rol.nombre ?? '');
  nombre.position.y = cabeza.position.y + 0.38;
  grupo.add(nombre);
  grupo.position.set(asiento.x, 0, asiento.z + (dePie ? 0 : (asiento.ry === 0 ? -0.3 : 0.3)));
  grupo.rotation.y = asiento.ry;
  grupo.visible = false;
  return { grupo, cabeza, nombre };
}
