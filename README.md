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
- **Verificación:** lista de comprobaciones, cuatro firmas y "Launch".
- **Misión:** sala de control: fases reveladas una a una (todos ven lo mismo), eventos, datos recibidos y "Next".
- **Informe:** veredicto, causas, ciencia, barras finales, misión real de referencia y fuentes; "Redesign and fly again" y "New mission".
- **Ajustes:** sensibilidad de la cámara, calidad gráfica y animación del fondo (se guardan en el navegador).
- **Revisar pantallas sin red:** `http://localhost:8770/?simulado=1` usa datos y reglas falsos (`src/pantallas/_simulado.js`) y una barra morada para saltar de fase o de rol. Parámetros: `fase` (`briefing`, `diseno`, `restricciones`, `verificacion`, `mision`, `informe`), `rol` (`vuelo`, `ciencia`, `potencia`, `comms`), `jugadores` (1 a 4; los roles sin jugador quedan vacantes).

## Archivos

- `index.html`: cartel de inicio, diálogos, lobby, contenedores de las pantallas de juego e importmap.
- `src/config.js`: nombre del juego y textos de marca.
- `src/textos.js`: todos los textos de interfaz de las pantallas de juego (inglés).
- `src/inicio.js`: centro de control del fondo.
- `src/escena.js`: sala de briefing, avatares y NPC.
- `src/main.js`: pantallas de inicio y lobby, cámara por asiento, y conexión de la sesión con `src/pantallas/`.
- `src/pantallas/`: una pantalla por fase. `index.js` (franja superior, repintado por estado, modal de eventos), `briefing.js`, `taller.js` (Diseño y Restricciones, con `cohete.js`, `ruta.js`, `riesgos.js`), `panel-global.js`, `verificacion.js`, `mision.js`, `informe.js`, `ui.js` (ayudas) y `_simulado.js` (datos y reglas falsos para `?simulado=1`).
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
