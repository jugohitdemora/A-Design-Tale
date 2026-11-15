// Misiones jugables escritas en su propio archivo (una por archivo, ver ../ayudas.js y vip-1.js como plantilla).
// Cada archivo exporta por defecto:
//   { mision, piezas: [], eventosDiseno: {}, eventosMision: {}, contingencias: {}, fuentes: {}, mapas: {},
//     planificacion: {...} | null, capacidad: { idCohete: valor }, calendario: {...} | null }
// `capacidad` es la capacidad de cada cohete ofrecido hasta `mision.destino` (se fusiona en COHETES[id].capacidad).
// `calendario` es la entrada de DESTINOS del calendario para un destino nuevo (null si el destino ya existe).
// src/datos/index.js las fusiona con el resto de datos; los motores no distinguen entre unas y otras.
import VIP_1 from './vip-1.js';
import ISS_1 from './iss-1.js';
import AGR_1 from './agr-1.js';
import EUR_1 from './eur-1.js';
import MAR_1 from './mar-1.js';
import SAT_1 from './sat-1.js';

export const NUEVAS = [VIP_1, ISS_1, AGR_1, EUR_1, MAR_1, SAT_1].filter(Boolean);
export default NUEVAS;
