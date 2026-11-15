// Datos del juego. Contrato: mecanicas-del-juego.md §10. Se importa como `import { DATOS } from './datos/index.js'` o por defecto.
import { PIEZAS } from './piezas.js';
import { COHETES } from './cohetes.js';
import { ESCENARIOS, MISIONES } from './misiones.js';
import { EVENTOS_DISENO, EVENTOS_MISION, CONTINGENCIAS } from './eventos.js';
import { FUENTES } from './fuentes.js';
import { PLANIFICACION } from './planificacion.js';
import { MAPAS } from './mapas.js';

export const DATOS = { PIEZAS, COHETES, ESCENARIOS, MISIONES, EVENTOS_DISENO, EVENTOS_MISION, CONTINGENCIAS, FUENTES, PLANIFICACION, MAPAS };
export { PIEZAS, COHETES, ESCENARIOS, MISIONES, EVENTOS_DISENO, EVENTOS_MISION, CONTINGENCIAS, FUENTES, PLANIFICACION, MAPAS };
export default DATOS;
