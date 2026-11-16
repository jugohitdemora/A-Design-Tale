// Chat de la sala: panel con el mismo material que la tarjeta de guía (cartel azul marino, marco metálico, remaches).
// Los mensajes son efímeros: no entran en el estado replicado ni en las reglas (sesion.chat los difunde, ver PROTOCOLO.md §2).
// Todo texto se pinta con textContent: nadie puede inyectar HTML.
import { textos } from './i18n.js';

const T = textos({
  es: { titulo: 'Radio', abrir: 'Abrir chat de la sala', cerrar: 'Cerrar', enviar: 'Enviar', ph: 'Escribe un mensaje…', vacio: 'Nadie ha hablado aún. Pulsa Enter para escribir.', yo: 'tú', lento: 'Más despacio…' },
  en: { titulo: 'Radio', abrir: 'Open room chat', cerrar: 'Close', enviar: 'Send', ph: 'Type a message…', vacio: 'Nobody has spoken yet. Press Enter to type.', yo: 'you', lento: 'Slow down…' },
});

const MAX_TEXTO = 200;      // caracteres por mensaje
const MAX_HISTORIAL = 60;   // mensajes que se conservan
const ESPERA_MS = 700;      // mínimo entre dos envíos propios

export function crearChat({ enviar, idPropio, colorDe = () => '#f1e6cf', alMensaje = () => {} }) {
  const el = (tag, clase, txt) => { const n = document.createElement(tag); if (clase) n.className = clase; if (txt != null) n.textContent = txt; return n; };

  const raiz = el('aside', 'chat oculto');
  const boton = el('button', 'chat-boton');
  boton.type = 'button';
  const bTxt = el('span', 'chat-boton-txt');
  const insignia = el('b', 'chat-insignia oculto');
  boton.append(el('span', 'chat-ico', '✉'), bTxt, insignia);

  const panel = el('section', 'chat-panel oculto');
  const titulo = el('span', 'chat-titulo');
  const cerrar = el('button', 'chat-cerrar', '✕');
  cerrar.type = 'button';
  const cab = el('header', 'chat-cab');
  cab.append(titulo, cerrar);
  const lista = el('ul', 'chat-lista');
  lista.setAttribute('aria-live', 'polite');
  const form = el('form', 'chat-form');
  const entrada = el('input', 'chat-entrada');
  entrada.type = 'text'; entrada.maxLength = MAX_TEXTO; entrada.autocomplete = 'off'; entrada.spellcheck = false;
  const mandar = el('button', 'boton primario chat-enviar');
  mandar.type = 'submit';
  form.append(entrada, mandar);
  panel.append(cab, lista, form);
  raiz.append(panel, boton);
  document.body.appendChild(raiz);

  const mensajes = [];
  let abierto = false, sinLeer = 0, ultimoEnvio = 0, visible = false;

  function pintar() {
    lista.replaceChildren();
    if (!mensajes.length) lista.appendChild(el('li', 'chat-vacio', T.vacio));
    for (const m of mensajes) {
      const li = el('li', 'chat-msg' + (m.propio ? ' propio' : ''));
      const quien = el('span', 'chat-nick', m.propio ? `${m.nick} (${T.yo})` : m.nick);
      quien.style.color = colorDe(m.id);
      li.append(quien, el('span', 'chat-texto', m.texto));
      lista.appendChild(li);
    }
    lista.scrollTop = lista.scrollHeight;
  }
  function textosFijos() {
    bTxt.textContent = T.titulo; titulo.textContent = T.titulo;
    boton.setAttribute('aria-label', T.abrir); boton.title = T.abrir + " (Enter)";
    cerrar.setAttribute('aria-label', T.cerrar); mandar.textContent = T.enviar; entrada.placeholder = T.ph;
    pintar();
  }
  function marcarSinLeer() {
    insignia.textContent = sinLeer > 9 ? '9+' : String(sinLeer);
    insignia.classList.toggle('oculto', !sinLeer);
    boton.classList.toggle('nuevo', sinLeer > 0);
  }
  function abrir(on) {
    abierto = on;
    panel.classList.toggle('oculto', !on);
    boton.classList.toggle('oculto', on);
    if (on) { sinLeer = 0; marcarSinLeer(); pintar(); entrada.focus(); } else entrada.blur();
  }
  function anadir(m) {
    mensajes.push(m);
    if (mensajes.length > MAX_HISTORIAL) mensajes.shift();
    if (abierto) pintar();
    else if (!m.propio) { sinLeer++; marcarSinLeer(); }
  }

  boton.addEventListener('click', () => abrir(true));
  cerrar.addEventListener('click', () => abrir(false));
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const texto = entrada.value.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXTO);
    if (!texto) return;
    const t = performance.now();
    if (t - ultimoEnvio < ESPERA_MS) { entrada.placeholder = T.lento; setTimeout(() => { entrada.placeholder = T.ph; }, 900); return; }
    ultimoEnvio = t;
    entrada.value = '';
    enviar(texto);
    anadir({ id: idPropio, nick: chat.nick, texto, propio: true });
    alMensaje(true);
  });
  // Lo que se teclea aquí no debe llegar al juego (Esc de la sala, atajos). Esc cierra el chat.
  raiz.addEventListener('keydown', (ev) => {
    ev.stopPropagation();
    if (ev.key === 'Escape') abrir(false);
  });
  // Enter abre el chat y enfoca la línea, salvo que ya se esté escribiendo en otro campo.
  addEventListener('keydown', (ev) => {
    if (!visible || abierto || ev.key !== 'Enter' || ev.defaultPrevented) return;
    const a = document.activeElement;
    if ((a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) || a?.isContentEditable) return;
    if (document.querySelector('dialog[open]')) return;
    ev.preventDefault();
    abrir(true);
  });
  addEventListener('idioma', textosFijos);
  textosFijos();

  const chat = {
    nick: '',
    // Mensaje de otro jugador.
    recibir(id, nick, texto) { anadir({ id, nick, texto, propio: false }); alMensaje(false); },
    ponerNick(n) { chat.nick = n; },
    // Solo se ve dentro de una sala.
    mostrar(on) {
      visible = on;
      raiz.classList.toggle('oculto', !on);
      if (!on && abierto) abrir(false);
    },
    vaciar() { mensajes.length = 0; sinLeer = 0; marcarSinLeer(); pintar(); },
  };
  return chat;
}
