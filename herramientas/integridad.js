// Comprobación de integridad de los datos de las misiones jugables. Uso en la consola del navegador (servidor local):
//   (await import('/herramientas/integridad.js')).comprobar()   → lista de problemas ([] = todo bien)
import { DATOS } from '../src/datos/index.js';

const bil = (x) => x && typeof x === 'object' && typeof x.es === 'string' && typeof x.en === 'string' && x.es && x.en;
const num = (x) => x && typeof x === 'object' && 'conf' in x && (typeof x.v === 'number' || typeof x.juego === 'number');

export async function comprobar({ archivos = true } = {}) {
  const D = DATOS, P = [];
  const mal = (m, t) => P.push(`${m}: ${t}`);
  const src = (m, s, donde) => { if (s && !D.FUENTES[s] && !['EQ-DENS', 'EQ-BAT', 'EQ-C13'].includes(s) && !/^GAP-/.test(s)) mal(m, `fuente ${s} no existe (${donde})`); };
  for (const e of D.ESCENARIOS) {
    if (e.misiones.length !== 3) mal(e.id, `tiene ${e.misiones.length} misiones`);
    for (const id of e.misiones) {
      const m = D.MISIONES[id];
      if (!m) { mal(e.id, `falta la misión ${id}`); continue; }
      if (!m.jugable) mal(id, 'no es jugable');
      if (m.escenario !== e.id) mal(id, `escenario ${m.escenario} ≠ ${e.id}`);
      for (const k of ['cuerpo', 'nombre', 'apertura', 'brief']) if (!bil(m[k])) mal(id, `${k} sin es/en`);
      for (const c of m.referencia?.cifras ?? []) { if (!c.es || !c.en) mal(id, 'cifra sin es/en'); src(id, c.src, 'cifra'); }
      if (!num(m.presupuesto)) mal(id, 'presupuesto');
      const pz = new Set(m.piezas);
      for (const p of m.piezas) {
        const x = D.PIEZAS[p];
        if (!x) { mal(id, `pieza ${p} no existe`); continue; }
        for (const k of ['nombre', 'desc', 'usoPara']) if (!bil(x[k])) mal(id, `pieza ${p}.${k} sin es/en`);
        if (!['vuelo', 'ciencia', 'potencia', 'comms'].includes(x.rol)) mal(id, `pieza ${p} rol ${x.rol}`);
        for (const o of x.opciones ?? []) {
          if (!bil(o.nombre)) mal(id, `opción ${p}/${o.id} nombre`);
          for (const k of ['masa', 'potencia', 'volumen', 'tasa', 'precio']) { if (!num(o[k])) mal(id, `opción ${p}/${o.id}.${k}`); else src(id, o[k].src, `${p}.${k}`); }
          for (const [k, v] of Object.entries(o.aporta ?? {})) if (!num(v)) mal(id, `aporta ${p}.${k}`);
          for (const t of [...(o.pros ?? []), ...(o.contras ?? [])]) if (!bil(t)) mal(id, `pros/contras ${p}/${o.id}`);
        }
      }
      const roles = new Set(m.piezas.map((p) => D.PIEZAS[p]?.rol));
      for (const r of ['vuelo', 'ciencia', 'potencia', 'comms']) if (!roles.has(r)) mal(id, `ningún taller para ${r}`);
      const aporta = new Set(m.piezas.flatMap((p) => (D.PIEZAS[p]?.opciones ?? []).flatMap((o) => Object.keys(o.aporta ?? {}))));
      for (const k of ['volumen', 'potencia', 'bajada']) if (!aporta.has(k)) mal(id, `ninguna pieza aporta ${k}`);
      const ct = new Set(m.contingencias);
      const ids = new Set([...pz, ...ct]);
      const fases = new Set(m.fases.map((f) => f.id));
      for (const o of m.objetivos) {
        if (!bil(o.nombre) || !bil(o.datoReal)) mal(id, `objetivo ${o.id} sin es/en`);
        for (const r of o.requiere) if (!pz.has(r)) mal(id, `objetivo ${o.id} requiere ${r} fuera de la misión`);
        src(id, o.src, o.id);
      }
      if (m.objetivos.filter((o) => o.prioridad).length !== 1) mal(id, 'debe haber 1 objetivo prioritario');
      for (const f of m.fases) { if (!bil(f.nombre)) mal(id, `fase ${f.id}`); for (const x of f.mejoras) if (!ids.has(x.por)) mal(id, `mejora de ${f.id} por ${x.por} desconocido`); }
      for (const r of m.rutas) { if (!bil(r.nombre)) mal(id, `ruta ${r.id}`); if (r.efecto && !fases.has(r.efecto.fase)) mal(id, `ruta ${r.id} fase ${r.efecto.fase}`); }
      for (const k of m.cohetes) { const c = D.COHETES[k]; if (!c) mal(id, `cohete ${k}`); else if (!num(c.capacidad?.[m.destino])) mal(id, `cohete ${k} sin capacidad a ${m.destino}`); }
      for (const e2 of m.eventosDiseno) { const x = D.EVENTOS_DISENO[e2]; if (!x) mal(id, `evento de diseño ${e2}`); else { if (!bil(x.nombre) || !bil(x.texto)) mal(id, `${e2} sin es/en`); src(id, x.src, e2); } }
      for (const e2 of m.eventosMision) {
        const x = D.EVENTOS_MISION[e2];
        if (!x) { mal(id, `evento ${e2}`); continue; }
        if (!fases.has(x.fase)) mal(id, `${e2} fase ${x.fase}`);
        if (!bil(x.nombre) || !bil(x.texto) || !bil(x.leccion)) mal(id, `${e2} sin es/en`);
        for (const c of x.mitigadoPor) { if (!ct.has(c)) mal(id, `${e2} mitigado por ${c} fuera`); else if (!D.CONTINGENCIAS[c]?.mitiga.includes(e2)) mal(id, `${c} no mitiga ${e2} (simetría)`); }
        src(id, x.src, e2);
      }
      for (const c of m.contingencias) { const x = D.CONTINGENCIAS[c]; if (!x) mal(id, `contingencia ${c}`); else if (!bil(x.nombre)) mal(id, `${c} sin es/en`); }
      for (const v of m.verificacion) { if (!bil(v.texto)) mal(id, `verificación ${v.id}`); if (v.pieza && !pz.has(v.pieza)) mal(id, `verificación ${v.id} pieza`); }
      for (const h of m.oculto ?? []) { for (const d of h.detecta) if (!pz.has(d)) mal(id, `${h.id} detecta ${d}`); if (!bil(h.nombre) || !bil(h.casoReal)) mal(id, `${h.id} sin es/en`); }
      if (m.puntuacion === 'oculto' && !(m.oculto?.length)) mal(id, 'puntuación oculto sin hallazgos');
      const plan = D.PLANIFICACION[id];
      if (!plan) mal(id, 'sin planificación');
      else {
        for (const c of plan.capas ?? []) if (c.mapa && !D.MAPAS[c.mapa]) mal(id, `capa ${c.id} mapa ${c.mapa}`);
        if (!D.MAPAS[plan.mapa?.base]) mal(id, `mapa base ${plan.mapa?.base}`);
        for (const s of plan.sitios ?? []) {
          if (!bil(s.nombre)) mal(id, `sitio ${s.id}`);
          for (const f of s.efectos?.fases ?? []) if (!fases.has(f.fase)) mal(id, `sitio ${s.id} fase ${f.fase}`);
          for (const o of Object.keys(s.efectos?.ciencia ?? {})) if (!m.objetivos.some((x) => x.id === o)) mal(id, `sitio ${s.id} objetivo ${o}`);
        }
        if (!fases.has(plan.lanzamiento?.fase)) mal(id, `lanzamiento fase ${plan.lanzamiento?.fase}`);
      }
    }
  }
  if (archivos) for (const [k, x] of Object.entries(D.MAPAS)) {
    const r = await fetch('/' + x.archivo, { method: 'HEAD' }).catch(() => null);
    if (!r?.ok) mal('mapa', `${k}: falta ${x.archivo}`);
  }
  return P;
}
