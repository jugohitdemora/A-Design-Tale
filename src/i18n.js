// Idioma de la interfaz (es / en). Es un ajuste LOCAL de cada jugador: nunca va en el estado replicado.
//
// Contrato para todos los módulos:
//  - Textos de interfaz: cada módulo declara su tabla con las dos lenguas y la lee con textos():
//        const T = textos({ es: { hola: 'Hola', n: (x) => `${x} piezas` }, en: { hola: 'Hello', n: (x) => `${x} parts` } });
//        T.hola; T.n(3);
//    T siempre devuelve la lengua activa en el momento de leer (no hay que volver a crearlo al cambiar de idioma).
//    Si falta una clave en la lengua activa, se usa la otra.
//  - Campos bilingües de los datos ({ es, en } o texto plano): tx(campo).
//  - Al cambiar de idioma se emite el evento 'idioma' en window: quien pinte DOM fuera de pantallas/ debe escucharlo y repintar.
export const IDIOMAS = ['es', 'en'];

function inicial() {
  try {
    const v = JSON.parse(localStorage.getItem('idioma'));
    if (IDIOMAS.includes(v)) return v;
  } catch { /* sin almacenamiento */ }
  return (navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
}
let actual = inicial();

export const idioma = () => actual;

export function ponerIdioma(l) {
  if (!IDIOMAS.includes(l) || l === actual) return;
  actual = l;
  try { localStorage.setItem('idioma', JSON.stringify(l)); } catch { /* sin almacenamiento */ }
  document.documentElement.lang = l;
  dispatchEvent(new CustomEvent('idioma', { detail: l }));
}
document.documentElement.lang = actual;

const otra = (l) => (l === 'es' ? 'en' : 'es');

export function textos(tabla) {
  return new Proxy({}, {
    get(_, k) {
      const a = tabla[actual] ?? {}, b = tabla[otra(actual)] ?? {};
      return k in a ? a[k] : b[k];
    },
    has(_, k) { return k in (tabla.es ?? {}) || k in (tabla.en ?? {}); },
  });
}

// Campo bilingüe { es, en } (o texto plano) → texto en la lengua activa.
export function tx(x, porDefecto = '') {
  if (x == null) return porDefecto;
  if (typeof x === 'string' || typeof x === 'number') return String(x);
  return x[actual] ?? x[otra(actual)] ?? porDefecto;
}

// Nombres de los departamentos (roles). Los ids no cambian: vuelo, ciencia, potencia, comms.
const DEPTOS = textos({
  es: {
    largo: { vuelo: 'Departamento de Vuelo y Mecánica', ciencia: 'Departamento de Ciencia', potencia: 'Departamento de Energía', comms: 'Departamento de Comunicaciones y Operaciones' },
    corto: { vuelo: 'Vuelo y Mecánica', ciencia: 'Ciencia', potencia: 'Energía', comms: 'Comunicaciones y Operaciones' },
    sigla: { vuelo: 'VYM', ciencia: 'CIE', potencia: 'ENE', comms: 'COP' },
  },
  en: {
    largo: { vuelo: 'Flight & Mechanics Department', ciencia: 'Science Department', potencia: 'Power Department', comms: 'Communications & Operations Department' },
    corto: { vuelo: 'Flight & Mechanics', ciencia: 'Science', potencia: 'Power', comms: 'Comms & Ops' },
    sigla: { vuelo: 'FLM', ciencia: 'SCI', potencia: 'PWR', comms: 'COP' },
  },
});
export const depto = (rol, forma = 'corto') => DEPTOS[forma]?.[rol] ?? rol ?? '';
