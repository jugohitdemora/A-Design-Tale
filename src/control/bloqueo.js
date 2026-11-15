// Aviso de bloqueo por rol: texto visible junto al control (y tooltip) cuando algo está desactivado porque no es de tu departamento.
// Uso: avisoBloqueo(`Solo ${depto('vuelo')} puede cambiar el mes de lanzamiento`) → <p class="mc-bloqueo">🔒 …</p>
import { h } from '../pantallas/ui.js';

export function avisoBloqueo(texto) {
  return h('p', { class: 'mc-bloqueo', role: 'note', title: texto }, h('span', { 'aria-hidden': 'true' }, '🔒 '), texto);
}
