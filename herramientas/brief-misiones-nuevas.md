# Brief: escribir una misión jugable nueva (A-Design-Tale)

Repo: `C:\Users\Emanu\Documents\SPACEAPPS\juego` (juego estático en el navegador, sin compilación, sin Node).
**No hagas commit ni push. No uses el navegador. No edites ningún archivo salvo el tuyo** (el coordinador fusiona y prueba).

## Qué entregas

Un único archivo `src/datos/misiones-nuevas/<id>.js` (hoy es un stub `export default null;`: sobrescríbelo).
Copia la estructura EXACTA de `src/datos/misiones-nuevas/vip-1.js` (léelo entero primero: es la plantilla) y las ayudas de
`src/datos/ayudas.js`. Para ver más ejemplos de tono y números: `src/datos/misiones.js` (MER-3, LUN-3), `src/datos/piezas.js`,
`src/datos/eventos.js`, `src/datos/planificacion.js`.

Exporta por defecto `{ mision, piezas, eventosDiseno, eventosMision, contingencias, fuentes, mapas: {}, planificacion, capacidad, calendario }`.

## Reglas duras (las comprueba `herramientas/integridad.js`)

1. **Bilingüe**: todo texto visible es `N(es, en)` / pares `[es, en]`. Español neutro y sencillo; inglés simple (frases cortas).
2. **Ids**: piezas con prefijo propio de 2 letras + guion (p. ej. `IS-ARR`), objetivos `<ID>-O1..O3`, rutas `<ID>-R1/R2`,
   eventos `ED-<XXX>-IN/OUT/OBJ/LIM`, `EM-<XXX>-1..6`, contingencias `CT-<XXX>-1..4`, hallazgos `<ID>-H1..`, verificación `<ID>-V1/V2`.
   Los ids nunca aparecen en textos visibles.
3. **10-14 piezas**, cubriendo los 4 roles (`vuelo`, `ciencia`, `potencia`, `comms`). Alguna pieza debe aportar `volumen`
   (estructura), otra `potencia` (generación), otra `bateria` si hay sombra, otra `bajada` (enlace). Cada opción trae los 5
   números (masa kg, potencia W, volumen L, tasa kbps, precio M USD), `pros` y `contras` (≤ 8 palabras), y la opción real lleva
   `referencia: true`. Al menos 1/3 de las piezas con 2 opciones reales de decisión (trade-off claro).
   Categorías válidas: estructura, propulsion, actitud, camara, guiado, proteccion, sondas, instrumento, paneles, bateria, termica,
   polvo, antena, computador, memoria, navegacion, tierra, movilidad, robotica, despliegue, rtg, blindaje, regulacion, procesador.
4. **Honestidad de números**: `V(x, src)` SOLO si leíste el número en la URL de esa fuente (fetch real). `A` = fuente
   secundaria/resumen. Todo lo demás `J(x)` (juego) o `EST(...)` con ecuación. Los precios de los md del equipo son
   hipotéticos → `J`. Cada `src` debe existir en `fuentes` de tu archivo o en `src/datos/fuentes.js` (o empezar por `GAP-`).
   Usa `VOL(kg, litros)` para volumen de instrumentos (litros = kg / 0,23 redondeado) y `BAT(Wh, DoD, kg)` (kg = Wh/(DoD·150)).
5. **3 objetivos** (exactamente 1 `prioridad: true`), cada uno con `requiere` (ids de piezas de ciencia de tu misión),
   `valor` (suman ~100), `usoObjetivo` (horas/día), `datoReal` {es,en} con `src`.
6. **5 fases** (`launch` primero, `pBase` 0,78-0,95, `critica` en las de transporte/llegada), `mejoras` solo con piezas o
   contingencias de tu misión. 4 eventos de diseño (IN +, OUT − con `meses`, OBJ ± con `prioridad`, LIM − con
   `limite: { recurso: 'masa'|'potencia'|'volumen', factor }` y `meses`), 6 eventos de misión (fases de tu misión, `p` 0,15-0,35,
   efectos `{ ciencia: f }`, `{ dias: f }` o `{ falla: true }` solo en uno como mucho), 4 contingencias (`ct(id, rol, ...)`,
   cada `mitiga` simétrico con `mitigadoPor`). Los `casoReal` cuentan un hecho real con su fuente: es la parte educativa.
7. **Rutas**: 2, con `dias`, `masa` (propelente o módulo de transporte, kg), `precio`, `efecto: { fase, dp }`.
8. **Puntuación** por escenario: orbita → `'datos'`; landing → `'cadena'`; exploracion → `'oculto'` + lista `oculto` (4 hallazgos con
   `p`, `detecta`, `valor`, `casoReal`, `src`). `fusion3`: los 2 roles más acoplados.
9. **Cohetes** (ids válidos): electron, falcon9, falconheavy, vulcan, atlasv, pegasus, minotaur4, sls. Elige 3 que puedan.
   `capacidad[destino]` ya existe para `leo` y `luna`. Para un destino nuevo, da en `capacidad` un valor por cohete elegido
   con `EST(kg, 'EQ-C13', N('m = m_ref × exp(−k × ΔC3) = ... ≈ X kg (...)', '...'))` (mira `src/datos/cohetes.js`, función CURVA, y su
   cabecera: k = 0,0232 en C3 alto; m_ref = capacidad a C3 = −2 de la tabla de cada cohete) o `A(...)` si lees el dato publicado.
10. **Planificación** (`planificacion`): `tipo` 'orbita' (sitios con `inc`, `hechos.periapsis/apoapsis`), 'aterrizaje' (lat/lon) o
   'region' (x, y en 0..1 sobre una figura). `mapa.base` y las capas `real: true` usan claves de mapas ya descargados:
   `tierra-color`, `marte-color`, `marte-elevacion`, `europa-color`, `encelado-color`, `saturno`, `iss` (los está bajando
   otro agente; si alguno no llega, el coordinador lo arregla), además de `luna-color`, `luna-elevacion`.
   Capas calculadas disponibles: `pendiente` (con `base` = clave de un mapa de elevación) y `hielo` (casquetes polares genéricos).
   3-4 sitios/órbitas con `efectos` (fases de tu misión, ciencia por objetivo), `hechos`, `nota` (datos, no veredictos).
   `lanzamiento: { mesMax, dvMin, fase, faseEspacio, nota }`.
11. **`calendario`**: si tu destino es nuevo, `{ src: 'HORIZONS' }`; si no, `null`.
12. Pistas, no respuestas: los textos de piezas/sitios describen física y datos; nunca dicen "esta es la buena" ni "sirve para el objetivo X".

## Fuentes de datos
Los md del equipo (en `C:\Users\Emanu\Documents\SPACEAPPS`): `componentes_tres_misiones_todos_objetivos.md`,
`diseno_de_misiones_M.md`, `catalogo_de_piezas_M.md`, `misiones-referencias.md`, `investigacion-instrumentos-2.md`.
Verifica con la web (WebFetch/WebSearch, como máximo ~8 consultas) solo las cifras que marques `V`/`A`: páginas de NASA/JPL/ESA.
Añade cada fuente nueva a `fuentes` con `F(tituloEs, tituloEn, url, [agenciaEs, agenciaEn], conf)`; id con tu prefijo (`ISS-01`...).

## Al terminar
Relee tu archivo buscando errores de sintaxis JS (comas, llaves, comillas: usa comillas simples y escapa `\'`). Informa en ≤ 15
líneas: archivo, piezas, qué cifras son V/A y de qué URL, y dudas.
