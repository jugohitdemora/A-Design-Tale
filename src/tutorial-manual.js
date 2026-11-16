// Contenido del Manual de juego que regala el Chief al terminar el tutorial (resumen del capítulo general del Manual del portátil,
// src/laptop/manual.js). Bloques: ['p', txt] · ['h', txt] · ['nota', txt] · ['lista', [txt…]] · ['tabla', cabecera[], filas[][]]; txt = { es, en }.
// Estilo: frases cortas, voz activa, un dato por frase, sin punto y coma, en español y en inglés.
const t = (es, en) => ({ es, en });

export const MANUAL = [
  { t: t('1. Objetivo del juego', '1. Goal of the game'), b: [
    ['p', t('Hasta cuatro personas diseñan juntas una misión espacial real. Puede ser una órbita, un aterrizaje o una exploración. La misión tiene un presupuesto, un cohete y un plazo. Cada persona lleva un departamento. El equipo gana si la nave despega, llega y devuelve ciencia.', 'Up to four people design a real space mission together. It can be an orbit, a landing, or an exploration. The mission has a budget, a rocket, and a deadline. Each person runs one department. The team wins if the spacecraft launches, arrives, and returns science.')],
    ['lista', [
      t('Diseñar: monta una nave que cabe en las seis barras (masa, volumen, potencia, batería, datos y presupuesto).', 'Design: build a spacecraft that fits in the six bars (mass, volume, power, battery, data, and budget).'),
      t('Decidir: elige los objetivos de ciencia, el cohete, la ruta, el mes de lanzamiento y las contingencias (seguros).', 'Decide: choose the science goals, the rocket, the route, the launch month, and the contingencies (insurance).'),
      t('Aprobar: pasa la revisión. Los cuatro departamentos deben dar su GO.', 'Approve: pass the review. All four departments must give their GO.'),
      t('Volar: mira cada fase, activa las contingencias a tiempo y lee el informe.', 'Fly: watch each phase, activate the contingencies in time, and read the report.'),
    ]],
    ['nota', t('El juego es cooperativo. Todo el equipo gana o pierde junto. El símbolo ≈ marca un valor de juego.', 'The game is cooperative. The whole team wins or loses together. The symbol ≈ marks a game value.')],
  ] },
  { t: t('2. Los cuatro departamentos', '2. The four departments'), b: [
    ['tabla', [t('Departamento', 'Department'), t('Responsable de', 'Responsible for')], [
      [t('Vuelo y Mecánica', 'Flight & Mechanics'), t('El cuerpo de la nave, el cohete, la ruta, el mes de lanzamiento y el sitio o la órbita.', 'The spacecraft body, the rocket, the route, the launch month, and the site or orbit.')],
      [t('Ciencia', 'Science'), t('Los instrumentos, sus horas de uso y los objetivos cubiertos.', 'The instruments, their usage hours, and the goals covered.')],
      [t('Energía', 'Power'), t('Los paneles, las baterías y el control de temperatura.', 'The panels, the batteries, and the thermal control.')],
      [t('Comunicaciones y Operaciones', 'Communications & Operations'), t('Las antenas, el computador, la navegación y el segmento de tierra. Su trabajo: que la ciencia llegue a casa.', 'The antennas, the computer, the navigation, and the ground segment. Their job: get the science home.')],
    ]],
    ['nota', t('Si falta un jugador, su departamento queda vacante. Cualquiera puede manejarlo y firmar por él. Habla con tu equipo antes de montar piezas. Cada puesto tiene su propio Manual SOP.', 'If a player is absent, that department stays vacant. Anyone can run it and sign for it. Talk with your team before you mount parts. Each post has its own SOP manual.')],
  ] },
  { t: t('3. El recorrido, fase a fase', '3. The path, phase by phase'), b: [
    ['lista', [
      t('Lobby: escribe tu nick y el código de sala (hasta 4 jugadores). Elige un rol libre.', 'Lobby: enter your nick and the room code (up to 4 players). Pick a free role.'),
      t('Briefing y expediente: elige un escenario y una misión. Lee el destino, el presupuesto y el plazo. Marca los objetivos. El objetivo prioritario es obligatorio.', 'Briefing and dossier: pick a scenario and a mission. Read the destination, the budget, and the deadline. Mark the goals. The priority goal is mandatory.'),
      t('Diseño en el portátil: usa el Constructor, el selector de cohete, las contingencias, el estado y el expediente.', 'Design on the laptop: use the Builder, the rocket selector, the contingencies, the status, and the dossier.'),
      t('Revisión y restricciones: si una barra pasa el límite, recorta piezas.', 'Review and constraints: if a bar goes over the limit, trim parts.'),
      t('Verificación y GO / NO-GO: cada departamento firma en la sala de control.', 'Verification and GO / NO-GO: each department signs in the control room.'),
      t('Lanzamiento, vuelo en la sala de control e informe de vuelo.', 'Launch, flight in the control room, and flight report.'),
      t('Rediseño: elige «Volver a volar» o «Nueva misión».', 'Redesign: choose "Fly again" or "New mission".'),
    ]],
    ['nota', t('El diseño no va en línea recta. Si una revisión falla, vuelves a diseñar. Si un cambio borra las firmas, también.', 'Design is not a straight line. If a review fails, you design again. If a change clears the signatures, you do the same.')],
  ] },
  { t: t('4. Reloj de misión y plazo', '4. Mission clock and deadline'), b: [
    ['p', t('El reloj de misión cuenta meses. Corre en tiempo real mientras diseñas, recortas y verificas.', 'The mission clock counts months. It runs in real time while you design, trim, and verify.')],
    ['tabla', [t('Jugadores', 'Players'), t('Duración de 1 mes de misión', 'Length of 1 mission month')], [
      [t('4', '4'), t('60 s', '60 s')], [t('3', '3'), t('75 s', '75 s')], [t('2', '2'), t('90 s', '90 s')], [t('1', '1'), t('105 s', '105 s')],
    ]],
    ['p', t('Cada misión tiene un plazo con los inversores. Hay un mes de gracia. Después, el presupuesto baja un 4 % por cada mes de retraso. Si el retraso pasa de 12 meses, los inversores se retiran.', 'Each mission has a deadline with the investors. You have one month of grace. After that, the budget drops 4 % for each month of delay. If the delay is more than 12 months, the investors pull out.')],
  ] },
  { t: t('5. Barras, porcentaje y tolerancia', '5. Bars, percentage, and tolerance'), b: [
    ['p', t('Seis barras comparan lo que usa el diseño con un límite. Son la masa, el volumen, la potencia, la batería, el enlace de datos y el presupuesto.', 'Six bars compare what the design uses with a limit. They are mass, volume, power, battery, data link, and budget.')],
    ['p', t('Cada barra muestra el porcentaje del límite que usas: usado ÷ límite × 100. Hasta el 100 %, estás dentro del límite. Del 100 % al 120 %, estás en tolerancia y la revisión pasa. Por encima del 120 %, la revisión falla.', 'Each bar shows the percentage of the limit you use: used ÷ limit × 100. Up to 100 %, you are within the limit. From 100 % to 120 %, you are in tolerance and the review passes. Above 120 %, the review fails.')],
    ['p', t('Pasar el límite tiene un costo en el vuelo. La probabilidad de fallo de una etapa relacionada sube unos 0,5 puntos porcentuales por cada 1 % de exceso. El máximo es +10 puntos con un 120 %.', 'Going over the limit has a cost in flight. The failure probability of a related stage rises about 0.5 percentage points for each 1 % of excess. The maximum is +10 points at 120 %.')],
    ['nota', t('Deja margen. Un evento puede cambiar un límite cuando estás justo en el 100 %.', 'Keep some margin. An event can change a limit when you are exactly at 100 %.')],
  ] },
  { t: t('6. Revisiones y GO / NO-GO', '6. Reviews and GO / NO-GO'), b: [
    ['p', t('La revisión del diseño compara cada barra con su límite. No cuesta meses, pero el reloj sigue corriendo mientras rediseñas.', 'The design review compares each bar with its limit. It costs no months, but the clock keeps running while you redesign.')],
    ['p', t('En el modo Restricciones usas el mismo taller. Solo puedes quitar piezas o bajar las horas de uso.', 'In Constraints mode, you use the same workshop. You can only remove parts or lower the usage hours.')],
    ['p', t('La votación GO / NO-GO ocurre en la sala de control. Para lanzar, hacen falta las cuatro firmas. Si cambias el diseño, el mes o el sitio, las firmas se borran. Si el lanzamiento falla, la misión termina.', 'The GO / NO-GO poll happens in the control room. To launch, you need all four signatures. If you change the design, the month, or the site, the signatures clear. If the launch fails, the mission ends.')],
  ] },
  { t: t('7. Eventos', '7. Events'), b: [
    ['p', t('Mientras corre el reloj, saltan eventos de diseño al azar. Cada evento aparece en una tarjeta y afecta a todo el equipo. En el vuelo, cada fase puede traer un evento del mazo de la misión.', 'While the clock runs, random design events appear. Each event shows on a card and affects the whole team. In flight, each phase can bring an event from the mission deck.')],
    ['nota', t('Una contingencia comprada anula los eventos negativos. Los eventos buenos son suerte. Ninguna contingencia los anula.', 'A bought contingency cancels the negative events. Good events are luck. No contingency cancels them.')],
  ] },
  { t: t('8. Ruta, mes y sitio', '8. Route, month, and site'), b: [
    ['p', t('Estas tres decisiones se toman en la pantalla de planificación de la sala de control. Las ven los cuatro departamentos. Solo Vuelo y Mecánica fija la ruta y el mes. Vuelo y Mecánica o Ciencia pueden elegir el sitio.', 'You make these three decisions on the planning screen of the control room. All four departments see it. Only Flight & Mechanics sets the route and the month. Flight & Mechanics or Science can choose the site.')],
    ['h', t('La ruta', 'The route')],
    ['p', t('Cada ruta tiene días de viaje, masa de propelente, precio y un efecto en la probabilidad de una fase (Δp).', 'Each route has travel days, propellant mass, price, and an effect on the probability of one phase (Δp).')],
    ['lista', [
      t('Un viaje directo y rápido gasta más propelente. Pesa más y pide un cohete mayor.', 'A fast direct trip burns more propellant. It weighs more and needs a bigger rocket.'),
      t('Un viaje largo con sobrevuelos usa la gravedad de los planetas. Gasta menos, pero la nave queda expuesta más tiempo.', 'A long trip with flybys uses the gravity of planets. It burns less, but the spacecraft stays exposed for longer.'),
      t('Pregúntate: ¿cuántos kg ahorro? ¿cuánto dinero? ¿sube o baja la probabilidad de la fase afectada?', 'Ask yourself: how many kg do I save? How much money? Does the probability of the affected phase go up or down?'),
    ]],
    ['h', t('El mes de lanzamiento', 'The launch month')],
    ['p', t('Cada mes tiene sus condiciones, con datos de la NASA: el clima del sitio, el clima espacial, la posición del destino y el ΔV. El ΔV es cuánto debe cambiar la velocidad de la nave.', 'Each month has its own conditions, with NASA data: the site weather, the space weather, the target position, and the ΔV. The ΔV is how much the spacecraft must change its velocity.')],
    ['lista', [
      t('Fuera del mes óptimo, la nave necesita más propelente. Ese propelente pesa en la barra de masa.', 'Outside the best month, the spacecraft needs more propellant. That propellant weighs on the mass bar.'),
      t('El reloj corre en tiempo real. No puedes lanzar en un mes que ya pasó.', 'The clock runs in real time. You cannot launch in a month that has passed.'),
      t('Después del plazo, los inversores recortan la financiación. El botón «Ir a la mejor ventana» te lleva al mejor mes.', 'After the deadline, the investors cut the funding. The "Go to the best window" button takes you to the best month.'),
    ]],
    ['h', t('El sitio o la órbita', 'The site or orbit')],
    ['p', t('El mapa usa imágenes reales y capas de datos: color, elevación, pendiente y composición. Ciencia propone sitios. Vuelo y Mecánica comprueba que son alcanzables y seguros.', 'The map uses real images and data layers: colour, elevation, slope, and composition. Science proposes sites. Flight & Mechanics checks that they are reachable and safe.')],
    ['nota', t('Un sitio inclinado o con rocas es un riesgo de aterrizaje. Una nave real se volcó en 2024 al aterrizar en una ladera. Cada cambio de ruta, mes o sitio borra las firmas.', 'A steep site, or one with boulders, is a landing risk. A real lander tipped over in 2024 after it landed on a slope. Each change of route, month, or site clears the signatures.')],
  ] },
  { t: t('9. Contingencias', '9. Contingencies'), b: [
    ['p', t('Una contingencia es un seguro. Se compra en la fase de Diseño y cuesta masa y presupuesto. En la fase de Misión, el departamento dueño la activa en la sala de control.', 'A contingency is insurance. You buy it in the Design phase, and it costs mass and budget. In the Mission phase, the owning department activates it in the control room.')],
    ['p', t('Si un evento tiene una contingencia pendiente, no puedes avanzar. Antes, actívala.', 'If an event has a pending contingency, you cannot advance. Activate it first.')],
    ['nota', t('Asegura primero los fallos críticos en las fases críticas. Valen mucho más que un evento que solo quita un 15 % de ciencia.', 'Insure the critical failures in the critical phases first. They are worth much more than an event that only removes 15 % of the science.')],
  ] },
  { t: t('10. La sala de control y el vuelo', '10. The control room and the flight'), b: [
    ['p', t('La sala de control tiene una pared grande de pantallas. La pared cambia con la fase de la partida.', 'The control room has a big wall of screens. The wall changes with the phase of the game.')],
    ['tabla', [t('Modo de la pared', 'Wall mode'), t('Qué muestra', 'What it shows')], [
      [t('Planificación', 'Planning'), t('La ruta, el mes de lanzamiento y el sitio o la órbita, con mapas y capas de datos.', 'The route, the launch month, and the site or orbit, with maps and data layers.')],
      [t('GO / NO-GO', 'GO / NO-GO'), t('Las comprobaciones, la firma de cada departamento y el botón «Lanzar».', 'The checks, the signature of each department, and the "Launch" button.')],
      [t('Operaciones', 'Operations'), t('La secuencia de la misión, la vista orbital, los mensajes y la telemetría.', 'The mission sequence, the orbit view, the messages, and the telemetry.')],
      [t('Informe final', 'Final report'), t('El veredicto, la ciencia lograda, las causas y la misión real.', 'The verdict, the science achieved, the causes, and the real mission.')],
    ]],
    ['p', t('Sentado en tu consola, haz clic en la pantalla central para usar su interfaz. Haz clic en tu consola para poner o quitar tu GO. La puerta de la pared izquierda te lleva de vuelta al briefing. Pulsa Esc para volver a mirar la sala.', 'Seated at your console, click the central screen to use its interface. Click your console to set or remove your GO. The door in the left wall takes you back to the briefing. Press Esc to look at the room again.')],
    ['h', t('El vuelo, fase a fase', 'The flight, phase by phase')],
    ['p', t('Después del GO y del lanzamiento, el vuelo ocurre en la consola de operaciones. Todos ven lo mismo. Pulsa «Siguiente paso» para avanzar. El semáforo de cada fase muestra su probabilidad actual. Las fases críticas pueden terminar la misión.', 'After GO and launch, the flight happens on the operations console. Everyone sees the same. Press "Next step" to advance. The light of each phase shows its current probability. Critical phases can end the mission.')],
    ['p', t('Si sale un evento malo y tienes una contingencia que lo cubre, solo el departamento dueño puede activarla. Hasta que la active, nadie avanza.', 'If a bad event appears and you have a contingency that covers it, only the owning department can activate it. Until it does, nobody advances.')],
  ] },
  { t: t('11. Puntuación e informe', '11. Scoring and report'), b: [
    ['p', t('El informe da un veredicto: total, parcial o fallida. También da una puntuación, según la regla de la misión.', 'The report gives a verdict: full, partial, or failed. It also gives a score, under the mission rule.')],
    ['p', t('El informe explica las causas, los hallazgos y los datos perdidos. También compara tu misión con la misión real. Después, «Volver a volar» te deja rediseñar con lo que aprendiste.', 'The report explains the causes, the findings, and the lost data. It also compares your mission with the real mission. Then "Fly again" lets you redesign with what you learned.')],
  ] },
  { t: t('12. Controles y navegación 3D', '12. Controls and 3D navigation'), b: [
    ['lista', [
      t('Arrastra con el ratón (o con el dedo) para mirar alrededor. Cambia la sensibilidad, la calidad y la animación del fondo en Ajustes.', 'Drag with the mouse (or your finger) to look around. Change the sensitivity, the quality, and the background animation in Settings.'),
      t('Haz clic en un objeto para usarlo. Puedes usar el holograma del proyector, la carpeta de misión, tu portátil, la carpeta de anillas (SOP), la pantalla central, tu consola (tu GO) y la puerta.', 'Click an object to use it. You can use the projector hologram, the mission folder, your laptop, the ring binder (SOP), the central screen, your console (your GO), and the door.'),
      t('Pulsa Esc para levantarte del portátil o salir de la pantalla ampliada.', 'Press Esc to stand up from the laptop or leave the zoomed screen.'),
      t('Multijugador: abre la misma URL en cada dispositivo. El código de sala va después de #.', 'Multiplayer: open the same URL on each device. The room code goes after #.'),
    ]],
  ] },
];
