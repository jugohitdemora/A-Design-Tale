// Propagador orbital sencillo (problema de dos cuerpos, integrador Runge-Kutta 4) para la consola de operaciones.
// No es GMAT: GMAT es una aplicación de escritorio. Esto reproduce lo básico de su "Propagate" (RK4 de paso fijo,
// cuerpo central puntual) para dibujar trayectorias creíbles en el navegador. Las órbitas de los planetas son
// circulares o keplerianas simples; los números sirven para mostrar, las reglas del juego no los leen.
//
// Unidades: heliocéntrico en UA y años (μ☉ = 4π²); geocéntrico en km y s (μ⊕ = 398 600,4418 km³/s²).
export const MU_SOL = 4 * Math.PI * Math.PI;
export const MU_TIERRA = 398600.4418;
export const UA_KM = 149597870.7;

// Cuerpos de destino: elementos orbitales aproximados (a en UA, e) o, para la Luna, radio de su órbita en km.
export const CUERPOS = {
  mercurio: { central: 'sol', a: 0.387, e: 0.2056, nombre: { es: 'Mercurio', en: 'Mercury' }, color: '#c9b49a', radioKm: 2439.7, mu: 22032 },
  cometa: { central: 'sol', a: 3.46, e: 0.641, nombre: { es: '67P/C-G', en: '67P/C-G' }, color: '#bfbfbf', radioKm: 2, mu: 0.00067 },
  luna: { central: 'tierra', rKm: 384400, nombre: { es: 'Luna', en: 'Moon' }, color: '#d8d8d8', radioKm: 1737.4, mu: 4902.8 },
};

// Un paso RK4 de r'' = -μ r / |r|³ en 2D. s = [x, y, vx, vy].
function derivada(s, mu) {
  const [x, y, vx, vy] = s;
  const r3 = Math.pow(x * x + y * y, 1.5) || 1e-12;
  return [vx, vy, -mu * x / r3, -mu * y / r3];
}
export function pasoRK4(s, mu, dt) {
  const k1 = derivada(s, mu);
  const k2 = derivada(s.map((v, i) => v + k1[i] * dt / 2), mu);
  const k3 = derivada(s.map((v, i) => v + k2[i] * dt / 2), mu);
  const k4 = derivada(s.map((v, i) => v + k3[i] * dt), mu);
  return s.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

// Propaga n intervalos de dt y devuelve los puntos [x, y] (incluido el inicial). Cada intervalo se integra en
// `sub` pasos RK4 (cerca del perigeo la velocidad es alta y un paso grande rompe la conservación de la energía).
export function propagar(s0, mu, dt, n, sub = 40) {
  const pts = [[s0[0], s0[1]]];
  let s = s0.slice();
  const h = dt / sub;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < sub; k++) s = pasoRK4(s, mu, h);
    pts.push([s[0], s[1]]);
  }
  return { puntos: pts, final: s };
}

// Órbita kepleriana (elipse con foco en el origen), periapsis en el ángulo w.
export function elipse(a, e, w = 0, n = 180) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const nu = (i / n) * Math.PI * 2;
    const r = a * (1 - e * e) / (1 + e * Math.cos(nu));
    pts.push([r * Math.cos(nu + w), r * Math.sin(nu + w)]);
  }
  return pts;
}

// Trayectoria de la misión para la vista orbital.
// dia: día de lanzamiento elegido (desplaza el ángulo de salida de la Tierra); factor: ΔV relativo (≥ 1).
// → { central: 'sol'|'tierra', escala, orbitas: [{ puntos, color, nombre }], transferencia: [[x,y]], llegada: [x,y],
//     captura: { radio, puntos } , dvKms, diasVuelo }
export function trayectoria(destino, { dia = null, optimo = 0, factor = 1 } = {}) {
  const C = CUERPOS[destino] ?? CUERPOS.mercurio;
  const desfase = dia == null ? 0 : (dia - optimo) * 0.012; // rad: salir otro día cambia la geometría
  if (C.central === 'tierra') {
    // Geocéntrico: órbita de aparcamiento de 200 km e inyección translunar tipo Hohmann (perigeo 6578 km).
    const r1 = 6378 + 200, r2 = C.rKm;
    const at = (r1 + r2) / 2;
    const v1 = Math.sqrt(MU_TIERRA * (2 / r1 - 1 / at)) * (1 + (factor - 1) * 0.02);
    const ang = -Math.PI / 2 + desfase;
    const s0 = [r1 * Math.cos(ang), r1 * Math.sin(ang), -v1 * Math.sin(ang), v1 * Math.cos(ang)];
    const T = Math.PI * Math.sqrt(at ** 3 / MU_TIERRA); // medio periodo de la elipse de transferencia
    const n = 400;
    const { puntos } = propagar(s0, MU_TIERRA, T / n, n);
    const llegada = puntos[puntos.length - 1];
    const aparcamiento = elipse(r1, 0, 0, 90);
    return {
      central: 'tierra', escala: r2 * 1.15, unidad: 'km',
      orbitas: [{ puntos: elipse(r2, 0, 0, 240), color: '#8fa3b8', nombre: C.nombre }, { puntos: aparcamiento, color: '#4fb0ff', nombre: { es: 'LEO 200 km', en: 'LEO 200 km' } }],
      transferencia: puntos, llegada, dvKms: v1 - Math.sqrt(MU_TIERRA / r1), diasVuelo: T / 86400,
      captura: { radio: C.radioKm, puntos: elipse(C.radioKm + 100, 0, 0, 90) },
    };
  }
  // Heliocéntrico: la Tierra en 1 UA, salida tipo Hohmann hacia el perihelio/afelio del destino (aproximación).
  const r1 = 1;
  const r2 = C.e ? (C.a > 1 ? C.a * (1 + C.e) * 0.72 : C.a) : C.a;
  const at = (r1 + r2) / 2;
  const vTierra = Math.sqrt(MU_SOL / r1);
  const vT = Math.sqrt(MU_SOL * (2 / r1 - 1 / at));
  const ang = 0.6 + desfase;
  const s0 = [r1 * Math.cos(ang), r1 * Math.sin(ang), -vT * Math.sin(ang), vT * Math.cos(ang)];
  const T = Math.PI * Math.sqrt(at ** 3 / MU_SOL); // años
  const n = 500;
  const { puntos } = propagar(s0, MU_SOL, T / n, n);
  const llegada = puntos[puntos.length - 1];
  // Orienta la órbita del destino para que pase por el punto de llegada: r(ν) = a(1−e²)/(1+e·cos ν) = r2.
  const cosNu = Math.max(-1, Math.min(1, (C.a * (1 - C.e * C.e) / r2 - 1) / (C.e || 1e-9)));
  const wDestino = Math.atan2(llegada[1], llegada[0]) - Math.acos(cosNu);
  const kmsPorUAano = UA_KM / (365.25 * 86400);
  return {
    central: 'sol', escala: Math.max(1.25, r2 * 1.12), unidad: 'UA',
    orbitas: [
      { puntos: elipse(1, 0.0167, 1.8, 200), color: '#4f8fe0', nombre: { es: 'Tierra', en: 'Earth' } },
      { puntos: elipse(C.a, C.e, wDestino, 260), color: C.color, nombre: C.nombre },
    ],
    transferencia: puntos, llegada,
    dvKms: Math.abs(vT - vTierra) * kmsPorUAano * factor, diasVuelo: T * 365.25,
    captura: { radio: C.radioKm, puntos: elipse(C.radioKm * (destino === 'cometa' ? 15 : 1.4), destino === 'cometa' ? 0 : 0.5, 0, 90) },
  };
}
