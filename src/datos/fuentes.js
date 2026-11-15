// Fuentes de todos los datos del juego. Cada `src` de los demás archivos de datos es una clave de este objeto.
// Formato: { titulo, url, agencia, conf, urls?, nota? }.  `conf` es la etiqueta del equipo ('V', 'A', 'CG', 'INF', 'JUEGO').
// [V-calc] se guarda como 'V'; [A✓] como 'A'. Los IDs son los de los md del equipo (BG-, BC-, CM-, GEN-, ORB-, LND-, EXP-, RES-, DS-).
// Entradas sin URL: GAP-xx (lagunas abiertas), JUEGO, PRECIO, CG, F-06b y documentos internos.

const F = (titulo, url, agencia, conf, extra = {}) => ({ titulo, url, agencia, conf, ...extra });
const GAP = (titulo) => ({ titulo, url: null, agencia: 'Team', conf: 'JUEGO', nota: 'Open gap in the team documents: the real value was not found.' });

export const FUENTES = {
  // ---- entradas internas ----
  JUEGO: F('Game value: no real datum behind it (shown with ≈)', null, 'Team', 'JUEGO'),
  PRECIO: F("Provisional price rule: real price if known; Blue Ghost payload average (44 M USD / 10); 0.5 M USD per kg for BepiColombo and Rosetta instruments", null, 'Team', 'INF', { nota: 'Mateo, section 1.3 of propuesta-misiones-mateo.md. A game rule, not a datum.' }),
  CG: F('General knowledge, no source (to verify)', null, 'Team', 'CG'),
  'F-06b': F('Game flow: generic design event (investor in or out)', null, 'Team', 'INF', { nota: 'flujo-del-juego.md, step F-06b.' }),

  // ---- lagunas abiertas (GAP) que aparecen como fuente de un valor JUEGO ----
  'GAP-M04': GAP('Mass of the Blue Ghost lander and payload masses'),
  'GAP-P01': GAP('Mass and power of the 10 Blue Ghost payloads; lander mass'),
  'GAP-P02': GAP('Mass, power and data of each BepiColombo instrument; batteries'),
  'GAP-P03': GAP('NASA rocket able to reach Mercury and the comet (launch energy C3, in elvperf)'),
  'GAP-P07': GAP('Mass and power of each Rosetta instrument; arrival delta-v and orbit distances around 67P'),
  'GAP-P08': GAP('Cost of BepiColombo and Rosetta'),
  'GAP-P12': GAP('Mass, power, volume and data of the Blue Ghost payloads (only LEXI has a full sheet)'),
  'GAP-P13': GAP('Mass and power of SERENA, PHEBUS, MERTIS, SIXS and Mio instruments; power of BELA'),
  'GAP-P14': GAP('Bandwidth of almost every instrument and antenna; on-board memory of MPO and Rosetta'),
  'GAP-P15': GAP('Battery capacity (Blue Ghost, MPO, Rosetta, Philae)'),
  'GAP-P16': GAP('Price of platform items (panels, batteries, antennas) and the final price rule'),
  'GAP-P17': GAP('Falcon Heavy capacity to the Moon, Mercury and the comet'),
  'GAP-M01': GAP('Official prices of Electron and rideshare; cost and power of Landsat 9'),

  // ---- Blue Ghost (LANDING, Luna) ----
  'BG-01': F('Firefly, Blue Ghost Mission 1 page', 'https://fireflyspace.com/missions/blue-ghost-mission-1/', 'Firefly Aerospace', 'V'),
  'BG-02': F('NASA, touchdown press release (2 March 2025)', 'https://www.nasa.gov/news-release/touchdown-carrying-nasa-science-fireflys-blue-ghost-lands-on-moon/', 'NASA', 'V'),
  'BG-03': F('SpacePolicyOnline, Firefly and NASA cheer Blue Ghost success (19 March 2025)', 'https://spacepolicyonline.com/news/firefly-and-nasa-cheer-blue-ghosts-total-success/', 'Other (press)', 'A'),
  'BG-04': F('EGU26-22820: results of the 10 Blue Ghost payloads', 'https://meetingorganizer.copernicus.org/EGU26/EGU26-22820.html', 'Other (EGU abstract)', 'V'),
  'BG-05': F('Boston University, LEXI', 'https://ar.bu.edu/2025/scientific-progress/lexi', 'Boston University', 'A'),
  'BG-06': F('Williams, Turyshev and Boggs: lunar laser ranging and the equivalence principle', 'https://arxiv.org/abs/gr-qc/0507083', 'Other (arXiv)', 'A', { urls: ['https://arxiv.org/abs/1203.2150'] }),
  'BG-07': F('Walsh et al. 2024, the LEXI mission (instrument parameter table)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11093736/', 'Other (journal paper)', 'V'),
  'BG-08': F('NGLR-1, University of Maryland and ILRS', 'https://www.physics.umd.edu/nglr/', 'Other (University of Maryland)', 'V', { urls: ['https://ilrs.gsfc.nasa.gov/missions/satellite_missions/current_missions/ngl1_general.html'] }),
  'BG-09': F('NASA, payloads of the TO19D delivery', 'https://science.nasa.gov/lunar-science/clps-deliveries/to19d-firefly/', 'NASA', 'V', { nota: 'Part literal, part summarised.' }),
  'BG-10': F('Landing mass of Blue Ghost (IAA RAS) and payload capacity of 155 kg (low-authority source)', 'https://iaaras.ru/en/observations/sc/blueghost/', 'Other', 'A', { urls: ['https://veenie.space/docs/research/simulation/firefly-blue-ghost-lander-simulation-specs'] }),

  // ---- BepiColombo (ORBITA, Mercurio) ----
  'BC-01': F('ESA, BepiColombo factsheet', 'https://www.esa.int/Science_Exploration/Space_Science/BepiColombo/BepiColombo_factsheet', 'ESA', 'V'),
  'BC-02': F('ESA, BepiColombo engineering (updated 2019)', 'https://sci.esa.int/web/bepicolombo/-/31326-engineering', 'ESA', 'V'),
  'BC-03': F('ESA, the MPO spacecraft (updated 2020)', 'https://sci.esa.int/web/bepicolombo/-/48872-spacecraft', 'ESA', 'V'),
  'BC-04': F('ESA, the 12 science questions of BepiColombo (2019)', 'https://sci.esa.int/web/bepicolombo/31350-objectives', 'ESA', 'V'),
  'BC-05': F('ESA, MPO thermal test; JAXA, Mio antenna', 'https://sci.esa.int/web/bepicolombo/-/49468-mpo-takes-a-simulated-trip-to-the-innermost-planet', 'ESA', 'A', { urls: ['https://www.isas.jaxa.jp/e/forefront/2011/ogawa/02.shtml'] }),
  'BC-06': F('Wikipedia, BepiColombo', 'https://en.wikipedia.org/wiki/BepiColombo', 'Other', 'A'),
  'BC-07': F('ESA, BepiColombo begins Mercury arrival with MTM separation; Space.com', 'https://www.esa.int/Enabling_Support/Operations/BepiColombo_begins_Mercury_arrival_with_MTM_separation_success', 'ESA', 'A', { urls: ['https://www.space.com/space-exploration/missions/a-new-mission-starting-today-8-years-after-launch-bepicolombo-begins-mercury-arrival'] }),
  'BC-08': F('The BepiColombo solar conjunction experiments revisited', 'https://arxiv.org/abs/2201.05107', 'Other (arXiv)', 'A'),
  'BC-09': F('What MESSENGER revealed about Mercury (Universe Today; Discover)', 'https://www.universetoday.com/100461/5-mercury-secrets-revealed-by-messenger', 'Other (press)', 'A', { urls: ['https://discovermagazine.com/the-sciences/7-remarkable-lessons-from-messengers-mission-to-mercury'] }),
  'BC-10': F('ESA, BepiColombo brochure BR-335', 'https://sci.esa.int/documents/34795/36289/1567260321185-ESA_BR-335_BepiColombo.pdf', 'ESA', 'V'),
  'BC-11': F('Benkhoff et al. 2021, BepiColombo mission overview and science goals', 'https://link.springer.com/article/10.1007/s11214-021-00861-4', 'Other (journal paper)', 'A', { nota: 'Per-instrument mass and power seen in a search excerpt.' }),
  'BC-12': F('CNES, instruments of Mio', 'https://bepicolombo.cnes.fr/en/node/10959', 'Other (CNES)', 'A'),

  // ---- Rosetta y Philae (EXPLORACION, cometa 67P) ----
  'CM-01': F('ESA, Rosetta factsheet', 'https://www.esa.int/Science_Exploration/Space_Science/Rosetta/Rosetta_factsheet', 'ESA', 'V'),
  'CM-02': F('ESA, Rosetta mission summary', 'https://www.esa.int/missions/about-us/directorates/science/rosetta/rosetta', 'ESA', 'V'),
  'CM-03': F('ESA, the Rosetta lander', 'https://www.esa.int/articles/about-us/directorates/science/rosetta/the-rosetta-lander', 'ESA', 'V'),
  'CM-04': F('ESA, comet 67P/Churyumov-Gerasimenko', 'https://www.esa.int/articles/about-us/directorates/science/rosetta/comet-67p-churyumov-gerasimenko', 'ESA', 'V'),
  'CM-05': F('ESA and JPL, first measurement of the comet water D/H ratio (Altwegg et al., Science, 2014)', 'https://www.esa.int/ESA_Multimedia/Images/2014/12/First_measurements_of_comet_s_water_ratio', 'ESA', 'A', { urls: ['https://jpl.nasa.gov/news/rosetta-instrument-reignites-debate-on-earths-oceans'] }),
  'CM-06': F('ESA, first detection of molecular oxygen at a comet (Bieler et al., Nature, 2015)', 'https://www.esa.int/Science_Exploration/Space_Science/Rosetta/First_detection_of_molecular_oxygen_at_a_comet', 'ESA', 'A'),
  'CM-07': F('Philae landing accounts (Space.com, CBS News, COBS)', 'https://www.space.com/27769-philae-comet-landing-survival-luck.html', 'Other (press)', 'A', { urls: ['https://www.cbsnews.com/news/comet-lander-may-have-bounced', 'https://cobs.si/news/archive/philae-lands-on-its-comet-three-times/'] }),
  'CM-08': F('DLR, Rosetta in figures', 'https://www.dlr.de/en/research-and-transfer/projects-and-missions/rosetta/rosetta-in-figures', 'Other (DLR)', 'A'),
  'CM-09': F('Team document propuesta-threshold.md, section 5.3 (Giotto at Halley)', null, 'Team', 'A', { nota: 'Verified by a team agent against the primary source.' }),
  'CM-10': F("ESA, Comet Interceptor's spacecraft and instruments", 'https://www.esa.int/Science_Exploration/Space_Science/Comet_Interceptor/Comet_Interceptor_s_spacecraft_and_instruments', 'ESA', 'A'),
  'CM-11': F('ESA, Rosetta orbiter instruments (masses, powers, dimensions)', 'https://sci.esa.int/web/rosetta/-/35061-instruments', 'ESA', 'V'),
  'CM-12': F('ESA, Philae lander instruments', 'https://sci.esa.int/web/rosetta/31445-instruments', 'ESA', 'V'),
  'CM-13': F('ESA, Rosetta engineering and fact sheet', 'https://sci.esa.int/web/rosetta/35134-engineering', 'ESA', 'V', { urls: ['https://sci.esa.int/web/rosetta/47366-fact-sheet'] }),
  'CM-14': F('NASA PDS, Rosetta spacecraft catalog (S and X bands)', 'https://pds.nasa.gov/data/pds3/backup/201703-acdeglmmn/zzold/hostRO.cat', 'NASA', 'A'),
  'CM-15': F('ESA presentation on Rosetta (ROLIS)', 'http://www.iki.rssi.ru/conf/2011-lg/presentations/2_DAY/20110226_Shults(ESA).pdf', 'ESA', 'A'),
  'CM-16': F('Solarserver, silicon cells of Rosetta', 'https://www.solarserver.de/2014/01/25/photovoltaik-in-der-raumfahrt-silizium-solarzellen-versorgen-esa-raumsonde-rosetta-nach-langer-pause-wieder-mit-solarstrom/', 'Other (press)', 'A'),

  // ---- genéricas ----
  'GEN-01': F('NASA launch prices: Europa Clipper, Roman, Psyche, Dragonfly, COSI, NEO Surveyor; Falcon Heavy list price', 'https://www.nasa.gov/press-release/nasa-awards-launch-services-contract-for-the-europa-clipper-mission', 'NASA', 'A', {
    urls: ['https://spaceflightnow.com/2022/07/19/nasa-selects-spacexs-falcon-heavy-rocket-to-launch-roman-space-telescope/', 'https://www.nasa.gov/news-release/nasa-awards-planetary-defense-space-telescope-launch-services-contract'],
    nota: 'Search excerpts; nasa.gov returned error 429 when read.' }),
  'GEN-02': F('Triple-junction solar cells: CESI CTJ30 and SolAero ZTJ data sheets', 'https://www.cesi.it/app/uploads/2025/04/CESI-CTJ30-v2025.1.pdf', 'Other (industry)', 'A', { urls: ['https://www.rocketlabusa.com/assets/Uploads/RL-SolAero-Data-Sheet-ZTJ.pdf'] }),
  'GEN-03': F('NASA, small-spacecraft state of the art: in-space propulsion', 'https://www.nasa.gov/smallsat-institute/sst-soa/in-space-propulsion/', 'NASA', 'A'),

  // ---- órbita (ORB-) ----
  'ORB-01': F('Rocket Lab, Electron Payload User Guide 7.0', 'https://rocketlabcorp.com/assets/Electron-Payload-User-Guide-7.0-v6.pdf', 'Rocket Lab', 'V'),
  'ORB-04': F('SpaceX, Falcon 9', 'https://www.spacex.com/vehicles/falcon-9/', 'SpaceX', 'A'),
  'ORB-05': F('NASA awards launch services contract for PACE (about 80.4 million USD)', 'https://www.nasa.gov/news-release/nasa-awards-launch-services-contract-for-earth-science-mission/', 'NASA', 'V'),
  'ORB-07': F('NASA CubeSat Launch Initiative (CSLI / ELaNa)', 'https://www.nasa.gov/kennedy/launch-services-program/cubesat-launch-initiative/', 'NASA', 'V'),
  'ORB-14': F('NASA, Landsat 9 (2,710 kg; Atlas V 401, 27 September 2021)', 'https://science.nasa.gov/mission/landsat-9/', 'NASA', 'V', { urls: ['https://www.nasa.gov/wp-content/uploads/2015/04/landsat_9_fast_facts.pdf'] }),
  'ORB-15': F('NOAA, GOES-R spacecraft', 'https://www.nesdis.noaa.gov/GOES-R-Spacecraft', 'NOAA', 'V'),
  'ORB-17': F('NASA and Rocket Lab launch the first pair of TROPICS storm-observing CubeSats', 'https://www.nasa.gov/news-release/nasa-rocket-lab-launch-first-pair-of-storm-observing-cubesats/', 'NASA', 'V'),
  'ORB-19': F('ARRL, geomagnetic storm leads to loss of up to 40 Starlink satellites', 'https://www.arrl.org/news/geomagnetic-storm-leads-to-loss-of-up-to-40-starlink-satellites', 'Other (press)', 'V', { nota: 'Secondary source quoting SpaceX.' }),
  'ORB-20': F('Spaceflight Now, TROPICS-1 on Astra (12 June 2022)', 'https://spaceflightnow.com/2022/06/12/astra-tropics-1-live-coverage/', 'Other (press)', 'A'),
  'ORB-23': F('NASA, GOES-17 ABI mishap investigation summary', 'https://www.nasa.gov/wp-content/uploads/2015/01/goes-17_mib_releasable_summary_final.pdf', 'NASA', 'V'),
  'ORB-25': F('NASA CSLI, CubeSat 101', 'https://www.nasa.gov/wp-content/uploads/2017/03/nasa_csli_cubesat_101_508.pdf', 'NASA', 'V'),
  'ORB-31': F('NASA Open APIs, DONKI space weather', 'https://api.nasa.gov/', 'NASA', 'A', { nota: 'Not checked: the DEMO_KEY returned error 429. Needs its own key and cached data.' }),
  'ORB-32': F('NASA, servicing missions to Hubble', 'https://science.nasa.gov/mission/hubble/observatory/missions-to-hubble/', 'NASA', 'A'),
  'ORB-33': F('NASA, Hubble Servicing Mission 1', 'https://science.nasa.gov/mission/hubble/observatory/missions-to-hubble/servicing-mission-1/', 'NASA', 'A'),
  'ORB-34': F('NASA, Hubble Servicing Mission 3B', 'https://science.nasa.gov/mission/hubble/observatory/missions-to-hubble/servicing-mission-3b/', 'NASA', 'A'),
  'ORB-35': F('NASA, Hubble Servicing Mission 4', 'https://science.nasa.gov/mission/hubble/observatory/missions-to-hubble/', 'NASA', 'A'),

  // ---- aterrizaje (LND-) ----
  'LND-01': F('JPL, Mars 2020 landing quick facts (Perseverance)', 'https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/quick_facts/', 'NASA', 'V', { nota: 'Mass [V]; rocket [A].' }),
  'LND-04': F('ISRO, Chandrayaan-3 details', 'https://www.isro.gov.in/Chandrayaan3_Details.html', 'ISRO', 'V'),
  'LND-06': F('NASA, Blue Ghost touchdown press release (launch on 15 January 2025)', 'https://www.nasa.gov/news-release/touchdown-carrying-nasa-science-fireflys-blue-ghost-lands-on-moon/', 'NASA', 'V', { nota: 'Date [V]; Falcon 9 [A].' }),
  'LND-09': F('JPL, Mars 2020 entry, descent and landing', 'https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/mission/', 'NASA', 'V'),
  'LND-10': F('NASA, zeroing in on the target (landing ellipses at Mars)', 'https://science.nasa.gov/resource/zeroing-in-on-the-target/', 'NASA', 'V'),
  'LND-12': F('JAXA, SLIM landing results', 'https://global.jaxa.jp/press/2024/01/20240125-1_e.html', 'JAXA', 'V'),
  'LND-18': F('NASA, Blue Ghost M1 (10 NASA payloads, Mare Crisium)', 'https://www.nasa.gov/news-release/touchdown-carrying-nasa-science-fireflys-blue-ghost-lands-on-moon/', 'NASA', 'V', { nota: 'Site [V]; 119 GB total [A].' }),
  'LND-20': F('NASA, Mars Polar Lander and Deep Space 2', 'https://science.nasa.gov/mission/mars-polar-lander-deep-space-2/', 'NASA', 'V'),
  'LND-21': F('ESA, Schiaparelli landing investigation completed', null, 'ESA', 'V', { nota: 'Page title only; no URL in the team document.' }),
  'LND-24': F('Astrobotic, update 8 for Peregrine Mission One', 'https://www.astrobotic.com/update-8-for-peregrine-mission-one/', 'Other (Astrobotic)', 'V'),
  'LND-25': F("SpacePolicyOnline, IM's Odysseus lunar lander not upright after all", 'https://spacepolicyonline.com/news/ims-odysseus-lunar-lander-not-upright-after-all/', 'Other (press)', 'V', { nota: 'Laser fact [V].' }),
  'LND-26': F('JAXA, SLIM landing results (loss of thrust of one engine)', 'https://global.jaxa.jp/press/2024/01/20240125-1_e.html', 'JAXA', 'V'),
  'LND-27': F('SpaceNews, historic success rate of lunar landers', 'https://spacenews.com/?p=183065', 'Other (press)', 'A'),
  'LND-36': F('NASA NSSDC, Planetary Fact Sheet (light travel time to the Moon, about 1.3 s)', 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/', 'NASA', 'V'),
  'LND-38': F('NASA Moon Trek WMTS (LRO WAC global mosaic)', 'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/WMTSCapabilities.xml', 'NASA', 'V'),
  'LND-41': F('NASA PGDA, LOLA south pole site products', 'https://pgda.gsfc.nasa.gov/products/78', 'NASA', 'V'),

  // ---- exploración (EXP-) ----
  'EXP-01': F('NASA NSSDC, LCROSS Centaur', 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2009-031D', 'NASA', 'V'),
  'EXP-02': F('NASA NTRS, LCROSS water results', 'https://ntrs.nasa.gov/citations/20100036401', 'NASA', 'A', { nota: 'Water figures do not agree (GAP-M07).' }),
  'EXP-03': F('NASA ends VIPER project, continues Moon exploration', 'https://www.nasa.gov/news-release/nasa-ends-viper-project-continues-moon-exploration/', 'NASA', 'A'),
  'EXP-04': F('NASA selects Blue Origin to deliver VIPER to the Moon south pole', 'https://www.nasa.gov/news-release/nasa-selects-blue-origin-to-deliver-viper-rover-to-moons-south-pole/', 'NASA', 'V'),
  'EXP-07': F("NASA, Perseverance sets off for a world record distance (11 Oct 2026)", 'https://science.nasa.gov/blogs/perseverance-mars-rover/2026/10/12/nasas-perseverance-sets-off-world-record-for-total-distance-driven/', 'NASA', 'V'),
  'EXP-10': F('NASA, Ingenuity Mars helicopter', 'https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/', 'NASA', 'V'),
  'EXP-23': F('NASA, LRO shows lunar ice deposits are widespread (2024)', 'https://science.nasa.gov/solar-system/moon/nasas-lro-lunar-ice-deposits-are-widespread/', 'NASA', 'V'),
  'EXP-29': F('NASA NSSDC, VIPER Neutron Spectrometer System (NSS)', 'https://nssdc.gsfc.nasa.gov/nmc/experiment/display.action?id=VIPER++++-04', 'NASA', 'V'),
  'EXP-31': F('NASA NSSDC, VIPER NIRVSS', 'https://nssdc.gsfc.nasa.gov/nmc/experiment/display.action?id=VIPER++++-03', 'NASA', 'V'),
  'EXP-32': F('NASA NSSDC, VIPER MSolo', 'https://nssdc.gsfc.nasa.gov/nmc/experiment/display.action?id=VIPER++++-02', 'NASA', 'V'),
  'EXP-33': F('NASA NSSDC, VIPER TRIDENT', 'https://nssdc.gsfc.nasa.gov/nmc/experiment/display.action?id=VIPER++++-01', 'NASA', 'V'),
  'EXP-42': F('JPL, Mars rover mission comes to an end (dust and power)', 'https://www.jpl.nasa.gov/edu/resources/teachable-moment/mars-rover-mission-comes-to-an-end-but-science-legacy-live-on/', 'NASA', 'V'),
  'EXP-43': F('NASA, Perseverance rover components (MMRTG, 43 tubes)', 'https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/', 'NASA', 'V'),
  'EXP-49': F('JPL, first aircraft accident investigation on another world (Ingenuity)', 'https://www.jpl.nasa.gov/news/nasa-performs-first-aircraft-accident-investigation-on-another-world/', 'NASA', 'V'),
  'EXP-52': F('NASA, Mars Relay Network (MAVEN lost in June 2026)', 'https://science.nasa.gov/mars/mars-relay-network/', 'NASA', 'V'),
  'EXP-58': F('PDS ODE, Diviner Polar Resource Product', 'https://ode.rsl.wustl.edu/moon/pagehelp/Content/Missions_Instruments/LRO/DIVINER/PRP.htm', 'NASA', 'V'),

  // ---- recursos oficiales del reto (RES-) ----
  'RES-01': F('Design and Develop Science Missions', 'https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf', 'NASA', 'V'),
  'RES-02': F('General Mission Analysis Tool (GMAT)', 'https://software.nasa.gov/software/GSC-19468-1', 'NASA', 'V'),
  'RES-03': F('Concept Maturity Levels (JPL)', 'https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299', 'NASA', 'V'),
  'RES-04': F('Mission Design Lab (GSFC)', 'https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/', 'NASA', 'V'),
  'RES-05': F('NASA Mission Viz', 'https://nasa.github.io/mission-viz/', 'NASA', 'V'),
  'RES-06': F('A Learning Game About Telescopes (Build It Yourself)', 'https://science.nasa.gov/mission/webb/game-build-it-yourself/', 'NASA', 'V'),
  'RES-07': F('CubeSat 101', 'https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf', 'NASA', 'V'),
  'RES-08': F('Space Apps 2023 challenge: Visualize a Space Mission Using Virtual Reality', 'https://www.spaceappschallenge.org/2023/challenges/visualize-a-space-mission-using-virtual-reality/', 'NASA', 'V'),
  'RES-09': F('CSA Digital Games and Activities', 'https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp', 'CSA', 'V'),

  // ---- otros datos de NASA que el equipo ya estudió (DS-) ----
  'DS-01': F('NASA GIBS (WMTS EPSG:4326)', 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml', 'NASA', 'V'),
  'DS-02': F('NASA FIRMS (active fire archive)', 'https://firms.modaps.eosdis.nasa.gov/', 'NASA', 'CG', { nota: 'Download format still to confirm.' }),
  'DS-03': F('NASA DONKI space weather catalog', 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/', 'NASA', 'A'),
  'DS-04': F('NASA Small Spacecraft Technology State-of-the-Art (Ames)', 'https://www.nasa.gov/smallsat-institute/sst-soa/', 'NASA', 'CG'),
  'DS-05': F('NASA LSP elvperf (launch vehicle performance)', 'https://elvperf.ksc.nasa.gov/', 'NASA', 'A', { nota: 'Not an API; says it is updated when new information is available (checked 10 Feb 2026).' }),
  'DS-06': F('NASA Lessons Learned Information System (LLIS)', 'https://llis.nasa.gov/llis_lib/pdf/1009464main1_0641-mr.pdf', 'NASA', 'A'),
  'DS-07': F('NASA Open APIs (APOD, Mars Rover Photos, NEO)', 'https://api.nasa.gov/', 'NASA', 'A', { nota: 'Mars Rover Photos API is archived; the old APOD is archived on 1 Dec 2026.' }),
  'DS-08': F('NASA GeneLab', null, 'NASA', 'A'),
};

export default FUENTES;
