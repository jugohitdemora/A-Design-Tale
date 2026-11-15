// Azar determinista: todo lo aleatorio del juego sale de estado.semilla.
// Puro (sin red, sin DOM). Mismo número de semilla → misma secuencia en cualquier navegador.

// mulberry32: devuelve una función que da números en [0, 1).
export function prng(semilla) {
  let a = Number.isFinite(Number(semilla)) ? Number(semilla) >>> 0 : 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Semilla derivada para un uso concreto ('diseno', 'mision', 'oculto'…): así cada sorteo tiene su propia
// secuencia y añadir un sorteo en un sitio no cambia los demás.
export function derivar(semilla, ...etiquetas) {
  let h = (Number(semilla) >>> 0) ^ 0x9e3779b9;
  for (const ch of etiquetas.join('|')) {
    h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

// Copia barajada (Fisher-Yates) sin tocar la lista original.
export function barajar(azar, lista) {
  const r = Array.isArray(lista) ? [...lista] : [];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// Un elemento al azar, o null si la lista está vacía.
export function elegir(azar, lista) {
  if (!Array.isArray(lista) || !lista.length) return null;
  return lista[Math.floor(azar() * lista.length)];
}

// Un elemento que no esté en `usados`, o null si no queda ninguno.
export function elegirSinRepetir(azar, lista, usados = []) {
  const quedan = (Array.isArray(lista) ? lista : []).filter((x) => !usados.includes(x));
  return elegir(azar, quedan);
}

// k elementos distintos (o menos, si no hay tantos).
export function tomarSinRepetir(azar, lista, k) {
  return barajar(azar, lista).slice(0, Math.max(0, k | 0));
}
