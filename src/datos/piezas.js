// Piezas de los talleres (una fila por pieza, una entrada por opción) de las tres misiones jugables: MER-3, LUN-3 y COM-1.
// Reglas (mecanicas-del-juego.md §5, §10):
//  - Todo número es { v, conf, src } y, si v es null, lleva `juego` (el motor usa x.v ?? x.juego ?? 0).
//  - Real: V (leído), A (secundaria). Sin dato real ("pend." en los md): J(...) con el GAP si existe, si no 'JUEGO'.
//  - Precios: regla provisional de Mateo (propuesta-misiones-mateo.md §1.3): INF con src 'PRECIO' o la fuente de la media real;
//    plataforma pendiente (GAP-P16) → J.
//  - Cada opción trae SIEMPRE los cinco números (masa, potencia, volumen, tasa, precio) y `aporta`; lo que no aplica es 0 [INF].
//  - Ids: los del catálogo de Mateo (LE-, ME-, CE-) para trazabilidad. Las piezas que el catálogo no tiene (computador, actitud,
//    guiado) llevan prefijo JG- (juego) y la misión en el id: JG-MER-*, JG-LUN-*, JG-COM-*.
//  - Las masas "reales" de las estructuras son las totales de las fuentes menos lo que lleva dentro, y la propulsión va en la ruta
//    (ruta.masa): MPO 1230 − 85 de ciencia = 1145 kg (BC-01); Rosetta 2900 − 1670 propelente − 165 ciencia = 1065 kg (CM-01).
//  - Volumen: `aporta.volumen` de la estructura es el real cuando existe (9,0 m³ del MPO, 11,8 m³ de Rosetta: envolvente exterior).
//    Los volúmenes de las piezas de plataforma son JUEGO y están calibrados para que la configuración real ocupe ~90 % de la envolvente.

const R = (v, conf, src) => ({ v, conf, src });
const V = (v, src) => R(v, 'V', src);
const A = (v, src) => R(v, 'A', src);
const I = (v, src = 'JUEGO') => R(v, 'INF', src);
const J = (juego, src = 'JUEGO') => ({ v: null, conf: 'JUEGO', src, juego });
const Z = () => I(0); // "no aplica": cero de diseño

const opc = (id, nombre, o = {}) => ({
  id, nombre: { en: nombre },
  masa: o.masa ?? Z(), potencia: o.potencia ?? Z(), volumen: o.volumen ?? Z(), tasa: o.tasa ?? Z(), precio: o.precio ?? Z(),
  aporta: o.aporta ?? {},
});

const ON = null;                                  // consumidor sin decisión de uso: el motor lo cuenta siempre encendido (24 h)
const USO = (def, max = 24) => ({ min: 0, max, def });

const pz = (id, rol, categoria, es, en, desc, misiones, extra, opciones) => ({
  id, rol, categoria, nombre: { es, en }, desc: { en: desc }, misiones,
  enSombra: extra.enSombra ?? false, uso: extra.uso ?? null, opciones,
});

const LISTA = [
  // ====================================================================================================================
  // MER-3 "IRON PLANET" (órbita de Mercurio). Referencia: BepiColombo MPO (ESA).
  // ====================================================================================================================
  // ---- Vuelo ----
  pz('ME-05', 'vuelo', 'estructura', 'Estructura del MPO', 'MPO structure', 'The frame of the orbiter. It gives the room for everything else.', ['MER-3'], {},
    [opc('A', 'Real MPO frame', { masa: V(1145, 'BC-01'), precio: J(300, 'GAP-P16'), aporta: { volumen: V(9000, 'BC-10') } })]),
  pz('ME-02', 'vuelo', 'propulsion', 'Módulo de transferencia', 'Transfer module', 'The engine stage that carries the orbiter to Mercury.', ['MER-3'], { uso: ON },
    [opc('A', 'Ion thrusters (real)', { masa: J(1215), potencia: J(150), volumen: J(2600), precio: J(220, 'GAP-P16') }),
     opc('B', 'Chemical engine', { masa: J(1100), potencia: J(60), volumen: J(3000), precio: J(140, 'GAP-P16') })]),
  pz('JG-MER-ACT', 'vuelo', 'actitud', 'Control de actitud', 'Attitude control', 'Wheels and small thrusters that point the spacecraft.', ['MER-3'], { enSombra: true, uso: ON },
    [opc('A', 'Agile wheels', { masa: J(90), potencia: J(330), volumen: J(560), precio: J(40, 'GAP-P16') }),
     opc('B', 'Standard wheels', { masa: J(60), potencia: J(120), volumen: J(400), precio: J(25, 'GAP-P16') })]),

  // ---- Ciencia ----
  pz('ME-13', 'ciencia', 'instrumento', 'BELA (altímetro láser)', 'BELA', 'A laser altimeter that measures the height of the ground.', ['MER-3'], { uso: USO(10) },
    [opc('A', 'Flight model', { masa: A(15, 'BC-11'), potencia: J(30, 'GAP-P13'), volumen: J(40, 'GAP-P13'), tasa: J(30, 'GAP-P14'), precio: I(7.5, 'PRECIO') })]),
  pz('ME-14', 'ciencia', 'instrumento', 'MGNS', 'MGNS', 'Gamma-ray and neutron spectrometer for the makeup of the ground.', ['MER-3'], { uso: USO(12) },
    [opc('A', 'Flight model', { masa: A(5.5, 'BC-11'), potencia: A(6.4, 'BC-11'), volumen: J(15, 'GAP-P13'), tasa: J(2, 'GAP-P14'), precio: I(2.75, 'PRECIO') })]),
  pz('ME-15', 'ciencia', 'instrumento', 'MIXS', 'MIXS', 'X-ray spectrometer that reads which elements are on the surface.', ['MER-3'], { uso: USO(10) },
    [opc('A', 'Flight model', { masa: A(11.4, 'BC-11'), potencia: A(19.3, 'BC-11'), volumen: J(30, 'GAP-P13'), tasa: J(5, 'GAP-P14'), precio: I(5.7, 'PRECIO') })]),
  pz('ME-16', 'ciencia', 'instrumento', 'MERTIS', 'MERTIS', 'Thermal infrared instrument for rocks and heat.', ['MER-3'], { uso: USO(10) },
    [opc('A', 'Flight model', { masa: J(8, 'GAP-P13'), potencia: J(12, 'GAP-P13'), volumen: J(25, 'GAP-P13'), tasa: J(50, 'GAP-P14'), precio: J(4, 'GAP-P13') })]),
  pz('ME-17', 'ciencia', 'instrumento', 'SIMBIO-SYS', 'SIMBIO-SYS', 'A set of cameras that map the whole planet.', ['MER-3'], { uso: USO(6) },
    [opc('A', 'Flight model', { masa: A(14.8, 'BC-11'), potencia: A(23.4, 'BC-11'), volumen: J(60, 'GAP-P13'), tasa: J(800, 'GAP-P14'), precio: I(7.4, 'PRECIO') })]),
  pz('ME-18', 'ciencia', 'instrumento', 'MPO-MAG', 'MPO-MAG', 'A magnetometer that feels the magnetic field.', ['MER-3'], { enSombra: true, uso: USO(24) },
    [opc('A', 'Flight model', { masa: A(2.5, 'BC-11'), potencia: A(5.0, 'BC-11'), volumen: J(8, 'GAP-P13'), tasa: J(2, 'GAP-P14'), precio: I(1.25, 'PRECIO') })]),

  // ---- Potencia ----
  pz('ME-20', 'potencia', 'paneles', 'Panel solar del MPO', 'MPO solar array', 'Solar wings that make power close to the Sun.', ['MER-3'], {},
    [opc('A', 'Real: 30% GaAs, 70% mirrors', { masa: J(120), volumen: J(2000), precio: J(90, 'GAP-P16'), aporta: { potencia: V(1000, 'BC-03') } }),
     opc('B', 'More GaAs, fewer mirrors', { masa: J(150), volumen: J(1900), precio: J(110, 'GAP-P16'), aporta: { potencia: J(1150) } })]),
  pz('ME-21', 'potencia', 'termica', 'Radiador', 'Radiator', 'A cold-facing panel that sheds heat into space.', ['MER-3'], { uso: ON },
    [opc('A', '1.5 m2 (real size)', { masa: J(25), potencia: J(40), volumen: J(700), precio: J(20, 'GAP-P16') }),
     opc('B', 'Bigger radiator', { masa: J(40), potencia: J(90), volumen: J(950), precio: J(30, 'GAP-P16') })]),
  pz('ME-23', 'potencia', 'termica', 'Aislamiento multicapa', 'Multi-layer insulation', 'Thin foil blankets that keep the heat out.', ['MER-3'], {},
    [opc('A', 'Real blankets', { masa: J(35), volumen: J(700), precio: J(10, 'GAP-P16') })]),
  pz('ME-24', 'potencia', 'bateria', 'Batería', 'Battery', 'Stores energy for the shadow of the planet.', ['MER-3'], {},
    [opc('A', 'Standard', { masa: J(60, 'GAP-P15'), volumen: J(300, 'GAP-P15'), precio: J(20, 'GAP-P16'), aporta: { bateria: J(1000, 'GAP-P15') } }),
     opc('B', 'Large', { masa: J(110, 'GAP-P15'), volumen: J(520, 'GAP-P15'), precio: J(32, 'GAP-P16'), aporta: { bateria: J(2000, 'GAP-P15') } })]),

  // ---- Comunicaciones ----
  pz('ME-25', 'comms', 'antena', 'Antena del MPO', 'MPO antenna', 'A steerable dish that sends data to Earth.', ['MER-3'], { enSombra: true, uso: ON },
    [opc('A', '1.0 m, X and Ka bands', { masa: J(45), potencia: J(330), volumen: J(700), precio: J(45, 'GAP-P16'), aporta: { bajada: J(800, 'GAP-P14') } }),
     opc('B', '1.5 m (older design)', { masa: J(75), potencia: J(520), volumen: J(1000), precio: J(60, 'GAP-P16'), aporta: { bajada: J(1300, 'GAP-P14') } })]),
  pz('ME-28', 'comms', 'tierra', 'Estaciones de tierra', 'Ground stations', 'Antennas on Earth that listen to the spacecraft.', ['MER-3'], {},
    [opc('A', 'ESA network', { precio: J(15) }),
     opc('B', 'NASA Deep Space Network', { precio: J(35), aporta: { bajada: J(250, 'GAP-P14') } })]),
  pz('JG-MER-OBC', 'comms', 'computador', 'Computador y memoria', 'Computer and memory', 'The brain of the spacecraft. It also stores data until the next pass.', ['MER-3'], { enSombra: true, uso: ON },
    [opc('A', 'Radiation-hard', { masa: J(30), potencia: J(290), volumen: J(330), precio: J(45, 'GAP-P16') }),
     opc('B', 'Standard', { masa: J(25), potencia: J(150), volumen: J(300), precio: J(30, 'GAP-P16') })]),

  // ====================================================================================================================
  // LUN-3 "MAGNETIC WINDOW" (superficie lunar). Referencia: Blue Ghost Mission 1 (Firefly, NASA CLPS).
  // ====================================================================================================================
  // ---- Vuelo ----
  pz('LE-04', 'vuelo', 'estructura', 'Lander tipo Blue Ghost', 'Blue Ghost-type lander', 'The lander body. It carries the payloads and sets how much room you have.', ['LUN-3'], { enSombra: true, uso: ON },
    [opc('A', 'Blue Ghost-type', { masa: A(1517, 'BG-10'), potencia: J(110), precio: J(20, 'GAP-P16'), aporta: { volumen: J(430, 'GAP-P12') } })]),
  pz('LE-05', 'vuelo', 'camara', 'SCALPSS (cámaras del descenso)', 'SCALPSS', 'Cameras that film the ground while the lander touches down.', ['LUN-3'], { uso: USO(1, 12) },
    [opc('A', 'Version 1.0', { masa: J(6, 'GAP-P12'), potencia: J(18, 'GAP-P12'), volumen: J(15, 'GAP-P12'), tasa: J(300, 'GAP-P14'), precio: I(4.4, 'BG-03') }),
     opc('B', 'Version 1.1 (+2 cameras)', { masa: J(8, 'GAP-P12'), potencia: J(60, 'GAP-P12'), volumen: J(20, 'GAP-P12'), tasa: J(500, 'GAP-P14'), precio: J(6, 'GAP-P12') })]),
  pz('JG-LUN-GNC', 'vuelo', 'guiado', 'Sensores de aterrizaje', 'Landing sensors', 'Radar and lidar that tell the lander how high it is.', ['LUN-3'], { uso: ON },
    [opc('A', 'Terrain-relative navigation', { masa: J(35), potencia: J(140), volumen: J(35), precio: J(12, 'GAP-P16') }),
     opc('B', 'Standard sensors', { masa: J(20), potencia: J(40), volumen: J(20), precio: J(6, 'GAP-P16') })]),

  // ---- Ciencia ----
  pz('LE-10', 'ciencia', 'instrumento', 'LEXI', 'LEXI', 'An X-ray camera that watches where the solar wind hits Earth\'s magnetic shield.', ['LUN-3'], { uso: USO(16) },
    [opc('A', 'Flight model', { masa: V(11.1, 'BG-07'), potencia: V(1.6, 'BG-07'), volumen: V(68.6, 'BG-07'), tasa: V(40, 'BG-07'), precio: I(4.4, 'BG-03') })]),
  pz('LE-11', 'ciencia', 'instrumento', 'LMS', 'LMS', 'Magnetic and electric sensors that look under the ground.', ['LUN-3'], { uso: USO(8) },
    [opc('A', 'Flight model', { masa: J(8, 'GAP-P12'), potencia: J(10, 'GAP-P12'), volumen: J(12, 'GAP-P12'), tasa: J(8, 'GAP-P14'), precio: I(4.4, 'BG-03') })]),

  // ---- Potencia ----
  pz('LE-12', 'potencia', 'paneles', 'Paneles solares', 'Solar panels', 'Panels on the sides and top of the lander.', ['LUN-3'], {},
    [opc('A', 'Blue Ghost panels (3)', { masa: J(60), volumen: J(150), precio: J(8, 'GAP-P16'), aporta: { potencia: V(400, 'BG-01') } }),
     opc('B', 'GaAs cells', { masa: J(45), volumen: J(120), precio: J(14, 'GAP-P16'), aporta: { potencia: J(480) } }),
     opc('C', 'Silicon cells', { masa: J(70), volumen: J(160), precio: J(5, 'GAP-P16'), aporta: { potencia: J(330) } })]),
  pz('LE-13', 'potencia', 'bateria', 'Batería', 'Battery', 'Keeps the lander alive in the dark.', ['LUN-3'], {},
    [opc('A', 'Blue Ghost battery', { masa: J(40, 'GAP-P15'), volumen: J(30, 'GAP-P15'), precio: J(4, 'GAP-P16'), aporta: { bateria: J(1150, 'GAP-P15') } }),
     opc('B', 'Bigger battery', { masa: J(75, 'GAP-P15'), volumen: J(55, 'GAP-P15'), precio: J(7, 'GAP-P16'), aporta: { bateria: J(2400, 'GAP-P15') } })]),
  pz('LE-14', 'potencia', 'termica', 'Control térmico', 'Thermal control', 'Heaters and radiators for noon heat and night cold.', ['LUN-3'], { enSombra: true, uso: ON },
    [opc('A', 'Heaters and radiators', { masa: J(12), potencia: J(70), volumen: J(25), precio: J(3, 'GAP-P16') })]),
  pz('LE-15', 'potencia', 'polvo', 'EDS (escudo de polvo)', 'EDS dust shield', 'Electric fields that lift and push dust away.', ['LUN-3'], { uso: USO(2, 8) },
    [opc('A', '2 systems', { masa: J(6, 'GAP-P12'), potencia: J(15, 'GAP-P12'), volumen: J(8, 'GAP-P12'), precio: I(4.4, 'BG-03') })]),

  // ---- Comunicaciones ----
  pz('LE-16', 'comms', 'antena', 'Enlace directo con la Tierra', 'Direct-to-Earth link', 'The radio and antenna that talk straight to Earth.', ['LUN-3'], { uso: ON },
    [opc('A', 'High-gain antenna', { masa: J(25), potencia: J(140), volumen: J(60), precio: J(9, 'GAP-P16'), aporta: { bajada: J(400, 'GAP-P14') } }),
     opc('B', 'Standard antenna', { masa: J(15), potencia: J(60), volumen: J(40), precio: J(5, 'GAP-P16'), aporta: { bajada: J(140, 'GAP-P14') } })]),
  pz('LE-17', 'comms', 'navegacion', 'LuGRE (navegación GPS y Galileo)', 'LuGRE', 'A receiver that tests satellite navigation at the Moon.', ['LUN-3'], { uso: USO(4) },
    [opc('A', 'Flight model', { masa: J(3, 'GAP-P12'), potencia: J(15, 'GAP-P12'), volumen: J(5, 'GAP-P12'), tasa: J(1, 'GAP-P14'), precio: I(4.4, 'BG-03') })]),
  pz('LE-18', 'comms', 'computador', 'Computador', 'Computer', 'The lander computer.', ['LUN-3'], { enSombra: true, uso: ON },
    [opc('A', 'RadPC (radiation-tolerant)', { masa: J(5, 'GAP-P12'), potencia: J(25, 'GAP-P12'), volumen: J(5, 'GAP-P12'), precio: I(4.4, 'BG-09') }),
     opc('B', 'Standard computer', { masa: J(4, 'GAP-P12'), potencia: J(20, 'GAP-P12'), volumen: J(4, 'GAP-P12'), precio: J(2, 'GAP-P16') })]),

  // ====================================================================================================================
  // COM-1 "GAS HUNTER" (coma de 67P). Referencia: Rosetta (ESA, con aportes de NASA).
  // ====================================================================================================================
  // ---- Vuelo ----
  pz('CE-04', 'vuelo', 'estructura', 'Estructura del orbitador', 'Orbiter structure', 'The body of the spacecraft. It gives the room for everything else.', ['COM-1'], {},
    [opc('A', 'Real Rosetta body', { masa: V(1065, 'CM-01'), precio: J(350, 'GAP-P08'), aporta: { volumen: V(11800, 'CM-01') } })]),
  pz('CE-05', 'vuelo', 'proteccion', 'Escudo de polvo', 'Dust shield', 'A shield that stops comet grains.', ['COM-1'], {},
    [opc('A', 'Light shield', { masa: J(60), volumen: J(200), precio: J(25, 'GAP-P16') }),
     opc('B', 'Thick shield', { masa: J(110), volumen: J(320), precio: J(40, 'GAP-P16') })]),
  pz('CE-06', 'vuelo', 'sondas', 'Sondas desechables', 'Disposable probes', 'Small probes that go closer to the comet and send data through the ship.', ['COM-1'], { uso: USO(6) },
    [opc('A', '1 probe', { masa: J(40, 'GAP-P07'), potencia: J(20, 'GAP-P07'), volumen: J(150, 'GAP-P07'), tasa: J(10, 'GAP-P14'), precio: J(35, 'GAP-P16') }),
     opc('B', '2 probes', { masa: J(80, 'GAP-P07'), potencia: J(40, 'GAP-P07'), volumen: J(300, 'GAP-P07'), tasa: J(20, 'GAP-P14'), precio: J(60, 'GAP-P16') })]),
  pz('JG-COM-ACT', 'vuelo', 'actitud', 'Control de actitud', 'Attitude control', 'Wheels and small thrusters that point the spacecraft.', ['COM-1'], { enSombra: true, uso: ON },
    [opc('A', 'Agile wheels', { masa: J(100), potencia: J(250), volumen: J(480), precio: J(45, 'GAP-P16') }),
     opc('B', 'Standard wheels', { masa: J(70), potencia: J(100), volumen: J(350), precio: J(30, 'GAP-P16') })]),

  // ---- Ciencia ----
  pz('CE-08', 'ciencia', 'instrumento', 'ROSINA', 'ROSINA', 'A spectrometer that sniffs ions and gas around the comet.', ['COM-1'], { uso: USO(10) },
    [opc('A', 'Flight model', { masa: V(36, 'CM-11'), potencia: V(53, 'CM-11'), volumen: J(120, 'GAP-P07'), tasa: J(40, 'GAP-P14'), precio: I(18, 'PRECIO') })]),
  pz('CE-09', 'ciencia', 'instrumento', 'ALICE', 'ALICE', 'An ultraviolet instrument that measures water and carbon gases.', ['COM-1'], { uso: USO(10) },
    [opc('A', 'Flight model', { masa: V(2.7, 'CM-11'), potencia: V(5.6, 'CM-11'), volumen: V(11.8, 'CM-11'), tasa: J(2, 'GAP-P14'), precio: I(1.35, 'PRECIO') })]),
  pz('CE-10', 'ciencia', 'instrumento', 'MIRO', 'MIRO', 'A microwave instrument that senses gas and the temperature of the nucleus.', ['COM-1'], { uso: USO(8) },
    [opc('A', 'Low mode', { masa: V(20.4, 'CM-11'), potencia: V(18.3, 'CM-11'), volumen: V(97.2, 'CM-11'), tasa: J(5, 'GAP-P14'), precio: I(10.2, 'PRECIO') }),
     opc('B', 'High mode', { masa: V(20.4, 'CM-11'), potencia: V(70.7, 'CM-11'), volumen: V(97.2, 'CM-11'), tasa: J(12, 'GAP-P14'), precio: I(10.2, 'PRECIO') })]),
  pz('CE-11', 'ciencia', 'instrumento', 'GIADA', 'GIADA', 'A dust detector that counts and weighs grains.', ['COM-1'], { uso: USO(10) },
    [opc('A', 'Flight model', { masa: V(6.25, 'CM-11'), potencia: V(20.7, 'CM-11'), volumen: V(15.5, 'CM-11'), tasa: J(1, 'GAP-P14'), precio: I(3.1, 'PRECIO') })]),
  pz('CE-16', 'ciencia', 'instrumento', 'RPC', 'RPC', 'Five plasma instruments that share one electronics box.', ['COM-1'], { uso: USO(10) },
    [opc('A', 'Flight model', { masa: J(8, 'GAP-P07'), potencia: J(25, 'GAP-P07'), volumen: J(30, 'GAP-P07'), tasa: J(10, 'GAP-P14'), precio: J(4, 'GAP-P07') })]),
  pz('CE-12', 'ciencia', 'instrumento', 'OSIRIS', 'OSIRIS', 'The main cameras of the orbiter.', ['COM-1'], { uso: USO(4) },
    [opc('A', 'Flight model', { masa: V(34.4, 'CM-11'), potencia: V(57.2, 'CM-11'), volumen: J(120, 'GAP-P07'), tasa: J(600, 'GAP-P14'), precio: I(17.2, 'PRECIO') })]),
  pz('CE-14', 'ciencia', 'instrumento', 'COSIMA', 'COSIMA', 'An analyser that collects dust grains and tells what they are made of.', ['COM-1'], { uso: USO(8) },
    [opc('A', 'Flight model', { masa: V(19.1, 'CM-11'), potencia: V(20.6, 'CM-11'), volumen: V(144.9, 'CM-11'), tasa: J(10, 'GAP-P14'), precio: I(9.6, 'PRECIO') })]),

  // ---- Potencia ----
  pz('CE-24', 'potencia', 'paneles', 'Paneles del orbitador', 'Orbiter solar arrays', 'Two long solar wings. Far from the Sun, they must be huge.', ['COM-1'], {},
    [opc('A', 'Real: two 14 m wings (silicon)', { masa: J(280), volumen: J(5600), precio: J(80, 'GAP-P16'), aporta: { potencia: A(850, 'CM-08') } }),
     opc('B', 'GaAs cells, less area', { masa: J(180), volumen: J(3500), precio: J(130, 'GAP-P16'), aporta: { potencia: J(800) } })]),
  pz('CE-26', 'potencia', 'bateria', 'Batería del orbitador', 'Orbiter battery', 'Stores energy for dark moments and wake-ups.', ['COM-1'], {},
    [opc('A', 'Standard', { masa: J(60, 'GAP-P15'), volumen: J(100, 'GAP-P15'), precio: J(15, 'GAP-P16'), aporta: { bateria: J(1000, 'GAP-P15') } }),
     opc('B', 'Large', { masa: J(110, 'GAP-P15'), volumen: J(180, 'GAP-P15'), precio: J(24, 'GAP-P16'), aporta: { bateria: J(1800, 'GAP-P15') } })]),
  pz('CE-28', 'potencia', 'termica', 'Calentadores', 'Heaters', 'Keep the instruments warm while they sleep.', ['COM-1'], { enSombra: true, uso: ON },
    [opc('A', 'Heater loops', { masa: J(15), potencia: J(170), volumen: J(50), precio: J(6, 'GAP-P16') })]),
  pz('JG-COM-MLI', 'potencia', 'termica', 'Mantas térmicas', 'Thermal blankets', 'Foil blankets that hold the heat in.', ['COM-1'], {},
    [opc('A', 'Standard blankets', { masa: J(40), volumen: J(1200), precio: J(8, 'GAP-P16') })]),

  // ---- Comunicaciones ----
  pz('CE-29', 'comms', 'antena', 'Antena de alta ganancia', 'High-gain antenna', 'A big steerable dish that talks to Earth from far away.', ['COM-1'], { uso: ON },
    [opc('A', '2.2 m, S and X bands (real)', { masa: J(60), potencia: J(170), volumen: J(2200), precio: J(40, 'GAP-P16'), aporta: { bajada: J(90, 'GAP-P14') } }),
     opc('B', 'Smaller 1.1 m dish', { masa: J(30), potencia: J(120), volumen: J(900), precio: J(25, 'GAP-P16'), aporta: { bajada: J(45, 'GAP-P14') } })]),
  pz('CE-31', 'comms', 'memoria', 'Memoria a bordo', 'On-board memory', 'Stores data when the link is down.', ['COM-1'], { uso: ON },
    [opc('A', 'Standard memory', { masa: J(8, 'GAP-P14'), potencia: J(10, 'GAP-P14'), volumen: J(50, 'GAP-P14'), precio: J(12, 'GAP-P14') })]),
  pz('JG-COM-OBC', 'comms', 'computador', 'Computador de a bordo', 'Flight computer', 'The brain of the spacecraft.', ['COM-1'], { enSombra: true, uso: ON },
    [opc('A', 'Radiation-hard', { masa: J(36), potencia: J(260), volumen: J(280), precio: J(52, 'GAP-P16') }),
     opc('B', 'Standard', { masa: J(30), potencia: J(170), volumen: J(250), precio: J(35, 'GAP-P16') })]),
];

export const PIEZAS = Object.fromEntries(LISTA.map((p) => [p.id, p]));
export default PIEZAS;
