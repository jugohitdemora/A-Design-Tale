// Escenarios y misiones. 3 jugables (MER-3, LUN-3, COM-1: una por escenario, mecanicas-del-juego.md §2) y 15 filas `jugable: false`
// (las otras 6 de Mateo y las 9 de misiones-referencias.md). Para volver jugable una fila: ver recursos-nasa.md §3.
//
// Números: `presupuesto` es un valor {v, conf, src}; `horasSombra`, `horasEnlace`, `diasPrevistos`, `valor`, `usoObjetivo`, `pBase`, `p`, `dp`
// son números simples (así los muestra el contrato §10). `ruta.dias`, `ruta.masa`, `ruta.precio` son valores {v, conf, src[, juego]}.
// Campos extra respecto a §10 (nunca renombran nada): `referencia.cifras` (cifras reales para el informe), `reserva`/`nota` en filas sin cablear,
// `pieza`/`objetivo`/`min` en `verificacion`, `desc`/`regla`/`misiones` en ESCENARIOS.
// `reloj` (contrato-reloj.md §1): `inicio` = mes del calendario (0 = enero de 2027) en que empieza el diseño; `plazos` = meses de
// compromiso que se ofrecen en el expediente (corto, medio, largo). Los inversores pagan +10 % por el corto y −10 % por el largo.

const N = (es, en = es) => ({ es, en });
const E = (en) => ({ en });
const V = (v, src) => ({ v, conf: 'V', src });
const I = (v, src = 'JUEGO') => ({ v, conf: 'INF', src });
const J = (juego, src = 'JUEGO') => ({ v: null, conf: 'JUEGO', src, juego });
const C = (en, src) => ({ en, src });

export const ESCENARIOS = [
  {
    id: 'orbita', nombre: N('ÓRBITA', 'ORBIT'),
    desc: E('Put a spacecraft in orbit around a world and bring its data home.'),
    regla: E('Score: the useful data you send home during the life of the mission.'),
    misiones: ['MER-3', 'MER-1', 'MER-2', 'M-ORB-1', 'M-ORB-3', 'M-ORB-4'],
  },
  {
    id: 'landing', nombre: N('LANDING', 'LANDING'),
    desc: E('Land a probe on the surface and work there as long as you can.'),
    regla: E('Score: the chain from launch to touchdown must hold, then science times the days you work on the surface.'),
    misiones: ['LUN-3', 'LUN-1', 'LUN-2', 'M-LND-1', 'M-LND-2', 'M-LND-3'],
  },
  {
    id: 'exploracion', nombre: N('EXPLORACIÓN', 'EXPLORATION'),
    desc: E('Explore a place nobody knows yet and find what is hidden there.'),
    regla: E('Score: the science you gain plus hidden findings, for every watt-hour you spend.'),
    misiones: ['COM-1', 'COM-2', 'COM-3', 'M-EXP-1', 'M-EXP-2', 'M-EXP-3'],
  },
];

// ---------------------------------------------------------------------------------------------------------------------
// Misiones jugables
// ---------------------------------------------------------------------------------------------------------------------
const MER_3 = {
  id: 'MER-3', escenario: 'orbita', cuerpo: N('Mercurio', 'Mercury'), nombre: N('Planeta de hierro', 'IRON PLANET'), jugable: true, nivel: 'media',
  apertura: E('November 2026. After seven years and nine flybys, two spacecraft brake into orbit around the planet closest to the Sun.'),
  brief: E('Build an orbiter that maps what Mercury is made of, then send the data home.'),
  referencia: {
    mision: 'BepiColombo (MPO)', agencia: 'ESA with JAXA', coheteReal: 'Ariane 5', src: 'BC-01',
    cifras: [
      C('Launch mass was 4,100 kg, and 1,400 kg of it was propellant.', 'BC-01'),
      C('The MPO orbiter weighs 1,230 kg, with 85 kg of science instruments.', 'BC-01'),
      C('Its solar wings make up to 1,000 W in the science phase.', 'BC-03'),
      C('A 1.5 m2 radiator sheds 200 W of heat.', 'BC-02'),
    ],
  },
  destino: 'mercurio', reloj: { inicio: 0, plazos: [12, 18, 24] }, presupuesto: I(1100), horasSombra: 1.5, horasEnlace: 8, diasPrevistos: 365, limites: {},
  objetivos: [
    { id: 'MER-3-O1', prioridad: true, nombre: E('Learn what the surface is made of'), valor: 40, requiere: ['ME-14', 'ME-15', 'ME-16'], usoObjetivo: 10,
      datoReal: E('MESSENGER found more potassium and sulfur than expected, which does not fit the big-impact idea.'), src: 'BC-09' },
    { id: 'MER-3-O2', prioridad: false, nombre: E('Find out why Mercury is so dense'), valor: 30, requiere: ['ME-13', 'ME-17'], usoObjetivo: 8,
      datoReal: E('BepiColombo will answer ESA questions 2 and 3: why the planet is so dense and whether its core is liquid.'), src: 'BC-04' },
    { id: 'MER-3-O3', prioridad: false, nombre: E('Look for water ice in polar craters'), valor: 30, requiere: ['ME-13', 'ME-14', 'ME-17'], usoObjetivo: 8,
      datoReal: E('MESSENGER saw water ice under dark material in craters at the poles.'), src: 'BC-09' },
  ],
  piezas: ['ME-05', 'ME-02', 'JG-MER-ACT', 'ME-13', 'ME-14', 'ME-15', 'ME-16', 'ME-17', 'ME-18', 'ME-20', 'ME-21', 'ME-23', 'ME-24', 'ME-25', 'ME-28', 'JG-MER-OBC'],
  cohetes: ['falconheavy', 'vulcan', 'atlasv'],
  rutas: [
    { id: 'MER-3-R1', nombre: E('Nine flybys'), dias: V(2557, 'BC-01'), masa: V(1400, 'BC-01'), precio: J(60), efecto: { fase: 'cruise', dp: -0.02 } },
    { id: 'MER-3-R2', nombre: E('Fewer flybys, more fuel'), dias: I(1800), masa: J(1900), precio: J(25), efecto: { fase: 'cruise', dp: 0.03 } },
  ],
  fases: [
    { id: 'launch', nombre: E('Launch'), critica: true, pBase: 0.95, mejoras: [] },
    { id: 'cruise', nombre: E('Cruise and flybys'), critica: true, pBase: 0.9, mejoras: [{ por: 'CT-MER-1', dp: 0.05 }, { por: 'ME-02', dp: 0.02 }] },
    { id: 'insertion', nombre: E('Orbit insertion'), critica: true, pBase: 0.88, mejoras: [{ por: 'JG-MER-ACT', dp: 0.04 }, { por: 'CT-MER-3', dp: 0.03 }] },
    { id: 'commissioning', nombre: E('Commissioning'), critica: false, pBase: 0.93, mejoras: [{ por: 'JG-MER-OBC', dp: 0.04 }] },
    { id: 'science', nombre: E('Science orbit'), critica: false, pBase: 0.9, mejoras: [{ por: 'ME-23', dp: 0.03 }, { por: 'CT-MER-2', dp: 0.03 }, { por: 'CT-MER-4', dp: 0.03 }] },
  ],
  eventosDiseno: ['ED-MER-IN', 'ED-MER-OUT', 'ED-MER-OBJ', 'ED-MER-LIM'],
  eventosMision: ['EM-MER-1', 'EM-MER-2', 'EM-MER-3', 'EM-MER-4', 'EM-MER-5', 'EM-MER-6'],
  contingencias: ['CT-MER-1', 'CT-MER-2', 'CT-MER-3', 'CT-MER-4'],
  puntuacion: 'datos',
  verificacion: [
    { id: 'MER-3-V1', texto: E('An antenna is mounted to send the data home.'), tipo: 'pieza', pieza: 'ME-25' },
    { id: 'MER-3-V2', texto: E('The priority goal has at least half of its coverage.'), tipo: 'coberturaMin', objetivo: 'MER-3-O1', min: 0.5 },
  ],
  fusion3: ['potencia', 'comms'],
};

const LUN_3 = {
  id: 'LUN-3', escenario: 'landing', cuerpo: N('La Luna', 'The Moon'), nombre: N('Ventana a la magnetosfera', 'MAGNETIC WINDOW'), jugable: true, nivel: 'media',
  apertura: E('2 March 2025. A lander touches down in Mare Crisium carrying ten NASA instruments. One of them needs no power at all: it is a mirror.'),
  brief: E('Land on the Moon and use an X-ray camera to watch the magnetic shield of Earth.'),
  referencia: {
    mision: 'Blue Ghost Mission 1', agencia: 'Firefly Aerospace for NASA (CLPS)', coheteReal: 'Falcon 9', src: 'BG-02',
    cifras: [
      C('It landed on 2 March 2025 in Mare Crisium with ten NASA instruments.', 'BG-02'),
      C('The lander made up to 400 W and worked more than 14 days on the surface.', 'BG-01'),
      C('LEXI weighs 11.1 kg, uses 1.6 W and sends 40 kbps.', 'BG-07'),
      C('NASA paid about 101 M USD for the delivery and 44 M USD for the ten payloads (press report).', 'BG-03'),
    ],
  },
  destino: 'luna', reloj: { inicio: 0, plazos: [6, 10, 14] }, presupuesto: I(185), horasSombra: 5, horasEnlace: 8, diasPrevistos: 14, limites: {},
  objetivos: [
    { id: 'LUN-3-O1', prioridad: true, nombre: E('Take X-ray pictures of the magnetic shield of Earth'), valor: 40, requiere: ['LE-10'], usoObjetivo: 16,
      datoReal: E('LEXI took X-ray images of where the solar wind hits the magnetic field of Earth.'), src: 'BG-04' },
    { id: 'LUN-3-O2', prioridad: false, nombre: E('Watch the shield change with the solar wind'), valor: 25, requiere: ['LE-10'], usoObjetivo: 12,
      datoReal: E('LEXI was built to watch the shield react when the solar wind changes.'), src: 'BG-05' },
    { id: 'LUN-3-O3', prioridad: false, nombre: E('Measure the thin atmosphere of the Moon'), valor: 20, requiere: ['LE-10'], usoObjetivo: 12,
      datoReal: E('LEXI measured density profiles of the lunar exosphere using the same X-ray glow.'), src: 'BG-04' },
    { id: 'LUN-3-OX', prioridad: false, nombre: E('Probe the ground with electric and magnetic fields'), valor: 15, requiere: ['LE-11'], usoObjetivo: 8,
      datoReal: E('LMS found a ground conductivity very close to that of the Apollo 12 site.'), src: 'BG-04' },
  ],
  piezas: ['LE-04', 'LE-05', 'JG-LUN-GNC', 'LE-10', 'LE-11', 'LE-12', 'LE-13', 'LE-14', 'LE-15', 'LE-16', 'LE-17', 'LE-18'],
  cohetes: ['falcon9', 'falconheavy', 'vulcan'],
  rutas: [
    { id: 'LUN-3-R1', nombre: E('Phasing orbits (45 days)'), dias: V(45, 'BG-01'), masa: J(900), precio: I(0), efecto: { fase: 'transit', dp: 0.03 } },
    { id: 'LUN-3-R2', nombre: E('Direct flight (a few days)'), dias: J(5), masa: J(1300), precio: I(0), efecto: { fase: 'landing', dp: -0.03 } },
  ],
  fases: [
    { id: 'launch', nombre: E('Launch'), critica: true, pBase: 0.95, mejoras: [] },
    { id: 'transit', nombre: E('Cruise to the Moon'), critica: true, pBase: 0.93, mejoras: [{ por: 'CT-LUN-1', dp: 0.05 }] },
    { id: 'orbit', nombre: E('Lunar orbit'), critica: true, pBase: 0.92, mejoras: [{ por: 'LE-17', dp: 0.02 }] },
    { id: 'landing', nombre: E('Landing'), critica: true, pBase: 0.78, mejoras: [{ por: 'LE-05', dp: 0.02 }, { por: 'JG-LUN-GNC', dp: 0.08 }, { por: 'CT-LUN-2', dp: 0.06 }, { por: 'LE-18', dp: 0.02 }] },
    { id: 'surface', nombre: E('Surface operations'), critica: false, pBase: 0.88, mejoras: [{ por: 'LE-14', dp: 0.04 }, { por: 'CT-LUN-3', dp: 0.04 }, { por: 'LE-15', dp: 0.03 }, { por: 'CT-LUN-4', dp: 0.03 }] },
  ],
  eventosDiseno: ['ED-LUN-IN', 'ED-LUN-OUT', 'ED-LUN-OBJ', 'ED-LUN-LIM'],
  eventosMision: ['EM-LUN-1', 'EM-LUN-2', 'EM-LUN-3', 'EM-LUN-4', 'EM-LUN-5', 'EM-LUN-6'],
  contingencias: ['CT-LUN-1', 'CT-LUN-2', 'CT-LUN-3', 'CT-LUN-4'],
  puntuacion: 'cadena',
  verificacion: [
    { id: 'LUN-3-V1', texto: E('LEXI is mounted.'), tipo: 'pieza', pieza: 'LE-10' },
    { id: 'LUN-3-V2', texto: E('The landing sensors are mounted.'), tipo: 'pieza', pieza: 'JG-LUN-GNC' },
  ],
  fusion3: ['vuelo', 'comms'],
};

const COM_1 = {
  id: 'COM-1', escenario: 'exploracion', cuerpo: N('Cometa 67P', 'Comet 67P'), nombre: N('Cazador de gases', 'GAS HUNTER'), jugable: true, nivel: 'media',
  apertura: E('6 August 2014. After ten years in space, a spacecraft arrives at a comet nobody had ever seen up close.'),
  brief: E('Fly alongside comet 67P and sniff its gases, even the ones nobody expects.'),
  referencia: {
    mision: 'Rosetta', agencia: 'ESA, with contributions from NASA', coheteReal: 'Ariane 5 G+', src: 'CM-01',
    cifras: [
      C('It launched on 2 March 2004 and reached the comet on 6 August 2014.', 'CM-01'),
      C('The orbiter weighed 2,900 kg: 1,670 kg of propellant and 165 kg of science.', 'CM-01'),
      C('Its panels gave 850 W at 3.4 AU and 395 W at 5.25 AU.', 'CM-08'),
      C('The whole mission returned 220 GB and more than 100,000 images.', 'CM-02'),
    ],
  },
  destino: 'cometa', reloj: { inicio: 0, plazos: [10, 18, 30] }, presupuesto: I(960), horasSombra: 2, horasEnlace: 8, diasPrevistos: 730, limites: {},
  objetivos: [
    { id: 'COM-1-O1', prioridad: true, nombre: E('Find which gases leave the comet and how much'), valor: 40, requiere: ['CE-08', 'CE-09'], usoObjetivo: 10,
      datoReal: E('ALICE measured how fast the comet makes water, carbon monoxide and carbon dioxide.'), src: 'CM-03' },
    { id: 'COM-1-O2', prioridad: false, nombre: E('Watch the comet wake up near the Sun'), valor: 30, requiere: ['CE-08', 'CE-10', 'CE-11'], usoObjetivo: 10,
      datoReal: E('Rosetta stayed with the comet through its closest point to the Sun on 13 August 2015.'), src: 'CM-01' },
    { id: 'COM-1-O3', prioridad: false, nombre: E('Hunt for unexpected gases'), valor: 30, requiere: ['CE-08'], usoObjetivo: 12,
      datoReal: E('ROSINA found molecular oxygen, a first at a comet, in more than 3,000 samples.'), src: 'CM-06' },
  ],
  piezas: ['CE-04', 'CE-05', 'CE-06', 'JG-COM-ACT', 'CE-08', 'CE-09', 'CE-10', 'CE-11', 'CE-16', 'CE-12', 'CE-14', 'CE-24', 'CE-26', 'CE-28', 'JG-COM-MLI', 'CE-29', 'CE-31', 'JG-COM-OBC'],
  cohetes: ['falconheavy', 'vulcan', 'atlasv'],
  rutas: [
    { id: 'COM-1-R1', nombre: E('Four gravity assists (10 years)'), dias: V(3652, 'CM-01'), masa: V(1670, 'CM-01'), precio: J(70), efecto: { fase: 'cruise', dp: -0.02 } },
    { id: 'COM-1-R2', nombre: E('Fewer assists, more fuel'), dias: I(2200), masa: J(2300), precio: J(30), efecto: { fase: 'cruise', dp: 0.03 } },
  ],
  fases: [
    { id: 'launch', nombre: E('Launch'), critica: true, pBase: 0.95, mejoras: [] },
    { id: 'cruise', nombre: E('Cruise and gravity assists'), critica: true, pBase: 0.9, mejoras: [{ por: 'CT-COM-2', dp: 0.03 }] },
    { id: 'wake', nombre: E('Wake-up from hibernation'), critica: true, pBase: 0.9, mejoras: [{ por: 'CT-COM-3', dp: 0.05 }, { por: 'JG-COM-OBC', dp: 0.02 }, { por: 'CE-28', dp: 0.03 }] },
    { id: 'arrival', nombre: E('Rendezvous with the comet'), critica: true, pBase: 0.9, mejoras: [{ por: 'JG-COM-ACT', dp: 0.03 }] },
    { id: 'coma', nombre: E('Science in the coma'), critica: false, pBase: 0.92, mejoras: [{ por: 'CE-05', dp: 0.03 }, { por: 'CT-COM-1', dp: 0.03 }, { por: 'CE-31', dp: 0.03 }, { por: 'CT-COM-4', dp: 0.02 }] },
  ],
  eventosDiseno: ['ED-COM-IN', 'ED-COM-OUT', 'ED-COM-OBJ', 'ED-COM-LIM'],
  eventosMision: ['EM-COM-1', 'EM-COM-2', 'EM-COM-3', 'EM-COM-4', 'EM-COM-5', 'EM-COM-6'],
  contingencias: ['CT-COM-1', 'CT-COM-2', 'CT-COM-3', 'CT-COM-4'],
  puntuacion: 'oculto',
  // Hallazgos ocultos. `p`, `valor` y el instrumento de `detecta` son decisión de diseño (los md solo dicen qué encontró Rosetta, no con qué
  // instrumento para glicina y fósforo).
  oculto: [
    { id: 'COM-1-H1', nombre: E('Molecular oxygen'), p: 0.5, detecta: ['CE-08'], valor: 20,
      casoReal: E('ROSINA made the first detection of molecular oxygen at a comet, in more than 3,000 samples from September 2014 to March 2015.'), src: 'CM-06' },
    { id: 'COM-1-H2', nombre: E('Glycine and phosphorus'), p: 0.35, detecta: ['CE-08'], valor: 25,
      casoReal: E('Rosetta found glycine, an amino acid, and phosphorus at comet 67P.'), src: 'CM-01' },
    { id: 'COM-1-H3', nombre: E('Gas and dust surge at perihelion'), p: 0.6, detecta: ['CE-09', 'CE-11'], valor: 15,
      casoReal: E('Rosetta stayed with the comet through its closest point to the Sun on 13 August 2015; ALICE tracked its water and carbon gases.'), src: 'CM-01' },
    { id: 'COM-1-H4', nombre: E('Plasma around the comet'), p: 0.7, detecta: ['CE-16'], valor: 10,
      casoReal: E('Rosetta carried RPC, five plasma instruments, to study the space around the comet.'), src: 'CM-11' },
    { id: 'COM-1-H5', nombre: E('What the dust is made of'), p: 0.6, detecta: ['CE-14'], valor: 10,
      casoReal: E('COSIMA collected dust grains to analyse what they are made of.'), src: 'CM-11' },
  ],
  verificacion: [
    { id: 'COM-1-V1', texto: E('ROSINA is mounted.'), tipo: 'pieza', pieza: 'CE-08' },
    { id: 'COM-1-V2', texto: E('The priority goal has at least half of its coverage.'), tipo: 'coberturaMin', objetivo: 'COM-1-O1', min: 0.5 },
  ],
  fusion3: ['potencia', 'comms'],
};

// ---------------------------------------------------------------------------------------------------------------------
// Filas sin cablear (jugable: false): nombre, objetivos y referencia; nada que necesite números.
// ---------------------------------------------------------------------------------------------------------------------
const vacia = { piezas: [], cohetes: [], rutas: [], fases: [], eventosDiseno: [], eventosMision: [], contingencias: [] };
const fila = (id, escenario, cuerpo, nombre, nivel, brief, referencia, objetivos, extra = {}) => ({
  id, escenario, cuerpo, nombre, jugable: false, nivel, brief: E(brief), referencia,
  objetivos: objetivos.map(([en, prioridad], i) => ({ id: `${id}-O${i + 1}`, prioridad: !!prioridad, nombre: E(en) })),
  ...vacia, ...extra,
});

const FILAS = [
  // --- Mateo: Luna ---
  fila('LUN-1', 'landing', N('La Luna', 'The Moon'), N('Polvo de Luna', 'MOON DUST'), 'media',
    'Pick up Moon dust, find out how it sticks, and drill for heat.',
    { mision: 'Blue Ghost Mission 1 (PlanetVac, RAC, LISTER, EDS, SCALPSS)', agencia: 'Firefly Aerospace for NASA (CLPS)', coheteReal: 'Falcon 9', src: 'BG-04' },
    [['Collect and sort samples of Moon soil', true], ['Learn how dust sticks and how to remove it', false], ['Measure the heat that flows out of the ground', false]]),
  fila('LUN-2', 'landing', N('La Luna', 'The Moon'), N('Espejo en la Luna', 'MOON MIRROR'), 'facil',
    'Leave a laser mirror on the Moon so Earth can measure the distance and test Einstein.',
    { mision: 'Blue Ghost Mission 1 (NGLR-1 retroreflector)', agencia: 'Firefly Aerospace for NASA (CLPS)', coheteReal: 'Falcon 9', src: 'BG-08' },
    [["Test Einstein's equivalence principle", true], ['Measure the Earth-Moon distance to less than a millimetre', false], ['Leave a target that works for decades', false]]),
  // --- Mateo: Mercurio ---
  fila('MER-1', 'orbita', N('Mercurio', 'Mercury'), N('Cola de sodio', 'SODIUM TAIL'), 'dificil',
    'Study the thin gas around Mercury and the long tail of sodium that sunlight pushes away.',
    { mision: 'BepiColombo (SERENA, PHEBUS, MSASI)', agencia: 'ESA with JAXA', coheteReal: 'Ariane 5', src: 'BC-01' },
    [['Find which gases make the thin atmosphere', true], ['See how the sodium tail moves with the solar wind', false], ['Find what produces the atmosphere', false]]),
  fila('MER-2', 'orbita', N('Mercurio', 'Mercury'), N('La prueba de Einstein', 'EINSTEIN TEST'), 'media',
    'Use radio signals that pass close to the Sun to test general relativity.',
    { mision: 'BepiColombo (MORE, ISA)', agencia: 'ESA with JAXA', coheteReal: 'Ariane 5', src: 'BC-08' },
    [['Measure how radio waves bend near the Sun better than Cassini', true], ['Measure the shift of the point of Mercury closest to the Sun', false], ['Test other predictions of general relativity', false]]),
  // --- Mateo: cometa ---
  fila('COM-2', 'exploracion', N('Cometa 67P', 'Comet 67P'), N('¿De dónde vino el agua?', 'FIRST WATER'), 'dificil',
    'Measure the water of a comet and check whether comets filled the oceans of Earth.',
    { mision: 'Rosetta (ROSINA, OSIRIS, VIRTIS, RSI)', agencia: 'ESA, with contributions from NASA', coheteReal: 'Ariane 5 G+', src: 'CM-05' },
    [['Measure the deuterium-to-hydrogen ratio of the comet water', true], ["Check whether comets brought the water of Earth", false], ['Map the nucleus to find where each gas jet comes from', false]]),
  fila('COM-3', 'exploracion', N('Cometa 67P', 'Comet 67P'), N('Aterrizar en un cometa', 'COMET LANDING'), 'dificil',
    'Land a small probe on the nucleus of a comet and study its ground.',
    { mision: 'Rosetta lander Philae', agencia: 'ESA, with contributions from NASA', coheteReal: 'Ariane 5 G+', src: 'CM-03' },
    [['Analyse the gases and compounds of the soil', true], ['Measure how hard and how warm the ground is', false], ['See inside the nucleus', false]]),
  // --- misiones-referencias.md: ÓRBITA ---
  fila('M-ORB-1', 'orbita', N('Tierra', 'Earth'), N('CubeSat de tormentas', 'STORM CUBESAT'), 'facil',
    'Fly a tiny 3U CubeSat that watches storms from low Earth orbit.',
    { mision: 'TROPICS', agencia: 'NASA', coheteReal: 'Electron', src: 'ORB-17' },
    [['Revisit storms about once an hour with a 3U CubeSat of about 5 kg', true]]),
  fila('M-ORB-3', 'orbita', N('Tierra', 'Earth'), N('Centinela geoestacionario', 'GEOSTATIONARY SENTINEL'), 'dificil',
    'Send a big weather satellite to a fixed spot 35,786 km above the equator.',
    { mision: 'GOES-R', agencia: 'NASA and NOAA', coheteReal: null, src: 'ORB-15' },
    [['Deliver 5,192 kg to geostationary orbit and work for 10 years', true]]),
  fila('M-ORB-4', 'orbita', N('Tierra', 'Earth'), N('Taller en órbita', 'ORBITAL WORKSHOP'), 'media',
    'Meet a satellite in orbit and swap its solar panels or a broken instrument.',
    { mision: 'Hubble servicing missions', agencia: 'NASA', coheteReal: null, src: 'ORB-32' },
    [['Meet a satellite in orbit and replace its solar panels or a damaged instrument', true]]),
  // --- LANDING ---
  fila('M-LND-1', 'landing', N('La Luna', 'The Moon'), N('Mar de las Crisis', 'SEA OF CRISES'), 'facil',
    'Land in Mare Crisium and work for one full lunar day.',
    { mision: 'Blue Ghost Mission 1', agencia: 'Firefly Aerospace for NASA (CLPS)', coheteReal: 'Falcon 9', src: 'LND-06' },
    [['Work for one lunar day, about 14 Earth days', true]]),
  fila('M-LND-2', 'landing', N('Marte', 'Mars'), N('Delta de Jezero', 'JEZERO DELTA'), 'media',
    'Land inside a small ellipse next to an old river delta on Mars.',
    { mision: 'Perseverance', agencia: 'NASA', coheteReal: 'Atlas V 541', src: 'LND-01' },
    [['Land in an ellipse of 7.7 x 6.6 km or less at an old delta', true]]),
  fila('M-LND-3', 'landing', N('La Luna', 'The Moon'), N('Polo sur de precisión', 'PRECISION SOUTH POLE'), 'dificil',
    'Touch down within 100 m of a target near the south pole of the Moon.',
    { mision: 'Chandrayaan-3, SLIM and IM-1', agencia: 'ISRO, JAXA and Intuitive Machines', coheteReal: null, src: 'LND-12' },
    [['Land within 100 m of the target', true]]),
  // --- EXPLORATION ---
  fila('M-EXP-1', 'exploracion', N('La Luna', 'The Moon'), N('Impacto en la sombra', 'SHADOW IMPACT'), 'facil',
    'Crash into a dark crater and look for water in the cloud.',
    { mision: 'LCROSS', agencia: 'NASA', coheteReal: null, src: 'EXP-01' },
    [['Detect water in the plume of one impact', true]]),
  fila('M-EXP-2', 'exploracion', N('La Luna', 'The Moon'), N('Cazador de hielo', 'ICE HUNTER'), 'media',
    'Drive a rover through dark craters near the south pole and map the ice.',
    { mision: 'VIPER', agencia: 'NASA', coheteReal: null, src: 'EXP-04' },
    [['Map ice in 100 days near Mons Mouton', true]],
    { reserva: true, nota: E('Reserve mission: its instruments (NSS, NIRVSS, MSolo, TRIDENT) already have real mass and power, ready to wire.') }),
  fila('M-EXP-3', 'exploracion', N('Marte', 'Mars'), N('Campaña de muestras en Jezero', 'JEZERO SAMPLING CAMPAIGN'), 'dificil',
    'Drive across Jezero crater and fill sample tubes with the best finds.',
    { mision: 'Perseverance, Ingenuity and Opportunity', agencia: 'NASA', coheteReal: null, src: 'EXP-07' },
    [['Fill the sample tubes with the best finds', true]]),
];

// ---------------------------------------------------------------------------------------------------------------------
// Español de los textos visibles. El inglés queda en el dato original; tx() usa el idioma activo (i18n.js).
// ---------------------------------------------------------------------------------------------------------------------
const ES_ESC = {
  orbita: ['Pon una nave en órbita alrededor de un mundo y trae sus datos a casa.', 'Puntaje: los datos útiles que envías a casa durante la vida de la misión.'],
  landing: ['Aterriza una sonda en la superficie y trabaja allí el mayor tiempo posible.', 'Puntaje: la cadena desde el lanzamiento hasta el aterrizaje debe resistir; luego, la ciencia multiplicada por los días que trabajas en la superficie.'],
  exploracion: ['Explora un lugar que nadie conoce aún y encuentra lo que se esconde allí.', 'Puntaje: la ciencia que ganas más los hallazgos ocultos, por cada vatio-hora que gastas.'],
};
for (const e of ESCENARIOS) { const t = ES_ESC[e.id]; if (t) { e.desc.es = t[0]; e.regla.es = t[1]; } }

const ES_MIS = {
  'MER-3': {
    apertura: 'Noviembre de 2026. Tras siete años y nueve sobrevuelos, dos naves frenan para entrar en órbita alrededor del planeta más cercano al Sol.',
    brief: 'Construye un orbitador que mapee de qué está hecho Mercurio y luego envía los datos a casa.',
    cifras: ['La masa de lanzamiento fue de 4.100 kg, y 1.400 kg eran propelente.', 'El orbitador MPO pesa 1.230 kg, con 85 kg de instrumentos científicos.', 'Sus alas solares generan hasta 1.000 W en la fase científica.', 'Un radiador de 1,5 m2 libera 200 W de calor.'],
    objetivos: {
      'MER-3-O1': ['Descubrir de qué está hecha la superficie', 'MESSENGER encontró más potasio y azufre de lo esperado, lo que no encaja con la idea del gran impacto.'],
      'MER-3-O2': ['Averiguar por qué Mercurio es tan denso', 'BepiColombo responderá las preguntas 2 y 3 de la ESA: por qué el planeta es tan denso y si su núcleo es líquido.'],
      'MER-3-O3': ['Buscar hielo de agua en los cráteres polares', 'MESSENGER vio hielo de agua bajo material oscuro en cráteres de los polos.'],
    },
    rutas: { 'MER-3-R1': 'Nueve sobrevuelos', 'MER-3-R2': 'Menos sobrevuelos, más combustible' },
    fases: { launch: 'Lanzamiento', cruise: 'Crucero y sobrevuelos', insertion: 'Inserción en órbita', commissioning: 'Puesta en servicio', science: 'Órbita científica' },
    verificacion: { 'MER-3-V1': 'Hay una antena montada para enviar los datos a casa.', 'MER-3-V2': 'La meta prioritaria tiene al menos la mitad de su cobertura.' },
  },
  'LUN-3': {
    apertura: '2 de marzo de 2025. Un módulo aterriza en el Mare Crisium con diez instrumentos de la NASA. Uno de ellos no necesita energía: es un espejo.',
    brief: 'Aterriza en la Luna y usa una cámara de rayos X para observar el escudo magnético de la Tierra.',
    cifras: ['Aterrizó el 2 de marzo de 2025 en el Mare Crisium con diez instrumentos de la NASA.', 'El módulo generó hasta 400 W y trabajó más de 14 días en la superficie.', 'LEXI pesa 11,1 kg, usa 1,6 W y envía 40 kbps.', 'La NASA pagó cerca de 101 M USD por el envío y 44 M USD por las diez cargas (informe de prensa).'],
    objetivos: {
      'LUN-3-O1': ['Tomar fotos de rayos X del escudo magnético de la Tierra', 'LEXI tomó imágenes de rayos X de donde el viento solar golpea el campo magnético de la Tierra.'],
      'LUN-3-O2': ['Ver cómo cambia el escudo con el viento solar', 'LEXI se construyó para observar cómo reacciona el escudo cuando cambia el viento solar.'],
      'LUN-3-O3': ['Medir la atmósfera tenue de la Luna', 'LEXI midió perfiles de densidad de la exosfera lunar con el mismo resplandor de rayos X.'],
      'LUN-3-OX': ['Sondear el suelo con campos eléctricos y magnéticos', 'LMS encontró una conductividad del suelo muy parecida a la del sitio del Apolo 12.'],
    },
    rutas: { 'LUN-3-R1': 'Órbitas de espera (45 días)', 'LUN-3-R2': 'Vuelo directo (unos pocos días)' },
    fases: { launch: 'Lanzamiento', transit: 'Crucero a la Luna', orbit: 'Órbita lunar', landing: 'Aterrizaje', surface: 'Operaciones en superficie' },
    verificacion: { 'LUN-3-V1': 'LEXI está montado.', 'LUN-3-V2': 'Los sensores de aterrizaje están montados.' },
  },
  'COM-1': {
    apertura: '6 de agosto de 2014. Tras diez años en el espacio, una nave llega a un cometa que nadie había visto de cerca.',
    brief: 'Vuela junto al cometa 67P y olfatea sus gases, incluso los que nadie espera.',
    cifras: ['Se lanzó el 2 de marzo de 2004 y llegó al cometa el 6 de agosto de 2014.', 'El orbitador pesaba 2.900 kg: 1.670 kg de propelente y 165 kg de ciencia.', 'Sus paneles daban 850 W a 3,4 UA y 395 W a 5,25 UA.', 'La misión completa devolvió 220 GB y más de 100.000 imágenes.'],
    objetivos: {
      'COM-1-O1': ['Descubrir qué gases salen del cometa y cuánto', 'ALICE midió qué tan rápido el cometa produce agua, monóxido de carbono y dióxido de carbono.'],
      'COM-1-O2': ['Ver cómo despierta el cometa cerca del Sol', 'Rosetta se quedó con el cometa durante su punto más cercano al Sol, el 13 de agosto de 2015.'],
      'COM-1-O3': ['Cazar gases inesperados', 'ROSINA encontró oxígeno molecular, algo inédito en un cometa, en más de 3.000 muestras.'],
    },
    rutas: { 'COM-1-R1': 'Cuatro asistencias gravitatorias (10 años)', 'COM-1-R2': 'Menos asistencias, más combustible' },
    fases: { launch: 'Lanzamiento', cruise: 'Crucero y asistencias gravitatorias', wake: 'Despertar de la hibernación', arrival: 'Encuentro con el cometa', coma: 'Ciencia en la coma' },
    verificacion: { 'COM-1-V1': 'ROSINA está montado.', 'COM-1-V2': 'La meta prioritaria tiene al menos la mitad de su cobertura.' },
    oculto: {
      'COM-1-H1': ['Oxígeno molecular', 'ROSINA hizo la primera detección de oxígeno molecular en un cometa, en más de 3.000 muestras entre septiembre de 2014 y marzo de 2015.'],
      'COM-1-H2': ['Glicina y fósforo', 'Rosetta encontró glicina, un aminoácido, y fósforo en el cometa 67P.'],
      'COM-1-H3': ['Oleada de gas y polvo en el perihelio', 'Rosetta se quedó con el cometa durante su punto más cercano al Sol el 13 de agosto de 2015; ALICE siguió sus gases de agua y carbono.'],
      'COM-1-H4': ['Plasma alrededor del cometa', 'Rosetta llevó RPC, cinco instrumentos de plasma, para estudiar el espacio alrededor del cometa.'],
      'COM-1-H5': ['De qué está hecho el polvo', 'COSIMA recogió granos de polvo para analizar de qué están hechos.'],
    },
  },
};
for (const [id, t] of Object.entries(ES_MIS)) {
  const m = ({'MER-3':MER_3,'LUN-3':LUN_3,'COM-1':COM_1})[id];
  m.apertura.es = t.apertura; m.brief.es = t.brief;
  m.referencia.cifras.forEach((c, i) => { c.es = t.cifras[i]; });
  for (const o of m.objetivos) { const x = t.objetivos[o.id]; if (x) { o.nombre.es = x[0]; o.datoReal.es = x[1]; } }
  for (const r of m.rutas) if (t.rutas[r.id]) r.nombre.es = t.rutas[r.id];
  for (const f of m.fases) if (t.fases[f.id]) f.nombre.es = t.fases[f.id];
  for (const v of m.verificacion) if (t.verificacion[v.id]) v.texto.es = t.verificacion[v.id];
  for (const o of m.oculto ?? []) { const x = t.oculto?.[o.id]; if (x) { o.nombre.es = x[0]; o.casoReal.es = x[1]; } }
}

// Filas sin cablear: [brief, [objetivos...]] (nota en M-EXP-2).
const ES_FILAS = {
  'LUN-1': ['Recoge polvo lunar, averigua cómo se pega y perfora para medir el calor.', ['Recoger y clasificar muestras del suelo lunar', 'Aprender cómo se pega el polvo y cómo quitarlo', 'Medir el calor que sale del suelo']],
  'LUN-2': ['Deja un espejo láser en la Luna para que la Tierra mida la distancia y ponga a prueba a Einstein.', ['Poner a prueba el principio de equivalencia de Einstein', 'Medir la distancia Tierra-Luna con menos de un milímetro de error', 'Dejar un blanco que funcione por décadas']],
  'MER-1': ['Estudia el gas tenue alrededor de Mercurio y la larga cola de sodio que la luz del Sol empuja lejos.', ['Descubrir qué gases forman la atmósfera tenue', 'Ver cómo se mueve la cola de sodio con el viento solar', 'Descubrir qué produce la atmósfera']],
  'MER-2': ['Usa señales de radio que pasan cerca del Sol para poner a prueba la relatividad general.', ['Medir cómo se curvan las ondas de radio cerca del Sol mejor que Cassini', 'Medir el desplazamiento del punto de Mercurio más cercano al Sol', 'Poner a prueba otras predicciones de la relatividad general']],
  'COM-2': ['Mide el agua de un cometa y comprueba si los cometas llenaron los océanos de la Tierra.', ['Medir la razón deuterio-hidrógeno del agua del cometa', 'Comprobar si los cometas trajeron el agua de la Tierra', 'Mapear el núcleo para hallar de dónde sale cada chorro de gas']],
  'COM-3': ['Aterriza una pequeña sonda en el núcleo de un cometa y estudia su suelo.', ['Analizar los gases y compuestos del suelo', 'Medir qué tan duro y qué tan cálido es el suelo', 'Ver el interior del núcleo']],
  'M-ORB-1': ['Vuela un diminuto CubeSat 3U que vigila tormentas desde la órbita baja terrestre.', ['Revisitar tormentas cada hora aproximadamente con un CubeSat 3U de unos 5 kg']],
  'M-ORB-3': ['Envía un gran satélite meteorológico a un punto fijo a 35.786 km sobre el ecuador.', ['Entregar 5.192 kg a la órbita geoestacionaria y trabajar durante 10 años']],
  'M-ORB-4': ['Encuentra un satélite en órbita y cambia sus paneles solares o un instrumento dañado.', ['Encontrar un satélite en órbita y cambiar sus paneles solares o un instrumento dañado']],
  'M-LND-1': ['Aterriza en el Mare Crisium y trabaja durante un día lunar completo.', ['Trabajar un día lunar, unos 14 días terrestres']],
  'M-LND-2': ['Aterriza dentro de una elipse pequeña junto a un antiguo delta de río en Marte.', ['Aterrizar en una elipse de 7,7 x 6,6 km o menos en un delta antiguo']],
  'M-LND-3': ['Toca el suelo a menos de 100 m de un blanco cerca del polo sur de la Luna.', ['Aterrizar a menos de 100 m del blanco']],
  'M-EXP-1': ['Estrella una nave en un cráter oscuro y busca agua en la nube de material.', ['Detectar agua en la columna de un impacto']],
  'M-EXP-2': ['Conduce un rover por cráteres oscuros cerca del polo sur y mapea el hielo.', ['Mapear hielo en 100 días cerca del Mons Mouton']],
  'M-EXP-3': ['Recorre el cráter Jezero y llena tubos de muestras con los mejores hallazgos.', ['Llenar los tubos de muestras con los mejores hallazgos']],
};
const NOTA_EXP2 = 'Misión de reserva: sus instrumentos (NSS, NIRVSS, MSolo, TRIDENT) ya tienen masa y potencia reales, listos para conectar.';
for (const m of FILAS) {
  const t = ES_FILAS[m.id];
  if (!t) continue;
  m.brief.es = t[0];
  m.objetivos.forEach((o, i) => { o.nombre.es = t[1][i]; });
  if (m.nota) m.nota.es = NOTA_EXP2;
}

// Agencias (texto plano en `referencia.agencia`; la versión en español va aparte en `referencia.agenciaEs`).
const ES_AGENCIA = {
  'ESA with JAXA': 'ESA con JAXA',
  'Firefly Aerospace for NASA (CLPS)': 'Firefly Aerospace para la NASA (CLPS)',
  'ESA, with contributions from NASA': 'ESA, con aportes de la NASA',
  'NASA and NOAA': 'NASA y NOAA',
  'ISRO, JAXA and Intuitive Machines': 'ISRO, JAXA e Intuitive Machines',
  'NASA': 'NASA',
};
for (const m of [MER_3, LUN_3, COM_1, ...FILAS]) {
  const a = m.referencia?.agencia;
  if (a && ES_AGENCIA[a]) m.referencia.agenciaEs = ES_AGENCIA[a];
}

export const MISIONES = Object.fromEntries([MER_3, LUN_3, COM_1, ...FILAS].map((m) => [m.id, m]));
export default MISIONES;
