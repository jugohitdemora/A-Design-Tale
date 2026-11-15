// Mission control wall: GO / NO-GO poll (checks from verificar(), four department signatures, launch).
import { textos } from '../i18n.js';
import { h, en, lista, ROLES_IDS, ROL_COLOR, nombreRol, puedoPor, conRol } from '../pantallas/ui.js';

const T = textos({
  es: { titulo: 'CONSULTA GO / NO-GO', checks: 'Comprobaciones', deptos: 'Departamentos', go: 'GO', nogo: 'NO-GO', espera: 'En espera', vacante: 'vacante',
    lanzar: 'LANZAR', volver: 'Volver al diseño', borra: 'Editar el diseño borra las firmas.', sinDatos: 'Sin datos de verificación.',
    falta: (x) => `Falta: ${x}`, arregla: (x) => `Arregla: ${x}` },
  en: { titulo: 'GO / NO-GO POLL', checks: 'Checks', deptos: 'Departments', go: 'GO', nogo: 'NO-GO', espera: 'Standing by', vacante: 'vacant',
    lanzar: 'LAUNCH', volver: 'Return to design', borra: 'Editing the design clears signatures.', sinDatos: 'No verification data.',
    falta: (x) => `Waiting for: ${x}`, arregla: (x) => `Fix: ${x}` },
});

export function pantallaGoNoGo(c) {
  let v = null;
  try { v = c.motor?.verificar && c.mision ? c.motor.verificar(c.e, c.D) : null; } catch (err) { console.error('verificar', err); }
  const comps = lista(v?.comprobaciones);
  const firmas = c.e?.firmas ?? {};
  const faltan = ROLES_IDS.filter((r) => !firmas[r]);
  const puedeLanzar = !!v?.pasa && faltan.length === 0;
  const fallo = comps.find((k) => !k.ok);

  let linea = '';
  if (!puedeLanzar) {
    if (fallo) linea = T.arregla(en(fallo.texto) || fallo.id);
    else if (faltan.length) linea = T.falta(faltan.map(nombreRol).join(', '));
    else linea = T.sinDatos;
  }

  const tablero = h('section', { class: 'gng-grupo gng-checks' }, h('h3', {}, T.checks),
    comps.length
      ? h('ul', { class: 'gng-lista', 'data-scroll': 'gng-checks' }, comps.map((k) => h('li', { class: k.ok ? 'ok' : 'mal' },
        h('i', { class: 'gng-luz' }), h('b', {}, k.ok ? T.go : T.nogo), h('span', {}, en(k.texto) || k.id))))
      : h('p', { class: 'gng-nota' }, T.sinDatos));

  const consolas = h('div', { class: 'gng-consolas' });
  for (const r of ROLES_IDS) {
    const on = !!firmas[r];
    const j = Object.values(c.e?.jugadores ?? {}).find((x) => x.rol === r && x.conectado);
    consolas.append(h('div', { class: 'gng-consola' + (on ? ' on' : ''), style: `--rol:${ROL_COLOR[r]}` },
      h('b', { class: 'gng-depto' }, nombreRol(r)),
      h('small', {}, j ? j.nick : T.vacante),
      h('button', { class: 'gng-toggle', type: 'button', disabled: !puedoPor(c, r), 'aria-pressed': String(on),
        onclick: () => c.enviar('firmar', conRol(c, r, { on: !on })) }, on ? T.go : T.espera)));
  }
  const deptos = h('section', { class: 'gng-grupo gng-deptos' }, h('h3', {}, T.deptos), consolas, h('p', { class: 'gng-nota' }, T.borra));

  const lanzar = h('section', { class: 'gng-grupo gng-lanzar' },
    h('button', { class: 'gng-lanzar-btn', type: 'button', disabled: !puedeLanzar, onclick: () => c.enviar('lanzar', {}) }, T.lanzar),
    h('p', { class: 'gng-falta' + (puedeLanzar ? ' ok' : '') }, puedeLanzar ? T.go : linea),
    h('button', { class: 'gng-volver', type: 'button', onclick: () => c.enviar('cambiarFase', { fase: 'diseno' }) }, T.volver));

  return h('div', { class: 'gng' }, h('h2', { class: 'gng-titulo' }, T.titulo), h('div', { class: 'gng-cuerpo' }, tablero, deptos, lanzar));
}
