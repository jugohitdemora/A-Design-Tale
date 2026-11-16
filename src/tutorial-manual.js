// Contenido del Manual de juego que regala el Chief al terminar el tutorial (resumen del capítulo general del Manual del portátil,
// src/laptop/manual.js). Bloques: ['p', txt] · ['h', txt] · ['nota', txt] · ['lista', [txt…]] · ['tabla', cabecera[], filas[][]]; txt = { es, en }.
const t = (es, en) => ({ es, en });

export const MANUAL = [
  { t: t('1. Objetivo del juego', '1. Goal of the game'), b: [
    ['p', t('Hasta cuatro personas diseñan juntas una misión espacial real: una órbita, un aterrizaje o una exploración. La misión tiene presupuesto, cohete y plazo. Cada persona lleva un departamento. Ganan si la nave despega, llega y devuelve ciencia.', 'Up to four people design a real space mission together: an orbit, a landing or an exploration. The mission has a budget, a rocket and a deadline. Each person runs one department. You win if the spacecraft launches, arrives and returns science.')],
    ['lista', [
      t('Diseñar: montar una nave que cabe en las seis barras (masa, volumen, potencia, batería, datos y presupuesto).', 'Design: build a spacecraft that fits in the six bars (mass, volume, power, battery, data and budget).'),
      t('Decidir: objetivos de ciencia, cohete, ruta, mes de lanzamiento y contingencias (seguros).', 'Decide: science goals, rocket, route, launch month and contingencies (insurance).'),
      t('Aprobar: pasar la revisión y conseguir el GO de los cuatro departamentos.', 'Approve: pass the review and get the GO of all four departments.'),
      t('Volar: ver cada fase, activar contingencias a tiempo y leer el informe.', 'Fly: watch each phase, activate contingencies in time and read the report.'),
    ]],
    ['nota', t('Es cooperativo: todo el equipo gana o pierde junto. Las cifras marcadas con ≈ son valores de juego.', 'It is cooperative: the whole team wins or loses together. Figures marked ≈ are game values.')],
  ] },
  { t: t('2. Los cuatro departamentos', '2. The four departments'), b: [
    ['tabla', [t('Departamento', 'Department'), t('Responsable de', 'Responsible for')], [
      [t('Vuelo y Mecánica', 'Flight & Mechanics'), t('Cuerpo de la nave, cohete, ruta, mes de lanzamiento y sitio u órbita.', 'Spacecraft body, rocket, route, launch month and site or orbit.')],
      [t('Ciencia', 'Science'), t('Instrumentos, horas de uso y objetivos cubiertos.', 'Instruments, usage hours and goals covered.')],
      [t('Energía', 'Power'), t('Paneles, baterías y control de temperatura.', 'Panels, batteries and thermal control.')],
      [t('Comunicaciones y Operaciones', 'Communications & Operations'), t('Antenas, computador, navegación y segmento de tierra: que la ciencia llegue a casa.', 'Antennas, computer, navigation and ground segment: getting the science home.')],
    ]],
    ['nota', t('Si falta un jugador, su departamento queda vacante: cualquiera puede manejarlo y firmar por él. Habla con tu equipo antes de montar piezas. Cada puesto tiene su propio Manual SOP.', 'If a player is missing, the department stays vacant: anyone can run it and sign for it. Talk with your team before mounting parts. Each post has its own SOP manual.')],
  ] },
  { t: t('3. El recorrido, fase a fase', '3. The path, phase by phase'), b: [
    ['lista', [
      t('Lobby: pon tu nick y el código de sala (hasta 4 jugadores) y elige un rol libre.', 'Lobby: enter your nick and the room code (up to 4 players) and pick a free role.'),
      t('Briefing y expediente: elige escenario y misión; lee destino, presupuesto y plazo; marca los objetivos (el prioritario es obligatorio).', 'Briefing and dossier: pick scenario and mission; read destination, budget and deadline; mark the goals (the priority one is mandatory).'),
      t('Diseño en el portátil: Constructor, selector de cohete, contingencias, estado y expediente.', 'Design on the laptop: Builder, rocket selector, contingencies, status and dossier.'),
      t('Revisión y restricciones: si una barra se pasa, recorta piezas.', 'Review and constraints: if a bar is over, trim parts.'),
      t('Verificación y GO / NO-GO: cada departamento firma en la sala de control.', 'Verification and GO / NO-GO: each department signs in the control room.'),
      t('Lanzamiento, vuelo en la sala de control e informe de vuelo.', 'Launch, flight in the control room and flight report.'),
      t('Rediseño: «Volver a volar» o «Nueva misión».', 'Redesign: "Fly again" or "New mission".'),
    ]],
    ['nota', t('El diseño no va en línea recta: si una revisión falla o un cambio borra las firmas, vuelves a diseñar.', 'Design is not a straight line: if a review fails or a change clears the signatures, you go back to design.')],
  ] },
  { t: t('4. Reloj de misión y plazo', '4. Mission clock and deadline'), b: [
    ['p', t('La misión tiene un reloj en meses que corre en tiempo real mientras diseñas, recortas y verificas.', 'The mission has a clock in months that runs in real time while you design, trim and verify.')],
    ['tabla', [t('Jugadores', 'Players'), t('Duración de 1 mes de misión', 'Length of 1 mission month')], [
      [t('4', '4'), t('60 s', '60 s')], [t('3', '3'), t('75 s', '75 s')], [t('2', '2'), t('90 s', '90 s')], [t('1', '1'), t('105 s', '105 s')],
    ]],
    ['p', t('Cada misión tiene un plazo con los inversores. Hay un mes de gracia; después el presupuesto baja 4 % por cada mes de retraso. Si el retraso pasa de 12 meses, los inversores se retiran.', 'Each mission has an investor deadline. There is one month of grace; after that the budget drops 4 % for each month of delay. If the delay exceeds 12 months, the investors pull out.')],
  ] },
  { t: t('5. Barras, razón y tolerancia', '5. Bars, ratio and tolerance'), b: [
    ['p', t('Seis barras comparan lo que usa el diseño con un límite: masa, volumen, potencia, batería, enlace de datos y presupuesto.', 'Six bars compare what the design uses with a limit: mass, volume, power, battery, data link and budget.')],
    ['p', t('Razón = usado ÷ límite. Hasta 1,00 estás dentro. Entre 1,00 y 1,20 estás en tolerancia: la revisión pasa. Por encima de 1,20 la revisión falla.', 'Ratio = used ÷ limit. Up to 1.00 you are within the limit. Between 1.00 and 1.20 you are in tolerance: the review passes. Above 1.20 the review fails.')],
    ['p', t('Pasarte del límite tiene un costo en el vuelo: la probabilidad de fallo de una etapa relacionada sube unos 0,5 puntos porcentuales por cada 1 % de exceso, hasta +10 puntos con 120 %.', 'Going over the limit has a cost in flight: the failure probability of a related stage rises about 0.5 percentage points per 1 % of excess, up to +10 points at 120 %.')],
    ['nota', t('Deja margen: un evento puede cambiar un límite cuando estás justo en 100 %.', 'Keep margin: an event can change a limit when you are exactly at 100 %.')],
  ] },
  { t: t('6. Revisiones y GO / NO-GO', '6. Reviews and GO / NO-GO'), b: [
    ['p', t('La revisión del diseño compara cada barra con su límite y no cuesta meses (el reloj sigue corriendo mientras rediseñas). En modo Restricciones usas el mismo taller, pero solo puedes quitar piezas o bajar horas de uso.', 'The design review compares each bar with its limit and costs no months (the clock keeps running while you redesign). In Constraints mode you use the same workshop, but you can only remove parts or lower usage hours.')],
    ['p', t('La votación GO / NO-GO está en la sala de control: hacen falta las cuatro firmas para lanzar. Si cambias el diseño, el mes o el sitio, las firmas se borran. Si el lanzamiento falla, la misión termina.', 'The GO / NO-GO poll is in the control room: all four signatures are needed to launch. If you change the design, the month or the site, the signatures are cleared. If the launch fails, the mission ends.')],
  ] },
  { t: t('7. Eventos', '7. Events'), b: [
    ['p', t('Mientras corre el reloj saltan eventos de diseño al azar: aparecen en una tarjeta y afectan a todo el equipo. En el vuelo, cada fase puede traer un evento del mazo de la misión.', 'While the clock runs, random design events appear on a card and affect the whole team. In flight, each phase can bring an event from the mission deck.')],
    ['nota', t('Una contingencia comprada anula los eventos negativos. Los eventos buenos son suerte y ninguna contingencia los anula.', 'A bought contingency cancels negative events. Good events are luck and no contingency cancels them.')],
  ] },
  { t: t('8. Ventana de lanzamiento y propelente', '8. Launch window and propellant'), b: [
    ['p', t('El mes de lanzamiento se elige en la sala de control; Vuelo y Mecánica lidera la decisión. Cada mes tiene sus condiciones con datos de la NASA: clima del sitio, clima espacial, posición del destino y ΔV (cuánto debe cambiar la velocidad de la nave).', 'The launch month is chosen in the control room; Flight & Mechanics leads the decision. Each month has its own conditions from NASA data: site weather, space weather, target position and ΔV (how much the spacecraft must change its velocity).')],
    ['nota', t('Fuera del mes óptimo hace falta más propelente, y eso pesa en la barra de masa. Lanzar tarde también puede llevarte más allá del plazo.', 'Outside the best month you need more propellant, and it weighs on the mass bar. Launching late can also take you past the deadline.')],
  ] },
  { t: t('9. Contingencias', '9. Contingencies'), b: [
    ['p', t('Son seguros que se compran en la fase de Diseño y cuestan masa y presupuesto. Se activan en la fase de Misión, en la sala de control, por el departamento dueño. Si hay un evento con contingencia pendiente, no puedes avanzar hasta activarla.', 'They are insurance bought in the Design phase and cost mass and budget. They are activated in the Mission phase, in the control room, by the owning department. If an event has a pending contingency, you cannot advance until it is activated.')],
    ['nota', t('Asegura primero los fallos críticos en fases críticas: valen mucho más que los que solo quitan un 15 % de ciencia.', 'Insure critical failures in critical phases first: they are worth far more than ones that only remove 15 % of the science.')],
  ] },
  { t: t('10. El vuelo y la sala de control', '10. The flight and the control room'), b: [
    ['p', t('Tras el GO y el lanzamiento, el vuelo se juega en la sala de control. Las fases se muestran una a una y todos ven lo mismo. Pulsa «Next» para avanzar. El semáforo de cada fase muestra su probabilidad actual. Las fases críticas son las que pueden terminar la misión.', 'After GO and launch, you play the flight in the control room. Phases are shown one by one and everyone sees the same. Press "Next" to advance. The light of each phase shows its current probability. Critical phases are the ones that can end the mission.')],
  ] },
  { t: t('11. Puntuación e informe', '11. Scoring and report'), b: [
    ['p', t('El informe da el veredicto (total, parcial o fallida) y una puntuación según la regla de la misión. Explica las causas, los hallazgos y los datos perdidos, y compara tu misión con la misión real. Después, «Volver a volar» te deja rediseñar con lo aprendido.', 'The report gives the verdict (full, partial or failed) and a score under the mission rule. It explains the causes, findings and lost data, and compares your mission with the real one. Then "Fly again" lets you redesign with what you learned.')],
  ] },
  { t: t('12. Controles y navegación 3D', '12. Controls and 3D navigation'), b: [
    ['lista', [
      t('Arrastra con el ratón (o el dedo) para mirar alrededor. Sensibilidad, calidad y animación del fondo se cambian en Ajustes.', 'Drag with the mouse (or your finger) to look around. Sensitivity, quality and background animation are changed in Settings.'),
      t('Clic en un objeto para usarlo: holograma del proyector, carpeta de misión, tu portátil, carpeta de anillas (SOP), pantalla central, tu consola (tu GO) y la puerta.', 'Click an object to use it: projector hologram, mission folder, your laptop, ring binder (SOP), central screen, your console (your GO) and the door.'),
      t('Esc te levanta del portátil o te saca de la pantalla ampliada.', 'Esc stands you up from the laptop or takes you out of the zoomed screen.'),
      t('Multijugador: abre la misma URL en cada dispositivo; el código de sala va después de #.', 'Multiplayer: open the same URL on each device; the room code goes after #.'),
    ]],
  ] },
];
