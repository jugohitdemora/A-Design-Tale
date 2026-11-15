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

- **Inicio:** cartel con el nombre del juego sobre un centro de control low poly animado (gradas de consolas y pared de pantallas). El nombre y los textos se cambian en `src/config.js`.
- **Join crew:** pide un nick y un código de sala. Un enlace con `#CODIGO` abre este diálogo con la sala ya puesta.
- **Lobby:** cuántos hay en la sala (máx. 4), la tripulación con su nick y su rol, y la elección de rol (los ocupados se bloquean). "Iniciar misión" solo se activa cuando todos tienen rol, y lleva a todos a la vez a la sala de briefing.
- **Sala de briefing:** cada jugador ve desde su asiento y mira arrastrando. Los demás ven su cabeza girar. Pizarra y carpetas compartidas.
- **Ajustes:** sensibilidad de la cámara, calidad gráfica y animación del fondo (se guardan en el navegador).

## Archivos

- `index.html`: cartel de inicio, diálogos, lobby, HUD e importmap.
- `src/config.js`: nombre del juego y textos de marca.
- `src/inicio.js`: centro de control del fondo.
- `src/escena.js`: sala de briefing, avatares y NPC.
- `src/main.js`: pantallas, lobby, cámara por asiento.
- `src/red/`: protocolo multijugador (ver [PROTOCOLO.md](PROTOCOLO.md)).
  - `protocolo.js`: estado, fases y acciones validadas. Aquí se añaden las acciones de cada fase nueva.
  - `sesion.js`: anfitrión, réplica del estado, relevos y fusiones.
  - `transporte-mqtt.js` (real: relé MQTT con brokers redundantes) y `transporte-memoria.js` (simulado, para pruebas).
- `pruebas/`: 34 pruebas (16 del protocolo sobre la red simulada y 18 del transporte MQTT sobre `broker-falso.js`). Abrir `http://localhost:8770/pruebas/`; `?solo=mqtt` ejecuta solo las del transporte, `?veces=N` las repite y `?lento=K` multiplica sus tiempos por K. Detalles en [PROTOCOLO.md](PROTOCOLO.md#10-pruebas).

## Límites conocidos

- Los brokers públicos (`RED.BROKERS` en `src/config.js`) no tienen garantía de servicio y están pensados para pruebas. Se usan tres a la vez para que baste con uno.
- Usan los puertos 8884, 8081 y 8084, no el 443. Una red que filtre puertos puede bloquearlos todos; entonces el lobby muestra "SIN CONEXIÓN · REINTENTANDO…".
- Los temas son públicos: cualquiera que sepa el código de sala puede leer y escribir en ella. EMQX descarta por encima de ~10 mensajes por segundo (la presencia está limitada por eso) y el orden entre brokers no está garantizado.
- Para fiabilidad garantizada haría falta un relé propio en el puerto 443 (Cloudflare Workers con Durable Objects, Firebase o Supabase; requieren cuenta). Bastaría escribir otro transporte con la misma interfaz. Más en [PROTOCOLO.md](PROTOCOLO.md#11-límites-conocidos).
- El estado se replica entero a todos: la información "privada" de cada rol solo se oculta en la interfaz.
- `window.__depurar` expone la sesión para pruebas; quitarlo antes de la entrega.
