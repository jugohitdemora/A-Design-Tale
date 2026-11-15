# Protocolo multijugador (versión 2)

Este es el protocolo que usan todas las fases del juego: lobby, briefing, diseño, restricciones, verificación, misión e informe. El código está en `src/red/`.

## 1. Idea general

- **Un anfitrión con autoridad.** Uno de los jugadores es el anfitrión. Los demás le mandan **intenciones** ("quiero el rol de ciencia"). El anfitrión las valida, las aplica al estado y manda a todos el **estado completo**.
- **Nadie más cambia el estado.** Así no hay conflictos: si dos piden el mismo rol a la vez, el anfitrión decide y al otro le llega un aviso.
- **Lo aleatorio lo decide el anfitrión.** Sortea los eventos y escribe el resultado en el estado. Todos ven lo mismo sin tener que sincronizar generadores aleatorios.
- **Lo efímero va aparte.** Hacia dónde mira cada cabeza, el escenario que cada uno vota en el proyector (`voto`) y, más adelante, cursores o la pieza que se arrastra, es **presencia**: cada jugador la difunde a los demás sin pasar por el anfitrión, y no se reintenta ni se guarda.

El estado pesa pocos KB y cambia a la velocidad de los clics, así que mandarlo entero cada vez es más sencillo y más robusto que mandar diferencias.

## 2. Mensajes

Todos llevan `v` (versión del protocolo).

| Tipo | Quién → a quién | Contenido | Para qué |
|---|---|---|---|
| `hola` | cualquiera → cualquiera | `jugadorId`, `nick`, `etiqueta`, `r?` | Presentarse. Al saludo inicial se responde **siempre**; la respuesta lleva `r: 1` y no se contesta (evita el ping-pong). Se repite hasta estar sincronizado |
| `estado` | anfitrión → todos (difusión) o → un jugador | `etiqueta {term, host, seq}`, `estado` | Estado completo después de cada cambio (difusión), y dirigido al responder a un `hola` de alguien atrasado |
| `intent` | jugador → anfitrión | `jugadorId`, `intencion {id, tipo, payload}` | Pedir un cambio |
| `aviso` | anfitrión → un jugador | `id`, `motivo` | Rechazo de una intención, con el motivo para mostrarlo |
| `pres` | jugador → todos (difusión) | `datos` | Presencia efímera (mirada) |

## 3. Identidad

- **`jugadorId`** se guarda en `sessionStorage`: sobrevive a recargar la pestaña, pero dos pestañas son dos jugadores.
- El id de par (`peerId`, el `selfId` que genera el transporte) cambia en cada carga, así que solo se usa para enrutar. Los roles se atan al `jugadorId`.
- El anfitrión comprueba que el `jugadorId` de una intención coincide con el de la conexión que la envía: nadie actúa en nombre de otro.

## 4. Quién es el anfitrión

**Etiqueta** = `{term, host, seq, peso}`. `peso` = `[fase, jugadores que han pasado por la sala]`. Un estado reemplaza a otro si su etiqueta gana:

1. el `term` más alto;
2. con el mismo `term` y distinto anfitrión, el `peso` mayor: **una sala con historia nunca pierde contra un recién llegado con el estado vacío**;
3. con el mismo peso, el `host` con el id menor;
4. con el mismo anfitrión, el `seq` más alto.

**Arranque.** Al entrar, el jugador saluda y espera 5 s. Si nadie le manda un estado, se nombra anfitrión (`term` 1).

**Dos anfitriones.** Es lo normal cuando dos personas abren el enlace a la vez, porque descubrirse tarda unos segundos. También pasa cuando alguien llega tarde a una partida en curso y no encuentra a nadie en 5 s. Cuando se encuentran, el de etiqueta perdedora se rinde, adopta el estado del ganador y vuelve a unirse llevando su rol y sus datos de rol. Si el rol choca, se queda el del ganador y al otro le llega un aviso. Por la regla del peso, el que llega tarde siempre se rinde ante la partida en curso.

**Relevo.** Si el anfitrión se desconecta, lo sustituye el jugador conectado que lleva más tiempo en la sala (el menor `orden`), con `term + 1`. Si ese sucesor no aparece en 6 s, se descarta y se pasa al siguiente. Todos tienen copia del último estado que vieron. Lo que el anfitrión aplicó y no llegó a repartir antes de caerse se recupera porque los jugadores reenvían sus intenciones pendientes al nuevo anfitrión.

**El anfitrión recarga la página.** Su conexión nueva puede saludar antes de que se note que la vieja se cerró. Si llega un `hola` del anfitrión desde otra conexión, su sesión vieja se da por muerta y hay relevo sin él. Así no vuelve como anfitrión con el estado en blanco: vuelve como jugador y recupera su rol.

**Resincronización.** Un relé puede perder un `estado` sin avisar a nadie. Mientras no está sincronizado, el jugador repite su `hola` cada 2 s. Una vez sincronizado, cada 3 reintentos (≈6 s) le enseña su etiqueta al anfitrión con un `hola` de respuesta (`r: 1`, así no lo saluda de vuelta). El anfitrión solo reenvía el estado si la etiqueta va atrasada. Así un estado perdido se recupera solo, sin ruido en una sala al día.

**Nada depende del bucle de dibujo.** El navegador frena los temporizadores de las pestañas en segundo plano. Por eso la lógica del anfitrión reacciona a mensajes, y el transporte lleva su reloj en un Worker (ver §9). La caída del anfitrión la detecta el transporte (despedida, Last Will o latidos que dejan de volver) y la sesión solo reacciona al `alSalir` que recibe. Si el que se queda sin red es el propio jugador, el transporte no da a nadie por salido (§9), así que no se nombra anfitrión ni sube `term`.

## 5. Intenciones

- **Ids crecientes** (`max(Date.now(), último + 1)`). El anfitrión guarda `ultimaIntencion` por jugador y descarta las repetidas: reenviar es seguro.
- El jugador **guarda sus intenciones pendientes** hasta ver en el estado que se aplicaron (o hasta recibir un aviso). Las reenvía cada 2 s y también al nuevo anfitrión después de un relevo.
- `unirse` es idempotente: sirve para entrar, para volver después de recargar y para reincorporarse después de un relevo o una fusión.

## 6. Estado

```text
fase             lobby | briefing | diseno | restricciones | verificacion | mision | informe
jugadores        jugadorId → { nick, rol, orden, conectado, desconectadoEn, ultimaIntencion }
semilla          sorteada por el anfitrión al iniciar la misión; de ella salen eventos de diseño y vuelo
briefing         { objetivos, tareas, riesgos, carpetas }
mision           null | { escenario, id, dificultad: 'facil'|'normal'|'dificil' }
porRol           vuelo    { piezas, cohete, ruta }
                 ciencia  { piezas }
                 potencia { piezas }
                 comms    { piezas, contingencias: [id] }      (máximo 3)
                 piezas = { [piezaId]: { op, uso } }           (uso null si la pieza no tiene decisión de uso)
                 + notas libres de editarPropio (cualquier otra clave)
diseno           { revisiones, eventos: [{ id }], ultima }     eventos de diseño ya salidos; ultima =
                 { tipo: 'evento', id } | { tipo: 'revision', nivel, barras } (resultado de la última revisión)
firmas           { vuelo, ciencia, potencia, comms }           booleanos
resultado        null | lo que devolvió simular() al lanzar
vista            { paso }                                      pasos del vuelo ya revelados
registro         eventos ya resueltos por el anfitrión (fases futuras)
```

- **Los valores derivados no se guardan.** Las barras, la ciencia, los riesgos y los efectos de los eventos de diseño se calculan en cada cliente con `resumen(estado, DATOS)` (`src/reglas/motor.js`). En el estado solo hay ids, opción y uso. La excepción es `resultado`: lo calcula el anfitrión una vez, al lanzar, y es igual para todos.
- **Datos.** `protocolo.js` carga `src/datos/index.js` con un `import()` protegido: si falta o falla, el protocolo carga igual y las acciones de juego se rechazan con "Game data not loaded". `usarDatos(d)` o `ctx.datos` inyectan otros datos (las pruebas lo hacen).
- **Fusión.** `unirse` solo copia el taller que trae un jugador si el del anfitrión está vacío (`tallerVacio`), y lo normaliza (`normalizarTaller`).
- **Información "privada" de cada rol.** El estado se replica entero a todos: lo privado solo se oculta en la interfaz. En un juego cooperativo es suficiente, pero no es secreto de verdad.
- **Desconexiones.** El rol de quien se desconecta queda reservado 20 s en el lobby y 90 s en la partida, para que una recarga no lo pierda.

## 7. Acciones (src/red/protocolo.js)

| Acción | Fases | Regla |
|---|---|---|
| `unirse` | todas | Máximo 4 conectados. Recupera el rol y los datos de rol si no chocan |
| `elegirRol` | todas | El rol tiene que estar libre o con la reserva vencida. `null` lo suelta. Quien llega con la partida en curso toma un rol vacante; al cambiar de manos un rol se borra su firma |
| `iniciarMision` | lobby | Todos los conectados tienen rol. Sortea `semilla` |
| `marcarPizarra`, `abrirCarpeta` | briefing | — |
| `editarPropio` | briefing, diseño, restricciones | Notas libres en el taller de tu rol. Máximo 8 KB por dato y 32 KB por taller. No puede usar las claves `piezas`, `cohete`, `ruta`, `contingencias` |
| `elegirMision` `{escenario?, id?, dificultad?}` | briefing | Valida contra los datos. Cambiar `id` vacía piezas, cohete, ruta, contingencias, eventos de diseño, firmas y resultado (las notas se conservan) |
| `montar` `{rol?, pieza, op?, uso?}`, `quitar` `{rol?, pieza}` | diseño, restricciones | La pieza es del rol y de la misión; `op` y `uso` dentro de la ficha. `rol` ajeno solo si está vacante (nadie conectado lo tiene, MEC-03). En restricciones, MEC-12. Borra las firmas |
| `elegirCohete` `{id}`, `elegirRuta` `{id}` | diseño, restricciones | Rol vuelo (o vacante). De la lista de la misión; cohete con `cumpleDEC09`. `null` lo quita. Borra las firmas |
| `contingencia` `{id, on}` | diseño, restricciones | Rol comms (o vacante). Máximo 3. Borra las firmas |
| `pedirRevision` `{revision?}` | diseño, restricciones | Mientras queden eventos de diseño (1/2/3 por dificultad), sale uno en vez de la revisión (sorteado con la semilla, sin repetir). Después: exceso → diseño, tolerancia → restricciones, todo ok → verificación (MEC-10, MEC-11). `revision` (opcional) = `diseno.revisiones` esperado, evita dobles clics |
| `firmar` `{rol?, on}` | verificación | Tu rol, o uno vacante. Para firmar, `verificar()` tiene que pasar |
| `lanzar` | verificación | Comprobaciones y 4 firmas. El anfitrión calcula `resultado = simular()` y pasa a misión |
| `avanzar` `{paso?}` | misión | `vista.paso + 1`; con todos los pasos a la vista pasa a informe. `paso` (opcional) evita dobles clics |
| `cambiarFase` | todas | Solo las transiciones de `TRANSICIONES`, salvo las que tienen acción propia (`SOLO_POR_ACCION`: revisión, lanzamiento, avance). briefing → diseño exige misión `jugable`. informe → diseño (rediseñar) conserva diseño, semilla y eventos de diseño; borra firmas y resultado. → lobby vacía la partida |

Los motivos de rechazo de estas acciones van en inglés: la interfaz los muestra tal cual.

**Para añadir una acción** en una fase nueva, se agrega una entrada en `ACCIONES` con `fases`, `validar` y `aplicar`. La red no cambia.

## 8. Versiones

Si llega un `hola` con otra `v`, se avisa ("recargad la página") y se ignoran sus mensajes. Un par conectado que en 8 s no ha saludado se trata igual: es una versión anterior a este protocolo. **Cuando un cambio rompa la compatibilidad, hay que subir `VERSION_PROTOCOLO`.**

El anfitrión descarta las intenciones malformadas (sin `id` numérico, sin `tipo` o con un `payload` que no es un objeto).

## 9. Transporte (src/red/transporte-mqtt.js)

La sesión no sabe nada de la red. Recibe un transporte con esta interfaz: `selfId`, `enviar(tipo, datos, peerId?)`, `alRecibir`, `alEntrar`, `alSalir`, `pares()`, `enLinea()` y `salir()`. Sin `peerId`, `enviar` difunde a toda la sala. `transporte-memoria.js` es la versión simulada para las pruebas del protocolo.

El transporte real es un **relé sobre MQTT por WebSocket seguro**. No hay WebRTC: cada navegador abre sockets TLS salientes hacia brokers públicos, y eso atraviesa cualquier NAT (pero no una red que filtre los puertos de los brokers, ver §11). Los brokers (`RED.BROKERS` en `src/config.js`) se usan **todos a la vez y de forma redundante**.

**Temas** (`<appId>/sala/<CODIGO>/…`):

- `todos`: difusión (anuncios, latidos, despedidas, estado y presencia).
- `a/<peerId>`: mensajes dirigidos a un par, para que un estado dirigido no lo baje toda la sala.

**Envoltorio** (JSON): `{ d: emisor, n: nº de mensaje del emisor, t: tipo, m: datos, q?: 1 }`. Los tipos `+` (anuncio o latido) y `-` (despedida) son del transporte. `hola`, `estado`, `intent`, `aviso` y `pres` son de la sesión y se le entregan tal cual. `q: 1` significa "respóndeme".

**Redundancia y deduplicación.** Un mensaje fiable se publica con QoS 1 en todos los brokers conectados y con el mismo `n`. El receptor se queda con el primero que llega y descarta los demás por `(emisor, n)`. Si un broker cae o pierde mensajes, los otros cubren. No hay orden garantizado entre brokers; la sesión no lo necesita porque el estado se repite entero y se compara por etiqueta.

**Descubrimiento.** En cuanto un broker confirma la suscripción, el par publica un anuncio con `q: 1`; quien lo oye responde y lo registra, y el `alEntrar` salta en ambos lados. Después cada par publica un latido (`+`) cada 4 s.

**Cuándo se va un par: latidos contados en ecos propios.** Cada latido mío vuelve a mí por el broker, porque la suscripción incluye al emisor. Ese eco prueba que mi enlace funciona y marca una vuelta completa por la red. Un par del que no sé nada durante 4 ecos míos (≈16 s) se da por salido. La espera no se mide en segundos de reloj, sino en ecos.

**Despedida y Last Will.**

- Un cierre voluntario (`salir()`, o `pagehide` al cerrar la pestaña) publica una despedida `-` con su `n`. Los demás lo quitan al instante. Ese `n` se recuerda: un mensaje anterior que llegue tarde por un broker lento se ignora y no resucita al par.
- Cada conexión declara un **Last Will** (`{ d, t: '-', w: 1 }`). Si el broker pierde el socket sin DISCONNECT (keepalive de 10 s, se detecta en ≈15 s), lo publica. Lo pierde **un** broker, no necesariamente el par, así que no lo expulsa: se le pregunta por los demás brokers y, si no contesta en 2 ecos (≈8 s), se da por salido. El cierre limpio de `end(false)` no dispara el Last Will.

**Regla crítica: "estoy sin conexión".** Si el que se queda sin red soy yo, no veré ningún eco y nadie caduca: no emito `alSalir` de nadie. Si lo hiciera, la sesión se nombraría anfitriona con `term + 1` y, al volver, pisaría la sala real. Se considera sin conexión cuando no hay ningún broker listo, cuando no oigo mi propio latido en 10 s o cuando un tic llega con más de 3 tics de retraso (pestaña congelada, equipo dormido). Al volver, `reanudar()` reinicia las cuentas de silencio, reanuncia al par y vuelve a llamar a `alEntrar` por cada par conocido, de modo que el anfitrión le reenvíe el estado que se perdió.

**Presencia limitada.** `pres` se fusiona (solo vale la última), va con QoS 0, a un máximo de 8 por segundo (cada 125 ms) y **por un solo broker**: el primero conectado según el orden de `RED.BROKERS`. Con un único broker vivo, a la mitad de ritmo.

**Estado de la conexión.** `enLinea()` devuelve `{ listos, total }`: cuántos brokers están en uso. `listos` es 0 si ninguno está listo o si no vuelve el eco de los propios latidos (un socket puede seguir "conectado" un rato con la red ya caída). Con `listos: 0` el lobby muestra "SIN CONEXIÓN · REINTENTANDO…". mqtt.js reconecta solo cada 2 s y el transporte vuelve a suscribirse en cada `connect`.

**Cambiar de transporte** solo exige escribir otro con la misma interfaz. La sesión y el protocolo no cambian.

## 10. Pruebas

`pruebas/index.html` ejecuta tres suites una tras otra, 55 pruebas en total.

**Reglas** (`pruebas-reglas.js`, 21 pruebas, nombres con prefijo `Reglas ·`; `?solo=reglas`) sobre un fixture propio de datos inventados (no reales), inyectado con `usarDatos`: DEC-10, límite = mínimo entre aporte y tope, las seis barras, eventos de diseño por dificultad, rutas de la revisión, MEC-12, firmas, roles vacantes, validación de acciones, briefing, determinismo de `simular`, G-12 con barrido de semillas, las tres reglas de puntuación, rediseño desde el informe, estado vacío o roto y fusión de talleres.

**Protocolo y sesión** (`pruebas.js`, 16 pruebas) sobre la red simulada `transporte-memoria.js`, con retrasos, descubrimiento asimétrico y salidas: arranque simultáneo, conflicto de rol, anfitrión que se va con una intención en vuelo, recarga de un jugador y del anfitrión, quinto jugador, versión distinta, iniciar misión sin todos los roles, talleres por rol, fusión de dos anfitriones, recién llegado que no reinicia una partida, anfitrión que vuelve antes de que se note su salida, vuelta tras un corte largo (jugador y anfitrión), intenciones malformadas e intenciones repetidas por red lenta.

**Transporte MQTT** (`pruebas-transporte.js`, 18 pruebas, nombres con prefijo `MQTT ·`) sobre `broker-falso.js`: brokers en memoria que implementan el subconjunto de mqtt.js que usa el transporte (SUBACK, entrega al propio emisor, Last Will, `end(false)` limpio, reconexión) y permiten retrasar, perder mensajes, cortar un cliente, tirar un broker o dejar un socket zombi (sigue `connected` pero no entra ni sale nada). Cubren:

- tres brokers y cuatro pares: descubrimiento, entrega única de cada mensaje fiable, dirigidos y ausencia de eco;
- un broker caído desde el principio y otro que pierde el 40 %;
- Last Will de un solo broker (sin `alSalir`) y corte total sin despedida (con `alSalir`), frente a `salir()` (al instante);
- duplicado tardío tras una despedida;
- presencia fusionada, limitada y por un solo broker;
- `enLinea()`;
- el propio corte (sockets cortados, zombi y zombi con reconexión), sobre el transporte solo y con la sesión encima: nadie da a nadie por salido, no se nombra anfitrión, `term` no sube, al volver reconverge con su rol y nunca salta `version`;
- corte del anfitrión: relevo y, al volver, se rinde y conserva su rol;
- cuatro sesiones completas (un anfitrión, cuatro conectados, rol y misión replicados), también con un broker caído y otro con pérdidas;
- resincronización: un `estado` perdido en todos los brokers se recupera solo.

Parámetros de la página: `?solo=texto` ejecuta solo las pruebas cuyo nombre lo contiene (`?solo=mqtt` para la suite nueva), `?veces=N` las repite N veces para cazar fallos intermitentes y `?lento=K` multiplica por K los tiempos de la suite MQTT (si una prueba falla con 1 y pasa con 3, era un artefacto de la aceleración). Un aviso "el hilo se atascó" junto a una prueba indica que el navegador frenó el reloj y el resultado no es fiable.

```bash
python -m http.server 8770 --directory juego
```

Abrir `http://localhost:8770/pruebas/`. Los brokers falsos no tocan la red: las pruebas no verifican los brokers públicos reales ni el aviso "SIN CONEXIÓN" de la interfaz.

## 11. Límites conocidos

- **Brokers públicos sin garantía de servicio.** `broker.hivemq.com`, `test.mosquitto.org` y `broker.emqx.io` son para pruebas: pueden caer, limitar o cambiar sin aviso. Que haya tres reduce el riesgo, no lo elimina.
- **Puertos que no son el 443.** Usan 8884, 8081 y 8084. Una red que solo deje salir el 443 (o filtre puertos) puede bloquearlos todos. Entonces el lobby muestra "SIN CONEXIÓN · REINTENTANDO…" y no hay partida posible desde esa red.
- **Salas sin secreto.** Los temas son públicos: cualquiera que sepa el código de sala puede leer y escribir en ella, y hacerse pasar por un jugador.
- **Límite de ritmo.** EMQX descarta por encima de ~10 mensajes por segundo y cliente. Por eso la presencia está limitada a 8 por segundo y va por un solo broker.
- **Sin orden entre brokers.** Un mismo mensaje puede llegar antes por uno que por otro, y mensajes distintos pueden cruzarse. El diseño lo tolera (estado completo con etiqueta, deduplicación), pero no se puede contar con el orden.
- **Detección de caídas lenta.** Un par que se va sin despedirse tarda entre ≈8 s (Last Will) y ≈16 s (solo latidos) en ser dado por salido.
- **Fiabilidad garantizada.** Exigiría un relé propio en el puerto 443 (por ejemplo Cloudflare Workers con Durable Objects, Firebase o Supabase, que requieren una cuenta). Bastaría escribir otro transporte con la misma interfaz.
- La autoridad es de confianza: un jugador que modifique su navegador y llegue a ser anfitrión puede hacer trampa. En un juego cooperativo no es un problema.
