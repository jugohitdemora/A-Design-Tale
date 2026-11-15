// Paleta de la sala de control para dibujar en canvas/SVG. La fuente de verdad son las variables --mc-* de estilos/control.css:
// aquí se leen con getComputedStyle (así un cambio de paleta en el CSS llega al dibujo) y PALETA_DEF solo es el valor de reserva.
export const PALETA_DEF = {
  fondo: '#0a0d1c', panel: '#121830', hundido: '#070914', borde: '#3a4880', tinta: '#e6edff', 'tinta-2': '#b8c4ea', tenue: '#9aa8d4',
  cian: '#4be6ff', ambar: '#ffb938', 'ambar-claro': '#ffdc8a', violeta: '#c8b4ff', ok: '#5fe88f', mal: '#ff6f5e', blanco: '#ffffff',
};
export function paleta(el) {
  const cs = el && typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
  const p = {};
  for (const k of Object.keys(PALETA_DEF)) p[k] = (cs && cs.getPropertyValue('--mc-' + k).trim()) || PALETA_DEF[k];
  return p;
}
// Color #rrggbb con transparencia → rgba() (para trazos tenues del mismo tono que la paleta)
export function conAlfa(hex, a) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
  return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})` : hex;
}
