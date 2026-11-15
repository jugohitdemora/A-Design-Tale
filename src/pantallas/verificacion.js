// Verification: checklist from verificar(), four signatures, launch.
import { T } from '../textos.js';
import { h, en, lista, ROLES_IDS, ROL_COLOR, nombreRol, puedoPor, conRol, vacante, resumenSeguro } from './ui.js';
import { panelGlobal } from './panel-global.js';

export function pantallaVerificacion(c) {
  const res = resumenSeguro(c);
  let v = null;
  try { v = c.motor?.verificar && c.mision ? c.motor.verificar(c.e, c.D) : null; } catch (err) { console.error('verificar', err); }
  const comps = lista(v?.comprobaciones);
  const firmas = c.e?.firmas ?? {};
  const todasFirmadas = ROLES_IDS.every((r) => firmas[r]);
  const puedeLanzar = !!v?.pasa && todasFirmadas;

  const checks = h('section', { class: 'caja' }, h('h3', {}, T.verifTitle), h('p', { class: 'tenue pequeno' }, T.verifLead), h('h4', {}, T.checks));
  const ul = h('ul', { class: 'checks' });
  for (const k of comps) ul.append(h('li', { class: k.ok ? 'ok' : 'mal' }, h('b', { class: 'etq ' + (k.ok ? 'ok' : 'mal') }, k.ok ? T.pass : T.fail), ' ', en(k.texto) || '—'));
  checks.append(comps.length ? ul : h('p', { class: 'tenue vacio' }, c.mision ? T.noData : T.noMission));

  const firmasEl = h('div', { class: 'firmas' });
  for (const r of ROLES_IDS) {
    const on = !!firmas[r];
    const j = Object.values(c.e?.jugadores ?? {}).find((x) => x.rol === r && x.conectado);
    firmasEl.append(h('button', {
      class: 'firma' + (on ? ' firmada' : ''), type: 'button', style: `--rol:${ROL_COLOR[r]}`, disabled: !puedoPor(c, r),
      'aria-pressed': String(on),
      onclick: () => c.enviar('firmar', conRol(c, r, { on: !on })),
    }, h('b', {}, nombreRol(r)), h('small', {}, j ? j.nick : T.vacant), h('span', {}, on ? `${T.signed} ✓ (${T.unsign})` : T.sign)));
  }
  checks.append(h('h4', {}, T.signatures), firmasEl, h('p', { class: 'tenue pequeno' }, T.signHint));
  checks.append(h('div', { class: 'acciones' },
    h('button', { class: 'btn-plano', type: 'button', onclick: () => c.enviar('cambiarFase', { fase: 'diseno' }) }, T.backToDesign),
    h('button', { class: 'btn-plano primario', type: 'button', disabled: !puedeLanzar, title: puedeLanzar ? undefined : T.launchHint, onclick: () => c.enviar('lanzar', {}) }, T.launch)));

  return h('div', { class: 'taller' }, h('div', { class: 'cuerpo-taller una' }, checks, panelGlobal(c, res)));
}
