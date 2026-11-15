// Mapas descargados por el equipo (fuentes oficiales). Solo se usan para MOSTRAR; las reglas nunca leen píxeles.
export const MAPAS = {
  'luna-color': {
    archivo: 'assets/mapas/luna-color.jpg', cuerpo: 'luna', capa: 'color',
    nombre: { es: 'Luna: color (LROC WAC)', en: 'Moon: color (LROC WAC)' },
    ancho: 2048, alto: 1024, proyeccion: 'equirectangular', longitud: '-180..180',
    unidades: null, escala: null,
    fuente: {
      titulo: 'CGI Moon Kit - 2019 color map (2K)', agencia: 'NASA SVS',
      url: 'https://svs.gsfc.nasa.gov/4720/',
      urlArchivo: 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg',
      licencia: 'Public domain (NASA)', fecha: '2026-11-15'
    },
    nota: {
      es: 'Mosaico global de color/albedo de la Luna, centrado en 0° de longitud (datos LROC WAC). Imagen de 2K del kit CGI de NASA SVS.',
      en: 'Global color/albedo mosaic of the Moon, centered on 0° longitude (LROC WAC data). 2K image from the NASA SVS CGI Moon Kit.'
    }
  },
  'luna-elevacion': {
    archivo: 'assets/mapas/luna-elevacion.jpg', cuerpo: 'luna', capa: 'elevacion',
    nombre: { es: 'Luna: elevación (LOLA)', en: 'Moon: elevation (LOLA)' },
    ancho: 1024, alto: 512, proyeccion: 'equirectangular', longitud: '-180..180',
    unidades: 'km (sobre radio 1737.4 km)',
    escala: { min: -8.88, max: 10.50, unidad: 'km' },
    fuente: {
      titulo: 'CGI Moon Kit - LOLA displacement map (8-bit, 1024x512)', agencia: 'NASA SVS',
      url: 'https://svs.gsfc.nasa.gov/4720/',
      urlArchivo: 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_3_8bit.jpg',
      licencia: 'Public domain (NASA)', fecha: '2026-11-15'
    },
    nota: {
      es: 'Relieve lunar en escala de grises (8 bits) a partir del DEM LOLA, centrado en 0° de longitud. Rango real del DEM de referencia (ldem_4, float): -8.88 a 10.50 km; la correspondencia exacta de los 8 bits con km no está verificada.',
      en: 'Lunar relief in 8-bit grayscale from the LOLA DEM, centered on 0° longitude. Real range of the float reference DEM (ldem_4): -8.88 to 10.50 km; the exact 8-bit to km mapping is not verified.'
    }
  },
  'mercurio-color': {
    archivo: 'assets/mapas/mercurio-color.jpg', cuerpo: 'mercurio', capa: 'color',
    nombre: { es: 'Mercurio: color global (MESSENGER MDIS)', en: 'Mercury: global color (MESSENGER MDIS)' },
    ancho: 1024, alto: 512, proyeccion: 'equirectangular', longitud: null,
    unidades: null, escala: null,
    fuente: {
      titulo: 'Mercury MESSENGER MDIS Global Color Mosaic 665m', agencia: 'USGS Astrogeology',
      url: 'https://astrogeology.usgs.gov/search/map/mercury_messenger_mdis_global_color_mosaic_665m.xml',
      urlArchivo: 'https://astrogeology.usgs.gov/ckan/dataset/b8ad92a0-5cb2-4db9-ae66-d0ef3a747bb7/resource/4f5968f1-cae7-4b6a-9967-d576c10f9475/download/mercury_messenger_clrmosaic_global_1024.jpg',
      licencia: 'Public domain (NASA/USGS)', fecha: '2026-11-15'
    },
    nota: {
      es: 'Mosaico global en color de Mercurio (MDIS, tres filtros). Colores realzados para mostrar diferencias de composición; no es la vista del ojo humano.',
      en: 'Global color mosaic of Mercury (MDIS, three filters). Colors are enhanced to show compositional differences; not what the human eye would see.'
    }
  },
  'mercurio-elevacion': {
    archivo: 'assets/mapas/mercurio-elevacion.jpg', cuerpo: 'mercurio', capa: 'elevacion',
    nombre: { es: 'Mercurio: elevación (MESSENGER)', en: 'Mercury: elevation (MESSENGER)' },
    ancho: 1024, alto: 512, proyeccion: 'equirectangular', longitud: null,
    unidades: null, escala: null,
    fuente: {
      titulo: 'Mercury MESSENGER Global DEM 665m (1024 px preview)', agencia: 'USGS Astrogeology',
      url: 'https://astrogeology.usgs.gov/search/map/mercury_messenger_global_dem_665m',
      urlArchivo: 'https://astrogeology.usgs.gov/ckan/dataset/75db9745-e9c5-4a6d-8dea-39f704a163cc/resource/2816dcdb-6c7c-427e-b7bb-5401e2885b0b/download/mercury_messenger_dem_global_665m_1024.jpg',
      licencia: 'Public domain (NASA/USGS)', fecha: '2026-11-15'
    },
    nota: {
      es: 'Vista de elevación de Mercurio a partir del DEM global MESSENGER (imagen de 1024 px, con color). Los valores en metros no están verificados en esta vista.',
      en: 'Elevation view of Mercury from the MESSENGER global DEM (1024 px image, colored). Values in meters are not verified in this view.'
    }
  },
  'mercurio-composicion': {
    archivo: 'assets/mapas/mercurio-composicion.png', cuerpo: 'mercurio', capa: 'composicion',
    nombre: { es: 'Mercurio: composición química (XRS)', en: 'Mercury: chemical composition (XRS)' },
    ancho: 666, alto: 500, proyeccion: 'figura', longitud: null,
    unidades: null, escala: null,
    fuente: {
      titulo: 'Chemical Composition of Mercury', agencia: 'NASA Science (JHU/APL, Carnegie)',
      url: 'https://science.nasa.gov/image-detail/pia19417-mercury/',
      urlArchivo: 'https://science.nasa.gov/wp-content/uploads/2023/05/pia19417-mercury-jpg.webp',
      licencia: 'Public domain (NASA); credit NASA/JHU APL/Carnegie Institution', fecha: '2026-11-15'
    },
    nota: {
      es: 'Figura (no mapa equirectangular) de la composición de Mercurio medida por el XRS de MESSENGER: dos globos con colores de cociente. El elemento concreto no aparece rotulado en la imagen; no se ha confirmado que sea azufre.',
      en: 'Figure (not an equirectangular map) of Mercury composition measured by MESSENGER XRS: two globes with ratio colors. The specific element is not labeled in the image; sulfur is not confirmed.'
    }
  },
  'cometa-67p': {
    archivo: 'assets/mapas/cometa-67p.jpg', cuerpo: 'cometa', capa: 'color',
    nombre: { es: 'Cometa 67P/Churyumov-Gerasimenko (OSIRIS)', en: 'Comet 67P/Churyumov-Gerasimenko (OSIRIS)' },
    ancho: 625, alto: 450, proyeccion: 'figura', longitud: null,
    unidades: null, escala: null,
    fuente: {
      titulo: 'Comet 67P/C-G on 29 July 2014 (OSIRIS NAC)', agencia: 'ESA Rosetta',
      url: 'https://sci.esa.int/web/rosetta/-/54436-comet-67p-on-29-july-2014',
      urlArchivo: 'https://sci.esa.int/documents/34878/35534/1567216281382-Rosetta_OSIRIS_NAC_comet_67P_20140729_625.jpg',
      licencia: 'CC BY-SA 3.0 IGO (ESA); verificar en la página de la imagen', fecha: '2026-11-15'
    },
    nota: {
      es: 'Núcleo del cometa 67P desde 1950 km (29 jul 2014), cámara OSIRIS NAC. Foto, no mapa. Crédito: ESA/Rosetta/MPS for OSIRIS Team.',
      en: 'Nucleus of comet 67P from 1950 km (29 Jul 2014), OSIRIS NAC camera. Photo, not a map. Credit: ESA/Rosetta/MPS for OSIRIS Team.'
    }
  }
};
export default MAPAS;
