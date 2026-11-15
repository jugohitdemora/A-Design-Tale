// Prueba barata de equilibrio: monta el diseño de referencia de cada misión jugable (opción `referencia` o la primera,
// uso por defecto, primer cohete y primera ruta, sin contingencias) y devuelve las barras (uso/límite) y la simulación.
// Uso en la consola del navegador:  (await import('/herramientas/simular.js')).simularTodas()
import { DATOS as D } from '../src/datos/index.js';
import { estadoInicial } from '../src/red/protocolo.js';
import { resumen, cumple } from '../src/reglas/motor.js';
import { simular } from '../src/reglas/despliegue.js';

export function estadoReferencia(id, { cohete = 0, ruta = 0, semilla = 7 } = {}) {
  const m = D.MISIONES[id];
  const e = estadoInicial();
  e.semilla = semilla;
  e.mision = { escenario: m.escenario, id, dificultad: 'normal' };
  for (const pid of m.piezas) {
    const p = D.PIEZAS[pid];
    const op = (p.opciones.find((o) => o.referencia) ?? p.opciones[0]).id;
    e.porRol[p.rol].piezas[pid] = { op, uso: p.uso?.def ?? null };
  }
  e.porRol.vuelo.cohete = m.cohetes[cohete];
  e.porRol.vuelo.ruta = m.rutas[ruta]?.id ?? null;
  return e;
}

export function simularTodas(opciones) {
  const filas = {};
  for (const esc of D.ESCENARIOS) for (const id of esc.misiones) {
    if (!D.MISIONES[id]) { filas[id] = 'falta'; continue; }
    try {
      const e = estadoReferencia(id, opciones);
      const r = resumen(e, D);
      const barras = Object.fromEntries(Object.entries(r.barras).map(([k, b]) => [k, `${Math.round(b.usado)}/${Math.round(b.limite)} (${Math.round(100 * (b.ratio ?? 0))} % ${b.estado})`]));
      let sim = null;
      try {
        const s = simular(e, D);
        sim = { veredicto: s?.veredicto, puntos: Math.round(s?.puntos ?? 0), hallazgos: s?.hallazgos?.length, dias: `${s?.diasConseguidos}/${s?.diasPrevistos}`, pasos: (s?.pasos ?? []).map((x) => `${x.id ?? x.fase}:${x.ok === false ? 'X' : 'ok'}`).join(' ') };
      } catch (err) { sim = 'error: ' + err.message; }
      filas[id] = { barras, cumple: cumple(r).nivel, ciencia: JSON.stringify(r.ciencia).slice(0, 160), sim };
    } catch (err) { filas[id] = 'error: ' + err.message; }
  }
  return filas;
}
