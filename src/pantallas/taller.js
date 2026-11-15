// Workshop screen (phases `diseno` and `restricciones`): tabs + parts list + blueprint + global panel.
import { T } from '../textos.js';
import { h, en, lista, valor, redondear, panelVacio, ROLES_IDS, ROL_COLOR, nombreRol, puedoPor, rolesQuePuedo, conRol, piezasMontadas, resumenSeguro } from './ui.js';
import { panelGlobal } from './panel-global.js';
import { pestanaCohete } from './cohete.js';
import { pestanaRuta } from './ruta.js';
import { pestanaRiesgos } from './riesgos.js';

const TABS = ['taller', 'cohete', 'ruta', 'riesgos'];

function datosOpcion(c, op) {
  if (!op) return h('div', { class: 'tenue' }, T.noData);
  const fila = (et, x, u) => h('span', { class: 'dato' }, h('small', {}, et), valor(c, x, u));
  const aporta = op.aporta && typeof op.aporta === 'object'
    ? Object.entries(op.aporta).filter(([, x]) => x != null).map(([k, x]) => h('span', { class: 'aporta' }, '+', valor(c, x, ''), ' ', T.aporta[k] ?? k))
    : [];
  return h('div', { class: 'datos-op' },
    h('div', { class: 'datos-fila' }, fila(T.mass, op.masa, 'kg'), fila(T.power, op.potencia, 'W'), fila(T.price, op.precio, 'M USD'), fila(T.rate, op.tasa, 'kbps'), fila(T.volume, op.volumen, 'L')),
    aporta.length ? h('div', { class: 'aporta-fila' }, aporta) : null);
}

function aQuienSirve(c, pieza) {
  const objs = lista(c.mision?.objetivos).filter((o) => lista(o.requiere).includes(pieza.id));
  return objs.length ? h('div', { class: 'sirve' }, T.contribTo, ': ', objs.map((o) => en(o.nombre) || o.id).join(', ')) : null;
}

function selectorOpcion(pieza, actual, onchange) {
  const s = h('select', { 'aria-label': T.option, onchange: (ev) => onchange(ev.target.value) },
    lista(pieza.opciones).map((o) => h('option', { value: o.id }, `${T.option} ${o.id}${en(o.nombre) ? ' - ' + en(o.nombre) : ''}`)));
  s.value = actual;
  return s;
}

// ---- left column: parts of the active role ----
function columnaPiezas(c, rol, restr) {
  const montadas = piezasMontadas(c, rol);
  const editable = puedoPor(c, rol);
  const cuerpo = h('div', { class: 'lista-piezas', 'data-scroll': 'piezas' });
  const todas = lista(c.D?.PIEZAS).filter((p) => p && p.rol === rol
    && (lista(p.misiones).includes(c.mision.id) || lista(c.mision.piezas).includes(p.id)));
  if (!todas.length) cuerpo.append(panelVacio(T.noParts));
  for (const p of todas) {
    const m = montadas[p.id];
    const opId = c.ui.op[p.id] ?? m?.op ?? p.opciones?.[0]?.id;
    const op = lista(p.opciones).find((o) => o.id === opId) ?? p.opciones?.[0];
    cuerpo.append(h('div', { class: 'pieza' + (m ? ' montada' : '') },
      h('div', { class: 'pieza-cab' }, h('b', {}, en(p.nombre) || p.id), h('small', { class: 'tenue' }, T.categories?.[p.categoria] ?? p.categoria ?? '')),
      en(p.desc) ? h('div', { class: 'tenue pequeno' }, en(p.desc)) : null,
      lista(p.opciones).length > 1 ? selectorOpcion(p, opId, (v) => {
        c.ui.op[p.id] = v;
        if (m && editable) c.enviar('montar', conRol(c, rol, { pieza: p.id, op: v, uso: m.uso }));
        else c.repintar();
      }) : null,
      datosOpcion(c, op),
      aQuienSirve(c, p),
      h('div', { class: 'acciones izq' },
        m ? h('span', { class: 'etq ok' }, T.mounted)
          : h('button', {
            class: 'btn-plano', type: 'button', disabled: !editable || restr || !op,
            title: restr ? T.addDisabled : undefined,
            onclick: () => c.enviar('montar', conRol(c, rol, { pieza: p.id, op: opId, uso: p.uso?.def ?? 24 })),
          }, T.mount))));
  }
  return h('section', { class: 'caja col-piezas' }, h('h3', {}, T.partsList(nombreRol(rol))), cuerpo);
}

// ---- centre: blueprint with everything mounted by the four roles ----
function loteRol(c, rol, activo) {
  const montadas = piezasMontadas(c, rol);
  const editable = puedoPor(c, rol);
  const ids = Object.keys(montadas);
  const caja = h('div', { class: 'lote' + (rol === activo ? ' activo' : ' ajeno'), style: `--rol:${ROL_COLOR[rol]}` },
    h('div', { class: 'lote-cab' }, h('b', {}, nombreRol(rol)), !editable ? h('small', {}, ' · ', T.readOnly) : null));
  if (!ids.length) { caja.append(h('p', { class: 'tenue pequeno' }, '-')); return caja; }
  for (const id of ids) {
    const m = montadas[id] ?? {};
    const p = c.D?.PIEZAS?.[id];
    const op = lista(p?.opciones).find((o) => o.id === m.op) ?? p?.opciones?.[0];
    const baldosa = h('div', { class: 'baldosa', 'data-pieza': id },
      h('div', { class: 'baldosa-cab' }, h('b', {}, en(p?.nombre) || id)));
    if (editable) {
      if (p && lista(p.opciones).length > 1) baldosa.append(selectorOpcion(p, m.op, (v) => c.enviar('montar', conRol(c, rol, { pieza: id, op: v, uso: m.uso }))));
      if (p?.uso) {
        const lbl = h('span', { class: 'uso-valor' }, `${m.uso ?? p.uso.def} h`);
        const rng = h('input', {
          type: 'range', min: p.uso.min ?? 0, max: p.uso.max ?? 24, step: 1, value: m.uso ?? p.uso.def, 'aria-label': T.usage,
          oninput: (ev) => { lbl.textContent = `${ev.target.value} h`; },
          onchange: (ev) => c.enviar('montar', conRol(c, rol, { pieza: id, op: m.op, uso: Number(ev.target.value) })),
        });
        baldosa.append(h('label', { class: 'uso' }, h('small', {}, T.usage), rng, lbl));
      } else baldosa.append(h('small', { class: 'tenue' }, T.alwaysOn));
      baldosa.append(h('button', { class: 'btn-plano peligro', type: 'button', onclick: () => c.enviar('quitar', conRol(c, rol, { pieza: id })) }, T.remove));
    } else {
      baldosa.append(h('small', { class: 'tenue' }, `${T.option} ${m.op ?? '?'}${p?.uso ? ` · ${m.uso ?? '?'} h/day` : ''}`));
    }
    baldosa.append(datosOpcion(c, op));
    caja.append(baldosa);
  }
  return caja;
}

function plano(c, activo) {
  const hoja = h('div', { class: 'hoja' }, h('h3', {}, T.blueprint));
  const todos = ROLES_IDS.map((r) => loteRol(c, r, activo));
  const vacio = ROLES_IDS.every((r) => !Object.keys(piezasMontadas(c, r)).length);
  if (vacio) hoja.append(h('p', { class: 'vacio' }, T.blueprintEmpty));
  hoja.append(h('div', { class: 'lotes' }, todos));
  return h('section', { class: 'caja plano', 'data-scroll': 'plano' }, hoja);
}

function selectorRol(c, activo) {
  const puedo = rolesQuePuedo(c);
  if (puedo.length < 2) return null;
  return h('div', { class: 'selector-rol' }, h('span', { class: 'tenue pequeno' }, T.actingAs),
    puedo.map((r) => h('button', {
      class: 'btn-plano' + (r === activo ? ' primario' : ''), type: 'button',
      onclick: () => { c.ui.rolActivo = r; c.repintar(); },
    }, nombreRol(r), r !== c.rol ? ` (${T.vacant})` : '')));
}

function avisoRestricciones(c, res) {
  const caja = h('div', { class: 'banner restr' }, h('b', {}, T.constraintsTitle), h('p', { class: 'pequeno' }, T.constraintsLead));
  const mal = ['masa', 'potencia', 'bateria', 'datos', 'presupuesto', 'volumen'].filter((id) => res?.barras?.[id] && res.barras[id].estado !== 'ok');
  if (!mal.length) caja.append(h('p', { class: 'ok-txt' }, T.nothingOver));
  const ul = h('ul', {});
  for (const id of mal) {
    const b = res.barras[id];
    const pct = redondear(((b.limite > 0 ? b.usado / b.limite : 9) - 1) * 100, 0);
    ul.append(h('li', { class: b.estado }, T.over(T.bars[id], redondear(b.usado, 1), redondear(b.limite, 1), pct, T.units[id])));
  }
  caja.append(ul);
  return caja;
}

function lineaEstado(c, res) {
  if (!res || !c.motor?.cumple) return null;
  let nivel; try { nivel = c.motor.cumple(res)?.nivel; } catch { return null; }
  return nivel ? h('div', { class: 'banner estado-' + nivel }, T.designStatus[nivel] ?? nivel) : null;
}

export function pantallaTaller(c, restr) {
  const res = resumenSeguro(c);
  const mine = rolesQuePuedo(c);
  const activo = mine.includes(c.ui.rolActivo) ? c.ui.rolActivo : (c.rol ?? 'vuelo');
  const tab = TABS.includes(c.ui.tab) ? c.ui.tab : 'taller';

  const tabs = h('nav', { class: 'tabs', role: 'tablist' }, TABS.map((t) => h('button', {
    class: 'tab' + (t === tab ? ' activa' : ''), type: 'button', role: 'tab', 'aria-selected': String(t === tab),
    onclick: () => { c.ui.tab = t; c.repintar(); },
  }, T.tabs[t])));

  let centro;
  if (tab === 'taller') {
    centro = h('div', { class: 'dos-col' }, columnaPiezas(c, activo, restr), plano(c, activo));
  } else {
    centro = tab === 'cohete' ? pestanaCohete(c) : tab === 'ruta' ? pestanaRuta(c) : pestanaRiesgos(c, res);
  }
  return h('div', { class: 'taller' },
    tabs,
    restr ? avisoRestricciones(c, res) : lineaEstado(c, res),
    tab === 'taller' ? selectorRol(c, activo) : null,
    h('div', { class: 'cuerpo-taller' }, centro, panelGlobal(c, res, { revision: true })));
}
