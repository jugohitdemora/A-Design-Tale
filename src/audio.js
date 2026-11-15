// Audio del juego: música por fase (con fundido cruzado) y efectos de sonido.
//
//   musica(pista)   'titulo' | 'diseno' | 'lanzamiento' | null. Cambia de pista con un fundido de ~2 s; la misma pista no reinicia.
//   efecto(tipo)    efecto corto sintetizado (ver EFECTOS).
//   efectoAccion(t) efecto para una acción del protocolo (montar, quitar, firmar…), si tiene uno.
//   lanzamientoSonoro(falla) rugido del despegue (y explosión si falla). Devuelve una función que lo corta.
//   volumen(), ponerVolumen({ musica, efectos }) volúmenes 0..1, guardados en el navegador.
//   contexto(), salidaEfectos()  para que otros módulos (control/cine.js) sinteticen con el mismo volumen.
//
// Pistas: el tema del título es un archivo (assets/musica/tema.mp3, el más tranquilo). Diseño y lanzamiento se componen
// al vuelo con WebAudio en la misma tonalidad (re menor) y pulso (64 / 128 BPM) para que suenen de la misma familia.
// Para usar un archivo en su lugar basta con ponerlo en `archivo` (p. ej. 'assets/musica/diseno.mp3').
// El navegador no deja sonar nada hasta el primer gesto del jugador: la pista pedida empieza en ese momento.

const PISTAS = {
  titulo: { archivo: 'assets/musica/tema.mp3', nivel: 0.9 },
  diseno: { componer: () => componer(componerDiseno, 30), nivel: 0.55 },
  lanzamiento: { componer: () => componer(componerLanzamiento, 30), nivel: 0.5 },
};
const FUNDIDO = 2;

// ---------- Volumen ----------
const CLAVE = 'audio';
const vol = { musica: 0.6, efectos: 0.8 };
try { Object.assign(vol, JSON.parse(localStorage.getItem(CLAVE) || '{}')); } catch { /* sin almacenamiento */ }
export const volumen = () => ({ ...vol });
export function ponerVolumen(v) {
  for (const k of ['musica', 'efectos']) if (Number.isFinite(v?.[k])) vol[k] = Math.max(0, Math.min(1, v[k]));
  try { localStorage.setItem(CLAVE, JSON.stringify(vol)); } catch { /* sin almacenamiento */ }
  if (!ctx) return;
  busMusica.gain.setTargetAtTime(curva(vol.musica), ctx.currentTime, 0.05);
  busEfectos.gain.setTargetAtTime(curva(vol.efectos), ctx.currentTime, 0.05);
}
const curva = (x) => x * x; // el oído es logarítmico: el deslizador se siente más lineal

// ---------- Contexto ----------
let ctx = null, busMusica = null, busEfectos = null;
export function contexto() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 4;
    comp.connect(ctx.destination);
    busMusica = ctx.createGain(); busMusica.gain.value = curva(vol.musica); busMusica.connect(comp);
    busEfectos = ctx.createGain(); busEfectos.gain.value = curva(vol.efectos); busEfectos.connect(comp);
  } catch { ctx = null; }
  return ctx;
}
export function salidaEfectos() { contexto(); return busEfectos; }
const listo = () => { const a = contexto(); if (a && a.state === 'suspended') a.resume(); return a && a.state === 'running' ? a : null; };

// Primer gesto: desbloquea el audio y arranca la pista pendiente.
function desbloquear() {
  const a = contexto();
  if (!a) return;
  const seguir = () => { if (a.state === 'running') { quitarDesbloqueo(); arrancar(); setTimeout(precargar, 1500); } };
  if (a.state === 'suspended') a.resume().then(seguir, () => {}); else seguir();
}
const GESTOS = ['pointerdown', 'keydown', 'touchstart'];
const quitarDesbloqueo = () => GESTOS.forEach((g) => removeEventListener(g, desbloquear, true));
GESTOS.forEach((g) => addEventListener(g, desbloquear, true));

// ---------- Música ----------
let deseada = null;                 // pista pedida
let sonando = null;                 // { nombre, fuente, gan }
const buffers = new Map();          // nombre → Promise<AudioBuffer>

// Promise<AudioBuffer|null> de una pista (se prepara una sola vez). Exportada para pruebas y precarga.
export function cargar(nombre) {
  if (!buffers.has(nombre)) {
    const p = PISTAS[nombre];
    const prom = p.archivo
      ? fetch(p.archivo).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then((b) => contexto().decodeAudioData(b)).then(suavizarBordes)
      : p.componer();
    buffers.set(nombre, prom.catch((err) => { console.warn('audio: no se pudo preparar', nombre, err); buffers.delete(nombre); return null; }));
  }
  return buffers.get(nombre);
}

// Fundido de 30 ms en los extremos de un archivo para que el bucle no haga clic.
function suavizarBordes(buf) {
  const n = Math.min(Math.round(buf.sampleRate * 0.03), buf.length >> 1);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) { const k = i / n; d[i] *= k; d[d.length - 1 - i] *= k; }
  }
  return buf;
}

export const pistaActual = () => sonando?.nombre ?? null;

export function musica(nombre) {
  nombre = PISTAS[nombre] ? nombre : null;
  if (nombre === deseada) return;
  deseada = nombre;
  arrancar();
}

async function arrancar() {
  const a = contexto();
  if (!a || a.state !== 'running') return;          // espera al primer gesto
  if ((sonando?.nombre ?? null) === deseada) return;
  const nombre = deseada;
  apagar(sonando);
  sonando = null;
  if (!nombre) return;
  const buf = await cargar(nombre);
  if (!buf || deseada !== nombre || sonando) return; // cambió mientras se preparaba
  const fuente = a.createBufferSource();
  fuente.buffer = buf; fuente.loop = true;
  const gan = a.createGain();
  const t = a.currentTime;
  gan.gain.setValueAtTime(0.0001, t);
  gan.gain.exponentialRampToValueAtTime(PISTAS[nombre].nivel, t + FUNDIDO);
  fuente.connect(gan).connect(busMusica);
  fuente.start(t);
  sonando = { nombre, fuente, gan };
}

function apagar(s) {
  if (!s) return;
  const t = ctx.currentTime;
  s.gan.gain.cancelScheduledValues(t);
  s.gan.gain.setValueAtTime(Math.max(0.0001, s.gan.gain.value), t);
  s.gan.gain.exponentialRampToValueAtTime(0.0001, t + FUNDIDO);
  s.fuente.stop(t + FUNDIDO + 0.1);
}

// Prepara las pistas compuestas en segundo plano (tras el primer gesto) para que el cambio de fase no espere.
export function precargar() { if (ctx) for (const n of Object.keys(PISTAS)) cargar(n); }

// ---------- Composición (OfflineAudioContext) ----------
const SR = 44100;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);

// Renderiza `dur` segundos + cola; la cola (reverb, eco) se suma al principio para que el bucle no corte.
async function componer(fn, dur) {
  const cola = 4;
  const off = new OfflineAudioContext(2, Math.ceil((dur + cola) * SR), SR);
  const salida = off.createGain();
  salida.connect(off.destination);
  const rev = reverb(off, 3.2);
  const envioRev = off.createGain(); envioRev.gain.value = 0.35;
  envioRev.connect(rev).connect(salida);
  fn({ a: off, salida, rev: envioRev, dur });
  const r = await off.startRendering();
  const n = Math.round(dur * SR);
  const buf = contexto().createBuffer(2, n, SR);
  for (let ch = 0; ch < 2; ch++) {
    const src = r.getChannelData(ch), dst = buf.getChannelData(ch);
    dst.set(src.subarray(0, n));
    for (let i = n; i < src.length; i++) dst[i - n] += src[i];
  }
  return buf;
}

function reverb(a, seg) {
  const c = a.createConvolver(), n = Math.round(seg * a.sampleRate);
  const ir = a.createBuffer(2, n, a.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let s = 1234 + ch * 777;
    for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = ((s / 2147483647) * 2 - 1) * (1 - i / n) ** 3; }
  }
  c.buffer = ir;
  return c;
}

const ruidoCache = new WeakMap();
function ruido(a) {
  if (!ruidoCache.has(a)) {
    const b = a.createBuffer(1, a.sampleRate, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ruidoCache.set(a, b);
  }
  return ruidoCache.get(a);
}

// Una voz con envolvente ADSR simple. destinos: nodos a los que se conecta.
function voz(a, destinos, { onda = 'sine', f, t, d, v = 0.1, at = 0.01, rel = 0.1, det = 0, filtro = null, q = 0.7, pan = 0, f1 = null }) {
  const o = a.createOscillator(), g = a.createGain();
  o.type = onda; o.frequency.setValueAtTime(f, t); o.detune.value = det;
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + d);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + at);
  g.gain.setValueAtTime(v, Math.max(t + at, t + d - rel));
  g.gain.linearRampToValueAtTime(0, t + d);
  let nodo = o;
  if (filtro) { const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filtro; fl.Q.value = q; nodo.connect(fl); nodo = fl; }
  nodo.connect(g);
  let fin = g;
  if (pan && a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = pan; g.connect(p); fin = p; }
  destinos.forEach((x) => fin.connect(x));
  o.start(t); o.stop(t + d + 0.05);
}

function golpeRuido(a, destinos, { t, d, v, tipo = 'highpass', f = 7000, q = 0.7 }) {
  const s = a.createBufferSource(); s.buffer = ruido(a);
  const fl = a.createBiquadFilter(); fl.type = tipo; fl.frequency.value = f; fl.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl).connect(g); destinos.forEach((x) => g.connect(x));
  s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
}

function bombo(a, destinos, t, v = 0.9) {
  const o = a.createOscillator(), g = a.createGain();
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  o.connect(g); destinos.forEach((x) => g.connect(x));
  o.start(t); o.stop(t + 0.5);
}

// Eco con realimentación (para el arpegio).
function eco(a, destino, tiempo, fb = 0.35, mezcla = 0.3) {
  const ent = a.createGain(), del = a.createDelay(2), rea = a.createGain(), mez = a.createGain(), fl = a.createBiquadFilter();
  del.delayTime.value = tiempo; rea.gain.value = fb; mez.gain.value = mezcla; fl.type = 'lowpass'; fl.frequency.value = 2200;
  ent.connect(del); del.connect(fl).connect(rea).connect(del); fl.connect(mez).connect(destino);
  ent.connect(destino);
  return ent;
}

// Acordes en re menor (MIDI): Dm9 · B♭maj7 · Gm9 · A7sus4→A
const ACORDES = [
  { bajo: 38, notas: [50, 53, 57, 60, 64] },
  { bajo: 34, notas: [46, 50, 53, 57, 62] },
  { bajo: 31, notas: [43, 46, 50, 53, 57] },
  { bajo: 33, notas: [45, 50, 52, 55, 61] },
];

// Diseño: concentrado y tranquilo. 64 BPM, pad cálido, arpegio en semicorcheas con eco, bajo suave y un tic de reloj.
function componerDiseno({ a, salida, rev, dur }) {
  const negra = 60 / 64, compas = negra * 4;              // 3,75 s
  const mezcla = a.createGain(); mezcla.gain.value = 0.9; mezcla.connect(salida);
  const arpBus = eco(a, mezcla, negra * 0.75, 0.38, 0.35);
  const compases = Math.round(dur / compas);              // 8
  for (let c = 0; c < compases; c++) {
    const ac = ACORDES[Math.floor(c / 2) % ACORDES.length];
    const t0 = c * compas;
    // Pad (dos osciladores desafinados por nota, ataque lento)
    if (c % 2 === 0) for (const n of ac.notas.slice(0, 4)) for (const det of [-7, 7]) {
      voz(a, [mezcla, rev], { onda: 'sawtooth', f: midi(n), t: t0, d: compas * 2 + 0.6, v: 0.018, at: 1.6, rel: 1.4, det, filtro: 900, pan: det / 20 });
    }
    // Bajo: redonda con un pequeño empuje a mitad de compás
    voz(a, [mezcla], { onda: 'sine', f: midi(ac.bajo), t: t0, d: negra * 2.6, v: 0.16, at: 0.04, rel: 0.6 });
    voz(a, [mezcla], { onda: 'sine', f: midi(ac.bajo), t: t0 + negra * 2.5, d: negra * 1.4, v: 0.11, at: 0.04, rel: 0.5 });
    // Arpegio (sube y baja por el acorde, una octava arriba en la segunda mitad de cada par)
    const patron = [0, 2, 1, 3, 2, 4, 3, 1];
    for (let i = 0; i < 16; i++) {
      const n = ac.notas[patron[i % 8]] + 12 + (c % 2 && i >= 8 ? 12 : 0);
      voz(a, [arpBus, rev], { onda: 'triangle', f: midi(n), t: t0 + i * negra / 4, d: negra / 4 * 0.9, v: i % 4 === 0 ? 0.05 : 0.032, at: 0.005, rel: 0.12, filtro: 2600, pan: (i % 2 ? 0.3 : -0.3) });
    }
    // Tic de reloj en corcheas (el taller sigue trabajando)
    for (let i = 0; i < 8; i++) golpeRuido(a, [mezcla], { t: t0 + i * negra / 2, d: 0.03, v: i % 2 ? 0.012 : 0.02, f: 8000 });
    // Campanita al inicio de cada par de compases
    if (c % 2 === 0) voz(a, [mezcla, rev], { onda: 'sine', f: midi(ac.notas[2] + 24), t: t0 + 0.02, d: 1.8, v: 0.03, at: 0.005, rel: 1.6 });
  }
}

// Lanzamiento: tenso y con empuje. 128 BPM (el doble del tema), bombo a negras, bajo pulsante en corcheas,
// cuerdas tensas, palmas en 2 y 4 y un motivo de metales cada dos compases.
function componerLanzamiento({ a, salida, rev, dur }) {
  const negra = 60 / 128, compas = negra * 4;             // 1,875 s
  const mezcla = a.createGain(); mezcla.gain.value = 0.85; mezcla.connect(salida);
  // El pad "respira" con el bombo (sidechain simulado con una ganancia automatizada)
  const padBus = a.createGain(); padBus.connect(mezcla); padBus.connect(rev);
  const compases = Math.round(dur / compas);              // 16
  const prog = [0, 0, 1, 1, 2, 2, 3, 3];                  // dos compases por acorde
  for (let c = 0; c < compases; c++) {
    const ac = ACORDES[prog[c % prog.length]];
    const t0 = c * compas;
    for (let b = 0; b < 4; b++) {
      const tb = t0 + b * negra;
      bombo(a, [mezcla], tb, 0.75);
      padBus.gain.setValueAtTime(0.35, tb); padBus.gain.linearRampToValueAtTime(1, tb + negra * 0.8);
      if (b % 2) golpeRuido(a, [mezcla, rev], { t: tb, d: 0.16, v: 0.12, tipo: 'bandpass', f: 1500, q: 0.9 });
      // Charles abierto en el contratiempo
      golpeRuido(a, [mezcla], { t: tb + negra / 2, d: 0.09, v: 0.035, f: 9000 });
    }
    // Bajo en corcheas con el filtro que se abre a lo largo del compás
    for (let i = 0; i < 8; i++) {
      const n = ac.bajo + (i === 7 ? 12 : 0);
      voz(a, [mezcla], { onda: 'sawtooth', f: midi(n), t: t0 + i * negra / 2, d: negra / 2 * 0.85, v: 0.09, at: 0.005, rel: 0.05, filtro: 260 + i * 70, q: 4 });
      voz(a, [mezcla], { onda: 'sine', f: midi(n - 12), t: t0 + i * negra / 2, d: negra / 2 * 0.85, v: 0.12, at: 0.005, rel: 0.05 });
    }
    // Cuerdas tensas (sostenidas dos compases)
    if (c % 2 === 0) for (const n of ac.notas.slice(1, 4)) for (const det of [-9, 9]) {
      voz(a, [padBus], { onda: 'sawtooth', f: midi(n + 12), t: t0, d: compas * 2, v: 0.016, at: 0.5, rel: 0.4, det, filtro: 1800, pan: det / 18 });
    }
    // Pulso agudo en semicorcheas (telemetría)
    for (let i = 0; i < 16; i++) {
      voz(a, [mezcla], { onda: 'square', f: midi(ac.notas[i % 3 === 0 ? 4 : 2] + 24), t: t0 + i * negra / 4, d: 0.05, v: 0.012, at: 0.002, rel: 0.04, filtro: 3500, pan: i % 2 ? 0.4 : -0.4 });
    }
    // Motivo de metales: re – la – do – la (en el segundo compás de cada par, a partir del tercer par)
    if (c % 2 === 1 && c >= 5) {
      const mot = [[0, 62, 1], [1, 69, 0.5], [1.5, 72, 0.5], [2, 69, 1.8]];
      const sube = prog[c % prog.length] === 3 ? 1 : 0; // sobre el La, una nota de tensión
      for (const [b, n, l] of mot) for (const det of [-5, 5]) {
        voz(a, [mezcla, rev], { onda: 'sawtooth', f: midi(n - 12 + (sube && n === 72 ? 1 : 0)), t: t0 + b * negra, d: l * negra, v: 0.035, at: 0.04, rel: 0.12, det, filtro: 1500 });
      }
    }
  }
}

// ---------- Efectos ----------
function nota(a, { onda = 'sine', f0, f1 = f0, t = 0, d = 0.15, v = 0.1, at = 0.008 }) {
  const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + t;
  o.type = onda; o.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + d);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + at); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g).connect(busEfectos); o.start(t0); o.stop(t0 + d + 0.05);
}
function soplo(a, { t = 0, d = 0.3, v = 0.1, f0 = 800, f1 = 3000, tipo = 'bandpass', q = 1 }) {
  const t0 = a.currentTime + t;
  const s = a.createBufferSource(); s.buffer = ruido(a); s.loop = true;
  const fl = a.createBiquadFilter(); fl.type = tipo; fl.Q.value = q;
  fl.frequency.setValueAtTime(f0, t0); fl.frequency.exponentialRampToValueAtTime(f1, t0 + d);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + d * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  s.connect(fl).connect(g).connect(busEfectos); s.start(t0); s.stop(t0 + d + 0.05);
}

const D = midi(62), FS = midi(66), A = midi(69), D2 = midi(74);
const EFECTOS = {
  clic: (a) => { nota(a, { onda: 'square', f0: 1800, f1: 1200, d: 0.035, v: 0.03, at: 0.002 }); },
  abrir: (a) => { nota(a, { onda: 'triangle', f0: 420, f1: 980, d: 0.14, v: 0.08 }); soplo(a, { d: 0.18, v: 0.03, f0: 600, f1: 2500 }); },
  cerrar: (a) => { nota(a, { onda: 'triangle', f0: 900, f1: 380, d: 0.12, v: 0.07 }); },
  entrar: (a) => [D, FS, A].forEach((f, i) => nota(a, { onda: 'triangle', f0: f, t: i * 0.09, d: 0.35, v: 0.08 })),
  confirmar: (a) => { nota(a, { onda: 'triangle', f0: A, t: 0, d: 0.12, v: 0.09 }); nota(a, { onda: 'triangle', f0: D2, t: 0.09, d: 0.3, v: 0.09 }); },
  fase: (a) => { soplo(a, { d: 0.9, v: 0.05, f0: 300, f1: 4000 }); [D, A, D2, midi(81)].forEach((f, i) => nota(a, { onda: 'sine', f0: f, t: 0.25 + i * 0.11, d: 0.9, v: 0.07 })); },
  pieza: (a) => { nota(a, { onda: 'sine', f0: 180, f1: 70, d: 0.18, v: 0.22 }); nota(a, { onda: 'square', f0: 2400, f1: 1600, d: 0.03, v: 0.03, at: 0.002 }); },
  quitar: (a) => { nota(a, { onda: 'sine', f0: 120, f1: 220, d: 0.14, v: 0.16 }); soplo(a, { d: 0.12, v: 0.03, f0: 3000, f1: 800 }); },
  aviso: (a) => { nota(a, { onda: 'square', f0: 196, d: 0.11, v: 0.05 }); nota(a, { onda: 'square', f0: 185, t: 0.13, d: 0.16, v: 0.05 }); },
  evento: (a) => { [A, D2, A].forEach((f, i) => nota(a, { onda: 'sine', f0: f, t: i * 0.12, d: 0.25, v: 0.08 })); },
  contingencia: (a) => { nota(a, { onda: 'sawtooth', f0: 330, f1: 660, d: 0.2, v: 0.05 }); nota(a, { onda: 'triangle', f0: D2, t: 0.18, d: 0.3, v: 0.08 }); },
};

let ultimo = { tipo: null, t: 0 };
export function efecto(tipo) {
  const a = listo();
  if (!a || !EFECTOS[tipo]) return;
  // Un mismo efecto no se amontona (repintados, dobles eventos)
  const ahora = performance.now();
  if (ultimo.tipo === tipo && ahora - ultimo.t < 60) return;
  ultimo = { tipo, t: ahora };
  try { EFECTOS[tipo](a); } catch { /* sin audio */ }
}

const POR_ACCION = {
  montar: 'pieza', quitar: 'quitar', firmar: 'confirmar', listo: 'confirmar', confirmarExpediente: 'confirmar',
  contingencia: 'contingencia', activarContingencia: 'contingencia', elegirRuta: 'confirmar', planificarRuta: 'confirmar',
};
export function efectoAccion(accion) { if (POR_ACCION[accion]) efecto(POR_ACCION[accion]); }

// ---------- Despegue ----------
// Tiempos de la secuencia de laptop/camara-lanzamiento.js (LZ): ignición en ign, despegue en despegue, explosión en boom.
export function lanzamientoSonoro({ ign, despegue, total, boom, falla }) {
  const a = listo();
  if (!a) return () => {};
  const t0 = a.currentTime;
  const nodos = [];
  const salida = a.createGain(); salida.gain.value = 1; salida.connect(busEfectos);
  // Rugido: ruido grave que crece en la ignición, aprieta en el despegue y se aleja
  const s = a.createBufferSource(); s.buffer = ruido(a); s.loop = true;
  const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 0.8;
  const g = a.createGain();
  const fin = falla ? boom : total;
  fl.frequency.setValueAtTime(120, t0); fl.frequency.linearRampToValueAtTime(280, t0 + despegue); fl.frequency.linearRampToValueAtTime(520, t0 + despegue + 1.5); fl.frequency.linearRampToValueAtTime(200, t0 + fin);
  g.gain.setValueAtTime(0.0001, t0); g.gain.setValueAtTime(0.0001, t0 + ign);
  g.gain.exponentialRampToValueAtTime(0.35, t0 + ign + 0.4);
  g.gain.linearRampToValueAtTime(0.6, t0 + despegue + 0.3);
  g.gain.linearRampToValueAtTime(falla ? 0.5 : 0.08, t0 + fin);
  g.gain.linearRampToValueAtTime(0.0001, t0 + fin + (falla ? 0.05 : 0.8));
  s.connect(fl).connect(g).connect(salida); s.start(t0); s.stop(t0 + fin + 1);
  nodos.push(s);
  // Subgrave
  const o = a.createOscillator(), go = a.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(38, t0);
  go.gain.setValueAtTime(0.0001, t0 + ign); go.gain.exponentialRampToValueAtTime(0.25, t0 + despegue); go.gain.linearRampToValueAtTime(0.0001, t0 + fin);
  o.connect(go).connect(salida); o.start(t0 + ign); o.stop(t0 + fin + 0.1);
  nodos.push(o);
  // Chasquido de ignición
  const chas = a.createBufferSource(); chas.buffer = ruido(a);
  const gc = a.createGain(); gc.gain.setValueAtTime(0.3, t0 + ign); gc.gain.exponentialRampToValueAtTime(0.0001, t0 + ign + 0.25);
  chas.connect(gc).connect(salida); chas.start(t0 + ign); chas.stop(t0 + ign + 0.3);
  nodos.push(chas);
  if (falla) {
    // Explosión: estallido de ruido y caída grave
    const e = a.createBufferSource(); e.buffer = ruido(a); e.loop = true;
    const fe = a.createBiquadFilter(); fe.type = 'lowpass';
    fe.frequency.setValueAtTime(3000, t0 + boom); fe.frequency.exponentialRampToValueAtTime(90, t0 + boom + 2.2);
    const ge = a.createGain(); ge.gain.setValueAtTime(0.0001, t0); ge.gain.setValueAtTime(0.9, t0 + boom); ge.gain.exponentialRampToValueAtTime(0.0001, t0 + boom + 2.6);
    e.connect(fe).connect(ge).connect(salida); e.start(t0 + boom); e.stop(t0 + boom + 2.7);
    const ob = a.createOscillator(), gb = a.createGain();
    ob.frequency.setValueAtTime(90, t0 + boom); ob.frequency.exponentialRampToValueAtTime(28, t0 + boom + 1.5);
    gb.gain.setValueAtTime(0.0001, t0); gb.gain.setValueAtTime(0.6, t0 + boom); gb.gain.exponentialRampToValueAtTime(0.0001, t0 + boom + 1.6);
    ob.connect(gb).connect(salida); ob.start(t0 + boom); ob.stop(t0 + boom + 1.7);
    nodos.push(e, ob);
  }
  // Baja la música mientras ruge el cohete
  if (busMusica) {
    const m = busMusica.gain, base = curva(vol.musica);
    m.cancelScheduledValues(t0); m.setValueAtTime(m.value, t0);
    m.linearRampToValueAtTime(base * 0.35, t0 + ign + 0.3); m.setValueAtTime(base * 0.35, t0 + fin); m.linearRampToValueAtTime(base, t0 + fin + 1.5);
  }
  return () => {
    const t = a.currentTime;
    salida.gain.setTargetAtTime(0, t, 0.08);
    nodos.forEach((n) => { try { n.stop(t + 0.4); } catch { /* ya parado */ } });
    if (busMusica) { busMusica.gain.cancelScheduledValues(t); busMusica.gain.setTargetAtTime(curva(vol.musica), t, 0.3); }
  };
}
