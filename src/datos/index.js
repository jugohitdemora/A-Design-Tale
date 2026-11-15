// Datos del juego. Contrato: mecanicas-del-juego.md §10. Se importa como `import { DATOS } from './datos/index.js'` o por defecto.
import { PIEZAS } from './piezas.js';
import { COHETES } from './cohetes.js';
import { ESCENARIOS, MISIONES } from './misiones.js';
import { EVENTOS_DISENO, EVENTOS_MISION, CONTINGENCIAS } from './eventos.js';
import { FUENTES as FUENTES_BASE } from './fuentes.js';
import { PLANIFICACION } from './planificacion.js';
import { MAPAS } from './mapas.js';
import { CALENDARIO, FUENTES_CALENDARIO } from './calendario.js';
import { NUEVAS } from './misiones-nuevas/index.js';
import { MAPAS_NUEVOS } from './mapas-nuevos.js';

// Mapas e imágenes reales descargados para las misiones nuevas (Tierra, Marte, Europa, Encélado, Saturno, ISS...).
Object.assign(MAPAS, MAPAS_NUEVOS);

// Las fuentes del calendario (POWER, Horizons, OMNI2) se suman a las del resto de datos.
const FUENTES = { ...FUENTES_BASE, ...FUENTES_CALENDARIO };

// Misiones escritas en su propio archivo (src/datos/misiones-nuevas): se fusionan en las mismas tablas.
for (const x of NUEVAS) {
  const m = x.mision;
  MISIONES[m.id] = m;
  for (const p of x.piezas ?? []) PIEZAS[p.id] = p;
  Object.assign(EVENTOS_DISENO, x.eventosDiseno ?? {});
  Object.assign(EVENTOS_MISION, x.eventosMision ?? {});
  Object.assign(CONTINGENCIAS, x.contingencias ?? {});
  Object.assign(FUENTES, x.fuentes ?? {});
  Object.assign(MAPAS, x.mapas ?? {});
  if (x.planificacion) PLANIFICACION[m.id] = x.planificacion;
  for (const [id, cap] of Object.entries(x.capacidad ?? {})) if (COHETES[id]) COHETES[id].capacidad[m.destino] = cap;
  if (x.calendario && !CALENDARIO.DESTINOS[m.destino]) CALENDARIO.DESTINOS[m.destino] = x.calendario;
}

export const DATOS = { PIEZAS, COHETES, ESCENARIOS, MISIONES, EVENTOS_DISENO, EVENTOS_MISION, CONTINGENCIAS, FUENTES, PLANIFICACION, MAPAS, CALENDARIO };
export { PIEZAS, COHETES, ESCENARIOS, MISIONES, EVENTOS_DISENO, EVENTOS_MISION, CONTINGENCIAS, FUENTES, PLANIFICACION, MAPAS, CALENDARIO };
export default DATOS;
