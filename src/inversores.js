// Inversores de los eventos de diseño: cada evento de dinero (entra, se va, recorta, dona) lo "cuenta" un inversor con foto.
// Para cambiar nombres o fotos basta editar INVERSORES (las fotos están en assets/inversores/).
import { textos } from './i18n.js';

export const INVERSORES = [
  { id: 'valentina', nombre: 'Valentina', foto: 'assets/inversores/valentina.jpg' },
  { id: 'juan-pablo', nombre: 'Juan Pablo', foto: 'assets/inversores/juan-pablo.jpg' },
  { id: 'emanuel', nombre: 'Emanuel', foto: 'assets/inversores/emanuel.jpg' },
  { id: 'laura', nombre: 'Laura', foto: 'assets/inversores/laura.jpg' },
  { id: 'mateo', nombre: 'Mateo', foto: 'assets/inversores/mateo.jpg' },
  { id: 'marzuq', nombre: 'Marzuq', foto: 'assets/inversores/marzuq.jpg' },
];

// Eventos de diseño que son decisiones de un inversor.
export const esEventoInversor = (id) => /^ED-[A-Z]+-(IN|OUT)$/.test(id) || ['EG-INV-NEW', 'EG-PATROCINIO', 'EG-GRANT', 'EG-DONA'].includes(id);

// Mismo evento, mismo inversor (determinista, sin tocar el estado replicado).
export function inversorDe(id) {
  let n = 0; for (const ch of String(id)) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return INVERSORES[n % INVERSORES.length];
}

export const TI = textos({
  es: {
    entra: (n) => `Inversor ${n} se une`, sale: (n) => `Inversor ${n} decide retirarse`,
    recorta: (n) => `Inversor ${n} recorta su apoyo`, aporta: (n) => `Inversor ${n} aporta más`,
    porque: 'Por qué', aceptar: 'Aceptar', ia: 'Imagen generada con IA',
    meses: (m) => `Buscar reemplazo retrasa el reloj ${m} ${m === 1 ? 'mes' : 'meses'}`,
    dinero: (v) => `${v > 0 ? 'Más' : 'Menos'} dinero para la misión`,
  },
  en: {
    entra: (n) => `Investor ${n} joins`, sale: (n) => `Investor ${n} decides to leave`,
    recorta: (n) => `Investor ${n} cuts support`, aporta: (n) => `Investor ${n} adds more`,
    porque: 'Why', aceptar: 'Accept', ia: 'AI-generated image',
    meses: (m) => `Finding a replacement delays the clock ${m} month${m === 1 ? '' : 's'}`,
    dinero: (v) => `${v > 0 ? 'More' : 'Less'} money for the mission`,
  },
});

// Titular según el evento y el signo.
export function titular(id, signo, nombre) {
  if (/-OUT$/.test(id)) return TI.sale(nombre);
  if (id === 'EG-PATROCINIO') return TI.recorta(nombre);
  if (signo === '+') return /-IN$|INV-NEW/.test(id) ? TI.entra(nombre) : TI.aporta(nombre);
  return TI.sale(nombre);
}
