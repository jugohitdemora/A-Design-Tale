// Planificación de ruta en la sala de control: ventana de lanzamiento y sitio de descenso / órbita / región.
// Una entrada por misión jugable. Las reglas la leen en src/reglas/motor.js (planDe): si una misión no tiene entrada,
// no hay planificación y nada cambia.
//
// ventana: días de la ventana (0..dias), día óptimo y anchura. Lanzar lejos del óptimo pide más ΔV:
//   factor(d) = min(maxFactor, 1 + k·((d − optimo) / anchura)²). La masa de propelente de la ruta se multiplica por ese factor.
//   Es un corte de un "porkchop plot" simplificado: forma real, números de JUEGO.
// sitios: { id, nombre, lat, lon (grados) | x, y (fracción de la figura), inc (órbitas: inclinación en grados),
//   efectos: { fases: [{ fase, dp }], ciencia: { objetivoId: factor }, horasSombra }, nota, src }.
// capas: capas de datos del mapa. `real: true` = imagen de archivo de una fuente oficial (src/datos/mapas.js);
//   `calculo` = se calcula en el navegador (geometría real o aproximación marcada como JUEGO).
const N = (es, en) => ({ es, en });

export const PLANIFICACION = {
  'MER-3': {
    tipo: 'orbita',
    ventana: {
      dias: 60, optimo: 27, anchura: 14, k: 0.32, maxFactor: 1.6, dvMin: 4.1, fase: 'cruise',
      nota: N('BepiColombo despegó el 20 de octubre de 2018, dentro de una ventana de pocas semanas. Fuera del día óptimo hace falta más ΔV y por tanto más propelente.',
        'BepiColombo lifted off on 20 October 2018, inside a window of a few weeks. Away from the best day you need more ΔV, so more propellant.'),
    },
    mapa: { base: 'mercurio-color', proyeccion: 'equirectangular' },
    capas: [
      { id: 'color', nombre: N('Color (MESSENGER MDIS)', 'Colour (MESSENGER MDIS)'), real: true, mapa: 'mercurio-color' },
      { id: 'elevacion', nombre: N('Elevación (MESSENGER DEM)', 'Elevation (MESSENGER DEM)'), real: true, mapa: 'mercurio-elevacion' },
      { id: 'azufre', nombre: N('Índice de azufre (≈ juego)', 'Sulfur index (≈ game)'), calculo: 'azufre', unidad: '% S',
        nota: N('MESSENGER (XRS) midió más azufre del esperado, hasta ~4 % en peso. Este mapa es una APROXIMACIÓN de juego, no el mapa real.',
          'MESSENGER (XRS) measured more sulfur than expected, up to ~4 wt%. This map is a GAME APPROXIMATION, not the real map.') },
      { id: 'hielo', nombre: N('Hielo en cráteres polares (≈ juego)', 'Ice in polar craters (≈ game)'), calculo: 'hielo',
        nota: N('El radar de Arecibo y MESSENGER vieron hielo en cráteres en sombra de los polos. Ubicación aproximada.',
          'Arecibo radar and MESSENGER saw ice in shadowed polar craters. Approximate location.') },
    ],
    sitios: [
      { id: 'MER-ORB-POL', inc: 90, nombre: N('Polar 480 × 1500 km (como MPO)', 'Polar 480 × 1,500 km (like MPO)'),
        efectos: { fases: [], ciencia: {}, horasSombra: 1.5 },
        nota: N('Pasa por encima de todo el planeta, polos incluidos. Es la órbita real del MPO.', 'Flies over the whole planet, poles included. The real MPO orbit.'), src: 'BC-01' },
      { id: 'MER-ORB-ELI', inc: 82.5, nombre: N('Muy elíptica 200 × 15 000 km (como MESSENGER)', 'Highly elliptical 200 × 15,000 km (like MESSENGER)'),
        efectos: { fases: [{ fase: 'science', dp: 0.03 }], ciencia: { 'MER-3-O1': 0.8, 'MER-3-O3': 0.85 }, horasSombra: 1 },
        nota: N('Se aleja del planeta caliente y sufre menos calor, pero solo ve de cerca el hemisferio norte.', 'Gets away from the hot planet and suffers less heat, but only sees the north up close.') },
      { id: 'MER-ORB-ECU', inc: 8, nombre: N('Ecuatorial baja 400 km', 'Low equatorial 400 km'),
        efectos: { fases: [{ fase: 'science', dp: -0.04 }], ciencia: { 'MER-3-O3': 0.2, 'MER-3-O2': 0.85 }, horasSombra: 2.5 },
        nota: N('Mucho calor reflejado por la superficie, eclipses largos y nunca ve los polos.', 'Lots of heat reflected by the surface, long eclipses and it never sees the poles.') },
    ],
  },

  'LUN-3': {
    tipo: 'aterrizaje',
    ventana: {
      dias: 30, optimo: 12, anchura: 8, k: 0.28, maxFactor: 1.5, dvMin: 3.9, fase: 'transit',
      nota: N('Hay que llegar al sitio al amanecer local para tener los ~14 días de luz. Cada día de retraso fuera de la ventana obliga a esperar en órbita y gastar propelente.',
        'You must reach the site at local sunrise to get the ~14 days of daylight. Each day off the window means waiting in orbit and burning propellant.'),
    },
    mapa: { base: 'luna-color', proyeccion: 'equirectangular' },
    capas: [
      { id: 'color', nombre: N('Color (LROC WAC)', 'Colour (LROC WAC)'), real: true, mapa: 'luna-color' },
      { id: 'elevacion', nombre: N('Elevación (LOLA)', 'Elevation (LOLA)'), real: true, mapa: 'luna-elevacion' },
      { id: 'tierra', nombre: N('Visibilidad de la Tierra (geometría)', 'Earth visibility (geometry)'), calculo: 'tierra',
        nota: N('Altura de la Tierra sobre el horizonte. LEXI necesita ver la Tierra: en la cara oculta es imposible.',
          'Height of Earth above the horizon. LEXI needs to see Earth: impossible on the far side.') },
      { id: 'pendiente', nombre: N('Rugosidad (derivada de LOLA)', 'Roughness (from LOLA)'), calculo: 'pendiente', base: 'luna-elevacion',
        nota: N('Cambio de altura entre píxeles vecinos del mapa LOLA. Más rugoso = aterrizaje más arriesgado.',
          'Height change between neighbouring pixels of the LOLA map. Rougher = riskier landing.') },
    ],
    sitios: [
      { id: 'LUN-S-CRI', lat: 18.56, lon: 61.81, nombre: N('Mare Crisium (Blue Ghost)', 'Mare Crisium (Blue Ghost)'),
        efectos: { fases: [{ fase: 'landing', dp: 0.03 }], ciencia: {} },
        nota: N('Llanura de lava lisa en la cara visible. Es el sitio real de Blue Ghost 1.', 'Smooth lava plain on the near side. The real Blue Ghost 1 site.'), src: 'BG-02' },
      { id: 'LUN-S-TRA', lat: 8.5, lon: 31.4, nombre: N('Mare Tranquillitatis', 'Mare Tranquillitatis'),
        efectos: { fases: [{ fase: 'landing', dp: 0.03 }], ciencia: { 'LUN-3-OX': 0.9 } },
        nota: N('Lisa y con la Tierra alta en el cielo. Cerca del Apolo 11.', 'Smooth, with Earth high in the sky. Near Apollo 11.') },
      { id: 'LUN-S-TYC', lat: -43.3, lon: -11.2, nombre: N('Cráter Tycho', 'Tycho crater'),
        efectos: { fases: [{ fase: 'landing', dp: -0.08 }], ciencia: { 'LUN-3-O1': 0.9 } },
        nota: N('Cráter joven y rocoso: muy interesante, pero peligroso para posarse.', 'Young, rocky crater: interesting but dangerous to land on.') },
      { id: 'LUN-S-SUR', lat: -84.5, lon: 20, nombre: N('Cerca del polo sur', 'Near the south pole'),
        efectos: { fases: [{ fase: 'landing', dp: -0.05 }], ciencia: { 'LUN-3-O1': 0.45, 'LUN-3-O2': 0.45 }, horasSombra: 8 },
        nota: N('Sol rasante y sombras largas; la Tierra queda casi en el horizonte, mala para LEXI.', 'Grazing Sun and long shadows; Earth sits almost on the horizon, bad for LEXI.') },
      { id: 'LUN-S-OCU', lat: -36, lon: -151, nombre: N('Cara oculta (cuenca Apolo)', 'Far side (Apollo basin)'),
        efectos: { fases: [{ fase: 'landing', dp: -0.03 }], ciencia: { 'LUN-3-O1': 0, 'LUN-3-O2': 0 } },
        nota: N('Desde aquí la Tierra nunca se ve: LEXI no puede fotografiar la magnetosfera.', 'Earth is never visible from here: LEXI cannot image the magnetosphere.') },
    ],
  },

  'COM-1': {
    tipo: 'region',
    ventana: {
      dias: 40, optimo: 18, anchura: 10, k: 0.35, maxFactor: 1.6, dvMin: 3.4, fase: 'cruise',
      nota: N('Rosetta usó tres sobrevuelos de la Tierra y uno de Marte: los planetas tienen que estar en su sitio el día del despegue.',
        'Rosetta used three Earth flybys and one of Mars: the planets must be in the right place on launch day.'),
    },
    mapa: { base: 'cometa-67p', proyeccion: 'figura' },
    capas: [
      { id: 'color', nombre: N('Imagen OSIRIS (29/07/2014)', 'OSIRIS image (29 Jul 2014)'), real: true, mapa: 'cometa-67p' },
      { id: 'gas', nombre: N('Actividad de gas (≈ juego)', 'Gas activity (≈ game)'), calculo: 'gas',
        nota: N('Rosetta vio los primeros chorros en el "cuello" (región Hapi). Mapa aproximado de juego.',
          'Rosetta saw the first jets at the "neck" (Hapi region). Approximate game map.') },
      { id: 'polvo', nombre: N('Riesgo de polvo (≈ juego)', 'Dust hazard (≈ game)'), calculo: 'polvo' },
    ],
    sitios: [
      { id: 'COM-R-HAP', x: 0.52, y: 0.33, nombre: N('Hapi (cuello), órbita de 10 km', 'Hapi (neck), 10 km orbit'),
        efectos: { fases: [{ fase: 'coma', dp: -0.05 }], ciencia: {} },
        nota: N('La zona más activa al principio: mucho gas que oler, pero también mucho polvo.', 'The most active area early on: lots of gas to sniff, but lots of dust too.'), src: 'CM-01' },
      { id: 'COM-R-IMH', x: 0.68, y: 0.56, nombre: N('Imhotep (cuerpo), órbita de 30 km', 'Imhotep (body), 30 km orbit'),
        efectos: { fases: [{ fase: 'coma', dp: 0.02 }], ciencia: { 'COM-1-O1': 0.85, 'COM-1-O3': 0.8 } },
        nota: N('Llanura grande y tranquila: órbita segura, menos gas.', 'Large, quiet plain: safe orbit, less gas.') },
      { id: 'COM-R-MAA', x: 0.37, y: 0.31, nombre: N("Ma'at (cabeza), órbita de 20 km", "Ma'at (head), 20 km orbit"),
        efectos: { fases: [], ciencia: { 'COM-1-O1': 0.95, 'COM-1-O2': 0.9 } },
        nota: N('Equilibrio entre actividad y seguridad. Cerca del sitio elegido para Philae.', 'Balance between activity and safety. Near the site chosen for Philae.') },
    ],
  },
};

export default PLANIFICACION;
