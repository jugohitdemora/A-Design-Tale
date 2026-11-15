// Eventos de diseño (F-06b), eventos de misión (F-10) y contingencias (G-11) de las tres misiones jugables.
// Probabilidades `p`, `dp`, factores y cantidades son decisiones de diseño [INF] (G-01). Los casos reales y sus fuentes son de los md.
// Convenciones que el motor debe conocer (también en el informe de entrega):
//  - signo '±' en un evento de misión: `efecto` es la parte negativa; si hay una contingencia comprada de `mitigadoPor`, se anula
//    y queda el lado bueno. Positivo ('+'): `efecto.ciencia` o `efecto.dias` > 1. Negativo ('-'): factor < 1 o `falla: true`.
//  - `efecto.dias` < 1 recorta la vida útil; > 1 la alarga.
//  - `efecto.meses` (evento de diseño): meses de retraso que suma al reloj cuando sale (contrato-reloj.md §1).
//  - Los ids de fase de `fase` son los de la misión que usa el evento (cada evento pertenece a una sola misión).
//  - `mitiga` (contingencia) y `mitigadoPor` (evento) son simétricos: el script de comprobación lo verifica.

const N = (en) => ({ en });
const I = (v) => ({ v, conf: 'INF', src: 'JUEGO' });

const ed = (id, signo, nombre, texto, efecto, casoReal, src) => ({ id, signo, nombre: N(nombre), texto: N(texto), efecto, casoReal: N(casoReal), src });
const em = (id, signo, fase, p, nombre, texto, efecto, mitigadoPor, casoReal, leccion, src) =>
  ({ id, signo, fase, p, nombre: N(nombre), texto: N(texto), efecto, mitigadoPor, casoReal: N(casoReal), leccion: N(leccion), src });
// rol: el departamento que compra la contingencia en el diseño y la activa en la sala de control.
const ROL_CT = {'CT-MER-1': 'vuelo', 'CT-MER-2': 'ciencia', 'CT-MER-3': 'comms', 'CT-MER-4': 'potencia', 'CT-LUN-1': 'vuelo', 'CT-LUN-2': 'vuelo', 'CT-LUN-3': 'potencia', 'CT-LUN-4': 'ciencia', 'CT-COM-1': 'vuelo', 'CT-COM-2': 'potencia', 'CT-COM-3': 'comms', 'CT-COM-4': 'ciencia'};
const ct = (id, nombre, texto, masa, precio, mitiga) => ({ id, rol: ROL_CT[id] ?? 'comms', nombre: N(nombre), texto: N(texto), masa: I(masa), precio: I(precio), mitiga });

export const EVENTOS_DISENO = {
  // ---------------- MER-3 (presupuesto de ~1100 M USD) ----------------
  'ED-MER-IN': ed('ED-MER-IN', '+', 'An investor joins', 'A partner agency adds money to the mission.', { presupuesto: 100 },
    'Generic game event (F-06b). Real parallel: BepiColombo is a joint mission of ESA and JAXA, with two orbiters launched together.', 'BC-01'),
  'ED-MER-OUT': ed('ED-MER-OUT', '-', 'An investor leaves', 'A partner pulls out and the budget shrinks. Finding a new partner takes 1 month.', { presupuesto: -100, meses: 1 },
    'Generic game event (F-06b). Real parallel: NASA ended the VIPER rover project in July 2024 over cost and delays, then revived it in 2025.', 'EXP-03'),
  'ED-MER-OBJ': ed('ED-MER-OBJ', '±', 'Ice becomes the top goal', 'The science board now wants water ice in polar craters first.', { prioridad: 'MER-3-O3' },
    'ESA lists the ice in polar craters as science question 7 for BepiColombo; MESSENGER saw water ice under dark material there.', 'BC-04'),
  'ED-MER-LIM': ed('ED-MER-LIM', '-', 'Hotter panels', 'The panels must stay cooler, so less power is allowed. Requalifying them takes 2 months.', { limite: { recurso: 'potencia', factor: 0.9 }, meses: 2 },
    'The MPO panels are kept below 180 degrees C, with 30% GaAs cells and 70% mirrors.', 'BC-02'),

  // ---------------- LUN-3 (presupuesto de ~185 M USD) ----------------
  'ED-LUN-IN': ed('ED-LUN-IN', '+', 'An investor joins', 'A company adds money to the lunar mission.', { presupuesto: 20 },
    'Generic game event (F-06b). Real parallel: NASA paid about 44 M USD for the 10 Blue Ghost payloads on top of the delivery.', 'BG-03'),
  'ED-LUN-OUT': ed('ED-LUN-OUT', '-', 'An investor leaves', 'A partner pulls out and the budget shrinks. Finding a new partner takes 1 month.', { presupuesto: -20, meses: 1 },
    'Generic game event (F-06b). Real parallel: NASA ended the VIPER rover project in July 2024 over cost and delays, then revived it in 2025.', 'EXP-03'),
  'ED-LUN-OBJ': ed('ED-LUN-OBJ', '±', 'Exosphere first', 'Scientists now want the Moon\'s thin atmosphere measured first.', { prioridad: 'LUN-3-O3' },
    'LEXI measured density profiles of the lunar exosphere using the same X-ray glow it used for the magnetosphere.', 'BG-04'),
  'ED-LUN-LIM': ed('ED-LUN-LIM', '-', 'Shared power deck', 'Another payload takes some of the lander power. Reworking the power plan takes 2 months.', { limite: { recurso: 'potencia', factor: 0.9 }, meses: 2 },
    'The Blue Ghost lander makes up to 400 W for itself and all ten NASA payloads.', 'BG-01'),

  // ---------------- COM-1 (presupuesto de ~960 M USD) ----------------
  'ED-COM-IN': ed('ED-COM-IN', '+', 'An investor joins', 'A partner adds money to the comet mission.', { presupuesto: 80 },
    'Generic game event (F-06b). Real parallel: Rosetta was an ESA mission with contributions from NASA.', 'CM-01'),
  'ED-COM-OUT': ed('ED-COM-OUT', '-', 'An investor leaves', 'A partner pulls out and the budget shrinks. Finding a new partner takes 1 month.', { presupuesto: -80, meses: 1 },
    'Generic game event (F-06b). Real parallel: NASA ended the VIPER rover project in July 2024 over cost and delays, then revived it in 2025.', 'EXP-03'),
  'ED-COM-OBJ': ed('ED-COM-OBJ', '±', 'Surprise gases first', 'Scientists now want unexpected gases hunted first.', { prioridad: 'COM-1-O3' },
    'Rosetta\'s ROSINA found molecular oxygen, a first at any comet, in more than 3,000 samples.', 'CM-06'),
  'ED-COM-LIM': ed('ED-COM-LIM', '-', 'Farther from the Sun', 'The comet is farther out, so sunlight and power are lower. Resizing the panels takes 2 months.', { limite: { recurso: 'potencia', factor: 0.85 }, meses: 2 },
    'Rosetta\'s panels gave 850 W at 3.4 AU but only 395 W at 5.25 AU.', 'CM-08'),
};

export const EVENTOS_MISION = {
  // ---------------- MER-3: fases launch, cruise, insertion, commissioning, science ----------------
  'EM-MER-1': em('EM-MER-1', '-', 'cruise', 0.25, 'Weak thrusters', 'The ion thrusters push less than planned, so the trip takes longer.', { dias: 0.85 }, ['CT-MER-1'],
    'In 2024 BepiColombo\'s thrusters gave less power, forcing a lower-thrust path; arrival slipped from December 2025 to November 2026.',
    'Keep thrust margin in a low-thrust plan.', 'BC-07'),
  'EM-MER-2': em('EM-MER-2', '-', 'science', 0.25, 'Noisy sunlight', 'Changes in sunlight blur the radio measurements.', { ciencia: 0.85 }, ['CT-MER-2'],
    'A 2022 study found that variations in sunlight confuse the BepiColombo radio experiment (MORE).',
    'Plan how to calibrate out the noise before you fly.', 'BC-08'),
  'EM-MER-3': em('EM-MER-3', '-', 'insertion', 0.2, 'Hot antenna', 'The antenna gets too hot near the Sun.', { ciencia: 0.8 }, ['CT-MER-3'],
    'The antenna of Mio, the JAXA orbiter, can pass 350 degrees C.',
    'Test hot-case parts before they are close to the Sun.', 'BC-05'),
  'EM-MER-4': em('EM-MER-4', '+', 'cruise', 0.3, 'Flyby test', 'A planet flyby lets you test the instruments before arrival.', { ciencia: 1.1 }, [],
    'BepiColombo made 9 flybys on the way: 1 of Earth, 2 of Venus and 6 of Mercury. Using them as instrument tests is still to be confirmed with ESA.',
    'Flybys are free practice runs.', 'BC-01'),
  'EM-MER-5': em('EM-MER-5', '+', 'science', 0.2, 'Mission extended', 'The agency adds a second year of science.', { dias: 1.5 }, [],
    'BepiColombo has 1 nominal year of science and 1 more year of extension is possible.',
    'A healthy spacecraft can earn extra time.', 'BC-06'),
  'EM-MER-6': em('EM-MER-6', '-', 'science', 0.2, 'Panels run hot', 'The solar panels get too hot and must tilt away from the Sun.', { ciencia: 0.85 }, ['CT-MER-4'],
    'The MPO panels are kept below 180 degrees C and make up to 1,000 W in the science phase.',
    'Tilting the panels trades power for heat.', 'BC-02'),

  // ---------------- LUN-3: fases launch, transit, orbit, landing, surface ----------------
  'EM-LUN-1': em('EM-LUN-1', '-', 'transit', 0.15, 'Valve will not close', 'A fuel valve fails to close after a burn and leaks.', { falla: true }, ['CT-LUN-1'],
    'In 2024 a Peregrine valve failed to reseal, which broke the oxidizer tank.',
    'Valves that must reseal need a backup plan.', 'LND-24'),
  'EM-LUN-2': em('EM-LUN-2', '-', 'landing', 0.25, 'Lander tips over', 'The lander lands on a slope and falls on its side.', { ciencia: 0.5 }, ['CT-LUN-2'],
    'In 2024 the IM-1 Odysseus lander tipped over after a laser switch was not enabled before landing.',
    'Check every switch before landing.', 'LND-25'),
  'EM-LUN-3': em('EM-LUN-3', '±', 'surface', 0.3, 'Solar eclipse from the Moon', 'Earth blocks the Sun. It gets freezing, but it is a science chance.', { ciencia: 0.85 }, ['CT-LUN-3'],
    'On 14 March 2025 an eclipse seen from the Moon dropped the temperature to -171 degrees C.',
    'Heaters turn a danger into an opportunity.', 'BG-03'),
  'EM-LUN-4': em('EM-LUN-4', '+', 'surface', 0.35, 'Survives the night', 'The lander keeps working for hours after sunset.', { dias: 1.15 }, [],
    'Blue Ghost kept operating a little over 5 hours into the lunar night.',
    'A good battery is extra science.', 'BG-01'),
  'EM-LUN-5': em('EM-LUN-5', '+', 'transit', 0.3, 'Navigation works better', 'Satellite navigation works farther away than expected.', { ciencia: 1.1 }, [],
    'The LuGRE experiment set a distance record for navigation signals, at 246,000 miles.',
    'Test new tools on a real flight.', 'BG-02'),
  'EM-LUN-6': em('EM-LUN-6', '-', 'surface', 0.2, 'Dust on the lens', 'Moon dust sticks to the instrument and blurs it.', { ciencia: 0.85 }, ['CT-LUN-4'],
    'Lunar dust is abrasive and wears down spacecraft, suits and habitats.',
    'Dust is a design problem, not a surprise.', 'BG-01'),

  // ---------------- COM-1: fases launch, cruise, wake, arrival, coma ----------------
  'EM-COM-1': em('EM-COM-1', '-', 'coma', 0.3, 'Dust hits the ship', 'Grains of comet dust hit the spacecraft.', { ciencia: 0.8 }, ['CT-COM-1', 'CT-COM-4'],
    'At comet Halley in 1986 Giotto took about 12,000 dust hits, and one 1 g grain made it spin.',
    'More gas near the comet also means more dust.', 'CM-09'),
  'EM-COM-2': em('EM-COM-2', '±', 'coma', 0.4, 'Comet wakes up', 'Near the Sun the comet makes more gas, and more dust too.', { ciencia: 0.9 }, ['CT-COM-1'],
    'Comet 67P reached its closest point to the Sun on 13 August 2015, while Rosetta was alongside.',
    'Activity is the science and the danger at once.', 'CM-01'),
  'EM-COM-3': em('EM-COM-3', '+', 'coma', 0.25, 'Unexpected gas', 'The spectrometer sees a gas nobody expected.', { ciencia: 1.1 }, [],
    'ROSINA made the first detection of molecular oxygen at a comet, in more than 3,000 samples from September 2014 to March 2015.',
    'Keep the instrument on long enough to be surprised.', 'CM-06'),
  'EM-COM-4': em('EM-COM-4', '+', 'coma', 0.2, 'Molecules of life', 'The instruments find the building blocks of life.', { ciencia: 1.1 }, [],
    'Rosetta found glycine, an amino acid, and phosphorus at comet 67P.',
    'Comets may carry ingredients for life.', 'CM-01'),
  'EM-COM-5': em('EM-COM-5', '-', 'coma', 0.25, 'Sunlight fades', 'The comet drifts out and the panels give less power.', { ciencia: 0.85 }, ['CT-COM-2'],
    'Rosetta\'s panels gave 850 W at 3.4 AU but only 395 W at 5.25 AU.',
    'Sunlight falls with the square of distance.', 'CM-08'),
  'EM-COM-6': em('EM-COM-6', '-', 'wake', 0.15, 'Ship does not wake up', 'After years asleep, the spacecraft does not answer the wake-up call.', { falla: true }, ['CT-COM-3'],
    'Rosetta slept 31 months, from 8 June 2011 to 20 January 2014, and woke on time. The game asks what if it had not.',
    'The wake-up is the riskiest day of a long sleep.', 'CM-01'),
};

export const CONTINGENCIAS = {
  // MER-3
  'CT-MER-1': ct('CT-MER-1', 'Thrust margin', 'Extra fuel and a spare thruster mode for the trip.', 60, 15, ['EM-MER-1']),
  'CT-MER-2': ct('CT-MER-2', 'Noise calibration plan', 'A plan to remove sunlight noise from the radio data.', 5, 12, ['EM-MER-2']),
  'CT-MER-3': ct('CT-MER-3', 'Antenna heat shield', 'Extra insulation for the antenna.', 20, 10, ['EM-MER-3']),
  'CT-MER-4': ct('CT-MER-4', 'Panel tilt margin', 'Mirrored cells and room to tilt the panels away from the Sun.', 25, 14, ['EM-MER-6']),
  // LUN-3
  'CT-LUN-1': ct('CT-LUN-1', 'Valve backup', 'A spare valve and a pressure check before each burn.', 8, 4, ['EM-LUN-1']),
  'CT-LUN-2': ct('CT-LUN-2', 'Wide landing legs', 'Wider legs and a checklist of every switch.', 20, 5, ['EM-LUN-2']),
  'CT-LUN-3': ct('CT-LUN-3', 'Extra heaters', 'More heaters and thicker blankets for the cold.', 10, 4, ['EM-LUN-3']),
  'CT-LUN-4': ct('CT-LUN-4', 'Lens dust cover', 'A cover that opens only when you observe.', 3, 3, ['EM-LUN-6']),
  // COM-1
  'CT-COM-1': ct('CT-COM-1', 'Dust shield', 'A shield that protects the ship from grains.', 40, 20, ['EM-COM-1', 'EM-COM-2']),
  'CT-COM-2': ct('CT-COM-2', 'Power-saving plan', 'A bigger battery and a plan to switch things off.', 30, 12, ['EM-COM-5']),
  'CT-COM-3': ct('CT-COM-3', 'Wake-up plan', 'Spare computer and heaters ready for the wake-up.', 25, 15, ['EM-COM-6']),
  'CT-COM-4': ct('CT-COM-4', 'Backup probe', 'A spare disposable probe in case one is lost to dust.', 35, 18, ['EM-COM-1']),
};

// ---------------------------------------------------------------------------------------------------------------------
// Español de los textos visibles. El inglés queda en el dato original; tx() usa el idioma activo (i18n.js).
// ED: [nombre, texto, casoReal].  EM: [nombre, texto, casoReal, lección].  CT: [nombre, texto].
// ---------------------------------------------------------------------------------------------------------------------
const VIPER = 'Evento genérico del juego (F-06b). Paralelo real: en julio de 2024 la NASA canceló el rover VIPER por costos y retrasos, y lo retomó en 2025.';
const ES_ED = {
  'ED-MER-IN': ['Entra un inversionista', 'Una agencia socia aporta dinero a la misión.', 'Evento genérico del juego (F-06b). Paralelo real: BepiColombo es una misión conjunta de la ESA y la JAXA, con dos orbitadores lanzados juntos.'],
  'ED-MER-OUT': ['Se va un inversionista', 'Un socio se retira y el presupuesto se reduce. Buscar otro socio lleva 1 mes.', VIPER],
  'ED-MER-OBJ': ['El hielo pasa a ser la meta principal', 'Ahora el comité científico quiere primero el hielo de agua en los cráteres polares.', 'La ESA incluye el hielo en los cráteres polares como la pregunta científica 7 de BepiColombo; MESSENGER vio hielo de agua bajo material oscuro allí.'],
  'ED-MER-LIM': ['Paneles más calientes', 'Los paneles deben mantenerse más fríos, así que se permite menos potencia. Volver a calificarlos lleva 2 meses.', 'Los paneles del MPO se mantienen por debajo de 180 grados C, con 30 % de celdas de GaAs y 70 % de espejos.'],
  'ED-LUN-IN': ['Entra un inversionista', 'Una empresa aporta dinero a la misión lunar.', 'Evento genérico del juego (F-06b). Paralelo real: la NASA pagó cerca de 44 M USD por las 10 cargas de Blue Ghost, además del envío.'],
  'ED-LUN-OUT': ['Se va un inversionista', 'Un socio se retira y el presupuesto se reduce. Buscar otro socio lleva 1 mes.', VIPER],
  'ED-LUN-OBJ': ['Primero la exosfera', 'Ahora los científicos quieren medir primero la atmósfera tenue de la Luna.', 'LEXI midió perfiles de densidad de la exosfera lunar con el mismo resplandor de rayos X que usó para la magnetosfera.'],
  'ED-LUN-LIM': ['Cubierta de energía compartida', 'Otra carga útil usa parte de la energía del módulo de aterrizaje. Rehacer el plan de energía lleva 2 meses.', 'El módulo Blue Ghost genera hasta 400 W para sí mismo y para las diez cargas de la NASA.'],
  'ED-COM-IN': ['Entra un inversionista', 'Un socio aporta dinero a la misión al cometa.', 'Evento genérico del juego (F-06b). Paralelo real: Rosetta fue una misión de la ESA con aportes de la NASA.'],
  'ED-COM-OUT': ['Se va un inversionista', 'Un socio se retira y el presupuesto se reduce. Buscar otro socio lleva 1 mes.', VIPER],
  'ED-COM-OBJ': ['Primero los gases sorpresa', 'Ahora los científicos quieren cazar primero los gases inesperados.', 'ROSINA de Rosetta encontró oxígeno molecular, algo inédito en un cometa, en más de 3.000 muestras.'],
  'ED-COM-LIM': ['Más lejos del Sol', 'El cometa está más lejos, así que hay menos luz solar y menos energía. Redimensionar los paneles lleva 2 meses.', 'Los paneles de Rosetta daban 850 W a 3,4 UA, pero solo 395 W a 5,25 UA.'],
};
const ES_EM = {
  'EM-MER-1': ['Propulsores débiles', 'Los propulsores iónicos empujan menos de lo previsto y el viaje dura más.', 'En 2024 los propulsores de BepiColombo dieron menos potencia y obligaron a una trayectoria de menor empuje; la llegada pasó de diciembre de 2025 a noviembre de 2026.', 'Deja margen de empuje en un plan de bajo empuje.'],
  'EM-MER-2': ['Luz solar ruidosa', 'Los cambios en la luz solar enturbian las mediciones de radio.', 'Un estudio de 2022 encontró que las variaciones de la luz solar confunden el experimento de radio de BepiColombo (MORE).', 'Planea cómo calibrar el ruido antes de volar.'],
  'EM-MER-3': ['Antena caliente', 'La antena se calienta demasiado cerca del Sol.', 'La antena de Mio, el orbitador de la JAXA, puede superar los 350 grados C.', 'Prueba las piezas en el caso más caliente antes de acercarlas al Sol.'],
  'EM-MER-4': ['Prueba en un sobrevuelo', 'Un sobrevuelo de un planeta permite probar los instrumentos antes de llegar.', 'BepiColombo hizo 9 sobrevuelos en el camino: 1 de la Tierra, 2 de Venus y 6 de Mercurio. Falta confirmar con la ESA su uso como pruebas de instrumentos.', 'Los sobrevuelos son ensayos gratis.'],
  'EM-MER-5': ['Misión extendida', 'La agencia añade un segundo año de ciencia.', 'BepiColombo tiene 1 año nominal de ciencia y es posible 1 año más de extensión.', 'Una nave sana puede ganar tiempo extra.'],
  'EM-MER-6': ['Paneles al rojo', 'Los paneles solares se calientan demasiado y deben inclinarse lejos del Sol.', 'Los paneles del MPO se mantienen por debajo de 180 grados C y generan hasta 1.000 W en la fase científica.', 'Inclinar los paneles cambia potencia por calor.'],
  'EM-LUN-1': ['La válvula no cierra', 'Una válvula de combustible no cierra tras una maniobra y pierde.', 'En 2024 una válvula de Peregrine no volvió a sellarse y rompió el tanque de oxidante.', 'Las válvulas que deben volver a sellarse necesitan un plan de respaldo.'],
  'EM-LUN-2': ['El módulo se vuelca', 'El módulo aterriza en una pendiente y cae de lado.', 'En 2024 el módulo IM-1 Odysseus se volcó porque no se activó un interruptor del láser antes de aterrizar.', 'Revisa cada interruptor antes de aterrizar.'],
  'EM-LUN-3': ['Eclipse solar desde la Luna', 'La Tierra tapa el Sol. Hace un frío extremo, pero es una oportunidad científica.', 'El 14 de marzo de 2025 un eclipse visto desde la Luna bajó la temperatura a -171 grados C.', 'Los calentadores convierten un peligro en una oportunidad.'],
  'EM-LUN-4': ['Sobrevive la noche', 'El módulo sigue funcionando durante horas después del atardecer.', 'Blue Ghost siguió operando algo más de 5 horas dentro de la noche lunar.', 'Una buena batería es ciencia extra.'],
  'EM-LUN-5': ['La navegación funciona mejor', 'La navegación por satélite funciona más lejos de lo esperado.', 'El experimento LuGRE batió un récord de distancia para señales de navegación, con 246.000 millas.', 'Prueba herramientas nuevas en un vuelo real.'],
  'EM-LUN-6': ['Polvo en la lente', 'El polvo lunar se pega al instrumento y lo empaña.', 'El polvo lunar es abrasivo y desgasta naves, trajes y hábitats.', 'El polvo es un problema de diseño, no una sorpresa.'],
  'EM-COM-1': ['El polvo golpea la nave', 'Granos de polvo del cometa golpean la nave.', 'En el cometa Halley, en 1986, Giotto recibió cerca de 12.000 impactos de polvo, y un grano de 1 g la hizo girar.', 'Más gas cerca del cometa también significa más polvo.'],
  'EM-COM-2': ['El cometa despierta', 'Cerca del Sol el cometa libera más gas, y también más polvo.', 'El cometa 67P llegó a su punto más cercano al Sol el 13 de agosto de 2015, con Rosetta a su lado.', 'La actividad es a la vez la ciencia y el peligro.'],
  'EM-COM-3': ['Gas inesperado', 'El espectrómetro detecta un gas que nadie esperaba.', 'ROSINA hizo la primera detección de oxígeno molecular en un cometa, en más de 3.000 muestras entre septiembre de 2014 y marzo de 2015.', 'Mantén el instrumento encendido el tiempo suficiente para sorprenderte.'],
  'EM-COM-4': ['Moléculas de la vida', 'Los instrumentos encuentran los bloques de construcción de la vida.', 'Rosetta encontró glicina, un aminoácido, y fósforo en el cometa 67P.', 'Los cometas pueden llevar ingredientes para la vida.'],
  'EM-COM-5': ['La luz se apaga', 'El cometa se aleja y los paneles dan menos energía.', 'Los paneles de Rosetta daban 850 W a 3,4 UA, pero solo 395 W a 5,25 UA.', 'La luz solar cae con el cuadrado de la distancia.'],
  'EM-COM-6': ['La nave no despierta', 'Tras años dormida, la nave no responde a la llamada de despertar.', 'Rosetta durmió 31 meses, del 8 de junio de 2011 al 20 de enero de 2014, y despertó a tiempo. El juego pregunta qué habría pasado si no.', 'El despertar es el día más arriesgado de un sueño largo.'],
};
const ES_CT = {
  'CT-MER-1': ['Margen de empuje', 'Combustible extra y un modo de propulsor de reserva para el viaje.'],
  'CT-MER-2': ['Plan de calibración del ruido', 'Un plan para quitar el ruido de la luz solar de los datos de radio.'],
  'CT-MER-3': ['Escudo térmico de la antena', 'Aislamiento extra para la antena.'],
  'CT-MER-4': ['Margen de inclinación de los paneles', 'Celdas con espejos y espacio para inclinar los paneles lejos del Sol.'],
  'CT-LUN-1': ['Válvula de respaldo', 'Una válvula de repuesto y una prueba de presión antes de cada encendido.'],
  'CT-LUN-2': ['Patas de aterrizaje anchas', 'Patas más anchas y una lista de revisión de cada interruptor.'],
  'CT-LUN-3': ['Calentadores extra', 'Más calentadores y mantas más gruesas para el frío.'],
  'CT-LUN-4': ['Tapa antipolvo de la lente', 'Una tapa que se abre solo cuando observas.'],
  'CT-COM-1': ['Escudo antipolvo', 'Un escudo que protege la nave de los granos.'],
  'CT-COM-2': ['Plan de ahorro de energía', 'Una batería más grande y un plan para apagar sistemas.'],
  'CT-COM-3': ['Plan de despertar', 'Computador de repuesto y calentadores listos para el despertar.'],
  'CT-COM-4': ['Sonda de respaldo', 'Una sonda desechable de repuesto por si el polvo destruye una.'],
};
for (const [id, [n, t, c]] of Object.entries(ES_ED)) { const e = EVENTOS_DISENO[id]; e.nombre.es = n; e.texto.es = t; e.casoReal.es = c; }
for (const [id, [n, t, c, l]] of Object.entries(ES_EM)) { const e = EVENTOS_MISION[id]; e.nombre.es = n; e.texto.es = t; e.casoReal.es = c; e.leccion.es = l; }
for (const [id, [n, t]] of Object.entries(ES_CT)) { const k = CONTINGENCIAS[id]; k.nombre.es = n; k.texto.es = t; }

export default { EVENTOS_DISENO, EVENTOS_MISION, CONTINGENCIAS };
