# Protocolo multijugador (versión 1)

Este es el protocolo que usan todas las fases del juego: lobby, briefing, diseño, verificación, misión e informe. El código está en `src/red/`.

## 1. Idea general

- **Un anfitrión con autoridad.** Uno de los jugadores es el anfitrión. Los demás le mandan **intenciones** ("quiero el rol de ciencia"). El anfitrión las valida, las aplica al estado y manda a todos el **estado completo**.
- **Nadie más cambia el estado.** Así no hay conflictos: si dos piden el mismo rol a la vez, el anfitrión decide y al otro le llega un aviso.
- **Lo aleatorio lo decide el anfitrión.** Sortea los eventos y escribe el resultado en el estado. Todos ven lo mismo sin tener que sincronizar generadores aleatorios.
- **Lo efímero va aparte.** Hacia dónde mira cada cabeza (y, más adelante, cursores o la pieza que se arrastra) es **presencia**: va directo de un jugador a los demás, sin pasar por el anfitrión.

El estado pesa pocos KB y cambia a la velocidad de los clics, así que mandarlo entero cada vez es más sencillo y más robusto que mandar diferencias.

## 2. Mensajes

Todos llevan `v` (versión del protocolo).

| Tipo | Quién → a quién | Contenido | Para qué |
|---|---|---|---|
| `hola` | cualquiera → cualquiera | `jugadorId`, `nick`, `etiqueta` | Presentarse. Se responde siempre y se repite hasta estar sincronizado |
| `estado` | anfitrión → todos | `etiqueta {term, host, seq}`, `estado` | Estado completo después de cada cambio, y al responder a un `hola` |
| `intent` | jugador → anfitrión | `jugadorId`, `intencion {id, tipo, payload}` | Pedir un cambio |
| `aviso` | anfitrión → un jugador | `id`, `motivo` | Rechazo de una intención, con el motivo para mostrarlo |
| `pres` | jugador → todos | `datos` | Presencia efímera (mirada) |

## 3. Identidad

- **`jugadorId`** se guarda en `sessionStorage`: sobrevive a recargar la pestaña, pero dos pestañas son dos jugadores.
- El id de Trystero (`peerId`) cambia en cada carga, así que solo se usa para enrutar. Los roles se atan al `jugadorId`.
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

**Nada depende del bucle de dibujo.** El navegador frena los temporizadores de las pestañas en segundo plano. Por eso la lógica del anfitrión reacciona a mensajes, y la caída del anfitrión se detecta con la desconexión de su conexión, no con latidos.

## 5. Intenciones

- **Ids crecientes** (`max(Date.now(), último + 1)`). El anfitrión guarda `ultimaIntencion` por jugador y descarta las repetidas: reenviar es seguro.
- El jugador **guarda sus intenciones pendientes** hasta ver en el estado que se aplicaron (o hasta recibir un aviso). Las reenvía cada 2 s y también al nuevo anfitrión después de un relevo.
- `unirse` es idempotente: sirve para entrar, para volver después de recargar y para reincorporarse después de un relevo o una fusión.

## 6. Estado

```text
fase             lobby | briefing | diseno | verificacion | mision | informe
jugadores        jugadorId → { nick, rol, orden, conectado, desconectadoEn, ultimaIntencion }
semilla          sorteada por el anfitrión al iniciar la misión
briefing         { objetivos, tareas, riesgos, carpetas }
porRol           vuelo | ciencia | potencia | comms → datos del taller de ese rol
registro         eventos ya resueltos por el anfitrión (fases futuras)
```

- **Los valores derivados no se guardan.** El panel global (masa total, batería, volumen…) se calcula a partir de `porRol` en cada cliente.
- **Información "privada" de cada rol.** El estado se replica entero a todos: lo privado solo se oculta en la interfaz. En un juego cooperativo es suficiente, pero no es secreto de verdad.
- **Desconexiones.** El rol de quien se desconecta queda reservado 20 s en el lobby y 90 s en la partida, para que una recarga no lo pierda.

## 7. Acciones (src/red/protocolo.js)

| Acción | Fases | Regla |
|---|---|---|
| `unirse` | todas | Máximo 4 conectados. Recupera el rol y los datos de rol si no chocan |
| `elegirRol` | lobby, briefing | El rol tiene que estar libre o con la reserva vencida. `null` lo suelta |
| `iniciarMision` | lobby | Todos los conectados tienen rol. Sortea `semilla` |
| `marcarPizarra`, `abrirCarpeta` | briefing | — |
| `editarPropio` | briefing, diseño | Solo escribe en el taller de tu rol. Máximo 8 KB por dato y 32 KB por taller |
| `cambiarFase` | todas | Solo las transiciones de `TRANSICIONES` |

**Para añadir una acción** en una fase nueva, se agrega una entrada en `ACCIONES` con `fases`, `validar` y `aplicar`. La red no cambia.

## 8. Versiones

Si llega un `hola` con otra `v`, se avisa ("recargad la página") y se ignoran sus mensajes. Un par conectado que en 8 s no ha saludado se trata igual: es una versión anterior a este protocolo. **Cuando un cambio rompa la compatibilidad, hay que subir `VERSION_PROTOCOLO`.**

El anfitrión descarta las intenciones malformadas (sin `id` numérico, sin `tipo` o con un `payload` que no es un objeto).

## 9. Pruebas

`pruebas/index.html` ejecuta 14 escenarios sobre una red simulada (`transporte-memoria.js`) con retrasos, descubrimiento asimétrico y salidas:

- arranque simultáneo;
- conflicto de rol;
- el anfitrión se va con una intención en vuelo;
- recarga de un jugador;
- recarga del anfitrión;
- quinto jugador;
- versión distinta;
- iniciar misión sin todos los roles;
- talleres por rol;
- fusión de dos anfitriones;
- un recién llegado no reinicia una partida en curso;
- el anfitrión vuelve antes de que se note su salida;
- intenciones malformadas;
- intenciones repetidas por red lenta.

Con `?solo=texto` se ejecutan solo las pruebas que contienen ese texto, y con `?veces=N` se repiten N veces, para cazar fallos intermitentes.

```bash
python -m http.server 8770
```

Abrir `http://localhost:8770/pruebas/`.

## 10. Límites conocidos

- Sin servidor TURN: algunas redes bloquean WebRTC.
- La autoridad es de confianza: un jugador que modifique su navegador y llegue a ser anfitrión puede hacer trampa. En un juego cooperativo no es un problema.
- La detección de una caída depende de que Trystero avise de la desconexión, lo que puede tardar unos segundos.
