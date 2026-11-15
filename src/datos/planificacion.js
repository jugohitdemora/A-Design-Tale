// Planificación de ruta en la sala de control: mes de lanzamiento y sitio de descenso / órbita / región.
// Una entrada por misión jugable. Las reglas la leen en src/reglas/motor.js (planDe): si una misión no tiene entrada,
// no hay planificación y nada cambia.
//
// lanzamiento: el mes se elige en meses desde el inicio del diseño (misión.reloj.inicio), de 0 a mesMax. Las condiciones de cada
//   mes (clima del sitio de lanzamiento, clima espacial, conjunción, ΔV) salen de src/datos/calendario.js (contrato-reloj.md §2).
//   dvMin: ΔV de la mejor geometría (km/s); faseEspacio: fase que sufre el clima espacial.
// ventana: COMPATIBILIDAD con la interfaz anterior (planificador.js lee P.ventana.dias/optimo/anchura/k/maxFactor/dvMin).
//   Curva plana (k = 0) con `dias` = mesMax. Se quita cuando la interfaz use `lanzamiento` (lote 2).
// sitios: { id, nombre, lat, lon (grados) | x, y (fracción de la figura), inc (órbitas: inclinación en grados),
//   efectos: { fases: [{ fase, dp }], ciencia: { objetivoId: factor }, horasSombra }, hechos, nota, src }.
//   hechos: datos físicos para la tarjeta del sitio (sin efectos numéricos):
//     elevTierra (°, altura media de la Tierra sobre el horizonte; geometría: 90 − ángulo entre el sitio y el punto sub-Tierra 0°,0°),
//     pendiente (°, típica del terreno: aproximada, CG, sin fuente citada), periapsis/apoapsis (km), distancia (km).
//   Las cifras de las notas sin `src` (edad y tamaño de Tycho, temperatura de Mercurio, altura del Sol en el polo) son CG.
//   nota: datos, no veredictos (contrato §5).
// capas: capas de datos del mapa. `real: true` = imagen de archivo de una fuente oficial (src/datos/mapas.js);
//   `calculo` = se calcula en el navegador (geometría real o aproximación marcada como JUEGO).
const N = (es, en) => ({ es, en });
// Lanzamiento + shim de la ventana antigua.
const lanz = (mesMax, dvMin, fase, faseEspacio, nota) => ({
  lanzamiento: { mesMax, dvMin, fase, faseEspacio, nota },
  ventana: { dias: mesMax, optimo: 0, anchura: 1, k: 0, maxFactor: 1.6, dvMin, fase, nota },
});

export const PLANIFICACION = {
  'MER-3': {
    tipo: 'orbita',
    ...lanz(36, 4.1, 'cruise', 'cruise',
      N('El ΔV para ir a Mercurio cambia con la posición de la Tierra y Mercurio (periodo sinódico de 115,88 días). BepiColombo despegó el 20 de octubre de 2018.',
        'The ΔV to reach Mercury changes with where Earth and Mercury are (synodic period 115.88 days). BepiColombo lifted off on 20 October 2018.')),
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
        efectos: { fases: [], ciencia: {}, horasSombra: 1.5 }, hechos: { periapsis: 480, apoapsis: 1500 },
        nota: N('Inclinación 90°: pasa sobre los dos polos en cada vuelta. Es la órbita del MPO de BepiColombo.', 'Inclination 90°: it passes over both poles on every orbit. It is the BepiColombo MPO orbit.'), src: 'BC-01' },
      { id: 'MER-ORB-ELI', inc: 82.5, nombre: N('Muy elíptica 200 × 15 000 km (como MESSENGER)', 'Highly elliptical 200 × 15,000 km (like MESSENGER)'),
        efectos: { fases: [{ fase: 'science', dp: 0.03 }], ciencia: { 'MER-3-O1': 0.8, 'MER-3-O3': 0.85 }, horasSombra: 1 }, hechos: { periapsis: 200, apoapsis: 15000 },
        nota: N('Periapsis a 200 km sobre el hemisferio norte; la mayor parte de la órbita está a miles de km del planeta caliente.', 'Periapsis 200 km above the northern hemisphere; most of the orbit is thousands of km from the hot planet.') },
      { id: 'MER-ORB-ECU', inc: 8, nombre: N('Ecuatorial baja 400 km', 'Low equatorial 400 km'),
        efectos: { fases: [{ fase: 'science', dp: -0.04 }], ciencia: { 'MER-3-O3': 0.2, 'MER-3-O2': 0.85 }, horasSombra: 2.5 }, hechos: { periapsis: 400, apoapsis: 400 },
        nota: N('Inclinación 8°: la traza no pasa de 8° de latitud. A 400 km la superficie de día supera los 400 °C justo debajo.', 'Inclination 8°: the ground track stays within 8° of latitude. At 400 km the dayside surface right below is above 400 °C.') },
    ],
  },

  'LUN-3': {
    tipo: 'aterrizaje',
    ...lanz(24, 3.9, 'transit', 'transit',
      N('Un lugar de la Luna tiene un amanecer cada 29,5 días; después hay unos 14 días de luz. Blue Ghost 1 despegó el 15 de enero de 2025 y se posó el 2 de marzo.',
        'A place on the Moon gets a sunrise every 29.5 days, then about 14 days of daylight. Blue Ghost 1 lifted off on 15 January 2025 and landed on 2 March.')),
    mapa: { base: 'luna-color', proyeccion: 'equirectangular' },
    capas: [
      { id: 'color', nombre: N('Color (LROC WAC)', 'Colour (LROC WAC)'), real: true, mapa: 'luna-color' },
      { id: 'elevacion', nombre: N('Elevación (LOLA)', 'Elevation (LOLA)'), real: true, mapa: 'luna-elevacion' },
      { id: 'tierra', nombre: N('Visibilidad de la Tierra (geometría)', 'Earth visibility (geometry)'), calculo: 'tierra',
        nota: N('Altura de la Tierra sobre el horizonte. En la cara oculta la Tierra está siempre bajo el horizonte.',
          'Height of Earth above the horizon. On the far side Earth is always below the horizon.') },
      { id: 'pendiente', nombre: N('Rugosidad (derivada de LOLA)', 'Roughness (from LOLA)'), calculo: 'pendiente', base: 'luna-elevacion',
        nota: N('Cambio de altura entre píxeles vecinos del mapa LOLA.',
          'Height change between neighbouring pixels of the LOLA map.') },
    ],
    sitios: [
      { id: 'LUN-S-CRI', lat: 18.56, lon: 61.81, nombre: N('Mare Crisium (Blue Ghost)', 'Mare Crisium (Blue Ghost)'),
        efectos: { fases: [{ fase: 'landing', dp: 0.03 }], ciencia: {} }, hechos: { elevTierra: 26.6, pendiente: 2 },
        nota: N('Llanura de lava en la cara visible. Blue Ghost 1 se posó aquí en 2025.', 'Lava plain on the near side. Blue Ghost 1 landed here in 2025.'), src: 'BG-02' },
      { id: 'LUN-S-TRA', lat: 8.5, lon: 31.4, nombre: N('Mare Tranquillitatis', 'Mare Tranquillitatis'),
        efectos: { fases: [{ fase: 'landing', dp: 0.03 }], ciencia: { 'LUN-3-OX': 0.9 } }, hechos: { elevTierra: 57.6, pendiente: 2 },
        nota: N('Llanura de lava en la cara visible, cerca del sitio del Apolo 11.', 'Lava plain on the near side, near the Apollo 11 site.') },
      { id: 'LUN-S-TYC', lat: -43.3, lon: -11.2, nombre: N('Cráter Tycho', 'Tycho crater'),
        efectos: { fases: [{ fase: 'landing', dp: -0.08 }], ciencia: { 'LUN-3-O1': 0.9 } }, hechos: { elevTierra: 45.6, pendiente: 15 },
        nota: N('Cráter de ~108 millones de años y 85 km de diámetro, con bloques y paredes en terrazas.', 'Crater about 108 million years old and 85 km wide, with boulders and terraced walls.') },
      { id: 'LUN-S-SUR', lat: -84.5, lon: 20, nombre: N('Cerca del polo sur', 'Near the south pole'),
        efectos: { fases: [{ fase: 'landing', dp: -0.05 }], ciencia: { 'LUN-3-O1': 0.45, 'LUN-3-O2': 0.45 }, horasSombra: 8 }, hechos: { elevTierra: 5.2, pendiente: 10 },
        nota: N('El Sol va rasante (como mucho unos 7° de altura) y las sombras son largas.', 'The Sun stays low (at most about 7° high) and shadows are long.') },
      { id: 'LUN-S-OCU', lat: -36, lon: -151, nombre: N('Cara oculta (cuenca Apolo)', 'Far side (Apollo basin)'),
        efectos: { fases: [{ fase: 'landing', dp: -0.03 }], ciencia: { 'LUN-3-O1': 0, 'LUN-3-O2': 0 } }, hechos: { elevTierra: -45, pendiente: 5 },
        nota: N('Cara oculta: la Tierra queda 45° bajo el horizonte; el enlace necesita un satélite repetidor.', 'Far side: Earth sits 45° below the horizon; the link needs a relay satellite.') },
    ],
  },

  'COM-1': {
    tipo: 'region',
    ...lanz(48, 3.4, 'cruise', 'cruise',
      N('Rosetta despegó el 2 de marzo de 2004 y llegó el 6 de agosto de 2014, un año antes del perihelio del 13 de agosto de 2015. El próximo perihelio de 67P es el 10 de abril de 2028; el periodo es de 6,44 años.',
        'Rosetta lifted off on 2 March 2004 and arrived on 6 August 2014, a year before the perihelion of 13 August 2015. The next 67P perihelion is on 10 April 2028; the period is 6.44 years.')),
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
        efectos: { fases: [{ fase: 'coma', dp: -0.05 }], ciencia: {} }, hechos: { distancia: 10 },
        nota: N('Rosetta vio aquí los primeros chorros de gas y polvo en 2014.', 'Rosetta saw the first jets of gas and dust here in 2014.'), src: 'CM-01' },
      { id: 'COM-R-IMH', x: 0.68, y: 0.56, nombre: N('Imhotep (cuerpo), órbita de 30 km', 'Imhotep (body), 30 km orbit'),
        efectos: { fases: [{ fase: 'coma', dp: 0.02 }], ciencia: { 'COM-1-O1': 0.85, 'COM-1-O3': 0.8 } }, hechos: { distancia: 30 },
        nota: N('Llanura grande y lisa en el lóbulo mayor.', 'Large, smooth plain on the big lobe.') },
      { id: 'COM-R-MAA', x: 0.37, y: 0.31, nombre: N("Ma'at (cabeza), órbita de 20 km", "Ma'at (head), 20 km orbit"),
        efectos: { fases: [], ciencia: { 'COM-1-O1': 0.95, 'COM-1-O2': 0.9 } }, hechos: { distancia: 20 },
        nota: N('Región del lóbulo menor, cerca del sitio elegido para Philae (Agilkia).', 'Region on the small lobe, near the site chosen for Philae (Agilkia).') },
    ],
  },
};

export default PLANIFICACION;
