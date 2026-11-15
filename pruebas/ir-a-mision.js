// Atajo de pruebas: en ?local=1, pega en la consola `await (await import('/pruebas/ir-a-mision.js')).irA('MER-3', 'control')`
// para saltar a la fase de diseño de una misión con un rol, y mirar el portátil ('laptop') o la pared de control ('control').
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export async function irA(id, vista = 'control', rol = 'vuelo') {
  const d = window.__depurar;
  if (!d) throw new Error('Abre el juego con ?local=1');
  for (let i = 0; i < 40 && !d.sesion()?.estado; i++) {
    if (!d.sesion()) document.getElementById('btn-unirse')?.click(), document.getElementById('form-unirse')?.requestSubmit();
    await espera(150);
  }
  const s = d.sesion();
  const e = () => s.estado;
  if (!s.yo()?.rol) s.intentar('elegirRol', { rol });
  await espera(100);
  if (e().fase === 'lobby') s.intentar('iniciarMision');
  await espera(100);
  const { MISIONES } = await import('/src/datos/misiones.js');
  const m = MISIONES[id];
  if (!m) throw new Error('Misión desconocida: ' + id);
  if (e().fase === 'briefing') {
    s.intentar('elegirMision', { escenario: m.escenario });
    await espera(80);
    s.intentar('elegirMision', { id });
    await espera(80);
    s.intentar('listo', { on: true });
    await espera(300);
  }
  // 'control' desde otra sala solo te sienta en la sala de control; la segunda llamada encuadra la pared.
  for (let i = 0; i < 3 && !(d.estadoVista().vista === vista && d.estadoVista().pantallaLista); i++) {
    d.irA(vista);
    for (let k = 0; k < 20 && !d.estadoVista().pantallaLista; k++) await espera(250);
  }
  return { fase: e().fase, mision: e().mision?.id, avisos: s.ultimoAviso ?? null };
}
