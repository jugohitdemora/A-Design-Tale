// Datos del juego. Contrato: mecanicas-del-juego.md §10. Se importa como `import { DATOS } from './datos/index.js'` o por defecto.
import { PIEZAS } from './piezas.js';
import { COHETES } from './cohetes.js';
import { ESCENARIOS, MISIONES } from './misiones.js';
import { EVENTOS_DISENO, EVENTOS_MISION, CONTINGENCIAS } from './eventos.js';
import { FUENTES as FUENTES_BASE } from './fuentes.js';
import { PLANIFICACION } from './planificacion.js';
import { MAPAS } from './mapas.js';
import { CALENDARIO, FUENTES_CALENDARIO } from './calendario.js';

// Las fuentes del calendario (POWER, Horizons, OMNI2) se suman a las del resto de datos.
const FUENTES = { ...FUENTES_BASE, ...FUENTES_CALENDARIO };

export const DATOS = { PIEZAS, COHETES, ESCENARIOS, MISIONES, EVENTOS_DISENO, EVENTOS_MISION, CONTINGENCIAS, FUENTES, PLANIFICACION, MAPAS, CALENDARIO };
export { PIEZAS, COHETES, ESCENARIOS, MISIONES, EVENTOS_DISENO, EVENTOS_MISION, CONTINGENCIAS, FUENTES, PLANIFICACION, MAPAS, CALENDARIO };
export default DATOS;
