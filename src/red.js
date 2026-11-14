// Red entre pares (WebRTC) con Trystero: no hace falta servidor propio.
// La señalización inicial usa brokers MQTT públicos (estrategia elegida en el importmap de index.html);
// después el tráfico va directo y cifrado entre navegadores. Con Nostr los pares tardaban o no se encontraban.
import { joinRoom, selfId } from 'trystero';

export { selfId };

export function conectar(codigoSala, { alEstado, alMesa, alEntrar, alSalir }) {
  const sala = joinRoom({ appId: 'spaceapps-briefing-2026' }, codigoSala);
  const estado = sala.makeAction('estado'); // { rol, yaw, pitch }
  const mesa = sala.makeAction('mesa');     // { v, autor, datos }

  estado.onMessage = (datos, { peerId }) => alEstado(peerId, datos);
  mesa.onMessage = (datos, { peerId }) => alMesa(peerId, datos);
  sala.onPeerJoin = (peerId) => alEntrar(peerId);
  sala.onPeerLeave = (peerId) => alSalir(peerId);

  return {
    enviarEstado: (datos, peerId) => estado.send(datos, peerId ? { target: peerId } : undefined),
    enviarMesa: (datos, peerId) => mesa.send(datos, peerId ? { target: peerId } : undefined),
    salir: () => sala.leave(),
  };
}
