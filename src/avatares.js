// Personajes low-poly de la tripulación y del jefe de misión.
// Cada departamento viste su oficio y la tripulación es diversa (género, tono de piel, pelo, prendas):
//   vuelo    · ingeniera de vuelo: mono naranja con bandas reflectantes, coleta.
//   ciencia  · científico: bata blanca sobre camisa verde, gafas, pelo rizado corto y barba.
//   potencia · ingeniero eléctrico: casco blanco, chaleco amarillo de alta visibilidad.
//   comms    · operadora de comunicaciones: hiyab azul y diadema con micrófono.
//   jefe     · directora de misión: pelo canoso corto, americana, credencial y tableta (sin corbata ni bigote).
// Contrato con escena.js / main.js: devuelve { grupo, cabeza }. La cabeza es un grupo cuyo centro queda donde estaba antes
// (sentado 1,33 m, de pie 1,35 m): main.js pone ahí la cámara y gira esa cabeza hacia donde mira cada jugador. El cuerpo mira a +z.
import * as THREE from 'three';

const M = new Map();
const mat = (color, extra = {}) => {
  const k = color + JSON.stringify(extra);
  if (!M.has(k)) M.set(k, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra }));
  return M.get(k);
};
const malla = (geo, color, extra) => new THREE.Mesh(geo, typeof color === 'number' ? mat(color, extra) : color);
const capsula = (r, largo, color) => malla(new THREE.CapsuleGeometry(r, largo, 3, 8), color);
const bola = (r, color, det = 1) => malla(new THREE.IcosahedronGeometry(r, det), color);
const caja = (w, h, d, color) => malla(new THREE.BoxGeometry(w, h, d), color);
const cil = (r1, r2, h, color, seg = 10) => malla(new THREE.CylinderGeometry(r1, r2, h, seg), color);
const en = (o, x, y, z) => { o.position.set(x, y, z); return o; };

export const LOOKS = {
  vuelo: {
    piel: 0xc68c62, pelo: { tipo: 'coleta', color: 0x2a1a12 },
    torso: 0xe07a2a, mangas: 0xe07a2a, pantalon: 0xe07a2a, zapatos: 0x2b2b30, bandas: 0xd8dde4,
  },
  ciencia: {
    piel: 0x5a3622, pelo: { tipo: 'rizado', color: 0x161210 }, barba: 0x161210, gafas: 0x1c1c1c,
    torso: 0x3fa66b, mangas: 0xf4f4f0, pantalon: 0x3a4250, zapatos: 0x3a2a20, bata: 0xf4f4f0,
  },
  potencia: {
    piel: 0xe2b68c, pelo: { tipo: 'corto', color: 0x121212 }, casco: 0xf3f3ee,
    torso: 0x5b6470, mangas: 0x5b6470, pantalon: 0x2f3a4a, zapatos: 0x4a3626, chaleco: 0xe9cf2e, bandas: 0xd8dde4,
  },
  comms: {
    piel: 0xa4704a, hiyab: 0x2f5fa8, cascos: 0x1f2328,
    torso: 0x4a7fd0, mangas: 0x4a7fd0, pantalon: 0x2a2f3a, zapatos: 0x222226,
  },
  jefe: {
    piel: 0x8a5a3a, pelo: { tipo: 'canoso', color: 0xd8d6d2 },
    torso: 0xe9e4da, mangas: 0x34405a, pantalon: 0x34405a, zapatos: 0x1f1f22, americana: 0x34405a, credencial: true, tableta: true,
  },
};

// Cabeza: cráneo, cara (ojos, cejas, nariz, orejas) y peinado o tocado. Centro en (0, 0, 0); la cara mira a +z.
function cabezaDe(L, colorRol) {
  const g = new THREE.Group();
  const craneo = bola(0.15, L.piel, 1); craneo.scale.set(0.98, 1.08, 1.0); g.add(craneo);
  g.add(en(bola(0.022, L.piel, 0), 0, -0.01, 0.15));                     // nariz
  for (const s of [-1, 1]) {
    g.add(en(bola(0.03, L.piel, 0), s * 0.15, 0, -0.005));               // orejas
    const ojo = bola(0.018, 0x1a1412, 0); ojo.scale.set(1, 1.2, 0.6); g.add(en(ojo, s * 0.055, 0.025, 0.138));
    const brillo = bola(0.006, 0xffffff, 0); g.add(en(brillo, s * 0.055 + 0.006, 0.033, 0.149));
    const ceja = caja(0.045, 0.01, 0.01, L.pelo?.color ?? 0x1a1412); ceja.rotation.z = s * -0.12; g.add(en(ceja, s * 0.056, 0.065, 0.142));
  }
  const boca = caja(0.05, 0.008, 0.008, 0x7a3a32); g.add(en(boca, 0, -0.065, 0.142));

  const P = L.pelo;
  if (P) {
    const cap = bola(0.158, P.color, 1); cap.scale.set(1.0, 0.75, 1.02); g.add(en(cap, 0, 0.055, -0.012));
    if (P.tipo === 'coleta') {
      for (const s of [-1, 1]) { const mecha = capsula(0.035, 0.12, P.color); mecha.rotation.z = s * 0.12; g.add(en(mecha, s * 0.135, -0.04, 0.035)); } // pelo largo enmarcando la cara
      g.add(en(bola(0.055, P.color, 1), 0, 0.05, -0.17));
      const cola = capsula(0.04, 0.2, P.color); cola.rotation.x = 0.25; g.add(en(cola, 0, -0.1, -0.2));
    } else if (P.tipo === 'rizado') {
      const r = bola(0.17, P.color, 0); r.scale.set(1.02, 0.62, 1.02); g.add(en(r, 0, 0.09, -0.01));
    } else if (P.tipo === 'canoso') {
      for (const s of [-1, 1]) {
        const lado = bola(0.075, P.color, 1); lado.scale.set(0.6, 1.5, 1.2); g.add(en(lado, s * 0.14, -0.035, 0.0)); // melena corta a la altura de la barbilla
        g.add(en(bola(0.012, 0xe8c060, 0), s * 0.152, -0.06, 0.02));                                       // pendientes
      }
      const nuca = bola(0.12, P.color, 1); nuca.scale.set(1.15, 0.9, 0.7); g.add(en(nuca, 0, -0.01, -0.09));
    }
  }
  if (L.barba) {
    const b = bola(0.11, L.barba, 0); b.scale.set(1.15, 0.7, 0.7); g.add(en(b, 0, -0.085, 0.07));
    g.add(en(caja(0.05, 0.03, 0.01, L.piel), 0, -0.065, 0.15)); // boca visible sobre la barba
  }
  if (L.hiyab) {
    const h = bola(0.175, L.hiyab, 1); h.scale.set(1.0, 1.08, 0.92); g.add(en(h, 0, 0.02, -0.04));
    const cuello = cil(0.12, 0.17, 0.14, L.hiyab, 10); g.add(en(cuello, 0, -0.16, -0.01));
  }
  if (L.gafas) {
    for (const s of [-1, 1]) {
      const aro = malla(new THREE.TorusGeometry(0.033, 0.006, 4, 12), L.gafas); g.add(en(aro, s * 0.056, 0.025, 0.152));
      const patilla = caja(0.006, 0.006, 0.13, L.gafas); g.add(en(patilla, s * 0.09, 0.03, 0.09));
    }
    g.add(en(caja(0.04, 0.006, 0.006, L.gafas), 0, 0.03, 0.155));
  }
  if (L.casco) {
    const casco = malla(new THREE.SphereGeometry(0.175, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), L.casco); g.add(en(casco, 0, 0.06, -0.005));
    g.add(en(cil(0.2, 0.2, 0.012, L.casco, 14), 0, 0.065, 0.015));                  // ala
    g.add(en(caja(0.025, 0.06, 0.2, L.casco), 0, 0.2, -0.005));                      // cresta
    g.add(en(caja(0.07, 0.035, 0.01, colorRol), 0, 0.12, 0.165));                    // escudo del departamento
  }
  if (L.cascos) { // diadema de operadora con micrófono
    const arco = malla(new THREE.TorusGeometry(0.17, 0.012, 4, 16, Math.PI), L.cascos); arco.rotation.y = Math.PI / 2; g.add(en(arco, 0, 0.02, 0));
    for (const s of [-1, 1]) { const auricular = cil(0.045, 0.045, 0.03, L.cascos, 10); auricular.rotation.z = Math.PI / 2; g.add(en(auricular, s * 0.175, 0.0, 0)); }
    const brazo = caja(0.008, 0.008, 0.12, L.cascos); brazo.rotation.y = -0.5; g.add(en(brazo, 0.15, -0.05, 0.08));
    g.add(en(bola(0.015, colorRol, 0), 0.115, -0.06, 0.135));
  }
  return g;
}

// Cuerpo completo. dePie: el jefe; sentado: la tripulación en su silla, con los antebrazos hacia la mesa.
export function crearPersonaje(L, { dePie = false, colorRol = 0x888888 } = {}) {
  const g = new THREE.Group();
  const yTorso = dePie ? 0.85 : 0.83;           // centro del torso
  const yCadera = yTorso - 0.27;
  const yHombro = yTorso + 0.22;

  // Torso y caderas
  const torso = capsula(0.16, 0.26, L.torso); torso.scale.set(1.08, 1, 0.68); g.add(en(torso, 0, yTorso, 0));
  const cadera = caja(0.34, 0.14, 0.22, L.pantalon); g.add(en(cadera, 0, yCadera, 0));
  g.add(en(cil(0.055, 0.06, 0.08, L.piel, 8), 0, yHombro + 0.06, 0));       // cuello

  // Capas por oficio
  if (L.bandas && !L.chaleco) { g.add(en(caja(0.3, 0.022, 0.01, L.bandas), 0, yTorso + 0.06, 0.112)); g.add(en(caja(0.012, 0.36, 0.01, 0x8a4a1a), 0, yTorso - 0.06, 0.113)); } // banda reflectante en el pecho y cremallera del mono
  if (L.bata) { // bata abierta: dos paños largos y cuello
    for (const s of [-1, 1]) {
      const pano = caja(0.15, dePie ? 0.62 : 0.5, 0.025, L.bata); g.add(en(pano, s * 0.1, yTorso - (dePie ? 0.08 : 0.03), 0.11));
      const lado = caja(0.025, 0.5, 0.2, L.bata); g.add(en(lado, s * 0.18, yTorso - 0.02, 0));
    }
    g.add(en(caja(0.06, 0.075, 0.01, 0x2a6f97), -0.1, yTorso + 0.05, 0.127));   // bolígrafos en el bolsillo
  }
  if (L.chaleco) {
    for (const s of [-1, 1]) { const p = caja(0.13, 0.42, 0.025, L.chaleco); g.add(en(p, s * 0.095, yTorso - 0.02, 0.11)); }
    const espalda = caja(0.34, 0.42, 0.025, L.chaleco); g.add(en(espalda, 0, yTorso - 0.02, -0.11));
    for (const y of [yTorso - 0.06, yTorso - 0.14]) { g.add(en(caja(0.35, 0.02, 0.26, L.bandas), 0, y, 0)); }
  }
  if (L.americana) {
    for (const s of [-1, 1]) {
      const p = caja(0.14, 0.5, 0.03, L.americana); g.add(en(p, s * 0.11, yTorso - 0.02, 0.105));
      const sol = caja(0.05, 0.16, 0.01, L.americana); sol.rotation.z = s * 0.35; g.add(en(sol, s * 0.06, yTorso + 0.13, 0.122));
    }
    g.add(en(caja(0.36, 0.5, 0.03, L.americana), 0, yTorso - 0.02, -0.1));
  }
  // Insignia del departamento (o credencial del jefe)
  if (L.credencial) {
    const cinta = caja(0.012, 0.22, 0.008, 0x2a6f97); cinta.rotation.z = 0.25; g.add(en(cinta, 0.03, yTorso + 0.06, 0.125));
    g.add(en(caja(0.07, 0.09, 0.01, 0xf2f2ee), 0.055, yTorso - 0.06, 0.128));
  } else {
    g.add(en(caja(0.07, 0.07, 0.012, colorRol), 0.1, yTorso + 0.1, 0.125));
  }

  // Brazos: hombro, brazo, antebrazo y mano
  for (const s of [-1, 1]) {
    const hombro = new THREE.Group(); g.add(en(hombro, s * 0.22, yHombro - 0.02, 0));
    const brazo = capsula(0.05, 0.2, L.mangas); en(brazo, 0, -0.13, 0); hombro.add(brazo);
    const codo = new THREE.Group(); en(codo, 0, -0.26, 0); hombro.add(codo);
    const ante = capsula(0.045, 0.18, L.mangas); en(ante, 0, -0.11, 0); codo.add(ante);
    const mano = bola(0.045, L.piel, 0); mano.scale.set(0.8, 1, 0.9); en(mano, 0, -0.24, 0); codo.add(mano);
    if (dePie) {
      hombro.rotation.z = s * 0.08;
      if (s > 0 && L.tableta) { codo.rotation.x = -1.35; hombro.rotation.x = -0.15; }
    } else {
      hombro.rotation.set(-0.35, 0, s * 0.06);   // brazos hacia delante, sobre la mesa
      codo.rotation.x = -1.15;
    }
    if (s > 0 && dePie && L.tableta) {
      const t = caja(0.2, 0.012, 0.15, 0x22262e); en(t, 0, -0.27, 0.03); t.rotation.x = 0.2; codo.add(t);
      const pant = caja(0.18, 0.004, 0.13, 0x7fd0ff); en(pant, 0, -0.262, 0.03); pant.rotation.x = 0.2; pant.material = mat(0x7fd0ff, { emissive: 0x3a8fbf, emissiveIntensity: 0.6 }); codo.add(pant);
    }
  }

  // Piernas
  for (const s of [-1, 1]) {
    if (dePie) {
      const muslo = capsula(0.07, 0.32, L.pantalon); g.add(en(muslo, s * 0.09, yCadera - 0.22, 0));
      const pierna = capsula(0.06, 0.28, L.pantalon); g.add(en(pierna, s * 0.09, 0.2, 0));
      const zap = caja(0.1, 0.07, 0.2, L.zapatos); g.add(en(zap, s * 0.09, 0.035, 0.04));
    } else {
      const muslo = capsula(0.07, 0.3, L.pantalon); muslo.rotation.x = Math.PI / 2; g.add(en(muslo, s * 0.09, yCadera - 0.02, 0.2));
      const pierna = capsula(0.06, 0.34, L.pantalon); g.add(en(pierna, s * 0.09, 0.3, 0.38));
      const zap = caja(0.1, 0.07, 0.2, L.zapatos); g.add(en(zap, s * 0.09, 0.035, 0.42));
    }
  }
  if (L.bandas && !L.chaleco) for (const s of [-1, 1]) g.add(en(caja(0.15, 0.02, 0.15, L.bandas), s * 0.09, dePie ? 0.28 : 0.28, dePie ? 0 : 0.38));

  const cabeza = cabezaDe(L, colorRol);
  cabeza.position.y = yTorso + 0.5;
  g.add(cabeza);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return { grupo: g, cabeza };
}
