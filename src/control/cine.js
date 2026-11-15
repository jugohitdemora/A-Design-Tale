// Efectos cinematográficos de la sala de control (intro del informe, alarmas de la consola de operaciones).
// La pared se repinta entera a menudo (replaceChildren): una animación CSS recreada volvería a empezar. Por eso cada efecto
// guarda cuándo se vio por primera vez (c.ui.cine[clave]) y el CSS resta ese tiempo con la variable --ya (segundos transcurridos).
// El sonido se sintetiza con WebAudio (sin archivos) y suena una sola vez por clave.

import { contexto, salidaEfectos } from '../audio.js';

const AHORA = () => performance.now() / 1000;

// Segundos desde la primera vez que esta pantalla pidió la clave (0 la primera vez).
export function transcurrido(c, clave) {
  const cine = (c.ui.cine ??= {});
  if (cine[clave] == null) cine[clave] = AHORA();
  return Math.max(0, AHORA() - cine[clave]);
}
// Da el efecto por terminado (clic en "saltar").
export function terminar(c, clave, dur) { (c.ui.cine ??= {})[clave] = AHORA() - dur - 1; }

export const sinMovimiento = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const sonados = new Set();
// Mismo contexto y volumen de efectos que el resto del juego (src/audio.js).
function audio() {
  const a = contexto();
  if (a && a.state === 'suspended') a.resume();
  return a;
}
// Una nota: tipo de onda, frecuencia inicial y final, inicio y duración (s), volumen.
function nota(a, { onda = 'square', f0, f1 = f0, t = 0, d = 0.2, v = 0.06 }) {
  const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + t;
  o.type = onda; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + d);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g).connect(salidaEfectos()); o.start(t0); o.stop(t0 + d + 0.05);
}
const SONIDOS = {
  // Alarma de evento: dos tonos alternos, tres veces.
  alarma: (a) => { for (let i = 0; i < 3; i++) { nota(a, { f0: 880, t: i * 0.36, d: 0.16 }); nota(a, { f0: 660, t: i * 0.36 + 0.18, d: 0.16 }); } },
  // Fallo de fase: golpe grave que cae.
  fallo: (a) => { nota(a, { onda: 'sawtooth', f0: 220, f1: 55, d: 0.7, v: 0.08 }); nota(a, { onda: 'square', f0: 110, f1: 40, t: 0.05, d: 0.6, v: 0.05 }); },
  // Teletipo de la transmisión.
  tecleo: (a) => { for (let i = 0; i < 10; i++) nota(a, { f0: 1400 + (i % 3) * 180, t: i * 0.07, d: 0.03, v: 0.025 }); },
  // Veredictos.
  total: (a) => [523, 659, 784, 1047].forEach((f, i) => nota(a, { onda: 'triangle', f0: f, t: i * 0.12, d: 0.45, v: 0.07 })),
  parcial: (a) => [523, 659, 587].forEach((f, i) => nota(a, { onda: 'triangle', f0: f, t: i * 0.16, d: 0.4, v: 0.06 })),
  fallida: (a) => { nota(a, { onda: 'sawtooth', f0: 196, f1: 98, d: 0.9, v: 0.08 }); nota(a, { onda: 'sawtooth', f0: 185, f1: 92, t: 0.02, d: 0.9, v: 0.05 }); },
};
// Suena una vez por clave (y solo si el efecto acaba de empezar: quien entra tarde no oye una alarma vieja).
export function sonar(clave, tipo, ya = 0) {
  if (sonados.has(clave) || ya > 0.6) { sonados.add(clave); return; }
  sonados.add(clave);
  const a = audio(); if (a && SONIDOS[tipo]) { try { SONIDOS[tipo](a); } catch { /* sin audio */ } }
}
// Programa un sonido a los `t` segundos de empezar el efecto (si aún no ha pasado).
export function sonarEn(clave, tipo, t, ya) {
  if (sonados.has(clave) || sonados.has(clave + ':prog')) return; // la pared se repinta: programar una sola vez
  if (ya > t + 0.6) { sonados.add(clave); return; }
  sonados.add(clave + ':prog');
  setTimeout(() => sonar(clave, tipo), Math.max(0, (t - ya) * 1000));
}
