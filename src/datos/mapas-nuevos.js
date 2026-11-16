// Mapas y fotos nuevos descargados de fuentes oficiales de la NASA y del USGS (dominio publico). Solo se usan para MOSTRAR; las reglas nunca leen pixeles.
export const MAPAS_NUEVOS = {
  'tierra-color': {
    archivo: 'assets/mapas/tierra-color.png', cuerpo: 'tierra', capa: 'color',
    nombre: { es: 'Tierra: color global (Blue Marble)', en: 'Earth: global color (Blue Marble)' },
    ancho: 2048, alto: 1024, proyeccion: 'equirectangular', longitud: '-180..180',
    unidades: null, escala: null,
    fuente: {
      titulo: 'Blue Marble - A Seamless Image Mosaic of the Earth (2048 px)', agencia: 'NASA SVS',
      url: 'https://svs.gsfc.nasa.gov/2915/',
      urlArchivo: 'https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png',
      licencia: 'Public domain (NASA)', fecha: '2026-11-15'
    },
    nota: {
      es: 'Mosaico global en color verdadero de la Tierra, compuesto con datos del sensor MODIS del satelite Terra (2001).',
      en: 'Global true-color mosaic of Earth, composited from MODIS data on NASA\'s Terra satellite (2001).'
    }
  },
  'marte-color': {
    archivo: 'assets/mapas/marte-color.jpg', cuerpo: 'marte', capa: 'color',
    nombre: { es: 'Marte: color global (Viking MDIM)', en: 'Mars: global color (Viking MDIM)' },
    ancho: 1024, alto: 512, proyeccion: 'equirectangular', longitud: '-180..180',
    unidades: null, escala: null,
    fuente: {
      titulo: 'Mars Viking Global Color Mosaic 925m (1024 px)', agencia: 'USGS Astrogeology',
      url: 'https://astrogeology.usgs.gov/search/map/mars_viking_global_color_mosaic_925m',
      urlArchivo: 'https://astrogeology.usgs.gov/ckan/dataset/dfdc2242-52dc-4126-bc89-03af8253ae79/resource/0d7b31dc-0b2e-4ca6-89dc-e3c1404c0232/download/mars_viking_clrmosaic_global_1024.jpg',
      licencia: 'Public domain (USGS)', fecha: '2026-11-15'
    },
    nota: {
      es: 'Mosaico global en color de Marte a partir de imagenes de las sondas Viking (MDIM). Colores realzados.',
      en: 'Global color mosaic of Mars from Viking Orbiter images (MDIM). Colors are enhanced.'
    }
  },
  'marte-elevacion': {
    archivo: 'assets/mapas/marte-elevacion.jpg', cuerpo: 'marte', capa: 'elevacion',
    nombre: { es: 'Marte: relieve sombreado (MOLA)', en: 'Mars: shaded relief (MOLA)' },
    ancho: 1024, alto: 512, proyeccion: 'equirectangular', longitud: '-180..180',
    unidades: null, escala: null,
    fuente: {
      titulo: 'Mars MGS MOLA Global Shaded Relief 463m (1024 px)', agencia: 'USGS Astrogeology',
      url: 'https://astrogeology.usgs.gov/search/map/mars_mgs_mola_global_shaded_relief_463m',
      urlArchivo: 'https://astrogeology.usgs.gov/ckan/dataset/08ba96d7-eccd-4a3c-9af3-ef270cb23937/resource/1acbef84-6d12-4fa3-b3aa-452bbc5077c1/download/mars_mgs_mola_shade_1024.jpg',
      licencia: 'Public domain (USGS)', fecha: '2026-11-15'
    },
    nota: {
      es: 'Relieve sombreado de Marte a partir del altimetro laser MOLA de Mars Global Surveyor. Solo muestra relieve; los valores en metros no estan verificados en esta imagen.',
      en: 'Shaded relief of Mars from the MOLA laser altimeter on Mars Global Surveyor. Shows relief only; height values in meters are not verified in this image.'
    }
  },
  'europa-color': {
    archivo: 'assets/mapas/europa-color.jpg', cuerpo: 'europa', capa: 'color',
    nombre: { es: 'Europa: mosaico global (Voyager/Galileo)', en: 'Europa: global mosaic (Voyager/Galileo)' },
    ancho: 1024, alto: 512, proyeccion: 'equirectangular', longitud: null,
    unidades: null, escala: null,
    fuente: {
      titulo: 'Europa Voyager/Galileo SSI Global Mosaic 500m (1024 px)', agencia: 'USGS Astrogeology',
      url: 'https://astrogeology.usgs.gov/search/map/europa_voyager_galileo_ssi_global_mosaic_500m',
      urlArchivo: 'https://astrogeology.usgs.gov/ckan/dataset/4080036f-afc5-422e-abe9-1c0c8e4f98ea/resource/3647e7b3-425e-4dcf-951b-cc4a22fb0129/download/europa_voyager_galileossi_global_mosaic_500m_1024.jpg',
      licencia: 'Public domain (USGS/NASA)', fecha: '2026-11-15'
    },
    nota: {
      es: 'Mosaico global de la luna Europa de Jupiter a partir de imagenes de las sondas Voyager y Galileo.',
      en: 'Global mosaic of Jupiter\'s moon Europa from Voyager and Galileo images.'
    }
  },
  'encelado-color': {
    archivo: 'assets/mapas/encelado-color.jpg', cuerpo: 'encelado', capa: 'color',
    nombre: { es: 'Encelado: mapa global (Cassini)', en: 'Enceladus: global map (Cassini)' },
    ancho: 2048, alto: 1076, proyeccion: 'equirectangular', longitud: '-180..180',
    unidades: null, escala: null,
    fuente: {
      titulo: 'Map of Saturn\'s Moon Enceladus - December 2011 (PIA14937)', agencia: 'NASA/JPL (Photojournal)',
      url: 'https://photojournal.jpl.nasa.gov/catalog/PIA14937',
      urlArchivo: 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia14/pia14937/PIA14937.jpg',
      licencia: 'Public domain (NASA/JPL)', fecha: '2026-11-15'
    },
    nota: {
      es: 'Mapa global de Encelado con sombreado, a partir de imagenes de la sonda Cassini. Reducido de 7480 a 2048 px de ancho.',
      en: 'Shaded global map of Enceladus from Cassini images. Downscaled from 7480 to 2048 px wide.'
    }
  },
  'saturno': {
    archivo: 'assets/mapas/saturno.jpg', cuerpo: 'saturno', capa: 'foto',
    nombre: { es: 'Saturno y anillos (Cassini)', en: 'Saturn and rings (Cassini)' },
    ancho: 1280, alto: 954, proyeccion: 'figura', longitud: null,
    unidades: null, escala: null,
    fuente: {
      titulo: 'Ringworld Waiting (PIA06077)', agencia: 'NASA/JPL (Photojournal)',
      url: 'https://photojournal.jpl.nasa.gov/catalog/PIA06077',
      urlArchivo: 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia06/pia06077/PIA06077.jpg/jcr:content/renditions/cq5dam.web.1280.1280.jpeg',
      licencia: 'Public domain (NASA/JPL)', fecha: '2026-11-15'
    },
    nota: {
      es: 'Saturno y sus anillos en color natural, visto por la sonda Cassini durante su aproximacion al planeta.',
      en: 'Saturn and its rings in natural color, seen by the Cassini spacecraft during its approach to the planet.'
    }
  },
  'iss': {
    archivo: 'assets/mapas/iss.jpg', cuerpo: 'tierra', capa: 'foto',
    nombre: { es: 'Estacion Espacial Internacional (iROSA)', en: 'International Space Station (iROSA)' },
    ancho: 1920, alto: 1078, proyeccion: 'figura', longitud: null,
    unidades: null, escala: null,
    fuente: {
      titulo: 'ISS photo iss065e144542 (iROSA solar arrays)', agencia: 'NASA (Image and Video Library)',
      url: 'https://images.nasa.gov/details/iss065e144542',
      urlArchivo: 'https://images-assets.nasa.gov/image/iss065e144542/iss065e144542~large.jpg',
      licencia: 'Public domain (NASA)', fecha: '2026-11-15'
    },
    nota: {
      es: 'Foto de la Estacion Espacial Internacional en orbita terrestre: paneles solares iROSA desplegados.',
      en: 'Photo of the International Space Station in Earth orbit: deployed iROSA solar arrays.'
    }
  },
  'jezero': {
    archivo: 'assets/mapas/jezero.jpg', cuerpo: 'marte', capa: 'foto',
    nombre: { es: 'Cráter Jezero: sitio de aterrizaje de Perseverance', en: 'Jezero crater: Perseverance landing site' },
    ancho: 1920, alto: 1080, proyeccion: 'figura', longitud: null,
    unidades: null, escala: null,
    fuente: {
      titulo: 'Perseverance\'s Landing Spot in Jezero Crater (PIA24331)', agencia: 'NASA/JPL-Caltech/Univ. of Arizona',
      url: 'https://photojournal.jpl.nasa.gov/catalog/PIA24331',
      urlArchivo: 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia24/pia24331/PIA24331.jpg',
      licencia: 'Public domain (NASA)', fecha: '2026-11-15'
    },
    nota: {
      es: 'Vista de Jezero con el punto verde del lugar donde aterrizo Perseverance el 18 de febrero de 2021. Base: imagen HiRISE del MRO.',
      en: 'View of Jezero with a green dot marking where Perseverance landed on Feb. 18, 2021. Base image: HiRISE from MRO.'
    }
  },
  'smap': {
    archivo: 'assets/mapas/smap.jpg', cuerpo: 'tierra', capa: 'color',
    nombre: { es: 'SMAP: humedad del suelo global', en: 'SMAP: global soil moisture' },
    ancho: 1024, alto: 576, proyeccion: 'figura', longitud: null,
    unidades: null, escala: null,
    fuente: {
      titulo: 'SMAP\'s First High-Resolution Global Soil Moisture Map (PIA19337)', agencia: 'NASA SVS / JPL',
      url: 'https://svs.gsfc.nasa.gov/30601/',
      urlArchivo: 'http://svs.gsfc.nasa.gov/vis/a030000/a030600/a030601/smap_global_moisture_20150504-20150511_PIA19337_print.jpg',
      licencia: 'Public domain (NASA)', fecha: '2026-11-15'
    },
    nota: {
      es: 'Mapa de humedad del suelo (capa superior de 5 cm) con datos del satelite SMAP, del 4 al 11 de mayo de 2015.',
      en: 'Soil moisture map (top 5 cm) from the SMAP satellite, May 4-11, 2015.'
    }
  }
};

export default MAPAS_NUEVOS;
