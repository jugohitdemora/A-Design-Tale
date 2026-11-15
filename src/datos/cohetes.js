// Catálogo de cohetes (regla DEC-09, flujo-del-juego.md §6): solo cohetes en servicio que han lanzado cargas de NASA.
// Capacidades y precios de investigacion-instrumentos-2.md, parte B (V: página leída; A: resumen de búsqueda).
// Lo que no tiene dato público es una ESTIMACIÓN (conf 'EST', v: null, `juego` con el número y `ec` {es,en} con la ecuación):
//   m(C3) = m_ref × exp(−k × ΔC3)   (C13, ajustada a la curva del Falcon Heavy; k = 0,0277 con booster recuperado, 0,0232 en C3 alto)
//   C3 de salida real de las rutas con asistencias gravitatorias: Luna −2 (V, ULA); Mercurio 12,1 (BepiColombo, v∞ 3,475 km/s, ESA, A);
//   cometa 12,4 (Rosetta, v∞ 3,515 km/s, ESOC/ISSFD 2004, A). C3 = v∞². (Un Hohmann directo daría 56,7 y 54,2: no es el caso de estas rutas.)
// Convención de la capacidad: Luna = con primera etapa recuperada (como en las misiones CLPS); Mercurio y cometa = desechable
// (como Psyche o Europa Clipper). Cada cohete usa UNA configuración (ver `configuracion`).
// Los cohetes reales de las misiones de referencia (Ariane 5, Ariane 5 G+) NO cumplen DEC-09: no están aquí, van en `referencia.coheteReal`.
//
// capacidad: kg por destino.  leo, gto, luna, mercurio, cometa son los destinos de las misiones;
// `sso` es extra (Electron solo tiene dato real a SSO de 500 km, ORB-01).
// Lectores: usoNasa (texto en inglés) y usoNasaEs se conservan para la UI actual; usoNasaT es { es, en } para usar con tx().

const V = (v, src) => ({ v, conf: 'V', src });
const A = (v, src) => ({ v, conf: 'A', src });
const J = (juego, src = 'JUEGO') => ({ v: null, conf: 'JUEGO', src, juego });
const N = (es, en = es) => ({ es, en });
const EST = (valor, src, ec) => ({ v: null, conf: 'EST', src, juego: valor, ec });

// Sin capacidad al destino: no hay curva publicada y el cohete queda muy por debajo de la masa de cualquier nave.
const Z0 = () => J(0);

// Capacidad por masa de referencia y ΔC3 (la cuenta está hecha: el literal es el resultado).
const CURVA = (kg, ref, k, d3, dest) => EST(kg, 'EQ-C13', N(
  `m = m_ref × exp(−k × ΔC3) = ${ref} × exp(−${String(k).replace('.', ',')} × ${String(d3).replace('.', ',')}) ≈ ${kg} kg (${dest.es})`,
  `m = m_ref × exp(−k × ΔC3) = ${ref} × exp(−${k} × ${d3}) ≈ ${kg} kg (${dest.en})`));

export const COHETES = {
  electron: {
    id: 'electron', nombre: N('Electron'), operador: 'Rocket Lab', cumpleDEC09: true,
    capacidad: { leo: V(300, 'ORB-40'), gto: V(0, 'ORB-40'), luna: A(30, 'ORB-40'), mercurio: Z0(), cometa: Z0(), sso: V(200, 'ORB-01') },
    precio: V(7.5, 'ORB-40'),
    usoNasa: 'CubeSats; CAPSTONE (2022); TROPICS (2023)', usoNasaEs: 'CubeSats; CAPSTONE (2022); TROPICS (2023)',
    usoNasaT: N('CubeSats; CAPSTONE (2022); TROPICS (2023)', 'CubeSats; CAPSTONE (2022); TROPICS (2023)'), src: 'ORB-40',
    configuracion: N('Electron con etapa Photon (a la Luna)', 'Electron with Photon stage (to the Moon)'),
    motores: N('9 Rutherford (bomba eléctrica) + 1 de vacío', '9 Rutherford (electric pump) + 1 vacuum'),
    materiales: N('Cuerpo de fibra de carbono; casi todas las piezas de los motores impresas en 3D', 'Carbon-composite body; almost all engine parts 3D printed'),
    registro: N('100 lanzamientos: 96 éxitos y 4 fallos (incluye 9 suborbitales HASTE)', '100 launches: 96 successes and 4 failures (incl. 9 suborbital HASTE)'),
    nota: N('Lanzador pequeño: 300 kg a órbita baja y 200 kg a una órbita heliosíncrona de 500 km. Con la etapa Photon puede dejar hasta 30 kg en órbita lunar.',
      'Small launcher: 300 kg to low orbit and 200 kg to a 500 km sun-synchronous orbit. With the Photon stage it can put up to 30 kg in lunar orbit.'),
  },
  falcon9: {
    id: 'falcon9', nombre: N('Falcon 9'), operador: 'SpaceX', cumpleDEC09: true,
    capacidad: {
      leo: V(22800, 'ORB-41'), gto: V(8300, 'ORB-41'),
      // Luna: GTO con barcaza (5.500 kg, C3 −16,3) llevada a C3 −2 con k = 0,0277.
      luna: CURVA(3700, '5.500', 0.0277, 14.3, N('a la Luna, primera etapa recuperada', 'to the Moon, first stage recovered')),
      // Mercurio y cometa: GTO desechable (8.300 kg, C3 −16,3) con k = 0,0232 hasta C3 12,1 y 12,4 (fuentes BC-18 y CM-17).
      mercurio: CURVA(4290, '8.300', 0.0232, 28.4, N('a Mercurio con C3 = 12,1 (v∞ = 3,475 km/s de BepiColombo), desechable', 'to Mercury at C3 = 12.1 (BepiColombo v∞ = 3.475 km/s), expendable')),
      cometa: CURVA(4270, '8.300', 0.0232, 28.7, N('al cometa con C3 = 12,4 (v∞ = 3,515 km/s de Rosetta), desechable', 'to the comet at C3 = 12.4 (Rosetta v∞ = 3.515 km/s), expendable')),
    },
    precio: V(80.4, 'ORB-05'),
    usoNasa: 'PACE (2024); Blue Ghost Mission 1 (2025)', usoNasaEs: 'PACE (2024); Blue Ghost Mission 1 (2025)',
    usoNasaT: N('PACE (2024); Blue Ghost Mission 1 (2025)', 'PACE (2024); Blue Ghost Mission 1 (2025)'), src: 'ORB-41',
    configuracion: N('Falcon 9 Block 5 (FT)', 'Falcon 9 Block 5 (FT)'),
    motores: N('9 Merlin 1D (854 kN cada uno) + 1 MVac', '9 Merlin 1D (854 kN each) + 1 MVac'),
    materiales: N('Tanques de aluminio-litio soldados por fricción; carenado y patas de fibra de carbono', 'Friction-stir welded Al-Li tanks; carbon-fibre fairing and legs'),
    registro: N('702 lanzamientos: 699 éxitos, 2 fallos, 1 parcial y 1 pérdida en tierra; 660 de 671 aterrizajes', '702 launches: 699 successes, 2 failures, 1 partial and 1 pre-launch loss; 660 of 671 landings'),
    nota: N('Real: 22.800 kg a órbita baja y 8.300 kg a GTO (sin recuperar la primera etapa); 17.500 y 5.500 kg con barcaza. El precio es lo que pagó la NASA por PACE (el de lista es 74 M USD).',
      'Real: 22,800 kg to low orbit and 8,300 kg to GTO (expendable); 17,500 and 5,500 kg with drone-ship landing. The price is what NASA paid for PACE (list price is 74 M USD).'),
  },
  falconheavy: {
    id: 'falconheavy', nombre: N('Falcon Heavy'), operador: 'SpaceX', cumpleDEC09: true,
    capacidad: {
      leo: V(63800, 'ORB-42'), gto: V(26700, 'ORB-42'),
      // Luna: 6.690 kg a C3 = 0 con boosters recuperados (ORB-48), k = ln(6.690 / 3.845) / 20 = 0,0277, a C3 −2.
      luna: CURVA(7070, '6.690', 0.0277, -2, N('a la Luna, boosters recuperados', 'to the Moon, boosters recovered')),
      // Mercurio y cometa: curva desechable (ORB-48): 12.345 kg a C3 = 10 y k = 0,0199 (tramo 10-20) hasta C3 12,1 y 12,4.
      mercurio: CURVA(11840, '12.345', 0.0199, 2.1, N('a Mercurio con C3 = 12,1 (v∞ = 3,475 km/s de BepiColombo), desechable; punto de C3 = 10 de la curva', 'to Mercury at C3 = 12.1 (BepiColombo v∞ = 3.475 km/s), expendable; from the C3 = 10 curve point')),
      cometa: CURVA(11770, '12.345', 0.0199, 2.4, N('al cometa con C3 = 12,4 (v∞ = 3,515 km/s de Rosetta), desechable; punto de C3 = 10 de la curva', 'to the comet at C3 = 12.4 (Rosetta v∞ = 3.515 km/s), expendable; from the C3 = 10 curve point')),
    },
    precio: A(117, 'GEN-01'),
    usoNasa: 'Psyche; Europa Clipper', usoNasaEs: 'Psyche; Europa Clipper', usoNasaT: N('Psyche; Europa Clipper', 'Psyche; Europa Clipper'), src: 'GEN-01',
    configuracion: N('Falcon Heavy (3 núcleos)', 'Falcon Heavy (3 cores)'),
    motores: N('27 Merlin 1D + 1 MVac (etapa 2: 934 kN, Isp 348 s)', '27 Merlin 1D + 1 MVac (stage 2: 934 kN, Isp 348 s)'),
    materiales: N('Piel de aluminio-litio; carenado y patas de fibra de carbono', 'Al-Li skin; carbon-fibre fairing and legs'),
    registro: N('14 lanzamientos, 14 éxitos; 24 de 24 aterrizajes de boosters', '14 launches, 14 successes; 24 of 24 booster landings'),
    nota: N('Real: 63.800 kg a órbita baja y 26.700 kg a GTO (desechable). Los precios reales de lanzamiento de la NASA van de 117 M USD (Psyche) a 256,6 M USD (Dragonfly). Mercurio y cometa salen de su curva real a C3 = 12.',
      'Real: 63,800 kg to low orbit and 26,700 kg to GTO (expendable). Real NASA launch prices run from 117 M USD (Psyche) to 256.6 M USD (Dragonfly). Mercury and comet come from its real curve at C3 = 12.'),
  },
  vulcan: {
    id: 'vulcan', nombre: N('Vulcan Centaur'), operador: 'ULA', cumpleDEC09: true,
    capacidad: {
      leo: V(27200, 'ORB-43'), gto: V(14500, 'ORB-43'), luna: V(11500, 'ORB-43'),
      mercurio: CURVA(8290, '11.500', 0.0232, 14.1, N('a Mercurio con C3 = 12,1 (v∞ = 3,475 km/s de BepiColombo), desde la inyección lunar', 'to Mercury at C3 = 12.1 (BepiColombo v∞ = 3.475 km/s), from the lunar injection value')),
      cometa: CURVA(8230, '11.500', 0.0232, 14.4, N('al cometa con C3 = 12,4 (v∞ = 3,515 km/s de Rosetta), desde la inyección lunar', 'to the comet at C3 = 12.4 (Rosetta v∞ = 3.515 km/s), from the lunar injection value')),
    },
    precio: V(110, 'ORB-43'),
    usoNasa: 'Peregrine (CLPS, 2024); Dream Chaser (planned)', usoNasaEs: 'Peregrine (CLPS, 2024); Dream Chaser (previsto)',
    usoNasaT: N('Peregrine (CLPS, 2024); Dream Chaser (previsto)', 'Peregrine (CLPS, 2024); Dream Chaser (planned)'), src: 'ORB-43',
    configuracion: N('VC6 (6 propulsores sólidos)', 'VC6 (6 solid boosters)'),
    motores: N('2 BE-4 (4.893 kN, Isp 340 s en vacío); Centaur V con 2 RL10C; 0, 2, 4 o 6 GEM 63XL', '2 BE-4 (4,893 kN, Isp 340 s vac); Centaur V with 2 RL10C; 0, 2, 4 or 6 GEM 63XL'),
    materiales: N('No se describen en la fuente', 'Not described in the source'),
    registro: N('4 éxitos hasta feb. 2026, pero 2 anomalías de los propulsores sólidos (oct. 2024 y feb. 2026)', '4 successes through Feb 2026, but 2 solid-booster anomalies (Oct 2024 and Feb 2026)'),
    nota: N('Real: 27.200 kg a órbita baja, 14.500 a GTO y 11.500 a inyección lunar (VC6). Precio aproximado de 110 M USD. Mercurio y cometa son estimaciones.',
      'Real: 27,200 kg to low orbit, 14,500 to GTO and 11,500 to lunar injection (VC6). Price is about 110 M USD. Mercury and comet are estimates.'),
  },
  atlasv: {
    id: 'atlasv', nombre: N('Atlas V'), operador: 'ULA', cumpleDEC09: true,
    capacidad: {
      leo: V(9800, 'ORB-44'), gto: V(4750, 'ORB-44'), luna: V(3160, 'ORB-44'),
      mercurio: CURVA(2280, '3.160', 0.0232, 14.1, N('a Mercurio con C3 = 12,1 (v∞ = 3,475 km/s de BepiColombo), desde la inyección lunar', 'to Mercury at C3 = 12.1 (BepiColombo v∞ = 3.475 km/s), from the lunar injection value')),
      cometa: CURVA(2260, '3.160', 0.0232, 14.4, N('al cometa con C3 = 12,4 (v∞ = 3,515 km/s de Rosetta), desde la inyección lunar', 'to the comet at C3 = 12.4 (Rosetta v∞ = 3.515 km/s), from the lunar injection value')),
    },
    precio: V(109, 'ORB-44'),
    usoNasa: 'Landsat 9; InSight; Perseverance', usoNasaEs: 'Landsat 9; InSight; Perseverance', usoNasaT: N('Landsat 9; InSight; Perseverance', 'Landsat 9; InSight; Perseverance'), src: 'ORB-14',
    configuracion: N('Atlas V 401 (sin propulsores sólidos)', 'Atlas V 401 (no solid boosters)'),
    motores: N('1 RD-180 + Centaur con RL10; 0 a 5 propulsores sólidos según la versión', '1 RD-180 + Centaur with RL10; 0 to 5 solid boosters by version'),
    materiales: N('Tanque de aluminio con isogrid en la primera etapa', 'Isogrid aluminium tank in the first stage'),
    registro: N('110 lanzamientos: 109 éxitos y 1 fallo parcial (2007)', '110 launches: 109 successes and 1 partial failure (2007)'),
    nota: N('Real (versión 401): 9.800 kg a órbita baja, 4.750 a GTO y 3.160 a inyección lunar; la 551 llega a 6.330 kg. Se está retirando. Precio de la 401: 109 M USD. Mercurio y cometa son estimaciones.',
      'Real (401 version): 9,800 kg to low orbit, 4,750 to GTO and 3,160 to lunar injection; the 551 reaches 6,330 kg. Being retired. 401 price: 109 M USD. Mercury and comet are estimates.'),
  },
  pegasus: {
    id: 'pegasus', nombre: N('Pegasus XL'), operador: 'Northrop Grumman', cumpleDEC09: true,
    capacidad: { leo: V(450, 'ORB-45'), gto: Z0(), luna: Z0(), mercurio: Z0(), cometa: Z0() },
    precio: V(40, 'ORB-45'),
    usoNasa: 'ICON (2019)', usoNasaEs: 'ICON (2019)', usoNasaT: N('ICON (2019)', 'ICON (2019)'), src: 'ORB-45',
    configuracion: N('Pegasus XL', 'Pegasus XL'),
    motores: N('Motores sólidos Orion', 'Orion solid motors'),
    materiales: N('Alas y aletas de material compuesto de carbono', 'Carbon-composite wing and fins'),
    registro: N('46 lanzamientos: 41 éxitos, 3 fallos y 2 parciales (89 %); su último vuelo fue el 3 jul. 2026', '46 launches: 41 successes, 3 failures and 2 partial (89 %); its last flight was 3 Jul 2026'),
    nota: N('Cohete pequeño que se lanza desde un avión: 443-450 kg a órbita baja. Precio de 2017: 40 M USD (el contrato de ICON fue de 56,3 M USD). Ya hizo su último vuelo.',
      'Small air-launched rocket: 443-450 kg to low orbit. 2017 price: 40 M USD (the ICON contract was 56.3 M USD). It has flown its last mission.'),
  },
  minotaur4: {
    id: 'minotaur4', nombre: N('Minotaur IV'), operador: 'Northrop Grumman', cumpleDEC09: true,
    capacidad: { leo: V(1591, 'ORB-46'), gto: Z0(), luna: Z0(), mercurio: Z0(), cometa: Z0() },
    precio: V(50, 'ORB-46'),
    usoNasa: null, usoNasaEs: null, usoNasaT: null, src: 'ORB-46',
    configuracion: N('Minotaur IV (la IV+ llega a 1.837 kg)', 'Minotaur IV (the IV+ reaches 1,837 kg)'),
    motores: N('Motores sólidos Peacekeeper SR-118/119/120; etapa superior Orion 38 o Star 48BV', 'Peacekeeper SR-118/119/120 solid motors; Orion 38 or Star 48BV upper stage'),
    materiales: N('Carenado de material compuesto de carbono de 2,3 m', '2.3 m carbon-composite fairing'),
    registro: N('9 vuelos, todos contados como éxitos (en uno fallaron las cargas HTV-2)', '9 flights, all counted as successes (the HTV-2 payloads failed in one)'),
    nota: N('1.591 kg a órbita baja de 200 km. Precio de 2010: unos 50 M USD. No aparece en misiones de la NASA en la fuente.',
      '1,591 kg to a 200 km low orbit. 2010 price: about 50 M USD. No NASA missions on the source page.'),
  },
  sls: {
    id: 'sls', nombre: N('SLS'), operador: 'NASA', cumpleDEC09: true,
    capacidad: {
      leo: V(95000, 'ORB-47'), gto: Z0(), luna: V(27000, 'ORB-47'),
      mercurio: CURVA(19470, '27.000', 0.0232, 14.1, N('a Mercurio con C3 = 12,1 (v∞ = 3,475 km/s de BepiColombo), desde la inyección lunar', 'to Mercury at C3 = 12.1 (BepiColombo v∞ = 3.475 km/s), from the lunar injection value')),
      cometa: CURVA(19330, '27.000', 0.0232, 14.4, N('al cometa con C3 = 12,4 (v∞ = 3,515 km/s de Rosetta), desde la inyección lunar', 'to the comet at C3 = 12.4 (Rosetta v∞ = 3.515 km/s), from the lunar injection value')),
    },
    precio: V(2500, 'ORB-47'),
    usoNasa: 'Artemis I and II', usoNasaEs: 'Artemis I y II', usoNasaT: N('Artemis I y II', 'Artemis I and II'), src: 'ORB-47',
    configuracion: N('SLS Block 1', 'SLS Block 1'),
    motores: N('4 RS-25 (7,4 MN cada uno) + 2 propulsores sólidos de cinco segmentos + ICPS con RL10', '4 RS-25 (7.4 MN each) + 2 five-segment solid boosters + ICPS with RL10'),
    materiales: N('Núcleo de aleación de aluminio 2219; adaptador de aluminio-litio 2195', '2219 aluminium alloy core; 2195 Al-Li adapter'),
    registro: N('Artemis I (nov. 2022) y Artemis II (1 abr. 2026) con éxito', 'Artemis I (Nov 2022) and Artemis II (1 Apr 2026) both succeeded'),
    nota: N('Real: unos 95.000 kg a órbita baja y más de 27.000 kg a inyección lunar. Cuesta al menos 2.500 M USD por lanzamiento (inspector general de la NASA). Mercurio y cometa son estimaciones.',
      'Real: about 95,000 kg to low orbit and over 27,000 kg to lunar injection. Costs at least 2,500 M USD per launch (NASA inspector general). Mercury and comet are estimates.'),
  },
};

export default COHETES;
