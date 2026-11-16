// Créditos y fuentes (diálogo de la pantalla de inicio): de dónde salen las imágenes reales, los datos de la NASA y las
// herramientas que inspiraron el juego (GMAT). Todo se genera desde src/datos: añadir un mapa o una misión lo añade aquí.
import { DATOS } from './datos/index.js';
import { textos, tx } from './i18n.js';
import { INVERSORES, TI } from './inversores.js';

const T = textos({
  es: {
    titulo: 'Créditos y fuentes', boton: 'CRÉDITOS', cerrar: 'Cerrar',
    intro: 'Las imágenes de los mapas son reales y vienen de agencias espaciales. Las cifras marcadas con ≈ son valores de juego; el resto se leyó en la fuente citada.',
    imagenes: 'Imágenes y mapas reales', misiones: 'Misiones reales de referencia', datos: 'Datos y herramientas de la NASA',
    licencia: 'Licencia', abrir: 'Ver fuente',
    gmat: 'La consola de operaciones se inspira en GMAT (General Mission Analysis Tool, NASA Goddard): propaga la órbita con un integrador Runge-Kutta 4 de dos cuerpos, como su comando "Propagate". Es una versión simplificada para el navegador.',
    power: 'NASA POWER: clima mensual de cada sitio de lanzamiento (viento, lluvia, nubes).',
    horizons: 'JPL Horizons: geometría Sol–Tierra–destino mes a mes (conjunciones, perihelios).',
    omni: 'NASA OMNI2: probabilidad mensual de tormentas geomagnéticas y de protones solares.',
    nssdc: 'NASA NSSDC: hojas de datos de planetas, naves e instrumentos.',
    equipo: 'Hecho para el NASA Space Apps Challenge 2026.',
    inversores: 'Nuestros inversores', inversor: 'Inversor',
  },
  en: {
    titulo: 'Credits and sources', boton: 'CREDITS', cerrar: 'Close',
    intro: 'The map images are real and come from space agencies. Figures marked ≈ are game values; the rest were read in the cited source.',
    imagenes: 'Real images and maps', misiones: 'Real reference missions', datos: 'NASA data and tools',
    licencia: 'Licence', abrir: 'Open source',
    gmat: 'The operations console is inspired by GMAT (General Mission Analysis Tool, NASA Goddard): it propagates the orbit with a two-body Runge-Kutta 4 integrator, like its "Propagate" command. It is a simplified version for the browser.',
    power: 'NASA POWER: monthly weather at each launch site (wind, rain, clouds).',
    horizons: 'JPL Horizons: Sun–Earth–target geometry month by month (conjunctions, perihelia).',
    omni: 'NASA OMNI2: monthly odds of geomagnetic storms and solar proton events.',
    nssdc: 'NASA NSSDC: fact sheets for planets, spacecraft and instruments.',
    equipo: 'Made for the NASA Space Apps Challenge 2026.',
    inversores: 'Our investors', inversor: 'Investor',
  },
});

const h = (tag, attrs = {}, ...hijos) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  for (const x of hijos.flat()) if (x != null) el.append(x instanceof Node ? x : document.createTextNode(String(x)));
  return el;
};
const enlace = (url, texto) => (url ? h('a', { href: url, target: '_blank', rel: 'noopener' }, texto) : texto);

function contenido() {
  const D = DATOS;
  const mapas = Object.values(D.MAPAS).filter((m) => m?.archivo);
  const fichas = mapas.map((m) => h('figure', { class: 'cred-ficha' },
    h('img', { src: m.archivo, alt: tx(m.nombre), loading: 'lazy' }),
    h('figcaption', {},
      h('strong', {}, tx(m.nombre)),
      h('span', {}, `${m.fuente?.agencia ?? ''} · ${T.licencia}: ${m.fuente?.licencia ?? '—'}`),
      enlace(m.fuente?.url, T.abrir))));
  const misiones = D.ESCENARIOS.flatMap((e) => e.misiones.map((id) => D.MISIONES[id]).filter(Boolean)).map((m) => {
    const f = D.FUENTES[m.referencia?.src];
    return h('li', {}, h('strong', {}, `${tx(m.nombre)}: `), `${m.referencia?.mision ?? '—'} (${tx({ es: m.referencia?.agenciaEs ?? m.referencia?.agencia, en: m.referencia?.agencia })}) `,
      f?.url ? enlace(f.url, '↗') : null);
  });
  const gmat = D.FUENTES['RES-02'];
  return [
    h('p', { class: 'tenue' }, T.intro),
    h('h3', {}, T.imagenes), h('div', { class: 'cred-rejilla' }, fichas),
    h('h3', {}, T.misiones), h('ul', { class: 'cred-lista' }, misiones),
    h('h3', {}, T.datos),
    h('ul', { class: 'cred-lista' },
      h('li', {}, T.gmat, ' ', enlace(gmat?.url, '↗')),
      h('li', {}, T.power, ' ', enlace('https://power.larc.nasa.gov/', '↗')),
      h('li', {}, T.horizons, ' ', enlace('https://ssd.jpl.nasa.gov/horizons/', '↗')),
      h('li', {}, T.omni, ' ', enlace('https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/', '↗')),
      h('li', {}, T.nssdc, ' ', enlace('https://nssdc.gsfc.nasa.gov/planetary/factsheet/', '↗'))),
    h('p', { class: 'tenue' }, T.equipo),
    // Easter egg, lo último de los créditos: los inversores del juego (fotos generadas con IA del equipo).
    h('h3', {}, T.inversores),
    h('div', { class: 'cred-rejilla cred-inversores' }, INVERSORES.map((inv) => h('figure', { class: 'cred-ficha' },
      h('img', { src: inv.foto, alt: `${inv.nombre} (${TI.ia})`, loading: 'lazy' }),
      h('figcaption', {}, h('strong', {}, `${T.inversor} ${inv.nombre}`), h('span', {}, TI.ia))))),
  ];
}

// Abre (y crea la primera vez) el diálogo de créditos.
export function abrirCreditos() {
  let dlg = document.getElementById('dlg-creditos');
  if (!dlg) {
    dlg = h('dialog', { id: 'dlg-creditos', class: 'dialogo dialogo-ancho' });
    document.body.append(dlg);
  }
  const cerrar = h('button', { class: 'boton primario', type: 'button' }, T.cerrar);
  cerrar.addEventListener('click', () => dlg.close());
  dlg.replaceChildren(h('h2', {}, T.titulo), h('div', { class: 'cred-cuerpo' }, contenido()), h('div', { class: 'acciones' }, cerrar));
  dlg.showModal();
}

export const textoBotonCreditos = () => T.boton;
