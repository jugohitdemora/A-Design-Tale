// Planificación de ruta en la sala de control: mes de lanzamiento y sitio de descenso / órbita / región.
// Una entrada por misión jugable. Las reglas la leen en src/reglas/motor.js (planDe): si una misión no tiene entrada,
// no hay planificación y nada cambia.
//
// lanzamiento: el mes se elige en meses desde el inicio del diseño (misión.reloj.inicio), de 0 a mesMax. Las condiciones de cada
//   mes (clima del sitio de lanzamiento, clima espacial, conjunción, ΔV) salen de src/datos/calendario.js (contrato-reloj.md §2).
//   dvMin: ΔV de la mejor geometría (km/s); faseEspacio: fase que sufre el clima espacial.
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
// Lanzamiento: mes máximo, ΔV de la mejor geometría y fases afectadas.
const lanz = (mesMax, dvMin, fase, faseEspacio, nota) => ({
  lanzamiento: { mesMax, dvMin, fase, faseEspacio, nota },
});

export const PLANIFICACION = {
  'MER-3': {
    tipo: 'orbita',
    ...lanz(36, 4.1, 'cruise', 'cruise',
      N('El ΔV para ir a Mercurio cambia con la posición de la Tierra y Mercurio (periodo sinódico de 115,88 días).',
        'The ΔV to reach Mercury changes with where Earth and Mercury are (synodic period 115.88 days).')),
    mapa: { base: 'mercurio-color', proyeccion: 'equirectangular' },
    capas: [
      { id: 'color', nombre: N('Color (MESSENGER MDIS)', 'Colour (MESSENGER MDIS)'), real: true, mapa: 'mercurio-color' },
      { id: 'elevacion', nombre: N('Elevación (MESSENGER DEM)', 'Elevation (MESSENGER DEM)'), real: true, mapa: 'mercurio-elevacion' },
      { id: 'azufre', nombre: N('Índice de azufre (≈ juego)', 'Sulfur index (≈ game)'), calculo: 'azufre', unidad: '% S',
        nota: N('Estimación de juego del azufre en superficie (cifra de referencia: hasta ~4 % en peso, espectrómetro de rayos X de MESSENGER). No es el mapa real.',
          'Game estimate of surface sulfur (reference figure: up to ~4 wt%, MESSENGER X-ray spectrometer). It is not the real map.') },
      { id: 'hielo', nombre: N('Sombra permanente en cráteres polares (≈ juego)', 'Permanent shadow in polar craters (≈ game)'), calculo: 'hielo',
        nota: N('Zonas de cráteres polares que no reciben luz solar directa (datos de radar de Arecibo y de MESSENGER). Ubicación aproximada.',
          'Polar crater areas that get no direct sunlight (Arecibo radar and MESSENGER data). Approximate location.') },
    ],
    sitios: [
      { id: 'MER-ORB-POL', inc: 90, nombre: N('Polar 480 × 1500 km', 'Polar 480 × 1,500 km'),
        efectos: { fases: [], ciencia: {}, horasSombra: 1.5 }, hechos: { periapsis: 480, apoapsis: 1500 },
        nota: N('Inclinación 90°: pasa sobre los dos polos en cada vuelta.', 'Inclination 90°: it passes over both poles on every orbit.'), src: 'BC-01' },
      { id: 'MER-ORB-ELI', inc: 82.5, nombre: N('Muy elíptica 200 × 15 000 km', 'Highly elliptical 200 × 15,000 km'),
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
      N('Un lugar de la Luna tiene un amanecer cada 29,5 días; después hay unos 14 días de luz.',
        'A place on the Moon gets a sunrise every 29.5 days, then about 14 days of daylight.')),
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
      { id: 'LUN-S-CRI', lat: 18.56, lon: 61.81, nombre: N('Mare Crisium', 'Mare Crisium'),
        efectos: { fases: [{ fase: 'landing', dp: 0.03 }], ciencia: {} }, hechos: { elevTierra: 26.6, pendiente: 2 },
        nota: N('Llanura de lava en la cara visible, a 18,6° N.', 'Lava plain on the near side, at 18.6° N.'), src: 'BG-02' },
      { id: 'LUN-S-TRA', lat: 8.5, lon: 31.4, nombre: N('Mare Tranquillitatis', 'Mare Tranquillitatis'),
        efectos: { fases: [{ fase: 'landing', dp: 0.03 }], ciencia: { 'LUN-3-OX': 0.9 } }, hechos: { elevTierra: 57.6, pendiente: 2 },
        nota: N('Llanura de lava en la cara visible, a 8,5° N.', 'Lava plain on the near side, at 8.5° N.') },
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
      N('El cometa 67P pasó por el perihelio el 13 de agosto de 2015; el próximo es el 10 de abril de 2028. El periodo es de 6,44 años y la actividad del cometa cambia con la distancia al Sol.',
        'Comet 67P passed perihelion on 13 August 2015; the next one is on 10 April 2028. The period is 6.44 years and the activity of the comet changes with its distance from the Sun.')),
    mapa: { base: 'cometa-67p', proyeccion: 'figura' },
    capas: [
      { id: 'color', nombre: N('Imagen OSIRIS (29/07/2014)', 'OSIRIS image (29 Jul 2014)'), real: true, mapa: 'cometa-67p' },
      { id: 'gas', nombre: N('Actividad de gas (≈ juego)', 'Gas activity (≈ game)'), calculo: 'gas',
        nota: N('Modelo aproximado de juego de la actividad de gas por región del núcleo.',
          'Approximate game model of gas activity by region of the nucleus.') },
      { id: 'polvo', nombre: N('Riesgo de polvo (≈ juego)', 'Dust hazard (≈ game)'), calculo: 'polvo' },
    ],
    sitios: [
      { id: 'COM-R-HAP', x: 0.52, y: 0.33, nombre: N('Hapi (cuello), órbita de 10 km', 'Hapi (neck), 10 km orbit'),
        efectos: { fases: [{ fase: 'coma', dp: -0.05 }], ciencia: {} }, hechos: { distancia: 10 },
        nota: N('Región del cuello, donde se unen los dos lóbulos.', 'Region of the neck, where the two lobes join.'), src: 'CM-01' },
      { id: 'COM-R-IMH', x: 0.68, y: 0.56, nombre: N('Imhotep (cuerpo), órbita de 30 km', 'Imhotep (body), 30 km orbit'),
        efectos: { fases: [{ fase: 'coma', dp: 0.02 }], ciencia: { 'COM-1-O1': 0.85, 'COM-1-O3': 0.8 } }, hechos: { distancia: 30 },
        nota: N('Llanura grande y lisa en el lóbulo mayor.', 'Large, smooth plain on the big lobe.') },
      { id: 'COM-R-MAA', x: 0.37, y: 0.31, nombre: N("Ma'at (cabeza), órbita de 20 km", "Ma'at (head), 20 km orbit"),
        efectos: { fases: [], ciencia: { 'COM-1-O1': 0.95, 'COM-1-O2': 0.9 } }, hechos: { distancia: 20 },
        nota: N('Región del lóbulo menor (la cabeza).', 'Region on the small lobe (the head).') },
    ],
  },
};

export default PLANIFICACION;
