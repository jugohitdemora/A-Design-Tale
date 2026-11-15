// Catálogo de cohetes (regla DEC-09, flujo-del-juego.md §6): solo cohetes en servicio que han lanzado cargas de NASA.
// Capacidades y precios SOLO de los documentos del equipo. Lo que no tiene dato real va con v: null y `juego`.
// Los cohetes reales de las misiones de referencia (Ariane 5, Ariane 5 G+) NO cumplen DEC-09: no están aquí, van en `referencia.coheteReal`.
//
// capacidad: kg por destino.  leo, gto, luna, mercurio, cometa son los destinos de las misiones;
// `sso` es extra (Electron solo tiene dato real a SSO de 500 km, ORB-01).
// Todas las capacidades a luna, mercurio y cometa son JUEGO (GAP-P03, GAP-P17): ningún documento las da.

const V = (v, src) => ({ v, conf: 'V', src });
const A = (v, src) => ({ v, conf: 'A', src });
const J = (juego, src = 'JUEGO') => ({ v: null, conf: 'JUEGO', src, juego });
const N = (es, en = es) => ({ es, en });

// Atajo para los destinos sin dato real.
const cap = (leo, gto, luna, mercurio, cometa, extra = {}, srcLuna = 'JUEGO') => ({
  leo: leo ?? J(0), gto: gto ?? J(0), luna: J(luna, srcLuna), mercurio: J(mercurio, 'GAP-P03'), cometa: J(cometa, 'GAP-P03'), ...extra,
});

export const COHETES = {
  electron: {
    id: 'electron', nombre: N('Electron'), operador: 'Rocket Lab', cumpleDEC09: true,
    capacidad: cap(J(300), J(0), 0, 0, 0, { sso: V(200, 'ORB-01') }),
    precio: J(7, 'GAP-M01'), usoNasa: 'CubeSats; CAPSTONE (2022)', src: 'ORB-01',
    nota: { en: 'Small launcher: real datum is 200 kg to a 500 km sun-synchronous orbit.' },
  },
  falcon9: {
    id: 'falcon9', nombre: N('Falcon 9'), operador: 'SpaceX', cumpleDEC09: true,
    capacidad: cap(A(22800, 'ORB-04'), A(8300, 'ORB-04'), 2900, 1800, 1500),
    precio: V(80.4, 'ORB-05'), usoNasa: 'PACE (2024); Blue Ghost Mission 1 (2025)', src: 'ORB-04',
    nota: { en: 'Real: 22,800 kg to low orbit and 8,300 kg to GTO (expendable). Price is what NASA paid for PACE.' },
  },
  falconheavy: {
    id: 'falconheavy', nombre: N('Falcon Heavy'), operador: 'SpaceX', cumpleDEC09: true,
    capacidad: cap(J(0, 'GAP-P17'), J(0, 'GAP-P17'), 6000, 4700, 3800, {}, 'GAP-P17'),
    precio: A(117, 'GEN-01'), usoNasa: 'Psyche; Europa Clipper', src: 'GEN-01',
    nota: { en: 'Real NASA launch prices run from 117 M USD (Psyche) to 256.6 M USD (Dragonfly). Capacity is a game value.' },
  },
  vulcan: {
    id: 'vulcan', nombre: N('Vulcan Centaur'), operador: 'ULA', cumpleDEC09: true,
    capacidad: cap(J(0), J(0), 4500, 3900, 3300),
    precio: J(110), usoNasa: 'Successor to Atlas V (NASA use to be checked)', src: 'JUEGO',
    nota: { en: 'No capacity or price found yet. Game values.' },
  },
  atlasv: {
    id: 'atlasv', nombre: N('Atlas V'), operador: 'ULA', cumpleDEC09: true,
    capacidad: cap(J(0), J(0), 3000, 3300, 2600),
    precio: J(130), usoNasa: 'Landsat 9; InSight; Perseverance', src: 'ORB-14',
    nota: { en: 'Being retired. Capacity depends on the version (401, 541) and was not found. Game values.' },
  },
  pegasus: {
    id: 'pegasus', nombre: N('Pegasus XL'), operador: 'Northrop Grumman', cumpleDEC09: true,
    capacidad: cap(J(450), J(0), 0, 0, 0),
    precio: J(40), usoNasa: 'ICON (2019)', src: 'JUEGO',
    nota: { en: 'Air-launched small rocket. Capacity not found. Game values.' },
  },
  minotaur4: {
    id: 'minotaur4', nombre: N('Minotaur IV'), operador: 'Northrop Grumman', cumpleDEC09: true,
    capacidad: cap(J(1700), J(0), 0, 0, 0),
    precio: J(60), usoNasa: null, src: 'JUEGO',
    nota: { en: 'Capacity not found. Game values.' },
  },
  sls: {
    id: 'sls', nombre: N('SLS'), operador: 'NASA', cumpleDEC09: true,
    capacidad: cap(J(95000), J(0), 27000, 20000, 15000),
    precio: J(2000), usoNasa: 'Artemis I (secondary CubeSats)', src: 'JUEGO',
    nota: { en: 'Capacity and price not found. Game values.' },
  },
};

export default COHETES;
