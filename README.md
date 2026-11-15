# A-Design-Tale

Game for the Spaceapps 2026

## Sala de briefing (prototipo)

Prototipo colaborativo para el juego de diseño de misiones (NASA Space Apps 2026). Cuatro jugadores, cada uno en su asiento y con su propio punto de vista, en una sala low poly sin texturas.

## Tecnología

| Pieza | Qué usamos | Por qué |
|---|---|---|
| 3D | [Three.js](https://threejs.org) 0.180 | Ligero, corre en cualquier navegador, sin descargas |
| Multijugador | [mqtt.js](https://github.com/mqttjs/MQTT.js) 5.16.1 sobre brokers MQTT públicos (WebSocket seguro) | Relé: todos los mensajes pasan por varios brokers a la vez, así que no depende de conexiones directas entre jugadores. No hay servidor propio ni WebRTC. Sin probar aún entre redes distintas; una red que filtre puertos lo bloquea (ver límites) |
| Hosting | GitHub Pages | Archivos estáticos: no hay paso de compilación |

Las librerías se cargan desde jsDelivr con el `importmap` de `index.html`. No hace falta Node.js.

## Probarlo en local

```bash
python -m http.server 8770 --directory juego
```

Abre `http://localhost:8770/` en dos pestañas o en dos equipos con la **misma URL** (el código de sala va después de `#`). Cada uno elige un rol.

## Qué hace

- **Inicio:** cartel con el nombre del juego sobre un centro de control low poly animado. El nombre y los textos de marca se cambian en `src/config.js`.
- **Join crew / Lobby:** nick y código de sala; hasta 4 jugadores; elección de rol (los ocupados se bloquean). "Iniciar misión" lleva a todos al briefing.
- **Briefing:** sala 3D compartida (arrastrar para mirar) con un panel: escenario, las 3 misiones del escenario como carpetas (solo la jugable se puede elegir), dificultad y ficha de la misión.
- **Diseño y Restricciones:** taller con piezas del rol (izquierda), plano con lo montado por los cuatro roles (centro) y panel global con las seis barras, la cobertura de ciencia y las firmas (derecha). Pestañas Workshop, Rocket, Route y Risks. Un rol vacante lo puede editar cualquiera (selector de rol). Los eventos de diseño salen como tarjeta modal. Restricciones es el mismo taller con el aviso de exceso y sin poder añadir piezas.
- **Verificación:** votación GO / NO-GO en la pared de la sala de control (`src/control/gonogo.js`): comprobaciones, el GO de cada departamento y "Lanzar".
- **Misión:** sala de control: fases reveladas una a una (todos ven lo mismo), eventos, datos recibidos y "Next".
- **Informe:** informe de vuelo en la sala de control (`src/control/debrief.js`): veredicto, pasos, ciencia y misión real; hallazgos, causas y fuentes plegados. "Volver a volar" y "Nueva misión".
- **Ajustes:** sensibilidad de la cámara, calidad gráfica, volumen de música y de efectos, y animación del fondo (se guardan en el navegador).
- **Sonido** (`src/audio.js`): tres pistas con fundido cruzado según la fase. Título (inicio y lobby): `assets/musica/tema.mp3`, la más tranquila. Diseño (briefing, diseño, restricciones) y lanzamiento (verificación, misión, informe): compuestas con WebAudio en la misma tonalidad (re menor) y pulso (64 / 128 BPM); para usar un archivo basta con poner su ruta en `PISTAS`. Efectos sintetizados: clic de botones, abrir diálogos, entrar en la sala, montar y quitar piezas, firmas GO, contingencias, avisos, eventos de diseño, cambio de fase y el rugido del despegue (con explosión si falla). La música empieza con el primer clic (los navegadores no dejan sonar antes).
- **Revisar pantallas sin red:** `http://localhost:8770/?simulado=1` usa datos y reglas falsos (`src/pantallas/_simulado.js`) y una barra morada para saltar de fase o de rol. Parámetros: `fase` (`briefing`, `diseno`, `restricciones`, `verificacion`, `mision`, `informe`), `rol` (`vuelo`, `ciencia`, `potencia`, `comms`), `jugadores` (1 a 4; los roles sin jugador quedan vacantes).

## Flujo dentro del 3D (versión actual)

Todo el juego ocurre en el entorno 3D; las interfaces se proyectan sobre objetos de la escena.

- **Sala de briefing:** clic en un holograma del proyector para elegir escenario. El jefe pone 3 carpetas sobre la mesa (cinemática; el reparto es aleatorio con la semilla de la partida y siempre incluye la misión jugable). Clic en una carpeta abre el expediente: se asigna la misión, se marcan los objetivos (el prioritario es obligatorio; la ambición fija los eventos de diseño) y cada jugador pulsa "Listo". El diseño empieza cuando toda la tripulación está lista.
- **Guía (sin barra superior):** cada jugador ve una sola línea "Siguiente ›" calculada del estado (qué le falta a él, no un texto fijo por fase) y la fase como puntos. Va en la barra del portátil, en la cabecera de la sala de control y, mirando la sala, en una tarjeta abajo a la izquierda con atajos y "Salir al lobby". Una flecha ámbar flota sobre el objeto que toca usar (tu portátil o la puerta). Los avisos de reglas salen abajo al centro (`src/pantallas/index.js`, `estilos/guia.css`).
- **Portátil de cada asiento** (clic en el portátil o botón "Portátil"; Esc para levantar la vista): AGENCIA·OS con Constructor tipo KSP (`src/laptop/constructor.js`), Cámara de lanzamiento (`camara-lanzamiento.js`), Contingencias por departamento (`contingencias.js`), Estado, Expediente y Manual SOP (`manual.js`). El icono "Sala de control" del dock lleva directamente allí.
- **Manual SOP** de cada departamento: en el portátil o clic en la carpeta de anillas de la mesa.
- **Expediente:** mirando la sala, pestaña abajo a la derecha (se despliega al pasar el ratón; clic para abrirlo entero). En el portátil es una app; en la pared no se muestra.
- **Sala de control de misión como sala 3D** (`crearCentroDeControl({ jugadores: true })` en `src/inicio.js`, la misma sala del inicio): cada jugador se sienta en el puesto de su rol, en la primera fila de consolas y mirando a la pared de pantallas, y ve a los demás con su nick y hacia dónde miran (la presencia lleva también en qué sala está cada uno). Se mira arrastrando, como en el briefing. Clic en la pantalla central = encuadrarla y usar la interfaz de la fase; clic en tu consola = poner o quitar tu GO en la votación (la lámpara de cada consola refleja la firma de su departamento); la puerta de la pared izquierda y el botón "Sala de briefing" vuelven al briefing. Esc desde la pared vuelve a mirar la sala. Abajo, el detalle de lo que hay en la pared:
- **Pared de la sala de control** (puerta de la sala, icono del dock o botón "Sala de control"; desde allí "Portátil" vuelve directo al portátil): en diseño, planificación de ruta (`src/control/planificador.js`): ruta, ventana de lanzamiento (curva de ΔV; fuera del óptimo hay más propelente) y sitio/órbita sobre mapas reales (LROC, LOLA, MESSENGER, OSIRIS) con capas de datos (algunas calculadas, otras aproximadas y marcadas "≈ juego"). En verificación, la consulta GO / NO-GO (`src/control/gonogo.js`). En misión, consola de operaciones (`src/control/operaciones.js`) con propagador RK4 de dos cuerpos (`src/control/propagador.js`), secuencia de misión, telemetría y activación de contingencias por el departamento dueño. Al final, el informe de vuelo (`src/control/debrief.js`).
- **Idioma:** Ajustes → Idioma / Language (ES/EN), local de cada jugador (`src/i18n.js`).
- **Jugar en solitario sin red:** `http://localhost:8770/?local=1` usa las reglas y datos reales con un transporte en memoria (los departamentos vacantes los opera el jugador).

## Interfaz: reglas visuales

Las pantallas se proyectan sobre objetos 3D: el portátil mide 1024 × 640 px lógicos y la pared de control 1280 × 640 (`LOGICO` en `src/pantallas/index.js`); `main.js` las escala al tamaño real (≈1,15× y ≈1,03× en una ventana de 1366 px).

- **`estilos/sistema.css`** define la escala de texto (`--t-meta` 14 px, `--t-cuerpo` 16, `--t-enfasis` 18, `--t-titulo` 22, `--t-grande` 28), la de la fuente pixel (`--tp-etq` 12, `--tp-titulo` 16, `--tp-grande` 24), el espaciado y **un único botón** `.boton` (`.primario`, `.peligro`, `.on`, `.grande`, `.enorme`, `.ancho`, `.texto`). La piel la pone el contenedor: cartel azul en la sala y el lobby, crema en el portátil (`.laptop-so`) y, en la pared (`.mc`), la misma familia retro con paleta índigo, cian y ámbar (variables `--mc-*` en `estilos/control.css`; los canvas la leen con `src/control/paleta.js`). `.btn-plano` (pantallas antiguas) se ve igual.
- Ningún texto corrido por debajo de 14 px lógicos; la fuente pixel solo para títulos cortos, botones y cifras.
- Cada pantalla cabe en su marco sin desplazarse; solo las listas largas tienen scroll propio. Lo que no hace falta para actuar en esa fase va a un `title`, a un `<details>` o al manual.
- "Press Start 2P" no trae mayúsculas acentuadas; `estilos.css` incluye Á É Í Ó Ú Ñ Ü pixel generadas con `herramientas/acentos-pixel.py`.
- `estilos/escritorio.css`: escritorio del portátil (barra, dock, ventana) y la carpeta del expediente.

## Archivos

- `index.html`: cartel de inicio, diálogos, lobby, contenedores de las pantallas de juego e importmap.
- `src/config.js`: nombre del juego y textos de marca.
- `src/textos.js`: todos los textos de interfaz de las pantallas de juego (inglés).
- `src/inicio.js`: centro de control del fondo.
- `src/escena.js`: sala de briefing (mesa, asientos, proyector, carpetas, puerta), avatares y NPC.
- `src/decorado-briefing.js`: el escenario de la sala de briefing, una oficina de diseño de misiones: moqueta y alfombra, techo técnico con conducto y colgantes, ventanal nocturno, carteles, relojes de centros de control, maquetas de cohete, satélite y globo, librería, credenza y rincón del café. Las texturas se dibujan en canvas, sin archivos de imagen.
- `src/main.js`: pantallas de inicio y lobby, cámara por asiento, y conexión de la sesión con `src/pantallas/`.
- `src/pantallas/`: una pantalla por fase. `index.js` (guía del siguiente paso, avisos, repintado por estado, modal de eventos), `briefing.js`, `taller.js` (Diseño y Restricciones, con `cohete.js`, `ruta.js`, `riesgos.js`), `panel-global.js`, `verificacion.js`, `mision.js`, `informe.js`, `ui.js` (ayudas) y `_simulado.js` (datos y reglas falsos para `?simulado=1`).
- `src/reglas/` y `src/datos/`: motor de reglas y datos (los escriben otros; ver `mecanicas-del-juego.md`).
- `src/red/`: protocolo multijugador (ver [PROTOCOLO.md](PROTOCOLO.md)).
  - `protocolo.js`: estado, fases y acciones validadas.
  - `sesion.js`: anfitrión, réplica del estado, relevos y fusiones.
  - `transporte-mqtt.js` (real: relé MQTT con brokers redundantes) y `transporte-memoria.js` (simulado, para pruebas).
- `pruebas/`: pruebas del protocolo y del transporte. Abrir `http://localhost:8770/pruebas/`. Detalles en [PROTOCOLO.md](PROTOCOLO.md#10-pruebas).

## Límites conocidos

- Los brokers públicos (`RED.BROKERS` en `src/config.js`) no tienen garantía de servicio y están pensados para pruebas. Se usan tres a la vez para que baste con uno.
- Usan los puertos 8884, 8081 y 8084, no el 443. Una red que filtre puertos puede bloquearlos todos; entonces el lobby muestra "SIN CONEXIÓN · REINTENTANDO…".
- Los temas son públicos: cualquiera que sepa el código de sala puede leer y escribir en ella. EMQX descarta por encima de ~10 mensajes por segundo (la presencia está limitada por eso) y el orden entre brokers no está garantizado.
- Para fiabilidad garantizada haría falta un relé propio en el puerto 443 (Cloudflare Workers con Durable Objects, Firebase o Supabase; requieren cuenta). Bastaría escribir otro transporte con la misma interfaz. Más en [PROTOCOLO.md](PROTOCOLO.md#11-límites-conocidos).
- El estado se replica entero a todos: la información "privada" de cada rol solo se oculta en la interfaz.
- `window.__depurar` expone la sesión para pruebas; quitarlo antes de la entrega.
