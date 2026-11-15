// Eventos de diseño (F-06b), eventos de misión (F-10) y contingencias (G-11) de las tres misiones jugables.
// Probabilidades `p`, `dp`, factores y cantidades son decisiones de diseño [INF] (G-01). Los casos reales y sus fuentes son de los md.
// Convenciones que el motor debe conocer (también en el informe de entrega):
//  - signo '±' en un evento de misión: `efecto` es la parte negativa; si hay una contingencia comprada de `mitigadoPor`, se anula
//    y queda el lado bueno. Positivo ('+'): `efecto.ciencia` o `efecto.dias` > 1. Negativo ('-'): factor < 1 o `falla: true`.
//  - `efecto.dias` < 1 recorta la vida útil; > 1 la alarga.
//  - Los ids de fase de `fase` son los de la misión que usa el evento (cada evento pertenece a una sola misión).
//  - `mitiga` (contingencia) y `mitigadoPor` (evento) son simétricos: el script de comprobación lo verifica.

const N = (en) => ({ en });
const I = (v) => ({ v, conf: 'INF', src: 'JUEGO' });

const ed = (id, signo, nombre, texto, efecto, casoReal, src) => ({ id, signo, nombre: N(nombre), texto: N(texto), efecto, casoReal: N(casoReal), src });
const em = (id, signo, fase, p, nombre, texto, efecto, mitigadoPor, casoReal, leccion, src) =>
  ({ id, signo, fase, p, nombre: N(nombre), texto: N(texto), efecto, mitigadoPor, casoReal: N(casoReal), leccion: N(leccion), src });
const ct = (id, nombre, texto, masa, precio, mitiga) => ({ id, nombre: N(nombre), texto: N(texto), masa: I(masa), precio: I(precio), mitiga });

export const EVENTOS_DISENO = {
  // ---------------- MER-3 (presupuesto de ~1100 M USD) ----------------
  'ED-MER-IN': ed('ED-MER-IN', '+', 'An investor joins', 'A partner agency adds money to the mission.', { presupuesto: 100 },
    'Generic game event (F-06b). Real parallel: BepiColombo is a joint mission of ESA and JAXA, with two orbiters launched together.', 'BC-01'),
  'ED-MER-OUT': ed('ED-MER-OUT', '-', 'An investor leaves', 'A partner pulls out and the budget shrinks.', { presupuesto: -100 },
    'Generic game event (F-06b). Real parallel: NASA ended the VIPER rover project in July 2024 over cost and delays, then revived it in 2025.', 'EXP-03'),
  'ED-MER-OBJ': ed('ED-MER-OBJ', '±', 'Ice becomes the top goal', 'The science board now wants water ice in polar craters first.', { prioridad: 'MER-3-O3' },
    'ESA lists the ice in polar craters as science question 7 for BepiColombo; MESSENGER saw water ice under dark material there.', 'BC-04'),
  'ED-MER-LIM': ed('ED-MER-LIM', '-', 'Hotter panels', 'The panels must stay cooler, so less power is allowed.', { limite: { recurso: 'potencia', factor: 0.9 } },
    'The MPO panels are kept below 180 degrees C, with 30% GaAs cells and 70% mirrors.', 'BC-02'),

  // ---------------- LUN-3 (presupuesto de ~185 M USD) ----------------
  'ED-LUN-IN': ed('ED-LUN-IN', '+', 'An investor joins', 'A company adds money to the lunar mission.', { presupuesto: 20 },
    'Generic game event (F-06b). Real parallel: NASA paid about 44 M USD for the 10 Blue Ghost payloads on top of the delivery.', 'BG-03'),
  'ED-LUN-OUT': ed('ED-LUN-OUT', '-', 'An investor leaves', 'A partner pulls out and the budget shrinks.', { presupuesto: -20 },
    'Generic game event (F-06b). Real parallel: NASA ended the VIPER rover project in July 2024 over cost and delays, then revived it in 2025.', 'EXP-03'),
  'ED-LUN-OBJ': ed('ED-LUN-OBJ', '±', 'Exosphere first', 'Scientists now want the Moon\'s thin atmosphere measured first.', { prioridad: 'LUN-3-O3' },
    'LEXI measured density profiles of the lunar exosphere using the same X-ray glow it used for the magnetosphere.', 'BG-04'),
  'ED-LUN-LIM': ed('ED-LUN-LIM', '-', 'Shared power deck', 'Another payload takes some of the lander power.', { limite: { recurso: 'potencia', factor: 0.9 } },
    'The Blue Ghost lander makes up to 400 W for itself and all ten NASA payloads.', 'BG-01'),

  // ---------------- COM-1 (presupuesto de ~960 M USD) ----------------
  'ED-COM-IN': ed('ED-COM-IN', '+', 'An investor joins', 'A partner adds money to the comet mission.', { presupuesto: 80 },
    'Generic game event (F-06b). Real parallel: Rosetta was an ESA mission with contributions from NASA.', 'CM-01'),
  'ED-COM-OUT': ed('ED-COM-OUT', '-', 'An investor leaves', 'A partner pulls out and the budget shrinks.', { presupuesto: -80 },
    'Generic game event (F-06b). Real parallel: NASA ended the VIPER rover project in July 2024 over cost and delays, then revived it in 2025.', 'EXP-03'),
  'ED-COM-OBJ': ed('ED-COM-OBJ', '±', 'Surprise gases first', 'Scientists now want unexpected gases hunted first.', { prioridad: 'COM-1-O3' },
    'Rosetta\'s ROSINA found molecular oxygen, a first at any comet, in more than 3,000 samples.', 'CM-06'),
  'ED-COM-LIM': ed('ED-COM-LIM', '-', 'Farther from the Sun', 'The comet is farther out, so sunlight and power are lower.', { limite: { recurso: 'potencia', factor: 0.85 } },
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

export default { EVENTOS_DISENO, EVENTOS_MISION, CONTINGENCIAS };
