// App del portátil "Manual SOP": carpeta de procedimientos operativos, uno por departamento (Vuelo, Ciencia, Energía, Comunicaciones).
// Contrato del host: appManual(c, { rol }) devuelve el nodo raíz (100 % de su contenedor, scroll interno en la página con data-scroll="sop-<rol>").
// También se muestra dentro del modal de la carpeta física de la mesa 3D.
// Estado local: c.ui.manual = { rol, seccion, base }   (rol = departamento que se lee; base = rol con el que se abrió).
// Los números y fórmulas salen de reglas/motor.js y reglas/despliegue.js; el anexo de misión sale de c.mision / c.D.
import { textos, tx, idioma, depto } from '../i18n.js';
import { h, valor, lista, redondear, resumenSeguro, ROL_COLOR } from '../pantallas/ui.js';

const ROLES = ['vuelo', 'ciencia', 'potencia', 'comms'];

// ---------------------------------------------------------------------------------------------------------------------
// Textos de la interfaz
// ---------------------------------------------------------------------------------------------------------------------
const T = textos({
  es: {
    titulo: 'MANUAL DE PROCEDIMIENTOS (SOP)', indice: 'ÍNDICE', doc: 'Documento', rev: 'Rev.', depto: 'Departamento',
    clasif: 'CLASIFICACIÓN: USO INTERNO DE LA MISIÓN · COPIA CONTROLADA', tuDepto: 'tu departamento',
    anexo: 'Anexo de misión', sinMision: 'Sin misión asignada todavía',
    sinMisionTxt: 'El anexo específico de la misión (contingencias, piezas, cohetes, rutas y fases) aparece aquí cuando se asigna una misión en el briefing. Mientras tanto, las secciones genéricas sirven para estudiar el procedimiento.',
    anterior: 'Anterior', siguiente: 'Siguiente', pag: 'Sección', de: 'de',
    sin: 'Sin datos', ninguna: 'Este departamento no tiene contingencias en esta misión.',
    comprada: 'COMPRADA', activada: 'ACTIVADA', noComprada: 'sin comprar', mitiga: 'Mitiga', masa: 'Masa', precio: 'Precio', prob: 'Probabilidad', fase: 'Fase',
    efecto: 'Efecto si no se mitiga', leccion: 'Lección', otras: 'Contingencias de los demás departamentos',
    estado: 'ESTADO ACTUAL DEL DISEÑO', parametros: 'PARÁMETROS DE LA MISIÓN', piezas: 'PIEZAS DE TU TALLER EN ESTA MISIÓN', fasesVuelo: 'FASES DEL VUELO',
    sombra: 'Horas de sombra por día/ciclo', enlace: 'Horas de enlace con la Tierra por día', dias: 'Días de misión previstos', presupuesto: 'Presupuesto', puntuacion: 'Regla de puntuación',
    limites: 'Topes de la misión', ninguno: 'ninguno', destino: 'Destino',
    cabPieza: ['ID', 'Pieza', 'Opción nº', 'Masa', 'Potencia', 'Volumen', 'Tasa', 'Precio', 'Aporta', 'Uso h/día'],
    fija: '24 h (siempre encendida)', eclipse: 'Se mantiene encendida en la sombra: cuenta para la batería', sinPiezas: 'No hay piezas de este departamento en esta misión.',
    cohetes: 'COHETES DISPONIBLES', rutas: 'RUTAS DISPONIBLES', objetivos: 'OBJETIVOS DE LA MISIÓN', capacidad: 'Capacidad al destino', operador: 'Operador',
    cabRuta: ['Ruta', 'Días', 'Masa (propelente/módulo)', 'Precio', 'Efecto en la probabilidad'], cabCohete: ['Cohete', 'Operador', 'Capacidad al destino', 'Precio'],
    cabObj: ['Objetivo', 'Prioritario', 'Valor', 'Requiere', 'Uso objetivo'], si: 'sí', no: 'no',
    cabFase: ['Fase', 'Crítica', 'p base', 'Mejoras (marcadas: de tu departamento)'],
    ocultos: (n) => `Esta misión esconde ${n} hallazgo(s) que nadie te dice cuáles son. Se descubren solo si hay un instrumento detector encendido (uso > 0).`,
    unidadBarra: { masa: 'kg', potencia: 'W', bateria: 'Wh', datos: 'MB/día', presupuesto: 'M USD', volumen: 'vol.' },
    nombreBarra: { masa: 'Masa', potencia: 'Potencia', bateria: 'Batería', datos: 'Enlace de datos', presupuesto: 'Presupuesto', volumen: 'Volumen' },
    cienciaTotal: 'Ciencia cubierta', ok: 'dentro', tolerancia: 'tolerancia (+20 %)', exceso: 'fuera de límite',
    ciencia: 'ciencia', diasEf: 'días', falla: 'fallo crítico', critica: 'crítica', noCritica: 'no crítica',
    glosario: 'Término', etiq: { check: 'COMPROBAR', cuidado: 'CUIDADO', nota: 'NOTA' },
  },
  en: {
    titulo: 'STANDARD OPERATING PROCEDURES (SOP)', indice: 'CONTENTS', doc: 'Document', rev: 'Rev.', depto: 'Department',
    clasif: 'CLASSIFICATION: MISSION INTERNAL USE · CONTROLLED COPY', tuDepto: 'your department',
    anexo: 'Mission annex', sinMision: 'No mission assigned yet',
    sinMisionTxt: 'The mission-specific annex (contingencies, parts, rockets, routes and phases) appears here once a mission is assigned in the briefing. Until then, the generic sections are for studying the procedure.',
    anterior: 'Previous', siguiente: 'Next', pag: 'Section', de: 'of',
    sin: 'No data', ninguna: 'This department has no contingencies in this mission.',
    comprada: 'BOUGHT', activada: 'ACTIVATED', noComprada: 'not bought', mitiga: 'Mitigates', masa: 'Mass', precio: 'Price', prob: 'Probability', fase: 'Phase',
    efecto: 'Effect if not mitigated', leccion: 'Lesson', otras: 'Contingencies of the other departments',
    estado: 'CURRENT DESIGN STATUS', parametros: 'MISSION PARAMETERS', piezas: 'PARTS OF YOUR WORKSHOP IN THIS MISSION', fasesVuelo: 'FLIGHT PHASES',
    sombra: 'Shadow hours per day/cycle', enlace: 'Link hours with Earth per day', dias: 'Planned mission days', presupuesto: 'Budget', puntuacion: 'Scoring rule',
    limites: 'Mission caps', ninguno: 'none', destino: 'Destination',
    cabPieza: ['ID', 'Part', 'Option #', 'Mass', 'Power', 'Volume', 'Rate', 'Price', 'Provides', 'Use h/day'],
    fija: '24 h (always on)', eclipse: 'Stays on in the shadow: counts for the battery', sinPiezas: 'There are no parts for this department in this mission.',
    cohetes: 'AVAILABLE ROCKETS', rutas: 'AVAILABLE ROUTES', objetivos: 'MISSION GOALS', capacidad: 'Capacity to destination', operador: 'Operator',
    cabRuta: ['Route', 'Days', 'Mass (propellant/module)', 'Price', 'Effect on probability'], cabCohete: ['Rocket', 'Operator', 'Capacity to destination', 'Price'],
    cabObj: ['Goal', 'Priority', 'Value', 'Requires', 'Target usage'], si: 'yes', no: 'no',
    cabFase: ['Phase', 'Critical', 'base p', 'Improvements (marked: from your department)'],
    ocultos: (n) => `This mission hides ${n} finding(s) and nobody tells you which. They are discovered only if a detector instrument is switched on (usage > 0).`,
    unidadBarra: { masa: 'kg', potencia: 'W', bateria: 'Wh', datos: 'MB/day', presupuesto: 'M USD', volumen: 'vol.' },
    nombreBarra: { masa: 'Mass', potencia: 'Power', bateria: 'Battery', datos: 'Data link', presupuesto: 'Budget', volumen: 'Volume' },
    cienciaTotal: 'Science covered', ok: 'within limits', tolerancia: 'tolerance (+20 %)', exceso: 'over the limit',
    ciencia: 'science', diasEf: 'days', falla: 'critical failure', critica: 'critical', noCritica: 'not critical',
    glosario: 'Term', etiq: { check: 'CHECK', cuidado: 'CAUTION', nota: 'NOTE' },
  },
});

// Secciones del manual (mismo índice para los cuatro departamentos).
const SECCIONES = [
  { id: 'proposito', t: ['1. Propósito y responsabilidades', '1. Purpose and responsibilities'] },
  { id: 'procedimiento', t: ['2. Procedimientos paso a paso', '2. Step-by-step procedures'] },
  { id: 'formulas', t: ['3. Fórmulas y unidades', '3. Formulas and units'] },
  { id: 'contingencias', t: ['4. Contingencias', '4. Contingencies'] },
  { id: 'ficha', t: ['5. Ficha técnica de la misión', '5. Mission datasheet'] },
  { id: 'glosario', t: ['6. Glosario', '6. Glossary'] },
];

// ---------------------------------------------------------------------------------------------------------------------
// Contenido estático. Bloques: ['p', es, en] · ['h', es, en] · ['paso', es, en] · ['check'|'cuidado'|'nota', es, en]
//   ['f', fórmula, es, en] · ['tabla', cabecera[], filas[][]] (celda = texto o [es, en]) · ['lista', [[es, en], ...]]
// ---------------------------------------------------------------------------------------------------------------------
const FLUJO = [
  ['h', 'El recorrido de la misión y qué toca en cada fase', 'The mission path and what happens in each phase'],
  ['tabla', [['Fase', 'Phase'], ['Qué ocurre', 'What happens'], ['Quién actúa', 'Who acts']], [
    [['1. Briefing', '1. Briefing'], ['Se lee el expediente, se marcan los objetivos (cada objetivo secundario marcado sube la dificultad) y todos pulsan "Listo".', 'Read the dossier, tick the goals (each secondary goal ticked raises difficulty) and everyone presses "Ready".'], ['Todos', 'Everyone']],
    [['2. Diseño', '2. Design'], ['Cada departamento monta las piezas de su taller. Al pedir revisión puede saltar un evento de diseño (dinero, límites o cambio de prioridad) en vez de la revisión.', 'Each department mounts the parts of its workshop. When you request a review, a design event (money, limits or a change of priority) may fire instead of the review.'], ['Cada departamento', 'Each department']],
    [['3. Restricciones', '3. Constraints'], ['Solo si alguna barra está entre 100 % y 120 %: se puede quitar, bajar horas de uso o cambiar a algo que no suba ninguna barra. No se puede añadir ni comprar contingencias.', 'Only if some bar is between 100 % and 120 %: you may remove, lower usage hours or swap to something that raises no bar. You cannot add parts or buy contingencies.'], ['Cada departamento', 'Each department']],
    [['4. Verificación', '4. Verification'], ['Lista de comprobaciones y las cuatro firmas. Cualquier cambio de diseño borra las firmas. Con las cuatro firmas se lanza.', 'Checklist and the four signatures. Any design change clears the signatures. With all four signed, you launch.'], ['Todos firman', 'Everyone signs']],
    [['5. Misión', '5. Mission'], ['Sala de control: el vuelo se revela fase a fase. Si sale un evento que una contingencia comprada mitiga, su departamento la activa.', 'Control room: the flight is revealed phase by phase. If an event appears that a bought contingency mitigates, its department activates it.'], ['Todos; cada uno sus contingencias', 'Everyone; each their own contingencies']],
    [['6. Informe', '6. Report'], ['Veredicto (total / parcial / fallida), causas, hallazgos y datos perdidos. Se puede rediseñar y volver a lanzar.', 'Verdict (full / partial / failed), causes, findings and lost data. You can redesign and launch again.'], ['Todos', 'Everyone']],
  ]],
  ['nota', 'Si un departamento no tiene jugador conectado (vacante), cualquiera puede operarlo y firmar por él. Si cambia de manos, hay que volver a firmar.', 'If a department has no connected player (vacant), anyone can operate it and sign for it. If it changes hands, the signature must be given again.'],
  ['nota', 'Cada vez que se revisa el diseño: todas las barras ≤ 100 % pasa a Verificación; alguna entre 100 % y 120 % pasa a Restricciones; alguna por encima de 120 % vuelve a Diseño.', 'At each design review: all bars ≤ 100 % goes to Verification; any bar between 100 % and 120 % goes to Constraints; any bar above 120 % goes back to Design.'],
];

const COMUN_FORM = [
  ['h', 'Reglas comunes a todos los departamentos', 'Rules common to all departments'],
  ['f', 'ratio = usado / límite', 'Cada barra (masa, potencia, batería, datos, presupuesto, volumen) se mide así. ≤ 1,00 = dentro; hasta 1,20 = tolerancia; más = fuera.', 'Every bar (mass, power, battery, data, budget, volume) is measured this way. ≤ 1.00 = within limits; up to 1.20 = tolerance; more = out.'],
  ['f', 'TOLERANCIA = 1,2   (DEC-10 / DEC-11)', 'Hasta un 20 % por encima del límite pasa la revisión, pero te manda a Restricciones: tendrás que recortar hasta volver a ≤ 100 %. Para verificar y firmar, todas las barras deben estar en ≤ 100 %.', 'Up to 20 % above the limit passes the review but sends you to Constraints: you must cut back to ≤ 100 %. To verify and sign, every bar must be at ≤ 100 %.'],
  ['f', 'dificultad = nº de objetivos secundarios marcados\n0 → fácil (1 evento) · 1 → normal (2) · 2+ → difícil (3)', 'Los eventos de diseño son los que "interrumpen" tus revisiones. Más ambición, más sorpresas.', 'Design events are the ones that "interrupt" your reviews. More ambition, more surprises.'],
  ['f', 'p(fase) = p_base + Σ dp(mejoras)    (0 ≤ p ≤ 1)', 'Cada fase del vuelo tiene probabilidad base; sumas dp por cada pieza, contingencia o ruta que la mejora y que esté a bordo (las piezas con uso > 0, o sin control de uso).', 'Each flight phase has a base probability; you add dp for every part, contingency or route that improves it and is on board (parts with usage > 0, or with no usage control).'],
  ['f', '1 kbps durante 1 h = 0,45 MB', '1 000 bits/s × 3 600 s = 3,6 Mbit = 0,45 MB. Es la constante MB_POR_KBPS_HORA del motor.', '1,000 bits/s × 3,600 s = 3.6 Mbit = 0.45 MB. It is the engine constant MB_POR_KBPS_HORA.'],
  ['f', 'Pieza sin control de uso → 24 h/día', 'Estructura, paneles, baterías, antena... están "siempre encendidas". Las que tienen control de uso (instrumentos) se ajustan entre un mínimo y un máximo de h/día.', 'Structure, panels, batteries, antenna... are "always on". Parts with a usage control (instruments) are adjusted between a minimum and a maximum of h/day.'],
  ['h', 'Constantes del vuelo (despliegue)', 'Flight constants (deployment)'],
  ['tabla', [['Constante', 'Constant'], ['Valor', 'Value'], ['Significa', 'Meaning']], [
    ['FACTOR_DEGRADA', '× 0,75', ['Una fase no crítica falla su tirada: la ciencia baja a 75 %.', 'A non-critical phase fails its roll: science drops to 75 %.']],
    ['FACTOR_GOLPE_CRITICO', '× 0,5', ['Primer fallo crítico: ciencia y días a la mitad; la misión sigue.', 'First critical failure: science and days halved; the mission goes on.']],
    ['GOLPES_PARA_PERDER', '2', ['El segundo fallo crítico pierde la nave: las fases siguientes no se juegan.', 'The second critical failure loses the spacecraft: later phases are not played.']],
    ['FACTOR_MIN_EVENTO', '× 0,25', ['Un evento negativo sin mitigar nunca baja un factor por debajo de 0,25.', 'An unmitigated negative event never takes a factor below 0.25.']],
    ['FACTOR_MAX_EVENTO', '× 2', ['Un evento positivo sube ciencia o días como mucho al doble.', 'A positive event raises science or days at most to double.']],
    ['UMBRAL_TOTAL', '80 %', ['Éxito total = objetivo prioritario conseguido y ≥ 80 % de la ciencia. Si no, parcial; si falla el prioritario, fallida.', 'Full success = priority goal achieved and ≥ 80 % of the science. Otherwise partial; if the priority goal fails, failed.']],
  ]],
];

const COMUN_CONT = [
  ['h', 'Reglas de las contingencias', 'Contingency rules'],
  ['lista', [
    ['Una contingencia es un seguro: cuesta masa (kg) y dinero (M USD) en el diseño, y si sale el evento que mitiga, lo anula por completo.', 'A contingency is insurance: it costs mass (kg) and money (M USD) in the design, and if the event it mitigates fires, it cancels it completely.'],
    ['Cada departamento compra y activa las suyas. El equipo entero puede tener como máximo 3 contingencias (G-11).', 'Each department buys and activates its own. The whole team can hold at most 3 contingencies (G-11).'],
    ['Se compran en la app "Contingencias" durante el Diseño. En Restricciones solo se pueden quitar.', 'They are bought in the "Contingencies" app during Design. In Constraints they can only be removed.'],
    ['Los eventos buenos (+) no se mitigan: son suerte. Los de signo ± se anulan por el lado malo y queda el bueno.', 'Good events (+) are not mitigated: they are luck. Events with sign ± lose their bad side and keep the good one.'],
  ]],
  ['h', 'SOP de compra (fase de Diseño)', 'Purchase SOP (Design phase)'],
  ['paso', 'Abre "Contingencias" y mira el mazo de riesgos: cada evento muestra su fase, su probabilidad p y su efecto.', 'Open "Contingencies" and look at the risk deck: each event shows its phase, its probability p and its effect.'],
  ['paso', 'Valora cada seguro: daño esperado ≈ p × (pérdida de ciencia o de días). Compáralo con los kg y los M USD que cuesta.', 'Value each insurance: expected damage ≈ p × (loss of science or days). Compare it with the kg and M USD it costs.'],
  ['paso', 'Acuerda con el equipo cuáles son las 3 compras. Pulsa Comprar en la que sea de tu departamento.', 'Agree with the team on the 3 purchases. Press Buy on the one that belongs to your department.'],
  ['cuidado', 'Si eliges un evento con "falla" (fallo crítico) en una fase crítica, comprarla vale mucho más que una que solo resta un 15 % de ciencia.', 'If an event has "failure" (critical failure) in a critical phase, buying its insurance is worth far more than one that only costs 15 % of science.'],
  ['h', 'SOP de activación (fase de Misión, Sala de control)', 'Activation SOP (Mission phase, Control room)'],
  ['paso', 'El vuelo se revela paso a paso. Cuando el paso visible trae un evento que una contingencia comprada mitiga, la sala de control te pide que la actives.', 'The flight is revealed step by step. When the visible step has an event that a bought contingency mitigates, the control room asks you to activate it.'],
  ['paso', 'El departamento dueño pulsa Activar. Mientras no se active, el equipo no puede avanzar al paso siguiente.', 'The owning department presses Activate. Until it is done, the team cannot advance to the next step.'],
  ['paso', 'Lee el resultado: "mitigado" significa que el evento quedó anulado. Si no la compraste, se aplican sus factores (nunca por debajo de × 0,25).', 'Read the result: "mitigated" means the event was cancelled. If you did not buy it, its factors apply (never below × 0.25).'],
  ['check', 'Si tu departamento está vacante, cualquier jugador puede activar por él. Si tiene jugador, solo él.', 'If your department is vacant, any player can activate for it. If it has a player, only that player can.'],
];

// Contenido propio de cada departamento.
const MAN = {
  // =====================================================================================================================
  vuelo: {
    num: '001', rev: 'C',
    mision: ['Estructura, propulsión, actitud y guiado; elegir el cohete; planificar ruta, ventana de lanzamiento y sitio de descenso u órbita.', 'Structure, propulsion, attitude and guidance; choose the rocket; plan route, launch window and landing site or orbit.'],
    proposito: [
      ['p', 'El Departamento de Vuelo y Mecánica construye el "cuerpo" de la nave y decide cómo llega al destino. Sin tu estructura no hay sitio para nada; sin tu cohete y tu ruta, la nave no sale de la Tierra. Eres también quien más pesa en la barra de masa.', 'The Flight & Mechanics Department builds the "body" of the spacecraft and decides how it gets to its destination. Without your structure there is no room for anything; without your rocket and route, the spacecraft never leaves Earth. You also weigh the most on the mass bar.'],
      ['h', 'Barras que mueves tú', 'Bars you drive'],
      ['tabla', [['Barra', 'Bar'], ['Qué mide', 'What it measures'], ['Tu palanca', 'Your lever']], [
        [['Masa (kg)', 'Mass (kg)'], ['Masa de todas las piezas + masa de la ruta + masa de las contingencias, contra la capacidad del cohete al destino.', 'Mass of all parts + route mass + contingency mass, against the rocket capacity to the destination.'], ['Cohete, ruta, estructura, propulsión', 'Rocket, route, structure, propulsion']],
        [['Volumen', 'Volume'], ['Lo que ocupan las piezas contra el volumen que da la estructura.', 'What the parts take up against the volume the structure provides.'], ['Estructura', 'Structure']],
        [['Presupuesto (M USD)', 'Budget (M USD)'], ['El cohete y la ruta son de los gastos más grandes de la misión.', 'The rocket and the route are among the biggest expenses of the mission.'], ['Cohete, ruta', 'Rocket, route']],
      ]],
      ['h', 'Tu papel en cada fase', 'Your role in each phase'],
      ['tabla', [['Fase', 'Phase'], ['Qué haces', 'What you do']], [
        [['Briefing', 'Briefing'], ['Lees el destino y los días previstos; ayudas a decidir cuántos objetivos secundarios aceptar.', 'You read the destination and planned days; you help decide how many secondary goals to accept.']],
        [['Diseño', 'Design'], ['Montas estructura, propulsión y actitud; eliges cohete (cámara de la plataforma) y ruta; planificas ventana y sitio en la Sala de Control.', 'You mount structure, propulsion and attitude; choose the rocket (launch-pad camera) and route; plan window and site in Mission Control.']],
        [['Restricciones', 'Constraints'], ['Recortas masa o dinero: cambiar a un cohete más barato solo vale si no sube ninguna barra.', 'You cut mass or money: swapping to a cheaper rocket only works if it raises no bar.']],
        [['Verificación', 'Verification'], ['Compruebas que hay cohete y ruta, y firmas.', 'You check there is a rocket and a route, and sign.']],
        [['Misión', 'Mission'], ['Vigilas las fases críticas (despegue, crucero, inserción o aterrizaje) y activas tus contingencias.', 'You watch the critical phases (launch, cruise, insertion or landing) and activate your contingencies.']],
      ]],
    ],
    procedimiento: [
      ['h', 'A. Briefing', 'A. Briefing'],
      ['paso', 'Abre el Expediente. Anota el destino, los días previstos y el objetivo prioritario.', 'Open the Dossier. Note the destination, the planned days and the priority goal.'],
      ['paso', 'Con el equipo, marca los objetivos secundarios. 0 extra = fácil (1 evento de diseño), 1 = normal (2), 2 o más = difícil (3). Cuando todos pulsan "Listo", empieza el diseño.', 'With the team, tick the secondary goals. 0 extra = easy (1 design event), 1 = normal (2), 2 or more = hard (3). When everyone presses "Ready", design starts.'],
      ['nota', 'Cambiar un objetivo borra todos los "Listo": vuelve a pulsarlo.', 'Changing a goal clears every "Ready": press it again.'],
      ['h', 'B. Diseño del cuerpo de la nave', 'B. Designing the spacecraft body'],
      ['paso', 'Monta primero la estructura. Da el volumen donde cabrá todo lo demás y tiene masa propia.', 'Mount the structure first. It gives the volume where everything else must fit and has its own mass.'],
      ['paso', 'Monta propulsión y control de actitud. Mira las opciones nº A, B...: más ágil o más potente suele pesar y gastar más.', 'Mount propulsion and attitude control. Look at options #A, #B...: more agile or more powerful usually weighs and uses more.'],
      ['check', 'El control de actitud se mantiene encendido en la sombra: avisa a Energía de sus vatios, porque cuenta para la batería.', 'Attitude control stays on in the shadow: tell Power its watts, because they count for the battery.'],
      ['h', 'C. Elegir el cohete (app "Cámara de lanzamiento")', 'C. Choosing the rocket ("Launch camera" app)'],
      ['paso', 'Con las flechas ◀ ▶ recorre los cohetes. Cada ficha da operador, capacidad hasta TU destino y precio.', 'Use the ◀ ▶ arrows to browse the rockets. Each card gives operator, capacity to YOUR destination and price.'],
      ['paso', 'Mira el medidor de margen de masa: masa actual de la nave contra capacidad del cohete. Verde ≤ 100 %, ámbar hasta 120 %, rojo más.', 'Look at the mass margin meter: current spacecraft mass against rocket capacity. Green ≤ 100 %, amber up to 120 %, red above.'],
      ['paso', 'Mira también el impacto en el presupuesto "sin cohete / con este cohete". Pulsa SELECCIONAR.', 'Also look at the budget impact "no rocket / with this rocket". Press SELECT.'],
      ['f', 'masa_usada = Σ m_piezas + m_ruta + Σ m_contingencias  ≤  capacidad_cohete(destino)', 'El cohete aporta el límite de masa; tu diseño lo consume. Si el cohete no tiene capacidad a ese destino (0), no sirve.', 'The rocket provides the mass limit; your design consumes it. If the rocket has no capacity to that destination (0), it is useless.'],
      ['cuidado', 'Solo se ofrecen cohetes en servicio que ya hayan lanzado cargas de NASA (DEC-09). Un cohete barato con poca capacidad te obliga a recortar ciencia; uno enorme se come el presupuesto.', 'Only in-service rockets that have already launched NASA payloads are offered (DEC-09). A cheap rocket with low capacity forces you to cut science; a huge one eats the budget.'],
      ['h', 'D. Elegir la ruta (días ↔ propelente ↔ precio ↔ riesgo)', 'D. Choosing the route (days ↔ propellant ↔ price ↔ risk)'],
      ['paso', 'En el anexo (sección 5) tienes la tabla de rutas de tu misión. Cada ruta trae días de viaje, masa de propelente o módulo, precio y un efecto en la probabilidad de una fase (dp).', 'In the annex (section 5) you have the route table of your mission. Each route brings travel days, propellant or module mass, price and an effect on a phase probability (dp).'],
      ['paso', 'Regla de bolsillo: un viaje directo y rápido gasta más propelente (más ΔV), así que pesa más y necesita un cohete mayor. Un viaje largo con sobrevuelos usa la gravedad de los planetas, gasta menos, pero expone la nave más tiempo.', 'Rule of thumb: a fast direct trip spends more propellant (more ΔV), so it weighs more and needs a bigger rocket. A long trip with flybys uses the gravity of planets, spends less, but exposes the spacecraft for longer.'],
      ['check', 'Pregúntate: ¿qué kg me ahorro? ¿cuántos M USD? ¿sube o baja la probabilidad de la fase afectada? Si el dp es negativo en una fase crítica, piensa en comprar la contingencia correspondiente.', 'Ask yourself: how many kg do I save? How many M USD? Does the probability of the affected phase go up or down? If dp is negative in a critical phase, think about buying the matching contingency.'],
      ['h', 'E. Sala de Control: ventana de lanzamiento y sitio', 'E. Mission Control: launch window and site'],
      ['paso', 'Abre la Sala de Control. Elige el día de lanzamiento dentro de la ventana. El día óptimo es el de menor ΔV; cualquier otro día cuesta más propelente (más masa).', 'Open Mission Control. Pick the launch day inside the window. The optimal day is the one with the lowest ΔV; any other day costs more propellant (more mass).'],
      ['paso', 'Elige el sitio de descenso o la órbita usando las capas de datos satelitales (color, elevación, composición). Ciencia te propone sitios; tú compruebas que son alcanzables y seguros.', 'Pick the landing site or orbit using the satellite data layers (colour, elevation, composition). Science proposes sites; you check they are reachable and safe.'],
      ['cuidado', 'Un sitio en una pendiente o con rocas es un riesgo para el aterrizaje (por ejemplo, una nave real se volcó en 2024 por aterrizar en una ladera). Cada cambio de ventana o de sitio borra las firmas.', 'A site on a slope or with boulders is a landing risk (for example, a real lander tipped over in 2024 after landing on a slope). Every change of window or site clears the signatures.'],
      ['h', 'F. Restricciones y verificación', 'F. Constraints and verification'],
      ['paso', 'En Restricciones solo puedes quitar, bajar horas de uso o cambiar a algo que no suba ninguna barra. Si una barra ya está pasada, no puedes subirla más.', 'In Constraints you can only remove, lower usage hours or swap to something that raises no bar. If a bar is already over, you cannot raise it any further.'],
      ['check', 'Verificación exige: todas las barras ≤ 100 %, cohete elegido, ruta elegida, objetivo prioritario con instrumentos, algo que genere energía, algo que envíe datos, y las comprobaciones propias de la misión. Luego firma.', 'Verification requires: all bars ≤ 100 %, rocket chosen, route chosen, priority goal with instruments, something that generates power, something that sends data, and the mission-specific checks. Then sign.'],
      ['h', 'G. Durante la misión', 'G. During the mission'],
      ['paso', 'Mira el semáforo de cada fase. Las fases críticas son las que pueden acabar la misión: un fallo crítico degrada a la mitad; el segundo pierde la nave.', 'Watch the light of each phase. Critical phases are the ones that can end the mission: one critical failure halves the result; the second loses the spacecraft.'],
      ['paso', 'Cuando la sala de control pida una contingencia tuya, pulsa Activar (ver sección 4).', 'When the control room asks for one of your contingencies, press Activate (see section 4).'],
    ],
    formulas: [
      ['h', 'Fórmulas de Vuelo y Mecánica', 'Flight & Mechanics formulas'],
      ['f', 'masa_usada [kg] = Σ masa(opción) + masa(ruta) + Σ masa(contingencias compradas)', 'El motor suma la masa de todas las piezas montadas (con la opción elegida), de la ruta y de cada contingencia comprada.', 'The engine adds up the mass of every mounted part (with the chosen option), of the route and of every bought contingency.'],
      ['f', 'límite_masa = capacidad_cohete[destino]   (si la misión pone tope, el menor de los dos)', 'Sin cohete elegido, la barra de masa no tiene límite y sale roja.', 'With no rocket chosen, the mass bar has no limit and shows red.'],
      ['f', 'margen = límite − usado   ·   ratio = usado / límite', 'Margen positivo: sobran kg. Ratio entre 1,00 y 1,20: tolerancia (hay que recortar).', 'Positive margin: kg to spare. Ratio between 1.00 and 1.20: tolerance (you must cut).'],
      ['f', 'presupuesto_usado = Σ precio(piezas) + precio(cohete) + precio(ruta) + Σ precio(contingencias)', 'Los eventos de diseño suman o restan presupuesto (± M USD) o multiplican un límite (por ejemplo × 0,9 a la potencia).', 'Design events add or subtract budget (± M USD) or multiply a limit (for example × 0.9 to power).'],
      ['f', 'Δv = v_e · ln(m_0 / m_f)    (ecuación del cohete)', 'Por qué un poco más de ΔV cuesta mucho más propelente: crece de forma exponencial. v_e es la velocidad de salida del gas; m_0 es la masa con propelente y m_f la masa seca.', 'Why a bit more ΔV costs much more propellant: it grows exponentially. v_e is the exhaust velocity; m_0 is the mass with propellant and m_f the dry mass.'],
      ['f', 'p(fase) = p_base + Σ dp(mejoras) + dp(ruta si afecta a esa fase)', 'Tu ruta puede subir o bajar la probabilidad de una fase concreta. El motor recorta el resultado a [0, 1].', 'Your route can raise or lower the probability of one specific phase. The engine clamps the result to [0, 1].'],
    ],
  },

  // =====================================================================================================================
  ciencia: {
    num: '002', rev: 'B',
    mision: ['Instrumentos, qué objetivos se cubren y propuesta de sitio u órbita con capas de datos satelitales.', 'Instruments, which goals are covered, and the site or orbit proposal using satellite data layers.'],
    proposito: [
      ['p', 'El Departamento de Ciencia decide POR QUÉ vamos: qué instrumentos viajan, cuántas horas trabajan y qué objetivos quedan cubiertos. Al final, la nota depende de cuánta ciencia vuelve a casa.', 'The Science Department decides WHY we go: which instruments fly, how many hours they work and which goals are covered. In the end, the score depends on how much science comes home.'],
      ['h', 'Barras que mueves tú', 'Bars you drive'],
      ['tabla', [['Barra', 'Bar'], ['Qué mide', 'What it measures'], ['Tu palanca', 'Your lever']], [
        [['Ciencia cubierta', 'Science covered'], ['Fracción ponderada de objetivos cubiertos (fórmula en la sección 3).', 'Weighted fraction of covered goals (formula in section 3).'], ['Instrumentos y sus horas de uso', 'Instruments and their usage hours']],
        [['Datos (MB/día)', 'Data (MB/day)'], ['Cada instrumento genera datos: tasa × horas de uso × 0,45.', 'Each instrument generates data: rate × usage hours × 0.45.'], ['Horas de uso', 'Usage hours']],
        [['Potencia, masa, volumen, precio', 'Power, mass, volume, price'], ['Cada instrumento cuesta de todo; es el "cliente" de los otros tres departamentos.', 'Every instrument costs a bit of everything; you are the "customer" of the other three departments.'], ['Qué instrumentos montas', 'Which instruments you mount']],
      ]],
      ['h', 'Tu papel en cada fase', 'Your role in each phase'],
      ['tabla', [['Fase', 'Phase'], ['Qué haces', 'What you do']], [
        [['Briefing', 'Briefing'], ['Propones qué objetivos secundarios merecen la pena y cuáles encarecen demasiado.', 'You propose which secondary goals are worth it and which make things too expensive.']],
        [['Diseño', 'Design'], ['Montas instrumentos, ajustas sus horas, propones el sitio u órbita con las capas de datos y negocias con Energía y Comunicaciones.', 'You mount instruments, adjust their hours, propose the site or orbit with the data layers and negotiate with Power and Communications.']],
        [['Restricciones', 'Constraints'], ['Bajas horas de uso o quitas instrumentos de menor valor.', 'You lower usage hours or remove lower-value instruments.']],
        [['Verificación', 'Verification'], ['Compruebas que el objetivo prioritario tiene sus instrumentos encendidos, y firmas.', 'You check that the priority goal has its instruments switched on, and sign.']],
        [['Misión', 'Mission'], ['Esperas hallazgos y activas tus contingencias (por ejemplo, la protección de los instrumentos).', 'You wait for findings and activate your contingencies (for example, protection of the instruments).']],
      ]],
    ],
    procedimiento: [
      ['h', 'A. Briefing: leer los objetivos', 'A. Briefing: reading the goals'],
      ['paso', 'Abre el Expediente y la tabla de objetivos (sección 5): cada objetivo tiene valor, instrumentos que requiere y un uso objetivo en horas/día.', 'Open the Dossier and the goals table (section 5): each goal has a value, the instruments it requires and a target usage in hours/day.'],
      ['paso', 'El objetivo prioritario no se puede quitar y cuenta siempre. Cada secundario que marcas sube la dificultad (más eventos de diseño) pero también la nota posible.', 'The priority goal cannot be dropped and always counts. Each secondary goal you tick raises the difficulty (more design events) but also the possible score.'],
      ['h', 'B. Diseño: cubrir objetivos', 'B. Design: covering goals'],
      ['paso', 'Monta primero todos los instrumentos que "requiere" el objetivo prioritario. Un instrumento puede servir a varios objetivos a la vez: son los más rentables.', 'Mount first all the instruments the priority goal "requires". One instrument can serve several goals at once: those are the most profitable.'],
      ['paso', 'Ajusta las horas de uso de cada instrumento al "uso objetivo" del objetivo que sirve. Menos horas = menos cobertura (proporcional). Más horas no dan nada extra y cuestan vatios y datos.', 'Set each instrument usage hours to the "target usage" of the goal it serves. Fewer hours = less coverage (proportional). More hours give nothing extra and cost watts and data.'],
      ['f', 'cobertura(objetivo) = (montados / requeridos) × min(1, uso_medio / uso_objetivo)', 'Montados = instrumentos requeridos que están a bordo. uso_medio = media de horas/día de los montados. Si falta alguno, pierdes esa fracción aunque los demás trabajen a tope.', 'Mounted = required instruments that are on board. mean_usage = average hours/day of the mounted ones. If one is missing, you lose that fraction even if the others work flat out.'],
      ['check', 'Ejemplo: un objetivo requiere 3 instrumentos con uso objetivo 10 h. Montas 2 y los usas 10 h → cobertura = 2/3 × 1 = 0,67. Si los usas 5 h → 2/3 × 0,5 = 0,33.', 'Example: a goal requires 3 instruments with target usage 10 h. You mount 2 and use them 10 h → coverage = 2/3 × 1 = 0.67. If you use them 5 h → 2/3 × 0.5 = 0.33.'],
      ['paso', 'Comparte con los demás el coste de lo que montas: tu consumo en vatios (Energía), tu tasa de datos (Comunicaciones) y tu masa y volumen (Vuelo). Un instrumento "hambriento" de datos puede obligar a una antena mayor.', 'Share with the others the cost of what you mount: your power draw (Power), your data rate (Comms) and your mass and volume (Flight). A data-hungry instrument may force a bigger antenna.'],
      ['cuidado', 'En una misión de exploración la nota se divide por la energía gastada (kWh/día): encender instrumentos "por si acaso" te baja la puntuación.', 'In an exploration mission the score is divided by the energy spent (kWh/day): switching instruments on "just in case" lowers your score.'],
      ['h', 'C. Hallazgos ocultos', 'C. Hidden findings'],
      ['paso', 'Algunas misiones esconden descubrimientos. Se tiran aparte de las fases y no sabes cuáles hay. Se capturan solo si uno de los instrumentos que pueden detectarlo está montado y con uso > 0, y la nave no se ha perdido.', 'Some missions hide discoveries. They are rolled apart from the phases and you do not know which ones exist. They are captured only if one of the instruments able to detect it is mounted with usage > 0, and the spacecraft was not lost.'],
      ['check', 'Variedad de instrumentos = más oportunidades. Si el informe dice "estaba ahí pero nada a bordo podía detectarlo", lee qué faltaba y úsalo en el siguiente diseño.', 'A variety of instruments = more chances. If the report says "it was there but nothing on board could detect it", read what was missing and use it in the next design.'],
      ['h', 'D. Elegir el sitio u órbita con capas de datos', 'D. Choosing the site or orbit with data layers'],
      ['paso', 'En la Sala de Control abre las capas de datos satelitales de tu cuerpo (color, elevación, composición química...). Cada capa viene de una misión real y su ficha indica la fuente.', 'In Mission Control open the satellite data layers of your body (colour, elevation, chemical composition...). Each layer comes from a real mission and its card names the source.'],
      ['paso', 'Busca donde está lo que tus objetivos quieren (hielo en cráteres polares, una región con cierta composición, un terreno llano). Propón el sitio a Vuelo y Mecánica, que lo registra y comprueba que se puede llegar.', 'Look for where your goals want to be (ice in polar craters, a region with a given composition, flat terrain). Propose the site to Flight & Mechanics, who records it and checks it is reachable.'],
      ['h', 'E. Cambios de prioridad y Restricciones', 'E. Priority changes and Constraints'],
      ['paso', 'Un evento de diseño puede cambiar qué objetivo es el prioritario. Vuelve a revisar qué instrumentos necesita ahora.', 'A design event can change which goal is the priority. Re-check which instruments it needs now.'],
      ['paso', 'En Restricciones solo puedes bajar horas o quitar instrumentos. Quita primero lo de menos valor por vatio o por MB.', 'In Constraints you can only lower hours or remove instruments. Remove first what has the least value per watt or per MB.'],
      ['check', 'Verificación: el objetivo prioritario tiene instrumentos a bordo y encendidos (cobertura > 0) y, si la misión lo pide, una cobertura mínima (por ejemplo 50 %).', 'Verification: the priority goal has instruments on board and switched on (coverage > 0) and, if the mission asks for it, a minimum coverage (for example 50 %).'],
    ],
    formulas: [
      ['h', 'Fórmulas de Ciencia', 'Science formulas'],
      ['f', 'cobertura_i = (montados_i / requeridos_i) × min(1, uso_medio_i / uso_objetivo_i)', 'Se calcula por objetivo. Si el objetivo no requiere instrumentos, vale 1.', 'Computed per goal. If the goal requires no instruments, it is 1.'],
      ['f', 'ciencia_total = Σ (valor_i × cobertura_i) / Σ valor_i', 'Es la media ponderada por el valor de cada objetivo (los marcados en el expediente más el prioritario).', 'It is the average weighted by the value of each goal (those ticked in the dossier plus the priority one).'],
      ['f', 'datos_generados [MB/día] = Σ tasa[kbps] × uso[h/día] × 0,45', 'Mismo cálculo que hace Comunicaciones: tu tasa es su problema.', 'Same calculation Comms makes: your rate is their problem.'],
      ['f', 'ciencia_final_i = cobertura_i × f_ciencia × min(1, capacidad/generados) × (según regla)', 'f_ciencia viene del vuelo (× 0,75 por fase no crítica fallada, × 0,5 por golpe crítico, factores de eventos). La fracción de datos significa que la ciencia que no cabe en el enlace se pierde.', 'f_science comes from the flight (× 0.75 per failed non-critical phase, × 0.5 per critical hit, event factors). The data fraction means science that does not fit in the link is lost.'],
      ['tabla', [['Regla de puntuación', 'Scoring rule'], ['Cómo cuenta tu ciencia', 'How your science counts']], [
        [['datos (Órbita)', 'datos (Orbit)'], ['Ciencia × fracción de vida útil conseguida: importa cuánto dura la misión.', 'Science × fraction of useful life achieved: how long the mission lasts matters.']],
        [['cadena (Aterrizaje)', 'cadena (Landing)'], ['Si la nave se pierde, cero. Si no, ciencia × fracción de días de superficie.', 'If the spacecraft is lost, zero. Otherwise science × fraction of surface days.']],
        [['oculto (Exploración)', 'oculto (Exploration)'], ['(Σ valor × conseguido + valor de hallazgos) / kWh por día gastados.', '(Σ value × achieved + value of findings) / kWh per day spent.']],
      ]],
    ],
  },

  // =====================================================================================================================
  potencia: {
    num: '003', rev: 'D',
    mision: ['Paneles solares, baterías, control térmico y polvo: que la nave tenga energía durante todo el ciclo, incluida la sombra.', 'Solar panels, batteries, thermal control and dust: keep the spacecraft powered through the whole cycle, including the shadow.'],
    proposito: [
      ['p', 'El Departamento de Energía mantiene encendida la nave. Todo lo que otros departamentos montan consume vatios: tú generas, almacenas y enfrías. Sin ti, ni los instrumentos ni la antena funcionan.', 'The Power Department keeps the spacecraft switched on. Everything the other departments mount draws watts: you generate, store and cool. Without you, neither the instruments nor the antenna work.'],
      ['h', 'Barras que mueves tú', 'Bars you drive'],
      ['tabla', [['Barra', 'Bar'], ['Qué mide', 'What it measures'], ['Tu palanca', 'Your lever']], [
        [['Potencia (W)', 'Power (W)'], ['Suma de los vatios de todo lo encendido (uso > 0) contra lo que generan los paneles.', 'Sum of the watts of everything switched on (usage > 0) against what the panels generate.'], ['Paneles', 'Panels']],
        [['Batería (Wh)', 'Battery (Wh)'], ['Energía que gasta en la sombra lo que sigue encendido, contra lo que guardan las baterías.', 'Energy used in the shadow by what stays on, against what the batteries store.'], ['Baterías', 'Batteries']],
        [['Masa, volumen, precio', 'Mass, volume, price'], ['Paneles, baterías y térmica son pesados y caros.', 'Panels, batteries and thermal are heavy and expensive.'], ['Opciones de cada pieza', 'Options of each part']],
      ]],
      ['h', 'Tu papel en cada fase', 'Your role in each phase'],
      ['tabla', [['Fase', 'Phase'], ['Qué haces', 'What you do']], [
        [['Briefing', 'Briefing'], ['Lees las horas de sombra y la distancia al Sol (menos luz = paneles más grandes).', 'You read the shadow hours and the distance to the Sun (less light = bigger panels).']],
        [['Diseño', 'Design'], ['Esperas a que los demás elijan (o les pides su consumo), dimensionas paneles y batería con margen, añades térmica.', 'You wait for the others to choose (or ask for their draw), size panels and battery with margin, add thermal.']],
        [['Restricciones', 'Constraints'], ['Si la potencia o la batería se pasan: quita carga (no basta bajar horas: ver cuidado en la sección 2).', 'If power or battery are over: remove load (lowering hours is not enough: see the caution in section 2).']],
        [['Verificación', 'Verification'], ['Compruebas que algo genera energía y firmas.', 'You check that something generates power and sign.']],
        [['Misión', 'Mission'], ['Activas tus contingencias (por ejemplo calefactores o inclinar los paneles).', 'You activate your contingencies (for example heaters or tilting the panels).']],
      ]],
    ],
    procedimiento: [
      ['h', 'A. Leer la misión', 'A. Reading the mission'],
      ['paso', 'Anota dos datos de la misión (sección 5): las horas de sombra por ciclo (t_sombra) y si la misión pone un tope a la potencia. El límite real es el menor entre lo que dan tus paneles y ese tope.', 'Note two mission data (section 5): the shadow hours per cycle (t_shadow) and whether the mission caps power. The real limit is the lower of what your panels give and that cap.'],
      ['h', 'B. Dimensionar los paneles contra la carga', 'B. Sizing the solar array against the load'],
      ['paso', 'Suma la carga: los vatios de todas las piezas encendidas (uso > 0) de los cuatro departamentos. Pide a cada uno su cifra y mira la barra de potencia en Estado.', 'Add up the load: the watts of all switched-on parts (usage > 0) of the four departments. Ask each one for their figure and look at the power bar in Status.'],
      ['f', 'P_paneles ≥ Σ P_i   (piezas con uso > 0)', 'La barra de potencia cuenta los vatios nominales de cada pieza encendida, sin importar cuántas horas al día.', 'The power bar counts the rated watts of each switched-on part, regardless of how many hours a day.'],
      ['paso', 'Elige la opción de panel (nº A, B...). Una opción con más vatios pesa y cuesta más. Deja un margen de un 10-15 % de seguridad.', 'Choose the panel option (#A, #B...). An option with more watts weighs and costs more. Leave a 10-15 % safety margin.'],
      ['cuidado', 'Un evento de diseño puede recortar el tope de potencia (× 0,9 o × 0,85). Si vas al 100 % justo, un evento te manda a Restricciones o a Diseño.', 'A design event can cut the power cap (× 0.9 or × 0.85). If you sit at exactly 100 %, an event sends you to Constraints or back to Design.'],
      ['h', 'C. Batería para la sombra (eclipse)', 'C. Battery for the shadow (eclipse)'],
      ['paso', 'En la sombra los paneles no generan. Las piezas marcadas ☾ ("enSombra") siguen encendidas y tiran de la batería. Suma sus vatios y multiplícalos por las horas de sombra.', 'In the shadow the panels generate nothing. Parts marked ☾ ("enSombra") stay on and draw from the battery. Add their watts and multiply by the shadow hours.'],
      ['f', 'E_bat ≥ Σ P_i(enSombra) × t_sombra      [Wh = W × h]', 'Solo cuentan las piezas con ☾ y con uso > 0 (por ejemplo antena, control de actitud y magnetómetro). La capacidad de baterías es la suma de lo que aporta cada una.', 'Only parts with ☾ and usage > 0 count (for example antenna, attitude control and magnetometer). Battery capacity is the sum of what each one provides.'],
      ['check', 'Ejemplo con valores de juego (≈): antena 330 W + actitud 330 W + magnetómetro 5 W = 665 W. Con 1,5 h de sombra → 665 × 1,5 ≈ 998 Wh. Una batería estándar de 1 000 Wh llega justo; con una opción más ligera de actitud (120 W) bajaría a ≈ 683 Wh.', 'Example with game values (≈): antenna 330 W + attitude 330 W + magnetometer 5 W = 665 W. With 1.5 h of shadow → 665 × 1.5 ≈ 998 Wh. A standard 1,000 Wh battery just makes it; with a lighter attitude option (120 W) it drops to ≈ 683 Wh.'],
      ['nota', 'Más horas de sombra = más batería. Una misión lunar con 5 h de sombra necesita mucha más batería que una órbita de 1,5 h.', 'More shadow hours = more battery. A lunar mission with 5 h of shadow needs much more battery than a 1.5 h orbit.'],
      ['h', 'D. Térmica y polvo', 'D. Thermal and dust'],
      ['paso', 'Radiadores y aislamiento multicapa (MLI) consumen masa y a veces vatios, pero algunos suben la probabilidad de una fase (columna "Mejoras" de la tabla de fases en la sección 5).', 'Radiators and multi-layer insulation (MLI) use mass and sometimes watts, but some raise the probability of a phase ("Improvements" column of the phase table in section 5).'],
      ['paso', 'Mira los eventos de la misión: calor en paneles, frío en la noche lunar, luz que se debilita lejos del Sol, polvo en las lentes. Compra la contingencia que cubra el que más te asuste (sección 4).', 'Look at the mission events: hot panels, lunar night cold, light fading far from the Sun, dust on lenses. Buy the contingency covering the one that scares you most (section 4).'],
      ['h', 'E. Restricciones y verificación', 'E. Constraints and verification'],
      ['cuidado', 'Bajar las horas de uso de una pieza NO baja la barra de potencia (cuenta los vatios mientras uso > 0), aunque sí baja la energía diaria y los datos. Para bajar vatios hay que quitar la pieza o dejarla en 0 h.', 'Lowering the usage hours of a part does NOT lower the power bar (it counts the watts while usage > 0), although it does lower daily energy and data. To lower watts you must remove the part or leave it at 0 h.'],
      ['check', 'Verificación: la comprobación "algo a bordo genera energía" depende de que montes al menos un panel. Y todas las barras deben estar en ≤ 100 %. Luego firma.', 'Verification: the check "something on board generates power" depends on you mounting at least one panel. And all bars must be at ≤ 100 %. Then sign.'],
    ],
    formulas: [
      ['h', 'Fórmulas de Energía', 'Power formulas'],
      ['f', 'P_usada [W] = Σ P_i   (piezas con uso > 0)', 'Es la carga que ven los paneles.', 'It is the load the panels see.'],
      ['f', 'P_límite [W] = min( Σ aporta.potencia , tope_misión )', 'Si hay paneles y la misión tiene tope, vale el menor. Un evento de diseño puede multiplicarlo por 0,9 o 0,85.', 'If there are panels and the mission has a cap, the lower applies. A design event can multiply it by 0.9 or 0.85.'],
      ['f', 'E_bat_usada [Wh] = Σ P_i(enSombra, uso > 0) × t_sombra', 'Es la energía que se gasta en la sombra.', 'It is the energy used in the shadow.'],
      ['f', 'E_bat_límite [Wh] = min( Σ aporta.bateria , tope_misión )', 'Capacidad de baterías.', 'Battery capacity.'],
      ['f', 'E_diaria [Wh] = Σ P_i × uso_i    ·    kWh/día = E_diaria / 1 000', 'No es una barra, pero en misiones de exploración divide la puntuación: ahorrar energía sube nota.', 'It is not a bar, but in exploration missions it divides the score: saving energy raises the score.'],
      ['f', 'Ley del cuadrado inverso: luz ∝ 1 / distancia²', 'A doble distancia del Sol llega la cuarta parte de luz. Por eso un panel real dio 850 W a 3,4 UA pero solo 395 W a 5,25 UA.', 'At double the distance from the Sun a quarter of the light arrives. That is why a real panel gave 850 W at 3.4 AU but only 395 W at 5.25 AU.'],
    ],
  },

  // =====================================================================================================================
  comms: {
    num: '004', rev: 'C',
    mision: ['Antenas, computador, almacenamiento de datos, navegación y segmento de tierra; presupuesto de datos y enlace.', 'Antennas, computer, data storage, navigation and ground segment; data budget and link.'],
    proposito: [
      ['p', 'El Departamento de Comunicaciones y Operaciones es el "puente" con la Tierra: el equipo puede conseguir mucha ciencia, pero solo cuenta la que consigues enviar a casa. También cuidas el ordenador de a bordo, el almacenamiento y la navegación.', 'The Communications & Operations Department is the "bridge" to Earth: the team can gather a lot of science, but only what you manage to send home counts. You also look after the onboard computer, storage and navigation.'],
      ['h', 'Barras que mueves tú', 'Bars you drive'],
      ['tabla', [['Barra', 'Bar'], ['Qué mide', 'What it measures'], ['Tu palanca', 'Your lever']], [
        [['Enlace de datos (MB/día)', 'Data link (MB/day)'], ['Datos que generan las piezas encendidas contra lo que cabe en la bajada.', 'Data generated by switched-on parts against what fits in the downlink.'], ['Antenas, horas de enlace', 'Antennas, link hours']],
        [['Potencia y batería', 'Power and battery'], ['La antena consume muchos vatios y se queda encendida en la sombra.', 'The antenna draws many watts and stays on in the shadow.'], ['Tamaño de la antena', 'Antenna size']],
        [['Masa, volumen, precio', 'Mass, volume, price'], ['Una antena grande da más kbps, pero pesa y cuesta más.', 'A big antenna gives more kbps, but weighs and costs more.'], ['Opciones de cada pieza', 'Options of each part']],
      ]],
      ['h', 'Tu papel en cada fase', 'Your role in each phase'],
      ['tabla', [['Fase', 'Phase'], ['Qué haces', 'What you do']], [
        [['Briefing', 'Briefing'], ['Lees las horas de enlace por día y los días de misión.', 'You read the link hours per day and the mission days.']],
        [['Diseño', 'Design'], ['Pides a Ciencia su tasa de datos, eliges antena y ordenador, y equilibras el presupuesto de datos.', 'You ask Science for their data rate, choose the antenna and computer, and balance the data budget.']],
        [['Restricciones', 'Constraints'], ['Si los datos se pasan: o recortas horas de instrumentos con Ciencia, o cambias a una antena más grande si cabe en el resto de barras.', 'If data is over: either cut instrument hours with Science, or swap to a bigger antenna if it fits in the other bars.']],
        [['Verificación', 'Verification'], ['Compruebas que algo puede enviar datos a casa y firmas.', 'You check that something can send data home and sign.']],
        [['Misión', 'Mission'], ['Activas tus contingencias. Y miras cuántos MB se perdieron.', 'You activate your contingencies. And see how many MB were lost.']],
      ]],
    ],
    procedimiento: [
      ['h', 'A. Leer la misión', 'A. Reading the mission'],
      ['paso', 'Anota las horas de enlace al día (t_enlace) y los días previstos de la misión (sección 5). El enlace solo está abierto esas horas.', 'Note the link hours per day (t_link) and the planned mission days (section 5). The link is only open for those hours.'],
      ['h', 'B. Presupuesto de datos: generado contra bajada', 'B. Data budget: generated against downlink'],
      ['paso', 'Calcula los datos generados cada día. Cada instrumento (y cada pieza con tasa) genera tasa × horas de uso × 0,45 MB.', 'Compute the data generated each day. Each instrument (and every part with a rate) generates rate × usage hours × 0.45 MB.'],
      ['paso', 'Calcula la capacidad de bajada: la suma de los kbps de tus antenas × horas de enlace × 0,45.', 'Compute the downlink capacity: the sum of your antennas kbps × link hours × 0.45.'],
      ['f', 'generado = Σ tasa_i × uso_i × 0,45        capacidad = Σ bajada_j × t_enlace × 0,45', 'Las dos están en MB por día. La barra "Enlace de datos" es generado / capacidad.', 'Both are in MB per day. The "Data link" bar is generated / capacity.'],
      ['check', 'Ejemplo (≈ valores de juego): antena de 800 kbps y 8 h de enlace → 800 × 8 × 0,45 = 2 880 MB/día. Un instrumento de cámaras a 800 kbps usado 6 h genera 800 × 6 × 0,45 = 2 160 MB/día: solo con él ya usas el 75 % del enlace.', 'Example (≈ game values): an 800 kbps antenna and 8 h of link → 800 × 8 × 0.45 = 2,880 MB/day. A camera instrument at 800 kbps used 6 h generates 800 × 6 × 0.45 = 2,160 MB/day: by itself it uses 75 % of the link.'],
      ['h', 'C. Qué pasa con los datos que no caben', 'C. What happens to data that does not fit'],
      ['paso', 'En el diseño: si generado > capacidad, la barra pasa de 100 %. Hasta 120 % pasa a Restricciones; por encima, vuelves a Diseño. Para firmar tiene que quedar en ≤ 100 %.', 'In design: if generated > capacity, the bar goes above 100 %. Up to 120 % goes to Constraints; above, you return to Design. To sign it must be at ≤ 100 %.'],
      ['paso', 'En el vuelo: la ciencia se multiplica por min(1, capacidad / generado). Lo que no cabe en el enlace se pierde y el informe lo cuenta en MB.', 'In flight: science is multiplied by min(1, capacity / generated). What does not fit in the link is lost and the report counts it in MB.'],
      ['cuidado', 'Aunque la tolerancia de 20 % te deje pasar la revisión, con ratio 1,2 solo bajarías el 83 % de los datos (1 / 1,2): perderías el 17 % de la ciencia.', 'Even if the 20 % tolerance lets you pass the review, with ratio 1.2 you would only send 83 % of the data (1 / 1.2): you would lose 17 % of the science.'],
      ['h', 'D. Elegir la antena, el ordenador y el resto', 'D. Choosing the antenna, computer and the rest'],
      ['paso', 'Compara las opciones de antena (nº A, B...): kbps de bajada contra masa, vatios y precio. La antena tiene ☾: sus vatios entran en el cálculo de batería de Energía.', 'Compare antenna options (#A, #B...): downlink kbps against mass, watts and price. The antenna has ☾: its watts enter Power battery calculation.'],
      ['paso', 'El ordenador de a bordo suele subir la probabilidad de la fase de puesta en marcha; el almacenamiento, la navegación y el segmento de tierra aparecen en la ficha técnica si tu misión los ofrece.', 'The onboard computer usually raises the probability of the commissioning phase; storage, navigation and the ground segment appear in the datasheet if your mission offers them.'],
      ['paso', 'Negocia con Ciencia: sus horas por encima del "uso objetivo" no suman ciencia pero sí datos. Pídeles que las bajen antes de comprar una antena mayor.', 'Negotiate with Science: their hours above the "target usage" add no science but do add data. Ask them to lower those before buying a bigger antenna.'],
      ['h', 'E. Contingencias y verificación', 'E. Contingencies and verification'],
      ['nota', 'Las contingencias compradas de todo el equipo (máx. 3) quedan guardadas en un único registro, el tuyo. Cada departamento compra y activa las suyas; tú coordinas que el equipo no pase de 3.', 'The contingencies bought by the whole team (max. 3) are stored in one single record, yours. Each department buys and activates its own; you coordinate so the team does not exceed 3.'],
      ['check', 'Verificación: "algo a bordo puede enviar datos a casa" exige al menos una antena montada. Y todas las barras ≤ 100 %. Luego firma.', 'Verification: "something on board can send data home" requires at least one antenna mounted. And all bars ≤ 100 %. Then sign.'],
    ],
    formulas: [
      ['h', 'Fórmulas de Comunicaciones y Operaciones', 'Communications & Operations formulas'],
      ['f', 'datos_generados [MB/día] = Σ tasa_i[kbps] × uso_i[h/día] × 0,45', 'Las piezas sin control de uso cuentan 24 h. Si uso = 0, no generan.', 'Parts with no usage control count 24 h. If usage = 0, they generate nothing.'],
      ['f', 'capacidad_bajada [MB/día] = Σ bajada_j[kbps] × t_enlace[h/día] × 0,45', 'Se suma la bajada de todas las antenas montadas.', 'The downlink of all mounted antennas is added.'],
      ['f', 'fracción_datos = min(1, capacidad / generados)', 'Es el factor que multiplica la ciencia de cada objetivo en el vuelo.', 'It is the factor multiplying the science of every goal in flight.'],
      ['f', 'MB_perdidos = generados_total − min(generados_total, capacidad × días_conseguidos)', 'Total acumulado durante los días de misión que se consiguen (menos si la nave falla).', 'Total accumulated over the mission days achieved (fewer if the spacecraft fails).'],
      ['f', 'E_antena_sombra [Wh] = P_antena × t_sombra', 'La antena está marcada ☾: parte de la batería es tuya.', 'The antenna is marked ☾: part of the battery is yours.'],
      ['f', 'velocidad de datos ∝ potencia × ganancia / distancia²', 'En la vida real una antena más grande o un emisor más potente suben los kbps; alejarse de la Tierra los baja con el cuadrado de la distancia.', 'In real life a bigger antenna or a stronger transmitter raise the kbps; moving away from Earth lowers them with the square of the distance.'],
    ],
  },
};

// Glosario: [término es, término en, definición es, definición en, roles (opcional: solo esos)]
const GLOSARIO = [
  ['ΔV (delta-v)', 'ΔV (delta-v)', 'Cambio de velocidad que necesita una maniobra. Es la "moneda" del espacio: cada ΔV se paga con propelente.', 'Change of velocity that a manoeuvre needs. It is the "currency" of space: every ΔV is paid for with propellant.', ['vuelo']],
  ['C3', 'C3', 'Energía de escape al salir de la Tierra (km²/s²). Cuanto mayor, menos masa puede lanzar el mismo cohete: por eso hay una capacidad distinta para cada destino.', 'Escape energy when leaving Earth (km²/s²). The higher it is, the less mass the same rocket can launch: that is why there is a different capacity for each destination.', ['vuelo']],
  ['Ventana de lanzamiento', 'Launch window', 'Periodo en que los planetas están bien colocados. Dentro de ella hay un día óptimo (menos ΔV); otros días cuestan más propelente.', 'Period in which planets are well placed. Inside it there is an optimal day (lowest ΔV); other days cost more propellant.', ['vuelo']],
  ['Sobrevuelo (flyby)', 'Flyby', 'Pasar cerca de un planeta para aprovechar su gravedad y cambiar de velocidad sin gastar propelente. Alarga el viaje.', 'Passing close to a planet to use its gravity and change speed without spending propellant. It lengthens the trip.', ['vuelo']],
  ['Periapsis / apoapsis', 'Periapsis / apoapsis', 'El punto de una órbita más cercano y más lejano del cuerpo. Una órbita muy elíptica pasa poco tiempo cerca y mucho lejos.', 'The closest and farthest point of an orbit around the body. A very elliptical orbit spends little time close and much time far.', ['vuelo', 'ciencia']],
  ['Inserción orbital', 'Orbit insertion', 'Frenada que captura la nave en órbita. Es una fase crítica: si falla, la nave pasa de largo.', 'Braking burn that captures the spacecraft into orbit. It is a critical phase: if it fails, the spacecraft flies past.', ['vuelo']],
  ['LEO / GTO', 'LEO / GTO', 'Órbita baja terrestre y órbita de transferencia geoestacionaria: los destinos de referencia con los que se compara a los cohetes.', 'Low Earth orbit and geostationary transfer orbit: the reference destinations used to compare rockets.', ['vuelo']],
  ['Actitud (GNC)', 'Attitude (GNC)', 'Hacia dónde apunta la nave. Se controla con ruedas de reacción y pequeños propulsores; guiado, navegación y control (GNC).', 'Where the spacecraft points. Controlled with reaction wheels and small thrusters; guidance, navigation and control (GNC).', ['vuelo', 'potencia']],
  ['Capacidad del cohete', 'Rocket capacity', 'Masa máxima que el cohete lleva a un destino. Es el límite de la barra de masa.', 'Maximum mass the rocket carries to a destination. It is the limit of the mass bar.', ['vuelo']],
  ['Cobertura', 'Coverage', 'Qué parte de un objetivo científico consigues: instrumentos montados × horas de uso respecto al objetivo.', 'How much of a science goal you achieve: instruments mounted × usage hours against the target.', ['ciencia']],
  ['Uso objetivo', 'Target usage', 'Horas por día que un objetivo pide a sus instrumentos para considerarse cubierto del todo.', 'Hours per day that a goal asks of its instruments to be considered fully covered.', ['ciencia']],
  ['Hallazgo oculto', 'Hidden finding', 'Descubrimiento que quizá exista y que solo captura un instrumento que pueda detectarlo.', 'Discovery that may exist and that only an instrument able to detect it captures.', ['ciencia']],
  ['Capa de datos', 'Data layer', 'Mapa satelital (color, altura, composición) de un cuerpo, usado para elegir sitio de descenso u órbita.', 'Satellite map (colour, height, composition) of a body, used to pick a landing site or orbit.', ['ciencia', 'vuelo']],
  ['Eclipse / sombra', 'Eclipse / shadow', 'Periodo en que el cuerpo o la Tierra tapan el Sol: los paneles no generan y manda la batería.', 'Period in which the body or the Earth hides the Sun: panels generate nothing and the battery takes over.', ['potencia', 'comms']],
  ['W / Wh', 'W / Wh', 'Vatio (potencia en un instante) y vatio-hora (energía). W × h = Wh. La batería se mide en Wh.', 'Watt (power at an instant) and watt-hour (energy). W × h = Wh. Batteries are measured in Wh.', ['potencia', 'comms']],
  ['MLI', 'MLI', 'Aislamiento multicapa: mantas finas que frenan el paso del calor.', 'Multi-layer insulation: thin blankets that slow down heat flow.', ['potencia']],
  ['UA (AU)', 'AU', 'Unidad astronómica: distancia media Tierra–Sol (≈ 150 millones de km).', 'Astronomical unit: mean Earth–Sun distance (≈ 150 million km).', ['potencia']],
  ['Bajada (downlink)', 'Downlink', 'Enlace de la nave hacia la Tierra. Su velocidad se da en kbps y solo está abierto algunas horas al día.', 'Link from the spacecraft to Earth. Its speed is given in kbps and it is only open some hours a day.', ['comms', 'ciencia']],
  ['kbps / MB', 'kbps / MB', 'Kilobits por segundo y megabytes. 1 kbps durante 1 h = 0,45 MB.', 'Kilobits per second and megabytes. 1 kbps for 1 h = 0.45 MB.', ['comms', 'ciencia']],
  ['Banda X / Ka', 'X / Ka band', 'Frecuencias de radio del espacio profundo. Ka lleva más datos que X pero es más sensible a la puntería.', 'Deep-space radio frequencies. Ka carries more data than X but is more sensitive to pointing.', ['comms']],
  ['Fase crítica', 'Critical phase', 'Fase del vuelo en la que un fallo es un "golpe crítico". Dos golpes pierden la nave.', 'Flight phase where a failure is a "critical hit". Two hits lose the spacecraft.', null],
  ['Tolerancia', 'Tolerance', 'Hasta un 20 % por encima del límite: pasa la revisión, pero obliga a recortar en Restricciones.', 'Up to 20 % above the limit: passes the review but forces cuts in Constraints.', null],
  ['Contingencia', 'Contingency', 'Seguro comprado en el diseño que anula un evento negativo concreto durante la misión.', 'Insurance bought in design that cancels one specific negative event during the mission.', null],
  ['Margen', 'Margin', 'Diferencia entre el límite y lo usado. Los ingenieros reales dejan margen para lo que aún no saben.', 'Difference between the limit and what is used. Real engineers keep margin for what they do not yet know.', null],
  ['Valor de juego (≈)', 'Game value (≈)', 'Cifra que el equipo ha estimado porque no hay dato real. Los datos reales muestran su fuente.', 'A figure the team estimated because there is no real data. Real data shows its source.', null],
];

// ---------------------------------------------------------------------------------------------------------------------
// Utilidades de render
// ---------------------------------------------------------------------------------------------------------------------
const L = (x) => (Array.isArray(x) ? (idioma() === 'es' ? x[0] : x[1] ?? x[0]) : x ?? '');
const numero = (c, x) => {
  try { if (c.motor?.num) return c.motor.num(x); } catch { /* sigue */ }
  return typeof x === 'number' ? x : Number.isFinite(x?.v) ? x.v : Number.isFinite(x?.juego) ? x.juego : 0;
};
const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
const pct = (x) => `${Math.round((Number(x) || 0) * 100)} %`;

function celda(x) { return typeof x === 'string' ? x : L(x); }

function renderBloques(bs) {
  let n = 0;
  return bs.map((b) => {
    const k = b[0];
    switch (k) {
      case 'p': return h('p', { class: 'sop-p' }, L([b[1], b[2]]));
      case 'h': return h('h3', { class: 'sop-h2' }, L([b[1], b[2]]));
      case 'paso': n++; return h('div', { class: 'sop-paso' }, h('span', { class: 'sop-n' }, String(n).padStart(2, '0')), h('div', { class: 'sop-paso-t' }, L([b[1], b[2]])));
      case 'check': case 'cuidado': case 'nota':
        return h('div', { class: 'sop-call ' + k }, h('span', { class: 'sop-call-etq' }, T.etiq[k]), h('span', { class: 'sop-call-t' }, L([b[1], b[2]])));
      case 'f': return h('div', { class: 'sop-f' }, h('code', {}, b[1]), h('span', {}, L([b[2], b[3]])));
      case 'lista': return h('ul', { class: 'sop-ul' }, b[1].map((it) => h('li', {}, L(it))));
      case 'tabla': return tabla(b[1].map(celda), b[2].map((f) => f.map((x, i) => h('span', {}, celda(x)))));
      default: return null;
    }
  });
}

function tabla(cab, filas, clase = '') {
  return h('div', { class: 'sop-tabla-w' }, h('table', { class: 'sop-tabla ' + clase },
    h('thead', {}, h('tr', {}, cab.map((x) => h('th', {}, x)))),
    h('tbody', {}, filas.map((f) => h('tr', {}, f.map((x) => h('td', {}, x)))))));
}

const nombreDe = (c, x, id) => tx(x?.nombre) || id || '';

// ---------------------------------------------------------------------------------------------------------------------
// Anexo de la misión
// ---------------------------------------------------------------------------------------------------------------------
function sinMision() {
  return h('div', { class: 'sop-call nota' }, h('span', { class: 'sop-call-etq' }, T.etiq.nota),
    h('span', { class: 'sop-call-t' }, h('b', {}, T.sinMision + '. '), T.sinMisionTxt));
}

function efectoTxt(ef) {
  const e = obj(ef), p = [];
  if (e.ciencia != null) p.push(`${T.ciencia} × ${redondear(Number(e.ciencia), 2)}`);
  if (e.dias != null) p.push(`${T.diasEf} × ${redondear(Number(e.dias), 2)}`);
  if (e.falla) p.push(T.falla);
  return p.join(' · ') || '-';
}

function nombreFase(m, id) {
  const f = lista(m?.fases).find((x) => x?.id === id);
  return f ? tx(f.nombre, id) : id ?? '-';
}

function tarjetaContingencia(c, m, ct, rol) {
  const E = obj(c.D?.EVENTOS_MISION);
  const compradas = lista(c.e?.porRol?.comms?.contingencias);
  const activadas = lista(c.e?.vista?.activadas);
  const comprada = compradas.includes(ct.id), activada = activadas.includes(ct.id);
  const eventos = lista(ct.mitiga).map((id) => E[id]).filter(Boolean);
  return h('div', { class: 'sop-ct' + (comprada ? ' comprada' : '') },
    h('div', { class: 'sop-ct-cab' },
      h('b', { class: 'sop-ct-n' }, tx(ct.nombre, ct.id)),
      h('span', { class: 'sop-ct-id' }, ct.id),
      comprada ? h('span', { class: 'sop-sello ok' }, T.comprada) : h('span', { class: 'sop-sello' }, T.noComprada),
      activada ? h('span', { class: 'sop-sello act' }, T.activada) : null),
    h('p', { class: 'sop-ct-t' }, tx(ct.texto)),
    h('p', { class: 'sop-ct-c' }, `${T.masa}: `, valor(c, ct.masa, 'kg'), `  ·  ${T.precio}: `, valor(c, ct.precio, 'M USD')),
    h('div', { class: 'sop-ct-ev' }, h('span', { class: 'sop-mini' }, T.mitiga),
      eventos.length ? eventos.map((ev) => h('div', { class: 'sop-ev' },
        h('b', {}, tx(ev.nombre, ev.id)), h('span', { class: 'sop-ev-id' }, ` ${ev.id}`),
        h('div', { class: 'sop-ev-d' }, `${T.fase}: ${nombreFase(m, ev.fase)} · ${T.prob}: ${pct(numero(c, ev.p))} · ${T.efecto}: ${efectoTxt(ev.efecto)}`),
        h('div', { class: 'sop-ev-d' }, tx(ev.texto)),
        ev.leccion ? h('div', { class: 'sop-ev-d lec' }, `${T.leccion}: ${tx(ev.leccion)}`) : null)) : h('span', { class: 'sop-cero' }, '-')));
}

function seccionContingencias(c, rol) {
  const out = renderBloques(COMUN_CONT);
  out.push(h('h3', { class: 'sop-h2' }, `${T.anexo}: ${MAN[rol] ? depto(rol, 'corto') : ''}`));
  const m = c.mision;
  if (!m) { out.push(sinMision()); return out; }
  const C = obj(c.D?.CONTINGENCIAS);
  const todas = lista(m.contingencias).map((id) => C[id]).filter(Boolean);
  const mias = todas.filter((x) => (x.rol ?? 'comms') === rol);
  if (!mias.length) out.push(h('p', { class: 'sop-p tenue' }, T.ninguna));
  mias.forEach((ct) => out.push(tarjetaContingencia(c, m, ct, rol)));
  const otras = todas.filter((x) => (x.rol ?? 'comms') !== rol);
  if (otras.length) {
    out.push(h('h3', { class: 'sop-h2' }, T.otras));
    out.push(tabla(['ID', ROL_TXT(), ['Contingencia', 'Contingency'][idioma() === 'es' ? 0 : 1], `${T.masa} / ${T.precio}`],
      otras.map((ct) => [ct.id, depto(ct.rol ?? 'comms', 'corto'), tx(ct.nombre, ct.id), h('span', {}, valor(c, ct.masa, 'kg'), ' / ', valor(c, ct.precio, 'M USD'))])));
  }
  return out;
}
const ROL_TXT = () => T.depto;

// ---------------------------------------------------------------------------------------------------------------------
// Ficha técnica en vivo
// ---------------------------------------------------------------------------------------------------------------------
const BARRAS_DE = { vuelo: ['masa', 'volumen', 'presupuesto'], ciencia: ['datos', 'potencia', 'presupuesto'], potencia: ['potencia', 'bateria', 'masa'], comms: ['datos', 'potencia', 'presupuesto'] };

function estadoVivo(c, rol) {
  const res = resumenSeguro(c);
  if (!res) return null;
  const fmt = (n) => (Number.isFinite(n) ? redondear(n, n >= 100 ? 0 : 1) : '∞');
  const medidores = BARRAS_DE[rol].map((b) => {
    const x = obj(res.barras?.[b]);
    const r = Number.isFinite(x.ratio) ? x.ratio : 1.4;
    const ancho = Math.min(1.4, Math.max(0, r)) / 1.4 * 100;
    return h('div', { class: 'sop-bar' },
      h('div', { class: 'sop-bar-t' }, h('b', {}, T.nombreBarra[b]), h('span', {}, `${fmt(x.usado)} / ${fmt(x.limite)} ${T.unidadBarra[b]}`)),
      h('div', { class: 'sop-bar-m', role: 'img', 'aria-label': pct(x.ratio) },
        h('i', { class: 'sop-bar-r ' + (x.estado ?? 'ok'), style: `width:${ancho}%` }), h('i', { class: 'sop-bar-100' }), h('i', { class: 'sop-bar-120' })),
      h('div', { class: 'sop-bar-p ' + (x.estado ?? 'ok') }, `${Number.isFinite(x.ratio) ? pct(x.ratio) : '∞'} · ${T[x.estado ?? 'ok']}`));
  });
  if (rol === 'ciencia') {
    const t = obj(res.ciencia).total ?? 0;
    medidores.unshift(h('div', { class: 'sop-bar' },
      h('div', { class: 'sop-bar-t' }, h('b', {}, T.cienciaTotal), h('span', {}, pct(t))),
      h('div', { class: 'sop-bar-m' }, h('i', { class: 'sop-bar-r ' + (t >= 0.8 ? 'ok' : 'tolerancia'), style: `width:${Math.min(100, t * 100)}%` }), h('i', { class: 'sop-bar-80' }))));
  }
  return h('div', { class: 'sop-bars' }, medidores);
}

function parametros(c, m) {
  const lim = obj(m.limites), claves = Object.keys(lim);
  const filas = [
    [T.destino, tx(m.cuerpo, m.destino ?? '-')],
    [T.sombra, h('span', {}, `${redondear(numero(c, m.horasSombra), 2)} h`)],
    [T.enlace, h('span', {}, `${redondear(numero(c, m.horasEnlace), 2)} h`)],
    [T.dias, h('span', {}, `${redondear(numero(c, m.diasPrevistos), 0)}`)],
    [T.presupuesto, valor(c, m.presupuesto, 'M USD')],
    [T.puntuacion, `${m.puntuacion ?? '-'}`],
    [T.limites, claves.length ? claves.map((k) => `${T.nombreBarra[k] ?? k}: ${redondear(numero(c, lim[k]), 1)}`).join(' · ') : T.ninguno],
  ];
  return tabla([['Parámetro', 'Parameter'][idioma() === 'es' ? 0 : 1], ['Valor', 'Value'][idioma() === 'es' ? 0 : 1]], filas, 'sop-t-par');
}

function piezasDe(c, m, rol) {
  const P = obj(c.D?.PIEZAS);
  return Object.values(P).filter((p) => p && p.rol === rol && ((Array.isArray(m.piezas) && m.piezas.includes(p.id)) || lista(p.misiones).includes(m.id)));
}

function aportaTxt(c, a) {
  const o = obj(a), partes = [];
  for (const [k, u, et] of [['potencia', 'W', 'P'], ['bateria', 'Wh', 'Bat'], ['bajada', 'kbps', '↓'], ['volumen', '', 'Vol']]) {
    if (numero(c, o[k]) > 0) partes.push(h('span', { class: 'sop-ap' }, `${et} +`, valor(c, o[k], u)));
  }
  return partes.length ? partes : h('span', { class: 'sop-cero' }, '–');
}

function tablaPiezas(c, m, rol) {
  const ps = piezasDe(c, m, rol);
  if (!ps.length) return h('p', { class: 'sop-p tenue' }, T.sinPiezas);
  const v0 = (x, u) => (numero(c, x) > 0 ? valor(c, x, u) : h('span', { class: 'sop-cero' }, '–'));
  const filas = [];
  for (const p of ps) {
    const ops = lista(p.opciones);
    const uso = p.uso && typeof p.uso === 'object' ? `${redondear(numero(c, p.uso.min), 0)}–${redondear(p.uso.max == null ? 24 : numero(c, p.uso.max), 0)} (${redondear(p.uso.def == null ? numero(c, p.uso.max ?? 24) : numero(c, p.uso.def), 0)})` : T.fija;
    ops.forEach((o, i) => {
      filas.push([
        i === 0 ? h('span', { class: 'sop-id' }, p.id) : '',
        i === 0 ? h('span', {}, tx(p.nombre, p.id), p.enSombra ? h('span', { class: 'sop-luna', title: T.eclipse }, ' ☾') : null, h('div', { class: 'sop-cat' }, p.categoria ?? '')) : '',
        h('span', {}, h('b', {}, `#${o.id}`), ` ${tx(o.nombre)}`),
        v0(o.masa, 'kg'), v0(o.potencia, 'W'), v0(o.volumen, ''), v0(o.tasa, 'kbps'), v0(o.precio, 'M USD'),
        aportaTxt(c, o.aporta), i === 0 ? uso : '',
      ]);
    });
  }
  return tabla(T.cabPieza, filas, 'sop-t-piezas');
}

function tablaFases(c, m, rol) {
  const fases = lista(m.fases);
  if (!fases.length) return null;
  const P = obj(c.D?.PIEZAS), C = obj(c.D?.CONTINGENCIAS);
  const nom = (id) => (P[id] ? tx(P[id].nombre, id) : C[id] ? tx(C[id].nombre, id) : lista(m.rutas).find((r) => r?.id === id) ? tx(lista(m.rutas).find((r) => r?.id === id).nombre, id) : id);
  const mio = (id) => (P[id] ? P[id].rol === rol : C[id] ? (C[id].rol ?? 'comms') === rol : false);
  const filas = fases.filter((f) => f?.id != null).map((f) => [
    h('b', {}, tx(f.nombre, f.id)),
    f.critica ? T.critica : T.noCritica,
    pct(numero(c, f.pBase)),
    lista(f.mejoras).length ? lista(f.mejoras).map((mj) => h('span', { class: 'sop-mej' + (mio(mj.por) ? ' mio' : '') }, `${nom(mj.por)} ${numero(c, mj.dp) >= 0 ? '+' : ''}${redondear(numero(c, mj.dp) * 100, 0)} %`)) : h('span', { class: 'sop-cero' }, '–'),
  ]);
  return tabla(T.cabFase, filas, 'sop-t-fases');
}

function extrasVuelo(c, m) {
  const out = [];
  const K = obj(c.D?.COHETES);
  const cohetes = lista(m.cohetes).map((id) => K[id]).filter(Boolean);
  if (cohetes.length) {
    out.push(h('h3', { class: 'sop-h2' }, T.cohetes));
    out.push(tabla(T.cabCohete, cohetes.map((k) => [h('b', {}, tx(k.nombre, k.id)), k.operador ?? '-', valor(c, obj(k.capacidad)[m.destino], 'kg'), valor(c, k.precio, 'M USD')])));
  }
  const rutas = lista(m.rutas).filter(Boolean);
  if (rutas.length) {
    out.push(h('h3', { class: 'sop-h2' }, T.rutas));
    out.push(tabla(T.cabRuta, rutas.map((r) => [
      h('span', {}, h('b', {}, r.id), ' ', tx(r.nombre)), valor(c, r.dias, ['d', 'd'][0]), valor(c, r.masa, 'kg'), valor(c, r.precio, 'M USD'),
      r.efecto ? `${nombreFase(m, r.efecto.fase)} ${numero(c, r.efecto.dp) >= 0 ? '+' : ''}${redondear(numero(c, r.efecto.dp) * 100, 0)} %` : '-',
    ])));
  }
  return out;
}

function extrasCiencia(c, m) {
  const out = [];
  const objs = lista(m.objetivos).filter((o) => o && o.id != null);
  const sel = Array.isArray(c.e?.mision?.objetivos) ? c.e.mision.objetivos : null;
  const P = obj(c.D?.PIEZAS);
  if (objs.length) {
    out.push(h('h3', { class: 'sop-h2' }, T.objetivos));
    out.push(tabla(T.cabObj, objs.map((o) => [
      h('span', {}, h('b', {}, o.id), ' ', tx(o.nombre), sel && !o.prioridad && !sel.includes(o.id) ? h('span', { class: 'sop-cero' }, ' (✕)') : null),
      o.prioridad ? T.si : T.no, redondear(numero(c, o.valor ?? 1), 0),
      lista(o.requiere).map((id) => tx(P[id]?.nombre, id)).join(', ') || '-', `${redondear(numero(c, o.usoObjetivo), 0)} h`,
    ])));
  }
  const n = lista(m.oculto).filter(Boolean).length;
  if (n) out.push(h('p', { class: 'sop-p' }, T.ocultos(n)));
  return out;
}

function seccionFicha(c, rol) {
  const m = c.mision;
  if (!m) return [sinMision()];
  const out = [];
  const viva = estadoVivo(c, rol);
  if (viva) { out.push(h('h3', { class: 'sop-h2' }, T.estado), viva); }
  out.push(h('h3', { class: 'sop-h2' }, T.parametros), parametros(c, m));
  if (rol === 'vuelo') out.push(...extrasVuelo(c, m));
  if (rol === 'ciencia') out.push(...extrasCiencia(c, m));
  out.push(h('h3', { class: 'sop-h2' }, T.piezas), tablaPiezas(c, m, rol));
  const fases = tablaFases(c, m, rol);
  if (fases) out.push(h('h3', { class: 'sop-h2' }, T.fasesVuelo), fases);
  return out;
}

function seccionGlosario(rol) {
  const ent = GLOSARIO.filter((g) => !g[4] || g[4].includes(rol));
  return [
    h('p', { class: 'sop-p' }, L(['Términos que vas a oír en la sala de control. Primero los de tu departamento y luego los comunes.', 'Terms you will hear in the control room. Your department first, then the common ones.'])),
    h('dl', { class: 'sop-dl' }, [...ent.filter((g) => g[4]), ...ent.filter((g) => !g[4])].map((g) => [
      h('dt', {}, L([g[0], g[1]])), h('dd', {}, L([g[2], g[3]]))])),
  ];
}

function contenido(c, rol, sec) {
  const M = MAN[rol];
  switch (sec) {
    case 'proposito': return [...renderBloques(M.proposito), ...renderBloques(FLUJO)];
    case 'procedimiento': return renderBloques(M.procedimiento);
    case 'formulas': return [...renderBloques(M.formulas), ...renderBloques(COMUN_FORM)];
    case 'contingencias': return seccionContingencias(c, rol);
    case 'ficha': return seccionFicha(c, rol);
    case 'glosario': return seccionGlosario(rol);
    default: return [];
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------------------------------------------------
export function appManual(c, { rol } = {}) {
  const inicial = ROLES.includes(rol) ? rol : ROLES.includes(c?.rol) ? c.rol : 'vuelo';
  const u = (c.ui.manual ??= { rol: inicial, seccion: SECCIONES[0].id, base: inicial });
  if (u.base !== inicial) { u.base = inicial; u.rol = inicial; u.seccion = SECCIONES[0].id; }   // se reabre con otro rol: vuelve a empezar
  if (!ROLES.includes(u.rol)) u.rol = inicial;
  if (!SECCIONES.some((s) => s.id === u.seccion)) u.seccion = SECCIONES[0].id;
  const rolVer = u.rol, M = MAN[rolVer];
  const idx = SECCIONES.findIndex((s) => s.id === u.seccion);
  const color = (r) => `--rc:var(--lp-rol-${r}, ${ROL_COLOR[r]})`;

  const arriba = () => requestAnimationFrame(() => requestAnimationFrame(() => {
    const el = document.querySelector(`[data-scroll="sop-${u.rol}"]`);
    if (el) el.scrollTop = 0;
  }));
  const ir = (i) => { u.seccion = SECCIONES[Math.min(SECCIONES.length - 1, Math.max(0, i))].id; c.repintar(); arriba(); };

  let cuerpo;
  try { cuerpo = contenido(c, rolVer, u.seccion); } catch (err) { console.error('manual', err); cuerpo = [h('p', { class: 'sop-call cuidado' }, String(err?.message ?? err))]; }

  const tabs = h('nav', { class: 'sop-tabs', role: 'tablist', 'aria-label': T.depto }, ROLES.map((r) => h('button', {
    class: 'sop-tab' + (r === rolVer ? ' activa' : ''), type: 'button', role: 'tab', 'aria-selected': String(r === rolVer), style: color(r),
    title: depto(r, 'largo'),
    onclick: () => { u.rol = r; u.seccion = SECCIONES[0].id; c.repintar(); requestAnimationFrame(() => requestAnimationFrame(() => { const el = document.querySelector(`[data-scroll="sop-${r}"]`); if (el) el.scrollTop = 0; })); },
  }, h('b', {}, depto(r, 'sigla')), h('span', { class: 'sop-tab-t' }, ' ' + depto(r, 'corto')), r === c.rol ? h('i', { class: 'sop-tab-yo', title: T.tuDepto }, '★') : null)));

  const portada = h('aside', { class: 'sop-lado' },
    h('div', { class: 'sop-portada' },
      h('div', { class: 'sop-portada-t' }, T.titulo),
      h('div', { class: 'sop-doc' }, `SOP-${depto(rolVer, 'sigla')}-${M.num} ${T.rev} ${M.rev}`),
      h('div', { class: 'sop-depto' }, depto(rolVer, 'largo')),
      h('div', { class: 'sop-mision-r' }, L(M.mision)),
      h('div', { class: 'sop-clasif' }, T.clasif),
      h('div', { class: 'sop-anexo' }, c.mision ? `${T.anexo}: ${c.mision.id} · ${tx(c.mision.nombre)}` : `${T.anexo}: ${T.sinMision}`)),
    h('div', { class: 'sop-indice-t' }, T.indice),
    h('ol', { class: 'sop-indice' }, SECCIONES.map((s, i) => h('li', {}, h('button', {
      class: 'sop-ind' + (s.id === u.seccion ? ' activa' : ''), type: 'button', onclick: () => ir(i), 'aria-current': s.id === u.seccion ? 'page' : null,
    }, L(s.t))))));

  const pie = h('div', { class: 'sop-pie' },
    h('button', { class: 'sop-nav', type: 'button', disabled: idx <= 0, onclick: () => ir(idx - 1) }, '◀ ' + (idx > 0 ? L(SECCIONES[idx - 1].t) : T.anterior)),
    h('span', { class: 'sop-pag' }, `${T.pag} ${idx + 1} ${T.de} ${SECCIONES.length}`),
    h('button', { class: 'sop-nav', type: 'button', disabled: idx >= SECCIONES.length - 1, onclick: () => ir(idx + 1) }, (idx < SECCIONES.length - 1 ? L(SECCIONES[idx + 1].t) : T.siguiente) + ' ▶'));

  const pagina = h('article', { class: 'sop-pagina', 'data-scroll': `sop-${rolVer}`, tabindex: '-1' },
    h('header', { class: 'sop-cab' }, h('span', { class: 'sop-cab-d' }, `SOP-${depto(rolVer, 'sigla')}-${M.num} ${T.rev} ${M.rev}`), h('h2', { class: 'sop-h1' }, L(SECCIONES[idx].t))),
    h('div', { class: 'sop-cuerpo' }, cuerpo), pie);

  return h('div', { class: 'sop', style: color(rolVer) }, tabs, h('div', { class: 'sop-libro' }, h('div', { class: 'sop-anillas', 'aria-hidden': 'true' }), portada, pagina));
}

export default appManual;
