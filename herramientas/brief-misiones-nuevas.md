# Brief: write a new playable mission (A-Design-Tale)

Repo: `C:\Users\Emanu\Documents\SPACEAPPS\juego` (static browser game, no build step, no Node).
**Do not commit or push. Do not use the browser. Do not edit any file except your own** (the coordinator merges and tests).

## What you deliver

A single file `src/datos/misiones-nuevas/<id>.js` (today it is a stub `export default null;`: overwrite it).
Copy the EXACT structure of `src/datos/misiones-nuevas/vip-1.js` (read it in full first: it is the template) and the helpers in
`src/datos/ayudas.js`. For more examples of tone and numbers: `src/datos/misiones.js` (MER-3, LUN-3), `src/datos/piezas.js`,
`src/datos/eventos.js`, `src/datos/planificacion.js`.

Default export: `{ mision, piezas, eventosDiseno, eventosMision, contingencias, fuentes, mapas: {}, planificacion, capacidad, calendario }`.

## Hard rules (checked by `herramientas/integridad.js`)

1. **Bilingual**: all visible text is `N(es, en)` / pairs `[es, en]`. Plain, neutral Spanish; simple English (short sentences).
2. **Ids**: parts with their own 2-letter prefix + hyphen (e.g. `IS-ARR`), objectives `<ID>-O1..O3`, routes `<ID>-R1/R2`,
   events `ED-<XXX>-IN/OUT/OBJ/LIM`, `EM-<XXX>-1..6`, contingencies `CT-<XXX>-1..4`, findings `<ID>-H1..`, verification `<ID>-V1/V2`.
   Ids never appear in visible text.
3. **10-14 parts**, covering the 4 roles (`vuelo`, `ciencia`, `potencia`, `comms`). One part must provide `volumen`
   (structure), another `potencia` (generation), another `bateria` if there is shadow, another `bajada` (link). Each option carries the 5
   numbers (mass kg, power W, volume L, rate kbps, price M USD), `pros` and `contras` (≤ 8 words), and the real option carries
   `referencia: true`. At least 1/3 of the parts have 2 real decision options (clear trade-off).
   Valid categories: estructura, propulsion, actitud, camara, guiado, proteccion, sondas, instrumento, paneles, bateria, termica,
   polvo, antena, computador, memoria, navegacion, tierra, movilidad, robotica, despliegue, rtg, blindaje, regulacion, procesador.
4. **Honest numbers**: `V(x, src)` ONLY if you read the number at that source's URL (real fetch). `A` = secondary
   source/summary. Everything else `J(x)` (game) or `EST(...)` with an equation. Prices from the team's md files are
   hypothetical → `J`. Each `src` must exist in `fuentes` in your file or in `src/datos/fuentes.js` (or start with `GAP-`).
   Use `VOL(kg, litros)` for instrument volume (liters = kg / 0.23 rounded) and `BAT(Wh, DoD, kg)` (kg = Wh/(DoD·150)).
5. **3 objectives** (exactly 1 with `prioridad: true`), each with `requiere` (ids of science parts of your mission),
   `valor` (summing to ~100), `usoObjetivo` (hours/day), `datoReal` {es,en} with `src`.
6. **5 phases** (`launch` first, `pBase` 0.78-0.95, `critica` on the transport/arrival ones), `mejoras` only with parts or
   contingencies of your mission. 4 design events (IN +, OUT − with `meses`, OBJ ± with `prioridad`, LIM − with
   `limite: { recurso: 'masa'|'potencia'|'volumen', factor }` and `meses`), 6 mission events (phases of your mission, `p` 0.15-0.35,
   effects `{ ciencia: f }`, `{ dias: f }` or `{ falla: true }` in one at most), 4 contingencies (`ct(id, rol, ...)`,
   each `mitiga` symmetric with `mitigadoPor`). The `casoReal` entries tell a real fact with its source: this is the educational part.
7. **Routes**: 2, with `dias`, `masa` (propellant or transport module, kg), `precio`, `efecto: { fase, dp }`.
8. **Scoring** per scenario: orbita → `'datos'`; landing → `'cadena'`; exploracion → `'oculto'` + `oculto` list (4 findings with
   `p`, `detecta`, `valor`, `casoReal`, `src`). `fusion3`: the 2 most tightly coupled roles.
9. **Rockets** (valid ids): electron, falcon9, falconheavy, vulcan, atlasv, pegasus, minotaur4, sls. Pick 3 that can do it.
   `capacidad[destino]` already exists for `leo` and `luna`. For a new destination, give `capacidad` a value for each chosen rocket
   with `EST(kg, 'EQ-C13', N('m = m_ref × exp(−k × ΔC3) = ... ≈ X kg (...)', '...'))` (see `src/datos/cohetes.js`, function CURVA, and its
   header: k = 0.0232 at high C3; m_ref = capacity at C3 = −2 from each rocket's table) or `A(...)` if you read the published figure.
10. **Planning** (`planificacion`): `tipo` 'orbita' (sites with `inc`, `hechos.periapsis/apoapsis`), 'aterrizaje' (lat/lon) or
   'region' (x, y in 0..1 over a figure). `mapa.base` and the `real: true` layers use keys of maps already downloaded:
   `tierra-color`, `marte-color`, `marte-elevacion`, `europa-color`, `encelado-color`, `saturno`, `iss` (another agent is downloading
   them; if one does not arrive, the coordinator fixes it), plus `luna-color`, `luna-elevacion`.
   Available computed layers: `pendiente` (with `base` = key of an elevation map) and `hielo` (generic polar caps).
   3-4 sites/orbits with `efectos` (phases of your mission, science per objective), `hechos`, `nota` (data, not verdicts).
   `lanzamiento: { mesMax, dvMin, fase, faseEspacio, nota }`.
11. **`calendario`**: if your destination is new, `{ src: 'HORIZONS' }`; otherwise `null`.
12. Hints, not answers: the texts of parts/sites describe physics and data; they never say "this is the right one" nor "it serves objective X".

## Data sources
The team's md files (in `C:\Users\Emanu\Documents\SPACEAPPS`): `componentes_tres_misiones_todos_objetivos.md`,
`diseno_de_misiones_M.md`, `catalogo_de_piezas_M.md`, `misiones-referencias.md`, `investigacion-instrumentos-2.md`.
Verify on the web (WebFetch/WebSearch, at most ~8 queries) only the figures you mark `V`/`A`: NASA/JPL/ESA pages.
Add each new source to `fuentes` with `F(tituloEs, tituloEn, url, [agenciaEs, agenciaEn], conf)`; id with your prefix (`ISS-01`...).

## When done
Re-read your file looking for JS syntax errors (commas, braces, quotes: use single quotes and escape `\'`). Report in ≤ 15
lines: file, parts, which figures are V/A and from which URL, and doubts.
