// Explicación del informe de vuelo (contrato-reloj.md §6): convierte los códigos compactos de resultado.fallos (despliegue.js)
// en viñetas "Causa → Decisión → Qué lo habría evitado", en el idioma pedido. Puro: no guarda nada, no usa DOM.
// explicarPuntos(resultado, D, idioma) → [{ tipo: 'suerte'|'decision'|'info', causa, decision, evitar, texto }]: de 1 a 5 puntos de causas y,
//   si hay reloj, uno final de presupuesto y plazo (tipo 'info'). 'suerte' = el fallo no dependía de una decisión (p. ej. un lanzamiento
//   que falló con un 95 % de éxito); 'decision' = había algo que el jugador pudo hacer distinto. `texto` = "causa → decisión → evitar".
//   Las barras en tolerancia (resultado.tolerancia) salen como puntos 'info': "Mass was 12 % over the limit: Launch failure chance +6 pp".
// explicarCausas(resultado, D, idioma) → [texto]: solo los textos (los usa el informe de papel).
const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
const arr = (x) => (Array.isArray(x) ? x : []);
const txt = (x, l, d = '') => (x == null ? d : typeof x === 'string' ? x : x[l] ?? x.en ?? x.es ?? d);
const pct = (x) => `${Math.round((Number(x) || 0) * 100)} %`;
const dpTxt = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(Math.round((Number(x) || 0) * 1000) / 10)} %`;
const MESES = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const MAX_VINETAS = 5;

// Textos por idioma. Cada función recibe los nombres ya traducidos.
const T = {
  es: {
    fase: (n, p, t) => `${n} falló (p ${p}, tirada ${String(t).replace('.', ',')})`,
    faseLeve: (n, p, t) => `${n} tuvo problemas (p ${p}, tirada ${String(t).replace('.', ',')})`,
    clima: (mes, s, ll, v, dp) => `lanzar en ${mes} desde ${s}, lluvia ${ll} mm/día y viento ${v} m/s: ${dp}`,
    espacio: (mes, k, dp) => `volar en ${mes}, con un ${k} de probabilidad de tormenta Kp ≥ 7: ${dp}`,
    conjuncion: (mes, a, d, dp) => `lanzar en ${mes}, con el ángulo Sol–Tierra–destino en ${a}° (${d} días por debajo de 5°): ${dp}`,
    sitio: (s, dp) => `el sitio ${s}: ${dp}`, ruta: (r, dp) => `la ruta ${r}: ${dp}`, otro: (r, dp) => `${r}: ${dp}`,
    tolerancia: (b, o, pp, f) => `${b} pasó un ${o} % del límite: probabilidad de fallo ${f ? `en ${f} ` : ''}+${pp} pp`,
    barra: { masa: 'La masa', potencia: 'La potencia', bateria: 'La batería', datos: 'El enlace de datos', presupuesto: 'El presupuesto', volumen: 'El volumen' },
    todasFases: 'todas las fases',
    suerte: (fallo) => `mala suerte: la fase tenía un ${fallo} de fallar`,
    sinMejora: (n, dp) => `se voló sin ${n} (${dp})`,
    lanzSuerte: (mes, s, ll) => `lanzar en ${mes} desde ${s} (lluvia ${ll} mm/día)`,
    evitar: {
      mesSeco: 'un mes con menos lluvia y viento en el sitio de lanzamiento', mesSolCalmo: 'un mes con el Sol más tranquilo',
      sinConjuncion: 'un mes sin el Sol entre la Tierra y el destino', otroSitio: 'un sitio con menos riesgo', otraRuta: 'otra ruta',
      recortar: 'dejar esa barra dentro de su límite', suerte: 'nada: siempre queda algo de riesgo', enlace: 'una antena mayor o más horas de enlace', plazo: 'lanzar dentro del plazo comprometido',
      mejora: (n) => `montar ${n}`, ct: (n) => `la contingencia ${n}`,
    },
    evento: (f, ev) => `${f}: ${ev}, sin mitigar`, sinCt: (n) => `no se llevó ${n}`, sinCtNinguna: 'ninguna contingencia lo cubre',
    tormenta: (k) => `Tormenta geomagnética (probabilidad ${k} ese mes)`, volarEn: (mes) => `volar en ${mes}`,
    datos: (mb) => `Se perdieron ${mb} MB de datos`, enlacePeq: 'el enlace era más pequeño que lo que producían los instrumentos',
    cancelada: 'Los inversores se retiraron', retraso: (n) => `el lanzamiento se retrasó ${n} meses sobre el compromiso`,
    nada: 'Ninguna fase falló: todas pasaron su prueba.',
    reloj: (mes, lz, plazo, r, c, b) => `Reloj: ${lz != null ? `lanzamiento en el mes ${lz}` : `mes ${mes}`} de un compromiso de ${plazo} meses`
      + (lz != null ? ` (diseño: ${mes} meses)` : '') + ` · retraso ${r} ${r === 1 ? 'mes' : 'meses'}`
      + ` · recorte de los inversores ${c}` + (b ? ` · bono por plazo ${b}` : ''),
  },
  en: {
    fase: (n, p, t) => `${n} failed (p ${p}, roll ${t})`,
    faseLeve: (n, p, t) => `${n} had problems (p ${p}, roll ${t})`,
    clima: (mes, s, ll, v, dp) => `launch in ${mes} from ${s}, rain ${ll} mm/day and wind ${v} m/s: ${dp}`,
    espacio: (mes, k, dp) => `fly in ${mes}, with ${k} odds of a Kp ≥ 7 storm: ${dp}`,
    conjuncion: (mes, a, d, dp) => `launch in ${mes}, with the Sun–Earth–target angle at ${a}° (${d} days under 5°): ${dp}`,
    sitio: (s, dp) => `the site ${s}: ${dp}`, ruta: (r, dp) => `the route ${r}: ${dp}`, otro: (r, dp) => `${r}: ${dp}`,
    tolerancia: (b, o, pp, f) => `${b} was ${o} % over the limit: ${f ? `${f} ` : ''}failure chance +${pp} pp`,
    barra: { masa: 'Mass', potencia: 'Power', bateria: 'Battery', datos: 'Data link', presupuesto: 'Budget', volumen: 'Volume' },
    todasFases: 'every phase',
    suerte: (fallo) => `bad luck: the phase had a ${fallo} chance of failing`,
    sinMejora: (n, dp) => `flew without ${n} (${dp})`,
    lanzSuerte: (mes, s, ll) => `launch in ${mes} from ${s} (rain ${ll} mm/day)`,
    evitar: {
      mesSeco: 'a month with less rain and wind at the launch site', mesSolCalmo: 'a month with a quieter Sun',
      sinConjuncion: 'a month without the Sun between Earth and the target', otroSitio: 'a less risky site', otraRuta: 'another route',
      recortar: 'keeping that bar within its limit', suerte: 'nothing: some risk always remains', enlace: 'a bigger antenna or more link hours', plazo: 'launching within the commitment',
      mejora: (n) => `mounting ${n}`, ct: (n) => `the ${n} contingency`,
    },
    evento: (f, ev) => `${f}: ${ev}, not mitigated`, sinCt: (n) => `${n} was not on board`, sinCtNinguna: 'no contingency covers it',
    tormenta: (k) => `Geomagnetic storm (${k} odds that month)`, volarEn: (mes) => `fly in ${mes}`,
    datos: (mb) => `${mb} MB of data were lost`, enlacePeq: 'the link was smaller than what the instruments produced',
    cancelada: 'Investors pulled out', retraso: (n) => `the launch slipped ${n} months past the commitment`,
    nada: 'No phase failed: every phase passed its check.',
    reloj: (mes, lz, plazo, r, c, b) => `Clock: ${lz != null ? `launch in month ${lz}` : `month ${mes}`} of a ${plazo}-month commitment`
      + (lz != null ? ` (design took ${mes} months)` : '') + ` · delay ${r} ${r === 1 ? 'month' : 'months'}`
      + ` · investor cut ${c}` + (b ? ` · commitment bonus ${b}` : ''),
  },
};

// Orden de gravedad: cancelación, fases críticas, eventos que fallan, fases no críticas, eventos, tormenta, datos.
function peso(f) {
  if (f.codigo === 'cancelada') return 0;
  if (f.codigo === 'fase') return f.critica ? 1 : 3;
  if (f.codigo === 'evento') return f.falla && f.critica ? 2 : 4;
  if (f.codigo === 'tormenta') return 5;
  return 6;
}

export function explicarPuntos(resultado, D, idioma = 'en') {
  const l = idioma === 'es' ? 'es' : 'en';
  const t = T[l];
  const r = obj(resultado);
  const m = obj(obj(D?.MISIONES)[r.mision]);
  const C = obj(D?.CALENDARIO);
  const nombreMes = (abs) => {
    if (!Number.isInteger(abs)) return '?';
    const nm = obj(C.NOMBRE_MES)[l] ?? MESES[l];
    return `${nm[abs % 12]} ${(C.ANIO0 ?? 2027) + Math.floor(abs / 12)}`;
  };
  const fase = (id) => txt(arr(m.fases).find((f) => f?.id === id)?.nombre, l, id ?? '?');
  const sitioLanz = (id) => txt(obj(C.SITIOS_LANZAMIENTO)[id]?.nombre, l, id ?? '?');
  const sitioPlan = (id) => txt(arr(obj(D?.PLANIFICACION)[m.id]?.sitios).find((s) => s?.id === id)?.nombre, l, id);
  const ruta = (id) => txt(arr(m.rutas).find((x) => x?.id === id)?.nombre, l, id);
  const cosa = (id) => txt(obj(D?.PIEZAS)[id]?.nombre ?? obj(D?.CONTINGENCIAS)[id]?.nombre, l, null) ?? ruta(id);
  const evitar = (cod) => {
    const E = t.evitar;
    if (typeof cod !== 'string') return E.suerte;
    if (cod.startsWith('mejora:')) return E.mejora(cosa(cod.slice(7)));
    if (cod.startsWith('ct:')) return E.ct(cosa(cod.slice(3)));
    return typeof E[cod] === 'string' ? E[cod] : E.suerte;
  };
  // Un aporte del desglose [fuente, ref, dp] con su decisión.
  const ppTxt = (dp) => Math.round(Math.abs(Number(dp) || 0) * 1000) / 10;
  const aporte = ([fuente, ref, dp], dec, faseId) => {
    const d = obj(dec), x = dpTxt(dp);
    // dp = 0,5 · (ratio − 1) (el presupuesto, la cuarta parte): se recupera cuánto se pasó la barra.
    if (fuente === 'tolerancia') return t.tolerancia(t.barra[ref] ?? ref, Math.round(Math.abs(dp) * (ref === 'presupuesto' ? 8 : 2) * 100), ppTxt(dp), faseId ? fase(faseId) : null);
    if (fuente === 'clima') return t.clima(nombreMes(d.mes), sitioLanz(d.sitio ?? ref), d.lluvia ?? '?', d.viento50 ?? '?', x);
    if (fuente === 'espacio') return t.espacio(nombreMes(d.mes ?? Number(ref)), pct(d.pKp7), x);
    if (fuente === 'conjuncion') return t.conjuncion(nombreMes(d.mes ?? Number(ref)), d.elong ?? '?', d.dias ?? '?', x);
    if (fuente === 'sitio') return t.sitio(sitioPlan(ref), x);
    if (fuente === 'ruta') return t.ruta(ruta(ref), x);
    return t.otro(cosa(ref) ?? ref, x);
  };

  const puntos = [];
  const punto = (tipo, causa, decision, evitar) => puntos.push({ tipo, causa, decision, evitar, texto: [causa, decision, evitar].filter((x) => x != null).join(' → ') });
  for (const f of arr(r.fallos).filter((x) => x && typeof x === 'object').sort((a, b) => peso(a) - peso(b))) {
    if (puntos.length >= MAX_VINETAS) break;
    if (f.codigo === 'fase') {
      const des = arr(f.desglose);
      const causa = (f.critica ? t.fase : t.faseLeve)(fase(f.fase), pct(f.p), f.tirada ?? '?');
      let decision;
      if (des.length && f.evitar !== 'suerte' && !String(f.evitar).startsWith('mejora:')) {
        decision = des.map((x) => aporte(x, f.decision, f.fase)).join('; ');
      } else if (String(f.evitar).startsWith('mejora:')) {
        // Una mejora de la fase sin montar habría bastado.
        decision = [t.sinMejora(cosa(f.evitar.slice(7)), dpTxt(f.decision?.dpMejora ?? 0)), ...des.map((x) => aporte(x, f.decision, f.fase))].join('; ');
      } else {
        // Fase que falló sin una mala decisión detrás: mala suerte, más los factores que hubo.
        const d = obj(f.decision);
        decision = [t.suerte(pct(1 - (Number(f.p) || 0))), d.mes != null && d.lluvia != null && !des.some((x) => x[0] === 'clima') ? t.lanzSuerte(nombreMes(d.mes), sitioLanz(d.sitio), d.lluvia) : null,
          ...des.map((x) => aporte(x, f.decision, f.fase))].filter(Boolean).join('; ');
      }
      punto(f.evitar === 'suerte' || f.evitar == null ? 'suerte' : 'decision', causa, decision, evitar(f.evitar));
    } else if (f.codigo === 'evento') {
      const ev = obj(D?.EVENTOS_MISION)[f.evento];
      const ct = String(f.evitar ?? '').startsWith('ct:') ? cosa(f.evitar.slice(3)) : null;
      punto(ct ? 'decision' : 'suerte', t.evento(fase(f.fase), txt(ev?.nombre, l, '?')), ct ? t.sinCt(ct) : t.sinCtNinguna, evitar(f.evitar));
    } else if (f.codigo === 'tormenta') {
      punto('decision', t.tormenta(pct(f.p)), t.volarEn(nombreMes(f.decision?.mes)), evitar(f.evitar));
    } else if (f.codigo === 'datos') {
      punto('decision', t.datos(f.mb), t.enlacePeq, evitar(f.evitar));
    } else if (f.codigo === 'cancelada') {
      punto('decision', t.cancelada, t.retraso(f.retraso ?? 0), evitar(f.evitar));
    }
  }
  if (!puntos.length) punto('info', t.nada, null, null);
  // Barras que pasaron la revisión en tolerancia: cuánto subieron el riesgo (también si la fase no llegó a fallar).
  for (const x of arr(r.tolerancia).filter((y) => y && typeof y === 'object')) {
    punto('info', t.tolerancia(t.barra[x.barra] ?? x.barra, Math.round(((Number(x.ratio) || 1) - 1) * 100), ppTxt(x.dp), x.todas ? t.todasFases : fase(x.fase)), null, null);
  }
  const rl = r.reloj;
  if (rl && typeof rl === 'object') punto('info', t.reloj(rl.mes, rl.lanzamiento ?? null, rl.plazo, rl.retraso ?? 0, pct(rl.recorte), rl.bono ? dpTxt(rl.bono) : ''), null, null);
  return puntos;
}

export const explicarCausas = (resultado, D, idioma = 'en') => explicarPuntos(resultado, D, idioma).map((p) => p.texto);

export default explicarCausas;
