// Ayudas compartidas para escribir una misión en su propio archivo (src/datos/misiones-nuevas/*.js).
// Mismas convenciones que piezas.js, misiones.js y eventos.js, pero con textos bilingües desde el principio: N(es, en).
//
// Números: { v, conf, src } y, si v es null, `juego` con el número de diseño (el motor usa x.v ?? x.juego ?? 0).
//   V = leído en la fuente citada; A = fuente secundaria; INF = decisión de diseño; JUEGO = sin dato (se muestra con ≈);
//   EST = estimación con ecuación citada (`ec` {es,en}). Los precios de los md del equipo son hipotéticos: van como J(...).

export const N = (es, en = es) => ({ es, en });
export const R = (v, conf, src) => ({ v, conf, src });
export const V = (v, src) => R(v, 'V', src);
export const A = (v, src) => R(v, 'A', src);
export const I = (v, src = 'JUEGO') => R(v, 'INF', src);
export const J = (juego, src = 'JUEGO') => ({ v: null, conf: 'JUEGO', src, juego });
export const EST = (valor, src, ec) => ({ v: null, conf: 'EST', src, juego: valor, ec });
export const Z = () => I(0);

// Volumen de un instrumento (C3, ρ = 230 kg/m3).
export const VOL = (kg, l) => EST(l, 'EQ-DENS', N(
  `V ≈ M ÷ ρ = ${String(kg).replace('.', ',')} kg ÷ 0,23 kg/L ≈ ${l} L (ρ ≈ 230 kg/m3, mediana de LEXI, ALICE y MERTIS)`,
  `V ≈ M ÷ ρ = ${kg} kg ÷ 0.23 kg/L ≈ ${l} L (ρ ≈ 230 kg/m3, median of LEXI, ALICE and MERTIS)`));
// Masa de una batería (C11): m = E / (DoD × e), e = 150 Wh/kg.
export const BAT = (wh, dod, kg) => EST(kg, 'EQ-BAT', N(
  `m = E ÷ (DoD × e) = ${wh} Wh ÷ (${String(dod).replace('.', ',')} × 150 Wh/kg) ≈ ${kg} kg (pack de ion-litio, 150-250 Wh/kg)`,
  `m = E ÷ (DoD × e) = ${wh} Wh ÷ (${dod} × 150 Wh/kg) ≈ ${kg} kg (Li-ion pack, 150-250 Wh/kg)`));

// Pros y contras: P(['es', 'en'], ...).
export const P = (...pares) => pares.map(([es, en]) => N(es, en));
export const ON = null;
export const USO = (def, max = 24) => ({ min: 0, max, def });

// Opción de una pieza. `referencia: true` = fue la real (la UI no lo muestra).
export const opc = (id, nombre, o = {}, pros = [], contras = []) => ({
  id, nombre: N(nombre[0], nombre[1]),
  masa: o.masa ?? Z(), potencia: o.potencia ?? Z(), volumen: o.volumen ?? Z(), tasa: o.tasa ?? Z(), precio: o.precio ?? Z(),
  aporta: o.aporta ?? {}, pros, contras,
  ...(o.referencia ? { referencia: true } : {}),
});
// pz(id, rol, categoria, [es,en] nombre, [es,en] descripción, [es,en] usoPara, misiones, extra, opciones)
export const pz = (id, rol, categoria, nombre, desc, usoPara, misiones, extra, opciones) => ({
  id, rol, categoria, nombre: N(nombre[0], nombre[1]), desc: N(desc[0], desc[1]), usoPara: N(usoPara[0], usoPara[1]), misiones,
  enSombra: extra.enSombra ?? false, uso: extra.uso ?? null, opciones,
});

// Eventos y contingencias (mismo formato que eventos.js). Textos: [es, en].
const B = (x) => N(x[0], x[1]);
export const ed = (id, signo, nombre, texto, efecto, casoReal, src) => ({ id, signo, nombre: B(nombre), texto: B(texto), efecto, casoReal: B(casoReal), src });
export const em = (id, signo, fase, p, nombre, texto, efecto, mitigadoPor, casoReal, leccion, src) =>
  ({ id, signo, fase, p, nombre: B(nombre), texto: B(texto), efecto, mitigadoPor, casoReal: B(casoReal), leccion: B(leccion), src });
export const ct = (id, rol, nombre, texto, masa, precio, mitiga) => ({ id, rol, nombre: B(nombre), texto: B(texto), masa: I(masa), precio: I(precio), mitiga });

// Fuente bilingüe (formato de fuentes.js).
export const F = (tEs, tEn, url, [aEs, aEn], conf, nota = null) => ({
  titulo: N(tEs, tEn), url, agencia: N(aEs, aEn), conf, ...(nota ? { nota: N(nota[0], nota[1]) } : {}), fecha: '2026-11-15',
});
