// Transporte real: WebRTC entre navegadores con Trystero (señalización por MQTT público, ver importmap).
import { joinRoom, selfId } from 'trystero';

const TIPOS = ['hola', 'estado', 'intent', 'aviso', 'pres'];

export function crearTransporteTrystero(appId, codigoSala) {
  const sala = joinRoom({ appId }, codigoSala);
  const acciones = Object.fromEntries(TIPOS.map((t) => [t, sala.makeAction(t)]));
  let alRecibir = () => {}, alEntrar = () => {}, alSalir = () => {};
  for (const t of TIPOS) acciones[t].onMessage = (datos, { peerId }) => alRecibir(t, datos, peerId);
  sala.onPeerJoin = (p) => alEntrar(p);
  sala.onPeerLeave = (p) => alSalir(p);
  return {
    selfId,
    enviar: (tipo, datos, peerId) => acciones[tipo].send(datos, peerId ? { target: peerId } : undefined).catch(() => {}),
    alRecibir: (f) => { alRecibir = f; },
    alEntrar: (f) => { alEntrar = f; },
    alSalir: (f) => { alSalir = f; },
    pares: () => Object.keys(sala.getPeers()),
    salir: () => sala.leave(),
  };
}
