# A-Design-Tale

> The game UI is available in English and Spanish (Settings → Language).

Game for the Spaceapps 2026

## Briefing room (prototype)

Collaborative prototype for the mission design game (NASA Space Apps 2026). Four players, each in their own seat with their own point of view, in a low-poly room with no textures.

## Technology

| Piece | What we use | Why |
|---|---|---|
| 3D | [Three.js](https://threejs.org) 0.180 | Lightweight, runs in any browser, no downloads |
| Multiplayer | [mqtt.js](https://github.com/mqttjs/MQTT.js) 5.16.1 over public MQTT brokers (secure WebSocket) | Relay: every message goes through several brokers at once, so it does not depend on direct connections between players. No server of our own and no WebRTC. Not yet tested across different networks; a network that filters ports blocks it (see limits) |
| Hosting | GitHub Pages | Static files: there is no build step |

The libraries are loaded from jsDelivr through the `importmap` in `index.html`. Node.js is not needed.

## Try it locally

```bash
python -m http.server 8770 --directory juego
```

Open `http://localhost:8770/` in two tabs or on two machines with the **same URL** (the room code comes after `#`). Each player picks a role.

## What it does

- **Start:** a sign with the game name over an animated low-poly control center. The name and brand texts are changed in `src/config.js`.
- **Join crew / Lobby:** nick and room code; up to 4 players; role selection (taken roles are locked). "Start mission" takes everyone to the briefing.
- **Briefing:** shared 3D room (drag to look around) with a panel: scenario, the scenario's 3 missions as folders (only the playable one can be chosen), difficulty and mission sheet.
- **Design and Constraints:** workshop with the role's parts (left), blueprint with what all four roles have assembled (center) and a global panel with the six bars, science coverage and sign-offs (right). Workshop, Rocket, Route and Risks tabs. Any player can edit a vacant role (role selector). Design events appear as a modal card. Constraints is the same workshop with the overrun warning and no way to add parts.
- **Verification:** GO / NO-GO vote on the control room wall (`src/control/gonogo.js`): checks, each department's GO and "Launch".
- **Mission:** control room: phases revealed one by one (everyone sees the same), events, received data and "Next".
- **Debrief:** flight report in the control room (`src/control/debrief.js`): verdict, steps, science and the real mission; findings, causes and sources are collapsed. "Fly again" and "New mission".
- **Settings:** camera sensitivity, graphics quality, music and effects volume, and background animation (saved in the browser).
- **Sound** (`src/audio.js`): three tracks with a crossfade depending on the phase. Title (start and lobby): `assets/musica/tema.mp3`, the calmest. Design (briefing, design, constraints) and launch (verification, mission, debrief): composed with WebAudio in the same key (D minor) and pulse (64 / 128 BPM); to use a file, just put its path in `PISTAS`. Synthesized effects: button clicks, opening dialogs, entering the room, assembling and removing parts, GO sign-offs, contingencies, warnings, design events, phase change and the liftoff roar (with an explosion on failure). Music starts with the first click (browsers do not allow sound before that).
- **Reviewing screens offline:** `http://localhost:8770/?simulado=1` uses fake data and rules (`src/pantallas/_simulado.js`) and a purple bar to jump between phases or roles. Parameters: `fase` (`briefing`, `diseno`, `restricciones`, `verificacion`, `mision`, `informe`), `rol` (`vuelo`, `ciencia`, `potencia`, `comms`), `jugadores` (1 to 4; roles without a player stay vacant).

## Flow inside the 3D world (current version)

The whole game takes place in the 3D environment; the interfaces are projected onto objects in the scene.

- **Briefing room:** click a hologram on the projector to choose a scenario. The chief puts 3 folders on the table (cinematic; the draw is random using the game seed and always includes the playable mission). Clicking a folder opens the file: the mission is assigned, objectives are checked (the priority one is mandatory; the ambition sets the design events) and each player presses "Ready". Design starts when the whole crew is ready.
- **Guide (no top bar):** each player sees a single "Next ›" line computed from the state (what is still missing for them, not a fixed text per phase) and the phase as dots. It is shown in the laptop bar, in the control room header and, when looking at the room, in a card at the bottom left with shortcuts and "Leave to lobby". An amber arrow floats over the object to use next (your laptop or the door). Rule warnings appear at the bottom center (`src/pantallas/index.js`, `estilos/guia.css`).
- **Each seat's laptop** (click the laptop or the "Laptop" button; Esc to raise your view): AGENCIA·OS with a KSP-style Builder (`src/laptop/constructor.js`), Launch Camera (`camara-lanzamiento.js`), Contingencies per department (`contingencias.js`), Status, Dossier and SOP Manual (`manual.js`). The "Control room" icon in the dock leads straight there.
- **SOP Manual** for each department: on the laptop or by clicking the ring binder on the table.
- **Dossier:** when looking at the room, a tab at the bottom right (it unfolds on hover; click to open it fully). On the laptop it is an app; on the wall it is not shown.
- **Mission control as a 3D room** (`crearCentroDeControl({ jugadores: true })` in `src/inicio.js`, the same room as the start screen): each player sits at the station for their role, in the first row of consoles and facing the screen wall, and sees the others with their nick and where they are looking (presence also carries which room each one is in). You look around by dragging, as in the briefing. Click the central screen = frame it and use the phase's interface; click your console = set or remove your GO in the vote (each console's lamp reflects its department's sign-off); the door on the left wall and the "Briefing room" button return to the briefing. Esc from the wall goes back to looking at the room. Below, the detail of what is on the wall:
- **Control room wall** (room door, dock icon or "Control room" button; from there "Laptop" goes straight back to the laptop): during design, route planning (`src/control/planificador.js`): route, launch window (ΔV curve; away from the optimum there is more propellant) and site/orbit on real maps (LROC, LOLA, MESSENGER, OSIRIS) with data layers (some computed, others approximate and marked "≈ game"). During verification, the GO / NO-GO poll (`src/control/gonogo.js`). During the mission, the operations console (`src/control/operaciones.js`) with a two-body RK4 propagator (`src/control/propagador.js`), mission sequence, telemetry and contingency activation by the owning department. At the end, the flight report (`src/control/debrief.js`).
- **Language:** Settings → Idioma / Language (ES/EN), local to each player (`src/i18n.js`).
- **Playing solo offline:** `http://localhost:8770/?local=1` uses the real rules and data with an in-memory transport (vacant departments are operated by the player).

## Interface: visual rules

The screens are projected onto 3D objects: the laptop measures 1024 × 640 logical px and the control wall 1280 × 640 (`LOGICO` in `src/pantallas/index.js`); `main.js` scales them to the real size (≈1.15× and ≈1.03× in a 1366 px window).

- **`estilos/sistema.css`** defines the text scale (`--t-meta` 14 px, `--t-cuerpo` 16, `--t-enfasis` 18, `--t-titulo` 22, `--t-grande` 28), the pixel-font scale (`--tp-etq` 12, `--tp-titulo` 16, `--tp-grande` 24), the spacing and **a single button** `.boton` (`.primario`, `.peligro`, `.on`, `.grande`, `.enorme`, `.ancho`, `.texto`). The skin is set by the container: blue sign in the room and the lobby, cream on the laptop (`.laptop-so`) and, on the wall (`.mc`), the same retro family with an indigo, cyan and amber palette (`--mc-*` variables in `estilos/control.css`; the canvases read it with `src/control/paleta.js`). `.btn-plano` (older screens) looks the same.
- No running text below 14 logical px; the pixel font only for short titles, buttons and figures.
- Each screen fits in its frame without scrolling; only long lists have their own scroll. Anything not needed to act in that phase goes into a `title`, a `<details>` or the manual.
- "Press Start 2P" has no accented capitals; `estilos.css` includes pixel Á É Í Ó Ú Ñ Ü generated with `herramientas/acentos-pixel.py`.
- `estilos/escritorio.css`: laptop desktop (bar, dock, window) and the dossier folder.

## Files

- `index.html`: start sign, dialogs, lobby, game screen containers and importmap.
- `src/config.js`: game name and brand texts.
- `src/textos.js`: all interface texts for the game screens (English).
- `src/inicio.js`: background control center.
- `src/escena.js`: briefing room (table, seats, projector, folders, door), avatars and NPCs.
- `src/decorado-briefing.js`: the set of the briefing room, a mission design office: carpet and rug, technical ceiling with duct and pendants, night-time picture window, posters, mission control center clocks, rocket models, satellite and globe, bookcase, credenza and coffee corner. Textures are drawn on canvas, with no image files.
- `src/main.js`: start and lobby screens, per-seat camera, and the connection of the session with `src/pantallas/`.
- `src/pantallas/`: one screen per phase. `index.js` (next-step guide, warnings, state-driven repainting, events modal), `briefing.js`, `taller.js` (Design and Constraints, with `cohete.js`, `ruta.js`, `riesgos.js`), `panel-global.js`, `verificacion.js`, `mision.js`, `informe.js`, `ui.js` (helpers) and `_simulado.js` (fake data and rules for `?simulado=1`).
- `src/reglas/` and `src/datos/`: rules engine and data.
- `src/red/`: multiplayer protocol (see [PROTOCOLO.md](PROTOCOLO.md)).
  - `protocolo.js`: state, phases and validated actions.
  - `sesion.js`: host, state replica, handovers and merges.
  - `transporte-mqtt.js` (real: MQTT relay with redundant brokers) and `transporte-memoria.js` (simulated, for tests).
- `pruebas/`: protocol and transport tests. Open `http://localhost:8770/pruebas/`. Details in [PROTOCOLO.md](PROTOCOLO.md#10-tests).

## Known limits

- The public brokers (`RED.BROKERS` in `src/config.js`) have no service guarantee and are meant for testing. Three are used at once so that one is enough.
- They use ports 8884, 8081 and 8084, not 443. A network that filters ports may block all of them; the lobby then shows "SIN CONEXIÓN · REINTENTANDO…" (no connection, retrying).
- The topics are public: anyone who knows the room code can read and write in it. EMQX drops messages above ~10 per second (presence is limited because of that) and the order between brokers is not guaranteed.
- Guaranteed reliability would need a relay of our own on port 443 (Cloudflare Workers with Durable Objects, Firebase or Supabase; they require an account). It would be enough to write another transport with the same interface. More in [PROTOCOLO.md](PROTOCOLO.md#11-known-limits).
- The whole state is replicated to everyone: each role's "private" information is only hidden in the interface.
- `window.__depurar` (test hook for `pruebas/ir-a-mision.js`) only exists in `?local=1` mode.
