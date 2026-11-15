# A-Design-Tale

Game for the Spaceapps 2026

## Sala de briefing (prototipo)

Prototipo colaborativo para el juego de diseño de misiones (NASA Space Apps 2026). Cuatro jugadores, cada uno en su asiento y con su propio punto de vista, en una sala low poly sin texturas.

## Tecnología

| Pieza | Qué usamos | Por qué |
|---|---|---|
| 3D | [Three.js](https://threejs.org) 0.180 | Ligero, corre en cualquier navegador, sin descargas |
| Multijugador | [Trystero](https://github.com/dmotz/trystero) 0.25.4, estrategia MQTT | WebRTC entre navegadores. Los brokers MQTT públicos solo sirven para que los jugadores se encuentren; los datos van directos y cifrados. No hay servidor propio |
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
  - `transporte-trystero.js` (real) y `transporte-memoria.js` (simulado, para pruebas).
- `pruebas/`: pruebas del protocolo sobre la red simulada. Abrir `http://localhost:8770/pruebas/`.

## Límites conocidos

- Algunas redes (corporativas, universitarias) bloquean WebRTC sin un servidor TURN. Si dos jugadores no se ven, es lo primero que hay que revisar.
- El estado se replica entero a todos: la información "privada" de cada rol solo se oculta en la interfaz.
- `window.__depurar` expone la sesión para pruebas; quitarlo antes de la entrega.
