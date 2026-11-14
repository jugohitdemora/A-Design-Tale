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

- Lobby con código de sala, enlace para compartir y los 4 roles (los ocupados se bloquean).
- Cada jugador ve la sala desde su asiento y mira arrastrando con el ratón o con el dedo.
- Los demás ven la cabeza de cada jugador girar hacia donde mira.
- Pizarra (Objetivos, Tareas, Riesgos) y carpetas compartidas: un clic las cambia para todos.
- Si dos personas toman el mismo rol a la vez, se queda la de id menor.

## Archivos

- `index.html`: lobby, HUD e importmap.
- `src/escena.js`: sala, mesa, sillas, avatares y NPC.
- `src/red.js`: conexión entre pares.
- `src/main.js`: cámara por asiento, controles, sincronización.

## Límites conocidos

- Algunas redes (corporativas, universitarias) bloquean WebRTC sin un servidor TURN. Si dos jugadores no se ven, es lo primero que hay que revisar.
- El estado compartido se resuelve con "gana la última versión". Basta para el prototipo; la fase de Diseño necesitará algo más sólido.
- `window.__depurar` expone el estado para pruebas; quitarlo antes de la entrega.
