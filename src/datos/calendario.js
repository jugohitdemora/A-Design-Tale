// Calendario del reloj de misión (contrato-reloj.md §1–§2): 60 meses, de enero de 2027 (mesAbs 0) a diciembre de 2031 (mesAbs 59).
// Datos literales generados a partir de descargas de la NASA (15/11/2026). Nada de aquí se calcula en el navegador salvo
// lo que depende de la ruta (llegada al cometa): eso lo hace src/reglas/motor.js con COMETA_67P.
// Las reglas lo leen como D.CALENDARIO (src/datos/index.js). Una misión sin `reloj` no usa nada de esto.
//
// Marcas: un número sin marca es el dato tal cual de la fuente (redondeado). EST = número derivado; la fórmula va al lado.
// JUEGO = constante de diseño del juego (no es un dato).
const N = (es, en) => ({ es, en });

export const MESES = 60;
export const ANIO0 = 2027;
// mesAbs → { anio, mes (1..12) }. Fuera de 0..59 se recorta.
export const mesAbsSeguro = (x) => Math.min(MESES - 1, Math.max(0, Math.floor(Number.isFinite(Number(x)) ? Number(x) : 0)));
export const fechaDeMes = (x) => { const m = mesAbsSeguro(x); return { anio: ANIO0 + Math.floor(m / 12), mes: (m % 12) + 1 }; };
export const NOMBRE_MES = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

// ---------- Sitios de lanzamiento: clima mensual (NASA POWER, climatología, 12 meses ene..dic) ----------
// lluvia: PRECTOTCORR (mm/día). viento50: WS50M (m/s, viento a 50 m). nubes: CLOUD_AMT (% de cielo cubierto).
// pScrub (EST): probabilidad de que el tiempo retrase un intento de lanzamiento ese mes.
//   pScrub = min(0.6, 0.04·lluvia + 0.03·max(0, viento50 − 5) + 0.003·max(0, nubes − 40))
//   Calibrada a ojo (CG, sin fuente citada) para dar ≈30 % en verano y ≈15–20 % en invierno en Cabo Cañaveral, el orden de magnitud
//   que suelen citar los partes de la 45th Weather Squadron. Es un valor de JUEGO, no una estadística oficial.
// puntuacion (EST): pScrub normalizado sobre los 12 meses del sitio: (pScrub − min) / (max − min), 0 = mejor mes, 1 = peor.
//   Efecto en la fase de lanzamiento: dp = −puntuacion · EFECTOS.climaDp.
const sitio = (id, nombre, lat, lon, src, d) => ({ id, nombre, lat, lon, src, ...d });
export const SITIOS_LANZAMIENTO = {
  cabo: sitio('cabo', N('Cabo Cañaveral (Florida, EE. UU.)', 'Cape Canaveral (Florida, USA)'), 28.57, -80.65, 'POWER-CABO', {
    lluvia: [2.01, 2.2, 2.21, 2.1, 3.55, 6.93, 5.93, 6.49, 6.12, 3.63, 1.95, 2.16],
    viento50: [6.89, 6.56, 6.76, 6.51, 5.96, 4.87, 4.36, 4.66, 5.63, 6.34, 6.78, 6.71],
    nubes: [55.6, 53.3, 47.4, 43.1, 43.8, 58.2, 57.1, 54.9, 56.1, 47.7, 50.7, 55.6],
    pScrub: [0.184, 0.175, 0.163, 0.139, 0.182, 0.332, 0.288, 0.304, 0.312, 0.208, 0.164, 0.185],
    puntuacion: [0.23, 0.19, 0.12, 0, 0.22, 1, 0.77, 0.85, 0.9, 0.36, 0.13, 0.24],
  }),
  vandenberg: sitio('vandenberg', N('Vandenberg (California, EE. UU.)', 'Vandenberg (California, USA)'), 34.74, -120.57, 'POWER-VAND', {
    lluvia: [2.86, 2.68, 2.13, 0.94, 0.45, 0.2, 0.11, 0.08, 0.29, 0.72, 1.22, 2.49],
    viento50: [5.75, 6.24, 6.45, 7.05, 7.03, 6.78, 5.93, 6.19, 6.04, 5.77, 5.75, 5.95],
    nubes: [50, 52.3, 51.3, 46.4, 48.7, 52.2, 59.9, 58, 49.9, 44.6, 45, 52.4],
    pScrub: [0.167, 0.181, 0.163, 0.118, 0.105, 0.098, 0.092, 0.093, 0.072, 0.066, 0.086, 0.165],
    puntuacion: [0.88, 1, 0.84, 0.45, 0.34, 0.28, 0.23, 0.23, 0.05, 0, 0.17, 0.86],
  }),
  kourou: sitio('kourou', N('Kourou (Guayana Francesa)', 'Kourou (French Guiana)'), 5.24, -52.77, 'POWER-KOUR', {
    lluvia: [9.69, 9.33, 8.08, 12.3, 16.25, 11.14, 7.01, 3.52, 1.8, 1.86, 3.67, 9.78],
    viento50: [4.66, 4.95, 4.84, 4.51, 4.06, 3.47, 3.3, 3.5, 3.66, 3.79, 3.89, 4.26],
    nubes: [68.8, 75.9, 70.8, 75.1, 79.4, 72.4, 58, 46.3, 39.4, 49.4, 60.9, 69.4],
    pScrub: [0.474, 0.481, 0.415, 0.597, 0.6, 0.543, 0.334, 0.16, 0.072, 0.103, 0.209, 0.479],
    puntuacion: [0.76, 0.77, 0.65, 0.99, 1, 0.89, 0.5, 0.17, 0, 0.06, 0.26, 0.77],
  }),
  mahia: sitio('mahia', N('Península de Mahia (Nueva Zelanda)', 'Mahia Peninsula (New Zealand)'), -39.26, 177.86, 'POWER-MAHI', {
    lluvia: [2.31, 2.4, 2.59, 2.99, 3.23, 4.22, 4.74, 4.05, 3.58, 3.18, 2.33, 2.79],
    viento50: [7.23, 7.21, 7.23, 7.45, 8.01, 8.96, 8.79, 8.23, 7.92, 7.79, 7.44, 7.56],
    nubes: [56.4, 58.7, 60, 61.6, 60.2, 62.8, 65.3, 63, 59.1, 60.6, 61.2, 65.1],
    pScrub: [0.209, 0.218, 0.23, 0.258, 0.28, 0.356, 0.379, 0.328, 0.288, 0.273, 0.23, 0.264],
    puntuacion: [0, 0.05, 0.12, 0.29, 0.42, 0.86, 1, 0.7, 0.46, 0.38, 0.12, 0.32],
  }),
  wallops: sitio('wallops', N('Wallops (Virginia, EE. UU.)', 'Wallops (Virginia, USA)'), 37.83, -75.49, 'POWER-WALL', {
    lluvia: [2.65, 2.8, 3.05, 3.1, 3.05, 3.58, 4.18, 4.19, 3.76, 3.73, 2.93, 3.4],
    viento50: [8.03, 7.94, 7.97, 7.92, 6.79, 6.1, 5.54, 5.34, 6.19, 6.99, 7.49, 7.75],
    nubes: [63.5, 60.6, 58.9, 54.6, 55.7, 53.6, 51.8, 52.3, 52.3, 51.4, 54.9, 62.6],
    pScrub: [0.267, 0.262, 0.268, 0.255, 0.223, 0.217, 0.219, 0.215, 0.223, 0.243, 0.237, 0.286],
    puntuacion: [0.73, 0.66, 0.75, 0.56, 0.11, 0.03, 0.06, 0, 0.11, 0.39, 0.31, 1],
  }),
};
// Cohete → sitio real desde el que lanza (claves de src/datos/cohetes.js). Sin entrada: 'cabo'.
// Falcon 9/Heavy, Vulcan, Atlas V y SLS: Florida (CCSFS/KSC). Electron: Rocket Lab LC-1, Mahia.
// Pegasus XL y Minotaur IV: sus últimos vuelos salieron de Vandenberg (ambos han volado también desde Wallops o Cabo Cañaveral).
export const SITIO_COHETE = {
  falcon9: 'cabo', falconheavy: 'cabo', vulcan: 'cabo', atlasv: 'cabo', sls: 'cabo',
  electron: 'mahia', pegasus: 'vandenberg', minotaur4: 'vandenberg',
};

// ---------- Clima espacial (NASA OMNI2, GSFC SPDF, 2014–2025, horario) ----------
// Datos medidos: P(mes con ≥1 día Kp≥7) = 0.3125 en máximo solar (2014, 2023–2025; R medio 129.2) y 0.0278 en mínimo
// (2018–2020; R medio 6.4). P(mes con ≥1 evento SEP ≥10 pfu >10 MeV) = 0.333 en máximo y 0 en mínimo (el flujo solo es válido
// en 2014–2020: la cifra de máximo sale de 12 meses de 2014).
// R (EST): manchas solares esperadas. Supuesto: el ciclo 25 decae como el 24, alineando 2025 (un año tras el máximo de
//   octubre de 2024) con 2015: R(2025 + j) = 123.2 · R24(2015 + j) / 69.7 → 2027: 38.4, 2028: 12.5, 2029: 6.4 (mínimo),
//   2030: 15.3, 2031: 52.6 (subida del ciclo 26). Se interpola linealmente entre centros de año; de julio a diciembre de 2031
//   se mantiene el valor de 2031 (no hay año siguiente en el análogo). No es una predicción oficial (SWPC publica la suya).
// pKp7, pSep (EST): pMin + (pMax − pMin) · clamp01((R − 6.4) / (129.2 − 6.4)).
//   Efecto: dp = −pKp7 · EFECTOS.espacioDp en la fase de crucero de cada misión, y una tormenta al azar (azar 'reloj').
export const ESPACIO = {
  R: [53.2, 50.5, 47.8, 45.1, 42.5, 39.8, 37.4, 35.2, 33, 30.9, 28.7, 26.5, 24.4, 22.2, 20, 17.9, 15.7, 13.5, 12.2, 11.7, 11.2, 10.7, 10.2, 9.7, 9.2, 8.7, 8.2, 7.7, 7.2, 6.6, 6.8, 7.5, 8.2, 9, 9.7, 10.5, 11.2, 11.9, 12.7, 13.4, 14.2, 14.9, 16.8, 19.9, 23, 26.2, 29.3, 32.4, 35.5, 38.6, 41.7, 44.8, 47.9, 51.1, 52.6, 52.6, 52.6, 52.6, 52.6, 52.6],
  pKp7: [0.136, 0.13, 0.124, 0.118, 0.111, 0.105, 0.1, 0.095, 0.089, 0.084, 0.079, 0.074, 0.069, 0.064, 0.059, 0.054, 0.049, 0.044, 0.041, 0.04, 0.039, 0.038, 0.037, 0.035, 0.034, 0.033, 0.032, 0.031, 0.029, 0.028, 0.029, 0.03, 0.032, 0.034, 0.035, 0.037, 0.039, 0.041, 0.042, 0.044, 0.046, 0.047, 0.052, 0.059, 0.066, 0.074, 0.081, 0.088, 0.095, 0.102, 0.11, 0.117, 0.124, 0.131, 0.135, 0.135, 0.135, 0.135, 0.135, 0.135],
  pSep: [0.127, 0.12, 0.112, 0.105, 0.098, 0.091, 0.084, 0.078, 0.072, 0.066, 0.06, 0.055, 0.049, 0.043, 0.037, 0.031, 0.025, 0.019, 0.016, 0.014, 0.013, 0.012, 0.01, 0.009, 0.007, 0.006, 0.005, 0.003, 0.002, 0.001, 0.001, 0.003, 0.005, 0.007, 0.009, 0.011, 0.013, 0.015, 0.017, 0.019, 0.021, 0.023, 0.028, 0.037, 0.045, 0.054, 0.062, 0.07, 0.079, 0.087, 0.096, 0.104, 0.113, 0.121, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125],
};

// ---------- Geometría del destino (JPL Horizons, efemérides diarias geocéntricas 2027–2031) ----------
// elongMin: mínimo del ángulo Sol–Tierra–objetivo (S-O-T, grados) en los días del mes. diasConj: días del mes con S-O-T < 5°
// (conjunción solar: el Sol se interpone en el enlace). Efecto (JUEGO), si el mes de lanzamiento tiene diasConj > 0:
//   horas de enlace × (1 − EFECTOS.enlaceConj · min(1, diasConj / diasPrevistos))   (enlace a la mitad durante esos días)
//   dp = −min(EFECTOS.conjDpMax, EFECTOS.conjDpDia · diasConj) en la fase que sigue al lanzamiento.
// factorDv (EST, solo Mercurio): ΔV relativo por la fase sinódica Tierra–Mercurio (periodo 115.88 d), tomando como fase buena la
//   del despegue real de BepiColombo (20/10/2018 = día −2995 desde el 1/1/2027). Con d = día del 15 del mes:
//   φ = ((d + 2995) / 115.88) mod 1;  factorDv = 1 + 0.6 · (1 − cos 2πφ) / 2   (1 en fase, 1.6 en contrafase).
//   Es un modelo de juego: la geometría real de BepiColombo dependió también de Venus.
// La Luna: factorDv = 1 todos los meses (hay un amanecer en cualquier sitio cada 29.5 días) y sin conjunción que cuente
//   (S-O-T < 5° es luna nueva, no un bloqueo del enlace).
export const DESTINOS = {
  mercurio: {
    src: 'HORIZONS',
    elongMin: [1.8, 3.8, 19, 0.3, 2.5, 4, 11.9, 1.8, 17.7, 1.4, 6.6, 1.2, 6.1, 3.6, 11.9, 0.8, 3.7, 2.4, 1.7, 7.3, 6, 2.4, 0.4, 6.3, 3.1, 20.4, 1.2, 5.6, 0.4, 11.6, 1.4, 21, 3.2, 0.4, 0.7, 2.7, 2.9, 8.6, 1.6, 1.6, 11.9, 1.2, 8.2, 4.1, 5.4, 1, 12.4, 2, 13.9, 2, 7.4, 2.7, 10.5, 0.9, 19.1, 4.8, 1.5, 5.5, 1, 2.5],
    diasConj: [9, 3, 0, 6, 3, 4, 0, 8, 0, 4, 0, 18, 0, 3, 0, 9, 2, 4, 8, 0, 0, 4, 17, 0, 3, 0, 10, 0, 7, 0, 8, 0, 4, 8, 8, 2, 2, 0, 11, 6, 0, 8, 0, 3, 0, 14, 0, 4, 0, 12, 0, 5, 0, 8, 0, 2, 12, 0, 3, 2],
    factorDv: [1.007, 1.261, 1.6, 1.292, 1.002, 1.356, 1.589, 1.198, 1.027, 1.445, 1.55, 1.115, 1.079, 1.52, 1.486, 1.05, 1.154, 1.573, 1.403, 1.011, 1.243, 1.598, 1.309, 1, 1.338, 1.594, 1.215, 1.02, 1.43, 1.559, 1.129, 1.068, 1.508, 1.499, 1.061, 1.139, 1.565, 1.419, 1.016, 1.226, 1.596, 1.327, 1, 1.321, 1.597, 1.232, 1.014, 1.413, 1.568, 1.144, 1.057, 1.495, 1.512, 1.072, 1.124, 1.556, 1.435, 1.022, 1.209, 1.592],
    sinodicoDias: 115.88, refLanzamiento: '2018-10-20',
  },
  cometa: {
    src: 'HORIZONS',
    elongMin: [4, 26.4, 47.3, 71, 95.1, 122.9, 153.8, 133, 102.9, 77.8, 58.3, 42.5, 31, 24.4, 21.5, 20.9, 19.4, 15.1, 7.1, 2.4, 5.9, 20, 37.8, 58.1, 82.7, 112.2, 143.3, 144.9, 113.1, 86.5, 61.7, 38.4, 16.1, 0.5, 8.1, 31.8, 57.8, 85.9, 113.7, 147.2, 145.2, 114.4, 85.5, 58.9, 34.3, 9.3, 0.8, 16.1, 42.3, 69.8, 96.3, 127.9, 160.5, 133.7, 102.9, 74.6, 48.9, 23.2, 1.5, 2.8],
    diasConj: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 3],
  },
  luna: { src: 'HORIZONS' },
};
// Cometa 67P/Churyumov–Gerasimenko (Horizons, registro 90000703, solución JPL#K284/1): perihelio el 10/04/2028 (día 465 desde
// el 1/1/2027), periodo 6.44 años. Regla (JUEGO): la nave tiene que llegar al menos `margenMeses` antes de un perihelio que caiga
// dentro de la vida de la misión (llegada = lanzamiento + días de la ruta); si no, la cobertura del objetivo prioritario × factor.
export const COMETA_67P = { perihelioDia: 465, perihelio: '2028-04-10', periodoAnios: 6.44, margenMeses: 9, factor: 0.6, src: 'HORIZONS' };

// Constantes de efecto (JUEGO): cuánto pesa cada condición en las reglas.
export const EFECTOS = {
  climaDp: 0.04,        // fase de lanzamiento: dp = −puntuacion · 0.04
  espacioDp: 0.06,      // fase de crucero: dp = −pKp7 · 0.06
  conjDpDia: 0.002, conjDpMax: 0.04, enlaceConj: 0.5,
  tormentaCiencia: 0.95, // una tormenta Kp≥7 que sale al azar recorta la ciencia × 0.95 (nunca es un golpe crítico)
};

// Fuentes (se fusionan en FUENTES de src/datos/index.js).
const POWER = (lat, lon) => `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,WS10M,WS50M,RH2M,CLOUD_AMT&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;
const F = (titulo, url, agencia, conf, extra = {}) => ({ titulo, url, agencia, conf, ...extra });
const notaPower = 'NASA POWER monthly climatology: PRECTOTCORR, WS50M, CLOUD_AMT. pScrub and the month score are game estimates (EST) derived from them.';
export const FUENTES_CALENDARIO = {
  'POWER-CABO': F('NASA POWER climatology, Cape Canaveral', POWER(28.57, -80.65), 'NASA LaRC', 'V', { nota: notaPower }),
  'POWER-VAND': F('NASA POWER climatology, Vandenberg', POWER(34.74, -120.57), 'NASA LaRC', 'V', { nota: notaPower }),
  'POWER-KOUR': F('NASA POWER climatology, Kourou', POWER(5.24, -52.77), 'NASA LaRC', 'V', { nota: notaPower }),
  'POWER-MAHI': F('NASA POWER climatology, Mahia Peninsula', POWER(-39.26, 177.86), 'NASA LaRC', 'V', { nota: notaPower }),
  'POWER-WALL': F('NASA POWER climatology, Wallops', POWER(37.83, -75.49), 'NASA LaRC', 'V', { nota: notaPower }),
  HORIZONS: F('JPL Horizons ephemerides 2027–2031 (Mercury, Moon, Sun, comet 67P)', 'https://ssd.jpl.nasa.gov/horizons/', 'NASA JPL', 'V',
    { nota: 'Daily geocentric S-O-T elongation; 67P perihelion 2028-04-10 is a propagation of solution JPL#K284/1. The Mercury ΔV factor is a game model (EST).' }),
  OMNI2: F('NASA OMNI2 hourly data 2014–2025 (Kp, sunspot number, >10 MeV proton flux)', 'https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/', 'NASA GSFC SPDF', 'V',
    { nota: 'Monthly odds of Kp≥7 and SEP measured at solar max and min. The 2027–2031 values assume cycle 25 declines like cycle 24 (EST).' }),
};

export const CALENDARIO = { MESES, ANIO0, NOMBRE_MES, SITIOS_LANZAMIENTO, SITIO_COHETE, ESPACIO, DESTINOS, COMETA_67P, EFECTOS };
export default CALENDARIO;
